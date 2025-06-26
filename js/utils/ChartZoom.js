/**
 * ChartZoom - Reusable zoom and pan functionality for charts
 * 
 * This module provides a complete zoom and pan system that can be used by any chart type.
 * It requires the chart to have:
 * - this.svg (D3 SVG element)
 * - this.chartContainer or this.zoomContainer (chart container element)
 * - this.config (configuration object)
 */
(function() {
    'use strict';

    /**
     * Initialize zoom and pan functionality
     * Sets up zoom behavior and binds it to the chart's SVG element
     */
    function initializeZoomPan() {
        // Initialize zoom and pan state if not already set
        if (!this.zoomState) {
            this.zoomState = {
                k: 1,     // scale factor
                x: 0,     // x translation
                y: 0      // y translation
            };
        }

        // Create zoom behavior
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 5])  // Allow zooming from 10% to 500%
            .on('zoom', (event) => {
                const { transform } = event;
                
                // Update zoom state
                this.zoomState.k = transform.k;
                this.zoomState.x = transform.x;
                this.zoomState.y = transform.y;
                
                // Apply transform to zoom container
                const zoomContainer = this.zoomContainer || this.chartContainer;
                if (zoomContainer) {
                    zoomContainer.attr('transform', transform);
                }
                
                // Update zoom slider if it exists
                updateZoomSlider.call(this, transform.k);
                
                // Optionally emit zoom event for external handlers
                if (this.onZoomChange) {
                    this.onZoomChange(this.zoomState);
                }
            });

        // Apply zoom behavior to SVG
        this.svg.call(this.zoom);

        // Set initial transform if we have saved state
        if (this.zoomState.k !== 1 || this.zoomState.x !== 0 || this.zoomState.y !== 0) {
            this.svg.call(
                this.zoom.transform,
                d3.zoomIdentity
                    .translate(this.zoomState.x, this.zoomState.y)
                    .scale(this.zoomState.k)
            );
        }
    }

    /**
     * Reset zoom and pan to default position
     */
    function resetZoom() {
        this.zoomState = { k: 1, x: 0, y: 0 };
        this.svg.transition()
            .duration(500)
            .call(
                this.zoom.transform,
                d3.zoomIdentity
            );
    }

    /**
     * Zoom in by a factor
     * @param {number} factor - The zoom factor (default: 1.5)
     */
    function zoomIn(factor = 1.5) {
        this.svg.transition()
            .duration(300)
            .call(
                this.zoom.scaleBy,
                factor
            );
    }

    /**
     * Zoom out by a factor
     * @param {number} factor - The zoom factor (default: 1.5)
     */
    function zoomOut(factor = 1.5) {
        this.svg.transition()
            .duration(300)
            .call(
                this.zoom.scaleBy,
                1 / factor
            );
    }

    /**
     * Fit chart to view and center it  
     */
    function fitToView() {
        // Get the actual chart content bounds (from the zoom container)
        const zoomContainer = this.zoomContainer || this.chartContainer;
        if (!zoomContainer || !zoomContainer.node()) return;
        
        const bounds = zoomContainer.node().getBBox();
        const svgRect = this.svg.node().getBoundingClientRect();
        const containerWidth = svgRect.width;
        const containerHeight = svgRect.height;
        
        if (bounds.width === 0 || bounds.height === 0) return;
        
        // Calculate optimal scale to fit chart with padding
        const scale = Math.min(
            (containerWidth * 0.9) / bounds.width,  // 90% of container width
            (containerHeight * 0.9) / bounds.height // 90% of container height
        );
        
        // Calculate the chart's center point in its own coordinate system
        const chartCenterX = bounds.x + bounds.width / 2;
        const chartCenterY = bounds.y + bounds.height / 2;
        
        // Calculate translation to center the chart in the container
        const translateX = containerWidth / 2 - scale * chartCenterX;
        const translateY = containerHeight / 2 - scale * chartCenterY;
        
        // Apply the transform with smooth transition
        this.svg.transition()
            .duration(750)
            .call(
                this.zoom.transform,
                d3.zoomIdentity
                    .translate(translateX, translateY)
                    .scale(scale)
            );
            
        console.log(`🎯 Fit to view: scale=${scale.toFixed(2)}, translate=(${translateX.toFixed(1)}, ${translateY.toFixed(1)})`);
    }

    /**
     * Set zoom level from slider (0.1 to 5.0)
     * @param {number} zoomLevel - The target zoom level
     */
    function setZoomLevel(zoomLevel) {
        // Get current center point of the visible area
        const svgRect = this.svg.node().getBoundingClientRect();
        const centerX = svgRect.width / 2;
        const centerY = svgRect.height / 2;
        
        // Get current transform
        const currentTransform = d3.zoomTransform(this.svg.node());
        
        // Calculate the point in chart coordinates that corresponds to the center
        const chartCenterX = (centerX - currentTransform.x) / currentTransform.k;
        const chartCenterY = (centerY - currentTransform.y) / currentTransform.k;
        
        // Calculate new translation to keep the same center point
        const newTranslateX = centerX - zoomLevel * chartCenterX;
        const newTranslateY = centerY - zoomLevel * chartCenterY;
        
        this.svg.transition()
            .duration(200)
            .call(
                this.zoom.transform,
                d3.zoomIdentity
                    .translate(newTranslateX, newTranslateY)
                    .scale(zoomLevel)
            );
    }

    /**
     * Update zoom slider to match current zoom level
     * @param {number} zoomLevel - The current zoom level
     */
    function updateZoomSlider(zoomLevel) {
        // Find the zoom level slider and update its value
        const zoomSlider = document.querySelector('input[data-control-id="zoomLevel"]');
        if (zoomSlider) {
            zoomSlider.value = zoomLevel;
            
            // Update the display value if it exists
            const valueDisplay = document.querySelector('.control-value[data-control-id="zoomLevel"]');
            if (valueDisplay) {
                valueDisplay.textContent = `${zoomLevel.toFixed(1)}x`;
            }
        }
    }

    // Export functions to global namespace
    window.ChartZoom = {
        initializeZoomPan,
        resetZoom,
        zoomIn,
        zoomOut,
        fitToView,
        setZoomLevel,
        updateZoomSlider
    };

    // Debug: Confirm ChartZoom is loaded
    console.log('✅ ChartZoom utility loaded successfully');

})();