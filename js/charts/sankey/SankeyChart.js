/* ===== PULSE SANKEY CHART - COMPLETE WITH ALL FIXES ===== */
/* Enhanced with drag behavior, manual positioning, and opacity fixes */

class PulseSankeyChart {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = d3.select(`#${containerId}`);
        this.svg = null;
        this.chart = null;
        this.data = null;
        this.tooltip = null;
        this.nodes = [];
        this.links = [];
        
        // Custom color storage
        this.customColors = {};
        
        // Initialize with proper defaults including group spacing
        this.config = this.getInitialConfig();
        
        this.initializeChart();
    }

    getInitialConfig() {
        return {
            width: 1200,
            height: 700,
            margin: { top: 60, right: 150, bottom: 60, left: 150 },
            nodeWidth: 28,
            nodePadding: 40,
            curveIntensity: 0.4,
            animationDuration: 800,
            leftmostSpacing: 0.8,
            middleSpacing: 0.9,
            rightmostSpacing: 0.7,
            autoCenter: true,
            autoMiddleAlign: true,
            nodeHeightScale: 0.65,
            linkWidthScale: 0.65,
            nodeOpacity: 1.0,
            linkOpacity: 1.0,
            leftmostGroupGap: 40,
            rightmostGroupGap: 40,
            labelDistance: {
                leftmost: 15,
                middle: 12,
                rightmost: 15
            },
            valueDistance: {
                general: 8,
                middle: 8
            },
            layerSpacing: {
                0: 0.8,
                1: 1.0,
                2: 1.0,
                3: 0.9,
                4: 0.7
            }
        };
    }

    applyControlDefaults(controlModule) {
        if (controlModule && controlModule.getDefaultConfig) {
            const controlDefaults = controlModule.getDefaultConfig();
            this.config = { ...this.config, ...controlDefaults };
            console.log('✅ Applied control module defaults to chart config');
        }
    }

    getLayerInfo() {
        if (!this.nodes || this.nodes.length === 0) {
            return {
                totalLayers: 0,
                maxDepth: 0,
                layerInfo: { leftmost: 0, rightmost: 0, middle: [] },
                nodeDistribution: {},
                layerSpacing: this.config.layerSpacing || {}
            };
        }

        const depths = [...new Set(this.nodes.map(n => n.depth))].sort((a, b) => a - b);
        const maxDepth = Math.max(...depths);
        const minDepth = Math.min(...depths);
        
        const nodeDistribution = {};
        depths.forEach(depth => {
            const nodesAtDepth = this.nodes.filter(n => n.depth === depth);
            let layerType = 'middle';
            if (depth === minDepth) layerType = 'leftmost';
            else if (depth === maxDepth) layerType = 'rightmost';
            
            nodeDistribution[depth] = {
                count: nodesAtDepth.length,
                layerType: layerType
            };
        });

        const middleLayers = depths.filter(d => d !== minDepth && d !== maxDepth);

        return {
            totalLayers: depths.length,
            maxDepth: maxDepth,
            layerInfo: {
                leftmost: minDepth,
                rightmost: maxDepth,
                middle: middleLayers
            },
            nodeDistribution: nodeDistribution,
            layerSpacing: this.config.layerSpacing || {}
        };
    }

    initializeChart() {
        this.container.selectAll('*').remove();
        
        const dimensions = {
            width: this.config.width - this.config.margin.left - this.config.margin.right,
            height: this.config.height - this.config.margin.top - this.config.margin.bottom
        };

        this.svg = this.container
            .append('svg')
            .attr('class', 'chart-svg')
            .attr('width', this.config.width)
            .attr('height', this.config.height)
            .attr('viewBox', `0 0 ${this.config.width} ${this.config.height}`)
            .style('max-width', '100%')
            .style('display', 'block')
            .style('margin', '0 auto');

        this.chart = this.svg
            .append('g')
            .attr('transform', `translate(${this.config.margin.left}, ${this.config.margin.top})`);

        this.createTooltip();
    }

    createTooltip() {
        d3.select('.pulse-sankey-tooltip').remove();
        
        this.tooltip = d3.select('body')
            .append('div')
            .attr('class', 'pulse-sankey-tooltip');
    }

    render(data) {
        this.data = data;
        
        // Auto-detect and apply colors from metadata
        this.detectAndApplyColors(data);
        
        this.processData(data);
        this.calculateLayout();
        
        this.chart.selectAll('*').remove();
        this.svg.selectAll('.chart-header, .chart-footnotes, .chart-branding').remove();
        
        this.renderTitle();
        this.renderLinks();
        this.renderNodes();
        this.renderLabels();
        this.renderFootnotes();
        this.renderBrandingFooter();
        
        return this;
    }

    /**
     * Detect and apply colors from metadata
     */
    detectAndApplyColors(data) {
        if (data.metadata && data.metadata.colorPalette) {
            console.log('🎨 Detected color palette from metadata:', data.metadata.colorPalette);
            this.customColors = { ...data.metadata.colorPalette };
            
            if (this.customColors.expense && !this.customColors.tax) {
                this.customColors.tax = this.customColors.expense;
            }
            
            console.log('✅ Applied colors from metadata:', this.customColors);
        } else if (Object.keys(this.customColors).length === 0) {
            console.log('🎨 Using default color scheme');
        }
    }

    processData(data) {
        const nodeMap = new Map();
        
        // Store existing manual positioning info
        const existingManualPositions = new Map();
        if (this.nodes) {
            this.nodes.forEach(node => {
                if (node.manuallyPositioned) {
                    existingManualPositions.set(node.id, {
                        manuallyPositioned: true,
                        y: node.y,
                        preserveLabelsAbove: node.preserveLabelsAbove
                    });
                }
            });
        }
        
        data.nodes.forEach(node => {
            const existingInfo = existingManualPositions.get(node.id);
            nodeMap.set(node.id, {
                ...node,
                sourceLinks: [],
                targetLinks: [],
                value: node.value || 0,
                manuallyPositioned: existingInfo?.manuallyPositioned || false,
                manualY: existingInfo?.y || null,
                preserveLabelsAbove: existingInfo?.preserveLabelsAbove || null
            });
        });
        
        const processedLinks = [];
        data.links.forEach(link => {
            const sourceNode = nodeMap.get(link.source);
            const targetNode = nodeMap.get(link.target);
            
            if (sourceNode && targetNode) {
                const processedLink = {
                    ...link,
                    source: sourceNode,
                    target: targetNode,
                    value: link.value || 0,
                    targetCategory: targetNode.category,
                    colorCategory: link.colorCategory || targetNode.category
                };
                
                sourceNode.sourceLinks.push(processedLink);
                targetNode.targetLinks.push(processedLink);
                processedLinks.push(processedLink);
            }
        });
        
        this.nodes = Array.from(nodeMap.values());
        this.links = processedLinks;
        
        this.calculateFinancialMetrics();
    }

    /**
     * Calculate proper financial metrics and percentages
     */
    calculateFinancialMetrics() {
        // Find total revenue for percentage calculations
        const totalRevenueNode = this.nodes.find(n => 
            n.id === 'Total Revenue' || 
            n.category === 'revenue' && n.depth === 1
        );
        
        const totalRevenue = totalRevenueNode ? totalRevenueNode.value : 0;
        
        // Calculate percentages and margins for each node
        this.nodes.forEach(node => {
            // Calculate percentage of revenue
            if (totalRevenue > 0) {
                node.percentageOfRevenue = (node.value / totalRevenue) * 100;
            } else {
                node.percentageOfRevenue = 0;
            }
            
            // Calculate specific margins for profit items
            if (node.category === 'profit') {
                if (node.id.toLowerCase().includes('gross')) {
                    node.marginType = 'Gross Margin';
                    node.marginValue = node.percentageOfRevenue;
                } else if (node.id.toLowerCase().includes('operating')) {
                    node.marginType = 'Operating Margin';
                    node.marginValue = node.percentageOfRevenue;
                } else if (node.id.toLowerCase().includes('net') || node.category === 'income') {
                    node.marginType = 'Net Margin';
                    node.marginValue = node.percentageOfRevenue;
                }
            }
            
            // Mark expense and cost items for bracket formatting
            node.isExpenseType = node.category === 'expense' || 
                               node.category === 'cost' || 
                               node.category === 'tax';
        });
        
        console.log('📊 Financial metrics calculated');
    }

    calculateLayout() {
        const dimensions = {
            width: this.config.width - this.config.margin.left - this.config.margin.right,
            height: this.config.height - this.config.margin.top - this.config.margin.bottom
        };

        const nodesByDepth = d3.group(this.nodes, d => d.depth);
        const depths = Array.from(nodesByDepth.keys()).sort((a, b) => a - b);
        const maxDepth = Math.max(...depths);

        const xScale = d3.scaleLinear()
            .domain([0, maxDepth])
            .range([0, dimensions.width - this.config.nodeWidth]);

        // Always calculate X positions from depth
        this.nodes.forEach(node => {
            node.x = xScale(node.depth);
        });

        this.nodes.forEach(node => {
            node.height = Math.max(8, node.value * this.config.nodeHeightScale);
        });

        depths.forEach(depth => {
            const nodesAtDepth = nodesByDepth.get(depth);
            this.positionNodesAtDepth(nodesAtDepth, dimensions.height, maxDepth);
        });

        // Apply saved manual positions after automatic positioning
        this.applyManualPositions();

        this.minimizeCrossings();
        this.calculateLinkPositions();
    }

    // Apply saved manual positions after automatic positioning
    applyManualPositions() {
        this.nodes.forEach(node => {
            if (node.manuallyPositioned && node.manualY !== null) {
                node.y = node.manualY;
                // Force preserve layerIndex to maintain label positioning
                if (node.preserveLabelsAbove !== null) {
                    node.originalLayerIndex = node.preserveLabelsAbove ? 0 : 1;
                }
            }
        });
    }

    /**
     * Enhanced node positioning with group spacing - respects manual positions
     */
    positionNodesAtDepth(nodes, availableHeight, maxDepth) {
        const groupedNodes = this.groupAndSortNodes(nodes);
        const depth = nodes[0]?.depth ?? 0;
        
        const isLeftmost = depth === 0;
        const isRightmost = depth === maxDepth;
        
        let layerPadding;
        
        if (isLeftmost) {
            layerPadding = this.config.nodePadding * this.config.leftmostSpacing;
        } else if (isRightmost) {
            layerPadding = this.config.nodePadding * this.config.rightmostSpacing;
        } else {
            layerPadding = this.config.nodePadding * this.config.middleSpacing;
        }

        // Apply group spacing for leftmost and rightmost layers with multiple groups
        if ((isLeftmost || isRightmost) && groupedNodes.length > 1) {
            this.positionNodesWithGroupSpacing(groupedNodes, availableHeight, layerPadding, isLeftmost, isRightmost);
        } else {
            // Standard positioning for all layers - respects manual positions
            this.positionNodesStandard(groupedNodes, availableHeight, layerPadding);
        }
    }

    /**
     * Position nodes with group-to-group spacing
     */
    positionNodesWithGroupSpacing(nodes, availableHeight, basePadding, isLeftmost, isRightmost) {
        console.log(`🔧 Applying group spacing for ${isLeftmost ? 'leftmost' : 'rightmost'} layer`);
        
        // Separate manual and automatic nodes
        const manualNodes = nodes.filter(node => node.manuallyPositioned);
        const autoNodes = nodes.filter(node => !node.manuallyPositioned);
        
        if (autoNodes.length === 0) {
            console.log('All nodes manually positioned, skipping automatic positioning');
            return; 
        }
        
        // Detect distinct groups based on naming patterns and existing group property
        const groups = this.detectNodeGroups(autoNodes);
        console.log(`📊 Detected ${groups.length} groups:`, groups.map(g => `${g.name} (${g.nodes.length} nodes)`));
        
        // Calculate total height requirements for auto nodes only
        const totalNodeHeight = autoNodes.reduce((sum, node) => sum + node.height, 0);
        const totalBasePadding = basePadding * (autoNodes.length - 1);
        
        // Get group gap setting
        const groupGap = isLeftmost ? this.config.leftmostGroupGap : this.config.rightmostGroupGap;
        const totalGroupGaps = groupGap * (groups.length - 1);
        
        const totalRequired = totalNodeHeight + totalBasePadding + totalGroupGaps;
        
        // Start positioning
        const startY = Math.max(20, (availableHeight - totalRequired) / 2);
        let currentY = startY;
        
        groups.forEach((group, groupIndex) => {
            console.log(`📍 Positioning group "${group.name}" at Y: ${currentY}`);
            
            // Position nodes within this group
            group.nodes.forEach((node, nodeIndex) => {
                node.y = currentY;
                node.layerIndex = groupIndex * 100 + nodeIndex; // Ensure group separation in sorting
                currentY += node.height;
                
                // Add base padding between nodes within the group (but not after last node in group)
                if (nodeIndex < group.nodes.length - 1) {
                    currentY += basePadding;
                }
            });
            
            // Add group gap after this group (but not after the last group)
            if (groupIndex < groups.length - 1) {
                currentY += groupGap;
                console.log(`📏 Added ${groupGap}px group gap after "${group.name}"`);
            }
        });
        
        // Preserve manual node layer indices
        manualNodes.forEach((node, index) => {
            node.layerIndex = 1000 + index; // High layer index to keep them separate
        });
        
        console.log(`✅ Group spacing applied. Total height used: ${currentY - startY}px`);
    }

    /**
     * Detect distinct groups within a layer based on naming patterns and properties
     */
    detectNodeGroups(nodes) {
        const groups = [];
        const processedNodes = new Set();
        
        // First, group by explicit 'group' property if it exists
        const explicitGroups = new Map();
        nodes.forEach(node => {
            if (node.group && !processedNodes.has(node.id)) {
                if (!explicitGroups.has(node.group)) {
                    explicitGroups.set(node.group, []);
                }
                explicitGroups.get(node.group).push(node);
                processedNodes.add(node.id);
            }
        });
        
        // Add explicit groups
        explicitGroups.forEach((groupNodes, groupName) => {
            groups.push({
                name: groupName,
                nodes: groupNodes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            });
        });
        
        // Then, detect groups by naming patterns for remaining nodes
        const remainingNodes = nodes.filter(node => !processedNodes.has(node.id));
        
        if (remainingNodes.length > 0) {
            const patternGroups = this.detectPatternGroups(remainingNodes);
            groups.push(...patternGroups);
            
            patternGroups.forEach(group => {
                group.nodes.forEach(node => processedNodes.add(node.id));
            });
        }
        
        // Add any remaining ungrouped nodes as individual groups
        const ungroupedNodes = nodes.filter(node => !processedNodes.has(node.id));
        ungroupedNodes.forEach(node => {
            groups.push({
                name: `Individual: ${node.id}`,
                nodes: [node]
            });
        });
        
        return groups;
    }

    /**
     * Detect groups based on naming patterns (e.g., "mercado" prefix)
     */
    detectPatternGroups(nodes) {
        const groups = [];
        const processedNodes = new Set();
        
        // Look for common prefixes (e.g., "mercado")
        const prefixGroups = new Map();
        
        nodes.forEach(node => {
            if (processedNodes.has(node.id)) return;
            
            const words = node.id.toLowerCase().split(/[\s\-_]+/);
            const firstWord = words[0];
            
            // Only group if the first word appears in multiple nodes
            if (firstWord.length > 3) { // Ignore very short words
                const samePrefix = nodes.filter(n => 
                    !processedNodes.has(n.id) && 
                    n.id.toLowerCase().startsWith(firstWord)
                );
                
                if (samePrefix.length > 1) {
                    const groupName = firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
                    prefixGroups.set(groupName, samePrefix);
                    samePrefix.forEach(n => processedNodes.add(n.id));
                }
            }
        });
        
        // Convert prefix groups to standard format
        prefixGroups.forEach((groupNodes, groupName) => {
            groups.push({
                name: groupName,
                nodes: groupNodes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
            });
        });
        
        // Group remaining nodes by category if they're similar
        const remainingNodes = nodes.filter(node => !processedNodes.has(node.id));
        
        if (remainingNodes.length > 1) {
            const categoryGroups = new Map();
            
            remainingNodes.forEach(node => {
                const category = node.category || 'Other';
                if (!categoryGroups.has(category)) {
                    categoryGroups.set(category, []);
                }
                categoryGroups.get(category).push(node);
            });
            
            // Only create category groups if there are multiple nodes in the category
            categoryGroups.forEach((groupNodes, category) => {
                if (groupNodes.length > 1) {
                    groups.push({
                        name: `${category.charAt(0).toUpperCase() + category.slice(1)} Group`,
                        nodes: groupNodes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                    });
                    groupNodes.forEach(n => processedNodes.add(n.id));
                }
            });
        }
        
        return groups;
    }

    /**
     * Standard positioning for layers without group spacing
     */
    positionNodesStandard(nodes, availableHeight, layerPadding) {
        // Skip manually positioned nodes
        const nodesToPosition = nodes.filter(node => !node.manuallyPositioned);
        const manualNodes = nodes.filter(node => node.manuallyPositioned);
        
        if (nodesToPosition.length === 0) return; // All nodes manually positioned
        
        const totalHeight = d3.sum(nodesToPosition, d => d.height);
        const totalPadding = layerPadding * (nodesToPosition.length - 1);
        const totalRequired = totalHeight + totalPadding;
        
        const startY = Math.max(20, (availableHeight - totalRequired) / 2);
        let currentY = startY;
        
        nodesToPosition.forEach((node, index) => {
            node.y = currentY;
            node.layerIndex = index;
            currentY += node.height + layerPadding;
        });
        
        // Preserve manual node layer indices
        manualNodes.forEach((node, index) => {
            node.layerIndex = nodesToPosition.length + index;
        });
    }

    minimizeCrossings() {
        const nodesByDepth = d3.group(this.nodes, d => d.depth);
        const depths = Array.from(nodesByDepth.keys()).sort((a, b) => a - b);
        
        for (let iteration = 0; iteration < 4; iteration++) {
            for (let i = 1; i < depths.length; i++) {
                const currentDepth = depths[i];
                const nodes = nodesByDepth.get(currentDepth);
                this.sortNodesByBarycenter(nodes, 'target');
            }
            
            for (let i = depths.length - 2; i >= 0; i--) {
                const currentDepth = depths[i];
                const nodes = nodesByDepth.get(currentDepth);
                this.sortNodesByBarycenter(nodes, 'source');
            }
        }
        
        depths.forEach(depth => {
            const nodesAtDepth = nodesByDepth.get(depth);
            this.recalculateYPositions(nodesAtDepth);
        });
    }

    sortNodesByBarycenter(nodes, direction) {
        nodes.forEach(node => {
            const links = direction === 'source' ? node.sourceLinks : node.targetLinks;
            
            if (links.length === 0) {
                node.barycenter = node.y + node.height / 2;
                return;
            }
            
            let weightedSum = 0;
            let totalWeight = 0;
            
            links.forEach(link => {
                const connectedNode = direction === 'source' ? link.target : link.source;
                const weight = link.value;
                const position = connectedNode.y + connectedNode.height / 2;
                
                weightedSum += position * weight;
                totalWeight += weight;
            });
            
            node.barycenter = totalWeight > 0 ? weightedSum / totalWeight : node.y + node.height / 2;
        });
        
        nodes.sort((a, b) => {
            const groupDiff = (a.group || 'z').localeCompare(b.group || 'z');
            if (Math.abs(a.barycenter - b.barycenter) < 20 && groupDiff !== 0) {
                return groupDiff;
            }
            return a.barycenter - b.barycenter;
        });
    }

    recalculateYPositions(nodes) {
        if (nodes.length === 0) return;
        
        // Skip recalculation if all nodes are manually positioned
        const manualNodes = nodes.filter(node => node.manuallyPositioned);
        const autoNodes = nodes.filter(node => !node.manuallyPositioned);
        
        if (autoNodes.length === 0) {
            console.log('All nodes manually positioned, skipping recalculation');
            return;
        }
        
        const depth = nodes[0].depth;
        const maxDepth = Math.max(...this.nodes.map(n => n.depth));
        const isLeftmost = depth === 0;
        const isRightmost = depth === maxDepth;
        
        let layerPadding;
        if (isLeftmost) {
            layerPadding = this.config.nodePadding * this.config.leftmostSpacing;
        } else if (isRightmost) {
            layerPadding = this.config.nodePadding * this.config.rightmostSpacing;
        } else {
            layerPadding = this.config.nodePadding * this.config.middleSpacing;
        }
        
        const availableHeight = this.config.height - this.config.margin.top - this.config.margin.bottom;
        
        // Re-apply group spacing if this is leftmost or rightmost layer
        if ((isLeftmost || isRightmost) && autoNodes.length > 1) {
            const groups = this.detectNodeGroups(autoNodes);
            if (groups.length > 1) {
                this.positionNodesWithGroupSpacing(autoNodes, availableHeight, layerPadding, isLeftmost, isRightmost);
                return;
            }
        }
        
        // Standard repositioning for auto nodes only
        const totalHeight = d3.sum(autoNodes, d => d.height);
        const totalPadding = layerPadding * (autoNodes.length - 1);
        const totalRequired = totalHeight + totalPadding;
        
        const startY = Math.max(20, (availableHeight - totalRequired) / 2);
        let currentY = startY;
        
        autoNodes.forEach((node, index) => {
            node.y = currentY;
            node.layerIndex = index;
            currentY += node.height + layerPadding;
        });
        
        // Preserve manual node layer indices
        manualNodes.forEach((node, index) => {
            node.layerIndex = autoNodes.length + index;
        });
    }

    groupAndSortNodes(nodes) {
        const depth = nodes[0]?.depth;
        
        if (depth === 4) {
            return this.sortFinalLayerBySource(nodes);
        }
        
        const groups = new Map();
        
        nodes.forEach(node => {
            const group = node.group || 'default';
            if (!groups.has(group)) {
                groups.set(group, []);
            }
            groups.get(group).push(node);
        });

        const groupOrder = [
            'revenue_sources',      
            'aggregated_revenue',   
            'gross_metrics',        
            'operating_metrics',    
            'final_results',        
            'operating_expenses',   
            'final_adjustments',    
            'default'               
        ];

        const sortedNodes = [];
        
        groupOrder.forEach(groupName => {
            if (groups.has(groupName)) {
                const groupNodes = groups.get(groupName);
                
                groupNodes.sort((a, b) => {
                    if (a.sort_order !== undefined && b.sort_order !== undefined) {
                        return a.sort_order - b.sort_order;
                    }
                    
                    const categoryPriority = this.getCategoryPriority(a.category, b.category, groupName);
                    if (categoryPriority !== 0) {
                        return categoryPriority;
                    }
                    
                    return a.value - b.value;
                });
                
                sortedNodes.push(...groupNodes);
            }
        });

        const processedGroups = new Set(groupOrder);
        groups.forEach((groupNodes, groupName) => {
            if (!processedGroups.has(groupName)) {
                groupNodes.sort((a, b) => a.value - b.value);
                sortedNodes.push(...groupNodes);
            }
        });
        
        return sortedNodes;
    }

    sortFinalLayerBySource(nodes) {
        const sourceGroups = new Map();
        
        nodes.forEach(node => {
            let sourceParent = 'unknown';
            let sourceNode = null;
            
            this.links.forEach(link => {
                if (link.target.id === node.id) {
                    sourceParent = link.source.id;
                    sourceNode = link.source;
                }
            });
            
            if (!sourceGroups.has(sourceParent)) {
                sourceGroups.set(sourceParent, { nodes: [], sourceNode: sourceNode });
            }
            sourceGroups.get(sourceParent).nodes.push(node);
        });
        
        const sortedSourceGroups = Array.from(sourceGroups.entries())
            .sort((a, b) => {
                const aSourceY = a[1].sourceNode?.y || 0;
                const bSourceY = b[1].sourceNode?.y || 0;
                return aSourceY - bSourceY;
            });
        
        const sortedNodes = [];
        
        sortedSourceGroups.forEach(([sourceName, groupData]) => {
            const sourceNodes = groupData.nodes;
            sourceNodes.sort((a, b) => b.value - a.value);
            sortedNodes.push(...sourceNodes);
        });
        
        return sortedNodes;
    }

    getCategoryPriority(categoryA, categoryB, groupName) {
        const categoryPriorities = {
            'income': 1,
            'profit': 2,
            'revenue': 3,
            'cost': 4,
            'expense': 5,
            'tax': 6,
            'other': 7
        };
        
        if (groupName === 'final_results') {
            if (categoryA === 'income' && categoryB !== 'income') return -1;
            if (categoryB === 'income' && categoryA !== 'income') return 1;
        }
        
        if (groupName === 'final_adjustments') {
            if (categoryA === 'tax' && categoryB !== 'tax') return -1;
            if (categoryB === 'tax' && categoryA !== 'tax') return 1;
        }
        
        const priorityA = categoryPriorities[categoryA] || 5;
        const priorityB = categoryPriorities[categoryB] || 5;
        
        return priorityA - priorityB;
    }

    calculateLinkPositions() {
        this.links.forEach(link => {
            link.width = link.value * this.config.linkWidthScale;
        });
        
        this.nodes.forEach(node => {
            if (node.sourceLinks.length === 0) return;
            
            node.sourceLinks.sort((a, b) => a.target.y - b.target.y);
            
            const totalOutflow = d3.sum(node.sourceLinks, d => d.value);
            const effectiveNodeHeight = node.height * this.config.linkWidthScale;
            
            let currentY = node.y + (node.height - effectiveNodeHeight) / 2;
            
            node.sourceLinks.forEach((link, index) => {
                link.sourceY = currentY;
                const proportionalHeight = (link.value / totalOutflow) * effectiveNodeHeight;
                link.sourceHeight = proportionalHeight;
                currentY += proportionalHeight;
            });
            
            const totalUsedHeight = d3.sum(node.sourceLinks, d => d.sourceHeight);
            if (Math.abs(totalUsedHeight - effectiveNodeHeight) > 0.01) {
                const lastLink = node.sourceLinks[node.sourceLinks.length - 1];
                lastLink.sourceHeight += (effectiveNodeHeight - totalUsedHeight);
            }
        });
        
        this.nodes.forEach(node => {
            if (node.targetLinks.length === 0) return;
            
            node.targetLinks.sort((a, b) => a.source.y - b.source.y);
            
            const totalInflow = d3.sum(node.targetLinks, d => d.value);
            const effectiveNodeHeight = node.height * this.config.linkWidthScale;
            
            let currentY = node.y + (node.height - effectiveNodeHeight) / 2;
            
            node.targetLinks.forEach((link, index) => {
                link.targetY = currentY;
                const proportionalHeight = (link.value / totalInflow) * effectiveNodeHeight;
                link.targetHeight = proportionalHeight;
                currentY += proportionalHeight;
            });
            
            const totalUsedHeight = d3.sum(node.targetLinks, d => d.targetHeight);
            if (Math.abs(totalUsedHeight - effectiveNodeHeight) > 0.01) {
                const lastLink = node.targetLinks[node.targetLinks.length - 1];
                lastLink.targetHeight += (effectiveNodeHeight - totalUsedHeight);
            }
        });
        
        this.links.forEach(link => {
            const sourceDepth = link.source.depth;
            const layerCurvature = this.config.layerCurvature?.[sourceDepth] || this.config.curveIntensity;
            link.path = this.createSmoothPath(link, layerCurvature);
        });
    }

    createSmoothPath(link, curvature = this.config.curveIntensity) {
        const sourceX = link.source.x + this.config.nodeWidth;
        const targetX = link.target.x;
        
        const sourceY0 = link.sourceY;
        const sourceY1 = link.sourceY + link.sourceHeight;
        const targetY0 = link.targetY;
        const targetY1 = link.targetY + link.targetHeight;
        
        const controlX1 = sourceX + (targetX - sourceX) * curvature;
        const controlX2 = targetX - (targetX - sourceX) * curvature;
        
        return `M${sourceX},${sourceY0}
                C${controlX1},${sourceY0} ${controlX2},${targetY0} ${targetX},${targetY0}
                L${targetX},${targetY1}
                C${controlX2},${targetY1} ${controlX1},${sourceY1} ${sourceX},${sourceY1}
                Z`;
    }

    renderTitle() {
        const headerGroup = this.svg.append('g')
            .attr('class', 'chart-header');

        const company = this.data?.metadata?.company || 'Company';
        const period = this.data?.metadata?.period || 'Period';
        const titleText = `${company} ${period} Financial Flow`;

        headerGroup.append('text')
            .attr('x', this.config.width / 2)
            .attr('y', 60)
            .attr('text-anchor', 'middle')
            .attr('font-size', '40px')
            .attr('font-weight', '1000')
            .attr('fill', '#1f2937')
            .attr('letter-spacing', '0.5px')
            .text(titleText);

        // REMOVED: Subtitle rendering - no longer displays subtitle
    }

    renderBrandingFooter() {
        const footerGroup = this.svg.append('g')
            .attr('class', 'chart-branding')
            .attr('transform', `translate(0, ${this.config.height - 35})`);

        const logoUrl = this.data?.metadata?.logoUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiByeD0iNCIgZmlsbD0iIzY2N2VlYSIvPgo8dGV4dCB4PSIxMCIgeT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iYm9sZCI+UDwvdGV4dD4KPC9zdmc+';
        
        footerGroup.append('image')
            .attr('x', 20)
            .attr('y', -40)
            .attr('width', 24)
            .attr('height', 24)
            .attr('href', logoUrl)
            .attr('opacity', 0.8);

        footerGroup.append('text')
            .attr('x', 50)
            .attr('y', -25)
            .attr('font-size', '16px')
            .attr('font-weight', '800')
            .attr('fill', '#667eea')
            .text('PULSE ANALYTICS');

        // REMOVED: pulse-analytics.com text from center

        footerGroup.append('text')
            .attr('x', this.config.width - 20)
            .attr('y', -25)
            .attr('text-anchor', 'end')
            .attr('font-size', '16px')
            .attr('font-weight', '800')
            .attr('fill', '#667eea')
            .attr('opacity', 0.7)
            .text('Generated by Pulse Chart');
    }

    renderFootnotes() {
        if (!this.data?.metadata?.footnotes) return;
        
        const footnotes = this.svg.append('g')
            .attr('class', 'chart-footnotes')
            .attr('transform', `translate(${this.config.margin.left}, ${this.config.height - 80})`);

        this.data.metadata.footnotes.forEach((note, index) => {
            footnotes.append('text')
                .attr('y', index * 12)
                .attr('font-size', '10px')
                .attr('font-weight', '400')
                .attr('fill', '#6b7280')
                .text(`${index + 1}. ${note}`);
        });
    }

    renderLinks() {
        if (this.links.length === 0) {
            console.warn('No links to render - check data processing');
            return;
        }

        const linkGroups = this.chart.selectAll('.sankey-link')
            .data(this.links)
            .enter()
            .append('g')
            .attr('class', 'sankey-link');

        linkGroups.append('path')
            .attr('d', d => d.path)
            .attr('fill', d => this.getLinkColor(d))
            .attr('fill-opacity', this.config.linkOpacity)
            .style('cursor', 'pointer')
            .style('transition', 'all 0.2s ease')
            .on('mouseover', (event, d) => {
                d3.select(event.currentTarget)
                    .attr('fill-opacity', Math.min(1.0, this.config.linkOpacity + 0.2));
                this.showLinkTooltip(event, d);
            })
            .on('mouseout', (event, d) => {
                d3.select(event.currentTarget)
                    .attr('fill-opacity', this.config.linkOpacity);
                this.hideTooltip();
            });
    }

    renderNodes() {
        const nodeGroups = this.chart.selectAll('.sankey-node')
            .data(this.nodes)
            .enter()
            .append('g')
            .attr('class', 'sankey-node')
            .attr('transform', d => `translate(${d.x}, ${d.y})`);

        nodeGroups.append('rect')
            .attr('width', this.config.nodeWidth)
            .attr('height', d => d.height)
            .attr('fill', d => this.getNodeColor(d))
            .attr('fill-opacity', this.config.nodeOpacity)
            .attr('opacity', this.config.nodeOpacity) // FIXED: Added overall opacity
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .attr('rx', 1)
            .style('cursor', 'move')
            .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))')
            .style('transition', 'all 0.2s ease')
            .on('mouseover', (event, d) => {
                if (!this.isDragging) {
                    d3.select(event.currentTarget)
                        .style('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))')
                        .style('transform', 'scale(1.02)');
                    this.showNodeTooltip(event, d);
                }
            })
            .on('mouseout', (event, d) => {
                if (!this.isDragging) {
                    d3.select(event.currentTarget)
                        .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))')
                        .style('transform', 'scale(1)');
                    this.hideTooltip();
                }
            });

        // Add drag behavior
        this.addDragBehavior(nodeGroups);
    }

    addDragBehavior(nodeGroups) {
        const self = this;
        this.isDragging = false;
        
        const drag = d3.drag()
            .on('start', function(event, d) {
                self.isDragging = true;
                self.hideTooltip();
                
                // Mark node as manually positioned and preserve label positioning
                d.manuallyPositioned = true;
                // Store EXACT label positioning based on current layer position and depth
                const maxDepth = Math.max(...self.nodes.map(n => n.depth));
                const isMiddle = d.depth !== 0 && d.depth !== maxDepth;
                d.preserveLabelsAbove = isMiddle ? (d.layerIndex === 0) : null;
                
                d3.select(this).select('rect')
                    .style('stroke', '#667eea')
                    .style('stroke-width', 3)
                    .style('filter', 'drop-shadow(0 6px 12px rgba(102, 126, 234, 0.3))');
                
                self.showDragHint(d);
            })
            .on('drag', function(event, d) {
                const newY = Math.max(20, Math.min(
                    self.config.height - self.config.margin.top - self.config.margin.bottom - d.height - 20,
                    event.y
                ));
                
                d.y = newY;
                d.manualY = newY;
                d3.select(this).attr('transform', `translate(${d.x}, ${d.y})`);
                
                self.updateNodeLinks(d);
                self.updateDragHint(d, newY);
            })
            .on('end', function(event, d) {
                self.isDragging = false;
                
                d3.select(this).select('rect')
                    .style('stroke', 'white')
                    .style('stroke-width', 2)
                    .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))');
                
                self.hideDragHint();
                
                self.calculateLinkPositions();
                self.chart.selectAll('.node-label, .node-value').remove();
                self.renderLabels();
                self.renderLinks();
                
                console.log(`📍 Node "${d.id}" repositioned to Y: ${d.y.toFixed(1)}`);
            });

        nodeGroups.call(drag);
    }

    // Recalculate link positions for a single node during drag
    recalculateSingleNodeLinkPositions(node) {
        // Recalculate source links (outgoing from this node)
        if (node.sourceLinks.length > 0) {
            const totalOutflow = d3.sum(node.sourceLinks, d => d.value);
            const effectiveNodeHeight = node.height * this.config.linkWidthScale;
            
            let currentY = node.y + (node.height - effectiveNodeHeight) / 2;
            
            node.sourceLinks.forEach((link) => {
                link.sourceY = currentY;
                const proportionalHeight = (link.value / totalOutflow) * effectiveNodeHeight;
                link.sourceHeight = proportionalHeight;
                currentY += proportionalHeight;
            });
        }
        
        // Recalculate target links (incoming to this node)
        if (node.targetLinks.length > 0) {
            const totalInflow = d3.sum(node.targetLinks, d => d.value);
            const effectiveNodeHeight = node.height * this.config.linkWidthScale;
            
            let currentY = node.y + (node.height - effectiveNodeHeight) / 2;
            
            node.targetLinks.forEach((link) => {
                link.targetY = currentY;
                const proportionalHeight = (link.value / totalInflow) * effectiveNodeHeight;
                link.targetHeight = proportionalHeight;
                currentY += proportionalHeight;
            });
        }
    }

    updateNodeLinks(draggedNode) {
        // Recalculate link positions for real-time updates
        this.recalculateSingleNodeLinkPositions(draggedNode);
        
        // Update source links
        draggedNode.sourceLinks.forEach(link => {
            link.path = this.createSmoothPath(link);
            
            this.chart.selectAll('.sankey-link path')
                .filter(d => d.source.id === link.source.id && d.target.id === link.target.id)
                .attr('d', link.path);
        });

        // Update target links  
        draggedNode.targetLinks.forEach(link => {
            link.path = this.createSmoothPath(link);
            
            this.chart.selectAll('.sankey-link path')
                .filter(d => d.source.id === link.source.id && d.target.id === link.target.id)
                .attr('d', link.path);
        });
    }

    showDragHint(node) {
        this.dragHint = this.chart.append('g')
            .attr('class', 'drag-hint')
            .style('pointer-events', 'none');

        // Vertical guide line
        const availableHeight = this.config.height - this.config.margin.top - this.config.margin.bottom;
        
        this.dragHint.append('line')
            .attr('x1', node.x + this.config.nodeWidth / 2)
            .attr('y1', 20)
            .attr('x2', node.x + this.config.nodeWidth / 2)  
            .attr('y2', availableHeight - 20)
            .attr('stroke', '#667eea')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5')
            .attr('opacity', 0.5);

        // Position indicator
        this.dragHint.append('text')
            .attr('class', 'drag-position')
            .attr('x', node.x + this.config.nodeWidth + 10)
            .attr('y', node.y + node.height / 2)
            .attr('font-size', '12px')
            .attr('font-weight', '600')
            .attr('fill', '#667eea')
            .text(`Y: ${node.y.toFixed(0)}px`);
    }

    updateDragHint(node, newY) {
        if (this.dragHint) {
            this.dragHint.select('.drag-position')
                .attr('y', newY + node.height / 2)
                .text(`Y: ${newY.toFixed(0)}px`);
        }
    }

    hideDragHint() {
        if (this.dragHint) {
            this.dragHint.remove();
            this.dragHint = null;
        }
    }

    renderLabels() {
        const maxDepth = Math.max(...this.nodes.map(n => n.depth));
        
        this.nodes.forEach(node => {
            const isLeftmost = node.depth === 0;
            const isRightmost = node.depth === maxDepth;
            const isMiddle = !isLeftmost && !isRightmost;
            
            if (isLeftmost) {
                this.renderLeftmostLabels(node);
            } else if (isRightmost) {
                this.renderRightmostLabels(node);
            } else {
                this.renderMiddleLabels(node);
            }
        });
    }

    getValueDistance(layerType = 'general') {
        if (typeof this.config.valueDistance === 'object') {
            if (layerType === 'middle') {
                return this.config.valueDistance.middle || 8;
            } else {
                return this.config.valueDistance.general || 8;
            }
        }
        return layerType === 'middle' ? 8 : (this.config.valueDistance || 8);
    }

    renderLeftmostLabels(node) {
        const labelDistance = this.config.labelDistance.leftmost;
        const valueDistance = this.getValueDistance('general');
        const wrappedText = this.wrapText(node.id, 15);
        const nodeColor = this.getNodeColor(node);
        
        const labelGroup = this.chart.append('g')
            .attr('class', 'node-label')
            .attr('transform', `translate(${node.x - labelDistance}, ${node.y + node.height/2})`);

        wrappedText.forEach((line, index) => {
            labelGroup.append('text')
                .attr('text-anchor', 'end')
                .attr('dominant-baseline', 'middle')
                .attr('y', (index - (wrappedText.length - 1) / 2) * 14)
                .attr('font-size', '12px')
                .attr('font-weight', '600')
                .attr('fill', nodeColor)
                .text(line);
        });

        const valueGroup = this.chart.append('g')
            .attr('class', 'node-value')
            .attr('transform', `translate(${node.x + this.config.nodeWidth/2}, ${node.y - valueDistance - 2})`);

        valueGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'alphabetic')
            .attr('font-size', '11px')
            .attr('font-weight', '500')
            .attr('fill', nodeColor)
            .text(this.formatCurrency(node.value, node));
    }

    renderRightmostLabels(node) {
        const labelDistance = this.config.labelDistance.rightmost;
        const valueDistance = this.getValueDistance('general');
        const wrappedText = this.wrapText(node.id, 15);
        const nodeColor = this.getNodeColor(node);
        
        const labelGroup = this.chart.append('g')
            .attr('class', 'node-label')
            .attr('transform', `translate(${node.x + this.config.nodeWidth + labelDistance}, ${node.y + node.height/2})`);

        wrappedText.forEach((line, index) => {
            labelGroup.append('text')
                .attr('text-anchor', 'start')
                .attr('dominant-baseline', 'middle')
                .attr('y', (index - (wrappedText.length - 1) / 2) * 14)
                .attr('font-size', '12px')
                .attr('font-weight', '600')
                .attr('fill', nodeColor)
                .text(line);
        });

        const valueGroup = this.chart.append('g')
            .attr('class', 'node-value')
            .attr('transform', `translate(${node.x + this.config.nodeWidth/2}, ${node.y - valueDistance - 2})`);

        valueGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'alphabetic')
            .attr('font-size', '11px')
            .attr('font-weight', '500')
            .attr('fill', nodeColor)
            .text(this.formatCurrency(node.value, node));
    }

    renderMiddleLabels(node) {
        const labelDistance = this.config.labelDistance.middle;
        const wrappedText = this.wrapText(node.id, 18);
        const nodeColor = this.getNodeColor(node);
        
        // More robust label positioning for manually positioned nodes
        let isTopNode;
        if (node.manuallyPositioned) {
            // Always use preserved preference for manually positioned nodes
            isTopNode = node.preserveLabelsAbove === true;
        } else {
            // Use layerIndex for automatically positioned nodes
            isTopNode = node.layerIndex === 0;
        }
        
        if (isTopNode) {
            this.renderMiddleLabelsAbove(node, labelDistance, wrappedText, nodeColor);
        } else {
            this.renderMiddleLabelsBelow(node, labelDistance, wrappedText, nodeColor);
        }
    }

    renderMiddleLabelsAbove(node, labelDistance, wrappedText, nodeColor) {
        const valueDistance = this.getValueDistance('middle');
        
        const labelGroup = this.chart.append('g')
            .attr('class', 'node-label')
            .attr('transform', `translate(${node.x + this.config.nodeWidth/2}, ${node.y - labelDistance})`);

        wrappedText.forEach((line, index) => {
            labelGroup.append('text')
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'alphabetic')
                .attr('y', index * 14)
                .attr('font-size', '12px')
                .attr('font-weight', '600')
                .attr('fill', nodeColor)
                .text(line);
        });

        const valueGroup = this.chart.append('g')
            .attr('class', 'node-value')
            .attr('transform', `translate(${node.x + this.config.nodeWidth/2}, ${node.y - valueDistance - 2})`);

        valueGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'alphabetic')
            .attr('y', 0)
            .attr('font-size', '11px')
            .attr('font-weight', '500')
            .attr('fill', nodeColor)
            .text(this.formatCurrency(node.value, node));
    }

    renderMiddleLabelsBelow(node, labelDistance, wrappedText, nodeColor) {
        const valueDistance = this.getValueDistance('middle');
        
        const valueGroup = this.chart.append('g')
            .attr('class', 'node-value')
            .attr('transform', `translate(${node.x + this.config.nodeWidth/2}, ${node.y + node.height + valueDistance + 11})`);

        valueGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'alphabetic')
            .attr('y', 0)
            .attr('font-size', '11px')
            .attr('font-weight', '500')
            .attr('fill', nodeColor)
            .text(this.formatCurrency(node.value, node));

        const labelGroup = this.chart.append('g')
            .attr('class', 'node-label')
            .attr('transform', `translate(${node.x + this.config.nodeWidth/2}, ${node.y + node.height + labelDistance})`);

        wrappedText.forEach((line, index) => {
            labelGroup.append('text')
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'hanging')
                .attr('y', index * 14)
                .attr('font-size', '12px')
                .attr('font-weight', '600')
                .attr('fill', nodeColor)
                .text(line);
        });
    }

    wrapText(text, maxLength = 10) {
        if (text.length <= maxLength) return [text];
        
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        words.forEach(word => {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            
            if (testLine.length <= maxLength) {
                currentLine = testLine;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    lines.push(word);
                }
            }
        });
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }

    /**
     * Format currency with proper brackets for expenses and percentages/margins
     */
    formatCurrency(value, node) {
        const currency = this.data?.metadata?.currency || 'USD';
        const unit = this.data?.metadata?.unit || 'millions';

        const currencySymbols = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'JPY': '¥',
            'CAD': 'C$',
            'AUD': 'A$',
            'CHF': 'CHF ',
            'CNY': '¥'
        };

        const symbol = currencySymbols[currency] || '$';
        
        let formattedValue;

        switch (unit.toLowerCase()) {
            case 'thousands':
                if (value >= 1000) {
                    formattedValue = `${symbol}${(value/1000).toFixed(1)}M`;
                } else if (value >= 1) {
                    formattedValue = `${symbol}${value.toFixed(0)}K`;
                } else {
                    formattedValue = `${symbol}${(value * 1000).toFixed(0)}`;
                }
                break;

            case 'millions':
                if (value >= 1000) {
                    formattedValue = `${symbol}${(value/1000).toFixed(1)}B`;
                } else if (value >= 1) {
                    formattedValue = `${symbol}${value.toFixed(0)}M`;
                } else {
                    formattedValue = `${symbol}${(value * 1000).toFixed(0)}K`;
                }
                break;

            case 'billions':
                if (value >= 1000) {
                    formattedValue = `${symbol}${(value/1000).toFixed(1)}T`;
                } else if (value >= 1) {
                    formattedValue = `${symbol}${value.toFixed(1)}B`;
                } else {
                    formattedValue = `${symbol}${(value * 1000).toFixed(0)}M`;
                }
                break;

            default:
                if (value >= 1000) {
                    formattedValue = `${symbol}${(value/1000).toFixed(1)}B`;
                } else if (value >= 1) {
                    formattedValue = `${symbol}${value.toFixed(0)}M`;
                } else {
                    formattedValue = `${symbol}${(value * 1000).toFixed(0)}K`;
                }
        }
        
        // Add brackets for expenses and costs
        if (node && node.isExpenseType) {
            formattedValue = `(${formattedValue})`;
        }
        
        // Add percentage/margin display for relevant nodes
        if (node) {
            if (node.marginType && node.marginValue) {
                formattedValue += ` | ${node.marginValue.toFixed(1)}%`;
            } else if (node.percentageOfRevenue && node.percentageOfRevenue > 0 && 
                      (node.category === 'revenue' || node.category === 'cost' || node.isExpenseType)) {
                formattedValue += ` | ${node.percentageOfRevenue.toFixed(1)}%`;
            }
        }
        
        return formattedValue;
    }

    /**
     * Get node color with custom color support
     */
    getNodeColor(node) {
        let effectiveCategory = node.category;
        if (node.category === 'tax') {
            effectiveCategory = 'expense';
        }
        
        if (this.customColors && this.customColors[effectiveCategory]) {
            return this.customColors[effectiveCategory];
        }
        
        const defaultColors = {
            revenue: '#3498db',
            cost: '#e74c3c',
            profit: '#27ae60',
            expense: '#e67e22',
            income: '#9b59b6',
            tax: '#e67e22'
        };
        return defaultColors[node.category] || '#95a5a6';
    }

    /**
     * Get link color based on TARGET node category
     */
    getLinkColor(link) {
        const targetCategory = link.colorCategory || link.targetCategory || link.target.category;
        
        let effectiveCategory = targetCategory;
        if (targetCategory === 'tax') {
            effectiveCategory = 'expense';
        }
        
        const targetColor = this.getColorByCategory(effectiveCategory);
        return this.lightenColor(targetColor, 15);
    }

    getColorByCategory(category) {
        if (this.customColors && this.customColors[category]) {
            return this.customColors[category];
        }
        
        const defaultColors = {
            revenue: '#3498db',
            cost: '#e74c3c',
            profit: '#27ae60',
            expense: '#e67e22',
            income: '#9b59b6',
            tax: '#e67e22'
        };
        
        return defaultColors[category] || '#95a5a6';
    }

    lightenColor(hex, percent) {
        const num = parseInt(hex.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    /**
     * Set custom colors with immediate re-render
     */
    setCustomColors(colorMap) {
        this.customColors = { ...colorMap };
        
        if (this.customColors.expense && !this.customColors.tax) {
            this.customColors.tax = this.customColors.expense;
        }
        
        if (this.data && this.data.metadata) {
            this.data.metadata.colorPalette = { ...this.customColors };
        }
        
        if (this.data) {
            this.render(this.data);
        }
        
        console.log('🎨 Updated custom colors:', this.customColors);
    }

    getCustomColors() {
        return { ...this.customColors };
    }

    resetColors() {
        this.customColors = {};
        
        if (this.data && this.data.metadata && this.data.metadata.colorPalette) {
            delete this.data.metadata.colorPalette;
        }
        
        if (this.data) {
            this.render(this.data);
        }
        
        console.log('🔄 Reset to default colors');
    }

    // Tooltip methods
    showNodeTooltip(event, d) {
        const percentageText = d.percentageOfRevenue ? 
            `${d.percentageOfRevenue.toFixed(1)}% of revenue` : '';
        
        const marginText = d.marginType && d.marginValue ? 
            `${d.marginType}: ${d.marginValue.toFixed(1)}%` : '';
        
        const content = `
            <div style="font-weight: 700; margin-bottom: 8px; font-size: 14px;">${d.id}</div>
            <div style="font-size: 16px; color: #3b82f6; margin-bottom: 8px; font-weight: 600;">
                ${this.formatCurrency(d.value, d)}
            </div>
            ${percentageText ? `<div style="font-size: 12px; color: rgba(255,255,255,0.9); margin-bottom: 4px;">${percentageText}</div>` : ''}
            ${marginText ? `<div style="font-size: 12px; color: rgba(255,255,255,0.9); margin-bottom: 4px;">${marginText}</div>` : ''}
            <div style="font-size: 11px; color: rgba(255,255,255,0.8); line-height: 1.4;">
                ${d.description || 'Financial component'}
            </div>
        `;
        
        this.tooltip
            .html(content)
            .style('left', (event.pageX) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .style('opacity', 1);
    }

    showLinkTooltip(event, d) {
        const percentage = d.source.value > 0 ? 
            ((d.value / d.source.value) * 100).toFixed(1) : '0';
            
        const content = `
            <div style="font-weight: 700; margin-bottom: 8px; font-size: 14px;">
                ${d.source.id} → ${d.target.id}
            </div>
            <div style="font-size: 16px; color: #3b82f6; margin-bottom: 8px; font-weight: 600;">
                ${this.formatCurrency(d.value, d.target)}
            </div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.8);">
                ${percentage}% of source flow<br>
                <em>Colored by target: ${d.target.category}</em>
            </div>
        `;
        
        this.tooltip
            .html(content)
            .style('left', (event.pageX) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .style('opacity', 1);
    }

    hideTooltip() {
        this.tooltip.style('opacity', 0);
    }

    // Control methods
    setCurveIntensity(intensity) {
        this.config.curveIntensity = intensity;
        this.calculateLinkPositions();
        this.renderLinks();
        return this;
    }

    setSpacing(base, left, middle, right) {
        this.config.nodePadding = base;
        this.config.leftmostSpacing = left;
        this.config.middleSpacing = middle;
        this.config.rightmostSpacing = right;
        this.calculateLayout();
        this.render(this.data);
        return this;
    }

    setOpacity(nodeOpacity, linkOpacity) {
        this.config.nodeOpacity = nodeOpacity;
        this.config.linkOpacity = linkOpacity;
        
        // FIXED: Force immediate visual update for both fill-opacity and opacity
        this.chart.selectAll('.sankey-node rect')
            .attr('fill-opacity', nodeOpacity)
            .attr('opacity', nodeOpacity); // Added overall opacity
        this.chart.selectAll('.sankey-link path')
            .attr('fill-opacity', linkOpacity)
            .attr('opacity', linkOpacity); // Added overall opacity
        return this;
    }

    setLabelPositioning(labelDistance, valueDistance) {
        this.config.labelDistance = labelDistance;
        this.config.valueDistance = valueDistance;
        this.chart.selectAll('.node-label, .node-value').remove();
        this.renderLabels();
        return this;
    }

    setLayerSpacing(depth, multiplier) {
        console.log(`🔧 Setting layer ${depth} spacing to ${multiplier}`);
        
        if (!this.config.layerSpacing) {
            this.config.layerSpacing = {};
        }
        
        this.config.layerSpacing[depth] = multiplier;
        
        const maxDepth = Math.max(...this.nodes.map(n => n.depth));
        
        if (depth === 0) {
            this.config.leftmostSpacing = multiplier;
        } else if (depth === maxDepth) {
            this.config.rightmostSpacing = multiplier;
        } else {
            this.config.middleSpacing = multiplier;
        }
        
        this.calculateLayout();
        this.render(this.data);
        return this;
    }

    setNodeDimensions(width, heightScale) {
        this.config.nodeWidth = width;
        this.config.nodeHeightScale = heightScale;
        this.calculateLayout();
        this.render(this.data);
        return this;
    }

    setLinkWidth(widthScale) {
        this.config.linkWidthScale = widthScale;
        this.calculateLinkPositions();
        this.renderLinks();
        return this;
    }

    updateConfig(newConfig) {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newConfig };
        
        if (newConfig.leftmostSpacing !== undefined) {
            this.config.layerSpacing[0] = newConfig.leftmostSpacing;
        }
        if (newConfig.middleSpacing !== undefined) {
            this.config.layerSpacing[1] = newConfig.middleSpacing;
            this.config.layerSpacing[2] = newConfig.middleSpacing;
        }
        if (newConfig.rightmostSpacing !== undefined) {
            const maxDepth = Math.max(...this.nodes.map(n => n.depth));
            this.config.layerSpacing[maxDepth] = newConfig.rightmostSpacing;
        }
        
        const needsFullRender = this.configRequiresFullRender(oldConfig, newConfig);
        const needsLayoutRecalc = this.configRequiresLayoutRecalc(oldConfig, newConfig);
        const needsLabelsUpdate = this.configRequiresLabelsUpdate(oldConfig, newConfig);
        
        if (needsFullRender) {
            this.render(this.data);
        } else if (needsLayoutRecalc) {
            this.calculateLayout();
            this.renderNodes();
            this.renderLabels();
            this.renderLinks();
        } else if (needsLabelsUpdate) {
            this.chart.selectAll('.node-label, .node-value').remove();
            this.renderLabels();
        } else {
            // FIXED: Update both fill-opacity and opacity for immediate visual feedback
            if (newConfig.nodeOpacity !== undefined) {
                this.chart.selectAll('.sankey-node rect')
                    .transition()
                    .duration(200)
                    .attr('fill-opacity', newConfig.nodeOpacity)
                    .attr('opacity', newConfig.nodeOpacity);
            }
            if (newConfig.linkOpacity !== undefined) {
                this.chart.selectAll('.sankey-link path')
                    .transition()
                    .duration(200)
                    .attr('fill-opacity', newConfig.linkOpacity)
                    .attr('opacity', newConfig.linkOpacity);
            }
        }
        
        return this;
    }

    configRequiresFullRender(oldConfig, newConfig) {
        const fullRenderKeys = ['nodeWidth', 'nodeHeightScale', 'nodePadding', 'layerSpacing', 'leftmostGroupGap', 'rightmostGroupGap'];
        return fullRenderKeys.some(key => 
            JSON.stringify(oldConfig[key]) !== JSON.stringify(newConfig[key])
        );
    }

    configRequiresLayoutRecalc(oldConfig, newConfig) {
        const layoutKeys = ['leftmostSpacing', 'middleSpacing', 'rightmostSpacing', 'linkWidthScale'];
        return layoutKeys.some(key => oldConfig[key] !== newConfig[key]);
    }

    configRequiresLabelsUpdate(oldConfig, newConfig) {
        const labelKeys = ['labelDistance', 'valueDistance'];
        return labelKeys.some(key => 
            JSON.stringify(oldConfig[key]) !== JSON.stringify(newConfig[key])
        );
    }

    generateFileName(extension = 'png') {
        const metadata = this.data?.metadata || {};
        
        let company = metadata.company || metadata.title || 'Chart';
        company = company.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
        
        let period = metadata.period || 'Period';
        period = period.replace(/[^a-zA-Z0-9\-]/g, '').substring(0, 10);
        
        const now = new Date();
        const timestamp = now.getFullYear().toString() +
                         (now.getMonth() + 1).toString().padStart(2, '0') +
                         now.getDate().toString().padStart(2, '0') + '-' +
                         now.getHours().toString().padStart(2, '0') +
                         now.getMinutes().toString().padStart(2, '0');
        
        return `${company}_${period}_${timestamp}.${extension}`;
    }

    // Export methods
    exportToPNG() {
        try {
            const svgData = new XMLSerializer().serializeToString(this.svg.node());
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            canvas.width = this.config.width * 2;
            canvas.height = this.config.height * 2;
            ctx.scale(2, 2);
            
            img.onload = () => {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, this.config.width, this.config.height);
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob(blob => {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = this.generateFileName('png');
                    link.click();
                    URL.revokeObjectURL(url);
                });
            };
            
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const svgUrl = URL.createObjectURL(svgBlob);
            img.src = svgUrl;
        } catch (error) {
            console.error('PNG export failed:', error);
            alert('PNG export failed. Please try again.');
        }
    }

    exportToSVG() {
        try {
            const svgData = new XMLSerializer().serializeToString(this.svg.node());
            const blob = new Blob([svgData], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = this.generateFileName('svg');
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('SVG export failed:', error);
            alert('SVG export failed. Please try again.');
        }
    }

    exportDataToCSV(data) {
        try {
            let csvContent = 'Type,ID,Depth,Value,Category,Description\n';
            
            data.nodes.forEach(node => {
                csvContent += `Node,"${node.id}",${node.depth},${node.value},"${node.category}","${node.description || ''}"\n`;
            });
            
            csvContent += '\nType,Source,Target,Value,Flow Type\n';
            
            data.links.forEach(link => {
                csvContent += `Link,"${link.source}","${link.target}",${link.value},"${link.type || ''}"\n`;
            });
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = this.generateFileName('csv');
            link.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('CSV export failed:', error);
            alert('CSV export failed. Please check console for details.');
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PulseSankeyChart;
}