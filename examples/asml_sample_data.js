/* ===== PULSE SAMPLE FINANCIAL DATA ===== */
/* Updated to match Salesforce flow structure: Revenue → Gross/COGS → Operating/OpEx → Final */

// Financial flow data matching Salesforce structure
window.SAMPLE_FINANCIAL_DATA = {
    // Node definitions - following Salesforce flow pattern
    nodes: [
        // Revenue Segments (Depth 0)
        { 
            id: "Subscription Revenue", 
            depth: 0, 
            value: 180, // Largest revenue source
            category: "revenue",
            description: "Recurring subscription revenue from SaaS platform"
        },
        { 
            id: "Professional Services", 
            depth: 0, 
            value: 60,
            category: "revenue",
            description: "Implementation and consulting services"
        },
        { 
            id: "Platform & Other", 
            depth: 0, 
            value: 35,
            category: "revenue",
            description: "Platform fees and miscellaneous revenue"
        },
        
        // Total Revenue (Depth 1)
        { 
            id: "Total Revenue", 
            depth: 1, 
            value: 275, // 180 + 60 + 35 = 275
            category: "revenue",
            description: "Aggregate of all revenue sources"
        },
        
        // Revenue Split (Depth 2) - Following Salesforce pattern
        { 
            id: "Gross Profit", 
            depth: 2, 
            value: 220, // 275 - 55 = 220
            category: "profit",
            description: "Revenue minus direct costs"
        },
        { 
            id: "Cost of Revenue", 
            depth: 2, 
            value: 55,
            category: "cost",
            description: "Direct costs associated with delivering services"
        },
        
        // Gross Profit Split (Depth 3) - Key Salesforce pattern
        { 
            id: "Operating Profit", 
            depth: 3, 
            value: 65, // 220 - 155 = 65
            category: "profit",
            description: "Profit from core business operations"
        },
        { 
            id: "Operating Expenses", 
            depth: 3, 
            value: 155, // Intermediate node that splits further
            category: "expense",
            description: "Total operating expenses before allocation"
        },
        
        // Operating Expenses Breakdown (Depth 4) - Following Salesforce
        { 
            id: "Sales & Marketing", 
            depth: 4, 
            value: 85, // Largest operating expense
            category: "expense",
            description: "Customer acquisition and marketing costs",
            parentOrder: 1 // First in Operating Expenses group
        },
        { 
            id: "R&D", 
            depth: 4, 
            value: 45,
            category: "expense",
            description: "Research and development expenses",
            parentOrder: 2 // Second in Operating Expenses group
        },
        { 
            id: "G&A", 
            depth: 4, 
            value: 20,
            category: "expense",
            description: "General and administrative expenses",
            parentOrder: 3 // Third in Operating Expenses group
        },
        { 
            id: "Restructuring", 
            depth: 4, 
            value: 5,
            category: "expense",
            description: "Restructuring and other expenses",
            parentOrder: 4 // Last in Operating Expenses group
        },
        
        // Final Results (Depth 4) - From Operating Profit
        { 
            id: "Net Income", 
            depth: 4, 
            value: 50, // 65 - 12 - 3 = 50
            category: "income",
            description: "Final bottom-line profit",
            parentOrder: 1 // First in Operating Profit group (most important)
        },
        { 
            id: "Tax Expense", 
            depth: 4, 
            value: 12,
            category: "expense",
            description: "Corporate income tax expense",
            parentOrder: 2 // Second in Operating Profit group
        },
        { 
            id: "Other Expense", 
            depth: 4, 
            value: 3,
            category: "expense",
            description: "Interest and other non-operating expenses",
            parentOrder: 3 // Last in Operating Profit group
        }
    ],

    // Link definitions - CORRECTED to match Salesforce flow structure
    links: [
        // Revenue segments → Total Revenue
        { source: "Subscription Revenue", target: "Total Revenue", value: 180, type: "revenue" },
        { source: "Professional Services", target: "Total Revenue", value: 60, type: "revenue" },
        { source: "Platform & Other", target: "Total Revenue", value: 35, type: "revenue" },
        
        // Total Revenue → Gross Profit + Cost of Revenue (Salesforce pattern)
        { source: "Total Revenue", target: "Gross Profit", value: 220, type: "profit" },
        { source: "Total Revenue", target: "Cost of Revenue", value: 55, type: "cost" },
        
        // Gross Profit → Operating Profit + Operating Expenses (Key Salesforce flow)
        { source: "Gross Profit", target: "Operating Profit", value: 65, type: "profit" },
        { source: "Gross Profit", target: "Operating Expenses", value: 155, type: "expense" },
        
        // Operating Expenses → Individual expense categories (Salesforce breakdown)
        { source: "Operating Expenses", target: "Sales & Marketing", value: 85, type: "expense" },
        { source: "Operating Expenses", target: "R&D", value: 45, type: "expense" },
        { source: "Operating Expenses", target: "G&A", value: 20, type: "expense" },
        { source: "Operating Expenses", target: "Restructuring", value: 5, type: "expense" },
        
        // Operating Profit → Final results (Salesforce pattern)
        { source: "Operating Profit", target: "Net Income", value: 50, type: "income" },
        { source: "Operating Profit", target: "Tax Expense", value: 12, type: "expense" },
        { source: "Operating Profit", target: "Other Expense", value: 3, type: "expense" }
    ],

    // Enhanced color scheme matching Salesforce
    colorScheme: {
        revenue: "#4A90E2",      // Blue
        cost: "#E74C3C",         // Red
        profit: "#27AE60",       // Green  
        expense: "#E67E22",      // Orange
        income: "#8E44AD"        // Purple
    },

    // Chart metadata
    metadata: {
        title: "SaaS Company Financial Flow Analysis",
        subtitle: "Q3 2025 Financial Performance - Salesforce Structure",
        currency: "USD",
        unit: "millions",
        period: "Quarterly",
        lastUpdated: "2025-05-26"
    }
};

// Enhanced utility functions for data manipulation
window.DataUtils = {
    // Validate data structure with detailed error reporting
    validateData: function(data) {
        const errors = [];
        
        if (!data.nodes || !data.links) {
            throw new Error("Data must contain nodes and links arrays");
        }
        
        // Check for required node properties
        data.nodes.forEach((node, index) => {
            if (!node.id || node.value === undefined || node.depth === undefined) {
                errors.push(`Invalid node at index ${index}: ${JSON.stringify(node)}`);
            }
            if (node.value < 0) {
                errors.push(`Negative value in node '${node.id}': ${node.value}`);
            }
        });
        
        // Check for valid links
        const nodeIds = new Set(data.nodes.map(n => n.id));
        data.links.forEach((link, index) => {
            if (!link.source || !link.target || link.value === undefined) {
                errors.push(`Invalid link at index ${index}: ${JSON.stringify(link)}`);
            }
            if (!nodeIds.has(link.source)) {
                errors.push(`Link source '${link.source}' not found in nodes`);
            }
            if (!nodeIds.has(link.target)) {
                errors.push(`Link target '${link.target}' not found in nodes`);
            }
            if (link.value <= 0) {
                errors.push(`Invalid link value from '${link.source}' to '${link.target}': ${link.value}`);
            }
        });
        
        // Check flow conservation
        const balanceErrors = this.checkFlowConservation(data);
        errors.push(...balanceErrors);
        
        if (errors.length > 0) {
            console.error("Data validation errors:", errors);
            throw new Error(`Data validation failed with ${errors.length} errors. See console for details.`);
        }
        
        return true;
    },
    
    // Check flow conservation with detailed reporting
    checkFlowConservation: function(data) {
        const errors = [];
        const nodeMap = new Map();
        
        // Initialize node tracking
        data.nodes.forEach(node => {
            nodeMap.set(node.id, {
                node: node,
                inflow: 0,
                outflow: 0,
                inflowLinks: [],
                outflowLinks: []
            });
        });
        
        // Calculate flows
        data.links.forEach(link => {
            const source = nodeMap.get(link.source);
            const target = nodeMap.get(link.target);
            
            if (source) {
                source.outflow += link.value;
                source.outflowLinks.push(link);
            }
            if (target) {
                target.inflow += link.value;
                target.inflowLinks.push(link);
            }
        });
        
        // Check conservation for each node
        nodeMap.forEach((flow, nodeId) => {
            const node = flow.node;
            const totalInflow = flow.inflow;
            const totalOutflow = flow.outflow;
            
            // For source nodes (depth 0), outflow should equal node value
            if (node.depth === 0 && Math.abs(totalOutflow - node.value) > 0.01) {
                errors.push(`Source node '${nodeId}' outflow (${totalOutflow}) doesn't match value (${node.value})`);
            }
            
            // For intermediate nodes, inflow should equal outflow (if both exist)
            if (totalInflow > 0 && totalOutflow > 0 && Math.abs(totalInflow - totalOutflow) > 0.01) {
                errors.push(`Flow conservation violated at '${nodeId}': inflow=${totalInflow}, outflow=${totalOutflow}`);
            }
            
            // For sink nodes, inflow should equal node value
            if (totalOutflow === 0 && totalInflow > 0 && Math.abs(totalInflow - node.value) > 0.01) {
                errors.push(`Sink node '${nodeId}' inflow (${totalInflow}) doesn't match value (${node.value})`);
            }
        });
        
        return errors;
    },
    
    // Generate flow balance report
    generateFlowReport: function(data) {
        const nodeMap = new Map();
        
        // Initialize
        data.nodes.forEach(node => {
            nodeMap.set(node.id, {
                nodeValue: node.value,
                inflow: 0,
                outflow: 0,
                inflowLinks: [],
                outflowLinks: []
            });
        });
        
        // Calculate flows
        data.links.forEach(link => {
            const source = nodeMap.get(link.source);
            const target = nodeMap.get(link.target);
            
            if (source) {
                source.outflow += link.value;
                source.outflowLinks.push({target: link.target, value: link.value});
            }
            if (target) {
                target.inflow += link.value;
                target.inflowLinks.push({source: link.source, value: link.value});
            }
        });
        
        // Generate report
        const report = {};
        nodeMap.forEach((flow, nodeId) => {
            report[nodeId] = {
                nodeValue: flow.nodeValue,
                totalInflow: flow.inflow,
                totalOutflow: flow.outflow,
                balance: flow.inflow - flow.outflow,
                conservationCheck: Math.abs(flow.inflow - flow.outflow) < 0.01 || flow.inflow === 0 || flow.outflow === 0
            };
        });
        
        return report;
    },
    
    // NEW: Set custom ordering for nodes
    setNodeOrder: function(data, nodeId, order, orderType = 'customOrder') {
        const node = data.nodes.find(n => n.id === nodeId);
        if (node) {
            node[orderType] = order;
            console.log(`Set ${orderType} for '${nodeId}' to ${order}`);
        } else {
            console.warn(`Node '${nodeId}' not found`);
        }
        return data;
    },
    
    // NEW: Set ordering for a group of nodes
    setGroupOrder: function(data, nodeIds, orderType = 'customOrder') {
        nodeIds.forEach((nodeId, index) => {
            this.setNodeOrder(data, nodeId, index + 1, orderType);
        });
        return data;
    },
    
    // NEW: Reset all custom ordering
    resetOrdering: function(data) {
        data.nodes.forEach(node => {
            delete node.customOrder;
            delete node.parentOrder;
        });
        console.log("All custom ordering reset");
        return data;
    },
    
    // Format currency values with proper scaling
    formatCurrency: function(value, unit = "millions") {
        if (value >= 1000) {
            return `${(value / 1000).toFixed(1)}B`;
        } else if (value >= 1) {
            return `${value.toFixed(1)}M`;
        } else {
            return `${(value * 1000).toFixed(0)}K`;
        }
    },
    
    // Auto-fix common data issues
    autoFixData: function(data) {
        console.log("Auto-fixing data issues...");
        
        // Create a copy to avoid mutating original
        const fixedData = JSON.parse(JSON.stringify(data));
        
        // Fix missing categories
        fixedData.nodes.forEach(node => {
            if (!node.category) {
                if (node.id.toLowerCase().includes('revenue')) node.category = 'revenue';
                else if (node.id.toLowerCase().includes('cost')) node.category = 'cost';
                else if (node.id.toLowerCase().includes('profit')) node.category = 'profit';
                else if (node.id.toLowerCase().includes('expense')) node.category = 'expense';
                else if (node.id.toLowerCase().includes('income')) node.category = 'income';
                else node.category = 'other';
            }
        });
        
        // Fix missing link types
        fixedData.links.forEach(link => {
            if (!link.type) {
                const sourceNode = fixedData.nodes.find(n => n.id === link.source);
                if (sourceNode) link.type = sourceNode.category;
                else link.type = 'flow';
            }
        });
        
        return fixedData;
    }
};

/* ===== ORDERING DOCUMENTATION ===== */
/*
Node Ordering System:

1. CUSTOM ORDER (Global):
   - Property: `customOrder` 
   - Takes precedence over all other ordering
   - Example: { id: "Net Income", customOrder: 1 } // Always appears first

2. PARENT ORDER (Within Parent Groups):
   - Property: `parentOrder`
   - Sorts within parent groups separately
   - Example: All children of "Operating Profit" sorted by parentOrder
   
3. VALUE ORDER (Default):
   - Sorts by node value (highest first)
   - Used when no custom ordering is specified

Usage Examples:

// Set global custom order
DataUtils.setNodeOrder(data, "Net Income", 1, 'customOrder');

// Set parent-specific order
DataUtils.setNodeOrder(data, "Net Income", 1, 'parentOrder');

// Set multiple nodes at once
DataUtils.setGroupOrder(data, ["Net Income", "Tax Expense", "Other Expense"], 'parentOrder');

// Reset all ordering
DataUtils.resetOrdering(data);
*/

// Validation on load
try {
    window.DataUtils.validateData(window.SAMPLE_FINANCIAL_DATA);
    console.log("✅ Sample data validation passed");
    
    const report = window.DataUtils.generateFlowReport(window.SAMPLE_FINANCIAL_DATA);
    console.log("📊 Flow Balance Report:", report);
    
} catch (error) {
    console.error("❌ Sample data validation failed:", error.message);
}