// Placeholder for BaseChart.js
/* ===== BASE CHART INTERFACE ===== */
/* Abstract base class defining common patterns for all chart types */

(function() {
    'use strict';

    class BaseChart {
        constructor(containerId, chartType = 'unknown') {
            if (this.constructor === BaseChart) {
                throw new Error('BaseChart is abstract and cannot be instantiated directly');
            }

            this.containerId = containerId;
            this.chartType = chartType;
            this.container = d3.select(`#${containerId}`);
            
            // Common state management
            this.state = {
                initialized: false,
                rendering: false,
                currentData: null,
                lastRenderTime: null,
                error: null,
                version: '1.0.0'
            };

            // Event management
            this.eventHandlers = new Map();
            
            // Performance tracking
            this.performance = {
                renderTimes: [],
                avgRenderTime: 0,
                totalRenders: 0
            };

            // Chart capabilities
            this.capabilities = {
                supportsExport: false,
                supportsInteraction: false,
                supportsAnimation: false,
                supportsResize: false,
                supportedFormats: []
            };

            this.validateContainer();
        }

        // === ABSTRACT METHODS (must be implemented by subclasses) ===

        render(data) {
            throw new Error('render() method must be implemented by subclass');
        }

        // === COMMON LIFECYCLE METHODS ===

        initialize() {
            if (this.state.initialized) {
                console.warn(`Chart ${this.chartType} already initialized`);
                return this;
            }

            try {
                this.setupEventListeners();
                this.state.initialized = true;
                
                this.emit('initialized', { chartType: this.chartType });
                console.log(`Chart ${this.chartType} initialized successfully`);
                
            } catch (error) {
                this.handleError(error, 'Initialization');
                throw error;
            }

            return this;
        }

        destroy() {
            try {
                this.cleanup();
                this.removeEventListeners();
                this.container.selectAll('*').remove();
                
                this.state.initialized = false;
                this.state.currentData = null;
                
                this.emit('destroyed', { chartType: this.chartType });
                console.log(`Chart ${this.chartType} destroyed successfully`);
                
            } catch (error) {
                console.error(`Error destroying chart ${this.chartType}:`, error);
            }

            return this;
        }

        // === COMMON DATA METHODS ===

        updateData(newData) {
            if (!this.validateData(newData)) {
                throw new Error('Invalid data provided');
            }

            const oldData = this.state.currentData;
            this.state.currentData = newData;
            
            this.emit('dataUpdated', { 
                oldData, 
                newData, 
                chartType: this.chartType 
            });

            return this.render(newData);
        }

        getCurrentData() {
            return this.state.currentData;
        }

        // === COMMON VALIDATION METHODS ===

        validateContainer() {
            if (this.container.empty()) {
                throw new Error(`Container with id '${this.containerId}' not found`);
            }

            const containerNode = this.container.node();
            if (!containerNode) {
                throw new Error(`Invalid container element for id '${this.containerId}'`);
            }

            return true;
        }

        validateData(data) {
            if (!data) {
                throw new Error('Data cannot be null or undefined');
            }

            // Basic structure validation - subclasses can override
            if (typeof data !== 'object') {
                throw new Error('Data must be an object');
            }

            return true;
        }

        // === COMMON RESIZE METHODS ===

        resize(width, height) {
            if (!this.capabilities.supportsResize) {
                console.warn(`Chart type ${this.chartType} does not support resizing`);
                return this;
            }

            const oldDimensions = this.getDimensions();
            
            this.emit('resizeStart', { 
                oldDimensions, 
                newDimensions: { width, height } 
            });

            // Default implementation - subclasses can override
            if (this.state.currentData) {
                this.render(this.state.currentData);
            }

            this.emit('resizeEnd', { 
                oldDimensions, 
                newDimensions: { width, height } 
            });

            return this;
        }

        // === COMMON STATE METHODS ===

        getState() {
            return {
                ...this.state,
                chartType: this.chartType,
                containerId: this.containerId,
                hasData: !!this.state.currentData,
                capabilities: { ...this.capabilities },
                performance: { ...this.performance }
            };
        }

        isReady() {
            return this.state.initialized && !this.state.rendering && !this.state.error;
        }

        getDimensions() {
            const containerNode = this.container.node();
            const rect = containerNode.getBoundingClientRect();
            
            return {
                width: rect.width,
                height: rect.height,
                containerWidth: rect.width,
                containerHeight: rect.height
            };
        }

        // === COMMON EVENT METHODS ===

        on(eventName, handler) {
            if (!this.eventHandlers.has(eventName)) {
                this.eventHandlers.set(eventName, []);
            }
            this.eventHandlers.get(eventName).push(handler);
            return this;
        }

        off(eventName, handler) {
            if (this.eventHandlers.has(eventName)) {
                const handlers = this.eventHandlers.get(eventName);
                const index = handlers.indexOf(handler);
                if (index > -1) {
                    handlers.splice(index, 1);
                }
            }
            return this;
        }

        emit(eventName, data = {}) {
            if (this.eventHandlers.has(eventName)) {
                this.eventHandlers.get(eventName).forEach(handler => {
                    try {
                        handler({ ...data, chartType: this.chartType, timestamp: Date.now() });
                    } catch (error) {
                        console.error(`Error in event handler for ${eventName}:`, error);
                    }
                });
            }

            // Also emit global event
            const customEvent = new CustomEvent(`chart:${eventName}`, {
                detail: { ...data, chartType: this.chartType, chartId: this.containerId }
            });
            document.dispatchEvent(customEvent);

            return this;
        }

        // === COMMON ERROR HANDLING ===

        handleError(error, context = 'Unknown') {
            this.state.error = {
                message: error.message,
                context,
                timestamp: new Date().toISOString(),
                stack: error.stack,
                chartType: this.chartType
            };

            console.error(`Chart Error [${this.chartType}/${context}]:`, error);

            this.emit('error', { error: this.state.error });

            // Integration with global error handler
            if (window.ErrorHandler) {
                window.ErrorHandler.reportError(error, {
                    component: 'chart',
                    chartType: this.chartType,
                    context
                });
            }
        }

        clearError() {
            this.state.error = null;
            this.emit('errorCleared');
            return this;
        }

        // === COMMON PERFORMANCE TRACKING ===

        startRenderTimer() {
            this.renderStartTime = performance.now();
            this.state.rendering = true;
        }

        endRenderTimer() {
            if (this.renderStartTime) {
                const renderTime = performance.now() - this.renderStartTime;
                this.performance.renderTimes.push(renderTime);
                this.performance.totalRenders++;
                
                // Keep only last 10 render times for average calculation
                if (this.performance.renderTimes.length > 10) {
                    this.performance.renderTimes.shift();
                }
                
                this.performance.avgRenderTime = 
                    this.performance.renderTimes.reduce((sum, time) => sum + time, 0) / 
                    this.performance.renderTimes.length;

                this.state.lastRenderTime = Date.now();
                this.state.rendering = false;

                console.log(`${this.chartType} render completed in ${renderTime.toFixed(2)}ms`);
            }
        }

        getPerformanceMetrics() {
            return {
                ...this.performance,
                currentRenderTime: this.renderStartTime ? 
                    performance.now() - this.renderStartTime : null,
                isRendering: this.state.rendering
            };
        }

        // === COMMON EXPORT METHODS (can be overridden) ===

        exportToPNG(filename, options) {
            if (!this.capabilities.supportsExport || !this.capabilities.supportedFormats.includes('png')) {
                throw new Error(`Chart type ${this.chartType} does not support PNG export`);
            }
            
            throw new Error('PNG export must be implemented by subclass');
        }

        exportToSVG(filename, options) {
            if (!this.capabilities.supportsExport || !this.capabilities.supportedFormats.includes('svg')) {
                throw new Error(`Chart type ${this.chartType} does not support SVG export`);
            }
            
            throw new Error('SVG export must be implemented by subclass');
        }

        exportData(filename, options) {
            if (!this.capabilities.supportsExport || !this.capabilities.supportedFormats.includes('csv')) {
                throw new Error(`Chart type ${this.chartType} does not support data export`);
            }
            
            throw new Error('Data export must be implemented by subclass');
        }

        // === HELPER METHODS ===

        setupEventListeners() {
            // Default implementation - subclasses can override
            // Set up common event listeners like resize
            if (this.capabilities.supportsResize) {
                window.addEventListener('resize', this.handleWindowResize.bind(this));
            }
        }

        removeEventListeners() {
            // Default implementation - subclasses can override
            window.removeEventListener('resize', this.handleWindowResize.bind(this));
        }

        handleWindowResize() {
            // Debounced resize handling
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                if (this.state.initialized && !this.state.rendering) {
                    const dimensions = this.getDimensions();
                    this.resize(dimensions.width, dimensions.height);
                }
            }, 250);
        }

        cleanup() {
            // Default cleanup - subclasses can override
            clearTimeout(this.resizeTimeout);
            this.eventHandlers.clear();
        }

        // === UTILITY METHODS ===

        generateId(prefix = 'chart') {
            return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
        }

        formatValue(value, format = 'number') {
            switch (format) {
                case 'currency':
                    return new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                    }).format(value);
                case 'percentage':
                    return `${(value * 100).toFixed(1)}%`;
                case 'number':
                default:
                    return new Intl.NumberFormat('en-US').format(value);
            }
        }

        // === DEBUGGING METHODS ===

        debug() {
            console.group(`Chart Debug: ${this.chartType}`);
            console.log('State:', this.getState());
            console.log('Performance:', this.getPerformanceMetrics());
            console.log('Capabilities:', this.capabilities);
            console.log('Event Handlers:', Array.from(this.eventHandlers.keys()));
            console.groupEnd();
            
            return this.getState();
        }

        toString() {
            return `${this.chartType}Chart(${this.containerId})`;
        }
    }

    // === CHART REGISTRY ===
    // Static registry for chart types
    BaseChart.registeredCharts = new Map();

    BaseChart.registerChart = function(chartType, chartClass) {
        if (!chartClass.prototype instanceof BaseChart) {
            throw new Error('Chart class must extend BaseChart');
        }
        
        BaseChart.registeredCharts.set(chartType, chartClass);
        console.log(`Chart type '${chartType}' registered successfully`);
    };

    BaseChart.getRegisteredCharts = function() {
        return Array.from(BaseChart.registeredCharts.keys());
    };

    BaseChart.createChart = function(chartType, containerId, options = {}) {
        const ChartClass = BaseChart.registeredCharts.get(chartType);
        
        if (!ChartClass) {
            throw new Error(`Unknown chart type: ${chartType}. Available types: ${BaseChart.getRegisteredCharts().join(', ')}`);
        }
        
        return new ChartClass(containerId, options);
    };

    // Export to global scope
    window.BaseChart = BaseChart;

    console.log('BaseChart interface loaded successfully');

})();