/* ===== ENHANCED BAR CHART CONTROLS WITH DYNAMIC FILTERING ===== */
/* Comprehensive solution using IIFE pattern for chart type specific controls */

window.BarControlModule = (function() {
    'use strict';

    // Chart type to control mapping
    const CHART_TYPE_CONTROLS = {
        simple: {
            enabled: ['barChartType', 'orientation', 'barPadding', 'barCornerRadius', 'cornerRadiusStyle', 'autoSort', 
                     'defaultBarColor', 'hoverColor', 'barOpacity', 'useColorScheme', 'colorScheme',
                     'showXAxis', 'showYAxis', 'showGrid', 'gridOpacity', 'axisColor', 'gridColor',
                     'showBarLabels', 'showValues', 'labelPosition', 'labelOffset', 'labelFontSize', 'labelColor',
                     'valueFormat', 'currencySymbol', 'decimalPlaces', 'enableHover',
                     'animationEasing', 'backgroundColor', 'titleFont', 'titleColor', 'titleSize',
                     'chartWidthScale', 'autoFitContainer', 'leftMargin', 'rightMargin', 'topMargin', 'bottomMargin'],
            disabled: ['showBarLabels']
        },
        grouped: {
            enabled: ['barChartType', 'orientation', 'barPadding', 'barCornerRadius', 'cornerRadiusStyle', 'autoSort',
                     'hoverColor', 'barOpacity', 'colorScheme',
                     'showXAxis', 'showYAxis', 'showGrid', 'gridOpacity', 'axisColor', 'gridColor',
                     'showBarLabels', 'showValues', 'labelPosition', 'labelOffset', 'labelFontSize', 'labelColor',
                     'valueFormat', 'currencySymbol', 'decimalPlaces', 'enableHover',
                     'animationEasing', 'backgroundColor', 'titleFont', 'titleColor', 'titleSize',
                     'chartWidthScale', 'autoFitContainer', 'leftMargin', 'rightMargin', 'topMargin', 'bottomMargin'],
            disabled: ['defaultBarColor', 'showBarLabels'] // Uses dynamic colors from series
        },
        stacked: {
            enabled: ['barChartType', 'orientation', 'barPadding', 'barCornerRadius', 'cornerRadiusStyle', 'autoSort',
                     'hoverColor', 'barOpacity', 'colorScheme',
                     'showXAxis', 'showYAxis', 'showGrid', 'gridOpacity', 'axisColor', 'gridColor',
                     'showBarLabels', 'showValues', 'labelPosition', 'labelOffset', 'labelFontSize', 'labelColor',
                     'valueFormat', 'currencySymbol', 'decimalPlaces', 'enableHover',
                     'animationEasing', 'backgroundColor', 'titleFont', 'titleColor', 'titleSize',
                     'chartWidthScale', 'autoFitContainer', 'leftMargin', 'rightMargin', 'topMargin', 'bottomMargin'],
            disabled: ['defaultBarColor', 'showBarLabels'] // Uses dynamic colors from series
        },
        stacked100: {
            enabled: ['barChartType', 'orientation', 'barPadding', 'barCornerRadius', 'cornerRadiusStyle', 'autoSort',
                     'hoverColor', 'barOpacity', 'colorScheme',
                     'showXAxis', 'showYAxis', 'showGrid', 'gridOpacity', 'axisColor', 'gridColor',
                     'showBarLabels', 'showValues', 'labelPosition', 'labelOffset', 'labelFontSize', 'labelColor',
                     'enableHover', 'animationEasing', 'backgroundColor', 'titleFont', 'titleColor', 'titleSize',
                     'chartWidthScale', 'autoFitContainer', 'leftMargin', 'rightMargin', 'topMargin', 'bottomMargin'],
            disabled: ['defaultBarColor', 'valueFormat', 'currencySymbol', 'decimalPlaces', 'showBarLabels'] // Always shows percentages
        },
        range: {
            enabled: ['barChartType', 'orientation', 'barPadding', 'barCornerRadius', 'cornerRadiusStyle', 'autoSort',
                     'defaultBarColor', 'hoverColor', 'barOpacity', 'colorScheme',
                     'showXAxis', 'showYAxis', 'showGrid', 'gridOpacity', 'axisColor', 'gridColor',
                     'showValues', 'labelPosition', 'labelOffset', 'labelFontSize', 'labelColor',
                     'valueFormat', 'currencySymbol', 'decimalPlaces', 'enableHover',
                     'animationEasing', 'backgroundColor', 'titleFont', 'titleColor', 'titleSize',
                     'chartWidthScale', 'autoFitContainer', 'leftMargin', 'rightMargin', 'topMargin', 'bottomMargin'],
            disabled: ['showBarLabels']
        },
        waterfall: {
            enabled: ['barChartType', 'orientation', 'barPadding', 'barCornerRadius', 'cornerRadiusStyle',
                     'defaultBarColor', 'hoverColor', 'barOpacity',
                     'showXAxis', 'showYAxis', 'showGrid', 'gridOpacity', 'axisColor', 'gridColor',
                     'showBarLabels', 'showValues', 'labelPosition', 'labelOffset', 'labelFontSize', 'labelColor',
                     'valueFormat', 'currencySymbol', 'decimalPlaces', 'enableHover',
                     'animationEasing', 'backgroundColor', 'titleFont', 'titleColor', 'titleSize',
                     'chartWidthScale', 'autoFitContainer', 'leftMargin', 'rightMargin', 'topMargin', 'bottomMargin'],
            disabled: ['autoSort', 'colorScheme', 'showBarLabels'] // Waterfall has specific ordering and colors
        },
        polar: {
            enabled: ['barChartType', 'barPadding', 'autoSort',
                     'defaultBarColor', 'hoverColor', 'barOpacity', 'colorScheme',
                     'showBarLabels', 'showValues', 'labelFontSize', 'labelColor',
                     'valueFormat', 'currencySymbol', 'decimalPlaces', 'enableHover',
                     'animationEasing', 'backgroundColor', 'titleFont', 'titleColor', 'titleSize',
                     'chartWidthScale', 'autoFitContainer', 'leftMargin', 'rightMargin', 'topMargin', 'bottomMargin'],
            disabled: ['orientation', 'barCornerRadius', // No orientation or corners in polar
                      'showXAxis', 'showYAxis', 'showGrid', 'gridOpacity', 'axisColor', 'gridColor', // No traditional axes
                      'labelPosition', 'labelOffset', 'showBarLabels'] // Polar has specific label positioning
        }
    };

    class BarControlModule {
        constructor() {
            this.capabilities = this.defineCapabilities();
            this.dynamicColors = new Map();
            this.chart = null;
            this.currentChartType = 'simple';
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
                            id: "barChartType",
                            type: "dropdown",
                            label: "Chart Type",
                            default: "simple",
                            options: [
                                { value: "simple", label: "Simple Bar Chart" },
                                { value: "grouped", label: "Grouped Bar Chart" },
                                { value: "stacked", label: "Stacked Bar Chart" },
                                { value: "stacked100", label: "100% Stacked Bar Chart" },
                                { value: "range", label: "Range Bar Chart" },
                                { value: "waterfall", label: "Waterfall Chart" },
                                { value: "polar", label: "Polar Bar Chart" }
                            ],
                            description: "Type of bar chart visualization"
                        },
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
                            id: "autoSort",
                            type: "toggle",
                            label: "Auto Sort by Value",
                            default: false,
                            description: "Automatically sort bars by value or keep user order"
                        },
                        {
                            id: "sortDirection",
                            type: "dropdown",
                            label: "Sort Direction",
                            default: "descending",
                            options: [
                                { value: "descending", label: "Descending (High to Low)" },
                                { value: "ascending", label: "Ascending (Low to High)" }
                            ],
                            description: "Direction for auto-sorting (when enabled)"
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
                            default: false
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
                            default: "outside_end",
                            options: [
                                { value: "outside_end", label: "Outside End" },
                                { value: "inside_end", label: "Inside End" },
                                { value: "inside_center", label: "Inside Center" },
                                { value: "inside_start", label: "Inside Start" },
                                { value: "outside_start", label: "Outside Start" }
                            ],
                            description: "Where to position the value labels relative to bars"
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


                // Animation
                animation: {
                    title: "Animation",
                    icon: "⚡",
                    collapsed: true,
                    controls: [
                        {
                            id: "animationEasing",
                            type: "dropdown",
                            label: "Animation Easing",
                            default: "easeQuadOut",
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

                // Visual Appearance
                appearance: {
                    title: "Visual Appearance",
                    icon: "🎭",
                    collapsed: true,
                    controls: [
                        {
                            id: "backgroundColor",
                            type: "color_picker",
                            label: "Background Color",
                            default: "#f5f0db"
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
                            label: "Title Color",
                            default: "#1f2937"
                        },
                        {
                            id: "titleSize",
                            type: "slider",
                            label: "Title Size",
                            min: 14,
                            max: 50,
                            default: 20,
                            step: 1,
                            unit: "px",
                            description: "Size of the chart title"
                        }
                    ]
                },

                // Bar styling section with color controls
                colors: {
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
                            id: "useColorScheme",
                            type: "toggle",
                            label: "Use Color Scheme",
                            default: false,
                            description: "Toggle between single color and color scheme"
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
                            max: 80,
                            default: 4,
                            step: 1,
                            unit: "px",
                            description: "Rounded corners for bars"
                        },
                        {
                            id: "cornerRadiusStyle",
                            type: "toggle",
                            label: "Top Corners Only",
                            default: true,
                            description: "Round only top corners (ON) or all corners (OFF)"
                        }
                    ],
                    isDynamic: true
                },

                // Chart Layout & Dimensions
                layout: {
                    title: "Chart Layout",
                    icon: "📐",
                    collapsed: true,
                    controls: [
                        {
                            id: "chartWidthScale",
                            type: "slider",
                            label: "Chart Width",
                            min: 0.5,
                            max: 1.0,
                            default: 0.8,
                            step: 0.05,
                            unit: "%",
                            description: "How much of the container width to use (50% - 100%)"
                        },
                        {
                            id: "autoFitContainer",
                            type: "toggle",
                            label: "Auto-Fit Container",
                            default: false,
                            description: "Automatically size chart to fill container width"
                        },
                        {
                            id: "leftMargin",
                            type: "slider",
                            label: "Left Margin",
                            min: 50,
                            max: 300,
                            default: 150,
                            step: 10,
                            unit: "px",
                            description: "Left margin space for axis labels"
                        },
                        {
                            id: "rightMargin",
                            type: "slider",
                            label: "Right Margin",
                            min: 50,
                            max: 300,
                            default: 150,
                            step: 10,
                            unit: "px",
                            description: "Right margin space for legends"
                        },
                        {
                            id: "topMargin",
                            type: "slider",
                            label: "Top Margin",
                            min: 30,
                            max: 200,
                            default: 80,
                            step: 10,
                            unit: "px",
                            description: "Top margin space for titles"
                        },
                        {
                            id: "bottomMargin",
                            type: "slider",
                            label: "Bottom Margin",
                            min: 30,
                            max: 200,
                            default: 80,
                            step: 10,
                            unit: "px",
                            description: "Bottom margin space for axis labels"
                        }
                    ]
                }
            };

            return capabilities;
        }

        // Filter controls based on current chart type
        updateControlsForChartType(chartType) {
            this.currentChartType = chartType;
            const typeConfig = CHART_TYPE_CONTROLS[chartType] || CHART_TYPE_CONTROLS.simple;
            
            // Update control availability
            Object.values(this.capabilities).forEach(section => {
                if (section.controls && Array.isArray(section.controls)) {
                    section.controls.forEach(control => {
                        // Set enabled/disabled state
                        control.enabled = typeConfig.enabled.includes(control.id);
                        control.disabled = typeConfig.disabled.includes(control.id);
                    });
                }
            });

            console.log(`🎛️ Controls updated for chart type: ${chartType}`);
            return this.capabilities;
        }

        // Rest of the methods from original BarControlModule...
        getDefaultConfig() {
            return {
                orientation: 'vertical',
                barPadding: 0.1,
                barCornerRadius: 4,
                cornerRadiusStyle: true,
                autoSort: false,
                sortDirection: 'descending',
                defaultBarColor: '#3498db',
                hoverColor: '#2980b9',
                barOpacity: 1,
                useColorScheme: false,
                colorScheme: 'default',
                showXAxis: true,
                showYAxis: true,
                showGrid: true,
                gridOpacity: 0.5,
                axisColor: '#6b7280',
                gridColor: '#e5e7eb',
                showBarLabels: false,
                showValues: true,
                labelPosition: 'outside_end',
                labelOffset: 8,
                labelFontSize: 12,
                labelColor: '#374151',
                valueFormat: 'currency',
                currencySymbol: '$',
                decimalPlaces: 0,
                enableHover: true, // Always enabled, no control needed
                enableClick: true,
                enableTooltip: true,
                hoverOpacity: 1.0,
                animationDuration: 700,
                animationEasing: 'easeQuadOut',
                backgroundColor: '#f5f0db',
                titleFont: 'Inter',
                titleColor: '#1f2937',
                titleSize: 20,
                // Layout controls
                chartWidthScale: 0.85,
                autoFitContainer: false,
                leftMargin: 150,
                rightMargin: 150,
                topMargin: 80,
                bottomMargin: 80
            };
        }

        hasDynamicControls() {
            return true;
        }

        supportsDynamicLayers() {
            return false;
        }

        initializeDynamicControls(chart) {
            this.populateDynamicColors(chart);
        }

        populateDynamicColors(chart) {
            this.chart = chart;
            
            if (!chart) {
                console.log('⚠️ No chart instance provided for dynamic color population');
                return;
            }

            // Always ensure static controls are present - don't clear them
            const staticControlIds = ['defaultBarColor', 'hoverColor', 'barOpacity', 'useColorScheme', 'colorScheme', 'barCornerRadius', 'cornerRadiusStyle'];
            const hasStaticControls = staticControlIds.every(id => 
                this.capabilities.colors.controls.some(control => control.id === id)
            );

            if (!hasStaticControls) {
                // Add static controls if they're missing
                const staticControls = [
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
                        id: "useColorScheme",
                        type: "toggle",
                        label: "Use Color Scheme",
                        default: false,
                        description: "Toggle between single color and color scheme"
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
                    },
                    {
                        id: "cornerRadiusStyle",
                        type: "toggle",
                        label: "Top Corners Only",
                        default: true,
                        description: "Round only top corners (ON) or all corners (OFF)"
                    }
                ];
                
                // Remove any existing individual bar color controls and add static controls
                this.capabilities.colors.controls = this.capabilities.colors.controls.filter(control => 
                    !control.id.startsWith('barColor_')
                );
                this.capabilities.colors.controls = [...staticControls, ...this.capabilities.colors.controls];
            }

            if (!chart.data || !chart.data.length) {
                console.log('📊 No bar chart data available for dynamic color population');
                // Remove individual bar color controls but keep static controls
                this.capabilities.colors.controls = this.capabilities.colors.controls.filter(control => 
                    !control.id.startsWith('barColor_')
                );
                return;
            }

            console.log('🎨 Populating dynamic colors for bar chart with', chart.data.length, 'bars');

            // Remove existing individual bar color controls but keep static controls
            this.capabilities.colors.controls = this.capabilities.colors.controls.filter(control => 
                !control.id.startsWith('barColor_')
            );
            this.dynamicColors.clear();

            const colors = chart.getBarColors ? chart.getBarColors() : ['#3498db', '#2ecc71', '#e74c3c', '#f39c12'];

            chart.data.forEach((barData, index) => {
                const category = barData.category || `Bar ${index + 1}`;
                const currentColor = chart.customColors?.[category] || colors[index % colors.length];
                
                this.dynamicColors.set(category, currentColor);

                const safeId = `barColor_${category.toString().replace(/[^a-zA-Z0-9]/g, '_')}`;

                const colorControl = {
                    id: safeId,
                    type: "color_picker",
                    label: `${category}`,
                    default: currentColor,
                    description: `Color for ${category} bars`,
                    category: category,
                    isBarColor: true
                };

                this.capabilities.colors.controls.push(colorControl);
            });

            console.log('✅ Dynamic bar colors populated:', this.capabilities.colors.controls.length, 'colors');
        }

        handleControlChange(controlId, value, chart) {
            console.log(`🎛️ BarControls.handleControlChange called: ${controlId} = ${value}`);
            console.log(`🎛️ Chart parameter exists: ${!!chart}`);
            console.log(`🎛️ Chart type: ${chart?.constructor?.name}`);
            console.log(`🎛️ Chart has updateConfig: ${typeof chart?.updateConfig}`);
            console.log(`🎛️ Chart has render: ${typeof chart?.render}`);
            console.log(`🎛️ Chart has data: ${!!(chart?.data && chart.data.length > 0)}`);
            
            if (!chart) {
                console.error('❌ BarControls: No chart reference available for control change');
                return;
            }

            console.log(`🎛️ Applying bar chart control change: ${controlId} = ${value}`);

            // Handle chart type changes with control filtering
            if (controlId === 'barChartType') {
                console.log(`📊 Chart type changing to: ${value}`);
                
                // Update control availability
                this.updateControlsForChartType(value);

                // Trigger chart update BEFORE updating config so the change is detected
                console.log(`📊 About to call chart.updateConfig with barChartType: ${value}`);
                chart.updateConfig({ barChartType: value });
                console.log(`📊 chart.updateConfig completed for barChartType: ${value}`);

                // POTENTIAL FIX: Don't regenerate control panel immediately - it might be overriding the user's selection
                // Instead, just update control availability after a delay to ensure chart renders first
                setTimeout(() => {
                    console.log(`📊 Regenerating control panel after chart update for: ${value}`);
                    if (window.pulseApp && window.pulseApp.controlPanel) {
                        // Ensure the control panel config is synced before regeneration
                        window.pulseApp.controlPanel.config.barChartType = value;
                        window.pulseApp.controlPanel.generateControls();
                    }
                }, 100); // Small delay to ensure chart renders completely first
                
                return;
            }

            // Handle bar-specific color changes
            if (controlId.startsWith('barColor_')) {
                const colorControl = this.capabilities.colors.controls.find(c => c.id === controlId);
                if (colorControl && colorControl.category) {
                    if (!chart.customColors) chart.customColors = {};
                    chart.customColors[colorControl.category] = value;
                    
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
                if (!chart.config) chart.config = {};
                chart.config[controlId] = value;
                
                if (controlId === 'backgroundColor' && chart.svg) {
                    chart.svg.style('background-color', value);
                } else if (controlId === 'titleColor' && chart.svg) {
                    chart.svg.selectAll('.chart-title, .chart-header text').style('fill', value);
                } else if (controlId === 'labelColor' && chart.chart) {
                    chart.chart.selectAll('.bar-label, .grouped-bar-label, .stacked-bar-label, .waterfall-bar-label, .polar-label').style('fill', value);
                } else if (controlId === 'axisColor' && chart.svg) {
                    chart.svg.selectAll('.x-axis, .y-axis').selectAll('path, line, text').style('stroke', value).style('fill', value);
                } else if (controlId === 'gridColor' && chart.chart) {
                    chart.chart.selectAll('.grid line').style('stroke', value);
                } else if (controlId === 'defaultBarColor') {
                    // Handle default bar color change immediately when not using color scheme
                    console.log(`🎨 Default bar color changed to: ${value}, useColorScheme: ${chart.config.useColorScheme}`);
                    if (!chart.config.useColorScheme && chart.chart) {
                        chart.chart.selectAll('.bar')
                            .transition()
                            .duration(200)
                            .attr('fill', value);
                    }
                } else if (controlId === 'hoverColor') {
                    // Update hover color config but no immediate visual change needed
                    console.log(`🎨 Hover color changed to: ${value}`);
                }
                return;
            }

            // Update chart configuration
            if (!chart.config) chart.config = {};
            chart.config[controlId] = value;

            // Handle special cases that require re-rendering (only for structural changes)
            if (['orientation'].includes(controlId)) {
                console.log(`🔄 Re-rendering chart for structural change: ${controlId} = ${value}`);
                
                if (controlId === 'orientation') {
                    console.log(`📊 Orientation changing to: ${value}`);
                    if (chart.data && chart.data.length > 0) {
                        chart.render();
                    } else {
                        console.warn('⚠️ No chart data available for orientation change');
                    }
                }
            }
            // Handle visual-only changes with real-time updates (no re-render needed)
            else if (['colorScheme', 'useColorScheme'].includes(controlId)) {
                console.log(`🎨 Applying visual-only change: ${controlId} = ${value} (real-time)`);
                if (controlId === 'colorScheme' || controlId === 'useColorScheme') {
                    // Update colors immediately without re-rendering
                    const colors = chart.getBarColors ? chart.getBarColors() : ['#3498db', '#2ecc71', '#e74c3c', '#f39c12'];
                    chart.chart.selectAll('.bar')
                        .transition()
                        .duration(300)
                        .attr('fill', (d, i) => {
                            if (chart.config.useColorScheme) {
                                return chart.customColors?.[d.category] || colors[i % colors.length];
                            } else {
                                return chart.config.defaultBarColor || colors[0];
                            }
                        });
                }
            }
            // Handle axis and grid toggles with real-time updates
            else if (['showGrid', 'showXAxis', 'showYAxis'].includes(controlId)) {
                console.log(`📏 Toggling ${controlId}: ${value} (real-time)`);
                if (controlId === 'showGrid') {
                    chart.chart.selectAll('.grid')
                        .transition()
                        .duration(200)
                        .style('opacity', value ? chart.config.gridOpacity || 0.5 : 0);
                } else if (controlId === 'showXAxis') {
                    chart.svg.selectAll('.x-axis')
                        .transition()
                        .duration(200)
                        .style('opacity', value ? 1 : 0);
                } else if (controlId === 'showYAxis') {
                    chart.svg.selectAll('.y-axis')
                        .transition()
                        .duration(200)
                        .style('opacity', value ? 1 : 0);
                }
            }
            // Handle bar padding with efficient real-time updates
            else if (controlId === 'barPadding') {
                console.log(`📊 Bar padding changing to: ${value} (efficient real-time update)`);
                if (chart.updateBarSpacing && chart.data && chart.data.length > 0) {
                    chart.updateBarSpacing(parseFloat(value));
                } else if (chart.data && chart.data.length > 0) {
                    console.warn('⚠️ updateBarSpacing method not available, using full render');
                    chart.render();
                } else {
                    console.warn('⚠️ No chart data available for bar padding change');
                }
            }
            // Handle font changes - apply to all text elements
            else if (controlId === 'titleFont') {
                console.log(`🔤 Font family changed to: ${value}`);
                if (chart.applyFontFamilyToAllText) {
                    chart.applyFontFamilyToAllText();
                } else {
                    // Fallback to just title
                    chart.svg.selectAll('.chart-title, .chart-header text').style('font-family', chart.getFontFamily());
                }
            }
            // Handle title color changes
            else if (controlId === 'titleColor') {
                chart.svg.selectAll('.chart-title, .chart-header text').style('fill', value);
            }
            // Handle title size changes
            else if (controlId === 'titleSize') {
                chart.svg.selectAll('.chart-title, .chart-header text')
                    .interrupt() // Stop any ongoing transitions
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
                console.log(`🔄 BarControls: Updating corner radius to: ${value}px (real-time)`);
                
                // Update config first
                chart.config.barCornerRadius = parseFloat(value);
                
                // Apply corner radius immediately without waiting for any events
                if (chart.applyCornerRadius) {
                    // Use immediate application without debouncing
                    requestAnimationFrame(() => {
                        chart.applyCornerRadius();
                    });
                } else {
                    // Fallback to regular corner radius with immediate application
                    requestAnimationFrame(() => {
                        chart.chart.selectAll('.bar')
                            .attr('rx', value)
                            .attr('ry', value);
                    });
                }
            }
            // Handle corner radius style toggle
            else if (controlId === 'cornerRadiusStyle') {
                console.log(`🔄 BarControls: Corner radius style changed to: ${value ? 'Top Only' : 'All Corners'} (real-time)`);
                
                // Update config first
                chart.config.cornerRadiusStyle = value;
                
                // Apply the appropriate corner radius style immediately
                if (chart.applyCornerRadius) {
                    requestAnimationFrame(() => {
                        chart.applyCornerRadius();
                    });
                }
            }
            // Handle font size changes that need immediate updates
            else if (controlId === 'labelFontSize') {
                chart.chart.selectAll('.bar-label, .grouped-bar-label, .stacked-bar-label, .waterfall-bar-label, .polar-label')
                    .transition()
                    .duration(200)
                    .style('font-size', value + 'px');
            }
            // Handle label controls with efficient label update
            else if (['showBarLabels', 'showValues', 'labelPosition', 'labelOffset'].includes(controlId)) {
                console.log(`🏷️ Updating labels for control: ${controlId} = ${value} (real-time)`);
                if (controlId === 'showBarLabels' || controlId === 'showValues') {
                    // Toggle label visibility immediately
                    if (chart.chart) {
                        chart.chart.selectAll('.bar-label, .grouped-bar-label, .stacked-bar-label, .waterfall-bar-label, .polar-label')
                            .transition()
                            .duration(200)
                            .style('opacity', (chart.config.showBarLabels || chart.config.showValues) ? 1 : 0);
                    }
                } else if (chart.updateLabels) {
                    // For position and offset changes, use the existing efficient method
                    chart.updateLabels();
                } else {
                    // Fallback to re-render only if no efficient method exists
                    console.warn('⚠️ updateLabels method not available, using re-render');
                    chart.render();
                }
            }
            // Handle value formatting controls (some need re-render, some don't)
            else if (['valueFormat', 'currencySymbol'].includes(controlId)) {
                console.log(`🔄 Re-rendering for value format control: ${controlId} = ${value}`);
                chart.render();
            }
            // Handle decimal places control with efficient update (no re-render needed)
            else if (controlId === 'decimalPlaces') {
                console.log(`💰 Updating decimal places to: ${value} (real-time)`);
                // Just update the displayed text values without re-rendering
                if (chart.chart) {
                    chart.chart.selectAll('.bar-label, .grouped-bar-label, .stacked-bar-label, .waterfall-bar-label, .polar-label')
                        .transition()
                        .duration(150)
                        .tween('text', function(d) {
                            const element = d3.select(this);
                            const currentText = element.text();
                            
                            return function(t) {
                                if (t === 1) { // At the end of transition, set the properly formatted text
                                    let newText = '';
                                    if (d.series) { // Grouped
                                        newText = chart.getGroupedBarLabelText ? chart.getGroupedBarLabelText(d) : currentText;
                                    } else if (Array.isArray(d)) { // Stacked
                                        const segmentValue = d[1] - d[0];
                                        newText = chart.getStackedBarLabelText ? chart.getStackedBarLabelText(d, segmentValue) : currentText;
                                    } else { // Simple
                                        newText = chart.getBarLabelText ? chart.getBarLabelText(d) : currentText;
                                    }
                                    element.text(newText);
                                }
                            };
                        });
                }
            }
            // Handle auto sort control
            else if (controlId === 'autoSort') {
                console.log(`📊 Auto sort changed to: ${value}`);
                if (chart.data && chart.data.length > 0) {
                    chart.render();
                }
            }
            // Handle animation easing control (config-only, no immediate visual change needed)
            else if (controlId === 'animationEasing') {
                console.log(`🎬 Animation easing changed to: ${value} (config-only)`);
                // No immediate visual change needed - the new easing will be used in future animations
            }
            // Handle layout and margin controls
            else if (['chartWidthScale', 'autoFitContainer', 'leftMargin', 'rightMargin', 'topMargin', 'bottomMargin'].includes(controlId)) {
                console.log(`📐 Layout control changed: ${controlId} = ${value}`);
                
                if (controlId === 'autoFitContainer' && value) {
                    // Auto-fit overrides width scale
                    if (!chart.config) chart.config = {};
                    chart.config.autoFitContainer = true;
                    chart.config.chartWidthScale = 1.0; // Full width when auto-fit
                    console.log('🔄 Auto-fit enabled, setting width scale to 100%');
                }
                
                // Update chart dimensions and re-render
                if (chart.updateChartDimensions) {
                    chart.updateChartDimensions();
                } else {
                    console.log('🔄 Re-rendering chart for layout change');
                    chart.render();
                }
            }
            // Handle config-only controls that don't need immediate visual changes
            else if (['enableHover', 'enableClick', 'enableTooltip', 'hoverOpacity', 'categorySpacing'].includes(controlId)) {
                console.log(`📝 Updated config-only control: ${controlId} = ${value}`);
            }
            // Axis/Grid toggles are now handled above with real-time updates

            console.log(`✅ Applied bar chart control: ${controlId}`);
        }

        getCurrentValue(controlId, chart) {
            // Debug logging for barChartType specifically
            if (controlId === 'barChartType') {
                console.log(`🔍 getCurrentValue for barChartType:`);
                console.log(`🔍 chart.config exists:`, !!chart?.config);
                console.log(`🔍 chart.config.barChartType:`, chart?.config?.barChartType);
                console.log(`🔍 Will return:`, chart?.config?.barChartType || 'simple');
            }
            
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
                const control = this.findControlById(controlId);
                return control ? control.default : '#000000';
            }

            // Handle standard controls
            if (chart && chart.config && chart.config[controlId] !== undefined) {
                return chart.config[controlId];
            }

            const control = this.findControlById(controlId);
            return control ? control.default : 0;
        }

        findControlById(controlId) {
            for (const section of Object.values(this.capabilities)) {
                if (section.controls && Array.isArray(section.controls)) {
                    const control = section.controls.find(c => c.id === controlId);
                    if (control) return control;
                }
            }
            return null;
        }

        getDefaultBarColor(category) {
            const colors = this.getDefaultBarColors();
            const hash = Array.from(category).reduce((acc, char) => acc + char.charCodeAt(0), 0);
            return colors[hash % colors.length];
        }

        getDefaultBarColors() {
            return ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22'];
        }

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

            chart.data.forEach((barData, index) => {
                chart.customColors[barData.category] = colors[index % colors.length];
            });

            this.dynamicColors.clear();
            chart.data.forEach((barData, index) => {
                this.dynamicColors.set(barData.category, colors[index % colors.length]);
            });

            chart.render();
        }

        randomizeColors(chart) {
            if (!chart || !chart.data) {
                console.warn('Cannot randomize colors - no chart or data available');
                return;
            }

            console.log('🎲 Randomizing bar chart colors');

            chart.data.forEach(barData => {
                const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
                chart.customColors[barData.category] = randomColor;
                this.dynamicColors.set(barData.category, randomColor);
            });

            chart.render();
        }

        getCapabilities() {
            return this.capabilities;
        }

        supportsChartType(chartType) {
            return chartType === 'bar';
        }

        initialize(chart) {
            this.chart = chart;
            console.log('✅ Enhanced bar chart control module initialized');
        }

        resetToDefaults() {
            console.log('🔄 Resetting bar chart controls to defaults');
            return this.getDefaultConfig();
        }

        exportConfig(config) {
            return JSON.stringify(config, null, 2);
        }

        importConfig(configString) {
            try {
                return JSON.parse(configString);
            } catch (error) {
                throw new Error(`Invalid JSON configuration: ${error.message}`);
            }
        }

        validateConfig(config) {
            const errors = [];
            const warnings = [];

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

        updateCapabilities(chart) {
            console.log('🔄 Updating bar chart control capabilities');
            this.populateDynamicColors(chart);
        }

        refreshControlsAfterDataChange(chart) {
            console.log('🔄 Refreshing bar chart controls after data change');
            if (chart && chart.data) {
                this.populateDynamicColors(chart);
                
                if (window.pulseApp && window.pulseApp.controlPanel) {
                    console.log('🎛️ Regenerating control panel with new data');
                    window.pulseApp.controlPanel.generateControls();
                }
            }
        }

        cleanup() {
            this.chart = null;
            this.dynamicColors.clear();
            console.log('🧹 Enhanced bar chart control module cleaned up');
        }
    }

    return BarControlModule;
})();