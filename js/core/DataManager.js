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
            console.error(`❌ Failed to load dataset '${key}' from ${datasetInfo.file}: ${error.message}`);
            throw new Error(`Failed to load dataset '${key}' from ${datasetInfo.file}: ${error.message}`);
        }
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

        // Transform revenue components (depth 0) - no aggregation
        let sortOrder = 1;
        if (incomeStatement.revenue) {
            Object.entries(incomeStatement.revenue).forEach(([key, value]) => {
                if (key !== 'total_revenue' && typeof value === 'number') {
                    const nodeName = this.formatNodeName(key);
                    addNode(nodeName, 0, value, 'revenue', 'revenue_sources', sortOrder++);
                    // Link directly to gross profit instead of total revenue aggregation
                    addLink(nodeName, 'Gross Profit', value, 'revenue');
                }
            });
        }

        // Add gross profit and COGS (depth 1) - no total revenue dependency
        addNode('Gross Profit', 1, incomeStatement.gross_profit || 0, 'profit', 'gross_metrics', 1);
        addNode('Cost of Goods Sold', 1, incomeStatement.cost_of_goods_sold?.total_cogs || 0, 'cost', 'gross_metrics', 2);

        // Add operating metrics (depth 2) - link to gross profit
        addNode('Operating Income', 2, incomeStatement.operating_income || 0, 'profit', 'operating_metrics', 1);
        
        const totalOpEx = incomeStatement.operating_expenses?.total_operating_expenses || 0;
        addNode('Operating Expenses', 2, totalOpEx, 'expense', 'operating_metrics', 2);
        
        addLink('Gross Profit', 'Operating Income', incomeStatement.operating_income || 0, 'profit');
        addLink('Gross Profit', 'Operating Expenses', totalOpEx, 'expense');

        // Add operating expense breakdown (depth 3)
        sortOrder = 1;
        if (incomeStatement.operating_expenses) {
            Object.entries(incomeStatement.operating_expenses).forEach(([key, value]) => {
                if (key !== 'total_operating_expenses' && typeof value === 'number') {
                    const nodeName = this.formatNodeName(key);
                    addNode(nodeName, 3, value, 'expense', 'operating_expenses', sortOrder++);
                    addLink('Operating Expenses', nodeName, value, 'expense');
                }
            });
        }

        // Add final results (depth 3)
        addNode('Net Income', 3, incomeStatement.net_income || 0, 'income', 'final_results', 1);
        addLink('Operating Income', 'Net Income', incomeStatement.net_income || 0, 'income');

        if (incomeStatement.tax_expense) {
            addNode('Tax Expense', 3, incomeStatement.tax_expense, 'expense', 'final_adjustments', 1);
            addLink('Operating Income', 'Tax Expense', incomeStatement.tax_expense, 'expense');
        }

        console.log(`✅ Transformation complete: ${nodes.length} nodes, ${links.length} links`);

        return {
            metadata: {
                ...incomeStatement.company_info,
                title: `${incomeStatement.company_info?.name || 'Company'} Financial Flow`,
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
        
        // Detect chart type based on data structure
        const isBarChartData = data.categories || data.series || data.values;
        const isSankeyChartData = data.nodes || data.links;
        
        if (isBarChartData) {
            // Validate Bar Chart data format
            console.log('📊 Validating Bar Chart data format');
            
            // Check for at least one of the required bar chart formats
            if (!data.categories && !data.values && !data.series && !Array.isArray(data)) {
                errors.push('Bar chart data must contain categories, values, series, or be an array');
            }
            
            // Validate categories format
            if (data.categories && !Array.isArray(data.categories)) {
                errors.push('Categories must be an array');
            }
            
            // Validate values format
            if (data.values && !Array.isArray(data.values)) {
                errors.push('Values must be an array');
            }
            
            // Validate series format
            if (data.series && (!Array.isArray(data.series) || 
                data.series.some(s => !s.name || !Array.isArray(s.data)))) {
                errors.push('Series must be an array of objects with name and data properties');
            }
            
        } else if (isSankeyChartData) {
            // Validate Sankey Chart data format
            console.log('📊 Validating Sankey Chart data format');
            
            if (!data.nodes || !Array.isArray(data.nodes)) {
                errors.push('Sankey data must contain a nodes array');
            }
            
            if (!data.links || !Array.isArray(data.links)) {
                errors.push('Sankey data must contain a links array');
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
            
        } else {
            // Unknown data format
            errors.push('Data format not recognized - must be Bar chart or Sankey chart format');
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