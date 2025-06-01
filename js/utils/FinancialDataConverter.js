/**
 * Financial Data Converter
 * Transforms intuitive income statement format into Sankey chart format
 */

class FinancialDataConverter {
    constructor() {
        this.nodeId = 0;
        this.linkId = 0;
    }

    /**
     * Convert income statement format to Sankey format
     * @param {Object} inputData - Income statement data
     * @returns {Object} - Sankey chart data with nodes and links
     */
    convertToSankeyFormat(inputData) {
        const nodes = [];
        const links = [];
        
        const { flow_structure, metadata, display_settings = {} } = inputData;
        
        // Track all nodes for sorting and grouping
        const nodesByDepth = new Map();
        
        // Step 1: Create all nodes with proper depth assignment
        
        // Depth 0: Revenue sources
        flow_structure.revenue_sources.forEach((source, index) => {
            const node = {
                id: source.id,
                depth: 0,
                value: source.value,
                category: source.category,
                description: source.description,
                order: source.order || index,
                type: 'revenue_source'
            };
            nodes.push(node);
            this.addToDepthMap(nodesByDepth, 0, node);
        });

        // Depth 1-N: Intermediate flows
        let currentDepth = 1;
        flow_structure.intermediate_flows.forEach((flow, index) => {
            const node = {
                id: flow.id,
                depth: currentDepth,
                value: flow.value,
                category: flow.category,
                description: flow.description,
                order: index,
                type: 'intermediate_flow'
            };
            nodes.push(node);
            this.addToDepthMap(nodesByDepth, currentDepth, node);
            
            // Increment depth for major flow transitions
            if (flow.id === 'Total Revenue' || flow.id === 'Gross Profit' || flow.id === 'Operating Profit') {
                currentDepth++;
            }
        });

        // Final depth: Expense breakdowns and results
        const finalDepth = currentDepth;
        
        // Add expense breakdowns
        if (flow_structure.expense_breakdown) {
            flow_structure.expense_breakdown.forEach((expense) => {
                const node = {
                    id: expense.id,
                    depth: finalDepth,
                    value: expense.value,
                    category: expense.category,
                    description: expense.description,
                    order: expense.order,
                    parent: expense.parent,
                    type: 'expense'
                };
                nodes.push(node);
                this.addToDepthMap(nodesByDepth, finalDepth, node);
            });
        }

        // Add final results
        if (flow_structure.final_results) {
            flow_structure.final_results.forEach((result) => {
                const node = {
                    id: result.id,
                    depth: finalDepth,
                    value: result.value,
                    category: result.category,
                    description: result.description,
                    order: result.order,
                    parent: result.parent,
                    type: 'final_result'
                };
                nodes.push(node);
                this.addToDepthMap(nodesByDepth, finalDepth, node);
            });
        }

        // Step 2: Sort nodes within each depth
        if (display_settings.sort_by_value) {
            this.sortNodesByValue(nodesByDepth);
        }

        // Step 3: Create links based on relationships
        this.createLinks(nodes, links, flow_structure, display_settings);

        // Step 4: Ensure consistent link-node heights
        if (display_settings.link_height_matching) {
            this.adjustLinkHeights(nodes, links);
        }

        return {
            nodes: nodes,
            links: links,
            metadata: metadata
        };
    }

    /**
     * Add node to depth mapping for sorting
     */
    addToDepthMap(nodesByDepth, depth, node) {
        if (!nodesByDepth.has(depth)) {
            nodesByDepth.set(depth, []);
        }
        nodesByDepth.get(depth).push(node);
    }

    /**
     * Sort nodes by value within each depth, with grouping
     */
    sortNodesByValue(nodesByDepth) {
        nodesByDepth.forEach((nodes, depth) => {
            if (depth === 0) {
                // Revenue sources: sort by order first, then by value
                nodes.sort((a, b) => {
                    if (a.order !== undefined && b.order !== undefined) {
                        return a.order - b.order;
                    }
                    return b.value - a.value;
                });
            } else {
                // Group by parent, then sort by value within groups
                const grouped = this.groupByParent(nodes);
                const sorted = [];
                
                // Sort each group by value (descending)
                Object.values(grouped).forEach(group => {
                    group.sort((a, b) => {
                        // Primary sort by order if specified
                        if (a.order !== undefined && b.order !== undefined) {
                            return a.order - b.order;
                        }
                        // Secondary sort by value (descending for positive flows, ascending for expenses)
                        if (a.type === 'expense' || a.category.includes('expense') || a.category.includes('tax')) {
                            return a.value - b.value; // Ascending for expenses
                        }
                        return b.value - a.value; // Descending for positive flows
                    });
                    sorted.push(...group);
                });
                
                // Replace original array with sorted nodes
                nodesByDepth.set(depth, sorted);
            }
        });
    }

    /**
     * Group nodes by their parent relationship
     */
    groupByParent(nodes) {
        const groups = {};
        nodes.forEach(node => {
            const parent = node.parent || 'no_parent';
            if (!groups[parent]) {
                groups[parent] = [];
            }
            groups[parent].push(node);
        });
        return groups;
    }

    /**
     * Create links between nodes based on financial relationships
     */
    createLinks(nodes, links, flow_structure, display_settings) {
        const nodeMap = new Map(nodes.map(node => [node.id, node]));

        // 1. Revenue sources to Total Revenue
        const totalRevenue = nodeMap.get('Total Revenue');
        if (totalRevenue) {
            flow_structure.revenue_sources.forEach(source => {
                links.push({
                    source: source.id,
                    target: 'Total Revenue',
                    value: source.value,
                    type: 'revenue'
                });
            });
        }

        // 2. Total Revenue splits to Cost and Gross Profit
        const costOfRevenue = nodeMap.get('Cost of Revenue');
        const grossProfit = nodeMap.get('Gross Profit');
        
        if (totalRevenue && costOfRevenue) {
            links.push({
                source: 'Total Revenue',
                target: 'Cost of Revenue',
                value: costOfRevenue.value,
                type: 'cost'
            });
        }
        
        if (totalRevenue && grossProfit) {
            links.push({
                source: 'Total Revenue',
                target: 'Gross Profit',
                value: grossProfit.value,
                type: 'profit'
            });
        }

        // 3. Gross Profit splits to Operating Expenses and Operating Profit
        const operatingExpenses = nodeMap.get('Operating Expenses');
        const operatingProfit = nodeMap.get('Operating Profit');
        
        if (grossProfit && operatingExpenses) {
            links.push({
                source: 'Gross Profit',
                target: 'Operating Expenses',
                value: operatingExpenses.value,
                type: 'expense'
            });
        }
        
        if (grossProfit && operatingProfit) {
            links.push({
                source: 'Gross Profit',
                target: 'Operating Profit',
                value: operatingProfit.value,
                type: 'profit'
            });
        }

        // 4. Operating Expenses breakdown
        if (flow_structure.expense_breakdown) {
            flow_structure.expense_breakdown.forEach(expense => {
                if (expense.parent === 'Operating Expenses') {
                    links.push({
                        source: 'Operating Expenses',
                        target: expense.id,
                        value: expense.value,
                        type: 'expense'
                    });
                }
            });
        }

        // 5. Operating Profit breakdown to final results
        if (flow_structure.final_results) {
            flow_structure.final_results.forEach(result => {
                if (result.parent === 'Operating Profit') {
                    links.push({
                        source: 'Operating Profit',
                        target: result.id,
                        value: result.value,
                        type: result.category.includes('income') ? 'income' : 'expense'
                    });
                }
            });
        }
    }

    /**
     * Adjust link heights to match node heights for consistency
     */
    adjustLinkHeights(nodes, links) {
        // Create a map of node values for quick lookup
        const nodeValues = new Map(nodes.map(node => [node.id, node.value]));
        
        // Group links by source node
        const linksBySource = new Map();
        links.forEach(link => {
            if (!linksBySource.has(link.source)) {
                linksBySource.set(link.source, []);
            }
            linksBySource.get(link.source).push(link);
        });

        // Ensure each node's outflow links sum to the node's total outflow
        linksBySource.forEach((sourceLinks, sourceId) => {
            const sourceNode = nodes.find(n => n.id === sourceId);
            if (!sourceNode) return;

            const totalLinkValue = sourceLinks.reduce((sum, link) => sum + link.value, 0);
            const sourceValue = sourceNode.value;

            // If there's a mismatch, proportionally adjust link values
            if (Math.abs(totalLinkValue - sourceValue) > 0.01) {
                const scaleFactor = sourceValue / totalLinkValue;
                sourceLinks.forEach(link => {
                    link.value *= scaleFactor;
                });
            }
        });

        // Similarly, ensure inflow consistency for target nodes
        const linksByTarget = new Map();
        links.forEach(link => {
            if (!linksByTarget.has(link.target)) {
                linksByTarget.set(link.target, []);
            }
            linksByTarget.get(link.target).push(link);
        });

        linksByTarget.forEach((targetLinks, targetId) => {
            const targetNode = nodes.find(n => n.id === targetId);
            if (!targetNode) return;

            const totalLinkValue = targetLinks.reduce((sum, link) => sum + link.value, 0);
            const targetValue = targetNode.value;

            // For nodes that receive multiple inflows, ensure they balance
            if (targetLinks.length > 1 && Math.abs(totalLinkValue - targetValue) > 0.01) {
                const scaleFactor = targetValue / totalLinkValue;
                targetLinks.forEach(link => {
                    link.value *= scaleFactor;
                });
            }
        });
    }

    /**
     * Generate standard template for users to follow
     */
    generateTemplate(templateType = 'complete') {
        const templates = {
            minimal: {
                metadata: {
                    title: "Company Financial Flow",
                    subtitle: "Period",
                    currency: "USD",
                    unit: "millions"
                },
                income_statement: {
                    revenue: {
                        "revenue_line_1": 0,
                        "revenue_line_2": 0
                    },
                    cost_of_revenue: 0,
                    operating_expenses: {
                        "expense_1": 0,
                        "expense_2": 0
                    },
                    other_expenses: {
                        "tax_expense": 0
                    }
                }
            },
            
            complete: {
                metadata: {
                    title: "Company Financial Flow",
                    subtitle: "Q1 2025 Financial Performance",
                    currency: "USD",
                    unit: "millions",
                    period: "Q1 2025",
                    company: "Your Company Name"
                },
                flow_structure: {
                    revenue_sources: [
                        {
                            id: "Product Revenue",
                            value: 100,
                            category: "product_revenue",
                            description: "Revenue from product sales",
                            order: 1
                        },
                        {
                            id: "Service Revenue", 
                            value: 50,
                            category: "service_revenue",
                            description: "Revenue from services",
                            order: 2
                        }
                    ],
                    intermediate_flows: [
                        {
                            id: "Total Revenue",
                            value: 150,
                            category: "total_revenue",
                            description: "Sum of all revenue sources"
                        },
                        {
                            id: "Cost of Revenue",
                            value: 60,
                            category: "cost_of_revenue",
                            description: "Direct costs"
                        },
                        {
                            id: "Gross Profit",
                            value: 90,
                            category: "gross_profit",
                            description: "Revenue minus direct costs"
                        },
                        {
                            id: "Operating Expenses",
                            value: 50,
                            category: "operating_expenses",
                            description: "Operating expenses"
                        },
                        {
                            id: "Operating Profit",
                            value: 40,
                            category: "operating_profit",
                            description: "Operating profit"
                        }
                    ],
                    expense_breakdown: [
                        {
                            id: "Sales & Marketing",
                            value: 30,
                            category: "sales_marketing",
                            description: "Sales and marketing expenses",
                            parent: "Operating Expenses",
                            order: 1
                        },
                        {
                            id: "R&D",
                            value: 20,
                            category: "research_development", 
                            description: "Research and development",
                            parent: "Operating Expenses",
                            order: 2
                        }
                    ],
                    final_results: [
                        {
                            id: "Net Income",
                            value: 30,
                            category: "net_income",
                            description: "Final net income",
                            parent: "Operating Profit",
                            order: 1
                        },
                        {
                            id: "Tax Expense",
                            value: 10,
                            category: "tax_expense",
                            description: "Tax expense",
                            parent: "Operating Profit",
                            order: 2
                        }
                    ]
                },
                display_settings: {
                    sort_by_value: true,
                    group_by_parent: true,
                    show_percentages: true,
                    link_height_matching: true
                }
            }
        };

        return templates[templateType] || templates.complete;
    }

    /**
     * Validate input data structure
     */
    validateInputData(data) {
        const errors = [];
        const warnings = [];

        // Check required top-level properties
        if (!data.metadata) errors.push("Missing 'metadata' section");
        if (!data.flow_structure) errors.push("Missing 'flow_structure' section");

        if (data.flow_structure) {
            // Check revenue sources
            if (!data.flow_structure.revenue_sources || !Array.isArray(data.flow_structure.revenue_sources)) {
                errors.push("Missing or invalid 'revenue_sources' array");
            } else {
                data.flow_structure.revenue_sources.forEach((source, i) => {
                    if (!source.id) errors.push(`Revenue source ${i} missing 'id'`);
                    if (source.value === undefined) errors.push(`Revenue source ${i} missing 'value'`);
                });
            }

            // Check intermediate flows
            if (!data.flow_structure.intermediate_flows || !Array.isArray(data.flow_structure.intermediate_flows)) {
                warnings.push("Missing 'intermediate_flows' array - will use defaults");
            }

            // Validate flow balance
            const balanceCheck = this.validateFlowBalance(data);
            if (balanceCheck.errors.length > 0) {
                warnings.push(...balanceCheck.errors);
            }
        }

        return { errors, warnings, valid: errors.length === 0 };
    }

    /**
     * Check that flows balance correctly
     */
    validateFlowBalance(data) {
        const errors = [];
        
        if (!data.flow_structure) return { errors };

        // Calculate expected totals
        const revenueTotal = data.flow_structure.revenue_sources?.reduce((sum, source) => sum + source.value, 0) || 0;
        const totalRevenue = data.flow_structure.intermediate_flows?.find(f => f.id === 'Total Revenue')?.value;
        
        if (totalRevenue && Math.abs(revenueTotal - totalRevenue) > 0.01) {
            errors.push(`Revenue total mismatch: sources sum to ${revenueTotal}, but Total Revenue is ${totalRevenue}`);
        }

        // Check expense breakdown sums
        const expenseTotal = data.flow_structure.expense_breakdown?.reduce((sum, exp) => sum + exp.value, 0) || 0;
        const operatingExpenses = data.flow_structure.intermediate_flows?.find(f => f.id === 'Operating Expenses')?.value;
        
        if (operatingExpenses && Math.abs(expenseTotal - operatingExpenses) > 0.01) {
            errors.push(`Operating expenses mismatch: breakdown sums to ${expenseTotal}, but Operating Expenses is ${operatingExpenses}`);
        }

        return { errors };
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.FinancialDataConverter = FinancialDataConverter;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = FinancialDataConverter;
}