/* ===== GENERIC CONTROL PANEL - ENHANCED WITH BETTER LAYOUT ===== */
/* Chart-agnostic control panel with improved color grid layout and responsiveness */

class PulseControlPanel {
    constructor(containerId) {
        this.container = d3.select(`#${containerId}`);
        this.chart = null;
        this.controlModule = null;
        this.config = {};
        this.updateTimeout = null;
        
        // Initialize horizontal menu system
        this.initializeHorizontalMenu();
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
        console.log('📊 Chart data available:', !!chart.data, chart.data?.length || 0);
        
        // **CRITICAL FIX: For bar charts, ensure dynamic controls are properly initialized**
        if (controlModule && controlModule.hasDynamicControls && controlModule.hasDynamicControls()) {
            console.log('🔄 Chart has dynamic controls, checking data availability');
            if (chart.data && chart.data.length > 0) {
                console.log('✅ Chart has data, initializing dynamic controls');
                controlModule.initializeDynamicControls(chart);
            } else {
                console.log('⚠️ Chart has no data yet, will initialize basic controls and update later');
            }
        }
        
        this.generateControls();
    }

    // Initialize horizontal menu interactions
    initializeHorizontalMenu() {
        // Set up menu triggers and dropdown behavior
        document.addEventListener('DOMContentLoaded', () => {
            this.setupMenuInteractions();
        });
        
        // If DOM is already loaded, set up immediately
        if (document.readyState === 'loading') {
            // DOM not ready yet
        } else {
            this.setupMenuInteractions();
        }
    }

    // Set up menu click handlers and interactions
    setupMenuInteractions() {
        const menuTriggers = document.querySelectorAll('.menu-trigger');
        const dropdowns = document.querySelectorAll('.menu-dropdown');
        
        menuTriggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const target = trigger.getAttribute('data-target');
                const dropdown = document.getElementById(`${target}-dropdown`);
                const section = trigger.closest('.menu-section');
                
                // Close all other dropdowns
                dropdowns.forEach(dd => {
                    if (dd !== dropdown) {
                        dd.classList.remove('active');
                        dd.closest('.menu-section').classList.remove('open');
                    }
                });
                
                // Toggle current dropdown
                const isOpen = dropdown.classList.contains('active');
                if (isOpen) {
                    dropdown.classList.remove('active');
                    section.classList.remove('open');
                } else {
                    dropdown.classList.add('active');
                    section.classList.add('open');
                }
            });
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', () => {
            dropdowns.forEach(dropdown => {
                dropdown.classList.remove('active');
                dropdown.closest('.menu-section').classList.remove('open');
            });
        });
        
        // Prevent dropdown close when clicking inside
        dropdowns.forEach(dropdown => {
            dropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        });
    }

    // Generate controls based on the chart's control module capabilities
    generateControls() {
        if (!this.controlModule) {
            console.error('No control module provided to ControlPanel');
            return;
        }

        // Clear all dropdown contents
        this.clearAllDropdowns();
        
        const capabilities = this.controlModule.capabilities;
        console.log('🎛️ Control capabilities:', Object.keys(capabilities));
        
        // Map sections to menu categories based on workflow
        const sectionMapping = {
            'data': ['general', 'chart_type', 'data_controls'],
            'style': ['style', 'typography', 'theme', 'text', 'font', 'appearance'],
            'layout': ['layout', 'spacing', 'positioning', 'dimensions', 'margin', 'padding'],
            'display': ['display', 'labels', 'visibility', 'interaction', 'show', 'hide'],
            'colors': ['colors', 'color_scheme', 'color_customization', 'palette']
        };
        
        // Distribute controls across menu sections
        Object.entries(capabilities).forEach(([sectionKey, section]) => {
            const menuCategory = this.findMenuCategory(sectionKey, sectionMapping);
            console.log(`🎛️ Mapping section "${sectionKey}" to menu category "${menuCategory}"`);
            this.createControlsInMenu(menuCategory, sectionKey, section);
        });
        
        console.log('✅ Generated horizontal menu controls');
    }

    // Clear all dropdown contents, preserving data-controls static content
    clearAllDropdowns() {
        const dropdownContents = [
            '#style-controls', 
            '#layout-controls',
            '#display-controls',
            '#colors-controls'
        ];
        
        dropdownContents.forEach(selector => {
            const container = d3.select(selector);
            if (!container.empty()) {
                container.selectAll('*').remove();
            }
        });
        
        // For data-controls, only clear dynamically generated sections, preserve static content
        const dataContainer = d3.select('#data-controls');
        if (!dataContainer.empty()) {
            dataContainer.selectAll('.menu-control-section').remove();
        }
    }

    // Find which menu category a section belongs to
    findMenuCategory(sectionKey, sectionMapping) {
        const lowerKey = sectionKey.toLowerCase();
        
        // First check exact matches
        for (const [category, sections] of Object.entries(sectionMapping)) {
            if (sections.includes(lowerKey) || sections.some(s => lowerKey.includes(s))) {
                return category;
            }
        }
        
        // Enhanced keyword matching
        if (lowerKey.includes('color') || lowerKey.includes('palette') || lowerKey === 'colors') return 'colors';
        if (lowerKey.includes('style') || lowerKey.includes('styling') || lowerKey.includes('font') || lowerKey.includes('text') || lowerKey.includes('typography') || lowerKey.includes('appearance') || lowerKey.includes('branding')) return 'style';
        if (lowerKey.includes('layout') || lowerKey.includes('spacing') || lowerKey.includes('margin') || lowerKey.includes('dimension')) return 'layout';
        if (lowerKey.includes('display') || lowerKey.includes('label') || lowerKey.includes('show') || lowerKey.includes('visibility')) return 'display';
        if (lowerKey.includes('general') || lowerKey.includes('chart') || lowerKey.includes('data')) return 'data';
        
        console.log(`⚠️ Unmatched section "${sectionKey}" defaulting to 'data'`);
        return 'data'; // Default fallback
    }

    // Create controls within a specific menu dropdown
    createControlsInMenu(menuCategory, sectionKey, section) {
        const container = d3.select(`#${menuCategory}-controls`);
        if (container.empty()) {
            console.warn(`Menu container not found for category: ${menuCategory}`);
            return;
        }

        // Create section within the menu
        const sectionDiv = container
            .append('div')
            .attr('class', `menu-control-section ${section.collapsed ? 'collapsed' : ''}`)
            .attr('data-section', sectionKey);

        // Add section header (collapsible within dropdown)
        const header = sectionDiv
            .append('div')
            .attr('class', 'menu-section-header')
            .on('click', () => this.toggleMenuSection(sectionKey));

        header.append('span').attr('class', 'section-icon').text(section.icon || '⚙️');
        header.append('h4').attr('class', 'section-title').text(section.title);
        header.append('span').attr('class', 'toggle-icon').text(section.collapsed ? '▶' : '▼');

        const content = sectionDiv
            .append('div')
            .attr('class', 'menu-section-content')
            .style('display', section.collapsed ? 'none' : 'block');

        // Special handling for color section
        if (sectionKey === 'colors' || menuCategory === 'colors') {
            this.createColorSection(content, section);
        } else {
            section.controls.forEach(control => {
                this.createControl(content, control);
            });
        }
    }

    // Toggle menu section within dropdown
    toggleMenuSection(sectionKey) {
        const section = d3.select(`[data-section="${sectionKey}"]`);
        const content = section.select('.menu-section-content');
        const icon = section.select('.toggle-icon');
        
        const isHidden = content.style('display') === 'none';
        content.style('display', isHidden ? 'block' : 'none');
        icon.text(isHidden ? '▼' : '▶');
        section.classed('collapsed', !isHidden);
    }

    // Create a control section (Legacy method - kept for backwards compatibility)
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

        // Add color controls - filter for both 'color' and 'color_picker' types
        const colorControls = section.controls.filter(c => c.type === 'color' || c.type === 'color_picker');
        colorControls.forEach(control => {
            this.createColorItem(colorGrid, control);
        });

        // Add non-color controls (like toggles, dropdowns, sliders) to the color section
        const nonColorControls = section.controls.filter(c => 
            c.type !== 'color' && c.type !== 'color_picker' && c.type !== 'preset_controls'
        );
        
        if (nonColorControls.length > 0) {
            // Create a separate container for non-color controls in the color section
            const controlsContainer = colorDiv
                .append('div')
                .attr('class', 'color-section-controls')
                .style('margin-top', '20px')
                .style('padding-top', '20px')
                .style('border-top', '1px solid rgba(226, 232, 240, 0.6)');
            
            nonColorControls.forEach(control => {
                this.createControl(controlsContainer, control);
            });
        }
    }

    // Create compact color preset buttons
    createColorPresets(container) {
        const presetsDiv = container
            .append('div')
            .attr('class', 'color-presets-modern')
            .style('margin-bottom', '10px')
            .style('padding', '8px')
            .style('background', 'rgba(248, 250, 252, 0.3)')
            .style('border-radius', '6px')
            .style('border', '1px solid rgba(226, 232, 240, 0.4)');

        presetsDiv
            .append('div')
            .attr('class', 'presets-title')
            .style('font-weight', '600')
            .style('margin-bottom', '6px')
            .style('color', '#374151')
            .style('font-size', '12px')
            .style('letter-spacing', '-0.01em')
            .text('Color Themes');

        const buttonContainer = presetsDiv
            .append('div')
            .attr('class', 'preset-buttons-modern')
            .style('display', 'grid')
            .style('grid-template-columns', 'repeat(2, 1fr)')
            .style('gap', '4px');

        const presets = [
            { key: 'default', label: 'Default', colors: ['#3b82f6', '#10b981', '#f59e0b'], description: 'Clean & balanced' },
            { key: 'vibrant', label: 'Vibrant', colors: ['#ef4444', '#8b5cf6', '#06b6d4'], description: 'Bold & energetic' },
            { key: 'monochrome', label: 'Monochrome', colors: ['#111827', '#4b5563', '#9ca3af'], description: 'Grayscale elegance' },
            { key: 'random', label: 'Random', colors: ['#random'], description: 'Surprise me!' }
        ];

        presets.forEach(preset => {
            const presetCard = buttonContainer
                .append('div')
                .attr('class', 'preset-card')
                .style('background', 'white')
                .style('border', '1px solid rgba(226, 232, 240, 0.8)')
                .style('border-radius', '4px')
                .style('padding', '6px 8px')
                .style('cursor', 'pointer')
                .style('transition', 'all 0.15s ease')
                .style('text-align', 'center')
                .style('position', 'relative')
                .style('overflow', 'hidden')
                .on('mouseover', function() {
                    d3.select(this)
                        .style('border-color', '#6366f1')
                        .style('transform', 'translateY(-2px)')
                        .style('box-shadow', '0 8px 24px rgba(99, 102, 241, 0.15)');
                })
                .on('mouseout', function() {
                    d3.select(this)
                        .style('border-color', 'rgba(226, 232, 240, 0.6)')
                        .style('transform', 'translateY(0)')
                        .style('box-shadow', 'none');
                })
                .on('click', () => {
                    // Add selection feedback
                    buttonContainer.selectAll('.preset-card')
                        .style('border-color', 'rgba(226, 232, 240, 0.6)')
                        .style('background', 'white');
                    
                    d3.select(presetCard.node())
                        .style('border-color', '#6366f1')
                        .style('background', 'rgba(99, 102, 241, 0.05)');

                    if (preset.key === 'random') {
                        this.controlModule.randomizeColors(this.chart);
                    } else {
                        this.controlModule.applyColorPreset(this.chart, preset.key);
                    }
                    // Regenerate controls to show updated colors
                    this.generateControls();
                });

            // Compact preset label only
            presetCard
                .append('div')
                .style('font-weight', '500')
                .style('color', '#374151')
                .style('font-size', '11px')
                .style('margin-bottom', '4px')
                .style('letter-spacing', '-0.01em')
                .text(preset.label);

            // Compact color preview dots
            if (preset.key !== 'random') {
                const colorPreview = presetCard
                    .append('div')
                    .style('display', 'flex')
                    .style('justify-content', 'center')
                    .style('gap', '2px');

                preset.colors.forEach(color => {
                    colorPreview
                        .append('div')
                        .style('width', '8px')
                        .style('height', '8px')
                        .style('border-radius', '50%')
                        .style('background', color)
                        .style('border', '1px solid rgba(255, 255, 255, 0.8)');
                });
            } else {
                // Random pattern for the random option
                const randomPreview = presetCard
                    .append('div')
                    .style('display', 'flex')
                    .style('justify-content', 'center')
                    .style('gap', '2px');

                const randomColors = ['#ff6b6b', '#4ecdc4', '#45b7d1'];
                randomColors.forEach(color => {
                    randomPreview
                        .append('div')
                        .style('width', '8px')
                        .style('height', '8px')
                        .style('border-radius', '50%')
                        .style('background', color)
                        .style('border', '1px solid rgba(255, 255, 255, 0.8)');
                });
            }
        });
    }

    // Create individual color item with minimalistic design
    createColorItem(container, config) {
        const colorItem = container
            .append('div')
            .attr('class', 'color-item-minimal')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '8px')
            .style('padding', '2px 0')
            .style('margin-bottom', '1px');

        // **CRITICAL: Get current color from chart, not just config defaults**
        let currentValue = this.getCurrentValue(config);
        
        console.log(`🎨 Creating color control for ${config.id}, current value: ${currentValue}`);

        // Minimal color picker
        const colorPicker = colorItem
            .append('input')
            .attr('type', 'color')
            .attr('class', 'color-picker-minimal')
            .attr('value', currentValue)
            .style('width', '16px')
            .style('height', '16px')
            .style('border', 'none')
            .style('border-radius', '2px')
            .style('cursor', 'pointer')
            .style('background', 'none')
            .style('padding', '0')
            .style('margin', '0')
            .style('outline', 'none')
            .on('change', (event) => {
                console.log(`🎨 Color changed for ${config.id}: ${event.target.value}`);
                this.handleChange(config.id, event.target.value);
            });

        // Minimal label only
        colorItem
            .append('span')
            .attr('class', 'color-label-minimal')
            .style('font-size', '12px')
            .style('font-weight', '500')
            .style('color', '#374151')
            .style('line-height', '1.2')
            .text(config.label);
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
            .style('margin-bottom', '2px');

        const header = controlDiv.append('div').attr('class', 'control-header');
        header.append('label').attr('class', 'control-label').text(config.label);

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
            case 'button':
                this.createButtonControl(controlDiv, config);
                break;
            case 'color_picker':
                this.createColorPickerControl(controlDiv, config);
                break;
            case 'info':
                this.createInfoControl(controlDiv, config);
                break;
            case 'custom':
                this.createCustomControl(controlDiv, config);
                break;
            case 'file_upload':
                this.createFileUploadControl(controlDiv, config);
                break;
            case 'text':
                this.createTextControl(controlDiv, config);
                break;
            case 'header':
                this.createHeaderControl(controlDiv, config);
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
            .attr('data-value', this.formatValueClean(currentValue, config))
            .style('width', '100%')
            .on('input', (event) => {
                const value = parseFloat(event.target.value);
                // Update data attribute for CSS display
                event.target.setAttribute('data-value', this.formatValueClean(value, config));
                this.updateSliderTooltip(event.target, value, config);
                this.handleChange(config.id, value);
            })
            .on('mousedown', (event) => {
                this.showSliderTooltip(event.target, parseFloat(event.target.value), config);
            })
            .on('mouseup', (event) => {
                this.hideSliderTooltip(event.target);
            })
            .on('mouseleave', (event) => {
                this.hideSliderTooltip(event.target);
            });
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

    // Create checkbox control (was toggle)
    createToggleControl(container, config) {
        let currentValue = this.getCurrentValue(config);
        
        const checkboxContainer = container.append('div')
            .attr('class', 'checkbox-container')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '8px')
            .style('margin-top', '8px');

        const checkbox = checkboxContainer.append('input')
            .attr('type', 'checkbox')
            .attr('class', 'control-checkbox')
            .attr('id', `checkbox-${config.id}`)
            .property('checked', currentValue)
            .style('width', '18px')
            .style('height', '18px')
            .style('cursor', 'pointer')
            .style('accent-color', '#3b82f6')
            .style('margin', '0')
            .style('transition', 'transform 0.15s ease')
            .on('change', (event) => {
                console.log(`✅ Checkbox changed: ${config.id} = ${event.target.checked}`);
                
                // Visual feedback for the change
                const checkboxEl = d3.select(event.target);
                checkboxEl.style('transform', 'scale(1.1)');
                setTimeout(() => {
                    checkboxEl.style('transform', 'scale(1)');
                }, 150);
                
                this.handleChange(config.id, event.target.checked);
            });

        checkboxContainer.append('label')
            .attr('for', `checkbox-${config.id}`)
            .style('font-size', '14px')
            .style('color', '#374151')
            .style('cursor', 'pointer')
            .text(config.label);
    }

    // Create button control
    createButtonControl(container, config) {
        container.append('button')
            .attr('class', 'control-button')
            .style('width', '100%')
            .style('padding', '8px 16px')
            .style('border', 'none')
            .style('border-radius', '6px')
            .style('background', '#3b82f6')
            .style('color', 'white')
            .style('font-size', '14px')
            .style('font-weight', '500')
            .style('cursor', 'pointer')
            .style('transition', 'all 0.2s ease')
            .text(config.label)
            .on('mouseover', function() {
                d3.select(this)
                    .style('background', '#2563eb')
                    .style('transform', 'translateY(-1px)')
                    .style('box-shadow', '0 4px 12px rgba(59, 130, 246, 0.3)');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .style('background', '#3b82f6')
                    .style('transform', 'translateY(0)')
                    .style('box-shadow', 'none');
            })
            .on('click', () => {
                if (config.action === 'resetZoom') {
                    // Use ChartZoom utility for resetZoom action with fallback
                    if (window.ChartZoom && window.ChartZoom.resetZoom) {
                        ChartZoom.resetZoom.call(this.chart);
                        console.log(`🔘 Button action executed: ${config.action} via ChartZoom`);
                    } else if (this.chart && typeof this.chart.resetZoom === 'function') {
                        this.chart.resetZoom();
                        console.log(`🔘 Button action executed: ${config.action} via chart method`);
                    } else {
                        console.warn('No resetZoom method available');
                    }
                } else if (config.action && this.chart && typeof this.chart[config.action] === 'function') {
                    // Call the action method on the chart
                    this.chart[config.action]();
                    console.log(`🔘 Button action executed: ${config.action}`);
                } else {
                    console.warn(`Button action '${config.action}' not found on chart`);
                }
            });
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
        container.append('div')
            .attr('class', 'control-custom')
            .text(`Custom control: ${config.component || 'Unknown'}`);
        
        console.warn(`Custom control type '${config.component}' not implemented`);
    }

    // Create file upload control
    createFileUploadControl(container, config) {
        const uploadContainer = container.append('div')
            .attr('class', 'file-upload-container')
            .style('position', 'relative');

        // Hidden file input
        const fileInput = uploadContainer.append('input')
            .attr('type', 'file')
            .attr('id', `file-${config.id}`)
            .attr('accept', config.accept || 'image/*')
            .style('position', 'absolute')
            .style('opacity', '0')
            .style('width', '100%')
            .style('height', '100%')
            .style('cursor', 'pointer')
            .on('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    this.handleChange(config.id, file);
                    // Update button text to show file name
                    uploadButton.text(`📁 ${file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name}`);
                }
            });

        // Upload button
        const uploadButton = uploadContainer.append('button')
            .attr('class', 'file-upload-button')
            .style('width', '100%')
            .style('padding', '12px 16px')
            .style('border', '2px dashed #d1d5db')
            .style('border-radius', '8px')
            .style('background', '#f9fafb')
            .style('color', '#374151')
            .style('font-size', '14px')
            .style('font-weight', '500')
            .style('cursor', 'pointer')
            .style('transition', 'all 0.2s ease')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('justify-content', 'center')
            .style('gap', '8px')
            .text('📁 Choose File')
            .on('mouseover', function() {
                d3.select(this)
                    .style('border-color', '#6366f1')
                    .style('background', '#f8faff')
                    .style('color', '#6366f1');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .style('border-color', '#d1d5db')
                    .style('background', '#f9fafb')
                    .style('color', '#374151');
            })
            .on('click', () => {
                fileInput.node().click();
            });

        // File info display
        if (config.maxSize || config.accept) {
            uploadContainer.append('div')
                .attr('class', 'file-upload-info')
                .style('margin-top', '8px')
                .style('font-size', '11px')
                .style('color', '#6b7280')
                .style('text-align', 'center')
                .text(`${config.accept || 'All files'} • ${config.maxSize || 'No size limit'}`);
        }
    }

    createTextControl(container, config) {
        const textInput = container.append('input')
            .attr('type', 'text')
            .attr('id', `text-${config.id}`)
            .attr('placeholder', config.placeholder || '')
            .attr('value', config.value || '')
            .style('width', '100%')
            .style('padding', '8px 12px')
            .style('border', '1px solid #d1d5db')
            .style('border-radius', '6px')
            .style('font-size', '14px')
            .style('color', '#374151')
            .style('background', '#ffffff')
            .style('transition', 'border-color 0.2s ease')
            .on('input', (event) => {
                this.handleChange(config.id, event.target.value);
            })
            .on('focus', function() {
                d3.select(this).style('border-color', '#6366f1');
            })
            .on('blur', function() {
                d3.select(this).style('border-color', '#d1d5db');
            });
    }

    // Create header control (for section headers within dropdowns)
    createHeaderControl(container, config) {
        const headerDiv = container.append('div')
            .attr('class', 'control-header-item')
            .style('font-size', '13px')
            .style('font-weight', '600')
            .style('color', '#374151')
            .style('margin', '8px 0 4px 0')
            .style('padding', '0')
            .style('border-bottom', '1px solid rgba(0, 0, 0, 0.08)')
            .style('padding-bottom', '2px')
            .text(config.label || config.text || 'Header');
    }

    // Create color picker control with minimalistic design
    createColorPickerControl(container, config) {
        const currentValue = this.getCurrentValue(config);
        
        console.log(`🎨 Creating color picker for ${config.id}, current value: ${currentValue}`);

        const colorItem = container
            .append('div')
            .attr('class', 'color-picker-item-minimal')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('gap', '8px')
            .style('padding', '2px 0')
            .style('margin-bottom', '1px');

        // Minimal color picker
        const colorPicker = colorItem
            .append('input')
            .attr('type', 'color')
            .attr('class', 'color-picker-minimal')
            .attr('value', currentValue)
            .style('width', '16px')
            .style('height', '16px')
            .style('border', 'none')
            .style('border-radius', '2px')
            .style('cursor', 'pointer')
            .style('background', 'none')
            .style('padding', '0')
            .style('margin', '0')
            .style('outline', 'none')
            .on('change', (event) => {
                const newValue = event.target.value;
                this.handleChange(config.id, newValue);
            });

        // Minimal label only
        colorItem
            .append('span')
            .attr('class', 'color-label-minimal')
            .style('font-size', '12px')
            .style('font-weight', '500')
            .style('color', '#374151')
            .style('line-height', '1.2')
            .text(config.label);
    }

    /**
     * FIXED: Get current value with proper color detection and chart synchronization
     */
    getCurrentValue(config) {
        // **CRITICAL: Handle color controls by getting from chart's custom colors**
        if (config.type === 'color' || config.type === 'color_picker') {
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

    /**
     * Format value for display without units (for tooltips)
     */
    formatValueClean(value, config) {
        if (config.step && config.step < 1) {
            return parseFloat(value).toFixed(2);
        }
        return value.toString();
    }

    /**
     * Show slider tooltip that follows the thumb position
     */
    showSliderTooltip(sliderElement, value, config) {
        const tooltip = d3.select('body').append('div')
            .attr('class', 'slider-tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '4px 8px')
            .style('border-radius', '4px')
            .style('font-size', '11px')
            .style('font-weight', '500')
            .style('white-space', 'nowrap')
            .style('z-index', '1000')
            .style('pointer-events', 'none')
            .style('opacity', '0')
            .text(this.formatValueClean(value, config));

        this.positionSliderTooltip(sliderElement, tooltip.node(), value, config);
        
        tooltip.transition()
            .duration(150)
            .style('opacity', '1');
    }

    /**
     * Update slider tooltip position and value during drag
     */
    updateSliderTooltip(sliderElement, value, config) {
        const tooltip = d3.select('.slider-tooltip');
        if (!tooltip.empty()) {
            tooltip.text(this.formatValueClean(value, config));
            this.positionSliderTooltip(sliderElement, tooltip.node(), value, config);
        }
    }

    /**
     * Position tooltip above the slider thumb based on current value
     */
    positionSliderTooltip(sliderElement, tooltipElement, value, config) {
        const rect = sliderElement.getBoundingClientRect();
        const min = parseFloat(sliderElement.min);
        const max = parseFloat(sliderElement.max);
        const percentage = (value - min) / (max - min);
        
        // Calculate thumb position accounting for thumb width
        const thumbWidth = 24; // Approximate thumb width
        const trackWidth = rect.width - thumbWidth;
        const thumbPosition = percentage * trackWidth + (thumbWidth / 2);
        
        const left = rect.left + thumbPosition;
        const top = rect.top - 35; // Position above the slider
        
        d3.select(tooltipElement)
            .style('left', `${left}px`)
            .style('top', `${top}px`)
            .style('transform', 'translateX(-50%)'); // Center on thumb
    }

    /**
     * Hide slider tooltip
     */
    hideSliderTooltip(sliderElement) {
        const tooltip = d3.select('.slider-tooltip');
        if (!tooltip.empty()) {
            tooltip.transition()
                .duration(150)
                .style('opacity', '0')
                .remove();
        }
    }

    // FIXED: Handle control value changes with proper opacity updates
    handleChange(controlId, value) {
        console.log(`🎛️ ControlPanel.handleChange called: ${controlId} = ${value}`);
        console.log(`🎛️ Chart exists: ${!!this.chart}`);
        console.log(`🎛️ Chart type: ${this.chart?.constructor?.name}`);
        console.log(`🎛️ Control module exists: ${!!this.controlModule}`);
        console.log(`🎛️ Control module type: ${this.controlModule?.constructor?.name}`);
        console.log(`🎛️ Control module has handleControlChange: ${typeof this.controlModule?.handleControlChange}`);
        
        if (!this.chart) {
            console.error('❌ ControlPanel: No chart instance available for control change');
            return;
        }
        
        if (!this.controlModule) {
            console.error('❌ ControlPanel: No control module available for control change');
            return;
        }

        // Update local config
        this.updateLocalConfig(controlId, value);

        // **UNIVERSAL FIX: Define controls that need immediate updates (no debounce)**
        const IMMEDIATE_UPDATE_CONTROLS = [
            // Chart type and structural controls - CRITICAL for immediate visual feedback
            'barChartType', 'chartType', 'orientation',
            
            // Opacity controls - already working
            'nodeOpacity', 'linkOpacity', 'barOpacity',
            
            // Font controls - typography should be instant
            'titleFont', 'titleColor', 'titleSize',
            
            // Toggle controls that affect visibility - should be instant
            'showGrid', 'showXAxis', 'showYAxis', 'showBarLabels', 'showValues',
            'useColorScheme',
            
            // Background controls
            'backgroundColor',
            
            // Layout controls - should provide immediate visual feedback
            'chartWidthScale', 'autoFitContainer', 'leftMargin', 'rightMargin', 'topMargin', 'bottomMargin',
            
            // Label positioning controls - should provide immediate visual feedback
            'valuePosition', 'valueFontSize', 'valueOffset'
        ];

        // **FIXED: Handle controls that need immediate updates**
        if (IMMEDIATE_UPDATE_CONTROLS.includes(controlId) || controlId.endsWith('Color')) {
            console.log(`🚀 ControlPanel: Applying immediate update for ${controlId} = ${value}`);
            // Apply immediately without debounce for responsive feel
            if (this.controlModule && this.controlModule.handleControlChange) {
                this.controlModule.handleControlChange(controlId, value, this.chart);
            }
            return;
        }


        // Debounce other updates for smooth interaction
        clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => {
            try {
                if (this.controlModule && this.controlModule.handleControlChange) {
                    // Use chart-specific change handler if available
                    console.log(`🎛️ Control Panel: Calling controlModule.handleControlChange for ${controlId}`);
                    this.controlModule.handleControlChange(controlId, value, this.chart);
                    console.log(`✅ Control Panel: Successfully handled ${controlId} via control module`);
                } else {
                    // Fall back to generic chart update
                    console.log(`⚠️ Control Panel: No control module handler, falling back to chart.updateConfig for ${controlId}`);
                    if (this.chart && typeof this.chart.updateConfig === 'function') {
                        this.chart.updateConfig({ [controlId]: value });
                        console.log(`✅ Control Panel: Successfully updated ${controlId} via chart.updateConfig`);
                    } else {
                        console.error(`❌ Control Panel: No updateConfig method available on chart for ${controlId}`);
                        console.log('📊 Chart details:', {
                            hasChart: !!this.chart,
                            chartType: this.chart?.constructor?.name,
                            hasUpdateConfig: typeof this.chart?.updateConfig,
                            availableMethods: this.chart ? Object.getOwnPropertyNames(Object.getPrototypeOf(this.chart)) : []
                        });
                    }
                }
            } catch (error) {
                console.error(`❌ Control Panel: Error handling control change for ${controlId}:`, error);
                // Try fallback to chart.updateConfig if control module failed
                if (this.chart && typeof this.chart.updateConfig === 'function') {
                    console.log(`🔄 Control Panel: Attempting fallback to chart.updateConfig for ${controlId}`);
                    try {
                        this.chart.updateConfig({ [controlId]: value });
                        console.log(`✅ Control Panel: Fallback successful for ${controlId}`);
                    } catch (fallbackError) {
                        console.error(`❌ Control Panel: Fallback also failed for ${controlId}:`, fallbackError);
                    }
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
        
        // **CRITICAL FIX: Re-initialize dynamic controls when chart updates**
        if (controlModule && controlModule.hasDynamicControls && controlModule.hasDynamicControls()) {
            console.log('🔄 Updating chart with dynamic controls');
            if (chart.data && chart.data.length > 0) {
                console.log('✅ Chart has data, re-initializing dynamic controls');
                controlModule.initializeDynamicControls(chart);
            }
        }
        
        this.generateControls();
    }

    // **NEW METHOD: Force refresh controls after data is loaded**
    refreshAfterDataLoad(chart) {
        if (!chart || !this.controlModule) {
            console.warn('⚠️ Cannot refresh controls - missing chart or control module');
            return;
        }
        
        console.log('🔄 Refreshing control panel after data load');
        
        // Update chart reference
        this.chart = chart;
        this.config = { ...chart.config };
        
        // Re-initialize dynamic controls with new data
        if (this.controlModule.hasDynamicControls && this.controlModule.hasDynamicControls()) {
            console.log('🎛️ Re-initializing dynamic controls with data');
            this.controlModule.initializeDynamicControls(chart);
        }
        
        // Regenerate all controls
        this.generateControls();
        
        console.log('✅ Control panel refreshed successfully');
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