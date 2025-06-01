/* ===== GENERIC CONTROL PANEL ===== */
/* Chart-agnostic control panel that renders any chart's controls */

class PulseControlPanel {
    constructor(containerId) {
        this.container = d3.select(`#${containerId}`);
        this.chart = null;
        this.controlModule = null;
        this.config = {};
        this.updateTimeout = null;
    }

    // Initialize with a chart and its control module
    init(chart, controlModule) {
        this.chart = chart;
        this.controlModule = controlModule;
        this.config = { ...chart.config };
        this.generateControls();
    }

    // Generate controls based on the chart's control module capabilities
    generateControls() {
        if (!this.controlModule) {
            console.error('No control module provided to ControlPanel');
            return;
        }

        this.container.selectAll('*').remove();
        const capabilities = this.controlModule.capabilities;
        
        Object.entries(capabilities).forEach(([sectionKey, section]) => {
            this.createSection(sectionKey, section);
        });
    }

    // Create a control section
    createSection(sectionKey, section) {
        const sectionDiv = this.container
            .append('div')
            .attr('class', `control-section ${section.collapsed ? 'collapsed' : ''}`)
            .attr('data-section', sectionKey);

        const header = sectionDiv
            .append('div')
            .attr('class', 'control-section-header')
            .on('click', () => this.toggleSection(sectionKey));

        header.append('span').attr('class', 'section-icon').text(section.icon || '⚙️');
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

    // Create individual control elements
    createControl(container, config) {
        const controlDiv = container
            .append('div')
            .attr('class', 'control-item');

        const header = controlDiv.append('div').attr('class', 'control-header');
        header.append('label').attr('class', 'control-label').text(config.label);
        if (config.unit) header.append('span').attr('class', 'control-unit').text(config.unit);

        // Route to appropriate control creator
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
            case 'custom':
                this.createCustomControl(controlDiv, config);
                break;
            default:
                console.warn(`Unknown control type: ${config.type}`);
        }

        if (config.description) {
            controlDiv.append('div')
                .attr('class', 'control-description')
                .text(config.description);
        }
    }

    // Create slider control
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

    // Create dropdown control
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

    // Create toggle control
    createToggleControl(container, config) {
        const currentValue = this.config[config.id] ?? config.default;
        
        const toggleContainer = container.append('div').attr('class', 'toggle-container');

        const checkbox = toggleContainer.append('input')
            .attr('type', 'checkbox')
            .attr('class', 'control-toggle')
            .property('checked', currentValue)
            .on('change', (event) => {
                this.handleChange(config.id, event.target.checked);
            });

        toggleContainer.append('span').attr('class', 'toggle-slider');
    }

    // Create color control
    createColorControl(container, config) {
        const currentValue = this.config[config.id] ?? config.default;
        
        container.append('input')
            .attr('type', 'color')
            .attr('class', 'control-color')
            .attr('value', currentValue)
            .on('change', (event) => {
                this.handleChange(config.id, event.target.value);
            });
    }

    // Create custom control (placeholder for extensibility)
    createCustomControl(container, config) {
        const customDiv = container.append('div')
            .attr('class', 'control-custom')
            .text(`Custom control: ${config.component || 'Unknown'}`);
        
        console.warn(`Custom control type '${config.component}' not implemented`);
    }

    // Handle control value changes
    handleChange(controlId, value) {
        // Update local config
        this.config[controlId] = value;

        // Debounce updates for smooth interaction
        clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => {
            if (this.controlModule && this.controlModule.handleControlChange) {
                // Use chart-specific change handler if available
                this.controlModule.handleControlChange(controlId, value, this.chart);
            } else {
                // Fall back to generic chart update
                if (this.chart) {
                    this.chart.updateConfig({ [controlId]: value });
                }
            }
        }, 100);
    }

    // Toggle section visibility
    toggleSection(sectionKey) {
        const section = this.container.select(`[data-section="${sectionKey}"]`);
        const content = section.select('.control-section-content');
        const icon = section.select('.toggle-icon');
        
        const isHidden = content.style('display') === 'none';
        content.style('display', isHidden ? 'block' : 'none');
        icon.text(isHidden ? '▼' : '▶');
        section.classed('collapsed', !isHidden);
    }

    // Reset all controls to defaults
    resetToDefaults() {
        if (this.controlModule && this.controlModule.resetToDefaults) {
            const defaults = this.controlModule.resetToDefaults();
            this.config = defaults;
            
            // Apply defaults to chart
            if (this.chart) {
                this.chart.updateConfig(defaults);
            }
            
            // Regenerate controls with default values
            this.generateControls();
        } else {
            console.warn('Control module does not support reset to defaults');
        }
    }

    // Update control panel with new chart/module
    updateChart(chart, controlModule) {
        this.chart = chart;
        this.controlModule = controlModule;
        this.config = { ...chart.config };
        this.generateControls();
    }

    // Get current configuration
    getCurrentConfig() {
        return { ...this.config };
    }

    // Apply external configuration
    applyConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.generateControls();
        
        if (this.chart) {
            this.chart.updateConfig(this.config);
        }
    }

    // Export configuration
    exportConfig() {
        if (this.controlModule && this.controlModule.exportConfig) {
            return this.controlModule.exportConfig(this.config);
        }
        
        return JSON.stringify(this.config, null, 2);
    }

    // Import configuration
    importConfig(configString) {
        try {
            if (this.controlModule && this.controlModule.importConfig) {
                const config = this.controlModule.importConfig(configString);
                this.applyConfig(config);
            } else {
                const config = JSON.parse(configString);
                this.applyConfig(config);
            }
        } catch (error) {
            console.error('Failed to import configuration:', error);
            alert(`Failed to import configuration: ${error.message}`);
        }
    }

    // Validate current configuration
    validateConfig() {
        if (this.controlModule && this.controlModule.validateConfig) {
            return this.controlModule.validateConfig(this.config);
        }
        
        return { valid: true, errors: [], warnings: [] };
    }

    // Cleanup
    destroy() {
        clearTimeout(this.updateTimeout);
        this.container.selectAll('*').remove();
        this.chart = null;
        this.controlModule = null;
        this.config = {};
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PulseControlPanel;
}