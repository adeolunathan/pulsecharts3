// js/core/ControlPanel.js
class ControlPanel {
    constructor(containerId, eventBus) {
        this.container = d3.select(`#${containerId}`);
        this.eventBus = eventBus;
        this.currentChart = null;
        this.controls = new Map();
    }

    // Generate controls based on chart capabilities
    generateControls(chart) {
        this.currentChart = chart;
        this.container.selectAll('*').remove();
        
        const capabilities = chart.getCapabilities();
        
        Object.entries(capabilities).forEach(([sectionKey, section]) => {
            this.createControlSection(sectionKey, section);
        });
        
        // Add preset management
        this.createPresetSection();
    }

    createControlSection(sectionKey, section) {
        const sectionDiv = this.container
            .append('div')
            .attr('class', `control-section ${section.collapsed ? 'collapsed' : ''}`)
            .attr('data-section', sectionKey);

        // Section header
        const header = sectionDiv
            .append('div')
            .attr('class', 'control-section-header')
            .on('click', () => this.toggleSection(sectionKey));

        header.append('h3').text(section.title);
        header.append('span').attr('class', 'toggle-icon').text('▼');

        // Section content  
        const content = sectionDiv
            .append('div')
            .attr('class', 'control-section-content');

        section.controls.forEach(control => {
            this.createControl(content, control);
        });
    }

    createControl(container, controlConfig) {
        const controlDiv = container
            .append('div')
            .attr('class', 'control-item')
            .attr('data-control', controlConfig.id);

        // Label
        controlDiv.append('label')
            .attr('class', 'control-label')
            .text(controlConfig.label);

        // Control element based on type
        switch (controlConfig.type) {
            case 'slider':
                this.createSliderControl(controlDiv, controlConfig);
                break;
            case 'dropdown':
                this.createDropdownControl(controlDiv, controlConfig);
                break;
            case 'toggle':
                this.createToggleControl(controlDiv, controlConfig);
                break;
            case 'color':
                this.createColorControl(controlDiv, controlConfig);
                break;
            case 'custom':
                this.createCustomControl(controlDiv, controlConfig);
                break;
        }

        // Description tooltip
        if (controlConfig.description) {
            controlDiv.append('div')
                .attr('class', 'control-description')
                .text(controlConfig.description);
        }
    }

    createSliderControl(container, config) {
        const sliderContainer = container.append('div').attr('class', 'slider-container');
        
        const slider = sliderContainer.append('input')
            .attr('type', 'range')
            .attr('min', config.min)
            .attr('max', config.max)
            .attr('step', config.step)
            .attr('value', config.default)
            .attr('class', 'control-slider')
            .on('input', (event) => {
                valueDisplay.text(event.target.value);
                this.handleControlChange(config.id, parseFloat(event.target.value));
            });

        const valueDisplay = sliderContainer.append('span')
            .attr('class', 'slider-value')
            .text(config.default);

        this.controls.set(config.id, slider);
    }

    handleControlChange(controlId, value) {
        if (!this.currentChart) return;

        // Update chart configuration
        const currentConfig = this.currentChart.getCurrentConfig();
        const newConfig = { ...currentConfig, [controlId]: value };
        
        // Apply change
        this.currentChart.updateConfig(newConfig);
        
        // Broadcast change event
        this.eventBus.emit('configChanged', { controlId, value, config: newConfig });
    }
}