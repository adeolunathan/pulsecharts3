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
        // Initialize zoom with fallback check
        if (window.ChartZoom && window.ChartZoom.initializeZoomPan) {
            ChartZoom.initializeZoomPan.call(this);
        } else {
            console.error('❌ ChartZoom utility not available. Please ensure ChartZoom.js is loaded before SankeyChart.js');
            // Fallback: create basic zoom without ChartZoom utility
            this.initializeBasicZoom();
        }

        this.createTooltip();
        this.initializeColorPicker();
    }

    // Initialize color picker with chart-specific callback
    initializeColorPicker() {
        if (window.ChartColorPicker && window.ChartColorPicker.initializeColorPicker) {
            // Create callback that handles both node and link color updates
            const colorUpdateCallback = (elementData, newColor, element) => {
                if (elementData.id) {
                    // Node color update
                    this.updateNodeColor(elementData, newColor);
                } else if (elementData.source && elementData.target) {
                    // Link color update
                    this.updateLinkColor(elementData, newColor);
                }
            };
            
            ChartColorPicker.initializeColorPicker.call(this, colorUpdateCallback);
        } else {
            console.warn('⚠️ ChartColorPicker utility not available, using fallback implementation');
            this.initializeColorPickerFallback();
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
        if (this.isPreRevenueNode(node)) {
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
        if (this.isPreRevenueLink(link)) {
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
        
        this.detectStatementType(data);
        this.detectAndApplyColors(data);
        
        if (this.statementType === 'balance') {
            this.assignColorGroups();
        }
        
        this.processData(data);
        this.detectRevenueHub(); // NEW: Detect revenue hub
        this.calculateLayout();  // Layout first
        this.calculateFinancialMetrics(); // THEN calculate margins
        
        this.chart.selectAll('*').remove();
        this.svg.selectAll('.chart-header, .chart-footnotes, .chart-branding').remove();
        
        this.renderTitle();
        this.renderLinks();
        this.renderNodes();
        this.renderLabels();
        this.renderFootnotes();
        // Use global branding component
        if (window.ChartBranding) {
            window.ChartBranding.renderBranding(this.svg, this.config, this.data?.metadata);
        } else {
            console.warn('⚠️ ChartBranding utility not loaded, falling back to local branding');
            this.renderBrandingFooter();
        }
        this.renderBrandLogo();
        
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
            .text('chart by pulse analytics');
        
        return this;
    }

    /**
     * NEW: Detect the revenue hub node and its layer position
     */
    detectRevenueHub() {
        // Strategy 1: Look for nodes with "total revenue" or similar
        let revenueHub = this.nodes.find(node => {
            const idLower = node.id.toLowerCase();
            return idLower.includes('total revenue') || 
                   idLower.includes('revenue hub') ||
                   idLower.includes('net revenue') ||
                   (idLower === 'revenue' && node.targetLinks.length > 3);
        });

        // Strategy 2: Find revenue category node with multiple inflows
        if (!revenueHub) {
            const revenueNodes = this.nodes.filter(node => 
                node.category === 'revenue' && node.targetLinks.length > 1
            );
            
            if (revenueNodes.length > 0) {
                // Choose the one with most inflows or highest value
                revenueHub = revenueNodes.reduce((max, node) => 
                    (node.targetLinks.length > max.targetLinks.length || 
                     (node.targetLinks.length === max.targetLinks.length && node.value > max.value)) ? node : max
                );
            }
        }

        // Strategy 3: Find middle-layer revenue node
        if (!revenueHub) {
            const depths = [...new Set(this.nodes.map(n => n.depth))];
            const middleDepth = depths[Math.floor(depths.length / 2)];
            
            revenueHub = this.nodes.find(node => 
                node.depth === middleDepth && 
                node.category === 'revenue'
            );
        }

        if (revenueHub) {
            this.revenueHubNode = revenueHub;
            this.revenueHubLayer = revenueHub.depth;
            console.log(`💰 Revenue hub detected: ${revenueHub.id} at layer ${this.revenueHubLayer}`);
        } else {
            // Fallback: assume layer 1 is revenue hub layer
            this.revenueHubLayer = 1;
            console.log(`💰 Revenue hub layer defaulted to: ${this.revenueHubLayer}`);
        }
    }

    /**
     * NEW: Check if a node is in the pre-revenue segment
     */
    isPreRevenueNode(node) {
        if (!node || this.revenueHubLayer === null) return false;
        
        // Nodes to the left of or in layers before the revenue hub
        return node.depth < this.revenueHubLayer;
    }

    /**
     * NEW: Check if a link is a pre-revenue link (should use source coloring)
     */
    isPreRevenueLink(link) {
        if (!link || this.revenueHubLayer === null) return false;
        
        // Links where both source and target are before revenue hub
        // OR links flowing INTO the revenue hub from pre-revenue segments
        return (link.source.depth < this.revenueHubLayer) ||
               (link.source.depth < this.revenueHubLayer && link.target.depth <= this.revenueHubLayer);
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
        // Use the dynamically detected revenue hub node if available
        let totalRevenueNode = this.revenueHubNode;
        
        // If no revenue hub was detected, use more sophisticated fallback logic
        if (!totalRevenueNode) {
            // Strategy 1: Look for nodes with "total revenue" in name
            totalRevenueNode = this.nodes.find(n => 
                n.id && n.id.toLowerCase().includes('total revenue')
            );
            
            // Strategy 2: Find the revenue node with the highest value
            if (!totalRevenueNode) {
                const revenueNodes = this.nodes.filter(n => n.category === 'revenue');
                if (revenueNodes.length > 0) {
                    totalRevenueNode = revenueNodes.reduce((max, node) => 
                        node.value > max.value ? node : max
                    );
                }
            }
            
            // Strategy 3: Find revenue node that has the most outgoing flows (acts as a hub)
            if (!totalRevenueNode) {
                const revenueNodes = this.nodes.filter(n => n.category === 'revenue');
                if (revenueNodes.length > 0) {
                    totalRevenueNode = revenueNodes.reduce((max, node) => 
                        node.sourceLinks.length > max.sourceLinks.length ? node : max
                    );
                }
            }
        }
        
        const totalRevenue = totalRevenueNode ? totalRevenueNode.value : 0;
        
        // Log which revenue node is being used for margin calculations
        if (totalRevenueNode) {
            console.log(`💰 Using revenue node for margin calculations: "${totalRevenueNode.id}" (${this.formatCurrency(totalRevenue)}) at depth ${totalRevenueNode.depth}`);
        } else {
            console.warn('⚠️ No revenue node found for margin calculations - margins will be 0%');
        }
        
        this.nodes.forEach(node => {
            // Only calculate percentageOfRevenue and marginValue if marginPercentage is not already provided from Flow Builder
            if (!node.marginPercentage || node.marginPercentage === 'N/A') {
                if (totalRevenue > 0) {
                    node.percentageOfRevenue = (node.value / totalRevenue) * 100;
                } else {
                    node.percentageOfRevenue = 0;
                }
                
                // Calculate marginPercentage for ALL nodes, not just profit
                node.marginPercentage = node.percentageOfRevenue.toFixed(1) + '%';
                
                // Set specific margin types for profit nodes
                if (node.category === 'profit') {
                    if (node.id.toLowerCase().includes('gross')) {
                        node.marginType = 'Gross Margin';
                    } else if (node.id.toLowerCase().includes('operating')) {
                        node.marginType = 'Operating Margin';
                    } else if (node.id.toLowerCase().includes('net')) {
                        node.marginType = 'Net Margin';
                    } else {
                        node.marginType = 'Margin';
                    }
                } else {
                    // For non-profit nodes, show as "% of Revenue"
                    node.marginType = '% of Revenue';
                }
                
                node.marginValue = node.percentageOfRevenue;
            }
            
            node.isExpenseType = node.category === 'expense';
        });
        
        console.log('📊 Financial metrics calculated (prioritizing Flow Builder marginPercentage)');
    }

    calculateLayout() {
        const dimensions = {
            width: this.config.width - this.config.margin.left - this.config.margin.right,
            height: this.config.height - this.config.margin.top - this.config.margin.bottom
        };

        const nodesByDepth = d3.group(this.nodes, d => d.depth);
        const depths = Array.from(nodesByDepth.keys());
        const maxDepth = Math.max(...depths);

        const xScale = d3.scaleLinear()
            .domain([0, maxDepth])
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
    renderTitle() {
        const headerGroup = this.svg.append('g')
            .attr('class', 'chart-header');

        const company = this.data?.metadata?.company || 'Company';
        const period = this.data?.metadata?.period || 'Period';
        
        // FIXED: Dynamic title based on statement type
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
            .attr('letter-spacing', '0.5px')
            .text(titleText);

        console.log(`📊 Rendered ${statementLabel} title: ${titleText}`);
    }

    renderBrandingFooter() {
        const footerGroup = this.svg.append('g')
            .attr('class', 'chart-branding')
            .attr('transform', `translate(0, ${this.config.height - 35})`);

        // Priority order: backend logo file -> user uploaded logo -> default logo
        const backendLogoUrl = 'assets/images/logo.png';
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
            .attr('width', hasBackendLogo ? 200 : 32)  // Much larger for backend logo: 72px
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
                .attr('font-family', this.getFontFamily())
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
                    .attr('font-family', this.getFontFamily())
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
                    .attr('font-family', this.getFontFamily())
                    .attr('fill', '#94a3b8')
                    .attr('opacity', 0.6)
                    .text('Powered by Pulse Charts');
            }
        } else {
            // Backend logo exists - show larger attribution
            footerGroup.append('text')
                .attr('x', this.config.width - 10)
                .attr('y', 10)  // Moved up slightly
                .attr('text-anchor', 'end')
                .attr('font-size', '16px')  // Increased from 10px to 14px
                .attr('font-weight', '400')  // Slightly bolder
                .attr('font-family', this.getFontFamily())
                .attr('fill', '#6b7280')  // Darker gray for better visibility
                .attr('opacity', 0.7)  // Increased opacity from 0.4 to 0.7
                .text('chart by pulse');
        }
    }

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
                
                this.updateLogoPosition(logoGroup, brandLogo);
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
                    this.updateLogoPosition(logoGroup, brandLogo);
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
                if (this.isPreRevenueLink(d)) {
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
                const newY = Math.max(20, Math.min(
                    self.config.height - self.config.margin.top - self.config.margin.bottom - d.height - 20,
                    event.y
                ));
                
                d.y = newY;
                d.manualY = newY;
                d3.select(this).attr('transform', `translate(${d.x}, ${d.y})`);
                
                self.updateNodeLinks(d);
                self.updateDragHint(d, newY);
            })
            .on('end', function(event, d) {
                self.isDragging = false;
                
                d3.select(this).select('rect')
                    .style('stroke', 'white')
                    .style('stroke-width', 2)
                    .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))');
                
                self.hideDragHint();
                
                self.calculateLinkPositions();
                self.chart.selectAll('.node-text-group, .node-label, .node-value').remove();
                self.renderLabels();
                self.renderLinks();
                
                console.log(`📍 Node "${d.id}" repositioned to Y: ${d.y.toFixed(1)}`);
                
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
        this.recalculateSingleNodeLinkPositions(draggedNode);
        
        draggedNode.sourceLinks.forEach(link => {
            link.path = this.createSmoothPath(link);
            
            this.chart.selectAll('.sankey-link path')
                .filter(d => d.source.id === link.source.id && d.target.id === link.target.id)
                .attr('d', link.path);
        });

        draggedNode.targetLinks.forEach(link => {
            link.path = this.createSmoothPath(link);
            
            this.chart.selectAll('.sankey-link path')
                .filter(d => d.source.id === link.source.id && d.target.id === link.target.id)
                .attr('d', link.path);
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
        // Check for individual revenue segment color first
        if (this.isPreRevenueNode(node) && this.revenueSegmentColors.has(node.id)) {
            return this.revenueSegmentColors.get(node.id);
        }
        
        // FIXED: Revenue segments should use their own default colors, not category colors
        // This prevents "Total Revenue" color changes from affecting revenue segments
        if (this.isPreRevenueNode(node) && node.category === 'revenue') {
            // Enhanced vibrant revenue segment color palette
            const defaultSegmentColors = [
                '#1e40af', '#2563eb', '#3b82f6', '#0ea5e9', '#06b6d4', 
                '#14b8a6', '#10b981', '#059669', '#0d9488', '#0f766e'
            ];
            const segmentIndex = this.getRevenueSegmentNodes().findIndex(n => n.id === node.id);
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
        if (this.isPreRevenueLink(link)) {
            const sourceColor = this.getNodeColor(link.source);
            return ChartUtils.lightenColor(sourceColor, 15);
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
    detectStatementType(data) {
        if (!data || !data.nodes) {
            this.statementType = 'income';
            return;
        }

        // Check if statement type is explicitly provided in metadata
        if (data.metadata && data.metadata.statementType) {
            this.statementType = data.metadata.statementType;
            console.log(`📊 Statement type from metadata: ${this.statementType}`);
            return;
        }

        // Fallback to keyword detection
        const balanceSheetKeywords = [
            'assets', 'total assets', 'current assets', 'non-current assets',
            'liabilities', 'current liabilities', 'non-current liabilities',
            'equity', 'shareholders equity', 'stockholders equity'
        ];

        const hasBalanceSheetNodes = data.nodes.some(node => 
            balanceSheetKeywords.some(keyword => 
                node.id.toLowerCase().includes(keyword.toLowerCase())
            )
        );

        this.statementType = hasBalanceSheetNodes ? 'balance' : 'income';
        console.log(`📊 Detected statement type: ${this.statementType}`);
    }

    assignColorGroups() {
        if (!this.nodes || this.statementType !== 'balance') {
            return;
        }

        this.colorGroups.clear();
        
        // Enhanced vibrant balance sheet colors
        const balanceSheetColors = {
            'Total Assets': this.customColors['Total Assets'] || '#1e293b',        // Deep slate
            'Current Assets': this.customColors['Current Assets'] || '#1e40af',    // Vibrant blue
            'Non-Current Assets': this.customColors['Non-Current Assets'] || '#7c3aed',  // Vibrant purple
            'Current Liabilities': this.customColors['Current Liabilities'] || '#dc2626',  // Sharp red
            'Non-Current Liabilities': this.customColors['Non-Current Liabilities'] || '#b91c1c',  // Deep red
            'Shareholders Equity': this.customColors['Shareholders Equity'] || '#059669'   // Vibrant emerald
        };
        
        const parentNodes = this.detectParentNodes();
        
        this.nodes.forEach(node => {
            let isParent = parentNodes.has(node.id);
            let baseColor = '#95a5a6';
            let groupName = null;
            let parentGroup = null;
            
            const nodeLower = node.id.toLowerCase();
            
            if (this.isExactParentGroupMatch(nodeLower, 'total assets')) {
                groupName = 'Total Assets';
                baseColor = balanceSheetColors['Total Assets'];
                isParent = true;
            } else if (this.isExactParentGroupMatch(nodeLower, 'current assets')) {
                groupName = 'Current Assets';
                baseColor = balanceSheetColors['Current Assets'];
                isParent = true;
            } else if (this.isExactParentGroupMatch(nodeLower, 'non-current assets') || 
                       this.isExactParentGroupMatch(nodeLower, 'noncurrent assets')) {
                groupName = 'Non-Current Assets';
                baseColor = balanceSheetColors['Non-Current Assets'];
                isParent = true;
            } else if (this.isExactParentGroupMatch(nodeLower, 'current liabilities')) {
                groupName = 'Current Liabilities';
                baseColor = balanceSheetColors['Current Liabilities'];
                isParent = true;
            } else if (this.isExactParentGroupMatch(nodeLower, 'non-current liabilities') || 
                       this.isExactParentGroupMatch(nodeLower, 'noncurrent liabilities')) {
                groupName = 'Non-Current Liabilities';
                baseColor = balanceSheetColors['Non-Current Liabilities'];
                isParent = true;
            } else if (this.isExactParentGroupMatch(nodeLower, 'shareholders equity') || 
                       this.isExactParentGroupMatch(nodeLower, 'stockholders equity') ||
                       this.isExactParentGroupMatch(nodeLower, "shareholders' equity") ||
                       nodeLower === 'equity') {
                groupName = 'Shareholders Equity';
                baseColor = balanceSheetColors['Shareholders Equity'];
                isParent = true;
            } else {
                isParent = false;
                parentGroup = this.determineChildParentGroup(node, parentNodes);
                if (parentGroup && balanceSheetColors[parentGroup]) {
                    groupName = parentGroup;
                    baseColor = balanceSheetColors[parentGroup];
                    console.log(`🎯 Child node ${node.id} inherits from ${parentGroup} → ${baseColor} (will be 65% opacity)`);
                } else {
                    console.log(`❌ Child node ${node.id} failed to find parent group`);
                }
            }
            
            this.colorGroups.set(node.id, {
                groupName: groupName,
                baseColor: baseColor,
                isParentGroup: isParent,
                parentGroup: parentGroup
            });
            
            console.log(`🎨 ${node.id} → ${groupName} (${isParent ? 'PARENT - 100% opacity' : 'CHILD - 65% opacity'})`);
        });
    }

    isExactParentGroupMatch(nodeLower, groupPattern) {
        return nodeLower === groupPattern || 
               nodeLower === groupPattern + 's' ||
               nodeLower.startsWith('total ' + groupPattern) ||
               nodeLower.endsWith(' total') && nodeLower.includes(groupPattern);
    }

    determineChildParentGroup(childNode, parentNodes) {
        console.log(`🔍 Analyzing child node: ${childNode.id}`);
        console.log(`🔍 Available parent nodes:`, Array.from(parentNodes));
        console.log(`🔍 Total links:`, this.links.length);
        
        const relevantLinks = this.links.filter(link => 
            link.source.id === childNode.id || link.target.id === childNode.id
        );
        console.log(`🔍 Links involving ${childNode.id}:`, relevantLinks.map(l => `${l.source.id} → ${l.target.id}`));
        
        for (const link of this.links) {
            if (link.target.id === childNode.id) {
                console.log(`🔗 ${childNode.id} receives from ${link.source.id}`);
                
                const sourceParentGroup = this.getParentGroupName(link.source.id);
                if (sourceParentGroup) {
                    console.log(`✅ Found parent group by name: ${link.source.id} → ${sourceParentGroup}`);
                    return sourceParentGroup;
                }
                
                if (parentNodes.has(link.source.id)) {
                    const parentGroupName = this.getParentGroupName(link.source.id);
                    console.log(`✅ Found parent group by detection: ${link.source.id} → ${parentGroupName}`);
                    return parentGroupName;
                }
            }
            
            if (link.source.id === childNode.id) {
                console.log(`🔗 ${childNode.id} sends to ${link.target.id}`);
                
                const targetParentGroup = this.getParentGroupName(link.target.id);
                if (targetParentGroup) {
                    console.log(`✅ Found parent group by name: ${link.target.id} → ${targetParentGroup}`);
                    return targetParentGroup;
                }
                
                if (parentNodes.has(link.target.id)) {
                    const parentGroupName = this.getParentGroupName(link.target.id);
                    console.log(`✅ Found parent group by detection: ${link.target.id} → ${parentGroupName}`);
                    return parentGroupName;
                }
            }
        }
        
        console.log(`❌ No parent group found for ${childNode.id}`);
        return null;
    }

    getParentGroupName(nodeId) {
        const nodeLower = nodeId.toLowerCase();
        
        console.log(`🏷️ Getting parent group name for: ${nodeId} (lower: ${nodeLower})`);
        
        if (this.isExactParentGroupMatch(nodeLower, 'total assets')) {
            console.log(`🏷️ Matched: Total Assets`);
            return 'Total Assets';
        }
        if (this.isExactParentGroupMatch(nodeLower, 'current assets') || nodeLower === 'ca') {
            console.log(`🏷️ Matched: Current Assets`);
            return 'Current Assets';
        }
        if (this.isExactParentGroupMatch(nodeLower, 'non-current assets') || 
            this.isExactParentGroupMatch(nodeLower, 'noncurrent assets') || nodeLower === 'nca') {
            console.log(`🏷️ Matched: Non-Current Assets`);
            return 'Non-Current Assets';
        }
        if (this.isExactParentGroupMatch(nodeLower, 'current liabilities') || nodeLower === 'cl') {
            console.log(`🏷️ Matched: Current Liabilities`);
            return 'Current Liabilities';
        }
        if (this.isExactParentGroupMatch(nodeLower, 'non-current liabilities') || 
            this.isExactParentGroupMatch(nodeLower, 'noncurrent liabilities') || nodeLower === 'ncl') {
            console.log(`🏷️ Matched: Non-Current Liabilities`);
            return 'Non-Current Liabilities';
        }
        if (this.isExactParentGroupMatch(nodeLower, 'shareholders equity') || 
            this.isExactParentGroupMatch(nodeLower, 'stockholders equity') ||
            this.isExactParentGroupMatch(nodeLower, "shareholders' equity") || nodeLower === 'equity') {
            console.log(`🏷️ Matched: Shareholders Equity`);
            return 'Shareholders Equity';
        }
        
        console.log(`🏷️ No match found for: ${nodeId}`);
        return null;
    }

    detectParentNodes() {
        const parentNodes = new Set();
        
        this.nodes.forEach(node => {
            const outflowCount = this.links.filter(link => link.source.id === node.id).length;
            const receivesFromTotal = this.links.some(link => 
                link.target.id === node.id && link.source.id.toLowerCase().includes('total')
            );
            
            if (receivesFromTotal || outflowCount >= 2) {
                parentNodes.add(node.id);
                console.log(`👑 Parent detected: ${node.id} (receivesFromTotal: ${receivesFromTotal}, outflowCount: ${outflowCount})`);
            }
        });
        
        return parentNodes;
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
    
    getRevenueSegmentNodes() {
        return this.nodes.filter(node => this.isPreRevenueNode(node));
    }

    /**
     * Get pre-revenue nodes (alias for control module compatibility)
     */
    getPreRevenueNodes() {
        return this.getRevenueSegmentNodes();
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
            <div style="font-size: 16px; color: #60a5fa; margin-bottom: 8px; font-weight: 600;">
                ${this.formatCurrency(d.value, d)}
            </div>
            ${marginText ? `<div style="font-size: 12px; color: #e2e8f0; margin-bottom: 4px;">${marginText}</div>` : ''}
            <div style="font-size: 11px; color: #cbd5e1; line-height: 1.4;">
                ${d.description || 'Financial component'}
            </div>
        `;

        this.tooltip.html(content)
            .style('left', (event.pageX) + 'px')
            .style('top', (event.pageY - 10) + 'px')
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
            <div style="font-weight: 700; margin-bottom: 8px; font-size: 14px;">
                ${d.source.id} → ${d.target.id}
            </div>
            <div style="font-size: 16px; color: #60a5fa; margin-bottom: 8px; font-weight: 600;">
                ${this.formatCurrency(d.value, d.target)}
            </div>
            ${marginText ? `<div style="font-size: 12px; color: #e2e8f0; margin-bottom: 4px;">${marginText}</div>` : ''}
            <div style="font-size: 11px; color: #cbd5e1; line-height: 1.4;">
                ${d.target.description || 'Flow connection'}
            </div>
        `;
        
        this.tooltip
            .html(content)
            .style('left', (event.pageX) + 'px')
            .style('top', (event.pageY - 10) + 'px')
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
            this.updateBackgroundColor(newConfig.backgroundColor);
        }

        // Handle title font change specifically
        if (newConfig.titleFont !== undefined && oldConfig.titleFont !== newConfig.titleFont) {
            this.updateTitleFont(newConfig.titleFont);
        }

        // Handle title color change specifically
        if (newConfig.titleColor !== undefined && oldConfig.titleColor !== newConfig.titleColor) {
            this.updateTitleColor(newConfig.titleColor);
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
    clearBrand() {
        console.log('🗑️ Clearing brand logo from chart');
        
        if (this.data && this.data.metadata && this.data.metadata.brandLogo) {
            delete this.data.metadata.brandLogo;
            
            // Remove brand logo from SVG
            this.svg.selectAll('.chart-brand-logo').remove();
            
            console.log('✅ Brand logo cleared successfully');
        } else {
            console.log('ℹ️ No brand logo to clear');
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PulseSankeyChart;
}