/* ===== SANKEY CHART CONTROLS - ENHANCED WITH BALANCE SHEET SUPPORT ===== */
/* Enhanced with statement-specific color detection and Total Assets control */

class SankeyControlModule {
    constructor() {
        this.capabilities = this.defineCapabilities();
        this.chart = null; // Reference to current chart
    }

    defineCapabilities() {
        const capabilities = {
            layout: {
                title: "Layout & Positioning",
                icon: "⚖️",
                collapsed: true,
                controls: [
                    { 
                        id: "nodeWidth", 
                        type: "slider", 
                        label: "Node Width", 
                        min: 10, 
                        max: 60, 
                        default: 35, 
                        step: 1, 
                        unit: "px", 
                        description: "Width of the flow nodes" 
                    },
                    { 
                        id: "nodePadding", 
                        type: "slider", 
                        label: "Base Node Spacing", 
                        min: 40, 
                        max: 80, 
                        default: 50, 
                        step: 5, 
                        unit: "px", 
                        description: "Foundational vertical spacing between nodes" 
                    },
                    
                    // Labels & Values controls (moved from display section)
                    { 
                        id: "textDistanceLeftmost", 
                        type: "slider", 
                        label: "Leftmost Text Distance", 
                        min: 1, 
                        max: 40, 
                        default: 15, 
                        step: 1, 
                        unit: "px", 
                        description: "Distance of all text (labels, values, percentages) from leftmost nodes" 
                    },
                    { 
                        id: "textDistanceMiddle", 
                        type: "slider", 
                        label: "Middle Text Distance", 
                        min: 1, 
                        max: 40, 
                        default: 1, 
                        step: 1, 
                        unit: "px", 
                        description: "Distance of all text (labels, values, percentages) from middle nodes" 
                    },
                    { 
                        id: "textDistanceRightmost", 
                        type: "slider", 
                        label: "Rightmost Text Distance", 
                        min: 1, 
                        max: 40, 
                        default: 15, 
                        step: 1, 
                        unit: "px", 
                        description: "Distance of all text (labels, values, percentages) from rightmost nodes" 
                    }
                ]
            },
            

            // Visual appearance controls
            appearance: {
                title: "Visual Appearance",
                icon: "🎨",
                collapsed: true,
                controls: [
                    {
                        id: "backgroundColor",
                        type: "color_picker",
                        label: "Background Color",
                        default: window.GlobalChartConfig ? window.GlobalChartConfig.getGlobalBackgroundColor() : "#faf9f0"
                    },
                    {
                        id: "titleFont",
                        type: "dropdown",
                        label: "Font",
                        default: "Inter",
                        options: [
                            { value: "Inter", label: "Inter (Modern)" },
                            { value: "Roboto", label: "Roboto (Clean)" },
                            { value: "Open Sans", label: "Open Sans (Friendly)" },
                            { value: "Lato", label: "Lato (Professional)" },
                            { value: "Montserrat", label: "Montserrat (Bold)" },
                            { value: "Poppins", label: "Poppins (Rounded)" },
                            { value: "Source Sans Pro", label: "Source Sans Pro (Technical)" },
                            { value: "Nunito", label: "Nunito (Soft)" },
                            { value: "Trebuchet MS", label: "Trebuchet MS (Classic)" },
                            { value: "system-ui", label: "System Default" }
                        ],
                        description: "Font family for all chart text"
                    },
                    {
                        id: "titleSize",
                        type: "slider",
                        label: "Title Size",
                        min: 14,
                        max: 50,
                        default: 40,
                        step: 1,
                        description: "Size of the chart title"
                    },
                    {
                        id: "titleColor",
                        type: "color_picker",
                        label: "Title Color",
                        default: "#1f2937",
                        description: "Color of the chart title"
                    },
                    {
                        id: "globalFontSize",
                        type: "slider",
                        label: "Label/Value Font Size",
                        min: 8,
                        max: 18,
                        default: 12,
                        step: 1,
                        description: "Adjust the size of chart labels and values (excludes title)"
                    }
                ]
            },


            categoryManagement: {
                title: "",
                icon: "",
                collapsed: false,
                controls: [
                    {
                        id: "bulkAssignment",
                        type: "button",
                        label: "Bulk Category Assignment",
                        action: this.openBulkAssignmentModal.bind(this)
                    }
                ]
            },

            dimensions: {
                title: "Node & Link Dimensions",
                icon: "📏",
                collapsed: true,
                controls: [
                    { 
                        id: "nodeHeightScale", 
                        type: "slider", 
                        label: "Node Height Scale", 
                        min: 0, 
                        max: 100, 
                        default: 50, 
                        step: 1, 
                        description: "Scale factor for node heights - intuitive percentage-based control" 
                    },
                    { 
                        id: "linkWidthScale", 
                        type: "slider", 
                        label: "Flow Width Scale", 
                        min: 0.3, 
                        max: 1.0, 
                        default: 1, 
                        step: 0.05, 
                        description: "Scale factor for flow widths" 
                    }
                ]
            },
            
            styling: {
                title: "Visual Style",
                icon: "✨",
                collapsed: true,
                controls: [
                    { 
                        id: "curveIntensity", 
                        type: "slider", 
                        label: "Curve Intensity", 
                        min: 0.1, 
                        max: 0.8, 
                        default: 0.3, 
                        step: 0.05, 
                        description: "How curved the flow connections are" 
                    },
                    { 
                        id: "nodeOpacity", 
                        type: "slider", 
                        label: "Node Opacity", 
                        min: 0.5, 
                        max: 1.0, 
                        default: 1, 
                        step: 0.05, 
                        description: "Transparency of node rectangles" 
                    },
                    { 
                        id: "linkOpacity", 
                        type: "slider", 
                        label: "Flow Opacity", 
                        min: 0.3, 
                        max: 1.0, 
                        default: 0.65, 
                        step: 0.05, 
                        description: "Transparency of flow connections" 
                    }
                ]
            },
            
            
            branding: {
                title: "Company Branding",
                icon: "🏢",
                collapsed: true,
                controls: [
                    {
                        id: "brandUpload",
                        type: "file_upload",
                        label: "Company Logo",
                        accept: "image/*",
                        description: "Upload company logo (PNG, JPG, GIF, SVG)",
                        maxSize: "2MB"
                    },
                    {
                        id: "clearBrand",
                        type: "button",
                        label: "🗑️ Clear Logo",
                        action: "clearBrand",
                        description: "Remove company logo from chart"
                    }
                ]
            }
        };
        
        return capabilities;
    }














    /**
     * ENHANCED: Control change handler with balance sheet group awareness
     */
    handleControlChange(controlId, value, chart) {
        // Title control changes handled with ChartTitleManager

        // Handle backgroundColor specially
        if (controlId === 'backgroundColor') {
            chart.updateConfig({ backgroundColor: value });
            return;
        }

        // Handle titleFont specially - use ChartTitleManager
        if (controlId === 'titleFont') {
            if (window.ChartTitleManager) {
                window.ChartTitleManager.updateFont(chart, value);
            } else {
                chart.updateConfig({ titleFont: value });
            }
            return;
        }

        // Handle titleSize specially - use ChartTitleManager
        if (controlId === 'titleSize') {
            if (window.ChartTitleManager) {
                window.ChartTitleManager.updateSize(chart, value);
            } else {
                chart.updateConfig({ titleSize: value });
            }
            return;
        }

        // Handle titleColor specially - use ChartTitleManager
        if (controlId === 'titleColor') {
            if (window.ChartTitleManager) {
                window.ChartTitleManager.updateColor(chart, value);
            } else {
                chart.updateConfig({ titleColor: value });
            }
            return;
        }

        // Handle globalFontSize specially - direct update like titleSize to avoid re-renders
        if (controlId === 'globalFontSize') {
            // Update the config directly
            chart.config.globalFontSize = value;
            
            // Update existing labels directly without triggering updateConfig
            if (chart.chart) {
                // Update all text elements in node-text-group
                chart.chart.selectAll('.node-text-group text')
                    .transition()
                    .duration(200)
                    .attr('font-size', function() {
                        // Determine the base size based on text content position
                        const element = d3.select(this);
                        const y = parseFloat(element.attr('y'));
                        
                        // Based on the renderLabels logic: labels are at negative y, values at positive y
                        const baseSize = (y < 0) ? 12 : 11; // Labels are 12px, values are 11px
                        
                        // Use chart's getFontSize method for consistent scaling
                        return chart.getFontSize(baseSize) + 'px';
                    });
            }
            
            return;
        }

        // Remove individual node color controls - all nodes use category-based colors



        // Handle opacity controls with immediate visual feedback
        if (controlId === 'nodeOpacity') {
            chart.config.nodeOpacity = value;
            
            // Debug: Check if chart and nodes exist
            if (!chart.chart) {
                return;
            }
            
            const nodeSelection = chart.chart.selectAll('.sankey-node rect');
            
            // For Income Statement charts, apply opacity directly
            // For Balance Sheet charts, use the hierarchical opacity method
            if (chart.statementType === 'balance') {
                nodeSelection
                    .transition()
                    .duration(150)
                    .attr('fill-opacity', d => chart.getNodeOpacity ? chart.getNodeOpacity(d) : value)
                    .style('opacity', d => chart.getNodeOpacity ? chart.getNodeOpacity(d) : value);
            } else {
                // Income Statement - apply opacity directly to all nodes
                nodeSelection
                    .transition()
                    .duration(150)
                    .attr('fill-opacity', value)
                    .style('opacity', value);
            }
            
            return;
        }

        if (controlId === 'linkOpacity') {
            chart.config.linkOpacity = value;
            
            const linkSelection = chart.chart.selectAll('.sankey-link path');
            
            linkSelection
                .transition()
                .duration(150)
                .attr('fill-opacity', d => chart.getLinkOpacity ? chart.getLinkOpacity(d) : value);
                
            return;
        }

        // Handle nodePadding specially - direct DOM update without re-render
        if (controlId === 'nodePadding') {
            chart.config.nodePadding = value;
            
            // For nodePadding changes, we need to adjust node positions but preserve colors
            // This is a layout change that requires repositioning but preserves user customizations
            if (chart.chart && chart.nodes) {
                // Store current manual positions to preserve them
                const manualPositions = new Map();
                chart.nodes.forEach(node => {
                    if (node.manuallyPositioned) {
                        manualPositions.set(node.id, { x: node.x, y: node.y });
                    }
                });
                
                // Update node padding and re-layout nodes within each depth
                chart.nodes.forEach(node => {
                    // Only auto-adjust non-manually positioned nodes
                    if (!node.manuallyPositioned) {
                        // Calculate new Y position based on updated padding
                        const nodesAtSameDepth = chart.nodes.filter(n => n.depth === node.depth && !n.manuallyPositioned);
                        const nodeIndex = nodesAtSameDepth.findIndex(n => n.id === node.id);
                        if (nodeIndex >= 0) {
                            // Simple vertical redistribution with new padding
                            const totalHeight = chart.config.height - chart.config.margin.top - chart.config.margin.bottom;
                            const spacingBetweenNodes = value;
                            const startY = chart.config.margin.top + (totalHeight - (nodesAtSameDepth.length * node.height + (nodesAtSameDepth.length - 1) * spacingBetweenNodes)) / 2;
                            node.y = startY + nodeIndex * (node.height + spacingBetweenNodes);
                        }
                    }
                });
                
                // Restore manual positions
                manualPositions.forEach((pos, nodeId) => {
                    const node = chart.nodes.find(n => n.id === nodeId);
                    if (node) {
                        node.x = pos.x;
                        node.y = pos.y;
                    }
                });
                
                // Recalculate ALL link positioning properties based on new node positions
                chart.calculateLinkPositions();
                
                // Update all visual elements instantly - NO TRANSITIONS
                chart.chart.selectAll('.sankey-node')
                    .attr('transform', d => `translate(${d.x}, ${d.y})`);
                
                chart.chart.selectAll('.sankey-link path')
                    .attr('d', d => chart.createSmoothPath(d, chart.config.curveIntensity));
                
                chart.chart.selectAll('.node-text-group')
                    .attr('transform', function() {
                        const nodeId = d3.select(this).attr('data-node-id');
                        const node = chart.nodes.find(n => n.id === nodeId);
                        if (node) {
                            // Extract current X position and update Y to new center
                            const currentTransform = d3.select(this).attr('transform');
                            const translateMatch = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
                            if (translateMatch) {
                                const x = parseFloat(translateMatch[1]);
                                return `translate(${x}, ${node.y + node.height/2})`;
                            }
                        }
                        return d3.select(this).attr('transform');
                    });
            }
            
            return;
        }

        // Handle leftmostGroupGap and rightmostGroupGap with direct updates
        if (controlId === 'leftmostGroupGap' || controlId === 'rightmostGroupGap') {
            chart.config[controlId] = value;
            
            // For spacing changes, we need to update positions but not trigger full render
            // This is a layout change that requires repositioning but preserves colors
            if (chart.chart && chart.nodes) {
                // Update node positions based on new gap settings
                chart.nodes.forEach(node => {
                    if (!node.manuallyPositioned) {
                        // Recalculate horizontal positions with new gaps
                        const maxDepth = Math.max(...chart.nodes.map(n => n.depth));
                        const availableWidth = chart.config.width - chart.config.margin.left - chart.config.margin.right;
                        const leftGap = chart.config.leftmostGroupGap || 0;
                        const rightGap = chart.config.rightmostGroupGap || 0;
                        const workingWidth = availableWidth - leftGap - rightGap;
                        
                        if (maxDepth > 0) {
                            const horizontalSpacing = workingWidth / maxDepth;
                            node.x = chart.config.margin.left + leftGap + (node.depth * horizontalSpacing);
                        }
                    }
                });
                
                // Update visual positions
                chart.chart.selectAll('.sankey-node')
                    .transition()
                    .duration(200)
                    .attr('transform', d => `translate(${d.x}, ${d.y})`);
                
                // Update link paths
                chart.chart.selectAll('.sankey-link path')
                    .transition()
                    .duration(200)
                    .attr('d', d => chart.createSmoothPath(d, chart.config.curveIntensity));
                
                // Update text positions
                chart.chart.selectAll('.node-text-group')
                    .transition()
                    .duration(200)
                    .attr('transform', function() {
                        const nodeId = d3.select(this).attr('data-node-id');
                        const node = chart.nodes.find(n => n.id === nodeId);
                        if (node) {
                            const currentTransform = d3.select(this).attr('transform');
                            const translateMatch = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
                            if (translateMatch) {
                                const currentY = parseFloat(translateMatch[2]);
                                return `translate(${node.x + node.width/2}, ${currentY})`;
                            }
                        }
                        return d3.select(this).attr('transform');
                    });
            }
            
            return;
        }

        // Handle textDistanceLeftmost with direct DOM updates - no re-render
        if (controlId === 'textDistanceLeftmost') {
            
            // Update config
            const textDistance = chart.config.textDistance || {};
            textDistance.leftmost = value;
            chart.config.textDistance = textDistance;
            
            // Update existing leftmost text groups directly
            if (chart.chart) {
                chart.chart.selectAll('.node-text-group')
                    .filter(function() {
                        const nodeId = d3.select(this).attr('data-node-id');
                        const node = chart.nodes.find(n => n.id === nodeId);
                        return node && node.depth === 0; // leftmost nodes
                    })
                    .transition()
                    .duration(200)
                    .attr('transform', function() {
                        const nodeId = d3.select(this).attr('data-node-id');
                        const node = chart.nodes.find(n => n.id === nodeId);
                        if (node) {
                            return `translate(${node.x - value}, ${node.y + node.height/2})`;
                        }
                        return d3.select(this).attr('transform');
                    });
            }
            
            return;
        }
        
        // Handle textDistanceMiddle with direct DOM updates - no re-render
        if (controlId === 'textDistanceMiddle') {
            
            // Update config
            const textDistance = chart.config.textDistance || {};
            textDistance.middle = value;
            chart.config.textDistance = textDistance;
            
            // Update existing middle text groups directly
            if (chart.chart) {
                const maxDepth = Math.max(...chart.nodes.map(n => n.depth));
                
                chart.chart.selectAll('.node-text-group')
                    .filter(function() {
                        const nodeId = d3.select(this).attr('data-node-id');
                        const node = chart.nodes.find(n => n.id === nodeId);
                        return node && node.depth > 0 && node.depth < maxDepth; // middle nodes
                    })
                    .transition()
                    .duration(200)
                    .attr('transform', function() {
                        const nodeId = d3.select(this).attr('data-node-id');
                        const node = chart.nodes.find(n => n.id === nodeId);
                        if (node) {
                            // Follow the original positioning logic from renderMiddleLabels
                            // Check if this is a manually positioned node with preserved label position
                            let isTopNode;
                            if (node.manuallyPositioned) {
                                isTopNode = node.preserveLabelsAbove === true;
                            } else {
                                isTopNode = node.layerIndex === 0;
                            }
                            
                            // X position: always centered on node (node.x + nodeWidth/2)
                            const xPos = node.x + (chart.config.nodeWidth || 35) / 2;
                            
                            if (isTopNode) {
                                // Text above node: node.y - textDistance
                                return `translate(${xPos}, ${node.y - value})`;
                            } else {
                                // Text below node: node.y + node.height + textDistance
                                return `translate(${xPos}, ${node.y + node.height + value})`;
                            }
                        }
                        return d3.select(this).attr('transform');
                    });
            }
            
            return;
        }
        
        // Handle textDistanceRightmost with direct DOM updates - no re-render
        if (controlId === 'textDistanceRightmost') {
            
            // Update config
            const textDistance = chart.config.textDistance || {};
            textDistance.rightmost = value;
            chart.config.textDistance = textDistance;
            
            // Update existing rightmost text groups directly
            if (chart.chart) {
                const maxDepth = Math.max(...chart.nodes.map(n => n.depth));
                
                chart.chart.selectAll('.node-text-group')
                    .filter(function() {
                        const nodeId = d3.select(this).attr('data-node-id');
                        const node = chart.nodes.find(n => n.id === nodeId);
                        return node && node.depth === maxDepth; // rightmost nodes
                    })
                    .transition()
                    .duration(200)
                    .attr('transform', function() {
                        const nodeId = d3.select(this).attr('data-node-id');
                        const node = chart.nodes.find(n => n.id === nodeId);
                        if (node) {
                            // Follow original positioning: node.x + nodeWidth + textDistance
                            const nodeWidth = chart.config.nodeWidth || 35;
                            return `translate(${node.x + nodeWidth + value}, ${node.y + node.height/2})`;
                        }
                        return d3.select(this).attr('transform');
                    });
            }
            
            return;
        }

        // Handle linkWidthScale specially - direct DOM update without re-render  
        if (controlId === 'linkWidthScale') {
            chart.config.linkWidthScale = value;
            
            // Update existing link widths directly
            if (chart.chart && chart.setLinkWidth) {
                chart.setLinkWidth(value);
            }
            
            return;
        }

        // Handle spacing multipliers with direct updates - no re-render
        if (controlId === 'leftmostSpacing' || controlId === 'middleSpacing' || controlId === 'rightmostSpacing') {
            chart.config[controlId] = value;
            
            // For spacing multipliers, we need to update layer spacing but preserve colors
            if (chart.chart && chart.nodes) {
                // Update the layer spacing configuration
                if (!chart.config.layerSpacing) {
                    chart.config.layerSpacing = { 0: 0.8, 1: 1.0, 2: 1.0, 3: 0.9, 4: 0.7 };
                }
                
                // Apply the multiplier to the appropriate layers
                const maxDepth = Math.max(...chart.nodes.map(n => n.depth));
                if (controlId === 'leftmostSpacing') {
                    chart.config.layerSpacing[0] = value;
                } else if (controlId === 'rightmostSpacing') {
                    chart.config.layerSpacing[maxDepth] = value;
                } else if (controlId === 'middleSpacing') {
                    // Apply to all middle layers
                    for (let depth = 1; depth < maxDepth; depth++) {
                        chart.config.layerSpacing[depth] = value;
                    }
                }
                
                // Recalculate node positions within each depth with new spacing
                const nodesByDepth = new Map();
                chart.nodes.forEach(node => {
                    if (!nodesByDepth.has(node.depth)) {
                        nodesByDepth.set(node.depth, []);
                    }
                    nodesByDepth.get(node.depth).push(node);
                });
                
                nodesByDepth.forEach((nodesAtDepth, depth) => {
                    const spacingMultiplier = chart.config.layerSpacing[depth] || 1.0;
                    const baseSpacing = chart.config.nodePadding || 50;
                    const adjustedSpacing = baseSpacing * spacingMultiplier;
                    
                    // Only update non-manually positioned nodes
                    const autoNodes = nodesAtDepth.filter(n => !n.manuallyPositioned);
                    if (autoNodes.length > 0) {
                        const totalHeight = chart.config.height - chart.config.margin.top - chart.config.margin.bottom;
                        const totalNodeHeight = autoNodes.reduce((sum, node) => sum + node.height, 0);
                        const totalSpacing = (autoNodes.length - 1) * adjustedSpacing;
                        const startY = chart.config.margin.top + (totalHeight - totalNodeHeight - totalSpacing) / 2;
                        
                        autoNodes.forEach((node, index) => {
                            const prevNodesHeight = autoNodes.slice(0, index).reduce((sum, n) => sum + n.height, 0);
                            node.y = startY + prevNodesHeight + (index * adjustedSpacing);
                        });
                    }
                });
                
                // Update visual positions
                chart.chart.selectAll('.sankey-node')
                    .transition()
                    .duration(200)
                    .attr('transform', d => `translate(${d.x}, ${d.y})`);
                
                // Update link paths
                chart.chart.selectAll('.sankey-link path')
                    .transition()
                    .duration(200)
                    .attr('d', d => chart.createSmoothPath(d, chart.config.curveIntensity));
                
                // Update text positions
                chart.chart.selectAll('.node-text-group')
                    .transition()
                    .duration(200)
                    .attr('transform', function() {
                        const nodeId = d3.select(this).attr('data-node-id');
                        const node = chart.nodes.find(n => n.id === nodeId);
                        if (node) {
                            const currentTransform = d3.select(this).attr('transform');
                            const translateMatch = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
                            if (translateMatch) {
                                const x = parseFloat(translateMatch[1]);
                                return `translate(${x}, ${node.y + node.height/2})`;
                            }
                        }
                        return d3.select(this).attr('transform');
                    });
            }
            
            return;
        }

        // Handle curveIntensity specially - direct path update without any re-render
        if (controlId === 'curveIntensity') {
            chart.config.curveIntensity = value;
            
            // Update existing links directly by recalculating paths
            if (chart.chart && chart.links) {
                const linkSelection = chart.chart.selectAll('.sankey-link path');
                
                // Update each link path with new curvature
                linkSelection
                    .transition()
                    .duration(200)
                    .attr('d', d => {
                        // Recalculate path using the new curve intensity
                        return chart.createSmoothPath(d, value);
                    });
            }
            
            return;
        }

        // Handle brand logo upload
        if (controlId === 'brandUpload') {
            this.handleBrandUpload(chart, value);
            return;
        }

        // Handle brand logo clear
        if (controlId === 'clearBrand') {
            this.handleClearBrand(chart);
            return;
        }

        // Handle nodeWidth specially - direct DOM update without re-render
        if (controlId === 'nodeWidth') {
            chart.config.nodeWidth = value;
            
            // Update existing node widths directly
            if (chart.chart) {
                chart.chart.selectAll('.sankey-node rect')
                    .transition()
                    .duration(200)
                    .attr('width', value);
                
                // Update link positions since they depend on node width
                chart.chart.selectAll('.sankey-link path')
                    .transition()
                    .duration(200)
                    .attr('d', d => {
                        // Recalculate path with new node width
                        return chart.createSmoothPath(d, chart.config.curveIntensity);
                    });
            }
            
            return;
        }

        // Handle nodeHeightScale specially - adaptive logarithmic scaling
        if (controlId === 'nodeHeightScale') {
            // Convert percentage (0-100) to adaptive logarithmic scale
            const actualScale = this.convertPercentageToScale(value, chart);
            chart.config.nodeHeightScale = actualScale;
            
            // Update both underlying node data AND visual elements
            if (chart.chart && chart.nodes) {
                // 1. Update underlying node height data
                chart.nodes.forEach(node => {
                    node.height = Math.max(1, node.value * actualScale);
                });
                
                // 2. Update node visuals instantly
                chart.chart.selectAll('.sankey-node rect')
                    .attr('height', d => d.height);
                
                // 3. Recalculate link positions (this sets d.path property)
                chart.calculateLinkPositions();
                
                // 4. Update link paths using the calculated path property
                chart.chart.selectAll('.sankey-link path')
                    .attr('d', d => d.path);
                
                // 5. Update text labels using the exact same approach as drag handler
                chart.chart.selectAll('.node-text-group').remove();
                chart.renderLabels();
            }
            
            return;
        }

        // Handle standard controls
        chart.updateConfig({ [controlId]: value });
    }

    /**
     * INTELLIGENT SCALING: Uses the new intelligent base scale calculation
     * Integrates with the adaptive scaling profiles
     */
    convertPercentageToScale(percentage, chart) {
        if (percentage === 0) return 0.00001; // Minimum visible scale
        
        if (!chart.nodes || chart.nodes.length === 0) return 0.1;
        
        // Get data characteristics
        const values = chart.nodes.map(n => n.value || 0).filter(v => v > 0);
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);
        const totalValue = values.reduce((sum, val) => sum + val, 0);
        const dataRange = maxValue - minValue;
        
        // Use the same intelligent scaling logic as the chart
        const availableHeight = 500; // Approximate available height
        const profile = this.createScalingProfileForUI(dataRange, values.length);
        
        // Calculate base scale using intelligent method
        const targetTotalHeight = availableHeight * profile.targetFillRatio;
        const baseScale = targetTotalHeight / totalValue;
        
        // Apply profile constraints
        const maxNodeScale = profile.maxNodeHeight / maxValue;
        const minNodeScale = profile.minNodeHeight / minValue;
        
        let intelligentBaseScale = Math.min(baseScale, maxNodeScale);
        intelligentBaseScale = Math.max(intelligentBaseScale, minNodeScale);
        
        // Linear scaling: 0-100% maps to 0.2x-2x of intelligent base scale
        const minMultiplier = 0.2;
        const maxMultiplier = 2.0;
        const multiplier = minMultiplier + (maxMultiplier - minMultiplier) * (percentage / 100);
        
        return Math.max(0.00001, intelligentBaseScale * multiplier);
    }

    /**
     * Create scaling profile for UI controls (matches chart logic)
     */
    createScalingProfileForUI(dataRange, nodeCount) {
        let targetFillRatio, maxNodeHeight, minNodeHeight;
        
        if (dataRange <= 1000) {
            targetFillRatio = 0.7;
            maxNodeHeight = 150;
            minNodeHeight = 15;
        } else if (dataRange <= 10000) {
            targetFillRatio = 0.6;
            maxNodeHeight = 120;
            minNodeHeight = 12;
        } else if (dataRange <= 100000) {
            targetFillRatio = 0.5;
            maxNodeHeight = 100;
            minNodeHeight = 10;
        } else if (dataRange <= 1000000) {
            targetFillRatio = 0.4;
            maxNodeHeight = 80;
            minNodeHeight = 8;
        } else {
            targetFillRatio = 0.3;
            maxNodeHeight = 60;
            minNodeHeight = 6;
        }

        // Adjust for node count
        if (nodeCount > 20) {
            targetFillRatio *= 0.8;
        } else if (nodeCount < 5) {
            targetFillRatio *= 1.2;
        }

        return {
            targetFillRatio: Math.min(targetFillRatio, 0.8),
            maxNodeHeight,
            minNodeHeight
        };
    }

    /**
     * INTELLIGENT SCALING: Convert actual scale back to percentage for slider display
     */
    convertScaleToPercentage(scale, chart) {
        if (scale <= 0.00001) return 0;
        
        if (!chart.nodes || chart.nodes.length === 0) return 50;
        
        // Get data characteristics (same as convertPercentageToScale)
        const values = chart.nodes.map(n => n.value || 0).filter(v => v > 0);
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);
        const totalValue = values.reduce((sum, val) => sum + val, 0);
        const dataRange = maxValue - minValue;
        
        // Use the same intelligent scaling logic
        const availableHeight = 500;
        const profile = this.createScalingProfileForUI(dataRange, values.length);
        
        // Calculate the same intelligent base scale
        const targetTotalHeight = availableHeight * profile.targetFillRatio;
        const baseScale = targetTotalHeight / totalValue;
        
        const maxNodeScale = profile.maxNodeHeight / maxValue;
        const minNodeScale = profile.minNodeHeight / minValue;
        
        let intelligentBaseScale = Math.min(baseScale, maxNodeScale);
        intelligentBaseScale = Math.max(intelligentBaseScale, minNodeScale);
        
        // Reverse the linear multiplier mapping
        const minMultiplier = 0.2;
        const maxMultiplier = 2.0;
        const multiplier = scale / intelligentBaseScale;
        
        // Convert multiplier back to percentage
        const percentage = ((multiplier - minMultiplier) / (maxMultiplier - minMultiplier)) * 100;
        
        return Math.max(0, Math.min(100, Math.round(percentage)));
    }


    // Removed updateChartNodeColor function - no longer supporting individual node colors

    /**
     * Handle brand logo upload
     */
    handleBrandUpload(chart, file) {
        if (!file || !(file instanceof File)) {
            console.warn('⚠️ Invalid file provided for brand upload');
            return;
        }

        // Check file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('File size too large. Please choose a file smaller than 2MB.');
            return;
        }

        // Check file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            alert('Invalid file type. Please choose PNG, JPG, GIF, or SVG.');
            return;
        }


        const reader = new FileReader();
        reader.onload = (e) => {
            const imageUrl = e.target.result;
            
            // Initialize brand logo metadata
            if (!chart.data.metadata) {
                chart.data.metadata = {};
            }
            
            chart.data.metadata.brandLogo = {
                url: imageUrl,
                x: 50,
                y: 50,
                width: 100,
                height: 60,
                opacity: 1.0,
                selected: false
            };

            // Update just the logo without full re-render to preserve user changes
            if (window.ChartBrandingUtils && window.ChartBrandingUtils.renderBrandLogo) {
                window.ChartBrandingUtils.renderBrandLogo.call(chart);
            }

        };

        reader.onerror = () => {
            alert('Failed to read the selected file. Please try again.');
        };

        reader.readAsDataURL(file);
    }

    /**
     * Handle brand logo clear
     */
    handleClearBrand(chart) {
        
        if (chart.data && chart.data.metadata && chart.data.metadata.brandLogo) {
            delete chart.data.metadata.brandLogo;
            
            // Remove just the logo without full re-render to preserve user changes
            if (chart.svg) {
                chart.svg.selectAll('.chart-brand-logo').remove();
            }
            
        }
    }

    /**
     * ENHANCED: Get current values with balance sheet group support
     */
    getCurrentValue(controlId, chart) {
        // Handle backgroundColor specially
        if (controlId === 'backgroundColor') {
            return chart && chart.config ? chart.config.backgroundColor : (window.GlobalChartConfig ? window.GlobalChartConfig.getGlobalBackgroundColor() : '#faf9f0');
        }
        
        // Handle titleFont specially
        if (controlId === 'titleFont') {
            return chart && chart.config ? chart.config.titleFont : 'Inter';
        }

        // Handle titleSize specially
        if (controlId === 'titleSize') {
            return chart && chart.config ? chart.config.titleSize : 40;
        }

        // Handle titleColor specially
        if (controlId === 'titleColor') {
            return chart && chart.config ? chart.config.titleColor : '#1f2937';
        }
        
        


        // Handle nodeHeightScale specially - convert back to percentage
        if (controlId === 'nodeHeightScale' && chart && chart.config) {
            const currentScale = chart.config.nodeHeightScale;
            if (currentScale !== undefined) {
                return this.convertScaleToPercentage(currentScale, chart);
            }
        }

        if (chart && chart.config) {
            // Handle unified text distance configs
            if (controlId.includes('textDistance')) {
                if (controlId === 'textDistanceLeftmost' && chart.config.textDistance) {
                    return chart.config.textDistance.leftmost;
                }
                if (controlId === 'textDistanceMiddle' && chart.config.textDistance) {
                    return chart.config.textDistance.middle;
                }
                if (controlId === 'textDistanceRightmost' && chart.config.textDistance) {
                    return chart.config.textDistance.rightmost;
                }
            }

            // Standard config lookup
            if (chart.config[controlId] !== undefined) {
                return chart.config[controlId];
            }
        }

        // Fallback to default from capabilities
        const control = this.findControlById(controlId);
        return control ? control.default : 0;
    }

    findControlById(controlId) {
        for (const section of Object.values(this.capabilities)) {
            if (section.controls) {
                const control = section.controls.find(c => c.id === controlId);
                if (control) return control;
            }
        }
        return null;
    }

    /**
     * ENHANCED: Default configuration with statement awareness
     */
    getDefaultConfig() {
        const defaults = {};
        
        Object.values(this.capabilities).forEach(section => {
            if (section.controls && Array.isArray(section.controls)) {
                section.controls.forEach(control => {
                    if (control.type !== 'preset_controls') {
                        defaults[control.id] = control.default;
                    }
                });
            }
        });

        defaults.labelDistance = {
            leftmost: 10,
            middle: 18,
            rightmost: 10
        };

        defaults.valueDistance = {
            general: 8,
            middle: 2
        };

        defaults.layerSpacing = {
            0: 0.8,
            1: 1.0,
            2: 1.0,
            3: 0.9,
            4: 0.7
        };

        defaults.leftmostGroupGap = 40;
        defaults.rightmostGroupGap = 40;

        return defaults;
    }




    // Enhanced validation, reset, and export methods
    validateConfig(config) {
        const errors = [];
        
        Object.values(this.capabilities).forEach(section => {
            if (section.controls && Array.isArray(section.controls)) {
                section.controls.forEach(control => {
                    if (control.type === 'preset_controls') return; // Skip preset controls
                    
                    const value = config[control.id];
                    
                    if (value !== undefined) {
                        if (control.type === 'slider') {
                            if (value < control.min || value > control.max) {
                                errors.push(`${control.label} must be between ${control.min} and ${control.max}`);
                            }
                        }
                        
                        if (control.type === 'color') {
                            if (!/^#[0-9A-F]{6}$/i.test(value)) {
                                errors.push(`${control.label} must be a valid hex color`);
                            }
                        }
                    }
                });
            }
        });

        return { errors, warnings: [], valid: errors.length === 0 };
    }

    resetToDefaults() {
        const defaults = this.getDefaultConfig();
        return defaults;
    }

    exportConfig(config) {
        return JSON.stringify({
            chartType: 'sankey',
            version: '2.6',
            config: config,
            timestamp: new Date().toISOString(),
            features: {
                smartLabelPositioning: true,
                layerSpecificSpacing: true,
                groupSpacing: true
            }
        }, null, 2);
    }

    importConfig(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            
            if (imported.chartType !== 'sankey') {
                throw new Error('Configuration is not for Sankey charts');
            }
            
            
            const validation = this.validateConfig(imported.config);
            if (!validation.valid) {
                throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
            }
            
            return imported.config;
        } catch (error) {
            console.error('Configuration import failed:', error);
            throw error;
        }
    }







    /**
     * Get category pill HTML with color - made clickable for color editing
     */
    getCategoryPill(category) {
        if (!category) {
            return '<span class="node-uncategorized">(uncategorized)</span>';
        }
        
        // Get category color
        let categoryColor = '#6b7280'; // default gray
        
        // Try to get chart from multiple sources
        let chart = this.chart;
        if (!chart && window.pulseApp && window.pulseApp.chart) {
            chart = window.pulseApp.chart;
        }
        
        if (chart && chart.categoryManager) {
            const categoryManager = chart.categoryManager;
            
            if (categoryManager.userCategories.has(category)) {
                categoryColor = categoryManager.userCategories.get(category).color;
            } else if (categoryManager.defaultCategories[category]) {
                categoryColor = categoryManager.defaultCategories[category].color;
            }
        } else {
            // Use default category colors when no chart is loaded
            const defaultColors = {
                'revenue': '#22c55e',
                'expenses': '#ef4444', 
                'assets': '#3b82f6',
                'liabilities': '#f59e0b',
                'equity': '#8b5cf6',
                'operations': '#06b6d4'
            };
            categoryColor = defaultColors[category] || '#6b7280';
        }
        
        return `<span class="category-pill clickable-pill" data-category="${category}" style="background-color: ${categoryColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 500; cursor: pointer; transition: all 0.2s ease;" title="Click to change color">${category}</span>`;
    }

    /**
     * Set up click handlers for category pills in bulk assignment modal
     */
    setupCategoryPillClickHandlers(modal) {
        modal.addEventListener('click', (e) => {
            // Check if clicked element is a category pill
            if (e.target.classList.contains('clickable-pill')) {
                e.preventDefault();
                e.stopPropagation(); // Prevent checkbox toggling
                
                const categoryName = e.target.dataset.category;
                if (categoryName) {
                    this.showCategoryColorPicker(categoryName, e.target, modal);
                }
            }
        });
    }

    /**
     * Show color picker for category in bulk assignment modal
     */
    showCategoryColorPicker(categoryName, pillElement, modal) {
        // Remove any existing color picker
        const existingPicker = document.querySelector('.bulk-category-color-picker');
        if (existingPicker) {
            existingPicker.remove();
        }
        
        // Get current category color
        let currentColor = '#6b7280';
        
        // Try to get chart from multiple sources
        let chart = this.chart;
        if (!chart && window.pulseApp && window.pulseApp.chart) {
            chart = window.pulseApp.chart;
        }
        
        if (chart && chart.categoryManager) {
            const categoryManager = chart.categoryManager;
            
            if (categoryManager.userCategories.has(categoryName)) {
                currentColor = categoryManager.userCategories.get(categoryName).color;
            } else if (categoryManager.defaultCategories[categoryName]) {
                currentColor = categoryManager.defaultCategories[categoryName].color;
            }
        } else {
            // Use default category colors when no chart is loaded
            const defaultColors = {
                'revenue': '#22c55e',
                'expenses': '#ef4444', 
                'assets': '#3b82f6',
                'liabilities': '#f59e0b',
                'equity': '#8b5cf6',
                'operations': '#06b6d4'
            };
            currentColor = defaultColors[categoryName] || '#6b7280';
        }
        
        // Create color picker popup
        const picker = document.createElement('div');
        picker.className = 'bulk-category-color-picker';
        picker.innerHTML = `
            <div class="color-picker-content">
                <div class="color-picker-header">
                    <span class="color-picker-title">Edit "${categoryName}" Color</span>
                    <button class="color-picker-close">×</button>
                </div>
                <div class="color-picker-body">
                    <input type="color" value="${currentColor}" class="color-input">
                    <div class="color-presets">
                        <div class="preset-color" data-color="#1e40af" style="background: #1e40af"></div>
                        <div class="preset-color" data-color="#dc2626" style="background: #dc2626"></div>
                        <div class="preset-color" data-color="#059669" style="background: #059669"></div>
                        <div class="preset-color" data-color="#d97706" style="background: #d97706"></div>
                        <div class="preset-color" data-color="#7c3aed" style="background: #7c3aed"></div>
                        <div class="preset-color" data-color="#db2777" style="background: #db2777"></div>
                    </div>
                    <div class="color-picker-actions">
                        <button class="btn-apply">Apply</button>
                        <button class="btn-cancel">Cancel</button>
                    </div>
                </div>
            </div>
            <style>
                .bulk-category-color-picker {
                    position: fixed;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                    border: 1px solid #e2e8f0;
                    z-index: 10001;
                    min-width: 240px;
                    animation: colorPickerFadeIn 0.2s ease-out;
                }
                @keyframes colorPickerFadeIn {
                    from { opacity: 0; transform: scale(0.9) translateY(-5px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .color-picker-content {
                    padding: 0;
                }
                .color-picker-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    border-bottom: 1px solid #e2e8f0;
                    background: #f8fafc;
                }
                .color-picker-title {
                    font-size: 14px;
                    font-weight: 600;
                    color: #374151;
                }
                .color-picker-close {
                    background: none;
                    border: none;
                    font-size: 18px;
                    color: #6b7280;
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: background-color 0.2s;
                }
                .color-picker-close:hover {
                    background: #e5e7eb;
                    color: #374151;
                }
                .color-picker-body {
                    padding: 16px;
                }
                .color-input {
                    width: 100%;
                    height: 40px;
                    border: 2px solid #e2e8f0;
                    border-radius: 6px;
                    cursor: pointer;
                    margin-bottom: 12px;
                    transition: border-color 0.2s;
                }
                .color-input:hover {
                    border-color: #6366f1;
                }
                .color-presets {
                    display: grid;
                    grid-template-columns: repeat(6, 1fr);
                    gap: 8px;
                    margin-bottom: 16px;
                }
                .preset-color {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    cursor: pointer;
                    border: 2px solid #e2e8f0;
                    transition: all 0.2s;
                }
                .preset-color:hover {
                    transform: scale(1.1);
                    border-color: #6366f1;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                }
                .color-picker-actions {
                    display: flex;
                    gap: 8px;
                    justify-content: flex-end;
                }
                .btn-apply, .btn-cancel {
                    padding: 8px 16px;
                    border-radius: 6px;
                    border: none;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-apply {
                    background: #6366f1;
                    color: white;
                }
                .btn-apply:hover {
                    background: #5855eb;
                    transform: translateY(-1px);
                }
                .btn-cancel {
                    background: #f3f4f6;
                    color: #374151;
                }
                .btn-cancel:hover {
                    background: #e5e7eb;
                }
            </style>
        `;
        
        // Position near the pill element
        const pillRect = pillElement.getBoundingClientRect();
        picker.style.position = 'fixed';
        picker.style.left = pillRect.left + 'px';
        picker.style.top = (pillRect.bottom + 5) + 'px';
        picker.style.zIndex = '10001';
        
        document.body.appendChild(picker);
        
        // Event handlers
        const colorInput = picker.querySelector('.color-input');
        const presetColors = picker.querySelectorAll('.preset-color');
        const applyBtn = picker.querySelector('.btn-apply');
        const cancelBtn = picker.querySelector('.btn-cancel');
        const closeBtn = picker.querySelector('.color-picker-close');
        
        // Preset color selection
        presetColors.forEach(preset => {
            preset.addEventListener('click', () => {
                colorInput.value = preset.dataset.color;
            });
        });
        
        // Apply color change
        const applyColor = () => {
            const newColor = colorInput.value;
            this.updateCategoryColorInBulkModal(categoryName, newColor, modal);
            picker.remove();
        };
        
        // Cancel
        const cancelColor = () => {
            picker.remove();
        };
        
        applyBtn.addEventListener('click', applyColor);
        cancelBtn.addEventListener('click', cancelColor);
        closeBtn.addEventListener('click', cancelColor);
        
        // Close on outside click
        document.addEventListener('click', function outsideClick(e) {
            if (!picker.contains(e.target) && !pillElement.contains(e.target)) {
                picker.remove();
                document.removeEventListener('click', outsideClick);
            }
        });
        
        // Focus color input
        colorInput.focus();
    }

    /**
     * Update category color and refresh pills in bulk modal
     */
    updateCategoryColorInBulkModal(categoryName, newColor, modal) {
        // Try to get chart from multiple sources
        let chart = this.chart;
        if (!chart && window.pulseApp && window.pulseApp.chart) {
            chart = window.pulseApp.chart;
        }
        
        if (!chart || !chart.categoryManager) {
            console.warn('No chart or categoryManager available for updateCategoryColorInBulkModal');
            return;
        }
        
        // Update category color in the chart
        const categoryManager = chart.categoryManager;
        
        if (categoryManager.userCategories.has(categoryName)) {
            const category = categoryManager.userCategories.get(categoryName);
            category.color = newColor;
            categoryManager.userCategories.set(categoryName, category);
        } else if (categoryManager.defaultCategories[categoryName]) {
            // Convert to user category with new color
            const category = { ...categoryManager.defaultCategories[categoryName], color: newColor };
            categoryManager.userCategories.set(categoryName, category);
        }
        
        // Update all pills with this category in the modal
        modal.querySelectorAll('.clickable-pill').forEach(pill => {
            if (pill.dataset.category === categoryName) {
                pill.style.backgroundColor = newColor;
            }
        });
        
        // Trigger chart re-render to apply new colors if chart is visible
        if (chart && chart.render && chart.originalData) {
            chart.render(chart.originalData);
        }
    }

    /**
     * Extract unique nodes from current spreadsheet data
     */
    getNodesFromSpreadsheetData() {
        // Get data from flowData global variable or from spreadsheet
        let flows = [];
        if (window.flowData && window.flowData.flows) {
            flows = window.flowData.flows;
        } else if (typeof flowData !== 'undefined' && flowData.flows) {
            flows = flowData.flows;
        } else {
            // Try to extract from spreadsheet table directly
            const tableRows = document.querySelectorAll('#flows-tbody tr');
            tableRows.forEach(row => {
                const sourcCell = row.querySelector('[data-col="source"] .cell-content');
                const targetCell = row.querySelector('[data-col="target"] .cell-content');
                if (sourcCell && targetCell && sourcCell.textContent.trim() && targetCell.textContent.trim()) {
                    flows.push({
                        source: sourcCell.textContent.trim(),
                        target: targetCell.textContent.trim()
                        // No category info available when extracting from DOM directly
                    });
                }
            });
        }
        
        // Extract unique node names with their categories
        const nodeMap = new Map();
        flows.forEach(flow => {
            if (flow.source && flow.source.trim()) {
                const sourceName = flow.source.trim();
                if (!nodeMap.has(sourceName) && flow.sourceCategory) {
                    nodeMap.set(sourceName, { id: sourceName, name: sourceName, category: flow.sourceCategory });
                } else if (!nodeMap.has(sourceName)) {
                    nodeMap.set(sourceName, { id: sourceName, name: sourceName });
                }
            }
            if (flow.target && flow.target.trim()) {
                const targetName = flow.target.trim();
                if (!nodeMap.has(targetName) && flow.targetCategory) {
                    nodeMap.set(targetName, { id: targetName, name: targetName, category: flow.targetCategory });
                } else if (!nodeMap.has(targetName)) {
                    nodeMap.set(targetName, { id: targetName, name: targetName });
                }
            }
        });
        
        // Convert to node objects array
        return Array.from(nodeMap.values());
    }

    /**
     * Store node category assignment in flowData for later use
     */
    storeNodeCategoryAssignment(nodeKey, category) {
        // Try different ways to access flow data
        let flows = null;
        
        if (window.flowData && window.flowData.flows) {
            flows = window.flowData.flows;
        } else if (typeof flowData !== 'undefined' && flowData.flows) {
            flows = flowData.flows;
        } else {
            // Create flowData if it doesn't exist
            if (typeof flowData === 'undefined') {
                window.flowData = { flows: [] };
                flows = window.flowData.flows;
            } else {
                console.warn('No flowData available to store category assignment');
                return;
            }
        }
        
        // Update all flows that involve this node
        flows.forEach(flow => {
            if (flow.source === nodeKey) {
                flow.sourceCategory = category;
            }
            if (flow.target === nodeKey) {
                flow.targetCategory = category;
            }
        });
        
        console.log(`Updated ${flows.length} flows with category assignment for node: ${nodeKey}`);
    }

    /**
     * Open bulk assignment modal
     */
    openBulkAssignmentModal() {
        // Auto-close data menu with slight delay to ensure it happens after click
        setTimeout(() => {
            if (window.DropdownManager) {
                window.DropdownManager.closeAll();
            }
        }, 50);
        
        console.log('Bulk assignment modal - this.chart:', this.chart);
        console.log('Bulk assignment modal - window.pulseApp:', window.pulseApp);
        console.log('Bulk assignment modal - window.pulseApp?.chart:', window.pulseApp?.chart);
        
        // Try to get chart from multiple sources
        let chart = this.chart;
        if (!chart && window.pulseApp && window.pulseApp.chart) {
            chart = window.pulseApp.chart;
            this.chart = chart; // Update our reference
            console.log('Found chart via window.pulseApp.chart, updating this.chart');
        }
        
        // Get nodes from chart or from current spreadsheet data
        let nodes = [];
        if (chart && chart.nodes && chart.nodes.length > 0) {
            nodes = chart.nodes;
        } else {
            // Extract nodes from current spreadsheet data
            nodes = this.getNodesFromSpreadsheetData();
        }
        
        if (!nodes || nodes.length === 0) {
            alert('No nodes available. Please add some flow data in the spreadsheet first.');
            return;
        }
        
        const modal = document.createElement('div');
        modal.className = 'bulk-assignment-modal';
        
        // Get all available categories - use chart's category manager if available, otherwise use default categories
        let allCategories;
        if (chart && chart.categoryManager) {
            const categoryManager = chart.categoryManager;
            allCategories = new Map([...Object.entries(categoryManager.defaultCategories), ...categoryManager.userCategories]);
        } else {
            // Use default categories when no chart is loaded
            const defaultCategories = {
                'revenue': { color: '#22c55e', icon: '💰' },
                'expenses': { color: '#ef4444', icon: '💸' }, 
                'assets': { color: '#3b82f6', icon: '🏦' },
                'liabilities': { color: '#f59e0b', icon: '📊' },
                'equity': { color: '#8b5cf6', icon: '📈' },
                'operations': { color: '#06b6d4', icon: '⚙️' }
            };
            allCategories = new Map(Object.entries(defaultCategories));
        }
        
        // Build category options
        let categoryOptions = '<option value="">Select a category...</option>';
        allCategories.forEach((_, name) => {
            categoryOptions += `<option value="${name}">${name}</option>`;
        });
        
        modal.innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Assign Categories</h3>
                        <button class="close-modal" onclick="this.closest('.bulk-assignment-modal').remove()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label>Category:</label>
                            <select id="bulkCategory">
                                ${categoryOptions}
                            </select>
                        </div>
                        
                        <div class="nodes-section">
                            <label>Select Nodes to Assign:</label>
                            <div class="node-selection-container">
                                <div class="selection-controls">
                                    <button type="button" class="btn-small select-all" onclick="this.parentElement.parentElement.querySelectorAll('.node-checkbox').forEach(cb => cb.checked = true); this.parentElement.parentElement.parentElement.querySelector('.preview-count').textContent = this.parentElement.parentElement.querySelectorAll('.node-checkbox:checked').length + ' nodes selected'">Select All</button>
                                    <button type="button" class="btn-small select-none" onclick="this.parentElement.parentElement.querySelectorAll('.node-checkbox').forEach(cb => cb.checked = false); this.parentElement.parentElement.parentElement.querySelector('.preview-count').textContent = '0 nodes selected'">Select None</button>
                                    <button type="button" class="btn-small select-uncategorized" onclick="this.parentElement.parentElement.querySelectorAll('.node-checkbox').forEach(cb => { cb.checked = cb.dataset.uncategorized === 'true'; }); this.parentElement.parentElement.parentElement.querySelector('.preview-count').textContent = this.parentElement.parentElement.querySelectorAll('.node-checkbox:checked').length + ' nodes selected'">Uncategorized Only</button>
                                </div>
                                <div class="node-list-scrollable">
                                    ${nodes.map(node => {
                                        const nodeKey = node.id || node.name || node.label;
                                        let currentCategory = null;
                                        
                                        // First try chart's category manager
                                        if (chart && chart.categoryManager) {
                                            currentCategory = chart.categoryManager.nodeCategories.get(nodeKey);
                                        }
                                        
                                        // Fallback to node's category property (from spreadsheet data)
                                        if (!currentCategory && node.category) {
                                            currentCategory = node.category;
                                        }
                                        
                                        const isUncategorized = !currentCategory;
                                        return `
                                        <div class="node-item">
                                            <label class="node-checkbox-label">
                                                <input type="checkbox" class="node-checkbox" value="${nodeKey}" data-uncategorized="${isUncategorized ? 'true' : 'false'}" onchange="this.closest('.nodes-section').querySelector('.preview-count').textContent = this.closest('.node-selection-container').querySelectorAll('.node-checkbox:checked').length + ' nodes selected'">
                                                <span class="node-name">${node.name || node.label || node.id || 'Unnamed'}</span>
                                            </label>
                                            <div class="category-pill-container">
                                                ${this.getCategoryPill(currentCategory)}
                                            </div>
                                        </div>`;
                                    }).join('')}
                                </div>
                                <div class="preview-count">0 nodes selected</div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.bulk-assignment-modal').remove()">Cancel</button>
                        <button class="btn btn-primary" onclick="window.pulseApplyBulkAssignment()">Apply Assignment</button>
                    </div>
                </div>
            </div>
            <style>
                .bulk-assignment-modal {
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
                    max-width: 420px;
                    max-height: 70vh;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                .modal-header {
                    padding: 16px 20px;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .modal-header h3 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                }
                .close-modal {
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    color: #666;
                }
                .modal-body {
                    padding: 16px 20px;
                    flex: 1;
                    overflow-y: auto;
                }
                .modal-footer {
                    padding: 12px 20px;
                    border-top: 1px solid #eee;
                    display: flex;
                    justify-content: flex-end;
                    gap: 8px;
                }
                .form-group {
                    margin-bottom: 16px;
                }
                .form-group label {
                    display: block;
                    margin-bottom: 6px;
                    font-weight: 500;
                    font-size: 14px;
                }
                .form-group select {
                    width: 100%;
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                }
                .nodes-section {
                    margin-top: 16px;
                }
                .selection-controls {
                    display: flex;
                    gap: 6px;
                    margin-bottom: 8px;
                }
                .btn-small {
                    padding: 4px 8px;
                    font-size: 11px;
                    border: 1px solid #ddd;
                    border-radius: 3px;
                    background: #f8f9fa;
                    cursor: pointer;
                }
                .btn-small:hover {
                    background: #e9ecef;
                }
                .node-selection-container {
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    background: #fafafa;
                }
                .node-list-scrollable {
                    max-height: 200px;
                    overflow-y: auto;
                    padding: 8px;
                }
                .node-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 6px 8px;
                    margin: 2px 0;
                    background: white;
                    border-radius: 3px;
                    font-size: 13px;
                }
                .node-item:hover {
                    background: #f8f9fa;
                }
                .node-checkbox-label {
                    display: flex;
                    align-items: center;
                    cursor: pointer;
                    flex: 1;
                }
                .node-checkbox {
                    margin-right: 8px;
                }
                .node-name {
                    font-weight: 500;
                    flex: 1;
                }
                .category-pill-container {
                    margin-left: 8px;
                }
                .clickable-pill:hover {
                    transform: scale(1.05);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                .node-category {
                    color: #666;
                    font-size: 11px;
                }
                .node-uncategorized {
                    color: #999;
                    font-size: 11px;
                    font-style: italic;
                }
                .preview-count {
                    padding: 8px;
                    text-align: center;
                    font-size: 12px;
                    font-weight: 500;
                    color: #666;
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
                .btn-primary {
                    background: #007bff;
                    color: white;
                }
            </style>
        `;
        
        // Close any open menus/dropdowns before showing modal - but preserve their functionality
        document.querySelectorAll('.menu-section.open').forEach(menu => {
            menu.classList.remove('open');
        });
        document.querySelectorAll('.dropdown-content[style*="display: block"]').forEach(dropdown => {
            dropdown.style.display = 'none';
        });
        
        document.body.appendChild(modal);
        
        // Set up event handlers for category pill clicks
        this.setupCategoryPillClickHandlers(modal);
        
        // Set up global function for applying assignment
        window.pulseApplyBulkAssignment = () => {
            // Re-resolve chart in case it was updated
            let currentChart = chart;
            if (!currentChart && window.pulseApp && window.pulseApp.chart) {
                currentChart = window.pulseApp.chart;
            }
            const category = document.getElementById('bulkCategory').value;
            
            if (!category) {
                alert('Please select a category');
                return;
            }
            
            // Get selected nodes from checkboxes
            const selectedCheckboxes = modal.querySelectorAll('.node-checkbox:checked');
            
            // Get nodes from chart or from current spreadsheet data
            let availableNodes = [];
            if (currentChart && currentChart.nodes && currentChart.nodes.length > 0) {
                availableNodes = currentChart.nodes;
            } else {
                // Extract nodes from current spreadsheet data
                availableNodes = this.getNodesFromSpreadsheetData();
            }
            
            const affectedNodes = Array.from(selectedCheckboxes).map(checkbox => {
                const nodeValue = checkbox.value;
                return availableNodes.find(node => (node.id || node.name) === nodeValue);
            }).filter(node => node);
            
            if (affectedNodes.length === 0) {
                alert('Please select at least one node');
                return;
            }
            
            // Apply assignments to nodes using the proper method to trigger automatic link coloring
            affectedNodes.forEach(node => {
                const nodeKey = node.id || node.name;
                if (currentChart && currentChart.assignNodeToCategory) {
                    currentChart.assignNodeToCategory(nodeKey, category);
                } else {
                    // When no chart is loaded, store assignments in flowData for later use
                    this.storeNodeCategoryAssignment(nodeKey, category);
                    console.log(`Category "${category}" assigned to node "${nodeKey}"`);
                }
            });
            
            // If no chart is loaded, refresh the table to show updated categories
            if (!currentChart) {
                if (typeof renderFlowTable === 'function') {
                    renderFlowTable();
                } else if (window.renderFlowTable) {
                    window.renderFlowTable();
                }
            }
            
            
            modal.remove();
        };
    }
}

// Export the module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SankeyControlModule;
}

if (typeof window !== 'undefined') {
    window.SankeyControlModule = SankeyControlModule;
}