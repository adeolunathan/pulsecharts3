/* ===== GLOBAL CHART BRANDING UTILITY ===== */
/* Centralized branding component for all chart types */

class ChartBranding {
    constructor() {
        this.defaultConfig = {
            position: 'bottom-left',
            logoSize: { width: 240, height: 240 },
            textSize: '14px',
            fontWeight: '400',
            fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            textColor: '#6b7280',
            opacity: 1,
            spacing: { x: 5, y: -80 },
            backendLogoUrl: 'assets/images/logo.PNG',
            defaultLogoUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiByeD0iNCIgZmlsbD0iIzY2N2VlYSIvPgo8dGV4dCB4PSIxMCIgeT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iYm9sZCI+UDwvdGV4dD4KPC9zdmc+'
        };
    }

    /**
     * Render branding footer on any chart type
     * @param {d3.Selection} svg - The SVG element to append branding to
     * @param {Object} config - Chart configuration (width, height, etc.)
     * @param {Object} metadata - Chart metadata (company name, custom logos, etc.)
     * @param {Object} options - Override default branding options
     */
    renderBranding(svg, config, metadata = {}, options = {}) {
        // Merge with defaults
        const brandingConfig = { ...this.defaultConfig, ...options };
        
        // Remove any existing branding
        svg.selectAll('.chart-branding').remove();
        
        console.log('🏢 Rendering global chart branding');

        // Determine position
        const position = this.calculatePosition(config, brandingConfig);
        
        // Create branding group with export-friendly attributes
        const brandingGroup = svg.append('g')
            .attr('class', 'chart-branding')
            .attr('transform', `translate(${position.x}, ${position.y})`)
            .attr('data-export-element', 'branding') // Mark for export processing
            .style('opacity', 1); // Ensure visibility in exports

        // Determine logo priority: backend logo -> user custom logo -> default logo
        const logoInfo = this.determineLogo(metadata, brandingConfig);
        
        // Add logo
        this.addLogo(brandingGroup, logoInfo, brandingConfig);
        
        // Add text branding
        this.addTextBranding(brandingGroup, logoInfo, metadata, brandingConfig, config);
        
        console.log(`✅ Global branding rendered at (${position.x}, ${position.y})`);
    }

    /**
     * Calculate branding position based on config and position setting
     */
    calculatePosition(config, brandingConfig) {
        const { position, spacing } = brandingConfig;
        
        switch (position) {
            case 'bottom-left':
                return { x: spacing.x, y: config.height - spacing.y };
            case 'bottom-right':
                return { x: config.width - spacing.x, y: config.height - spacing.y };
            case 'top-left':
                return { x: spacing.x, y: spacing.y };
            case 'top-right':
                return { x: config.width - spacing.x, y: spacing.y };
            default:
                return { x: spacing.x, y: config.height - spacing.y };
        }
    }

    /**
     * Determine which logo to use based on priority
     */
    determineLogo(metadata, brandingConfig) {
        const backendLogoUrl = brandingConfig.backendLogoUrl;
        const userLogoUrl = metadata?.customLogoUrl;
        const defaultLogoUrl = brandingConfig.defaultLogoUrl;
        
        // Priority: backend logo -> user custom logo -> default logo
        let primaryLogoUrl = metadata?.logoUrl || backendLogoUrl;
        const isBackendLogo = !metadata?.logoUrl && primaryLogoUrl === backendLogoUrl;
        const hasCustomBranding = userLogoUrl || metadata?.company;
        
        return {
            primary: primaryLogoUrl,
            fallback: userLogoUrl || defaultLogoUrl,
            default: defaultLogoUrl,
            isBackend: isBackendLogo,
            hasCustom: hasCustomBranding
        };
    }

    /**
     * Add logo element to branding group
     */
    addLogo(brandingGroup, logoInfo, brandingConfig) {
        const logoSize = logoInfo.isBackend ? 
            brandingConfig.logoSize : 
            { width: 32, height: 32 };

        const logoImage = brandingGroup.append('image')
            .attr('x', 0)
            .attr('y', -logoSize.height)
            .attr('width', logoSize.width)
            .attr('height', logoSize.height)
            .attr('href', logoInfo.primary)
            .attr('opacity', brandingConfig.opacity)
            .attr('data-branding-element', 'logo') // Mark for export processing
            .style('cursor', 'pointer')
            .on('error', function() {
                console.log('⚠️ Primary logo failed to load, trying fallback');
                // Try fallback logo
                d3.select(this)
                    .attr('href', logoInfo.fallback)
                    .attr('width', logoInfo.hasCustom ? 32 : 24)
                    .attr('height', logoInfo.hasCustom ? 32 : 24)
                    .on('error', function() {
                        console.log('⚠️ Fallback logo failed, using default');
                        // Final fallback to default
                        d3.select(this)
                            .attr('href', logoInfo.default)
                            .attr('width', 24)
                            .attr('height', 24);
                    });
            });

        // Convert external URLs to data URLs for better export compatibility
        this.convertToDataURLIfNeeded(logoImage, logoInfo);

        return logoImage;
    }

    /**
     * Convert external image URLs to data URLs for export compatibility
     */
    convertToDataURLIfNeeded(imageElement, logoInfo) {
        const href = logoInfo.primary;
        
        // Skip if already a data URL
        if (href.startsWith('data:')) {
            return;
        }
        
        // Convert relative/external URLs to data URLs
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                
                ctx.drawImage(img, 0, 0);
                
                const dataURL = canvas.toDataURL('image/png');
                imageElement.attr('href', dataURL);
                
                console.log('✅ Logo converted to data URL for export compatibility');
            } catch (error) {
                console.warn('⚠️ Could not convert logo to data URL:', error);
            }
        };
        
        img.onerror = () => {
            console.warn('⚠️ Could not load logo for data URL conversion:', href);
        };
        
        // Try to load the image
        if (href.startsWith('http') || href.startsWith('/') || href.startsWith('./')) {
            img.src = href;
        } else {
            // Handle relative URLs by making them absolute
            const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
            img.src = baseUrl + href;
        }
    }

    /**
     * Add text branding elements
     */
    addTextBranding(brandingGroup, logoInfo, metadata, brandingConfig, config) {
        // Only show text branding if no backend logo or using default
        if (!logoInfo.isBackend || logoInfo.primary === logoInfo.default) {
            // Custom company name or default text
            const companyName = metadata?.company || 'PULSE ANALYTICS';
            
            brandingGroup.append('text')
                .attr('x', logoInfo.hasCustom ? 45 : 35)
                .attr('y', -brandingConfig.logoSize.height / 2)
                .attr('font-size', brandingConfig.textSize)
                .attr('font-weight', '800')
                .attr('font-family', brandingConfig.fontFamily)
                .attr('fill', '#667eea')
                .attr('opacity', brandingConfig.opacity)
                .attr('data-branding-element', 'company-name') // Mark for export processing
                .text(companyName);
        }

        // Right side attribution - always show
        console.log('🏷️ Branding debug:', {hasCustom: logoInfo.hasCustom, isBackend: logoInfo.isBackend});
        // Always show attribution text regardless of custom branding
        {
            // Try direct text approach first
            const attributionText = brandingGroup.append('text')
                .attr('x', config.width - 20)
                .attr('y', -20)
                .attr('text-anchor', 'end')
                .attr('font-size', '14px')
                .attr('font-weight', 'bold')
                .attr('font-family', 'Arial, sans-serif')
                .attr('fill', '#000000')
                .attr('opacity', 1)
                .attr('data-branding-element', 'attribution')
                .text('chart by pulse');
                
            // Also create as image for export compatibility
            const textSvg = `<svg width="120" height="20" xmlns="http://www.w3.org/2000/svg"><text x="115" y="15" text-anchor="end" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#000000">chart by pulse</text></svg>`;
            const textDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(textSvg);
            
            brandingGroup.append('image')
                .attr('x', config.width - 125)
                .attr('y', -35)
                .attr('width', 120)
                .attr('height', 20)
                .attr('href', textDataUrl)
                .attr('opacity', 1)
                .attr('data-branding-element', 'attribution-image')
                .style('display', 'none'); // Hide by default, show only in export
                
            console.log(`📍 Attribution text positioned at x:${config.width - 20}, y:-20`);
        }
    }

    /**
     * Update branding configuration globally
     */
    updateConfig(newConfig) {
        this.defaultConfig = { ...this.defaultConfig, ...newConfig };
    }

    /**
     * Get current branding configuration
     */
    getConfig() {
        return { ...this.defaultConfig };
    }

    /**
     * Remove branding from a chart
     */
    removeBranding(svg) {
        svg.selectAll('.chart-branding').remove();
        console.log('🗑️ Branding removed from chart');
    }
}

// Create global instance
window.ChartBranding = window.ChartBranding || new ChartBranding();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ChartBranding;
}