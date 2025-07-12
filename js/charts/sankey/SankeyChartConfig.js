/* ===== SANKEY CHART CONFIGURATION ===== */
/* Default configuration settings for PulseSankeyChart */
/* Extracted from SankeyChart.js for better modularity */

window.SankeyChartConfig = (function() {
    'use strict';

    /**
     * Gets the initial default configuration for Sankey charts
     * @returns {Object} Configuration object with all default settings
     */
    function getInitialConfig() {
        return {
            width: 1200,
            height: 700,
            margin: { top: 60, right: 150, bottom: 60, left: 150 },
            nodeWidth: 28,
            nodePadding: 40,
            curveIntensity: 0.4,
            animationDuration: 800,
            leftmostSpacing: 0.8,
            middleSpacing: 0.9,
            rightmostSpacing: 0.7,
            autoCenter: true,
            autoMiddleAlign: true,
            nodeHeightScale: 0.05,
            linkWidthScale: 0.65,
            nodeOpacity: 1.0,
            linkOpacity: 1.0,
            leftmostGroupGap: 40,
            rightmostGroupGap: 40,
            labelDistance: {
                leftmost: 15,
                middle: 12,
                rightmost: 15
            },
            valueDistance: {
                general: 8,
                middle: 8
            },
            layerSpacing: {
                0: 0.8,
                1: 1.0,
                2: 1.0,
                3: 0.9,
                4: 0.7
            },
            backgroundColor: window.GlobalChartConfig ? window.GlobalChartConfig.getGlobalBackgroundColor() : '#faf9f0',
            titleFont: 'Inter',
            titleColor: '#1f2937',
            showMargin: false,
            showMarginFor: 'profit', // 'profit' or 'all'
            globalFontSize: 12
        };
    }

    // Public API
    return {
        getInitialConfig: getInitialConfig
    };
})();