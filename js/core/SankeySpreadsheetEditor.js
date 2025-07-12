/* ===== SANKEY SPREADSHEET EDITOR ===== */
/* Specialized spreadsheet editor for Sankey flow charts */

class SankeySpreadsheetEditor extends SpreadsheetEditor {
    constructor(containerId, chartInstance) {
        super(containerId, chartInstance);
        this.chartType = 'sankey';
        this.init();
    }

    getDefaultConfig() {
        return {
            columns: [
                { id: 'source', label: 'From', type: 'text', required: true },
                { id: 'target', label: 'To', type: 'text', required: true },
                { id: 'value', label: 'Current', type: 'number', required: true },
                { id: 'previousValue', label: 'Previous', type: 'number', required: false },
                { id: 'description', label: 'Description', type: 'text', required: false }
            ],
            dataFormat: 'flows',
            title: '🌊 Sankey Flow Data Editor',
            allowDynamicColumns: false
        };
    }

    hasValidChartData(chartData) {
        return chartData && (chartData.flows || (chartData.nodes && chartData.links));
    }

    loadExistingChartData(chartData) {
        try {
            this.loadSankeyChartData(chartData);
            console.log('📊 Successfully loaded Sankey chart data into editor');
        } catch (error) {
            console.error('⚠️ Error loading Sankey chart data:', error);
            this.data = [this.createEmptyRow()];
        }
    }

    loadSankeyChartData(chartData) {
        // Handle different Sankey data formats
        let flows = [];
        
        if (chartData.flows) {
            flows = chartData.flows;
        } else if (chartData.links) {
            // Convert D3 Sankey format to flow format
            flows = chartData.links.map((link, index) => ({
                id: `flow_${index}`,
                source: link.source.id || link.source,
                target: link.target.id || link.target,
                value: link.value,
                previousValue: link.previousValue || 0,
                description: link.description || ''
            }));
        }
        
        this.data = flows.map(flow => ({
            source: flow.source || '',
            target: flow.target || '',
            value: flow.value || 0,
            previousValue: flow.previousValue || 0,
            description: flow.description || ''
        }));
        
        // Ensure we have the standard Sankey columns
        this.columns = [
            { id: 'source', label: 'From', type: 'text', required: true },
            { id: 'target', label: 'To', type: 'text', required: true },
            { id: 'value', label: 'Current', type: 'number', required: true },
            { id: 'previousValue', label: 'Previous', type: 'number', required: false },
            { id: 'description', label: 'Description', type: 'text', required: false }
        ];
    }

    getChartFormattedData() {
        return this.getSankeyChartFormattedData();
    }

    getSankeyChartFormattedData() {
        // Filter valid flows
        const validFlows = this.data.filter(row => {
            return row.source && row.source.trim() && 
                   row.target && row.target.trim() && 
                   row.value && row.value > 0;
        });
        
        if (validFlows.length === 0) {
            return {
                metadata: { title: "Sankey Data", chartType: "sankey", source: "sankey-spreadsheet-editor" },
                flows: []
            };
        }
        
        // Convert to flow format
        const flows = validFlows.map((row, index) => ({
            id: `flow_${index}`,
            source: row.source,
            target: row.target,
            value: row.value,
            previousValue: row.previousValue || 0,
            description: row.description || ''
        }));
        
        return {
            metadata: { title: "Sankey Flow Data", chartType: "sankey", source: "sankey-spreadsheet-editor" },
            flows: flows
        };
    }

    createColumnsFromHeaders(headerRow) {
        // Clear existing columns
        this.columns = [];
        
        // Create columns based on headers for Sankey charts
        headerRow.forEach((header, index) => {
            const sankeyColumns = ['source', 'target', 'value', 'previousValue', 'description'];
            const columnId = sankeyColumns[index] || `col_${index + 1}`;
            const columnType = ['source', 'target', 'description'].includes(columnId) ? 'text' : 'number';
            
            this.columns.push({
                id: columnId,
                name: header || `Column ${index + 1}`,
                label: header || `Column ${index + 1}`,
                type: columnType,
                required: index < 3 // First 3 columns are required (source, target, value)
            });
        });
    }

    testPaste() {
        const testData = `From	To	Current	Previous	Description
Revenue	Operations	1000000	950000	Core operational expenses
Operations	Marketing	250000	200000	Marketing and advertising
Operations	R&D	300000	280000	Research and development
Marketing	Customer Acquisition	150000	120000	New customer acquisition`;
        
        console.log('🧪 Testing Sankey paste with sample data');
        this.processPasteData(testData);
    }

    // Sankey-specific validation
    validateSankeyFlow(row) {
        return row.source && row.source.trim() && 
               row.target && row.target.trim() && 
               row.value && typeof row.value === 'number' && row.value > 0;
    }

    // Override updateChart to include Sankey-specific validation
    updateChart() {
        console.log('🔄 SankeySpreadsheetEditor: updateChart() called');
        
        // Validate flows before updating
        const invalidFlows = this.data.filter(row => !this.validateSankeyFlow(row) && 
            (row.source || row.target || row.value)); // Only check non-empty rows
        
        if (invalidFlows.length > 0) {
            console.warn('⚠️ Found invalid Sankey flows:', invalidFlows);
        }
        
        // Call parent updateChart
        super.updateChart();
    }

    // Add a method to get flow statistics
    getFlowStatistics() {
        const validFlows = this.data.filter(row => this.validateSankeyFlow(row));
        
        const sources = new Set(validFlows.map(f => f.source));
        const targets = new Set(validFlows.map(f => f.target));
        const totalValue = validFlows.reduce((sum, f) => sum + f.value, 0);
        
        return {
            totalFlows: validFlows.length,
            uniqueSources: sources.size,
            uniqueTargets: targets.size,
            totalValue: totalValue,
            averageValue: validFlows.length > 0 ? totalValue / validFlows.length : 0
        };
    }

    // Helper method to detect circular flows
    detectCircularFlows() {
        const validFlows = this.data.filter(row => this.validateSankeyFlow(row));
        const circularFlows = [];
        
        validFlows.forEach((flow, index) => {
            const reverseFlow = validFlows.find(f => 
                f.source === flow.target && f.target === flow.source
            );
            if (reverseFlow) {
                circularFlows.push({ flow, reverseFlow, index });
            }
        });
        
        return circularFlows;
    }

    // Add method to auto-balance flows (optional feature)
    suggestFlowBalance() {
        const validFlows = this.data.filter(row => this.validateSankeyFlow(row));
        const sourceMap = new Map();
        const targetMap = new Map();
        
        // Calculate totals for each node
        validFlows.forEach(flow => {
            // Source totals (outgoing)
            const currentOut = sourceMap.get(flow.source) || 0;
            sourceMap.set(flow.source, currentOut + flow.value);
            
            // Target totals (incoming)
            const currentIn = targetMap.get(flow.target) || 0;
            targetMap.set(flow.target, currentIn + flow.value);
        });
        
        const suggestions = [];
        
        // Find nodes that appear as both source and target
        const allNodes = new Set([...sourceMap.keys(), ...targetMap.keys()]);
        
        allNodes.forEach(node => {
            const outgoing = sourceMap.get(node) || 0;
            const incoming = targetMap.get(node) || 0;
            
            if (outgoing > 0 && incoming > 0) {
                const balance = incoming - outgoing;
                if (Math.abs(balance) > 0.01) { // Avoid floating point precision issues
                    suggestions.push({
                        node,
                        incoming,
                        outgoing,
                        balance,
                        suggestion: balance > 0 ? 'excess incoming' : 'excess outgoing'
                    });
                }
            }
        });
        
        return suggestions;
    }
}

// Export for use
window.SankeySpreadsheetEditor = SankeySpreadsheetEditor;
console.log('🚀 SankeySpreadsheetEditor loaded successfully');