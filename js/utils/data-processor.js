// Placeholder for data-processor.js
/* ===== ENHANCED DATA PROCESSOR ===== */
/* Enhanced global data processing utilities with multi-chart support */

window.DataProcessor = (function() {
    'use strict';

    // Configuration for different chart types
    const CHART_CONFIGS = {
        sankey: {
            requiredFields: ['nodes', 'links'],
            nodeFields: ['id', 'value', 'depth'],
            linkFields: ['source', 'target', 'value'],
            validation: {
                flowConservation: true,
                positiveValues: true,
                connectedGraph: true
            }
        },
        // Future chart types can be added here
        treemap: {
            requiredFields: ['nodes'],
            nodeFields: ['id', 'value', 'parent'],
            validation: {
                hierarchical: true,
                positiveValues: true
            }
        },
        network: {
            requiredFields: ['nodes', 'links'],
            nodeFields: ['id'],
            linkFields: ['source', 'target'],
            validation: {
                connectedGraph: false
            }
        }
    };

    // Standard scale configuration
    const DATA_STANDARDS = {
        expectedUnit: "millions",
        expectedRange: {
            minValue: 1,
            maxValue: 2000,
            optimalTotal: [100, 1000]
        },
        scaleDetection: {
            billions: { min: 1000, indicators: ['b', 'billion', 'bn'] },
            millions: { min: 1, max: 999, indicators: ['m', 'million', 'mm'] },
            thousands: { max: 0.999, indicators: ['k', 'thousand', 'kt'] },
            units: { max: 0.001, indicators: ['', 'dollars', 'usd'] }
        }
    };

    class EnhancedDataProcessor {
        constructor() {
            this.processingOptions = {
                validateFlowConservation: true,
                autoFixMinorIssues: true,
                toleranceLevel: 0.01,
                requirePositiveValues: true,
                enableCaching: true,
                logProcessingSteps: false
            };
            
            this.cache = new Map();
            this.processingHistory = [];
        }

        // === MAIN PROCESSING PIPELINE ===

        // Process data for any chart type
        processData(rawData, chartType = 'auto') {
            const startTime = performance.now();
            
            try {
                // Auto-detect chart type if not specified
                if (chartType === 'auto') {
                    chartType = this.detectChartType(rawData);
                }
                
                // Check cache first
                const cacheKey = this.generateCacheKey(rawData, chartType);
                if (this.processingOptions.enableCaching && this.cache.has(cacheKey)) {
                    console.log(`Using cached processed data for ${chartType}`);
                    return this.cache.get(cacheKey);
                }
                
                // Log processing start
                if (this.processingOptions.logProcessingSteps) {
                    console.log(`Starting data processing for ${chartType} chart`);
                }
                
                // Get chart-specific configuration
                const chartConfig = CHART_CONFIGS[chartType] || CHART_CONFIGS.sankey;
                
                // Step 1: Basic validation
                this.validateBasicStructure(rawData, chartConfig);
                
                // Step 2: Auto-scale data to standard units
                const scaledData = this.autoScaleData(rawData);
                
                // Step 3: Chart-specific processing
                const processedData = this.processForChartType(scaledData, chartType, chartConfig);
                
                // Step 4: Final validation
                this.validateProcessedData(processedData, chartConfig);
                
                // Step 5: Add processing metadata
                const finalData = this.addProcessingMetadata(processedData, chartType, startTime);
                
                // Cache the result
                if (this.processingOptions.enableCaching) {
                    this.cache.set(cacheKey, finalData);
                }
                
                // Log to history
                this.logProcessingResult(finalData, chartType, performance.now() - startTime);
                
                // Emit event if EventManager is available
                if (window.eventManager) {
                    window.eventManager.emit('data:processed', {
                        chartType,
                        nodeCount: finalData.nodes?.length || 0,
                        linkCount: finalData.links?.length || 0,
                        processingTime: performance.now() - startTime
                    });
                }
                
                return finalData;
                
            } catch (error) {
                // Report error if ErrorHandler is available
                if (window.errorHandler) {
                    window.errorHandler.reportError(error, {
                        component: 'dataProcessor',
                        chartType,
                        action: 'processData'
                    });
                }
                
                throw new Error(`Data processing failed: ${error.message}`);
            }
        }

        // === CHART TYPE DETECTION ===

        detectChartType(data) {
            // Simple heuristics to detect chart type
            if (data.nodes && data.links) {
                // Check for depth property (Sankey)
                if (data.nodes.some(node => node.depth !== undefined)) {
                    return 'sankey';
                }
                // Check for parent property (Tree)
                if (data.nodes.some(node => node.parent !== undefined)) {
                    return 'treemap';
                }
                // Default to network
                return 'network';
            }
            
            if (data.nodes && !data.links) {
                return 'treemap';
            }
            
            // Default fallback
            return 'sankey';
        }

        // === DATA SCALING ===

        autoScaleData(data) {
            if (!data.nodes || !Array.isArray(data.nodes)) {
                return data;
            }
            
            const scaleInfo = this.detectDataScale(data);
            
            if (scaleInfo.needsScaling) {
                const scaledData = this.convertToStandardScale(data, scaleInfo);
                
                if (this.processingOptions.logProcessingSteps) {
                    console.log(`Data scaled: ${scaleInfo.detectedScale} → standard millions`);
                }
                
                return scaledData;
            }
            
            return data;
        }

        detectDataScale(data) {
            const values = data.nodes
                .map(n => n.value)
                .filter(v => typeof v === 'number' && v > 0);
            
            if (values.length === 0) {
                return { needsScaling: false };
            }
            
            const maxValue = Math.max(...values);
            const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;
            
            let detectedScale = 'millions';
            let conversionFactor = 1;
            let needsScaling = false;
            
            // Enhanced scale detection
            if (maxValue >= 5000) {
                // Large numbers likely represent billions as integers
                detectedScale = 'billions_as_numbers';
                conversionFactor = 0.1; // 7800 → 780M
                needsScaling = true;
            } else if (maxValue >= 1000 && maxValue < 5000) {
                // Could be large millions or small billions
                detectedScale = 'large_millions';
                conversionFactor = 0.5; // Scale down for better display
                needsScaling = true;
            } else if (maxValue < 1) {
                // Decimal billions
                detectedScale = 'decimal_billions';
                conversionFactor = 1000; // 0.78 → 780M
                needsScaling = true;
            }
            
            // Check metadata for hints
            if (data.metadata?.unit) {
                const unit = data.metadata.unit.toLowerCase();
                if (unit.includes('billion')) {
                    detectedScale = 'billions';
                    conversionFactor = 1000;
                    needsScaling = true;
                } else if (unit.includes('thousand')) {
                    detectedScale = 'thousands';
                    conversionFactor = 0.001;
                    needsScaling = true;
                }
            }
            
            return {
                detectedScale,
                conversionFactor,
                needsScaling,
                maxValue,
                avgValue,
                confidence: this.calculateScaleConfidence(maxValue, avgValue, detectedScale)
            };
        }

        convertToStandardScale(data, scaleInfo) {
            const scaledData = this.deepClone(data);
            const factor = scaleInfo.conversionFactor;
            
            // Scale node values
            scaledData.nodes.forEach(node => {
                if (typeof node.value === 'number') {
                    node.originalValue = node.value;
                    node.value = parseFloat((node.value * factor).toFixed(2));
                }
            });
            
            // Scale link values
            if (scaledData.links) {
                scaledData.links.forEach(link => {
                    if (typeof link.value === 'number') {
                        link.originalValue = link.value;
                        link.value = parseFloat((link.value * factor).toFixed(2));
                    }
                });
            }
            
            // Update metadata
            scaledData.metadata = {
                ...scaledData.metadata,
                unit: 'millions',
                originalScale: scaleInfo.detectedScale,
                conversionFactor: factor,
                scalingApplied: true,
                scalingTimestamp: new Date().toISOString()
            };
            
            return scaledData;
        }

        calculateScaleConfidence(maxValue, avgValue, detectedScale) {
            // Simple confidence calculation
            if (detectedScale === 'billions_as_numbers' && maxValue > 5000) return 'high';
            if (detectedScale === 'millions' && maxValue >= 100 && maxValue < 1000) return 'high';
            if (detectedScale === 'decimal_billions' && maxValue < 1) return 'high';
            return 'medium';
        }

        // === CHART-SPECIFIC PROCESSING ===

        processForChartType(data, chartType, config) {
            switch (chartType) {
                case 'sankey':
                    return this.processSankeyData(data, config);
                case 'treemap':
                    return this.processTreemapData(data, config);
                case 'network':
                    return this.processNetworkData(data, config);
                default:
                    return this.processSankeyData(data, config); // Default fallback
            }
        }

        processSankeyData(data, config) {
            const processedData = this.deepClone(data);
            
            // Process nodes
            processedData.nodes.forEach((node, index) => {
                // Ensure required fields
                if (!node.id) {
                    throw new Error(`Node at index ${index} missing required 'id' field`);
                }
                if (node.value === undefined) {
                    throw new Error(`Node '${node.id}' missing required 'value' field`);
                }
                if (node.depth === undefined) {
                    throw new Error(`Node '${node.id}' missing required 'depth' field`);
                }
                
                // Add default properties
                node.category = node.category || 'default';
                node.description = node.description || '';
                
                // Initialize relationship arrays
                node.sourceLinks = [];
                node.targetLinks = [];
            });
            
            // Process links and build relationships
            const nodeMap = new Map(processedData.nodes.map(n => [n.id, n]));
            
            processedData.links.forEach((link, index) => {
                // Validate link
                if (!link.source || !link.target) {
                    throw new Error(`Link at index ${index} missing source or target`);
                }
                if (link.value === undefined) {
                    throw new Error(`Link at index ${index} missing value`);
                }
                
                // Get node references
                const sourceNode = nodeMap.get(link.source);
                const targetNode = nodeMap.get(link.target);
                
                if (!sourceNode) {
                    throw new Error(`Link source '${link.source}' not found in nodes`);
                }
                if (!targetNode) {
                    throw new Error(`Link target '${link.target}' not found in nodes`);
                }
                
                // Update link with node references
                link.sourceNode = sourceNode;
                link.targetNode = targetNode;
                link.type = link.type || 'default';
                
                // Build relationships
                sourceNode.sourceLinks.push(link);
                targetNode.targetLinks.push(link);
            });
            
            // Validate flow conservation if enabled
            if (config.validation?.flowConservation) {
                this.validateFlowConservation(processedData);
            }
            
            return processedData;
        }

        processTreemapData(data, config) {
            // Basic treemap processing
            const processedData = this.deepClone(data);
            
            processedData.nodes.forEach(node => {
                if (!node.id) {
                    throw new Error('Treemap nodes must have an id');
                }
                if (node.value === undefined) {
                    throw new Error(`Node '${node.id}' missing value field`);
                }
                
                node.parent = node.parent || null;
                node.children = node.children || [];
            });
            
            return processedData;
        }

        processNetworkData(data, config) {
            // Basic network processing
            const processedData = this.deepClone(data);
            
            processedData.nodes.forEach(node => {
                if (!node.id) {
                    throw new Error('Network nodes must have an id');
                }
                
                node.connections = node.connections || [];
            });
            
            if (processedData.links) {
                processedData.links.forEach(link => {
                    if (!link.source || !link.target) {
                        throw new Error('Network links must have source and target');
                    }
                });
            }
            
            return processedData;
        }

        // === VALIDATION METHODS ===

        validateBasicStructure(data, config) {
            if (!data || typeof data !== 'object') {
                throw new Error('Data must be an object');
            }
            
            // Check required fields
            config.requiredFields.forEach(field => {
                if (!data[field]) {
                    throw new Error(`Data missing required field: ${field}`);
                }
                if (!Array.isArray(data[field])) {
                    throw new Error(`Field '${field}' must be an array`);
                }
                if (data[field].length === 0) {
                    throw new Error(`Field '${field}' cannot be empty`);
                }
            });
        }

        validateProcessedData(data, config) {
            // Validate node structure
            if (data.nodes) {
                data.nodes.forEach((node, index) => {
                    config.nodeFields.forEach(field => {
                        if (node[field] === undefined) {
                            throw new Error(`Node at index ${index} missing field: ${field}`);
                        }
                    });
                    
                    // Check positive values if required
                    if (config.validation?.positiveValues && node.value !== undefined && node.value <= 0) {
                        throw new Error(`Node '${node.id}' has non-positive value: ${node.value}`);
                    }
                });
            }
            
            // Validate link structure
            if (data.links && config.linkFields) {
                data.links.forEach((link, index) => {
                    config.linkFields.forEach(field => {
                        if (link[field] === undefined) {
                            throw new Error(`Link at index ${index} missing field: ${field}`);
                        }
                    });
                    
                    // Check positive values if required
                    if (config.validation?.positiveValues && link.value !== undefined && link.value <= 0) {
                        throw new Error(`Link at index ${index} has non-positive value: ${link.value}`);
                    }
                });
            }
        }

        validateFlowConservation(data) {
            const issues = [];
            const tolerance = this.processingOptions.toleranceLevel;
            
            data.nodes.forEach(node => {
                const totalInflow = node.targetLinks.reduce((sum, link) => sum + link.value, 0);
                const totalOutflow = node.sourceLinks.reduce((sum, link) => sum + link.value, 0);
                
                // Check different node types
                const isSource = totalInflow === 0 && totalOutflow > 0;
                const isSink = totalOutflow === 0 && totalInflow > 0;
                const isIntermediate = totalInflow > 0 && totalOutflow > 0;
                
                if (isSource && Math.abs(totalOutflow - node.value) > tolerance) {
                    issues.push(`Source node '${node.id}': outflow ${totalOutflow} ≠ value ${node.value}`);
                } else if (isSink && Math.abs(totalInflow - node.value) > tolerance) {
                    issues.push(`Sink node '${node.id}': inflow ${totalInflow} ≠ value ${node.value}`);
                } else if (isIntermediate && Math.abs(totalInflow - totalOutflow) > tolerance) {
                    issues.push(`Intermediate node '${node.id}': inflow ${totalInflow} ≠ outflow ${totalOutflow}`);
                }
            });
            
            if (issues.length > 0 && this.processingOptions.logProcessingSteps) {
                console.warn('Flow conservation issues:', issues);
            }
            
            return issues;
        }

        // === METADATA AND UTILITIES ===

        addProcessingMetadata(data, chartType, startTime) {
            const processingTime = performance.now() - startTime;
            
            const finalData = {
                ...data,
                metadata: {
                    ...data.metadata,
                    chartType,
                    processed: true,
                    processingTime: Math.round(processingTime * 100) / 100,
                    processedAt: new Date().toISOString(),
                    processor: 'EnhancedDataProcessor',
                    version: '2.0.0'
                }
            };
            
            return finalData;
        }

        logProcessingResult(data, chartType, processingTime) {
            this.processingHistory.push({
                timestamp: Date.now(),
                chartType,
                nodeCount: data.nodes?.length || 0,
                linkCount: data.links?.length || 0,
                processingTime: Math.round(processingTime * 100) / 100,
                success: true
            });
            
            // Keep only last 50 processing results
            if (this.processingHistory.length > 50) {
                this.processingHistory.shift();
            }
        }

        generateCacheKey(data, chartType) {
            // Simple hash generation for caching
            const str = JSON.stringify({ data, chartType });
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // Convert to 32bit integer
            }
            return hash.toString();
        }

        deepClone(obj) {
            if (obj === null || typeof obj !== 'object') return obj;
            if (obj instanceof Date) return new Date(obj.getTime());
            if (obj instanceof Array) return obj.map(item => this.deepClone(item));
            
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = this.deepClone(obj[key]);
            });
            return cloned;
        }

        // === PUBLIC API ===

        // Validate data for specific chart type
        validateForChartType(data, chartType) {
            try {
                const config = CHART_CONFIGS[chartType];
                if (!config) {
                    throw new Error(`Unknown chart type: ${chartType}`);
                }
                
                this.validateBasicStructure(data, config);
                return { valid: true, chartType };
            } catch (error) {
                return { valid: false, error: error.message, chartType };
            }
        }

        // Get recommended chart types for data
        getRecommendedChartTypes(data) {
            const recommendations = [];
            
            Object.keys(CHART_CONFIGS).forEach(chartType => {
                const validation = this.validateForChartType(data, chartType);
                if (validation.valid) {
                    recommendations.push({
                        chartType,
                        compatibility: this.calculateCompatibilityScore(data, chartType),
                        config: CHART_CONFIGS[chartType]
                    });
                }
            });
            
            return recommendations.sort((a, b) => b.compatibility - a.compatibility);
        }

        calculateCompatibilityScore(data, chartType) {
            let score = 50; // Base score
            
            const config = CHART_CONFIGS[chartType];
            if (!config) return 0;
            
            // Check required fields
            const hasAllFields = config.requiredFields.every(field => data[field]);
            if (hasAllFields) score += 30;
            
            // Chart-specific scoring
            if (chartType === 'sankey' && data.nodes) {
                const nodeCount = data.nodes.length;
                if (nodeCount >= 5 && nodeCount <= 50) score += 20;
                
                // Check for depth property
                if (data.nodes.some(n => n.depth !== undefined)) score += 20;
            }
            
            return Math.min(100, score);
        }

        // Format values for display
        formatValue(value, format = 'currency') {
            if (typeof value !== 'number') return value;
            
            switch (format) {
                case 'currency':
                    if (value >= 1000) {
                        return `$${(value / 1000).toFixed(1)}B`;
                    } else if (value >= 1) {
                        return `$${value.toFixed(1)}M`;
                    } else {
                        return `$${(value * 1000).toFixed(0)}K`;
                    }
                case 'number':
                    return new Intl.NumberFormat().format(value);
                case 'percentage':
                    return `${(value * 100).toFixed(1)}%`;
                default:
                    return value.toString();
            }
        }

        // Text wrapping utility
        wrapText(text, maxLength = 15) {
            if (!text || text.length <= maxLength) return [text];
            
            const words = text.split(' ');
            const lines = [];
            let currentLine = '';
            
            words.forEach(word => {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                if (testLine.length <= maxLength) {
                    currentLine = testLine;
                } else {
                    if (currentLine) lines.push(currentLine);
                    currentLine = word;
                }
            });
            
            if (currentLine) lines.push(currentLine);
            return lines.length > 2 ? [lines[0], lines[1] + '...'] : lines;
        }

        // === DEBUGGING AND ANALYTICS ===

        getStats() {
            return {
                processingHistory: this.processingHistory.slice(-10),
                cacheSize: this.cache.size,
                supportedChartTypes: Object.keys(CHART_CONFIGS),
                processingOptions: { ...this.processingOptions },
                averageProcessingTime: this.getAverageProcessingTime()
            };
        }

        getAverageProcessingTime() {
            if (this.processingHistory.length === 0) return 0;
            
            const totalTime = this.processingHistory.reduce((sum, entry) => sum + entry.processingTime, 0);
            return Math.round((totalTime / this.processingHistory.length) * 100) / 100;
        }

        clearCache() {
            this.cache.clear();
            console.log('Data processor cache cleared');
        }

        debug() {
            console.group('Enhanced Data Processor Debug');
            console.log('Stats:', this.getStats());
            console.log('Chart Configs:', CHART_CONFIGS);
            console.log('Data Standards:', DATA_STANDARDS);
            console.groupEnd();
            
            return this.getStats();
        }
    }

    // Create singleton instance
    const enhancedProcessor = new EnhancedDataProcessor();

    // Export both the class and instance
    return {
        // Legacy API for compatibility
        processFinancialData: (data) => enhancedProcessor.processData(data, 'sankey'),
        validateFlowBalance: (data) => enhancedProcessor.validateFlowConservation(data),
        formatValue: (value, metadata) => enhancedProcessor.formatValue(value, 'currency'),
        wrapText: (text, maxLength) => enhancedProcessor.wrapText(text, maxLength),
        
        // Enhanced API
        processData: (data, chartType) => enhancedProcessor.processData(data, chartType),
        validateForChartType: (data, chartType) => enhancedProcessor.validateForChartType(data, chartType),
        getRecommendedChartTypes: (data) => enhancedProcessor.getRecommendedChartTypes(data),
        detectChartType: (data) => enhancedProcessor.detectChartType(data),
        
        // Validation utilities
        validate: {
            data: function(data, chartType = 'auto') {
                try {
                    enhancedProcessor.processData(data, chartType);
                    return { valid: true };
                } catch (error) {
                    return { valid: false, error: error.message };
                }
            },
            balance: function(data) {
                try {
                    const issues = enhancedProcessor.validateFlowConservation(data);
                    return { balanced: issues.length === 0, issues };
                } catch (error) {
                    return { balanced: false, error: error.message };
                }
            }
        },
        
        // Utility methods
        formatValue: (value, format) => enhancedProcessor.formatValue(value, format),
        wrapText: (text, maxLength) => enhancedProcessor.wrapText(text, maxLength),
        
        // Advanced features
        getStats: () => enhancedProcessor.getStats(),
        clearCache: () => enhancedProcessor.clearCache(),
        debug: () => enhancedProcessor.debug(),
        
        // Configuration
        setOptions: (options) => {
            Object.assign(enhancedProcessor.processingOptions, options);
        },
        
        // Access to processor instance
        processor: enhancedProcessor
    };
})();