/* ===== BAR CHART CONTROLS - FOLLOWING REUSABLE ARCHITECTURE ===== */
/* Bar chart specific controls using the same pattern as SankeyControls.js */

class BarControlModule {
    constructor() {
        this.capabilities = this.defineCapabilities();
        this.dynamicColors = new Map(); // Store detected colors from data
        this.chart = null; // Reference to current chart
    }

    defineCapabilities() {
        const capabilities = {
            // Chart Type and Orientation
            chartType: {
                title: "Chart Configuration",
                icon: "📊",
                collapsed: false,
                controls: [
                    {
                        id: "orientation",
                        type: "dropdown",
                        label: "Orientation",
                        default: "vertical",
                        options: [
                            { value: "vertical", label: "Vertical Bars" },
                            { value: "horizontal", label: "Horizontal Bars" }
                        ],
                        description: "Direction of the bars"
                    },
                    {
                        id: "barPadding",
                        type: "slider",
                        label: "Bar Spacing",
                        min: 0.05,
                        max: 0.5,
                        default: 0.1,
                        step: 0.05,
                        description: "Space between bars (0 = no space, 0.5 = maximum space)"
                    },
                    {
                        id: "barCornerRadius",
                        type: "slider",
                        label: "Corner Radius",
                        min: 0,
                        max: 20,
                        default: 4,
                        step: 1,
                        unit: "px",
                        description: "Rounded corners for bars"
                    }
                ]
            },

            // Visual Styling
            styling: {
                title: "Bar Styling",
                icon: "🎨",
                collapsed: true,
                controls: [
                    {
                        id: "defaultBarColor",
                        type: "color_picker",
                        label: "Default Bar Color",
                        default: "#3498db"
                    },
                    {
                        id: "hoverColor",
                        type: "color_picker",
                        label: "Hover Color",
                        default: "#2980b9"
                    },
                    {
                        id: "barOpacity",
                        type: "slider",
                        label: "Bar Opacity",
                        min: 0.1,
                        max: 1.0,
                        default: 0.8,
                        step: 0.1,
                        description: "Transparency of bars"
                    },
                    {
                        id: "colorScheme",
                        type: "dropdown",
                        label: "Color Scheme",
                        default: "default",
                        options: [
                            { value: "default", label: "Default Blues" },
                            { value: "category10", label: "Category 10" },
                            { value: "financial", label: "Financial" },
                            { value: "pastel", label: "Pastel" },
                            { value: "vibrant", label: "Vibrant" }
                        ],
                        description: "Predefined color schemes for bars"
                    }
                ]
            },

            // Axes and Grid
            axes: {
                title: "Axes & Grid",
                icon: "📏",
                collapsed: true,
                controls: [
                    {
                        id: "showXAxis",
                        type: "toggle",
                        label: "Show X Axis",
                        default: true
                    },
                    {
                        id: "showYAxis",
                        type: "toggle",
                        label: "Show Y Axis",
                        default: true
                    },
                    {
                        id: "showGrid",
                        type: "toggle",
                        label: "Show Grid Lines",
                        default: true
                    },
                    {
                        id: "gridOpacity",
                        type: "slider",
                        label: "Grid Opacity",
                        min: 0.1,
                        max: 1.0,
                        default: 0.5,
                        step: 0.1,
                        description: "Transparency of grid lines"
                    },
                    {
                        id: "axisColor",
                        type: "color_picker",
                        label: "Axis Color",
                        default: "#6b7280"
                    },
                    {
                        id: "gridColor",
                        type: "color_picker",
                        label: "Grid Color",
                        default: "#e5e7eb"
                    }
                ]
            },

            // Labels and Values
            labels: {
                title: "Labels & Values",
                icon: "🏷️",
                collapsed: true,
                controls: [
                    {
                        id: "showBarLabels",
                        type: "toggle",
                        label: "Show Bar Labels",
                        default: true
                    },
                    {
                        id: "showValues",
                        type: "toggle",
                        label: "Show Values",
                        default: true
                    },
                    {
                        id: "labelPosition",
                        type: "dropdown",
                        label: "Label Position",
                        default: "top",
                        options: [
                            { value: "top", label: "Top of Bar" },
                            { value: "middle", label: "Middle of Bar" },
                            { value: "bottom", label: "Bottom of Bar" }
                        ],
                        description: "Where to position the value labels"
                    },
                    {
                        id: "labelOffset",
                        type: "slider",
                        label: "Label Offset",
                        min: 0,
                        max: 20,
                        default: 8,
                        step: 1,
                        unit: "px",
                        description: "Distance of labels from bars"
                    },
                    {
                        id: "labelFontSize",
                        type: "slider",
                        label: "Label Font Size",
                        min: 8,
                        max: 20,
                        default: 12,
                        step: 1,
                        unit: "px",
                        description: "Size of bar labels"
                    },
                    {
                        id: "labelColor",
                        type: "color_picker",
                        label: "Label Color",
                        default: "#374151"
                    }
                ]
            },

            // Value Formatting
            formatting: {
                title: "Value Formatting",
                icon: "💰",
                collapsed: true,
                controls: [
                    {
                        id: "valueFormat",
                        type: "dropdown",
                        label: "Value Format",
                        default: "currency",
                        options: [
                            { value: "currency", label: "Currency ($1,234)" },
                            { value: "number", label: "Number (1,234)" },
                            { value: "percentage", label: "Percentage (12.34%)" }
                        ],
                        description: "How to format displayed values"
                    },
                    {
                        id: "currencySymbol",
                        type: "text",
                        label: "Currency Symbol",
                        default: "$",
                        description: "Symbol to use for currency formatting"
                    },
                    {
                        id: "decimalPlaces",
                        type: "slider",
                        label: "Decimal Places",
                        min: 0,
                        max: 4,
                        default: 0,
                        step: 1,
                        description: "Number of decimal places to show"
                    }
                ]
            },

            // Interactivity
            interaction: {
                title: "Interactivity",
                icon: "🖱️",
                collapsed: true,
                controls: [
                    {
                        id: "enableHover",
                        type: "toggle",
                        label: "Enable Hover Effects",
                        default: true
                    },
                    {
                        id: "enableClick",
                        type: "toggle",
                        label: "Enable Click to Color",
                        default: true
                    },
                    {
                        id: "enableTooltip",
                        type: "toggle",
                        label: "Show Tooltips",
                        default: true
                    },
                    {
                        id: "hoverOpacity",
                        type: "slider",
                        label: "Hover Opacity",
                        min: 0.5,
                        max: 1.0,
                        default: 1.0,
                        step: 0.1,
                        description: "Opacity when hovering over bars"
                    }
                ]
            },

            // Animation
            animation: {
                title: "Animation",
                icon: "⚡",
                collapsed: true,
                controls: [
                    {
                        id: "animationDuration",
                        type: "slider",
                        label: "Animation Duration",
                        min: 200,
                        max: 2000,
                        default: 800,
                        step: 100,
                        unit: "ms",
                        description: "How long animations take"
                    },
                    {
                        id: "animationEasing",
                        type: "dropdown",
                        label: "Animation Easing",
                        default: "easeInOutCubic",
                        options: [
                            { value: "easeLinear", label: "Linear" },
                            { value: "easeQuadOut", label: "Quad Out" },
                            { value: "easeInOutCubic", label: "Cubic In-Out" },
                            { value: "easeBackOut", label: "Back Out" },
                            { value: "easeBounceOut", label: "Bounce Out" }
                        ],
                        description: "Animation easing function"
                    }
                ]
            },

            // Visual Appearance (Background, Fonts, etc.)
            appearance: {
                title: "Visual Appearance",
                icon: "🎭",
                collapsed: true,
                controls: [
                    {
                        id: "backgroundColor",
                        type: "color_picker",
                        label: "Background Color",
                        default: "#f8f9fa"
                    },
                    {
                        id: "titleFont",
                        type: "dropdown",
                        label: "Font Family",
                        default: "Inter",
                        options: [
                            { value: "Inter", label: "Inter (Modern)" },
                            { value: "Roboto", label: "Roboto (Clean)" },
                            { value: "Open Sans", label: "Open Sans (Friendly)" },
                            { value: "Lato", label: "Lato (Professional)" },
                            { value: "Montserrat", label: "Montserrat (Bold)" },
                            { value: "Poppins", label: "Poppins (Rounded)" },
                            { value: "Source Sans Pro", label: "Source Sans Pro (Technical)" },
                            { value: "Nunito", label: "Nunito (Soft)" }
                        ],
                        description: "Font family for all chart text"
                    },
                    {
                        id: "titleColor",
                        type: "color_picker",
                        label: "Text Color",
                        default: "#1f2937"
                    },
                    {
                        id: "globalFontSize",
                        type: "slider",
                        label: "Global Font Size",
                        min: 8,
                        max: 18,
                        default: 12,
                        step: 1,
                        unit: "px",
                        description: "Adjust the size of all text elements"
                    }
                ]
            },

            // Dynamic colors section - will be populated based on actual data
            colors: {
                title: "Bar Colors",
                icon: "🌈",
                collapsed: true,
                controls: [], // Will be dynamically populated
                isDynamic: true
            }
        };

        return capabilities;
    }

    // Method to get default configuration
    getDefaultConfig() {
        return {
            // Chart configuration
            orientation: 'vertical',
            barPadding: 0.1,
            barCornerRadius: 4,

            // Styling
            defaultBarColor: '#3498db',
            hoverColor: '#2980b9',
            barOpacity: 0.8,
            hoverOpacity: 1.0,
            colorScheme: 'default',

            // Axes and grid
            showXAxis: true,
            showYAxis: true,
            showGrid: true,
            gridOpacity: 0.5,
            axisColor: '#6b7280',
            gridColor: '#e5e7eb',

            // Labels
            showBarLabels: true,
            showValues: true,
            labelPosition: 'top',
            labelOffset: 8,
            labelFontSize: 12,
            labelColor: '#374151',

            // Formatting
            valueFormat: 'currency',
            currencySymbol: '$',
            decimalPlaces: 0,

            // Interactivity
            enableHover: true,
            enableClick: true,
            enableTooltip: true,

            // Animation
            animationDuration: 800,
            animationEasing: 'easeInOutCubic',

            // Appearance
            backgroundColor: '#f8f9fa',
            titleFont: 'Inter',
            titleColor: '#1f2937',
            globalFontSize: 12
        };
    }

    // Check if this module has dynamic controls that need to be populated
    hasDynamicControls() {
        return true; // Bar chart colors are dynamic
    }

    // Check if module supports dynamic layers (compatibility method)
    supportsDynamicLayers() {
        return false; // Bar charts don't have layers like Sankey
    }

    // Initialize dynamic controls (e.g., colors based on data)
    initializeDynamicControls(chart) {
        this.populateDynamicColors(chart);
    }

    // Populate dynamic colors based on chart data
    populateDynamicColors(chart) {
        this.chart = chart;
        
        if (!chart) {
            console.log('⚠️ No chart instance provided for dynamic color population');
            return;
        }

        // Handle case where chart data might not be available yet
        if (!chart.data || !chart.data.length) {
            console.log('📊 No bar chart data available for dynamic color population');
            // Set up a basic color control
            this.capabilities.colors.controls = [{
                id: "defaultBarColor",
                type: "color_picker", 
                label: "Default Bar Color",
                default: "#3498db",
                description: "Default color for all bars"
            }];
            return;
        }

        console.log('🎨 Populating dynamic colors for bar chart with', chart.data.length, 'bars');

        // Clear existing dynamic colors
        this.capabilities.colors.controls = [];
        this.dynamicColors.clear();

        // Get current colors from chart
        const colors = chart.getBarColors ? chart.getBarColors() : ['#3498db', '#2ecc71', '#e74c3c', '#f39c12'];

        // Create color controls for each bar category
        chart.data.forEach((barData, index) => {
            const category = barData.category || `Bar ${index + 1}`;
            const currentColor = chart.customColors?.[category] || colors[index % colors.length];
            
            // Store the color
            this.dynamicColors.set(category, currentColor);

            // Create safe ID by replacing non-alphanumeric characters
            const safeId = `barColor_${category.toString().replace(/[^a-zA-Z0-9]/g, '_')}`;

            // Create color control
            const colorControl = {
                id: safeId,
                type: "color_picker",
                label: `${category}`,
                default: currentColor,
                description: `Color for ${category} bars`,
                category: category, // Store category for reference
                isBarColor: true
            };

            this.capabilities.colors.controls.push(colorControl);
        });

        console.log('✅ Dynamic bar colors populated:', this.capabilities.colors.controls.length, 'colors');
    }

    // Handle control changes (required by ControlPanel)
    handleControlChange(controlId, value, chart) {
        if (!chart) {
            console.warn('⚠️ No chart reference available for control change');
            return;
        }

        console.log(`🎛️ Applying bar chart control change: ${controlId} = ${value}`);
        console.log('📊 Chart instance details:', {
            hasChart: !!chart,
            hasConfig: !!chart.config,
            hasUpdateConfig: typeof chart.updateConfig,
            hasSvg: !!chart.svg,
            hasChartGroup: !!chart.chart,
            chartType: chart.constructor.name
        });

        // Handle bar-specific color changes
        if (controlId.startsWith('barColor_')) {
            const colorControl = this.capabilities.colors.controls.find(c => c.id === controlId);
            if (colorControl && colorControl.category) {
                if (!chart.customColors) chart.customColors = {};
                chart.customColors[colorControl.category] = value;
                
                // Update the visual immediately
                if (chart.chart) {
                    chart.chart.selectAll('.bar')
                        .filter(d => d.category === colorControl.category)
                        .transition()
                        .duration(200)
                        .attr('fill', value);
                }
                
                console.log(`🎨 Updated bar color for ${colorControl.category}: ${value}`);
                return;
            }
        }

        // Handle color picker controls
        if (controlId.endsWith('Color') && !controlId.startsWith('barColor_')) {
            // Update chart configuration
            if (!chart.config) chart.config = {};
            chart.config[controlId] = value;
            
            // Handle specific color types with proper chart element existence checks
            if (controlId === 'backgroundColor' && chart.svg) {
                chart.svg.style('background-color', value);
            } else if (controlId === 'titleColor' && chart.svg) {
                chart.svg.selectAll('text').style('fill', value);
            } else if (controlId === 'labelColor' && chart.chart) {
                chart.chart.selectAll('.bar-label').style('fill', value);
            } else if (controlId === 'axisColor' && chart.svg) {
                chart.svg.selectAll('.x-axis, .y-axis').selectAll('path, line, text').style('stroke', value).style('fill', value);
            } else if (controlId === 'gridColor' && chart.chart) {
                chart.chart.selectAll('.grid line').style('stroke', value);
            }
            return;
        }

        // Update chart configuration
        if (!chart.config) chart.config = {};
        chart.config[controlId] = value;

        // Handle special cases that require re-rendering
        if (['orientation', 'colorScheme', 'barPadding', 'showGrid', 'showXAxis', 'showYAxis'].includes(controlId)) {
            console.log(`🔄 Re-rendering chart for ${controlId} change`);
            
            // **CRITICAL FIX: For orientation change, we need to completely re-render**
            if (controlId === 'orientation') {
                console.log(`📊 Orientation changing to: ${value}`);
                // Force a complete re-render with current data
                if (chart.data && chart.data.length > 0) {
                    chart.render();
                } else {
                    console.warn('⚠️ No chart data available for orientation change');
                }
            } else if (controlId === 'barPadding') {
                console.log(`📊 Bar padding changing to: ${value}`);
                // Re-render to update bar spacing
                if (chart.data && chart.data.length > 0) {
                    chart.render();
                } else {
                    console.warn('⚠️ No chart data available for bar padding change');
                }
            } else {
                chart.render();
            }
        }
        
        // Handle font changes
        else if (controlId === 'titleFont') {
            chart.svg.selectAll('text')
                .style('font-family', chart.getFontFamily());
        }
        
        // Handle global font size changes
        else if (controlId === 'globalFontSize') {
            chart.svg.selectAll('text')
                .style('font-size', value + 'px');
        }
        
        // Handle opacity changes
        else if (controlId === 'barOpacity') {
            chart.chart.selectAll('.bar')
                .transition()
                .duration(200)
                .attr('opacity', value);
        }
        
        // Handle grid opacity changes
        else if (controlId === 'gridOpacity') {
            chart.chart.selectAll('.grid line')
                .transition()
                .duration(200)
                .attr('opacity', value);
        }
        
        // Handle controls that need immediate visual updates without full re-render
        else if (controlId === 'barCornerRadius') {
            chart.chart.selectAll('.bar')
                .transition()
                .duration(200)
                .attr('rx', value)
                .attr('ry', value);
        }
        
        // Handle font size changes that need immediate updates
        else if (controlId === 'labelFontSize') {
            chart.chart.selectAll('.bar-label')
                .transition()
                .duration(200)
                .style('font-size', value + 'px');
        }
        
        // Handle controls that need re-render for proper visual update
        else if (['showBarLabels', 'showValues', 'labelPosition', 'labelOffset', 
                  'valueFormat', 'currencySymbol', 'decimalPlaces'].includes(controlId)) {
            console.log(`🔄 Re-rendering for visual control: ${controlId} = ${value}`);
            chart.render();
        }
        
        // Handle config-only controls that don't need immediate visual changes
        else if (['animationDuration', 'animationEasing', 'enableHover', 'enableClick', 
                  'enableTooltip', 'hoverOpacity', 'categorySpacing'].includes(controlId)) {
            // These controls just need config updates, no immediate visual changes
            console.log(`📝 Updated config-only control: ${controlId} = ${value}`);
        }
        
        // Handle toggle controls for axes and grid
        else if (['showXAxis', 'showYAxis', 'showGrid'].includes(controlId)) {
            // These are handled above in the re-render section, but ensure they're acknowledged
            console.log(`🔄 Axis/Grid toggle handled: ${controlId} = ${value}`);
        }

        console.log(`✅ Applied bar chart control: ${controlId}`);
    }

    // Legacy method name for backwards compatibility
    applyControlChange(controlId, value, chart) {
        return this.handleControlChange(controlId, value, chart);
    }

    // Get current value for a control (required by ControlPanel)
    getCurrentValue(controlId, chart) {
        // Handle bar-specific color controls
        if (controlId.startsWith('barColor_')) {
            const colorControl = this.capabilities.colors.controls.find(c => c.id === controlId);
            if (colorControl && colorControl.category) {
                return chart.customColors[colorControl.category] || this.getDefaultBarColor(colorControl.category);
            }
        }

        // Handle color picker controls
        if (controlId.endsWith('Color')) {
            if (chart && chart.config && chart.config[controlId] !== undefined) {
                return chart.config[controlId];
            }
            // Return default from capabilities
            const control = this.findControlById(controlId);
            return control ? control.default : '#000000';
        }

        // Handle standard controls
        if (chart && chart.config && chart.config[controlId] !== undefined) {
            return chart.config[controlId];
        }

        // Fallback to default from capabilities
        const control = this.findControlById(controlId);
        return control ? control.default : 0;
    }

    // Find control definition by ID
    findControlById(controlId) {
        for (const section of Object.values(this.capabilities)) {
            if (section.controls && Array.isArray(section.controls)) {
                const control = section.controls.find(c => c.id === controlId);
                if (control) return control;
            }
        }
        return null;
    }

    // Get default color for a bar category
    getDefaultBarColor(category) {
        const colors = this.getDefaultBarColors();
        // Simple hash function to assign consistent colors to categories
        const hash = Array.from(category).reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    }

    // Get default color palette for bars
    getDefaultBarColors() {
        return ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22'];
    }

    // Apply color preset (required by ControlPanel)
    applyColorPreset(chart, presetName) {
        if (!chart || !chart.data) {
            console.warn('Cannot apply color preset - no chart or data available');
            return;
        }

        console.log(`🎨 Applying ${presetName} color preset to bar chart`);

        let colors = [];
        switch (presetName) {
            case 'vibrant':
                colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe'];
                break;
            case 'monochrome':
                colors = ['#2c3e50', '#7f8c8d', '#34495e', '#95a5a6', '#2c3e50', '#bdc3c7'];
                break;
            case 'professional':
                colors = ['#2c3e50', '#95a5a6', '#27ae60', '#e67e22', '#3498db', '#9b59b6'];
                break;
            default:
                colors = this.getDefaultBarColors();
        }

        // Apply colors to bars
        chart.data.forEach((barData, index) => {
            chart.customColors[barData.category] = colors[index % colors.length];
        });

        // Update dynamic color tracking
        this.dynamicColors.clear();
        chart.data.forEach((barData, index) => {
            this.dynamicColors.set(barData.category, colors[index % colors.length]);
        });

        // Re-render chart with new colors
        chart.render();
    }

    // Randomize colors (required by ControlPanel)
    randomizeColors(chart) {
        if (!chart || !chart.data) {
            console.warn('Cannot randomize colors - no chart or data available');
            return;
        }

        console.log('🎲 Randomizing bar chart colors');

        // Generate random colors for each bar
        chart.data.forEach(barData => {
            const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
            chart.customColors[barData.category] = randomColor;
            this.dynamicColors.set(barData.category, randomColor);
        });

        // Re-render chart with new colors
        chart.render();
    }

    // Get capabilities for the control panel
    getCapabilities() {
        return this.capabilities;
    }

    // Check if this control module can handle a specific chart type
    supportsChartType(chartType) {
        return chartType === 'bar';
    }

    // Initialize the control module with a specific chart
    initialize(chart) {
        this.chart = chart;
        console.log('✅ Bar chart control module initialized');
    }

    // Reset to defaults method (required by ControlPanel)
    resetToDefaults() {
        console.log('🔄 Resetting bar chart controls to defaults');
        return this.getDefaultConfig();
    }

    // Export config method (required by ControlPanel)
    exportConfig(config) {
        return JSON.stringify(config, null, 2);
    }

    // Import config method (required by ControlPanel)
    importConfig(configString) {
        try {
            return JSON.parse(configString);
        } catch (error) {
            throw new Error(`Invalid JSON configuration: ${error.message}`);
        }
    }

    // Validate config method (required by ControlPanel)
    validateConfig(config) {
        const errors = [];
        const warnings = [];

        // Basic validation
        if (config.barOpacity && (config.barOpacity < 0 || config.barOpacity > 1)) {
            errors.push('Bar opacity must be between 0 and 1');
        }

        if (config.animationDuration && config.animationDuration < 0) {
            errors.push('Animation duration must be positive');
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }

    // Update capabilities method for dynamic controls
    updateCapabilities(chart) {
        console.log('🔄 Updating bar chart control capabilities');
        this.populateDynamicColors(chart);
    }

    // Refresh controls after data changes
    refreshControlsAfterDataChange(chart) {
        console.log('🔄 Refreshing bar chart controls after data change');
        if (chart && chart.data) {
            this.populateDynamicColors(chart);
            
            // If there's a control panel instance, regenerate it
            if (window.pulseApp && window.pulseApp.controlPanel) {
                console.log('🎛️ Regenerating control panel with new data');
                window.pulseApp.controlPanel.generateControls();
            }
        }
    }

    // Cleanup method
    cleanup() {
        this.chart = null;
        this.dynamicColors.clear();
        console.log('🧹 Bar chart control module cleaned up');
    }
}