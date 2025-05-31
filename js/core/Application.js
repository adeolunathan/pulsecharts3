// js/core/Application.js
class PulseApplication {
    constructor() {
        this.eventBus = new EventBus();
        this.chartRegistry = new ChartRegistry();
        this.controlPanel = null;
        this.configManager = new ConfigManager();
        this.themeManager = new ThemeManager();
        this.currentChart = null;
        
        this.init();
    }

    init() {
        // Register available chart types
        this.registerChartTypes();
        
        // Initialize UI components
        this.initializeUI();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Load default chart
        this.loadDefaultChart();
    }

    registerChartTypes() {
        // Register your existing Sankey chart
        this.chartRegistry.register('sankey', {
            name: 'Sankey Flow Chart',
            description: 'Financial flow visualization',
            chartClass: ProfessionalSankeyChart,
            capabilities: SankeyCapabilities,
            sampleData: SAMPLE_FINANCIAL_DATA
        });

        // Future chart types will be registered here
        // this.chartRegistry.register('bar', BarChartDefinition);
        // this.chartRegistry.register('line', LineChartDefinition);
    }

    createChart(type, containerId, config = {}) {
        const chartDefinition = this.chartRegistry.get(type);
        if (!chartDefinition) {
            throw new Error(`Chart type '${type}' not found`);
        }

        // Wrap your existing chart to implement the interface
        const chart = new ChartWrapper(
            chartDefinition.chartClass,
            chartDefinition.capabilities,
            containerId,
            config
        );

        return chart;
    }
}