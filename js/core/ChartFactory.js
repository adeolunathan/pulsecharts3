// Placeholder for ChartFactory.js
/* ===== CHART FACTORY ===== */
/* Manages chart type registration and dynamic instantiation */

(function() {
    'use strict';

    class ChartFactory {
        constructor() {
            this.chartRegistry = new Map();
            this.dataProcessors = new Map();
            this.chartInstances = new Map();
            this.defaultConfigs = new Map();
            
            // Chart type metadata
            this.chartMetadata = new Map();
            
            console.log('ChartFactory initialized');
        }

        // === CHART REGISTRATION ===

        registerChart(chartType, chartClass, metadata = {}) {
            // Validate chart class
            if (!chartClass || typeof chartClass !== 'function') {
                throw new Error(`Invalid chart class for type '${chartType}'`);
            }

            // Check if extends BaseChart (if BaseChart is available)
            if (window.BaseChart && !(chartClass.prototype instanceof window.BaseChart)) {
                console.warn(`Chart '${chartType}' does not extend BaseChart. Consider extending BaseChart for full compatibility.`);
            }

            // Register the chart
            this.chartRegistry.set(chartType, chartClass);
            
            // Store metadata
            const defaultMetadata = {
                name: chartType,
                description: `${chartType} chart visualization`,
                category: 'general',
                dataRequirements: ['nodes', 'links'], // Default for flow charts
                capabilities: {
                    supportsExport: false,
                    supportsInteraction: false,
                    supportsAnimation: false,
                    supportsResize: false,
                    supportedFormats: []
                },
                version: '1.0.0',
                author: 'Pulse Financial Insights',
                ...metadata
            };
            
            this.chartMetadata.set(chartType, defaultMetadata);
            
            // Register with BaseChart if available
            if (window.BaseChart && window.BaseChart.registerChart) {
                window.BaseChart.registerChart(chartType, chartClass);
            }
            
            console.log(`Chart type '${chartType}' registered successfully`);
            return this;
        }

        // Register data processor for specific chart type
        registerDataProcessor(chartType, processorClass) {
            if (!processorClass || typeof processorClass !== 'function') {
                throw new Error(`Invalid data processor class for type '${chartType}'`);
            }

            this.dataProcessors.set(chartType, processorClass);
            console.log(`Data processor for '${chartType}' registered successfully`);
            return this;
        }

        // Register default configuration for chart type
        registerDefaultConfig(chartType, config) {
            this.defaultConfigs.set(chartType, config);
            console.log(`Default config for '${chartType}' registered successfully`);
            return this;
        }

        // === CHART CREATION ===

        createChart(chartType, containerId, options = {}) {
            // Validate chart type
            if (!this.chartRegistry.has(chartType)) {
                const availableTypes = this.getAvailableChartTypes();
                throw new Error(`Unknown chart type: '${chartType}'. Available types: ${availableTypes.join(', ')}`);
            }

            // Validate container
            const container = d3.select(`#${containerId}`);
            if (container.empty()) {
                throw new Error(`Container with id '${containerId}' not found`);
            }

            try {
                // Get chart class
                const ChartClass = this.chartRegistry.get(chartType);
                
                // Merge with default config if available
                const defaultConfig = this.defaultConfigs.get(chartType) || {};
                const finalOptions = { ...defaultConfig, ...options };
                
                // Create chart instance
                const chartInstance = new ChartClass(containerId, finalOptions);
                
                // Initialize if it has initialize method
                if (typeof chartInstance.initialize === 'function') {
                    chartInstance.initialize();
                }
                
                // Store instance for management
                const instanceId = this.generateInstanceId(chartType, containerId);
                this.chartInstances.set(instanceId, {
                    instance: chartInstance,
                    chartType,
                    containerId,
                    createdAt: new Date().toISOString(),
                    metadata: this.chartMetadata.get(chartType)
                });
                
                // Add instance ID to chart for reference
                chartInstance._factoryInstanceId = instanceId;
                
                console.log(`Chart '${chartType}' created successfully in container '${containerId}'`);
                
                return chartInstance;
                
            } catch (error) {
                console.error(`Failed to create chart '${chartType}':`, error);
                
                // Report to error handler if available
                if (window.ErrorHandler) {
                    window.ErrorHandler.reportError(error, {
                        component: 'chartFactory',
                        action: 'createChart',
                        chartType,
                        containerId
                    });
                }
                
                throw error;
            }
        }

        // === CHART MANAGEMENT ===

        // Get chart instance by container ID
        getChartByContainer(containerId) {
            for (const [instanceId, chartInfo] of this.chartInstances) {
                if (chartInfo.containerId === containerId) {
                    return chartInfo.instance;
                }
            }
            return null;
        }

        // Get all chart instances of a specific type
        getChartsByType(chartType) {
            const charts = [];
            for (const [instanceId, chartInfo] of this.chartInstances) {
                if (chartInfo.chartType === chartType) {
                    charts.push(chartInfo.instance);
                }
            }
            return charts;
        }

        // Get all active chart instances
        getAllCharts() {
            return Array.from(this.chartInstances.values()).map(info => info.instance);
        }

        // Destroy specific chart instance
        destroyChart(instanceIdOrContainer) {
            let targetInstanceId = null;
            let chartInfo = null;
            
            // Find by instance ID or container ID
            if (this.chartInstances.has(instanceIdOrContainer)) {
                targetInstanceId = instanceIdOrContainer;
                chartInfo = this.chartInstances.get(instanceIdOrContainer);
            } else {
                // Search by container ID
                for (const [instanceId, info] of this.chartInstances) {
                    if (info.containerId === instanceIdOrContainer) {
                        targetInstanceId = instanceId;
                        chartInfo = info;
                        break;
                    }
                }
            }
            
            if (!chartInfo) {
                console.warn(`Chart instance not found: ${instanceIdOrContainer}`);
                return false;
            }
            
            try {
                // Destroy chart if it has destroy method
                if (typeof chartInfo.instance.destroy === 'function') {
                    chartInfo.instance.destroy();
                }
                
                // Remove from registry
                this.chartInstances.delete(targetInstanceId);
                
                console.log(`Chart instance '${targetInstanceId}' destroyed successfully`);
                return true;
                
            } catch (error) {
                console.error(`Error destroying chart instance '${targetInstanceId}':`, error);
                return false;
            }
        }

        // Destroy all chart instances
        destroyAllCharts() {
            const instanceIds = Array.from(this.chartInstances.keys());
            let destroyed = 0;
            
            instanceIds.forEach(instanceId => {
                if (this.destroyChart(instanceId)) {
                    destroyed++;
                }
            });
            
            console.log(`Destroyed ${destroyed} chart instances`);
            return destroyed;
        }

        // === DATA COMPATIBILITY ===

        // Check if data is compatible with chart type
        isDataCompatible(chartType, data) {
            const metadata = this.chartMetadata.get(chartType);
            if (!metadata) {
                console.warn(`No metadata found for chart type '${chartType}'`);
                return false;
            }
            
            const requirements = metadata.dataRequirements || [];
            
            // Basic validation
            if (!data || typeof data !== 'object') {
                return false;
            }
            
            // Check required properties
            for (const requirement of requirements) {
                if (!(requirement in data)) {
                    console.warn(`Data missing required property '${requirement}' for chart type '${chartType}'`);
                    return false;
                }
                
                // Check if required property is array and not empty
                if (Array.isArray(data[requirement]) && data[requirement].length === 0) {
                    console.warn(`Required property '${requirement}' is empty for chart type '${chartType}'`);
                    return false;
                }
            }
            
            return true;
        }

        // Get recommended chart types for given data
        getRecommendedChartTypes(data) {
            const recommendations = [];
            
            for (const [chartType, metadata] of this.chartMetadata) {
                if (this.isDataCompatible(chartType, data)) {
                    recommendations.push({
                        chartType,
                        metadata,
                        compatibility: this.calculateCompatibilityScore(chartType, data)
                    });
                }
            }
            
            // Sort by compatibility score
            recommendations.sort((a, b) => b.compatibility - a.compatibility);
            
            return recommendations;
        }

        // Calculate compatibility score (0-100)
        calculateCompatibilityScore(chartType, data) {
            let score = 50; // Base score
            
            const metadata = this.chartMetadata.get(chartType);
            if (!metadata) return 0;
            
            // Bonus for having all required properties
            const requirements = metadata.dataRequirements || [];
            const hasAllRequirements = requirements.every(req => req in data);
            if (hasAllRequirements) score += 30;
            
            // Bonus for data size appropriateness
            if (data.nodes && data.nodes.length > 0) {
                const nodeCount = data.nodes.length;
                if (chartType === 'sankey' && nodeCount >= 5 && nodeCount <= 50) {
                    score += 20; // Sweet spot for Sankey charts
                }
            }
            
            return Math.min(100, score);
        }

        // === QUERY METHODS ===

        getAvailableChartTypes() {
            return Array.from(this.chartRegistry.keys());
        }

        getChartMetadata(chartType) {
            return this.chartMetadata.get(chartType);
        }

        getAllChartMetadata() {
            return Object.fromEntries(this.chartMetadata.entries());
        }

        hasChartType(chartType) {
            return this.chartRegistry.has(chartType);
        }

        getChartCapabilities(chartType) {
            const metadata = this.chartMetadata.get(chartType);
            return metadata ? metadata.capabilities : null;
        }

        // === BATCH OPERATIONS ===

        // Create multiple charts from configuration
        createChartsFromConfig(chartsConfig) {
            const results = [];
            
            chartsConfig.forEach(config => {
                try {
                    const { chartType, containerId, options } = config;
                    const chart = this.createChart(chartType, containerId, options);
                    results.push({ success: true, chart, containerId });
                } catch (error) {
                    results.push({ success: false, error: error.message, containerId: config.containerId });
                }
            });
            
            return results;
        }

        // Update all charts of a specific type
        updateChartsByType(chartType, updateFunction) {
            const charts = this.getChartsByType(chartType);
            const results = [];
            
            charts.forEach(chart => {
                try {
                    updateFunction(chart);
                    results.push({ success: true, chart });
                } catch (error) {
                    results.push({ success: false, error: error.message, chart });
                }
            });
            
            return results;
        }

        // === UTILITY METHODS ===

        generateInstanceId(chartType, containerId) {
            const timestamp = Date.now().toString(36);
            const random = Math.random().toString(36).substr(2, 5);
            return `${chartType}-${containerId}-${timestamp}-${random}`;
        }

        // === DEBUGGING AND ANALYTICS ===

        getFactoryStatus() {
            return {
                registeredChartTypes: this.getAvailableChartTypes(),
                activeInstances: this.chartInstances.size,
                registeredDataProcessors: Array.from(this.dataProcessors.keys()),
                chartTypesWithDefaults: Array.from(this.defaultConfigs.keys()),
                instanceBreakdown: this.getInstanceBreakdown()
            };
        }

        getInstanceBreakdown() {
            const breakdown = {};
            
            for (const [instanceId, chartInfo] of this.chartInstances) {
                const type = chartInfo.chartType;
                if (!breakdown[type]) {
                    breakdown[type] = 0;
                }
                breakdown[type]++;
            }
            
            return breakdown;
        }

        debug() {
            console.group('ChartFactory Debug');
            console.log('Status:', this.getFactoryStatus());
            console.log('Chart Metadata:', this.getAllChartMetadata());
            console.log('Active Instances:', Array.from(this.chartInstances.entries()));
            console.groupEnd();
            
            return this.getFactoryStatus();
        }

        // === CLEANUP ===

        cleanup() {
            console.log('ChartFactory cleanup started');
            
            // Destroy all chart instances
            this.destroyAllCharts();
            
            // Clear registries
            this.chartRegistry.clear();
            this.dataProcessors.clear();
            this.chartInstances.clear();
            this.defaultConfigs.clear();
            this.chartMetadata.clear();
            
            console.log('ChartFactory cleanup completed');
        }
    }

    // Create singleton instance
    const chartFactory = new ChartFactory();

    // Export both the class and singleton instance
    window.ChartFactory = ChartFactory;
    window.chartFactory = chartFactory;

    console.log('ChartFactory loaded successfully');

})();