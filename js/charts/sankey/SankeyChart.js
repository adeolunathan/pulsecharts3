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
        
        this.config = this.getInitialConfig();
        this.initializeChart();
    }

    getInitialConfig() {
        return {
            width: 1200,
            height: 700,
            margin: { top: 60, right: 150, bottom: 60, left: 150 },
            nodeWidth: 28,
            nodePadding: 40,
            curveIntensity: 0.4,
            animationDuration: 800,
            leftmostSpacing: 0.8,
            middleSpacing: 0.9,
            rightmostSpacing: 0.7,
            autoCenter: true,
            autoMiddleAlign: true,
            nodeHeightScale: 0.65,
            linkWidthScale: 0.65,
            nodeOpacity: 1.0,
            linkOpacity: 1.0,
            leftmostGroupGap: 40,
            rightmostGroupGap: 40,
            labelDistance: {
                leftmost: 15,
                middle: 12,
                rightmost: 15
            },
            valueDistance: {
                general: 8,
                middle: 8
            },
            layerSpacing: {
                0: 0.8,
                1: 1.0,
                2: 1.0,
                3: 0.9,
                4: 0.7
            },
            backgroundColor: '#f8f9fa',
            titleFont: 'Inter',
            titleColor: '#1f2937'
        };
    }

    applyControlDefaults(controlModule) {
        if (controlModule && controlModule.getDefaultConfig) {
            const controlDefaults = controlModule.getDefaultConfig();
            this.config = { ...this.config, ...controlDefaults };
            console.log('✅ Applied control module defaults to chart config');
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

        const depths = [...new Set(this.nodes.map(n => n.depth))].sort((a, b) => a - b);
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

        this.chart = this.svg
            .append('g')
            .attr('transform', `translate(${this.config.margin.left}, ${this.config.margin.top})`);

        this.createTooltip();
        this.initializeColorPicker();
    }

    createTooltip() {
        d3.select('.pulse-sankey-tooltip').remove();
        
        this.tooltip = d3.select('body')
            .append('div')
            .attr('class', 'pulse-sankey-tooltip');
    }

    initializeColorPicker() {
        // Remove existing color picker
        d3.select('.color-picker-modal').remove();
        
        // Create color picker modal
        this.colorPicker = d3.select('body')
            .append('div')
            .attr('class', 'color-picker-modal')
            .style('position', 'fixed')
            .style('top', '50%')
            .style('left', '50%')
            .style('transform', 'translate(-50%, -50%)')
            .style('width', '160px')
            .style('background', 'white')
            .style('border-radius', '6px')
            .style('box-shadow', '0 8px 32px rgba(0,0,0,0.12)')
            .style('z-index', '1000')
            .style('display', 'none')
            .style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif')
            .style('padding', '8px')
            .style('border', '1px solid rgba(0,0,0,0.08)');

        // Close button (absolute positioned to avoid interference)
        this.colorPicker.append('button')
            .text('×')
            .style('position', 'absolute')
            .style('top', '-8px')
            .style('right', '-8px')
            .style('width', '20px')
            .style('height', '20px')
            .style('background', 'white')
            .style('border', '1px solid #ddd')
            .style('border-radius', '50%')
            .style('font-size', '12px')
            .style('cursor', 'pointer')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('justify-content', 'center')
            .style('color', '#666')
            .style('box-shadow', '0 2px 8px rgba(0,0,0,0.1)')
            .on('mouseover', function() {
                d3.select(this).style('background', '#f8f9fa');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', 'white');
            })
            .on('click', () => this.hideColorPicker());

        // Native color picker
        const colorInput = this.colorPicker.append('input')
            .attr('type', 'color')
            .attr('id', 'color-picker-input')
            .style('width', '100%')
            .style('height', '28px')
            .style('border', '1px solid #ddd')
            .style('border-radius', '3px')
            .style('cursor', 'pointer')
            .style('margin-bottom', '8px');

        const presetColors = [
            '#3498db', '#27ae60', '#e67e22', 
            '#e74c3c', '#9b59b6', '#34495e'
        ];

        // Horizontal preset row
        const presetRow = this.colorPicker.append('div')
            .style('display', 'flex')
            .style('gap', '4px')
            .style('margin-bottom', '8px');

        presetColors.forEach(color => {
            presetRow.append('div')
                .style('width', '20px')
                .style('height', '20px')
                .style('background', color)
                .style('border', '1px solid rgba(0,0,0,0.1)')
                .style('border-radius', '2px')
                .style('cursor', 'pointer')
                .style('transition', 'all 0.15s ease')
                .on('mouseover', function() {
                    d3.select(this)
                        .style('transform', 'scale(1.15)')
                        .style('border-color', '#333');
                })
                .on('mouseout', function() {
                    d3.select(this)
                        .style('transform', 'scale(1)')
                        .style('border-color', 'rgba(0,0,0,0.1)');
                })
                .on('click', () => {
                    colorInput.property('value', color);
                });
        });

        // Apply button
        this.colorPicker.append('button')
            .text('Apply')
            .style('width', '100%')
            .style('padding', '6px')
            .style('background', '#3498db')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '3px')
            .style('font-size', '12px')
            .style('font-weight', '500')
            .style('cursor', 'pointer')
            .style('transition', 'background 0.15s ease')
            .on('mouseover', function() {
                d3.select(this).style('background', '#2980b9');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', '#3498db');
            })
            .on('click', () => this.applySelectedColor());
    }

    showColorPicker(element, currentColor) {
        this.selectedElement = element;
        this.isColorPickerActive = true;
        
        this.colorPicker.select('#color-picker-input')
            .property('value', currentColor || '#3498db');
        
        this.colorPicker.style('display', 'block');
    }

    hideColorPicker() {
        this.isColorPickerActive = false;
        this.selectedElement = null;
        this.colorPicker.style('display', 'none');
    }

    applySelectedColor() {
        if (!this.selectedElement) return;
        
        const newColor = this.colorPicker.select('#color-picker-input').property('value');
        const elementData = d3.select(this.selectedElement).datum();
        
        if (elementData.id) {
            // Node color update
            this.updateNodeColor(elementData, newColor);
        } else if (elementData.source && elementData.target) {
            // Link color update (if needed)
            this.updateLinkColor(elementData, newColor);
        }
        
        this.hideColorPicker();
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
        this.calculateLayout();
        
        this.chart.selectAll('*').remove();
        this.svg.selectAll('.chart-header, .chart-footnotes, .chart-branding').remove();
        
        this.renderTitle();
        this.renderLinks();
        this.renderNodes();
        this.renderLabels();
        this.renderFootnotes();
        this.renderBrandingFooter();
        
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
            const depths = [...new Set(this.nodes.map(n => n.depth))].sort((a, b) => a - b);
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
                this.customColors = {
                    'Total Assets': '#000000',
                    'Current Assets': '#3498DB',
                    'Non-Current Assets': '#9B59B6',
                    'Current Liabilities': '#E74C3C',
                    'Non-Current Liabilities': '#C0392B',
                    'Shareholders Equity': '#27AE60'
                };
                console.log('🎨 Applied default balance sheet colors:', this.customColors);
            } else {
                console.log('🎨 Using default income statement color scheme');
            }
        }
    }

    processData(data) {
        const nodeMap = new Map();
        
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
        
        this.calculateFinancialMetrics();
    }

    calculateFinancialMetrics() {
        const totalRevenueNode = this.nodes.find(n => 
            n.id === 'Total Revenue' || 
            n.category === 'revenue' && n.depth === 1
        );
        
        const totalRevenue = totalRevenueNode ? totalRevenueNode.value : 0;
        
        this.nodes.forEach(node => {
            if (totalRevenue > 0) {
                node.percentageOfRevenue = (node.value / totalRevenue) * 100;
            } else {
                node.percentageOfRevenue = 0;
            }
            
            if (node.category === 'profit') {
                if (node.id.toLowerCase().includes('gross')) {
                    node.marginType = 'Gross Margin';
                    node.marginValue = node.percentageOfRevenue;
                } else if (node.id.toLowerCase().includes('operating')) {
                    node.marginType = 'Operating Margin';
                    node.marginValue = node.percentageOfRevenue;
                } else if (node.id.toLowerCase().includes('net') || node.category === 'income') {
                    node.marginType = 'Net Margin';
                    node.marginValue = node.percentageOfRevenue;
                }
            }
            
            node.isExpenseType = node.category === 'expense';
        });
        
        console.log('📊 Financial metrics calculated');
    }

    calculateLayout() {
        const dimensions = {
            width: this.config.width - this.config.margin.left - this.config.margin.right,
            height: this.config.height - this.config.margin.top - this.config.margin.bottom
        };

        const nodesByDepth = d3.group(this.nodes, d => d.depth);
        const depths = Array.from(nodesByDepth.keys()).sort((a, b) => a - b);
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
        const groupedNodes = this.groupAndSortNodes(nodes);
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
        
        const groups = this.detectNodeGroups(autoNodes);
        console.log(`📊 Detected ${groups.length} groups:`, groups.map(g => `${g.name} (${g.nodes.length} nodes)`));
        
        const totalNodeHeight = autoNodes.reduce((sum, node) => sum + node.height, 0);
        const totalBasePadding = basePadding * (autoNodes.length - 1);
        
        const groupGap = isLeftmost ? this.config.leftmostGroupGap : this.config.rightmostGroupGap;
        const totalGroupGaps = groupGap * (groups.length - 1);
        
        const totalRequired = totalNodeHeight + totalBasePadding + totalGroupGaps;
        
        const startY = Math.max(20, (availableHeight - totalRequired) / 2);
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

    detectNodeGroups(nodes) {
        const groups = [];
        const processedNodes = new Set();
        
        const explicitGroups = new Map();
        nodes.forEach(node => {
            if (node.group && !processedNodes.has(node.id)) {
                if (!explicitGroups.has(node.group)) {
                    explicitGroups.set(node.group, []);
                }
                explicitGroups.get(node.group).push(node);
                processedNodes.add(node.id);
            }
        });
        
        explicitGroups.forEach((groupNodes, groupName) => {
            groups.push({
                name: groupName,
                nodes: groupNodes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            });
        });
        
        const remainingNodes = nodes.filter(node => !processedNodes.has(node.id));
        
        if (remainingNodes.length > 0) {
            const patternGroups = this.detectPatternGroups(remainingNodes);
            groups.push(...patternGroups);
            
            patternGroups.forEach(group => {
                group.nodes.forEach(node => processedNodes.add(node.id));
            });
        }
        
        const ungroupedNodes = nodes.filter(node => !processedNodes.has(node.id));
        ungroupedNodes.forEach(node => {
            groups.push({
                name: `Individual: ${node.id}`,
                nodes: [node]
            });
        });
        
        return groups;
    }

    detectPatternGroups(nodes) {
        const groups = [];
        const processedNodes = new Set();
        
        const prefixGroups = new Map();
        
        nodes.forEach(node => {
            if (processedNodes.has(node.id)) return;
            
            const words = node.id.toLowerCase().split(/[\s\-_]+/);
            const firstWord = words[0];
            
            if (firstWord.length > 3) {
                const samePrefix = nodes.filter(n => 
                    !processedNodes.has(n.id) && 
                    n.id.toLowerCase().startsWith(firstWord)
                );
                
                if (samePrefix.length > 1) {
                    const groupName = firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
                    prefixGroups.set(groupName, samePrefix);
                    samePrefix.forEach(n => processedNodes.add(n.id));
                }
            }
        });
        
        prefixGroups.forEach((groupNodes, groupName) => {
            groups.push({
                name: groupName,
                nodes: groupNodes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            });
        });
        
        const remainingNodes = nodes.filter(node => !processedNodes.has(node.id));
        
        if (remainingNodes.length > 1) {
            const categoryGroups = new Map();
            
            remainingNodes.forEach(node => {
                const category = node.category || 'Other';
                if (!categoryGroups.has(category)) {
                    categoryGroups.set(category, []);
                }
                categoryGroups.get(category).push(node);
            });
            
            categoryGroups.forEach((groupNodes, category) => {
                if (groupNodes.length > 1) {
                    groups.push({
                        name: `${category.charAt(0).toUpperCase() + category.slice(1)} Group`,
                        nodes: groupNodes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                    });
                    groupNodes.forEach(n => processedNodes.add(n.id));
                }
            });
        }
        
        return groups;
    }

    positionNodesStandard(nodes, availableHeight, layerPadding) {
        const nodesToPosition = nodes.filter(node => !node.manuallyPositioned);
        const manualNodes = nodes.filter(node => node.manuallyPositioned);
        
        if (nodesToPosition.length === 0) return;
        
        const totalHeight = d3.sum(nodesToPosition, d => d.height);
        const totalPadding = layerPadding * (nodesToPosition.length - 1);
        const totalRequired = totalHeight + totalPadding;
        
        const startY = Math.max(20, (availableHeight - totalRequired) / 2);
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
        const depths = Array.from(nodesByDepth.keys()).sort((a, b) => a - b);
        
        for (let iteration = 0; iteration < 4; iteration++) {
            for (let i = 1; i < depths.length; i++) {
                const currentDepth = depths[i];
                const nodes = nodesByDepth.get(currentDepth);
                this.sortNodesByBarycenter(nodes, 'target');
            }
            
            for (let i = depths.length - 2; i >= 0; i--) {
                const currentDepth = depths[i];
                const nodes = nodesByDepth.get(currentDepth);
                this.sortNodesByBarycenter(nodes, 'source');
            }
        }
        
        depths.forEach(depth => {
            const nodesAtDepth = nodesByDepth.get(depth);
            this.recalculateYPositions(nodesAtDepth);
        });
    }

    sortNodesByBarycenter(nodes, direction) {
        nodes.forEach(node => {
            const links = direction === 'source' ? node.sourceLinks : node.targetLinks;
            
            if (links.length === 0) {
                node.barycenter = node.y + node.height / 2;
                return;
            }
            
            let weightedSum = 0;
            let totalWeight = 0;
            
            links.forEach(link => {
                const connectedNode = direction === 'source' ? link.target : link.source;
                const weight = link.value;
                const position = connectedNode.y + connectedNode.height / 2;
                
                weightedSum += position * weight;
                totalWeight += weight;
            });
            
            node.barycenter = totalWeight > 0 ? weightedSum / totalWeight : node.y + node.height / 2;
        });
        
        nodes.sort((a, b) => {
            const groupDiff = (a.group || 'z').localeCompare(b.group || 'z');
            if (Math.abs(a.barycenter - b.barycenter) < 20 && groupDiff !== 0) {
                return groupDiff;
            }
            return a.barycenter - b.barycenter;
        });
    }

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
            const groups = this.detectNodeGroups(autoNodes);
            if (groups.length > 1) {
                this.positionNodesWithGroupSpacing(autoNodes, availableHeight, layerPadding, isLeftmost, isRightmost);
                return;
            }
        }
        
        const totalHeight = d3.sum(autoNodes, d => d.height);
        const totalPadding = layerPadding * (autoNodes.length - 1);
        const totalRequired = totalHeight + totalPadding;
        
        const startY = Math.max(20, (availableHeight - totalRequired) / 2);
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

    groupAndSortNodes(nodes) {
        const depth = nodes[0]?.depth;
        
        if (depth === 4) {
            return this.sortFinalLayerBySource(nodes);
        }
        
        const groups = new Map();
        
        nodes.forEach(node => {
            const group = node.group || 'default';
            if (!groups.has(group)) {
                groups.set(group, []);
            }
            groups.get(group).push(node);
        });

        const groupOrder = [
            'revenue_sources',      
            'aggregated_revenue',   
            'gross_metrics',        
            'operating_metrics',    
            'final_results',        
            'operating_expenses',   
            'final_adjustments',    
            'default'               
        ];

        const sortedNodes = [];
        
        groupOrder.forEach(groupName => {
            if (groups.has(groupName)) {
                const groupNodes = groups.get(groupName);
                
                groupNodes.sort((a, b) => {
                    if (a.sort_order !== undefined && b.sort_order !== undefined) {
                        return a.sort_order - b.sort_order;
                    }
                    
                    const categoryPriority = this.getCategoryPriority(a.category, b.category, groupName);
                    if (categoryPriority !== 0) {
                        return categoryPriority;
                    }
                    
                    return a.value - b.value;
                });
                
                sortedNodes.push(...groupNodes);
            }
        });

        const processedGroups = new Set(groupOrder);
        groups.forEach((groupNodes, groupName) => {
            if (!processedGroups.has(groupName)) {
                groupNodes.sort((a, b) => a.value - b.value);
                sortedNodes.push(...groupNodes);
            }
        });
        
        return sortedNodes;
    }

    sortFinalLayerBySource(nodes) {
        const sourceGroups = new Map();
        
        nodes.forEach(node => {
            let sourceParent = 'unknown';
            let sourceNode = null;
            
            this.links.forEach(link => {
                if (link.target.id === node.id) {
                    sourceParent = link.source.id;
                    sourceNode = link.source;
                }
            });
            
            if (!sourceGroups.has(sourceParent)) {
                sourceGroups.set(sourceParent, { nodes: [], sourceNode: sourceNode });
            }
            sourceGroups.get(sourceParent).nodes.push(node);
        });
        
        const sortedSourceGroups = Array.from(sourceGroups.entries())
            .sort((a, b) => {
                const aSourceY = a[1].sourceNode?.y || 0;
                const bSourceY = b[1].sourceNode?.y || 0;
                return aSourceY - bSourceY;
            });
        
        const sortedNodes = [];
        
        sortedSourceGroups.forEach(([sourceName, groupData]) => {
            const sourceNodes = groupData.nodes;
            sourceNodes.sort((a, b) => b.value - a.value);
            sortedNodes.push(...sourceNodes);
        });
        
        return sortedNodes;
    }

    calculateLinkPositions() {
        this.links.forEach(link => {
            link.width = link.value * this.config.linkWidthScale;
        });
        
        this.nodes.forEach(node => {
            if (node.sourceLinks.length === 0) return;
            
            node.sourceLinks.sort((a, b) => a.target.y - b.target.y);
            
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
            
            node.targetLinks.sort((a, b) => a.source.y - b.source.y);
            
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

        const logoUrl = this.data?.metadata?.logoUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiByeD0iNCIgZmlsbD0iIzY2N2VlYSIvPgo8dGV4dCB4PSIxMCIgeT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iYm9sZCI+UDwvdGV4dD4KPC9zdmc+';
        
        footerGroup.append('image')
            .attr('x', 20)
            .attr('y', -40)
            .attr('width', 24)
            .attr('height', 24)
            .attr('href', logoUrl)
            .attr('opacity', 0.8);

        footerGroup.append('text')
            .attr('x', 50)
            .attr('y', -25)
            .attr('font-size', '16px')
            .attr('font-weight', '800')
            .attr('font-family', this.getFontFamily())
            .attr('fill', '#667eea')
            .text('PULSE ANALYTICS');

        footerGroup.append('text')
            .attr('x', this.config.width - 20)
            .attr('y', -25)
            .attr('text-anchor', 'end')
            .attr('font-size', '16px')
            .attr('font-weight', '800')
            .attr('font-family', this.getFontFamily())
            .attr('fill', '#667eea')
            .attr('opacity', 0.7)
            .text('Generated by Pulse Chart');
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
                self.chart.selectAll('.node-label, .node-value').remove();
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

    renderLeftmostLabels(node) {
        const labelDistance = this.config.labelDistance.leftmost;
        const valueDistance = this.getValueDistance('general');
        const wrappedText = this.wrapText(node.id, 15);
        const nodeColor = this.statementType === 'balance' ? this.getHierarchicalColor(node.id) : this.getNodeColor(node);
        
        const labelGroup = this.chart.append('g')
            .attr('class', 'node-label')
            .attr('transform', `translate(${node.x - labelDistance}, ${node.y + node.height/2})`);

        wrappedText.forEach((line, index) => {
            labelGroup.append('text')
                .attr('text-anchor', 'end')
                .attr('dominant-baseline', 'middle')
                .attr('y', (index - (wrappedText.length - 1) / 2) * 14)
                .attr('font-size', '12px')
                .attr('font-weight', '600')
                .attr('font-family', this.getFontFamily())
                .attr('fill', nodeColor)
                .text(line);
        });

        const valueGroup = this.chart.append('g')
            .attr('class', 'node-value')
            .attr('transform', `translate(${node.x + this.config.nodeWidth/2}, ${node.y - valueDistance - 2})`);

        valueGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'alphabetic')
            .attr('font-size', '11px')
            .attr('font-weight', '500')
            .attr('font-family', this.getFontFamily())
            .attr('fill', nodeColor)
            .text(this.formatCurrency(node.value, node));
    }

    renderRightmostLabels(node) {
        const labelDistance = this.config.labelDistance.rightmost;
        const valueDistance = this.getValueDistance('general');
        const wrappedText = this.wrapText(node.id, 15);
        const nodeColor = this.statementType === 'balance' ? this.getHierarchicalColor(node.id) : this.getNodeColor(node);
        
        const labelGroup = this.chart.append('g')
            .attr('class', 'node-label')
            .attr('transform', `translate(${node.x + this.config.nodeWidth + labelDistance}, ${node.y + node.height/2})`);

        wrappedText.forEach((line, index) => {
            labelGroup.append('text')
                .attr('text-anchor', 'start')
                .attr('dominant-baseline', 'middle')
                .attr('y', (index - (wrappedText.length - 1) / 2) * 14)
                .attr('font-size', '12px')
                .attr('font-weight', '600')
                .attr('font-family', this.getFontFamily())
                .attr('fill', nodeColor)
                .text(line);
        });

        const valueGroup = this.chart.append('g')
            .attr('class', 'node-value')
            .attr('transform', `translate(${node.x + this.config.nodeWidth/2}, ${node.y - valueDistance - 2})`);

        valueGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'alphabetic')
            .attr('font-size', '11px')
            .attr('font-weight', '500')
            .attr('font-family', this.getFontFamily())
            .attr('fill', nodeColor)
            .text(this.formatCurrency(node.value, node));
    }

    renderMiddleLabels(node) {
        const labelDistance = this.config.labelDistance.middle;
        const wrappedText = this.wrapText(node.id, 18);
        const nodeColor = this.statementType === 'balance' ? this.getHierarchicalColor(node.id) : this.getNodeColor(node);
        
        let isTopNode;
        if (node.manuallyPositioned) {
            isTopNode = node.preserveLabelsAbove === true;
        } else {
            isTopNode = node.layerIndex === 0;
        }
        
        if (isTopNode) {
            this.renderMiddleLabelsAbove(node, labelDistance, wrappedText, nodeColor);
        } else {
            this.renderMiddleLabelsBelow(node, labelDistance, wrappedText, nodeColor);
        }
    }

    renderMiddleLabelsAbove(node, labelDistance, wrappedText, nodeColor) {
        const valueDistance = this.getValueDistance('middle');
        
        const labelGroup = this.chart.append('g')
            .attr('class', 'node-label')
            .attr('transform', `translate(${node.x + this.config.nodeWidth/2}, ${node.y - labelDistance})`);

        wrappedText.forEach((line, index) => {
            labelGroup.append('text')
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'alphabetic')
                .attr('y', index * 14)
                .attr('font-size', '12px')
                .attr('font-weight', '600')
                .attr('font-family', this.getFontFamily())
                .attr('fill', nodeColor)
                .text(line);
        });

        const valueGroup = this.chart.append('g')
            .attr('class', 'node-value')
            .attr('transform', `translate(${node.x + this.config.nodeWidth/2}, ${node.y - valueDistance - 2})`);

        valueGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'alphabetic')
            .attr('y', 0)
            .attr('font-size', '11px')
            .attr('font-weight', '500')
            .attr('font-family', this.getFontFamily())
            .attr('fill', nodeColor)
            .text(this.formatCurrency(node.value, node));
    }

    renderMiddleLabelsBelow(node, labelDistance, wrappedText, nodeColor) {
        const valueDistance = this.getValueDistance('middle');
        
        const valueGroup = this.chart.append('g')
            .attr('class', 'node-value')
            .attr('transform', `translate(${node.x + this.config.nodeWidth/2}, ${node.y + node.height + valueDistance + 11})`);

        valueGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'alphabetic')
            .attr('y', 0)
            .attr('font-size', '11px')
            .attr('font-weight', '500')
            .attr('font-family', this.getFontFamily())
            .attr('fill', nodeColor)
            .text(this.formatCurrency(node.value, node));

        const labelGroup = this.chart.append('g')
            .attr('class', 'node-label')
            .attr('transform', `translate(${node.x + this.config.nodeWidth/2}, ${node.y + node.height + labelDistance})`);

        wrappedText.forEach((line, index) => {
            labelGroup.append('text')
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'hanging')
                .attr('y', index * 14)
                .attr('font-size', '12px')
                .attr('font-weight', '600')
                .attr('font-family', this.getFontFamily())
                .attr('fill', nodeColor)
                .text(line);
        });
    }

    wrapText(text, maxLength = 15) {
        if (text.length <= maxLength) return [text];
        
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        words.forEach(word => {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            
            if (testLine.length <= maxLength) {
                currentLine = testLine;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    lines.push(word);
                }
            }
        });
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
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
        
        if (node) {
            if (node.marginType && node.marginValue) {
                formattedValue += ` | ${node.marginValue.toFixed(1)}%`;
            } else if (node.percentageOfRevenue && node.percentageOfRevenue > 0 && 
                      (node.category === 'revenue' || node.category === 'expense' || node.isExpenseType)) {
                formattedValue += ` | ${node.percentageOfRevenue.toFixed(1)}%`;
            }
        }
        
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
            // Use default revenue segment color palette instead of falling back to category color
            const defaultSegmentColors = [
                '#3498db', '#2980b9', '#5dade2', '#85c1e9', '#aed6f1', 
                '#d5e8f3', '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'
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
        
        const defaultColors = {
            revenue: '#3498db',
            profit: '#27ae60',
            expense: '#e67e22'
        };
        return defaultColors[node.category] || '#95a5a6';
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
            return this.lightenColor(sourceColor, 15);
        }
        
        // Existing logic: Post-revenue links use TARGET color
        const targetCategory = link.colorCategory || link.targetCategory || link.target.category;
        
        let effectiveCategory = targetCategory;
        if (targetCategory === 'tax') {
            effectiveCategory = 'expense';
        }
        
        const targetColor = this.getColorByCategory(effectiveCategory);
        return this.lightenColor(targetColor, 15);
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
            return this.hexToRgba(baseColor, 0.65);
        }
    }

    getColorByCategory(category) {
        if (this.customColors && this.customColors[category]) {
            return this.customColors[category];
        }
        
        const defaultColors = {
            revenue: '#3498db',
            profit: '#27ae60',
            expense: '#e67e22'
        };
        
        return defaultColors[category] || '#95a5a6';
    }

    lightenColor(hex, percent) {
        const num = parseInt(hex.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    // Balance sheet specific methods
    detectStatementType(data) {
        if (!data || !data.nodes) {
            this.statementType = 'income';
            return;
        }

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
        
        const balanceSheetColors = {
            'Total Assets': this.customColors['Total Assets'] || '#2C3E50',
            'Current Assets': this.customColors['Current Assets'] || '#3498DB',
            'Non-Current Assets': this.customColors['Non-Current Assets'] || '#9B59B6',
            'Current Liabilities': this.customColors['Current Liabilities'] || '#E74C3C',
            'Non-Current Liabilities': this.customColors['Non-Current Liabilities'] || '#C0392B',
            'Shareholders Equity': this.customColors['Shareholders Equity'] || '#27AE60'
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
                return this.hexToRgba(baseColor, 0.65);
            }
        }
        
        return this.hexToRgba(baseColor, opacity);
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

    hexToRgba(hex, opacity) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return hex;
        
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
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
        this.chart.selectAll('.node-label, .node-value').remove();
        this.renderLabels();
        
        console.log('🔄 Re-rendered chart with new colors');
    }

    // Tooltip methods
    showNodeTooltip(event, d) {
        const percentageText = d.percentageOfRevenue ? 
            `${d.percentageOfRevenue.toFixed(1)}% of revenue` : '';
        
        const marginText = d.marginType && d.marginValue ? 
            `${d.marginType}: ${d.marginValue.toFixed(1)}%` : '';
        
        const colorableText = '<div style="font-size: 11px; color: rgba(255,255,255,0.8); margin-top: 4px;">💡 Double-click to change color</div>';
        
        const content = `
            <div style="font-weight: 700; margin-bottom: 8px; font-size: 14px;">${d.id}</div>
            <div style="font-size: 16px; color: #3b82f6; margin-bottom: 8px; font-weight: 600;">
                ${this.formatCurrency(d.value, d)}
            </div>
            ${percentageText ? `<div style="font-size: 12px; color: rgba(255,255,255,0.9); margin-bottom: 4px;">${percentageText}</div>` : ''}
            ${marginText ? `<div style="font-size: 12px; color: rgba(255,255,255,0.9); margin-bottom: 4px;">${marginText}</div>` : ''}
            <div style="font-size: 11px; color: rgba(255,255,255,0.8); line-height: 1.4;">
                ${d.description || 'Financial component'}
            </div>
            ${colorableText}
        `;
        
        this.tooltip
            .html(content)
            .style('left', (event.pageX) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .style('opacity', 1);
    }

    showLinkTooltip(event, d) {
        const percentage = d.source.value > 0 ? 
            ((d.value / d.source.value) * 100).toFixed(1) : '0';

        const coloringInfo = this.isPreRevenueLink(d) ? 
            'source (revenue segment)' : 'target';
            
        const content = `
            <div style="font-weight: 700; margin-bottom: 8px; font-size: 14px;">
                ${d.source.id} → ${d.target.id}
            </div>
            <div style="font-size: 16px; color: #3b82f6; margin-bottom: 8px; font-weight: 600;">
                ${this.formatCurrency(d.value, d.target)}
            </div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.8);">
                ${percentage}% of source flow<br>
                <em>Colored by ${coloringInfo}</em>
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
        this.chart.selectAll('.node-label, .node-value').remove();
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
            this.chart.selectAll('.node-label, .node-value').remove();
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
        const labelKeys = ['labelDistance', 'valueDistance'];
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
        const metadata = this.data?.metadata || {};
        
        let company = metadata.company || metadata.title || 'Chart';
        company = company.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
        
        let period = metadata.period || 'Period';
        period = period.replace(/[^a-zA-Z0-9\-]/g, '').substring(0, 10);
        
        const now = new Date();
        const timestamp = now.getFullYear().toString() +
                         (now.getMonth() + 1).toString().padStart(2, '0') +
                         now.getDate().toString().padStart(2, '0') + '-' +
                         now.getHours().toString().padStart(2, '0') +
                         now.getMinutes().toString().padStart(2, '0');
        
        return `${company}_${period}_${timestamp}.${extension}`;
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
                        'Current Liabilities': '#E74C3C',
                        'Non-Current Liabilities': '#C0392B',
                        'Shareholders Equity': '#27AE60'
                    };
                } else {
                    defaultColors = {
                        'revenue': '#3498db',
                        'profit': '#27ae60',
                        'expense': '#e67e22'
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
                const professionalColors = ['#2c3e50', '#95a5a6', '#27ae60', '#e67e22', '#3498db'];
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
                    description: `Source: ${flow.description}`,
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
                    description: `Target: ${flow.description}`,
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

    // Export methods using ExportUtils for consistency across all charts
    exportToPNG() {
        const filename = this.generateFileName('png');
        const options = {
            scale: 2,
            quality: 0.95,
            backgroundColor: this.config.backgroundColor // Match the chart background
        };
        
        if (window.ExportUtils) {
            window.ExportUtils.exportToPNG(this.svg, filename, options);
        } else {
            console.error('ExportUtils not loaded');
            alert('Export functionality not available. Please ensure ExportUtils.js is loaded.');
        }
    }

    exportToSVG() {
        const filename = this.generateFileName('svg');
        const options = {
            includeStyles: true,
            backgroundColor: this.config.backgroundColor // Match the chart background
        };
        
        if (window.ExportUtils) {
            window.ExportUtils.exportToSVG(this.svg, filename, options);
        } else {
            console.error('ExportUtils not loaded');
            alert('Export functionality not available. Please ensure ExportUtils.js is loaded.');
        }
    }

    exportDataToCSV(data) {
        const filename = this.generateFileName('csv');
        const options = {
            includeHeaders: true,
            includeMetadata: true
        };
        
        if (window.ExportUtils) {
            window.ExportUtils.exportDataToCSV(data, filename, options);
        } else {
            console.error('ExportUtils not loaded');
            alert('Export functionality not available. Please ensure ExportUtils.js is loaded.');
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PulseSankeyChart;
}