/* ===== PULSE SANKEY CHART - GENERIC CATEGORY-BASED SYSTEM ===== */
/* Generic category management with no special revenue handling */
/* Enhanced with BaseChart state persistence foundation */

class PulseSankeyChart extends BaseChart {
    constructor(containerId) {
        // Call BaseChart constructor for unified state persistence
        super(containerId);
        
        // Sankey-specific properties
        this.tooltip = null;
        this.nodes = [];
        this.links = [];
        
        // Color picker state
        this.isColorPickerActive = false;
        this.selectedElement = null;
        
        // Balance sheet specific properties
        this.statementType = 'income';
        this.colorGroups = new Map();
        
        // Title rendering optimization flag
        this.brandingNeedsUpdate = true;
        
        // Enhanced Category Management System
        this.categoryManager = {
            userCategories: new Map(),     // Custom user-defined categories
            nodeCategories: new Map(),     // Node ID -> category assignments
            defaultCategories: {           // Built-in categories with enhanced metadata
                revenue: { color: '#1e40af', icon: '💰', description: 'Revenue and income flows' },
                expense: { color: '#dc2626', icon: '💸', description: 'Operating expenses' },
                profit: { color: '#059669', icon: '📈', description: 'Profit and margin nodes' },
                asset: { color: '#7c3aed', icon: '🏦', description: 'Assets and resources' },
                liability: { color: '#f59e0b', icon: '⚖️', description: 'Liabilities and obligations' }
            },
            positioningPreferences: {
                hubCategories: new Set(),               // No special hub categories
                layerPreferences: new Map(),            // Category -> preferred layer
                groupingRules: new Map()                // Category -> grouping behavior
            }
        };
        
        // Category operations
        this.copiedCategory = null;
        
        // Multi-node selection system
        this.selectionManager = {
            selectedNodes: new Set(),
            selectionMode: false,
            lastSelected: null,
            selectionBox: null
        };
        
        // Initialize Sankey-specific configuration
        this.config = SankeyChartConfig.getInitialConfig();
        this.initializeChart();
        this.initializeInteractiveMode();
        this.initializeKeyboardShortcuts();
    }

    /**
     * Initialize comprehensive state persistence system
     */




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

    // Parse number with support for comma-separated thousands (e.g., "57,405")
    parseNumber(value) {
        // Use the centralized robust number parser
        if (window.robustParseNumber) {
            return window.robustParseNumber(value);
        }
        
        // Fallback to original logic if robust parser not available
        if (value === null || value === undefined || value === '') {
            return 0;
        }
        
        let cleanValue = String(value).trim();
        
        // Remove currency symbols
        cleanValue = cleanValue.replace(/[$€£¥₹₽₿₩₽₴₸₺₼₾₨₦₡₱₪₡]/g, '');
        
        // Handle percentage
        if (cleanValue.endsWith('%')) {
            cleanValue = cleanValue.slice(0, -1);
            const num = parseFloat(cleanValue);
            return isNaN(num) ? 0 : Math.trunc(num / 100);
        }
        
        // Handle parentheses as negative
        if (cleanValue.startsWith('(') && cleanValue.endsWith(')')) {
            cleanValue = '-' + cleanValue.slice(1, -1);
        }
        
        // Handle thousands separators
        if (cleanValue.includes(',')) {
            // Standard format: 1,234,567 or flexible: 57,405
            const standardThousandsRegex = /^-?\d{1,3}(,\d{3})*(\.\d+)?$/;
            const flexibleCommaRegex = /^-?\d+(,\d+)*(\.\d+)?$/;
            
            if (standardThousandsRegex.test(cleanValue) || flexibleCommaRegex.test(cleanValue)) {
                cleanValue = cleanValue.replace(/,/g, '');
            }
            // European style (1.234.567,50)
            else {
                const europeanRegex = /^-?\d{1,3}(\.\d{3})*(,\d+)?$/;
                if (europeanRegex.test(cleanValue)) {
                    cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
                } else {
                    // Fallback: just remove commas
                    cleanValue = cleanValue.replace(/,/g, '');
                }
            }
        }
        
        const num = parseFloat(cleanValue);
        return isNaN(num) ? 0 : Math.trunc(num);
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
                
                
                // Recalculate affected node values to maintain consistency
                this.recalculateAffectedNodeValues(updatedFlow.source, updatedFlow.target, originalSourceId, originalTargetId);
                
                // Re-render the chart with updated data first
                this.render(this.data);
                
                // CRITICAL: Update PulseDataBridge with the latest data first
                if (window.PulseDataBridge) {
                    if (typeof window.PulseDataBridge.setData === 'function') {
                        window.PulseDataBridge.setData(this.data, 'chart-edit');
                    } else if (typeof window.PulseDataBridge.notifyDataChange === 'function') {
                        window.PulseDataBridge.notifyDataChange(this.data, 'chart-edit');
                    }
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
                    
                    // Update metadata and stats but don't render table here to avoid conflicts
                    if (typeof window.updateMetadataInputs === 'function') {
                        window.updateMetadataInputs();
                    }
                    if (typeof window.updateAllStats === 'function') {
                        window.updateAllStats();
                    }
                    
                    // Mark that we've updated the data - table update will be handled by resetTableFromModal
                } else {
                    console.warn('⚠️ Could not execute reset sequence - missing functions');
                }
            } else {
                console.warn('⚠️ Original link not found in data');
            }
        }
    }

    /**
     * Recalculate node values based on connected links to maintain consistency
     * @param {string} newSourceId - The new source node ID
     * @param {string} newTargetId - The new target node ID  
     * @param {string} originalSourceId - The original source node ID
     * @param {string} originalTargetId - The original target node ID
     */
    recalculateAffectedNodeValues(newSourceId, newTargetId, originalSourceId, originalTargetId) {
        if (!this.data || !this.data.nodes || !this.data.links) return;
        
        // Create a set of all affected node IDs
        const affectedNodeIds = new Set([newSourceId, newTargetId]);
        if (originalSourceId && originalSourceId !== newSourceId) {
            affectedNodeIds.add(originalSourceId);
        }
        if (originalTargetId && originalTargetId !== newTargetId) {
            affectedNodeIds.add(originalTargetId);
        }
        
        // Recalculate values for all affected nodes
        affectedNodeIds.forEach(nodeId => {
            const node = this.data.nodes.find(n => n.id === nodeId);
            if (!node) return;
            
            // Calculate incoming link totals (determines node value for target nodes)
            const incomingLinks = this.data.links.filter(link => {
                const linkTargetId = link.target && link.target.id ? link.target.id : link.target;
                return linkTargetId === nodeId;
            });
            
            // Calculate outgoing link totals (determines node value for source nodes)
            const outgoingLinks = this.data.links.filter(link => {
                const linkSourceId = link.source && link.source.id ? link.source.id : link.source;
                return linkSourceId === nodeId;
            });
            
            // For target nodes, use incoming links; for source nodes, use outgoing links
            // If both exist, use the maximum (some nodes are both source and target)
            const incomingTotal = incomingLinks.reduce((sum, link) => sum + Math.abs(link.value || 0), 0);
            const outgoingTotal = outgoingLinks.reduce((sum, link) => sum + Math.abs(link.value || 0), 0);
            const incomingPrevious = incomingLinks.reduce((sum, link) => sum + Math.abs(link.previousValue || 0), 0);
            const outgoingPrevious = outgoingLinks.reduce((sum, link) => sum + Math.abs(link.previousValue || 0), 0);
            
            // Use the larger of incoming or outgoing totals (for nodes that are both source and target)
            node.value = Math.max(incomingTotal, outgoingTotal);
            node.previousValue = Math.max(incomingPrevious, outgoingPrevious);
            
        });
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
                // Delete the target if it becomes orphaned
                
                let nodeToDelete = null;
                
                // Default: delete the target node of the link
                nodeToDelete = linkTargetId;
                
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

    // Removed automatic node value calculation - all values preserved as-is
    recalculateNodeValues() {
        // No automatic calculation - all node values are preserved from original data
        return;
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
            .attr('data-editable', 'true')
            .style('cursor', 'pointer')
            .style('transition', 'fill 0.2s ease')
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
            this.svg.selectAll('.main-chart-title').style('font-family', fontFamily);
        }
    }

    updateTitleColorFallback(color) {
        console.warn('⚠️ Using fallback title color update');
        this.config.titleColor = color;
        if (this.svg) {
            this.svg.selectAll('.main-chart-title').style('fill', color);
        }
    }

    updateTitleSizeFallback(size) {
        console.warn('⚠️ Using fallback title size update');
        this.config.titleSize = size;
        if (this.svg) {
            this.svg.selectAll('.main-chart-title').style('font-size', size + 'px');
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
        
        // Category-based color assignment
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
        
        // Category-based link color assignment
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
        
        this.rerenderWithNewColors();
    }

    render(data) {
        // Check if this is new data (requires branding update) or just a re-render
        const isNewData = !this.data || JSON.stringify(this.data) !== JSON.stringify(data);
        if (isNewData) {
            this.brandingNeedsUpdate = true;
        }
        
        this.data = data;
        
        // Load categories from metadata and migrate legacy categories
        this.loadCategoriesFromMetadata();
        this.migrateLegacyCategories();
        
        // PHASE 2: Revenue hub migration logic removed - all nodes treated equally
        
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
        
        // Revenue hub detection removed - using category-based system
        
        this.calculateLayout();  // Layout first
        
        // PHASE 2: Apply category-based positioning (replaces revenue hub detection)
        this.positionNodesByCategory();
        
        // Use FinancialDataProcessor for financial metrics
        if (window.FinancialDataProcessor) {
            FinancialDataProcessor.calculateFinancialMetrics(this.nodes, this.formatCurrency.bind(this));
        } else {
            console.warn('⚠️ FinancialDataProcessor not available, using fallback metrics calculation');
            this.calculateFinancialMetricsFallback();
        }
        
        this.chart.selectAll('*').remove();
        
        // Only re-initialize title and footnotes if title doesn't exist or data changed significantly
        const existingTitle = this.svg.select('.chart-header text');
        if (existingTitle.empty() || this.brandingNeedsUpdate) {
            this.svg.selectAll('.chart-header, .chart-footnotes').remove();
            // Initialize title and footnotes only
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
            this.brandingNeedsUpdate = false;
        }
        
        // ALWAYS ensure branding footer and logo are present - force render every time
        this.svg.selectAll('.chart-branding, .chart-brand-logo').remove();
        
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
        
        // Ensure chart fits within fixed container dimensions
        this.ensureChartFitsContainer();
        
        return this;
    }

    // Ensure chart content fits within fixed container dimensions
    ensureChartFitsContainer() {
        try {
            // Keep container dimensions fixed - no dynamic resizing
            const availableHeight = this.config.height - this.config.margin.top - this.config.margin.bottom;
            
            // Check if nodes extend beyond container
            if (this.nodes && this.nodes.length > 0) {
                const maxNodeY = Math.max(...this.nodes.map(n => n.y + (n.height || 0)));
                
                // If content exceeds container, scale down node heights proportionally
                if (maxNodeY > availableHeight) {
                    const scaleFactor = availableHeight / (maxNodeY + 50); // 50px buffer
                    
                    // Apply scaling to all nodes
                    this.nodes.forEach(node => {
                        node.y *= scaleFactor;
                        node.height *= scaleFactor;
                    });
                    
                    // Re-render nodes and links with new dimensions
                    this.renderNodes();
                    this.renderLinks();
                    this.renderLabels();
                }
            }
            
            // Ensure SVG maintains fixed dimensions
            this.svg
                .attr('width', this.config.width)
                .attr('height', this.config.height)
                .attr('viewBox', `0 0 ${this.config.width} ${this.config.height}`);
                
        } catch (error) {
            console.warn('⚠️ Error ensuring chart fits container:', error);
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




    detectAndApplyColors(data) {
        // Removed revenue segment color handling - using generic category system

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

        const values = data.nodes.map(node => Math.abs(node.value || 0)).filter(v => v > 0);
        if (values.length === 0) return;

        const maxValue = Math.max(...values);
        const availableHeight = this.config.height - this.config.margin.top - this.config.margin.bottom - 100; // 100px buffer
        
        // Smart scaling: aim for the largest node to be ~20% of available height
        const targetMaxNodeHeight = availableHeight * 0.2;
        const optimalScale = targetMaxNodeHeight / maxValue;
        
        // Clamp the scale to reasonable bounds
        const clampedScale = Math.max(0.001, Math.min(1.0, optimalScale));
        
        // Only auto-scale if user hasn't manually adjusted nodeHeightScale
        const defaultScales = [0.65, 0.05, 0.01, 0.00008, 0.00000008, 0.0002, 0.15];
        const isDefaultScale = defaultScales.some(scale => Math.abs(this.config.nodeHeightScale - scale) < 0.0001);
        
        if (isDefaultScale) {
            this.config.nodeHeightScale = clampedScale;
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

        // PRESERVE POSITIONS: Save current positions OR restore from saved state before layout recalculation
        const preservedPositions = new Map();
        if (this.nodes) {
            this.nodes.forEach(node => {
                // Check if we have saved positions for this node from state restoration
                const savedPos = this.statePersistence.nodePositions.get(node.id);
                const savedManual = this.statePersistence.manualPositions.get(node.id);
                
                if (savedPos && savedManual) {
                    // Use saved positions if available (from chart loading)
                    preservedPositions.set(node.id, {
                        x: savedPos.x,
                        y: savedPos.y,
                        manuallyPositioned: true,
                        manualY: savedPos.y
                    });
                } else {
                    // Use current node positions (for normal operation)
                    preservedPositions.set(node.id, {
                        x: node.x,
                        y: node.y,
                        manuallyPositioned: node.manuallyPositioned || false,
                        manualY: node.manualY
                    });
                }
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
            const preserved = preservedPositions.get(node.id);
            
            if (preserved && preserved.manuallyPositioned && typeof preserved.x === 'number' && !isNaN(preserved.x)) {
                // Restore X position for manually positioned nodes
                node.x = preserved.x;
            } else {
                // Use calculated position for non-manually positioned nodes
                const calculatedX = xScale(node.depth);
                node.x = calculatedX;
            }
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
            if (preserved && preserved.manuallyPositioned && typeof preserved.y === 'number' && !isNaN(preserved.y)) {
                // Restore Y position (preserve user's positioning)
                node.y = preserved.y;
                node.manualY = preserved.y;
                node.manuallyPositioned = true;
                // Save to metadata for persistence
                this.saveManualPositionToMetadata(node);
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

    preserveManualPositions() {
        if (!this.nodes) return;
        
        this.nodes.forEach(node => {
            if (node.manuallyPositioned && node.manualY !== null && !isNaN(node.manualY)) {
                // Ensure the manual position is applied immediately
                node.y = node.manualY;
                // Ensure the flag is preserved
                node.manuallyPositioned = true;
            }
        });
    }

    positionNodesAtDepth(nodes, availableHeight, maxDepth) {
        // PHASE 2: Apply category-based positioning metadata to nodes
        // (this is called during layout after positionNodesByCategory() in render())
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

        // Use the nodes directly since category positioning is already applied
        if ((isLeftmost || isRightmost) && nodes.length > 1) {
            this.positionNodesWithGroupSpacing(nodes, availableHeight, layerPadding, isLeftmost, isRightmost);
        } else {
            this.positionNodesStandard(nodes, availableHeight, layerPadding);
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


    /**
     * Group nodes by their assigned categories
     * @param {Array} nodes - Array of nodes to group
     * @returns {Map} - Map of category name to array of nodes
     */
    groupNodesByCategory(nodes) {
        const categoryGroups = new Map();
        
        nodes.forEach(node => {
            const category = this.getCategoryForNode(node.id) || 'uncategorized';
            
            if (!categoryGroups.has(category)) {
                categoryGroups.set(category, []);
            }
            categoryGroups.get(category).push(node);
        });
        
        return categoryGroups;
    }

    /**
     * Get user-defined hub categories - categories that should act as "hubs" in positioning
     * These categories will be positioned prominently in the flow
     * @returns {Array} - Array of category names that act as hubs
     */
    // Removed getUserDefinedHubs function - no longer supporting hub categories

    /**
     * PHASE 2: Enhanced category logic and positioning preferences
     * Allow users to set positioning preferences for categories
     */
    setCategoryPositioningPreference(categoryName, preference) {
        if (!this.data.metadata) {
            this.data.metadata = {};
        }
        if (!this.data.metadata.categoryPositioning) {
            this.data.metadata.categoryPositioning = {};
        }
        
        // Validate preference
        const validPreferences = ['hub', 'top', 'center', 'bottom', 'auto'];
        if (!validPreferences.includes(preference)) {
            console.warn(`⚠️ Invalid positioning preference: ${preference}. Valid options: ${validPreferences.join(', ')}`);
            return false;
        }
        
        this.data.metadata.categoryPositioning[categoryName] = preference;
        return true;
    }

    /**
     * Get positioning preference for a category
     * @param {string} categoryName - Name of the category
     * @returns {string} - Positioning preference ('hub', 'top', 'center', 'bottom', 'auto')
     */
    getCategoryPositioningPreference(categoryName) {
        if (this.data?.metadata?.categoryPositioning) {
            return this.data.metadata.categoryPositioning[categoryName] || 'auto';
        }
        return 'auto';
    }


    /**
     * Add category management controls to the control panel
     * @param {HTMLElement} container - Container for controls
     */
    addCategoryManagementControls(container) {
        const categorySection = document.createElement('div');
        categorySection.className = 'category-management-section';
        categorySection.innerHTML = `
            <h4>Category Management</h4>
            <div class="category-positioning-controls">
                <label>Hub Categories:</label>
                <div class="hub-categories-list" id="hubCategoriesList"></div>
                <button id="addHubCategoryBtn">Add Hub Category</button>
            </div>
            <div class="category-positioning-prefs">
                <label>Positioning Preferences:</label>
                <div class="positioning-prefs-list" id="positioningPrefsList"></div>
            </div>
        `;
        
        container.appendChild(categorySection);
        
        // Initialize controls
        this.initializeCategoryManagementControls();
    }

    /**
     * Initialize category management controls
     */
    initializeCategoryManagementControls() {
        const hubCategoriesList = document.getElementById('hubCategoriesList');
        const addHubCategoryBtn = document.getElementById('addHubCategoryBtn');
        const positioningPrefsList = document.getElementById('positioningPrefsList');
        
        if (!hubCategoriesList || !addHubCategoryBtn || !positioningPrefsList) {
            console.warn('⚠️ Category management controls not found');
            return;
        }
        
        // Removed hub categories list management
        
        // Update positioning preferences list
        const updatePositioningPrefsList = () => {
            const allCategories = this.getAllCategories();
            positioningPrefsList.innerHTML = Object.keys(allCategories).map(categoryName => `
                <div class="positioning-pref-item">
                    <span>${categoryName}:</span>
                    <select onchange="this.setCategoryPositioningPreference('${categoryName}', this.value)">
                        <option value="auto" ${this.getCategoryPositioningPreference(categoryName) === 'auto' ? 'selected' : ''}>Auto</option>
                        <option value="top" ${this.getCategoryPositioningPreference(categoryName) === 'top' ? 'selected' : ''}>Top</option>
                        <option value="center" ${this.getCategoryPositioningPreference(categoryName) === 'center' ? 'selected' : ''}>Center</option>
                        <option value="bottom" ${this.getCategoryPositioningPreference(categoryName) === 'bottom' ? 'selected' : ''}>Bottom</option>
                    </select>
                </div>
            `).join('');
        };
        
        // Initialize lists
        updateHubCategoriesList();
        updatePositioningPrefsList();
        
        // Add event listeners
        addHubCategoryBtn.addEventListener('click', () => {
            const category = prompt('Enter category name to add as hub:');
            if (category && this.getAllCategories()[category]) {
                this.addHubCategory(category);
                updateHubCategoriesList();
                this.render(this.data); // Re-render with new hub
            }
        });
    }

    // Removed old hub category management functions









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

        // Properly handle enter/update/exit pattern for links
        const linkSelection = this.chart.selectAll('.sankey-link')
            .data(this.links);

        // Remove old links
        linkSelection.exit().remove();

        // Create new link groups
        const linkGroups = linkSelection.enter()
            .append('g')
            .attr('class', 'sankey-link');

        // Append paths to new groups
        linkGroups.append('path')
            .style('cursor', 'pointer')
            .style('transition', 'all 0.2s ease');

        // Update all links (both new and existing)
        const allLinkPaths = this.chart.selectAll('.sankey-link path');
        
        allLinkPaths
            .attr('d', d => d.path)
            .attr('fill', d => this.getLinkColor(d))
            .attr('fill-opacity', d => this.statementType === 'balance' ? this.getLinkOpacity(d) : this.config.linkOpacity)
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
        // Proper enter/update/exit pattern to preserve existing nodes
        const nodeSelection = this.chart.selectAll('.sankey-node')
            .data(this.nodes);

        // Remove old nodes
        nodeSelection.exit().remove();

        // Create new node groups
        const nodeGroups = nodeSelection.enter()
            .append('g')
            .attr('class', 'sankey-node');

        // Ensure manual positions are preserved before updating transform
        this.nodes.forEach(node => {
            if (node.manuallyPositioned && node.manualY !== null) {
                node.y = node.manualY;
            }
        });

        // Update all nodes (both new and existing) with current positions
        this.chart.selectAll('.sankey-node')
            .attr('transform', d => `translate(${d.x}, ${d.y})`);

        // Only append rect to new nodes
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

        // Update all rectangles (both new and existing) with current properties
        this.chart.selectAll('.sankey-node rect')
            .attr('width', this.config.nodeWidth)
            .attr('height', d => d.height)
            .attr('fill', d => this.statementType === 'balance' ? this.getHierarchicalColor(d.id) : this.getNodeColor(d))
            .attr('fill-opacity', d => this.statementType === 'balance' ? this.getNodeOpacity(d) : this.config.nodeOpacity);

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
     * Get node color with generic category system
     */
    getNodeColor(node) {
        // PHASE 2: Enhanced color assignment with category-first logic
        
        // 1. Check for independent color first (highest priority for color-only mode)
        const independentColor = this.getIndependentNodeColor(node.id);
        if (independentColor) {
            return independentColor;
        }
        
        // 2. Check for node-specific custom color 
        if (node.customColor) {
            return node.customColor;
        }
        
        // 2. CATEGORY-FIRST LOGIC: Check for category assignment from new category system
        const assignedCategory = this.getCategoryForNode(node.id);
        if (assignedCategory) {
            const categories = this.getAllCategories();
            if (categories[assignedCategory]) {
                // Apply category-specific color enhancements
                return this.enhanceColorForCategory(categories[assignedCategory].color, assignedCategory, node);
            }
        }
        
        // 3. Category system fallback
        let effectiveCategory = node.category;
        if (node.category === 'tax') {
            effectiveCategory = 'expense';
        }
        
        if (this.customColors && this.customColors[effectiveCategory]) {
            return this.customColors[effectiveCategory];
        }
        
        // 6. Enhanced vibrant default colors
        const defaultColors = {
            revenue: '#1e40af',    // Deep vibrant blue
            profit: '#059669',     // Vibrant emerald green
            expense: '#dc2626'     // Sharp red
        };
        return defaultColors[node.category] || '#6b7280';
    }

    /**
     * PHASE 2: Enhance color based on category and node characteristics
     * @param {string} baseColor - Base color from category
     * @param {string} categoryName - Name of the category
     * @param {Object} node - Node object
     * @returns {string} - Enhanced color
     */
    enhanceColorForCategory(baseColor, categoryName, node) {
        // Check if this category has positioning preference that affects color
        const positioningPreference = this.getCategoryPositioningPreference(categoryName);
        
        // Hub categories get enhanced saturation
        // Removed hub category special handling - all categories treated equally
        
        // Top positioned categories get slightly lighter colors
        if (positioningPreference === 'top') {
            return this.lightenColor(baseColor, 10);
        }
        
        // Bottom positioned categories get slightly darker colors
        if (positioningPreference === 'bottom') {
            return this.darkenColor(baseColor, 10);
        }
        
        // Return base color for other categories
        return baseColor;
    }

    /**
     * Enhance color saturation
     * @param {string} color - Base color
     * @param {number} amount - Amount to enhance (0-100)
     * @returns {string} - Enhanced color
     */
    enhanceColorSaturation(color, amount) {
        // Convert hex to HSL, increase saturation, convert back
        const hsl = this.hexToHsl(color);
        hsl.s = Math.min(1, hsl.s + amount / 100);
        return this.hslToHex(hsl);
    }

    /**
     * Lighten color
     * @param {string} color - Base color
     * @param {number} amount - Amount to lighten (0-100)
     * @returns {string} - Lightened color
     */
    lightenColor(color, amount) {
        const hsl = this.hexToHsl(color);
        hsl.l = Math.min(1, hsl.l + amount / 100);
        return this.hslToHex(hsl);
    }

    /**
     * Darken color
     * @param {string} color - Base color
     * @param {number} amount - Amount to darken (0-100)
     * @returns {string} - Darkened color
     */
    darkenColor(color, amount) {
        const hsl = this.hexToHsl(color);
        hsl.l = Math.max(0, hsl.l - amount / 100);
        return this.hslToHex(hsl);
    }

    /**
     * Convert hex color to HSL
     * @param {string} hex - Hex color
     * @returns {Object} - HSL object {h, s, l}
     */
    hexToHsl(hex) {
        const r = parseInt(hex.substr(1, 2), 16) / 255;
        const g = parseInt(hex.substr(3, 2), 16) / 255;
        const b = parseInt(hex.substr(5, 2), 16) / 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        return {h, s, l};
    }

    /**
     * Convert HSL to hex color
     * @param {Object} hsl - HSL object {h, s, l}
     * @returns {string} - Hex color
     */
    hslToHex(hsl) {
        const {h, s, l} = hsl;
        
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        const toHex = (c) => {
            const hex = Math.round(c * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    /**
     * Get link color with generic category system
     */
    getLinkColor(link) {
        if (this.statementType === 'balance') {
            return this.getLinkColor_Balance(link);
        } else {
            return this.getLinkColor_Income(link);
        }
    }

    /**
     * Category-based link colors for income statements
     */
    getLinkColor_Income(link) {
        // Priority: independent colors > custom colors > category colors
        
        // Check for independent colors first (highest priority)
        if (link.independentColor) {
            return ChartUtils.lightenColor(link.independentColor, 15);
        }
        
        // Check for custom colors
        if (link.target.userCreated || link.target.customColor) {
            const targetColor = this.getNodeColor(link.target);
            return ChartUtils.lightenColor(targetColor, 15);
        }
        
        if (link.source.userCreated || link.source.customColor) {
            const sourceColor = this.getNodeColor(link.source);
            return ChartUtils.lightenColor(sourceColor, 15);
        }
        
        // Get current categories from the category manager (most up-to-date)
        const currentTargetCategory = this.getCategoryForNode(link.target.id);
        const currentSourceCategory = this.getCategoryForNode(link.source.id);
        
        // Use colorCategory from link metadata (set by updateLinkCategoriesForNode)
        // Then fallback to current categories, then node properties
        let effectiveCategory = link.colorCategory || 
                              currentTargetCategory || 
                              currentSourceCategory || 
                              link.targetCategory || 
                              link.sourceCategory || 
                              link.target.category || 
                              link.source.category;
        
        if (effectiveCategory === 'tax') {
            effectiveCategory = 'expense';
        }
        
        const categoryColor = this.getColorByCategory(effectiveCategory);
        return ChartUtils.lightenColor(categoryColor, 15);
    }

    getLinkColor_Balance(link) {
        // Priority: independent colors > custom colors > category colors
        
        // Check for independent colors first (highest priority)
        if (link.independentColor) {
            return ChartUtils.hexToRgba(link.independentColor, 0.65);
        }
        
        // Always prioritize target node color for consistency
        if (link.target.userCreated || link.target.customColor) {
            const targetColor = this.getNodeColor(link.target);
            return ChartUtils.hexToRgba(targetColor, 0.65);
        }
        
        if (link.source.userCreated || link.source.customColor) {
            const sourceColor = this.getNodeColor(link.source);
            return ChartUtils.hexToRgba(sourceColor, 0.65);
        }
        
        const sourceColorGroup = this.colorGroups.get(link.source.id);
        const targetColorGroup = this.colorGroups.get(link.target.id);
        
        const isFromTotalAssets = link.source.id.toLowerCase().includes('total assets');
        const isToTotalAssets = link.target.id.toLowerCase().includes('total assets');
        
        let baseColor = '#95a5a6';
        
        // Always prioritize target color group first
        if (targetColorGroup && targetColorGroup.baseColor) {
            baseColor = targetColorGroup.baseColor;
        } else if (sourceColorGroup && sourceColorGroup.baseColor) {
            baseColor = sourceColorGroup.baseColor;
        }
        
        // Special handling for total assets flows
        if (isToTotalAssets && sourceColorGroup && sourceColorGroup.baseColor) {
            baseColor = sourceColorGroup.baseColor;
        } else if (isFromTotalAssets && targetColorGroup && targetColorGroup.baseColor) {
            baseColor = targetColorGroup.baseColor;
        }
        
        if (isFromTotalAssets || isToTotalAssets) {
            return baseColor;
        } else {
            return ChartUtils.hexToRgba(baseColor, 0.65);
        }
    }

    getColorByCategory(category) {
        // First check customColors (for legacy compatibility)
        if (this.customColors && this.customColors[category]) {
            return this.customColors[category];
        }
        
        // Check user-created custom categories
        if (this.categoryManager && this.categoryManager.userCategories.has(category)) {
            return this.categoryManager.userCategories.get(category).color;
        }
        
        // Check default categories
        if (this.categoryManager && this.categoryManager.defaultCategories[category]) {
            return this.categoryManager.defaultCategories[category].color;
        }
        
        // Enhanced vibrant category colors (fallback)
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
     * Set custom colors with generic category system
     */
    setCustomColors(newColors) {
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
        
        this.rerenderWithNewColors();
    }

    // Removed setRevenueSegmentColor function - using generic category system

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


    // Category assignment modal with smart suggestions
    showCategoryAssignmentModal(node) {
        const categoryManager = this.categoryManager;
        const allCategories = new Map([...Object.entries(categoryManager.defaultCategories), ...categoryManager.userCategories]);
        
        // Get smart category suggestions
        const suggestions = this.suggestCategoryForNode(node.name);
        
        const modal = document.createElement('div');
        modal.className = 'category-assignment-modal';
        
        // Build category options
        let categoryOptions = '<option value="">Select a category...</option>';
        allCategories.forEach((data, name) => {
            const isSuggested = suggestions.includes(name);
            categoryOptions += `<option value="${name}" ${isSuggested ? 'class="suggested"' : ''}>${data.icon || '🏷️'} ${name}${isSuggested ? ' (suggested)' : ''}</option>`;
        });
        
        modal.innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Assign Category to "${node.name}"</h3>
                        <button class="close-modal" onclick="this.closest('.category-assignment-modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        ${suggestions.length > 0 ? `
                            <div class="suggestions-section">
                                <h4>Smart Suggestions:</h4>
                                <div class="suggestion-chips">
                                    ${suggestions.map(suggestion => {
                                        const categoryData = allCategories.get(suggestion);
                                        return `<button class="suggestion-chip" onclick="window.applySuggestedCategory('${suggestion}')">
                                            ${categoryData?.icon || '🏷️'} ${suggestion}
                                        </button>`;
                                    }).join('')}
                                </div>
                            </div>
                        ` : ''}
                        <div class="form-group">
                            <label>Category:</label>
                            <select id="nodeCategory">
                                ${categoryOptions}
                            </select>
                        </div>
                        <div class="node-info">
                            <strong>Node:</strong> ${node.name}<br>
                            <strong>Value:</strong> ${node.value || 'N/A'}<br>
                            <strong>Current Category:</strong> ${categoryManager.nodeCategories.get(node.id) || 'None'}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.category-assignment-modal').remove()">Cancel</button>
                        <button class="btn btn-primary" onclick="window.assignNodeCategory()">Assign Category</button>
                    </div>
                </div>
            </div>
            <style>
                .category-assignment-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 10000;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .modal-backdrop {
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .modal-content {
                    background: white;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 500px;
                    max-height: 90vh;
                    overflow-y: auto;
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px;
                    border-bottom: 1px solid #eee;
                }
                .modal-header h3 {
                    margin: 0;
                    color: #333;
                }
                .close-modal {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                }
                .modal-body {
                    padding: 20px;
                }
                .suggestions-section {
                    margin-bottom: 20px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 6px;
                }
                .suggestions-section h4 {
                    margin: 0 0 10px 0;
                    color: #333;
                    font-size: 14px;
                }
                .suggestion-chips {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .suggestion-chip {
                    background: #e3f2fd;
                    border: 1px solid #2196f3;
                    color: #1976d2;
                    padding: 6px 12px;
                    border-radius: 16px;
                    cursor: pointer;
                    font-size: 12px;
                    transition: all 0.2s;
                }
                .suggestion-chip:hover {
                    background: #2196f3;
                    color: white;
                }
                .form-group {
                    margin-bottom: 15px;
                }
                .form-group label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: 500;
                    color: #333;
                }
                .form-group select {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                }
                .form-group select option.suggested {
                    background: #e3f2fd;
                    color: #1976d2;
                }
                .node-info {
                    margin-top: 15px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 4px;
                    font-size: 14px;
                    color: #666;
                }
                .modal-footer {
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                    padding: 20px;
                    border-top: 1px solid #eee;
                }
                .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
                .btn-primary {
                    background: #007bff;
                    color: white;
                }
                .btn-secondary {
                    background: #6c757d;
                    color: white;
                }
            </style>
        `;
        
        document.body.appendChild(modal);
        
        // Set up global functions for modal actions
        window.assignNodeCategory = () => {
            const category = document.getElementById('nodeCategory').value;
            
            if (!category) {
                alert('Please select a category');
                return;
            }
            
            // Use proper method to assign category (this handles node properties and re-rendering)
            this.assignNodeToCategory(node.id, category);
            
            this.showNotification(`Assigned category "${category}" to ${node.name}`);
            modal.remove();
        };
        
        window.applySuggestedCategory = (category) => {
            document.getElementById('nodeCategory').value = category;
            window.assignNodeCategory();
        };
    }

    // Smart category suggestions based on node names
    suggestCategoryForNode(nodeName) {
        const suggestions = [];
        const nameLower = nodeName.toLowerCase();
        
        // Financial patterns
        if (nameLower.includes('revenue') || nameLower.includes('sales') || nameLower.includes('income')) {
            suggestions.push('revenue');
        }
        if (nameLower.includes('expense') || nameLower.includes('cost') || nameLower.includes('spending')) {
            suggestions.push('expense');
        }
        if (nameLower.includes('profit') || nameLower.includes('margin') || nameLower.includes('earnings')) {
            suggestions.push('profit');
        }
        if (nameLower.includes('asset') || nameLower.includes('property') || nameLower.includes('investment')) {
            suggestions.push('asset');
        }
        if (nameLower.includes('liability') || nameLower.includes('debt') || nameLower.includes('loan')) {
            suggestions.push('liability');
        }
        
        // Business operation patterns
        if (nameLower.includes('salary') || nameLower.includes('wage') || nameLower.includes('payroll')) {
            suggestions.push('expenses');
        }
        if (nameLower.includes('marketing') || nameLower.includes('advertising') || nameLower.includes('promotion')) {
            suggestions.push('marketing');
        }
        if (nameLower.includes('operations') || nameLower.includes('operational') || nameLower.includes('admin')) {
            suggestions.push('operations');
        }
        if (nameLower.includes('production') || nameLower.includes('manufacturing') || nameLower.includes('factory')) {
            suggestions.push('production');
        }
        if (nameLower.includes('support') || nameLower.includes('service') || nameLower.includes('help')) {
            suggestions.push('support');
        }
        
        // Remove duplicates and return
        return [...new Set(suggestions)];
    }

    // Copy node category
    copyNodeCategory(node) {
        const category = this.categoryManager.nodeCategories.get(node.id);
        if (category) {
            this.copiedCategory = category;
            this.showNotification(`Copied category "${category}" from ${node.name}`);
        } else {
            this.showNotification('No category to copy from this node');
        }
    }

    // Remove node category
    removeNodeCategory(node) {
        const category = this.categoryManager.nodeCategories.get(node.id);
        if (category) {
            // Use proper method to remove category (this handles node properties and re-rendering)
            this.removeNodeFromCategory(node.id);
            
            this.showNotification(`Removed category "${category}" from ${node.name}`);
        } else {
            this.showNotification('No category to remove from this node');
        }
    }

    // Show color picker for specific node
    showColorPickerForNode(node) {
        const currentColor = this.getNodeColor(node);
        // Find the node element in the DOM
        const nodeElement = this.svg.select(`#node-${node.id.replace(/\W/g, '_')}`);
        if (nodeElement.node()) {
            this.showColorPicker(nodeElement.node(), currentColor);
        }
    }

    // Reset node color
    resetNodeColor(node) {
        // Remove custom color
        delete this.customColors[node.id];
        this.showNotification(`Reset color for ${node.name}`);
        this.render(this.data); // Re-render to update colors
    }

    // Show node details modal
    showNodeDetailsModal(node) {
        // TODO: Implement node details modal
    }

    // Focus on node
    focusOnNode(node) {
        // TODO: Implement focus functionality (zoom, highlight, etc.)
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `pulse-notification pulse-notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            z-index: 10001;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
        `;
        
        // Add animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(notification);
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Multi-node selection methods
    handleNodeSelection(node, event) {
        if (event.ctrlKey || event.metaKey) {
            // Toggle selection with Ctrl/Cmd
            this.toggleNodeSelection(node);
        } else if (event.shiftKey) {
            // Range selection with Shift
            this.selectNodeRange(node);
        } else {
            // Single selection
            this.selectSingleNode(node);
        }
        
        // Update visual feedback
        this.updateNodeSelectionVisuals();
    }

    selectSingleNode(node) {
        // Clear previous selection
        this.selectionManager.selectedNodes.clear();
        
        // Select the node
        this.selectionManager.selectedNodes.add(node.id);
        this.selectionManager.lastSelected = node;
        
        // Default action for single selection (show category assignment modal)
        if (this.selectionManager.selectedNodes.size === 1) {
            new CategoryAssignmentModal(this, node);
        }
    }

    toggleNodeSelection(node) {
        if (this.selectionManager.selectedNodes.has(node.id)) {
            this.selectionManager.selectedNodes.delete(node.id);
        } else {
            this.selectionManager.selectedNodes.add(node.id);
        }
        
        this.selectionManager.lastSelected = node;
    }

    selectNodeRange(node) {
        if (!this.selectionManager.lastSelected) {
            // No previous selection, treat as single selection
            this.selectSingleNode(node);
            return;
        }
        
        // Find nodes between last selected and current node
        const lastSelectedNode = this.selectionManager.lastSelected;
        const currentNode = node;
        
        // Clear current selection
        this.selectionManager.selectedNodes.clear();
        
        // Find all nodes at the same depths or between depths
        const startDepth = Math.min(lastSelectedNode.depth, currentNode.depth);
        const endDepth = Math.max(lastSelectedNode.depth, currentNode.depth);
        
        // Select nodes within the range
        this.nodes.forEach(n => {
            if (n.depth >= startDepth && n.depth <= endDepth) {
                // For same depth, select nodes between y positions
                if (n.depth === lastSelectedNode.depth || n.depth === currentNode.depth) {
                    const minY = Math.min(lastSelectedNode.y, currentNode.y);
                    const maxY = Math.max(lastSelectedNode.y, currentNode.y);
                    
                    if (n.y >= minY && n.y <= maxY) {
                        this.selectionManager.selectedNodes.add(n.id);
                    }
                } else {
                    // Select all nodes at intermediate depths
                    this.selectionManager.selectedNodes.add(n.id);
                }
            }
        });
        
        this.selectionManager.lastSelected = node;
    }

    selectAllNodes() {
        this.selectionManager.selectedNodes.clear();
        this.nodes.forEach(node => {
            this.selectionManager.selectedNodes.add(node.id);
        });
        this.updateNodeSelectionVisuals();
        this.showNotification(`Selected ${this.selectionManager.selectedNodes.size} nodes`);
    }

    clearSelection() {
        this.selectionManager.selectedNodes.clear();
        this.selectionManager.lastSelected = null;
        this.updateNodeSelectionVisuals();
    }

    updateNodeSelectionVisuals() {
        // Update visual appearance of selected nodes
        this.chart.selectAll('.sankey-node rect')
            .style('stroke', (d) => {
                return this.selectionManager.selectedNodes.has(d.id) ? '#007bff' : 'none';
            })
            .style('stroke-width', (d) => {
                return this.selectionManager.selectedNodes.has(d.id) ? '2px' : '0px';
            })
            .style('filter', (d) => {
                return this.selectionManager.selectedNodes.has(d.id) ? 
                    'drop-shadow(0 0 8px rgba(0,123,255,0.5))' : 
                    'drop-shadow(0 2px 4px rgba(0,0,0,0.1))';
            });
    }

    getSelectedNodes() {
        return Array.from(this.selectionManager.selectedNodes)
            .map(id => this.nodes.find(n => n.id === id))
            .filter(node => node !== undefined);
    }

    assignCategoryToSelectedNodes(categoryName) {
        const selectedNodes = this.getSelectedNodes();
        
        if (selectedNodes.length === 0) {
            this.showNotification('No nodes selected', 'error');
            return;
        }
        
        // Apply category to all selected nodes
        selectedNodes.forEach(node => {
            this.assignNodeToCategory(node.id, categoryName);
        });
        
        this.showNotification(`Assigned category "${categoryName}" to ${selectedNodes.length} nodes`);
        this.rerenderWithNewColors(); // Re-render to update colors
    }

    openBulkCategoryAssignmentModal(selectedNodes) {
        // Get all available categories
        const categoryManager = this.categoryManager;
        const allCategories = new Map([...Object.entries(categoryManager.defaultCategories), ...categoryManager.userCategories]);
        
        const modal = document.createElement('div');
        modal.className = 'bulk-category-assignment-modal';
        
        // Build category options
        let categoryOptions = '<option value="">Select a category...</option>';
        allCategories.forEach((data, name) => {
            categoryOptions += `<option value="${name}">${data.icon || '🏷️'} ${name}</option>`;
        });
        
        modal.innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Assign Category to ${selectedNodes.length} Selected Nodes</h3>
                        <button class="close-modal" onclick="this.closest('.bulk-category-assignment-modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Category:</label>
                            <select id="selectedNodeCategory">
                                ${categoryOptions}
                            </select>
                        </div>
                        <div class="selected-nodes-preview">
                            <h4>Selected Nodes (${selectedNodes.length}):</h4>
                            <div class="node-list">
                                ${selectedNodes.slice(0, 10).map(node => `
                                    <div class="node-item">${node.name}</div>
                                `).join('')}
                                ${selectedNodes.length > 10 ? `<div class="node-item">... and ${selectedNodes.length - 10} more</div>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.bulk-category-assignment-modal').remove()">Cancel</button>
                        <button class="btn btn-primary" onclick="window.assignCategoryToSelectedNodes()">Assign Category</button>
                    </div>
                </div>
            </div>
            <style>
                .bulk-category-assignment-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 10000;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .modal-backdrop {
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .modal-content {
                    background: white;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 500px;
                    max-height: 90vh;
                    overflow-y: auto;
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px;
                    border-bottom: 1px solid #eee;
                }
                .modal-header h3 {
                    margin: 0;
                    color: #333;
                }
                .close-modal {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                }
                .modal-body {
                    padding: 20px;
                }
                .form-group {
                    margin-bottom: 15px;
                }
                .form-group label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: 500;
                    color: #333;
                }
                .form-group select {
                    width: 100%;
                    padding: 8px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                }
                .selected-nodes-preview {
                    margin-top: 15px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 4px;
                }
                .node-list {
                    max-height: 200px;
                    overflow-y: auto;
                    margin-top: 10px;
                }
                .node-item {
                    padding: 5px;
                    margin: 2px 0;
                    background: white;
                    border-radius: 3px;
                    border-left: 3px solid #007bff;
                }
                .modal-footer {
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                    padding: 20px;
                    border-top: 1px solid #eee;
                }
                .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
                .btn-primary {
                    background: #007bff;
                    color: white;
                }
                .btn-secondary {
                    background: #6c757d;
                    color: white;
                }
            </style>
        `;
        
        document.body.appendChild(modal);
        
        // Set up global function for assignment
        window.assignCategoryToSelectedNodes = () => {
            const category = document.getElementById('selectedNodeCategory').value;
            
            if (!category) {
                alert('Please select a category');
                return;
            }
            
            this.assignCategoryToSelectedNodes(category);
            modal.remove();
        };
    }

    applyCategoryToSelectedNodes(categoryName) {
        const selectedNodes = this.getSelectedNodes();
        
        if (selectedNodes.length === 0) {
            this.showNotification('No nodes selected', 'error');
            return;
        }
        
        // Apply category to all selected nodes
        selectedNodes.forEach(node => {
            this.assignNodeToCategory(node.id, categoryName);
        });
        
        this.showNotification(`Applied category "${categoryName}" to ${selectedNodes.length} nodes`);
        this.rerenderWithNewColors(); // Re-render to update colors
    }

    removeCategoryFromSelectedNodes() {
        const selectedNodes = this.getSelectedNodes();
        
        if (selectedNodes.length === 0) {
            this.showNotification('No nodes selected', 'error');
            return;
        }
        
        // Remove category from all selected nodes
        selectedNodes.forEach(node => {
            this.removeNodeFromCategory(node.id);
        });
        
        this.showNotification(`Removed category from ${selectedNodes.length} nodes`);
        this.rerenderWithNewColors(); // Re-render to update colors
    }

    selectSimilarNodes(node) {
        // Clear current selection
        this.selectionManager.selectedNodes.clear();
        
        // Find similar nodes (same category or similar name pattern)
        const nodeCategory = this.categoryManager.nodeCategories.get(node.id);
        const nodeName = node.name.toLowerCase();
        
        this.nodes.forEach(n => {
            const currentCategory = this.categoryManager.nodeCategories.get(n.id);
            const currentName = n.name.toLowerCase();
            
            // Select nodes with same category or similar names
            if (currentCategory && currentCategory === nodeCategory) {
                this.selectionManager.selectedNodes.add(n.id);
            } else if (currentName.includes(nodeName) || nodeName.includes(currentName)) {
                this.selectionManager.selectedNodes.add(n.id);
            }
        });
        
        this.updateNodeSelectionVisuals();
        this.showNotification(`Selected ${this.selectionManager.selectedNodes.size} similar nodes`);
    }

    // Keyboard shortcuts for category operations
    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Only handle shortcuts when the chart container is focused or no input is focused
            if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
                return;
            }
            
            const selectedNodes = this.getSelectedNodes();
            
            switch (event.key.toLowerCase()) {
                case 'c':
                    if (selectedNodes.length > 0) {
                        event.preventDefault();
                        this.openCategoryAssignmentForSelection();
                    }
                    break;
                    
                case 'a':
                    if (event.ctrlKey || event.metaKey) {
                        event.preventDefault();
                        this.selectAllNodes();
                    }
                    break;
                    
                case 'escape':
                    event.preventDefault();
                    this.clearSelection();
                    break;
                    
                case 'delete':
                case 'backspace':
                    if (selectedNodes.length > 0) {
                        event.preventDefault();
                        this.removeCategoryFromSelectedNodes();
                    }
                    break;
                    
                case 'v':
                    if (event.ctrlKey || event.metaKey) {
                        if (this.copiedCategory && selectedNodes.length > 0) {
                            event.preventDefault();
                            this.applyCategoryToSelectedNodes(this.copiedCategory);
                        }
                    }
                    break;
                    
                    
                case 'f':
                    if (event.ctrlKey || event.metaKey) {
                        event.preventDefault();
                        this.showNodeSearchModal();
                    }
                    break;
            }
        });
    }

    openCategoryAssignmentForSelection() {
        const selectedNodes = this.getSelectedNodes();
        
        if (selectedNodes.length === 0) {
            this.showNotification('No nodes selected', 'error');
            return;
        }
        
        if (selectedNodes.length === 1) {
            // Single node - show full assignment modal
            this.showCategoryAssignmentModal(selectedNodes[0]);
        } else {
            // Multiple nodes - show bulk assignment modal
            this.openBulkCategoryAssignmentModal(selectedNodes);
        }
    }

    showNodeSearchModal() {
        const modal = document.createElement('div');
        modal.className = 'node-search-modal';
        
        modal.innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Search and Select Nodes</h3>
                        <button class="close-modal" onclick="this.closest('.node-search-modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="search-group">
                            <input type="text" id="nodeSearchInput" placeholder="Search nodes by name..." autofocus>
                            <div class="search-results" id="searchResults"></div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.node-search-modal').remove()">Close</button>
                    </div>
                </div>
            </div>
            <style>
                .node-search-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 10000;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .modal-backdrop {
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .modal-content {
                    background: white;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 600px;
                    max-height: 90vh;
                    overflow-y: auto;
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px;
                    border-bottom: 1px solid #eee;
                }
                .modal-header h3 {
                    margin: 0;
                    color: #333;
                }
                .close-modal {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #666;
                }
                .modal-body {
                    padding: 20px;
                }
                .search-group {
                    margin-bottom: 15px;
                }
                .search-group input {
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                }
                .search-results {
                    max-height: 400px;
                    overflow-y: auto;
                    margin-top: 10px;
                    border: 1px solid #eee;
                    border-radius: 4px;
                }
                .search-result-item {
                    padding: 10px;
                    border-bottom: 1px solid #eee;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .search-result-item:hover {
                    background: #f5f5f5;
                }
                .search-result-item.selected {
                    background: #e3f2fd;
                    border-left: 3px solid #2196f3;
                }
                .node-name {
                    font-weight: 500;
                    color: #333;
                }
                .node-category {
                    font-size: 12px;
                    color: #666;
                    background: #f0f0f0;
                    padding: 2px 6px;
                    border-radius: 3px;
                }
                .modal-footer {
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                    padding: 20px;
                    border-top: 1px solid #eee;
                }
                .btn {
                    padding: 8px 16px;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
                .btn-secondary {
                    background: #6c757d;
                    color: white;
                }
            </style>
        `;
        
        document.body.appendChild(modal);
        
        // Set up search functionality
        const searchInput = document.getElementById('nodeSearchInput');
        const searchResults = document.getElementById('searchResults');
        
        const updateSearchResults = () => {
            const query = searchInput.value.toLowerCase();
            const filteredNodes = this.nodes.filter(node => 
                node.name.toLowerCase().includes(query)
            );
            
            searchResults.innerHTML = filteredNodes.map(node => {
                const category = this.categoryManager.nodeCategories.get(node.id);
                const isSelected = this.selectionManager.selectedNodes.has(node.id);
                
                return `
                    <div class="search-result-item ${isSelected ? 'selected' : ''}" 
                         data-node-id="${node.id}" 
                         onclick="window.toggleNodeFromSearch('${node.id}')">
                        <div class="node-name">${node.name}</div>
                        <div class="node-category">${category || 'No category'}</div>
                    </div>
                `;
            }).join('');
        };
        
        searchInput.addEventListener('input', updateSearchResults);
        
        // Set up global function for node selection
        window.toggleNodeFromSearch = (nodeId) => {
            const node = this.nodes.find(n => n.id === nodeId);
            if (node) {
                this.toggleNodeSelection(node);
                this.updateNodeSelectionVisuals();
                updateSearchResults(); // Refresh to show updated selection
            }
        };
        
        // Initial search results
        updateSearchResults();
    }


    // Update link categories when node categories change
    updateLinkCategoriesForNode(node, newCategory) {
        if (!this.links || this.links.length === 0) return;
        
        // Simple depth-based rule: depth 0 nodes color outgoing links, others color incoming links
        const linksToColor = this.getLinksToColor(node, this.links);
        
        // Update metadata for all connected links
        this.links.forEach(link => {
            // Update source-related category metadata
            if (link.source && link.source.id === node.id) {
                link.sourceCategory = newCategory;
            }
            
            // Update target-related category metadata  
            if (link.target && link.target.id === node.id) {
                link.targetCategory = newCategory;
            }
        });
        
        // Apply category color only to appropriate links based on depth
        linksToColor.forEach(link => {
            link.colorCategory = newCategory;
        });
        
        const nodeType = this.isAggregationNode(node, this.links) ? 'aggregation' : (node.depth === 0 ? 'revenue segment' : 'other');
    }

    // Smart link assignment that avoids conflicts with aggregation nodes
    getLinksToColor(node, links) {
        // Check if this is an aggregation node (receives from multiple same-category sources)
        if (this.isAggregationNode(node, links)) {
            // Aggregation nodes get node-only coloring (no links colored)
            return [];
        }
        
        // Special case: Revenue nodes at depth 1 should only change node color (not outgoing links)
        if (node.depth === 1 && (node.category === 'revenue' || node.id.toLowerCase().includes('revenue'))) {
            return [];
        }
        
        // Depth 0 nodes: Color outgoing links
        if (node.depth === 0) {
            return links.filter(link => link.source.id === node.id);
        }
        
        // All other nodes (depth > 1): Color incoming links
        return links.filter(link => link.target.id === node.id);
    }

    // Detect aggregation nodes to avoid link coloring conflicts
    isAggregationNode(node, links) {
        // Get incoming links to this node
        const incomingLinks = links.filter(link => link.target.id === node.id);
        
        // If less than 2 incoming links, not an aggregation
        if (incomingLinks.length < 2) {
            return false;
        }
        
        // Check if multiple incoming links come from same-category sources
        const sourceCategories = incomingLinks.map(link => {
            const sourceNode = this.nodes.find(n => n.id === link.source.id);
            return sourceNode?.category;
        }).filter(cat => cat); // Remove undefined categories
        
        // If multiple sources have the same category, this is likely an aggregation node
        const uniqueCategories = new Set(sourceCategories);
        const hasRepeatedCategories = sourceCategories.length > uniqueCategories.size;
        
        return hasRepeatedCategories;
    }

    // Re-render with new colors (optimized for color-only updates)
    rerenderWithNewColors() {
        if (!this.chart) return;
        
        // Update node colors immediately (no transition for immediate feedback)
        this.chart.selectAll('.sankey-node rect')
            .attr('fill', d => this.getNodeColor(d));
        
        // Update link colors immediately (no transition for immediate feedback)
        this.chart.selectAll('.sankey-link path')
            .attr('fill', d => this.getLinkColor(d))
            .attr('fill-opacity', d => this.statementType === 'balance' ? this.getLinkOpacity(d) : this.config.linkOpacity);
        
        // Update node text colors immediately
        this.chart.selectAll('.sankey-node text')
            .attr('fill', d => {
                const bgColor = this.getNodeColor(d);
                return ChartUtils.getContrastTextColor(bgColor);
            });
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

    /**
     * Get the initial configuration for Sankey charts
     * Required by BaseChart interface
     * @returns {Object} Initial configuration object
     */
    getInitialConfig() {
        return SankeyChartConfig.getInitialConfig();
    }

    updateConfig(newConfig) {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newConfig };
        
        // Preserve manual positions during any config update
        this.preserveManualPositions();
        
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

        // Handle title size change specifically
        if (newConfig.titleSize !== undefined && oldConfig.titleSize !== newConfig.titleSize) {
            if (window.ChartBrandingUtils && window.ChartBrandingUtils.updateTitleSize) {
                ChartBrandingUtils.updateTitleSize.call(this, newConfig.titleSize);
            } else {
                this.updateTitleSizeFallback(newConfig.titleSize);
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
            
            // globalFontSize is now handled directly by SankeyControls to avoid conflicts
            
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
                const chart = this;
                this.chart.selectAll('.sankey-node rect').each(function(d) {
                    const color = chart.getNodeColor(d);
                    d3.select(this).attr('fill', color);
                });
                // Re-apply link colors  
                this.chart.selectAll('.sankey-link path').each(function(d) {
                    const color = chart.getLinkColor(d);
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
        const needsFullRender = fullRenderKeys.some(key => 
            JSON.stringify(oldConfig[key]) !== JSON.stringify(newConfig[key])
        );
        
        // When doing full render due to config changes (not new data), preserve branding
        if (needsFullRender) {
            this.brandingNeedsUpdate = false;
        }
        
        return needsFullRender;
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
                    d3.zoomTransform(this.svg.node());
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
        toggleContainer
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
        toggleContainer
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
                this.handleNodeSelection(d, event);
            });
    }
    
    updateNodeInteractionMode() {
        
        this.chart.selectAll('.sankey-node')
            .style('cursor', 'pointer');
            
        // Update visual state of nodes
        this.chart.selectAll('.sankey-node rect')
            .style('stroke-width', '2px')
            .style('stroke', 'white')
            .style('opacity', '1');
    }
    
    // ===== ENHANCED COLOR PICKER WITH ADD NODE FUNCTIONALITY =====
    
    showEnhancedColorPicker(nodeData, mode = 'edit') {
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
            .style('max-width', mode === 'create' && this.modalStep === 1 ? '320px' : '380px')
            .style('width', '90%')
            .style('min-width', '320px')
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
            .style('padding', '20px 24px 16px 24px')
            .style('border-bottom', '1px solid #e5e7eb')
            .style('background', '#fafbfc');
            
        const headerFlex = header
            .append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '12px');
            
        // Node icon
        headerFlex
            .append('div')
            .style('width', '40px')
            .style('height', '40px')
            .style('background', this.getNodeColor(nodeData))
            .style('border-radius', '12px')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('justify-content', 'center')
            .style('color', 'white')
            .style('font-size', '18px')
            .style('font-weight', 'bold')
            .style('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.15)')
            .text('📊');
            
        const headerText = headerFlex
            .append('div');
            
        headerText
            .append('h3')
            .style('margin', '0')
            .style('color', '#111827')
            .style('font-size', '18px')
            .style('font-weight', '700')
            .style('line-height', '1.2')
            .text(mode === 'edit' ? nodeData.id : (this.modalStep === 1 ? 'Add New Node' : 'Configure Node'));
            
        if (mode === 'edit') {
            headerText
                .append('p')
                .style('margin', '4px 0 0 0')
                .style('color', '#6b7280')
                .style('font-size', '14px')
                .style('font-weight', '500')
                .text(`${nodeData.category || 'Uncategorized'} • ${(nodeData.value || 0).toLocaleString()}`);
        } else if (this.modalStep === 1) {
            headerText
                .append('p')
                .style('margin', '2px 0 0 0')
                .style('color', '#6b7280')
                .style('font-size', '12px')
                .text('Step 1: Choose color');
        }
        
        // Main content area with modern 2-column grid layout
        const mainContent = content
            .append('div')
            .style('padding', '24px')
            .style('display', 'grid')
            .style('grid-template-columns', '1fr 1fr')
            .style('gap', '24px')
            .style('min-height', '200px');
            
        // Left column: Visual customization
        const leftColumn = mainContent
            .append('div')
            .style('display', 'flex')
            .style('flex-direction', 'column')
            .style('gap', '16px');
            
        // Right column: Properties & configuration  
        const rightColumn = mainContent
            .append('div')
            .style('display', 'flex')
            .style('flex-direction', 'column')
            .style('gap', '16px');
        
        // Set initial color based on mode
        if (mode === 'edit') {
            this.modalSelectedColor = this.getNodeColor(nodeData);
        } else {
            // Use first default category color instead of current chart colors
            const defaultCategoryColors = Object.values(this.categoryManager.defaultCategories).map(cat => cat.color);
            this.modalSelectedColor = defaultCategoryColors[0] || '#3b82f6';
        }
        
        // Show different content based on mode and step
        if (mode === 'edit') {
            // Edit mode: color picker in left column, category/properties in right column
            this.addEditColorSection(leftColumn, nodeData);
            this.addCategoryAssignmentSection(rightColumn, nodeData);
        } else if (mode === 'create') {
            if (this.modalStep === 1) {
                // Create mode step 1: color picker in left column, basic setup in right
                this.addCreateStep1Section(leftColumn, nodeData);
                this.addCreateStep1Properties(rightColumn, nodeData);
            } else {
                // Create mode step 2: form in left column, configuration in right
                this.addCreateStep2Section(leftColumn, nodeData);
                this.addCreateStep2Properties(rightColumn, nodeData);
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
        this.showEnhancedColorPicker(parentNode, 'create');
    }
    
    showCompleteNodeCreationModal(parentNode) {
        // Remove any existing modal
        this.container.select('.enhanced-color-picker').remove();
        
        // Set initial color using default category colors
        const defaultCategoryColors = Object.values(this.categoryManager.defaultCategories).map(cat => cat.color);
        this.modalSelectedColor = defaultCategoryColors[0] || '#3b82f6';
        
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
            
        // Use default category colors instead of all available colors
        const defaultCategoryColors = Object.values(this.categoryManager.defaultCategories).map(cat => cat.color);
        let selectedColor = this.modalSelectedColor;
        
        if (defaultCategoryColors.length > 0) {
            const chartColorsGrid = colorSection
                .append('div')
                .style('display', 'flex')
                .style('gap', '4px')
                .style('flex-wrap', 'wrap')
                .style('margin-bottom', '8px');
                
            defaultCategoryColors.forEach(color => {
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
            orientationGrid
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
            .attr('placeholder', 'Current Value (optional)')
            .style('width', '100%')
            .style('padding', '6px 8px')
            .style('border', '1px solid #e5e7eb')
            .style('border-radius', '4px')
            .style('font-size', '11px')
            .style('margin-bottom', '6px')
            .style('box-sizing', 'border-box');
            
        const previousValueInput = formContainer
            .append('input')
            .attr('type', 'number')
            .attr('placeholder', 'Previous Value (optional)')
            .style('width', '100%')
            .style('padding', '6px 8px')
            .style('border', '1px solid #e5e7eb')
            .style('border-radius', '4px')
            .style('font-size', '11px')
            .style('box-sizing', 'border-box');
        
        // Create function
        const createNode = () => {
            const name = nameInput.node().value.trim();
            const valueText = valueInput.node().value.trim();
            const value = valueText === '' ? 0 : this.parseNumber(valueText) || 0;
            const previousValueText = previousValueInput.node().value.trim();
            const previousValue = previousValueText === '' ? 0 : this.parseNumber(previousValueText) || 0;
            
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
            this.createConnectedNodeWithOrientation(name, value, selectedOrientation, parentNode, this.modalSelectedColor, previousValue);
        };
        
        // Add Enter key support
        [nameInput, valueInput, previousValueInput].forEach(input => {
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
            
        // Use default category colors instead of all available colors
        const defaultCategoryColors = Object.values(this.categoryManager.defaultCategories).map(cat => cat.color);
        let selectedColor = this.modalSelectedColor;
        
        // Standard colors grid
        const chartColorsGrid = colorSection
            .append('div')
            .style('display', 'flex')
            .style('gap', '6px')
            .style('flex-wrap', 'wrap')
            .style('margin-bottom', '8px');
            
        defaultCategoryColors.forEach(color => {
                const isSelected = color === selectedColor;
                chartColorsGrid
                    .append('button')
                    .attr('class', 'chart-color-btn')
                    .style('width', '18px')
                    .style('height', '18px')
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
        
        // Add category assignment section
        this.addCategoryAssignmentSection(container, nodeData);
        
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
    
    
    

    /**
     * Add category assignment section to the existing modal
     */
    addCategoryAssignmentSection(container, nodeData) {
        const currentCategory = this.getCategoryForNode(nodeData.id);
        const allCategories = this.getAllCategories();
        
        // Category assignment section
        const categorySection = container
            .append('div')
            .style('margin-top', '12px')
            .style('margin-bottom', '12px')
            .style('padding', '12px')
            .style('background', '#f8f9fa')
            .style('border-radius', '8px')
            .style('border', '1px solid #e9ecef');
        
        // Section header
        categorySection
            .append('div')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '6px')
            .style('margin-bottom', '8px')
            .call(header => {
                header.append('span')
                    .style('font-size', '11px')
                    .style('font-weight', '600')
                    .style('color', '#495057')
                    .text('Category');
                
                header.append('span')
                    .style('font-size', '10px')
                    .style('color', '#6c757d')
                    .text('(assign to enable styling)');
            });
        
        // Current category display
        const currentCategoryDiv = categorySection
            .append('div')
            .style('margin-bottom', '8px');
        
        if (currentCategory) {
            const categoryInfo = allCategories[currentCategory];
            currentCategoryDiv
                .append('div')
                .style('display', 'inline-flex')
                .style('align-items', 'center')
                .style('gap', '4px')
                .style('padding', '4px 8px')
                .style('background', categoryInfo.color)
                .style('color', 'white')
                .style('border-radius', '12px')
                .style('font-size', '10px')
                .style('font-weight', '500')
                .call(pill => {
                    pill.append('span').text(categoryInfo.icon);
                    pill.append('span').text(currentCategory);
                });
        } else {
            currentCategoryDiv
                .append('div')
                .style('font-size', '10px')
                .style('color', '#6c757d')
                .style('font-style', 'italic')
                .text('No category assigned');
        }
        
        // Category selection pills
        const categoryPills = categorySection
            .append('div')
            .style('display', 'flex')
            .style('gap', '4px')
            .style('flex-wrap', 'wrap')
            .style('margin-bottom', '8px');
        
        // Add "Remove Category" pill
        categoryPills
            .append('button')
            .style('padding', '4px 8px')
            .style('border', '1px solid #dc3545')
            .style('background', currentCategory ? '#dc3545' : 'white')
            .style('color', currentCategory ? 'white' : '#dc3545')
            .style('border-radius', '12px')
            .style('font-size', '10px')
            .style('cursor', 'pointer')
            .style('font-weight', '500')
            .text('🚫 Remove')
            .on('click', () => {
                this.removeNodeFromCategory(nodeData.id);
                this.container.select('.enhanced-color-picker').remove();
            });
        
        // Add category pills for each available category
        for (const [name, categoryInfo] of Object.entries(allCategories)) {
            const isSelected = currentCategory === name;
            
            categoryPills
                .append('button')
                .style('padding', '4px 8px')
                .style('border', isSelected ? '2px solid #007bff' : '1px solid #dee2e6')
                .style('background', isSelected ? categoryInfo.color : 'white')
                .style('color', isSelected ? 'white' : '#495057')
                .style('border-radius', '12px')
                .style('font-size', '10px')
                .style('cursor', 'pointer')
                .style('font-weight', '500')
                .style('display', 'inline-flex')
                .style('align-items', 'center')
                .style('gap', '3px')
                .style('transition', 'all 0.2s ease')
                .call(pill => {
                    pill.append('span').text(categoryInfo.icon);
                    pill.append('span').text(name);
                })
                .on('mouseover', function() {
                    if (!isSelected) {
                        d3.select(this)
                            .style('border-color', categoryInfo.color)
                            .style('background', categoryInfo.color + '20');
                    }
                })
                .on('mouseout', function() {
                    if (!isSelected) {
                        d3.select(this)
                            .style('border-color', '#dee2e6')
                            .style('background', 'white');
                    }
                })
                .on('click', () => {
                    this.assignNodeToCategory(nodeData.id, name);
                    this.container.select('.enhanced-color-picker').remove();
                });
        }
        
        // Custom category creation
        const customCategoryDiv = categorySection
            .append('div')
            .style('margin-top', '8px')
            .style('padding-top', '8px')
            .style('border-top', '1px solid #dee2e6');
        
        const customForm = customCategoryDiv
            .append('div')
            .style('display', 'flex')
            .style('gap', '4px')
            .style('align-items', 'center');
        
        const nameInput = customForm
            .append('input')
            .attr('type', 'text')
            .attr('placeholder', 'New category')
            .style('flex', '1')
            .style('padding', '4px 6px')
            .style('border', '1px solid #ced4da')
            .style('border-radius', '4px')
            .style('font-size', '10px')
            .style('outline', 'none')
            .style('max-width', '80px');
        
        const colorInput = customForm
            .append('input')
            .attr('type', 'color')
            .attr('value', '#3b82f6')
            .style('width', '20px')
            .style('height', '20px')
            .style('border', 'none')
            .style('border-radius', '3px')
            .style('cursor', 'pointer');
        
        const iconInput = customForm
            .append('input')
            .attr('type', 'text')
            .attr('placeholder', '📊')
            .attr('maxlength', '2')
            .style('width', '24px')
            .style('padding', '4px 2px')
            .style('border', '1px solid #ced4da')
            .style('border-radius', '4px')
            .style('font-size', '10px')
            .style('text-align', 'center')
            .style('outline', 'none');
        
        const createButton = customForm
            .append('button')
            .style('padding', '4px 8px')
            .style('background', '#28a745')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '4px')
            .style('font-size', '10px')
            .style('cursor', 'pointer')
            .style('font-weight', '500')
            .text('Create')
            .on('click', () => {
                const name = nameInput.node().value.trim();
                const color = colorInput.node().value;
                const icon = iconInput.node().value.trim() || '📊';
                
                if (name && this.createCustomCategory(name, color, icon)) {
                    this.assignNodeToCategory(nodeData.id, name);
                    this.container.select('.enhanced-color-picker').remove();
                }
            });
        
        // Enter key support for inputs
        nameInput.on('keypress', (event) => {
            if (event.key === 'Enter') {
                createButton.node().click();
            }
        });
        
        iconInput.on('keypress', (event) => {
            if (event.key === 'Enter') {
                createButton.node().click();
            }
        });
    }
    
    addCreateStep1Section(container, nodeData) {
        // Create mode step 1: simple color picker + add button
        const colorSection = container
            .append('div')
            .style('margin-bottom', '10px');
            
        // Use default category colors instead of all available colors
        const defaultCategoryColors = Object.values(this.categoryManager.defaultCategories).map(cat => cat.color);
        let selectedColor = this.modalSelectedColor;
        
        // Chart colors grid
        if (defaultCategoryColors.length > 0) {
            const chartColorsGrid = colorSection
                .append('div')
                .style('display', 'flex')
                .style('gap', '6px')
                .style('flex-wrap', 'wrap')
                .style('margin-bottom', '8px');
                
            defaultCategoryColors.forEach(color => {
                const isSelected = color === selectedColor;
                chartColorsGrid
                    .append('button')
                    .attr('class', 'chart-color-btn')
                    .style('width', '18px')
                    .style('height', '18px')
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
                if (chartColorsGrid) {
                    chartColorsGrid.selectAll('.chart-color-btn')
                        .style('border', '2px solid white');
                }
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
                this.showEnhancedColorPicker(nodeData, 'create');
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
        orientationGrid
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
            const valueText = valueInput.node().value.trim();
            const value = valueText === '' ? 0 : this.parseNumber(valueText) || 0;
            const previousValueText = previousValueInput.node().value.trim();
            const previousValue = previousValueText === '' ? 0 : this.parseNumber(previousValueText) || 0;
            
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
            this.createConnectedNodeWithOrientation(name, value, selectedOrientation, parentNode, this.modalSelectedColor, previousValue);
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
            
        // Previous Value input
        const previousValueInput = formContainer
            .append('input')
            .attr('type', 'number')
            .attr('placeholder', 'Previous value (optional)')
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
        
        // Removed revenue segment colors - using generic category system
        
        return Array.from(colors).slice(0, 8); // Limit to 8 colors for clean UI
    }
    
    createConnectedNodeWithOrientation(name, value, orientation, parentNode, customColor = null, previousValue = 0) {
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
            value: value,
            previousValue: previousValue,
            description: `Connected to ${parentNode.id}`,
            x: nodeX,
            y: nodeY,
            height: Math.max(20, value > 0 ? value / 20 : 5),
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
            value: value,
            previousValue: previousValue || 0,
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
        
        // Update the internal data to include the new node and link
        this.updateInternalDataStructure();
        
        // Gentle sync to spreadsheet without triggering layout recalculation
        this.gentleSpreadsheetSync();
        
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
        while (this.hasOverlapAtPosition(nodeY, nodesAtSameDepth, 40)) {
            nodeY += minSpacing;
        }
        
        // Ensure within chart bounds
        const chartHeight = this.config.height - this.config.margin.top - this.config.margin.bottom;
        nodeY = Math.max(20, Math.min(nodeY, chartHeight - 60));
        
        return { x: nodeX, y: nodeY };
    }
    
    hasOverlapAtPosition(y, existingNodes, nodeHeight) {
        const minSpacing = 20;
        
        return existingNodes.some(node => {
            const distance = Math.abs(node.y - y);
            return distance < (nodeHeight + (node.height || 30)) / 2 + minSpacing;
        });
    }
    
    
    updateInternalDataStructure() {
        // Gently update the internal data structure to reflect current nodes and links
        // without triggering full re-renders or layout recalculations
        try {
            // Create a map of existing flows to preserve previousValue data
            const existingFlowsMap = new Map();
            if (this.data && this.data.flows) {
                this.data.flows.forEach(flow => {
                    const key = `${flow.source}->${flow.target}`;
                    existingFlowsMap.set(key, flow);
                });
            }
            
            // Build flows from current links, preserving existing previousValue data
            const flows = this.links.map(link => {
                const sourceId = link.source?.id || link.source;
                const targetId = link.target?.id || link.target;
                const key = `${sourceId}->${targetId}`;
                const existingFlow = existingFlowsMap.get(key);
                
                return {
                    source: sourceId,
                    target: targetId,
                    value: link.value || 0,
                    previousValue: existingFlow ? existingFlow.previousValue : (link.previousValue || 0),
                    description: link.description || (existingFlow ? existingFlow.description : '')
                };
            });
            
            // Update data structure
            this.data = {
                ...this.data,
                flows: flows
            };
            
        } catch (error) {
            console.warn('⚠️ Failed to update internal data structure:', error.message);
        }
    }

    gentleSpreadsheetSync() {
        // Sync to spreadsheet without triggering chart re-render
        try {
            // First try: Modern UnifiedSpreadsheetEditor
            if (window.unifiedDataEditor && 
                window.unifiedDataEditor.chartType === 'sankey' &&
                typeof window.unifiedDataEditor.render === 'function') {
                
                // Direct sync: update spreadsheet data without triggering chart updates
                if (this.data && this.data.flows) {
                    // Convert flows to spreadsheet format
                    const spreadsheetData = this.data.flows.map(flow => ({
                        source: flow.source || '',
                        target: flow.target || '',
                        value: flow.value || 0,
                        previousValue: flow.previousValue || 0,
                        description: flow.description || ''
                    }));
                    
                    // Update spreadsheet data directly without triggering loadInitialData
                    window.unifiedDataEditor.data = spreadsheetData;
                    window.unifiedDataEditor.render();
                    return;
                }
            }
            
            // Second try: Legacy SpreadsheetController with flowData
            if (window.spreadsheetController && typeof flowData !== 'undefined' && 
                typeof BusinessFlow !== 'undefined' && this.data && this.data.flows) {
                
                // Update the legacy flowData.flows array with proper BusinessFlow instances
                flowData.flows = this.data.flows.map(flow => new BusinessFlow({
                    id: flow.id || `flow_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                    source: flow.source || '',
                    target: flow.target || '',
                    value: flow.value || 0,
                    previousValue: flow.previousValue || 0,
                    description: flow.description || '',
                    flowType: 'revenue_flow',
                    sourceLayer: 0,
                    targetLayer: 1,
                    sourceOrder: 1,
                    targetOrder: 1,
                    sourceCategory: 'revenue',
                    targetCategory: 'revenue'
                }));
                
                // Trigger visual update of the spreadsheet using renderFlowTable
                if (typeof renderFlowTable === 'function') {
                    renderFlowTable();
                } else if (typeof window.spreadsheetController.rebuildTable === 'function') {
                    window.spreadsheetController.rebuildTable();
                }
                return;
            }
            
            // Third try: Direct call to renderFlowTable if available
            if (typeof renderFlowTable === 'function' && typeof flowData !== 'undefined' && 
                typeof BusinessFlow !== 'undefined' && this.data && this.data.flows) {
                
                // Update flowData first with proper BusinessFlow instances
                flowData.flows = this.data.flows.map(flow => new BusinessFlow({
                    id: flow.id || `flow_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
                    source: flow.source || '',
                    target: flow.target || '',
                    value: flow.value || 0,
                    previousValue: flow.previousValue || 0,
                    description: flow.description || '',
                    flowType: 'revenue_flow',
                    sourceLayer: 0,
                    targetLayer: 1,
                    sourceOrder: 1,
                    targetOrder: 1,
                    sourceCategory: 'revenue',
                    targetCategory: 'revenue'
                }));
                
                // Call renderFlowTable to refresh display
                renderFlowTable();
                return;
            }
            
            // Fallback: Update PulseApp data for future sync
            if (window.pulseApp) {
                window.pulseApp.currentData = this.data;
                return;
            }
        } catch (error) {
            console.warn('⚠️ Gentle spreadsheet sync failed:', error.message);
        }
    }


    syncToSpreadsheet() {
        // Update the data spreadsheet with current chart data including new nodes
        // This is a gentle sync that doesn't trigger full re-renders
        try {
            // Convert current chart data to spreadsheet format
            const spreadsheetData = this.convertToSpreadsheetFormat(this.data);
            
            if (!spreadsheetData || !Array.isArray(spreadsheetData) || spreadsheetData.length === 0) {
                console.warn('⚠️ No valid spreadsheet data generated');
                return;
            }
            
            // Update the internal data structure - skip first row (headers)
            this.data = {
                ...this.data,
                flows: spreadsheetData.slice(1).map(row => ({
                    source: row[0] || '',
                    target: row[1] || '',
                    value: this.parseNumber(row[2]) || 0,
                    previousValue: this.parseNumber(row[3]) || 0,  // Previous value is at index 3
                    description: row[4] || ''  // Description is at index 4 (not 5)
                }))
            };
            
            // Gentle notification to spreadsheet without triggering full chart re-render
            try {
                // Dispatch custom event for spreadsheet sync only
                const spreadsheetUpdateEvent = new CustomEvent('pulseSpreadsheetSync', {
                    detail: { 
                        data: this.data, 
                        source: 'node-creation',
                        preserveLayout: true,
                        timestamp: Date.now()
                    }
                });
                window.dispatchEvent(spreadsheetUpdateEvent);
                
            } catch (eventError) {
                console.warn('⚠️ Could not notify spreadsheet:', eventError.message);
            }
            
        } catch (error) {
            console.warn('⚠️ Failed to sync to spreadsheet:', error.message);
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
        
        if (nearestLayer && Math.abs(constrainedX - nearestLayer.x) < magneticThreshold) {
            // Show strong magnetic feedback
            this.showMagneticFeedback(nearestLayer.x, true);
            finalX = nearestLayer.x;
            
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

        
        if (category === 'off' || category === null || category === undefined) {
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
                    return d && d.category === category;
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
                    return d && d.category === category;
                })
                .transition()
                .duration(300)
                .style('opacity', 1);
            
            // Highlight related links
            this.chart.selectAll('.sankey-link path')
                .filter(function(d) {
                    return d && d.source && d.target && (d.source.category === category || d.target.category === category);
                })
                .transition()
                .duration(300)
                .attr('fill-opacity', this.config.linkOpacity);
        }
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

    // ===== CATEGORY MANAGEMENT SYSTEM METHODS =====
    
    /**
     * Get assigned category for a node
     * @param {string} nodeId - The node ID
     * @returns {string|null} - The category name or null if not assigned
     */
    getCategoryForNode(nodeId) {
        return this.categoryManager.nodeCategories.get(nodeId) || null;
    }

    /**
     * Set independent color for a node (color-only, no category)
     * @param {string} nodeId - The node ID
     * @param {string} color - The color to apply
     */
    setIndependentNodeColor(nodeId, color) {
        if (!nodeId || !color) {
            console.warn('⚠️ Invalid nodeId or color for independent color assignment');
            return;
        }

        const node = this.nodes?.find(n => n.id === nodeId);
        if (!node) {
            console.warn(`⚠️ Node '${nodeId}' not found for independent color assignment`);
            return;
        }

        // Store independent color (separate from category colors)
        if (!this.independentNodeColors) {
            this.independentNodeColors = {};
        }
        this.independentNodeColors[nodeId] = color;

        // Apply color using same logic as category assignment but for color only
        this.updateIndependentLinkColors(node, color);

        // Re-render to apply changes
        this.rerenderWithNewColors();
        
        // Capture state for auto-save
        this.captureCompleteState();

    }

    /**
     * Get independent color for a node
     * @param {string} nodeId - The node ID
     * @returns {string|null} The independent color or null
     */
    getIndependentNodeColor(nodeId) {
        return this.independentNodeColors?.[nodeId] || null;
    }

    /**
     * Remove independent color from a node
     * @param {string} nodeId - The node ID
     */
    removeIndependentNodeColor(nodeId) {
        if (this.independentNodeColors && this.independentNodeColors[nodeId]) {
            delete this.independentNodeColors[nodeId];
            
            // Clear link colors for this node
            const node = this.nodes?.find(n => n.id === nodeId);
            if (node) {
                this.updateIndependentLinkColors(node, null);
            }
            
            this.rerenderWithNewColors();
            
            // Capture state for auto-save
            this.captureCompleteState();
            
        }
    }

    /**
     * Update link colors for independent node coloring (same logic as category assignment)
     * @param {Object} node - The node object
     * @param {string|null} color - The color to apply (null to clear)
     */
    updateIndependentLinkColors(node, color) {
        if (!this.links || this.links.length === 0) return;

        // Use the same link selection logic as category assignment
        const linksToColor = this.getLinksToColor(node, this.links);

        // Apply independent color only to appropriate links based on depth rules
        linksToColor.forEach(link => {
            if (color) {
                link.independentColor = color;
            } else {
                delete link.independentColor;
            }
        });

        const nodeType = this.isAggregationNode(node, this.links) ? 'aggregation' : 
                        (node.depth === 0 ? 'revenue segment' : 
                         (node.depth === 1 && (node.category === 'revenue' || node.id.toLowerCase().includes('revenue')) ? 'revenue depth 1' : 'other'));
        
    }

    /**
     * Assign a node to a category
     * @param {string} nodeId - The node ID
     * @param {string} categoryName - The category name
     */
    assignNodeToCategory(nodeId, categoryName) {
        if (!nodeId || !categoryName) {
            console.warn('⚠️ Invalid nodeId or categoryName for category assignment');
            return;
        }
        
        // Check if category exists
        if (!this.getAllCategories().hasOwnProperty(categoryName)) {
            console.warn(`⚠️ Category '${categoryName}' does not exist`);
            return;
        }
        
        this.categoryManager.nodeCategories.set(nodeId, categoryName);
        this.saveCategoriesToMetadata();
        
        // Find the node object to update link categories and node properties
        const node = this.nodes?.find(n => n.id === nodeId);
        if (node) {
            // Update the node's category property to reflect the new assignment
            node.category = categoryName;
            
            // Remove any custom color to allow category color to take precedence
            if (node.customColor) {
                delete node.customColor;
                // Also remove from the custom colors map
                if (this.customColors && this.customColors[nodeId]) {
                    delete this.customColors[nodeId];
                }
            }
            
            // Update expense type flag for proper value formatting
            node.isExpenseType = categoryName === 'expense';
            
            // Update link categories for this node
            this.updateLinkCategoriesForNode(node, categoryName);
            
            // Re-render with new colors and refresh labels immediately to show the changes
            this.rerenderWithNewColors();
            
            // Force immediate label refresh to show expense formatting
            this.chart.selectAll('.node-text-group, .node-label, .node-value').remove();
            this.renderLabels();
            
        }
        
    }

    /**
     * Remove category assignment from a node
     * @param {string} nodeId - The node ID
     */
    removeNodeFromCategory(nodeId) {
        if (!nodeId) {
            console.warn('⚠️ Invalid nodeId for category removal');
            return;
        }
        
        this.categoryManager.nodeCategories.delete(nodeId);
        this.saveCategoriesToMetadata();
        
        // Find the node object to update link categories and node properties
        const node = this.nodes?.find(n => n.id === nodeId);
        if (node) {
            // Reset the node's category property
            node.category = null;
            
            // Reset expense type flag for proper value formatting
            node.isExpenseType = false;
            
            // Update link categories for this node (null means no category)
            this.updateLinkCategoriesForNode(node, null);
            
            // Re-render with new colors to show the changes
            this.rerenderWithNewColors();
            
        }
        
    }

    /**
     * Create a new custom category
     * @param {string} name - Category name
     * @param {string} color - Category color
     * @param {string} icon - Category icon
     * @param {string} description - Category description
     */
    createCustomCategory(name, color, icon, description) {
        if (!name || !color) {
            console.warn('⚠️ Name and color are required for custom category');
            return false;
        }
        
        // Check for duplicate names
        if (this.getAllCategories().hasOwnProperty(name)) {
            console.warn(`⚠️ Category '${name}' already exists`);
            return false;
        }
        
        // Store in category manager
        this.categoryManager.userCategories.set(name, {
            color: color,
            icon: icon || '📊',
            description: description || `Custom category: ${name}`
        });
        
        // Also store in customColors for backward compatibility and link color inheritance
        if (!this.customColors) {
            this.customColors = {};
        }
        this.customColors[name] = color;
        
        // Update metadata
        if (this.data && this.data.metadata) {
            if (!this.data.metadata.colorPalette) {
                this.data.metadata.colorPalette = {};
            }
            this.data.metadata.colorPalette[name] = color;
        }
        
        this.saveCategoriesToMetadata();
        return true;
    }

    /**
     * Delete a category and reassign nodes
     * @param {string} categoryName - The category to delete
     * @param {string} reassignTo - Category to reassign nodes to (optional)
     */
    deleteCategory(categoryName) {
        if (!categoryName) {
            console.warn('⚠️ Category name is required for deletion');
            return false;
        }
        
        // Cannot delete default categories
        if (this.categoryManager.defaultCategories.hasOwnProperty(categoryName)) {
            console.warn(`⚠️ Cannot delete default category '${categoryName}'`);
            return false;
        }
        
        // Check if category exists
        if (!this.categoryManager.userCategories.has(categoryName)) {
            console.warn(`⚠️ Category '${categoryName}' does not exist`);
            return false;
        }
        
        // Remove category
        this.categoryManager.userCategories.delete(categoryName);
        
        // Remove all node assignments to this category
        const nodesToReassign = [];
        for (const [nodeId, assignedCategory] of this.categoryManager.nodeCategories) {
            if (assignedCategory === categoryName) {
                nodesToReassign.push(nodeId);
            }
        }
        
        nodesToReassign.forEach(nodeId => {
            this.categoryManager.nodeCategories.delete(nodeId);
        });
        
        this.saveCategoriesToMetadata();
        return true;
    }

    /**
     * Get all available categories (default + custom)
     * @returns {Object} - Object containing all categories
     */
    getAllCategories() {
        const allCategories = { ...this.categoryManager.defaultCategories };
        
        // Add user categories
        for (const [name, category] of this.categoryManager.userCategories) {
            allCategories[name] = category;
        }
        
        return allCategories;
    }

    /**
     * Update category color
     * @param {string} categoryName - Name of the category to update
     * @param {string} newColor - New color for the category
     * @returns {boolean} - True if successful, false otherwise
     */
    updateCategoryColor(categoryName, newColor) {
        if (!categoryName || !newColor) {
            console.warn('⚠️ Category name and color are required');
            return false;
        }
        
        // Check if it's a default category
        if (this.categoryManager.defaultCategories.hasOwnProperty(categoryName)) {
            this.categoryManager.defaultCategories[categoryName].color = newColor;
            console.log(`🎨 Updated default category '${categoryName}' color to ${newColor}`);
            return true;
        }
        
        // Check if it's a user category
        if (this.categoryManager.userCategories.has(categoryName)) {
            const category = this.categoryManager.userCategories.get(categoryName);
            category.color = newColor;
            this.categoryManager.userCategories.set(categoryName, category);
            console.log(`🎨 Updated user category '${categoryName}' color to ${newColor}`);
            return true;
        }
        
        console.warn(`⚠️ Category '${categoryName}' not found`);
        return false;
    }

    /**
     * Set custom color for a specific node
     * @param {string} nodeId - ID of the node to color
     * @param {string} color - New color for the node
     * @returns {boolean} - True if successful, false otherwise
     */
    setNodeCustomColor(nodeId, color) {
        if (!nodeId || !color) {
            console.warn('⚠️ Node ID and color are required');
            return false;
        }
        
        // Initialize customColors if it doesn't exist
        if (!this.customColors) {
            this.customColors = {};
        }
        
        // Set the custom color
        this.customColors[nodeId] = color;
        console.log(`🎨 Set custom color for node '${nodeId}' to ${color}`);
        
        return true;
    }

    /**
     * Reset node color to default (remove custom color)
     * @param {string} nodeId - ID of the node to reset
     * @returns {boolean} - True if successful, false otherwise
     */
    resetNodeColor(nodeId) {
        if (!nodeId) {
            console.warn('⚠️ Node ID is required');
            return false;
        }
        
        // Remove custom color if it exists
        if (this.customColors && this.customColors[nodeId]) {
            delete this.customColors[nodeId];
            console.log(`🔄 Reset custom color for node '${nodeId}'`);
            return true;
        }
        
        console.log(`ℹ️ No custom color found for node '${nodeId}'`);
        return true; // Return true anyway since the goal is achieved
    }

    /**
     * Load categories from metadata
     */
    loadCategoriesFromMetadata() {
        if (!this.data || !this.data.metadata) {
            return;
        }
        
        const metadata = this.data.metadata;
        
        // Load user categories
        if (metadata.userCategories) {
            this.categoryManager.userCategories.clear();
            for (const [name, category] of Object.entries(metadata.userCategories)) {
                this.categoryManager.userCategories.set(name, category);
            }
        }
        
        // Load node category assignments
        if (metadata.nodeCategories) {
            this.categoryManager.nodeCategories.clear();
            for (const [nodeId, categoryName] of Object.entries(metadata.nodeCategories)) {
                this.categoryManager.nodeCategories.set(nodeId, categoryName);
            }
        }
        
        // Load positioning preferences (hub categories removed)
        if (metadata.categoryPositioningPreferences) {
            const prefs = metadata.categoryPositioningPreferences;
            if (prefs.layerPreferences) {
                this.categoryManager.positioningPreferences.layerPreferences = new Map(Object.entries(prefs.layerPreferences));
            }
        }
        
    }

    // Removed hub category functions - no longer supporting hub categories

    /**
     * Get all hub categories
     * @returns {Set} - Set of hub category names
     */
    // Removed getHubCategories function - no longer supporting hub categories

    /**
     * Group nodes by their assigned categories
     * @returns {Map} - Map of category -> array of nodes
     */
    groupNodesByCategory() {
        const categoryGroups = new Map();
        
        if (!this.nodes) return categoryGroups;
        
        this.nodes.forEach(node => {
            const category = this.getCategoryForNode(node.id) || 'uncategorized';
            if (!categoryGroups.has(category)) {
                categoryGroups.set(category, []);
            }
            categoryGroups.get(category).push(node);
        });
        
        return categoryGroups;
    }

    /**
     * Apply generic category-based properties to nodes (no special positioning)
     */
    positionNodesByCategory() {
        if (!this.nodes || this.nodes.length === 0) return;
        
        
        // Apply category-based properties to all nodes equally
        this.nodes.forEach(node => {
            const category = this.getCategoryForNode(node.id);
            
            // All nodes treated equally - no hub/special positioning
            node.isHubNode = false;
            node.categoryPositioning = 'regular';
            node.categoryGroup = category;
            node.layerPreference = 'auto'; // All nodes use auto positioning
        });
        
    }

    /**
     * Save categories to metadata
     */
    saveCategoriesToMetadata() {
        if (!this.data) {
            this.data = {};
        }
        if (!this.data.metadata) {
            this.data.metadata = {};
        }
        
        // Save user categories
        this.data.metadata.userCategories = {};
        for (const [name, category] of this.categoryManager.userCategories) {
            this.data.metadata.userCategories[name] = category;
        }
        
        // Save node category assignments
        this.data.metadata.nodeCategories = {};
        for (const [nodeId, categoryName] of this.categoryManager.nodeCategories) {
            this.data.metadata.nodeCategories[nodeId] = categoryName;
        }
        
    }

    /**
     * Migrate legacy categories to new system
     */
    migrateLegacyCategories() {
        if (!this.data || !this.data.nodes) {
            return;
        }
        
        let migrationCount = 0;
        
        this.data.nodes.forEach(node => {
            if (node.category && !this.categoryManager.nodeCategories.has(node.id)) {
                // Check if it's a valid category
                if (this.categoryManager.defaultCategories.hasOwnProperty(node.category)) {
                    this.categoryManager.nodeCategories.set(node.id, node.category);
                    migrationCount++;
                }
            }
        });
        
        if (migrationCount > 0) {
            this.saveCategoriesToMetadata();
        }
    }

    /**
     * Test method to open category assignment modal for a node
     * @param {string} nodeId - The node ID
     */
    testCategoryAssignment(nodeId) {
        if (!this.data || !this.data.nodes) {
            console.warn('⚠️ No chart data available');
            return;
        }
        
        const node = this.data.nodes.find(n => n.id === nodeId);
        if (!node) {
            console.warn(`⚠️ Node '${nodeId}' not found`);
            return;
        }
        
        new CategoryAssignmentModal(this, node);
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PulseSankeyChart;
}