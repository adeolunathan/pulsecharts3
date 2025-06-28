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
            showBarLabels: true,
            labelPosition: 'top',   // 'top', 'middle', 'bottom'
            labelOffset: 8,
            labelColor: '#374151',
            labelFontSize: 12,
            labelFontWeight: '600',
            
            // Value formatting
            showValues: true,
            valueFormat: 'currency', // 'currency', 'number', 'percentage'
            currencySymbol: '$',
            decimalPlaces: 0,
            
            // Interactivity
            enableHover: true,
            enableClick: true,
            enableTooltip: true,
            
            // Color scheme
            colorScheme: 'default', // 'default', 'category10', 'custom'
            customColors: [],
            
            // Background and theming
            backgroundColor: '#f8f9fa',
            titleFont: 'Inter',
            titleColor: '#1f2937',
            
            // Spacing and layout
            categorySpacing: 20,    // Space between category groups
            globalFontSize: 12,
            
            // Responsive settings
            responsive: true,
            maintainAspectRatio: true
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
        return {
            metadata: {
                title: "Multi-Series Chart Data",
                chartType: "bar",
                source: "Default Sample Data"
            },
            categories: ['Product A', 'Product B', 'Product C'],
            series: [
                { name: 'Value 1', data: [100, 150, 200] },
                { name: 'Value 2', data: [120, 180, 250] },
                { name: 'Value 3', data: [90, 140, 190] }
            ],
            // Legacy compatibility
            values: [100, 150, 200],
            labels: ['Product A', 'Product B', 'Product C']
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