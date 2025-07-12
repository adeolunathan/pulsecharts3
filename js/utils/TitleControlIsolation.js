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
        console.log('🔤 🚨 TITLE ISOLATION: applyTitleFont called with:', fontFamily, 'chart type:', chart.constructor.name);
        
        if (!chart || !chart.svg) {
            console.error('❌ TITLE ISOLATION: No chart or SVG available for title font update');
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
        console.log('🔤 🚨 TITLE ISOLATION: Found title elements:', titleElements.size(), 'applying font:', fontStack);
        
        if (titleElements.size() === 0) {
            console.warn('⚠️ TITLE ISOLATION: No .main-chart-title elements found, scheduling retry');
            scheduleRetry(() => applyTitleFont(chart, fontFamily), 'titleFont');
            return;
        }

        // Apply font only to title elements, never to node labels
        titleElements.each(function() {
            const element = d3.select(this);
            element.style('font-family', fontStack);
            console.log('🔤 TITLE ISOLATION: Applied font to title element:', this);
        });

        // Verify no node labels were affected
        verifyNodeLabelsUnchanged(chart, 'font-family', fontStack);
        
        console.log(`✅ TITLE ISOLATION: Title font updated to ${fontFamily} successfully`);
    }

    /**
     * Apply title size change with strict isolation
     * @param {Object} chart - Chart instance  
     * @param {number} size - Font size in pixels
     */
    function applyTitleSize(chart, size) {
        console.log('🔤 🚨 TITLE ISOLATION: applyTitleSize called with:', size, 'chart type:', chart.constructor.name);
        
        if (!chart || !chart.svg) {
            console.error('❌ TITLE ISOLATION: No chart or SVG available for title size update');
            return;
        }

        // Update config first
        if (chart.config) {
            chart.config.titleSize = size;
        }

        // Apply with strict selector isolation
        const titleElements = chart.svg.selectAll('.main-chart-title');
        console.log('🔤 🚨 TITLE ISOLATION: Found title elements for size update:', titleElements.size(), 'applying size:', size + 'px');
        
        if (titleElements.size() === 0) {
            console.warn('⚠️ TITLE ISOLATION: No .main-chart-title elements found, scheduling retry');
            scheduleRetry(() => applyTitleSize(chart, size), 'titleSize');
            return;
        }

        // Apply size only to title elements, never to node labels
        titleElements.each(function() {
            const element = d3.select(this);
            element.style('font-size', size + 'px');
            console.log('🔤 TITLE ISOLATION: Applied size to title element:', this);
        });

        // Verify no node labels were affected
        verifyNodeLabelsUnchanged(chart, 'font-size', size + 'px');
        
        console.log(`✅ TITLE ISOLATION: Title size updated to ${size}px successfully`);
    }

    /**
     * Apply title color change with strict isolation
     * @param {Object} chart - Chart instance
     * @param {string} color - Color to apply
     */
    function applyTitleColor(chart, color) {
        console.log('🔤 🚨 TITLE ISOLATION: applyTitleColor called with:', color, 'chart type:', chart.constructor.name);
        
        if (!chart || !chart.svg) {
            console.error('❌ TITLE ISOLATION: No chart or SVG available for title color update');
            return;
        }

        // Update config first
        if (chart.config) {
            chart.config.titleColor = color;
        }

        // Apply with strict selector isolation
        const titleElements = chart.svg.selectAll('.main-chart-title');
        console.log('🔤 🚨 TITLE ISOLATION: Found title elements for color update:', titleElements.size(), 'applying color:', color);
        
        if (titleElements.size() === 0) {
            console.warn('⚠️ TITLE ISOLATION: No .main-chart-title elements found, scheduling retry');
            scheduleRetry(() => applyTitleColor(chart, color), 'titleColor');
            return;
        }

        // Apply color only to title elements, never to node labels
        titleElements.each(function() {
            const element = d3.select(this);
            element.style('fill', color);
            console.log('🔤 TITLE ISOLATION: Applied color to title element:', this);
        });

        // Verify no node labels were affected
        verifyNodeLabelsUnchanged(chart, 'fill', color);
        
        console.log(`✅ TITLE ISOLATION: Title color updated to ${color} successfully`);
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
                        console.error(`❌ TITLE ISOLATION: Node label contamination detected! Selector "${selector}" has title ${property}: ${value}`);
                        issuesFound++;
                        
                        // Try to fix by clearing the contaminated property
                        element.style(property, null);
                        console.log(`🔧 TITLE ISOLATION: Cleared contaminated ${property} from node label`);
                    }
                });
            }
        });

        if (issuesFound > 0) {
            console.error(`❌ TITLE ISOLATION: Found ${issuesFound} node label contamination issues`);
        } else {
            console.log('✅ TITLE ISOLATION: Node labels verified clean, no contamination detected');
        }
    }

    /**
     * Retry mechanism for title updates when elements aren't immediately available
     * @param {Function} operation - Operation to retry
     * @param {string} operationType - Type of operation for logging
     */
    function scheduleRetry(operation, operationType) {
        let attempts = 0;
        const maxAttempts = 5;
        const retryInterval = 200; // 200ms between attempts

        const retry = () => {
            attempts++;
            console.log(`🔄 TITLE ISOLATION: Retry attempt ${attempts}/${maxAttempts} for ${operationType}`);
            
            try {
                operation();
                console.log(`✅ TITLE ISOLATION: Retry successful for ${operationType} on attempt ${attempts}`);
            } catch (error) {
                console.warn(`⚠️ TITLE ISOLATION: Retry ${attempts} failed for ${operationType}:`, error);
                
                if (attempts < maxAttempts) {
                    setTimeout(retry, retryInterval);
                } else {
                    console.error(`❌ TITLE ISOLATION: All retries exhausted for ${operationType}`);
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
            console.warn('⚠️ TITLE ISOLATION: No chart or SVG available for title isolation check');
            return;
        }

        const titleElements = chart.svg.selectAll('.main-chart-title');
        console.log('🔍 TITLE ISOLATION: Found', titleElements.size(), 'title elements during isolation check');

        if (titleElements.size() === 0) {
            console.warn('⚠️ TITLE ISOLATION: No title elements found, chart may need re-rendering');
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
            
            console.log('🔍 TITLE ISOLATION: Verified title element isolation:', this);
        });

        console.log('✅ TITLE ISOLATION: Title element isolation verified');
    }

    /**
     * Global event listener to handle chart title update needs
     */
    function setupGlobalTitleEventHandler() {
        // Listen for custom events that indicate title updates are needed
        document.addEventListener('chartTitleUpdateNeeded', (event) => {
            console.log('📝 🚨 TITLE ISOLATION: Received chartTitleUpdateNeeded event:', event.detail);
            
            // Find the current chart instance
            const chart = window.pulseApp?.currentChart || window.currentChart;
            if (chart) {
                // Schedule title isolation check
                setTimeout(() => {
                    ensureTitleIsolation(chart);
                }, 100);
            } else {
                console.warn('⚠️ TITLE ISOLATION: No current chart available for title update');
            }
        });

        console.log('👂 TITLE ISOLATION: Global title event handler registered');
    }

    /**
     * Replace chart branding utils title functions with isolated versions
     */
    function interceptChartBrandingUtils() {
        if (window.ChartBrandingUtils) {
            console.log('🔄 TITLE ISOLATION: Intercepting ChartBrandingUtils title functions');
            
            // Store original functions
            const originalUpdateTitleFont = window.ChartBrandingUtils.updateTitleFont;
            const originalUpdateTitleSize = window.ChartBrandingUtils.updateTitleSize;
            const originalUpdateTitleColor = window.ChartBrandingUtils.updateTitleColor;
            
            // Replace with isolated versions
            window.ChartBrandingUtils.updateTitleFont = function(fontFamily) {
                console.log('🔤 🚨 TITLE ISOLATION: Intercepted ChartBrandingUtils.updateTitleFont:', fontFamily);
                applyTitleFont(this, fontFamily);
            };
            
            window.ChartBrandingUtils.updateTitleSize = function(size) {
                console.log('🔤 🚨 TITLE ISOLATION: Intercepted ChartBrandingUtils.updateTitleSize:', size);
                applyTitleSize(this, size);
            };
            
            window.ChartBrandingUtils.updateTitleColor = function(color) {
                console.log('🔤 🚨 TITLE ISOLATION: Intercepted ChartBrandingUtils.updateTitleColor:', color);
                applyTitleColor(this, color);
            };
            
            console.log('✅ TITLE ISOLATION: ChartBrandingUtils title functions intercepted successfully');
        } else {
            console.warn('⚠️ TITLE ISOLATION: ChartBrandingUtils not available for interception');
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

    console.log('✅ TitleControlIsolation IIFE loaded successfully');
    console.log('🔧 Available methods: applyTitleFont, applyTitleSize, applyTitleColor, verifyNodeLabelsUnchanged, ensureTitleIsolation');

    // Setup global event handling
    setupGlobalTitleEventHandler();
    
    // Intercept existing functions once page is fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', interceptChartBrandingUtils);
    } else {
        interceptChartBrandingUtils();
    }

})();