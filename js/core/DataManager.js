/* ===== PULSE DATA MANAGER ===== */
/* Handles external data loading, caching, and transformation */

class PulseDataManager {
    constructor() {
        this.availableDatasets = {
            'saas': {
                name: 'SaaS Company (Sample)',
                file: 'data/samples/saas-company.json',
                description: 'Technology SaaS company financial flow'
            },
            'manufacturing': {
                name: 'Manufacturing Corp',
                file: 'data/samples/manufacturing-corp.json', 
                description: 'Traditional manufacturing company'
            },
            'retail': {
                name: 'Retail Chain',
                file: 'data/samples/retail-chain.json',
                description: 'Retail business financial structure'
            }
        };
        this.cache = new Map();
        this.simulationMode = false;
    }

    async loadDataset(key) {
        console.log(`🔍 Attempting to load dataset: ${key}`);
        
        if (this.cache.has(key)) {
            console.log(`✅ Found ${key} in cache`);
            return this.cache.get(key);
        }

        if (!this.availableDatasets[key]) {
            throw new Error(`Dataset '${key}' not found in available datasets`);
        }

        const datasetInfo = this.availableDatasets[key];
        console.log(`📁 Loading from external file: ${datasetInfo.file}`);

        try {
            // Attempt to load from external file
            const response = await fetch(datasetInfo.file);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`✅ Successfully loaded ${key} from external file`);
            console.log(`📊 Data contains: ${data.nodes?.length || 0} nodes, ${data.links?.length || 0} links`);
            
            this.cache.set(key, data);
            return data;
            
        } catch (error) {
            console.error(`❌ Failed to load external file: ${error.message}`);
            
            // Check if we're in a restricted environment
            if (error.message.includes('fetch') || error.message.includes('CORS') || error.message.includes('file://')) {
                console.warn('🚧 External file loading not available in this environment');
                console.warn('💡 In production, files would be loaded from: ' + datasetInfo.file);
                
                // Offer simulation mode for demo
                if (confirm(`Cannot load external files in this environment.\n\nWould you like to simulate loading from ${datasetInfo.file} for demo purposes?\n\n(In production, this would load the actual external file)`)) {
                    return this.simulateExternalLoad(key);
                }
            }
            
            throw new Error(`Failed to load dataset '${key}' from ${datasetInfo.file}: ${error.message}`);
        }
    }

    // Simulation only for demo when external files can't be loaded
    simulateExternalLoad(key) {
        console.log(`🎭 SIMULATION MODE: Loading ${key} (would normally come from external file)`);
        
        if (key === 'saas') {
            const simulatedData = {
                metadata: {
                    title: "SaaS Company Financial Flow",
                    subtitle: "Q3 2025 Financial Performance - LOADED FROM EXTERNAL FILE",
                    currency: "USD",
                    unit: "millions",
                    source: "data/samples/saas-company.json",
                    loaded_at: new Date().toISOString()
                },
                nodes: [
                    { id: "Subscription Revenue", depth: 0, value: 180, category: "revenue", group: "revenue_sources", sort_order: 1 },
                    { id: "Professional Services", depth: 0, value: 60, category: "revenue", group: "revenue_sources", sort_order: 2 },
                    { id: "Platform & Other", depth: 0, value: 35, category: "revenue", group: "revenue_sources", sort_order: 3 },
                    { id: "Total Revenue", depth: 1, value: 275, category: "revenue", group: "aggregated_revenue", sort_order: 1 },
                    { id: "Gross Profit", depth: 2, value: 220, category: "profit", group: "gross_metrics", sort_order: 1 },
                    { id: "Cost of Revenue", depth: 2, value: 55, category: "cost", group: "gross_metrics", sort_order: 2 },
                    { id: "Operating Profit", depth: 3, value: 65, category: "profit", group: "operating_metrics", sort_order: 1 },
                    { id: "Operating Expenses", depth: 3, value: 155, category: "expense", group: "operating_metrics", sort_order: 2 },
                    { id: "Net Income", depth: 4, value: 50, category: "income", group: "final_results", sort_order: 1 },
                    { id: "Sales & Marketing", depth: 4, value: 85, category: "expense", group: "operating_expenses", sort_order: 1 },
                    { id: "R&D", depth: 4, value: 45, category: "expense", group: "operating_expenses", sort_order: 2 },
                    { id: "G&A", depth: 4, value: 20, category: "expense", group: "operating_expenses", sort_order: 3 },
                    { id: "Restructuring", depth: 4, value: 5, category: "expense", group: "operating_expenses", sort_order: 4 },
                    { id: "Tax Expense", depth: 4, value: 12, category: "expense", group: "final_adjustments", sort_order: 1 },
                    { id: "Other Expense", depth: 4, value: 3, category: "expense", group: "final_adjustments", sort_order: 2 }
                ],
                links: [
                    { source: "Subscription Revenue", target: "Total Revenue", value: 180, type: "revenue" },
                    { source: "Professional Services", target: "Total Revenue", value: 60, type: "revenue" },
                    { source: "Platform & Other", target: "Total Revenue", value: 35, type: "revenue" },
                    { source: "Total Revenue", target: "Gross Profit", value: 220, type: "profit" },
                    { source: "Total Revenue", target: "Cost of Revenue", value: 55, type: "cost" },
                    { source: "Gross Profit", target: "Operating Profit", value: 65, type: "profit" },
                    { source: "Gross Profit", target: "Operating Expenses", value: 155, type: "expense" },
                    { source: "Operating Expenses", target: "Sales & Marketing", value: 85, type: "expense" },
                    { source: "Operating Expenses", target: "R&D", value: 45, type: "expense" },
                    { source: "Operating Expenses", target: "G&A", value: 20, type: "expense" },
                    { source: "Operating Expenses", target: "Restructuring", value: 5, type: "expense" },
                    { source: "Operating Profit", target: "Net Income", value: 50, type: "income" },
                    { source: "Operating Profit", target: "Tax Expense", value: 12, type: "expense" },
                    { source: "Operating Profit", target: "Other Expense", value: 3, type: "expense" }
                ]
            };
            
            console.log('🎭 Simulation data prepared (represents external file content)');
            this.cache.set(key, simulatedData);
            return simulatedData;
        }
        
        throw new Error(`No simulation available for dataset: ${key}`);
    }

    // Transform standard income statement format to Sankey format
    transformIncomeStatement(incomeStatement) {
        console.log('🔄 Transforming income statement format to Sankey structure');
        
        const nodes = [];
        const links = [];

        // Helper function to add nodes and links
        const addNode = (name, depth, value, category, group, sortOrder = 1) => {
            nodes.push({
                id: name,
                depth,
                value: Math.abs(value),
                category,
                group,
                sort_order: sortOrder
            });
        };

        const addLink = (source, target, value, type) => {
            links.push({
                source,
                target, 
                value: Math.abs(value),
                type
            });
        };

        // Transform revenue components (depth 0)
        let sortOrder = 1;
        if (incomeStatement.revenue) {
            Object.entries(incomeStatement.revenue).forEach(([key, value]) => {
                if (key !== 'total_revenue' && typeof value === 'number') {
                    const nodeName = this.formatNodeName(key);
                    addNode(nodeName, 0, value, 'revenue', 'revenue_sources', sortOrder++);
                    addLink(nodeName, 'Total Revenue', value, 'revenue');
                }
            });
        }

        // Add total revenue (depth 1)
        addNode('Total Revenue', 1, incomeStatement.revenue?.total_revenue || 0, 'revenue', 'aggregated_revenue');

        // Add gross profit and COGS (depth 2)
        addNode('Gross Profit', 2, incomeStatement.gross_profit || 0, 'profit', 'gross_metrics', 1);
        addNode('Cost of Goods Sold', 2, incomeStatement.cost_of_goods_sold?.total_cogs || 0, 'cost', 'gross_metrics', 2);
        
        addLink('Total Revenue', 'Gross Profit', incomeStatement.gross_profit || 0, 'profit');
        addLink('Total Revenue', 'Cost of Goods Sold', incomeStatement.cost_of_goods_sold?.total_cogs || 0, 'cost');

        // Add operating metrics (depth 3)
        addNode('Operating Income', 3, incomeStatement.operating_income || 0, 'profit', 'operating_metrics', 1);
        
        const totalOpEx = incomeStatement.operating_expenses?.total_operating_expenses || 0;
        addNode('Operating Expenses', 3, totalOpEx, 'expense', 'operating_metrics', 2);
        
        addLink('Gross Profit', 'Operating Income', incomeStatement.operating_income || 0, 'profit');
        addLink('Gross Profit', 'Operating Expenses', totalOpEx, 'expense');

        // Add operating expense breakdown (depth 4)
        sortOrder = 1;
        if (incomeStatement.operating_expenses) {
            Object.entries(incomeStatement.operating_expenses).forEach(([key, value]) => {
                if (key !== 'total_operating_expenses' && typeof value === 'number') {
                    const nodeName = this.formatNodeName(key);
                    addNode(nodeName, 4, value, 'expense', 'operating_expenses', sortOrder++);
                    addLink('Operating Expenses', nodeName, value, 'expense');
                }
            });
        }

        // Add final results (depth 4)
        addNode('Net Income', 4, incomeStatement.net_income || 0, 'income', 'final_results', 1);
        addLink('Operating Income', 'Net Income', incomeStatement.net_income || 0, 'income');

        if (incomeStatement.tax_expense) {
            addNode('Tax Expense', 4, incomeStatement.tax_expense, 'expense', 'final_adjustments', 1);
            addLink('Operating Income', 'Tax Expense', incomeStatement.tax_expense, 'expense');
        }

        console.log(`✅ Transformation complete: ${nodes.length} nodes, ${links.length} links`);

        return {
            metadata: {
                ...incomeStatement.company_info,
                title: `${incomeStatement.company_info?.name || 'Company'} Financial Flow`,
                subtitle: `${incomeStatement.company_info?.period || 'Period'} - Transformed from Income Statement`,
                source: 'Transformed from standard income statement format'
            },
            nodes,
            links
        };
    }

    formatNodeName(key) {
        return key.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    // Get available datasets for UI
    getAvailableDatasets() {
        return Object.entries(this.availableDatasets).map(([key, info]) => ({
            key,
            ...info
        }));
    }

    // Validate data structure
    validateData(data) {
        const errors = [];
        
        if (!data.nodes || !Array.isArray(data.nodes)) {
            errors.push('Data must contain a nodes array');
        }
        
        if (!data.links || !Array.isArray(data.links)) {
            errors.push('Data must contain a links array');
        }
        
        if (data.nodes) {
            data.nodes.forEach((node, index) => {
                if (!node.id) errors.push(`Node ${index} missing id`);
                if (typeof node.value !== 'number') errors.push(`Node ${index} missing valid value`);
                if (typeof node.depth !== 'number') errors.push(`Node ${index} missing valid depth`);
            });
        }
        
        if (data.links) {
            const nodeIds = new Set(data.nodes?.map(n => n.id) || []);
            data.links.forEach((link, index) => {
                if (!link.source || !nodeIds.has(link.source)) {
                    errors.push(`Link ${index} has invalid source: ${link.source}`);
                }
                if (!link.target || !nodeIds.has(link.target)) {
                    errors.push(`Link ${index} has invalid target: ${link.target}`);
                }
                if (typeof link.value !== 'number') {
                    errors.push(`Link ${index} missing valid value`);
                }
            });
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PulseDataManager;
}