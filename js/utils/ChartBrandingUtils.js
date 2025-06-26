/**
 * ChartBrandingUtils - Reusable branding functions for charts
 * 
 * This module provides complete branding functionality that can be used by any chart type.
 * It requires the chart to have:
 * - this.svg (D3 SVG element)
 * - this.config (configuration object)
 * - this.chartContainer (chart container element)
 * - this.data (chart data with metadata)
 */
(function() {
    'use strict';

    /**
     * Render chart title
     */
    function renderTitle() {
        const headerGroup = this.svg.append('g')
            .attr('class', 'chart-header');

        const company = this.data?.metadata?.company || 'Company';
        const period = this.data?.metadata?.period || 'Period';
        
        // FIXED: Dynamic title based on statement type
        const statementLabel = this.statementType === 'balance' ? 'Balance Sheet' : 'Income Statement';
        const titleText = `${company} ${period} ${statementLabel}`;

        headerGroup.append('text')
            .attr('x', this.config.width / 2)
            .attr('y', 60)
            .attr('text-anchor', 'middle')
            .attr('font-size', '40px')
            .attr('font-weight', '1000')
            .attr('font-family', this.getFontFamily ? this.getFontFamily() : 'Inter, sans-serif')
            .attr('fill', this.config.titleColor)
            .attr('letter-spacing', '0.5px')
            .text(titleText);

        console.log(`📊 Rendered ${statementLabel} title: ${titleText}`);
    }

    /**
     * Render branding footer with logo and attribution
     */
    function renderBrandingFooter() {
        const footerGroup = this.svg.append('g')
            .attr('class', 'chart-branding')
            .attr('transform', `translate(0, ${this.config.height - 35})`);

        // Priority order: backend logo file -> user uploaded logo -> default logo
        const backendLogoUrl = window.location.origin + '/assets/images/logo.png';
        const userLogoUrl = this.data?.metadata?.customLogoUrl;
        const defaultLogoUrl = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiByeD0iNCIgZmlsbD0iIzY2N2VlYSIvPgo8dGV4dCB4PSIxMCIgeT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iYm9sZCI+UDwvdGV4dD4KPC9zdmc+';
        
        // First try backend logo, then user logo, then default
        const primaryLogoUrl = this.data?.metadata?.logoUrl || backendLogoUrl;
        const fallbackLogoUrl = userLogoUrl || defaultLogoUrl;
        
        // Check if we have custom branding (backend logo or user logo)
        const hasBackendLogo = !this.data?.metadata?.logoUrl; // Will try backend logo first
        const hasCustomBranding = userLogoUrl || this.data?.metadata?.company;
        
        const logoImage = footerGroup.append('image')
            .attr('x', 10)
            .attr('y', -100)  // Moved up slightly for larger logo
            .attr('width', hasBackendLogo ? 200 : 32)  // Much larger for backend logo: 72px
            .attr('height', hasBackendLogo ? 200 : 32)
            .attr('href', primaryLogoUrl)
            .attr('opacity', 1.0)  // Full opacity
            .style('cursor', 'pointer')
            .on('error', function() {
                console.log('⚠️ Primary logo failed to load, trying fallback');
                // Try fallback logo
                d3.select(this)
                    .attr('href', fallbackLogoUrl)
                    .attr('width', userLogoUrl ? 32 : 24)
                    .attr('height', userLogoUrl ? 32 : 24)
                    .on('error', function() {
                        console.log('⚠️ Fallback logo failed, using default');
                        // Final fallback to default
                        d3.select(this)
                            .attr('href', defaultLogoUrl)
                            .attr('width', 24)
                            .attr('height', 24);
                    });
            });

        // Only show text branding if no backend logo
        if (!hasBackendLogo || primaryLogoUrl === defaultLogoUrl) {
            // Custom company name or default text
            const companyName = this.data?.metadata?.company || 'PULSE ANALYTICS';
            
            footerGroup.append('text')
                .attr('x', hasCustomBranding ? 65 : 50)  // Adjust position for larger custom logo
                .attr('y', -25)
                .attr('font-size', '16px')
                .attr('font-weight', '800')
                .attr('font-family', this.getFontFamily ? this.getFontFamily() : 'Inter, sans-serif')
                .attr('fill', '#667eea')
                .text(companyName);

            // Right side attribution - only show if not using custom branding
            if (!hasCustomBranding) {
                footerGroup.append('text')
                    .attr('x', this.config.width - 10)
                    .attr('y', -25)
                    .attr('text-anchor', 'end')
                    .attr('font-size', '16px')
                    .attr('font-weight', '800')
                    .attr('font-family', this.getFontFamily ? this.getFontFamily() : 'Inter, sans-serif')
                    .attr('fill', '#667eea')
                    .attr('opacity', 0.7)
                    .text('Generated by Pulse Charts');
            } else {
                // Show subtle attribution for custom branding
                footerGroup.append('text')
                    .attr('x', this.config.width - 10)
                    .attr('y', -25)
                    .attr('text-anchor', 'end')
                    .attr('font-size', '12px')
                    .attr('font-weight', '400')
                    .attr('font-family', this.getFontFamily ? this.getFontFamily() : 'Inter, sans-serif')
                    .attr('fill', '#94a3b8')
                    .attr('opacity', 0.6)
                    .text('Powered by Pulse Charts');
            }
        }
    }

    /**
     * Render brand logo with interactive resize/move functionality
     */
    function renderBrandLogo() {
        // Remove any existing brand logo
        this.svg.selectAll('.chart-brand-logo').remove();
        
        // Check if brand logo is configured
        const brandLogo = this.data?.metadata?.brandLogo;
        if (!brandLogo || !brandLogo.url) {
            return;
        }

        console.log('🏢 Rendering brand logo with hover-based resize functionality:', brandLogo);

        // Create brand logo group
        const logoGroup = this.svg.append('g')
            .attr('class', 'chart-brand-logo');

        // Add selection rectangle (only visible on hover)
        const selectionRect = logoGroup.append('rect')
            .attr('class', 'logo-selection')
            .attr('x', brandLogo.x - 5)
            .attr('y', brandLogo.y - 5)
            .attr('width', brandLogo.width + 10)
            .attr('height', brandLogo.height + 10)
            .attr('fill', 'none')
            .attr('stroke', '#667eea')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5')
            .attr('opacity', 0)
            .style('pointer-events', 'none');

        // Add brand logo image
        const logoImage = logoGroup.append('image')
            .attr('class', 'brand-image')
            .attr('href', brandLogo.url)
            .attr('x', brandLogo.x)
            .attr('y', brandLogo.y)
            .attr('width', brandLogo.width)
            .attr('height', brandLogo.height)
            .attr('opacity', brandLogo.opacity)
            .style('cursor', 'move')
            .on('error', function() {
                console.error('❌ Failed to load brand logo image');
                d3.select(this).remove();
            });

        // Add resize handles (only visible on hover)
        const handles = ['nw', 'ne', 'sw', 'se'];
        const resizeHandles = [];
        
        handles.forEach(handle => {
            let x, y;
            switch(handle) {
                case 'nw': x = brandLogo.x - 5; y = brandLogo.y - 5; break;
                case 'ne': x = brandLogo.x + brandLogo.width - 3; y = brandLogo.y - 5; break;
                case 'sw': x = brandLogo.x - 5; y = brandLogo.y + brandLogo.height - 3; break;
                case 'se': x = brandLogo.x + brandLogo.width - 3; y = brandLogo.y + brandLogo.height - 3; break;
            }
            
            const handleRect = logoGroup.append('rect')
                .attr('class', `resize-handle resize-${handle}`)
                .attr('x', x)
                .attr('y', y)
                .attr('width', 8)
                .attr('height', 8)
                .attr('fill', '#667eea')
                .attr('stroke', 'white')
                .attr('stroke-width', 1)
                .attr('opacity', 0)
                .style('cursor', `${handle}-resize`)
                .style('pointer-events', 'none');
                
            resizeHandles.push(handleRect);
        });

        // Hover functionality to show/hide resize handles
        logoGroup
            .on('mouseenter', () => {
                // Show selection rectangle and handles on hover
                selectionRect.attr('opacity', 1);
                resizeHandles.forEach(handle => {
                    handle.attr('opacity', 1).style('pointer-events', 'all');
                });
            })
            .on('mouseleave', () => {
                // Hide selection rectangle and handles when not hovering
                if (!brandLogo.isDragging && !brandLogo.isResizing) {
                    selectionRect.attr('opacity', 0);
                    resizeHandles.forEach(handle => {
                        handle.attr('opacity', 0).style('pointer-events', 'none');
                    });
                }
            });

        // Drag and drop functionality
        const drag = d3.drag()
            .on('start', () => {
                brandLogo.isDragging = true;
                console.log('🖱️ Logo drag started');
            })
            .on('drag', (event) => {
                const newX = Math.max(0, Math.min(this.config.width - brandLogo.width, brandLogo.x + event.dx));
                const newY = Math.max(0, Math.min(this.config.height - brandLogo.height, brandLogo.y + event.dy));
                
                brandLogo.x = newX;
                brandLogo.y = newY;
                
                updateLogoPosition.call(this, logoGroup, brandLogo);
            })
            .on('end', () => {
                brandLogo.isDragging = false;
                console.log(`🎯 Logo positioned at (${brandLogo.x}, ${brandLogo.y})`);
            });

        // Apply drag to logo image
        logoImage.call(drag);

        // Double-click to adjust opacity
        logoImage.on('dblclick', (event) => {
            event.stopPropagation();
            const rect = logoImage.node().getBoundingClientRect();
            if (this.showOpacityPicker) {
                this.showOpacityPicker(logoImage, brandLogo.opacity, (newOpacity) => {
                    brandLogo.opacity = newOpacity;
                    logoImage.attr('opacity', newOpacity);
                    console.log(`💫 Logo opacity set to ${newOpacity}`);
                }, { x: rect.x, y: rect.y });
            }
        });

        // Resize functionality for handles
        resizeHandles.forEach((handleRect, index) => {
            const handleType = handles[index];
            
            const resizeDrag = d3.drag()
                .on('start', () => {
                    brandLogo.isResizing = true;
                    console.log(`📏 Resize started from ${handleType} corner`);
                })
                .on('drag', (event) => {
                    const minSize = 20;
                    let newWidth = brandLogo.width;
                    let newHeight = brandLogo.height;
                    let newX = brandLogo.x;
                    let newY = brandLogo.y;
                    
                    switch(handleType) {
                        case 'se': // Bottom-right
                            newWidth = Math.max(minSize, brandLogo.width + event.dx);
                            newHeight = Math.max(minSize, brandLogo.height + event.dy);
                            break;
                        case 'sw': // Bottom-left
                            newWidth = Math.max(minSize, brandLogo.width - event.dx);
                            newHeight = Math.max(minSize, brandLogo.height + event.dy);
                            newX = brandLogo.x + (brandLogo.width - newWidth);
                            break;
                        case 'ne': // Top-right
                            newWidth = Math.max(minSize, brandLogo.width + event.dx);
                            newHeight = Math.max(minSize, brandLogo.height - event.dy);
                            newY = brandLogo.y + (brandLogo.height - newHeight);
                            break;
                        case 'nw': // Top-left
                            newWidth = Math.max(minSize, brandLogo.width - event.dx);
                            newHeight = Math.max(minSize, brandLogo.height - event.dy);
                            newX = brandLogo.x + (brandLogo.width - newWidth);
                            newY = brandLogo.y + (brandLogo.height - newHeight);
                            break;
                    }
                    
                    // Ensure boundaries
                    newX = Math.max(0, Math.min(this.config.width - newWidth, newX));
                    newY = Math.max(0, Math.min(this.config.height - newHeight, newY));
                    
                    // Update brand logo dimensions immediately
                    brandLogo.x = newX;
                    brandLogo.y = newY;
                    brandLogo.width = newWidth;
                    brandLogo.height = newHeight;
                    
                    // Immediate visual update for real-time feedback
                    updateLogoPosition.call(this, logoGroup, brandLogo);
                })
                .on('end', () => {
                    brandLogo.isResizing = false;
                    console.log(`📐 Logo resized to ${brandLogo.width}x${brandLogo.height}`);
                });
            
            handleRect.call(resizeDrag);
        });

        console.log(`🏢 Brand logo rendered at (${brandLogo.x}, ${brandLogo.y}) size ${brandLogo.width}x${brandLogo.height}`);
    }

    /**
     * Update logo position and size
     */
    function updateLogoPosition(logoGroup, brandLogo) {
        // Update image position and size
        logoGroup.select('.brand-image')
            .attr('x', brandLogo.x)
            .attr('y', brandLogo.y)
            .attr('width', brandLogo.width)
            .attr('height', brandLogo.height);
        
        // Update selection rectangle
        logoGroup.select('.logo-selection')
            .attr('x', brandLogo.x - 5)
            .attr('y', brandLogo.y - 5)
            .attr('width', brandLogo.width + 10)
            .attr('height', brandLogo.height + 10);
        
        // Update resize handles
        const handles = [
            {class: 'resize-nw', x: brandLogo.x - 5, y: brandLogo.y - 5},
            {class: 'resize-ne', x: brandLogo.x + brandLogo.width - 3, y: brandLogo.y - 5},
            {class: 'resize-sw', x: brandLogo.x - 5, y: brandLogo.y + brandLogo.height - 3},
            {class: 'resize-se', x: brandLogo.x + brandLogo.width - 3, y: brandLogo.y + brandLogo.height - 3}
        ];
        
        handles.forEach(handle => {
            logoGroup.select(`.${handle.class}`)
                .attr('x', handle.x)
                .attr('y', handle.y);
        });
    }

    /**
     * Update logo selection state
     */
    function updateLogoSelection(logoGroup, brandLogo) {
        const opacity = brandLogo.selected ? 1 : 0;
        const pointerEvents = brandLogo.selected ? 'all' : 'none';
        
        logoGroup.select('.logo-selection').attr('opacity', opacity);
        logoGroup.selectAll('.resize-handle')
            .attr('opacity', opacity)
            .style('pointer-events', pointerEvents);
    }

    /**
     * Render footnotes
     */
    function renderFootnotes() {
        if (!this.data?.metadata?.footnotes) return;
        
        const footnotes = this.svg.append('g')
            .attr('class', 'chart-footnotes')
            .attr('transform', `translate(${this.config.margin.left}, ${this.config.height - 80})`);

        this.data.metadata.footnotes.forEach((note, index) => {
            footnotes.append('text')
                .attr('y', index * 12)
                .attr('font-size', '10px')
                .attr('font-weight', '400')
                .attr('font-family', this.getFontFamily ? this.getFontFamily() : 'Inter, sans-serif')
                .attr('fill', '#6b7280')
                .text(`${index + 1}. ${note}`);
        });
    }

    /**
     * Update background color
     */
    function updateBackgroundColor(color) {
        this.config.backgroundColor = color;
        if (this.svg) {
            this.svg.style('background-color', color);
        }
        console.log(`🎨 Background color updated to ${color}`);
    }

    /**
     * Update title font
     */
    function updateTitleFont(fontFamily) {
        this.config.titleFont = fontFamily;
        if (this.svg) {
            const fontStack = this.getFontFamily ? this.getFontFamily() : fontFamily;
            
            // Update chart title and all text elements
            this.svg.selectAll('text')
                .style('font-family', fontStack);
            
            console.log(`🔤 Title font updated to ${fontFamily}`);
        }
    }

    /**
     * Update title color
     */
    function updateTitleColor(color) {
        this.config.titleColor = color;
        if (this.svg) {
            // Update all text elements
            this.svg.selectAll('text')
                .style('fill', color);
        }
        console.log(`🎨 Title color updated to ${color}`);
    }

    /**
     * Clear brand logo
     */
    function clearBrand() {
        console.log('🗑️ Clearing brand logo from chart');
        
        if (this.data && this.data.metadata && this.data.metadata.brandLogo) {
            delete this.data.metadata.brandLogo;
            
            // Remove brand logo from SVG
            this.svg.selectAll('.chart-brand-logo').remove();
            
            console.log('✅ Brand logo cleared successfully');
        } else {
            console.log('ℹ️ No brand logo to clear');
        }
    }

    // Export functions to global namespace
    window.ChartBrandingUtils = {
        renderTitle,
        renderBrandingFooter,
        renderBrandLogo,
        updateLogoPosition,
        updateLogoSelection,
        renderFootnotes,
        updateBackgroundColor,
        updateTitleFont,
        updateTitleColor,
        clearBrand
    };

    // Debug: Confirm ChartBrandingUtils is loaded
    console.log('✅ ChartBrandingUtils utility loaded successfully');
    console.log('🔍 d3 available:', typeof d3);

})();