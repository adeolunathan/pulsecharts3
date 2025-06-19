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
        return {
            layout: {
                title: "Layout & Positioning",
                icon: "⚖️",
                collapsed: false,
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

            // Dynamic colors section - will be populated based on actual data
            colors: {
                title: "Color Customization",
                icon: "🎨",
                collapsed: false,
                controls: [], // Will be dynamically populated
                isDynamic: true
            },

            labels: {
                title: "Labels & Values",
                icon: "🏷️",
                collapsed: true,
                controls: [
                    { 
                        id: "labelDistanceLeftmost", 
                        type: "slider", 
                        label: "Leftmost Label Distance", 
                        min: 5, 
                        max: 30, 
                        default: 5, 
                        step: 1, 
                        unit: "px", 
                        description: "Distance of leftmost labels from nodes" 
                    },
                    { 
                        id: "labelDistanceMiddle", 
                        type: "slider", 
                        label: "Middle Label Distance", 
                        min: 5, 
                        max: 30, 
                        default: 15, 
                        step: 1, 
                        unit: "px", 
                        description: "Distance of middle layer labels from nodes" 
                    },
                    { 
                        id: "valueDistanceMiddle", 
                        type: "slider", 
                        label: "Middle Value Distance", 
                        min: 1, 
                        max: 20, 
                        default: 5, 
                        step: 1, 
                        unit: "px", 
                        description: "Distance of middle layer values from nodes" 
                    },
                    { 
                        id: "labelDistanceRightmost", 
                        type: "slider", 
                        label: "Rightmost Label Distance", 
                        min: 1, 
                        max: 30, 
                        default: 1, 
                        step: 1, 
                        unit: "px", 
                        description: "Distance of rightmost labels from nodes" 
                    },
                    { 
                        id: "valueDistance", 
                        type: "slider", 
                        label: "Value Distance (Left/Right)", 
                        min: 1, 
                        max: 15, 
                        default: 3, 
                        step: 1, 
                        unit: "px", 
                        description: "Distance of values from leftmost and rightmost nodes only" 
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
                        max: 1.0, 
                        default: 0.03, 
                        step: 0.005, 
                        description: "Scale factor for node heights" 
                    },
                    { 
                        id: "linkWidthScale", 
                        type: "slider", 
                        label: "Flow Width Scale", 
                        min: 0.3, 
                        max: 1.0, 
                        default: 0.65, 
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
                        default: 1.0, 
                        step: 0.05, 
                        description: "Transparency of node rectangles" 
                    },
                    { 
                        id: "linkOpacity", 
                        type: "slider", 
                        label: "Flow Opacity", 
                        min: 0.3, 
                        max: 1.0, 
                        default: 1.0, 
                        step: 0.05, 
                        description: "Transparency of flow connections" 
                    }
                ]
            }
        };
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
            const incomeCategories = ['revenue', 'cost', 'profit', 'expense', 'income', 'tax'];
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
                return ['revenue', 'cost', 'profit', 'expense', 'income'];
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
            const incomeOrder = ['revenue', 'cost', 'profit', 'expense', 'income', 'tax'];
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
        // Statement-specific color schemes
        if (this.statementType === 'balance') {
            const balanceSheetColors = {
                'Total Assets': '#2C3E50',           // Distinct dark blue-gray for Total Assets
                'Current Assets': '#3498DB',         // Blue for current assets
                'Non-Current Assets': '#9B59B6',     // Purple for non-current assets  
                'Current Liabilities': '#E74C3C',    // Red for current liabilities
                'Non-Current Liabilities': '#C0392B', // Dark red for non-current liabilities
                'Shareholders Equity': '#27AE60',     // Green for equity
                default: '#95a5a6'
            };
            return balanceSheetColors[category] || balanceSheetColors.default;
        } else {
            // Income statement colors (default)
            const incomeColors = {
                revenue: '#3498db',
                cost: '#e74c3c',
                profit: '#27ae60',
                expense: '#e67e22',
                income: '#9b59b6',
                tax: '#e67e22',
                default: '#95a5a6'
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
            cost: 'Cost and expense flows',
            profit: 'Profit and margin nodes',
            expense: 'Operating expenses',
            income: 'Net income and final results',
            tax: 'Tax expenses and obligations'
        };
        
        return descriptions[category] || `${category} related items`;
    }

    /**
     * ENHANCED: Control change handler with balance sheet group awareness
     */
    handleControlChange(controlId, value, chart) {
        console.log(`🎛️ Sankey control change: ${controlId} = ${value}`);

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
            chart.config.nodeOpacity = value;
            chart.chart.selectAll('.sankey-node rect')
                .transition()
                .duration(150)
                .attr('fill-opacity', d => chart.getNodeOpacity ? chart.getNodeOpacity(d) : value);
            return;
        }

        if (controlId === 'linkOpacity') {
            chart.config.linkOpacity = value;
            chart.chart.selectAll('.sankey-link path')
                .transition()
                .duration(150)
                .attr('fill-opacity', d => chart.getLinkOpacity ? chart.getLinkOpacity(d) : value);
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

        // Handle layer-specific label distance controls
        if (controlId === 'labelDistanceLeftmost') {
            const labelDistance = chart.config.labelDistance || {};
            labelDistance.leftmost = value;
            chart.updateConfig({ labelDistance });
            return;
        }
        
        if (controlId === 'labelDistanceMiddle') {
            const labelDistance = chart.config.labelDistance || {};
            labelDistance.middle = value;
            chart.updateConfig({ labelDistance });
            return;
        }
        
        if (controlId === 'valueDistanceMiddle') {
            const valueDistance = chart.config.valueDistance || {};
            if (typeof valueDistance === 'number') {
                chart.config.valueDistance = {
                    general: valueDistance,
                    middle: value
                };
            } else {
                valueDistance.middle = value;
                chart.updateConfig({ valueDistance });
            }
            return;
        }

        if (controlId === 'valueDistance') {
            const currentValueDistance = chart.config.valueDistance || {};
            if (typeof currentValueDistance === 'object') {
                currentValueDistance.general = value;
                chart.updateConfig({ valueDistance: currentValueDistance });
            } else {
                chart.updateConfig({ 
                    valueDistance: {
                        general: value,
                        middle: currentValueDistance
                    }
                });
            }
            return;
        }
        
        if (controlId === 'labelDistanceRightmost') {
            const labelDistance = chart.config.labelDistance || {};
            labelDistance.rightmost = value;
            chart.updateConfig({ labelDistance });
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
     * ENHANCED: Get current values with balance sheet group support
     */
    getCurrentValue(controlId, chart) {
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
            // Handle complex nested configs
            if (controlId.includes('Distance')) {
                if (controlId === 'labelDistanceLeftmost' && chart.config.labelDistance) {
                    return chart.config.labelDistance.leftmost;
                }
                if (controlId === 'labelDistanceMiddle' && chart.config.labelDistance) {
                    return chart.config.labelDistance.middle;
                }
                if (controlId === 'labelDistanceRightmost' && chart.config.labelDistance) {
                    return chart.config.labelDistance.rightmost;
                }
                if (controlId === 'valueDistanceMiddle' && chart.config.valueDistance) {
                    return chart.config.valueDistance.middle;
                }
                if (controlId === 'valueDistance' && chart.config.valueDistance) {
                    return chart.config.valueDistance.general;
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
            leftmost: 15,
            middle: 12,
            rightmost: 15
        };

        defaults.valueDistance = {
            general: 8,
            middle: 8
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
    supportsDynamicLayers() {
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