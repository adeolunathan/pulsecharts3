/* ===== PULSE BAR CHART - USING EXTRACTED REUSABLE ARCHITECTURE ===== */
/* Bar chart implementation leveraging all reusable modules: */
/* ChartUtils, ChartExports, ChartZoom, ChartColorPicker, ChartBrandingUtils */

class PulseBarChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        this.svg = null;
        this.chart = null;
        this.data = null;
        this.tooltip = null;
        this.bars = [];
        
        // Custom color storage
        this.customColors = {};
        
        // Color picker state
        this.isColorPickerActive = false;
        this.selectedElement = null;
        
        // Chart specific properties
        this.xScale = null;
        this.yScale = null;
        this.xAxis = null;
        this.yAxis = null;
        
        // Get configuration from BarChartConfig
        this.config = BarChartConfig.getInitialConfig();
        this.initializeChart();
    }

    applyControlDefaults(controlModule) {
        if (controlModule && controlModule.getDefaultConfig) {
            const controlDefaults = controlModule.getDefaultConfig();
            this.config = { ...this.config, ...controlDefaults };
            console.log('✅ Applied control module defaults to bar chart config');
            
            // Re-render if data exists
            if (this.data) {
                this.render();
            }
        }
    }

    initializeChart() {
        this.container.selectAll('*').remove();
        
        const dimensions = {
            width: this.config.width - this.config.margin.left - this.config.margin.right,
            height: this.config.height - this.config.margin.top - this.config.margin.bottom
        };

        this.svg = this.container
            .append('svg')
            .attr('class', 'chart-svg')
            .attr('width', this.config.width)
            .attr('height', this.config.height)
            .attr('viewBox', `0 0 ${this.config.width} ${this.config.height}`)
            .style('background-color', this.config.backgroundColor);

        // Create zoom container
        this.zoomContainer = this.svg
            .append('g')
            .attr('class', 'zoom-container');

        this.chart = this.zoomContainer
            .append('g')
            .attr('class', 'chart-group')
            .attr('transform', `translate(${this.config.margin.left}, ${this.config.margin.top})`);

        // Initialize zoom and pan functionality using reusable module
        this.initializeZoomWithRetry();

        this.createTooltip();
        this.initializeColorPickerWithRetry();
    }

    // Retry utility initialization with timeout
    initializeZoomWithRetry() {
        const attemptZoom = () => {
            if (window.ChartZoom && window.ChartZoom.initializeZoomPan) {
                ChartZoom.initializeZoomPan.call(this);
                console.log('✅ ChartZoom utility connected successfully to bar chart');
                return true;
            }
            return false;
        };

        if (!attemptZoom()) {
            console.log('⚠️ ChartZoom not ready, retrying in 100ms...');
            setTimeout(() => {
                if (!attemptZoom()) {
                    console.warn('❌ ChartZoom utility not available. Please ensure ChartZoom.js is loaded before BarChart.js');
                    this.initializeZoomFallback();
                }
            }, 100);
        }
    }

    initializeColorPickerWithRetry() {
        const attemptColorPicker = () => {
            if (window.ChartColorPicker && window.ChartColorPicker.initializeColorPicker) {
                const colorCallback = (elementData, newColor) => this.handleColorChange(elementData, newColor);
                ChartColorPicker.initializeColorPicker.call(this, colorCallback);
                console.log('✅ ChartColorPicker utility connected successfully to bar chart');
                return true;
            }
            return false;
        };

        if (!attemptColorPicker()) {
            console.log('⚠️ ChartColorPicker not ready, retrying in 100ms...');
            setTimeout(() => {
                if (!attemptColorPicker()) {
                    console.warn('❌ ChartColorPicker utility not available. Please ensure ChartColorPicker.js is loaded before BarChart.js');
                    this.initializeColorPickerFallback();
                }
            }, 100);
        }
    }

    // Handle color changes from color picker
    handleColorChange(elementData, newColor, element) {
        if (elementData && elementData.category) {
            // Update bar color
            this.updateBarColor(elementData, newColor);
        }
    }

    updateBarColor(barData, newColor) {
        // Store custom color
        this.customColors[barData.category] = newColor;
        
        // Update the visual element
        this.chart.selectAll('.bar')
            .filter(d => d.category === barData.category)
            .transition()
            .duration(200)
            .attr('fill', newColor);
        
        console.log(`🎨 Bar color updated for ${barData.category}: ${newColor}`);
    }

    createTooltip() {
        if (this.tooltip) {
            this.tooltip.remove();
        }

        this.tooltip = d3.select('body')
            .append('div')
            .attr('class', 'chart-tooltip')
            .style('position', 'absolute')
            .style('background', 'rgba(0, 0, 0, 0.8)')
            .style('color', 'white')
            .style('padding', '8px 12px')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('font-family', 'Inter, sans-serif')
            .style('pointer-events', 'none')
            .style('opacity', 0)
            .style('z-index', '1000');
    }

    processData(data) {
        if (!data) {
            console.error('❌ No data provided to bar chart');
            return null;
        }

        console.log('📊 Processing bar chart data:', data);

        // Handle different data formats
        let processedData = [];
        
        if (data.categories && data.values) {
            // Simple format: {categories: ['A', 'B'], values: [10, 20]}
            processedData = data.categories.map((category, index) => ({
                category: category,
                value: data.values[index] || 0,
                label: data.labels ? data.labels[index] : category
            }));
        } else if (Array.isArray(data)) {
            // Array format: [{category: 'A', value: 10}, ...]
            processedData = data.map(d => ({
                category: d.category || d.name || d.label,
                value: parseFloat(d.value) || 0,
                label: d.label || d.category || d.name
            }));
        } else if (data.data && Array.isArray(data.data)) {
            // Nested format: {data: [{category: 'A', value: 10}]}
            processedData = data.data.map(d => ({
                category: d.category || d.name || d.label,
                value: parseFloat(d.value) || 0,
                label: d.label || d.category || d.name
            }));
        }

        // Sort data by value (descending) for better visualization
        processedData.sort((a, b) => b.value - a.value);

        console.log('✅ Processed bar chart data:', processedData);
        return processedData;
    }

    render(data = null) {
        if (data) {
            this.data = this.processData(data);
        }

        if (!this.data || this.data.length === 0) {
            console.warn('⚠️ No data available for bar chart rendering');
            return;
        }

        console.log('🎨 Rendering bar chart with', this.data.length, 'bars');

        // Clear existing content
        this.chart.selectAll('*').remove();

        // Calculate dimensions
        const chartWidth = this.config.width - this.config.margin.left - this.config.margin.right;
        const chartHeight = this.config.height - this.config.margin.top - this.config.margin.bottom;

        // Create scales
        this.createScales(chartWidth, chartHeight);

        // Render grid if enabled
        if (this.config.showGrid) {
            this.renderGrid(chartWidth, chartHeight);
        }

        // Render axes
        this.renderAxes(chartWidth, chartHeight);

        // Render bars
        this.renderBars();

        // Initialize branding using reusable module
        this.initializeBranding();

        console.log('✅ Bar chart rendered successfully');
    }

    createScales(chartWidth, chartHeight) {
        // X scale (categories)
        this.xScale = d3.scaleBand()
            .domain(this.data.map(d => d.category))
            .range([0, chartWidth])
            .padding(this.config.barPadding);

        // Y scale (values)
        const maxValue = d3.max(this.data, d => d.value);
        const minValue = d3.min(this.data, d => d.value);
        const valueRange = maxValue - Math.min(0, minValue);
        
        this.yScale = d3.scaleLinear()
            .domain([Math.min(0, minValue), maxValue + (valueRange * 0.1)]) // Add 10% padding
            .range([chartHeight, 0]);
    }

    renderGrid(chartWidth, chartHeight) {
        // Y-axis grid lines
        const yGrid = this.chart.append('g')
            .attr('class', 'grid y-grid');

        yGrid.selectAll('line')
            .data(this.yScale.ticks())
            .enter()
            .append('line')
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', d => this.yScale(d))
            .attr('y2', d => this.yScale(d))
            .attr('stroke', this.config.gridColor)
            .attr('stroke-width', 0.5)
            .attr('opacity', this.config.gridOpacity);
    }

    renderAxes(chartWidth, chartHeight) {
        // X axis
        if (this.config.showXAxis) {
            const xAxisGroup = this.chart.append('g')
                .attr('class', 'x-axis')
                .attr('transform', `translate(0, ${chartHeight})`);

            this.xAxis = d3.axisBottom(this.xScale);
            xAxisGroup.call(this.xAxis);

            // Style x-axis
            xAxisGroup.selectAll('text')
                .style('font-family', this.config.titleFont || 'Inter, sans-serif')
                .style('font-size', `${this.config.globalFontSize}px`)
                .style('fill', this.config.axisColor);

            xAxisGroup.selectAll('path, line')
                .style('stroke', this.config.axisColor)
                .style('stroke-width', this.config.axisStrokeWidth);
        }

        // Y axis
        if (this.config.showYAxis) {
            const yAxisGroup = this.chart.append('g')
                .attr('class', 'y-axis');

            this.yAxis = d3.axisLeft(this.yScale)
                .tickFormat(d => this.formatValue(d));
            yAxisGroup.call(this.yAxis);

            // Style y-axis
            yAxisGroup.selectAll('text')
                .style('font-family', this.config.titleFont || 'Inter, sans-serif')
                .style('font-size', `${this.config.globalFontSize}px`)
                .style('fill', this.config.axisColor);

            yAxisGroup.selectAll('path, line')
                .style('stroke', this.config.axisColor)
                .style('stroke-width', this.config.axisStrokeWidth);
        }
    }

    renderBars() {
        // Get colors
        const colors = this.getBarColors();

        // Create bars
        const bars = this.chart.selectAll('.bar')
            .data(this.data)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', d => this.xScale(d.category))
            .attr('width', this.xScale.bandwidth())
            .attr('y', this.yScale(0)) // Start from baseline
            .attr('height', 0) // Start with 0 height for animation
            .attr('fill', (d, i) => this.customColors[d.category] || colors[i % colors.length])
            .attr('opacity', this.config.barOpacity)
            .attr('rx', this.config.barCornerRadius)
            .attr('ry', this.config.barCornerRadius)
            .style('cursor', 'pointer');

        // Animate bars
        bars.transition()
            .duration(this.config.animationDuration)
            .ease(d3.easeQuadOut)
            .attr('y', d => this.yScale(Math.max(0, d.value)))
            .attr('height', d => Math.abs(this.yScale(d.value) - this.yScale(0)));

        // Add interactivity
        this.addBarInteractivity(bars);

        // Add labels if enabled
        if (this.config.showBarLabels) {
            this.renderBarLabels();
        }

        // Store bars reference
        this.bars = bars;
    }

    renderBarLabels() {
        const labels = this.chart.selectAll('.bar-label')
            .data(this.data)
            .enter()
            .append('text')
            .attr('class', 'bar-label')
            .attr('x', d => this.xScale(d.category) + this.xScale.bandwidth() / 2)
            .attr('y', d => this.yScale(d.value) - this.config.labelOffset)
            .attr('text-anchor', 'middle')
            .style('font-family', this.config.titleFont || 'Inter, sans-serif')
            .style('font-size', `${this.config.labelFontSize}px`)
            .style('font-weight', this.config.labelFontWeight)
            .style('fill', this.config.labelColor)
            .style('opacity', 0)
            .text(d => this.config.showValues ? this.formatValue(d.value) : d.label);

        // Animate labels
        labels.transition()
            .delay(this.config.animationDuration * 0.5)
            .duration(this.config.animationDuration * 0.5)
            .style('opacity', 1);
    }

    addBarInteractivity(bars) {
        bars
            .on('mouseover', (event, d) => {
                if (this.config.enableHover) {
                    // Highlight bar
                    d3.select(event.currentTarget)
                        .transition()
                        .duration(200)
                        .attr('opacity', this.config.hoverOpacity)
                        .attr('fill', this.config.hoverColor);

                    // Show tooltip
                    if (this.config.enableTooltip) {
                        this.showTooltip(event, d);
                    }
                }
            })
            .on('mouseout', (event, d) => {
                if (this.config.enableHover) {
                    // Reset bar appearance
                    const colors = this.getBarColors();
                    const originalColor = this.customColors[d.category] || colors[this.data.indexOf(d) % colors.length];
                    
                    d3.select(event.currentTarget)
                        .transition()
                        .duration(200)
                        .attr('opacity', this.config.barOpacity)
                        .attr('fill', originalColor);

                    // Hide tooltip
                    if (this.config.enableTooltip) {
                        this.hideTooltip();
                    }
                }
            })
            .on('click', (event, d) => {
                if (this.config.enableClick) {
                    event.stopPropagation();
                    
                    // Show color picker using reusable module
                    const currentColor = this.customColors[d.category] || this.config.defaultBarColor;
                    this.showColorPicker(event.currentTarget, currentColor);
                }
            });
    }

    showTooltip(event, data) {
        const tooltip = this.tooltip;
        const formattedValue = this.formatValue(data.value);
        
        tooltip.html(`
            <strong>${data.label}</strong><br>
            Value: ${formattedValue}
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .transition()
        .duration(200)
        .style('opacity', 1);
    }

    hideTooltip() {
        this.tooltip
            .transition()
            .duration(200)
            .style('opacity', 0);
    }

    getBarColors() {
        if (this.config.customColors && this.config.customColors.length > 0) {
            return this.config.customColors;
        }
        return BarChartConfig.getColorScheme(this.config.colorScheme);
    }

    formatValue(value) {
        switch (this.config.valueFormat) {
            case 'currency':
                return this.config.currencySymbol + value.toLocaleString(undefined, {
                    minimumFractionDigits: this.config.decimalPlaces,
                    maximumFractionDigits: this.config.decimalPlaces
                });
            case 'percentage':
                return (value * 100).toFixed(this.config.decimalPlaces) + '%';
            default:
                return value.toLocaleString(undefined, {
                    minimumFractionDigits: this.config.decimalPlaces,
                    maximumFractionDigits: this.config.decimalPlaces
                });
        }
    }

    // Initialize branding using reusable module
    initializeBranding() {
        if (window.ChartBrandingUtils && window.ChartBrandingUtils.renderTitle) {
            ChartBrandingUtils.renderTitle.call(this);
        } else {
            this.renderTitleFallback();
        }

        if (window.ChartBrandingUtils && window.ChartBrandingUtils.renderFootnotes) {
            ChartBrandingUtils.renderFootnotes.call(this);
        } else {
            this.renderFootnotesFallback();
        }

        if (this.config.showBranding !== false) {
            if (window.ChartBrandingUtils && window.ChartBrandingUtils.renderBrandingFooter) {
                ChartBrandingUtils.renderBrandingFooter.call(this);
            } else {
                this.renderBrandingFooterFallback();
            }
        }

        if (window.ChartBrandingUtils && window.ChartBrandingUtils.renderBrandLogo) {
            ChartBrandingUtils.renderBrandLogo.call(this);
        } else {
            this.renderBrandLogoFallback();
        }
    }

    // Export functions using reusable module
    exportToPNG(filename = 'bar-chart.png') {
        if (window.ChartExports && window.ChartExports.exportToPNG) {
            return ChartExports.exportToPNG.call(this, filename);
        } else {
            console.warn('❌ ChartExports utility not available');
            return this.exportToPNGFallback(filename);
        }
    }

    exportToSVG(filename = 'bar-chart.svg') {
        if (window.ChartExports && window.ChartExports.exportToSVG) {
            return ChartExports.exportToSVG.call(this, filename);
        } else {
            console.warn('❌ ChartExports utility not available');
            return this.exportToSVGFallback(filename);
        }
    }

    exportToCSV(filename = 'bar-chart.csv') {
        if (window.ChartExports && window.ChartExports.exportToCSV) {
            const csvData = this.data.map(d => ({
                Category: d.category,
                Value: d.value,
                Label: d.label
            }));
            return ChartExports.exportToCSV.call(this, csvData, filename);
        } else {
            console.warn('❌ ChartExports utility not available');
            return this.exportToCSVFallback(filename);
        }
    }

    // Zoom control methods using reusable module
    resetZoom() {
        if (window.ChartZoom && window.ChartZoom.resetZoom) {
            ChartZoom.resetZoom.call(this);
        } else {
            console.warn('❌ ChartZoom utility not available');
        }
    }

    // Color picker wrapper methods
    showColorPicker(element, currentColor) {
        if (window.ChartColorPicker && window.ChartColorPicker.showColorPicker) {
            ChartColorPicker.showColorPicker.call(this, element, currentColor);
        } else {
            this.showColorPickerFallback(element, currentColor);
        }
    }

    hideColorPicker() {
        if (window.ChartColorPicker && window.ChartColorPicker.hideColorPicker) {
            ChartColorPicker.hideColorPicker.call(this);
        } else {
            this.hideColorPickerFallback();
        }
    }

    // Font family getter for consistent typography
    getFontFamily() {
        return this.config.titleFont || 'Inter, sans-serif';
    }

    // Utility method for text wrapping using reusable module
    wrapText(selection, width) {
        if (window.ChartUtils && window.ChartUtils.wrapText) {
            selection.each(function() {
                ChartUtils.wrapText.call(this, d3.select(this), width);
            });
        }
    }

    // ===== FALLBACK METHODS (when reusable modules aren't available) =====
    
    initializeZoomFallback() {
        console.log('🔄 Using zoom fallback implementation');
        // Basic zoom implementation
    }

    initializeColorPickerFallback() {
        console.log('🎨 Using color picker fallback implementation');
        // Basic color picker implementation
    }

    renderTitleFallback() {
        console.log('📝 Using title fallback implementation');
        // Basic title rendering
    }

    renderFootnotesFallback() {
        console.log('📝 Using footnotes fallback implementation');
        // Basic footnotes rendering
    }

    renderBrandingFooterFallback() {
        console.log('🏢 Using branding footer fallback implementation');
        // Basic branding footer rendering
    }

    renderBrandLogoFallback() {
        console.log('🏢 Using brand logo fallback implementation');
        // Basic brand logo rendering
    }

    showColorPickerFallback(element, currentColor) {
        console.log('🎨 Using color picker show fallback implementation');
        // Basic color picker show
    }

    hideColorPickerFallback() {
        console.log('🎨 Using color picker hide fallback implementation');
        // Basic color picker hide
    }

    exportToPNGFallback(filename) {
        console.log('📁 Using PNG export fallback implementation');
        // Basic PNG export
    }

    exportToSVGFallback(filename) {
        console.log('📁 Using SVG export fallback implementation');
        // Basic SVG export
    }

    exportToCSVFallback(filename) {
        console.log('📁 Using CSV export fallback implementation');
        // Basic CSV export
    }

    // Configuration management methods required by controls
    updateConfig(newConfig) {
        console.log('🔧 Updating bar chart configuration:', newConfig);
        this.config = { ...this.config, ...newConfig };
        
        // Apply background color immediately if changed
        if (newConfig.backgroundColor && this.svg) {
            this.svg.style('background-color', newConfig.backgroundColor);
        }
        
        // Re-render if data exists and significant changes were made
        const significantChanges = ['orientation', 'barPadding', 'showGrid', 'showXAxis', 'showYAxis', 'colorScheme'];
        const hasSignificantChange = significantChanges.some(key => newConfig.hasOwnProperty(key));
        
        if (hasSignificantChange && this.data) {
            console.log('🔄 Re-rendering bar chart due to significant config changes');
            this.render();
        }
    }

    getInitialConfig() {
        return BarChartConfig.getInitialConfig();
    }

    setCustomColors(colors) {
        console.log('🎨 Setting custom colors for bar chart:', colors);
        this.customColors = { ...this.customColors, ...colors };
        
        // Update existing bars if rendered
        if (this.chart && this.data) {
            this.chart.selectAll('.bar')
                .transition()
                .duration(300)
                .attr('fill', (d, i) => {
                    return this.customColors[d.category] || this.getBarColors()[i % this.getBarColors().length];
                });
        }
    }

    // Get bar colors (used by controls)
    getBarColors() {
        if (this.config.customColors && this.config.customColors.length > 0) {
            return this.config.customColors;
        }
        return BarChartConfig.getColorScheme(this.config.colorScheme);
    }
}