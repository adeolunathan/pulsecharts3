/* ===== SANKEY CHART CONTROLS - FIXED SPACING LOGIC ===== */
/* All Sankey-specific control logic with corrected descriptions */

class SankeyControlModule {
    constructor() {
        this.capabilities = this.defineCapabilities();
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
                        description: "Foundational vertical spacing between all nodes" 
                    },
                    { 
                        id: "leftmostSpacing", 
                        type: "slider", 
                        label: "Left Layer Spacing", 
                        min: 0.5, 
                        max: 1.5, 
                        default: 0.8, 
                        step: 0.1, 
                        unit: "×", 
                        description: "Spacing multiplier for leftmost layer" 
                    },
                    { 
                        id: "middleSpacing", 
                        type: "slider", 
                        label: "Middle Layer Spacing", 
                        min: 0.5, 
                        max: 1.5, 
                        default: 0.9, 
                        step: 0.1, 
                        unit: "×", 
                        description: "Spacing multiplier for middle layers" 
                    },
                    { 
                        id: "rightmostSpacing", 
                        type: "slider", 
                        label: "Right Layer Spacing", 
                        min: 0.5, 
                        max: 1.5, 
                        default: 0.7, 
                        step: 0.1, 
                        unit: "×", 
                        description: "Spacing multiplier for rightmost layer" 
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
                        label: "Curve Intensity", 
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
                        min: 0.1, 
                        max: 1.0, 
                        default: 0.65, 
                        step: 0.05, 
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
            }
        };
    }

    // Enhanced control change handler with proper layer targeting
    handleControlChange(controlId, value, chart) {
        console.log(`🎛️ Sankey control change: ${controlId} = ${value}`);

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

    // Get default configuration for Sankey charts
    getDefaultConfig() {
        const defaults = {};
        
        Object.values(this.capabilities).forEach(section => {
            section.controls.forEach(control => {
                defaults[control.id] = control.default;
            });
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

    // Validate Sankey-specific configuration
    validateConfig(config) {
        const errors = [];
        const warnings = [];

        // Validate required controls
        Object.values(this.capabilities).forEach(section => {
            section.controls.forEach(control => {
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
        });

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

    // Reset all controls to defaults
    resetToDefaults() {
        return this.getDefaultConfig();
    }

    // Export configuration as JSON
    exportConfig(config) {
        return JSON.stringify({
            chartType: 'sankey',
            version: '1.1',  // Updated version for new spacing logic
            config: config,
            timestamp: new Date().toISOString(),
            features: {
                smartLabelPositioning: true,
                layerSpecificSpacing: true,
                middleLayerTargetedControls: true
            }
        }, null, 2);
    }

    // Import configuration from JSON
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

    // **NEW: Get control information for documentation**
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
                layerAwareness: "All spacing controls respect the three-layer categorization"
            }
        };
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