/* ===== PULSE SANKEY CHART - ENHANCED WITH REVENUE SEGMENT COLOR CONTROL ===== */
/* Added independent color control for revenue segments and click-to-select colors */

class PulseSankeyChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        this.svg = null;
        this.chart = null;
        this.data = null;
        this.tooltip = null;
        this.nodes = [];
        this.links = [];
        
        // Custom color storage
        this.customColors = {};
        this.revenueSegmentColors = new Map(); // Individual colors for revenue segments
        
        // Revenue hub detection
        this.revenueHubNode = null;
        this.revenueHubLayer = null;
        
        // Color picker state
        this.isColorPickerActive = false;
        this.selectedElement = null;
        
        // Balance sheet specific properties
        this.statementType = 'income';
        this.colorGroups = new Map();
        
        this.config = SankeyChartConfig.getInitialConfig();
        this.initializeChart();
        this.initializeInteractiveMode();
    }


    applyControlDefaults(controlModule) {
        if (controlModule && controlModule.getDefaultConfig) {
            const controlDefaults = controlModule.getDefaultConfig();
            this.config = { ...this.config, ...controlDefaults };
            console.log('✅ Applied control module defaults to chart config');
            
            // Apply auto-scaling AFTER control defaults to prevent override
            if (this.data) {
                this.autoScaleNodeHeight(this.data);
            }
        }
    }

    getLayerInfo() {
        if (!this.nodes || this.nodes.length === 0) {
            return {
                totalLayers: 0,
                maxDepth: 0,
                layerInfo: { leftmost: 0, rightmost: 0, middle: [] },
                nodeDistribution: {},
                layerSpacing: this.config.layerSpacing || {}
            };
        }

        const depths = [...new Set(this.nodes.map(n => n.depth))];
        const maxDepth = Math.max(...depths);
        const minDepth = Math.min(...depths);
        
        const nodeDistribution = {};
        depths.forEach(depth => {
            const nodesAtDepth = this.nodes.filter(n => n.depth === depth);
            let layerType = 'middle';
            if (depth === minDepth) layerType = 'leftmost';
            else if (depth === maxDepth) layerType = 'rightmost';
            
            nodeDistribution[depth] = {
                count: nodesAtDepth.length,
                layerType: layerType
            };
        });

        const middleLayers = depths.filter(d => d !== minDepth && d !== maxDepth);

        return {
            totalLayers: depths.length,
            maxDepth: maxDepth,
            layerInfo: {
                leftmost: minDepth,
                rightmost: maxDepth,
                middle: middleLayers
            },
            nodeDistribution: nodeDistribution,
            layerSpacing: this.config.layerSpacing || {}
        };
    }

    initializeChart() {
        this.container.selectAll('*').remove();
        
        const dimensions = {
            width: this.config.width - this.config.margin.left - this.config.margin.right,
            height: this.config.height - this.config.margin.top - this.config.margin.bottom
        };

        // Set container background to ensure consistent beige background
        this.container.style('background-color', this.config.backgroundColor);
        
        this.svg = this.container
            .append('svg')
            .attr('class', 'chart-svg')
            .attr('width', this.config.width)
            .attr('height', this.config.height)
            .attr('viewBox', `0 0 ${this.config.width} ${this.config.height}`)
            .style('background-color', this.config.backgroundColor);


        // Create zoom container
        this.zoomContainer = this.svg
            .append('g')
            .attr('class', 'zoom-container');

        this.chart = this.zoomContainer
            .append('g')
            .attr('class', 'chart-group')
            .attr('transform', `translate(${this.config.margin.left}, ${this.config.margin.top})`);

        // Initialize zoom and pan functionality
        // Initialize zoom with utility check and retry
        this.initializeZoomWithRetry();

        this.createTooltip();
        this.initializeColorPickerWithRetry();
    }

    // Handle color changes from color picker
    handleColorChange(elementData, newColor, element) {
        if (elementData.id) {
            // Node color update
            this.updateNodeColor(elementData, newColor);
        } else if (elementData.source && elementData.target) {
            // Link color update
            this.updateLinkColor(elementData, newColor);
        }
    }

    // Initialize branding with fallback
    initializeBranding() {
        if (window.ChartBrandingUtils && window.ChartBrandingUtils.renderTitle) {
            ChartBrandingUtils.renderTitle.call(this);
        } else {
            this.renderTitleFallback();
        }

        if (window.ChartBrandingUtils && window.ChartBrandingUtils.renderFootnotes) {
            ChartBrandingUtils.renderFootnotes.call(this);
        } else {
            this.renderFootnotesFallback();
        }

        if (this.config.showBranding !== false) {
            if (window.ChartBrandingUtils && window.ChartBrandingUtils.renderBrandingFooter) {
                ChartBrandingUtils.renderBrandingFooter.call(this);
            } else {
                this.renderBrandingFooterFallback();
            }
        }

        if (window.ChartBrandingUtils && window.ChartBrandingUtils.renderBrandLogo) {
            ChartBrandingUtils.renderBrandLogo.call(this);
        } else {
            this.renderBrandLogoFallback();
        }
    }

    // Wrapper methods for compatibility with both ChartColorPicker and fallback
    showColorPicker(element, currentColor) {
        if (window.ChartColorPicker && window.ChartColorPicker.showColorPicker) {
            ChartColorPicker.showColorPicker.call(this, element, currentColor);
        } else {
            this.showColorPickerFallback(element, currentColor);
        }
    }

    hideColorPicker() {
        if (window.ChartColorPicker && window.ChartColorPicker.hideColorPicker) {
            ChartColorPicker.hideColorPicker.call(this);
        } else {
            this.hideColorPickerFallback();
        }
    }

    showOpacityPicker(element, currentOpacity, onApply, position = null) {
        if (window.ChartColorPicker && window.ChartColorPicker.showOpacityPicker) {
            ChartColorPicker.showOpacityPicker.call(this, element, currentOpacity, onApply, position);
        } else {
            this.showOpacityPickerFallback(element, currentOpacity, onApply, position);
        }
    }

    // Retry utility initialization with timeout
    initializeZoomWithRetry() {
        const attemptZoom = () => {
            if (window.ChartZoom && window.ChartZoom.initializeZoomPan) {
                ChartZoom.initializeZoomPan.call(this);
                console.log('✅ ChartZoom utility connected successfully');
                return true;
            }
            return false;
        };

        // Try immediately first
        if (!attemptZoom()) {
            // If immediate attempt fails, try once more after a short delay
            setTimeout(() => {
                if (!attemptZoom()) {
                    console.warn('⚠️ ChartZoom utility not available after retry, using fallback');
                    this.initializeBasicZoom();
                }
            }, 100);
        }
    }

    initializeColorPickerWithRetry() {
        const attemptColorPicker = () => {
            if (window.ChartColorPicker && window.ChartColorPicker.initializeColorPicker) {
                ChartColorPicker.initializeColorPicker.call(this, (elementData, newColor, element) => {
                    this.handleColorChange(elementData, newColor, element);
                });
                console.log('✅ ChartColorPicker utility connected successfully');
                return true;
            }
            return false;
        };

        // Try immediately first
        if (!attemptColorPicker()) {
            // If immediate attempt fails, try once more after a short delay
            setTimeout(() => {
                if (!attemptColorPicker()) {
                    console.warn('⚠️ ChartColorPicker utility not available after retry, using fallback');
                    this.initializeColorPickerFallback();
                }
            }, 100);
        }
    }

    // Fallback basic zoom initialization if ChartZoom utility is not available
    initializeBasicZoom() {
        console.warn('⚠️ Using fallback basic zoom implementation');
        
        // Initialize zoom and pan state if not already set
        if (!this.zoomState) {
            this.zoomState = {
                k: 1,     // scale factor
                x: 0,     // x translation
                y: 0      // y translation
            };
        }

        // Create zoom behavior
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 5])  // Allow zooming from 10% to 500%
            .on('zoom', (event) => {
                const { transform } = event;
                
                // Update zoom state
                this.zoomState.k = transform.k;
                this.zoomState.x = transform.x;
                this.zoomState.y = transform.y;
                
                // Apply transform to zoom container
                this.zoomContainer.attr('transform', transform);
                
                // Update zoom slider if it exists
                this.updateZoomSliderFallback(transform.k);
                
                // Optionally emit zoom event for external handlers
                if (this.onZoomChange) {
                    this.onZoomChange(this.zoomState);
                }
            });

        // Apply zoom behavior to SVG
        this.svg.call(this.zoom);
    }

    // Fallback zoom slider update
    updateZoomSliderFallback(zoomLevel) {
        const zoomSlider = document.querySelector('input[data-control-id="zoomLevel"]');
        if (zoomSlider) {
            zoomSlider.value = zoomLevel;
            const valueDisplay = document.querySelector('.control-value[data-control-id="zoomLevel"]');
            if (valueDisplay) {
                valueDisplay.textContent = `${zoomLevel.toFixed(1)}x`;
            }
        }
    }

    // Fallback zoom methods for compatibility
    resetZoom() {
        if (window.ChartZoom && window.ChartZoom.resetZoom) {
            ChartZoom.resetZoom.call(this);
        } else {
            this.zoomState = { k: 1, x: 0, y: 0 };
            this.svg.transition()
                .duration(500)
                .call(
                    this.zoom.transform,
                    d3.zoomIdentity
                );
        }
    }

    setZoomLevel(zoomLevel) {
        if (window.ChartZoom && window.ChartZoom.setZoomLevel) {
            ChartZoom.setZoomLevel.call(this, zoomLevel);
        } else {
            // Fallback implementation
            const svgRect = this.svg.node().getBoundingClientRect();
            const centerX = svgRect.width / 2;
            const centerY = svgRect.height / 2;
            const currentTransform = d3.zoomTransform(this.svg.node());
            const chartCenterX = (centerX - currentTransform.x) / currentTransform.k;
            const chartCenterY = (centerY - currentTransform.y) / currentTransform.k;
            const newTranslateX = centerX - zoomLevel * chartCenterX;
            const newTranslateY = centerY - zoomLevel * chartCenterY;
            
            this.svg.transition()
                .duration(200)
                .call(
                    this.zoom.transform,
                    d3.zoomIdentity
                        .translate(newTranslateX, newTranslateY)
                        .scale(zoomLevel)
                );
        }
    }







    createTooltip() {
        d3.select('.pulse-sankey-tooltip').remove();
        
        this.tooltip = d3.select('body')
            .append('div')
            .attr('class', 'pulse-sankey-tooltip');
    }

    // Fallback color picker implementations (simplified versions)
    initializeColorPickerFallback() {
        console.warn('⚠️ Using fallback color picker implementation');
        // Basic fallback - you could implement a simpler version here if needed
        this.colorPicker = null;
    }

    showColorPickerFallback(element, currentColor) {
        // Simple fallback using native color input
        const color = prompt('Enter color (hex format):', currentColor || '#3498db');
        if (color) {
            const elementData = d3.select(element).datum();
            if (elementData.id) {
                this.updateNodeColor(elementData, color);
            } else if (elementData.source && elementData.target) {
                this.updateLinkColor(elementData, color);
            }
        }
    }

    hideColorPickerFallback() {
        // No-op for fallback
    }

    showOpacityPickerFallback(element, currentOpacity, onApply, position = null) {
        // Simple fallback using native prompt
        const opacity = prompt('Enter opacity (0.0 to 1.0):', currentOpacity);
        if (opacity !== null) {
            const value = parseFloat(opacity);
            if (!isNaN(value) && value >= 0 && value <= 1) {
                onApply(value);
            }
        }
    }

    // Fallback branding implementations
    renderTitleFallback() {
        console.warn('⚠️ Using fallback title rendering');
        const headerGroup = this.svg.append('g').attr('class', 'chart-header');
        const company = this.data?.metadata?.company || 'Company';
        const period = this.data?.metadata?.period || 'Period';
        const statementLabel = this.statementType === 'balance' ? 'Balance Sheet' : 'Income Statement';
        const titleText = `${company} ${period} ${statementLabel}`;

        headerGroup.append('text')
            .attr('x', this.config.width / 2)
            .attr('y', 60)
            .attr('text-anchor', 'middle')
            .attr('font-size', '40px')
            .attr('font-weight', '1000')
            .attr('font-family', this.getFontFamily())
            .attr('fill', this.config.titleColor)
            .text(titleText);
    }

    renderFootnotesFallback() {
        if (!this.data?.metadata?.footnotes) return;
        console.warn('⚠️ Using fallback footnotes rendering');
        const footnotes = this.svg.append('g')
            .attr('class', 'chart-footnotes')
            .attr('transform', `translate(${this.config.margin.left}, ${this.config.height - 80})`);

        this.data.metadata.footnotes.forEach((note, index) => {
            footnotes.append('text')
                .attr('y', index * 12)
                .attr('font-size', '10px')
                .attr('fill', '#6b7280')
                .text(`${index + 1}. ${note}`);
        });
    }

    renderBrandingFooterFallback() {
        console.warn('⚠️ Using fallback branding footer rendering');
        const footerGroup = this.svg.append('g')
            .attr('class', 'chart-branding')
            .attr('transform', `translate(0, ${this.config.height - 35})`);

        // Priority order: backend logo file -> user uploaded logo -> default logo
        const backendLogoUrl = window.location.origin + '/assets/images/logo.png';
        const userLogoUrl = this.data?.metadata?.customLogoUrl;
        const defaultLogoUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiByeD0iNCIgZmlsbD0iIzY2N2VlYSIvPgo8dGV4dCB4PSIxMCIgeT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iYm9sZCI+UDwvdGV4dD4KPC9zdmc+';
        
        // First try backend logo, then user logo, then default
        const primaryLogoUrl = this.data?.metadata?.logoUrl || backendLogoUrl;
        const fallbackLogoUrl = userLogoUrl || defaultLogoUrl;
        
        // Check if we have custom branding (backend logo or user logo)
        const hasBackendLogo = !this.data?.metadata?.logoUrl; // Will try backend logo first
        const hasCustomBranding = userLogoUrl || this.data?.metadata?.company;
        
        const logoImage = footerGroup.append('image')
            .attr('x', 10)
            .attr('y', -100)  // Moved up slightly for larger logo
            .attr('width', hasBackendLogo ? 200 : 32)  // Much larger for backend logo: 200px
            .attr('height', hasBackendLogo ? 200 : 32)
            .attr('href', primaryLogoUrl)
            .attr('opacity', 1.0)  // Full opacity
            .style('cursor', 'pointer')
            .on('error', function() {
                console.log('⚠️ Primary logo failed to load, trying fallback');
                // Try fallback logo
                d3.select(this)
                    .attr('href', fallbackLogoUrl)
                    .attr('width', userLogoUrl ? 32 : 24)
                    .attr('height', userLogoUrl ? 32 : 24)
                    .on('error', function() {
                        console.log('⚠️ Fallback logo failed, using default');
                        // Final fallback to default
                        d3.select(this)
                            .attr('href', defaultLogoUrl)
                            .attr('width', 24)
                            .attr('height', 24);
                    });
            });

        // Only show text branding if no backend logo
        if (!hasBackendLogo || primaryLogoUrl === defaultLogoUrl) {
            // Custom company name or default text
            const companyName = this.data?.metadata?.company || 'PULSE ANALYTICS';
            
            footerGroup.append('text')
                .attr('x', hasCustomBranding ? 65 : 50)  // Adjust position for larger custom logo
                .attr('y', -25)
                .attr('font-size', '16px')
                .attr('font-weight', '800')
                .attr('font-family', 'Inter, sans-serif')
                .attr('fill', '#667eea')
                .text(companyName);

            // Right side attribution - only show if not using custom branding
            if (!hasCustomBranding) {
                footerGroup.append('text')
                    .attr('x', this.config.width - 10)
                    .attr('y', -25)
                    .attr('text-anchor', 'end')
                    .attr('font-size', '16px')
                    .attr('font-weight', '800')
                    .attr('font-family', 'Inter, sans-serif')
                    .attr('fill', '#667eea')
                    .attr('opacity', 0.7)
                    .text('Generated by Pulse Charts');
            } else {
                // Show subtle attribution for custom branding
                footerGroup.append('text')
                    .attr('x', this.config.width - 10)
                    .attr('y', -25)
                    .attr('text-anchor', 'end')
                    .attr('font-size', '12px')
                    .attr('font-weight', '400')
                    .attr('font-family', 'Inter, sans-serif')
                    .attr('fill', '#94a3b8')
                    .attr('opacity', 0.6)
                    .text('Powered by Pulse Charts');
            }
        }
    }

    renderBrandLogoFallback() {
        // Minimal fallback - just log that brand logo would be rendered
        const brandLogo = this.data?.metadata?.brandLogo;
        if (brandLogo && brandLogo.url) {
            console.warn('⚠️ Brand logo fallback - basic rendering only');
            const logoGroup = this.svg.append('g').attr('class', 'chart-brand-logo');
            logoGroup.append('image')
                .attr('href', brandLogo.url)
                .attr('x', brandLogo.x || 10)
                .attr('y', brandLogo.y || 10)
                .attr('width', brandLogo.width || 50)
                .attr('height', brandLogo.height || 50)
                .attr('opacity', brandLogo.opacity || 1);
        }
    }

    // Fallback utility methods
    updateBackgroundColorFallback(color) {
        console.warn('⚠️ Using fallback background color update');
        this.config.backgroundColor = color;
        // Update both container and SVG to ensure consistent background
        if (this.container) {
            this.container.style('background-color', color);
        }
        if (this.svg) {
            this.svg.style('background-color', color);
        }
    }

    updateTitleFontFallback(fontFamily) {
        console.warn('⚠️ Using fallback title font update');
        this.config.titleFont = fontFamily;
        if (this.svg) {
            this.svg.selectAll('text').style('font-family', fontFamily);
        }
    }

    updateTitleColorFallback(color) {
        console.warn('⚠️ Using fallback title color update');
        this.config.titleColor = color;
        if (this.svg) {
            this.svg.selectAll('text').style('fill', color);
        }
    }

    updateNodeColor(node, color) {
        console.log(`🎨 Updating node ${node.id} color to ${color} (${this.statementType} statement)`);
        
        if (this.statementType === 'balance') {
            // For balance sheets, update the appropriate group color
            const colorGroup = this.colorGroups.get(node.id);
            if (colorGroup && colorGroup.groupName) {
                this.customColors[colorGroup.groupName] = color;
                console.log(`🎯 Set balance sheet group color: ${colorGroup.groupName} → ${color}`);
                
                // Update metadata
                if (this.data && this.data.metadata) {
                    if (!this.data.metadata.colorPalette) {
                        this.data.metadata.colorPalette = {};
                    }
                    this.data.metadata.colorPalette[colorGroup.groupName] = color;
                }
                
                // Reassign color groups and re-render
                this.assignColorGroups();
                this.rerenderWithNewColors();
                return;
            }
        }
        
        // Income statement logic
        if (window.FinancialDataProcessor && FinancialDataProcessor.isPreRevenueNode(node, this.revenueHubLayer)) {
            // Individual revenue segment color
            this.revenueSegmentColors.set(node.id, color);
            console.log(`🎯 Set revenue segment color: ${node.id} → ${color}`);
            
            // Update metadata for revenue segments
            if (this.data && this.data.metadata) {
                if (!this.data.metadata.revenueSegmentColors) {
                    this.data.metadata.revenueSegmentColors = {};
                }
                this.data.metadata.revenueSegmentColors[node.id] = color;
            }
        } else {
            // Category-based color for post-revenue nodes
            let effectiveCategory = node.category;
            if (node.category === 'tax') {
                effectiveCategory = 'expense';
            }
            
            this.customColors[effectiveCategory] = color;
            console.log(`🎯 Set category color: ${effectiveCategory} → ${color}`);
            
            // Handle tax as expense alias
            if (effectiveCategory === 'expense') {
                this.customColors['tax'] = color;
            }
            
            // Update metadata for categories
            if (this.data && this.data.metadata) {
                if (!this.data.metadata.colorPalette) {
                    this.data.metadata.colorPalette = {};
                }
                this.data.metadata.colorPalette[effectiveCategory] = color;
                if (effectiveCategory === 'expense') {
                    this.data.metadata.colorPalette['tax'] = color;
                }
            }
        }
        
        // Re-render with new colors
        this.rerenderWithNewColors();
        
        // Trigger control panel update if available
        if (window.controlPanel && window.controlPanel.refreshDynamicControls) {
            window.controlPanel.refreshDynamicControls();
        }
    }

    updateLinkColor(link, color) {
        console.log(`🔗 Updating link color: ${link.source.id} → ${link.target.id} = ${color} (${this.statementType} statement)`);
        
        if (this.statementType === 'balance') {
            // For balance sheets, determine which group to update based on link direction
            const isToTotalAssets = link.target.id.toLowerCase().includes('total assets');
            const isFromTotalAssets = link.source.id.toLowerCase().includes('total assets');
            
            let targetNode = isToTotalAssets ? link.source : link.target;
            const colorGroup = this.colorGroups.get(targetNode.id);
            
            if (colorGroup && colorGroup.groupName) {
                this.customColors[colorGroup.groupName] = color;
                console.log(`🎯 Set balance sheet group color via link: ${colorGroup.groupName} → ${color}`);
                
                // Update metadata
                if (this.data && this.data.metadata) {
                    if (!this.data.metadata.colorPalette) {
                        this.data.metadata.colorPalette = {};
                    }
                    this.data.metadata.colorPalette[colorGroup.groupName] = color;
                }
                
                // Reassign color groups and re-render
                this.assignColorGroups();
                this.rerenderWithNewColors();
                return;
            }
        }
        
        // Income statement logic
        if (window.FinancialDataProcessor && FinancialDataProcessor.isPreRevenueLink(link, this.revenueHubLayer)) {
            // For pre-revenue links, update the source node's individual color
            this.revenueSegmentColors.set(link.source.id, color);
            console.log(`🎯 Set revenue segment color via link: ${link.source.id} → ${color}`);
            
            // Update metadata
            if (this.data && this.data.metadata) {
                if (!this.data.metadata.revenueSegmentColors) {
                    this.data.metadata.revenueSegmentColors = {};
                }
                this.data.metadata.revenueSegmentColors[link.source.id] = color;
            }
        } else {
            // For post-revenue links, update target category color
            let effectiveCategory = link.target.category;
            if (link.target.category === 'tax') {
                effectiveCategory = 'expense';
            }
            
            this.customColors[effectiveCategory] = color;
            console.log(`🎯 Set category color via link: ${effectiveCategory} → ${color}`);
            
            // Handle tax as expense alias
            if (effectiveCategory === 'expense') {
                this.customColors['tax'] = color;
            }
            
            // Update metadata
            if (this.data && this.data.metadata) {
                if (!this.data.metadata.colorPalette) {
                    this.data.metadata.colorPalette = {};
                }
                this.data.metadata.colorPalette[effectiveCategory] = color;
                if (effectiveCategory === 'expense') {
                    this.data.metadata.colorPalette['tax'] = color;
                }
            }
        }
        
        this.rerenderWithNewColors();
    }

    render(data) {
        this.data = data;
        
        // Use FinancialDataProcessor for financial analysis
        if (window.FinancialDataProcessor) {
            this.statementType = FinancialDataProcessor.detectStatementType(data);
        } else {
            console.warn('⚠️ FinancialDataProcessor not available, using fallback');
            this.detectStatementTypeFallback(data);
        }
        
        this.detectAndApplyColors(data);
        
        if (this.statementType === 'balance') {
            if (window.FinancialDataProcessor) {
                this.colorGroups = FinancialDataProcessor.assignColorGroups(this.nodes, this.links, this.customColors);
            } else {
                console.warn('⚠️ FinancialDataProcessor not available for color groups');
            }
        }
        
        this.processData(data);
        
        // Use FinancialDataProcessor for revenue hub detection
        if (window.FinancialDataProcessor) {
            const revenueHubResult = FinancialDataProcessor.detectRevenueHub(this.nodes, this.links);
            this.revenueHubNode = revenueHubResult.node;
            this.revenueHubLayer = revenueHubResult.layer;
        } else {
            console.warn('⚠️ FinancialDataProcessor not available, using fallback revenue hub detection');
            this.detectRevenueHubFallback();
        }
        
        this.calculateLayout();  // Layout first
        
        // Use FinancialDataProcessor for financial metrics
        if (window.FinancialDataProcessor) {
            FinancialDataProcessor.calculateFinancialMetrics(this.nodes, this.revenueHubNode, this.formatCurrency.bind(this));
        } else {
            console.warn('⚠️ FinancialDataProcessor not available, using fallback metrics calculation');
            this.calculateFinancialMetricsFallback();
        }
        
        this.chart.selectAll('*').remove();
        this.svg.selectAll('.chart-header, .chart-footnotes, .chart-branding').remove();
        
        // Initialize all branding elements with fallback support
        this.initializeBranding();
        this.renderLinks();
        this.renderNodes();
        this.renderLabels();
        
        // Add attribution text directly to SVG for export visibility
        this.svg.selectAll('.chart-attribution').remove(); // Remove any existing

        const attributionText = this.svg.append('text')
            .attr('class', 'chart-attribution')
            .attr('x', this.config.width - 20)  // 20px from right edge
            .attr('y', this.config.height - 20) // 20px from bottom edge  
            .attr('text-anchor', 'end')
            .attr('font-size', '14px')
            .attr('font-weight', 'bold')
            .attr('font-family', 'Arial, sans-serif')
            .attr('fill', '#94a3b8')  // Grey color
            .attr('opacity', 0.6)     // 60% opacity
            .text('PULSE ANALYTICS');
        
        return this;
    }

    detectRevenueHub() {
        console.warn('detectRevenueHub() has been moved to FinancialDataProcessor - using fallback');
        this.revenueHubLayer = 1;
    }

    isPreRevenueNode(node) {
        console.warn('isPreRevenueNode() has been moved to FinancialDataProcessor - using fallback');
        return false;
    }

    isPreRevenueLink(link) {
        console.warn('isPreRevenueLink() has been moved to FinancialDataProcessor - using fallback');
        return false;
    }

    detectAndApplyColors(data) {
        // Preserve existing revenue segment colors before applying new colors
        const existingSegmentColors = new Map(this.revenueSegmentColors);
        
        // Apply revenue segment colors from metadata
        if (data.metadata && data.metadata.revenueSegmentColors) {
            console.log('🎨 Applying revenue segment colors from metadata:', data.metadata.revenueSegmentColors);
            Object.entries(data.metadata.revenueSegmentColors).forEach(([nodeId, color]) => {
                this.revenueSegmentColors.set(nodeId, color);
            });
        }
        
        // Restore any existing segment colors that weren't in metadata
        existingSegmentColors.forEach((color, nodeId) => {
            if (!this.revenueSegmentColors.has(nodeId)) {
                this.revenueSegmentColors.set(nodeId, color);
                console.log(`🔒 Preserved existing segment color: ${nodeId} → ${color}`);
            }
        });

        if (data.metadata && data.metadata.colorPalette) {
            console.log('🎨 Detected color palette from metadata:', data.metadata.colorPalette);
            this.customColors = { ...data.metadata.colorPalette };
            
            if (this.customColors.expense && !this.customColors.tax) {
                this.customColors.tax = this.customColors.expense;
            }
            
            console.log('✅ Applied colors from metadata:', this.customColors);
        } else if (Object.keys(this.customColors).length === 0) {
            if (this.statementType === 'balance') {
                // Enhanced vibrant default balance sheet colors
                this.customColors = {
                    'Total Assets': '#1e293b',        // Deep slate
                    'Current Assets': '#1e40af',      // Vibrant blue
                    'Non-Current Assets': '#7c3aed',  // Vibrant purple
                    'Current Liabilities': '#dc2626', // Sharp red
                    'Non-Current Liabilities': '#b91c1c', // Deep red
                    'Shareholders Equity': '#059669'  // Vibrant emerald
                };
                console.log('🎨 Applied enhanced vibrant balance sheet colors:', this.customColors);
            } else {
                console.log('🎨 Using enhanced vibrant income statement color scheme');
            }
        }
    }

    /**
     * Enhanced auto-scale node height with user input interpretation for scaling only
     * Rule: 3000 = 3 Billion, 300 = 300 Million (affects node height scaling, not display values)
     */
    autoScaleNodeHeight(data) {
        if (!data || !data.nodes) return;

        // ========== CONFIGURATION SECTION - CHANGE THESE NUMBERS ==========
        const BILLION_THRESHOLD = 1000;      // Values ≥ this are treated as billions (e.g., 3000 = 3B)
        const BILLION_SCALE = 0.04;          // Scale for billion-range values (smaller scale for big numbers)
        const MILLION_SCALE = 0.5;          // Scale for million-range values (bigger scale for smaller numbers)
        // =====================================================================

        const values = data.nodes.map(node => Math.abs(node.value || 0)).filter(v => v > 0);
        if (values.length === 0) return;

        const maxValue = Math.max(...values);
        let optimalScale;

        // Simple logic: bigger numbers need smaller scale, smaller numbers need bigger scale
        if (maxValue >= BILLION_THRESHOLD) {
            // User input like 3000+ → treat as billions → use smaller scale
            optimalScale = BILLION_SCALE;
            console.log('📏 Billions scale applied (user input ≥' + BILLION_THRESHOLD + '): ' + optimalScale);
        } else {
            // User input like 300 → treat as millions → use bigger scale  
            optimalScale = MILLION_SCALE;
            console.log('📏 Millions scale applied (user input <' + BILLION_THRESHOLD + '): ' + optimalScale);
        }

        // Only auto-scale if user hasn't manually adjusted nodeHeightScale
        const defaultScales = [0.65, 0.05, 0.01, 0.00008, 0.00000008, 0.0002, 0.15];
        const isDefaultScale = defaultScales.some(scale => Math.abs(this.config.nodeHeightScale - scale) < 0.0001);
        
        console.log('📏 Current nodeHeightScale:', this.config.nodeHeightScale, 'isDefault:', isDefaultScale);
        
        if (isDefaultScale) {
            this.config.nodeHeightScale = optimalScale;
            console.log('📏 Applied auto-scale:', optimalScale);
        }
    }

    processData(data) {
        const nodeMap = new Map();
        
        // Auto-scale node height based on data magnitude with input interpretation
        this.autoScaleNodeHeight(data);
        
        // Store existing manual positioning info from current nodes AND metadata
        const existingManualPositions = new Map();
        
        // First, get from current nodes
        if (this.nodes) {
            this.nodes.forEach(node => {
                if (node.manuallyPositioned) {
                    existingManualPositions.set(node.id, {
                        manuallyPositioned: true,
                        y: node.y,
                        preserveLabelsAbove: node.preserveLabelsAbove
                    });
                }
            });
        }
        
        // Then, restore from metadata (takes priority)
        if (data.metadata && data.metadata.manualPositions) {
            Object.entries(data.metadata.manualPositions).forEach(([nodeId, positionData]) => {
                existingManualPositions.set(nodeId, positionData);
                console.log(`🔄 Restored manual position for ${nodeId}: Y=${positionData.y}`);
            });
        }
        
        data.nodes.forEach(node => {
            const existingInfo = existingManualPositions.get(node.id);
            nodeMap.set(node.id, {
                ...node,
                sourceLinks: [],
                targetLinks: [],
                value: node.value || 0,
                manuallyPositioned: existingInfo?.manuallyPositioned || false,
                manualY: existingInfo?.y || null,
                preserveLabelsAbove: existingInfo?.preserveLabelsAbove || null
            });
        });
        
        const processedLinks = [];
        data.links.forEach(link => {
            const sourceNode = nodeMap.get(link.source);
            const targetNode = nodeMap.get(link.target);
            
            if (sourceNode && targetNode) {
                const processedLink = {
                    ...link,
                    source: sourceNode,
                    target: targetNode,
                    value: link.value || 0,
                    targetCategory: targetNode.category,
                    colorCategory: link.colorCategory || targetNode.category
                };
                
                sourceNode.sourceLinks.push(processedLink);
                targetNode.targetLinks.push(processedLink);
                processedLinks.push(processedLink);
            }
        });
        
        this.nodes = Array.from(nodeMap.values());
        this.links = processedLinks;
    }

    calculateFinancialMetrics() {
        console.warn('calculateFinancialMetrics() has been moved to FinancialDataProcessor - using fallback');
        this.nodes.forEach(node => { node.marginPercentage = '0%'; node.marginType = 'N/A'; });
    }

    calculateLayout() {
        const dimensions = {
            width: this.config.width - this.config.margin.left - this.config.margin.right,
            height: this.config.height - this.config.margin.top - this.config.margin.bottom
        };

        const nodesByDepth = d3.group(this.nodes, d => d.depth);
        const depths = Array.from(nodesByDepth.keys()).sort((a, b) => a - b);
        const maxDepth = Math.max(...depths);
        const minDepth = Math.min(...depths);

        // Create scale that properly distributes all depth levels
        const xScale = d3.scaleLinear()
            .domain([minDepth, maxDepth])
            .range([0, dimensions.width - this.config.nodeWidth]);

        this.nodes.forEach(node => {
            node.x = xScale(node.depth);
        });

        // ENHANCED: Apply proportional node heights for balance sheets
        if (this.statementType === 'balance') {
            this.calculateProportionalHeights();
        } else {
            // Standard height calculation for income statements
            this.nodes.forEach(node => {
                node.height = Math.max(8, node.value * this.config.nodeHeightScale);
            });
        }

        depths.forEach(depth => {
            const nodesAtDepth = nodesByDepth.get(depth);
            this.positionNodesAtDepth(nodesAtDepth, dimensions.height, maxDepth);
        });

        this.applyManualPositions();
        this.minimizeCrossings();
        this.calculateLinkPositions();
    }

    /**
     * NEW: Calculate proportional node heights ensuring child nodes sum to parent height
     */
    calculateProportionalHeights() {
        console.log('📏 Calculating proportional node heights for balance sheet');
        
        // First pass: Calculate base heights using standard formula
        this.nodes.forEach(node => {
            node.baseHeight = Math.max(8, node.value * this.config.nodeHeightScale);
        });
        
        // Identify parent-child relationships
        const parentChildMap = this.buildParentChildMap();
        
        // Second pass: Adjust heights to ensure proportionality
        this.adjustHeightsForProportionality(parentChildMap);
        
        console.log('✅ Proportional heights calculated');
    }

    /**
     * Build parent-child relationship map for balance sheet nodes
     */
    buildParentChildMap() {
        const parentChildMap = new Map();
        
        this.links.forEach(link => {
            const parentId = link.target.id;
            const childId = link.source.id;
            
            // Check if this is a parent-child relationship (child flows into parent)
            const isParentChild = this.isParentChildRelationship(link.source, link.target);
            
            if (isParentChild) {
                if (!parentChildMap.has(parentId)) {
                    parentChildMap.set(parentId, []);
                }
                parentChildMap.get(parentId).push({
                    node: link.source,
                    value: link.value
                });
                
                console.log(`👨‍👩‍👧‍👦 Parent-child: ${childId} → ${parentId} (value: ${link.value})`);
            }
        });
        
        return parentChildMap;
    }

    /**
     * Check if a link represents a parent-child relationship in balance sheet
     */
    isParentChildRelationship(source, target) {
        const targetLower = target.id.toLowerCase();
        const sourceLower = source.id.toLowerCase();
        
        // Total Assets receives from all asset components
        if (targetLower.includes('total assets')) {
            return sourceLower.includes('asset');
        }
        
        // Current Assets receives from individual current assets
        if (targetLower.includes('current assets') && !targetLower.includes('total')) {
            return sourceLower.includes('cash') || 
                   sourceLower.includes('receivable') || 
                   sourceLower.includes('inventory') ||
                   sourceLower.includes('prepaid');
        }
        
        // Non-Current Assets receives from individual non-current assets
        if (targetLower.includes('non-current assets') || targetLower.includes('noncurrent assets')) {
            return sourceLower.includes('property') || 
                   sourceLower.includes('equipment') || 
                   sourceLower.includes('intangible') ||
                   sourceLower.includes('fixed');
        }
        
        // Similar logic for liabilities and equity
        if (targetLower.includes('current liabilities') && !targetLower.includes('total')) {
            return sourceLower.includes('payable') || 
                   sourceLower.includes('accrued') ||
                   sourceLower.includes('short-term');
        }
        
        if (targetLower.includes('non-current liabilities') || targetLower.includes('noncurrent liabilities')) {
            return sourceLower.includes('long-term') || 
                   sourceLower.includes('bonds') ||
                   sourceLower.includes('notes');
        }
        
        if (targetLower.includes('equity') || targetLower.includes('shareholders')) {
            return sourceLower.includes('stock') || 
                   sourceLower.includes('retained') ||
                   sourceLower.includes('capital');
        }
        
        return false;
    }

    /**
     * Adjust node heights to ensure child nodes sum to parent height
     */
    adjustHeightsForProportionality(parentChildMap) {
        parentChildMap.forEach((children, parentId) => {
            const parentNode = this.nodes.find(n => n.id === parentId);
            if (!parentNode || children.length === 0) return;
            
            const totalChildValue = children.reduce((sum, child) => sum + child.value, 0);
            if (totalChildValue === 0) return;
            
            // Calculate parent's target height based on its value
            const parentTargetHeight = Math.max(8, parentNode.value * this.config.nodeHeightScale);
            
            console.log(`📏 Adjusting children of ${parentId}: parent target height=${parentTargetHeight}, total child value=${totalChildValue}`);
            
            // Calculate raw proportional heights
            const rawHeights = children.map(child => {
                const proportion = child.value / totalChildValue;
                return {
                    child,
                    proportion,
                    rawHeight: parentTargetHeight * proportion,
                    minHeight: 8
                };
            });
            
            // Apply minimum height constraints and calculate adjustment
            let totalRawHeight = 0;
            let totalMinHeight = 0;
            rawHeights.forEach(item => {
                totalRawHeight += item.rawHeight;
                totalMinHeight += Math.max(item.minHeight, item.rawHeight);
            });
            
            // Distribute heights ensuring they sum to parent height
            let remainingHeight = parentTargetHeight;
            let childrenNeedingAdjustment = [...rawHeights];
            
            // First pass: assign minimum heights
            childrenNeedingAdjustment.forEach(item => {
                if (item.rawHeight < item.minHeight) {
                    item.child.node.height = item.minHeight;
                    remainingHeight -= item.minHeight;
                } else {
                    item.child.node.height = 0; // Will be set in second pass
                }
            });
            
            // Second pass: distribute remaining height proportionally among nodes that don't need minimum height boost
            const flexibleChildren = childrenNeedingAdjustment.filter(item => item.rawHeight >= item.minHeight);
            const totalFlexibleValue = flexibleChildren.reduce((sum, item) => sum + item.child.value, 0);
            
            if (totalFlexibleValue > 0 && remainingHeight > 0) {
                flexibleChildren.forEach(item => {
                    const flexProportion = item.child.value / totalFlexibleValue;
                    item.child.node.height = remainingHeight * flexProportion;
                });
            }
            
            // Set the parent's height to match the sum of children
            const actualChildSum = children.reduce((sum, child) => sum + child.node.height, 0);
            parentNode.height = actualChildSum;
            
            console.log(`  📊 Parent ${parentId} height set to ${parentNode.height.toFixed(1)} (sum of children)`);
            children.forEach(child => {
                const proportion = totalChildValue > 0 ? child.value / totalChildValue : 0;
                console.log(`  📐 ${child.node.id}: proportion=${(proportion*100).toFixed(1)}%, height=${child.node.height.toFixed(1)}`);
            });
        });
        
        // Set heights for nodes that aren't children (they keep their base height)
        this.nodes.forEach(node => {
            if (node.height === undefined) {
                node.height = node.baseHeight;
                console.log(`📐 ${node.id}: using base height=${node.height.toFixed(1)}`);
            }
        });
    }

    applyManualPositions() {
        this.nodes.forEach(node => {
            if (node.manuallyPositioned && node.manualY !== null) {
                node.y = node.manualY;
                if (node.preserveLabelsAbove !== null) {
                    node.originalLayerIndex = node.preserveLabelsAbove ? 0 : 1;
                }
            }
        });
    }

    positionNodesAtDepth(nodes, availableHeight, maxDepth) {
        const groupedNodes = this.groupNodes(nodes);
        const depth = nodes[0]?.depth ?? 0;
        
        const isLeftmost = depth === 0;
        const isRightmost = depth === maxDepth;
        
        let layerPadding;
        
        if (isLeftmost) {
            layerPadding = this.config.nodePadding * this.config.leftmostSpacing;
        } else if (isRightmost) {
            layerPadding = this.config.nodePadding * this.config.rightmostSpacing;
        } else {
            layerPadding = this.config.nodePadding * this.config.middleSpacing;
        }

        if ((isLeftmost || isRightmost) && groupedNodes.length > 1) {
            this.positionNodesWithGroupSpacing(groupedNodes, availableHeight, layerPadding, isLeftmost, isRightmost);
        } else {
            this.positionNodesStandard(groupedNodes, availableHeight, layerPadding);
        }
    }

    positionNodesWithGroupSpacing(nodes, availableHeight, basePadding, isLeftmost, isRightmost) {
        console.log(`🔧 Applying group spacing for ${isLeftmost ? 'leftmost' : 'rightmost'} layer`);
        
        const manualNodes = nodes.filter(node => node.manuallyPositioned);
        const autoNodes = nodes.filter(node => !node.manuallyPositioned);
        
        if (autoNodes.length === 0) {
            console.log('All nodes manually positioned, skipping automatic positioning');
            return; 
        }
        
        // Create individual groups to maintain data order
        const groups = autoNodes.map(node => ({
            name: `Individual: ${node.id}`,
            nodes: [node]
        }));
        console.log(`📊 Positioning ${groups.length} nodes in data order`);
        
        const totalNodeHeight = autoNodes.reduce((sum, node) => sum + node.height, 0);
        const totalBasePadding = basePadding * (autoNodes.length - 1);
        
        const groupGap = isLeftmost ? this.config.leftmostGroupGap : this.config.rightmostGroupGap;
        const totalGroupGaps = groupGap * (groups.length - 1);
        
        const totalRequired = totalNodeHeight + totalBasePadding + totalGroupGaps;
        
        // Better centering: add offset to push content toward center
        const centeredY = (availableHeight - totalRequired) / 2;
        const startY = Math.max(30, centeredY + 20);
        let currentY = startY;
        
        groups.forEach((group, groupIndex) => {
            console.log(`📍 Positioning group "${group.name}" at Y: ${currentY}`);
            
            group.nodes.forEach((node, nodeIndex) => {
                node.y = currentY;
                node.layerIndex = groupIndex * 100 + nodeIndex;
                currentY += node.height;
                
                if (nodeIndex < group.nodes.length - 1) {
                    currentY += basePadding;
                }
            });
            
            if (groupIndex < groups.length - 1) {
                currentY += groupGap;
                console.log(`📏 Added ${groupGap}px group gap after "${group.name}"`);
            }
        });
        
        manualNodes.forEach((node, index) => {
            node.layerIndex = 1000 + index;
        });
        
        console.log(`✅ Group spacing applied. Total height used: ${currentY - startY}px`);
    }

    // detectNodeGroups function removed - maintaining data order

    // detectPatternGroups function removed - maintaining data order

    positionNodesStandard(nodes, availableHeight, layerPadding) {
        const nodesToPosition = nodes.filter(node => !node.manuallyPositioned);
        const manualNodes = nodes.filter(node => node.manuallyPositioned);
        
        if (nodesToPosition.length === 0) return;
        
        const totalHeight = d3.sum(nodesToPosition, d => d.height);
        const totalPadding = layerPadding * (nodesToPosition.length - 1);
        const totalRequired = totalHeight + totalPadding;
        
        // Better centering: add offset to push content toward center
        const centeredY = (availableHeight - totalRequired) / 2;
        const startY = Math.max(30, centeredY + 20);
        let currentY = startY;
        
        nodesToPosition.forEach((node, index) => {
            node.y = currentY;
            node.layerIndex = index;
            currentY += node.height + layerPadding;
        });
        
        manualNodes.forEach((node, index) => {
            node.layerIndex = nodesToPosition.length + index;
        });
    }

    minimizeCrossings() {
        const nodesByDepth = d3.group(this.nodes, d => d.depth);
        const depths = Array.from(nodesByDepth.keys());
        
        for (let iteration = 0; iteration < 4; iteration++) {
            for (let i = 1; i < depths.length; i++) {
                const currentDepth = depths[i];
                const nodes = nodesByDepth.get(currentDepth);
                // Sorting removed - maintain original data order
            }
            
            for (let i = depths.length - 2; i >= 0; i--) {
                const currentDepth = depths[i];
                const nodes = nodesByDepth.get(currentDepth);
                // Sorting removed - maintain original data order
            }
        }
        
        depths.forEach(depth => {
            const nodesAtDepth = nodesByDepth.get(depth);
            this.recalculateYPositions(nodesAtDepth);
        });
    }

    // sortNodesByBarycenter function removed - maintaining original data order

    recalculateYPositions(nodes) {
        if (nodes.length === 0) return;
        
        const manualNodes = nodes.filter(node => node.manuallyPositioned);
        const autoNodes = nodes.filter(node => !node.manuallyPositioned);
        
        if (autoNodes.length === 0) {
            console.log('All nodes manually positioned, skipping recalculation');
            return;
        }
        
        const depth = nodes[0].depth;
        const maxDepth = Math.max(...this.nodes.map(n => n.depth));
        const isLeftmost = depth === 0;
        const isRightmost = depth === maxDepth;
        
        let layerPadding;
        if (isLeftmost) {
            layerPadding = this.config.nodePadding * this.config.leftmostSpacing;
        } else if (isRightmost) {
            layerPadding = this.config.nodePadding * this.config.rightmostSpacing;
        } else {
            layerPadding = this.config.nodePadding * this.config.middleSpacing;
        }
        
        const availableHeight = this.config.height - this.config.margin.top - this.config.margin.bottom;
        
        if ((isLeftmost || isRightmost) && autoNodes.length > 1) {
            // Use group spacing for leftmost/rightmost layers but maintain data order
            this.positionNodesWithGroupSpacing(autoNodes, availableHeight, layerPadding, isLeftmost, isRightmost);
            return;
        }
        
        const totalHeight = d3.sum(autoNodes, d => d.height);
        const totalPadding = layerPadding * (autoNodes.length - 1);
        const totalRequired = totalHeight + totalPadding;
        
        // Better centering: add offset to push content toward center
        const centeredY = (availableHeight - totalRequired) / 2;
        const startY = Math.max(30, centeredY + 20);
        let currentY = startY;
        
        autoNodes.forEach((node, index) => {
            node.y = currentY;
            node.layerIndex = index;
            currentY += node.height + layerPadding;
        });
        
        manualNodes.forEach((node, index) => {
            node.layerIndex = autoNodes.length + index;
        });
    }

    groupNodes(nodes) {
        // Return nodes as individual groups to maintain data order
        return nodes.map(node => ({
            name: `Individual: ${node.id}`,
            nodes: [node]
        }));
    }

    // sortNodesInGroup function removed - maintaining original data order

    // applySortingMethod function removed - maintaining original data order

    // sortFinalLayerBySource function removed - maintaining original data order

    calculateLinkPositions() {
        this.links.forEach(link => {
            link.width = link.value * this.config.linkWidthScale;
        });
        
        this.nodes.forEach(node => {
            if (node.sourceLinks.length === 0) return;
            
            // Sorting removed - maintain original link order
            
            const totalOutflow = d3.sum(node.sourceLinks, d => d.value);
            const effectiveNodeHeight = node.height * this.config.linkWidthScale;
            
            let currentY = node.y + (node.height - effectiveNodeHeight) / 2;
            
            node.sourceLinks.forEach((link, index) => {
                link.sourceY = currentY;
                const proportionalHeight = (link.value / totalOutflow) * effectiveNodeHeight;
                link.sourceHeight = proportionalHeight;
                currentY += proportionalHeight;
            });
            
            const totalUsedHeight = d3.sum(node.sourceLinks, d => d.sourceHeight);
            if (Math.abs(totalUsedHeight - effectiveNodeHeight) > 0.01) {
                const lastLink = node.sourceLinks[node.sourceLinks.length - 1];
                lastLink.sourceHeight += (effectiveNodeHeight - totalUsedHeight);
            }
        });
        
        this.nodes.forEach(node => {
            if (node.targetLinks.length === 0) return;
            
            // Sorting removed - maintain original link order
            
            const totalInflow = d3.sum(node.targetLinks, d => d.value);
            const effectiveNodeHeight = node.height * this.config.linkWidthScale;
            
            let currentY = node.y + (node.height - effectiveNodeHeight) / 2;
            
            node.targetLinks.forEach((link, index) => {
                link.targetY = currentY;
                const proportionalHeight = (link.value / totalInflow) * effectiveNodeHeight;
                link.targetHeight = proportionalHeight;
                currentY += proportionalHeight;
            });
            
            const totalUsedHeight = d3.sum(node.targetLinks, d => d.targetHeight);
            if (Math.abs(totalUsedHeight - effectiveNodeHeight) > 0.01) {
                const lastLink = node.targetLinks[node.targetLinks.length - 1];
                lastLink.targetHeight += (effectiveNodeHeight - totalUsedHeight);
            }
        });
        
        this.links.forEach(link => {
            const sourceDepth = link.source.depth;
            const layerCurvature = this.config.layerCurvature?.[sourceDepth] || this.config.curveIntensity;
            link.path = this.createSmoothPath(link, layerCurvature);
        });
    }

    createSmoothPath(link, curvature = this.config.curveIntensity) {
        const sourceX = link.source.x + this.config.nodeWidth;
        const targetX = link.target.x;
        
        const sourceY0 = link.sourceY;
        const sourceY1 = link.sourceY + link.sourceHeight;
        const targetY0 = link.targetY;
        const targetY1 = link.targetY + link.targetHeight;
        
        const controlX1 = sourceX + (targetX - sourceX) * curvature;
        const controlX2 = targetX - (targetX - sourceX) * curvature;
        
        return `M${sourceX},${sourceY0}
                C${controlX1},${sourceY0} ${controlX2},${targetY0} ${targetX},${targetY0}
                L${targetX},${targetY1}
                C${controlX2},${targetY1} ${controlX1},${sourceY1} ${sourceX},${sourceY1}
                Z`;
    }

    /**
     * ENHANCED: Dynamic title based on statement type
     */


    renderBrandLogo() {
        // Remove any existing brand logo
        this.svg.selectAll('.chart-brand-logo').remove();
        
        // Check if brand logo is configured
        const brandLogo = this.data?.metadata?.brandLogo;
        if (!brandLogo || !brandLogo.url) {
            return;
        }

        console.log('🏢 Rendering brand logo with hover-based resize functionality:', brandLogo);

        // Create brand logo group
        const logoGroup = this.svg.append('g')
            .attr('class', 'chart-brand-logo');

        // Add selection rectangle (only visible on hover)
        const selectionRect = logoGroup.append('rect')
            .attr('class', 'logo-selection')
            .attr('x', brandLogo.x - 5)
            .attr('y', brandLogo.y - 5)
            .attr('width', brandLogo.width + 10)
            .attr('height', brandLogo.height + 10)
            .attr('fill', 'none')
            .attr('stroke', '#667eea')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5')
            .attr('opacity', 0)
            .style('pointer-events', 'none');

        // Add brand logo image
        const logoImage = logoGroup.append('image')
            .attr('class', 'brand-image')
            .attr('href', brandLogo.url)
            .attr('x', brandLogo.x)
            .attr('y', brandLogo.y)
            .attr('width', brandLogo.width)
            .attr('height', brandLogo.height)
            .attr('opacity', brandLogo.opacity)
            .style('cursor', 'move')
            .on('error', function() {
                console.error('❌ Failed to load brand logo image');
                d3.select(this).remove();
            });

        // Add resize handles (only visible on hover)
        const handles = ['nw', 'ne', 'sw', 'se'];
        const resizeHandles = [];
        
        handles.forEach(handle => {
            let x, y;
            switch(handle) {
                case 'nw': x = brandLogo.x - 5; y = brandLogo.y - 5; break;
                case 'ne': x = brandLogo.x + brandLogo.width - 3; y = brandLogo.y - 5; break;
                case 'sw': x = brandLogo.x - 5; y = brandLogo.y + brandLogo.height - 3; break;
                case 'se': x = brandLogo.x + brandLogo.width - 3; y = brandLogo.y + brandLogo.height - 3; break;
            }
            
            const handleRect = logoGroup.append('rect')
                .attr('class', `resize-handle resize-${handle}`)
                .attr('x', x)
                .attr('y', y)
                .attr('width', 8)
                .attr('height', 8)
                .attr('fill', '#667eea')
                .attr('stroke', 'white')
                .attr('stroke-width', 1)
                .attr('opacity', 0)
                .style('cursor', `${handle}-resize`)
                .style('pointer-events', 'none');
                
            resizeHandles.push(handleRect);
        });

        // Hover functionality to show/hide resize handles
        logoGroup
            .on('mouseenter', () => {
                // Show selection rectangle and handles on hover
                selectionRect.attr('opacity', 1);
                resizeHandles.forEach(handle => {
                    handle.attr('opacity', 1).style('pointer-events', 'all');
                });
            })
            .on('mouseleave', () => {
                // Hide selection rectangle and handles when not hovering
                if (!brandLogo.isDragging && !brandLogo.isResizing) {
                    selectionRect.attr('opacity', 0);
                    resizeHandles.forEach(handle => {
                        handle.attr('opacity', 0).style('pointer-events', 'none');
                    });
                }
            });

        // Drag and drop functionality
        const drag = d3.drag()
            .on('start', () => {
                brandLogo.isDragging = true;
                console.log('🖱️ Logo drag started');
            })
            .on('drag', (event) => {
                const newX = Math.max(0, Math.min(this.config.width - brandLogo.width, brandLogo.x + event.dx));
                const newY = Math.max(0, Math.min(this.config.height - brandLogo.height, brandLogo.y + event.dy));
                
                brandLogo.x = newX;
                brandLogo.y = newY;
                
                ChartBrandingUtils.updateLogoPosition.call(this, logoGroup, brandLogo);
            })
            .on('end', () => {
                brandLogo.isDragging = false;
                console.log(`🎯 Logo positioned at (${brandLogo.x}, ${brandLogo.y})`);
            });

        // Apply drag to logo image
        logoImage.call(drag);

        // Double-click to adjust opacity
        logoImage.on('dblclick', (event) => {
            event.stopPropagation();
            const rect = logoImage.node().getBoundingClientRect();
            this.showOpacityPicker(logoImage, brandLogo.opacity, (newOpacity) => {
                brandLogo.opacity = newOpacity;
                logoImage.attr('opacity', newOpacity);
                console.log(`💫 Logo opacity set to ${newOpacity}`);
            }, { x: rect.x, y: rect.y });
        });

        // Resize functionality for handles
        resizeHandles.forEach((handleRect, index) => {
            const handleType = handles[index];
            
            const resizeDrag = d3.drag()
                .on('start', () => {
                    brandLogo.isResizing = true;
                    console.log(`📏 Resize started from ${handleType} corner`);
                })
                .on('drag', (event) => {
                    const minSize = 20;
                    let newWidth = brandLogo.width;
                    let newHeight = brandLogo.height;
                    let newX = brandLogo.x;
                    let newY = brandLogo.y;
                    
                    switch(handleType) {
                        case 'se': // Bottom-right
                            newWidth = Math.max(minSize, brandLogo.width + event.dx);
                            newHeight = Math.max(minSize, brandLogo.height + event.dy);
                            break;
                        case 'sw': // Bottom-left
                            newWidth = Math.max(minSize, brandLogo.width - event.dx);
                            newHeight = Math.max(minSize, brandLogo.height + event.dy);
                            newX = brandLogo.x + (brandLogo.width - newWidth);
                            break;
                        case 'ne': // Top-right
                            newWidth = Math.max(minSize, brandLogo.width + event.dx);
                            newHeight = Math.max(minSize, brandLogo.height - event.dy);
                            newY = brandLogo.y + (brandLogo.height - newHeight);
                            break;
                        case 'nw': // Top-left
                            newWidth = Math.max(minSize, brandLogo.width - event.dx);
                            newHeight = Math.max(minSize, brandLogo.height - event.dy);
                            newX = brandLogo.x + (brandLogo.width - newWidth);
                            newY = brandLogo.y + (brandLogo.height - newHeight);
                            break;
                    }
                    
                    // Ensure boundaries
                    newX = Math.max(0, Math.min(this.config.width - newWidth, newX));
                    newY = Math.max(0, Math.min(this.config.height - newHeight, newY));
                    
                    // Update brand logo dimensions immediately
                    brandLogo.x = newX;
                    brandLogo.y = newY;
                    brandLogo.width = newWidth;
                    brandLogo.height = newHeight;
                    
                    // Immediate visual update for real-time feedback
                    ChartBrandingUtils.updateLogoPosition.call(this, logoGroup, brandLogo);
                })
                .on('end', () => {
                    brandLogo.isResizing = false;
                    console.log(`📐 Logo resized to ${brandLogo.width}x${brandLogo.height}`);
                });
            
            handleRect.call(resizeDrag);
        });

        console.log(`🏢 Brand logo rendered at (${brandLogo.x}, ${brandLogo.y}) size ${brandLogo.width}x${brandLogo.height}`);
    }

    updateLogoPosition(logoGroup, brandLogo) {
        // Update image position and size
        logoGroup.select('.brand-image')
            .attr('x', brandLogo.x)
            .attr('y', brandLogo.y)
            .attr('width', brandLogo.width)
            .attr('height', brandLogo.height);
        
        // Update selection rectangle
        logoGroup.select('.logo-selection')
            .attr('x', brandLogo.x - 5)
            .attr('y', brandLogo.y - 5)
            .attr('width', brandLogo.width + 10)
            .attr('height', brandLogo.height + 10);
        
        // Update resize handles
        const handles = [
            {class: 'resize-nw', x: brandLogo.x - 5, y: brandLogo.y - 5},
            {class: 'resize-ne', x: brandLogo.x + brandLogo.width - 3, y: brandLogo.y - 5},
            {class: 'resize-sw', x: brandLogo.x - 5, y: brandLogo.y + brandLogo.height - 3},
            {class: 'resize-se', x: brandLogo.x + brandLogo.width - 3, y: brandLogo.y + brandLogo.height - 3}
        ];
        
        handles.forEach(handle => {
            logoGroup.select(`.${handle.class}`)
                .attr('x', handle.x)
                .attr('y', handle.y);
        });
    }

    updateLogoSelection(logoGroup, brandLogo) {
        const opacity = brandLogo.selected ? 1 : 0;
        const pointerEvents = brandLogo.selected ? 'all' : 'none';
        
        logoGroup.select('.logo-selection').attr('opacity', opacity);
        logoGroup.selectAll('.resize-handle')
            .attr('opacity', opacity)
            .style('pointer-events', pointerEvents);
    }

    renderFootnotes() {
        if (!this.data?.metadata?.footnotes) return;
        
        const footnotes = this.svg.append('g')
            .attr('class', 'chart-footnotes')
            .attr('transform', `translate(${this.config.margin.left}, ${this.config.height - 80})`);

        this.data.metadata.footnotes.forEach((note, index) => {
            footnotes.append('text')
                .attr('y', index * 12)
                .attr('font-size', '10px')
                .attr('font-weight', '400')
                .attr('font-family', this.getFontFamily())
                .attr('fill', '#6b7280')
                .text(`${index + 1}. ${note}`);
        });
    }

    renderLinks() {
        if (this.links.length === 0) {
            console.warn('No links to render - check data processing');
            return;
        }

        const linkGroups = this.chart.selectAll('.sankey-link')
            .data(this.links)
            .enter()
            .append('g')
            .attr('class', 'sankey-link');

        linkGroups.append('path')
            .attr('d', d => d.path)
            .attr('fill', d => this.getLinkColor(d))
            .attr('fill-opacity', d => this.statementType === 'balance' ? this.getLinkOpacity(d) : this.config.linkOpacity)
            .style('cursor', 'pointer')
            .style('transition', 'all 0.2s ease')
            .on('mouseover', (event, d) => {
                d3.select(event.currentTarget)
                    .attr('fill-opacity', Math.min(1.0, this.config.linkOpacity + 0.2));
                this.showLinkTooltip(event, d);
            })
            .on('mouseout', (event, d) => {
                d3.select(event.currentTarget)
                    .attr('fill-opacity', this.config.linkOpacity);
                this.hideTooltip();
            })
            .on('click', (event, d) => {
                event.stopPropagation();
                if (window.FinancialDataProcessor && FinancialDataProcessor.isPreRevenueLink(d, this.revenueHubLayer)) {
                    const currentColor = this.getLinkColor(d);
                    this.showColorPicker(event.currentTarget, currentColor);
                }
            })
            .on('dblclick', (event, d) => {
                event.stopPropagation();
                const currentColor = this.getLinkColor(d);
                this.showColorPicker(event.currentTarget, currentColor);
            });
    }

    renderNodes() {
        const nodeGroups = this.chart.selectAll('.sankey-node')
            .data(this.nodes)
            .enter()
            .append('g')
            .attr('class', 'sankey-node')
            .attr('transform', d => `translate(${d.x}, ${d.y})`);

        nodeGroups.append('rect')
            .attr('width', this.config.nodeWidth)
            .attr('height', d => d.height)
            .attr('fill', d => this.statementType === 'balance' ? this.getHierarchicalColor(d.id) : this.getNodeColor(d))
            .attr('fill-opacity', d => this.statementType === 'balance' ? this.getNodeOpacity(d) : this.config.nodeOpacity)
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .attr('rx', 1)
            .style('cursor', 'move')
            .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))')
            .style('transition', 'all 0.2s ease')
            .on('mouseover', (event, d) => {
                if (!this.isDragging) {
                    d3.select(event.currentTarget)
                        .style('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))')
                        .style('transform', 'scale(1.02)');
                    this.showNodeTooltip(event, d);
                }
            })
            .on('mouseout', (event, d) => {
                if (!this.isDragging) {
                    d3.select(event.currentTarget)
                        .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))')
                        .style('transform', 'scale(1)');
                    this.hideTooltip();
                }
            })
            .on('dblclick', (event, d) => {
                event.stopPropagation();
                const currentColor = this.getNodeColor(d);
                this.showColorPicker(event.currentTarget, currentColor);
            });

        this.addDragBehavior(nodeGroups);
        
        // Initialize click handlers for interaction modes
        if (this.interactionMode) {
            this.updateNodeClickHandlers();
        }
    }

    addDragBehavior(nodeGroups) {
        const self = this;
        this.isDragging = false;
        
        const drag = d3.drag()
            .on('start', function(event, d) {
                self.isDragging = true;
                self.hideTooltip();
                
                d.manuallyPositioned = true;
                const maxDepth = Math.max(...self.nodes.map(n => n.depth));
                const isMiddle = d.depth !== 0 && d.depth !== maxDepth;
                d.preserveLabelsAbove = isMiddle ? (d.layerIndex === 0) : null;
                
                d3.select(this).select('rect')
                    .style('stroke', '#667eea')
                    .style('stroke-width', 3)
                    .style('filter', 'drop-shadow(0 6px 12px rgba(102, 126, 234, 0.3))');
                
                self.showDragHint(d);
            })
            .on('drag', function(event, d) {
                // Ensure tooltip stays hidden during drag
                self.hideTooltip();
                // Enable both horizontal and vertical movement in all modes
                self.handleArrangementDrag(event, d, this);
            })
            .on('end', function(event, d) {
                self.isDragging = false;
                
                d3.select(this).select('rect')
                    .style('stroke', 'white')
                    .style('stroke-width', 2)
                    .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))');
                
                self.hideDragHint();
                self.hideLayerSnapFeedback(); // Hide snap feedback when drag ends
                self.hideLayerGuideLines(); // Hide guide lines when drag ends
                self.showMagneticFeedback(null, false); // Hide magnetic feedback
                
                // Update link positions to ensure they remain connected to nodes
                self.calculateLinkPositions();
                
                // Update the link paths in the DOM to reflect new positions
                self.chart.selectAll('.sankey-link path')
                    .attr('d', d => d.path);
                
                // Update labels after movement
                self.chart.selectAll('.node-text-group').remove();
                self.renderLabels();
                
                console.log(`📍 Node "${d.id}" repositioned to X: ${d.x.toFixed(1)}, Y: ${d.y.toFixed(1)}`);
                
                // Save manual position to metadata for persistence
                self.saveManualPositionToMetadata(d);
            });

        nodeGroups.call(drag);
    }

    recalculateSingleNodeLinkPositions(node) {
        if (node.sourceLinks.length > 0) {
            const totalOutflow = d3.sum(node.sourceLinks, d => d.value);
            const effectiveNodeHeight = node.height * this.config.linkWidthScale;
            
            let currentY = node.y + (node.height - effectiveNodeHeight) / 2;
            
            node.sourceLinks.forEach((link) => {
                link.sourceY = currentY;
                const proportionalHeight = (link.value / totalOutflow) * effectiveNodeHeight;
                link.sourceHeight = proportionalHeight;
                currentY += proportionalHeight;
            });
        }
        
        if (node.targetLinks.length > 0) {
            const totalInflow = d3.sum(node.targetLinks, d => d.value);
            const effectiveNodeHeight = node.height * this.config.linkWidthScale;
            
            let currentY = node.y + (node.height - effectiveNodeHeight) / 2;
            
            node.targetLinks.forEach((link) => {
                link.targetY = currentY;
                const proportionalHeight = (link.value / totalInflow) * effectiveNodeHeight;
                link.targetHeight = proportionalHeight;
                currentY += proportionalHeight;
            });
        }
    }

    updateNodeLinks(draggedNode) {
        // Recalculate positions for the dragged node
        this.recalculateSingleNodeLinkPositions(draggedNode);
        
        // Also recalculate positions for connected nodes to maintain link connections
        const connectedNodes = new Set();
        
        // Add source nodes (nodes that connect TO this dragged node)
        draggedNode.targetLinks.forEach(link => {
            connectedNodes.add(link.source);
        });
        
        // Add target nodes (nodes that this dragged node connects TO)
        draggedNode.sourceLinks.forEach(link => {
            connectedNodes.add(link.target);
        });
        
        // Recalculate link positions for all connected nodes
        connectedNodes.forEach(node => {
            this.recalculateSingleNodeLinkPositions(node);
        });
        
        // Force recalculation of ALL link positions to ensure consistency
        this.calculateLinkPositions();
        
        // Update all link paths on the chart
        const self = this;
        this.chart.selectAll('.sankey-link path')
            .each(function(d) {
                d.path = self.createSmoothPath(d);
                d3.select(this).attr('d', d.path);
            });
    }

    showDragHint(node) {
        this.dragHint = this.chart.append('g')
            .attr('class', 'drag-hint')
            .style('pointer-events', 'none');

        const availableHeight = this.config.height - this.config.margin.top - this.config.margin.bottom;
        
        this.dragHint.append('line')
            .attr('x1', node.x + this.config.nodeWidth / 2)
            .attr('y1', 20)
            .attr('x2', node.x + this.config.nodeWidth / 2)  
            .attr('y2', availableHeight - 20)
            .attr('stroke', '#667eea')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5')
            .attr('opacity', 0.5);

        this.dragHint.append('text')
            .attr('class', 'drag-position')
            .attr('x', node.x + this.config.nodeWidth + 10)
            .attr('y', node.y + node.height / 2)
            .attr('font-size', '12px')
            .attr('font-weight', '600')
            .attr('font-family', this.getFontFamily())
            .attr('fill', '#667eea')
            .text(`Y: ${node.y.toFixed(0)}px`);
    }

    updateDragHint(node, newY) {
        if (this.dragHint) {
            this.dragHint.select('.drag-position')
                .attr('y', newY + node.height / 2)
                .text(`Y: ${newY.toFixed(0)}px`);
        }
    }

    hideDragHint() {
        if (this.dragHint) {
            this.dragHint.remove();
            this.dragHint = null;
        }
    }
    
    showLayerSnapFeedback(targetX, isSnapping) {
        // Remove existing feedback
        this.hideLayerSnapFeedback();
        
        if (isSnapping) {
            // Show snap line for layer feedback
            this.snapFeedback = this.chart.append('line')
                .attr('class', 'layer-snap-feedback')
                .attr('x1', targetX)
                .attr('y1', 0)
                .attr('x2', targetX)
                .attr('y2', this.config.height - this.config.margin.top - this.config.margin.bottom)
                .style('stroke', '#3b82f6')
                .style('stroke-width', '2px')
                .style('stroke-dasharray', '5,5')
                .style('opacity', '0.7')
                .style('pointer-events', 'none');
        }
    }
    
    hideLayerSnapFeedback() {
        if (this.snapFeedback) {
            this.snapFeedback.remove();
            this.snapFeedback = null;
        }
    }
    
    showLayerGuideLines() {
        // Remove existing guide lines
        this.chart.selectAll('.layer-guide-line').remove();
        
        // Get all unique layer X positions
        const layerPositions = [...new Set(this.nodes.map(n => n.x))].sort((a, b) => a - b);
        
        // Show faint guide lines for all layers
        layerPositions.forEach(x => {
            this.chart.append('line')
                .attr('class', 'layer-guide-line')
                .attr('x1', x)
                .attr('y1', 0)
                .attr('x2', x)
                .attr('y2', this.config.height - this.config.margin.top - this.config.margin.bottom)
                .style('stroke', '#e5e7eb')
                .style('stroke-width', '1px')
                .style('stroke-dasharray', '2,2')
                .style('opacity', '0.5')
                .style('pointer-events', 'none');
        });
    }
    
    hideLayerGuideLines() {
        this.chart.selectAll('.layer-guide-line').remove();
    }
    
    showMagneticFeedback(x, isActive) {
        // Remove existing magnetic feedback
        this.chart.selectAll('.magnetic-feedback').remove();
        
        if (isActive && x !== null) {
            // Show highlighted line for magnetic snap
            this.chart.append('line')
                .attr('class', 'magnetic-feedback')
                .attr('x1', x)
                .attr('y1', 0)
                .attr('x2', x)
                .attr('y2', this.config.height - this.config.margin.top - this.config.margin.bottom)
                .style('stroke', '#10b981')
                .style('stroke-width', '2px')
                .style('opacity', '0.7')
                .style('pointer-events', 'none');
        }
    }
    
    findNearestValidLayer(x, draggedNode) {
        // Get all layer positions and depths
        const layers = [];
        const uniquePositions = [...new Set(this.nodes.map(n => n.x))];
        
        uniquePositions.forEach(layerX => {
            const nodeAtLayer = this.nodes.find(n => n.x === layerX);
            if (nodeAtLayer) {
                layers.push({
                    x: layerX,
                    depth: nodeAtLayer.depth
                });
            }
        });
        
        // Find the closest layer
        let closestLayer = null;
        let minDistance = Infinity;
        
        layers.forEach(layer => {
            const distance = Math.abs(x - layer.x);
            if (distance < minDistance && this.isValidLayerMove(draggedNode, layer.depth)) {
                minDistance = distance;
                closestLayer = layer;
            }
        });
        
        return closestLayer;
    }

    renderLabels() {
        const maxDepth = Math.max(...this.nodes.map(n => n.depth));
        
        this.nodes.forEach(node => {
            const isLeftmost = node.depth === 0;
            const isRightmost = node.depth === maxDepth;
            const isMiddle = !isLeftmost && !isRightmost;
            
            if (isLeftmost) {
                this.renderLeftmostLabels(node);
            } else if (isRightmost) {
                this.renderRightmostLabels(node);
            } else {
                this.renderMiddleLabels(node);
            }
        });
    }

    getValueDistance(layerType = 'general') {
        if (typeof this.config.valueDistance === 'object') {
            if (layerType === 'middle') {
                return this.config.valueDistance.middle || 8;
            } else {
                return this.config.valueDistance.general || 8;
            }
        }
        return layerType === 'middle' ? 8 : (this.config.valueDistance || 8);
    }

    /**
     * Check if node has period change data to display
     */
    hasPeriodChangeData(node) {
        return node.hasPercentages && 
               this.data?.metadata?.comparisonMode && 
               node.growthDecline && 
               node.growthDecline !== '0.0%' && 
               node.growthDecline !== 'N/A' && 
               node.growthDecline !== '';
    }


    renderLeftmostLabels(node) {
        // Use unified textDistance controls
        const textDistance = this.config.textDistance?.leftmost || this.config.labelDistance?.leftmost || 15;
        const nodeColor = this.getTextColor(node);
        const hasPeriodChange = this.hasPeriodChangeData(node);
        
        // Create unified text group positioned beside node and centered vertically
        const textGroup = this.chart.append('g')
            .attr('class', 'node-text-group')
            .attr('data-node-id', node.id)
            .attr('transform', `translate(${node.x - textDistance}, ${node.y + node.height/2})`);

        // Smart layout: adjust positioning based on whether period change will be shown
        let labelY, valueY, periodY;
        
        if (hasPeriodChange) {
            // Three lines: spread them out evenly
            labelY = -16;  // Above center
            valueY = 0;    // Center
            periodY = 16;  // Below center
        } else {
            // Two lines: center them closer to the node
            labelY = -8;   // Slightly above center
            valueY = 8;    // Slightly below center
        }

        // 1. Label first
        textGroup.append('text')
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'middle')
            .attr('y', labelY)
            .attr('font-size', this.getFontSize(12) + 'px')
            .attr('font-weight', 'bold')
            .attr('font-family', this.getFontFamily())
            .attr('fill', nodeColor)
            .text(node.id);

        // 2. Value second
        textGroup.append('text')
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'middle')
            .attr('y', valueY)
            .attr('font-size', this.getFontSize(11) + 'px')
            .attr('font-weight', 'bold')
            .attr('font-family', this.getFontFamily())
            .attr('fill', nodeColor)
            .text(this.formatValueWithMargin(node));

        // 3. Period comparison third (only if data exists)
        if (hasPeriodChange) {
            textGroup.append('text')
                .attr('text-anchor', 'end')
                .attr('dominant-baseline', 'middle')
                .attr('y', periodY)
                .attr('font-size', this.getFontSize(11) + 'px')
                .attr('font-weight', 'bold')
                .attr('font-family', this.getFontFamily())
                .attr('fill', '#000000')
                .text(`${node.growthDecline}`);
        }
    }

    renderRightmostLabels(node) {
        // Use unified textDistance controls
        const textDistance = this.config.textDistance?.rightmost || this.config.labelDistance?.rightmost || 15;
        const nodeColor = this.getTextColor(node);
        const hasPeriodChange = this.hasPeriodChangeData(node);
        
        // Create unified text group positioned beside node and centered vertically
        const textGroup = this.chart.append('g')
            .attr('class', 'node-text-group')
            .attr('data-node-id', node.id)
            .attr('transform', `translate(${node.x + this.config.nodeWidth + textDistance}, ${node.y + node.height/2})`);

        // Smart layout: adjust positioning based on whether period change will be shown
        let labelY, valueY, periodY;
        
        if (hasPeriodChange) {
            // Three lines: spread them out evenly
            labelY = -16;  // Above center
            valueY = 0;    // Center
            periodY = 16;  // Below center
        } else {
            // Two lines: center them closer to the node
            labelY = -8;   // Slightly above center
            valueY = 8;    // Slightly below center
        }

        // 1. Label first
        textGroup.append('text')
            .attr('text-anchor', 'start')
            .attr('dominant-baseline', 'middle')
            .attr('y', labelY)
            .attr('font-size', this.getFontSize(12) + 'px')
            .attr('font-weight', 'bold')
            .attr('font-family', this.getFontFamily())
            .attr('fill', nodeColor)
            .text(node.id);

        // 2. Value second
        textGroup.append('text')
            .attr('text-anchor', 'start')
            .attr('dominant-baseline', 'middle')
            .attr('y', valueY)
            .attr('font-size', this.getFontSize(11) + 'px')
            .attr('font-weight', 'bold')
            .attr('font-family', this.getFontFamily())
            .attr('fill', nodeColor)
            .text(this.formatValueWithMargin(node));

        // 3. Period comparison third (only if data exists)
        if (hasPeriodChange) {
            textGroup.append('text')
                .attr('text-anchor', 'start')
                .attr('dominant-baseline', 'middle')
                .attr('y', periodY)
                .attr('font-size', this.getFontSize(11) + 'px')
                .attr('font-weight', 'bold')
                .attr('font-family', this.getFontFamily())
                .attr('fill', '#000000')
                .text(`${node.growthDecline}`);
        }
    }

    // Helper function to determine percentage color based on value
    getPercentageColor(percentageText) {
        if (percentageText.includes('+') || percentageText.startsWith('+')){
            return '#2BA02D'; // Green for positive growth
        } else if (percentageText.includes('-')) {
            return '#CC0100'; // Red for negative growth
        } else {
            return '#7F8C8D'; // Gray for neutral/no change
        }
    }

    renderMiddleLabels(node) {
        // Use unified textDistance controls
        const textDistance = this.config.textDistance?.middle || this.config.labelDistance?.middle || 12;
        const nodeColor = this.getTextColor(node);
        
        let isTopNode;
        if (node.manuallyPositioned) {
            isTopNode = node.preserveLabelsAbove === true;
        } else {
            isTopNode = node.layerIndex === 0;
        }
        
        if (isTopNode) {
            this.renderMiddleLabelsAbove(node, textDistance, nodeColor);
        } else {
            this.renderMiddleLabelsBelow(node, textDistance, nodeColor);
        }
    }

    renderMiddleLabelsAbove(node, textDistance, nodeColor) {
        // Use unified textDistance for both labels and values
        // Order: label first, value second, period comparison third (all above node)
        const hasPeriodChange = this.hasPeriodChangeData(node);
        
        const textGroup = this.chart.append('g')
            .attr('class', 'node-text-group')
            .attr('data-node-id', node.id)
            .attr('transform', `translate(${node.x + this.config.nodeWidth/2}, ${node.y - textDistance})`);

        // Smart layout: adjust positioning based on whether period change will be shown
        let labelY, valueY, periodY;
        
        if (hasPeriodChange) {
            // Three lines: spread them out
            labelY = -28;  // Topmost
            valueY = -14;  // Middle
            periodY = 0;   // Bottom (closest to node)
        } else {
            // Two lines: center them closer to the node
            labelY = -20;  // Above
            valueY = -6;   // Below (closer to node)
        }

        // 1. Label first
        textGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'alphabetic')
            .attr('y', labelY)
            .attr('font-size', this.getFontSize(12) + 'px')
            .attr('font-weight', 'bold')
            .attr('font-family', this.getFontFamily())
            .attr('fill', nodeColor)
            .text(node.id);

        // 2. Value second
        textGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'alphabetic')
            .attr('y', valueY)
            .attr('font-size', this.getFontSize(11) + 'px')
            .attr('font-weight', 'bold')
            .attr('font-family', this.getFontFamily())
            .attr('fill', nodeColor)
            .text(this.formatValueWithMargin(node));

        // 3. Period comparison third (only if data exists)
        if (hasPeriodChange) {
            textGroup.append('text')
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'alphabetic')
                .attr('y', periodY)
                .attr('font-size', this.getFontSize(11) + 'px')
                .attr('font-weight', 'bold')
                .attr('font-family', this.getFontFamily())
                .attr('fill', '#000000')
                .text(`${node.growthDecline}`);
        }
    }

    renderMiddleLabelsBelow(node, textDistance, nodeColor) {
        // Use unified textDistance for both labels and values
        // Order: label first, value second, period comparison third (all below node)
        const hasPeriodChange = this.hasPeriodChangeData(node);
        
        const textGroup = this.chart.append('g')
            .attr('class', 'node-text-group')
            .attr('data-node-id', node.id)
            .attr('transform', `translate(${node.x + this.config.nodeWidth/2}, ${node.y + node.height + textDistance})`);

        // Smart layout: adjust positioning based on whether period change will be shown
        let labelY, valueY, periodY;
        
        if (hasPeriodChange) {
            // Three lines: spread them out
            labelY = 0;   // Closest to node
            valueY = 16;  // Middle
            periodY = 32; // Bottom
        } else {
            // Two lines: center them closer to the node
            labelY = 6;   // Closer to node
            valueY = 22;  // Below
        }

        // 1. Label first (closest to node)
        textGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'hanging')
            .attr('y', labelY)
            .attr('font-size', this.getFontSize(12) + 'px')
            .attr('font-weight', 'bold')
            .attr('font-family', this.getFontFamily())
            .attr('fill', nodeColor)
            .text(node.id);

        // 2. Value second
        textGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'hanging')
            .attr('y', valueY)
            .attr('font-size', this.getFontSize(11) + 'px')
            .attr('font-weight', 'bold')
            .attr('font-family', this.getFontFamily())
            .attr('fill', nodeColor)
            .text(this.formatValueWithMargin(node));

        // 3. Period comparison third (only if data exists)
        if (hasPeriodChange) {
            textGroup.append('text')
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'hanging')
                .attr('y', periodY)
                .attr('font-size', this.getFontSize(11) + 'px')
                .attr('font-weight', 'bold')
                .attr('font-family', this.getFontFamily())
                .attr('fill', '#000000')
                .text(`${node.growthDecline}`);
        }
    }



    // Format currency value with optional margin percentage
    formatValueWithMargin(node) {
        const baseValue = this.formatCurrency(node.value, node);
        
        // Add margin percentage if show margin is enabled
        if (this.statementType === 'income' && 
            this.config.showMargin && 
            node.marginPercentage && 
            node.marginPercentage !== 'N/A') {
            
            // Check if we should show for this node based on user preference
            const showMarginFor = this.config.showMarginFor || 'profit';
            const shouldShow = showMarginFor === 'all' || 
                             (showMarginFor === 'profit' && node.category === 'profit');
            
            if (shouldShow) {
                return `${baseValue} | ${node.marginPercentage}`;
            }
        }
        
        return baseValue;
    }

    formatCurrency(value, node) {
        const currency = this.data?.metadata?.currency || 'USD';
        const unit = this.data?.metadata?.unit || 'millions';

        const currencySymbols = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'JPY': '¥',
            'CAD': 'C$',
            'AUD': 'A$',
            'CHF': 'CHF ',
            'CNY': '¥'
        };

        const symbol = currencySymbols[currency] || '$';
        
        let formattedValue;

        switch (unit.toLowerCase()) {
            case 'thousands':
                if (value >= 1000) {
                    formattedValue = `${symbol}${(value/1000).toFixed(1)}M`;
                } else if (value >= 1) {
                    formattedValue = `${symbol}${value.toFixed(0)}K`;
                } else {
                    formattedValue = `${symbol}${(value * 1000).toFixed(0)}`;
                }
                break;

            case 'millions':
                if (value >= 1000) {
                    formattedValue = `${symbol}${(value/1000).toFixed(1)}B`;
                } else if (value >= 1) {
                    formattedValue = `${symbol}${value.toFixed(0)}M`;
                } else {
                    formattedValue = `${symbol}${(value * 1000).toFixed(0)}K`;
                }
                break;

            case 'billions':
                if (value >= 1000) {
                    formattedValue = `${symbol}${(value/1000).toFixed(1)}T`;
                } else if (value >= 1) {
                    formattedValue = `${symbol}${value.toFixed(1)}B`;
                } else {
                    formattedValue = `${symbol}${(value * 1000).toFixed(0)}M`;
                }
                break;

            default:
                if (value >= 1000) {
                    formattedValue = `${symbol}${(value/1000).toFixed(1)}B`;
                } else if (value >= 1) {
                    formattedValue = `${symbol}${value.toFixed(0)}M`;
                } else {
                    formattedValue = `${symbol}${(value * 1000).toFixed(0)}K`;
                }
        }
        
        if (node && node.isExpenseType) {
            formattedValue = `(${formattedValue})`;
        }
        
        // REMOVED: Margin display from formatCurrency to eliminate duplicate calculations
        // All margin display is now handled exclusively in renderLabels method
        // This ensures only one margin display source and respects the showMargin toggle
        
        return formattedValue;
    }

    /**
     * ENHANCED: Get node color with revenue segment support
     */
    getNodeColor(node) {
        // Check for node-specific custom color first
        if (node.customColor) {
            return node.customColor;
        }
        
        // Check for individual revenue segment color first
        if (window.FinancialDataProcessor && FinancialDataProcessor.isPreRevenueNode(node, this.revenueHubLayer) && this.revenueSegmentColors.has(node.id)) {
            return this.revenueSegmentColors.get(node.id);
        }
        
        // FIXED: Revenue segments should use their own default colors, not category colors
        // This prevents "Total Revenue" color changes from affecting revenue segments
        if (window.FinancialDataProcessor && FinancialDataProcessor.isPreRevenueNode(node, this.revenueHubLayer) && node.category === 'revenue') {
            // Enhanced vibrant revenue segment color palette
            const defaultSegmentColors = [
                '#1e40af', '#2563eb', '#3b82f6', '#0ea5e9', '#06b6d4', 
                '#14b8a6', '#10b981', '#059669', '#0d9488', '#0f766e'
            ];
            const revenueSegmentNodes = window.FinancialDataProcessor ? 
                FinancialDataProcessor.getRevenueSegmentNodes(this.nodes, this.revenueHubLayer) : 
                this.getRevenueSegmentNodesFallback();
            const segmentIndex = revenueSegmentNodes.findIndex(n => n.id === node.id);
            return defaultSegmentColors[segmentIndex % defaultSegmentColors.length];
        }
        
        let effectiveCategory = node.category;
        if (node.category === 'tax') {
            effectiveCategory = 'expense';
        }
        
        if (this.customColors && this.customColors[effectiveCategory]) {
            return this.customColors[effectiveCategory];
        }
        
        // Enhanced vibrant default colors
        const defaultColors = {
            revenue: '#1e40af',    // Deep vibrant blue
            profit: '#059669',     // Vibrant emerald green
            expense: '#dc2626'     // Sharp red
        };
        return defaultColors[node.category] || '#6b7280';
    }

    /**
     * ENHANCED: Get link color with revenue segment logic
     */
    getLinkColor(link) {
        if (this.statementType === 'balance') {
            return this.getLinkColor_Balance(link);
        } else {
            return this.getLinkColor_Income(link);
        }
    }

    /**
     * ENHANCED: Income statement link colors with revenue segment support
     */
    getLinkColor_Income(link) {
        // NEW: Pre-revenue links use SOURCE color (revenue segment logic)
        if (window.FinancialDataProcessor && FinancialDataProcessor.isPreRevenueLink(link, this.revenueHubLayer)) {
            const sourceColor = this.getNodeColor(link.source);
            return ChartUtils.lightenColor(sourceColor, 15);
        }
        
        // ENHANCED: Check for user-created nodes with custom colors
        // Links should inherit the color from the node they originate from
        if (link.source.userCreated || link.source.customColor) {
            const sourceColor = this.getNodeColor(link.source);
            return ChartUtils.lightenColor(sourceColor, 15);
        }
        
        if (link.target.userCreated || link.target.customColor) {
            const targetColor = this.getNodeColor(link.target);
            return ChartUtils.lightenColor(targetColor, 15);
        }
        
        // Existing logic: Post-revenue links use TARGET color
        const targetCategory = link.colorCategory || link.targetCategory || link.target.category;
        
        let effectiveCategory = targetCategory;
        if (targetCategory === 'tax') {
            effectiveCategory = 'expense';
        }
        
        const targetColor = this.getColorByCategory(effectiveCategory);
        return ChartUtils.lightenColor(targetColor, 15);
    }

    getLinkColor_Balance(link) {
        // ENHANCED: Check for user-created nodes with custom colors first
        if (link.source.userCreated || link.source.customColor) {
            const sourceColor = this.getNodeColor(link.source);
            return ChartUtils.hexToRgba(sourceColor, 0.65);
        }
        
        if (link.target.userCreated || link.target.customColor) {
            const targetColor = this.getNodeColor(link.target);
            return ChartUtils.hexToRgba(targetColor, 0.65);
        }
        
        const sourceColorGroup = this.colorGroups.get(link.source.id);
        const targetColorGroup = this.colorGroups.get(link.target.id);
        
        const isFromTotalAssets = link.source.id.toLowerCase().includes('total assets');
        const isToTotalAssets = link.target.id.toLowerCase().includes('total assets');
        
        let baseColor = '#95a5a6';
        
        if (isToTotalAssets) {
            if (sourceColorGroup && sourceColorGroup.baseColor) {
                baseColor = sourceColorGroup.baseColor;
                console.log(`🔗 Link TO Total Assets: ${link.source.id} → ${link.target.id} = ${baseColor} (source color)`);
            }
        } else if (isFromTotalAssets) {
            if (targetColorGroup && targetColorGroup.baseColor) {
                baseColor = targetColorGroup.baseColor;
                console.log(`🔗 Link FROM Total Assets: ${link.source.id} → ${link.target.id} = ${baseColor} (target color)`);
            }
        } else {
            if (targetColorGroup && targetColorGroup.baseColor) {
                baseColor = targetColorGroup.baseColor;
            } else if (sourceColorGroup && sourceColorGroup.baseColor) {
                baseColor = sourceColorGroup.baseColor;
            }
        }
        
        if (isFromTotalAssets || isToTotalAssets) {
            return baseColor;
        } else {
            return ChartUtils.hexToRgba(baseColor, 0.65);
        }
    }

    getColorByCategory(category) {
        if (this.customColors && this.customColors[category]) {
            return this.customColors[category];
        }
        
        // Enhanced vibrant category colors
        const defaultColors = {
            revenue: '#1e40af',    // Deep vibrant blue
            profit: '#059669',     // Vibrant emerald green
            expense: '#dc2626'     // Sharp red
        };
        
        return defaultColors[category] || '#6b7280';
    }


    // Balance sheet specific methods
    // Fallback methods when FinancialDataProcessor is not available
    detectStatementTypeFallback(data) {
        console.warn('⚠️ Using fallback statement type detection');
        this.statementType = 'income';
        if (data && data.metadata && data.metadata.statementType) {
            this.statementType = data.metadata.statementType;
        }
    }

    detectRevenueHubFallback() {
        console.warn('⚠️ detectRevenueHub() has been moved to FinancialDataProcessor - using fallback');
        this.revenueHubNode = null;
        this.revenueHubLayer = 1;
    }

    calculateFinancialMetricsFallback() {
        console.warn('⚠️ calculateFinancialMetrics() has been moved to FinancialDataProcessor - using fallback');
        // Basic fallback - just ensure required properties exist
        if (this.nodes) {
            this.nodes.forEach(node => {
                if (!node.marginPercentage) node.marginPercentage = 'N/A';
                if (!node.marginType) node.marginType = 'Margin';
                if (!node.percentageOfRevenue) node.percentageOfRevenue = 0;
                node.isExpenseType = node.category === 'expense';
            });
        }
    }

    getRevenueSegmentNodesFallback() {
        console.warn('⚠️ getRevenueSegmentNodes() has been moved to FinancialDataProcessor - using fallback');
        return [];
    }

    assignColorGroups() {
        console.warn('assignColorGroups() has been moved to FinancialDataProcessor - using fallback');
        this.colorGroups = this.colorGroups || new Map();
    }

    isExactParentGroupMatch(nodeLower, groupPattern) {
        console.warn('isExactParentGroupMatch() has been moved to FinancialDataProcessor - using fallback');
        return false;
    }

    determineChildParentGroup(childNode, parentNodes) {
        console.warn('determineChildParentGroup() has been moved to FinancialDataProcessor - using fallback');
        return null;
    }

    getParentGroupName(nodeId) {
        console.warn('getParentGroupName() has been moved to FinancialDataProcessor - using fallback');
        return null;
    }

    detectParentNodes() {
        console.warn('detectParentNodes() has been moved to FinancialDataProcessor - using fallback');
        return new Set();
    }

    getHierarchicalColor(nodeId) {
        if (this.statementType !== 'balance') {
            return this.getNodeColor({ id: nodeId, category: this.nodes.find(n => n.id === nodeId)?.category }); 
        }
        
        const colorGroup = this.colorGroups.get(nodeId);
        if (!colorGroup) {
            console.warn(`⚠️ No color group found for node: ${nodeId}`);
            return this.getNodeColor({ id: nodeId, category: this.nodes.find(n => n.id === nodeId)?.category });
        }
        
        const baseColor = colorGroup.baseColor;
        const opacity = this.getHierarchicalOpacity(nodeId);
        
        console.log(`🎨 Node ${nodeId}: base=${baseColor}, opacity=${opacity}, isParent=${colorGroup.isParentGroup}, group=${colorGroup.groupName}`);
        
        if (this.statementType === 'balance') {
            if (colorGroup.isParentGroup) {
                return baseColor;
            } else {
                return ChartUtils.hexToRgba(baseColor, 0.65);
            }
        }
        
        return ChartUtils.hexToRgba(baseColor, opacity);
    }

    getHierarchicalOpacity(nodeId) {
        if (this.statementType === 'income') {
            return 1.0;
        }
        
        const colorGroup = this.colorGroups.get(nodeId);
        if (!colorGroup) return 1.0;
        
        if (this.statementType === 'balance') {
            if (colorGroup.isParentGroup) {
                return 1.0;
            } else {
                return 0.65;
            }
        } else {
            switch (colorGroup.level) {
                case 'detail':
                    return 0.65;
                case 'summary':
                    return 0.85;
                case 'total':
                    return 1.0;
                default:
                    return 1.0;
            }
        }
    }


    /**
     * Get full opacity color for text labels (always 100% opacity)
     */
    getTextColor(node) {
        if (this.statementType === 'balance') {
            return this.getHierarchicalTextColor(node.id);
        } else {
            return this.getNodeColor(node);
        }
    }

    /**
     * Get hierarchical text color without opacity for balance sheets
     */
    getHierarchicalTextColor(nodeId) {
        if (this.statementType !== 'balance') {
            return this.getNodeColor({ id: nodeId, category: this.nodes.find(n => n.id === nodeId)?.category }); 
        }
        
        const colorGroup = this.colorGroups.get(nodeId);
        if (!colorGroup) {
            console.warn(`⚠️ No color group found for node: ${nodeId}`);
            return this.getNodeColor({ id: nodeId, category: this.nodes.find(n => n.id === nodeId)?.category });
        }
        
        // Return base color without opacity for text
        return colorGroup.baseColor;
    }

    /**
     * Get scaled font size based on global font size setting
     */
    getFontSize(baseSize) {
        const globalSize = this.config.globalFontSize || 12;
        const scale = globalSize / 12; // 12 is the default base size
        return Math.round(baseSize * scale);
    }

    getNodeOpacity(node) {
        if (this.statementType !== 'balance') {
            return this.config.nodeOpacity;
        }
        
        return this.getHierarchicalOpacity(node.id);
    }

    getLinkOpacity(link) {
        if (this.statementType !== 'balance') {
            return this.config.linkOpacity;
        }
        
        return this.getHierarchicalOpacity(link.target.id);
    }

    /**
     * ENHANCED: Set custom colors with revenue segment preservation
     */
    setCustomColors(newColors) {
        console.log('🎨 Setting custom colors:', newColors);
        
        // Preserve existing individual revenue segment colors
        const preservedSegmentColors = new Map(this.revenueSegmentColors);
        
        this.customColors = { ...this.customColors, ...newColors };
        
        if (this.data && this.data.metadata) {
            if (!this.data.metadata.colorPalette) {
                this.data.metadata.colorPalette = {};
            }
            this.data.metadata.colorPalette = { ...this.data.metadata.colorPalette, ...newColors };
        }
        
        if (this.statementType === 'balance') {
            this.assignColorGroups();
        }
        
        // Restore individual revenue segment colors
        this.revenueSegmentColors = preservedSegmentColors;
        
        this.rerenderWithNewColors();
        
        console.log('🔒 Preserved revenue segment colors:', Object.fromEntries(this.revenueSegmentColors));
    }

    /**
     * ENHANCED: Set individual revenue segment color
     */
    setRevenueSegmentColor(nodeId, color) {
        console.log(`🎨 Setting revenue segment color: ${nodeId} → ${color}`);
        
        this.revenueSegmentColors.set(nodeId, color);
        
        // Update metadata
        if (this.data && this.data.metadata) {
            if (!this.data.metadata.revenueSegmentColors) {
                this.data.metadata.revenueSegmentColors = {};
            }
            this.data.metadata.revenueSegmentColors[nodeId] = color;
        }
        
        this.rerenderWithNewColors();
    }

    /**
     * Save manual position to metadata for persistence across navigation
     */
    saveManualPositionToMetadata(node) {
        if (this.data && this.data.metadata) {
            if (!this.data.metadata.manualPositions) {
                this.data.metadata.manualPositions = {};
            }
            this.data.metadata.manualPositions[node.id] = {
                manuallyPositioned: node.manuallyPositioned,
                y: node.y,
                preserveLabelsAbove: node.preserveLabelsAbove
            };
            console.log(`💾 Saved manual position for ${node.id}: Y=${node.y.toFixed(1)}`);
        }
    }
    

    rerenderWithNewColors() {
        if (!this.chart) return;
        
        // Update node colors
        this.chart.selectAll('.sankey-node rect')
            .transition()
            .duration(300)
            .attr('fill', d => this.statementType === 'balance' ? this.getHierarchicalColor(d.id) : this.getNodeColor(d))
            .attr('fill-opacity', d => this.statementType === 'balance' ? this.getNodeOpacity(d) : this.config.nodeOpacity);
        
        // Update link colors
        this.chart.selectAll('.sankey-link path')
            .transition()
            .duration(300)
            .attr('fill', d => this.getLinkColor(d))
            .attr('fill-opacity', d => this.statementType === 'balance' ? this.getLinkOpacity(d) : this.config.linkOpacity);
        
        // Re-render labels with new colors (immediate update)
        this.chart.selectAll('.node-text-group, .node-label, .node-value').remove();
        this.renderLabels();
        
        // Reapply texture effects if enabled
        if (this.config.textureEnabled) {
            // Use setTimeout to ensure color transitions complete first
            setTimeout(() => {
                this.applyTextureEffects();
            }, 300);
        }
        
        console.log('🔄 Re-rendered chart with new colors');
    }

    // Tooltip methods
    showNodeTooltip(event, d) {
        // Use existing calculated margin values (no recalculation needed)
        let marginText = '';
        if (d.marginPercentage && d.marginPercentage !== 'N/A' && d.marginPercentage !== '0.0%') {
            const displayType = d.marginType || (d.category === 'profit' ? 'Margin' : '% of Revenue');
            marginText = `${displayType}: ${d.marginPercentage}`;
        }

        const content = `
            <div style="font-weight: 600; margin-bottom: 2px;">${d.id}</div>
            <div style="color: #60a5fa;">${this.formatCurrency(d.value, d)}</div>
            ${marginText ? `<div style="color: #a3d977; font-size: 10px;">${marginText}</div>` : ''}
        `;

        this.tooltip.html(content)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 30) + 'px')
            .style('opacity', 1);
    }

    showLinkTooltip(event, d) {
        // Use existing calculated margin values for target node (no recalculation needed)
        let marginText = '';
        if (d.target.marginPercentage && d.target.marginPercentage !== 'N/A' && d.target.marginPercentage !== '0.0%') {
            const displayType = d.target.marginType || (d.target.category === 'profit' ? 'Margin' : '% of Revenue');
            marginText = `${displayType}: ${d.target.marginPercentage}`;
        }
            
        const content = `
            <div style="font-weight: 600; margin-bottom: 2px;">${d.source.id} → ${d.target.id}</div>
            <div style="color: #60a5fa;">${this.formatCurrency(d.value, d.target)}</div>
            ${marginText ? `<div style="color: #a3d977; font-size: 10px;">${marginText}</div>` : ''}
        `;
        
        this.tooltip
            .html(content)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 30) + 'px')
            .style('opacity', 1);
    }

    hideTooltip() {
        this.tooltip.style('opacity', 0);
    }

    // Control methods
    setCurveIntensity(intensity) {
        this.config.curveIntensity = intensity;
        this.calculateLinkPositions();
        this.renderLinks();
        return this;
    }

    setSpacing(base, left, middle, right) {
        this.config.nodePadding = base;
        this.config.leftmostSpacing = left;
        this.config.middleSpacing = middle;
        this.config.rightmostSpacing = right;
        this.calculateLayout();
        this.render(this.data);
        return this;
    }

    setOpacity(nodeOpacity, linkOpacity) {
        this.config.nodeOpacity = nodeOpacity;
        this.config.linkOpacity = linkOpacity;
        
        this.chart.selectAll('.sankey-node rect')
            .attr('fill-opacity', nodeOpacity)
            .style('opacity', nodeOpacity);
        this.chart.selectAll('.sankey-link path')
            .attr('fill-opacity', linkOpacity)
            .style('opacity', linkOpacity);
        return this;
    }

    setLabelPositioning(labelDistance, valueDistance) {
        this.config.labelDistance = labelDistance;
        this.config.valueDistance = valueDistance;
        this.chart.selectAll('.node-text-group, .node-label, .node-value').remove();
        this.renderLabels();
        return this;
    }

    setLayerSpacing(depth, multiplier) {
        console.log(`🔧 Setting layer ${depth} spacing to ${multiplier}`);
        
        if (!this.config.layerSpacing) {
            this.config.layerSpacing = {};
        }
        
        this.config.layerSpacing[depth] = multiplier;
        
        const maxDepth = Math.max(...this.nodes.map(n => n.depth));
        
        if (depth === 0) {
            this.config.leftmostSpacing = multiplier;
        } else if (depth === maxDepth) {
            this.config.rightmostSpacing = multiplier;
        } else {
            this.config.middleSpacing = multiplier;
        }
        
        this.calculateLayout();
        this.render(this.data);
        return this;
    }

    setNodeDimensions(width, heightScale) {
        this.config.nodeWidth = width;
        this.config.nodeHeightScale = heightScale;
        this.calculateLayout();
        this.render(this.data);
        return this;
    }

    setLinkWidth(widthScale) {
        this.config.linkWidthScale = widthScale;
        this.calculateLinkPositions();
        this.renderLinks();
        return this;
    }

    updateConfig(newConfig) {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newConfig };
        
        if (newConfig.leftmostSpacing !== undefined) {
            this.config.layerSpacing[0] = newConfig.leftmostSpacing;
        }
        if (newConfig.middleSpacing !== undefined) {
            this.config.layerSpacing[1] = newConfig.middleSpacing;
            this.config.layerSpacing[2] = newConfig.middleSpacing;
        }
        if (newConfig.rightmostSpacing !== undefined) {
            const maxDepth = Math.max(...this.nodes.map(n => n.depth));
            this.config.layerSpacing[maxDepth] = newConfig.rightmostSpacing;
        }
        
        // Handle background color change specifically
        if (newConfig.backgroundColor !== undefined && oldConfig.backgroundColor !== newConfig.backgroundColor) {
            if (window.ChartBrandingUtils && window.ChartBrandingUtils.updateBackgroundColor) {
                ChartBrandingUtils.updateBackgroundColor.call(this, newConfig.backgroundColor);
            } else {
                this.updateBackgroundColorFallback(newConfig.backgroundColor);
            }
        }

        // Handle title font change specifically
        if (newConfig.titleFont !== undefined && oldConfig.titleFont !== newConfig.titleFont) {
            if (window.ChartBrandingUtils && window.ChartBrandingUtils.updateTitleFont) {
                ChartBrandingUtils.updateTitleFont.call(this, newConfig.titleFont);
            } else {
                this.updateTitleFontFallback(newConfig.titleFont);
            }
        }

        // Handle title color change specifically
        if (newConfig.titleColor !== undefined && oldConfig.titleColor !== newConfig.titleColor) {
            if (window.ChartBrandingUtils && window.ChartBrandingUtils.updateTitleColor) {
                ChartBrandingUtils.updateTitleColor.call(this, newConfig.titleColor);
            } else {
                this.updateTitleColorFallback(newConfig.titleColor);
            }
        }
        
        const needsFullRender = this.configRequiresFullRender(oldConfig, newConfig);
        const needsLayoutRecalc = this.configRequiresLayoutRecalc(oldConfig, newConfig);
        const needsLabelsUpdate = this.configRequiresLabelsUpdate(oldConfig, newConfig);
        
        if (needsFullRender) {
            this.render(this.data);
        } else if (needsLayoutRecalc) {
            this.calculateLayout();
            this.renderNodes();
            this.renderLabels();
            this.renderLinks();
        } else if (needsLabelsUpdate) {
            this.chart.selectAll('.node-text-group, .node-label, .node-value').remove();
            this.renderLabels();
        } else {
            if (newConfig.nodeOpacity !== undefined) {
                this.chart.selectAll('.sankey-node rect')
                    .transition()
                    .duration(200)
                    .attr('fill-opacity', newConfig.nodeOpacity);
            }
            if (newConfig.linkOpacity !== undefined) {
                this.chart.selectAll('.sankey-link path')
                    .transition()
                    .duration(200)
                    .attr('fill-opacity', newConfig.linkOpacity);
            }
        }
        
        return this;
    }

    configRequiresFullRender(oldConfig, newConfig) {
        const fullRenderKeys = ['nodeWidth', 'nodeHeightScale', 'nodePadding', 'layerSpacing', 'leftmostGroupGap', 'rightmostGroupGap'];
        return fullRenderKeys.some(key => 
            JSON.stringify(oldConfig[key]) !== JSON.stringify(newConfig[key])
        );
    }

    configRequiresLayoutRecalc(oldConfig, newConfig) {
        const layoutKeys = ['leftmostSpacing', 'middleSpacing', 'rightmostSpacing', 'linkWidthScale'];
        return layoutKeys.some(key => oldConfig[key] !== newConfig[key]);
    }

    configRequiresLabelsUpdate(oldConfig, newConfig) {
        const labelKeys = ['labelDistance', 'valueDistance', 'textDistance', 'showMargin', 'showMarginFor'];
        return labelKeys.some(key => 
            JSON.stringify(oldConfig[key]) !== JSON.stringify(newConfig[key])
        );
    }

    updateBackgroundColor(color) {
        this.config.backgroundColor = color;
        if (this.svg) {
            this.svg.style('background-color', color);
        }
        console.log(`🎨 Background color updated to ${color}`);
    }

    updateTitleFont(fontFamily) {
        this.config.titleFont = fontFamily;
        if (this.svg) {
            const fontStack = this.getFontFamily();
            
            // Update chart title and all text elements
            this.svg.selectAll('text')
                .style('font-family', fontStack);
        }
        console.log(`🔤 Title font updated to ${fontFamily}`);
    }

    getFontFamily() {
        return `${this.config.titleFont}, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
    }

    updateTitleColor(color) {
        this.config.titleColor = color;
        if (this.svg) {
            // Update all text elements
            this.svg.selectAll('text')
                .style('fill', color);
        }
        console.log(`🎨 Title color updated to ${color}`);
    }

    generateFileName(extension = 'png') {
        return ChartExports.generateFileName.call(this, extension);
    }

    // Chart-specific color management methods
    applyColorPreset(presetName, categories) {
        const presets = {
            default: (categories) => {
                let defaultColors;
                
                if (this.statementType === 'balance') {
                    defaultColors = {
                        'Total Assets': '#000000',
                        'Current Assets': '#3498DB',
                        'Non-Current Assets': '#9B59B6',
                        'Current Liabilities': '#CC0100',
                        'Non-Current Liabilities': '#C0392B',
                        'Shareholders Equity': '#2BA02D'
                    };
                } else {
                    defaultColors = {
                        'revenue': '#3498db',
                        'profit': '#2BA02D',
                        'expense': '#CC0100'
                    };
                }
                
                const colors = {};
                categories.forEach(cat => {
                    colors[cat] = defaultColors[cat] || '#95a5a6';
                });
                return colors;
            },
            vibrant: (categories) => {
                const vibrantColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7'];
                const colors = {};
                categories.forEach((cat, index) => {
                    colors[cat] = vibrantColors[index % vibrantColors.length];
                });
                return colors;
            },
            professional: (categories) => {
                const professionalColors = ['#2c3e50', '#95a5a6', '#2BA02D', '#CC0100', '#3498db'];
                const colors = {};
                categories.forEach((cat, index) => {
                    colors[cat] = professionalColors[index % professionalColors.length];
                });
                return colors;
            },
            monochrome: (categories) => {
                const monochromeColors = ['#2c3e50', '#7f8c8d', '#34495e', '#95a5a6', '#2c3e50'];
                const colors = {};
                categories.forEach((cat, index) => {
                    colors[cat] = monochromeColors[index % monochromeColors.length];
                });
                return colors;
            }
        };

        const preset = presets[presetName];
        if (preset) {
            const colors = preset(categories);
            this.setCustomColors(colors);
            console.log(`🎨 Applied ${presetName} color preset`);
            return colors;
        }
        return null;
    }

    randomizeColors(categories) {
        const colors = {};
        categories.forEach(category => {
            const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
            colors[category] = randomColor;
        });
        
        this.setCustomColors(colors);
        console.log('🎲 Randomized all colors');
        return colors;
    }

    updateSingleColor(category, color) {
        this.customColors[category] = color;
        
        if (this.customColors.expense && !this.customColors.tax) {
            this.customColors.tax = this.customColors.expense;
        }
        
        if (this.data && this.data.metadata) {
            this.data.metadata.colorPalette = { ...this.customColors };
        }
        
        if (this.data) {
            this.render(this.data);
        }
        
        console.log(`🎨 Updated ${category} color to ${color}`);
    }

    // Data processing methods for chart generation
    static generateNodesAndLinksFromFlows(flowData, comparisonMode = false) {
        const nodeMap = new Map();
        const links = [];
        
        flowData.flows.forEach(flow => {
            if (!nodeMap.has(flow.source)) {
                nodeMap.set(flow.source, {
                    id: flow.source,
                    depth: flow.sourceLayer,
                    value: 0,
                    previousValue: 0,
                    category: flow.sourceCategory,
                    description: flow.description,
                    sort_order: flow.sourceOrder || 1
                });
            }
            
            if (!nodeMap.has(flow.target)) {
                nodeMap.set(flow.target, {
                    id: flow.target,
                    depth: flow.targetLayer,
                    value: 0,
                    previousValue: 0,
                    category: flow.targetCategory,
                    description: flow.description,
                    sort_order: flow.targetOrder || 1
                });
            }
            
            const targetNode = nodeMap.get(flow.target);
            targetNode.value += Math.abs(flow.value);
            targetNode.previousValue += Math.abs(flow.previousValue);
            
            links.push({
                source: flow.source,
                target: flow.target,
                value: Math.abs(flow.value),
                previousValue: Math.abs(flow.previousValue),
                type: flow.flowType,
                description: flow.description,
                colorCategory: flow.targetCategory
            });
        });
        
        flowData.flows.forEach(flow => {
            const sourceNode = nodeMap.get(flow.source);
            if (sourceNode.value === 0) {
                const outflows = flowData.flows.filter(f => f.source === flow.source);
                sourceNode.value = outflows.reduce((sum, f) => sum + Math.abs(f.value), 0);
                sourceNode.previousValue = outflows.reduce((sum, f) => sum + Math.abs(f.previousValue), 0);
            }
        });
        
        const nodes = Array.from(nodeMap.values());
        if (comparisonMode) {
            nodes.forEach(node => {
                if (node.previousValue === 0) {
                    node.variance = node.value > 0 ? { amount: node.value, percentage: 100, trend: 'new' } : { amount: 0, percentage: 0, trend: 'none' };
                } else {
                    const amount = node.value - node.previousValue;
                    const percentage = (amount / Math.abs(node.previousValue)) * 100;
                    let trend = 'none';
                    
                    if (percentage > 0.1) trend = 'up';
                    else if (percentage < -0.1) trend = 'down';
                    
                    node.variance = { amount, percentage, trend };
                }
            });
        }
        
        return {
            metadata: {
                ...flowData.metadata
            },
            nodes: nodes,
            links: links
        };
    }

    static generateChartFromFlows(flowData, comparisonMode = false, chartType = 'sankey', returnTo = null) {
        const sankeyData = PulseSankeyChart.generateNodesAndLinksFromFlows(flowData, comparisonMode);
        
        if (sankeyData.nodes.length === 0) {
            alert('❌ No nodes generated. Please add flows first.');
            return null;
        }
        
        const dataString = encodeURIComponent(JSON.stringify(sankeyData));
        
        if (returnTo === 'guided') {
            window.location.href = `guided.html?step=3&chartType=${chartType}&data=${dataString}&dataInput=template`;
        } else {
            window.location.href = `chart.html?chartType=${chartType}&data=${dataString}`;
        }
        
        return sankeyData;
    }

    // Center chart with label-aware positioning
    centerChart() {
        console.log('🎯🎯🎯 ===== SANKEY CENTER CHART METHOD CALLED ===== 🎯🎯🎯');
        console.log('🔍 this.svg exists:', !!this.svg);
        console.log('🔍 this.chart exists:', !!this.chart);
        console.log('🔍 this.zoomContainer exists:', !!this.zoomContainer);
        console.log('🔍 this.zoom exists:', !!this.zoom);
        
        if (!this.svg || !this.chart) {
            console.warn('⚠️ Cannot center chart - SVG or chart group not available');
            console.warn('⚠️ SVG:', this.svg);
            console.warn('⚠️ Chart:', this.chart);
            return;
        }

        if (!this.zoomContainer) {
            console.warn('⚠️ Cannot center chart - zoom container not available');
            return;
        }

        try {
            // Get current transform state from SVG (where zoom behavior is attached)
            const currentTransform = d3.zoomTransform(this.svg.node());
            const currentScale = currentTransform.k;
            const currentX = currentTransform.x;
            const currentY = currentTransform.y;
            
            console.log('🔍 BEFORE - Current scale:', currentScale);
            console.log('🔍 BEFORE - Current position:', currentX, currentY);
            
            // Use the same approach as bar chart - get zoom container bounds
            const containerBounds = this.zoomContainer.node().getBBox();
            console.log('📐 Zoom container unscaled bounds:', containerBounds);
            
            // Calculate where the center of the content currently appears on screen
            // The current visual center = unscaled center * scale + current translation
            const unscaledCenterX = containerBounds.x + containerBounds.width / 2;
            const unscaledCenterY = containerBounds.y + containerBounds.height / 2;
            
            const currentVisualCenterX = unscaledCenterX * currentScale + currentX;
            const currentVisualCenterY = unscaledCenterY * currentScale + currentY;
            
            console.log('🎯 Unscaled content center:', unscaledCenterX, unscaledCenterY);
            console.log('🎯 Current visual center on screen:', currentVisualCenterX, currentVisualCenterY);
            
            // Get SVG dimensions
            const svgWidth = parseFloat(this.svg.attr('width'));
            const svgHeight = parseFloat(this.svg.attr('height'));
            
            // Calculate how much we need to move to center the visual content in the SVG
            const svgCenterX = svgWidth / 2;
            const svgCenterY = svgHeight / 2;
            
            console.log('📍 SVG center:', svgCenterX, svgCenterY);
            
            // The difference between where the content appears and where we want it
            const moveX = svgCenterX - currentVisualCenterX;
            const moveY = svgCenterY - currentVisualCenterY;
            
            // Calculate required translation (add movement to current translation)
            const requiredX = currentX + moveX;
            const requiredY = currentY + moveY;
            
            console.log('🎯 Required translation:', requiredX, requiredY);
            
            // Apply the centering transform with smooth animation
            const newTransform = d3.zoomIdentity
                .translate(requiredX, requiredY)
                .scale(currentScale);
            
            console.log('✨ Applying smooth centering transition...');
            console.log('🔧 New transform:', newTransform);
            
            // Apply transform to SVG (which has the zoom behavior attached)
            this.svg
                .transition()
                .duration(800)
                .ease(d3.easeQuadInOut)
                .call(this.zoom.transform, newTransform)
                .on('end', () => {
                    console.log('✅ Chart centering completed');
                    
                    // Log final state
                    const finalTransform = d3.zoomTransform(this.svg.node());
                    console.log('🔍 AFTER - Final position:', finalTransform.x, finalTransform.y);
                });
            
        } catch (error) {
            console.error('❌ Error during chart centering:', error);
        }
    }

    // ===== INTERACTIVE NODE CREATION AND ARRANGEMENT SYSTEM =====
    
    initializeInteractiveMode() {
        // Initialize interaction mode state
        this.interactionMode = {
            mode: 'normal', // 'normal', 'arrange'
        };
        
        // Add mode toggle buttons to chart container
        this.addInteractionModeToggle();
        
        // Update existing node click handlers
        this.updateNodeClickHandlers();
    }
    
    addInteractionModeToggle() {
        // Remove existing toggle if present
        this.container.select('.interaction-mode-toggle').remove();
        
        const toggleContainer = this.container
            .insert('div', ':first-child')
            .attr('class', 'interaction-mode-toggle')
            .style('position', 'absolute')
            .style('top', '10px')
            .style('right', '10px')
            .style('z-index', '1000')
            .style('display', 'flex')
            .style('gap', '8px');
            
            
        // Arrange Mode Button
        const arrangeButton = toggleContainer
            .append('button')
            .attr('class', 'arrange-mode-btn')
            .style('padding', '4px 8px')
            .style('background', '#8b5cf6')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '4px')
            .style('cursor', 'pointer')
            .style('font-size', '10px')
            .style('font-weight', '500')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '4px')
            .style('box-shadow', '0 1px 2px rgba(0,0,0,0.1)')
            .style('transition', 'all 0.2s ease')
            .html('🔄 Arrange')
            .on('click', () => this.setInteractionMode('arrange'));
            
        // Center Chart Button
        const centerButton = toggleContainer
            .append('button')
            .attr('class', 'center-chart-btn')
            .style('padding', '4px 8px')
            .style('background', '#10b981')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '4px')
            .style('cursor', 'pointer')
            .style('font-size', '10px')
            .style('font-weight', '500')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '4px')
            .style('box-shadow', '0 1px 2px rgba(0,0,0,0.1)')
            .style('transition', 'all 0.2s ease')
            .html('🎯 Center')
            .on('click', () => this.centerChart());
            
        // Normal Mode Button (to exit special modes)
        const normalButton = toggleContainer
            .append('button')
            .attr('class', 'normal-mode-btn')
            .style('padding', '4px 8px')
            .style('background', '#6b7280')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '4px')
            .style('cursor', 'pointer')
            .style('font-size', '10px')
            .style('font-weight', '500')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '4px')
            .style('box-shadow', '0 1px 2px rgba(0,0,0,0.1)')
            .style('transition', 'all 0.2s ease')
            .html('✖️ Exit')
            .style('display', 'none') // Hidden by default
            .on('click', () => this.setInteractionMode('normal'));
    }
    
    setInteractionMode(mode) {
        const previousMode = this.interactionMode.mode;
        this.interactionMode.mode = mode;
        
        // Update button appearances
        this.updateModeButtonAppearances();
        
        // Handle mode-specific setup
        switch (mode) {
            case 'arrange':
                this.showArrangeInstructions();
                this.enableLinkOrdering();
                break;
            case 'normal':
                this.clearInteractionState();
                this.hideInstructions();
                this.disableLinkOrdering();
                break;
        }
        
        // Update node interaction behavior
        this.updateNodeInteractionMode();
        
        console.log(`🔄 Interaction mode changed: ${previousMode} → ${mode}`);
    }
    
    updateModeButtonAppearances() {
        const mode = this.interactionMode.mode;
        
        // Update Arrange button  
        const arrangeBtn = this.container.select('.arrange-mode-btn');
        arrangeBtn.style('background', mode === 'arrange' ? '#7c3aed' : '#8b5cf6')
                 .html(mode === 'arrange' ? '🔄 Active' : '🔄 Arrange');
        
        // Show/hide Exit button
        const exitBtn = this.container.select('.normal-mode-btn');
        exitBtn.style('display', mode === 'normal' ? 'none' : 'flex');
    }
    
    
    showArrangeInstructions() {
        // Remove existing instructions
        this.hideInstructions();
        
        const instructions = this.container
            .insert('div', ':first-child')
            .attr('class', 'arrangement-instructions')
            .style('position', 'absolute')
            .style('top', '50px')
            .style('right', '10px')
            .style('background', 'rgba(139, 92, 246, 0.9)')
            .style('color', 'white')
            .style('padding', '12px 16px')
            .style('border-radius', '6px')
            .style('font-size', '12px')
            .style('max-width', '250px')
            .style('z-index', '999')
            .style('box-shadow', '0 4px 12px rgba(0,0,0,0.15)')
            .html(`
                <div style="font-weight: 600; margin-bottom: 6px;">🔄 Arrangement Mode Active</div>
                <div>• Drag nodes to reposition</div>
                <div>• <strong>Click nodes</strong> to reorder their outgoing links</div>
                <div>• Changes update automatically</div>
                <div style="margin-top: 8px; font-size: 10px; opacity: 0.8;">
                    Click Exit to return to normal mode
                </div>
            `);
    }
    
    hideInstructions() {
        this.container.select('.arrangement-instructions').remove();
    }
    
    updateNodeClickHandlers() {
        // Add click handlers to existing nodes
        this.chart.selectAll('.sankey-node')
            .style('cursor', () => {
                switch (this.interactionMode.mode) {
                    case 'arrange': return 'move';
                    default: return 'pointer';
                }
            })
            .on('click', (event, d) => {
                event.stopPropagation();
                
                // Show appropriate interface based on interaction mode
                if (this.interactionMode.mode === 'arrange') {
                    this.showLinkOrderingPanel(d);
                } else {
                    this.showEnhancedColorPicker(event, d);
                }
            });
    }
    
    updateNodeInteractionMode() {
        const mode = this.interactionMode.mode;
        
        this.chart.selectAll('.sankey-node')
            .style('cursor', () => {
                switch (mode) {
                    case 'arrange': return 'move';
                    default: return 'pointer';
                }
            });
            
        // Update visual state of nodes based on mode
        switch (mode) {
            case 'arrange':
                this.chart.selectAll('.sankey-node rect')
                    .style('stroke-width', '3px')
                    .style('stroke', '#8b5cf6')
                    .style('opacity', '1');
                break;
            default:
                this.chart.selectAll('.sankey-node rect')
                    .style('stroke-width', '2px')
                    .style('stroke', 'white')
                    .style('opacity', '1');
                break;
        }
    }
    
    // ===== ENHANCED COLOR PICKER WITH ADD NODE FUNCTIONALITY =====
    
    showEnhancedColorPicker(event, nodeData, mode = 'edit') {
        // Remove any existing enhanced color picker
        this.container.select('.enhanced-color-picker').remove();
        
        // Store modal mode and data
        this.modalMode = mode;
        this.modalNodeData = nodeData;
        this.modalStep = mode === 'create' ? 1 : null;
        
        // Create enhanced modal
        const modal = this.container
            .append('div')
            .attr('class', 'enhanced-color-picker')
            .style('position', 'fixed')
            .style('top', '0')
            .style('left', '0')
            .style('width', '100%')
            .style('height', '100%')
            .style('background', 'rgba(0, 0, 0, 0.6)')
            .style('z-index', '2000')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('justify-content', 'center')
            .style('backdrop-filter', 'blur(4px)');
            
        const content = modal
            .append('div')
            .style('background', 'white')
            .style('border-radius', '16px')
            .style('padding', '0')
            .style('box-shadow', '0 20px 40px rgba(0, 0, 0, 0.15)')
            .style('max-width', mode === 'create' && this.modalStep === 1 ? '180px' : '200px')
            .style('width', '70%')
            .style('max-height', '90vh')
            .style('overflow', 'hidden')
            .style('animation', 'modal-scale-in 0.2s ease-out');
            
        // Add CSS animation
        if (!document.querySelector('#modal-animations')) {
            const style = document.createElement('style');
            style.id = 'modal-animations';
            style.innerHTML = `
                @keyframes modal-scale-in {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .glass-effect {
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(10px);
                }
            `;
            document.head.appendChild(style);
        }
        
        // Header with node info
        const header = content
            .append('div')
            .style('padding', '12px 12px 0 12px')
            .style('border-bottom', '1px solid #f3f4f6')
            .style('margin-bottom', '8px');
            
        const headerFlex = header
            .append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '8px')
            .style('margin-bottom', '8px');
            
        // Node icon
        headerFlex
            .append('div')
            .style('width', '32px')
            .style('height', '32px')
            .style('background', this.getNodeColor(nodeData))
            .style('border-radius', '8px')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('justify-content', 'center')
            .style('color', 'white')
            .style('font-size', '14px')
            .style('font-weight', 'bold')
            .style('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.15)')
            .text('📊');
            
        const headerText = headerFlex
            .append('div');
            
        headerText
            .append('h3')
            .style('margin', '0')
            .style('color', '#1f2937')
            .style('font-size', '16px')
            .style('font-weight', '600')
            .text(mode === 'edit' ? nodeData.id : (this.modalStep === 1 ? 'Add Node' : 'Configure Node'));
            
        if (mode === 'edit') {
            headerText
                .append('p')
                .style('margin', '2px 0 0 0')
                .style('color', '#6b7280')
                .style('font-size', '12px')
                .text(`${nodeData.category || 'Node'} • Value: ${(nodeData.value || 0).toLocaleString()}`);
        } else if (this.modalStep === 1) {
            headerText
                .append('p')
                .style('margin', '2px 0 0 0')
                .style('color', '#6b7280')
                .style('font-size', '12px')
                .text('Step 1: Choose color');
        }
        
        // Main content area
        const mainContent = content
            .append('div')
            .style('padding', '0 12px 12px 12px');
        
        // Set initial color based on mode
        if (mode === 'edit') {
            this.modalSelectedColor = this.getNodeColor(nodeData);
        } else {
            this.modalSelectedColor = this.getCurrentChartColors()[0] || '#3b82f6';
        }
        
        // Show different content based on mode and step
        if (mode === 'edit') {
            // Edit mode: only show color picker for existing node
            this.addEditColorSection(mainContent, nodeData);
        } else if (mode === 'create') {
            if (this.modalStep === 1) {
                // Create mode step 1: just color picker and add button
                this.addCreateStep1Section(mainContent, nodeData);
            } else {
                // Create mode step 2: full configuration
                this.addCreateStep2Section(mainContent, nodeData);
            }
        }
        
        // Close button (X in top right)
        content
            .append('button')
            .style('position', 'absolute')
            .style('top', '16px')
            .style('right', '16px')
            .style('width', '32px')
            .style('height', '32px')
            .style('border', 'none')
            .style('background', 'rgba(107, 114, 128, 0.1)')
            .style('border-radius', '50%')
            .style('cursor', 'pointer')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('justify-content', 'center')
            .style('color', '#6b7280')
            .style('font-size', '16px')
            .style('transition', 'background 0.2s ease')
            .text('✕')
            .on('mouseover', function() {
                d3.select(this).style('background', 'rgba(107, 114, 128, 0.2)');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', 'rgba(107, 114, 128, 0.1)');
            })
            .on('click', () => modal.remove());
            
        // Click outside to close
        modal.on('click', function(event) {
            if (event.target === this) {
                modal.remove();
            }
        });
    }
    
    showCreateNodeModal(parentNode) {
        // Show create modal starting with step 1
        this.showEnhancedColorPicker(null, parentNode, 'create');
    }
    
    showCompleteNodeCreationModal(parentNode) {
        // Remove any existing modal
        this.container.select('.enhanced-color-picker').remove();
        
        // Set initial color
        this.modalSelectedColor = this.getCurrentChartColors()[0] || '#3b82f6';
        
        // Create modal
        const modal = this.container
            .append('div')
            .attr('class', 'enhanced-color-picker')
            .style('position', 'fixed')
            .style('top', '0')
            .style('left', '0')
            .style('width', '100%')
            .style('height', '100%')
            .style('background', 'rgba(0, 0, 0, 0.6)')
            .style('z-index', '2000')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('justify-content', 'center')
            .style('backdrop-filter', 'blur(4px)');
            
        const content = modal
            .append('div')
            .style('background', 'white')
            .style('border-radius', '16px')
            .style('padding', '0')
            .style('box-shadow', '0 20px 40px rgba(0, 0, 0, 0.15)')
            .style('max-width', '220px')
            .style('width', '75%')
            .style('max-height', '90vh')
            .style('overflow', 'hidden')
            .style('animation', 'modal-scale-in 0.2s ease-out');
        
        // Header
        const header = content
            .append('div')
            .style('padding', '12px 12px 0 12px')
            .style('border-bottom', '1px solid #f3f4f6')
            .style('margin-bottom', '8px');
            
        const headerFlex = header
            .append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '8px')
            .style('margin-bottom', '8px');
            
        headerFlex
            .append('div')
            .style('width', '24px')
            .style('height', '24px')
            .style('background', '#10b981')
            .style('border-radius', '8px')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('justify-content', 'center')
            .style('color', 'white')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .text('➕');
            
        headerFlex
            .append('h3')
            .style('margin', '0')
            .style('color', '#1f2937')
            .style('font-size', '14px')
            .style('font-weight', '600')
            .text('Add Node');
        
        // Main content
        const mainContent = content
            .append('div')
            .style('padding', '0 12px 12px 12px');
        
        // Add all sections in one modal
        this.addCompleteNodeCreationContent(mainContent, parentNode);
        
        // Close button
        content
            .append('button')
            .style('position', 'absolute')
            .style('top', '12px')
            .style('right', '12px')
            .style('width', '24px')
            .style('height', '24px')
            .style('border', 'none')
            .style('background', 'rgba(107, 114, 128, 0.1)')
            .style('border-radius', '50%')
            .style('cursor', 'pointer')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('justify-content', 'center')
            .style('color', '#6b7280')
            .style('font-size', '14px')
            .text('✕')
            .on('click', () => modal.remove());
            
        // Click outside to close
        modal.on('click', function(event) {
            if (event.target === this) {
                modal.remove();
            }
        });
    }
    
    addCompleteNodeCreationContent(container, parentNode) {
        // Color picker section
        const colorSection = container
            .append('div')
            .style('margin-bottom', '10px');
            
        colorSection
            .append('div')
            .style('font-size', '10px')
            .style('color', '#6b7280')
            .style('margin-bottom', '6px')
            .text('Color:');
            
        // Current chart colors
        const currentColors = this.getCurrentChartColors();
        let selectedColor = this.modalSelectedColor;
        
        if (currentColors.length > 0) {
            const chartColorsGrid = colorSection
                .append('div')
                .style('display', 'flex')
                .style('gap', '4px')
                .style('flex-wrap', 'wrap')
                .style('margin-bottom', '8px');
                
            currentColors.forEach(color => {
                const isSelected = color === selectedColor;
                chartColorsGrid
                    .append('button')
                    .attr('class', 'chart-color-btn')
                    .style('width', '20px')
                    .style('height', '20px')
                    .style('background', color)
                    .style('border', isSelected ? '2px solid #3b82f6' : '1px solid white')
                    .style('border-radius', '4px')
                    .style('cursor', 'pointer')
                    .style('box-shadow', '0 1px 2px rgba(0, 0, 0, 0.1)')
                    .on('click', (event) => {
                        selectedColor = color;
                        this.modalSelectedColor = color;
                        chartColorsGrid.selectAll('.chart-color-btn')
                            .style('border', '1px solid white');
                        d3.select(event.target)
                            .style('border', '2px solid #3b82f6');
                    });
            });
        }
        
        // Custom color row
        const customColorRow = colorSection
            .append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '6px')
            .style('margin-bottom', '12px');
            
        const colorInput = customColorRow
            .append('input')
            .attr('type', 'color')
            .attr('value', selectedColor)
            .style('width', '20px')
            .style('height', '20px')
            .style('border', '1px solid #e5e7eb')
            .style('border-radius', '4px')
            .style('cursor', 'pointer')
            .on('change', () => {
                this.modalSelectedColor = colorInput.node().value;
                colorSection.selectAll('.chart-color-btn')
                    .style('border', '1px solid white');
            });
            
        customColorRow
            .append('span')
            .style('font-size', '10px')
            .style('color', '#6b7280')
            .style('flex', '1')
            .text('Custom');
        
        // Orientation section
        const orientationSection = container
            .append('div')
            .style('margin-bottom', '10px');
            
        orientationSection
            .append('div')
            .style('font-size', '10px')
            .style('color', '#6b7280')
            .style('margin-bottom', '6px')
            .text('Direction:');
            
        let selectedOrientation = 'right';
        const orientationGrid = orientationSection
            .append('div')
            .style('display', 'grid')
            .style('grid-template-columns', '1fr 1fr')
            .style('gap', '4px');
            
        // Left and Right buttons
        ['left', 'right'].forEach(orientation => {
            const btn = orientationGrid
                .append('button')
                .attr('class', 'orientation-btn')
                .attr('data-orientation', orientation)
                .style('padding', '6px 4px')
                .style('border', orientation === 'right' ? '2px solid #10b981' : '1px solid #e5e7eb')
                .style('border-radius', '4px')
                .style('background', orientation === 'right' ? '#f0fdf4' : 'white')
                .style('cursor', 'pointer')
                .style('text-align', 'center')
                .style('font-size', '9px')
                .html(orientation === 'left' ? '⬅️<br>Left' : '➡️<br>Right')
                .on('click', function() {
                    selectedOrientation = orientation;
                    orientationGrid.selectAll('.orientation-btn')
                        .style('border', '1px solid #e5e7eb')
                        .style('background', 'white');
                    d3.select(this)
                        .style('border', '2px solid #10b981')
                        .style('background', '#f0fdf4');
                });
        });
        
        // Form inputs
        const formContainer = container
            .append('div')
            .style('margin-bottom', '10px');
            
        const nameInput = formContainer
            .append('input')
            .attr('type', 'text')
            .attr('placeholder', 'Node name')
            .style('width', '100%')
            .style('padding', '6px 8px')
            .style('border', '1px solid #e5e7eb')
            .style('border-radius', '4px')
            .style('font-size', '11px')
            .style('margin-bottom', '6px')
            .style('box-sizing', 'border-box');
            
        const valueInput = formContainer
            .append('input')
            .attr('type', 'number')
            .attr('placeholder', 'Value (optional)')
            .style('width', '100%')
            .style('padding', '6px 8px')
            .style('border', '1px solid #e5e7eb')
            .style('border-radius', '4px')
            .style('font-size', '11px')
            .style('box-sizing', 'border-box');
        
        // Create function
        const createNode = () => {
            const name = nameInput.node().value.trim();
            const value = parseFloat(valueInput.node().value) || 50;
            
            if (!name) {
                alert('Please enter a node name');
                nameInput.node().focus();
                return;
            }
            
            if (this.nodeNameExists(name)) {
                alert('A node with this name already exists. Please choose a different name.');
                nameInput.node().focus();
                return;
            }
            
            // Close modal and create node
            this.container.select('.enhanced-color-picker').remove();
            this.createConnectedNodeWithOrientation(name, value, selectedOrientation, parentNode, this.modalSelectedColor);
        };
        
        // Add Enter key support
        [nameInput, valueInput].forEach(input => {
            input.on('keydown', function(event) {
                if (event.key === 'Enter') {
                    createNode();
                }
            });
        });
        
        // Create button
        container
            .append('button')
            .style('width', '100%')
            .style('padding', '8px')
            .style('background', '#10b981')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '6px')
            .style('cursor', 'pointer')
            .style('font-size', '11px')
            .style('font-weight', '600')
            .style('transition', 'background 0.2s ease')
            .text('Create Node')
            .on('mouseover', function() {
                d3.select(this).style('background', '#059669');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', '#10b981');
            })
            .on('click', createNode);
    }
    
    addEditColorSection(container, nodeData) {
        // Edit mode: simple color picker for existing node
        const colorSection = container
            .append('div')
            .style('margin-bottom', '10px');
            
        // Standard theme colors for edit mode
        const standardColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];
        let selectedColor = this.modalSelectedColor;
        
        // Standard colors grid
        const chartColorsGrid = colorSection
            .append('div')
            .style('display', 'flex')
            .style('gap', '6px')
            .style('flex-wrap', 'wrap')
            .style('margin-bottom', '8px');
            
        standardColors.forEach(color => {
                const isSelected = color === selectedColor;
                chartColorsGrid
                    .append('button')
                    .attr('class', 'chart-color-btn')
                    .style('width', '24px')
                    .style('height', '24px')
                    .style('background', color)
                    .style('border', isSelected ? '3px solid #3b82f6' : '2px solid white')
                    .style('border-radius', '6px')
                    .style('cursor', 'pointer')
                    .style('box-shadow', '0 2px 4px rgba(0, 0, 0, 0.1)')
                    .style('transition', 'all 0.1s ease')
                    .on('mouseover', function() {
                        if (!isSelected) {
                            d3.select(this).style('transform', 'scale(1.1)');
                        }
                    })
                    .on('mouseout', function() {
                        if (!isSelected) {
                            d3.select(this).style('transform', 'scale(1)');
                        }
                    })
                    .on('click', (event) => {
                        selectedColor = color;
                        this.modalSelectedColor = color;
                        // Update all chart color buttons
                        chartColorsGrid.selectAll('.chart-color-btn')
                            .style('border', '2px solid white')
                            .style('transform', 'scale(1)');
                        d3.select(event.target)
                            .style('border', '3px solid #3b82f6');
                        // Apply immediately to existing node
                        this.updateNodeColor(nodeData, color);
                        this.container.select('.enhanced-color-picker').remove();
                    });
        });
        
        // Custom color picker row
        const customColorRow = colorSection
            .append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '8px');
            
        const colorInput = customColorRow
            .append('input')
            .attr('type', 'color')
            .attr('value', selectedColor)
            .style('width', '24px')
            .style('height', '24px')
            .style('border', '2px solid #e5e7eb')
            .style('border-radius', '6px')
            .style('cursor', 'pointer')
            .style('background', 'none');
            
        customColorRow
            .append('span')
            .style('font-size', '11px')
            .style('color', '#6b7280')
            .style('flex', '1')
            .text('Custom');
            
        customColorRow
            .append('button')
            .style('padding', '4px 8px')
            .style('background', '#6b7280')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '4px')
            .style('cursor', 'pointer')
            .style('font-size', '10px')
            .style('transition', 'background 0.2s ease')
            .text('Apply')
            .on('mouseover', function() {
                d3.select(this).style('background', '#4b5563');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', '#6b7280');
            })
            .on('click', () => {
                const customColor = colorInput.node().value;
                this.updateNodeColor(nodeData, customColor);
                this.container.select('.enhanced-color-picker').remove();
            });
        
        // Add Node button for edit mode
        container
            .append('div')
            .style('margin-top', '12px')
            .append('button')
            .style('width', '100%')
            .style('padding', '8px')
            .style('background', '#10b981')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '6px')
            .style('cursor', 'pointer')
            .style('font-size', '11px')
            .style('font-weight', '600')
            .style('transition', 'background 0.2s ease')
            .text('+ Add Node')
            .on('mouseover', function() {
                d3.select(this).style('background', '#059669');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', '#10b981');
            })
            .on('click', () => {
                // Close current modal and open complete node creation modal
                this.container.select('.enhanced-color-picker').remove();
                this.showCompleteNodeCreationModal(nodeData);
            });
    }
    
    addCreateStep1Section(container, nodeData) {
        // Create mode step 1: simple color picker + add button
        const colorSection = container
            .append('div')
            .style('margin-bottom', '10px');
            
        // Current chart colors
        const currentColors = this.getCurrentChartColors();
        let selectedColor = this.modalSelectedColor;
        
        // Chart colors grid
        if (currentColors.length > 0) {
            const chartColorsGrid = colorSection
                .append('div')
                .style('display', 'flex')
                .style('gap', '6px')
                .style('flex-wrap', 'wrap')
                .style('margin-bottom', '8px');
                
            currentColors.forEach(color => {
                const isSelected = color === selectedColor;
                chartColorsGrid
                    .append('button')
                    .attr('class', 'chart-color-btn')
                    .style('width', '24px')
                    .style('height', '24px')
                    .style('background', color)
                    .style('border', isSelected ? '3px solid #3b82f6' : '2px solid white')
                    .style('border-radius', '6px')
                    .style('cursor', 'pointer')
                    .style('box-shadow', '0 2px 4px rgba(0, 0, 0, 0.1)')
                    .style('transition', 'all 0.1s ease')
                    .on('click', (event) => {
                        selectedColor = color;
                        this.modalSelectedColor = color;
                        chartColorsGrid.selectAll('.chart-color-btn')
                            .style('border', '2px solid white');
                        d3.select(event.target)
                            .style('border', '3px solid #3b82f6');
                    });
            });
        }
        
        // Custom color picker
        const customColorRow = colorSection
            .append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '8px')
            .style('margin-bottom', '12px');
            
        const colorInput = customColorRow
            .append('input')
            .attr('type', 'color')
            .attr('value', selectedColor)
            .style('width', '24px')
            .style('height', '24px')
            .style('border', '2px solid #e5e7eb')
            .style('border-radius', '6px')
            .style('cursor', 'pointer')
            .on('change', () => {
                this.modalSelectedColor = colorInput.node().value;
                chartColorsGrid.selectAll('.chart-color-btn')
                    .style('border', '2px solid white');
            });
            
        customColorRow
            .append('span')
            .style('font-size', '11px')
            .style('color', '#6b7280')
            .style('flex', '1')
            .text('Custom color');
        
        // Add Node button (proceed to step 2)
        container
            .append('button')
            .style('width', '100%')
            .style('padding', '10px')
            .style('background', '#3b82f6')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '8px')
            .style('cursor', 'pointer')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .style('transition', 'background 0.2s ease')
            .text('Add Node →')
            .on('mouseover', function() {
                d3.select(this).style('background', '#2563eb');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', '#3b82f6');
            })
            .on('click', () => {
                // Proceed to step 2
                this.modalStep = 2;
                this.showEnhancedColorPicker(null, nodeData, 'create');
            });
    }
    
    addCreateStep2Section(container, nodeData) {
        // Create mode step 2: full configuration
        this.addNodeCreationSection(container, nodeData);
    }

    
    addNodeCreationSection(container, parentNode) {
        // Separator
        container
            .append('div')
            .style('height', '1px')
            .style('background', '#f3f4f6')
            .style('margin', '8px 0');
            
        // Add node section
        const addSection = container
            .append('div');
            
        const addHeader = addSection
            .append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '8px')
            .style('margin-bottom', '8px');
            
        addHeader
            .append('div')
            .style('width', '20px')
            .style('height', '20px')
            .style('background', '#10b981')
            .style('border-radius', '50%')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('justify-content', 'center')
            .style('color', 'white')
            .style('font-size', '10px')
            .style('font-weight', 'bold')
            .text('➕');
            
        addHeader
            .append('h4')
            .style('margin', '0')
            .style('color', '#374151')
            .style('font-size', '11px')
            .style('font-weight', '600')
            .text('Add Node');
            
        // Orientation choice
        const orientationSection = addSection
            .append('div')
            .style('margin-bottom', '16px');
            
        orientationSection
            .append('label')
            .style('display', 'block')
            .style('margin-bottom', '8px')
            .style('color', '#6b7280')
            .style('font-size', '14px')
            .style('font-weight', '500')
            .text('Choose direction:');
            
        const orientationGrid = orientationSection
            .append('div')
            .style('display', 'grid')
            .style('grid-template-columns', '1fr 1fr')
            .style('gap', '6px');
            
        // Left orientation button
        const leftBtn = orientationGrid
            .append('button')
            .attr('class', 'orientation-btn')
            .attr('data-orientation', 'left')
            .style('padding', '8px 6px')
            .style('border', '1px solid #e5e7eb')
            .style('border-radius', '6px')
            .style('background', 'white')
            .style('cursor', 'pointer')
            .style('text-align', 'center')
            .style('transition', 'all 0.2s ease')
            .style('font-size', '10px')
            .html('⬅️<br>Left')
            .on('mouseover', function() {
                d3.select(this).style('border-color', '#3b82f6').style('background', '#f8fafc');
            })
            .on('mouseout', function() {
                if (!d3.select(this).classed('selected')) {
                    d3.select(this).style('border-color', '#e5e7eb').style('background', 'white');
                }
            });
            
        // Right orientation button
        const rightBtn = orientationGrid
            .append('button')
            .attr('class', 'orientation-btn')
            .attr('data-orientation', 'right')
            .style('padding', '8px 6px')
            .style('border', '1px solid #e5e7eb')
            .style('border-radius', '6px')
            .style('background', 'white')
            .style('cursor', 'pointer')
            .style('text-align', 'center')
            .style('transition', 'all 0.2s ease')
            .style('font-size', '10px')
            .html('➡️<br>Right')
            .on('mouseover', function() {
                d3.select(this).style('border-color', '#3b82f6').style('background', '#f8fafc');
            })
            .on('mouseout', function() {
                if (!d3.select(this).classed('selected')) {
                    d3.select(this).style('border-color', '#e5e7eb').style('background', 'white');
                }
            });
            
        // Handle orientation selection
        let selectedOrientation = 'right'; // Default
        rightBtn.classed('selected', true)
               .style('border-color', '#10b981')
               .style('background', '#f0fdf4');
               
        container.selectAll('.orientation-btn').on('click', function() {
            // Reset all buttons
            container.selectAll('.orientation-btn')
                .classed('selected', false)
                .style('border-color', '#e5e7eb')
                .style('background', 'white');
                
            // Select clicked button
            const btn = d3.select(this);
            btn.classed('selected', true)
               .style('border-color', '#10b981')
               .style('background', '#f0fdf4');
               
            selectedOrientation = btn.attr('data-orientation');
        });
        
        // Create node function
        const createNode = () => {
            const name = nameInput.node().value.trim();
            const value = parseFloat(valueInput.node().value) || 50;
            
            if (!name) {
                alert('Please enter a node name');
                nameInput.node().focus();
                return;
            }
            
            if (this.nodeNameExists(name)) {
                alert('A node with this name already exists. Please choose a different name.');
                nameInput.node().focus();
                return;
            }
            
            // Close modal and create node with selected color
            this.container.select('.enhanced-color-picker').remove();
            this.createConnectedNodeWithOrientation(name, value, selectedOrientation, parentNode, this.modalSelectedColor);
        };

        // Node creation form
        const formContainer = addSection
            .append('div')
            .style('display', 'grid')
            .style('gap', '8px')
            .style('margin-bottom', '12px');
            
        // Name input
        const nameInput = formContainer
            .append('input')
            .attr('type', 'text')
            .attr('placeholder', 'Node name')
            .style('width', '100%')
            .style('padding', '8px 12px')
            .style('border', '2px solid #e5e7eb')
            .style('border-radius', '8px')
            .style('font-size', '12px')
            .style('box-sizing', 'border-box')
            .style('transition', 'border-color 0.2s ease')
            .on('focus', function() {
                d3.select(this).style('border-color', '#10b981');
            })
            .on('blur', function() {
                d3.select(this).style('border-color', '#e5e7eb');
            })
            .on('keydown', function(event) {
                if (event.key === 'Enter') {
                    createNode();
                }
            });
            
        // Value input
        const valueInput = formContainer
            .append('input')
            .attr('type', 'number')
            .attr('placeholder', 'Flow value (optional)')
            .style('width', '100%')
            .style('padding', '8px 12px')
            .style('border', '2px solid #e5e7eb')
            .style('border-radius', '8px')
            .style('font-size', '12px')
            .style('box-sizing', 'border-box')
            .style('transition', 'border-color 0.2s ease')
            .on('focus', function() {
                d3.select(this).style('border-color', '#10b981');
            })
            .on('blur', function() {
                d3.select(this).style('border-color', '#e5e7eb');
            })
            .on('keydown', function(event) {
                if (event.key === 'Enter') {
                    createNode();
                }
            });
        
        // Add button
        addSection
            .append('button')
            .style('width', '100%')
            .style('padding', '10px 16px')
            .style('background', '#10b981')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '8px')
            .style('cursor', 'pointer')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .style('transition', 'background 0.2s ease')
            .text('Create Node (or press Enter)')
            .on('mouseover', function() {
                d3.select(this).style('background', '#059669');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', '#10b981');
            })
            .on('click', createNode);
    }
    
    
    nodeNameExists(name) {
        return this.nodes.some(node => node.id === name);
    }
    
    getCurrentChartColors() {
        const colors = new Set();
        
        // Get colors from nodes
        this.nodes.forEach(node => {
            const nodeColor = this.getNodeColor(node);
            if (nodeColor && nodeColor !== '#95a5a6') { // Exclude default gray
                colors.add(nodeColor);
            }
        });
        
        // Get colors from custom colors map
        Object.values(this.customColors).forEach(color => {
            if (color && color !== '#95a5a6') {
                colors.add(color);
            }
        });
        
        // Get colors from revenue segment colors
        if (this.revenueSegmentColors) {
            this.revenueSegmentColors.forEach(color => {
                if (color && color !== '#95a5a6') {
                    colors.add(color);
                }
            });
        }
        
        return Array.from(colors).slice(0, 8); // Limit to 8 colors for clean UI
    }
    
    createConnectedNodeWithOrientation(name, value, orientation, parentNode, customColor = null) {
        // Calculate position based on orientation - place on adjacent layer
        let newDepth, nodeX;
        
        if (orientation === 'left') {
            // Add to the left - new node goes on layer BEFORE parent
            newDepth = parentNode.depth - 1;
            
            // If this would be negative, shift all nodes right
            if (newDepth < 0) {
                this.nodes.forEach(node => {
                    node.depth += 1;
                });
                newDepth = 0;
            }
        } else {
            // Add to the right - new node goes on layer AFTER parent
            newDepth = parentNode.depth + 1;
        }
        
        // Calculate X position based on new depth
        const chartWidth = this.config.width - this.config.margin.left - this.config.margin.right;
        const existingDepths = [...new Set(this.nodes.map(n => n.depth))].sort((a, b) => a - b);
        const totalLayers = Math.max(...existingDepths) + 1;
        const layerSpacing = chartWidth / (totalLayers + 1);
        nodeX = newDepth * layerSpacing;
        
        // Calculate Y position near parent but avoiding overlaps
        const { y: nodeY } = this.calculateConnectedNodePosition(parentNode, newDepth);
        
        // Use custom color if provided, otherwise use a default color
        const nodeColor = customColor || '#3b82f6'; // Default to blue if no color specified
        
        const newNode = {
            id: name,
            depth: newDepth,
            value: value || 50,
            category: 'user_created',
            description: `Connected to ${parentNode.id}`,
            x: nodeX,
            y: nodeY,
            height: Math.max(20, (value || 50) / 20),
            manuallyPositioned: true,
            manualY: nodeY,
            sourceLinks: [],
            targetLinks: [],
            userCreated: true,
            customColor: nodeColor
        };
        
        // Store color in customColors map for consistency
        this.customColors[name] = nodeColor;
        
        // Add to nodes array
        this.nodes.push(newNode);
        
        // Create connection link
        const newLink = {
            source: orientation === 'left' ? newNode : parentNode,
            target: orientation === 'left' ? parentNode : newNode,
            value: value || 50,
            type: 'user_created',
            description: `Flow ${orientation === 'left' ? 'from' : 'to'} ${name}`
        };
        
        // Add link to arrays and node connections
        this.links.push(newLink);
        
        if (orientation === 'left') {
            // New node feeds into parent
            if (!newNode.sourceLinks) newNode.sourceLinks = [];
            newNode.sourceLinks.push(newLink);
            if (!parentNode.targetLinks) parentNode.targetLinks = [];
            parentNode.targetLinks.push(newLink);
        } else {
            // Parent feeds into new node
            if (!parentNode.sourceLinks) parentNode.sourceLinks = [];
            parentNode.sourceLinks.push(newLink);
            if (!newNode.targetLinks) newNode.targetLinks = [];
            newNode.targetLinks.push(newLink);
        }
        
        // Recalculate layout and re-render
        this.calculateLayout();
        
        // Re-render chart components
        this.chart.selectAll('.sankey-node').remove();
        this.chart.selectAll('.sankey-link').remove();
        this.chart.selectAll('.node-text-group').remove();
        
        this.renderNodes();
        this.renderLinks();
        this.renderLabels();
        
        // Update spreadsheet data
        this.syncToSpreadsheet();
        
        // Show success message
        this.showNodeCreationSuccess(name, parentNode.id, orientation);
        
        console.log(`✅ Created ${orientation}-facing node: "${name}" linked to "${parentNode.id}"`);
    }
    
    calculateConnectedNodePosition(parentNode, newDepth) {
        // Calculate X position based on depth - ensure proper layer spacing
        const chartWidth = this.config.width - this.config.margin.left - this.config.margin.right;
        const allDepths = [...new Set(this.nodes.map(n => n.depth)), newDepth].sort((a, b) => a - b);
        const totalLayers = allDepths.length;
        const layerSpacing = chartWidth / (totalLayers + 1);
        
        // Position based on layer index in sorted order
        const layerIndex = allDepths.indexOf(newDepth);
        const nodeX = (layerIndex + 1) * layerSpacing;
        
        // Calculate Y position - try to align with parent, but avoid overlaps
        let nodeY = parentNode.y;
        
        // Check for overlaps and adjust if necessary
        const nodesAtSameDepth = this.nodes.filter(n => n.depth === newDepth);
        const minSpacing = 60;
        
        // Find a non-overlapping position
        while (this.hasOverlapAtPosition(nodeY, nodeX, nodesAtSameDepth, 40)) {
            nodeY += minSpacing;
        }
        
        // Ensure within chart bounds
        const chartHeight = this.config.height - this.config.margin.top - this.config.margin.bottom;
        nodeY = Math.max(20, Math.min(nodeY, chartHeight - 60));
        
        return { x: nodeX, y: nodeY };
    }
    
    hasOverlapAtPosition(y, x, existingNodes, nodeHeight) {
        const minSpacing = 20;
        
        return existingNodes.some(node => {
            const distance = Math.abs(node.y - y);
            return distance < (nodeHeight + (node.height || 30)) / 2 + minSpacing;
        });
    }
    
    
    syncToSpreadsheet() {
        // This method will update the data spreadsheet with the new node
        // For now, we'll just update the internal data structure
        // The actual spreadsheet sync would depend on the spreadsheet implementation
        
        if (window.spreadsheetController && window.spreadsheetController.addNodeRow) {
            // If the spreadsheet controller exists, add the new node
            const newNodeData = this.nodes.filter(n => n.userCreated);
            newNodeData.forEach(node => {
                window.spreadsheetController.addNodeRow({
                    source: node.id,
                    target: '',
                    value: node.value,
                    description: node.description
                });
            });
        }
        
        console.log('📊 Data synced to spreadsheet');
    }
    
    showNodeCreationSuccess(nodeName, parentNodeName, orientation) {
        // Remove existing success messages
        this.container.select('.node-creation-success').remove();
        
        const direction = orientation === 'left' ? 'left of' : 'right of';
        const success = this.container
            .append('div')
            .attr('class', 'node-creation-success')
            .style('position', 'absolute')
            .style('top', '120px')
            .style('right', '10px')
            .style('background', '#10b981')
            .style('color', 'white')
            .style('padding', '12px 16px')
            .style('border-radius', '6px')
            .style('font-size', '14px')
            .style('max-width', '300px')
            .style('z-index', '1001')
            .style('box-shadow', '0 4px 12px rgba(0,0,0,0.15)')
            .html(`✅ Node "${nodeName}" created ${direction} "${parentNodeName}"!`);
            
        // Auto-remove after 4 seconds
        setTimeout(() => success.remove(), 4000);
    }
    
    // ===== NODE ARRANGEMENT SYSTEM =====
    
    handleArrangementDrag(event, draggedNode, element) {
        // Calculate potential new position with free movement
        const newX = event.x;
        const newY = Math.max(20, Math.min(
            this.config.height - this.config.margin.top - this.config.margin.bottom - draggedNode.height - 20,
            event.y
        ));
        
        // Constrain X position within chart boundaries
        const constrainedX = Math.max(0, Math.min(newX, this.config.width - this.config.margin.left - this.config.margin.right - this.config.nodeWidth));
        
        // Show all layer guide lines during drag
        this.showLayerGuideLines();
        
        // Check for magnetic snapping to layers
        const nearestLayer = this.findNearestValidLayer(constrainedX, draggedNode);
        
        const magneticThreshold = 35; // Balanced magnetic snap distance
        
        let finalX = constrainedX;
        let shouldSnapToLayer = false;
        
        if (nearestLayer && Math.abs(constrainedX - nearestLayer.x) < magneticThreshold) {
            // Show strong magnetic feedback
            this.showMagneticFeedback(nearestLayer.x, true);
            finalX = nearestLayer.x;
            shouldSnapToLayer = true;
            
            // Update node depth if snapping to a different layer
            if (nearestLayer.depth !== draggedNode.depth) {
                draggedNode.depth = nearestLayer.depth;
            }
        } else {
            // Hide magnetic feedback when not near a layer
            this.showMagneticFeedback(null, false);
        }
        
        // Update position (free movement or snapped)
        draggedNode.x = finalX;
        draggedNode.y = newY;
        draggedNode.manualY = newY;
        draggedNode.manualX = finalX;
        
        d3.select(element).attr('transform', `translate(${draggedNode.x}, ${draggedNode.y})`);
        
        // Update labels that belong to this node
        this.updateNodeLabels(draggedNode);
        
        // Update comments that belong to this node
        this.updateNodeComments(draggedNode);
        
        this.updateNodeLinks(draggedNode);
        this.updateArrangementHint(draggedNode, draggedNode.depth, newY);
    }
    
    updateNodeLabels(node) {
        // Find and update the label group for this specific node using data-node-id
        const maxDepth = Math.max(...this.nodes.map(n => n.depth));
        const isLeftmost = node.depth === 0;
        const isRightmost = node.depth === maxDepth;
        
        let textDistance;
        let newX, newY;
        
        if (isLeftmost) {
            textDistance = this.config.textDistance?.leftmost || this.config.labelDistance?.leftmost || 15;
            newX = node.x - textDistance;
            newY = node.y + node.height / 2;
        } else if (isRightmost) {
            textDistance = this.config.textDistance?.rightmost || this.config.labelDistance?.rightmost || 15;
            newX = node.x + this.config.nodeWidth + textDistance;
            newY = node.y + node.height / 2;
        } else {
            textDistance = this.config.textDistance?.middle || this.config.labelDistance?.middle || 15;
            newX = node.x + this.config.nodeWidth / 2;
            
            // For middle nodes, check if labels are above or below
            // We need to determine which positioning was used
            const labelGroup = this.chart.select(`.node-text-group[data-node-id="${node.id}"]`);
            if (!labelGroup.empty()) {
                const currentTransform = labelGroup.attr('transform');
                const match = currentTransform.match(/translate\([^,]+,([^)]+)\)/);
                if (match) {
                    const currentY = parseFloat(match[1]);
                    const nodeCenter = node.y + node.height / 2;
                    
                    // Determine if label was above or below the node
                    if (currentY < nodeCenter) {
                        // Labels were above
                        newY = node.y - textDistance;
                    } else {
                        // Labels were below
                        newY = node.y + node.height + textDistance;
                    }
                }
            }
        }
        
        // Update the label group for this specific node
        this.chart.selectAll(`.node-text-group[data-node-id="${node.id}"]`)
            .attr('transform', `translate(${newX}, ${newY})`);
    }
    
    updateNodeComments(node) {
        // Comments might be tooltip-related or growth/decline indicators
        // For now, we'll handle any floating text elements that might be associated with nodes
        this.chart.selectAll('.node-annotation, .growth-indicator, .period-change')
            .filter(function() {
                const element = d3.select(this);
                const nodeId = element.attr('data-node-id');
                return nodeId === node.id;
            })
            .each(function() {
                const element = d3.select(this);
                // Update position based on node's new position
                const currentTransform = element.attr('transform');
                if (currentTransform) {
                    const match = currentTransform.match(/translate\(([^,]+),([^)]+)\)/);
                    if (match) {
                        const offsetX = parseFloat(match[1]) - node.x;
                        const offsetY = parseFloat(match[2]) - node.y;
                        element.attr('transform', `translate(${node.x + offsetX}, ${node.y + offsetY})`);
                    }
                }
            });
    }
    
    moveChildNodesWithParent(parentNode, deltaY) {
        console.log(`🔄 moveChildNodesWithParent called for: ${parentNode.id}, deltaY: ${deltaY}`);
        console.log(`🔗 Parent has ${parentNode.sourceLinks ? parentNode.sourceLinks.length : 0} source links`);
        
        // Only move immediate children (next depth level)
        if (!parentNode.sourceLinks || parentNode.sourceLinks.length === 0) {
            console.log(`❌ No source links found for ${parentNode.id}`);
            return;
        }
        
        let childrenMoved = false;
        
        parentNode.sourceLinks.forEach(link => {
            const childNode = link.target;
            console.log(`🎯 Examining child: ${childNode.id}, parent depth: ${parentNode.depth}, child depth: ${childNode.depth}`);
            
            // Only move direct children in the next layer
            if (childNode.depth === parentNode.depth + 1) {
                const newY = childNode.y + deltaY;
                
                // Constrain within chart boundaries
                const constrainedY = Math.max(20, Math.min(
                    this.config.height - this.config.margin.top - this.config.margin.bottom - childNode.height - 20,
                    newY
                ));
                
                // Update child node position
                childNode.y = constrainedY;
                childNode.manualY = constrainedY;
                childNode.manuallyPositioned = true;
                
                // Update visual position of child node
                this.chart.select(`[data-node-id="${childNode.id}"]`)
                    .attr('transform', `translate(${childNode.x}, ${childNode.y})`);
                
                console.log(`📍 Moved child node: ${childNode.id} to Y: ${constrainedY}`);
                childrenMoved = true;
            }
        });
        
        // Mark that children have been moved for this parent
        if (childrenMoved) {
            parentNode.childrenMoved = true;
        }
    }
    
    calculateLayerFromX(x) {
        // Calculate which layer this X position corresponds to with enhanced snapping
        const layerPositions = [...new Set(this.nodes.map(n => n.x))].sort((a, b) => a - b);
        const depths = [...new Set(this.nodes.map(n => n.depth))].sort((a, b) => a - b);
        
        // Create a map of X positions to depth values
        const xToDepthMap = new Map();
        this.nodes.forEach(node => {
            if (!xToDepthMap.has(node.x)) {
                xToDepthMap.set(node.x, node.depth);
            }
        });
        
        // Find the closest layer position with snapping threshold
        let closestLayerX = layerPositions[0];
        let minDistance = Math.abs(x - layerPositions[0]);
        const snapThreshold = 50; // Snap within 50px
        
        layerPositions.forEach((layerX) => {
            const distance = Math.abs(x - layerX);
            if (distance < minDistance) {
                minDistance = distance;
                closestLayerX = layerX;
            }
        });
        
        // Return the depth corresponding to the closest X position
        return xToDepthMap.get(closestLayerX) || 0;
    }
    
    isValidLayerMove(node, newLayer) {
        // Check if moving the node to the new layer would violate flow direction
        const maxSourceLayer = Math.max(-1, ...node.targetLinks.map(link => link.source.depth));
        const minTargetLayer = Math.min(Infinity, ...node.sourceLinks.map(link => link.target.depth));
        
        // Node must be after all source nodes and before all target nodes
        return newLayer > maxSourceLayer && newLayer < minTargetLayer;
    }
    
    moveNodeToLayer(node, newLayer, newY, element) {
        // Update node layer
        const oldLayer = node.depth;
        node.depth = newLayer;
        
        // Calculate new X position based on layer
        const layerX = this.calculateLayerX(newLayer);
        node.x = layerX;
        node.y = newY;
        node.manualY = newY;
        
        // Update visual position
        d3.select(element).attr('transform', `translate(${node.x}, ${node.y})`);
        
        // Update all links
        this.calculateLinkPositions();
        this.renderLinks();
        
        this.updateArrangementHint(node, newLayer, newY);
        
        console.log(`🔄 Node "${node.id}" moved from layer ${oldLayer} to layer ${newLayer}`);
    }
    
    calculateLayerX(layer) {
        // Calculate X position for a given layer
        const layers = [...new Set(this.nodes.map(n => n.depth))].sort((a, b) => a - b);
        const layerIndex = layers.indexOf(layer);
        
        if (layerIndex === -1) {
            // New layer, calculate position
            const chartWidth = this.config.width - this.config.margin.left - this.config.margin.right;
            const totalLayers = layers.length + 1;
            return (layerIndex + 1) * (chartWidth / totalLayers);
        }
        
        // Find existing node at this layer to get X position
        const nodeAtLayer = this.nodes.find(n => n.depth === layer);
        return nodeAtLayer ? nodeAtLayer.x : 0;
    }
    
    updateArrangementHint(node, layer, y) {
        // Remove existing hint
        this.container.select('.arrangement-hint').remove();
        
        // Show hint with layer and position info
        const hint = this.container
            .append('div')
            .attr('class', 'arrangement-hint')
            .style('position', 'absolute')
            .style('top', '120px')
            .style('left', '10px')
            .style('background', 'rgba(139, 92, 246, 0.9)')
            .style('color', 'white')
            .style('padding', '8px 12px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('pointer-events', 'none')
            .style('z-index', '1000')
            .html(`
                <div style="font-weight: 600;">${node.id}</div>
                <div>Layer: ${layer}</div>
                <div>Y: ${Math.round(y)}</div>
            `);
    }
    
    hideDragHint() {
        this.container.select('.drag-hint').remove();
        this.container.select('.arrangement-hint').remove();
    }
    
    clearInteractionState() {
        // Remove any temporary UI elements
        this.container.select('.enhanced-color-picker').remove();
        this.container.select('.node-creation-success').remove();
    }
    


    // Export methods using ChartExports for consistency across all charts
    exportToPNG() {
        return ChartExports.exportToPNG.call(this);
    }

    exportToSVG() {
        return ChartExports.exportToSVG.call(this);
    }

    exportDataToCSV(data) {
        return ChartExports.exportDataToCSV.call(this, data);
    }

    // Clear brand logo
    
    // ===== LINK ORDERING METHODS FOR ARRANGE MODE =====
    
    enableLinkOrdering() {
        // Add click handlers to nodes for link ordering
        this.chart.selectAll('.sankey-node rect')
            .on('click.linkOrdering', (event, nodeData) => {
                if (this.interactionMode.mode === 'arrange') {
                    event.stopPropagation();
                    this.showLinkOrderingPanel(nodeData);
                }
            });
    }
    
    disableLinkOrdering() {
        // Remove click handlers
        this.chart.selectAll('.sankey-node rect')
            .on('click.linkOrdering', null);
    }
    
    showLinkOrderingPanel(nodeData) {
        // Only show if node has outgoing links
        if (!nodeData.sourceLinks || nodeData.sourceLinks.length <= 1) {
            return; // No need to reorder if 1 or fewer links
        }
        
        // Hide tooltip and remove existing panel
        this.hideTooltip();
        this.container.select('.link-ordering-panel').remove();
        
        const panel = this.container
            .append('div')
            .attr('class', 'link-ordering-panel')
            .style('position', 'fixed')
            .style('top', '50%')
            .style('left', '50%')
            .style('transform', 'translate(-50%, -50%)')
            .style('background', 'white')
            .style('border-radius', '12px')
            .style('box-shadow', '0 12px 32px rgba(0, 0, 0, 0.15)')
            .style('padding', '20px')
            .style('z-index', '2000')
            .style('max-width', '350px')
            .style('width', '90%')
            .style('border', '1px solid rgba(0,0,0,0.1)');
            
        // Header
        const header = panel
            .append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('justify-content', 'space-between')
            .style('margin-bottom', '16px')
            .style('padding-bottom', '12px')
            .style('border-bottom', '1px solid #f3f4f6');
            
        header
            .append('h3')
            .style('margin', '0')
            .style('color', '#1f2937')
            .style('font-size', '16px')
            .style('font-weight', '600')
            .html(`🔗 Reorder Links from "<span style="color: #7c3aed;">${nodeData.id}</span>"`);
            
        header
            .append('button')
            .style('background', 'none')
            .style('border', 'none')
            .style('font-size', '20px')
            .style('cursor', 'pointer')
            .style('color', '#6b7280')
            .style('padding', '4px')
            .style('border-radius', '4px')
            .style('transition', 'background 0.2s')
            .text('×')
            .on('mouseover', function() {
                d3.select(this).style('background', '#f3f4f6');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', 'none');
            })
            .on('click', () => panel.remove());
        
        // Instructions
        panel
            .append('div')
            .style('font-size', '12px')
            .style('color', '#6b7280')
            .style('margin-bottom', '12px')
            .style('padding', '8px 12px')
            .style('background', '#f8fafc')
            .style('border-radius', '6px')
            .style('border-left', '3px solid #7c3aed')
            .text('Drag and drop links to change the stacking order (top to bottom):');
        
        // Link list container
        const linkListContainer = panel
            .append('div')
            .style('margin-bottom', '16px')
            .style('max-height', '300px')
            .style('overflow-y', 'auto');
            
        // Create the link list
        this.createLinkOrderingList(linkListContainer, nodeData);
        
        // Action buttons
        const actions = panel
            .append('div')
            .style('display', 'flex')
            .style('gap', '12px')
            .style('margin-top', '16px');
            
        actions
            .append('button')
            .style('flex', '1')
            .style('padding', '10px 16px')
            .style('background', '#7c3aed')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '8px')
            .style('cursor', 'pointer')
            .style('font-size', '13px')
            .style('font-weight', '600')
            .style('transition', 'background 0.2s')
            .text('Apply New Order')
            .on('mouseover', function() {
                d3.select(this).style('background', '#6d28d9');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', '#7c3aed');
            })
            .on('click', () => {
                this.applyLinkOrder(nodeData);
                panel.remove();
            });
            
        actions
            .append('button')
            .style('flex', '1')
            .style('padding', '10px 16px')
            .style('background', '#f3f4f6')
            .style('color', '#374151')
            .style('border', '1px solid #e5e7eb')
            .style('border-radius', '8px')
            .style('cursor', 'pointer')
            .style('font-size', '13px')
            .style('font-weight', '500')
            .style('transition', 'background 0.2s')
            .text('Cancel')
            .on('mouseover', function() {
                d3.select(this).style('background', '#e5e7eb');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', '#f3f4f6');
            })
            .on('click', () => panel.remove());
    }
    
    createLinkOrderingList(container, nodeData) {
        // Store original order for reference
        this.originalLinkOrder = [...nodeData.sourceLinks];
        
        const linkItems = container
            .selectAll('.link-order-item')
            .data(nodeData.sourceLinks, d => d.target.id)
            .enter()
            .append('div')
            .attr('class', 'link-order-item')
            .style('background', '#ffffff')
            .style('border', '1px solid #e5e7eb')
            .style('border-radius', '8px')
            .style('padding', '12px')
            .style('margin-bottom', '6px')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('justify-content', 'space-between')
            .style('font-size', '12px')
            .style('transition', 'all 0.2s ease')
            .style('box-shadow', '0 1px 3px rgba(0,0,0,0.1)')
            .style('cursor', 'grab')
            .on('mouseover', function() {
                d3.select(this)
                    .style('background', '#f8fafc')
                    .style('border-color', '#7c3aed');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .style('background', '#ffffff')
                    .style('border-color', '#e5e7eb');
            });
            
        // Link info section
        const linkInfo = linkItems
            .append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '10px')
            .style('flex', '1');
            
        // Color indicator
        linkInfo
            .append('div')
            .style('width', '16px')
            .style('height', '16px')
            .style('border-radius', '4px')
            .style('border', '1px solid rgba(0,0,0,0.1)')
            .style('background', d => this.getLinkColor(d));
            
        // Link details
        const linkDetails = linkInfo
            .append('div')
            .style('flex', '1');
            
        linkDetails
            .append('div')
            .style('font-weight', '600')
            .style('color', '#1f2937')
            .style('margin-bottom', '2px')
            .text(d => `→ ${d.target.id}`);
            
        linkDetails
            .append('div')
            .style('font-size', '11px')
            .style('color', '#6b7280')
            .text(d => this.formatCurrency(d.value, d.target));
        
        // Add drag handle and enable drag-and-drop
        this.addDragHandleAndSorting(linkItems, container, nodeData);
    }
    
    addDragHandleAndSorting(linkItems, container, nodeData) {
        // Add drag handle to each item
        linkItems
            .append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('color', '#9ca3af')
            .style('font-size', '14px')
            .style('cursor', 'grab')
            .style('padding', '4px')
            .style('border-radius', '4px')
            .style('transition', 'color 0.2s')
            .text('⋮⋮')
            .on('mouseover', function() {
                d3.select(this).style('color', '#7c3aed');
            })
            .on('mouseout', function() {
                d3.select(this).style('color', '#9ca3af');
            });
        
        // Enable drag and drop sorting
        this.enableLinkItemDragSort(linkItems, container, nodeData);
    }
    
    enableLinkItemDragSort(linkItems, container, nodeData) {
        let draggedItem = null;
        let draggedData = null;
        let allItems = [];
        let startY = 0;
        
        linkItems.call(d3.drag()
            .on('start', function(event, d) {
                draggedItem = this;
                draggedData = d;
                startY = event.y;
                
                // Get all items for sorting
                allItems = Array.from(container.selectAll('.link-order-item').nodes());
                
                try {
                    d3.select(this)
                        .style('cursor', 'grabbing')
                        .style('opacity', '0.7')
                        .style('transform', 'rotate(2deg) scale(1.02)')
                        .style('z-index', '1000')
                        .style('position', 'relative')
                        .style('box-shadow', '0 8px 25px rgba(124, 58, 237, 0.3)');
                } catch (error) {
                    console.warn('⚠️ Error applying drag start styles:', error);
                }
                
                console.log(`🔄 Started dragging: ${d.target.id}`);
            })
            .on('drag', function(event) {
                const currentY = event.y;
                const deltaY = currentY - startY;
                
                // Update visual position of dragged item
                try {
                    d3.select(this)
                        .style('transform', `rotate(2deg) scale(1.02) translateY(${deltaY}px)`);
                } catch (error) {
                    console.warn('⚠️ Error updating drag position:', error);
                }
                
                // Find the item we're hovering over
                let targetItem = null;
                let targetIndex = -1;
                
                for (let i = 0; i < allItems.length; i++) {
                    const item = allItems[i];
                    if (item === draggedItem) continue;
                    
                    const rect = item.getBoundingClientRect();
                    if (currentY >= rect.top && currentY <= rect.bottom) {
                        targetItem = item;
                        targetIndex = i;
                        break;
                    }
                }
                
                // Highlight target item safely
                try {
                    container.selectAll('.link-order-item')
                        .style('background', function() {
                            return this === targetItem ? '#f3f4f6' : '#ffffff';
                        })
                        .style('border-color', function() {
                            return this === targetItem ? '#7c3aed' : '#e5e7eb';
                        });
                } catch (error) {
                    console.warn('⚠️ Error highlighting target item:', error);
                }
            })
            .on('end', function(event) {
                // Get the actual mouse position in page coordinates
                const currentY = event.sourceEvent.clientY;
                
                // Find target position - improved logic
                let targetIndex = -1;
                let insertBefore = true;
                
                console.log(`🎯 Looking for drop target at Y: ${currentY}`);
                console.log(`📋 Available items: ${allItems.length}`);
                
                // Find the closest item to drop position
                let closestDistance = Infinity;
                let closestIndex = -1;
                
                for (let i = 0; i < allItems.length; i++) {
                    const item = allItems[i];
                    if (item === draggedItem) continue;
                    
                    const rect = item.getBoundingClientRect();
                    const itemMiddle = rect.top + rect.height / 2;
                    const distance = Math.abs(currentY - itemMiddle);
                    
                    console.log(`📍 Item ${i}: top=${rect.top}, bottom=${rect.bottom}, middle=${itemMiddle}, distance=${distance}`);
                    
                    // Check if mouse is within item bounds OR if it's the closest item
                    if ((currentY >= rect.top && currentY <= rect.bottom) || distance < closestDistance) {
                        if (currentY >= rect.top && currentY <= rect.bottom) {
                            // Direct hit
                            targetIndex = i;
                            insertBefore = currentY < itemMiddle;
                            console.log(`🎯 Direct hit on item ${i}, insertBefore: ${insertBefore}`);
                            break;
                        } else if (distance < closestDistance) {
                            // Track closest item as fallback
                            closestDistance = distance;
                            closestIndex = i;
                        }
                    }
                }
                
                // If no direct hit, use closest item or handle drop at end
                if (targetIndex === -1 && closestIndex !== -1) {
                    // Check if we're dragging below all items
                    const lastItemRect = allItems[allItems.length - 1].getBoundingClientRect();
                    if (currentY > lastItemRect.bottom) {
                        // Dropping below all items - append to end
                        targetIndex = allItems.length - 1;
                        insertBefore = false;
                        console.log(`🎯 Dropping below all items, appending to end`);
                    } else {
                        // Use existing closest item logic
                        targetIndex = closestIndex;
                        const closestRect = allItems[closestIndex].getBoundingClientRect();
                        const closestMiddle = closestRect.top + closestRect.height / 2;
                        insertBefore = currentY < closestMiddle;
                        console.log(`🎯 Using closest item ${closestIndex}, insertBefore: ${insertBefore}`);
                    }
                }
                
                // Perform the reorder
                if (targetIndex !== -1) {
                    const draggedIndex = nodeData.sourceLinks.indexOf(draggedData);
                    
                    // Get the actual data of the target item to find its index in sourceLinks
                    const targetItem = allItems[targetIndex];
                    const targetData = d3.select(targetItem).datum();
                    const targetSourceIndex = nodeData.sourceLinks.indexOf(targetData);
                    
                    console.log(`🎯 Drop target: DOM index ${targetIndex}, sourceLinks index ${targetSourceIndex}, insertBefore: ${insertBefore}`);
                    console.log(`📍 Dragged sourceLinks index: ${draggedIndex}`);
                    
                    let newIndex = targetSourceIndex;
                    
                    // Adjust for insertion position
                    if (!insertBefore) {
                        newIndex++;
                    }
                    
                    // Adjust if dragging downward (skip the dragged item itself)
                    if (draggedIndex < newIndex) {
                        newIndex--;
                    }
                    
                    console.log(`🔄 Final target index: ${newIndex}`);
                    
                    if (draggedIndex !== newIndex && newIndex >= 0 && newIndex <= nodeData.sourceLinks.length) {
                        const success = this.moveLinkInOrder(nodeData, draggedIndex, newIndex);
                        if (success) {
                            this.refreshLinkOrderingList(container, nodeData);
                        }
                    } else {
                        console.log(`❌ Invalid reorder: ${draggedIndex} → ${newIndex}`);
                    }
                } else {
                    console.log(`❌ No valid drop target found`);
                }
                
                // Clean up visual state - use draggedItem instead of this
                if (draggedItem) {
                    d3.select(draggedItem)
                        .style('cursor', 'grab')
                        .style('opacity', '1')
                        .style('transform', 'none')
                        .style('z-index', 'auto')
                        .style('position', 'static')
                        .style('box-shadow', '0 1px 3px rgba(0,0,0,0.1)');
                }
                
                // Reset all item styles safely
                try {
                    container.selectAll('.link-order-item')
                        .style('background', '#ffffff')
                        .style('border-color', '#e5e7eb');
                } catch (error) {
                    console.warn('⚠️ Error resetting item styles:', error);
                }
                
                draggedItem = null;
                draggedData = null;
                allItems = [];
            }.bind(this))
        );
    }
    
    moveLinkInOrder(nodeData, fromIndex, toIndex) {
        // Ensure valid indices
        if (fromIndex < 0 || fromIndex >= nodeData.sourceLinks.length || 
            toIndex < 0 || toIndex > nodeData.sourceLinks.length || 
            fromIndex === toIndex) {
            console.log(`❌ Invalid move: ${fromIndex} → ${toIndex}`);
            return false;
        }
        
        // Move link from one position to another in the sourceLinks array
        const link = nodeData.sourceLinks.splice(fromIndex, 1)[0];
        nodeData.sourceLinks.splice(toIndex, 0, link);
        
        console.log(`🔄 Moved link "${link.target.id}" from position ${fromIndex} to ${toIndex}`);
        console.log(`📋 New order:`, nodeData.sourceLinks.map(l => l.target.id));
        return true;
    }
    
    refreshLinkOrderingList(container, nodeData) {
        console.log(`🔄 Refreshing list with new order:`, nodeData.sourceLinks.map(l => l.target.id));
        
        // Remove and recreate the list with updated order
        container.selectAll('.link-order-item').remove();
        this.createLinkOrderingList(container, nodeData);
        
        console.log(`✅ List refreshed with ${nodeData.sourceLinks.length} items`);
    }
    
    applyLinkOrder(nodeData) {
        console.log(`🔗 Applying new link order for node: ${nodeData.id}`);
        console.log(`📋 Current link order:`, nodeData.sourceLinks.map(l => l.target.id));
        
        // Reorder target nodes to match the new link order
        this.reorderTargetNodes(nodeData);
        
        // Only recalculate link positions, not full layout
        console.log(`⚙️ Recalculating link positions...`);
        this.calculateLinkPositions();
        
        // Re-render links and nodes to show new positions
        console.log(`🎨 Re-rendering links and nodes...`);
        this.chart.selectAll('.sankey-link').remove();
        this.chart.selectAll('.sankey-node').remove();
        this.chart.selectAll('.node-text-group').remove();
        this.renderNodes();
        this.renderLinks();
        this.renderLabels();
        
        // Show success feedback
        this.showLinkOrderingSuccess(nodeData);
        
        console.log(`✅ Link order applied successfully`);
    }
    
    reorderTargetNodes(sourceNode) {
        console.log(`🔄 Reordering target nodes and handling collisions for: ${sourceNode.id}`);
        
        // Get all target nodes from this source node's links
        const targetNodes = sourceNode.sourceLinks.map(link => link.target);
        console.log(`🎯 Target nodes to reorder:`, targetNodes.map(n => n.id));
        
        if (targetNodes.length === 0) return;
        
        // Store original positions before any changes
        const originalPositions = new Map();
        targetNodes.forEach(node => {
            originalPositions.set(node.id, { y: node.y, children: this.getAllChildNodes(node) });
        });
        
        // Calculate new Y positions for target nodes
        const sourceY = sourceNode.y;
        const sourceHeight = sourceNode.height;
        const totalTargetHeight = targetNodes.reduce((sum, node) => sum + node.height, 0);
        const spacing = 10;
        const totalSpacing = (targetNodes.length - 1) * spacing;
        const totalHeight = totalTargetHeight + totalSpacing;
        
        let startY = sourceY + (sourceHeight / 2) - (totalHeight / 2);
        startY = Math.max(startY, 20);
        
        // Position target nodes in new order
        let currentY = startY;
        targetNodes.forEach((node, index) => {
            const oldY = node.y;
            node.y = currentY;
            node.manualY = currentY;
            node.manuallyPositioned = true;
            
            console.log(`📍 Moving ${node.id}: ${oldY} → ${currentY}`);
            currentY += node.height + spacing;
        });
        
        // Now handle children and displacement
        this.repositionChildrenAndHandleCollisions(targetNodes, originalPositions);
        
        console.log(`✅ Target nodes repositioned with collision handling`);
    }
    
    getAllChildNodes(node) {
        const children = [];
        if (node.sourceLinks) {
            node.sourceLinks.forEach(link => {
                children.push(link.target);
                // Recursively get grandchildren
                children.push(...this.getAllChildNodes(link.target));
            });
        }
        return children;
    }
    
    repositionChildrenAndHandleCollisions(movedNodes, originalPositions) {
        // First, move all children of the moved nodes
        movedNodes.forEach(node => {
            const original = originalPositions.get(node.id);
            const deltaY = node.y - original.y;
            
            if (Math.abs(deltaY) > 5 && node.sourceLinks) {
                console.log(`🔄 Moving children of ${node.id} by deltaY: ${deltaY}`);
                this.moveChildrenRecursively(node, deltaY);
            }
        });
        
        // Then resolve collisions by displacing nodes that are now overlapping
        this.resolveOverlaps();
    }
    
    moveChildrenRecursively(parentNode, deltaY) {
        if (!parentNode.sourceLinks) return;
        
        parentNode.sourceLinks.forEach(link => {
            const childNode = link.target;
            if (childNode.depth === parentNode.depth + 1) {
                const newY = childNode.y + deltaY;
                const constrainedY = Math.max(20, Math.min(
                    this.config.height - this.config.margin.top - this.config.margin.bottom - childNode.height - 20,
                    newY
                ));
                
                childNode.y = constrainedY;
                childNode.manualY = constrainedY;
                childNode.manuallyPositioned = true;
                
                console.log(`📍 Moved child: ${childNode.id} to Y: ${constrainedY}`);
                
                // Recursively move grandchildren
                this.moveChildrenRecursively(childNode, deltaY);
            }
        });
    }
    
    resolveOverlaps() {
        console.log(`🔧 Starting overlap resolution...`);
        
        // Group nodes by depth (layer)
        const nodesByDepth = new Map();
        this.nodes.forEach(node => {
            if (!nodesByDepth.has(node.depth)) {
                nodesByDepth.set(node.depth, []);
            }
            nodesByDepth.get(node.depth).push(node);
        });
        
        // Keep resolving overlaps until no more are found
        let maxIterations = 10;
        let iteration = 0;
        let hasOverlaps = true;
        
        while (hasOverlaps && iteration < maxIterations) {
            hasOverlaps = false;
            iteration++;
            console.log(`🔄 Overlap resolution iteration ${iteration}`);
            
            // For each layer, check for overlaps and resolve them
            nodesByDepth.forEach((nodesInLayer, depth) => {
                // Sort nodes by Y position
                nodesInLayer.sort((a, b) => a.y - b.y);
                
                // Check for overlaps and adjust positions
                for (let i = 1; i < nodesInLayer.length; i++) {
                    const currentNode = nodesInLayer[i];
                    const previousNode = nodesInLayer[i - 1];
                    
                    const minGap = 10;
                    const requiredY = previousNode.y + previousNode.height + minGap;
                    
                    if (currentNode.y < requiredY) {
                        console.log(`⚠️ Iteration ${iteration}: ${currentNode.id} overlaps with ${previousNode.id}`);
                        const deltaY = requiredY - currentNode.y;
                        
                        // Move the overlapping node and its children (but don't call recursively)
                        currentNode.y = requiredY;
                        currentNode.manualY = requiredY;
                        console.log(`🔧 Displaced ${currentNode.id} by ${deltaY} to Y: ${requiredY}`);
                        
                        // Mark that we found overlaps and need another iteration
                        hasOverlaps = true;
                    }
                }
            });
        }
        
        console.log(`✅ Overlap resolution completed after ${iteration} iterations`);
    }
    
    moveNodeAndChildren(node, deltaY) {
        node.y += deltaY;
        node.manualY = node.y;
        console.log(`🔧 Displaced ${node.id} by ${deltaY} to avoid overlap`);
        
        // Move children too
        this.moveChildrenRecursively(node, deltaY);
    }
    
    moveChildrenWithNode(parentNode, deltaY) {
        if (!parentNode.sourceLinks) return;
        
        parentNode.sourceLinks.forEach(link => {
            const childNode = link.target;
            if (childNode.depth === parentNode.depth + 1) {
                childNode.y += deltaY;
                childNode.manualY = childNode.y;
                childNode.manuallyPositioned = true;
                
                console.log(`📍 Moved child ${childNode.id} by ${deltaY} to Y: ${childNode.y}`);
                
                // Recursively move grandchildren
                this.moveChildrenWithNode(childNode, deltaY);
            }
        });
    }
    
    showLinkOrderingSuccess(nodeData) {
        // Create a temporary success message
        const successMsg = this.container
            .append('div')
            .style('position', 'fixed')
            .style('top', '20px')
            .style('right', '20px')
            .style('background', '#10b981')
            .style('color', 'white')
            .style('padding', '12px 16px')
            .style('border-radius', '8px')
            .style('font-size', '13px')
            .style('font-weight', '600')
            .style('z-index', '3000')
            .style('box-shadow', '0 4px 12px rgba(16, 185, 129, 0.4)')
            .style('opacity', '0')
            .style('transform', 'translateY(-10px)')
            .text(`✅ Link order updated for "${nodeData.id}"`);
        
        // Animate in
        successMsg
            .transition()
            .duration(200)
            .style('opacity', '1')
            .style('transform', 'translateY(0px)');
        
        // Animate out and remove
        setTimeout(() => {
            successMsg
                .transition()
                .duration(300)
                .style('opacity', '0')
                .style('transform', 'translateY(-10px)')
                .on('end', () => successMsg.remove());
        }, 2500);
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PulseSankeyChart;
}