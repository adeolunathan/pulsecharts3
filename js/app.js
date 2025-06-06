/* ===== PULSE ANALYTICS - MAIN APPLICATION (UPDATED) ===== */
/* Updated to handle URL data parameters from guided flow and fix default settings persistence */

class PulseApplication {
    constructor() {
        this.chart = null;
        this.controlPanel = null;
        this.controlModule = null;
        this.dataManager = null;
        this.currentData = null;
        this.currentDataset = 'saas';
        this.currentChartType = 'sankey';
        
        // Registry of available chart types and their control modules
        this.chartRegistry = {
            sankey: {
                name: 'Sankey Flow Chart',
                chartClass: PulseSankeyChart,
                controlModuleClass: SankeyControlModule,
                description: 'Financial flow visualization'
            }
        };
        
        console.log('🚀 Starting Pulse Analytics Platform');
    }

    async initialize() {
        try {
            console.log('🔧 Initializing Pulse Analytics Platform');
            this.setStatus('Initializing...', 'loading');
            
            // Initialize data manager
            this.dataManager = new PulseDataManager();
            
            // Initialize with default chart type
            await this.initializeChartType('sankey');
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Check for URL parameters first (from guided flow)
            const urlData = this.handleURLParameters();
            
            if (!urlData) {
                // Only load default dataset if no URL data
                await this.loadDataset('saas');
            }
            
            // Hide loading indicator
            this.hideLoadingIndicator();
            
            console.log('✅ Platform initialized successfully');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.showError(`Initialization failed: ${error.message}`);
        }
    }

    // NEW: Handle URL parameters from guided flow
    handleURLParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.has('data')) {
            try {
                const data = JSON.parse(decodeURIComponent(urlParams.get('data')));
                console.log('📊 Loading data from URL parameters:', data);
                
                // Validate the data structure
                const validation = this.dataManager.validateData(data);
                if (!validation.valid) {
                    throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
                }
                
                // Set the data and render
                this.currentData = data;
                this.currentDataset = 'url-data';
                
                if (this.chart) {
                    this.chart.render(data);
                }
                
                // Update status
                const title = data.metadata?.title || 'Custom Data';
                this.setStatus(`Loaded: ${title}`, 'ready');
                
                // Clean up URL (optional - removes parameters from browser bar)
                window.history.replaceState({}, document.title, window.location.pathname);
                
                return true; // Indicate that URL data was loaded
                
            } catch (error) {
                console.error('❌ Error parsing URL data:', error);
                this.showError(`Failed to load data from URL: ${error.message}`);
                return false;
            }
        }
        
        return false; // No URL data found
    }

    async initializeChartType(chartType) {
        const chartDefinition = this.chartRegistry[chartType];
        if (!chartDefinition) {
            throw new Error(`Chart type '${chartType}' not found in registry`);
        }

        console.log(`🎯 Initializing ${chartType} chart with controls`);

        // **STEP 1: Create control module first**
        this.controlModule = new chartDefinition.controlModuleClass();
        
        // **STEP 2: Create chart instance**
        this.chart = new chartDefinition.chartClass('main-chart');
        
        // **STEP 3: Apply control module defaults to chart config**
        this.chart.applyControlDefaults(this.controlModule);
        
        // **STEP 4: Initialize dynamic controls if supported**
        if (this.controlModule.supportsDynamicLayers && this.chart.getLayerInfo) {
            // Wait for data to be available before initializing dynamic controls
            if (this.currentData) {
                this.chart.processData(this.currentData);
                this.controlModule.initializeDynamicControls(this.chart);
            }
        }
        
        // **STEP 5: Create control panel with properly synchronized chart and controls**
        this.controlPanel = new PulseControlPanel('dynamic-controls');
        this.controlPanel.init(this.chart, this.controlModule);
        
        this.currentChartType = chartType;
        console.log(`✅ ${chartType} chart and controls initialized with proper defaults`);
        console.log('📋 Current chart config:', this.chart.config);
    }

    async switchChartType(newChartType) {
        if (newChartType === this.currentChartType) {
            return;
        }

        console.log(`🔄 Switching from ${this.currentChartType} to ${newChartType}`);
        
        try {
            // Clean up current chart and controls
            if (this.controlPanel) {
                this.controlPanel.destroy();
            }
            if (this.chart) {
                const container = document.getElementById('main-chart');
                if (container) {
                    container.innerHTML = '<div class="chart-loading"><div class="loading-spinner"></div><p>Switching chart type...</p></div>';
                }
            }

            // Initialize new chart type
            await this.initializeChartType(newChartType);
            
            // Re-render with current data if available
            if (this.currentData) {
                this.chart.render(this.currentData);
                
                // **CRITICAL: Initialize dynamic controls after data is rendered**
                if (this.controlModule.supportsDynamicLayers && this.chart.getLayerInfo) {
                    this.controlModule.initializeDynamicControls(this.chart);
                    // Regenerate control panel to include dynamic controls
                    this.controlPanel.generateControls();
                }
                
                this.hideLoadingIndicator();
            }
            
            console.log(`✅ Successfully switched to ${newChartType}`);
            
        } catch (error) {
            console.error(`❌ Failed to switch to ${newChartType}:`, error);
            this.showError(`Failed to switch chart type: ${error.message}`);
        }
    }

    setupEventListeners() {
        // Chart type selector
        const chartTypeSelect = document.getElementById('chart-type-select');
        if (chartTypeSelect) {
            chartTypeSelect.addEventListener('change', async (e) => {
                await this.switchChartType(e.target.value);
            });
        }

        // Data selector
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

        // Export buttons
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
        
        // Reset button
        const resetDefaults = document.getElementById('reset-defaults');
        if (resetDefaults) {
            resetDefaults.addEventListener('click', () => {
                this.resetToDefaults();
            });
        }

        // File input for custom data
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (event) => {
                this.handleFileUpload(event);
            });
        }
    }

    /**
     * ENHANCED: Reset to defaults with proper synchronization
     */
    resetToDefaults() {
        if (!this.controlPanel || !this.controlModule) {
            console.warn('Cannot reset - control panel or module not available');
            return;
        }
        
        console.log('🔄 Resetting all controls to defaults');
        
        // Get defaults from control module
        const defaults = this.controlModule.resetToDefaults();
        
        // Apply defaults to chart
        if (this.chart) {
            this.chart.config = { ...this.chart.getInitialConfig(), ...defaults };
            
            // Re-render chart with defaults
            if (this.currentData) {
                this.chart.render(this.currentData);
            }
        }
        
        // Regenerate control panel to reflect defaults
        this.controlPanel.applyConfig(defaults);
        
        console.log('✅ Reset to defaults complete');
    }

    async loadDataset(datasetKey) {
        try {
            this.setStatus('Loading from external file...', 'loading');
            console.log(`🎯 User requested dataset: ${datasetKey}`);
            
            this.currentData = await this.dataManager.loadDataset(datasetKey);
            this.currentDataset = datasetKey;
            
            // Validate data before rendering
            const validation = this.dataManager.validateData(this.currentData);
            if (!validation.valid) {
                throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
            }
            
            if (this.chart) {
                this.chart.render(this.currentData);
                
                // **CRITICAL: Initialize dynamic controls after data is rendered**
                if (this.controlModule && this.controlModule.supportsDynamicLayers && this.chart.getLayerInfo) {
                    this.controlModule.initializeDynamicControls(this.chart);
                    // Regenerate control panel to include dynamic controls
                    this.controlPanel.generateControls();
                }
            }

            // Show success with source information
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

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Check if it's a standard income statement format
                if (data.revenue && data.operating_expenses && !data.nodes) {
                    console.log('Detected income statement format, transforming...');
                    this.currentData = this.dataManager.transformIncomeStatement(data);
                } else if (data.nodes && data.links) {
                    // Standard Sankey format
                    this.currentData = data;
                } else {
                    throw new Error('Invalid data format. Please use either standard income statement format or Sankey nodes/links format.');
                }

                // Validate transformed/loaded data
                const validation = this.dataManager.validateData(this.currentData);
                if (!validation.valid) {
                    throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
                }

                this.currentDataset = 'custom';
                
                if (this.chart) {
                    this.chart.render(this.currentData);
                    
                    // **CRITICAL: Initialize dynamic controls after data is rendered**
                    if (this.controlModule && this.controlModule.supportsDynamicLayers && this.chart.getLayerInfo) {
                        this.controlModule.initializeDynamicControls(this.chart);
                        // Regenerate control panel to include dynamic controls
                        this.controlPanel.generateControls();
                    }
                }

                this.setStatus(`Custom: ${this.currentData.metadata?.title || 'Untitled'}`, 'ready');
                console.log('📁 Loaded and processed custom data');
                
            } catch (error) {
                console.error('Failed to parse custom data:', error);
                alert(`Failed to load custom data: ${error.message}`);
            }
        };
        reader.readAsText(file);
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
            
            container.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 400px; text-align: center; padding: 2rem;">
                    <div style="font-size: 48px; margin-bottom: 16px;">${errorIcon}</div>
                    <h3 style="color: #e74c3c; margin-bottom: 12px;">${errorTitle}</h3>
                    <div style="color: #6c757d; max-width: 600px; margin-bottom: 16px; white-space: pre-line; font-family: monospace; font-size: 13px; background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #e74c3c;">
                        ${message}
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="location.reload()" class="btn btn-primary">Reload</button>
                        <button onclick="pulseApp.loadCustomData()" class="btn btn-secondary">Load Custom Data</button>
                    </div>
                </div>
            `;
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

// Initialize application when DOM is ready
function initializePulseApp() {
    try {
        pulseApp = new PulseApplication();
        pulseApp.initialize();
        
        // Set up window resize handler
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => pulseApp.handleResize(), 250);
        });
        
        // Global error handling
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
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
    document.addEventListener('DOMContentLoaded', initializePulseApp);
} else {
    initializePulseApp();
}

// Export for global access
if (typeof window !== 'undefined') {
    window.PulseApplication = PulseApplication;
    window.pulseApp = pulseApp;
}