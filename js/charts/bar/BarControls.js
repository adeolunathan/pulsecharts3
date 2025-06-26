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
                        type: "checkbox",
                        label: "Show X Axis",
                        default: true
                    },
                    {
                        id: "showYAxis",
                        type: "checkbox",
                        label: "Show Y Axis",
                        default: true
                    },
                    {
                        id: "showGrid",
                        type: "checkbox",
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
                        type: "checkbox",
                        label: "Show Bar Labels",
                        default: true
                    },
                    {
                        id: "showValues",
                        type: "checkbox",
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
                        type: "checkbox",
                        label: "Enable Hover Effects",
                        default: true
                    },
                    {
                        id: "enableClick",
                        type: "checkbox",
                        label: "Enable Click to Color",
                        default: true
                    },
                    {
                        id: "enableTooltip",
                        type: "checkbox",
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

    // Populate dynamic colors based on chart data
    populateDynamicColors(chart) {
        this.chart = chart;
        
        if (!chart || !chart.data || !chart.data.length) {
            console.log('📊 No bar chart data available for dynamic color population');
            return;
        }

        console.log('🎨 Populating dynamic colors for bar chart with', chart.data.length, 'bars');

        // Clear existing dynamic colors
        this.capabilities.colors.controls = [];
        this.dynamicColors.clear();

        // Get current colors from chart
        const colors = chart.getBarColors();

        // Create color controls for each bar category
        chart.data.forEach((barData, index) => {
            const category = barData.category;
            const currentColor = chart.customColors[category] || colors[index % colors.length];
            
            // Store the color
            this.dynamicColors.set(category, currentColor);

            // Create color control
            const colorControl = {
                id: `barColor_${category.replace(/[^a-zA-Z0-9]/g, '_')}`,
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

    // Apply control changes to the chart
    applyControlChange(controlId, value, chart) {
        if (!chart) {
            console.warn('⚠️ No chart reference available for control change');
            return;
        }

        console.log(`🎛️ Applying bar chart control change: ${controlId} = ${value}`);

        // Handle bar-specific color changes
        if (controlId.startsWith('barColor_')) {
            const colorControl = this.capabilities.colors.controls.find(c => c.id === controlId);
            if (colorControl && colorControl.category) {
                chart.customColors[colorControl.category] = value;
                
                // Update the visual immediately
                chart.chart.selectAll('.bar')
                    .filter(d => d.category === colorControl.category)
                    .transition()
                    .duration(200)
                    .attr('fill', value);
                
                console.log(`🎨 Updated bar color for ${colorControl.category}: ${value}`);
                return;
            }
        }

        // Update chart configuration
        chart.config[controlId] = value;

        // Handle special cases that require re-rendering
        if (['orientation', 'colorScheme', 'barPadding', 'showGrid', 'showXAxis', 'showYAxis'].includes(controlId)) {
            console.log(`🔄 Re-rendering chart for ${controlId} change`);
            chart.render();
        }
        
        // Handle background color changes
        else if (controlId === 'backgroundColor') {
            chart.svg.style('background-color', value);
        }
        
        // Handle font changes
        else if (controlId === 'titleFont') {
            chart.svg.selectAll('text')
                .style('font-family', chart.getFontFamily());
        }
        
        // Handle title color changes
        else if (controlId === 'titleColor') {
            chart.svg.selectAll('text')
                .style('fill', value);
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

        console.log(`✅ Applied bar chart control: ${controlId}`);
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

    // Cleanup method
    cleanup() {
        this.chart = null;
        this.dynamicColors.clear();
        console.log('🧹 Bar chart control module cleaned up');
    }
}