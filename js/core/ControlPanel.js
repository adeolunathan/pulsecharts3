/* ===== PULSE CONTROL PANEL ===== */
/* Interactive control panel for chart customization */

class PulseControlPanel {
    constructor(containerId) {
        this.container = d3.select(`#${containerId}`);
        this.chart = null;
        this.config = {};
        
        // Control capabilities definition
        this.capabilities = {
            layout: {
                title: "Layout & Positioning",
                icon: "⚖️",
                controls: [
                    { 
                        id: "nodeWidth", 
                        type: "slider", 
                        label: "Node Width", 
                        min: 15, 
                        max: 50, 
                        default: 28, 
                        step: 1, 
                        unit: "px", 
                        description: "Width of the flow nodes" 
                    },
                    { 
                        id: "nodePadding", 
                        type: "slider", 
                        label: "Base Node Spacing", 
                        min: 20, 
                        max: 100, 
                        default: 40, 
                        step: 5, 
                        unit: "px", 
                        description: "Base vertical spacing between nodes" 
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
                        max: 40, 
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
                        description: "Distance of middle labels from nodes" 
                    },
                    { 
                        id: "labelDistanceRightmost", 
                        type: "slider", 
                        label: "Rightmost Label Distance", 
                        min: 5, 
                        max: 40, 
                        default: 15, 
                        step: 1, 
                        unit: "px", 
                        description: "Distance of rightmost labels from nodes" 
                    },
                    { 
                        id: "valueDistance", 
                        type: "slider", 
                        label: "Value Distance", 
                        min: 3, 
                        max: 20, 
                        default: 8, 
                        step: 1, 
                        unit: "px", 
                        description: "Distance of values from nodes/labels" 
                    }
                ]
            },

            dimensions: {
                title: "Node & Link Dimensions",
                icon: "📏",
                controls: [
                    { 
                        id: "nodeHeightScale", 
                        type: "slider", 
                        label: "Node Height Scale", 
                        min: 0.3, 
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

    init(chart) {
        this.chart = chart;
        this.config = { ...chart.config };
        this.generateControls();
    }

    generateControls() {
        this.container.selectAll('*').remove();
        
        Object.entries(this.capabilities).forEach(([sectionKey, section]) => {
            this.createSection(sectionKey, section);
        });
    }

    createSection(sectionKey, section) {
        const sectionDiv = this.container
            .append('div')
            .attr('class', `control-section ${section.collapsed ? 'collapsed' : ''}`)
            .attr('data-section', sectionKey);

        const header = sectionDiv
            .append('div')
            .attr('class', 'control-section-header')
            .on('click', () => this.toggleSection(sectionKey));

        header.append('span').attr('class', 'section-icon').text(section.icon);
        header.append('h3').attr('class', 'section-title').text(section.title);
        header.append('span').attr('class', 'toggle-icon').text(section.collapsed ? '▶' : '▼');

        const content = sectionDiv
            .append('div')
            .attr('class', 'control-section-content')
            .style('display', section.collapsed ? 'none' : 'block');

        section.controls.forEach(control => {
            this.createControl(content, control);
        });
    }

    createControl(container, config) {
        const controlDiv = container
            .append('div')
            .attr('class', 'control-item');

        const header = controlDiv.append('div').attr('class', 'control-header');
        header.append('label').attr('class', 'control-label').text(config.label);
        if (config.unit) header.append('span').attr('class', 'control-unit').text(config.unit);

        switch (config.type) {
            case 'slider':
                this.createSliderControl(controlDiv, config);
                break;
            case 'dropdown':
                this.createDropdownControl(controlDiv, config);
                break;
            case 'toggle':
                this.createToggleControl(controlDiv, config);
                break;
            case 'color':
                this.createColorControl(controlDiv, config);
                break;
        }

        if (config.description) {
            controlDiv.append('div')
                .attr('class', 'control-description')
                .text(config.description);
        }
    }

    createSliderControl(container, config) {
        const sliderContainer = container.append('div').attr('class', 'slider-container');
        
        const currentValue = this.config[config.id] ?? config.default;
        
        const slider = sliderContainer.append('input')
            .attr('type', 'range')
            .attr('min', config.min)
            .attr('max', config.max)
            .attr('step', config.step)
            .attr('value', currentValue)
            .attr('class', 'control-slider')
            .on('input', (event) => {
                const value = parseFloat(event.target.value);
                valueDisplay.text(value);
                this.handleChange(config.id, value);
            });

        const valueDisplay = sliderContainer.append('span')
            .attr('class', 'slider-value')
            .text(currentValue);
    }

    createDropdownControl(container, config) {
        const currentValue = this.config[config.id] ?? config.default;
        
        const select = container.append('select')
            .attr('class', 'control-dropdown')
            .on('change', (event) => {
                this.handleChange(config.id, event.target.value);
            });

        config.options.forEach(option => {
            select.append('option')
                .attr('value', option.value)
                .property('selected', option.value === currentValue)
                .text(option.label);
        });
    }

    createToggleControl(container, config) {
        const currentValue = this.config[config.id] ?? config.default;
        
        const toggleContainer = container.append('div')
            .attr('class', 'toggle-container');

        const checkbox = toggleContainer.append('input')
            .attr('type', 'checkbox')
            .attr('class', 'control-toggle')
            .property('checked', currentValue)
            .on('change', (event) => {
                this.handleChange(config.id, event.target.checked);
            });

        const toggleSlider = toggleContainer.append('span')
            .attr('class', 'toggle-slider');
    }

    createColorControl(container, config) {
        const currentValue = this.config[config.id] ?? config.default;
        
        const colorInput = container.append('input')
            .attr('type', 'color')
            .attr('class', 'control-color')
            .attr('value', currentValue)
            .on('change', (event) => {
                this.handleChange(config.id, event.target.value);
            });
    }

    handleChange(controlId, value) {
        // **MAP LAYER-SPECIFIC CONTROLS TO CHART CONFIG**
        if (controlId === 'labelDistanceLeftmost') {
            this.config.labelDistance = this.config.labelDistance || {};
            this.config.labelDistance.leftmost = value;
            this.chart.updateConfig({ labelDistance: this.config.labelDistance });
        } else if (controlId === 'labelDistanceMiddle') {
            this.config.labelDistance = this.config.labelDistance || {};
            this.config.labelDistance.middle = value;
            this.chart.updateConfig({ labelDistance: this.config.labelDistance });
        } else if (controlId === 'labelDistanceRightmost') {
            this.config.labelDistance = this.config.labelDistance || {};
            this.config.labelDistance.rightmost = value;
            this.chart.updateConfig({ labelDistance: this.config.labelDistance });
        } else {
            // **STANDARD CONTROL HANDLING**
            this.config[controlId] = value;
            if (this.chart) {
                this.chart.updateConfig({ [controlId]: value });
            }
        }
    }

    toggleSection(sectionKey) {
        const section = this.container.select(`[data-section="${sectionKey}"]`);
        const content = section.select('.control-section-content');
        const icon = section.select('.toggle-icon');
        
        const isHidden = content.style('display') === 'none';
        content.style('display', isHidden ? 'block' : 'none');
        icon.text(isHidden ? '▼' : '▶');
        section.classed('collapsed', !isHidden);
    }

    // Reset controls to default values
    resetToDefaults() {
        Object.entries(this.capabilities).forEach(([sectionKey, section]) => {
            section.controls.forEach(control => {
                this.config[control.id] = control.default;
            });
        });

        // Regenerate controls with default values
        this.generateControls();

        // Apply defaults to chart
        if (this.chart) {
            Object.assign(this.chart.config, this.config);
            this.chart.render(this.chart.data);
        }
    }

    // Get current configuration
    getCurrentConfig() {
        return { ...this.config };
    }

    // Apply configuration from external source
    applyConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.generateControls();
        
        if (this.chart) {
            this.chart.updateConfig(this.config);
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PulseControlPanel;
}