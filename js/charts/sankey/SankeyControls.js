/* ===== SANKEY CHART CONTROLS - COMPLETE FIXED VERSION ===== */
/* Enhanced Sankey controls with working color customization, all original controls intact */

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

            // FIXED: Color Customization Section
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
                        description: "Color for revenue"
                    },
                    {
                        id: "costColor",
                        type: "color",
                        label: "Cost Color",
                        default: "#e74c3c",
                        description: "Color for cost"
                    },
                    {
                        id: "profitColor",
                        type: "color",
                        label: "Profit Color",
                        default: "#27ae60",
                        description: "Color for profit"
                    },
                    {
                        id: "expenseColor",
                        type: "color",
                        label: "Expense & Tax Color",
                        default: "#e67e22",
                        description: "Color for expense and tax (taxes grouped with expenses)"
                    },
                    {
                        id: "incomeColor",
                        type: "color",
                        label: "Income Color",
                        default: "#9b59b6",
                        description: "Color for income"
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
     * FIXED: Control change handler with proper color and opacity updates
     */
    handleControlChange(controlId, value, chart) {
        console.log(`🎛️ Sankey control change: ${controlId} = ${value}`);

        // FIXED: Handle color controls with immediate re-render
        if (controlId.endsWith('Color')) {
            const category = controlId.replace('Color', '').toLowerCase();
            this.updateChartColor(chart, category, value);
            return;
        }

        // FIXED: Handle node opacity with immediate visual update
        if (controlId === 'nodeOpacity') {
            chart.config.nodeOpacity = value;
            // Force immediate DOM update
            chart.chart.selectAll('.sankey-node rect')
                .transition()
                .duration(150)
                .attr('fill-opacity', value);
            console.log(`🎨 Node opacity updated to ${value}`);
            return;
        }

        // FIXED: Handle link opacity with immediate visual update
        if (controlId === 'linkOpacity') {
            chart.config.linkOpacity = value;
            // Force immediate DOM update
            chart.chart.selectAll('.sankey-link path')
                .transition()
                .duration(150)
                .attr('fill-opacity', value);
            console.log(`🎨 Link opacity updated to ${value}`);
            return;
        }

        // FIXED: Handle dynamic layer spacing controls
        if (controlId.startsWith('layer_') && controlId.endsWith('_spacing')) {
            const depth = parseInt(controlId.split('_')[1]);
            if (!isNaN(depth)) {
                console.log(`🔧 Setting layer ${depth} spacing to ${value}`);
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
     * FIXED: Update chart color with immediate re-render
     */
    updateChartColor(chart, category, color) {
        console.log(`🎨 Updating ${category} color to ${color}`);
        
        if (!chart.customColors) {
            chart.customColors = {};
        }
        
        // Set the color
        chart.customColors[category] = color;
        
        // Tax uses expense color
        if (category === 'expense') {
            chart.customColors['tax'] = color;
        }
        
        // Update metadata for persistence
        if (chart.data && chart.data.metadata) {
            if (!chart.data.metadata.colorPalette) {
                chart.data.metadata.colorPalette = {};
            }
            chart.data.metadata.colorPalette[category] = color;
            if (category === 'expense') {
                chart.data.metadata.colorPalette['tax'] = color;
            }
        }
        
        // FIXED: Force immediate re-render to show color changes
        if (chart.data) {
            console.log('🔄 Re-rendering chart with new colors');
            chart.render(chart.data);
        }
    }

    /**
     * FIXED: Get current values from chart including colors
     */
    getCurrentValue(controlId, chart) {
        // FIXED: Handle color controls - get from chart's custom colors
        if (controlId.endsWith('Color')) {
            const category = controlId.replace('Color', '').toLowerCase();
            if (chart && chart.customColors && chart.customColors[category]) {
                return chart.customColors[category];
            }
            // Fallback to default from capabilities
            const colorControl = this.findControlById(controlId);
            return colorControl ? colorControl.default : '#000000';
        }

        // Handle other controls normally
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

            // Handle dynamic layer controls
            if (controlId.startsWith('layer_') && controlId.endsWith('_spacing')) {
                const depth = parseInt(controlId.split('_')[1]);
                if (!isNaN(depth) && chart.config.layerSpacing && chart.config.layerSpacing[depth] !== undefined) {
                    return chart.config.layerSpacing[depth];
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
     * Apply color preset
     */
    applyColorPreset(chart, presetName) {
        const presets = {
            default: {
                revenue: '#3498db',
                cost: '#e74c3c',
                profit: '#27ae60',
                expense: '#e67e22',
                income: '#9b59b6'
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
            const colorsWithTax = { ...preset };
            colorsWithTax.tax = preset.expense;
            
            chart.setCustomColors(colorsWithTax);
            console.log(`🎨 Applied ${presetName} color preset`);
        }
    }

    /**
     * Generate random colors
     */
    randomizeColors(chart) {
        const categories = ['revenue', 'cost', 'profit', 'expense', 'income'];
        const randomColors = {};
        
        categories.forEach(category => {
            randomColors[category] = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        });
        
        randomColors.tax = randomColors.expense;
        
        if (chart.setCustomColors) {
            chart.setCustomColors(randomColors);
        }
        
        console.log('🎲 Randomized all colors');
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
                    }
                });
            }
        });

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
            version: '2.3',
            config: config,
            timestamp: new Date().toISOString(),
            features: {
                smartLabelPositioning: true,
                layerSpecificSpacing: true,
                dynamicLayerSupport: true,
                colorCustomization: true,
                taxExpenseGrouping: true,
                totalLayers: this.currentLayerCount
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

    updateCapabilities(chart) {
        if (chart && chart.getLayerInfo) {
            this.initializeDynamicControls(chart);
            console.log(`🔄 Updated capabilities for chart with ${this.currentLayerCount} layers`);
        }
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