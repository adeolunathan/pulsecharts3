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
        this.initializeFlowEditorWithRetry();
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

    // Flow editor wrapper methods
    showFlowEditor(element, linkData) {
        if (window.ChartFlowEditor && window.ChartFlowEditor.showFlowEditor) {
            // Get available nodes for dropdowns
            const availableNodes = this.nodes || [];
            ChartFlowEditor.showFlowEditor.call(this, element, linkData, availableNodes);
        } else {
            console.warn('⚠️ ChartFlowEditor utility not available');
        }
    }

    hideFlowEditor() {
        if (window.ChartFlowEditor && window.ChartFlowEditor.hideFlowEditor) {
            ChartFlowEditor.hideFlowEditor.call(this);
        }
    }

    // Handle flow save from flow editor
    handleFlowSave(updatedFlow, element) {
        
        // Find the original link in the data
        const originalLink = updatedFlow.originalLink;
        if (!originalLink) {
            console.warn('⚠️ No original link data found');
            return;
        }

        // Update the link in the current data
        if (this.data && this.data.links) {
            // Get the source and target IDs from the original link
            const originalSourceId = originalLink.source && originalLink.source.id ? originalLink.source.id : originalLink.source;
            const originalTargetId = originalLink.target && originalLink.target.id ? originalLink.target.id : originalLink.target;
            
            
            const linkIndex = this.data.links.findIndex(link => {
                const linkSourceId = link.source && link.source.id ? link.source.id : link.source;
                const linkTargetId = link.target && link.target.id ? link.target.id : link.target;
                return linkSourceId === originalSourceId && linkTargetId === originalTargetId;
            });
            
            if (linkIndex !== -1) {
                // Update the existing link
                this.data.links[linkIndex] = {
                    ...this.data.links[linkIndex],
                    source: updatedFlow.source,
                    target: updatedFlow.target,
                    value: updatedFlow.value,
                    previousValue: updatedFlow.previousValue
                };
                
                
                // Recalculate node values based on updated links
                this.recalculateNodeValues();
                
                // Re-render the chart with updated data first
                this.render(this.data);
                
                // CRITICAL: Notify PulseDataBridge of the update first (so it has the latest data)
                if (window.PulseDataBridge && typeof window.PulseDataBridge.notifyDataChange === 'function') {
                    window.PulseDataBridge.notifyDataChange(this.data, 'chart-edit');
                }
                
                // Now do EXACTLY what the reset button does
                
                // Get data from PulseDataBridge (like reset button does)
                const data = window.PulseDataBridge ? window.PulseDataBridge.getData() : this.data;
                
                if (data && typeof window.convertSankeyDataToFlows === 'function') {
                    // CRITICAL: Preserve existing colors (like reset button does)
                    const existingColors = window.flowData ? { ...window.flowData.metadata.colorPalette } : {};
                    
                    // Update flowData directly (like reset button does)
                    window.flowData = window.convertSankeyDataToFlows(data);
                    
                    // CRITICAL: Restore colors (like reset button does)
                    window.flowData.metadata.colorPalette = { ...existingColors, ...window.flowData.metadata.colorPalette };
                    
                    // Call exact same sequence as reset button
                    if (typeof window.updateMetadataInputs === 'function') {
                        window.updateMetadataInputs();
                    }
                    if (typeof window.renderFlowTable === 'function') {
                        window.renderFlowTable();
                    }
                    if (typeof window.updateAllStats === 'function') {
                        window.updateAllStats();
                    }
                    
                    // Success message (no alert dialog)
                } else {
                    console.warn('⚠️ Could not execute reset sequence - missing functions');
                }
            } else {
                console.warn('⚠️ Original link not found in data');
            }
        }
    }

    // Handle flow delete from flow editor
    handleFlowDelete(linkData, element) {
        
        // Find and remove the link from the data
        if (this.data && this.data.links) {
            // Get the source and target IDs from the link data
            const linkSourceId = linkData.source && linkData.source.id ? linkData.source.id : linkData.source;
            const linkTargetId = linkData.target && linkData.target.id ? linkData.target.id : linkData.target;
            
            const linkIndex = this.data.links.findIndex(link => {
                const dataSourceId = link.source && link.source.id ? link.source.id : link.source;
                const dataTargetId = link.target && link.target.id ? link.target.id : link.target;
                return dataSourceId === linkSourceId && dataTargetId === linkTargetId;
            });
            
            if (linkIndex !== -1) {
                // Remove the link
                this.data.links.splice(linkIndex, 1);
                
                
                // Check which node should be deleted based on link type
                // For revenue segments (sources that flow to revenue hubs), delete the source
                // For other links, delete the target if it becomes orphaned
                
                let nodeToDelete = null;
                
                // Check if this is a revenue segment link (source flows to revenue hub)
                const isRevenueSegmentLink = window.FinancialDataProcessor && 
                    FinancialDataProcessor.isPreRevenueLink && 
                    FinancialDataProcessor.isPreRevenueLink(linkData, this.revenueHubLayer);
                
                if (isRevenueSegmentLink) {
                    // For revenue segments, check if source node should be deleted
                    nodeToDelete = linkSourceId;
                } else {
                    // For other links, check if target node should be deleted
                    nodeToDelete = linkTargetId;
                }
                
                // Check if the node has any remaining connections
                const hasOtherLinks = this.data.links.some(link => {
                    const sourceId = link.source && link.source.id ? link.source.id : link.source;
                    const targetId = link.target && link.target.id ? link.target.id : link.target;
                    return sourceId === nodeToDelete || targetId === nodeToDelete;
                });
                
                if (!hasOtherLinks && this.data.nodes && nodeToDelete) {
                    // Find and remove the node
                    const nodeIndex = this.data.nodes.findIndex(node => node.id === nodeToDelete);
                    if (nodeIndex !== -1) {
                        this.data.nodes.splice(nodeIndex, 1);
                    }
                }
                
                // Update spreadsheet if available
                this.updateSpreadsheetData();
                
                // Re-render the chart with updated data
                this.render(this.data);
            } else {
                console.warn('⚠️ Link not found in data');
            }
        }
    }

    // Recalculate node values based on current links
    recalculateNodeValues() {
        if (!this.data || !this.data.nodes || !this.data.links) return;
        
        
        // Calculate node values based on link connections
        this.data.nodes.forEach(node => {
            // Check if this is a source node (has outgoing links but no incoming links)
            const hasIncomingLinks = this.data.links.some(link => {
                const targetId = link.target && link.target.id ? link.target.id : link.target;
                return targetId === node.id;
            });
            
            const hasOutgoingLinks = this.data.links.some(link => {
                const sourceId = link.source && link.source.id ? link.source.id : link.source;
                return sourceId === node.id;
            });
            
            // If it's a pure source node (revenue segment), sum outgoing flows
            if (hasOutgoingLinks && !hasIncomingLinks) {
                // Revenue segments should equal the sum of their outgoing flows
                const outgoingFlows = this.data.links.filter(link => {
                    const sourceId = link.source && link.source.id ? link.source.id : link.source;
                    return sourceId === node.id;
                });
                node.value = outgoingFlows.reduce((sum, link) => sum + (parseFloat(link.value) || 0), 0);
            } else {
                // Reset intermediate and target nodes
                node.value = 0;
            }
        });
        
        // Calculate intermediate and target node values from links
        this.data.links.forEach(link => {
            const sourceId = link.source && link.source.id ? link.source.id : link.source;
            const targetId = link.target && link.target.id ? link.target.id : link.target;
            const linkValue = parseFloat(link.value) || 0;
            
            // Add value to target node (incoming flow)
            const targetNode = this.data.nodes.find(node => node.id === targetId);
            if (targetNode) {
                targetNode.value += linkValue;
            }
        });
        
    }

    // Update spreadsheet data if available - simplified for backup notification
    updateSpreadsheetData() {
        try {
            
            // Notify PulseDataBridge if available
            if (window.PulseDataBridge && typeof window.PulseDataBridge.notifyDataChange === 'function') {
                window.PulseDataBridge.notifyDataChange(this.data, 'chart-edit');
            }
            
            // Dispatch custom event as fallback
            const updateEvent = new CustomEvent('pulseDataChanged', {
                detail: { 
                    data: this.data, 
                    source: 'chart-edit',
                    timestamp: Date.now()
                }
            });
            window.dispatchEvent(updateEvent);
            
        } catch (error) {
            console.warn('⚠️ Could not notify other components:', error.message);
        }
    }

    // Direct table update method for unified interface
    updateTableDirectly() {
        try {
            
            // Find the main flow table in the unified interface
            const flowTable = document.querySelector('#main-flow-table tbody') || 
                             document.querySelector('.flow-table tbody') ||
                             document.querySelector('table tbody');
            
            if (!flowTable) {
                console.warn('⚠️ Flow table not found for direct update');
                return;
            }
            
            
            // Get all existing table rows
            const tableRows = flowTable.querySelectorAll('tr');
            
            // Update each row with current chart data
            this.data.links.forEach((link, linkIndex) => {
                const sourceId = link.source?.id || link.source;
                const targetId = link.target?.id || link.target;
                const currentValue = link.value || 0;
                const previousValue = link.previousValue || 0;
                
                
                // Find matching row in table
                for (let i = 0; i < tableRows.length; i++) {
                    const row = tableRows[i];
                    const cells = row.querySelectorAll('td');
                    
                    if (cells.length >= 5) { // FROM, TO, DESCRIPTION, CURRENT, PREVIOUS
                        const fromCell = cells[1]; // FROM column
                        const toCell = cells[2];   // TO column  
                        const currentCell = cells[4]; // CURRENT column
                        const previousCell = cells[5]; // PREVIOUS column (if exists)
                        
                        // Check if this row matches the link
                        const fromText = fromCell.textContent?.trim() || fromCell.querySelector('input')?.value?.trim();
                        const toText = toCell.textContent?.trim() || toCell.querySelector('input')?.value?.trim();
                        
                        if (fromText === sourceId && toText === targetId) {
                            
                            // Update current value
                            const currentInput = currentCell.querySelector('input');
                            if (currentInput) {
                                currentInput.value = currentValue;
                            } else {
                                currentCell.textContent = currentValue;
                            }
                            
                            // Update previous value if cell exists
                            if (previousCell) {
                                const previousInput = previousCell.querySelector('input');
                                if (previousInput) {
                                    previousInput.value = previousValue;
                                } else {
                                    previousCell.textContent = previousValue;
                                }
                            }
                            
                            // Trigger any cell update events
                            if (currentInput) {
                                currentInput.dispatchEvent(new Event('input', { bubbles: true }));
                                currentInput.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                            
                            break;
                        }
                    }
                }
            });
            
            
        } catch (error) {
            console.warn('⚠️ Error in direct table update:', error.message);
            console.error(error);
        }
    }

    // Convert chart data back to spreadsheet format
    convertToSpreadsheetFormat(data) {
        if (!data || !data.links) return [];
        
        
        // Create header row
        const headers = ['From', 'To', 'Current', 'Previous', 'Type', 'Description'];
        
        // Create rows from links data
        const rows = data.links.map((link, index) => {
            const sourceId = link.source && link.source.id ? link.source.id : link.source;
            const targetId = link.target && link.target.id ? link.target.id : link.target;
            
            const row = [
                sourceId,                    // From
                targetId,                    // To  
                link.value || 0,            // Current Value
                link.previousValue || 0,    // Previous Value
                link.type || '',            // Type
                link.description || ''      // Description
            ];
            
            return row;
        });
        
        // Add headers as first row
        const result = [headers, ...rows];
        
        return result;
    }

    // Retry utility initialization with timeout
    initializeZoomWithRetry() {
        const attemptZoom = () => {
            if (window.ChartZoom && window.ChartZoom.initializeZoomPan) {
                ChartZoom.initializeZoomPan.call(this);
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

    initializeFlowEditorWithRetry() {
        const attemptFlowEditor = () => {
            if (window.ChartFlowEditor && window.ChartFlowEditor.initializeFlowEditor) {
                ChartFlowEditor.initializeFlowEditor.call(this, 
                    (updatedFlow, element) => {
                        this.handleFlowSave(updatedFlow, element);
                    },
                    (linkData, element) => {
                        this.handleFlowDelete(linkData, element);
                    }
                );
                return true;
            }
            return false;
        };

        // Try immediately first
        if (!attemptFlowEditor()) {
            // If immediate attempt fails, try once more after a short delay
            setTimeout(() => {
                if (!attemptFlowEditor()) {
                    console.warn('⚠️ ChartFlowEditor utility not available after retry');
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
                // Try fallback logo
                d3.select(this)
                    .attr('href', fallbackLogoUrl)
                    .attr('width', userLogoUrl ? 32 : 24)
                    .attr('height', userLogoUrl ? 32 : 24)
                    .on('error', function() {
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
        
        if (this.statementType === 'balance') {
            // For balance sheets, update the appropriate group color
            const colorGroup = this.colorGroups.get(node.id);
            if (colorGroup && colorGroup.groupName) {
                this.customColors[colorGroup.groupName] = color;
                
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
        
        if (this.statementType === 'balance') {
            // For balance sheets, determine which group to update based on link direction
            const isToTotalAssets = link.target.id.toLowerCase().includes('total assets');
            const isFromTotalAssets = link.source.id.toLowerCase().includes('total assets');
            
            let targetNode = isToTotalAssets ? link.source : link.target;
            const colorGroup = this.colorGroups.get(targetNode.id);
            
            if (colorGroup && colorGroup.groupName) {
                this.customColors[colorGroup.groupName] = color;
                
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
        
        // Calculate actual content height and resize SVG dynamically
        this.adjustSVGHeightToContent();
        
        return this;
    }

    // Adjust SVG height to match actual content
    adjustSVGHeightToContent() {
        try {
            // Calculate the maximum Y position of all chart content
            let maxContentY = 0;
            
            // Check node positions if available
            if (this.nodes && this.nodes.length > 0) {
                maxContentY = Math.max(maxContentY, ...this.nodes.map(n => n.y + (n.height || 0)));
            }
            
            // Check link positions if available
            if (this.links && this.links.length > 0) {
                const linkMaxY = this.links.reduce((max, link) => {
                    const sourceY = (link.sourceY || 0) + (link.sourceHeight || 0);
                    const targetY = (link.targetY || 0) + (link.targetHeight || 0);
                    return Math.max(max, sourceY, targetY);
                }, 0);
                maxContentY = Math.max(maxContentY, linkMaxY);
            }
            
            // Add margins and footer space
            const topMargin = this.config.margin.top || 60;
            const footerSpace = 100; // Space for logo and attribution
            const actualContentHeight = maxContentY + topMargin + footerSpace;
            
            // Only resize if the content height is significantly different from current height
            if (actualContentHeight > 0 && Math.abs(actualContentHeight - this.config.height) > 20) {
                
                // Update SVG dimensions
                this.svg
                    .attr('height', actualContentHeight)
                    .attr('viewBox', `0 0 ${this.config.width} ${actualContentHeight}`);
                
                // Update configuration for future reference
                this.config.height = actualContentHeight;
                
                // Reposition footer elements to the new bottom
                this.repositionFooterElements(actualContentHeight);
            }
        } catch (error) {
            console.warn('⚠️ Error adjusting SVG height:', error);
        }
    }

    // Reposition footer elements after height adjustment
    repositionFooterElements(newHeight) {
        // Reposition attribution text
        this.svg.selectAll('.chart-attribution')
            .attr('y', newHeight - 20);
        
        // Reposition footer group if it exists
        this.svg.selectAll('.footer-group')
            .attr('transform', `translate(0, ${newHeight - 35})`);
        
        // Reposition footnotes if they exist
        this.svg.selectAll('.footnotes-group')
            .attr('transform', `translate(0, ${newHeight - 80})`);
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
            Object.entries(data.metadata.revenueSegmentColors).forEach(([nodeId, color]) => {
                this.revenueSegmentColors.set(nodeId, color);
            });
        }
        
        // Restore any existing segment colors that weren't in metadata
        existingSegmentColors.forEach((color, nodeId) => {
            if (!this.revenueSegmentColors.has(nodeId)) {
                this.revenueSegmentColors.set(nodeId, color);
            }
        });

        if (data.metadata && data.metadata.colorPalette) {
            this.customColors = { ...data.metadata.colorPalette };
            
            if (this.customColors.expense && !this.customColors.tax) {
                this.customColors.tax = this.customColors.expense;
            }
            
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
            } else {
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
        } else {
            // User input like 300 → treat as millions → use bigger scale  
            optimalScale = MILLION_SCALE;
        }

        // Only auto-scale if user hasn't manually adjusted nodeHeightScale
        const defaultScales = [0.65, 0.05, 0.01, 0.00008, 0.00000008, 0.0002, 0.15];
        const isDefaultScale = defaultScales.some(scale => Math.abs(this.config.nodeHeightScale - scale) < 0.0001);
        
        
        if (isDefaultScale) {
            this.config.nodeHeightScale = optimalScale;
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

        // PRESERVE POSITIONS: Save current positions before layout recalculation
        const preservedPositions = new Map();
        if (this.nodes) {
            this.nodes.forEach(node => {
                preservedPositions.set(node.id, {
                    x: node.x,
                    y: node.y,
                    manuallyPositioned: node.manuallyPositioned || false,
                    manualY: node.manualY
                });
            });
        }

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

        // PRESERVE POSITIONS: Restore previous positions and mark as manually positioned
        this.nodes.forEach(node => {
            const preserved = preservedPositions.get(node.id);
            if (preserved && (preserved.manuallyPositioned || preserved.y !== undefined)) {
                // Validate preserved Y position before using it
                if (typeof preserved.y === 'number' && !isNaN(preserved.y)) {
                    // Restore Y position (preserve user's positioning)
                    node.y = preserved.y;
                    node.manualY = preserved.y;
                    node.manuallyPositioned = true;
                    // Save to metadata for persistence
                    this.saveManualPositionToMetadata(node);
                } else {
                    console.warn(`⚠️ Skipping invalid preserved position for ${node.id}: Y=${preserved.y}`);
                }
            }
        });

        this.applyManualPositions();
        this.minimizeCrossings();
        this.calculateLinkPositions();
    }

    /**
     * NEW: Calculate proportional node heights ensuring child nodes sum to parent height
     */
    calculateProportionalHeights() {
        
        // First pass: Calculate base heights using standard formula
        this.nodes.forEach(node => {
            node.baseHeight = Math.max(8, node.value * this.config.nodeHeightScale);
        });
        
        // Identify parent-child relationships
        const parentChildMap = this.buildParentChildMap();
        
        // Second pass: Adjust heights to ensure proportionality
        this.adjustHeightsForProportionality(parentChildMap);
        
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
            
            children.forEach(child => {
                const proportion = totalChildValue > 0 ? child.value / totalChildValue : 0;
            });
        });
        
        // Set heights for nodes that aren't children (they keep their base height)
        this.nodes.forEach(node => {
            if (node.height === undefined) {
                node.height = node.baseHeight;
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
        
        const manualNodes = nodes.filter(node => node.manuallyPositioned);
        const autoNodes = nodes.filter(node => !node.manuallyPositioned);
        
        if (autoNodes.length === 0) {
            return; 
        }
        
        // Create individual groups to maintain data order
        const groups = autoNodes.map(node => ({
            name: `Individual: ${node.id}`,
            nodes: [node]
        }));
        
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
            }
        });
        
        manualNodes.forEach((node, index) => {
            node.layerIndex = 1000 + index;
        });
        
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
            
            // Validate node position and dimensions
            if (isNaN(node.y) || isNaN(node.height)) {
                console.warn('Invalid node properties detected:', {
                    nodeId: node.id,
                    y: node.y,
                    height: node.height
                });
                return;
            }
            
            // Sorting removed - maintain original link order
            
            const totalOutflow = d3.sum(node.sourceLinks, d => d.value || 0);
            const effectiveNodeHeight = node.height * this.config.linkWidthScale;
            
            let currentY = node.y + (node.height - effectiveNodeHeight) / 2;
            
            node.sourceLinks.forEach((link, index) => {
                link.sourceY = currentY;
                const proportionalHeight = (totalOutflow > 0 && link.value > 0) 
                    ? (link.value / totalOutflow) * effectiveNodeHeight 
                    : 0;
                link.sourceHeight = isNaN(proportionalHeight) ? 0 : proportionalHeight;
                currentY += link.sourceHeight;
            });
            
            const totalUsedHeight = d3.sum(node.sourceLinks, d => d.sourceHeight);
            if (Math.abs(totalUsedHeight - effectiveNodeHeight) > 0.01) {
                const lastLink = node.sourceLinks[node.sourceLinks.length - 1];
                lastLink.sourceHeight += (effectiveNodeHeight - totalUsedHeight);
            }
        });
        
        this.nodes.forEach(node => {
            if (node.targetLinks.length === 0) return;
            
            // Validate node position and dimensions
            if (isNaN(node.y) || isNaN(node.height)) {
                console.warn('Invalid node properties detected:', {
                    nodeId: node.id,
                    y: node.y,
                    height: node.height
                });
                return;
            }
            
            // Sorting removed - maintain original link order
            
            const totalInflow = d3.sum(node.targetLinks, d => d.value || 0);
            const effectiveNodeHeight = node.height * this.config.linkWidthScale;
            
            let currentY = node.y + (node.height - effectiveNodeHeight) / 2;
            
            node.targetLinks.forEach((link, index) => {
                link.targetY = currentY;
                const proportionalHeight = (totalInflow > 0 && link.value > 0) 
                    ? (link.value / totalInflow) * effectiveNodeHeight 
                    : 0;
                link.targetHeight = isNaN(proportionalHeight) ? 0 : proportionalHeight;
                currentY += link.targetHeight;
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
        
        const sourceY0 = link.sourceY || 0;
        const sourceHeight = isNaN(link.sourceHeight) ? 0 : (link.sourceHeight || 0);
        const sourceY1 = sourceY0 + sourceHeight;
        const targetY0 = link.targetY || 0;
        const targetHeight = isNaN(link.targetHeight) ? 0 : (link.targetHeight || 0);
        const targetY1 = targetY0 + targetHeight;
        
        // Validate all coordinates to prevent NaN values
        const coords = [sourceX, targetX, sourceY0, sourceY1, targetY0, targetY1];
        if (coords.some(coord => isNaN(coord) || coord === undefined)) {
            console.warn('Invalid coordinates detected in createSmoothPath:', {
                sourceX, targetX, sourceY0, sourceY1, targetY0, targetY1,
                link: link
            });
            return 'M0,0 L0,0'; // Return a valid but invisible path
        }
        
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
            }, { x: rect.x, y: rect.y });
        });

        // Resize functionality for handles
        resizeHandles.forEach((handleRect, index) => {
            const handleType = handles[index];
            
            const resizeDrag = d3.drag()
                .on('start', () => {
                    brandLogo.isResizing = true;
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
                });
            
            handleRect.call(resizeDrag);
        });

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
                // Show flow editor for all link clicks
                this.showFlowEditor(event.currentTarget, d);
            })
            .on('dblclick', (event, d) => {
                event.stopPropagation();
                // Show flow editor for double-clicks too
                this.showFlowEditor(event.currentTarget, d);
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
                self.handleStandardDrag(event, d, this);
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
                
                
                // Save manual position to metadata for persistence
                self.saveManualPositionToMetadata(d);
            });

        nodeGroups.call(drag);
    }

    recalculateSingleNodeLinkPositions(node) {
        if (node.sourceLinks.length > 0) {
            const totalOutflow = d3.sum(node.sourceLinks, d => d.value || 0);
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
            const totalInflow = d3.sum(node.targetLinks, d => d.value || 0);
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
            }
        } else if (isFromTotalAssets) {
            if (targetColorGroup && targetColorGroup.baseColor) {
                baseColor = targetColorGroup.baseColor;
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
        
    }

    /**
     * ENHANCED: Set individual revenue segment color
     */
    setRevenueSegmentColor(nodeId, color) {
        
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
        if (this.data && this.data.metadata && node && node.id) {
            // Validate that node.y is a valid number before saving
            if (typeof node.y !== 'number' || isNaN(node.y)) {
                console.warn(`⚠️ Skipping save for ${node.id}: invalid Y position (${node.y})`);
                return;
            }
            
            if (!this.data.metadata.manualPositions) {
                this.data.metadata.manualPositions = {};
            }
            this.data.metadata.manualPositions[node.id] = {
                manuallyPositioned: node.manuallyPositioned,
                y: node.y,
                preserveLabelsAbove: node.preserveLabelsAbove
            };
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
            // Handle visual-only changes that don't require position recalculation
            
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
            
            // Handle font size changes
            if (newConfig.globalFontSize !== undefined) {
                this.chart.selectAll('.node-label')
                    .transition()
                    .duration(200)
                    .style('font-size', newConfig.globalFontSize + 'px');
                this.chart.selectAll('.node-value')
                    .transition()
                    .duration(200)
                    .style('font-size', newConfig.globalFontSize + 'px');
            }
            
            // Handle text distance changes (requires label repositioning)
            if (newConfig.textDistanceLeftmost !== undefined || 
                newConfig.textDistanceMiddle !== undefined || 
                newConfig.textDistanceRightmost !== undefined) {
                this.chart.selectAll('.node-text-group, .node-label, .node-value').remove();
                this.renderLabels();
            }
            
            // Handle color changes by re-applying colors
            const colorChanges = Object.keys(newConfig).filter(key => 
                key.includes('Color') || key.includes('color') || key === 'customColors'
            );
            if (colorChanges.length > 0) {
                // Re-apply node colors
                this.chart.selectAll('.sankey-node rect').each((d) => {
                    const color = this.getNodeColor(d);
                    d3.select(this).attr('fill', color);
                });
                // Re-apply link colors  
                this.chart.selectAll('.sankey-link path').each((d) => {
                    const color = this.getLinkColor(d);
                    d3.select(this).attr('fill', color);
                });
            }
            
            // Handle config changes that were moved out of layout recalc
            if (newConfig.linkWidthScale !== undefined && oldConfig.linkWidthScale !== newConfig.linkWidthScale) {
                // Only recalculate link positions, not node positions
                this.calculateLinkPositions();
                this.renderLinks();
            }
            
            // Handle padding and spacing changes without moving manually positioned nodes
            if (newConfig.nodePadding !== undefined && oldConfig.nodePadding !== newConfig.nodePadding) {
                // Only reposition non-manually positioned nodes
                this.repositionAutoNodes();
            }
            
            if ((newConfig.layerSpacing !== undefined && JSON.stringify(oldConfig.layerSpacing) !== JSON.stringify(newConfig.layerSpacing)) ||
                (newConfig.leftmostGroupGap !== undefined && oldConfig.leftmostGroupGap !== newConfig.leftmostGroupGap) ||
                (newConfig.rightmostGroupGap !== undefined && oldConfig.rightmostGroupGap !== newConfig.rightmostGroupGap)) {
                // Only reposition non-manually positioned nodes
                this.repositionAutoNodes();
            }
        }
        
        return this;
    }

    /**
     * Reposition only automatically positioned nodes, preserving manually positioned ones
     */
    repositionAutoNodes() {
        
        const dimensions = {
            width: this.config.width - this.config.margin.left - this.config.margin.right,
            height: this.config.height - this.config.margin.top - this.config.margin.bottom
        };

        const nodesByDepth = d3.group(this.nodes, d => d.depth);
        const depths = Array.from(nodesByDepth.keys()).sort((a, b) => a - b);
        const maxDepth = Math.max(...depths);

        depths.forEach(depth => {
            const nodesAtDepth = nodesByDepth.get(depth);
            // Only reposition nodes that are NOT manually positioned
            const autoNodes = nodesAtDepth.filter(node => !node.manuallyPositioned);
            
            if (autoNodes.length > 0) {
                this.positionNodesAtDepth(autoNodes, dimensions.height, maxDepth);
            }
        });

        // Update link positions to connect to new node positions
        this.calculateLinkPositions();
        
        // Re-render affected components
        this.renderNodes();
        this.renderLabels();
        this.renderLinks();
    }

    configRequiresFullRender(oldConfig, newConfig) {
        // Only trigger full render for changes that truly require complete rebuild
        const fullRenderKeys = ['nodeWidth', 'nodeHeightScale'];
        return fullRenderKeys.some(key => 
            JSON.stringify(oldConfig[key]) !== JSON.stringify(newConfig[key])
        );
    }

    configRequiresLayoutRecalc(oldConfig, newConfig) {
        // Only trigger layout recalc for spacing changes that affect node positioning
        // Most visual changes should NOT trigger layout recalculation to preserve positions
        const layoutKeys = ['leftmostSpacing', 'middleSpacing', 'rightmostSpacing'];
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
    }

    updateTitleFont(fontFamily) {
        this.config.titleFont = fontFamily;
        if (this.svg) {
            const fontStack = this.getFontFamily();
            
            // Update chart title and all text elements
            this.svg.selectAll('text')
                .style('font-family', fontStack);
        }
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
        
    }

    // Data processing methods for chart generation
    static generateNodesAndLinksFromFlows(flowData, comparisonMode = false) {
        const nodeMap = new Map();
        const links = [];
        
        // Filter out empty flows (empty rows from spreadsheet)
        const validFlows = flowData.flows.filter(flow => 
            flow.source && flow.source.trim() !== '' && 
            flow.target && flow.target.trim() !== '' && 
            flow.value !== 0 && !isNaN(flow.value)
        );
        
        validFlows.forEach(flow => {
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
        
        validFlows.forEach(flow => {
            const sourceNode = nodeMap.get(flow.source);
            if (sourceNode.value === 0) {
                const outflows = validFlows.filter(f => f.source === flow.source);
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
            
            
            // Use the same approach as bar chart - get zoom container bounds
            const containerBounds = this.zoomContainer.node().getBBox();
            
            // Calculate where the center of the content currently appears on screen
            // The current visual center = unscaled center * scale + current translation
            const unscaledCenterX = containerBounds.x + containerBounds.width / 2;
            const unscaledCenterY = containerBounds.y + containerBounds.height / 2;
            
            const currentVisualCenterX = unscaledCenterX * currentScale + currentX;
            const currentVisualCenterY = unscaledCenterY * currentScale + currentY;
            
            
            // Get SVG dimensions
            const svgWidth = parseFloat(this.svg.attr('width'));
            const svgHeight = parseFloat(this.svg.attr('height'));
            
            // Calculate how much we need to move to center the visual content in the SVG
            const svgCenterX = svgWidth / 2;
            const svgCenterY = svgHeight / 2;
            
            
            // The difference between where the content appears and where we want it
            const moveX = svgCenterX - currentVisualCenterX;
            const moveY = svgCenterY - currentVisualCenterY;
            
            // Calculate required translation (add movement to current translation)
            const requiredX = currentX + moveX;
            const requiredY = currentY + moveY;
            
            
            // Apply the centering transform with smooth animation
            const newTransform = d3.zoomIdentity
                .translate(requiredX, requiredY)
                .scale(currentScale);
            
            
            // Apply transform to SVG (which has the zoom behavior attached)
            this.svg
                .transition()
                .duration(800)
                .ease(d3.easeQuadInOut)
                .call(this.zoom.transform, newTransform)
                .on('end', () => {
                    
                    // Log final state
                    const finalTransform = d3.zoomTransform(this.svg.node());
                });
            
        } catch (error) {
            console.error('❌ Error during chart centering:', error);
        }
    }

    // ===== INTERACTIVE NODE CREATION AND ARRANGEMENT SYSTEM =====
    
    initializeInteractiveMode() {
        // Initialize interaction mode state
        this.interactionMode = {
            mode: 'normal',
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
            case 'normal':
                this.clearInteractionState();
                break;
        }
        
        // Update node interaction behavior
        this.updateNodeInteractionMode();
        
    }
    
    updateModeButtonAppearances() {
        const mode = this.interactionMode.mode;
        
        // Show/hide Exit button
        const exitBtn = this.container.select('.normal-mode-btn');
        exitBtn.style('display', mode === 'normal' ? 'none' : 'flex');
    }
    
    
    updateNodeClickHandlers() {
        // Add click handlers to existing nodes
        this.chart.selectAll('.sankey-node')
            .style('cursor', 'pointer')
            .on('click', (event, d) => {
                event.stopPropagation();
                this.showEnhancedColorPicker(event, d);
            });
    }
    
    updateNodeInteractionMode() {
        const mode = this.interactionMode.mode;
        
        this.chart.selectAll('.sankey-node')
            .style('cursor', 'pointer');
            
        // Update visual state of nodes
        this.chart.selectAll('.sankey-node rect')
            .style('stroke-width', '2px')
            .style('stroke', 'white')
            .style('opacity', '1');
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
        
        // Add cycling toggle for target category
        this.addCyclingToggle(container, nodeData);
        
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
    
    addCyclingToggle(container, nodeData) {
        // Find matching flow data for this node
        let matchingFlow = null;
        let rowIndex = -1;
        
        // Try to find the corresponding flow data
        if (typeof flowData !== 'undefined' && flowData && flowData.flows) {
            // Try multiple matching strategies
            matchingFlow = flowData.flows.find(flow => 
                flow.target === nodeData.id || 
                flow.source === nodeData.id ||
                flow.target === nodeData.name || 
                flow.source === nodeData.name
            );
            
            if (matchingFlow) {
                rowIndex = flowData.flows.indexOf(matchingFlow);
            }
        }
        
        // Target categories array (copied from chart.html)
        const targetCategories = ['revenue', 'expense', 'profit'];
        
        // Add toggle section
        const toggleSection = container
            .append('div')
            .style('margin-top', '12px')
            .style('margin-bottom', '12px')
            .style('padding', '12px')
            .style('background', '#f8f9fa')
            .style('border-radius', '8px')
            .style('border', '1px solid #e9ecef');
            
        // Section title
        toggleSection
            .append('div')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .style('color', '#374151')
            .style('margin-bottom', '8px')
            .text('Target Category');
        
        // Get current category and determine button appearance
        const currentCategory = matchingFlow ? matchingFlow.targetCategory : null;
        let buttonText = '🔄';
        let buttonTitle = 'Click to set Target Category';
        
        if (currentCategory && targetCategories.includes(currentCategory)) {
            switch (currentCategory) {
                case 'revenue':
                    buttonText = '💰';
                    buttonTitle = 'Target: Revenue (click to change to Expense)';
                    break;
                case 'expense':
                    buttonText = '💸';
                    buttonTitle = 'Target: Expense (click to change to Profit)';
                    break;
                case 'profit':
                    buttonText = '📈';
                    buttonTitle = 'Target: Profit (click to change to Revenue)';
                    break;
            }
        }
        
        // Create cycling button
        const cyclingButton = toggleSection
            .append('button')
            .attr('class', 'cycling-category-btn')
            .style('width', '100%')
            .style('padding', '8px')
            .style('background', '#6366f1')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '6px')
            .style('cursor', 'pointer')
            .style('font-size', '16px')
            .style('font-weight', '600')
            .style('transition', 'all 0.2s ease')
            .text(buttonText)
            .attr('title', buttonTitle)
            .on('mouseover', function() {
                d3.select(this).style('background', '#4f46e5');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', '#6366f1');
            })
            .on('click', () => {
                if (matchingFlow && rowIndex !== -1) {
                    this.cycleTargetCategoryForNode(rowIndex, matchingFlow);
                }
            });
        
        // Add current category class for styling
        if (currentCategory && targetCategories.includes(currentCategory)) {
            cyclingButton.classed(currentCategory, true);
        }
    }
    
    cycleTargetCategoryForNode(rowIndex, flow) {
        // Target categories array (copied from chart.html)
        const targetCategories = ['revenue', 'expense', 'profit'];
        
        // Get current category index
        let currentIndex = targetCategories.indexOf(flow.targetCategory);
        if (currentIndex === -1) currentIndex = -1; // Start before first category
        
        // Cycle to next category
        const nextIndex = (currentIndex + 1) % targetCategories.length;
        const newCategory = targetCategories[nextIndex];
        
        // Update the flow's target category
        flow.targetCategory = newCategory;
        
        // Update the Target Category cell in the spreadsheet (if it exists)
        this.updateTargetCategoryCell(rowIndex, newCategory);
        
        // Trigger the same updates as the original function
        if (typeof autoCalculateFlowProperties !== 'undefined') {
            autoCalculateFlowProperties();
        }
        if (typeof updateAllStats !== 'undefined') {
            updateAllStats();
        }
        if (typeof refreshChart !== 'undefined') {
            refreshChart();
        }
        
        // Update the button appearance without closing the modal
        this.updateCyclingButtonAppearance(newCategory);
        
    }
    
    updateCyclingButtonAppearance(newCategory) {
        // Find the cycling button in the current modal and update its appearance
        const cyclingButton = this.container.select('.enhanced-color-picker .cycling-category-btn');
        if (!cyclingButton.empty()) {
            const targetCategories = ['revenue', 'expense', 'profit'];
            
            // Update button text and title
            let buttonText = '🔄';
            let buttonTitle = 'Click to set Target Category';
            
            if (newCategory && targetCategories.includes(newCategory)) {
                switch (newCategory) {
                    case 'revenue':
                        buttonText = '💰';
                        buttonTitle = 'Target: Revenue (click to change to Expense)';
                        break;
                    case 'expense':
                        buttonText = '💸';
                        buttonTitle = 'Target: Expense (click to change to Profit)';
                        break;
                    case 'profit':
                        buttonText = '📈';
                        buttonTitle = 'Target: Profit (click to change to Revenue)';
                        break;
                }
            }
            
            // Update button appearance
            cyclingButton
                .text(buttonText)
                .attr('title', buttonTitle);
                
            // Update category classes
            cyclingButton
                .classed('revenue', newCategory === 'revenue')
                .classed('expense', newCategory === 'expense')
                .classed('profit', newCategory === 'profit');
        }
    }
    
    updateTargetCategoryCell(rowIndex, category) {
        // Update the Target Category cell in the spreadsheet (copied from chart.html)
        const cell = document.querySelector(`td[data-col="targetCategory"][data-row="${rowIndex}"] .cell-content`);
        if (cell) {
            const categoryName = category.charAt(0).toUpperCase() + category.slice(1);
            cell.textContent = categoryName;
        }
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
    
    // ===== NODE DRAG SYSTEM =====
    
    handleStandardDrag(event, draggedNode, element) {
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
        
        // Only move immediate children (next depth level)
        if (!parentNode.sourceLinks || parentNode.sourceLinks.length === 0) {
            return;
        }
        
        let childrenMoved = false;
        
        parentNode.sourceLinks.forEach(link => {
            const childNode = link.target;
            
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
    
    hideDragHint() {
        this.container.select('.drag-hint').remove();
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
    

    /**
     * Highlight nodes by category
     * @param {string} category - Category to highlight ('off', 'profit', 'revenue', 'expense')
     */
    highlightNodesByCategory(category) {
        if (!this.chart) {
            console.warn('⚠️ Chart not initialized for highlighting');
            return;
        }

        
        if (category === 'off') {
            // Reset all nodes to normal opacity
            this.chart.selectAll('.sankey-node rect')
                .transition()
                .duration(300)
                .attr('fill-opacity', this.config.nodeOpacity)
                .style('stroke-width', '2px')
                .style('stroke', 'white');
            
            // Reset all links to normal opacity
            this.chart.selectAll('.sankey-link path')
                .transition()
                .duration(300)
                .attr('fill-opacity', this.config.linkOpacity);
                
            // Reset all labels to normal opacity
            this.chart.selectAll('.node-text-group')
                .transition()
                .duration(300)
                .style('opacity', 1);
        } else {
            // Dim all nodes first
            this.chart.selectAll('.sankey-node rect')
                .transition()
                .duration(300)
                .attr('fill-opacity', 0.2)
                .style('stroke-width', '1px')
                .style('stroke', '#e5e7eb');
            
            // Dim all links
            this.chart.selectAll('.sankey-link path')
                .transition()
                .duration(300)
                .attr('fill-opacity', 0.1);
                
            // Dim all labels
            this.chart.selectAll('.node-text-group')
                .transition()
                .duration(300)
                .style('opacity', 0.3);
            
            // Highlight matching nodes
            this.chart.selectAll('.sankey-node rect')
                .filter(function(d) {
                    return d.category === category;
                })
                .transition()
                .duration(300)
                .attr('fill-opacity', 1)
                .style('stroke-width', '3px')
                .style('stroke', function() {
                    if (category === 'profit') return '#059669';
                    if (category === 'revenue') return '#1e40af';
                    if (category === 'expense') return '#dc2626';
                    return 'white';
                });
            
            // Highlight matching labels
            this.chart.selectAll('.node-text-group')
                .filter(function(d) {
                    return d.category === category;
                })
                .transition()
                .duration(300)
                .style('opacity', 1);
            
            // Highlight related links
            this.chart.selectAll('.sankey-link path')
                .filter(function(d) {
                    return d.source.category === category || d.target.category === category;
                })
                .transition()
                .duration(300)
                .attr('fill-opacity', this.config.linkOpacity);
        }
    }

    // Node highlighting by target category for cycling toggle button
    highlightNodesByCategory(targetCategory) {
        if (!this.chart) return;

        if (targetCategory === null || targetCategory === undefined) {
            // Reset all to normal appearance
            this.chart.selectAll('.sankey-node rect')
                .transition()
                .duration(300)
                .style('opacity', 1)
                .style('stroke', null)
                .style('stroke-width', null);

            this.chart.selectAll('.sankey-link path')
                .transition()
                .duration(300)
                .style('opacity', this.config.linkOpacity);

            this.chart.selectAll('.node-label')
                .transition()
                .duration(300)
                .style('opacity', 1);

            return;
        }

        // Get nodes that match the target category from data
        const matchingNodes = new Set();
        const matchingLinks = new Set();
        
        if (this.data && this.data.links) {
            this.data.links.forEach(link => {
                // Check if this link connects to a node with the target category
                if (link.targetCategory === targetCategory) {
                    matchingNodes.add(link.target.id || link.target);
                    matchingLinks.add(link);
                    // Also include source nodes that connect to these targets
                    matchingNodes.add(link.source.id || link.source);
                }
            });
        }

        // Highlight matching nodes
        this.chart.selectAll('.sankey-node rect')
            .transition()
            .duration(300)
            .style('opacity', d => {
                const nodeId = d.id || d.name;
                return matchingNodes.has(nodeId) ? 1 : 0.2;
            })
            .style('stroke', d => {
                const nodeId = d.id || d.name;
                if (matchingNodes.has(nodeId)) {
                    switch (targetCategory) {
                        case 'profit': return '#059669'; // Green
                        case 'revenue': return '#1e40af'; // Blue
                        case 'expense': return '#dc2626'; // Red
                        default: return '#6366f1'; // Default blue
                    }
                }
                return null;
            })
            .style('stroke-width', d => {
                const nodeId = d.id || d.name;
                return matchingNodes.has(nodeId) ? '3px' : null;
            });

        // Dim non-matching links and highlight matching ones
        this.chart.selectAll('.sankey-link path')
            .transition()
            .duration(300)
            .style('opacity', d => {
                return matchingLinks.has(d) ? this.config.linkOpacity : 0.1;
            });

        // Dim non-matching labels
        this.chart.selectAll('.node-label')
            .transition()
            .duration(300)
            .style('opacity', d => {
                const nodeId = d.id || d.name;
                return matchingNodes.has(nodeId) ? 1 : 0.3;
            });

    }

    // Highlight specific nodes and links (for individual row highlighting)
    highlightSpecificElements(nodeIds, linkIds) {
        if (!this.chart) return;

        if (nodeIds.size === 0) {
            // Reset all to normal appearance
            this.chart.selectAll('.sankey-node rect')
                .transition()
                .duration(300)
                .style('opacity', 1)
                .style('stroke', null)
                .style('stroke-width', null);

            this.chart.selectAll('.sankey-link path')
                .transition()
                .duration(300)
                .style('opacity', this.config.linkOpacity);

            this.chart.selectAll('.node-label')
                .transition()
                .duration(300)
                .style('opacity', 1);

            return;
        }

        // Highlight specific nodes
        this.chart.selectAll('.sankey-node rect')
            .transition()
            .duration(300)
            .style('opacity', d => {
                const nodeId = d.id || d.name;
                return nodeIds.has(nodeId) ? 1 : 0.3;
            })
            .style('stroke', d => {
                const nodeId = d.id || d.name;
                return nodeIds.has(nodeId) ? '#fbbf24' : null; // Yellow
            })
            .style('stroke-width', d => {
                const nodeId = d.id || d.name;
                return nodeIds.has(nodeId) ? '3px' : null;
            });

        // Highlight specific links
        this.chart.selectAll('.sankey-link path')
            .transition()
            .duration(300)
            .style('opacity', d => {
                const linkId = `${d.source.name || d.source.id}-${d.target.name || d.target.id}`;
                return linkIds.has(linkId) ? this.config.linkOpacity : 0.1;
            })
            .style('stroke', d => {
                const linkId = `${d.source.name || d.source.id}-${d.target.name || d.target.id}`;
                return linkIds.has(linkId) ? '#fbbf24' : null; // Yellow
            });

        // Highlight specific labels
        this.chart.selectAll('.node-label')
            .transition()
            .duration(300)
            .style('opacity', d => {
                const nodeId = d.id || d.name;
                return nodeIds.has(nodeId) ? 1 : 0.3;
            });

    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PulseSankeyChart;
}