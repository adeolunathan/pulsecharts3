/**
 * Title Control Isolation - Centralized IIFE Solution
 * 
 * This IIFE provides isolated title control logic that ensures:
 * - Title controls ONLY affect the chart title element (.main-chart-title)
 * - Node labels are never affected by title control changes
 * - Title text never cross-contaminates with node label text
 * - Robust retry mechanism for title control application
 * 
 * All charts should use this centralized system for title management.
 */
(function() {
    'use strict';

    /**
     * Apply title font change with strict isolation
     * @param {Object} chart - Chart instance
     * @param {string} fontFamily - Font family to apply
     */
    function applyTitleFont(chart, fontFamily) {
        
        if (!chart || !chart.svg) {
            return;
        }

        // Update config first
        if (chart.config) {
            chart.config.titleFont = fontFamily;
        }

        // Get font stack from chart if available
        const fontStack = chart.getFontFamily ? chart.getFontFamily() : fontFamily;
        
        // Apply with strict selector isolation
        const titleElements = chart.svg.selectAll('.main-chart-title');
        
        if (titleElements.size() === 0) {
            scheduleRetry(() => applyTitleFont(chart, fontFamily), 'titleFont');
            return;
        }

        // Apply font only to title elements, never to node labels
        titleElements.each(function() {
            const element = d3.select(this);
            element.style('font-family', fontStack);
        });

        // Verify no node labels were affected
        verifyNodeLabelsUnchanged(chart, 'font-family', fontStack);
        
    }

    /**
     * Apply title size change with strict isolation
     * @param {Object} chart - Chart instance  
     * @param {number} size - Font size in pixels
     */
    function applyTitleSize(chart, size) {
        
        if (!chart || !chart.svg) {
            return;
        }

        // Update config first
        if (chart.config) {
            chart.config.titleSize = size;
        }

        // Apply with strict selector isolation
        const titleElements = chart.svg.selectAll('.main-chart-title');
        
        if (titleElements.size() === 0) {
            scheduleRetry(() => applyTitleSize(chart, size), 'titleSize');
            return;
        }

        // Apply size only to title elements, never to node labels
        titleElements.each(function() {
            const element = d3.select(this);
            element.style('font-size', size + 'px');
        });

        // Verify no node labels were affected
        verifyNodeLabelsUnchanged(chart, 'font-size', size + 'px');
        
    }

    /**
     * Apply title color change with strict isolation
     * @param {Object} chart - Chart instance
     * @param {string} color - Color to apply
     */
    function applyTitleColor(chart, color) {
        
        if (!chart || !chart.svg) {
            return;
        }

        // Update config first
        if (chart.config) {
            chart.config.titleColor = color;
        }

        // Apply with strict selector isolation
        const titleElements = chart.svg.selectAll('.main-chart-title');
        
        if (titleElements.size() === 0) {
            scheduleRetry(() => applyTitleColor(chart, color), 'titleColor');
            return;
        }

        // Apply color only to title elements, never to node labels
        titleElements.each(function() {
            const element = d3.select(this);
            element.style('fill', color);
        });

        // Verify no node labels were affected
        verifyNodeLabelsUnchanged(chart, 'fill', color);
        
    }

    /**
     * Verify that node labels haven't been accidentally changed
     * @param {Object} chart - Chart instance
     * @param {string} property - CSS property to check
     * @param {string} value - Value that should NOT be applied to node labels
     */
    function verifyNodeLabelsUnchanged(chart, property, value) {
        if (!chart || !chart.svg) return;

        // Check various node label selectors
        const nodeLabelSelectors = [
            '.sankey-node text',
            '.node-label',
            '.node-text',
            '.bar-label',
            '.category-label'
        ];

        let issuesFound = 0;
        
        nodeLabelSelectors.forEach(selector => {
            const nodeLabels = chart.svg.selectAll(selector);
            if (nodeLabels.size() > 0) {
                nodeLabels.each(function() {
                    const element = d3.select(this);
                    const actualValue = element.style(property);
                    
                    // Check if node label accidentally has title styling
                    if (actualValue === value) {
                        issuesFound++;
                        
                        // Try to fix by clearing the contaminated property
                        element.style(property, null);
                    }
                });
            }
        });

        if (issuesFound > 0) {
        } else {
        }
    }

    /**
     * Retry mechanism for title updates when elements aren't immediately available
     * @param {Function} operation - Operation to retry
     * @param {string} operationType - Type of operation for logging
     */
    function scheduleRetry(operation) {
        let attempts = 0;
        const maxAttempts = 5;
        const retryInterval = 200; // 200ms between attempts

        const retry = () => {
            attempts++;
            
            try {
                operation();
            } catch (error) {
                
                if (attempts < maxAttempts) {
                    setTimeout(retry, retryInterval);
                } else {
                }
            }
        };

        setTimeout(retry, retryInterval);
    }

    /**
     * Ensure title elements are properly created and isolated
     * @param {Object} chart - Chart instance
     */
    function ensureTitleIsolation(chart) {
        if (!chart || !chart.svg) {
            return;
        }

        const titleElements = chart.svg.selectAll('.main-chart-title');

        if (titleElements.size() === 0) {
            return;
        }

        // Ensure title elements have proper attributes
        titleElements.each(function() {
            const element = d3.select(this);
            
            // Ensure data-editable attribute
            if (!element.attr('data-editable')) {
                element.attr('data-editable', 'true');
            }
            
            // Ensure proper cursor
            if (!element.style('cursor')) {
                element.style('cursor', 'pointer');
            }
            
        });

    }

    /**
     * Global event listener to handle chart title update needs
     */
    function setupGlobalTitleEventHandler() {
        // Listen for custom events that indicate title updates are needed
        document.addEventListener('chartTitleUpdateNeeded', () => {
            
            // Find the current chart instance
            const chart = window.pulseApp?.currentChart || window.currentChart;
            if (chart) {
                // Schedule title isolation check
                setTimeout(() => {
                    ensureTitleIsolation(chart);
                }, 100);
            } else {
            }
        });

    }

    /**
     * Replace chart branding utils title functions with isolated versions
     */
    function interceptChartBrandingUtils() {
        if (window.ChartBrandingUtils) {
            
            // Store original functions (these are kept for potential future restoration)
            // const originalUpdateTitleFont = window.ChartBrandingUtils.updateTitleFont;
            // const originalUpdateTitleSize = window.ChartBrandingUtils.updateTitleSize;
            // const originalUpdateTitleColor = window.ChartBrandingUtils.updateTitleColor;
            
            // Replace with isolated versions
            window.ChartBrandingUtils.updateTitleFont = function(fontFamily) {
                applyTitleFont(this, fontFamily);
            };
            
            window.ChartBrandingUtils.updateTitleSize = function(size) {
                applyTitleSize(this, size);
            };
            
            window.ChartBrandingUtils.updateTitleColor = function(color) {
                applyTitleColor(this, color);
            };
            
        } else {
        }
    }

    // Export to window for global access
    window.TitleControlIsolation = {
        applyTitleFont,
        applyTitleSize,
        applyTitleColor,
        verifyNodeLabelsUnchanged,
        ensureTitleIsolation,
        scheduleRetry
    };


    // Setup global event handling
    setupGlobalTitleEventHandler();
    
    // Intercept existing functions once page is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', interceptChartBrandingUtils);
    } else {
        interceptChartBrandingUtils();
    }

})();