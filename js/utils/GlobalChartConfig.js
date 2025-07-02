/* ===== GLOBAL CHART CONFIGURATION ===== */
/* Single source of truth for default settings across all chart types */

window.GlobalChartConfig = (function() {
    'use strict';

    /**
     * Global default configuration that applies to all chart types
     * @returns {Object} Global configuration object
     */
    function getGlobalDefaults() {
        return {
            // Global Background Color - Single source of truth
            backgroundColor: '#F5F5DC',  // Light gray background for all charts
            
            // Global Font Settings
            fontFamily: 'Inter',
            fontSize: 12,
            
            // Global Color Schemes
            primaryColorPalette: ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#34495e'],
            
            // Global Animation Settings
            animationDuration: 800,
            animationEasing: 'easeInOutCubic',
            
            // Global Margin Settings
            defaultMargin: { top: 80, right: 150, bottom: 80, left: 150 },
            
            // Global Responsive Settings
            responsive: true,
            maintainAspectRatio: true
        };
    }

    /**
     * Merge global defaults with chart-specific configuration
     * @param {Object} chartSpecificConfig - Chart type specific configuration
     * @returns {Object} Merged configuration with global defaults applied first
     */
    function mergeWithGlobalDefaults(chartSpecificConfig) {
        const globalDefaults = getGlobalDefaults();
        return { ...globalDefaults, ...chartSpecificConfig };
    }

    /**
     * Update global background color across all chart types
     * @param {string} newBackgroundColor - New background color (hex, rgb, or named color)
     */
    function updateGlobalBackgroundColor(newBackgroundColor) {
        console.log(`🎨 Updating global background color to: ${newBackgroundColor}`);
        
        // Update the global default
        const globalDefaults = getGlobalDefaults();
        globalDefaults.backgroundColor = newBackgroundColor;
        
        // Update all active chart instances if they exist
        if (window.pulseApp) {
            // Update current chart instance
            if (window.pulseApp.currentChart && window.pulseApp.currentChart.updateConfig) {
                window.pulseApp.currentChart.updateConfig({ backgroundColor: newBackgroundColor });
            }
            
            // Update any other chart instances
            ['barChart', 'sankeyChart'].forEach(chartKey => {
                if (window.pulseApp[chartKey] && window.pulseApp[chartKey].updateConfig) {
                    window.pulseApp[chartKey].updateConfig({ backgroundColor: newBackgroundColor });
                }
            });
        }
        
        console.log(`✅ Global background color updated successfully`);
    }

    /**
     * Get the current global background color
     * @returns {string} Current global background color
     */
    function getGlobalBackgroundColor() {
        return getGlobalDefaults().backgroundColor;
    }

    /**
     * Helper function to get background color with fallback
     * Use this everywhere instead of hardcoding colors
     * @returns {string} The global background color
     */
    function getSafeBackgroundColor() {
        return getGlobalBackgroundColor();
    }

    // Public API
    return {
        getGlobalDefaults: getGlobalDefaults,
        mergeWithGlobalDefaults: mergeWithGlobalDefaults,
        updateGlobalBackgroundColor: updateGlobalBackgroundColor,
        getGlobalBackgroundColor: getGlobalBackgroundColor,
        getSafeBackgroundColor: getSafeBackgroundColor // Helper for easy use
    };
})();