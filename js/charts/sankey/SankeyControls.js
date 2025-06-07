/* ===== SANKEY CHART CONTROLS - WITH FIXED COLOR CUSTOMIZATION ===== */
/* Enhanced Sankey controls with proper tax/expense color grouping and dynamic layers */

class SankeyControlModule {
    constructor() {
        this.capabilities = this.defineCapabilities();
        this.currentLayerCount = 0;
        this.dynamicControls = new Map();
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
                        description: "Foundational vertical spacing for middle layers" 
                    },
                    { 
                        id: "leftmostSpacing", 
                        type: "slider", 
                        label: "Leftmost Layer Spacing", 
                        min: 0.5, 
                        max: 1.5, 
                        default: 0.5, 
                        step: 0.1, 
                        unit: "×", 
                        description: "Spacing multiplier for leftmost layer (depth 0)" 
                    },
                    { 
                        id: "middleSpacing", 
                        type: "slider", 
                        label: "Middle Layers Spacing", 
                        min: 0.5, 
                        max: 1.5, 
                        default: 0.5, 
                        step: 0.1, 
                        unit: "×", 
                        description: "Spacing multiplier for all middle layers" 
                    },
                    { 
                        id: "rightmostSpacing", 
                        type: "slider", 
                        label: "Rightmost Layer Spacing", 
                        min: 0.5, 
                        max: 1.5, 
                        default: 0.5, 
                        step: 0.1, 
                        unit: "×", 
                        description: "Spacing multiplier for rightmost layer (final depth)" 
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

            // **FIXED: Color Customization Section with proper tax grouping**
            colors: {
                title: "Color Customization",
                icon: "🎨",
                collapsed: true,
                controls: [
                    {
                        id: "revenueColor",
                        type: "color",
                        label: "Revenue Color",
                        default: "#3498db",
                        description: "Color for revenue category nodes"
                    },
                    {
                        id: "costColor",
                        type: "color",
                        label: "Cost Color",
                        default: "#e74c3c",
                        description: "Color for cost category nodes"
                    },
                    {
                        id: "profitColor",
                        type: "color",
                        label: "Profit Color",
                        default: "#27ae60",
                        description: "Color for profit category nodes"
                    },
                    {
                        id: "expenseColor",
                        type: "color",
                        label: "Expense & Tax Color",
                        default: "#e67e22",
                        description: "Color for expense and tax category nodes (taxes grouped with expenses)"
                    },
                    {
                        id: "incomeColor",
                        type: "color",
                        label: "Income Color",
                        default: "#9b59b6",
                        description: "Color for income category nodes"
                    }
                ]
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
            },

            // Dynamic layer controls section
            dynamicLayers: {
                title: "Advanced Layer Controls",
                icon: "🔧",
                collapsed: true,
                description: "Fine-tune individual layer properties",
                controls: []
            }
        };
    }

    /**
     * Initialize dynamic layer controls based on chart data
     */
    initializeDynamicControls(chart) {
        if (!chart || !chart.getLayerInfo) {
            console.warn('Chart does not support dynamic layer information');
            return;
        }

        const layerInfo = chart.getLayerInfo();
        this.currentLayerCount = layerInfo.totalLayers;
        
        console.log(`🔧 Initializing dynamic controls for ${this.currentLayerCount} layers`);
        
        this.capabilities.dynamicLayers.controls = [];
        this.dynamicControls.clear();

        for (let depth = 0; depth <= layerInfo.maxDepth; depth++) {
            const layerType = this.getLayerTypeName(depth, layerInfo);
            const nodeCount = layerInfo.nodeDistribution[depth]?.count || 0;
            
            if (nodeCount === 0) continue;

            const control = {
                id: `layer_${depth}_spacing`,
                type: "slider",
                label: `Layer ${depth} Spacing (${layerType})`,
                min: 0.3,
                max: 2.0,
                default: layerInfo.layerSpacing[depth] || 1.0,
                step: 0.1,
                unit: "×",
                description: `Individual spacing control for layer ${depth} (${nodeCount} nodes)`,
                layerDepth: depth,
                isDynamic: true
            };

            this.capabilities.dynamicLayers.controls.push(control);
            this.dynamicControls.set(depth, control);
        }

        this.capabilities.dynamicLayers.controls.push({
            id: "layerInfo",
            type: "info",
            label: "Layer Structure",
            description: this.formatLayerInfo(layerInfo),
            isDynamic: true,
            readonly: true
        });

        console.log(`✅ Created ${this.dynamicControls.size} dynamic layer controls`);
    }

    getLayerTypeName(depth, layerInfo) {
        if (depth === layerInfo.layerInfo.leftmost) {
            return "Leftmost";
        } else if (depth === layerInfo.layerInfo.rightmost) {
            return "Rightmost";
        } else {
            return "Middle";
        }
    }

    formatLayerInfo(layerInfo) {
        const lines = [];
        lines.push(`Total Layers: ${layerInfo.totalLayers}`);
        lines.push(`Leftmost: Layer ${layerInfo.layerInfo.leftmost}`);
        lines.push(`Rightmost: Layer ${layerInfo.layerInfo.rightmost}`);
        
        if (layerInfo.layerInfo.middle.length > 0) {
            lines.push(`Middle: Layers ${layerInfo.layerInfo.middle.join(', ')}`);
        }
        
        lines.push('');
        lines.push('Node Distribution:');
        
        Object.entries(layerInfo.nodeDistribution).forEach(([depth, info]) => {
            lines.push(`Layer ${depth}: ${info.count} nodes (${info.layerType})`);
        });
        
        return lines.join('\n');
    }

    /**
     * ENHANCED: Control change handler with proper tax/expense color grouping
     */
    handleControlChange(controlId, value, chart) {
        console.log(`🎛️ Sankey control change: ${controlId} = ${value}`);

        // **FIXED: Handle color controls with proper tax grouping**
        if (controlId.endsWith('Color')) {
            const category = controlId.replace('Color', '').toLowerCase();
            this.updateChartColor(chart, category, value);
            return;
        }

        // Handle dynamic layer spacing controls
        if (controlId.startsWith('layer_') && controlId.endsWith('_spacing')) {
            const depth = parseInt(controlId.split('_')[1]);
            if (!isNaN(depth) && chart.setLayerSpacing) {
                chart.setLayerSpacing(depth, value);
                return;
            }
        }

        // Handle middle layer spacing control
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
     * FIXED: Update chart color with proper tax/expense grouping
     */
    updateChartColor(chart, category, color) {
        if (!chart.customColors) {
            chart.customColors = {};
        }
        
        // **CRITICAL FIX: Map tax to expense color**
        if (category === 'expense') {
            chart.customColors['expense'] = color;
            chart.customColors['tax'] = color; // Tax nodes use same color as expenses
        } else {
            chart.customColors[category] = color;
        }
        
        // Re-render chart with new colors
        if (chart.data) {
            chart.render(chart.data);
        }
        
        console.log(`🎨 Updated ${category} color to ${color}${category === 'expense' ? ' (also applied to tax)' : ''}`);
    }

    /**
     * Get default configuration matching chart initialization
     */
    getDefaultConfig() {
        const defaults = {};
        
        Object.values(this.capabilities).forEach(section => {
            if (section.controls && Array.isArray(section.controls)) {
                section.controls.forEach(control => {
                    if (!control.isDynamic) {
                        defaults[control.id] = control.default;
                    }
                });
            }
        });

        // **CRITICAL: Properly structured defaults that match chart config**
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

        console.log('📋 Control module defaults generated:', defaults);
        return defaults;
    }

    /**
     * Get current colors from chart
     */
    getCurrentColors(chart) {
        return chart.customColors || {};
    }

    /**
     * Reset chart colors to defaults
     */
    resetColors(chart) {
        if (chart.resetColors) {
            chart.resetColors();
        } else {
            chart.customColors = {};
            if (chart.data) {
                chart.render(chart.data);
            }
        }
        console.log('🔄 Reset colors to defaults');
    }

    /**
     * FIXED: Apply color preset with proper tax grouping
     */
    applyColorPreset(chart, presetName) {
        const presets = {
            default: {
                revenue: '#3498db',
                cost: '#e74c3c',
                profit: '#27ae60',
                expense: '#e67e22',
                income: '#9b59b6'
                // Note: tax is intentionally omitted - it will use expense color
            },
            vibrant: {
                revenue: '#ff6b6b',
                cost: '#4ecdc4',
                profit: '#45b7d1',
                expense: '#f9ca24',
                income: '#6c5ce7'
            },
            professional: {
                revenue: '#2c3e50',
                cost: '#95a5a6',
                profit: '#27ae60',
                expense: '#e67e22',
                income: '#3498db'
            },
            monochrome: {
                revenue: '#2c3e50',
                cost: '#7f8c8d',
                profit: '#34495e',
                expense: '#95a5a6',
                income: '#2c3e50'
            }
        };

        const preset = presets[presetName];
        if (preset && chart.setCustomColors) {
            // **CRITICAL: Ensure tax uses expense color**
            const colorsWithTax = { ...preset };
            colorsWithTax.tax = preset.expense;
            
            chart.setCustomColors(colorsWithTax);
            console.log(`🎨 Applied ${presetName} color preset (tax grouped with expense)`);
        }
    }

    /**
     * FIXED: Generate random colors with proper tax grouping
     */
    randomizeColors(chart) {
        const categories = ['revenue', 'cost', 'profit', 'expense', 'income'];
        const randomColors = {};
        
        categories.forEach(category => {
            randomColors[category] = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        });
        
        // **CRITICAL: Tax uses same color as expense**
        randomColors.tax = randomColors.expense;
        
        if (chart.setCustomColors) {
            chart.setCustomColors(randomColors);
        }
        
        console.log('🎲 Randomized all colors (tax grouped with expense)');
    }

    validateConfig(config) {
        const errors = [];
        const warnings = [];

        Object.values(this.capabilities).forEach(section => {
            if (section.controls && Array.isArray(section.controls)) {
                section.controls.forEach(control => {
                    if (control.isDynamic) return;
                    
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
                        
                        if (control.type === 'dropdown' && control.options) {
                            const validValues = control.options.map(opt => opt.value);
                            if (!validValues.includes(value)) {
                                warnings.push(`${control.label} has invalid value: ${value}`);
                            }
                        }
                    }
                });
            }
        });

        if (config.layerSpacing && typeof config.layerSpacing === 'object') {
            Object.entries(config.layerSpacing).forEach(([depth, spacing]) => {
                const depthNum = parseInt(depth);
                if (isNaN(depthNum)) {
                    errors.push(`Invalid layer depth: ${depth}`);
                } else if (spacing < 0.1 || spacing > 3.0) {
                    warnings.push(`Layer ${depth} spacing (${spacing}) is outside recommended range (0.1-3.0)`);
                }
            });
        }

        if (config.nodePadding && config.nodePadding < 20) {
            warnings.push('Very low middle layer spacing may cause overlapping labels');
        }

        if (config.leftmostSpacing && config.rightmostSpacing && config.middleSpacing) {
            const spacingRatio = Math.max(config.leftmostSpacing, config.rightmostSpacing) / config.middleSpacing;
            if (spacingRatio > 2) {
                warnings.push('Large spacing ratio between layers may create unbalanced layout');
            }
        }

        return { errors, warnings, valid: errors.length === 0 };
    }

    resetToDefaults() {
        const defaults = this.getDefaultConfig();
        
        this.dynamicControls.forEach((control, depth) => {
            defaults[control.id] = control.default;
        });
        
        console.log('🔄 Reset to defaults:', defaults);
        return defaults;
    }

    exportConfig(config) {
        return JSON.stringify({
            chartType: 'sankey',
            version: '2.2',  // Updated version for tax grouping fix
            config: config,
            timestamp: new Date().toISOString(),
            features: {
                smartLabelPositioning: true,
                layerSpecificSpacing: true,
                middleLayerTargetedControls: true,
                dynamicLayerSupport: true,
                colorCustomization: true,
                taxExpenseGrouping: true, // New feature flag
                totalLayers: this.currentLayerCount
            },
            dynamicControls: Array.from(this.dynamicControls.entries()).map(([depth, control]) => ({
                depth,
                controlId: control.id,
                label: control.label,
                value: config[control.id] || control.default
            }))
        }, null, 2);
    }

    importConfig(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            
            if (imported.chartType !== 'sankey') {
                throw new Error('Configuration is not for Sankey charts');
            }
            
            if (imported.version && (imported.version.startsWith('2.') || imported.version.startsWith('1.'))) {
                console.log(`📊 Importing v${imported.version} configuration`);
                
                if (imported.dynamicControls) {
                    imported.dynamicControls.forEach(dynControl => {
                        if (this.dynamicControls.has(dynControl.depth)) {
                            imported.config[dynControl.controlId] = dynControl.value;
                        }
                    });
                }
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

    getControlInfo() {
        return {
            layerLogic: {
                leftmost: {
                    spacing: "Uses leftmostSpacing multiplier on nodePadding base",
                    labels: "Outside left, values above nodes",
                    controls: ["leftmostSpacing", "labelDistanceLeftmost"]
                },
                middle: {
                    spacing: "Uses nodePadding directly with middleSpacing multiplier",
                    labels: "Smart positioning - above for top nodes, below for others",
                    controls: ["nodePadding", "middleSpacing", "labelDistanceMiddle"]
                },
                rightmost: {
                    spacing: "Uses rightmostSpacing multiplier on nodePadding base",
                    labels: "Outside right, values above nodes", 
                    controls: ["rightmostSpacing", "labelDistanceRightmost"]
                }
            },
            smartFeatures: {
                labelPositioning: "Middle layer labels automatically positioned to avoid overlap",
                spacingControl: "nodePadding control specifically targets middle layers only",
                layerAwareness: "All spacing controls respect dynamic layer categorization",
                dynamicSupport: "Automatically adapts to any number of layers in the data",
                colorCustomization: "Full color customization with presets and randomization"
            },
            colorFeatures: {
                categoryColors: "Individual color controls for each node category",
                taxExpenseGrouping: "Tax nodes automatically use expense color for visual coherence",
                colorPresets: "Professional, vibrant, and monochrome color schemes",
                randomization: "Generate random color combinations",
                realTimePreview: "Colors update immediately in chart view"
            }
        };
    }

    updateCapabilities(chart) {
        if (chart && chart.getLayerInfo) {
            this.initializeDynamicControls(chart);
            console.log(`🔄 Updated capabilities for chart with ${this.currentLayerCount} layers`);
        }
    }

    getDynamicControl(depth) {
        return this.dynamicControls.get(depth);
    }

    supportsDynamicLayers() {
        return true;
    }

    getCurrentLayerCount() {
        return this.currentLayerCount;
    }
}

// Export the module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SankeyControlModule;
}

if (typeof window !== 'undefined') {
    window.SankeyControlModule = SankeyControlModule;
}