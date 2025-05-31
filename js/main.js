/* ===== PULSE PLATFORM MAIN APPLICATION ===== */
/* js/main.js - Application Bootstrap */

// Simple Event Bus for component communication
class EventBus {
    constructor() {
        this.events = {};
    }

    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(callback => callback(data));
        }
    }

    off(event, callback) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(cb => cb !== callback);
        }
    }
}

// Configuration Manager for saving/loading presets
class ConfigManager {
    constructor() {
        this.storageKey = 'pulse-chart-presets';
        this.presets = this.loadPresets();
    }

    loadPresets() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : {};
        } catch (error) {
            console.warn('Failed to load presets from localStorage:', error);
            return {};
        }
    }

    savePresets() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.presets));
        } catch (error) {
            console.warn('Failed to save presets to localStorage:', error);
        }
    }

    savePreset(name, config) {
        this.presets[name] = {
            config,
            created: new Date().toISOString(),
            chartType: 'sankey' // For future multi-chart support
        };
        this.savePresets();
    }

    getPreset(name) {
        return this.presets[name];
    }

    getAllPresets() {
        return Object.keys(this.presets);
    }

    deletePreset(name) {
        delete this.presets[name];
        this.savePresets();
    }
}

// Chart Registry for managing different chart types
class ChartRegistry {
    constructor() {
        this.chartTypes = new Map();
    }

    register(type, definition) {
        this.chartTypes.set(type, definition);
        console.log(`Chart type '${type}' registered:`, definition.name);
    }

    get(type) {
        return this.chartTypes.get(type);
    }

    getAll() {
        return Array.from(this.chartTypes.entries()).map(([type, def]) => ({
            type,
            ...def
        }));
    }
}

// Main Application Class
class PulseApplication {
    constructor() {
        this.eventBus = new EventBus();
        this.chartRegistry = new ChartRegistry();
        this.controlPanel = null;
        this.configManager = new ConfigManager();
        this.currentChart = null;
        this.currentChartType = 'sankey';
        this.currentData = null;
        
        console.log('🚀 Initializing Pulse Analytics Platform...');
        this.init();
    }

    async init() {
        try {
            // Register chart types
            this.registerChartTypes();
            
            // Initialize UI components
            this.initializeUI();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load default data and chart
            await this.loadDefaultChart();
            
            console.log('✅ Pulse Platform initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Pulse Platform:', error);
            this.showError('Failed to initialize application: ' + error.message);
        }
    }

    registerChartTypes() {
        // Register the Sankey chart with its capabilities
        this.chartRegistry.register('sankey', {
            name: 'Sankey Flow Chart',
            description: 'Financial flow visualization with customizable styling',
            chartClass: window.SankeyChart.SankeyChart, // Your existing chart class
            capabilities: SankeyCapabilities, // Controls definition
            sampleData: window.SAMPLE_FINANCIAL_DATA,
            icon: '〰️'
        });

        // Future chart types can be registered here
        // this.chartRegistry.register('bar', BarChartDefinition);
        // this.chartRegistry.register('line', LineChartDefinition);
    }

    initializeUI() {
        // Initialize control panel
        this.controlPanel = new ControlPanel('dynamic-controls', this.eventBus);
        
        // Populate chart type selector
        this.populateChartSelector();
        
        // Initialize toolbar buttons
        this.initializeToolbar();
        
        console.log('UI components initialized');
    }

    populateChartSelector() {
        const selector = document.getElementById('chart-type-select');
        if (!selector) return;

        selector.innerHTML = '';
        
        this.chartRegistry.getAll().forEach(chart => {
            const option = document.createElement('option');
            option.value = chart.type;
            option.textContent = `${chart.icon} ${chart.name}`;
            option.disabled = chart.type !== 'sankey'; // Only Sankey enabled for now
            selector.appendChild(option);
        });
    }

    initializeToolbar() {
        // Data control buttons
        const loadDataBtn = document.getElementById('load-data');
        const sampleDataBtn = document.getElementById('sample-data');
        
        // Export control buttons  
        const exportPngBtn = document.getElementById('export-png');
        const exportSvgBtn = document.getElementById('export-svg');
        const exportDataBtn = document.getElementById('export-data');
        
        // Reset button
        const resetBtn = document.getElementById('reset-defaults');

        // Event listeners
        if (loadDataBtn) {
            loadDataBtn.addEventListener('click', () => this.handleLoadData());
        }
        
        if (sampleDataBtn) {
            sampleDataBtn.addEventListener('click', () => this.loadSampleData());
        }
        
        if (exportPngBtn) {
            exportPngBtn.addEventListener('click', () => this.exportChart('png'));
        }
        
        if (exportSvgBtn) {
            exportSvgBtn.addEventListener('click', () => this.exportChart('svg'));
        }
        
        if (exportDataBtn) {
            exportDataBtn.addEventListener('click', () => this.exportChart('data'));
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetToDefaults());
        }
    }

    setupEventListeners() {
        // Chart type selector
        const chartTypeSelect = document.getElementById('chart-type-select');
        if (chartTypeSelect) {
            chartTypeSelect.addEventListener('change', (e) => {
                this.switchChartType(e.target.value);
            });
        }

        // Configuration change events
        this.eventBus.on('configChanged', (data) => {
            console.log('Configuration changed:', data.controlId, '=', data.value);
        });

        // Window resize handling
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.handleResize(), 250);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    async loadDefaultChart() {
        try {
            // Load sample data
            if (typeof window.SAMPLE_FINANCIAL_DATA === 'undefined') {
                throw new Error('Sample data not available');
            }

            this.currentData = window.SAMPLE_FINANCIAL_DATA;
            
            // Create and render chart
            await this.createChart('sankey');
            
            // Hide loading indicator
            this.hideLoadingIndicator();
            
            console.log('Default chart loaded successfully');
            
        } catch (error) {
            console.error('Failed to load default chart:', error);
            this.showError('Failed to load default chart: ' + error.message);
        }
    }

    async createChart(chartType) {
        try {
            const chartDefinition = this.chartRegistry.get(chartType);
            if (!chartDefinition) {
                throw new Error(`Chart type '${chartType}' not found`);
            }

            // Destroy existing chart if any
            if (this.currentChart) {
                this.currentChart.destroy();
            }

            // Create new chart wrapped with the control interface
            this.currentChart = new ChartWrapper(
                chartDefinition.chartClass,
                chartDefinition.capabilities,
                'main-chart',
                this.getDefaultConfig(chartType)
            );

            // Render with current data
            if (this.currentData) {
                this.currentChart.render(this.currentData);
            }

            // Update control panel
            this.controlPanel.generateControls(this.currentChart);
            
            this.currentChartType = chartType;
            
            console.log(`Chart '${chartType}' created successfully`);
            
        } catch (error) {
            console.error(`Failed to create chart '${chartType}':`, error);
            throw error;
        }
    }

    getDefaultConfig(chartType) {
        // Extract default values from capabilities
        const chartDef = this.chartRegistry.get(chartType);
        if (!chartDef || !chartDef.capabilities) return {};

        const config = {};
        
        Object.values(chartDef.capabilities).forEach(section => {
            section.controls.forEach(control => {
                if (control.default !== undefined) {
                    config[control.id] = control.default;
                }
            });
        });

        return config;
    }

    switchChartType(newType) {
        if (newType === this.currentChartType) return;
        
        console.log(`Switching chart type from '${this.currentChartType}' to '${newType}'`);
        this.createChart(newType);
    }

    handleLoadData() {
        // Create file input for data loading
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.csv';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadDataFromFile(file);
            }
        };
        input.click();
    }

    async loadDataFromFile(file) {
        try {
            const text = await file.text();
            let data;

            if (file.name.endsWith('.json')) {
                data = JSON.parse(text);
            } else if (file.name.endsWith('.csv')) {
                // Simple CSV parsing - you might want to use a proper CSV parser
                console.warn('CSV loading not fully implemented yet');
                return;
            }

            // Validate data
            const validation = window.DataProcessor.validate.data(data);
            if (!validation.valid) {
                throw new Error('Invalid data format: ' + validation.error);
            }

            // Load the data
            this.currentData = data;
            if (this.currentChart) {
                this.currentChart.render(data);
            }

            console.log('Data loaded from file successfully');

        } catch (error) {
            console.error('Failed to load data from file:', error);
            alert('Failed to load data: ' + error.message);
        }
    }

    loadSampleData() {
        if (window.SAMPLE_FINANCIAL_DATA) {
            this.currentData = window.SAMPLE_FINANCIAL_DATA;
            if (this.currentChart) {
                this.currentChart.render(this.currentData);
            }
            console.log('Sample data loaded');
        } else {
            alert('Sample data not available');
        }
    }

    exportChart(format) {
        if (!this.currentChart) {
            alert('No chart to export');
            return;
        }

        try {
            switch (format) {
                case 'png':
                    this.currentChart.exportToPNG();
                    break;
                case 'svg':
                    this.currentChart.exportToSVG();
                    break;
                case 'data':
                    if (this.currentData) {
                        window.ExportUtils.exportDataToCSV(this.currentData);
                    }
                    break;
                default:
                    console.warn('Unknown export format:', format);
            }
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed: ' + error.message);
        }
    }

    resetToDefaults() {
        if (!this.currentChart) return;

        const defaultConfig = this.getDefaultConfig(this.currentChartType);
        this.currentChart.updateConfig(defaultConfig);
        this.controlPanel.generateControls(this.currentChart);
        
        console.log('Chart reset to defaults');
    }

    handleResize() {
        if (this.currentChart && this.currentChart.chartInstance && this.currentChart.chartInstance.resize) {
            const container = document.getElementById('main-chart');
            if (container) {
                const rect = container.getBoundingClientRect();
                this.currentChart.chartInstance.resize(rect.width - 40, rect.height - 40);
            }
        }
    }

    handleKeyboard(event) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key.toLowerCase()) {
                case 's':
                    event.preventDefault();
                    this.exportChart('png');
                    break;
                case 'r':
                    event.preventDefault();
                    this.resetToDefaults();
                    break;
                case 'l':
                    event.preventDefault();
                    this.handleLoadData();
                    break;
            }
        }
    }

    hideLoadingIndicator() {
        const loading = document.querySelector('.chart-loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    showError(message) {
        this.hideLoadingIndicator();
        
        const container = document.getElementById('main-chart');
        if (container) {
            container.innerHTML = `
                <div style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 400px;
                    color: #e74c3c;
                    text-align: center;
                    padding: 2rem;
                ">
                    <h3 style="margin-bottom: 1rem;">⚠ Error</h3>
                    <p style="color: #6c757d; max-width: 400px;">${message}</p>
                    <button onclick="location.reload()" style="
                        margin-top: 1rem;
                        padding: 0.5rem 1rem;
                        background: #667eea;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    ">Reload Application</button>
                </div>
            `;
        }
    }
}

// Global API for external access
window.PulseApp = null;

// Initialize application when DOM is ready
function initializePulseApp() {
    try {
        window.PulseApp = new PulseApplication();
    } catch (error) {
        console.error('Failed to create Pulse Application:', error);
    }
}

// Start the application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePulseApp);
} else {
    initializePulseApp();
}

// Global error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});