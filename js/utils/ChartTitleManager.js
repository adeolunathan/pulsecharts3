/**
 * ChartTitleManager - Single source of truth for title management
 * 
 * Replaces the complex TitleControlIsolation system with a clean, simple approach:
 * - Direct D3 selection using .main-chart-title class only
 * - No text content matching or fallback systems
 * - Single responsibility for all title operations
 * - Works with modal, control panels, and chart rendering
 */
(function() {
    'use strict';

    class ChartTitleManager {
        constructor() {
            this.setupEventListeners();
        }

        /**
         * Get the main chart title element using CSS class selector only
         * @param {Object} chart - Chart instance with svg property
         * @returns {Selection} D3 selection of title element
         */
        getTitleElement(chart) {
            if (!chart || !chart.svg) {
                console.warn('ChartTitleManager: No chart or svg provided');
                return null;
            }

            // Direct selection - no fallbacks, no text matching
            const titleElement = chart.svg.select('.main-chart-title');
            
            if (titleElement.empty()) {
                console.warn('ChartTitleManager: No .main-chart-title element found');
                return null;
            }

            return titleElement;
        }

        /**
         * Create a new title element with proper class and attributes
         * @param {Object} chart - Chart instance
         * @param {string} text - Title text
         * @param {Object} config - Title configuration
         */
        createTitle(chart, text, config = {}) {
            if (!chart || !chart.svg) {
                console.error('ChartTitleManager: Cannot create title without chart.svg');
                return;
            }

            // Remove any existing title
            chart.svg.selectAll('.main-chart-title').remove();

            // Get chart configuration
            const chartConfig = chart.config || {};
            
            // Create title with all required attributes
            const titleElement = chart.svg.append('text')
                .attr('class', 'main-chart-title')
                .attr('x', (chartConfig.width || 800) / 2)
                .attr('y', config.y || 60)
                .attr('text-anchor', 'middle')
                .attr('font-size', (config.fontSize || chartConfig.titleSize || 40) + 'px')
                .attr('font-weight', config.fontWeight || '1000')
                .attr('font-family', config.fontFamily || this.getFontFamily(chart))
                .attr('fill', config.color || chartConfig.titleColor || '#1f2937')
                .attr('letter-spacing', config.letterSpacing || '0.5px')
                .attr('data-editable', 'true')
                .style('cursor', 'pointer')
                .style('transition', 'fill 0.2s ease')
                .text(text);

            return titleElement;
        }

        /**
         * Update title text
         * @param {Object} chart - Chart instance
         * @param {string} text - New title text
         */
        updateText(chart, text) {
            const titleElement = this.getTitleElement(chart);
            if (titleElement) {
                titleElement.text(text);
                
                // Update chart config if available
                if (chart.config) {
                    chart.config.titleText = text;
                }
                
            }
        }

        /**
         * Update title font size
         * @param {Object} chart - Chart instance
         * @param {number} size - Font size in pixels
         */
        updateSize(chart, size) {
            const titleElement = this.getTitleElement(chart);
            if (titleElement) {
                titleElement.attr('font-size', size + 'px');
                
                // Update chart config
                if (chart.config) {
                    chart.config.titleSize = size;
                }
                
            }
        }

        /**
         * Update title color
         * @param {Object} chart - Chart instance
         * @param {string} color - Color value (hex, rgb, etc.)
         */
        updateColor(chart, color) {
            const titleElement = this.getTitleElement(chart);
            if (titleElement) {
                titleElement.attr('fill', color);
                
                // Update chart config
                if (chart.config) {
                    chart.config.titleColor = color;
                }
                
            }
        }

        /**
         * Update title font family
         * @param {Object} chart - Chart instance
         * @param {string} fontFamily - Font family name
         */
        updateFont(chart, fontFamily) {
            const titleElement = this.getTitleElement(chart);
            if (titleElement) {
                const fontStack = this.getFontFamily(chart, fontFamily);
                titleElement.attr('font-family', fontStack);
                
                // Update chart config
                if (chart.config) {
                    chart.config.titleFont = fontFamily;
                }
                
            }
        }

        /**
         * Update multiple title properties at once
         * @param {Object} chart - Chart instance
         * @param {Object} properties - Properties to update
         */
        updateProperties(chart, properties) {
            const titleElement = this.getTitleElement(chart);
            if (!titleElement) return;

            // Update each property
            if (properties.text !== undefined) {
                titleElement.text(properties.text);
                if (chart.config) chart.config.titleText = properties.text;
            }
            
            if (properties.size !== undefined) {
                titleElement.attr('font-size', properties.size + 'px');
                if (chart.config) chart.config.titleSize = properties.size;
            }
            
            if (properties.color !== undefined) {
                titleElement.attr('fill', properties.color);
                if (chart.config) chart.config.titleColor = properties.color;
            }
            
            if (properties.fontFamily !== undefined) {
                const fontStack = this.getFontFamily(chart, properties.fontFamily);
                titleElement.attr('font-family', fontStack);
                if (chart.config) chart.config.titleFont = properties.fontFamily;
            }

        }

        /**
         * Get font family with fallback stack
         * @param {Object} chart - Chart instance
         * @param {string} fontFamily - Optional font family override
         * @returns {string} Font stack
         */
        getFontFamily(chart, fontFamily) {
            const family = fontFamily || chart?.config?.titleFont || 'Inter';
            
            // Return appropriate font stack
            switch (family) {
                case 'Inter':
                    return 'Inter, -apple-system, BlinkMacSystemFont, sans-serif';
                case 'Roboto':
                    return 'Roboto, -apple-system, BlinkMacSystemFont, sans-serif';
                case 'Open Sans':
                    return '"Open Sans", -apple-system, BlinkMacSystemFont, sans-serif';
                case 'Lato':
                    return 'Lato, -apple-system, BlinkMacSystemFont, sans-serif';
                case 'Montserrat':
                    return 'Montserrat, -apple-system, BlinkMacSystemFont, sans-serif';
                case 'Source Sans Pro':
                    return '"Source Sans Pro", -apple-system, BlinkMacSystemFont, sans-serif';
                case 'Poppins':
                    return 'Poppins, -apple-system, BlinkMacSystemFont, sans-serif';
                default:
                    return `${family}, -apple-system, BlinkMacSystemFont, sans-serif`;
            }
        }

        /**
         * Get current title state
         * @param {Object} chart - Chart instance
         * @returns {Object} Current title properties
         */
        getCurrentState(chart) {
            const titleElement = this.getTitleElement(chart);
            if (!titleElement) {
                return null;
            }

            const element = titleElement.node();
            return {
                text: titleElement.text(),
                size: parseInt(titleElement.attr('font-size')) || 40,
                color: titleElement.attr('fill') || '#1f2937',
                fontFamily: titleElement.attr('font-family') || 'Inter',
                x: parseFloat(titleElement.attr('x')) || 0,
                y: parseFloat(titleElement.attr('y')) || 60
            };
        }

        /**
         * Setup global event listeners for title interaction
         */
        setupEventListeners() {
            // Click handler for title editing
            document.addEventListener('click', (e) => {
                if (e.target.classList.contains('main-chart-title') && 
                    e.target.hasAttribute('data-editable')) {
                    e.stopPropagation();
                    
                    // Trigger title edit modal if available
                    if (typeof openTitleEditModal === 'function') {
                        openTitleEditModal();
                    }
                }
            });

            // Note: Hover effects are handled by universal handlers in chart.html
            // to avoid conflicts and ensure proper style restoration
        }

        /**
         * Find chart title element globally (for modal/external use)
         * @returns {Element} DOM element or null
         */
        findTitleElement() {
            return document.querySelector('#main-chart .main-chart-title');
        }
    }

    // Create global instance
    const titleManager = new ChartTitleManager();

    // Export to global namespace for compatibility
    window.ChartTitleManager = titleManager;

    // Legacy compatibility functions (to replace TitleControlIsolation)
    window.ChartTitleManager.updateTitleFont = function(chart, fontFamily) {
        titleManager.updateFont(chart, fontFamily);
    };

    window.ChartTitleManager.updateTitleSize = function(chart, size) {
        titleManager.updateSize(chart, size);
    };

    window.ChartTitleManager.updateTitleColor = function(chart, color) {
        titleManager.updateColor(chart, color);
    };


})();