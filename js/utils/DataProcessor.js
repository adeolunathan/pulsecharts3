/* ===== PULSE DATA PROCESSOR ===== */
/* Utilities for processing and validating financial data */

window.DataProcessor = (function() {
    'use strict';

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

    // Process and validate financial data
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

    // Validate that flows balance correctly
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

    // Calculate layout positions for nodes with proportional scaling
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

    // Format financial values for display
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

    // Generate color palette for categories
    function generateColorPalette(data) {
        const categories = new Set();
        data.nodes.forEach(node => categories.add(node.category));
        
        const defaultColors = {
            revenue: '#4A90E2',   // Blue
            cost: '#E74C3C',      // Red  
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

    // Export public API
    return {
        processFinancialData: processFinancialData,
        validateFlowBalance: validateFlowBalance,
        calculateNodePositions: calculateNodePositions,
        formatValue: formatValue,
        generateColorPalette: generateColorPalette,
        wrapText: wrapText,
        
        // Validation utilities
        validate: {
            data: function(data) {
                try {
                    processFinancialData(data);
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
            }
        }
    };
})();