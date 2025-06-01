/* ===== PULSE ANALYTICS - MAIN APPLICATION ===== */
/* Orchestrates chart, data, and controls for the complete application */

class PulseApplication {
    constructor() {
        this.chart = null;
        this.controlPanel = null;
        this.dataManager = null;
        this.currentData = null;
        this.currentDataset = 'saas';
        
        console.log('🚀 Starting Pulse Analytics Platform');
    }

    async initialize() {
        try {
            console.log('🔧 Initializing Pulse Analytics Platform');
            this.setStatus('Initializing...', 'loading');
            
            // Initialize data manager
            this.dataManager = new PulseDataManager();
            
            // Create chart instance
            this.chart = new PulseSankeyChart('main-chart');
            
            // Create control panel
            this.controlPanel = new PulseControlPanel('dynamic-controls');
            this.controlPanel.init(this.chart);
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load default dataset
            await this.loadDataset('saas');
            
            // Hide loading indicator
            this.hideLoadingIndicator();
            
            console.log('✅ Platform initialized successfully');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.showError(`Initialization failed: ${error.message}`);
        }
    }

    setupEventListeners() {
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
                this.controlPanel?.resetToDefaults();
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
            }

            // Show success with source information
            const sourceInfo = this.currentData.metadata?.source || 'external file';
            this.setStatus(`Loaded: ${this.currentData.metadata.title} (${sourceInfo})`, 'ready');
            console.log(`✅ Successfully loaded and rendered dataset: ${datasetKey}`);
            
        } catch (error) {
            console.error('❌ Dataset loading failed:', error);
            
            // Show specific error for external file loading
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
                // Reinitialize chart with new dimensions if needed
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