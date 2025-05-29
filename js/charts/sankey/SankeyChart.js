/* ===== SANKEY CHART - UPDATED FOR NEW ARCHITECTURE ===== */
/* Main orchestrator extending BaseChart with modular architecture */

(function() {
    'use strict';

    class SankeyChart extends window.BaseChart {
        constructor(containerId, options = {}) {
            // Call parent constructor
            super(containerId, 'sankey');
            
            // Set chart capabilities
            this.capabilities = {
                supportsExport: true,
                supportsInteraction: true,
                supportsAnimation: true,
                supportsResize: true,
                supportedFormats: ['png', 'svg', 'csv']
            };
            
            // Module instances - dependency injection pattern
            this.modules = {};
            
            // Chart-specific state
            this.chartState = {
                layoutData: null,
                renderingInProgress: false,
                lastUpdateType: null
            };
            
            // Initialize with options
            this.options = options;
            
            // Initialize all modules in correct order
            this.initializeModules();
            
            console.log(`SankeyChart initialized for container: ${containerId}`);
        }

        // Initialize all modules with proper dependencies
        initializeModules() {
            try {
                // 1. Configuration (no dependencies)
                this.modules.config = new SankeyConfig(this.options);
                
                // 2. Data Processor (no dependencies) 
                this.modules.dataProcessor = new SankeyDataProcessor();
                
                // 3. Layout (depends on config)
                this.modules.layout = new SankeyLayout(this.modules.config);
                
                // 4. Renderer (depends on config)
                this.modules.renderer = new SankeyRenderer(this.containerId, this.modules.config);
                
                // 5. Interactions (depends on renderer and config)
                this.modules.interactions = new SankeyInteractions(
                    this.modules.renderer, 
                    this.modules.config
                );
                
                // 6. Export (depends on renderer and config)
                this.modules.export = new SankeyExport(
                    this.modules.renderer, 
                    this.modules.config
                );
                
                // Bind interactions after all modules are ready
                this.modules.interactions.bindEvents();
                
                console.log('SankeyChart modules initialized successfully');
                
            } catch (error) {
                this.handleError(error, 'Module Initialization');
                throw new Error(`Failed to initialize Sankey chart modules: ${error.message}`);
            }
        }

        // === MAIN RENDER METHOD (implements BaseChart abstract method) ===
        
        render(data) {
            try {
                // Start performance tracking
                this.startRenderTimer();
                
                // Validate that we're ready
                if (!this.isReady()) {
                    throw new Error('Chart not ready for rendering');
                }
                
                console.log('Starting Sankey chart render pipeline...');
                
                // Emit render start event
                this.emit('renderStart', { 
                    nodeCount: data.nodes?.length || 0,
                    linkCount: data.links?.length || 0 
                });
                
                // Step 1: Process and validate data
                const processedData = this.coordinateDataProcessing(data);
                
                // Step 2: Calculate layout
                const layoutData = this.coordinateLayoutCalculation(processedData);
                
                // Step 3: Render visual elements
                this.coordinateRendering(layoutData, processedData.metadata);
                
                // Step 4: Update interaction handlers
                this.coordinateInteractionUpdate();
                
                // Step 5: Update state
                this.state.currentData = processedData;
                this.chartState.layoutData = layoutData;
                this.chartState.lastUpdateType = 'full';
                
                // Stop performance tracking
                this.endRenderTimer();
                
                // Emit render complete event
                this.emit('renderComplete', { 
                    renderTime: this.performance.renderTimes.slice(-1)[0],
                    nodeCount: processedData.nodes.length,
                    linkCount: processedData.links.length
                });
                
                console.log('Sankey chart render pipeline completed successfully');
                return this;
                
            } catch (error) {
                this.handleError(error, 'Render Pipeline');
                this.emit('renderError', { error: error.message });
                throw error;
            }
        }

        // === COORDINATION METHODS ===

        // Coordinate data processing across modules
        coordinateDataProcessing(rawData) {
            try {
                console.log('Processing Sankey data...');
                
                // Use chart-specific data processor
                const processedData = this.modules.dataProcessor.processData(rawData);
                
                // Emit data processed event
                this.emit('dataProcessed', {
                    nodeCount: processedData.nodes.length,
                    linkCount: processedData.links.length
                });
                
                return processedData;
                
            } catch (error) {
                throw new Error(`Sankey data processing failed: ${error.message}`);
            }
        }

        // Coordinate layout calculation
        coordinateLayoutCalculation(processedData) {
            try {
                console.log('Calculating Sankey layout...');
                
                // Get current dimensions from configuration
                const dimensions = this.modules.config.getDimensions();
                
                // Calculate layout using processed data
                const layoutData = this.modules.layout.calculateLayout(
                    processedData.nodes,
                    processedData.links,
                    dimensions
                );
                
                console.log(`Layout calculated: ${layoutData.nodes.length} nodes, ${layoutData.links.length} links`);
                return layoutData;
                
            } catch (error) {
                throw new Error(`Sankey layout calculation failed: ${error.message}`);
            }
        }

        // Coordinate rendering across modules
        coordinateRendering(layoutData, metadata) {
            try {
                console.log('Rendering Sankey chart elements...');
                
                // Set rendering flag
                this.chartState.renderingInProgress = true;
                
                // Render using the renderer module
                this.modules.renderer.renderChart(layoutData, metadata);
                
                // Clear rendering flag
                this.chartState.renderingInProgress = false;
                
                console.log('Sankey chart rendering completed');
                
            } catch (error) {
                this.chartState.renderingInProgress = false;
                throw new Error(`Sankey rendering failed: ${error.message}`);
            }
        }

        // Coordinate interaction updates
        coordinateInteractionUpdate() {
            try {
                // Rebind events to new elements
                this.modules.interactions.unbindEvents();
                this.modules.interactions.bindEvents();
                
            } catch (error) {
                console.warn('Sankey interaction update failed:', error.message);
                // Non-critical error, continue execution
            }
        }

        // === BASEHART IMPLEMENTATION METHODS ===

        // Override BaseChart's resize method
        resize(width, height) {
            try {
                if (width) this.modules.config.set('layout.width', width);
                if (height) this.modules.config.set('layout.height', height);
                
                // Update renderer dimensions
                this.modules.renderer.updateSVGDimensions({ width, height });
                
                // Re-render if we have data
                if (this.state.currentData) {
                    this.render(this.state.currentData);
                }
                
                // Emit resize event
                this.emit('resized', { width, height });
                
                console.log(`Sankey chart resized to: ${width}x${height}`);
                return this;
                
            } catch (error) {
                this.handleError(error, 'Resize');
                return this;
            }
        }

        // Override BaseChart's validateData method
        validateData(data) {
            if (!super.validateData(data)) {
                return false;
            }
            
            // Sankey-specific validation
            if (!data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0) {
                throw new Error('Sankey chart requires a non-empty nodes array');
            }
            
            if (!data.links || !Array.isArray(data.links) || data.links.length === 0) {
                throw new Error('Sankey chart requires a non-empty links array');
            }
            
            return true;
        }

        // Override BaseChart's cleanup method
        cleanup() {
            super.cleanup();
            
            // Cleanup Sankey-specific resources
            if (this.modules.interactions) {
                this.modules.interactions.destroy();
            }
            
            if (this.modules.renderer) {
                this.modules.renderer.clearChart();
            }
            
            // Clear chart state
            this.chartState = {
                layoutData: null,
                renderingInProgress: false,
                lastUpdateType: null
            };
        }

        // === SANKEY-SPECIFIC PUBLIC API ===

        // Update data and re-render
        updateData(newData) {
            this.emit('dataUpdateStart', { source: 'external' });
            return this.render(newData);
        }

        // Set global curve intensity
        setCurveIntensity(intensity) {
            try {
                this.modules.config.set('curvature.curveIntensity', intensity);
                
                if (this.state.currentData) {
                    this.partialUpdate('curvature');
                }
                
                return this;
            } catch (error) {
                this.handleError(error, 'Set Curve Intensity');
                return this;
            }
        }

        // Set layer-specific curvature
        setLayerCurvature(layer, intensity) {
            try {
                const layerCurvature = this.modules.config.get('curvature.layerCurvature');
                layerCurvature[layer] = intensity;
                this.modules.config.set('curvature.layerCurvature', layerCurvature);
                
                if (this.state.currentData) {
                    this.partialUpdate('curvature');
                }
                
                console.log(`Layer ${layer} curvature set to: ${intensity}`);
                return this;
            } catch (error) {
                this.handleError(error, 'Set Layer Curvature');
                return this;
            }
        }

        // Apply curvature preset
        applyCurvaturePreset(presetName) {
            try {
                this.modules.config.applyPreset(presetName);
                
                if (this.state.currentData) {
                    this.partialUpdate('curvature');
                }
                
                console.log(`Applied curvature preset: ${presetName}`);
                return this;
            } catch (error) {
                this.handleError(error, 'Apply Curvature Preset');
                return this;
            }
        }

        // Comprehensive customization
        customize(options = {}) {
            try {
                // Update configuration with provided options
                this.modules.config.update(options);
                
                // Determine update type needed
                const updateType = this.determineUpdateType(options);
                
                if (this.state.currentData) {
                    if (updateType === 'full') {
                        this.render(this.state.currentData);
                    } else {
                        this.partialUpdate(updateType);
                    }
                }
                
                console.log('Sankey chart customization applied:', Object.keys(options));
                return this;
            } catch (error) {
                this.handleError(error, 'Customize');
                return this;
            }
        }

        // Partial update for performance
        partialUpdate(updateType) {
            if (!this.state.currentData || !this.chartState.layoutData) {
                console.warn('No data available for partial update');
                return this;
            }
            
            try {
                this.startRenderTimer();
                
                switch (updateType) {
                    case 'curvature':
                        // Recalculate link positions only
                        this.modules.layout.calculateLinkPositions(this.chartState.layoutData.links);
                        this.modules.renderer.renderLinks(this.chartState.layoutData.links);
                        break;
                        
                    case 'colors':
                        // Re-render with new colors
                        this.modules.renderer.renderChart(this.chartState.layoutData, this.state.currentData.metadata);
                        break;
                        
                    case 'spacing':
                        // Recalculate layout and re-render
                        this.chartState.layoutData = this.coordinateLayoutCalculation(this.state.currentData);
                        this.modules.renderer.renderChart(this.chartState.layoutData, this.state.currentData.metadata);
                        break;
                        
                    default:
                        // Full update
                        this.render(this.state.currentData);
                        return this;
                }
                
                this.chartState.lastUpdateType = updateType;
                this.endRenderTimer();
                
                this.emit('partialUpdate', { updateType });
                
            } catch (error) {
                this.handleError(error, 'Partial Update');
            }
            
            return this;
        }

        // Determine what type of update is needed
        determineUpdateType(options) {
            const fullUpdateKeys = [
                'width', 'height', 'nodeWidth', 'nodeHeightScale', 'linkWidthScale',
                'nodePadding', 'autoCenter', 'autoMiddleAlign', 'centeringOffset',
                'leftmostSpacingMultiplier', 'middleSpacingMultiplier', 'rightmostSpacingMultiplier'
            ];
            
            const spacingKeys = ['nodePadding', 'leftmostSpacingMultiplier', 'middleSpacingMultiplier', 'rightmostSpacingMultiplier'];
            const curvatureKeys = ['curveIntensity', 'layerCurvature'];
            
            const changedKeys = Object.keys(options);
            
            if (changedKeys.some(key => fullUpdateKeys.includes(key))) {
                return 'full';
            } else if (changedKeys.some(key => spacingKeys.includes(key))) {
                return 'spacing';
            } else if (changedKeys.some(key => curvatureKeys.includes(key))) {
                return 'curvature';
            } else {
                return 'colors';
            }
        }

        // === EXPORT API METHODS ===

        // Export as PNG (implements BaseChart abstract method)
        exportToPNG(filename, options) {
            return this.modules.export.exportToPNG(filename, options)
                .then(result => {
                    this.emit('exported', { format: 'png', filename, success: true });
                    return result;
                })
                .catch(error => {
                    this.emit('exportError', { format: 'png', filename, error: error.message });
                    throw error;
                });
        }

        // Export as SVG (implements BaseChart abstract method)
        exportToSVG(filename, options) {
            return this.modules.export.exportToSVG(filename, options)
                .then(result => {
                    this.emit('exported', { format: 'svg', filename, success: true });
                    return result;
                })
                .catch(error => {
                    this.emit('exportError', { format: 'svg', filename, error: error.message });
                    throw error;
                });
        }

        // Export data (implements BaseChart abstract method)
        exportData(filename, options) {
            return this.modules.export.exportDataToCSV(this.state.currentData, filename, options)
                .then(result => {
                    this.emit('exported', { format: 'csv', filename, success: true });
                    return result;
                })
                .catch(error => {
                    this.emit('exportError', { format: 'csv', filename, error: error.message });
                    throw error;
                });
        }

        // Additional export methods
        exportHighRes(filename, options) {
            return this.modules.export.exportHighRes(filename, options);
        }

        exportMultiple(baseName, formats) {
            return this.modules.export.exportMultiple(baseName, formats, this.state.currentData);
        }

        showExportMenu() {
            this.modules.export.showExportMenu();
        }

        getExportInfo() {
            return this.modules.export.getExportInfo();
        }

        // === ADVANCED FEATURES ===

        // Expand to fill container
        expandToFillContainer(padding = 0.95) {
            try {
                const containerNode = this.container.node();
                const containerRect = containerNode.getBoundingClientRect();
                
                const availableWidth = (containerRect.width || window.innerWidth) * padding;
                const availableHeight = (containerRect.height || window.innerHeight * 0.8) * padding;
                
                this.modules.config.set('layout.width', Math.max(1200, availableWidth));
                this.modules.config.set('layout.height', Math.max(600, availableHeight));
                
                this.modules.renderer.updateSVGDimensions({
                    width: this.modules.config.get('layout.width'),
                    height: this.modules.config.get('layout.height')
                });
                
                if (this.state.currentData) {
                    this.render(this.state.currentData);
                }
                
                console.log(`Sankey chart expanded to fill container`);
                return this;
            } catch (error) {
                this.handleError(error, 'Expand To Fill Container');
                return this;
            }
        }

        // === DEBUG AND ANALYSIS METHODS ===

        // Get flow report
        getFlowReport() {
            if (!this.state.currentData) {
                console.warn('No data available for flow report');
                return null;
            }
            
            return this.modules.dataProcessor.generateFlowReport(this.state.currentData);
        }

        // Get chart-specific state
        getState() {
            const baseState = super.getState();
            
            return {
                ...baseState,
                chartSpecific: {
                    ...this.chartState,
                    config: this.modules.config ? this.modules.config.getAll() : null,
                    flowReport: this.getFlowReport(),
                    exportInfo: this.modules.export ? this.modules.export.getExportInfo() : null
                }
            };
        }

        // Debug method
        debug() {
            const state = super.debug();
            
            console.group('SankeyChart Debug');
            console.log('Base State:', state);
            console.log('Chart State:', this.chartState);
            console.log('Modules:', Object.keys(this.modules));
            console.log('Configuration:', this.modules.config?.debug());
            console.log('Flow Report:', this.getFlowReport());
            console.groupEnd();
            
            return {
                base: state,
                chart: this.chartState,
                modules: Object.keys(this.modules),
                config: this.modules.config?.debug(),
                flow: this.getFlowReport()
            };
        }

        // === LEGACY API COMPATIBILITY ===
        
        // Maintain compatibility with old API
        setCurveIntensity(intensity) {
            return this.setCurveIntensity(intensity);
        }

        optimizeCanvas() {
            const utilization = this.modules.config.getUtilization();
            console.log(`Canvas utilization: ${utilization.utilization.toFixed(1)}%`);
            return utilization;
        }

        logDataStructure() {
            console.log("=== SANKEY DATA STRUCTURE ===");
            console.log("Current Data:", this.state.currentData);
            console.log("Flow Report:", this.getFlowReport());
            return this;
        }
    }

    // === FACTORY FUNCTION ===

    function createSankeyChart(containerId, options = {}) {
        return new SankeyChart(containerId, options);
    }

    // === EXPORTS ===

    // Export both the class and factory function
    window.SankeyChart = {
        create: createSankeyChart,
        SankeyChart: SankeyChart
    };

    // Register with BaseChart if available
    if (window.BaseChart && window.BaseChart.registerChart) {
        window.BaseChart.registerChart('sankey', SankeyChart);
    }

    console.log('SankeyChart (BaseChart-extended) loaded successfully');

})();