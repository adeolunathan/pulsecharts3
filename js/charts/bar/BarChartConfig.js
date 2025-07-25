/* ===== BAR CHART CONFIGURATION ===== */
/* Default configuration settings for PulseBarChart */
/* Following the same pattern as SankeyChartConfig.js */

window.BarChartConfig = (function() {
    'use strict';

    /**
     * Gets the initial default configuration for Bar charts
     * @returns {Object} Configuration object with all default settings
     */
    function getInitialConfig() {
        return {
            width: 1200,
            height: 700,
            margin: { top: 80, right: 150, bottom: 80, left: 150 },
            
            // Chart Layout & Dimensions
            chartWidthScale: 0.85, // Use 85% of container width by default for better utilization
            autoFitContainer: false,
            leftMargin: 150,
            rightMargin: 150,
            topMargin: 80,
            bottomMargin: 80,
            
            // Bar specific settings
            barChartType: 'simple',  // 'simple', 'grouped', 'stacked', 'stacked100', 'range', 'waterfall', 'polar'
            barPadding: 0.1,        // Space between bars (0-1)
            barCornerRadius: 4,     // Rounded corners for bars
            orientation: 'vertical', // 'vertical' or 'horizontal'
            
            // Styling
            defaultBarColor: '#3498db',
            hoverColor: '#2980b9',
            barOpacity: 0.8,
            hoverOpacity: 1.0,
            
            // Animation
            animationDuration: 800,
            animationEasing: 'easeInOutCubic',
            
            // Axes
            showXAxis: true,
            showYAxis: true,
            axisColor: '#6b7280',
            axisStrokeWidth: 1,
            gridColor: '#e5e7eb',
            gridOpacity: 0.5,
            showGrid: true,
            
            // Labels
            showBarLabels: false,  // Changed to false by default
            labelPosition: 'outside_end',   // 'outside_end', 'inside_end', 'inside_center', 'inside_start', 'outside_start'
            valuePosition: 'outside_end',   // 'outside_end', 'inside_end', 'inside_center', 'inside_start', 'outside_start'
            labelOffset: 8,
            valueOffset: 8,
            labelColor: '#374151',
            labelFontSize: 12,
            valueFontSize: 12,
            labelFontWeight: '600',
            
            // Value formatting
            showValues: true,
            valueFormat: 'currency', // 'currency', 'number', 'percentage'
            currencySymbol: '$',
            decimalPlaces: 0,
            
            // Interactivity (hover always enabled)
            enableHover: true,
            enableClick: true,
            enableTooltip: true,
            
            // Color scheme
            colorScheme: 'default', // 'default', 'category10', 'custom'
            customColors: [],
            
            // Background and theming (now uses global default)
            backgroundColor: window.GlobalChartConfig ? window.GlobalChartConfig.getGlobalBackgroundColor() : '#faf9f0',
            titleFont: 'Inter',
            titleColor: '#1f2937',
            
            // Spacing and layout
            categorySpacing: 20,    // Space between category groups
            globalFontSize: 12,
            
            // Responsive settings
            responsive: true,
            maintainAspectRatio: true,
            
            // Axis interaction settings
            enableAxisStretching: true,     // Enable axis dragging/stretching
            axisStretchingSensitivity: 1.0, // Sensitivity multiplier
        };
    }

    /**
     * Get color scheme based on configuration
     * @param {string} scheme - Color scheme name
     * @returns {Array} Array of colors
     */
    function getColorScheme(scheme) {
        const colorSchemes = {
            default: ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#34495e'],
            category10: ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'],
            financial: ['#16a34a', '#dc2626', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444'],
            pastel: ['#a8e6cf', '#ffd3a5', '#fd8a8a', '#a8dadc', '#f4acb7', '#ddbea9'],
            vibrant: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a0e7e5']
        };
        
        return colorSchemes[scheme] || colorSchemes.default;
    }

    /**
     * Get default bar chart data - MULTI-COLUMN FORMAT (SINGLE SOURCE OF TRUTH)
     * @returns {Object} Default multi-series data for bar charts
     */
    function getDefaultData() {
        // Use the official bar-chart-sample.json structure
        return {
            metadata: {
                title: "Sample Bar Chart Data",
                chartType: "bar",
                source: "Default Sample Data"
            },
            categories: ["Product A", "Product B", "Product C", "Product D", "Product E"],
            series: [
                { name: "Q1 Sales", data: [120, 150, 180, 90, 200] },
                { name: "Q2 Sales", data: [140, 170, 160, 110, 220] },
                { name: "Q3 Sales", data: [160, 140, 190, 130, 180] }
            ],
            // Legacy compatibility
            values: [120, 150, 180, 90, 200],
            labels: ["Product A", "Product B", "Product C", "Product D", "Product E"]
        };
    }

    /**
     * Get axis configuration based on orientation
     * @param {string} orientation - 'vertical' or 'horizontal'
     * @returns {Object} Axis configuration
     */
    function getAxisConfig(orientation) {
        if (orientation === 'horizontal') {
            return {
                categoryAxis: 'y',
                valueAxis: 'x',
                categoryPosition: 'left',
                valuePosition: 'bottom'
            };
        } else {
            return {
                categoryAxis: 'x',
                valueAxis: 'y',
                categoryPosition: 'bottom',
                valuePosition: 'left'
            };
        }
    }

    // Public API
    return {
        getInitialConfig: getInitialConfig,
        getColorScheme: getColorScheme,
        getAxisConfig: getAxisConfig,
        getDefaultData: getDefaultData
    };
})();