/* ===== SANKEY CHART CONTROLS - ENHANCED DYNAMIC LAYER SUPPORT ===== */
/* All Sankey-specific control logic with dynamic layer capabilities */

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
                        default: 28, 
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
                        default: 40, 
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
                        default: 0.8, 
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
                        default: 0.9, 
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
                        default: 0.7, 
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
                        default: 0.4, 
                        step: 0.05, 
                        description: "How curved the flow connections are" 
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
                        default: 15, 
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
                        default: 12, 
                        step: 1, 
                        unit: "px", 
                        description: "Distance of middle layer labels from nodes (auto-positioned above/below)" 
                    },
                    { 
                        id: "valueDistanceMiddle", 
                        type: "slider", 
                        label: "Middle Value Distance", 
                        min: 1, 
                        max: 20, 
                        default: 8, 
                        step: 1, 
                        unit: "px", 
                        description: "Distance of middle layer values from nodes" 
                    },
                    { 
                        id: "labelDistanceRightmost", 
                        type: "slider", 
                        label: "Rightmost Label Distance", 
                        min: 5, 
                        max: 30, 
                        default: 15, 
                        step: 1, 
                        unit: "px", 
                        description: "Distance of rightmost labels from nodes" 
                    },
                    { 
                        id: "valueDistance", 
                        type: "slider", 
                        label: "Value Distance (Left/Right)", 
                        min: 4, 
                        max: 15, 
                        default: 8, 
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
                        default: 0.65, 
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
                icon: "🎨",
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

            // **NEW: Dynamic layer controls section**
            dynamicLayers: {
                title: "Advanced Layer Controls",
                icon: "🔧",
                collapsed: true,
                description: "Fine-tune individual layer properties",
                controls: [] // Will be populated dynamically based on actual data
            }
        };
    }

    /**
     * NEW: Initialize dynamic layer controls based on chart data
     */
    initializeDynamicControls(chart) {
        if (!chart || !chart.getLayerInfo) {
            console.warn('Chart does not support dynamic layer information');
            return;
        }

        const layerInfo = chart.getLayerInfo();
        this.currentLayerCount = layerInfo.totalLayers;
        
        console.log(`🔧 Initializing dynamic controls for ${this.currentLayerCount} layers`);
        
        // Clear existing dynamic controls
        this.capabilities.dynamicLayers.controls = [];
        this.dynamicControls.clear();

        // Create controls for each layer
        for (let depth = 0; depth <= layerInfo.maxDepth; depth++) {
            const layerType = this.getLayerTypeName(depth, layerInfo);
            const nodeCount = layerInfo.nodeDistribution[depth]?.count || 0;
            
            // Skip if no nodes at this depth
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

        // Add layer information display
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

    /**
     * NEW: Get human-readable layer type name
     */
    getLayerTypeName(depth, layerInfo) {
        if (depth === layerInfo.layerInfo.leftmost) {
            return "Leftmost";
        } else if (depth === layerInfo.layerInfo.rightmost) {
            return "Rightmost";
        } else {
            return "Middle";
        }
    }

    /**
     * NEW: Format layer information for display
     */
    formatLayerInfo(layerInfo) {
        const lines = [];
        lines.push(`Total Layers: ${layerInfo.totalLayers}`);
        lines.push(`Leftmost: Layer ${layerInfo.layerInfo.leftmost}`);
        lines.push(`Rightmost: Layer ${layerInfo.layerInfo.rightmost}`);
        
        if (layerInfo.layerInfo.middle.length > 0) {
            lines.push(`Middle: Layers ${layerInfo.layerInfo.middle.join(', ')}`);
        }
        
        lines.push(''); // Empty line
        lines.push('Node Distribution:');
        
        Object.entries(layerInfo.nodeDistribution).forEach(([depth, info]) => {
            lines.push(`Layer ${depth}: ${info.count} nodes (${info.layerType})`);
        });
        
        return lines.join('\n');
    }

    /**
     * ENHANCED: Control change handler with dynamic layer support
     */
    handleControlChange(controlId, value, chart) {
        console.log(`🎛️ Sankey control change: ${controlId} = ${value}`);

        // **NEW: Handle dynamic layer spacing controls**
        if (controlId.startsWith('layer_') && controlId.endsWith('_spacing')) {
            const depth = parseInt(controlId.split('_')[1]);
            if (!isNaN(depth) && chart.setLayerSpacing) {
                chart.setLayerSpacing(depth, value);
                return;
            }
        }

        // **SPECIAL HANDLING FOR MIDDLE LAYER SPACING CONTROL**
        if (controlId === 'nodePadding') {
            // This control should only affect middle layers
            // The chart's positionNodesAtDepth method will handle the layer categorization
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
                // Convert from single value to object
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

        // Handle general value distance (leftmost/rightmost only)
        if (controlId === 'valueDistance') {
            const currentValueDistance = chart.config.valueDistance || {};
            if (typeof currentValueDistance === 'object') {
                currentValueDistance.general = value;
                chart.updateConfig({ valueDistance: currentValueDistance });
            } else {
                chart.updateConfig({ 
                    valueDistance: {
                        general: value,
                        middle: currentValueDistance // Preserve existing middle value
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

        // Handle Flow Width Scale specifically to ensure it works
        if (controlId === 'linkWidthScale') {
            chart.updateConfig({ linkWidthScale: value });
            // Also call the specific method if it exists
            if (chart.setLinkWidth) {
                chart.setLinkWidth(value);
            }
            return;
        }

        // **LAYER SPACING MULTIPLIERS**
        // These controls affect the multipliers applied to the base spacing
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
     * ENHANCED: Get default configuration for Sankey charts with dynamic layer support
     */
    getDefaultConfig() {
        const defaults = {};
        
        // Get defaults from static controls
        Object.values(this.capabilities).forEach(section => {
            if (section.controls && Array.isArray(section.controls)) {
                section.controls.forEach(control => {
                    if (!control.isDynamic) {
                        defaults[control.id] = control.default;
                    }
                });
            }
        });

        // **SET UP PROPER LABEL DISTANCE DEFAULTS**
        defaults.labelDistance = {
            leftmost: 15,
            middle: 12,
            rightmost: 15
        };

        // **SET UP VALUE DISTANCE DEFAULTS**
        defaults.valueDistance = {
            general: 8,
            middle: 8
        };

        return defaults;
    }

    /**
     * ENHANCED: Validate Sankey-specific configuration with dynamic layer support
     */
    validateConfig(config) {
        const errors = [];
        const warnings = [];

        // Validate static controls
        Object.values(this.capabilities).forEach(section => {
            if (section.controls && Array.isArray(section.controls)) {
                section.controls.forEach(control => {
                    if (control.isDynamic) return; // Skip dynamic controls
                    
                    const value = config[control.id];
                    
                    if (value !== undefined) {
                        // Check range for sliders
                        if (control.type === 'slider') {
                            if (value < control.min || value > control.max) {
                                errors.push(`${control.label} must be between ${control.min} and ${control.max}`);
                            }
                        }
                        
                        // Check dropdown options
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

        // **VALIDATE DYNAMIC LAYER SPACING**
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

        // **VALIDATE SPACING LOGIC CONSISTENCY**
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

    /**
     * ENHANCED: Reset all controls to defaults (including dynamic ones)
     */
    resetToDefaults() {
        const defaults = this.getDefaultConfig();
        
        // Reset dynamic controls to their defaults
        this.dynamicControls.forEach((control, depth) => {
            defaults[control.id] = control.default;
        });
        
        return defaults;
    }

    /**
     * ENHANCED: Export configuration as JSON with dynamic layer info
     */
    exportConfig(config) {
        return JSON.stringify({
            chartType: 'sankey',
            version: '2.0',  // Updated version for dynamic layer support
            config: config,
            timestamp: new Date().toISOString(),
            features: {
                smartLabelPositioning: true,
                layerSpecificSpacing: true,
                middleLayerTargetedControls: true,
                dynamicLayerSupport: true,
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

    /**
     * ENHANCED: Import configuration from JSON with dynamic layer support
     */
    importConfig(jsonString) {
        try {
            const imported = JSON.parse(jsonString);
            
            if (imported.chartType !== 'sankey') {
                throw new Error('Configuration is not for Sankey charts');
            }
            
            // Handle both v1.x and v2.x configurations
            if (imported.version && imported.version.startsWith('2.') && imported.dynamicControls) {
                console.log(`📊 Importing v${imported.version} configuration with dynamic layer support`);
                
                // Restore dynamic controls if they exist
                imported.dynamicControls.forEach(dynControl => {
                    if (this.dynamicControls.has(dynControl.depth)) {
                        imported.config[dynControl.controlId] = dynControl.value;
                    }
                });
            } else {
                console.log(`📊 Importing legacy configuration (v${imported.version || '1.x'})`);
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
     * ENHANCED: Get control information for documentation including dynamic layer info
     */
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
                dynamicSupport: "Automatically adapts to any number of layers in the data"
            },
            dynamicFeatures: {
                layerDetection: "Automatically detects number of layers from data",
                individualLayerControls: "Individual spacing controls for each layer",
                layerTypeClassification: "Dynamic leftmost/middle/rightmost categorization",
                scalableArchitecture: "Supports 2 to 20+ layers seamlessly"
            },
            compatibilityInfo: {
                backwardCompatible: "Existing 4-layer charts work without modification",
                configVersioning: "Supports both legacy and enhanced configurations",
                gracefulDegradation: "Falls back to basic controls if dynamic features unavailable"
            }
        };
    }

    /**
     * NEW: Update capabilities when chart changes (for re-initialization)
     */
    updateCapabilities(chart) {
        if (chart && chart.getLayerInfo) {
            this.initializeDynamicControls(chart);
            console.log(`🔄 Updated capabilities for chart with ${this.currentLayerCount} layers`);
        }
    }

    /**
     * NEW: Get dynamic control by layer depth
     */
    getDynamicControl(depth) {
        return this.dynamicControls.get(depth);
    }

    /**
     * NEW: Check if the module supports dynamic layers
     */
    supportsDynamicLayers() {
        return true;
    }

    /**
     * NEW: Get current layer count
     */
    getCurrentLayerCount() {
        return this.currentLayerCount;
    }
}

// Export the module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SankeyControlModule;
}

// Global export for browser usage
if (typeof window !== 'undefined') {
    window.SankeyControlModule = SankeyControlModule;
}