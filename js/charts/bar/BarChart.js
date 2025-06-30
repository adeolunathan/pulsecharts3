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
        this.originalData = null; // Store original data order for sort toggle
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
            console.log('📊 Checking data sources...');
            console.log('📊 window.pulseApp exists:', !!window.pulseApp);
            console.log('📊 window.pulseApp.currentData:', window.pulseApp?.currentData);
            console.log('📊 window.PulseDataBridge exists:', !!window.PulseDataBridge);
            console.log('📊 window.PulseDataBridge.getData():', window.PulseDataBridge?.getData());
            
            // For chart type changes, we MUST reprocess data from original source to get proper format
            let freshDataFound = false;
            
            // Try to get fresh data from various sources
            if (window.pulseApp && window.pulseApp.currentData) {
                console.log('🔄 Re-rendering with fresh data from pulseApp for chart type change');
                this.render(window.pulseApp.currentData);
                freshDataFound = true;
            } else if (window.PulseDataBridge && window.PulseDataBridge.getData()) {
                console.log('🔄 Re-rendering with fresh data from DataBridge for chart type change');
                this.render(window.PulseDataBridge.getData());
                freshDataFound = true;
            }
            
            // If no fresh data found, try to trigger data refresh from BarDataEditor
            if (!freshDataFound) {
                console.log('🔄 No fresh data source found, triggering BarDataEditor refresh...');
                
                // Always trigger the event - BarDataEditor will handle it if present
                window.dispatchEvent(new CustomEvent('chartTypeChanged', { 
                    detail: { newType: newConfig.barChartType, oldType: oldChartType } 
                }));
                
                // For immediate feedback, also re-render with existing data
                // The BarDataEditor will send fresh data shortly after
                if (this.data && this.data.length > 0) {
                    console.log('🔄 Using existing data for immediate chart type change feedback');
                    this.render(); // Re-render with existing data
                } else {
                    console.warn('⚠️ No data available for chart type change re-render');
                }
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

        // Apply auto sort if enabled (for when sort toggle is changed after initial load)
        if (this.config.autoSort === true) {
            console.log('📊 Auto-sorting data during render (autoSort enabled)');
            console.log('📊 Chart type:', this.config.barChartType);
            console.log('📊 Sort direction:', this.config.sortDirection);
            console.log('📊 BEFORE RENDER SORT:', this.data.map(d => ({ category: d.category, sortValue: this.getSortValue(d) })));
            
            const isDescending = this.config.sortDirection === 'descending';
            
            this.data.sort((a, b) => {
                const valueA = this.getSortValue(a);
                const valueB = this.getSortValue(b);
                return isDescending ? valueB - valueA : valueA - valueB;
            });
            
            console.log('📊 AFTER RENDER SORT:', this.data.map(d => ({ category: d.category, sortValue: this.getSortValue(d) })));
        } else if (this.config.autoSort === false && this.originalData) {
            // Restore original order when sort is disabled
            console.log('📊 Restoring original data order (autoSort disabled)');
            console.log('📊 Original data to restore:', this.originalData.map(d => ({ category: d.category, value: d.value })));
            this.data = [...this.originalData];
        }

        console.log('🎨 Rendering bar chart with', this.data.length, 'bars');

        // Clear existing content thoroughly
        this.chart.selectAll('*').remove();
        
        // Extra cleanup for specific elements that might persist
        this.chart.selectAll('.bar').remove();
        this.chart.selectAll('.bar-group').remove();
        this.chart.selectAll('.layer').remove();
        this.chart.selectAll('.bar-label').remove();
        this.chart.selectAll('.grouped-bar-label').remove();
        this.chart.selectAll('.stacked-bar-label').remove();
        this.chart.selectAll('.waterfall-bar-label').remove();
        this.chart.selectAll('.polar-label').remove();

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

        // Apply font family to all text elements
        this.applyFontFamilyToAllText();

        // **REMOVED: Control refresh is now handled externally to prevent flicker**
        // The app will handle control refreshes at the right time

        console.log('✅ Bar chart rendered successfully');
    }

    createScales(chartWidth, chartHeight) {
        let maxValue, minValue;
        
        // Get numeric columns for multi-series charts
        const numericColumns = this.getNumericColumns();
        
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
                cumulative += this.getPrimaryValue(d);
                return cumulative;
            });
            maxValue = d3.max(cumulativeValues);
            minValue = d3.min([0, ...cumulativeValues]);
        } else {
            // Default: simple bar chart
            maxValue = d3.max(this.data, d => this.getPrimaryValue(d));
            minValue = d3.min(this.data, d => this.getPrimaryValue(d));
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
        
        // Add axis stretching functionality if enabled
        if (this.config.enableAxisStretching) {
            this.addAxisStretchingBehavior();
        }
    }

    addAxisStretchingBehavior() {
        if (this.config.orientation === 'horizontal') {
            // For horizontal bars: X-axis has values (linear), Y-axis has categories (band)
            if (this.xScale.domain && typeof this.xScale.domain()[0] === 'number') {
                this.addLinearAxisStretching('x'); // Existing vertical dragging
            }
            if (this.yScale.bandwidth) {
                this.addBandAxisStretching('y'); // New horizontal dragging for categories
            }
        } else {
            // For vertical bars: Y-axis has values (linear), X-axis has categories (band)
            if (this.yScale.domain && typeof this.yScale.domain()[0] === 'number') {
                this.addLinearAxisStretching('y'); // Existing vertical dragging
            }
            if (this.xScale.bandwidth) {
                this.addBandAxisStretching('x'); // New horizontal dragging for categories
            }
        }
    }

    addLinearAxisStretching(axisType) {
        const scale = axisType === 'x' ? this.xScale : this.yScale;
        const axisGroup = this.chart.select(`.${axisType}-axis`);
        const isHorizontal = axisType === 'x';
        
        if (axisGroup.empty()) return; // No axis to add stretching to
        
        // Create drag zones at axis ends with visual indicators
        const dragZoneSize = 15;
        const range = scale.range();
        const axisLength = Math.abs(range[1] - range[0]);
        
        // Start drag zone (left/bottom end)
        const startZone = axisGroup.append('g')
            .attr('class', `${axisType}-axis-drag-start`)
            .style('cursor', isHorizontal ? 'ew-resize' : 'ns-resize');
            
        startZone.append('rect')
            .attr('width', isHorizontal ? dragZoneSize : axisLength)
            .attr('height', isHorizontal ? dragZoneSize : dragZoneSize)
            .attr('x', isHorizontal ? range[0] - dragZoneSize/2 : 0)
            .attr('y', isHorizontal ? -dragZoneSize/2 : range[0] - dragZoneSize/2)
            .style('fill', 'transparent')
            .style('stroke', 'transparent');
            
        // Visual indicator for start zone
        startZone.append('line')
            .attr('x1', isHorizontal ? range[0] : 0)
            .attr('y1', isHorizontal ? -5 : range[0])
            .attr('x2', isHorizontal ? range[0] : axisLength)
            .attr('y2', isHorizontal ? 5 : range[0])
            .style('stroke', '#666')
            .style('stroke-width', 2)
            .style('opacity', 0)
            .attr('class', 'drag-indicator');
        
        // End drag zone (right/top end)
        const endZone = axisGroup.append('g')
            .attr('class', `${axisType}-axis-drag-end`)
            .style('cursor', isHorizontal ? 'ew-resize' : 'ns-resize');
            
        endZone.append('rect')
            .attr('width', isHorizontal ? dragZoneSize : axisLength)
            .attr('height', isHorizontal ? dragZoneSize : dragZoneSize)
            .attr('x', isHorizontal ? range[1] - dragZoneSize/2 : 0)
            .attr('y', isHorizontal ? -dragZoneSize/2 : range[1] - dragZoneSize/2)
            .style('fill', 'transparent')
            .style('stroke', 'transparent');
            
        // Visual indicator for end zone
        endZone.append('line')
            .attr('x1', isHorizontal ? range[1] : 0)
            .attr('y1', isHorizontal ? -5 : range[1])
            .attr('x2', isHorizontal ? range[1] : axisLength)
            .attr('y2', isHorizontal ? 5 : range[1])
            .style('stroke', '#666')
            .style('stroke-width', 2)
            .style('opacity', 0)
            .attr('class', 'drag-indicator');
        
        // Add drag behavior
        const dragBehavior = d3.drag()
            .on('start', (event) => this.onAxisDragStart(event, axisType))
            .on('drag', (event) => this.onAxisDrag(event, axisType))
            .on('end', () => this.onAxisDragEnd(axisType));
        
        // Apply drag behavior and hover effects
        [startZone, endZone].forEach(zone => {
            zone.call(dragBehavior)
                .on('mouseenter', function() {
                    d3.select(this).select('.drag-indicator')
                        .transition().duration(200).style('opacity', 0.8);
                })
                .on('mouseleave', function() {
                    d3.select(this).select('.drag-indicator')
                        .transition().duration(200).style('opacity', 0);
                });
        });
    }

    onAxisDragStart(event, axisType) {
        const scale = axisType === 'x' ? this.xScale : this.yScale;
        this.dragState = {
            axisType,
            startDomain: [...scale.domain()],
            startPosition: axisType === 'x' ? event.x : event.y,
            dragZone: event.sourceEvent.target.closest('g').classList.contains(`${axisType}-axis-drag-start`) ? 'start' : 'end'
        };
        
        // Highlight the axis during drag
        this.chart.select(`.${axisType}-axis`)
            .style('opacity', 0.7);
    }

    onAxisDrag(event, axisType) {
        if (!this.dragState || this.dragState.axisType !== axisType) return;
        
        const scale = axisType === 'x' ? this.xScale : this.yScale;
        const currentPosition = axisType === 'x' ? event.x : event.y;
        const delta = (currentPosition - this.dragState.startPosition) * this.config.axisStretchingSensitivity;
        
        // Convert pixel delta to domain units
        const range = scale.range();
        const domain = this.dragState.startDomain;
        const domainSpan = domain[1] - domain[0];
        const rangeSpan = Math.abs(range[1] - range[0]);
        const domainDelta = (delta / rangeSpan) * domainSpan;
        
        // Update domain based on which end is being dragged
        let newDomain;
        if (this.dragState.dragZone === 'start') {
            newDomain = [domain[0] - domainDelta, domain[1]];
        } else {
            newDomain = [domain[0], domain[1] + domainDelta];
        }
        
        // Validate domain (prevent inverting)
        if (newDomain[1] <= newDomain[0]) return;
        
        // Update scale and re-render affected elements
        this.updateScaleDomain(axisType, newDomain);
    }

    onAxisDragEnd(axisType) {
        // Restore axis opacity
        this.chart.select(`.${axisType}-axis`)
            .style('opacity', 1);
            
        this.dragState = null;
        console.log(`🎯 Axis ${axisType} stretching completed`);
    }

    addBandAxisStretching(axisType) {
        const scale = axisType === 'x' ? this.xScale : this.yScale;
        const axisGroup = this.chart.select(`.${axisType}-axis`);
        const isHorizontal = axisType === 'x';
        
        if (axisGroup.empty()) return;
        
        // Create drag zones at axis ends for horizontal stretching
        const dragZoneSize = 20;
        const range = scale.range();
        
        // Start drag zone
        const startZone = axisGroup.append('g')
            .attr('class', `${axisType}-axis-band-drag-start`)
            .style('cursor', isHorizontal ? 'ew-resize' : 'ns-resize');
            
        startZone.append('rect')
            .attr('width', isHorizontal ? dragZoneSize : Math.abs(range[1] - range[0]))
            .attr('height', isHorizontal ? dragZoneSize : dragZoneSize)
            .attr('x', isHorizontal ? range[0] - dragZoneSize : 0)
            .attr('y', isHorizontal ? -dragZoneSize/2 : range[0] - dragZoneSize)
            .style('fill', 'transparent');
            
        // Visual indicator for start
        startZone.append('g')
            .attr('class', 'drag-indicator')
            .style('opacity', 0)
            .selectAll('line')
            .data([-3, 3])
            .enter()
            .append('line')
            .attr('x1', d => isHorizontal ? range[0] + d : d)
            .attr('y1', d => isHorizontal ? -8 : range[0] + d)
            .attr('x2', d => isHorizontal ? range[0] + d : Math.abs(range[1] - range[0]) + d)
            .attr('y2', d => isHorizontal ? 8 : range[0] + d)
            .style('stroke', '#4a90e2')
            .style('stroke-width', 2);
        
        // End drag zone
        const endZone = axisGroup.append('g')
            .attr('class', `${axisType}-axis-band-drag-end`)
            .style('cursor', isHorizontal ? 'ew-resize' : 'ns-resize');
            
        endZone.append('rect')
            .attr('width', isHorizontal ? dragZoneSize : Math.abs(range[1] - range[0]))
            .attr('height', isHorizontal ? dragZoneSize : dragZoneSize)
            .attr('x', isHorizontal ? range[1] - dragZoneSize : 0)
            .attr('y', isHorizontal ? -dragZoneSize/2 : range[1] - dragZoneSize)
            .style('fill', 'transparent');
            
        // Visual indicator for end
        endZone.append('g')
            .attr('class', 'drag-indicator')
            .style('opacity', 0)
            .selectAll('line')
            .data([-3, 3])
            .enter()
            .append('line')
            .attr('x1', d => isHorizontal ? range[1] + d : d)
            .attr('y1', d => isHorizontal ? -8 : range[1] + d)
            .attr('x2', d => isHorizontal ? range[1] + d : Math.abs(range[1] - range[0]) + d)
            .attr('y2', d => isHorizontal ? 8 : range[1] + d)
            .style('stroke', '#4a90e2')
            .style('stroke-width', 2);
        
        // Add drag behavior
        const dragBehavior = d3.drag()
            .on('start', (event) => this.onBandAxisDragStart(event, axisType))
            .on('drag', (event) => this.onBandAxisDrag(event, axisType))
            .on('end', () => this.onBandAxisDragEnd(axisType));
        
        // Apply behavior and hover effects
        [startZone, endZone].forEach(zone => {
            zone.call(dragBehavior)
                .on('mouseenter', function() {
                    d3.select(this).select('.drag-indicator')
                        .transition().duration(200).style('opacity', 0.8);
                })
                .on('mouseleave', function() {
                    d3.select(this).select('.drag-indicator')
                        .transition().duration(200).style('opacity', 0);
                });
        });
    }

    onBandAxisDragStart(event, axisType) {
        const scale = axisType === 'x' ? this.xScale : this.yScale;
        this.bandDragState = {
            axisType,
            startRange: [...scale.range()],
            startPosition: axisType === 'x' ? event.x : event.y,
            dragZone: event.sourceEvent.target.closest('g').classList.contains(`${axisType}-axis-band-drag-start`) ? 'start' : 'end'
        };
        
        this.chart.select(`.${axisType}-axis`).style('opacity', 0.7);
    }

    onBandAxisDrag(event, axisType) {
        if (!this.bandDragState || this.bandDragState.axisType !== axisType) return;
        
        const scale = axisType === 'x' ? this.xScale : this.yScale;
        const currentPosition = axisType === 'x' ? event.x : event.y;
        const delta = (currentPosition - this.bandDragState.startPosition) * (this.config.axisStretchingSensitivity || 1.0);
        
        let newRange;
        if (this.bandDragState.dragZone === 'start') {
            newRange = [this.bandDragState.startRange[0] - delta, this.bandDragState.startRange[1]];
        } else {
            newRange = [this.bandDragState.startRange[0], this.bandDragState.startRange[1] + delta];
        }
        
        // Prevent range from becoming too small
        if (Math.abs(newRange[1] - newRange[0]) < 50) return;
        
        this.updateBandScaleRange(axisType, newRange);
    }

    onBandAxisDragEnd(axisType) {
        this.chart.select(`.${axisType}-axis`).style('opacity', 1);
        this.bandDragState = null;
    }

    updateBandScaleRange(axisType, newRange) {
        const scale = axisType === 'x' ? this.xScale : this.yScale;
        const axis = axisType === 'x' ? this.xAxis : this.yAxis;
        
        // Update scale range
        scale.range(newRange);
        
        // Update axis
        const axisGroup = this.chart.select(`.${axisType}-axis`);
        axisGroup.transition().duration(100).call(axis);
        
        // Update bars
        this.updateBarsForBandScaleChange(axisType);
    }

    updateBarsForBandScaleChange(axisType) {
        const bars = this.chart.selectAll('.bar');
        
        if (axisType === 'x' && this.config.orientation === 'vertical') {
            // Update horizontal positioning for vertical bars
            bars.transition().duration(100)
                .attr('x', d => {
                    if (d.series) return this.xScale(d.category); // Grouped bars
                    return this.xScale(d.category);
                })
                .attr('width', d => {
                    if (d.series) return this.xScale.bandwidth(); // Grouped bars use sub-scale
                    return this.xScale.bandwidth();
                });
        } else if (axisType === 'y' && this.config.orientation === 'horizontal') {
            // Update vertical positioning for horizontal bars
            bars.transition().duration(100)
                .attr('y', d => {
                    if (d.series) return this.yScale(d.category);
                    return this.yScale(d.category);
                })
                .attr('height', d => {
                    if (d.series) return this.yScale.bandwidth();
                    return this.yScale.bandwidth();
                });
        }
        
        // Also update labels if they exist
        const labels = this.chart.selectAll('.bar-label, .grouped-bar-label, .stacked-bar-label');
        if (axisType === 'x' && this.config.orientation === 'vertical') {
            labels.transition().duration(100)
                .attr('x', d => {
                    if (d.series) return this.xScale(d.category) + this.xScale.bandwidth() / 2;
                    if (Array.isArray(d)) return this.xScale(d.data.category) + this.xScale.bandwidth() / 2;
                    return this.xScale(d.category) + this.xScale.bandwidth() / 2;
                });
        } else if (axisType === 'y' && this.config.orientation === 'horizontal') {
            labels.transition().duration(100)
                .attr('y', d => {
                    if (d.series) return this.yScale(d.category) + this.yScale.bandwidth() / 2;
                    if (Array.isArray(d)) return this.yScale(d.data.category) + this.yScale.bandwidth() / 2;
                    return this.yScale(d.category) + this.yScale.bandwidth() / 2;
                });
        }
    }

    // Efficient real-time bar spacing update method
    updateBarSpacing(newPadding) {
        console.log(`📊 Updating bar spacing to ${newPadding} (real-time)`);
        
        // Update the configuration
        this.config.barPadding = newPadding;
        
        // Update the appropriate band scale padding
        if (this.config.orientation === 'vertical') {
            this.xScale.padding(newPadding);
        } else {
            this.yScale.padding(newPadding);
        }
        
        // Update bars efficiently with proper handling for all chart types
        this.updateBarsForSpacingChange();
        
        // Reapply corner radius after repositioning to maintain consistency
        setTimeout(() => {
            if (this.config.barCornerRadius > 0) {
                this.applyCornerRadius();
            }
        }, 110); // Slightly after transition completes
        
        console.log(`✅ Bar spacing updated to ${newPadding} with smooth transition and corner radius consistency`);
    }

    // Enhanced bar update method for spacing changes
    updateBarsForSpacingChange() {
        const chartType = this.config.barChartType || 'simple';
        const bars = this.chart.selectAll('.bar');
        
        // Get consistent subgroup scales for grouped charts
        let subScaleX = null;
        let subScaleY = null;
        
        if (chartType === 'grouped') {
            // Create consistent subgroup scales based on available series
            const numericColumns = this.getNumericColumns();
            if (numericColumns.length > 1) {
                subScaleX = d3.scaleBand()
                    .domain(numericColumns)
                    .range([0, this.xScale.bandwidth()])
                    .padding(0.05);
                    
                subScaleY = d3.scaleBand()
                    .domain(numericColumns)
                    .range([0, this.yScale.bandwidth()])
                    .padding(0.05);
            }
        }
        
        if (this.config.orientation === 'vertical') {
            // Update horizontal positioning for vertical bars
            bars.transition().duration(100)
                .attr('x', d => {
                    if (chartType === 'grouped' && d.series && subScaleX) {
                        return this.xScale(d.category) + subScaleX(d.series);
                    } else if (chartType === 'stacked' && d.data) {
                        // Stacked bars stay centered on category
                        return this.xScale(d.data.category);
                    }
                    // Simple bars stay centered on category
                    return this.xScale(d.category);
                })
                .attr('width', d => {
                    if (chartType === 'grouped' && d.series && subScaleX) {
                        return subScaleX.bandwidth();
                    }
                    // Stacked and simple bars use full bandwidth
                    return this.xScale.bandwidth();
                });
        } else {
            // Update vertical positioning for horizontal bars
            bars.transition().duration(100)
                .attr('y', d => {
                    if (chartType === 'grouped' && d.series && subScaleY) {
                        return this.yScale(d.category) + subScaleY(d.series);
                    } else if (chartType === 'stacked' && d.data) {
                        // Stacked bars stay centered on category
                        return this.yScale(d.data.category);
                    }
                    // Simple bars stay centered on category
                    return this.yScale(d.category);
                })
                .attr('height', d => {
                    if (chartType === 'grouped' && d.series && subScaleY) {
                        return subScaleY.bandwidth();
                    }
                    // Stacked and simple bars use full bandwidth
                    return this.yScale.bandwidth();
                });
        }
        
        // Also update labels if they exist
        this.updateLabelsForSpacingChange(subScaleX, subScaleY);
    }

    // Update labels for spacing changes
    updateLabelsForSpacingChange(subScaleX = null, subScaleY = null) {
        const chartType = this.config.barChartType || 'simple';
        const labels = this.chart.selectAll('.bar-label, .grouped-bar-label, .stacked-bar-label');
        
        if (this.config.orientation === 'vertical') {
            labels.transition().duration(100)
                .attr('x', d => {
                    if (chartType === 'grouped' && d.series && subScaleX) {
                        return this.xScale(d.category) + subScaleX(d.series) + subScaleX.bandwidth() / 2;
                    } else if (chartType === 'stacked' && d.data) {
                        // Stacked labels centered on category
                        return this.xScale(d.data.category) + this.xScale.bandwidth() / 2;
                    }
                    // Simple chart labels centered on category
                    return this.xScale(d.category) + this.xScale.bandwidth() / 2;
                });
        } else {
            labels.transition().duration(100)
                .attr('y', d => {
                    if (chartType === 'grouped' && d.series && subScaleY) {
                        return this.yScale(d.category) + subScaleY(d.series) + subScaleY.bandwidth() / 2;
                    } else if (chartType === 'stacked' && d.data) {
                        // Stacked labels centered on category
                        return this.yScale(d.data.category) + this.yScale.bandwidth() / 2;
                    }
                    // Simple chart labels centered on category
                    return this.yScale(d.category) + this.yScale.bandwidth() / 2;
                });
        }
    }

    updateScaleDomain(axisType, newDomain) {
        const scale = axisType === 'x' ? this.xScale : this.yScale;
        const axis = axisType === 'x' ? this.xAxis : this.yAxis;
        
        // Update scale domain
        scale.domain(newDomain);
        
        // Update axis with smooth transition
        const axisGroup = this.chart.select(`.${axisType}-axis`);
        axisGroup.transition().duration(100).call(axis);
        
        // Update bars and other elements that depend on this scale
        this.updateBarsForScaleChange(axisType);
        
        // Update grid if enabled
        if (this.config.showGrid) {
            this.updateGridForScaleChange(axisType);
        }
    }

    updateBarsForScaleChange(axisType) {
        // Re-position and resize bars based on new scale
        const bars = this.chart.selectAll('.bar');
        
        if (axisType === 'x') {
            if (this.config.orientation === 'horizontal') {
                // Update bar positions and widths for horizontal bars
                bars.transition().duration(100)
                    .attr('x', d => this.xScale(Math.min(0, this.getPrimaryValue(d))))
                    .attr('width', d => Math.abs(this.xScale(this.getPrimaryValue(d)) - this.xScale(0)));
            } else {
                // Update bar positions for vertical bars (categories)
                bars.transition().duration(100)
                    .attr('x', d => this.xScale(d.category))
                    .attr('width', this.xScale.bandwidth());
            }
        } else { // yAxis
            if (this.config.orientation === 'horizontal') {
                // Update bar positions for horizontal bars (categories)
                bars.transition().duration(100)
                    .attr('y', d => this.yScale(d.category))
                    .attr('height', this.yScale.bandwidth());
            } else {
                // Update bar positions and heights for vertical bars
                bars.transition().duration(100)
                    .attr('y', d => this.yScale(Math.max(0, this.getPrimaryValue(d))))
                    .attr('height', d => Math.abs(this.yScale(this.getPrimaryValue(d)) - this.yScale(0)));
            }
        }
        
        // Also update labels if they exist
        this.updateLabelsForScaleChange(axisType);
    }

    updateLabelsForScaleChange(axisType) {
        // Update bar labels based on new scale
        const labels = this.chart.selectAll('.bar-label, .grouped-bar-label, .stacked-bar-label');
        
        if (axisType === 'x') {
            if (this.config.orientation === 'horizontal') {
                // Update label x positions for horizontal bars
                labels.transition().duration(100)
                    .attr('x', d => {
                        if (d.series) { // Grouped
                            return this.getGroupedBarLabelXPosition(d, 'horizontal').x;
                        } else if (Array.isArray(d)) { // Stacked
                            return this.getStackedBarLabelXPosition(d, 'horizontal').x;
                        } else { // Simple
                            return this.getLabelX(d);
                        }
                    });
            }
        } else { // yAxis
            if (this.config.orientation === 'vertical') {
                // Update label y positions for vertical bars
                labels.transition().duration(100)
                    .attr('y', d => {
                        if (d.series) { // Grouped
                            return this.getGroupedBarLabelYPosition(d, 'vertical').y;
                        } else if (Array.isArray(d)) { // Stacked
                            return this.getStackedBarLabelYPosition(d, 'vertical').y;
                        } else { // Simple
                            return this.yScale(Math.max(0, this.getPrimaryValue(d))) - this.config.labelOffset;
                        }
                    });
            }
        }
    }

    updateGridForScaleChange(axisType) {
        // Update grid lines based on new scale
        const gridGroup = this.chart.select('.grid');
        if (gridGroup.empty()) return;
        
        if (axisType === 'x') {
            const xGrid = d3.axisBottom(this.xScale)
                .tickSize(-this.chart.attr('height') || 400)
                .tickFormat('');
            gridGroup.select('.grid-x').transition().duration(100).call(xGrid);
        } else {
            const yGrid = d3.axisLeft(this.yScale)
                .tickSize(-this.chart.attr('width') || 600)
                .tickFormat('');
            gridGroup.select('.grid-y').transition().duration(100).call(yGrid);
        }
    }

    renderBars() {
        // Intelligent chart type detection based on available data
        const numericColumns = this.getNumericColumns();
        let effectiveChartType = this.config.barChartType;
        
        // Auto-fallback logic for chart types that require multiple columns
        if (['grouped', 'stacked', 'stacked100'].includes(this.config.barChartType) && numericColumns.length < 2) {
            console.log(`🎨 Chart type '${this.config.barChartType}' requires multiple numeric columns, but only ${numericColumns.length} found. Falling back to 'simple'.`);
            effectiveChartType = 'simple';
        }
        
        console.log(`🎨 Rendering bars with chart type: ${effectiveChartType} (original: ${this.config.barChartType})`);
        console.log(`🎨 Available data for rendering:`, this.data);
        console.log(`🎨 Numeric columns available: ${numericColumns.length}`);
        
        switch (effectiveChartType) {
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
                .attr('fill', (d, i) => {
                    if (this.config.useColorScheme) {
                        return this.customColors[d.category] || colors[i % colors.length];
                    } else {
                        return this.config.defaultBarColor || colors[0];
                    }
                })
                .attr('opacity', this.config.barOpacity)
                .attr('rx', 0)
                .attr('ry', 0)
                .style('cursor', 'pointer');

            // Get D3 easing function
            const easingFunction = this.getD3EasingFunction(this.config.animationEasing);
            
            // Animate bars
            bars.transition()
                .duration(this.config.animationDuration)
                .ease(easingFunction)
                .attr('x', d => this.xScale(Math.min(0, this.getPrimaryValue(d))))
                .attr('width', d => Math.abs(this.xScale(this.getPrimaryValue(d)) - this.xScale(0)))
                .on('end', () => {
                    // Apply corner radius after animation completes
                    this.applyCornerRadius();
                });

            // Apply corner radius immediately (before animation starts)
            setTimeout(() => this.applyCornerRadius(), 0);

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
                .attr('fill', (d, i) => {
                    if (this.config.useColorScheme) {
                        return this.customColors[d.category] || colors[i % colors.length];
                    } else {
                        return this.config.defaultBarColor || colors[0];
                    }
                })
                .attr('opacity', this.config.barOpacity)
                .attr('rx', 0)
                .attr('ry', 0)
                .style('cursor', 'pointer');

            // Get D3 easing function
            const easingFunction = this.getD3EasingFunction(this.config.animationEasing);
            
            // Animate bars
            bars.transition()
                .duration(this.config.animationDuration)
                .ease(easingFunction)
                .attr('y', d => this.yScale(Math.max(0, this.getPrimaryValue(d))))
                .attr('height', d => Math.abs(this.yScale(this.getPrimaryValue(d)) - this.yScale(0)))
                .on('end', () => {
                    // Apply corner radius after animation completes
                    this.applyCornerRadius();
                });

            // Apply corner radius immediately (before animation starts)
            setTimeout(() => this.applyCornerRadius(), 0);

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
        const numericColumns = this.getNumericColumns();
        
        console.log('🔍 renderGroupedBars: Found numeric columns:', numericColumns);
        console.log('🔍 renderGroupedBars: Numeric columns count:', numericColumns.length);
        console.log('🔍 renderGroupedBars: DETAILED - All data keys:', this.data.map(row => Object.keys(row)));
        console.log('🔍 renderGroupedBars: DETAILED - First row values:', this.data[0]);
        console.log('🔍 renderGroupedBars: DETAILED - All rows:', this.data);
        
        if (numericColumns.length < 2) {
            console.warn('🔍 renderGroupedBars: Grouped chart requires multiple numeric columns. Falling back to simple chart.');
            console.warn('🔍 renderGroupedBars: Available columns in data[0]:', Object.keys(this.data[0] || {}));
            console.warn('🔍 renderGroupedBars: Note: This should have been caught by intelligent chart type detection.');
            this.renderSimpleBars();
            return;
        }
        
        // Prepare grouped data
        const groupedData = this.data.map(d => {
            const values = numericColumns.map(col => ({ 
                series: col, 
                value: d[col] || 0, 
                category: d.category,
                label: d.label || d.category 
            }));
            console.log(`🔧 GROUPED DATA - Category: ${d.category}, Values count: ${values.length}`, values);
            return { category: d.category, values };
        });
        
        console.log('🔧 FINAL GROUPED DATA:', groupedData);
        console.log('🔧 EXPECTED BARS PER CATEGORY:', numericColumns.length);
        console.log('🔧 ACTUAL BARS PER CATEGORY:', groupedData[0]?.values?.length || 0);
        
        // Create sub-scale for groups
        // For horizontal: categories are on Y-axis (band scale), values on X-axis (linear scale)
        // For vertical: categories are on X-axis (band scale), values on Y-axis (linear scale)
        const categoryScale = this.config.orientation === 'horizontal' ? this.yScale : this.xScale;
        const subScale = d3.scaleBand()
            .domain(numericColumns)
            .range([0, categoryScale.bandwidth()])
            .padding(0.05);
        
        if (this.config.orientation === 'horizontal') {
            // Horizontal grouped bars - use proper data join pattern
            const groupSelection = this.chart.selectAll('.bar-group')
                .data(groupedData);
            
            // Remove old groups
            groupSelection.exit().remove();
            
            // Add new groups
            const groups = groupSelection.enter()
                .append('g')
                .attr('class', 'bar-group');
            
            // Update all groups (new + existing)
            const allGroups = groups.merge(groupSelection)
                .attr('transform', d => `translate(0, ${this.yScale(d.category)})`);
                
            // Create bars within each group
            const self = this; // Store reference to chart instance
            allGroups.each(function(groupData) {
                const group = d3.select(this);
                
                console.log(`🔧 HORIZONTAL BAR CREATION - Category: ${groupData.category}, Values:`, groupData.values);
                console.log(`🔧 HORIZONTAL BAR CREATION - About to create ${groupData.values.length} bars for ${groupData.category}`);
                
                const barSelection = group.selectAll('.bar')
                    .data(groupData.values);
                
                console.log(`🔧 HORIZONTAL BAR SELECTION - Data count: ${groupData.values.length}, Existing bars: ${barSelection.size()}`);
                
                // Remove old bars
                barSelection.exit().remove();
                
                // Add new bars
                const newBars = barSelection.enter()
                    .append('rect')
                    .attr('class', 'bar')
                    .attr('x', 0)
                    .attr('width', 0);
                
                // Update all bars (new + existing)
                const allBars = newBars.merge(barSelection)
                    .attr('y', d => subScale(d.series))
                    .attr('height', subScale.bandwidth())
                    .attr('fill', (d, i) => colors[i % colors.length])
                    .attr('opacity', self.config.barOpacity)
                    .attr('rx', 0);
                    
                allBars.transition()
                    .duration(self.config.animationDuration)
                    .attr('width', d => self.xScale(d.value || 0));
            });
            
            // Add interactivity to grouped bars only (avoid duplicate bar selection)
            const groupedBars = allGroups.selectAll('.bar');
            this.addBarInteractivity(groupedBars);
            this.bars = groupedBars; // Store bars reference
        } else {
            // Vertical grouped bars - use proper data join pattern
            const groupSelection = this.chart.selectAll('.bar-group')
                .data(groupedData);
            
            // Remove old groups
            groupSelection.exit().remove();
            
            // Add new groups
            const groups = groupSelection.enter()
                .append('g')
                .attr('class', 'bar-group');
            
            // Update all groups (new + existing)
            const allGroups = groups.merge(groupSelection)
                .attr('transform', d => `translate(${this.xScale(d.category)}, 0)`);
                
            // Create bars within each group
            const self = this; // Store reference to chart instance
            allGroups.each(function(groupData) {
                const group = d3.select(this);
                
                const barSelection = group.selectAll('.bar')
                    .data(groupData.values);
                
                // Remove old bars
                barSelection.exit().remove();
                
                // Add new bars
                const newBars = barSelection.enter()
                    .append('rect')
                    .attr('class', 'bar')
                    .attr('y', self.yScale(0))
                    .attr('height', 0);
                
                // Update all bars (new + existing)
                const allBars = newBars.merge(barSelection)
                    .attr('x', d => subScale(d.series))
                    .attr('width', subScale.bandwidth())
                    .attr('fill', (d, i) => colors[i % colors.length])
                    .attr('opacity', self.config.barOpacity)
                    .attr('rx', 0);
                    
                allBars.transition()
                    .duration(self.config.animationDuration)
                    .attr('y', d => self.yScale(d.value || 0))
                    .attr('height', d => self.yScale(0) - self.yScale(d.value || 0));
            });
            
            // Add interactivity to grouped bars only (avoid duplicate bar selection)
            const groupedBars = allGroups.selectAll('.bar');
            this.addBarInteractivity(groupedBars);
            this.bars = groupedBars; // Store bars reference
        }
        
        // Apply corner radius after rendering grouped bars
        setTimeout(() => this.applyCornerRadius(), 0);
        
        // Render labels for grouped bars
        if (this.config.showBarLabels || this.config.showValues) {
            this.renderGroupedBarLabels();
        }
    }
    
    renderStackedBars() {
        const colors = this.getBarColors();
        
        // Get numeric columns for stacking
        const numericColumns = this.getNumericColumns();
        
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
            // Horizontal stacked bars - use proper data join pattern
            const layerSelection = this.chart.selectAll('.layer')
                .data(stackedData);
            
            // Remove old layers
            layerSelection.exit().remove();
            
            // Add new layers
            const newLayers = layerSelection.enter()
                .append('g')
                .attr('class', 'layer');
            
            // Update all layers (new + existing)
            const allLayers = newLayers.merge(layerSelection)
                .attr('fill', (d, i) => colors[i % colors.length]);
                
            // Create bars within each layer
            const self = this; // Store reference to chart instance
            allLayers.each(function(layerData) {
                const layer = d3.select(this);
                
                const barSelection = layer.selectAll('.bar')
                    .data(layerData);
                
                // Remove old bars
                barSelection.exit().remove();
                
                // Add new bars
                const newBars = barSelection.enter()
                    .append('rect')
                    .attr('class', 'bar')
                    .attr('x', 0)
                    .attr('width', 0);
                
                // Update all bars (new + existing)
                const allBars = newBars.merge(barSelection)
                    .attr('y', d => self.yScale(d.data.category))
                    .attr('height', self.yScale.bandwidth())
                    .attr('opacity', self.config.barOpacity)
                    .attr('rx', 0);
                    
                allBars.transition()
                    .duration(self.config.animationDuration)
                    .attr('x', d => self.xScale(d[0]))
                    .attr('width', d => self.xScale(d[1]) - self.xScale(d[0]));
            });
            
            // Add interactivity to stacked bars only (avoid duplicate bar selection)
            const stackedBars = allLayers.selectAll('.bar');
            this.addBarInteractivity(stackedBars);
            this.bars = stackedBars; // Store bars reference
        } else {
            // Vertical stacked bars - use proper data join pattern
            const layerSelection = this.chart.selectAll('.layer')
                .data(stackedData);
            
            // Remove old layers
            layerSelection.exit().remove();
            
            // Add new layers
            const newLayers = layerSelection.enter()
                .append('g')
                .attr('class', 'layer');
            
            // Update all layers (new + existing)
            const allLayers = newLayers.merge(layerSelection)
                .attr('fill', (d, i) => colors[i % colors.length]);
                
            // Create bars within each layer
            const self = this; // Store reference to chart instance
            allLayers.each(function(layerData) {
                const layer = d3.select(this);
                
                const barSelection = layer.selectAll('.bar')
                    .data(layerData);
                
                // Remove old bars
                barSelection.exit().remove();
                
                // Add new bars
                const newBars = barSelection.enter()
                    .append('rect')
                    .attr('class', 'bar')
                    .attr('y', self.yScale(0))
                    .attr('height', 0);
                
                // Update all bars (new + existing)
                const allBars = newBars.merge(barSelection)
                    .attr('x', d => self.xScale(d.data.category))
                    .attr('width', self.xScale.bandwidth())
                    .attr('opacity', self.config.barOpacity)
                    .attr('rx', 0);
                    
                allBars.transition()
                    .duration(self.config.animationDuration)
                    .attr('y', d => self.yScale(d[1]))
                    .attr('height', d => self.yScale(d[0]) - self.yScale(d[1]));
            });
            
            // Add interactivity to stacked bars only (avoid duplicate bar selection)
            const stackedBars = allLayers.selectAll('.bar');
            this.addBarInteractivity(stackedBars);
            this.bars = stackedBars; // Store bars reference
        }
        
        // Apply corner radius after rendering stacked bars
        setTimeout(() => this.applyCornerRadius(), 0);
        
        // Render labels for stacked bars
        if (this.config.showBarLabels || this.config.showValues) {
            this.renderStackedBarLabels();
        }
    }
    
    renderStacked100Bars() {
        const colors = this.getBarColors();
        
        // Get numeric columns
        const numericColumns = this.getNumericColumns();
        
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
                
            this.addBarInteractivity(bars);
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
                
            this.addBarInteractivity(bars);
        }
        
        this.bars = this.chart.selectAll('.bar');
        
        // Apply corner radius after rendering stacked100 bars
        setTimeout(() => this.applyCornerRadius(), 0);
        
        // Render labels for stacked100 bars
        if (this.config.showBarLabels || this.config.showValues) {
            this.renderStackedBarLabels(); // Same as stacked but with percentage values
        }
    }
    
    renderRangeBars() {
        const colors = this.getBarColors();
        
        // Look for min/max or start/end columns first
        let minCol = Object.keys(this.data[0]).find(key => key.includes('min') || key.includes('start'));
        let maxCol = Object.keys(this.data[0]).find(key => key.includes('max') || key.includes('end'));
        
        // If no dedicated min/max columns, use first two numeric columns
        if (!minCol || !maxCol) {
            const numericColumns = this.getNumericColumns();
            
            if (numericColumns.length >= 2) {
                minCol = numericColumns[0];
                maxCol = numericColumns[1];
                console.log(`📊 Range chart using ${minCol} as min and ${maxCol} as max`);
            } else {
                console.warn('Range chart requires at least 2 numeric columns. Falling back to simple chart.');
                this.renderSimpleBars();
                return;
            }
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
                .attr('rx', 0);
                
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
                .attr('rx', 0);
                
            bars.transition()
                .duration(this.config.animationDuration)
                .attr('y', d => this.yScale(Math.max(d[minCol], d[maxCol])))
                .attr('height', d => Math.abs(this.yScale(d[maxCol]) - this.yScale(d[minCol])));
        }
        
        this.bars = this.chart.selectAll('.bar');
        this.addBarInteractivity(this.bars);
        
        // Apply corner radius after rendering range bars
        setTimeout(() => this.applyCornerRadius(), 0);
    }
    
    renderWaterfallBars() {
        const colors = this.getBarColors();
        let cumulative = 0;
        
        // Calculate cumulative values
        const waterfallData = this.data.map((d, i) => {
            const value = this.getPrimaryValue(d);
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
                .attr('rx', 0);
                
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
                .attr('rx', 0);
                
            bars.transition()
                .duration(this.config.animationDuration)
                .attr('y', d => this.yScale(Math.max(d.start, d.end)))
                .attr('height', d => Math.abs(this.yScale(d.end) - this.yScale(d.start)));
        }
        
        this.bars = this.chart.selectAll('.bar');
        this.addBarInteractivity(this.bars);
        
        // Apply corner radius after rendering waterfall bars
        setTimeout(() => this.applyCornerRadius(), 0);
        
        // Render labels for waterfall bars
        if (this.config.showBarLabels || this.config.showValues) {
            this.renderWaterfallBarLabels();
        }
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
        const maxValue = d3.max(this.data, d => this.getPrimaryValue(d));
        
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
            .outerRadius(d => radiusScale(this.getPrimaryValue(d)))
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
        // Clear existing polar labels first to prevent duplication
        this.chart.selectAll('.polar-label').remove();
        
        // Use proper D3 data join pattern
        const labelSelection = this.chart.selectAll('.polar-label')
            .data(this.data);
        
        // Remove old labels
        labelSelection.exit().remove();
        
        // Add new labels
        const newLabels = labelSelection.enter()
            .append('text')
            .attr('class', 'polar-label')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .style('font-family', this.config.titleFont || 'Inter, sans-serif')
            .style('font-size', `${this.config.labelFontSize}px`)
            .style('font-weight', this.config.labelFontWeight || '400')
            .style('fill', this.config.labelColor)
            .style('opacity', 0)
            .text(d => this.getBarLabelText(d));
        
        // Merge and update all labels (new + existing)
        const allLabels = newLabels.merge(labelSelection);
        
        // Animate to final position
        allLabels.transition()
            .duration(this.config.animationDuration)
            .attr('transform', d => {
                const angle = angleScale(d.category) + angleScale.bandwidth() / 2;
                const radius = radiusScale(this.getPrimaryValue(d)) + 20;
                const x = centerX + Math.cos(angle - Math.PI / 2) * radius;
                const y = centerY + Math.sin(angle - Math.PI / 2) * radius;
                return `translate(${x}, ${y})`;
            })
            .style('opacity', this.config.showBarLabels || this.config.showValues ? 1 : 0);
    }

    renderBarLabels() {
        if (this.config.orientation === 'horizontal') {
            // **HORIZONTAL BAR LABELS**
            const labels = this.chart.selectAll('.bar-label')
                .data(this.data)
                .enter()
                .append('text')
                .attr('class', 'bar-label')
                .attr('x', d => this.getLabelX(d))
                .attr('y', d => this.yScale(d.category) + this.yScale.bandwidth() / 2)
                .attr('text-anchor', this.getLabelTextAnchor())
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
                .attr('dominant-baseline', 
                    this.config.labelPosition === 'inside_center' || this.config.labelPosition === 'middle' ? 'middle' : 
                    this.config.labelPosition === 'outside_start' || this.config.labelPosition === 'bottom' ? 'hanging' : 'auto')
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
                    // Reset bar appearance - handle different data structures
                    const colors = this.getBarColors();
                    let originalColor;
                    
                    if (d.series) {
                        // Grouped chart: d = { series: columnName, value: number, category: string }
                        const seriesIndex = this.getNumericColumns().indexOf(d.series);
                        originalColor = this.customColors[d.category] || colors[seriesIndex % colors.length];
                    } else if (Array.isArray(d) && d.data) {
                        // Stacked chart: d = [start, end, { category, ... }]
                        const categoryIndex = this.data.findIndex(item => item.category === d.data.category);
                        originalColor = this.customColors[d.data.category] || colors[categoryIndex % colors.length];
                    } else {
                        // Simple chart: d = { category, value, label }
                        const categoryIndex = this.data.findIndex(item => item.category === d.category);
                        
                        // **ENHANCED: Always check custom colors first**
                        // **FIXED: Check custom colors first, regardless of color scheme setting**
                        if (this.customColors && this.customColors[d.category]) {
                            originalColor = this.customColors[d.category];
                        } else if (this.config.useColorScheme) {
                            originalColor = colors[categoryIndex % colors.length];
                        } else {
                            originalColor = this.config.defaultBarColor || colors[0];
                        }
                    }
                    
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
        
        // Handle different data structures for different chart types
        let label, value, formattedValue;
        
        if (data.series) {
            // Grouped chart data: { series: columnName, value: number, category: string }
            const seriesLabel = data.series.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const categoryLabel = data.category || data.label || 'Unknown';
            label = `${categoryLabel} - ${seriesLabel}`;
            value = data.value;
            formattedValue = this.formatValue(value);
        } else if (Array.isArray(data) && data.data) {
            // Stacked chart data (d3.stack format): [start, end, { category, ...}]
            label = data.data.category;
            value = data[1] - data[0]; // Stack segment value
            formattedValue = this.formatValue(value);
        } else {
            // Simple chart data: { category, value, label }
            label = data.label || data.category || 'Unknown';
            value = data.value || 0;
            formattedValue = this.formatValue(value);
        }
        
        tooltip.html(`
            <strong>${label}</strong><br>
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
        // Handle undefined, null, or non-numeric values
        if (value == null || isNaN(value) || !isFinite(value)) {
            return '0';
        }
        
        // Ensure value is a number
        const numValue = Number(value);
        
        switch (this.config.valueFormat) {
            case 'currency':
                return this.config.currencySymbol + numValue.toLocaleString(undefined, {
                    minimumFractionDigits: this.config.decimalPlaces,
                    maximumFractionDigits: this.config.decimalPlaces
                });
            case 'percentage':
                return (numValue * 100).toFixed(this.config.decimalPlaces) + '%';
            default:
                return numValue.toLocaleString(undefined, {
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
                Value: this.getPrimaryValue(d),
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

    // Apply font family to all text elements in the chart
    applyFontFamilyToAllText() {
        const fontFamily = this.getFontFamily();
        
        // Apply to chart title
        this.svg.selectAll('.chart-title, .chart-header text')
            .style('font-family', fontFamily);
        
        // Apply to axis text (labels and tick text)
        this.chart.selectAll('.x-axis text, .y-axis text')
            .style('font-family', fontFamily);
        
        // Apply to bar labels
        this.chart.selectAll('.bar-label, .grouped-bar-label, .stacked-bar-label, .waterfall-bar-label, .polar-label')
            .style('font-family', fontFamily);
        
        // Apply to grid text if any
        this.chart.selectAll('.grid text')
            .style('font-family', fontFamily);
        
        // Apply to legend text if any
        this.svg.selectAll('.legend text, .legend-item text')
            .style('font-family', fontFamily);
        
        // Apply to tooltip text (though tooltip uses separate styling)
        if (this.tooltip) {
            this.tooltip.style('font-family', fontFamily);
        }
        
        console.log(`🔤 Applied font family '${fontFamily}' to all chart text elements`);
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
                    if (this.config.useColorScheme) {
                        return this.customColors[d.category] || this.getBarColors()[i % this.getBarColors().length];
                    } else {
                        return this.config.defaultBarColor || this.getBarColors()[0];
                    }
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
    
    // Robust numeric column detection to avoid treating categorical data as numeric
    getNumericColumns() {
        if (!this.data || this.data.length === 0) return [];
        
        const allColumns = Object.keys(this.data[0] || {});
        console.log('🔍 getNumericColumns: All columns found:', allColumns);
        console.log('🔍 getNumericColumns: Sample data row:', this.data[0]);
        
        // FLEXIBLE APPROACH: First try known value column patterns, then fallback to any numeric column
        const knownValueColumns = allColumns.filter(column => {
            // Match value column patterns: value, value_1, value_2, value_3, etc.
            return /^value(_?\d+)?$/i.test(column); // Added 'i' flag for case-insensitive
        });
        
        // If we found known value columns, validate them
        let valueColumns = [];
        
        if (knownValueColumns.length > 0) {
            console.log('🔍 Found known value pattern columns:', knownValueColumns);
            valueColumns = knownValueColumns.filter(column => {
                // Verify it's actually numeric
                let allNumeric = true;
                let hasValidData = false;
                
                for (const row of this.data) {
                    const value = row[column];
                    
                    // Skip null/undefined values
                    if (value == null) continue;
                    
                    // Check if it's a genuine number
                    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
                        allNumeric = false;
                        break;
                    }
                    
                    // Has at least one valid value (can be zero)
                    if (value !== null && value !== undefined) hasValidData = true;
                }
                
                if (allNumeric && hasValidData) {
                    console.log(`✅ Column '${column}' confirmed as valid numeric value column`);
                    return true;
                } else {
                    console.log(`❌ Column '${column}' excluded - not properly numeric (allNumeric: ${allNumeric}, hasValidData: ${hasValidData})`);
                    return false;
                }
            });
        }
        
        // If no known value columns found or they're all invalid, detect any numeric columns
        if (valueColumns.length === 0) {
            console.log('🔍 No valid known value columns found, detecting any numeric columns...');
            valueColumns = allColumns.filter(column => {
                // Skip obvious categorical columns
                if (column === 'category' || column === 'label' || column === 'name' || column === 'id') {
                    console.log(`❌ Column '${column}' excluded - categorical column`);
                    return false;
                }
                
                // Verify it's actually numeric
                let allNumeric = true;
                let hasValidData = false;
                
                for (const row of this.data) {
                    const value = row[column];
                    
                    // Skip null/undefined values
                    if (value == null) continue;
                    
                    // Check if it's a genuine number
                    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
                        allNumeric = false;
                        break;
                    }
                    
                    // Has at least one valid value (can be zero)
                    if (value !== null && value !== undefined) hasValidData = true;
                }
                
                if (allNumeric && hasValidData) {
                    console.log(`✅ Column '${column}' confirmed as valid numeric column`);
                    return true;
                } else {
                    console.log(`❌ Column '${column}' excluded - not properly numeric (allNumeric: ${allNumeric}, hasValidData: ${hasValidData})`);
                    return false;
                }
            });
        }
        
        console.log('🔧 FINAL: Detected value columns:', valueColumns);
        console.log('🔧 FINAL: Column count:', valueColumns.length);
        
        return valueColumns;
    }
    
    // Helper method to get the primary value from any data row (for simple charts)
    getPrimaryValue(dataRow) {
        if (!dataRow) return 0;
        
        // Try to find a 'value' property first
        if (dataRow.value !== undefined && dataRow.value !== null) {
            return Number(dataRow.value) || 0;
        }
        
        // Look for value_* pattern columns in the data row itself
        const valueColumns = Object.keys(dataRow).filter(key => /^value(_?\d+)?$/.test(key));
        
        if (valueColumns.length > 0) {
            // Sort to get the first value column (value, value_2, value_3, etc.)
            valueColumns.sort();
            const firstColumn = valueColumns[0];
            return Number(dataRow[firstColumn]) || 0;
        }
        
        // Last resort: find any numeric property
        for (const key of Object.keys(dataRow)) {
            if (key !== 'category' && key !== 'label' && typeof dataRow[key] === 'number') {
                return Number(dataRow[key]) || 0;
            }
        }
        
        return 0;
    }

    // Get the appropriate sort value based on chart type (industry standard practices)
    getSortValue(dataRow) {
        if (!dataRow) return 0;
        
        const chartType = this.config.barChartType || 'simple';
        
        switch (chartType) {
            case 'simple':
                // Simple charts: sort by single value
                return this.getPrimaryValue(dataRow);
                
            case 'grouped':
                // Grouped charts: sort by SUM of all series (industry standard)
                if (dataRow.seriesData) {
                    return Object.values(dataRow.seriesData).reduce((sum, val) => sum + (Number(val) || 0), 0);
                }
                // Fallback: sum all value_* columns
                return this.getSumOfAllValues(dataRow);
                
            case 'stacked':
            case 'stacked100':
                // Stacked charts: sort by total stack height (industry standard)
                if (dataRow.seriesData) {
                    return Object.values(dataRow.seriesData).reduce((sum, val) => sum + (Number(val) || 0), 0);
                }
                // Fallback: sum all value_* columns
                return this.getSumOfAllValues(dataRow);
                
            case 'waterfall':
                // Waterfall: sort by cumulative value (if available) or primary value
                return dataRow.end !== undefined ? dataRow.end : this.getPrimaryValue(dataRow);
                
            case 'range':
                // Range charts: sort by the maximum value (end of range)
                if (dataRow.valueEnd !== undefined) {
                    return Number(dataRow.valueEnd) || 0;
                }
                return this.getPrimaryValue(dataRow);
                
            case 'polar':
                // Polar charts: sort by primary value
                return this.getPrimaryValue(dataRow);
                
            default:
                // Default: use primary value
                return this.getPrimaryValue(dataRow);
        }
    }

    // Helper method to sum all numeric value columns
    getSumOfAllValues(dataRow) {
        if (!dataRow) return 0;
        
        let total = 0;
        
        // Sum all value_* pattern columns
        const valueColumns = Object.keys(dataRow).filter(key => /^value(_?\d+)?$/.test(key));
        for (const column of valueColumns) {
            total += Number(dataRow[column]) || 0;
        }
        
        // If no value_* columns found, try other numeric properties
        if (valueColumns.length === 0) {
            for (const key of Object.keys(dataRow)) {
                if (key !== 'category' && key !== 'label' && typeof dataRow[key] === 'number') {
                    total += Number(dataRow[key]) || 0;
                }
            }
        }
        
        return total;
    }
    
    // Process data method required by control system
    processData(data) {
        return (() => {
            if (!data) {
                console.error('❌ No data provided to bar chart');
                return null;
            }

            console.log('📊 Processing bar chart data:', data);
            console.log('📊 Data type:', typeof data);
            console.log('📊 Data keys:', Object.keys(data || {}));
            console.log('📊 DETAILED DATA INSPECTION:', JSON.stringify(data, null, 2));
            console.log('📊 Has categories:', !!(data.categories));
            console.log('📊 Has values:', !!(data.values));
            console.log('📊 Has series:', !!(data.series));
            console.log('📊 Is array:', Array.isArray(data));

            // Handle different data formats with priority for multi-series
            let processedData = [];
            
            // PRIORITY 1: Multi-series format (for grouped/stacked charts)
            if (data.series && Array.isArray(data.series) && data.categories && data.series.length > 0) {
                console.log('📊 🎯 Taking MULTI-SERIES branch (priority)');
                console.log('📊 Input data.series:', data.series);
                console.log('📊 Input data.categories:', data.categories);
                
                processedData = data.categories.map((category, categoryIndex) => {
                    const result = { category: category };
                    
                    // Add data from each series as separate columns with consistent naming
                    data.series.forEach((series, seriesIndex) => {
                        // Always use consistent value column naming: value, value_2, value_3, etc.
                        const columnName = seriesIndex === 0 ? 'value' : `value_${seriesIndex + 1}`;
                        
                        result[columnName] = series.data[categoryIndex] || 0;
                        console.log(`📊 Added column ${columnName} = ${result[columnName]} for ${category} (series: ${series.name || `Series ${seriesIndex + 1}`})`);
                    });
                    
                    // DON'T add backwards compatibility 'value' column - it creates duplicates!
                    // The numeric columns already include proper series data
                    console.log('📊 🎯 Skipping backwards compatibility value column to prevent duplicates');
                    
                    // Add label for compatibility
                    result.label = category;
                    
                    return result;
                });
                
                console.log('📊 🎯 Final processed multi-series data:', processedData);
                
            // PRIORITY 2: Flat multi-column format
            } else if (data.data && Array.isArray(data.data)) {
                console.log('📊 Taking data.data branch');
                processedData = data.data.map(d => {
                    const result = {
                        category: d.category || d.name || d.label,
                        label: d.label || d.category || d.name
                    };
                    
                    // Copy all numeric columns
                    Object.keys(d).forEach(key => {
                        if (key !== 'category' && key !== 'label' && typeof d[key] === 'number') {
                            result[key] = d[key];
                        }
                    });
                    
                    // DON'T add backwards compatibility 'value' column - causes duplicate bars!
                    console.log('📊 🎯 Skipping backwards compatibility value column in flat format');
                    
                    return result;
                });
                
            // PRIORITY 3: Simple categories + values format
            } else if (data.categories && data.values) {
                console.log('📊 Taking categories+values branch');
                processedData = data.categories.map((category, index) => ({
                    category: category,
                    value: data.values[index] || 0,
                    label: data.labels ? data.labels[index] : category
                }));
                
            // PRIORITY 4: Array format
            } else if (Array.isArray(data)) {
                console.log('📊 Taking array branch');
                processedData = data.map(d => {
                    const result = {
                        category: d.category || d.name || d.label,
                        label: d.label || d.category || d.name
                    };
                    
                    // Copy all properties, prioritizing numeric ones
                    Object.keys(d).forEach(key => {
                        if (key !== 'category' && key !== 'label') {
                            if (typeof d[key] === 'number') {
                                result[key] = d[key];
                            }
                        }
                    });
                    
                    // DON'T add redundant 'value' column - let getNumericColumns() handle filtering
                    console.log('📊 🎯 Skipping redundant value column in array format');
                    
                    return result;
                });
                
            } else {
                console.warn('📊 No matching data format found! Using data as-is');
                console.warn('📊 Fallback data:', data);
                processedData = Array.isArray(data) ? data : [data];
            }

            // Sort data by value (descending) if autoSort is enabled (disabled by default)
            console.log('📊 AutoSort config value:', this.config.autoSort);
            console.log('📊 AutoSort enabled?', this.config.autoSort === true);
            
            if (this.config.autoSort === true) {
                console.log('📊 BEFORE SORT:', processedData.map(d => ({ category: d.category, sortValue: this.getSortValue(d) })));
                console.log('📊 Sort method for chart type:', this.config.barChartType);
                console.log('📊 Sort direction:', this.config.sortDirection);
                
                const isDescending = this.config.sortDirection === 'descending';
                
                processedData.sort((a, b) => {
                    const valueA = this.getSortValue(a);
                    const valueB = this.getSortValue(b);
                    console.log(`📊 Comparing ${a.category}(${valueA}) vs ${b.category}(${valueB})`);
                    return isDescending ? valueB - valueA : valueA - valueB;
                });
                
                console.log('📊 AFTER SORT:', processedData.map(d => ({ category: d.category, sortValue: this.getSortValue(d) })));
                console.log('📊 Data sorted by appropriate method for', this.config.barChartType, 'chart');
            }

            console.log('✅ Processed bar chart data:', processedData);
            
            // DEBUG: Check what columns are in the processed data
            if (processedData && processedData.length > 0) {
                const firstRow = processedData[0];
                const allKeys = Object.keys(firstRow);
                const numericKeys = allKeys.filter(key => key !== 'category' && key !== 'label' && typeof firstRow[key] === 'number');
                console.log('📊 Processed data first row keys:', allKeys);
                console.log('📊 Numeric columns found:', numericKeys);
                console.log('📊 Numeric columns count:', numericKeys.length);
                console.log('📊 First row sample:', firstRow);
            }
            
            // Store processed data and preserve original order
            this.data = processedData;
            
            // Store original data order for sort toggle functionality (always update with new data)
            this.originalData = [...processedData];
            console.log('📊 Updated original data order for sort toggle with new data');
            
            return processedData;
        })();
    }

    // Get layer info method (compatibility with control system)
    getLayerInfo() {
        if (!this.data || !this.data.length) {
            return { totalLayers: 0, categories: [] };
        }
        
        return {
            totalLayers: 1, // Bar charts have a single layer
            categories: this.data.map(d => d.category),
            maxValue: Math.max(...this.data.map(d => this.getPrimaryValue(d))),
            minValue: Math.min(...this.data.map(d => this.getPrimaryValue(d)))
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
            const value = this.getPrimaryValue(d);
            const barTop = this.yScale(Math.max(0, value));
            const barBottom = this.yScale(0);
            const barHeight = Math.abs(barBottom - barTop);
            
            switch (this.config.labelPosition) {
                case 'outside_end':
                    // Above the bar (traditional top)
                    return barTop - this.config.labelOffset;
                case 'inside_end':
                    // Inside the bar near the top
                    return barTop + this.config.labelOffset + 10;
                case 'inside_center':
                    // In the center of the bar
                    return barTop + barHeight / 2;
                case 'inside_start':
                    // Inside the bar near the bottom
                    return barBottom - this.config.labelOffset - 5;
                case 'outside_start':
                    // Below the chart (traditional bottom)
                    return barBottom + this.config.labelOffset + 15;
                // Legacy support for old position values
                case 'top':
                    return barTop - this.config.labelOffset;
                case 'middle':
                    return barTop + barHeight / 2;
                case 'bottom':
                    return barBottom + this.config.labelOffset + 15;
                default:
                    return barTop - this.config.labelOffset;
            }
        }
    }

    // Calculate label X position based on labelPosition config (for horizontal bars)
    getLabelX(d) {
        if (this.config.orientation === 'vertical') {
            // For vertical bars, X is just centered on the bar
            return this.xScale(d.category) + this.xScale.bandwidth() / 2;
        } else {
            // Horizontal bars - use position-aware logic
            const value = this.getPrimaryValue(d);
            const barLeft = this.xScale(0);
            const barRight = this.xScale(value);
            const barWidth = Math.abs(barRight - barLeft);
            
            switch (this.config.labelPosition) {
                case 'outside_end':
                    // Right of the bar
                    return barRight + this.config.labelOffset;
                case 'inside_end':
                    // Inside the bar near the right
                    return barRight - this.config.labelOffset - 5;
                case 'inside_center':
                    // In the center of the bar
                    return barLeft + barWidth / 2;
                case 'inside_start':
                    // Inside the bar near the left
                    return barLeft + this.config.labelOffset + 5;
                case 'outside_start':
                    // Left of the chart (outside)
                    return barLeft - this.config.labelOffset;
                // Legacy support
                case 'top':
                    return barRight + this.config.labelOffset;
                case 'middle':
                    return barLeft + barWidth / 2;
                case 'bottom':
                    return barLeft - this.config.labelOffset;
                default:
                    return barRight + this.config.labelOffset;
            }
        }
    }

    // Get text anchor based on label position
    getLabelTextAnchor() {
        if (this.config.orientation === 'vertical') {
            return 'middle';
        } else {
            // Horizontal bars
            switch (this.config.labelPosition) {
                case 'outside_end':
                case 'inside_end':
                    return 'start';
                case 'inside_center':
                    return 'middle';
                case 'inside_start':
                case 'outside_start':
                    return 'end';
                default:
                    return 'start';
            }
        }
    }

    // Enhanced positioning functions for grouped and stacked bar charts
    getGroupedBarLabelXPosition(d, orientation) {
        const value = d.value || 0;
        const position = this.config.labelPosition;
        const offset = this.config.labelOffset;
        
        let x, textAnchor;
        
        if (orientation === 'horizontal') {
            switch (position) {
                case 'outside_end':
                    x = this.xScale(value) + offset;
                    textAnchor = 'start';
                    break;
                case 'inside_end':
                    x = this.xScale(value) - offset;
                    textAnchor = 'end';
                    break;
                case 'inside_center':
                    x = this.xScale(value / 2);
                    textAnchor = 'middle';
                    break;
                case 'inside_start':
                    x = this.xScale(0) + offset;
                    textAnchor = 'start';
                    break;
                case 'outside_start':
                    x = this.xScale(0) - offset;
                    textAnchor = 'end';
                    break;
                default:
                    x = this.xScale(value) + offset;
                    textAnchor = 'start';
            }
        }
        
        return { x, textAnchor };
    }
    
    getGroupedBarLabelYPosition(d, orientation) {
        const value = d.value || 0;
        const position = this.config.labelPosition;
        const offset = this.config.labelOffset;
        
        let y, dominantBaseline;
        
        if (orientation === 'vertical') {
            switch (position) {
                case 'outside_end':
                    y = this.yScale(value) - offset;
                    dominantBaseline = 'baseline';
                    break;
                case 'inside_end':
                    y = this.yScale(value) + offset;
                    dominantBaseline = 'hanging';
                    break;
                case 'inside_center':
                    y = this.yScale(value / 2);
                    dominantBaseline = 'middle';
                    break;
                case 'inside_start':
                    y = this.yScale(0) - offset;
                    dominantBaseline = 'baseline';
                    break;
                case 'outside_start':
                    y = this.yScale(0) + offset;
                    dominantBaseline = 'hanging';
                    break;
                default:
                    y = this.yScale(value) - offset;
                    dominantBaseline = 'baseline';
            }
        }
        
        return { y, dominantBaseline };
    }
    
    getStackedBarLabelXPosition(d, orientation) {
        const position = this.config.labelPosition;
        const offset = this.config.labelOffset;
        const segmentStart = d[0];
        const segmentEnd = d[1];
        
        let x, textAnchor;
        
        if (orientation === 'horizontal') {
            switch (position) {
                case 'outside_end':
                    x = this.xScale(segmentEnd) + offset;
                    textAnchor = 'start';
                    break;
                case 'inside_end':
                    x = this.xScale(segmentEnd) - offset;
                    textAnchor = 'end';
                    break;
                case 'inside_center':
                    x = this.xScale((segmentStart + segmentEnd) / 2);
                    textAnchor = 'middle';
                    break;
                case 'inside_start':
                    x = this.xScale(segmentStart) + offset;
                    textAnchor = 'start';
                    break;
                case 'outside_start':
                    x = this.xScale(segmentStart) - offset;
                    textAnchor = 'end';
                    break;
                default:
                    x = this.xScale((segmentStart + segmentEnd) / 2);
                    textAnchor = 'middle';
            }
        }
        
        return { x, textAnchor };
    }
    
    getStackedBarLabelYPosition(d, orientation) {
        const position = this.config.labelPosition;
        const offset = this.config.labelOffset;
        const segmentStart = d[0];
        const segmentEnd = d[1];
        
        let y, dominantBaseline;
        
        if (orientation === 'vertical') {
            switch (position) {
                case 'outside_end':
                    y = this.yScale(segmentEnd) - offset;
                    dominantBaseline = 'baseline';
                    break;
                case 'inside_end':
                    y = this.yScale(segmentEnd) + offset;
                    dominantBaseline = 'hanging';
                    break;
                case 'inside_center':
                    y = (this.yScale(segmentStart) + this.yScale(segmentEnd)) / 2;
                    dominantBaseline = 'middle';
                    break;
                case 'inside_start':
                    y = this.yScale(segmentStart) - offset;
                    dominantBaseline = 'baseline';
                    break;
                case 'outside_start':
                    y = this.yScale(segmentStart) + offset;
                    dominantBaseline = 'hanging';
                    break;
                default:
                    y = (this.yScale(segmentStart) + this.yScale(segmentEnd)) / 2;
                    dominantBaseline = 'middle';
            }
        }
        
        return { y, dominantBaseline };
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
            return `${d.label}: ${this.formatValue(this.getPrimaryValue(d))}`;
        } else if (showValues) {
            // Show only values
            return this.formatValue(this.getPrimaryValue(d));
        } else if (showLabels) {
            // Show only labels
            return d.label;
        }
        
        return '';
    }

    // Update existing labels based on current config (for better performance)
    updateLabels() {
        const shouldShowLabels = this.config.showBarLabels || this.config.showValues;
        
        // Remove ALL existing labels (all types)
        this.chart.selectAll('.bar-label').remove();
        this.chart.selectAll('.grouped-bar-label').remove();
        this.chart.selectAll('.stacked-bar-label').remove();
        this.chart.selectAll('.waterfall-bar-label').remove();
        this.chart.selectAll('.polar-label').remove();
        
        // Add labels if needed based on current chart type
        if (shouldShowLabels) {
            switch (this.config.barChartType) {
                case 'grouped':
                    this.renderGroupedBarLabels();
                    break;
                case 'stacked':
                case 'stacked100':
                    this.renderStackedBarLabels();
                    break;
                case 'waterfall':
                    this.renderWaterfallBarLabels();
                    break;
                case 'polar':
                    // Polar labels are handled in renderPolarBars
                    break;
                default:
                    // Simple, range, and other types
                    this.renderBarLabels();
                    break;
            }
        }
    }

    // ===== SPECIALIZED LABEL RENDERING METHODS FOR MULTI-SERIES CHARTS =====

    renderGroupedBarLabels() {
        // Clear existing labels
        this.chart.selectAll('.grouped-bar-label').remove();
        
        // Get numeric columns for grouped data
        const numericColumns = this.getNumericColumns();
        
        if (numericColumns.length === 0) return;
        
        // Prepare grouped data (same as in renderGroupedBars)
        const groupedData = this.data.map(d => {
            const values = numericColumns.map(col => ({ 
                series: col, 
                value: d[col] || 0, 
                category: d.category,
                label: d.label || d.category 
            }));
            return { category: d.category, values };
        });
        
        // Create sub-scale for groups (same as in renderGroupedBars)
        const categoryScale = this.config.orientation === 'horizontal' ? this.yScale : this.xScale;
        const subScale = d3.scaleBand()
            .domain(numericColumns)
            .range([0, categoryScale.bandwidth()])
            .padding(0.05);
        
        if (this.config.orientation === 'horizontal') {
            // Horizontal grouped bar labels with configurable positioning
            groupedData.forEach(groupData => {
                groupData.values.forEach(d => {
                    if ((d.value || 0) > 0) { // Only show labels for bars with values
                        const { x, textAnchor } = this.getGroupedBarLabelXPosition(d, 'horizontal');
                        
                        this.chart.append('text')
                            .attr('class', 'grouped-bar-label')
                            .attr('x', x)
                            .attr('y', this.yScale(d.category) + subScale(d.series) + subScale.bandwidth() / 2)
                            .attr('text-anchor', textAnchor)
                            .attr('dominant-baseline', 'middle')
                            .style('font-family', this.config.titleFont || 'Inter, sans-serif')
                            .style('font-size', `${this.config.labelFontSize}px`)
                            .style('fill', this.config.labelColor)
                            .style('opacity', 0)
                            .text(this.getGroupedBarLabelText(d))
                            .transition()
                            .delay(this.config.animationDuration * 0.5)
                            .duration(this.config.animationDuration * 0.5)
                            .style('opacity', 1);
                    }
                });
            });
        } else {
            // Vertical grouped bar labels with configurable positioning
            groupedData.forEach(groupData => {
                groupData.values.forEach(d => {
                    if ((d.value || 0) > 0) { // Only show labels for bars with values
                        const { y, dominantBaseline } = this.getGroupedBarLabelYPosition(d, 'vertical');
                            
                        this.chart.append('text')
                            .attr('class', 'grouped-bar-label')
                            .attr('x', this.xScale(d.category) + subScale(d.series) + subScale.bandwidth() / 2)
                            .attr('y', y)
                            .attr('text-anchor', 'middle')
                            .attr('dominant-baseline', dominantBaseline)
                            .style('font-family', this.config.titleFont || 'Inter, sans-serif')
                            .style('font-size', `${this.config.labelFontSize}px`)
                            .style('fill', this.config.labelColor)
                            .style('opacity', 0)
                            .text(this.getGroupedBarLabelText(d))
                            .transition()
                            .delay(this.config.animationDuration * 0.5)
                            .duration(this.config.animationDuration * 0.5)
                            .style('opacity', 1);
                    }
                });
            });
        }
    }

    renderStackedBarLabels() {
        // Clear existing labels
        this.chart.selectAll('.stacked-bar-label').remove();
        
        // Get numeric columns for stacking
        const numericColumns = this.getNumericColumns();
        
        if (numericColumns.length === 0) return;
        
        // Create stacked data (same as in renderStackedBars)
        const stackedData = d3.stack()
            .keys(numericColumns)
            (this.data);
        
        if (this.config.orientation === 'horizontal') {
            // Horizontal stacked bar labels with configurable positioning
            stackedData.forEach((layer) => {
                layer.forEach(d => {
                    const segmentValue = d[1] - d[0];
                    if (segmentValue > 0) { // Only show labels for segments with values
                        const { x, textAnchor } = this.getStackedBarLabelXPosition(d, 'horizontal');
                        
                        this.chart.append('text')
                            .attr('class', 'stacked-bar-label')
                            .attr('x', x)
                            .attr('y', this.yScale(d.data.category) + this.yScale.bandwidth() / 2)
                            .attr('text-anchor', textAnchor)
                            .attr('dominant-baseline', 'middle')
                            .style('font-family', this.config.titleFont || 'Inter, sans-serif')
                            .style('font-size', `${this.config.labelFontSize}px`)
                            .style('fill', this.config.labelColor)
                            .style('opacity', 0)
                            .text(this.getStackedBarLabelText(d, segmentValue))
                            .transition()
                            .delay(this.config.animationDuration * 0.5)
                            .duration(this.config.animationDuration * 0.5)
                            .style('opacity', 1);
                    }
                });
            });
        } else {
            // Vertical stacked bar labels with configurable positioning
            stackedData.forEach((layer) => {
                layer.forEach(d => {
                    const segmentValue = d[1] - d[0];
                    if (segmentValue > 0) { // Only show labels for segments with values
                        const { y, dominantBaseline } = this.getStackedBarLabelYPosition(d, 'vertical');
                        
                        this.chart.append('text')
                            .attr('class', 'stacked-bar-label')
                            .attr('x', this.xScale(d.data.category) + this.xScale.bandwidth() / 2)
                            .attr('y', y)
                            .attr('text-anchor', 'middle')
                            .attr('dominant-baseline', dominantBaseline)
                            .style('font-family', this.config.titleFont || 'Inter, sans-serif')
                            .style('font-size', `${this.config.labelFontSize}px`)
                            .style('fill', this.config.labelColor)
                            .style('opacity', 0)
                            .text(this.getStackedBarLabelText(d, segmentValue))
                            .transition()
                            .delay(this.config.animationDuration * 0.5)
                            .duration(this.config.animationDuration * 0.5)
                            .style('opacity', 1);
                    }
                });
            });
        }
    }

    renderWaterfallBarLabels() {
        // Clear existing labels
        this.chart.selectAll('.waterfall-bar-label').remove();
        
        // Use processed waterfall data from bars
        const bars = this.chart.selectAll('.bar');
        
        bars.each((d, i, nodes) => {
            const value = this.getPrimaryValue(d) || (d.end - d.start);
            
            if (Math.abs(value) > 0) { // Only show labels for bars with values
                let labelX, labelY;
                
                if (this.config.orientation === 'horizontal') {
                    labelX = this.xScale(Math.max(d.start || 0, d.end || this.getPrimaryValue(d))) + this.config.labelOffset;
                    labelY = this.yScale(d.category) + this.yScale.bandwidth() / 2;
                } else {
                    labelX = this.xScale(d.category) + this.xScale.bandwidth() / 2;
                    labelY = this.yScale(Math.max(d.start || 0, d.end || this.getPrimaryValue(d))) - this.config.labelOffset;
                }
                
                this.chart.append('text')
                    .attr('class', 'waterfall-bar-label')
                    .attr('x', labelX)
                    .attr('y', labelY)
                    .attr('text-anchor', this.config.orientation === 'horizontal' ? 'start' : 'middle')
                    .attr('dominant-baseline', 'middle')
                    .style('font-family', this.config.titleFont || 'Inter, sans-serif')
                    .style('font-size', `${this.config.labelFontSize}px`)
                    .style('fill', this.config.labelColor)
                    .style('opacity', 0)
                    .text(this.getWaterfallBarLabelText(d))
                    .transition()
                    .delay(this.config.animationDuration * 0.5)
                    .duration(this.config.animationDuration * 0.5)
                    .style('opacity', 1);
            }
        });
    }

    // ===== HELPER METHODS FOR SPECIALIZED LABELS =====

    getGroupedBarLabelText(d) {
        // Use same logic as simple bar chart - just show the value or category
        const showLabels = this.config.showBarLabels;
        const showValues = this.config.showValues;
        
        if (!showLabels && !showValues) return '';
        
        if (showLabels && showValues) {
            // Show both: "Category: $value" (same as simple chart)
            return `${d.label || d.category}: ${this.formatValue(d.value || 0)}`;
        } else if (showValues) {
            // Show only values (same as simple chart)
            return this.formatValue(d.value || 0);
        } else if (showLabels) {
            // Show only category labels (same as simple chart)
            return d.label || d.category;
        }
        
        return '';
    }

    getStackedBarLabelText(d, segmentValue) {
        // Use same logic as simple bar chart - just show the value or category
        const showLabels = this.config.showBarLabels;
        const showValues = this.config.showValues;
        
        if (!showLabels && !showValues) return '';
        
        if (showLabels && showValues) {
            // Show both: "Category: $value" (same as simple chart)
            return `${d.data.category}: ${this.formatValue(segmentValue)}`;
        } else if (showValues) {
            // Show only values (same as simple chart)
            return this.formatValue(segmentValue);
        } else if (showLabels) {
            // Show only category labels (same as simple chart)
            return d.data.category;
        }
        
        return '';
    }

    getWaterfallBarLabelText(d) {
        // Use same logic as simple bar chart - just show the value or category
        const showLabels = this.config.showBarLabels;
        const showValues = this.config.showValues;
        
        if (!showLabels && !showValues) return '';
        
        const value = this.getPrimaryValue(d) || (d.end - d.start);
        const label = d.label || d.category || '';
        
        if (showLabels && showValues) {
            // Show both: "Category: $value" (same as simple chart)
            return `${label}: ${this.formatValue(value)}`;
        } else if (showValues) {
            // Show only values (same as simple chart)
            return this.formatValue(value);
        } else if (showLabels) {
            // Show only category labels (same as simple chart)
            return label;
        }
        
        return '';
    }

    // Apply corner radius based on style setting and chart type
    applyCornerRadius() {
        const radius = this.config.barCornerRadius || 0;
        const topOnly = this.config.cornerRadiusStyle === true;
        const chartType = this.config.barChartType || 'simple';
        
        console.log(`🔄 Applying corner radius: ${radius}px, topOnly: ${topOnly}, chartType: ${chartType}`);
        console.log(`🔄 Full config:`, this.config);
        console.log(`🔄 cornerRadiusStyle value:`, this.config.cornerRadiusStyle);
        
        // Get appropriate bars based on chart type
        let bars;
        if (chartType === 'stacked' || chartType === 'stacked100') {
            // For stacked charts, we need special handling
            if (topOnly) {
                // Only apply to top segments of each stack
                bars = this.getTopStackSegments();
            } else {
                // Apply to all segments
                bars = this.chart.selectAll('.bar');
            }
        } else {
            // For simple, grouped, etc. - apply to all bars
            bars = this.chart.selectAll('.bar');
        }
        
        if (bars.empty()) {
            console.log('⚠️ No bars found for corner radius application');
            return;
        }
        
        if (radius <= 0) {
            // Remove any corner radius and clipPaths from ALL bars
            this.chart.selectAll('.bar')
                .attr('rx', 0)
                .attr('ry', 0)
                .attr('clip-path', null);
            
            // Clean up any clipPath definitions
            const svg = d3.select(this.chart.node().ownerSVGElement);
            if (!svg.empty()) {
                svg.selectAll('defs clipPath[id^="clip-top-corners-"]').remove();
            }
            console.log('✅ Removed corner radius');
            return;
        }
        
        if (topOnly) {
            this.applyTopOnlyCornerRadius(bars);
        } else {
            this.applyAllCornersRadius(bars);
        }
        
        console.log(`✅ Applied corner radius: ${radius}px, style: ${topOnly ? 'top-only' : 'all-corners'}, chart: ${chartType}`);
    }

    // Get only the top segments of stacked charts
    getTopStackSegments() {
        const chartType = this.config.barChartType || 'simple';
        
        if (chartType !== 'stacked' && chartType !== 'stacked100') {
            return this.chart.selectAll('.bar');
        }
        
        // For stacked charts, find the topmost bar in each category
        const categories = [...new Set(this.data.map(d => d.category))];
        const topBars = [];
        
        categories.forEach(category => {
            // Find all bars for this category
            const categoryBars = [];
            this.chart.selectAll('.bar').each(function(d) {
                if (d && d.data && d.data.category === category) {
                    categoryBars.push({
                        element: this,
                        data: d,
                        y1: d[1] // Top of this segment
                    });
                }
            });
            
            // Find the bar with the highest y1 value (topmost)
            if (categoryBars.length > 0) {
                const topBar = categoryBars.reduce((max, current) => 
                    current.y1 > max.y1 ? current : max
                );
                topBars.push(topBar.element);
            }
        });
        
        console.log(`🔄 Found ${topBars.length} top stack segments out of ${categories.length} categories`);
        return d3.selectAll(topBars);
    }
    
    // Apply top-only corner radius using clipPath
    applyTopOnlyCornerRadius(targetBars = null) {
        const radius = this.config.barCornerRadius || 0;
        
        console.log('🔄 Applying top-only corner radius:', radius);
        console.log('🔄 Chart orientation:', this.config.orientation);
        
        // Use provided bars or get all bars
        const bars = targetBars || this.chart.selectAll('.bar');
        if (bars.empty()) {
            console.log('⚠️ No bars found for top-only corner radius');
            return;
        }
        
        // First remove any existing rx/ry and clipPaths
        bars.attr('rx', 0)
            .attr('ry', 0)
            .attr('clip-path', null);
        
        // Clean up old clipPaths
        const svg = d3.select(this.chart.node().ownerSVGElement);
        if (!svg.empty()) {
            svg.selectAll('defs clipPath[id^="clip-top-corners-"]').remove();
        }
        
        if (radius <= 0) return;
        
        // Get or create defs element
        let defs = svg.select('defs');
        if (defs.empty()) {
            defs = svg.append('defs');
        }
        
        // Apply clipPath to each bar for top-only rounded corners
        console.log('🔄 Processing bars for top-only corners, count:', bars.size());
        
        // Capture chart reference for use inside the callback
        const chartInstance = this;
        
        bars.each(function(d, i) {
            const bar = d3.select(this);
            const x = parseFloat(bar.attr('x')) || 0;
            const y = parseFloat(bar.attr('y')) || 0;
            const width = parseFloat(bar.attr('width')) || 0;
            const height = parseFloat(bar.attr('height')) || 0;
            
            console.log(`🔄 Processing bar ${i}:`, { x, y, width, height });
            
            // Skip bars that don't have valid dimensions yet
            if (width <= 0 || height <= 0) {
                console.log('🔴 Skipping bar with invalid dimensions:', { x, y, width, height });
                return;
            }
            
            // Create unique clipPath ID
            const clipId = `clip-top-corners-${Math.random().toString(36).substr(2, 9)}`;
            
            // Calculate effective radius
            const effectiveRadius = Math.min(radius, width / 2, height / 2);
            
            // Create clipPath with orientation-aware "top" rounded corners
            const clipPath = defs.append('clipPath').attr('id', clipId);
            let pathData;
            
            if (chartInstance.config.orientation === 'vertical') {
                // For vertical bars, "top" means the top edge (smaller y value)
                pathData = `M ${x},${y + height}
                           L ${x},${y + effectiveRadius}
                           Q ${x},${y} ${x + effectiveRadius},${y}
                           L ${x + width - effectiveRadius},${y}
                           Q ${x + width},${y} ${x + width},${y + effectiveRadius}
                           L ${x + width},${y + height}
                           Z`;
            } else {
                // For horizontal bars, "top" means the right edge (larger x value) 
                pathData = `M ${x},${y}
                           L ${x + width - effectiveRadius},${y}
                           Q ${x + width},${y} ${x + width},${y + effectiveRadius}
                           L ${x + width},${y + height - effectiveRadius}
                           Q ${x + width},${y + height} ${x + width - effectiveRadius},${y + height}
                           L ${x},${y + height}
                           Z`;
            }
            
            clipPath.append('path').attr('d', pathData);
            
            // Apply the clipPath to the bar
            bar.attr('clip-path', `url(#${clipId})`);
            
            console.log('🎨 Applied top-only corner radius to bar:', { x, y, width, height, effectiveRadius, clipId });
            console.log('🎨 ClipPath created with pathData:', pathData);
        });
        
        console.log('✅ Top-only corner radius applied to all valid bars');
    }
    
    // Apply regular corner radius to all corners
    applyAllCornersRadius(targetBars = null) {
        const radius = this.config.barCornerRadius || 0;
        
        console.log('🔄 Applying all-corners radius:', radius);
        
        // Use provided bars or get all bars
        const bars = targetBars || this.chart.selectAll('.bar');
        if (bars.empty()) {
            console.log('⚠️ No bars found for all-corners radius');
            return;
        }
        
        // Remove any existing clipPaths
        bars.attr('clip-path', null);
        
        // Clean up clipPath definitions
        const svg = d3.select(this.chart.node().ownerSVGElement);
        if (!svg.empty()) {
            svg.selectAll('defs clipPath[id^="clip-top-corners-"]').remove();
        }
        
        // Apply regular rx/ry for all corners
        bars.attr('rx', radius)
            .attr('ry', radius);
            
        console.log('✅ All-corners radius applied to all bars');
    }
}