/* ===== CHART WRAPPER SYSTEM ===== */
/* Wraps your existing Sankey chart to work with the control system */

// js/charts/base/BaseChart.js
class BaseChart {
    constructor(containerId, config = {}) {
        this.containerId = containerId;
        this.config = config;
        this.capabilities = null;
    }

    // Required interface methods
    render(data) { throw new Error('render() must be implemented'); }
    updateConfig(newConfig) { throw new Error('updateConfig() must be implemented'); }
    exportToPNG() { throw new Error('exportToPNG() must be implemented'); }
    exportToSVG() { throw new Error('exportToSVG() must be implemented'); }
    destroy() { throw new Error('destroy() must be implemented'); }

    // Standard methods
    getCapabilities() { return this.capabilities; }
    getCurrentConfig() { return this.config; }
    validateData(data) { return { valid: true }; }
}

// js/charts/base/ChartWrapper.js
class ChartWrapper extends BaseChart {
    constructor(ChartClass, capabilities, containerId, config = {}) {
        super(containerId, config);
        this.ChartClass = ChartClass;
        this.capabilities = capabilities;
        this.chartInstance = null;
        this.data = null;
        
        this.initializeChart();
    }

    initializeChart() {
        // Create instance of your existing chart (ProfessionalSankeyChart)
        this.chartInstance = new this.ChartClass(this.containerId);
    }

    render(data) {
        this.data = data;
        return this.chartInstance.render(data);
    }

    updateConfig(newConfig) {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newConfig };
        
        // Apply configuration changes to your existing chart
        this.applyConfigChanges(oldConfig, newConfig);
        
        return this;
    }

    applyConfigChanges(oldConfig, newConfig) {
        const changes = {};
        
        // Detect what changed
        Object.keys(newConfig).forEach(key => {
            if (oldConfig[key] !== newConfig[key]) {
                changes[key] = newConfig[key];
            }
        });

        // Apply changes using your chart's existing methods
        Object.entries(changes).forEach(([key, value]) => {
            switch (key) {
                case 'curveIntensity':
                    this.chartInstance.setCurveIntensity(value);
                    break;
                    
                case 'nodeWidth':
                case 'nodePadding':
                case 'leftmostSpacing':
                case 'middleSpacing':
                case 'rightmostSpacing':
                    this.chartInstance.setSpacing(
                        this.config.nodePadding,
                        this.config.leftmostSpacing,
                        this.config.middleSpacing,
                        this.config.rightmostSpacing
                    );
                    break;
                    
                case 'autoCenter':
                case 'autoMiddleAlign':
                case 'dynamicSpaceFill':
                    this.chartInstance.setAutoFeatures(
                        this.config.autoCenter,
                        this.config.autoMiddleAlign,
                        this.config.dynamicSpaceFill
                    );
                    break;
                    
                case 'layerCurvature':
                    this.chartInstance.setMultiLayerCurvature(value);
                    break;

                case 'curvaturePreset':
                    this.chartInstance.applyCurvaturePreset(value);
                    break;

                default:
                    // For custom properties, try the comprehensive customize method
                    this.chartInstance.customize({ [key]: value });
                    break;
            }
        });
    }

    exportToPNG(filename) {
        return this.chartInstance.exportToPNG(filename);
    }

    exportToSVG(filename) {
        return this.chartInstance.exportToSVG(filename);
    }

    destroy() {
        if (this.chartInstance && this.chartInstance.destroy) {
            this.chartInstance.destroy();
        }
        this.chartInstance = null;
    }
}

// js/charts/sankey/SankeyControls.js
const SankeyCapabilities = {
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
                description: "Width of the rectangular flow nodes"
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
            },
            {
                id: "autoCenter",
                type: "toggle",
                label: "Auto Center Horizontally",
                default: true,
                description: "Automatically center chart horizontally"
            },
            {
                id: "autoMiddleAlign",
                type: "toggle", 
                label: "Auto Middle Align Vertically",
                default: true,
                description: "Automatically center chart vertically"
            }
        ]
    },
    
    curves: {
        title: "Flow Curve Settings",
        icon: "〰️",
        controls: [
            {
                id: "curveIntensity",
                type: "slider",
                label: "Global Curve Intensity",
                min: 0.1,
                max: 0.8,
                default: 0.4,
                step: 0.05,
                description: "Overall curvature of flow connections"
            },
            {
                id: "curvaturePreset",
                type: "dropdown",
                label: "Curve Preset",
                options: [
                    { value: "", label: "Custom" },
                    { value: "gentle", label: "Gentle" },
                    { value: "moderate", label: "Moderate" },
                    { value: "dramatic", label: "Dramatic" },
                    { value: "progressive", label: "Progressive" }
                ],
                default: "",
                description: "Pre-configured curvature patterns"
            },
            {
                id: "layerCurvature",
                type: "custom",
                component: "LayerCurvatureEditor",
                label: "Per-Layer Curves",
                description: "Set different curve intensity for each layer",
                advanced: true
            }
        ]
    },

    styling: {
        title: "Visual Styling",
        icon: "🎨",
        controls: [
            {
                id: "colorScheme",
                type: "dropdown",
                label: "Color Scheme",
                options: [
                    { value: "default", label: "Default Professional" },
                    { value: "corporate", label: "Corporate Blue" },
                    { value: "vibrant", label: "Vibrant" },
                    { value: "accessible", label: "High Contrast" },
                    { value: "monochrome", label: "Monochrome" },
                    { value: "custom", label: "Custom Colors" }
                ],
                default: "default",
                description: "Overall color scheme for the chart"
            },
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
            },
            {
                id: "showValues",
                type: "toggle",
                label: "Show Values",
                default: true,
                description: "Display monetary values on nodes"
            },
            {
                id: "valuePosition",
                type: "dropdown",
                label: "Value Position",
                options: [
                    { value: "auto", label: "Auto Position" },
                    { value: "above", label: "Above Nodes" },
                    { value: "below", label: "Below Nodes" },
                    { value: "center", label: "Center of Nodes" }
                ],
                default: "auto",
                dependsOn: "showValues"
            }
        ]
    },

    advanced: {
        title: "Advanced Options",
        icon: "⚙️",
        collapsed: true,
        controls: [
            {
                id: "dynamicSpaceFill",
                type: "toggle",
                label: "Dynamic Space Filling",
                default: true,
                description: "Automatically optimize space utilization"
            },
            {
                id: "animationDuration",
                type: "slider",
                label: "Animation Speed",
                min: 200,
                max: 2000,
                default: 800,
                step: 100,
                unit: "ms",
                description: "Duration of chart animations"
            },
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
            },
            {
                id: "customColors",
                type: "custom",
                component: "ColorSchemeEditor",
                label: "Custom Color Mapping",
                description: "Define custom colors for each node category",
                dependsOn: { colorScheme: "custom" }
            }
        ]
    }
};

// js/core/ControlPanel.js
class ControlPanel {
    constructor(containerId, eventBus) {
        this.container = d3.select(`#${containerId}`);
        this.eventBus = eventBus;
        this.currentChart = null;
        this.controls = new Map();
        this.updateTimeout = null;
    }

    generateControls(chart) {
        this.currentChart = chart;
        this.container.selectAll('*').remove();
        
        const capabilities = chart.getCapabilities();
        const config = chart.getCurrentConfig();
        
        // Create control sections
        Object.entries(capabilities).forEach(([sectionKey, section]) => {
            this.createControlSection(sectionKey, section, config);
        });
        
        // Add preset management at bottom
        this.createPresetSection();
    }

    createControlSection(sectionKey, section, currentConfig) {
        const sectionDiv = this.container
            .append('div')
            .attr('class', `control-section ${section.collapsed ? 'collapsed' : ''}`)
            .attr('data-section', sectionKey);

        // Section header with icon
        const header = sectionDiv
            .append('div')
            .attr('class', 'control-section-header')
            .on('click', () => this.toggleSection(sectionKey));

        header.append('span')
            .attr('class', 'section-icon')
            .text(section.icon || '📊');

        header.append('h3')
            .attr('class', 'section-title')
            .text(section.title);

        header.append('span')
            .attr('class', 'toggle-icon')
            .text(section.collapsed ? '▶' : '▼');

        // Section content
        const content = sectionDiv
            .append('div')
            .attr('class', 'control-section-content')
            .style('display', section.collapsed ? 'none' : 'block');

        // Create controls
        section.controls.forEach(control => {
            // Check if control should be shown based on dependencies
            if (this.shouldShowControl(control, currentConfig)) {
                this.createControl(content, control, currentConfig);
            }
        });
    }

    shouldShowControl(control, currentConfig) {
        if (!control.dependsOn) return true;
        
        if (typeof control.dependsOn === 'string') {
            return currentConfig[control.dependsOn] === true;
        }
        
        if (typeof control.dependsOn === 'object') {
            return Object.entries(control.dependsOn).every(([key, value]) => 
                currentConfig[key] === value
            );
        }
        
        return true;
    }

    createControl(container, controlConfig, currentConfig) {
        const controlDiv = container
            .append('div')
            .attr('class', `control-item control-${controlConfig.type}`)
            .attr('data-control', controlConfig.id);

        // Control header
        const controlHeader = controlDiv.append('div')
            .attr('class', 'control-header');

        controlHeader.append('label')
            .attr('class', 'control-label')
            .text(controlConfig.label);

        if (controlConfig.unit) {
            controlHeader.append('span')
                .attr('class', 'control-unit')
                .text(controlConfig.unit);
        }

        // Create control element based on type
        switch (controlConfig.type) {
            case 'slider':
                this.createSliderControl(controlDiv, controlConfig, currentConfig);
                break;
            case 'dropdown':
                this.createDropdownControl(controlDiv, controlConfig, currentConfig);
                break;
            case 'toggle':
                this.createToggleControl(controlDiv, controlConfig, currentConfig);
                break;
            case 'color':
                this.createColorControl(controlDiv, controlConfig, currentConfig);
                break;
            case 'custom':
                this.createCustomControl(controlDiv, controlConfig, currentConfig);
                break;
        }

        // Description
        if (controlConfig.description) {
            controlDiv.append('div')
                .attr('class', 'control-description')
                .text(controlConfig.description);
        }
    }

    createSliderControl(container, config, currentConfig) {
        const sliderContainer = container.append('div')
            .attr('class', 'slider-container');
        
        const currentValue = currentConfig[config.id] ?? config.default;
        
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
                this.handleControlChange(config.id, value);
            });

        const valueDisplay = sliderContainer.append('span')
            .attr('class', 'slider-value')
            .text(currentValue);

        this.controls.set(config.id, { element: slider, type: 'slider' });
    }

    createDropdownControl(container, config, currentConfig) {
        const currentValue = currentConfig[config.id] ?? config.default;
        
        const select = container.append('select')
            .attr('class', 'control-dropdown')
            .on('change', (event) => {
                this.handleControlChange(config.id, event.target.value);
            });

        config.options.forEach(option => {
            select.append('option')
                .attr('value', option.value)
                .property('selected', option.value === currentValue)
                .text(option.label);
        });

        this.controls.set(config.id, { element: select, type: 'dropdown' });
    }

    createToggleControl(container, config, currentConfig) {
        const currentValue = currentConfig[config.id] ?? config.default;
        
        const toggleContainer = container.append('div')
            .attr('class', 'toggle-container');

        const checkbox = toggleContainer.append('input')
            .attr('type', 'checkbox')
            .attr('class', 'control-toggle')
            .property('checked', currentValue)
            .on('change', (event) => {
                this.handleControlChange(config.id, event.target.checked);
            });

        const toggleSlider = toggleContainer.append('span')
            .attr('class', 'toggle-slider');

        this.controls.set(config.id, { element: checkbox, type: 'toggle' });
    }

    handleControlChange(controlId, value) {
        if (!this.currentChart) return;

        // Debounce updates for smooth interaction
        clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => {
            const currentConfig = this.currentChart.getCurrentConfig();
            const newConfig = { ...currentConfig, [controlId]: value };
            
            this.currentChart.updateConfig(newConfig);
            this.eventBus.emit('configChanged', { controlId, value, config: newConfig });
        }, 100); // 100ms debounce
    }

    toggleSection(sectionKey) {
        const section = this.container.select(`[data-section="${sectionKey}"]`);
        const content = section.select('.control-section-content');
        const icon = section.select('.toggle-icon');
        
        const isCollapsed = content.style('display') === 'none';
        
        content.style('display', isCollapsed ? 'block' : 'none');
        icon.text(isCollapsed ? '▼' : '▶');
        section.classed('collapsed', !isCollapsed);
    }

    createPresetSection() {
        const presetDiv = this.container
            .append('div')
            .attr('class', 'preset-section');

        presetDiv.append('h3')
            .attr('class', 'preset-title')
            .text('Configuration Presets');

        const presetControls = presetDiv.append('div')
            .attr('class', 'preset-controls');

        // Preset selector
        const presetSelect = presetControls.append('select')
            .attr('class', 'preset-select')
            .on('change', (event) => {
                if (event.target.value) {
                    this.loadPreset(event.target.value);
                }
            });

        presetSelect.append('option')
            .attr('value', '')
            .text('Choose preset...');

        // Save current preset button
        presetControls.append('button')
            .attr('class', 'btn btn-secondary')
            .text('Save Current')
            .on('click', () => this.saveCurrentPreset());

        // Reset to defaults button
        presetControls.append('button')
            .attr('class', 'btn btn-outline')
            .text('Reset Defaults')
            .on('click', () => this.resetToDefaults());
    }
}