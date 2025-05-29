// Placeholder for SankeyLayout.js
/* ===== SANKEY LAYOUT MODULE ===== */
/* Mathematical calculations and positioning logic */

(function() {
    'use strict';

    class SankeyLayout {
        constructor(config) {
            this.config = config;
            this.dimensions = {
                width: 0,
                height: 0
            };
            this.nodesByDepth = new Map();
            this.layoutCache = new Map();
        }

        // Main layout calculation pipeline
        calculateLayout(nodes, links, dimensions) {
            // Store dimensions for use in calculations
            this.dimensions = {
                width: dimensions.width - this.config.get('nodeWidth'),
                height: dimensions.height
            };

            // Clear cache
            this.layoutCache.clear();

            // Step 1: Process and validate data
            const processedNodes = this.preprocessNodes(nodes);
            const processedLinks = this.preprocessLinks(links, processedNodes);

            // Step 2: Group nodes by depth
            this.nodesByDepth = this.groupNodesByDepth(processedNodes);

            // Step 3: Calculate node dimensions
            this.calculateNodeDimensions(processedNodes);

            // Step 4: Position nodes horizontally
            this.positionNodesHorizontally(processedNodes);

            // Step 5: Position nodes vertically by depth
            this.positionNodesByDepth();

            // Step 6: Calculate link positions
            this.calculateLinkPositions(processedLinks);

            // Step 7: Apply optimizations if enabled
            if (this.config.get('autoFeatures.autoCenter') || 
                this.config.get('autoFeatures.autoMiddleAlign') ||
                this.config.get('autoFeatures.dynamicSpaceFill')) {
                this.applyAutoOptimizations(processedNodes, processedLinks);
            }

            return {
                nodes: processedNodes,
                links: processedLinks,
                bounds: this.calculateContentBounds(processedNodes),
                layoutInfo: {
                    nodesByDepth: this.nodesByDepth,
                    dimensions: this.dimensions,
                    optimization: 'auto'
                }
            };
        }

        // Preprocess nodes with validation and enhancement
        preprocessNodes(nodes) {
            return nodes.map(node => ({
                ...node,
                x: 0,
                y: 0,
                width: this.config.get('nodeWidth'),
                height: 0, // Will be calculated
                layoutInfo: {
                    processed: true,
                    timestamp: Date.now()
                }
            }));
        }

        // Preprocess links with validation
        preprocessLinks(links, nodes) {
            const nodeMap = new Map(nodes.map(n => [n.id, n]));
            
            return links.map(link => ({
                ...link,
                source: nodeMap.get(link.sourceId || link.source.id),
                target: nodeMap.get(link.targetId || link.target.id),
                width: 0, // Will be calculated
                path: '', // Will be calculated
                layoutInfo: {
                    processed: true,
                    timestamp: Date.now()
                }
            }));
        }

        // Group nodes by depth for processing
        groupNodesByDepth(nodes) {
            const groups = new Map();
            
            nodes.forEach(node => {
                if (!groups.has(node.depth)) {
                    groups.set(node.depth, []);
                }
                groups.get(node.depth).push(node);
            });

            // Sort nodes within each depth group
            groups.forEach((nodesAtDepth, depth) => {
                nodesAtDepth.sort((a, b) => {
                    // Custom order takes precedence
                    if (a.customOrder !== undefined && b.customOrder !== undefined) {
                        return a.customOrder - b.customOrder;
                    }
                    if (a.customOrder !== undefined) return -1;
                    if (b.customOrder !== undefined) return 1;
                    
                    // Parent order for grouped nodes
                    if (a.parentOrder !== undefined && b.parentOrder !== undefined) {
                        return a.parentOrder - b.parentOrder;
                    }
                    if (a.parentOrder !== undefined) return -1;
                    if (b.parentOrder !== undefined) return 1;
                    
                    // Default: sort by value (highest first)
                    return b.value - a.value;
                });
            });

            return groups;
        }

        // Calculate dimensions for all nodes
        calculateNodeDimensions(nodes) {
            const nodeHeightScale = this.config.get('visual.nodeHeightScale');
            const minNodeHeight = this.config.get('visual.minNodeHeight');

            nodes.forEach(node => {
                // Calculate height based on value and flows
                const sourceValue = node.sourceLinks ? 
                    node.sourceLinks.reduce((sum, link) => sum + link.value, 0) : 0;
                const targetValue = node.targetLinks ? 
                    node.targetLinks.reduce((sum, link) => sum + link.value, 0) : 0;
                
                const maxFlow = Math.max(node.value, sourceValue, targetValue);
                node.height = Math.max(minNodeHeight, maxFlow * nodeHeightScale);
                
                // Store calculation metadata
                node.layoutInfo.heightCalculation = {
                    nodeValue: node.value,
                    sourceValue,
                    targetValue,
                    maxFlow,
                    scale: nodeHeightScale,
                    finalHeight: node.height
                };
            });
        }

        // Position nodes horizontally across depths
        positionNodesHorizontally(nodes) {
            const depths = Array.from(this.nodesByDepth.keys()).sort((a, b) => a - b);
            const maxDepth = Math.max(...depths);
            
            // Calculate horizontal positioning
            const centeringOffset = this.config.get('layout.centeringOffset') || 0.08;
            const widthUsage = this.config.get('layout.widthUsage') || 0.82;
            
            const availableWidth = this.dimensions.width;
            const startX = availableWidth * centeringOffset;
            const usableWidth = availableWidth * widthUsage;
            
            // Create X scale
            const xScale = this.createLinearScale([0, maxDepth], [startX, startX + usableWidth]);
            
            // Position nodes
            nodes.forEach(node => {
                node.x = xScale(node.depth);
                node.layoutInfo.xCalculation = {
                    depth: node.depth,
                    scale: 'linear',
                    position: node.x,
                    availableWidth,
                    centeringOffset,
                    widthUsage
                };
            });
        }

        // Position nodes vertically within each depth
        positionNodesByDepth() {
            const depths = Array.from(this.nodesByDepth.keys()).sort((a, b) => a - b);
            const minDepth = Math.min(...depths);
            const maxDepth = Math.max(...depths);

            depths.forEach(depth => {
                const nodesAtDepth = this.nodesByDepth.get(depth);
                
                if (depth === minDepth) {
                    // Leftmost layer - source nodes
                    this.positionSourceNodesOptimized(nodesAtDepth, 'leftmost');
                } else if (depth === maxDepth) {
                    // Rightmost layer - sink nodes
                    this.positionChildNodesByParentOptimized(nodesAtDepth, 'rightmost');
                } else {
                    // Middle layers - intermediate nodes
                    this.positionChildNodesByParentOptimized(nodesAtDepth, 'middle');
                }
            });
        }

        // Optimized positioning for source nodes (leftmost layer)
        positionSourceNodesOptimized(nodes, layerType = 'leftmost') {
            const spacingMultiplier = this.config.get('spacing.leftmostSpacingMultiplier');
            const effectivePadding = this.config.get('layout.nodePadding') * spacingMultiplier;
            
            const totalHeight = nodes.reduce((sum, node) => sum + node.height, 0);
            const totalPadding = effectivePadding * (nodes.length - 1);
            const totalContentHeight = totalHeight + totalPadding;
            
            // Calculate starting Y position
            let startY;
            if (this.config.get('autoFeatures.autoMiddleAlign')) {
                // Center vertically in available space
                startY = Math.max(10, (this.dimensions.height - totalContentHeight) / 2);
            } else {
                // Traditional top-based positioning
                const labelSpace = 35;
                const availableHeight = this.dimensions.height - totalContentHeight - labelSpace;
                startY = Math.max(20, availableHeight / 3);
            }
            
            // Position each node
            let currentY = startY;
            nodes.forEach((node, index) => {
                node.y = currentY;
                node.layoutInfo.yCalculation = {
                    layer: layerType,
                    index,
                    spacing: effectivePadding,
                    method: 'source_optimized',
                    startY,
                    currentY
                };
                currentY += node.height + effectivePadding;
            });
        }

        // Optimized positioning for child nodes based on parent relationships
        positionChildNodesByParentOptimized(nodes, layerType = 'middle') {
            // Determine spacing multiplier based on layer type
            let spacingMultiplier;
            switch (layerType) {
                case 'rightmost':
                    spacingMultiplier = this.config.get('spacing.rightmostSpacingMultiplier');
                    break;
                case 'middle':
                    spacingMultiplier = this.config.get('spacing.middleSpacingMultiplier');
                    break;
                default:
                    spacingMultiplier = this.config.get('spacing.middleSpacingMultiplier');
            }
            
            // Group nodes by parent relationships
            const parentGroups = this.groupNodesByParents(nodes);
            const nodePadding = this.config.get('layout.nodePadding') * spacingMultiplier;
            
            // Calculate total content height
            let totalRequiredHeight = 0;
            parentGroups.forEach(group => {
                totalRequiredHeight += group.nodes.reduce((sum, node) => sum + node.height, 0);
                totalRequiredHeight += nodePadding * (group.nodes.length - 1);
            });
            
            const groupSpacing = Math.max(
                nodePadding * 0.8, 
                layerType === 'rightmost' ? 12 : 25
            );
            totalRequiredHeight += groupSpacing * (parentGroups.length - 1);
            
            // Calculate starting Y position
            let currentY;
            if (this.config.get('autoFeatures.autoMiddleAlign')) {
                const startY = (this.dimensions.height - totalRequiredHeight) / 2;
                currentY = Math.max(10, startY);
            } else {
                const labelSpace = 35;
                const availableHeight = this.dimensions.height - totalRequiredHeight - labelSpace;
                currentY = Math.max(20, availableHeight / 4);
            }
            
            // Position each group
            parentGroups.forEach((group, groupIndex) => {
                group.nodes.forEach((node, nodeIndex) => {
                    node.y = currentY;
                    node.layoutInfo.yCalculation = {
                        layer: layerType,
                        parentGroup: group.parentKey,
                        groupIndex,
                        nodeIndex,
                        spacing: nodePadding,
                        method: 'parent_optimized',
                        currentY
                    };
                    currentY += node.height;
                    
                    if (nodeIndex < group.nodes.length - 1) {
                        currentY += nodePadding;
                    }
                });
                
                if (groupIndex < parentGroups.length - 1) {
                    currentY += groupSpacing;
                }
            });
        }

        // Group nodes by their parent relationships
        groupNodesByParents(nodes) {
            const parentGroups = new Map();
            
            nodes.forEach(node => {
                // Get parent IDs from incoming links
                const parents = node.targetLinks ? 
                    node.targetLinks.map(link => link.source.id).sort() : [];
                const parentKey = parents.join(',') || 'orphan';
                
                if (!parentGroups.has(parentKey)) {
                    parentGroups.set(parentKey, {
                        parentKey,
                        parentIds: parents,
                        nodes: []
                    });
                }
                parentGroups.get(parentKey).nodes.push(node);
            });
            
            // Sort nodes within each parent group
            parentGroups.forEach(group => {
                group.nodes.sort((a, b) => {
                    if (a.customOrder !== undefined && b.customOrder !== undefined) {
                        return a.customOrder - b.customOrder;
                    }
                    if (a.customOrder !== undefined) return -1;
                    if (b.customOrder !== undefined) return 1;
                    if (a.parentOrder !== undefined && b.parentOrder !== undefined) {
                        return a.parentOrder - b.parentOrder;
                    }
                    if (a.parentOrder !== undefined) return -1;
                    if (b.parentOrder !== undefined) return 1;
                    return b.value - a.value;
                });
            });
            
            return Array.from(parentGroups.values());
        }

        // Calculate positions and paths for all links
        calculateLinkPositions(links) {
            const linkWidthScale = this.config.get('visual.linkWidthScale');
            
            // Calculate link widths
            links.forEach(link => {
                link.width = link.value * linkWidthScale;
            });
            
            // Calculate source positions (outgoing from nodes)
            this.calculateSourceLinkPositions(links);
            
            // Calculate target positions (incoming to nodes)
            this.calculateTargetLinkPositions(links);
            
            // Generate smooth paths with layer-specific curvature
            this.generateLinkPaths(links);
        }

        // Calculate source link positions (outgoing)
        calculateSourceLinkPositions(links) {
            // Group links by source node
            const linksBySource = new Map();
            links.forEach(link => {
                const sourceId = link.source.id;
                if (!linksBySource.has(sourceId)) {
                    linksBySource.set(sourceId, []);
                }
                linksBySource.get(sourceId).push(link);
            });
            
            // Calculate positions for each source node
            linksBySource.forEach((nodeLinks, sourceId) => {
                const sourceNode = nodeLinks[0].source;
                
                // Sort links by target position for better visual flow
                nodeLinks.sort((a, b) => a.target.y - b.target.y);
                
                // Calculate proportional distribution
                const totalOutflow = nodeLinks.reduce((sum, link) => sum + link.value, 0);
                const scaleFactorOut = totalOutflow > 0 ? 
                    sourceNode.height / (totalOutflow * this.config.get('visual.linkWidthScale')) : 1;
                
                let currentY = sourceNode.y;
                nodeLinks.forEach(link => {
                    link.sourceY = currentY;
                    const linkHeight = link.value * this.config.get('visual.linkWidthScale') * scaleFactorOut;
                    link.sourceHeight = linkHeight;
                    currentY += linkHeight;
                    
                    // Store calculation metadata
                    link.layoutInfo.sourceCalculation = {
                        totalOutflow,
                        scaleFactor: scaleFactorOut,
                        linkHeight,
                        position: link.sourceY
                    };
                });
            });
        }

        // Calculate target link positions (incoming)
        calculateTargetLinkPositions(links) {
            // Group links by target node
            const linksByTarget = new Map();
            links.forEach(link => {
                const targetId = link.target.id;
                if (!linksByTarget.has(targetId)) {
                    linksByTarget.set(targetId, []);
                }
                linksByTarget.get(targetId).push(link);
            });
            
            // Calculate positions for each target node
            linksByTarget.forEach((nodeLinks, targetId) => {
                const targetNode = nodeLinks[0].target;
                
                // Sort links by source position
                nodeLinks.sort((a, b) => a.source.y - b.source.y);
                
                // Calculate proportional distribution
                const totalInflow = nodeLinks.reduce((sum, link) => sum + link.value, 0);
                const scaleFactorIn = totalInflow > 0 ? 
                    targetNode.height / (totalInflow * this.config.get('visual.linkWidthScale')) : 1;
                
                let currentY = targetNode.y;
                nodeLinks.forEach(link => {
                    link.targetY = currentY;
                    const linkHeight = link.value * this.config.get('visual.linkWidthScale') * scaleFactorIn;
                    link.targetHeight = linkHeight;
                    currentY += linkHeight;
                    
                    // Store calculation metadata
                    link.layoutInfo.targetCalculation = {
                        totalInflow,
                        scaleFactor: scaleFactorIn,
                        linkHeight,
                        position: link.targetY
                    };
                });
            });
        }

        // Generate smooth bezier paths for links
        generateLinkPaths(links) {
            links.forEach(link => {
                // Determine curvature based on source node depth
                const sourceDepth = link.source.depth;
                const layerCurvature = this.config.get('curvature.layerCurvature');
                const curvature = layerCurvature[sourceDepth] || this.config.get('curvature.curveIntensity');
                
                link.path = this.createSmoothPath(link, curvature);
                
                // Store path calculation metadata
                link.layoutInfo.pathCalculation = {
                    sourceDepth,
                    curvature,
                    method: 'bezier'
                };
            });
        }

        // Create smooth bezier path for a single link
        createSmoothPath(link, curvature = 0.4) {
            const sourceX = link.source.x + this.config.get('layout.nodeWidth');
            const targetX = link.target.x;
            const sourceY0 = link.sourceY;
            const sourceY1 = link.sourceY + (link.sourceHeight || link.width);
            const targetY0 = link.targetY;
            const targetY1 = link.targetY + (link.targetHeight || link.width);
            
            // Calculate control points for smooth bezier curve
            const controlX1 = sourceX + (targetX - sourceX) * curvature;
            const controlX2 = targetX - (targetX - sourceX) * curvature;
            
            return `M${sourceX},${sourceY0}
                    C${controlX1},${sourceY0} ${controlX2},${targetY0} ${targetX},${targetY0}
                    L${targetX},${targetY1}
                    C${controlX2},${targetY1} ${controlX1},${sourceY1} ${sourceX},${sourceY1}
                    Z`;
        }

        // Apply automatic optimizations
        applyAutoOptimizations(nodes, links) {
            if (this.config.get('autoFeatures.dynamicSpaceFill')) {
                this.optimizeCanvasForContent(nodes);
            }
            
            if (this.config.get('autoFeatures.autoCenter')) {
                this.autoOptimizeHorizontalCentering(nodes);
            }
            
            // Note: autoMiddleAlign is handled in positioning methods
        }

        // Optimize canvas size for content
        optimizeCanvasForContent(nodes) {
            if (!nodes.length) return;
            
            // Calculate actual content bounds
            const bounds = this.calculateContentBounds(nodes);
            const contentWidth = bounds.maxX - bounds.minX + 100; // Add padding
            const contentHeight = bounds.maxY - bounds.minY + 100;
            
            // Check if significant adjustment is needed
            const currentWidth = this.dimensions.width + this.config.get('layout.nodeWidth');
            const currentHeight = this.dimensions.height;
            
            if (Math.abs(contentWidth - currentWidth) > 100 || 
                Math.abs(contentHeight - currentHeight) > 50) {
                
                console.log(`Canvas optimization: content ${contentWidth}x${contentHeight} vs current ${currentWidth}x${currentHeight}`);
                
                // Note: Actual canvas resizing would be handled by the main chart
                // This method calculates and suggests optimal dimensions
                return {
                    suggested: true,
                    newWidth: Math.max(currentWidth, contentWidth + 100),
                    newHeight: Math.max(currentHeight, contentHeight + 100),
                    reason: 'content_driven'
                };
            }
            
            return { suggested: false };
        }

        // Auto-optimize horizontal centering
        autoOptimizeHorizontalCentering(nodes) {
            if (!nodes.length) return;
            
            const bounds = this.calculateContentBounds(nodes);
            const contentCenterX = (bounds.minX + bounds.maxX) / 2;
            const targetCenterX = this.dimensions.width / 2;
            const offset = targetCenterX - contentCenterX;
            
            if (Math.abs(offset) > 20) {
                console.log(`Auto-centering: offset ${offset}px detected`);
                
                // Calculate new centering parameters
                const newOffset = Math.max(0.02, Math.min(0.15, 
                    (this.config.get('layout.centeringOffset') + (offset / this.dimensions.width))));
                
                return {
                    adjusted: true,
                    newCenteringOffset: newOffset,
                    offset: offset
                };
            }
            
            return { adjusted: false };
        }

        // Calculate content bounds
        calculateContentBounds(nodes) {
            if (!nodes.length) {
                return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
            }
            
            const positions = nodes.map(node => ({
                x: node.x,
                y: node.y,
                width: node.width,
                height: node.height
            }));
            
            return {
                minX: Math.min(...positions.map(p => p.x)),
                maxX: Math.max(...positions.map(p => p.x + p.width)),
                minY: Math.min(...positions.map(p => p.y)),
                maxY: Math.max(...positions.map(p => p.y + p.height))
            };
        }

        // Utility: Create linear scale function
        createLinearScale(domain, range) {
            const [d0, d1] = domain;
            const [r0, r1] = range;
            const scale = (r1 - r0) / (d1 - d0);
            
            return function(value) {
                return r0 + (value - d0) * scale;
            };
        }

        // Get optimal node spacing for a given available height
        optimizeNodeSpacing(nodes, availableHeight) {
            const totalNodeHeight = nodes.reduce((sum, node) => sum + node.height, 0);
            const remainingHeight = availableHeight - totalNodeHeight;
            const optimalSpacing = nodes.length > 1 ? remainingHeight / (nodes.length + 1) : 0;
            
            return Math.max(10, Math.min(optimalSpacing, this.config.get('layout.nodePadding') * 2));
        }

        // Calculate optimal canvas size based on content
        getOptimalCanvasSize(contentBounds) {
            const padding = 100;
            const optimalWidth = (contentBounds.maxX - contentBounds.minX) + padding * 2;
            const optimalHeight = (contentBounds.maxY - contentBounds.minY) + padding * 2;
            
            return {
                width: Math.max(800, optimalWidth),
                height: Math.max(500, optimalHeight),
                utilization: this.calculateUtilization(contentBounds, optimalWidth, optimalHeight)
            };
        }

        // Calculate layout utilization metrics
        calculateUtilization(contentBounds, canvasWidth, canvasHeight) {
            const contentArea = (contentBounds.maxX - contentBounds.minX) * 
                              (contentBounds.maxY - contentBounds.minY);
            const canvasArea = canvasWidth * canvasHeight;
            
            return {
                contentArea,
                canvasArea,
                utilization: (contentArea / canvasArea) * 100,
                efficiency: contentArea > 0 ? Math.min(100, (contentArea / canvasArea) * 100) : 0
            };
        }

        // Debug and analysis methods
        getLayoutAnalysis() {
            return {
                dimensions: this.dimensions,
                nodesByDepth: Object.fromEntries(
                    Array.from(this.nodesByDepth.entries()).map(([depth, nodes]) => [
                        depth, 
                        {
                            count: nodes.length,
                            totalHeight: nodes.reduce((sum, n) => sum + n.height, 0),
                            avgHeight: nodes.reduce((sum, n) => sum + n.height, 0) / nodes.length
                        }
                    ])
                ),
                config: {
                    nodeHeightScale: this.config.get('visual.nodeHeightScale'),
                    linkWidthScale: this.config.get('visual.linkWidthScale'),
                    autoFeatures: this.config.get('autoFeatures')
                }
            };
        }

        // Reset layout cache
        clearCache() {
            this.layoutCache.clear();
        }
    }

    // Export the layout class
    window.SankeyLayout = SankeyLayout;

})();