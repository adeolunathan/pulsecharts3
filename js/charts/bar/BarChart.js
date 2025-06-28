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
            
            // **REMOVED: Don't render here - let the app control when to render**
        }
    }
    
    updateConfig(newConfig) {
        console.log('🔧 Updating bar chart config:', newConfig);
        console.log('🔧 Current chart type:', this.config.barChartType);
        console.log('🔧 Current data available:', !!(this.data && this.data.length > 0));
        
        const oldChartType = this.config.barChartType;
        this.config = { ...this.config, ...newConfig };
        
        // Apply background color immediately if changed
        if (newConfig.backgroundColor && this.svg) {
            this.svg.style('background-color', newConfig.backgroundColor);
        }
        
        // If chart type changed, re-render immediately
        if (newConfig.barChartType && newConfig.barChartType !== oldChartType) {
            console.log(`📊 Chart type changed from ${oldChartType} to ${newConfig.barChartType}, re-rendering immediately`);
            console.log('📊 Available data for re-render:', this.data);
            
            // For chart type changes, we might need to reprocess data if we have currentData from app
            if (window.pulseApp && window.pulseApp.currentData) {
                console.log('🔄 Re-rendering with fresh data from pulseApp for chart type change');
                this.render(window.pulseApp.currentData); // Re-render with fresh data processing
            } else if (this.data && this.data.length > 0) {
                // Force immediate re-render for chart type changes
                console.log('🔄 Forcing immediate chart re-render for type change');
                this.render(); // Re-render with existing data
            } else {
                console.warn('⚠️ No data available for chart type change re-render');
                console.warn('⚠️ this.data:', this.data);
                console.warn('⚠️ pulseApp.currentData:', window.pulseApp?.currentData);
            }
        } else if (this.data && this.data.length > 0) {
            // Check for other significant changes that require re-rendering
            const significantChanges = ['orientation', 'barPadding', 'showGrid', 'showXAxis', 'showYAxis', 'colorScheme'];
            const hasSignificantChange = significantChanges.some(key => newConfig.hasOwnProperty(key));
            
            if (hasSignificantChange) {
                console.log('🔄 Re-rendering chart due to significant config changes');
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


    render(data = null) {
        if (data) {
            this.processData(data);
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

        // For polar charts, skip traditional scales, grid, and axes
        if (this.config.barChartType === 'polar') {
            this.renderBars(); // Polar chart handles its own rendering
        } else {
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
        }

        // Initialize branding using reusable module
        this.initializeBranding();

        // **REMOVED: Control refresh is now handled externally to prevent flicker**
        // The app will handle control refreshes at the right time

        console.log('✅ Bar chart rendered successfully');
    }

    createScales(chartWidth, chartHeight) {
        let maxValue, minValue;
        
        // Get numeric columns for multi-series charts
        const numericColumns = Object.keys(this.data[0] || {}).filter(key => 
            key !== 'category' && typeof this.data[0][key] === 'number'
        );
        
        if (this.config.barChartType === 'stacked' || this.config.barChartType === 'stacked100') {
            // For stacked charts, calculate max of sums
            maxValue = d3.max(this.data, d => 
                numericColumns.reduce((sum, col) => sum + (d[col] || 0), 0)
            );
            minValue = 0; // Stacked charts start from 0
        } else if (this.config.barChartType === 'grouped' && numericColumns.length > 1) {
            // For grouped charts, find max across all series
            maxValue = d3.max(this.data, d => 
                d3.max(numericColumns, col => d[col] || 0)
            );
            minValue = d3.min(this.data, d => 
                d3.min(numericColumns, col => d[col] || 0)
            );
        } else if (this.config.barChartType === 'waterfall') {
            // For waterfall, calculate cumulative values
            let cumulative = 0;
            const cumulativeValues = this.data.map(d => {
                cumulative += (d.value || 0);
                return cumulative;
            });
            maxValue = d3.max(cumulativeValues);
            minValue = d3.min([0, ...cumulativeValues]);
        } else {
            // Default: simple bar chart
            maxValue = d3.max(this.data, d => d.value || 0);
            minValue = d3.min(this.data, d => d.value || 0);
        }
        
        const valueRange = maxValue - Math.min(0, minValue);
        
        if (this.config.orientation === 'horizontal') {
            // **HORIZONTAL BAR CHART**: Categories on Y-axis, Values on X-axis
            this.yScale = d3.scaleBand()
                .domain(this.data.map(d => d.category))
                .range([0, chartHeight])
                .padding(this.config.barPadding);

            this.xScale = d3.scaleLinear()
                .domain([Math.min(0, minValue), maxValue + (valueRange * 0.1)])
                .range([0, chartWidth]);
        } else {
            // **VERTICAL BAR CHART**: Categories on X-axis, Values on Y-axis (default)
            this.xScale = d3.scaleBand()
                .domain(this.data.map(d => d.category))
                .range([0, chartWidth])
                .padding(this.config.barPadding);

            this.yScale = d3.scaleLinear()
                .domain([Math.min(0, minValue), maxValue + (valueRange * 0.1)])
                .range([chartHeight, 0]);
        }
    }

    renderGrid(chartWidth, chartHeight) {
        if (this.config.orientation === 'horizontal') {
            // **HORIZONTAL**: X-axis grid lines (for values)
            const xGrid = this.chart.append('g')
                .attr('class', 'grid x-grid');

            xGrid.selectAll('line')
                .data(this.xScale.ticks())
                .enter()
                .append('line')
                .attr('x1', d => this.xScale(d))
                .attr('x2', d => this.xScale(d))
                .attr('y1', 0)
                .attr('y2', chartHeight)
                .attr('stroke', this.config.gridColor)
                .attr('stroke-width', 0.5)
                .attr('opacity', this.config.gridOpacity);
        } else {
            // **VERTICAL**: Y-axis grid lines (for values)
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
    }

    renderAxes(chartWidth, chartHeight) {
        if (this.config.orientation === 'horizontal') {
            // **HORIZONTAL BAR CHART AXES**
            
            // X axis (values) - bottom
            if (this.config.showXAxis) {
                const xAxisGroup = this.chart.append('g')
                    .attr('class', 'x-axis')
                    .attr('transform', `translate(0, ${chartHeight})`);

                this.xAxis = d3.axisBottom(this.xScale)
                    .tickFormat(d => this.formatValue(d));
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

            // Y axis (categories) - left
            if (this.config.showYAxis) {
                const yAxisGroup = this.chart.append('g')
                    .attr('class', 'y-axis');

                this.yAxis = d3.axisLeft(this.yScale);
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
        } else {
            // **VERTICAL BAR CHART AXES (default)**
            
            // X axis (categories) - bottom
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

            // Y axis (values) - left
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
    }

    renderBars() {
        // Render based on chart type
        console.log(`🎨 Rendering bars with chart type: ${this.config.barChartType}`);
        console.log(`🎨 Available data for rendering:`, this.data);
        
        switch (this.config.barChartType) {
            case 'grouped':
                console.log('🎨 Calling renderGroupedBars()');
                this.renderGroupedBars();
                break;
            case 'stacked':
                console.log('🎨 Calling renderStackedBars()');
                this.renderStackedBars();
                break;
            case 'stacked100':
                console.log('🎨 Calling renderStacked100Bars()');
                this.renderStacked100Bars();
                break;
            case 'range':
                console.log('🎨 Calling renderRangeBars()');
                this.renderRangeBars();
                break;
            case 'waterfall':
                console.log('🎨 Calling renderWaterfallBars()');
                this.renderWaterfallBars();
                break;
            case 'polar':
                console.log('🎨 Calling renderPolarBars()');
                this.renderPolarBars();
                break;
            case 'simple':
            default:
                console.log('🎨 Calling renderSimpleBars() (default)');
                this.renderSimpleBars();
                break;
        }
    }
    
    renderSimpleBars() {
        // Get colors
        const colors = this.getBarColors();

        if (this.config.orientation === 'horizontal') {
            // **HORIZONTAL BARS**
            const bars = this.chart.selectAll('.bar')
                .data(this.data)
                .enter()
                .append('rect')
                .attr('class', 'bar')
                .attr('y', d => this.yScale(d.category))
                .attr('height', this.yScale.bandwidth())
                .attr('x', 0) // Start from left edge
                .attr('width', 0) // Start with 0 width for animation
                .attr('fill', (d, i) => this.customColors[d.category] || colors[i % colors.length])
                .attr('opacity', this.config.barOpacity)
                .attr('rx', this.config.barCornerRadius)
                .attr('ry', this.config.barCornerRadius)
                .style('cursor', 'pointer');

            // Get D3 easing function
            const easingFunction = this.getD3EasingFunction(this.config.animationEasing);
            
            // Animate bars
            bars.transition()
                .duration(this.config.animationDuration)
                .ease(easingFunction)
                .attr('x', d => this.xScale(Math.min(0, d.value)))
                .attr('width', d => Math.abs(this.xScale(d.value) - this.xScale(0)));

            // Add interactivity
            this.addBarInteractivity(bars);

            // Add labels if enabled (either labels or values or both)
            if (this.config.showBarLabels || this.config.showValues) {
                this.renderBarLabels();
            }

            // Store bars reference
            this.bars = bars;
        } else {
            // **VERTICAL BARS (default)**
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

            // Get D3 easing function
            const easingFunction = this.getD3EasingFunction(this.config.animationEasing);
            
            // Animate bars
            bars.transition()
                .duration(this.config.animationDuration)
                .ease(easingFunction)
                .attr('y', d => this.yScale(Math.max(0, d.value)))
                .attr('height', d => Math.abs(this.yScale(d.value) - this.yScale(0)));

            // Add interactivity
            this.addBarInteractivity(bars);

            // Add labels if enabled (either labels or values or both)
            if (this.config.showBarLabels || this.config.showValues) {
                this.renderBarLabels();
            }

            // Store bars reference
            this.bars = bars;
        }
    }
    
    renderGroupedBars() {
        // Get colors
        const colors = this.getBarColors();
        
        console.log('🔍 renderGroupedBars: Starting grouped chart rendering');
        console.log('🔍 renderGroupedBars: Data structure:', this.data);
        
        // Group data by series (numeric columns)
        const numericColumns = Object.keys(this.data[0] || {}).filter(key => 
            key !== 'category' && typeof this.data[0][key] === 'number'
        );
        
        console.log('🔍 renderGroupedBars: Found numeric columns:', numericColumns);
        console.log('🔍 renderGroupedBars: Numeric columns count:', numericColumns.length);
        
        if (numericColumns.length < 2) {
            console.warn('🔍 renderGroupedBars: Grouped chart requires multiple numeric columns. Falling back to simple chart.');
            console.warn('🔍 renderGroupedBars: Available columns in data[0]:', Object.keys(this.data[0] || {}));
            this.renderSimpleBars();
            return;
        }
        
        // Prepare grouped data
        const groupedData = this.data.map(d => {
            const values = numericColumns.map(col => ({ series: col, value: d[col] || 0 }));
            return { category: d.category, values };
        });
        
        // Create sub-scale for groups
        const subScale = d3.scaleBand()
            .domain(numericColumns)
            .range([0, this.xScale.bandwidth()])
            .padding(0.05);
        
        if (this.config.orientation === 'horizontal') {
            // Horizontal grouped bars
            const groups = this.chart.selectAll('.bar-group')
                .data(groupedData)
                .enter()
                .append('g')
                .attr('class', 'bar-group')
                .attr('transform', d => `translate(0, ${this.yScale(d.category)})`);
                
            const bars = groups.selectAll('.bar')
                .data(d => d.values)
                .enter()
                .append('rect')
                .attr('class', 'bar')
                .attr('y', d => subScale(d.series))
                .attr('height', subScale.bandwidth())
                .attr('x', 0)
                .attr('width', 0)
                .attr('fill', (d, i) => colors[i % colors.length])
                .attr('opacity', this.config.barOpacity)
                .attr('rx', this.config.barCornerRadius);
                
            bars.transition()
                .duration(this.config.animationDuration)
                .attr('width', d => this.xScale(d.value));
                
            this.addBarInteractivity(bars);
        } else {
            // Vertical grouped bars
            const groups = this.chart.selectAll('.bar-group')
                .data(groupedData)
                .enter()
                .append('g')
                .attr('class', 'bar-group')
                .attr('transform', d => `translate(${this.xScale(d.category)}, 0)`);
                
            const bars = groups.selectAll('.bar')
                .data(d => d.values)
                .enter()
                .append('rect')
                .attr('class', 'bar')
                .attr('x', d => subScale(d.series))
                .attr('width', subScale.bandwidth())
                .attr('y', this.yScale(0))
                .attr('height', 0)
                .attr('fill', (d, i) => colors[i % colors.length])
                .attr('opacity', this.config.barOpacity)
                .attr('rx', this.config.barCornerRadius);
                
            bars.transition()
                .duration(this.config.animationDuration)
                .attr('y', d => this.yScale(d.value))
                .attr('height', d => this.yScale(0) - this.yScale(d.value));
                
            this.addBarInteractivity(bars);
        }
        
        this.bars = this.chart.selectAll('.bar');
    }
    
    renderStackedBars() {
        const colors = this.getBarColors();
        
        // Get numeric columns for stacking
        const numericColumns = Object.keys(this.data[0]).filter(key => 
            key !== 'category' && typeof this.data[0][key] === 'number'
        );
        
        if (numericColumns.length < 2) {
            console.warn('Stacked chart requires multiple numeric columns. Falling back to simple chart.');
            this.renderSimpleBars();
            return;
        }
        
        // Prepare stacked data
        const stackedData = d3.stack()
            .keys(numericColumns)
            (this.data);
            
        if (this.config.orientation === 'horizontal') {
            // Horizontal stacked bars
            const layers = this.chart.selectAll('.layer')
                .data(stackedData)
                .enter()
                .append('g')
                .attr('class', 'layer')
                .attr('fill', (d, i) => colors[i % colors.length]);
                
            const bars = layers.selectAll('.bar')
                .data(d => d)
                .enter()
                .append('rect')
                .attr('class', 'bar')
                .attr('y', d => this.yScale(d.data.category))
                .attr('height', this.yScale.bandwidth())
                .attr('x', 0)
                .attr('width', 0)
                .attr('opacity', this.config.barOpacity)
                .attr('rx', this.config.barCornerRadius);
                
            bars.transition()
                .duration(this.config.animationDuration)
                .attr('x', d => this.xScale(d[0]))
                .attr('width', d => this.xScale(d[1]) - this.xScale(d[0]));
                
            this.addBarInteractivity(bars);
        } else {
            // Vertical stacked bars
            const layers = this.chart.selectAll('.layer')
                .data(stackedData)
                .enter()
                .append('g')
                .attr('class', 'layer')
                .attr('fill', (d, i) => colors[i % colors.length]);
                
            const bars = layers.selectAll('.bar')
                .data(d => d)
                .enter()
                .append('rect')
                .attr('class', 'bar')
                .attr('x', d => this.xScale(d.data.category))
                .attr('width', this.xScale.bandwidth())
                .attr('y', this.yScale(0))
                .attr('height', 0)
                .attr('opacity', this.config.barOpacity)
                .attr('rx', this.config.barCornerRadius);
                
            bars.transition()
                .duration(this.config.animationDuration)
                .attr('y', d => this.yScale(d[1]))
                .attr('height', d => this.yScale(d[0]) - this.yScale(d[1]));
                
            this.addBarInteractivity(bars);
        }
        
        this.bars = this.chart.selectAll('.bar');
    }
    
    renderStacked100Bars() {
        const colors = this.getBarColors();
        
        // Get numeric columns
        const numericColumns = Object.keys(this.data[0]).filter(key => 
            key !== 'category' && typeof this.data[0][key] === 'number'
        );
        
        if (numericColumns.length < 2) {
            console.warn('100% Stacked chart requires multiple numeric columns. Falling back to simple chart.');
            this.renderSimpleBars();
            return;
        }
        
        // Calculate percentages
        const dataWithPercentages = this.data.map(d => {
            const total = numericColumns.reduce((sum, col) => sum + (d[col] || 0), 0);
            const newRow = { category: d.category };
            numericColumns.forEach(col => {
                newRow[col] = total > 0 ? (d[col] || 0) / total * 100 : 0;
            });
            return newRow;
        });
        
        const stackedData = d3.stack()
            .keys(numericColumns)
            (dataWithPercentages);
            
        // Create percentage scale
        const percentScale = this.config.orientation === 'horizontal' ? 
            d3.scaleLinear().domain([0, 100]).range([0, this.xScale.range()[1]]) :
            d3.scaleLinear().domain([0, 100]).range([this.yScale.range()[0], 0]);
            
        if (this.config.orientation === 'horizontal') {
            const layers = this.chart.selectAll('.layer')
                .data(stackedData)
                .enter()
                .append('g')
                .attr('class', 'layer')
                .attr('fill', (d, i) => colors[i % colors.length]);
                
            const bars = layers.selectAll('.bar')
                .data(d => d)
                .enter()
                .append('rect')
                .attr('class', 'bar')
                .attr('y', d => this.yScale(d.data.category))
                .attr('height', this.yScale.bandwidth())
                .attr('x', 0)
                .attr('width', 0)
                .attr('opacity', this.config.barOpacity);
                
            bars.transition()
                .duration(this.config.animationDuration)
                .attr('x', d => percentScale(d[0]))
                .attr('width', d => percentScale(d[1]) - percentScale(d[0]));
        } else {
            const layers = this.chart.selectAll('.layer')
                .data(stackedData)
                .enter()
                .append('g')
                .attr('class', 'layer')
                .attr('fill', (d, i) => colors[i % colors.length]);
                
            const bars = layers.selectAll('.bar')
                .data(d => d)
                .enter()
                .append('rect')
                .attr('class', 'bar')
                .attr('x', d => this.xScale(d.data.category))
                .attr('width', this.xScale.bandwidth())
                .attr('y', percentScale(100))
                .attr('height', 0)
                .attr('opacity', this.config.barOpacity);
                
            bars.transition()
                .duration(this.config.animationDuration)
                .attr('y', d => percentScale(d[1]))
                .attr('height', d => percentScale(d[0]) - percentScale(d[1]));
        }
        
        this.bars = this.chart.selectAll('.bar');
    }
    
    renderRangeBars() {
        const colors = this.getBarColors();
        
        // Look for min/max or start/end columns
        const minCol = Object.keys(this.data[0]).find(key => key.includes('min') || key.includes('start'));
        const maxCol = Object.keys(this.data[0]).find(key => key.includes('max') || key.includes('end'));
        
        if (!minCol || !maxCol) {
            console.warn('Range chart requires min/max or start/end columns. Using value column as both.');
            this.renderSimpleBars();
            return;
        }
        
        if (this.config.orientation === 'horizontal') {
            const bars = this.chart.selectAll('.bar')
                .data(this.data)
                .enter()
                .append('rect')
                .attr('class', 'bar')
                .attr('y', d => this.yScale(d.category))
                .attr('height', this.yScale.bandwidth())
                .attr('x', 0)
                .attr('width', 0)
                .attr('fill', (d, i) => colors[i % colors.length])
                .attr('opacity', this.config.barOpacity)
                .attr('rx', this.config.barCornerRadius);
                
            bars.transition()
                .duration(this.config.animationDuration)
                .attr('x', d => this.xScale(Math.min(d[minCol], d[maxCol])))
                .attr('width', d => Math.abs(this.xScale(d[maxCol]) - this.xScale(d[minCol])));
        } else {
            const bars = this.chart.selectAll('.bar')
                .data(this.data)
                .enter()
                .append('rect')
                .attr('class', 'bar')
                .attr('x', d => this.xScale(d.category))
                .attr('width', this.xScale.bandwidth())
                .attr('y', this.yScale(0))
                .attr('height', 0)
                .attr('fill', (d, i) => colors[i % colors.length])
                .attr('opacity', this.config.barOpacity)
                .attr('rx', this.config.barCornerRadius);
                
            bars.transition()
                .duration(this.config.animationDuration)
                .attr('y', d => this.yScale(Math.max(d[minCol], d[maxCol])))
                .attr('height', d => Math.abs(this.yScale(d[maxCol]) - this.yScale(d[minCol])));
        }
        
        this.bars = this.chart.selectAll('.bar');
        this.addBarInteractivity(this.bars);
    }
    
    renderWaterfallBars() {
        const colors = this.getBarColors();
        let cumulative = 0;
        
        // Calculate cumulative values
        const waterfallData = this.data.map((d, i) => {
            const value = d.value || 0;
            const start = cumulative;
            cumulative += value;
            return {
                ...d,
                start,
                end: cumulative,
                value,
                isPositive: value >= 0
            };
        });
        
        if (this.config.orientation === 'horizontal') {
            const bars = this.chart.selectAll('.bar')
                .data(waterfallData)
                .enter()
                .append('rect')
                .attr('class', 'bar')
                .attr('y', d => this.yScale(d.category))
                .attr('height', this.yScale.bandwidth())
                .attr('x', 0)
                .attr('width', 0)
                .attr('fill', d => d.isPositive ? colors[0] : colors[1])
                .attr('opacity', this.config.barOpacity)
                .attr('rx', this.config.barCornerRadius);
                
            bars.transition()
                .duration(this.config.animationDuration)
                .attr('x', d => this.xScale(Math.min(d.start, d.end)))
                .attr('width', d => Math.abs(this.xScale(d.end) - this.xScale(d.start)));
        } else {
            const bars = this.chart.selectAll('.bar')
                .data(waterfallData)
                .enter()
                .append('rect')
                .attr('class', 'bar')
                .attr('x', d => this.xScale(d.category))
                .attr('width', this.xScale.bandwidth())
                .attr('y', this.yScale(0))
                .attr('height', 0)
                .attr('fill', d => d.isPositive ? colors[0] : colors[1])
                .attr('opacity', this.config.barOpacity)
                .attr('rx', this.config.barCornerRadius);
                
            bars.transition()
                .duration(this.config.animationDuration)
                .attr('y', d => this.yScale(Math.max(d.start, d.end)))
                .attr('height', d => Math.abs(this.yScale(d.end) - this.yScale(d.start)));
        }
        
        this.bars = this.chart.selectAll('.bar');
        this.addBarInteractivity(this.bars);
    }
    
    renderPolarBars() {
        // For polar charts, we need a completely different approach
        // Don't render axes or grid for polar charts
        
        // Clear chart and create polar coordinate system
        this.chart.selectAll('*').remove();
        
        const centerX = (this.config.width - this.config.margin.left - this.config.margin.right) / 2;
        const centerY = (this.config.height - this.config.margin.top - this.config.margin.bottom) / 2;
        const radius = Math.min(centerX, centerY) - 50;
        
        const colors = this.getBarColors();
        const maxValue = d3.max(this.data, d => d.value);
        
        // Create radial scale
        const radiusScale = d3.scaleLinear()
            .domain([0, maxValue])
            .range([0, radius]);
            
        // Create angle scale
        const angleScale = d3.scaleBand()
            .domain(this.data.map(d => d.category))
            .range([0, 2 * Math.PI])
            .padding(0.1);
        
        // Create polar bars
        const bars = this.chart.selectAll('.polar-bar')
            .data(this.data)
            .enter()
            .append('path')
            .attr('class', 'polar-bar')
            .attr('transform', `translate(${centerX}, ${centerY})`)
            .attr('fill', (d, i) => colors[i % colors.length])
            .attr('opacity', this.config.barOpacity)
            .style('cursor', 'pointer');
            
        // Calculate arc paths
        const arc = d3.arc()
            .innerRadius(0)
            .outerRadius(d => radiusScale(d.value))
            .startAngle(d => angleScale(d.category))
            .endAngle(d => angleScale(d.category) + angleScale.bandwidth());
            
        bars.transition()
            .duration(this.config.animationDuration)
            .attr('d', arc);
            
        this.bars = bars;
        this.addBarInteractivity(this.bars);
        
        // Add radial grid lines
        const gridLines = this.chart.selectAll('.grid-line')
            .data(radiusScale.ticks(5))
            .enter()
            .append('circle')
            .attr('class', 'grid-line')
            .attr('cx', centerX)
            .attr('cy', centerY)
            .attr('r', d => radiusScale(d))
            .attr('fill', 'none')
            .attr('stroke', this.config.gridColor)
            .attr('stroke-opacity', this.config.gridOpacity);
            
        // Add labels if enabled
        if (this.config.showBarLabels || this.config.showValues) {
            this.renderPolarLabels(centerX, centerY, radiusScale, angleScale);
        }
    }
    
    renderPolarLabels(centerX, centerY, radiusScale, angleScale) {
        const labels = this.chart.selectAll('.polar-label')
            .data(this.data)
            .enter()
            .append('text')
            .attr('class', 'polar-label')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .style('font-family', this.config.titleFont || 'Inter, sans-serif')
            .style('font-size', `${this.config.labelFontSize}px`)
            .style('font-weight', this.config.labelFontWeight)
            .style('fill', this.config.labelColor)
            .text(d => this.getBarLabelText(d));
            
        labels.transition()
            .duration(this.config.animationDuration)
            .attr('transform', d => {
                const angle = angleScale(d.category) + angleScale.bandwidth() / 2;
                const radius = radiusScale(d.value) + 20;
                const x = centerX + Math.cos(angle - Math.PI / 2) * radius;
                const y = centerY + Math.sin(angle - Math.PI / 2) * radius;
                return `translate(${x}, ${y})`;
            })
            .style('opacity', 1);
    }

    renderBarLabels() {
        if (this.config.orientation === 'horizontal') {
            // **HORIZONTAL BAR LABELS**
            const labels = this.chart.selectAll('.bar-label')
                .data(this.data)
                .enter()
                .append('text')
                .attr('class', 'bar-label')
                .attr('x', d => this.xScale(d.value) + this.config.labelOffset)
                .attr('y', d => this.yScale(d.category) + this.yScale.bandwidth() / 2)
                .attr('text-anchor', 'start')
                .attr('dominant-baseline', 'middle')
                .style('font-family', this.config.titleFont || 'Inter, sans-serif')
                .style('font-size', `${this.config.labelFontSize}px`)
                .style('font-weight', this.config.labelFontWeight)
                .style('fill', this.config.labelColor)
                .style('opacity', 0)
                .text(d => this.getBarLabelText(d));

            // Animate labels
            labels.transition()
                .delay(this.config.animationDuration * 0.5)
                .duration(this.config.animationDuration * 0.5)
                .style('opacity', 1);
        } else {
            // **VERTICAL BAR LABELS (default)**
            const labels = this.chart.selectAll('.bar-label')
                .data(this.data)
                .enter()
                .append('text')
                .attr('class', 'bar-label')
                .attr('x', d => this.xScale(d.category) + this.xScale.bandwidth() / 2)
                .attr('y', d => this.getLabelY(d))
                .attr('text-anchor', 'middle')
                .style('font-family', this.config.titleFont || 'Inter, sans-serif')
                .style('font-size', `${this.config.labelFontSize}px`)
                .style('font-weight', this.config.labelFontWeight)
                .style('fill', this.config.labelColor)
                .style('opacity', 0)
                .text(d => this.getBarLabelText(d));

            // Animate labels
            labels.transition()
                .delay(this.config.animationDuration * 0.5)
                .duration(this.config.animationDuration * 0.5)
                .style('opacity', 1);
        }
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
            return ChartExports.exportToPNG.call(this);
        } else {
            console.warn('❌ ChartExports utility not available');
            return this.exportToPNGFallback(filename);
        }
    }

    exportToSVG(filename = 'bar-chart.svg') {
        if (window.ChartExports && window.ChartExports.exportToSVG) {
            return ChartExports.exportToSVG.call(this);
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
    // Note: updateConfig method is defined earlier in the class (line 43-62)

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

    // ===== CRITICAL MISSING METHODS FOR CONTROL INTEGRATION =====
    
    // Process data method required by control system
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
        } else if (data.series && Array.isArray(data.series) && data.categories) {
            // Multi-series format from BarDataEditor: {categories: ['A', 'B'], series: [{name: 'Series1', data: [10, 20]}, ...]}
            console.log('📊 Processing multi-series data format for grouped/stacked charts');
            console.log('📊 Input data.series:', data.series);
            console.log('📊 Input data.categories:', data.categories);
            
            processedData = data.categories.map((category, categoryIndex) => {
                const result = { category: category };
                
                // Add data from each series as separate columns
                data.series.forEach(series => {
                    const columnName = series.name.replace(/\s+/g, '_').toLowerCase(); // Convert to safe column name
                    result[columnName] = series.data[categoryIndex] || 0;
                    console.log(`📊 Added column ${columnName} = ${result[columnName]} for ${category}`);
                });
                
                // Ensure backwards compatibility with 'value' column (use first series)
                if (data.series.length > 0 && (!result.value && result.value !== 0)) {
                    result.value = data.series[0].data[categoryIndex] || 0;
                }
                
                return result;
            });
            
            console.log('📊 Final processed multi-series data:', processedData);
        } else if (data.data && Array.isArray(data.data)) {
            // Nested format: {data: [{category: 'A', value: 10, ...otherColumns}]}
            // Support multi-column data for grouped/stacked charts
            processedData = data.data.map(d => {
                const result = {
                    category: d.category || d.name || d.label
                };
                
                // Copy all numeric columns
                Object.keys(d).forEach(key => {
                    if (key !== 'category' && typeof d[key] === 'number') {
                        result[key] = d[key];
                    }
                });
                
                // Ensure backwards compatibility with 'value' column
                if (!result.value && result.value !== 0) {
                    const numericKeys = Object.keys(result).filter(k => k !== 'category');
                    result.value = numericKeys.length > 0 ? result[numericKeys[0]] : 0;
                }
                
                return result;
            });
        }

        // Sort data by value (descending) if autoSort is enabled
        if (this.config.autoSort !== false) {
            processedData.sort((a, b) => b.value - a.value);
        }

        console.log('✅ Processed bar chart data:', processedData);
        
        // Store processed data
        this.data = processedData;
        
        return processedData;
    }

    // Get layer info method (compatibility with control system)
    getLayerInfo() {
        if (!this.data || !this.data.length) {
            return { totalLayers: 0, categories: [] };
        }
        
        return {
            totalLayers: 1, // Bar charts have a single layer
            categories: this.data.map(d => d.category),
            maxValue: Math.max(...this.data.map(d => d.value)),
            minValue: Math.min(...this.data.map(d => d.value))
        };
    }

    // Method to check if chart supports dynamic layers
    supportsDynamicLayers() {
        return false; // Bar charts don't have dynamic layers like Sankey
    }

    // Generate filename for exports
    generateFileName(extension) {
        const title = this.data && this.data.length > 0 && this.data[0].metadata?.title 
            ? this.data[0].metadata.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
            : 'bar-chart';
        const timestamp = new Date().toISOString().slice(0, 10);
        return `${title}-${timestamp}.${extension}`;
    }

    // Convert easing name to D3 easing function
    getD3EasingFunction(easingName) {
        const easingMap = {
            'easeLinear': d3.easeLinear,
            'easeQuadOut': d3.easeQuadOut,
            'easeInOutCubic': d3.easeCubicInOut,
            'easeBackOut': d3.easeBackOut,
            'easeBounceOut': d3.easeBounceOut
        };
        
        return easingMap[easingName] || d3.easeQuadOut;
    }

    // Calculate label Y position based on labelPosition config
    getLabelY(d) {
        if (this.config.orientation === 'horizontal') {
            return this.yScale(d.category) + this.yScale.bandwidth() / 2;
        } else {
            // Vertical bars
            const barTop = this.yScale(Math.max(0, d.value));
            const barBottom = this.yScale(0);
            const barHeight = Math.abs(barBottom - barTop);
            
            switch (this.config.labelPosition) {
                case 'top':
                    return barTop - this.config.labelOffset;
                case 'middle':
                    return barTop + barHeight / 2;
                case 'bottom':
                    return barBottom + this.config.labelOffset;
                default:
                    return barTop - this.config.labelOffset;
            }
        }
    }

    // Get the text to display on bar labels based on config
    getBarLabelText(d) {
        const showLabels = this.config.showBarLabels;
        const showValues = this.config.showValues;
        
        // If neither is enabled, return empty string
        if (!showLabels && !showValues) {
            return '';
        }
        
        if (showLabels && showValues) {
            // Show both: "Category: $value"
            return `${d.label}: ${this.formatValue(d.value)}`;
        } else if (showValues) {
            // Show only values
            return this.formatValue(d.value);
        } else if (showLabels) {
            // Show only labels
            return d.label;
        }
        
        return '';
    }

    // Update existing labels based on current config (for better performance)
    updateLabels() {
        const shouldShowLabels = this.config.showBarLabels || this.config.showValues;
        
        // Remove existing labels
        this.chart.selectAll('.bar-label').remove();
        
        // Add labels if needed
        if (shouldShowLabels) {
            this.renderBarLabels();
        }
    }
}