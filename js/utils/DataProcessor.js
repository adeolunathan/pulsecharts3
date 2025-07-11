/* 
 * FILE: /js/utils/DataProcessor.js (REPLACE EXISTING)
 * PURPOSE: Extended data processor with new input format support
 * MAINTAINS: All existing functionality + adds new conversion capabilities
 */

/* ===== PULSE DATA PROCESSOR - EXTENDED VERSION ===== */
/* Utilities for processing and validating financial data */
/* NOW SUPPORTS: Traditional Sankey format + Intuitive income statement format + CSV */

window.DataProcessor = (function() {
    'use strict';

    // ========== EXISTING FUNCTIONALITY (PRESERVED) ==========

    // Text wrapping utility for node labels
    function wrapText(text, maxCharsPerLine = 15) {
        if (!text || text.length <= maxCharsPerLine) {
            return [text];
        }
        
        
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        words.forEach(word => {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            
            if (testLine.length <= maxCharsPerLine) {
                currentLine = testLine;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    // Word is longer than max chars, split it
                    if (word.length > maxCharsPerLine) {
                        let remaining = word;
                        while (remaining.length > maxCharsPerLine) {
                            lines.push(remaining.substring(0, maxCharsPerLine - 1) + '-');
                            remaining = remaining.substring(maxCharsPerLine - 1);
                        }
                        currentLine = remaining;
                    } else {
                        currentLine = word;
                    }
                }
            }
        });
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines.length > 0 ? lines : [text];
    }

    // Process and validate financial data (EXISTING - supports traditional Sankey format)
    function processFinancialData(rawData) {
        if (!rawData || !rawData.nodes || !rawData.links) {
            throw new Error('Invalid data structure: missing nodes or links');
        }

        // Deep clone to avoid mutating original data
        const data = {
            nodes: JSON.parse(JSON.stringify(rawData.nodes)),
            links: JSON.parse(JSON.stringify(rawData.links)),
            depthScaling: rawData.depthScaling || {},
            colorScheme: rawData.colorScheme || {},
            metadata: rawData.metadata || {}
        };

        // Validate and enrich nodes
        const nodeMap = new Map();
        data.nodes.forEach((node, index) => {
            // Validate required fields
            if (!node.id) {
                throw new Error(`Node at index ${index} missing required 'id' field`);
            }
            if (node.value === undefined || node.value === null) {
                throw new Error(`Node '${node.id}' missing required 'value' field`);
            }
            if (node.depth === undefined || node.depth === null) {
                throw new Error(`Node '${node.id}' missing required 'depth' field`);
            }

            // Add default properties
            node.category = node.category || 'default';
            node.description = node.description || '';
            
            // Add wrapped text for labels
            node.wrappedText = wrapText(node.id);
            
            // Store in map for link validation
            nodeMap.set(node.id, node);
        });

        // Validate and enrich links
        data.links.forEach((link, index) => {
            // Validate required fields
            if (!link.source || !link.target) {
                throw new Error(`Link at index ${index} missing source or target`);
            }
            if (link.value === undefined || link.value === null) {
                throw new Error(`Link at index ${index} missing value`);
            }

            // Validate that source and target nodes exist
            if (!nodeMap.has(link.source)) {
                throw new Error(`Link source '${link.source}' not found in nodes`);
            }
            if (!nodeMap.has(link.target)) {
                throw new Error(`Link target '${link.target}' not found in nodes`);
            }

            // Add default properties
            link.type = link.type || 'default';
            
            // Add source and target node references
            link.sourceNode = nodeMap.get(link.source);
            link.targetNode = nodeMap.get(link.target);
        });

        // Validate flow balance (optional but recommended)
        validateFlowBalance(data);

        return data;
    }

    // Validate that flows balance correctly (EXISTING)
    function validateFlowBalance(data) {
        const nodeFlows = new Map();
        
        // Initialize flow tracking
        data.nodes.forEach(node => {
            nodeFlows.set(node.id, {
                node: node,
                inflow: 0,
                outflow: 0,
                balance: 0
            });
        });

        // Calculate flows
        data.links.forEach(link => {
            const sourceFlow = nodeFlows.get(link.source);
            const targetFlow = nodeFlows.get(link.target);
            
            sourceFlow.outflow += link.value;
            targetFlow.inflow += link.value;
        });

        // Calculate balance and check for issues
        const balanceIssues = [];
        nodeFlows.forEach((flow, nodeId) => {
            flow.balance = flow.inflow - flow.outflow;
            
            // For most nodes, inflows should roughly equal outflows
            // Exception: source nodes (only outflow) and sink nodes (only inflow)
            const isSource = flow.inflow === 0 && flow.outflow > 0;
            const isSink = flow.outflow === 0 && flow.inflow > 0;
            const isBalanced = Math.abs(flow.balance) < 0.01; // Allow for small rounding errors
            
            if (!isSource && !isSink && !isBalanced) {
                balanceIssues.push({
                    node: nodeId,
                    inflow: flow.inflow,
                    outflow: flow.outflow,
                    balance: flow.balance
                });
            }
        });

        // Log warnings for balance issues
        if (balanceIssues.length > 0) {
            console.warn('Flow balance issues detected:', balanceIssues);
        }

        return nodeFlows;
    }

    // Calculate layout positions for nodes with proportional scaling (EXISTING)
    function calculateNodePositions(data, width, height, margin) {
        const processedData = processFinancialData(data);
        
        // Group nodes by depth
        const depthGroups = new Map();
        processedData.nodes.forEach(node => {
            if (!depthGroups.has(node.depth)) {
                depthGroups.set(node.depth, []);
            }
            depthGroups.get(node.depth).push(node);
        });

        // Calculate horizontal positions
        const maxDepth = Math.max(...processedData.nodes.map(n => n.depth));
        const xStep = width / (maxDepth + 1);
        
        // Use proportional scaling based on actual values
        const maxValue = Math.max(...processedData.nodes.map(n => n.value));
        const valueScale = height * 0.15 / maxValue; // Max 15% of height for largest node
        
        // Position nodes within each depth
        depthGroups.forEach((nodes, depth) => {
            const x = xStep * (depth + 0.5);
            
            // Calculate spacing requirements
            const nodesWithHeight = nodes.map(node => ({
                ...node,
                height: Math.max(20, node.value * valueScale)
            }));
            
            const totalHeight = nodesWithHeight.reduce((sum, node) => sum + node.height, 0);
            const spacing = Math.max(20, (height - totalHeight) / (nodes.length + 1));
            
            let currentY = spacing;
            nodesWithHeight.forEach(node => {
                node.x = x;
                node.y = currentY;
                node.width = Math.min(60, xStep * 0.4);
                
                currentY += node.height + spacing;
            });
        });

        return processedData;
    }

    // Format financial values for display (EXISTING)
    function formatValue(value, metadata = {}) {
        const unit = metadata.unit || 'millions';
        const currency = metadata.currency || 'USD';
        
        let formatted;
        if (unit === 'millions') {
            formatted = `$${value.toFixed(1)}M`;
        } else if (unit === 'thousands') {
            formatted = `$${value.toFixed(0)}K`;
        } else {
            formatted = `$${value.toLocaleString()}`;
        }
        
        return formatted;
    }

    // Generate color palette for categories (EXISTING)
    function generateColorPalette(data) {
        const categories = new Set();
        data.nodes.forEach(node => categories.add(node.category));
        
        const defaultColors = {
            revenue: '#4A90E2',   // Blue
            profit: '#27AE60',    // Green
            expense: '#E67E22',   // Orange
            income: '#F39C12',    // Gold
            default: '#95A5A6'    // Gray
        };
        
        const palette = {};
        categories.forEach(category => {
            palette[category] = data.colorScheme && data.colorScheme[category] 
                ? data.colorScheme[category] 
                : defaultColors[category] || defaultColors.default;
        });
        
        return palette;
    }

    // ========== NEW FUNCTIONALITY (ADDED) ==========

    // NEW: Detect input data format and process appropriately
    function processAnyFinancialData(inputData) {
        // Check if it's already in Sankey format
        if (inputData.nodes && inputData.links) {
            console.log('📊 Processing traditional Sankey format data');
            return processFinancialData(inputData);
        }
        
        // Check if it's in intuitive income statement format
        if (inputData.flow_structure) {
            console.log('📊 Converting from intuitive format to Sankey format');
            const sankeyData = convertToSankeyFormat(inputData);
            return processFinancialData(sankeyData);
        }
        
        throw new Error('Unrecognized data format. Please use traditional Sankey format (nodes/links) or intuitive format (flow_structure).');
    }

    // NEW: Convert intuitive income statement format to Sankey format
    function convertToSankeyFormat(inputData) {
        const nodes = [];
        const links = [];
        
        const { flow_structure, metadata } = inputData;
        
        // Create nodes from flow structure
        let currentDepth = 0;
        
        // Revenue sources (depth 0)
        flow_structure.revenue_sources.forEach((source, index) => {
            nodes.push({
                id: source.id,
                depth: 0,
                value: source.value,
                category: source.category,
                description: source.description,
                order: source.order || index,
                type: 'revenue_source'
            });
        });
        
        // Intermediate flows (depths 1+)
        currentDepth = 1;
        flow_structure.intermediate_flows.forEach((flow, index) => {
            nodes.push({
                id: flow.id,
                depth: currentDepth,
                value: flow.value,
                category: flow.category,
                description: flow.description,
                order: index,
                type: 'intermediate_flow'
            });
            
            if (flow.id === 'Total Revenue' || flow.id === 'Gross Profit' || flow.id === 'Operating Profit') {
                currentDepth++;
            }
        });
        
        // Final depth for expenses and results
        const finalDepth = currentDepth;
        
        // Expense breakdown
        if (flow_structure.expense_breakdown) {
            flow_structure.expense_breakdown.forEach((expense) => {
                nodes.push({
                    id: expense.id,
                    depth: finalDepth,
                    value: expense.value,
                    category: expense.category,
                    description: expense.description,
                    order: expense.order,
                    parent: expense.parent,
                    type: 'expense'
                });
            });
        }
        
        // Final results
        if (flow_structure.final_results) {
            flow_structure.final_results.forEach((result) => {
                nodes.push({
                    id: result.id,
                    depth: finalDepth,
                    value: result.value,
                    category: result.category,
                    description: result.description,
                    order: result.order,
                    parent: result.parent,
                    type: 'final_result'
                });
            });
        }
        
        // Create links
        const nodeMap = new Map(nodes.map(node => [node.id, node]));
        
        // Create direct links without revenue aggregation
        flow_structure.revenue_sources.forEach(source => {
            // Link revenue sources directly to their targets (no total revenue aggregation)
            const targetNode = nodeMap.get(source.target || 'Gross Profit');
            if (targetNode) {
                links.push({
                    source: source.id,
                    target: targetNode.id,
                    value: source.value,
                    type: 'revenue'
                });
            }
        });
        
        // Create direct links for cost and profit flows
        const costOfRevenue = nodeMap.get('Cost of Revenue');
        const grossProfit = nodeMap.get('Gross Profit');
        
        if (costOfRevenue) {
            const targetNode = nodeMap.get(costOfRevenue.target || 'Operating Expenses');
            if (targetNode) {
                links.push({
                    source: 'Cost of Revenue',
                    target: targetNode.id,
                    value: costOfRevenue.value,
                    type: 'cost'
                });
            }
        }
        
        if (grossProfit) {
            const targetNode = nodeMap.get(grossProfit.target || 'Operating Profit');
            if (targetNode) {
                links.push({
                    source: 'Gross Profit',
                    target: targetNode.id,
                    value: grossProfit.value,
                    type: 'profit'
                });
            }
        }
        
        // Gross Profit splits
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
        
        // Expense breakdown
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
        
        // Final results
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
        
        return {
            nodes: nodes,
            links: links,
            metadata: metadata
        };
    }

    // NEW: Process CSV data
    function processCsvData(csvText) {
        try {
            // Parse CSV using a simple parser
            const lines = csvText.split('\n').filter(line => 
                line.trim() && !line.trim().startsWith('#')
            );
            
            const data = {
                metadata: {},
                flow_structure: {
                    revenue_sources: [],
                    intermediate_flows: [],
                    expense_breakdown: [],
                    final_results: []
                }
            };

            // Process each line
            for (const line of lines) {
                const row = parseCSVRow(line);
                if (row.length < 2) continue;

                const [dataType, ...values] = row;
                
                switch (dataType.toLowerCase()) {
                    case 'company_info':
                        processMetadata(data.metadata, values);
                        break;
                    case 'revenue_source':
                        processRevenueSource(data.flow_structure.revenue_sources, values);
                        break;
                    case 'intermediate_flow':
                        processIntermediateFlow(data.flow_structure.intermediate_flows, values);
                        break;
                    case 'expense':
                        processExpense(data.flow_structure.expense_breakdown, values);
                        break;
                    case 'final_result':
                        processFinalResult(data.flow_structure.final_results, values);
                        break;
                }
            }

            // Validate and clean the data
            validateAndCleanCsvData(data);

            // Convert to Sankey format
            return convertToSankeyFormat(data);
        } catch (error) {
            throw new Error(`CSV processing failed: ${error.message}`);
        }
    }

    // Helper functions for CSV processing
    function parseCSVRow(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result.map(field => field.replace(/^"|"$/g, '')); // Remove quotes
    }

    function processMetadata(metadata, values) {
        if (values.length >= 6) {
            metadata.title = values[0] || 'Financial Flow';
            metadata.currency = values[2] || 'USD';
            metadata.unit = values[3] || 'millions';
            metadata.period = values[4] || '';
            metadata.company = values[5] || '';
        }
    }

    function processRevenueSource(revenueSourcesArray, values) {
        if (values.length >= 4) {
            revenueSourcesArray.push({
                id: values[0],
                value: parseFloat(values[1]) || 0,
                category: values[2] || 'revenue',
                description: values[3] || '',
                order: parseInt(values[4]) || revenueSourcesArray.length + 1
            });
        }
    }

    function processIntermediateFlow(intermediateFlowsArray, values) {
        if (values.length >= 4) {
            intermediateFlowsArray.push({
                id: values[0],
                value: parseFloat(values[1]) || 0,
                category: values[2] || 'intermediate',
                description: values[3] || '',
                order: parseInt(values[4]) || intermediateFlowsArray.length + 1,
                parent: values[5] || null
            });
        }
    }

    function processExpense(expenseArray, values) {
        if (values.length >= 6) {
            expenseArray.push({
                id: values[0],
                value: parseFloat(values[1]) || 0,
                category: values[2] || 'expense',
                description: values[3] || '',
                order: parseInt(values[4]) || expenseArray.length + 1,
                parent: values[5] || 'Operating Expenses'
            });
        }
    }

    function processFinalResult(finalResultsArray, values) {
        if (values.length >= 6) {
            finalResultsArray.push({
                id: values[0],
                value: parseFloat(values[1]) || 0,
                category: values[2] || 'final',
                description: values[3] || '',
                order: parseInt(values[4]) || finalResultsArray.length + 1,
                parent: values[5] || 'Operating Profit'
            });
        }
    }

    function validateAndCleanCsvData(data) {
        // Sort arrays by order
        data.flow_structure.revenue_sources.sort((a, b) => (a.order || 0) - (b.order || 0));
        data.flow_structure.intermediate_flows.sort((a, b) => (a.order || 0) - (b.order || 0));
        data.flow_structure.expense_breakdown.sort((a, b) => (a.order || 0) - (b.order || 0));
        data.flow_structure.final_results.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    // Export public API (EXTENDED)
    return {
        // EXISTING functions (preserved for backward compatibility)
        processFinancialData: processFinancialData,
        validateFlowBalance: validateFlowBalance,
        calculateNodePositions: calculateNodePositions,
        formatValue: formatValue,
        generateColorPalette: generateColorPalette,
        wrapText: wrapText,
        
        // NEW functions (added capabilities)
        processAnyFinancialData: processAnyFinancialData,  // Smart processor
        convertToSankeyFormat: convertToSankeyFormat,      // Intuitive → Sankey
        processCsvData: processCsvData,                    // CSV → Sankey
        
        // Validation utilities (EXTENDED)
        validate: {
            data: function(data) {
                try {
                    processAnyFinancialData(data);  // Now handles both formats
                    return { valid: true };
                } catch (error) {
                    return { valid: false, error: error.message };
                }
            },
            
            balance: function(data) {
                try {
                    const flows = validateFlowBalance(data);
                    return { balanced: true, flows: flows };
                } catch (error) {
                    return { balanced: false, error: error.message };
                }
            },

            // NEW: Validate specific input formats
            sankeyFormat: function(data) {
                return data.nodes && data.links;
            },
            
            intuitiveFormat: function(data) {
                return data.flow_structure && data.flow_structure.revenue_sources;
            }
        }
    };
})();