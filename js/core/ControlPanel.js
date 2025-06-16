/* ===== GENERIC CONTROL PANEL - ENHANCED WITH BETTER LAYOUT ===== */
/* Chart-agnostic control panel with improved color grid layout and responsiveness */

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
        
        // **CRITICAL: Properly synchronize config with chart's actual config**
        this.config = { ...chart.config };
        
        console.log('🎛️ Control panel initializing with config:', this.config);
        console.log('📊 Chart config:', chart.config);
        console.log('🎨 Chart colors:', chart.customColors);
        
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
        
        console.log('✅ Generated controls for all sections');
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

        // Special handling for color section
        if (sectionKey === 'colors') {
            this.createColorSection(content, section);
        } else {
            section.controls.forEach(control => {
                this.createControl(content, control);
            });
        }
    }

    // Create enhanced color section with grid layout
    createColorSection(container, section) {
        const colorDiv = container
            .append('div')
            .attr('class', 'color-customization')
            .style('padding', '20px');

        // Add preset controls first
        const presetControl = section.controls.find(c => c.type === 'preset_controls');
        if (presetControl) {
            this.createColorPresets(colorDiv);
        }

        // Create color grid
        const colorGrid = colorDiv
            .append('div')
            .attr('class', 'color-grid')
            .style('display', 'grid')
            .style('grid-template-columns', 'repeat(auto-fit, minmax(280px, 1fr))')
            .style('gap', '16px')
            .style('margin-top', '20px');

        // Add color controls
        const colorControls = section.controls.filter(c => c.type === 'color');
        colorControls.forEach(control => {
            this.createColorItem(colorGrid, control);
        });
    }

    // Create color preset buttons
    createColorPresets(container) {
        const presetsDiv = container
            .append('div')
            .attr('class', 'color-presets')
            .style('margin-bottom', '16px')
            .style('padding-bottom', '16px')
            .style('border-bottom', '1px solid #e1e5e9');

        presetsDiv
            .append('div')
            .style('font-weight', '600')
            .style('margin-bottom', '8px')
            .style('color', '#374151')
            .text('Color Presets:');

        const buttonContainer = presetsDiv
            .append('div')
            .attr('class', 'preset-buttons')
            .style('display', 'flex')
            .style('gap', '8px')
            .style('flex-wrap', 'wrap');

        const presets = [
            { key: 'default', label: 'Default' },
            { key: 'vibrant', label: 'Vibrant' },
            { key: 'professional', label: 'Professional' },
            { key: 'monochrome', label: 'Monochrome' },
            { key: 'random', label: '🎲 Random' }
        ];

        presets.forEach(preset => {
            buttonContainer
                .append('button')
                .attr('class', 'preset-btn')
                .style('background', '#f8f9fa')
                .style('border', '1px solid #d1d5db')
                .style('padding', '6px 12px')
                .style('border-radius', '4px')
                .style('cursor', 'pointer')
                .style('font-size', '12px')
                .style('transition', 'all 0.2s ease')
                .text(preset.label)
                .on('mouseover', function() {
                    d3.select(this).style('background', '#e5e7eb');
                })
                .on('mouseout', function() {
                    d3.select(this).style('background', '#f8f9fa');
                })
                .on('click', () => {
                    if (preset.key === 'random') {
                        this.controlModule.randomizeColors(this.chart);
                    } else {
                        this.controlModule.applyColorPreset(this.chart, preset.key);
                    }
                    // Regenerate controls to show updated colors
                    this.generateControls();
                });
        });
    }

    // Create individual color item with better layout
    createColorItem(container, config) {
        const colorItem = container
            .append('div')
            .attr('class', 'color-item')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '12px')
            .style('padding', '12px')
            .style('background', '#f8f9fa')
            .style('border-radius', '6px')
            .style('border', '1px solid #e1e5e9');

        // **CRITICAL: Get current color from chart, not just config defaults**
        let currentValue = this.getCurrentValue(config);
        
        console.log(`🎨 Creating color control for ${config.id}, current value: ${currentValue}`);

        const colorPicker = colorItem
            .append('input')
            .attr('type', 'color')
            .attr('class', 'color-picker')
            .attr('value', currentValue)
            .style('width', '40px')
            .style('height', '40px')
            .style('border', '2px solid #d1d5db')
            .style('border-radius', '6px')
            .style('cursor', 'pointer')
            .style('background', 'none')
            .style('padding', '0')
            .style('transition', 'all 0.2s ease')
            .on('mouseover', function() {
                d3.select(this)
                    .style('border-color', '#667eea')
                    .style('transform', 'scale(1.05)');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .style('border-color', '#d1d5db')
                    .style('transform', 'scale(1)');
            })
            .on('change', (event) => {
                console.log(`🎨 Color changed for ${config.id}: ${event.target.value}`);
                this.handleChange(config.id, event.target.value);
            });

        const colorInfo = colorItem
            .append('div')
            .attr('class', 'color-info')
            .style('flex', '1');

        colorInfo
            .append('div')
            .attr('class', 'color-label')
            .style('font-weight', '600')
            .style('color', '#374151')
            .style('margin-bottom', '2px')
            .text(config.label);

        colorInfo
            .append('div')
            .attr('class', 'color-description')
            .style('font-size', '12px')
            .style('color', '#6b7280')
            .text(config.description);
    }

    // Create individual control elements
    createControl(container, config) {
        // Skip color controls as they're handled separately
        if (config.type === 'color' || config.type === 'preset_controls') {
            return;
        }

        const controlDiv = container
            .append('div')
            .attr('class', 'control-item')
            .style('margin-bottom', '16px');

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
            case 'info':
                this.createInfoControl(controlDiv, config);
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
                .style('font-size', '12px')
                .style('color', '#6b7280')
                .style('margin-top', '4px')
                .text(config.description);
        }
    }

    // Create slider control
    createSliderControl(container, config) {
        const sliderContainer = container.append('div').attr('class', 'slider-container');
        
        // **ENHANCED: Get current value with proper chart synchronization**
        let currentValue = this.getCurrentValue(config);
        
        const slider = sliderContainer.append('input')
            .attr('type', 'range')
            .attr('min', config.min)
            .attr('max', config.max)
            .attr('step', config.step)
            .attr('value', currentValue)
            .attr('class', 'control-slider')
            .style('width', '100%')
            .on('input', (event) => {
                const value = parseFloat(event.target.value);
                valueDisplay.text(this.formatValue(value, config));
                this.handleChange(config.id, value);
            });

        const valueDisplay = sliderContainer.append('span')
            .attr('class', 'slider-value')
            .style('font-weight', '600')
            .style('color', '#374151')
            .text(this.formatValue(currentValue, config));
    }

    // Create dropdown control
    createDropdownControl(container, config) {
        let currentValue = this.getCurrentValue(config);
        
        const select = container.append('select')
            .attr('class', 'control-dropdown')
            .style('width', '100%')
            .style('padding', '8px')
            .style('border-radius', '6px')
            .style('border', '1px solid #d1d5db')
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
        let currentValue = this.getCurrentValue(config);
        
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

    // Create info control (for displaying information)
    createInfoControl(container, config) {
        const infoDiv = container.append('div')
            .attr('class', 'control-info')
            .style('background', '#f8f9fa')
            .style('padding', '12px')
            .style('border-radius', '6px')
            .style('border', '1px solid #e1e5e9')
            .style('font-size', '12px')
            .style('line-height', '1.4')
            .style('color', '#374151')
            .style('white-space', 'pre-line');

        infoDiv.text(config.description || 'Information');
    }

    // Create custom control (placeholder for extensibility)
    createCustomControl(container, config) {
        const customDiv = container.append('div')
            .attr('class', 'control-custom')
            .text(`Custom control: ${config.component || 'Unknown'}`);
        
        console.warn(`Custom control type '${config.component}' not implemented`);
    }

    /**
     * FIXED: Get current value with proper color detection and chart synchronization
     */
    getCurrentValue(config) {
        // **CRITICAL: Handle color controls by getting from chart's custom colors**
        if (config.type === 'color') {
            if (this.controlModule && this.controlModule.getCurrentValue) {
                const value = this.controlModule.getCurrentValue(config.id, this.chart);
                console.log(`🎨 Got color value for ${config.id}: ${value}`);
                return value;
            }
            
            // Fallback: try to get from chart directly
            if (this.chart && this.chart.customColors) {
                const category = config.id.replace('Color', '').toLowerCase();
                if (this.chart.customColors[category]) {
                    console.log(`🎨 Found color in chart.customColors for ${category}: ${this.chart.customColors[category]}`);
                    return this.chart.customColors[category];
                }
            }
            
            // Final fallback to default
            return config.default || '#000000';
        }

        // Handle special cases for complex configuration structures
        if (config.id.includes('Distance')) {
            // Handle labelDistance and valueDistance objects
            if (config.id === 'labelDistanceLeftmost' && this.config.labelDistance) {
                return this.config.labelDistance.leftmost ?? config.default;
            }
            if (config.id === 'labelDistanceMiddle' && this.config.labelDistance) {
                return this.config.labelDistance.middle ?? config.default;
            }
            if (config.id === 'labelDistanceRightmost' && this.config.labelDistance) {
                return this.config.labelDistance.rightmost ?? config.default;
            }
            if (config.id === 'valueDistanceMiddle' && this.config.valueDistance) {
                return this.config.valueDistance.middle ?? config.default;
            }
            if (config.id === 'valueDistance' && this.config.valueDistance) {
                return this.config.valueDistance.general ?? config.default;
            }
        }

        // Handle dynamic layer controls
        if (config.isDynamic && config.layerDepth !== undefined) {
            if (this.config.layerSpacing && this.config.layerSpacing[config.layerDepth] !== undefined) {
                return this.config.layerSpacing[config.layerDepth];
            }
        }

        // **ENHANCED: Try control module's getCurrentValue method first**
        if (this.controlModule && this.controlModule.getCurrentValue) {
            try {
                const value = this.controlModule.getCurrentValue(config.id, this.chart);
                if (value !== undefined && value !== null) {
                    return value;
                }
            } catch (error) {
                console.warn(`Error getting current value for ${config.id}:`, error);
            }
        }

        // Standard config lookup
        const value = this.config[config.id];
        if (value !== undefined && value !== null) {
            return value;
        }

        // Fallback to default
        return config.default;
    }

    /**
     * Format value for display
     */
    formatValue(value, config) {
        if (config.step && config.step < 1) {
            return parseFloat(value).toFixed(2);
        }
        return value;
    }

    // FIXED: Handle control value changes with proper opacity updates
    handleChange(controlId, value) {
        // Update local config
        this.updateLocalConfig(controlId, value);

        // **FIXED: Handle opacity controls with immediate visual feedback**
        if (controlId === 'nodeOpacity' || controlId === 'linkOpacity') {
            // Apply immediately without debounce for responsive feel
            if (this.controlModule && this.controlModule.handleControlChange) {
                this.controlModule.handleControlChange(controlId, value, this.chart);
            }
            return;
        }

        // **FIXED: Handle color controls with immediate update**
        if (controlId.endsWith('Color')) {
            // Apply immediately without debounce for responsive feel
            if (this.controlModule && this.controlModule.handleControlChange) {
                this.controlModule.handleControlChange(controlId, value, this.chart);
            }
            return;
        }

        // Debounce other updates for smooth interaction
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

    /**
     * Update local config handling complex structures
     */
    updateLocalConfig(controlId, value) {
        // Handle special cases for complex configuration structures
        if (controlId.includes('Distance')) {
            // Handle labelDistance and valueDistance objects
            if (controlId === 'labelDistanceLeftmost') {
                if (!this.config.labelDistance) this.config.labelDistance = {};
                this.config.labelDistance.leftmost = value;
                return;
            }
            if (controlId === 'labelDistanceMiddle') {
                if (!this.config.labelDistance) this.config.labelDistance = {};
                this.config.labelDistance.middle = value;
                return;
            }
            if (controlId === 'labelDistanceRightmost') {
                if (!this.config.labelDistance) this.config.labelDistance = {};
                this.config.labelDistance.rightmost = value;
                return;
            }
            if (controlId === 'valueDistanceMiddle') {
                if (!this.config.valueDistance) this.config.valueDistance = {};
                this.config.valueDistance.middle = value;
                return;
            }
            if (controlId === 'valueDistance') {
                if (!this.config.valueDistance) this.config.valueDistance = {};
                this.config.valueDistance.general = value;
                return;
            }
        }

        // Handle dynamic layer controls
        if (controlId.startsWith('layer_') && controlId.endsWith('_spacing')) {
            const depth = parseInt(controlId.split('_')[1]);
            if (!isNaN(depth)) {
                if (!this.config.layerSpacing) this.config.layerSpacing = {};
                this.config.layerSpacing[depth] = value;
                return;
            }
        }

        // Standard config update
        this.config[controlId] = value;
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
            
            // **ENHANCED: Properly merge defaults with chart config**
            this.config = { ...this.chart.getInitialConfig(), ...defaults };
            
            // Apply defaults to chart
            if (this.chart) {
                this.chart.updateConfig(this.config);
            }
            
            // Regenerate controls with default values
            this.generateControls();
            
            console.log('✅ Reset to defaults complete', this.config);
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

    // FIXED: Apply external configuration with proper color sync
    applyConfig(newConfig) {
        console.log('🔧 Applying new config to control panel:', newConfig);
        
        // **ENHANCED: Properly merge new config**
        this.config = { ...this.config, ...newConfig };
        
        // Apply to chart
        if (this.chart) {
            this.chart.updateConfig(this.config);
        }
        
        // **CRITICAL: Also apply colors if they exist in the config**
        if (newConfig.customColors && this.chart && this.chart.setCustomColors) {
            this.chart.setCustomColors(newConfig.customColors);
        }
        
        // Regenerate controls to reflect new values
        this.generateControls();
        
        console.log('✅ Config applied and controls regenerated');
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

    /**
     * ENHANCED: Update dynamic controls when chart data changes
     */
    updateDynamicControls() {
        if (this.controlModule && this.controlModule.supportsDynamicLayers && this.chart) {
            // Re-initialize dynamic controls
            this.controlModule.updateCapabilities(this.chart);
            
            // Regenerate control panel
            this.generateControls();
            
            console.log('🔄 Updated dynamic controls');
        }
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