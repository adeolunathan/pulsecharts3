/* ===== PULSE ANALYTICS - ENHANCED MAIN APPLICATION (COMPLETE) ===== */
/* Enhanced with Data Bridge integration for seamless tab communication */

class PulseApplication {
    constructor() {
        this.chart = null;
        this.controlPanel = null;
        this.controlModule = null;
        this.dataManager = null;
        this.currentData = null;
        this.currentDataset = 'saas';
        this.currentChartType = 'sankey';
        this.isInitialized = false;
        this.isInitializing = true; // Start in initializing mode to prevent flicker
        
        // Data Bridge integration
        this.dataBridge = null;
        
        this.chartRegistry = {
            sankey: {
                name: 'Sankey Flow Chart',
                chartClass: PulseSankeyChart,
                controlModuleClass: SankeyControlModule,
                description: 'Financial flow visualization'
            },
            bar: {
                name: 'Bar Chart',
                chartClass: PulseBarChart,
                controlModuleClass: BarControlModule,
                description: 'Categorical data visualization'
            }
        };
        
        
    }

    async initialize() {
        try {
            console.log('🔧 Initializing Enhanced Pulse Analytics Platform');
            console.log('🏁 Starting initialization process...');
            this.setStatus('Initializing...', 'loading');
            
            // Initialize data manager
            console.log('📊 Creating data manager...');
            this.dataManager = new PulseDataManager();
            
            // Initialize data bridge connection
            console.log('🌉 Initializing data bridge...');
            this.initializeDataBridge();
            
            // Initialize with default chart type
            console.log('📈 Initializing chart type...');
            try {
                await this.initializeChartType('sankey');
                console.log('✅ Chart type initialized');
            } catch (chartError) {
                console.error('❌ Chart initialization failed:', chartError);
                console.log('⏩ Continuing without chart initialization');
            }
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Check for URL parameters first (from guided flow)
            const urlData = this.handleURLParameters();
            
            if (!urlData) {
                // Skip default dataset loading during initialization to prevent timeout
                console.log('⏩ Skipping default dataset loading during initialization');
                this.setStatus('Ready - No dataset loaded', 'ready');
            }
            
            // Hide loading indicator
            this.hideLoadingIndicator();
            
            // Mark as initialized and disable initializing mode
            this.isInitialized = true;
            this.isInitializing = false;
            
            console.log('✅ Enhanced Platform initialized successfully');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.showError(`Initialization failed: ${error.message}`);
            // Mark as initialized even if there was an error to prevent timeout
            this.isInitialized = true;
        }
    }

    // Initialize Data Bridge connection
    initializeDataBridge() {
        if (window.PulseDataBridge) {
            this.dataBridge = window.PulseDataBridge;
            
            // Register this app with the bridge
            if (this.chart) {
                this.dataBridge.setChartInstance(this.chart);
            }
            
            // Listen for data changes from other tabs
            window.addEventListener('pulseDataChanged', (event) => {
                this.handleDataBridgeUpdate(event.detail);
            });
            
            console.log('🌉 Connected to Data Bridge');
        } else {
            console.warn('⚠️ Data Bridge not available');
        }
    }

    // Handle data updates from Data Bridge
    handleDataBridgeUpdate(detail) {
        const { data, source } = detail;
        
        console.log(`🔄 Received data update from ${source}`);
        
        // Only update if the source is not this app (avoid loops)
        if (source !== 'app' && source !== 'app-initial') {
            this.currentData = data;
            
            // Re-render chart if available
            if (this.chart && data) {
                console.log('🎨 Re-rendering chart with updated data');
                this.chart.render(data);
                
                // Update dynamic controls if needed
                if (this.controlModule?.hasDynamicControls && this.controlModule.hasDynamicControls()) {
                    this.controlModule.initializeDynamicControls(this.chart);
                    this.controlPanel?.generateControls();
                }
                
                // Update status
                this.setStatus('Ready', 'ready');
            }
        }
    }

    // Notify Data Bridge when data changes
    notifyDataBridgeUpdate(source = 'app') {
        if (this.dataBridge && this.currentData) {
            this.dataBridge.setData(this.currentData, source);
        }
    }

    handleURLParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Check if this is a chart type selection (handled by chart.html flow builder)
        if (urlParams.has('type')) {
            console.log('📊 Chart type parameter detected, skipping default dataset load');
            return true; // Prevent default dataset loading
        }
        
        if (urlParams.has('data')) {
            try {
                const data = JSON.parse(decodeURIComponent(urlParams.get('data')));
                console.log('📊 Loading data from URL parameters:', data);
                
                const validation = this.dataManager.validateData(data);
                if (!validation.valid) {
                    throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
                }
                
                this.currentData = data;
                this.currentDataset = 'url-data';
                
                if (this.chart) {
                    this.chart.render(data);
                }
                
                // Notify Data Bridge
                this.notifyDataBridgeUpdate('url-data');
                
                const title = data.metadata?.title || 'Custom Data';
                this.setStatus(`Loaded: ${title}`, 'ready');
                
                window.history.replaceState({}, document.title, window.location.pathname);
                
                return true;
                
            } catch (error) {
                console.error('❌ Error parsing URL data:', error);
                this.showError(`Failed to load data from URL: ${error.message}`);
                return false;
            }
        }
        
        return false;
    }

    async initializeChartType(chartType) {
        const chartDefinition = this.chartRegistry[chartType];
        if (!chartDefinition) {
            throw new Error(`Chart type '${chartType}' not found in registry`);
        }

        console.log(`🎯 Initializing ${chartType} chart with controls`);

        this.controlModule = new chartDefinition.controlModuleClass();
        this.chart = new chartDefinition.chartClass('main-chart');
        this.chart.applyControlDefaults(this.controlModule);
        
        // Register chart with Data Bridge
        if (this.dataBridge) {
            this.dataBridge.setChartInstance(this.chart);
        }
        
        // **HORIZONTAL MENU: Initialize control panel with horizontal menu containers**
        this.controlPanel = new PulseControlPanel('dynamic-controls'); // Keep for backwards compatibility
        this.controlPanel.init(this.chart, this.controlModule);
        
        // Fire event to notify that controls have been generated
        window.dispatchEvent(new CustomEvent('controlsGenerated'));
        console.log('🎛️ Fired controlsGenerated event for horizontal menu');
        
        this.currentChartType = chartType;
        console.log(`✅ ${chartType} chart and controls initialized with proper defaults`);
    }

    async switchChartType(newChartType) {
        if (newChartType === this.currentChartType) {
            return;
        }

        console.log(`🔄 Switching from ${this.currentChartType} to ${newChartType}`);
        
        try {
            // **PREVENT FLICKER: Set initializing flag to prevent multiple control refreshes**
            this.isInitializing = true;
            
            // **CRITICAL FIX: Store current data before destroying control panel**
            const preservedData = this.currentData;
            
            if (this.controlPanel) {
                this.controlPanel.destroy();
            }
            if (this.chart) {
                const container = document.getElementById('main-chart');
                if (container) {
                    container.innerHTML = '<div class="chart-loading"><div class="loading-spinner"></div><p>Switching chart type...</p></div>';
                }
            }

            await this.initializeChartType(newChartType);
            
            // **BAR CHART: Let UnifiedSpreadsheetEditor be the single source of truth**
            if (newChartType === 'bar') {
                console.log('📊 Setting up bar chart - waiting for UnifiedSpreadsheetEditor to provide data');
                
                // **REQUIRED: BarChartConfig must be available**
                if (!window.BarChartConfig) {
                    throw new Error('BarChartConfig not available - cannot initialize bar chart');
                }
                
                let barChartData;
                
                // Check if there's existing custom data from data editor in preservedData
                if (preservedData && preservedData.metadata && preservedData.metadata.source === 'data-editor') {
                    console.log('📊 Found existing custom data from data editor, preserving it');
                    barChartData = preservedData;
                    this.currentData = barChartData;
                    this.chart.render(barChartData);
                    this.notifyDataBridgeUpdate('bar-chart-data-preserved');
                } else if (preservedData && preservedData.categories && (preservedData.values || preservedData.series)) {
                    console.log('📊 Found existing bar chart data, preserving it');
                    barChartData = preservedData;
                    this.currentData = barChartData;
                    this.chart.render(barChartData);
                    this.notifyDataBridgeUpdate('bar-chart-data-preserved');
                } else {
                    console.log('📊 No existing data found - UnifiedSpreadsheetEditor will provide initial data');
                    // Start with default data temporarily, UnifiedSpreadsheetEditor will take over
                    barChartData = window.BarChartConfig.getDefaultData();
                    this.currentData = barChartData;
                    this.chart.render(barChartData);
                    this.notifyDataBridgeUpdate('bar-chart-temporary-init');
                }
                
                console.log('✅ Bar chart initialized, UnifiedSpreadsheetEditor will sync data');
            } else {
                // For other chart types (like sankey), use existing logic
                if (preservedData) {
                    this.currentData = preservedData;
                    this.chart.render(preservedData);
                    
                    if (this.controlModule.hasDynamicControls && this.controlModule.hasDynamicControls()) {
                        this.controlModule.initializeDynamicControls(this.chart);
                        this.controlPanel.generateControls();
                    }
                }
            }
            
            // **CLEAN: Single control setup after everything is ready**
            this.isInitializing = false;
            
            // Setup controls once with the final data
            if (this.controlModule && this.controlModule.hasDynamicControls && this.controlModule.hasDynamicControls()) {
                console.log('🎛️ Setting up controls with final chart data');
                this.controlModule.initializeDynamicControls(this.chart);
                this.controlPanel.generateControls();
            }
            
            this.hideLoadingIndicator();
            console.log(`✅ Successfully switched to ${newChartType}`);
            
        } catch (error) {
            // Make sure to reset the flag even on error
            this.isInitializing = false;
            console.error(`❌ Failed to switch to ${newChartType}:`, error);
            this.showError(`Failed to switch chart type: ${error.message}`);
        }
    }

    setupEventListeners() {
        const chartTypeSelect = document.getElementById('chart-type-select');
        if (chartTypeSelect) {
            chartTypeSelect.addEventListener('change', async (e) => {
                await this.switchChartType(e.target.value);
            });
        }

        const dataSelect = document.getElementById('data-select');
        if (dataSelect) {
            dataSelect.addEventListener('change', async (e) => {
                if (e.target.value === 'custom') {
                    this.loadCustomData();
                } else {
                    await this.loadDataset(e.target.value);
                }
            });
        }

        const exportPng = document.getElementById('export-png');
        if (exportPng) {
            exportPng.addEventListener('click', () => {
                this.chart?.exportToPNG();
            });
        }
        
        const exportSvg = document.getElementById('export-svg');
        if (exportSvg) {
            exportSvg.addEventListener('click', () => {
                this.chart?.exportToSVG();
            });
        }
        
        const exportData = document.getElementById('export-data');
        if (exportData) {
            exportData.addEventListener('click', () => {
                if (this.currentData) {
                    this.chart?.exportDataToCSV(this.currentData);
                }
            });
        }
        
        const resetDefaults = document.getElementById('reset-defaults');
        if (resetDefaults) {
            resetDefaults.addEventListener('click', () => {
                this.resetToDefaults();
            });
        }

        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (event) => {
                this.handleFileUpload(event);
            });
        }
    }

    resetToDefaults() {
        if (!this.controlPanel || !this.controlModule) {
            console.warn('Cannot reset - control panel or module not available');
            return;
        }
        
        console.log('🔄 Resetting all controls to defaults');
        
        const defaults = this.controlModule.resetToDefaults();
        
        if (this.chart) {
            this.chart.config = { ...this.chart.getInitialConfig(), ...defaults };
            
            if (this.currentData) {
                this.chart.render(this.currentData);
            }
        }
        
        this.controlPanel.applyConfig(defaults);
        
        console.log('✅ Reset to defaults complete');
    }

    async loadDataset(datasetKey) {
        try {
            this.setStatus('Loading from external file...', 'loading');
            console.log(`🎯 User requested dataset: ${datasetKey}`);
            
            this.currentData = await this.dataManager.loadDataset(datasetKey);
            this.currentDataset = datasetKey;
            
            const validation = this.dataManager.validateData(this.currentData);
            if (!validation.valid) {
                throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
            }
            
            if (this.chart) {
                this.chart.render(this.currentData);
                
                if (this.controlModule && this.controlModule.hasDynamicControls()) {
                    this.controlModule.initializeDynamicControls(this.chart);
                    this.controlPanel.generateControls();
                }
            }

            // Notify Data Bridge of the update
            this.notifyDataBridgeUpdate(`dataset-${datasetKey}`);

            const sourceInfo = this.currentData.metadata?.source || 'external file';
            this.setStatus(`Loaded: ${this.currentData.metadata.title} (${sourceInfo})`, 'ready');
            console.log(`✅ Successfully loaded and rendered dataset: ${datasetKey}`);
            
        } catch (error) {
            console.error('❌ Dataset loading failed:', error);
            
            if (error.message.includes('fetch') || error.message.includes('Failed to load dataset')) {
                this.showError(`External File Loading Failed: ${error.message}\n\nTo test with real external files:\n1. Set up a local server\n2. Place data files in data/samples/\n3. Serve the HTML from the server`);
            } else {
                this.showError(`Failed to load dataset: ${error.message}`);
            }
        }
    }

    loadCustomData() {
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.click();
        }
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Security: File size validation (10MB limit)
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_FILE_SIZE) {
            alert(`File too large. Maximum size is ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
            return;
        }

        // Security: File type validation
        if (!file.name.toLowerCase().endsWith('.json')) {
            alert('Invalid file type. Only JSON files are allowed.');
            return;
        }

        console.log(`📁 Processing uploaded file: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                if (data.revenue && data.operating_expenses && !data.nodes) {
                    console.log('Detected income statement format, transforming...');
                    this.currentData = this.dataManager.transformIncomeStatement(data);
                } else if (data.nodes && data.links) {
                    this.currentData = data;
                } else {
                    throw new Error('Invalid data format. Please use either standard income statement format or Sankey nodes/links format.');
                }

                const validation = this.dataManager.validateData(this.currentData);
                if (!validation.valid) {
                    throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
                }

                this.currentDataset = 'custom';
                
                if (this.chart) {
                    this.chart.render(this.currentData);
                    
                    if (this.controlModule && this.controlModule.supportsDynamicLayers && this.chart.getLayerInfo) {
                        this.controlModule.initializeDynamicControls(this.chart);
                        this.controlPanel.generateControls();
                    }
                }

                // Notify Data Bridge of the update
                this.notifyDataBridgeUpdate('custom-file');

                this.setStatus(`Custom: ${this.currentData.metadata?.title || 'Untitled'}`, 'ready');
                console.log('📁 Loaded and processed custom data');
                
            } catch (error) {
                console.error('Failed to parse custom data:', error);
                alert(`Failed to load custom data: ${error.message}`);
            }
        };
        reader.readAsText(file);
    }

    // Method for Data Builder to update chart data
    updateData(newData, source = 'manual') {
        console.log(`🔄 Manually updating data from ${source}`);
        console.log(`🔄 PulseApp: Received data:`, newData);
        console.log(`🔄 PulseApp: Chart instance available:`, !!this.chart);
        
        try {
            // **SIMPLIFIED: Use data as-is, no conversion complexity**
            const validation = this.dataManager.validateData(newData);
            if (!validation.valid) {
                console.warn('Validation warnings for manual update:', validation.errors);
            }
            
            this.currentData = newData;
            console.log(`🔄 PulseApp: Stored current data:`, this.currentData);
            
            if (this.chart) {
                console.log(`🔄 PulseApp: Calling chart.render() with data`);
                this.chart.render(newData);
                
                if (this.controlModule?.hasDynamicControls && this.controlModule.hasDynamicControls()) {
                    this.controlModule.initializeDynamicControls(this.chart);
                    this.controlPanel?.generateControls();
                }
            } else {
                console.warn('⚠️ PulseApp: No chart instance available for rendering');
            }
            
            this.notifyDataBridgeUpdate(source);
            
            this.setStatus('Ready', 'ready');
            
            return true;
        } catch (error) {
            console.error('Failed to update data:', error);
            this.showError(`Failed to update data: ${error.message}`);
            return false;
        }
    }

    // Register a new chart type
    registerChartType(key, definition) {
        this.chartRegistry[key] = definition;
        console.log(`📋 Registered chart type: ${key}`);
    }

    // Get available chart types
    getAvailableChartTypes() {
        return Object.entries(this.chartRegistry).map(([key, def]) => ({
            key,
            name: def.name,
            description: def.description
        }));
    }

    // UI Helper Methods
    setStatus(message, type = 'loading') {
        const statusEl = document.getElementById('data-status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `status-indicator status-${type}`;
        }
    }

    hideLoadingIndicator() {
        const loadingEl = document.querySelector('.chart-loading');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
    }

    showError(message) {
        this.hideLoadingIndicator();
        const container = document.getElementById('main-chart');
        if (container) {
            const isExternalFileError = message.includes('External File Loading Failed');
            const errorIcon = isExternalFileError ? '📁❌' : '⚠️';
            const errorTitle = isExternalFileError ? 'External File Loading Failed' : 'Error Loading Chart';
            
            // Create error display safely without innerHTML
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; height: 400px; text-align: center; padding: 2rem;';
            
            const iconDiv = document.createElement('div');
            iconDiv.style.cssText = 'font-size: 48px; margin-bottom: 16px;';
            iconDiv.textContent = errorIcon;
            
            const titleH3 = document.createElement('h3');
            titleH3.style.cssText = 'color: #e74c3c; margin-bottom: 12px;';
            titleH3.textContent = errorTitle;
            
            const messageDiv = document.createElement('div');
            messageDiv.style.cssText = 'color: #6c757d; max-width: 600px; margin-bottom: 16px; white-space: pre-line; font-family: monospace; font-size: 13px; background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #e74c3c;';
            messageDiv.textContent = message; // Safe from XSS
            
            const buttonsDiv = document.createElement('div');
            buttonsDiv.style.cssText = 'display: flex; gap: 10px;';
            
            const reloadBtn = document.createElement('button');
            reloadBtn.className = 'btn btn-primary';
            reloadBtn.textContent = 'Reload';
            reloadBtn.onclick = () => location.reload();
            
            const loadBtn = document.createElement('button');
            loadBtn.className = 'btn btn-secondary';
            loadBtn.textContent = 'Load Custom Data';
            loadBtn.onclick = () => pulseApp.loadCustomData();
            
            buttonsDiv.appendChild(reloadBtn);
            buttonsDiv.appendChild(loadBtn);
            
            errorDiv.appendChild(iconDiv);
            errorDiv.appendChild(titleH3);
            errorDiv.appendChild(messageDiv);
            errorDiv.appendChild(buttonsDiv);
            
            container.innerHTML = ''; // Clear container
            container.appendChild(errorDiv);
        }
        this.setStatus('Error - External files not accessible', 'error');
    }

    // Public API methods
    getCurrentData() {
        return this.currentData;
    }

    getCurrentChart() {
        return this.chart;
    }

    getCurrentChartType() {
        return this.currentChartType;
    }

    getControlModule() {
        return this.controlModule;
    }

    getDataManager() {
        return this.dataManager;
    }

    getControlPanel() {
        return this.controlPanel;
    }

    // Get Data Bridge instance
    getDataBridge() {
        return this.dataBridge;
    }

    // Resize handling
    handleResize() {
        if (this.chart && this.chart.config) {
            const container = document.getElementById('main-chart');
            if (container) {
                const rect = container.getBoundingClientRect();
                console.log('Window resized, chart dimensions:', rect.width, 'x', rect.height);
            }
        }
    }
}

// Global application instance
let pulseApp = null;

// Initialize application with Data Bridge support
async function initializePulseApp() {
    try {
        pulseApp = new PulseApplication();
        // Make app available immediately to prevent timeout
        pulseApp.isInitialized = true;
        window.pulseApp = pulseApp;
        
        // Initialize Chart Library for save/load functionality
        if (typeof ChartLibrary !== 'undefined') {
            window.chartLibrary = new ChartLibrary();
            console.log('📚 Chart Library initialized successfully');
        } else {
            console.warn('⚠️ ChartLibrary class not available');
        }
        
        // Now do the actual initialization in background
        pulseApp.initialize();
        
        // Set up window resize handler
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => pulseApp.handleResize(), 250);
        });
        
        // Global error handling
        window.addEventListener('error', (event) => {
            if (event.error) {
                console.error('Global error:', event.error);
            } else {
                console.warn('Global error event with no error details:', event);
            }
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
        });
        
    } catch (error) {
        console.error('Failed to create Pulse Application:', error);
        alert('Failed to initialize Pulse Analytics Platform. Please check the console for details.');
    }
}

// Start the application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializePulseApp());
} else {
    initializePulseApp();
}

// Export for global access
if (typeof window !== 'undefined') {
    window.PulseApplication = PulseApplication;
    window.pulseApp = pulseApp;
}