/* ===== SANKEY CHART CONTROLS - ENHANCED WITH BALANCE SHEET SUPPORT ===== */
/* Enhanced with statement-specific color detection and Total Assets control */

class SankeyControlModule {
    constructor() {
        this.capabilities = this.defineCapabilities();
        this.dynamicColors = new Map(); // Store detected colors from data
        this.chart = null; // Reference to current chart
        this.statementType = 'income'; // Track current statement type
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
                        max: 40, 
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
                    }
                ]
            },
            
            curves: {
                title: "Flow Curves",
                icon: "〰️",
                collapsed: true,
                controls: [
                    { 
                        id: "curveIntensity", 
                        type: "slider", 
                        label: "Global Curve Intensity", 
                        min: 0.1, 
                        max: 0.8, 
                        default: 0.3, 
                        step: 0.05, 
                        description: "How curved the flow connections are" 
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
                        id: "titleColor",
                        type: "color_picker",
                        label: "Text Color",
                        default: "#1f2937"
                    },
                    {
                        id: "globalFontSize",
                        type: "slider",
                        label: "Global Font Size",
                        min: 8,
                        max: 18,
                        default: 12,
                        step: 1,
                        unit: "px",
                        description: "Adjust the size of all text elements on the chart"
                    }
                ]
            },

            // Dynamic colors section - will be populated based on actual data
            colors: {
                title: "Node Colors", 
                icon: "🎭",
                collapsed: true,
                controls: [], // Will be dynamically populated
                isDynamic: true
            },

            labels: {
                title: "Labels & Values",
                icon: "🏷️",
                collapsed: true,
                controls: [
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
                    },
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
                        max: 0.1, 
                        default: 0.05, 
                        step: 0.001, 
                        description: "Scale factor for node heights" 
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
                    },
                ]
            },
            
            viewControls: {
                title: "Chart View",
                icon: "🎯",
                collapsed: true,
                controls: [
                    { 
                        id: "centerChart", 
                        type: "button", 
                        label: "Center Chart", 
                        action: "centerChart",
                        description: "Center the chart including all labels within the canvas" 
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
        
        console.log('🎨 Defined capabilities with appearance section:', capabilities);
        return capabilities;
    }

    /**
     * ENHANCED: Dynamically detect colors from chart data with statement type awareness
     */
    initializeDynamicColors(chart) {
        if (!chart || !chart.data) {
            console.warn('No chart data available for color initialization');
            return;
        }

        this.chart = chart;
        // Ensure the chart has detected its statement type
        if (chart.detectStatementType) {
            chart.detectStatementType(chart.data);
        }
        this.statementType = chart.statementType || 'income';
        
        const detectedCategories = this.analyzeDataCategories(chart.data);
        
        console.log(`🎨 Detected categories for ${this.statementType} statement:`, detectedCategories);
        
        // Update the colors section with detected categories
        this.capabilities.colors.controls = this.generateColorControls(detectedCategories, chart);
        
        // Store dynamic colors
        this.dynamicColors.clear();
        detectedCategories.forEach(category => {
            const currentColor = this.getCurrentColorForCategory(category, chart);
            this.dynamicColors.set(category, currentColor);
        });
    }

    /**
     * ENHANCED: Analyze chart data to detect categories with balance sheet group awareness
     */
    analyzeDataCategories(data) {
        const categories = new Set();
        
        if (this.statementType === 'balance') {
            // For balance sheets, detect the actual color groups the chart uses
            const balanceSheetGroups = this.detectBalanceSheetGroups(data);
            balanceSheetGroups.forEach(group => categories.add(group));
            
            console.log(`🎨 Balance sheet groups detected:`, Array.from(categories));
        } else {
            // Income statement - analyze nodes for categories
            if (data.nodes) {
                data.nodes.forEach(node => {
                    if (node.category) {
                        categories.add(node.category);
                    }
                });
            }
            
            // Analyze links for additional categories
            if (data.links) {
                data.links.forEach(link => {
                    if (link.colorCategory) {
                        categories.add(link.colorCategory);
                    }
                    if (link.targetCategory) {
                        categories.add(link.targetCategory);
                    }
                });
            }

            // Add standard income statement categories
            const incomeCategories = ['revenue', 'profit', 'expense'];
            incomeCategories.forEach(cat => {
                if (this.hasNodesWithCategory(data, cat)) {
                    categories.add(cat);
                }
            });
        }
        
        // If no categories found, provide statement-specific defaults
        if (categories.size === 0) {
            if (this.statementType === 'balance') {
                return ['Current Assets', 'Non-Current Assets', 'Current Liabilities', 'Non-Current Liabilities', 'Shareholders Equity', 'Total Assets'];
            } else {
                return ['revenue', 'profit', 'expense'];
            }
        }
        
        return Array.from(categories).sort();
    }

    /**
     * Detect balance sheet color groups based on node names (matches chart logic)
     */
    detectBalanceSheetGroups(data) {
        // For balance sheets, always provide all standard groups for color controls
        // This ensures users can customize any balance sheet group color
        const standardGroups = [
            'Total Assets',
            'Current Assets', 
            'Non-Current Assets',
            'Current Liabilities',
            'Non-Current Liabilities', 
            'Shareholders Equity'
        ];
        
        console.log('🎨 Providing standard balance sheet groups for color controls:', standardGroups);
        return standardGroups;
    }

    /**
     * Check if data has nodes with specific category
     */
    hasNodesWithCategory(data, category) {
        return data.nodes.some(node => node.category === category);
    }

    /**
     * Check if data has nodes with keywords related to category
     */
    hasNodesWithKeywords(data, category) {
        const keywordMap = {
            'current_asset': ['current asset', 'cash', 'receivable', 'inventory', 'prepaid'],
            'non_current_asset': ['non-current asset', 'property', 'equipment', 'intangible', 'fixed asset'],
            'current_liability': ['current liability', 'payable', 'current debt', 'accrued'],
            'non_current_liability': ['non-current liability', 'long-term debt', 'bonds', 'notes'],
            'asset': ['asset'],
            'liability': ['liability'],
            'equity': ['equity', 'stock', 'retained', 'capital']
        };
        
        const keywords = keywordMap[category] || [];
        return data.nodes.some(node => 
            keywords.some(keyword => 
                node.id && node.id.toLowerCase().includes(keyword.toLowerCase())
            )
        );
    }

    /**
     * ENHANCED: Generate color controls with proper ID handling for balance sheet groups
     */
    generateColorControls(categories, chart) {
        const controls = [];
        
        // Add color reset and preset controls first
        controls.push({
            id: "colorPresets",
            type: "preset_controls",
            label: "Color Presets",
            description: "Quick color schemes and controls"
        });
        
        // Add individual category controls with proper ordering
        const orderedCategories = this.orderCategoriesForStatement(categories);
        
        orderedCategories.forEach((category, index) => {
            const currentColor = this.getCurrentColorForCategory(category, chart);
            const description = this.getCategoryDescription(category);
            
            // Generate proper control ID
            const controlId = this.generateControlId(category);
            
            controls.push({
                id: controlId,
                type: "color",
                label: this.formatCategoryLabel(category),
                default: currentColor,
                description: description,
                category: category,
                isDynamic: true
            });
        });
        
        // Add individual node controls for pre-revenue segments (income statements only)
        if (this.statementType !== 'balance' && chart) {
            const preRevenueNodes = chart.getPreRevenueNodes();
            
            if (preRevenueNodes.length > 0) {
                // Add section header
                controls.push({
                    id: "revenueSegmentHeader",
                    type: "header",
                    label: "Revenue Segment Colors",
                    description: "Individual colors for revenue segments"
                });
                
                preRevenueNodes.forEach(node => {
                    const currentColor = chart.customColors && chart.customColors[node.id] 
                        ? chart.customColors[node.id] 
                        : chart.getNodeColor(node);
                    
                    const controlId = `node_${node.id.replace(/[^a-zA-Z0-9]/g, '_')}_color`;
                    
                    controls.push({
                        id: controlId,
                        type: "color",
                        label: node.id,
                        default: currentColor,
                        description: `Individual color for ${node.id}`,
                        nodeId: node.id,
                        isNodeColor: true,
                        isDynamic: true
                    });
                });
            }
        }
        
        return controls;
    }

    /**
     * Generate proper control ID from category name
     */
    generateControlId(category) {
        if (this.statementType === 'balance') {
            // Convert "Non-Current Assets" to "nonCurrentAssetsColor"
            // First remove hyphens and other non-alphanumeric chars, then handle spaces
            const camelCase = category.replace(/[^a-zA-Z0-9\s]/g, '')  // Remove hyphens, etc.
                                     .replace(/\s+(.)/g, (match, letter) => letter.toUpperCase())
                                     .replace(/^\w/, c => c.toLowerCase());
            return camelCase + 'Color';
        } else {
            // Income statement categories are already simple
            return category + 'Color';
        }
    }

    /**
     * Order categories appropriately for each statement type
     */
    orderCategoriesForStatement(categories) {
        const categoryArrays = categories instanceof Set ? Array.from(categories) : categories;
        
        if (this.statementType === 'balance') {
            const balanceOrder = [
                'Total Assets',
                'Current Assets', 'Non-Current Assets',
                'Current Liabilities', 'Non-Current Liabilities', 
                'Shareholders Equity'
            ];
            return this.sortByCustomOrder(categoryArrays, balanceOrder);
        } else {
            const incomeOrder = ['revenue', 'profit', 'expense'];
            return this.sortByCustomOrder(categoryArrays, incomeOrder);
        }
    }

    /**
     * Sort categories by custom order, with unmatched items at end
     */
    sortByCustomOrder(categories, order) {
        const ordered = [];
        const remaining = [...categories];
        
        // Add categories in specified order
        order.forEach(orderItem => {
            const index = remaining.indexOf(orderItem);
            if (index !== -1) {
                ordered.push(remaining.splice(index, 1)[0]);
            }
        });
        
        // Add any remaining categories
        ordered.push(...remaining.sort());
        
        return ordered;
    }

    /**
     * ENHANCED: Get current color for a category with statement-specific logic
     */
    getCurrentColorForCategory(category, chart) {
        // Try to get from chart's custom colors
        if (chart && chart.customColors && chart.customColors[category]) {
            return chart.customColors[category];
        }
        
        // Try to get from chart's data metadata
        if (chart && chart.data && chart.data.metadata && chart.data.metadata.colorPalette && chart.data.metadata.colorPalette[category]) {
            return chart.data.metadata.colorPalette[category];
        }
        
        // Fallback to default colors
        return this.getDefaultColorForCategory(category);
    }

    /**
     * ENHANCED: Get default color for a category with balance sheet group awareness
     */
    getDefaultColorForCategory(category) {
        // Enhanced vibrant color schemes
        if (this.statementType === 'balance') {
            const balanceSheetColors = {
                'Total Assets': '#1e293b',           // Deep slate for Total Assets
                'Current Assets': '#1e40af',         // Vibrant blue for current assets
                'Non-Current Assets': '#7c3aed',     // Vibrant purple for non-current assets  
                'Current Liabilities': '#dc2626',    // Sharp red for current liabilities
                'Non-Current Liabilities': '#b91c1c', // Deep red for non-current liabilities
                'Shareholders Equity': '#059669',     // Vibrant emerald for equity
                default: '#6b7280'
            };
            return balanceSheetColors[category] || balanceSheetColors.default;
        } else {
            // Enhanced vibrant income statement colors
            const incomeColors = {
                revenue: '#1e40af',    // Deep vibrant blue
                profit: '#059669',     // Vibrant emerald green
                expense: '#dc2626',    // Sharp red
                default: '#6b7280'
            };
            return incomeColors[category] || incomeColors.default;
        }
    }

    /**
     * ENHANCED: Format category label (no changes needed for balance sheet groups)
     */
    formatCategoryLabel(category) {
        // Balance sheet group names are already properly formatted
        if (this.statementType === 'balance') {
            return category;
        }
        
        // Income statement formatting
        return category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1');
    }

    /**
     * ENHANCED: Get description for balance sheet groups
     */
    getCategoryDescription(category) {
        const descriptions = {
            // Balance sheet group descriptions
            'Total Assets': 'Total Assets line (balancing item)',
            'Current Assets': 'Short-term assets (cash, receivables, inventory)',
            'Non-Current Assets': 'Long-term assets (property, equipment, intangibles)',
            'Current Liabilities': 'Short-term obligations',
            'Non-Current Liabilities': 'Long-term debt and obligations',
            'Shareholders Equity': 'Ownership equity components',
            
            // Income statement descriptions
            revenue: 'Revenue and income flows',
            profit: 'Profit and margin nodes',
            expense: 'Operating expenses'
        };
        
        return descriptions[category] || `${category} related items`;
    }

    /**
     * ENHANCED: Control change handler with balance sheet group awareness
     */
    handleControlChange(controlId, value, chart) {
        console.log(`🎛️ Sankey control change: ${controlId} = ${value}`);

        // Handle backgroundColor specially
        if (controlId === 'backgroundColor') {
            chart.updateConfig({ backgroundColor: value });
            return;
        }

        // Handle titleFont specially
        if (controlId === 'titleFont') {
            chart.updateConfig({ titleFont: value });
            return;
        }

        // Handle titleColor specially
        if (controlId === 'titleColor') {
            chart.updateConfig({ titleColor: value });
            return;
        }

        // Handle globalFontSize specially
        if (controlId === 'globalFontSize') {
            chart.updateConfig({ globalFontSize: value });
            return;
        }

        // Handle individual node color controls
        if (controlId.startsWith('node_') && controlId.endsWith('_color')) {
            // Extract node ID from control ID (node_nodeId_color)
            const nodeId = controlId.replace('node_', '').replace('_color', '').replace(/_/g, ' ');
            
            // Find the actual node to get its exact ID
            const node = chart.nodes.find(n => n.id.replace(/[^a-zA-Z0-9]/g, '_') === controlId.replace('node_', '').replace('_color', ''));
            if (node) {
                this.updateChartNodeColor(chart, node.id, value);
                return;
            }
        }

        // Handle color controls with statement awareness
        if (controlId.endsWith('Color')) {
            // Extract category name from control ID
            let category = controlId.replace('Color', '');
            
            // For balance sheet, convert from camelCase to proper group name
            if (this.statementType === 'balance') {
                const groupNameMap = {
                    'totalAssets': 'Total Assets',
                    'currentAssets': 'Current Assets', 
                    'nonCurrentAssets': 'Non-Current Assets',
                    'currentLiabilities': 'Current Liabilities',
                    'nonCurrentLiabilities': 'Non-Current Liabilities',
                    'shareholdersEquity': 'Shareholders Equity'
                };
                category = groupNameMap[category] || category;
            } else {
                category = category.toLowerCase();
            }
            
            this.updateChartColor(chart, category, value);
            this.dynamicColors.set(category, value);
            return;
        }

        // Handle color presets
        if (controlId === 'colorPresets') {
            return;
        }

        // Handle opacity controls with immediate visual feedback
        if (controlId === 'nodeOpacity') {
            console.log(`🎛️ Setting nodeOpacity to ${value} for ${chart.statementType || 'income'} statement`);
            chart.config.nodeOpacity = value;
            
            // Debug: Check if chart and nodes exist
            if (!chart.chart) {
                console.error('❌ chart.chart is null - chart may not be initialized');
                return;
            }
            
            const nodeSelection = chart.chart.selectAll('.sankey-node rect');
            console.log(`🔍 Found ${nodeSelection.size()} nodes to update opacity`);
            
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
            
            console.log(`✅ Applied opacity ${value} to nodes`);
            return;
        }

        if (controlId === 'linkOpacity') {
            console.log(`🎛️ Setting linkOpacity to ${value}`);
            chart.config.linkOpacity = value;
            
            const linkSelection = chart.chart.selectAll('.sankey-link path');
            console.log(`🔍 Found ${linkSelection.size()} links to update opacity`);
            
            linkSelection
                .transition()
                .duration(150)
                .attr('fill-opacity', d => chart.getLinkOpacity ? chart.getLinkOpacity(d) : value);
                
            console.log(`✅ Applied opacity ${value} to links`);
            return;
        }

        // Handle other controls with existing logic
        if (controlId === 'leftmostGroupGap' || controlId === 'rightmostGroupGap') {
            chart.updateConfig({ [controlId]: value });
            return;
        }

        if (controlId === 'nodePadding') {
            chart.updateConfig({ nodePadding: value });
            return;
        }

        // Handle unified text distance controls
        if (controlId === 'textDistanceLeftmost') {
            const textDistance = chart.config.textDistance || {};
            textDistance.leftmost = value;
            chart.updateConfig({ textDistance });
            return;
        }
        
        if (controlId === 'textDistanceMiddle') {
            const textDistance = chart.config.textDistance || {};
            textDistance.middle = value;
            chart.updateConfig({ textDistance });
            return;
        }
        
        if (controlId === 'textDistanceRightmost') {
            const textDistance = chart.config.textDistance || {};
            textDistance.rightmost = value;
            chart.updateConfig({ textDistance });
            return;
        }

        if (controlId === 'linkWidthScale') {
            chart.updateConfig({ linkWidthScale: value });
            if (chart.setLinkWidth) {
                chart.setLinkWidth(value);
            }
            return;
        }

        // Layer spacing multipliers
        if (controlId === 'leftmostSpacing') {
            chart.updateConfig({ leftmostSpacing: value });
            return;
        }

        if (controlId === 'middleSpacing') {
            chart.updateConfig({ middleSpacing: value });
            return;
        }

        if (controlId === 'rightmostSpacing') {
            chart.updateConfig({ rightmostSpacing: value });
            return;
        }

        // Handle centerChart button action
        if (controlId === 'centerChart') {
            console.log('🎯 Center Chart button action triggered');
            if (chart.centerChart && typeof chart.centerChart === 'function') {
                chart.centerChart();
            } else {
                console.error('❌ centerChart method not available on chart instance');
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

        // Handle standard controls
        chart.updateConfig({ [controlId]: value });
    }

    /**
     * ENHANCED: Update chart color with direct balance sheet group update
     */
    updateChartColor(chart, category, color) {
        console.log(`🎨 Updating ${category} color to ${color} for ${this.statementType} statement`);
        
        if (!chart.customColors) {
            chart.customColors = {};
        }
        
        chart.customColors[category] = color;
        
        // Special handling for expense category applying to tax
        if (category === 'expense') {
            chart.customColors['tax'] = color;
        }
        
        // Update chart data metadata
        if (chart.data && chart.data.metadata) {
            if (!chart.data.metadata.colorPalette) {
                chart.data.metadata.colorPalette = {};
            }
            chart.data.metadata.colorPalette[category] = color;
            if (category === 'expense') {
                chart.data.metadata.colorPalette['tax'] = color;
            }
        }
        
        // For balance sheets, need to reassign color groups and re-render
        if (this.statementType === 'balance') {
            // Force reassignment of color groups with new custom colors
            if (chart.assignColorGroups) {
                chart.assignColorGroups();
            }
            
            // Re-render nodes and links with new colors
            if (chart.chart) {
                chart.chart.selectAll('.sankey-node rect')
                    .transition()
                    .duration(200)
                    .attr('fill', d => chart.getHierarchicalColor(d.id));
                    
                chart.chart.selectAll('.sankey-link path')
                    .transition()
                    .duration(200)
                    .attr('fill', d => chart.getLinkColor(d));
            }
        } else if (chart.data) {
            // For income statements, just re-render
            chart.render(chart.data);
        }
    }

    /**
     * Update individual node color for pre-revenue segments
     */
    updateChartNodeColor(chart, nodeId, color) {
        console.log(`🎨 Updating node ${nodeId} color to ${color}`);
        
        if (!chart.customColors) {
            chart.customColors = {};
        }
        
        chart.customColors[nodeId] = color;
        
        // Update chart data metadata
        if (chart.data && chart.data.metadata) {
            if (!chart.data.metadata.colorPalette) {
                chart.data.metadata.colorPalette = {};
            }
            chart.data.metadata.colorPalette[nodeId] = color;
        }
        
        // Re-render with new colors
        if (chart.chart) {
            // Update specific node
            chart.chart.selectAll('.sankey-node rect')
                .filter(d => d.id === nodeId)
                .transition()
                .duration(200)
                .attr('fill', color);
                
            // Update links from this node (for source-based coloring)
            chart.chart.selectAll('.sankey-link path')
                .filter(d => d.source.id === nodeId && chart.isPreRevenueNode(d.source))
                .transition()
                .duration(200)
                .attr('fill', chart.lightenColor(color, 15));
        }
    }

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

        console.log('🏢 Processing brand logo upload:', file.name);

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

            // Re-render chart to show logo
            if (chart.render && chart.data) {
                chart.render(chart.data);
            }

            console.log('✅ Brand logo uploaded successfully');
        };

        reader.onerror = () => {
            console.error('❌ Failed to read brand logo file');
            alert('Failed to read the selected file. Please try again.');
        };

        reader.readAsDataURL(file);
    }

    /**
     * Handle brand logo clear
     */
    handleClearBrand(chart) {
        console.log('🗑️ Clearing brand logo');
        
        if (chart.data && chart.data.metadata && chart.data.metadata.brandLogo) {
            delete chart.data.metadata.brandLogo;
            
            // Re-render chart to remove logo
            if (chart.render && chart.data) {
                chart.render(chart.data);
            }
            
            console.log('✅ Brand logo cleared successfully');
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
        
        // Handle titleColor specially
        if (controlId === 'titleColor') {
            return chart && chart.config ? chart.config.titleColor : '#1f2937';
        }
        
        if (controlId.endsWith('Color')) {
            // Extract category name from control ID
            let category = controlId.replace('Color', '');
            
            // For balance sheet, convert from camelCase back to proper group name
            if (this.statementType === 'balance') {
                const groupNameMap = {
                    'totalAssets': 'Total Assets',
                    'currentAssets': 'Current Assets', 
                    'nonCurrentAssets': 'Non-Current Assets',
                    'currentLiabilities': 'Current Liabilities',
                    'nonCurrentLiabilities': 'Non-Current Liabilities',
                    'shareholdersEquity': 'Shareholders Equity'
                };
                category = groupNameMap[category] || category;
            } else {
                category = category.toLowerCase();
            }
            
            return this.getCurrentColorForCategory(category, chart);
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

        console.log(`📋 Enhanced control module defaults generated for ${this.statementType}:`, defaults);
        return defaults;
    }

    /**
     * Get current colors from chart
     */
    getCurrentColors(chart) {
        return chart.customColors || {};
    }

    /**
     * ENHANCED: Apply color preset with statement-specific colors
     */
    applyColorPreset(chart, presetName) {
        const categories = Array.from(this.dynamicColors.keys());
        
        const presets = {
            default: (categories) => {
                const colors = {};
                categories.forEach(cat => {
                    colors[cat] = this.getDefaultColorForCategory(cat);
                });
                return colors;
            },
            vibrant: (categories) => {
                const vibrantColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe', '#fd79a8', '#00b894'];
                const colors = {};
                categories.forEach((cat, index) => {
                    colors[cat] = vibrantColors[index % vibrantColors.length];
                });
                return colors;
            },
            professional: (categories) => {
                const professionalColors = ['#2c3e50', '#95a5a6', '#27ae60', '#e67e22', '#3498db', '#9b59b6', '#1abc9c', '#34495e'];
                const colors = {};
                categories.forEach((cat, index) => {
                    colors[cat] = professionalColors[index % professionalColors.length];
                });
                return colors;
            },
            monochrome: (categories) => {
                const monochromeColors = ['#2c3e50', '#7f8c8d', '#34495e', '#95a5a6', '#2c3e50', '#bdc3c7', '#ecf0f1', '#34495e'];
                const colors = {};
                categories.forEach((cat, index) => {
                    colors[cat] = monochromeColors[index % monochromeColors.length];
                });
                return colors;
            }
        };

        const preset = presets[presetName];
        if (preset && chart.setCustomColors) {
            const colors = preset(categories);
            
            // Handle tax special case
            if (colors.expense) {
                colors.tax = colors.expense;
            }
            
            chart.setCustomColors(colors);
            
            // Update dynamic colors map
            Object.entries(colors).forEach(([category, color]) => {
                this.dynamicColors.set(category, color);
            });
            
            console.log(`🎨 Applied ${presetName} color preset to ${this.statementType} statement categories`);
        }
    }

    /**
     * Randomize all detected colors
     */
    randomizeColors(chart) {
        const categories = Array.from(this.dynamicColors.keys());
        const randomColors = {};
        
        categories.forEach(category => {
            randomColors[category] = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        });
        
        if (randomColors.expense) {
            randomColors.tax = randomColors.expense;
        }
        
        if (chart.setCustomColors) {
            chart.setCustomColors(randomColors);
        }
        
        // Update dynamic colors map
        Object.entries(randomColors).forEach(([category, color]) => {
            this.dynamicColors.set(category, color);
        });
        
        console.log(`🎲 Randomized all detected colors for ${this.statementType} statement`);
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
        console.log('🔄 Reset to defaults:', defaults);
        return defaults;
    }

    exportConfig(config) {
        return JSON.stringify({
            chartType: 'sankey',
            statementType: this.statementType,
            version: '2.6',
            config: config,
            dynamicColors: Object.fromEntries(this.dynamicColors),
            timestamp: new Date().toISOString(),
            features: {
                statementSpecificColors: true,
                balanceSheetHierarchy: true,
                totalAssetsDistinctColor: true,
                dynamicColorDetection: true,
                smartLabelPositioning: true,
                layerSpecificSpacing: true,
                enhancedColorCustomization: true,
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
            
            // Restore statement type
            if (imported.statementType) {
                this.statementType = imported.statementType;
            }
            
            // Restore dynamic colors if available
            if (imported.dynamicColors) {
                this.dynamicColors.clear();
                Object.entries(imported.dynamicColors).forEach(([category, color]) => {
                    this.dynamicColors.set(category, color);
                });
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

    // Enhanced dynamic layer support
    hasDynamicControls() {
        return true;
    }

    /**
     * ENHANCED: Dynamic control initialization with statement awareness
     */
    initializeDynamicControls(chart) {
        console.log(`🔧 Initializing dynamic color controls for ${chart.statementType || 'income'} statement`);
        this.initializeDynamicColors(chart);
    }

    /**
     * Update capabilities based on chart data
     */
    updateCapabilities(chart) {
        if (chart && chart.data) {
            this.statementType = chart.statementType || 'income';
            this.initializeDynamicColors(chart);
            console.log(`🔄 Updated dynamic color capabilities for ${this.statementType} statement`);
        }
    }
}

// Export the module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SankeyControlModule;
}

if (typeof window !== 'undefined') {
    window.SankeyControlModule = SankeyControlModule;
}