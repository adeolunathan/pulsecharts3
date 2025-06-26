/**
 * FinancialDataProcessor - Financial analysis functions for Sankey charts
 * 
 * This module provides financial data analysis and processing functionality
 * specific to Sankey chart visualization of financial statements.
 * 
 * Handles both Income Statement and Balance Sheet analysis including:
 * - Statement type detection
 * - Revenue hub identification  
 * - Financial metrics calculation
 * - Balance sheet hierarchy analysis
 */
(function() {
    'use strict';

    /**
     * Detect the type of financial statement based on node names
     * @param {Object} data - Chart data with nodes array
     * @returns {string} - 'income' or 'balance'
     */
    function detectStatementType(data) {
        if (!data || !data.nodes) {
            console.log('📊 No data provided, defaulting to income statement');
            return 'income';
        }

        // Check if statement type is explicitly provided in metadata
        if (data.metadata && data.metadata.statementType) {
            console.log(`📊 Statement type from metadata: ${data.metadata.statementType}`);
            return data.metadata.statementType;
        }

        // Fallback to keyword detection
        const balanceSheetKeywords = [
            'assets', 'total assets', 'current assets', 'non-current assets',
            'liabilities', 'current liabilities', 'non-current liabilities',
            'equity', 'shareholders equity', 'stockholders equity'
        ];

        const hasBalanceSheetNodes = data.nodes.some(node => 
            balanceSheetKeywords.some(keyword => 
                node.id.toLowerCase().includes(keyword.toLowerCase())
            )
        );

        const statementType = hasBalanceSheetNodes ? 'balance' : 'income';
        console.log(`📊 Detected statement type: ${statementType}`);
        return statementType;
    }

    /**
     * Detect the revenue hub node - the main revenue aggregation point
     * @param {Array} nodes - Array of chart nodes
     * @param {Array} links - Array of chart links
     * @returns {Object} - {node: revenueHubNode, layer: revenueHubLayer}
     */
    function detectRevenueHub(nodes, links) {
        if (!nodes || !Array.isArray(nodes)) {
            console.warn('⚠️ No nodes provided for revenue hub detection');
            return { node: null, layer: 1 };
        }

        // Strategy 1: Look for nodes with "total revenue" or similar
        let revenueHub = nodes.find(node => {
            const idLower = node.id.toLowerCase();
            return idLower.includes('total revenue') || 
                   idLower.includes('revenue hub') ||
                   idLower.includes('net revenue') ||
                   (idLower === 'revenue' && node.targetLinks && node.targetLinks.length > 3);
        });

        // Strategy 2: Find revenue category node with multiple inflows
        if (!revenueHub) {
            const revenueNodes = nodes.filter(node => 
                node.category === 'revenue' && node.targetLinks && node.targetLinks.length > 1
            );
            
            if (revenueNodes.length > 0) {
                // Choose the one with most inflows or highest value
                revenueHub = revenueNodes.reduce((max, node) => 
                    (node.targetLinks.length > max.targetLinks.length || 
                     (node.targetLinks.length === max.targetLinks.length && node.value > max.value)) ? node : max
                );
            }
        }

        // Strategy 3: Find middle-layer revenue node
        if (!revenueHub) {
            const depths = [...new Set(nodes.map(n => n.depth))];
            const middleDepth = depths[Math.floor(depths.length / 2)];
            
            revenueHub = nodes.find(node => 
                node.depth === middleDepth && 
                node.category === 'revenue'
            );
        }

        if (revenueHub) {
            console.log(`💰 Revenue hub detected: ${revenueHub.id} at layer ${revenueHub.depth}`);
            return { node: revenueHub, layer: revenueHub.depth };
        } else {
            // Fallback: assume layer 1 is revenue hub layer
            console.log(`💰 Revenue hub layer defaulted to: 1`);
            return { node: null, layer: 1 };
        }
    }

    /**
     * Check if a node is in the pre-revenue segment
     * @param {Object} node - Chart node
     * @param {number} revenueHubLayer - The layer where revenue hub is located
     * @returns {boolean}
     */
    function isPreRevenueNode(node, revenueHubLayer) {
        if (!node || revenueHubLayer === null || revenueHubLayer === undefined) return false;
        
        // Nodes to the left of or in layers before the revenue hub
        return node.depth < revenueHubLayer;
    }

    /**
     * Check if a link is in the pre-revenue segment
     * @param {Object} link - Chart link
     * @param {number} revenueHubLayer - The layer where revenue hub is located
     * @returns {boolean}
     */
    function isPreRevenueLink(link, revenueHubLayer) {
        if (!link || revenueHubLayer === null || revenueHubLayer === undefined) return false;
        
        // Links where both source and target are before revenue hub
        // OR links flowing INTO the revenue hub from pre-revenue segments
        return (link.source.depth < revenueHubLayer) ||
               (link.source.depth < revenueHubLayer && link.target.depth <= revenueHubLayer);
    }

    /**
     * Get all revenue segment nodes (pre-revenue nodes)
     * @param {Array} nodes - Array of chart nodes
     * @param {number} revenueHubLayer - The layer where revenue hub is located
     * @returns {Array} - Array of pre-revenue nodes
     */
    function getRevenueSegmentNodes(nodes, revenueHubLayer) {
        if (!nodes || !Array.isArray(nodes)) return [];
        return nodes.filter(node => isPreRevenueNode(node, revenueHubLayer));
    }

    /**
     * Get all pre-revenue nodes (alias for getRevenueSegmentNodes)
     * @param {Array} nodes - Array of chart nodes
     * @param {number} revenueHubLayer - The layer where revenue hub is located
     * @returns {Array} - Array of pre-revenue nodes
     */
    function getPreRevenueNodes(nodes, revenueHubLayer) {
        return getRevenueSegmentNodes(nodes, revenueHubLayer);
    }

    /**
     * Calculate financial metrics for all nodes
     * @param {Array} nodes - Array of chart nodes
     * @param {Object} revenueHubNode - The main revenue node
     * @param {Function} formatCurrency - Currency formatting function
     * @returns {Array} - Updated nodes with financial metrics
     */
    function calculateFinancialMetrics(nodes, revenueHubNode, formatCurrency) {
        if (!nodes || !Array.isArray(nodes)) {
            console.warn('⚠️ No nodes provided for financial metrics calculation');
            return nodes;
        }

        // Use the provided revenue hub node or find fallback
        let totalRevenueNode = revenueHubNode;
        
        // If no revenue hub was provided, use sophisticated fallback logic
        if (!totalRevenueNode) {
            // Strategy 1: Look for nodes with "total revenue" in name
            totalRevenueNode = nodes.find(n => 
                n.id && n.id.toLowerCase().includes('total revenue')
            );
            
            // Strategy 2: Find the revenue node with the highest value
            if (!totalRevenueNode) {
                const revenueNodes = nodes.filter(n => n.category === 'revenue');
                if (revenueNodes.length > 0) {
                    totalRevenueNode = revenueNodes.reduce((max, node) => 
                        node.value > max.value ? node : max
                    );
                }
            }
            
            // Strategy 3: Find revenue node that has the most outgoing flows (acts as a hub)
            if (!totalRevenueNode) {
                const revenueNodes = nodes.filter(n => n.category === 'revenue');
                if (revenueNodes.length > 0) {
                    totalRevenueNode = revenueNodes.reduce((max, node) => 
                        (node.sourceLinks && node.sourceLinks.length > (max.sourceLinks ? max.sourceLinks.length : 0)) ? node : max
                    );
                }
            }
        }
        
        const totalRevenue = totalRevenueNode ? totalRevenueNode.value : 0;
        
        // Log which revenue node is being used for margin calculations
        if (totalRevenueNode) {
            const formattedRevenue = formatCurrency ? formatCurrency(totalRevenue) : totalRevenue;
            console.log(`💰 Using revenue node for margin calculations: "${totalRevenueNode.id}" (${formattedRevenue}) at depth ${totalRevenueNode.depth}`);
        } else {
            console.warn('⚠️ No revenue node found for margin calculations - margins will be 0%');
        }
        
        // Update each node with financial metrics
        nodes.forEach(node => {
            // Only calculate percentageOfRevenue and marginValue if marginPercentage is not already provided from Flow Builder
            if (!node.marginPercentage || node.marginPercentage === 'N/A') {
                if (totalRevenue > 0) {
                    node.percentageOfRevenue = (node.value / totalRevenue) * 100;
                } else {
                    node.percentageOfRevenue = 0;
                }
                
                // Calculate marginPercentage for ALL nodes, not just profit
                node.marginPercentage = node.percentageOfRevenue.toFixed(1) + '%';
                
                // Set specific margin types for profit nodes
                if (node.category === 'profit') {
                    if (node.id.toLowerCase().includes('gross')) {
                        node.marginType = 'Gross Margin';
                    } else if (node.id.toLowerCase().includes('operating')) {
                        node.marginType = 'Operating Margin';
                    } else if (node.id.toLowerCase().includes('net')) {
                        node.marginType = 'Net Margin';
                    } else {
                        node.marginType = 'Margin';
                    }
                } else {
                    // For non-profit nodes, show as "% of Revenue"
                    node.marginType = '% of Revenue';
                }
                
                node.marginValue = node.percentageOfRevenue;
            }
            
            node.isExpenseType = node.category === 'expense';
        });
        
        console.log('📊 Financial metrics calculated (prioritizing Flow Builder marginPercentage)');
        return nodes;
    }

    /**
     * Check if node name exactly matches a parent group pattern
     * @param {string} nodeLower - Lowercase node name
     * @param {string} groupPattern - Pattern to match
     * @returns {boolean}
     */
    function isExactParentGroupMatch(nodeLower, groupPattern) {
        return nodeLower === groupPattern || 
               nodeLower === groupPattern + 's' ||
               nodeLower.startsWith('total ' + groupPattern) ||
               nodeLower.endsWith(' total') && nodeLower.includes(groupPattern);
    }

    /**
     * Get parent group name for a node based on its ID
     * @param {string} nodeId - Node identifier
     * @returns {string|null} - Parent group name or null
     */
    function getParentGroupName(nodeId) {
        const nodeLower = nodeId.toLowerCase();
        
        console.log(`🏷️ Getting parent group name for: ${nodeId} (lower: ${nodeLower})`);
        
        if (isExactParentGroupMatch(nodeLower, 'total assets')) {
            console.log(`🏷️ Matched: Total Assets`);
            return 'Total Assets';
        }
        if (isExactParentGroupMatch(nodeLower, 'current assets') || nodeLower === 'ca') {
            console.log(`🏷️ Matched: Current Assets`);
            return 'Current Assets';
        }
        if (isExactParentGroupMatch(nodeLower, 'non-current assets') || 
            isExactParentGroupMatch(nodeLower, 'noncurrent assets') || nodeLower === 'nca') {
            console.log(`🏷️ Matched: Non-Current Assets`);
            return 'Non-Current Assets';
        }
        if (isExactParentGroupMatch(nodeLower, 'current liabilities') || nodeLower === 'cl') {
            console.log(`🏷️ Matched: Current Liabilities`);
            return 'Current Liabilities';
        }
        if (isExactParentGroupMatch(nodeLower, 'non-current liabilities') || 
            isExactParentGroupMatch(nodeLower, 'noncurrent liabilities') || nodeLower === 'ncl') {
            console.log(`🏷️ Matched: Non-Current Liabilities`);
            return 'Non-Current Liabilities';
        }
        if (isExactParentGroupMatch(nodeLower, 'shareholders equity') || 
            isExactParentGroupMatch(nodeLower, 'stockholders equity') ||
            isExactParentGroupMatch(nodeLower, "shareholders' equity") || nodeLower === 'equity') {
            console.log(`🏷️ Matched: Shareholders Equity`);
            return 'Shareholders Equity';
        }
        
        console.log(`🏷️ No match found for: ${nodeId}`);
        return null;
    }

    /**
     * Detect parent nodes in balance sheet hierarchy
     * @param {Array} nodes - Array of chart nodes
     * @param {Array} links - Array of chart links
     * @returns {Set} - Set of parent node IDs
     */
    function detectParentNodes(nodes, links) {
        if (!nodes || !links) {
            console.warn('⚠️ Missing nodes or links for parent node detection');
            return new Set();
        }

        const parentNodes = new Set();
        
        nodes.forEach(node => {
            const outflowCount = links.filter(link => link.source.id === node.id).length;
            const receivesFromTotal = links.some(link => 
                link.target.id === node.id && link.source.id.toLowerCase().includes('total')
            );
            
            if (receivesFromTotal || outflowCount >= 2) {
                parentNodes.add(node.id);
                console.log(`👑 Parent detected: ${node.id} (receivesFromTotal: ${receivesFromTotal}, outflowCount: ${outflowCount})`);
            }
        });
        
        return parentNodes;
    }

    /**
     * Determine the parent group for a child node
     * @param {Object} childNode - The child node
     * @param {Set} parentNodes - Set of parent node IDs
     * @param {Array} links - Array of chart links
     * @returns {string|null} - Parent group name or null
     */
    function determineChildParentGroup(childNode, parentNodes, links) {
        if (!childNode || !links) {
            console.warn('⚠️ Missing required parameters for child parent group determination');
            return null;
        }

        console.log(`🔍 Analyzing child node: ${childNode.id}`);
        console.log(`🔍 Available parent nodes:`, Array.from(parentNodes));
        console.log(`🔍 Total links:`, links.length);
        
        const relevantLinks = links.filter(link => 
            link.source.id === childNode.id || link.target.id === childNode.id
        );
        console.log(`🔍 Links involving ${childNode.id}:`, relevantLinks.map(l => `${l.source.id} → ${l.target.id}`));
        
        for (const link of links) {
            if (link.target.id === childNode.id) {
                console.log(`🔗 ${childNode.id} receives from ${link.source.id}`);
                
                const sourceParentGroup = getParentGroupName(link.source.id);
                if (sourceParentGroup) {
                    console.log(`✅ Found parent group by name: ${link.source.id} → ${sourceParentGroup}`);
                    return sourceParentGroup;
                }
                
                if (parentNodes.has(link.source.id)) {
                    const parentGroupName = getParentGroupName(link.source.id);
                    console.log(`✅ Found parent group by detection: ${link.source.id} → ${parentGroupName}`);
                    return parentGroupName;
                }
            }
            
            if (link.source.id === childNode.id) {
                console.log(`🔗 ${childNode.id} sends to ${link.target.id}`);
                
                const targetParentGroup = getParentGroupName(link.target.id);
                if (targetParentGroup) {
                    console.log(`✅ Found parent group by name: ${link.target.id} → ${targetParentGroup}`);
                    return targetParentGroup;
                }
                
                if (parentNodes.has(link.target.id)) {
                    const parentGroupName = getParentGroupName(link.target.id);
                    console.log(`✅ Found parent group by detection: ${link.target.id} → ${parentGroupName}`);
                    return parentGroupName;
                }
            }
        }
        
        console.log(`❌ No parent group found for ${childNode.id}`);
        return null;
    }

    /**
     * Assign color groups for balance sheet hierarchy
     * @param {Array} nodes - Array of chart nodes
     * @param {Array} links - Array of chart links  
     * @param {Object} customColors - Custom color overrides
     * @returns {Map} - Map of node IDs to color group info
     */
    function assignColorGroups(nodes, links, customColors = {}) {
        if (!nodes || !Array.isArray(nodes)) {
            console.warn('⚠️ No nodes provided for color group assignment');
            return new Map();
        }

        const colorGroups = new Map();
        
        // Enhanced vibrant balance sheet colors
        const balanceSheetColors = {
            'Total Assets': customColors['Total Assets'] || '#1e293b',        // Deep slate
            'Current Assets': customColors['Current Assets'] || '#1e40af',    // Vibrant blue
            'Non-Current Assets': customColors['Non-Current Assets'] || '#7c3aed',  // Vibrant purple
            'Current Liabilities': customColors['Current Liabilities'] || '#dc2626',  // Sharp red
            'Non-Current Liabilities': customColors['Non-Current Liabilities'] || '#b91c1c',  // Deep red
            'Shareholders Equity': customColors['Shareholders Equity'] || '#059669'   // Vibrant emerald
        };
        
        const parentNodes = detectParentNodes(nodes, links);
        
        nodes.forEach(node => {
            let isParent = parentNodes.has(node.id);
            let baseColor = '#95a5a6';
            let groupName = null;
            let parentGroup = null;
            
            const nodeLower = node.id.toLowerCase();
            
            if (isExactParentGroupMatch(nodeLower, 'total assets')) {
                groupName = 'Total Assets';
                baseColor = balanceSheetColors['Total Assets'];
                isParent = true;
            } else if (isExactParentGroupMatch(nodeLower, 'current assets')) {
                groupName = 'Current Assets';
                baseColor = balanceSheetColors['Current Assets'];
                isParent = true;
            } else if (isExactParentGroupMatch(nodeLower, 'non-current assets') || 
                       isExactParentGroupMatch(nodeLower, 'noncurrent assets')) {
                groupName = 'Non-Current Assets';
                baseColor = balanceSheetColors['Non-Current Assets'];
                isParent = true;
            } else if (isExactParentGroupMatch(nodeLower, 'current liabilities')) {
                groupName = 'Current Liabilities';
                baseColor = balanceSheetColors['Current Liabilities'];
                isParent = true;
            } else if (isExactParentGroupMatch(nodeLower, 'non-current liabilities') || 
                       isExactParentGroupMatch(nodeLower, 'noncurrent liabilities')) {
                groupName = 'Non-Current Liabilities';
                baseColor = balanceSheetColors['Non-Current Liabilities'];
                isParent = true;
            } else if (isExactParentGroupMatch(nodeLower, 'shareholders equity') || 
                       isExactParentGroupMatch(nodeLower, 'stockholders equity') ||
                       isExactParentGroupMatch(nodeLower, "shareholders' equity") ||
                       nodeLower === 'equity') {
                groupName = 'Shareholders Equity';
                baseColor = balanceSheetColors['Shareholders Equity'];
                isParent = true;
            } else {
                isParent = false;
                parentGroup = determineChildParentGroup(node, parentNodes, links);
                if (parentGroup && balanceSheetColors[parentGroup]) {
                    groupName = parentGroup;
                    baseColor = balanceSheetColors[parentGroup];
                    console.log(`🎯 Child node ${node.id} inherits from ${parentGroup} → ${baseColor} (will be 65% opacity)`);
                } else {
                    console.log(`❌ Child node ${node.id} failed to find parent group`);
                }
            }
            
            colorGroups.set(node.id, {
                groupName: groupName,
                baseColor: baseColor,
                isParentGroup: isParent,
                parentGroup: parentGroup
            });
            
            console.log(`🎨 ${node.id} → ${groupName} (${isParent ? 'PARENT - 100% opacity' : 'CHILD - 65% opacity'})`);
        });

        return colorGroups;
    }

    // Export functions to global namespace
    window.FinancialDataProcessor = {
        detectStatementType,
        calculateFinancialMetrics,
        detectRevenueHub,
        isPreRevenueNode,
        isPreRevenueLink,
        getRevenueSegmentNodes,
        getPreRevenueNodes,
        assignColorGroups,
        isExactParentGroupMatch,
        determineChildParentGroup,
        getParentGroupName,
        detectParentNodes
    };

    // Debug: Confirm FinancialDataProcessor is loaded
    console.log('✅ FinancialDataProcessor utility loaded successfully');
    console.log('📊 Available functions:', Object.keys(window.FinancialDataProcessor).length);

})();