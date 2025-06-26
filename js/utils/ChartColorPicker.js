/**
 * ChartColorPicker - Reusable color picker UI for charts
 * 
 * This module provides a complete color picker interface that can be used by any chart type.
 * It handles the UI logic while allowing charts to provide their own color update callbacks.
 */
(function() {
    'use strict';

    /**
     * Initialize color picker modal UI
     * Creates the color picker interface and binds events
     * @param {Function} onApplyColor - Callback function when color is applied
     */
    function initializeColorPicker(onApplyColor) {
        // Store the callback for later use
        this.onApplyColorCallback = onApplyColor;
        
        // Remove existing color picker
        d3.select('.color-picker-modal').remove();
        
        // Create color picker modal
        this.colorPicker = d3.select('body')
            .append('div')
            .attr('class', 'color-picker-modal')
            .style('position', 'fixed')
            .style('top', '50%')
            .style('left', '50%')
            .style('transform', 'translate(-50%, -50%)')
            .style('width', '160px')
            .style('background', 'white')
            .style('border-radius', '6px')
            .style('box-shadow', '0 8px 32px rgba(0,0,0,0.12)')
            .style('z-index', '1000')
            .style('display', 'none')
            .style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif')
            .style('padding', '8px')
            .style('border', '1px solid rgba(0,0,0,0.08)');

        // Close button (absolute positioned to avoid interference)
        this.colorPicker.append('button')
            .text('×')
            .style('position', 'absolute')
            .style('top', '-8px')
            .style('right', '-8px')
            .style('width', '20px')
            .style('height', '20px')
            .style('background', 'white')
            .style('border', '1px solid #ddd')
            .style('border-radius', '50%')
            .style('font-size', '12px')
            .style('cursor', 'pointer')
            .style('display', 'flex')
            .style('align-items', 'center')
            .style('justify-content', 'center')
            .style('color', '#666')
            .style('box-shadow', '0 2px 8px rgba(0,0,0,0.1)')
            .on('mouseover', function() {
                d3.select(this).style('background', '#f8f9fa');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', 'white');
            })
            .on('click', () => hideColorPicker.call(this));

        // Native color picker
        const colorInput = this.colorPicker.append('input')
            .attr('type', 'color')
            .attr('id', 'color-picker-input')
            .style('width', '100%')
            .style('height', '28px')
            .style('border', '1px solid #ddd')
            .style('border-radius', '3px')
            .style('cursor', 'pointer')
            .style('margin-bottom', '8px');

        const presetColors = [
            '#3498db', '#2BA02D', '#CC0100', 
            '#CC0100', '#9b59b6', '#34495e'
        ];

        // Horizontal preset row
        const presetRow = this.colorPicker.append('div')
            .style('display', 'flex')
            .style('gap', '4px')
            .style('margin-bottom', '8px');

        presetColors.forEach(color => {
            presetRow.append('div')
                .style('width', '20px')
                .style('height', '20px')
                .style('background', color)
                .style('border', '1px solid rgba(0,0,0,0.1)')
                .style('border-radius', '2px')
                .style('cursor', 'pointer')
                .style('transition', 'all 0.15s ease')
                .on('mouseover', function() {
                    d3.select(this)
                        .style('transform', 'scale(1.15)')
                        .style('border-color', '#333');
                })
                .on('mouseout', function() {
                    d3.select(this)
                        .style('transform', 'scale(1)')
                        .style('border-color', 'rgba(0,0,0,0.1)');
                })
                .on('click', () => {
                    colorInput.property('value', color);
                });
        });

        // Apply button
        this.colorPicker.append('button')
            .text('Apply')
            .style('width', '100%')
            .style('padding', '6px')
            .style('background', '#3498db')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '3px')
            .style('font-size', '12px')
            .style('font-weight', '500')
            .style('cursor', 'pointer')
            .style('transition', 'background 0.15s ease')
            .on('mouseover', function() {
                d3.select(this).style('background', '#2980b9');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', '#3498db');
            })
            .on('click', () => applySelectedColor.call(this));
    }

    /**
     * Show color picker for an element
     * @param {Element} element - The DOM element that was clicked
     * @param {string} currentColor - Current color to preset in picker
     */
    function showColorPicker(element, currentColor) {
        this.selectedElement = element;
        this.isColorPickerActive = true;
        
        this.colorPicker.select('#color-picker-input')
            .property('value', currentColor || '#3498db');
        
        this.colorPicker.style('display', 'block');
    }

    /**
     * Hide color picker modal
     */
    function hideColorPicker() {
        this.isColorPickerActive = false;
        this.selectedElement = null;
        this.colorPicker.style('display', 'none');
    }

    /**
     * Show opacity picker for an element
     * @param {Element} element - The DOM element that was clicked
     * @param {number} currentOpacity - Current opacity value (0-1)
     * @param {Function} onApply - Callback function when opacity changes
     * @param {Object} position - Optional position {x, y} for picker placement
     */
    function showOpacityPicker(element, currentOpacity, onApply, position = null) {
        // Remove existing opacity picker
        d3.select('.opacity-picker-modal').remove();
        
        // Determine position
        let left = '50%';
        let top = '50%';
        let transform = 'translate(-50%, -50%)';
        
        if (position) {
            left = (position.x + 20) + 'px';
            top = (position.y - 50) + 'px';
            transform = 'none';
        }
        
        // Create simplified opacity picker modal
        const opacityPicker = d3.select('body')
            .append('div')
            .attr('class', 'opacity-picker-modal')
            .style('position', 'fixed')
            .style('top', top)
            .style('left', left)
            .style('transform', transform)
            .style('width', '160px')
            .style('background', 'white')
            .style('border-radius', '8px')
            .style('box-shadow', '0 8px 32px rgba(0,0,0,0.15)')
            .style('z-index', '1000')
            .style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif')
            .style('padding', '12px')
            .style('border', '1px solid rgba(0,0,0,0.08)');

        // Simple title
        opacityPicker.append('div')
            .text('Opacity')
            .style('font-weight', '600')
            .style('font-size', '14px')
            .style('color', '#374151')
            .style('margin-bottom', '12px')
            .style('text-align', 'center');

        // Range slider
        const opacitySlider = opacityPicker.append('input')
            .attr('type', 'range')
            .attr('min', '0.1')
            .attr('max', '1')
            .attr('step', '0.05')
            .attr('value', currentOpacity)
            .style('width', '100%')
            .style('margin-bottom', '8px');

        // Value display
        const valueDisplay = opacityPicker.append('div')
            .style('text-align', 'center')
            .style('font-size', '12px')
            .style('color', '#6b7280')
            .style('margin-bottom', '12px')
            .text(`${Math.round(currentOpacity * 100)}%`);

        // Update value display on slider change
        opacitySlider.on('input', function() {
            const value = parseFloat(this.value);
            valueDisplay.text(`${Math.round(value * 100)}%`);
            // Apply immediately for real-time preview
            onApply(value);
        });

        // Close when clicking outside
        const closeOnOutsideClick = (event) => {
            if (!opacityPicker.node().contains(event.target)) {
                opacityPicker.remove();
                document.removeEventListener('click', closeOnOutsideClick);
            }
        };
        
        // Add delay to prevent immediate closing
        setTimeout(() => {
            document.addEventListener('click', closeOnOutsideClick);
        }, 100);
    }

    /**
     * Apply selected color using chart-specific callback
     * This function calls the callback provided during initialization
     */
    function applySelectedColor() {
        if (!this.selectedElement) return;
        
        const newColor = this.colorPicker.select('#color-picker-input').property('value');
        const elementData = d3.select(this.selectedElement).datum();
        
        // Call the chart-specific callback function
        if (this.onApplyColorCallback && typeof this.onApplyColorCallback === 'function') {
            this.onApplyColorCallback(elementData, newColor, this.selectedElement);
        } else {
            console.warn('⚠️ No color apply callback provided to ChartColorPicker');
        }
        
        hideColorPicker.call(this);
    }

    // Export functions to global namespace
    window.ChartColorPicker = {
        initializeColorPicker,
        showColorPicker,
        hideColorPicker,
        showOpacityPicker,
        applySelectedColor
    };

    // Debug: Confirm ChartColorPicker is loaded
    console.log('✅ ChartColorPicker utility loaded successfully');
    console.log('🔍 d3 available:', typeof d3);

})();