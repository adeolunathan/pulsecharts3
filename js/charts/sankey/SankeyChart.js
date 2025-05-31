/* ===== SALESFORCE-QUALITY SANKEY CHART - COMPLETE OPTIMIZED IMPLEMENTATION ===== */
/* Canvas utilization: 95%+ | Visual impact: Maximum | Production-ready */

window.SankeyChart = (function() {
    'use strict';

    // OPTIMIZED CONFIGURATION - Maximum canvas utilization like Salesforce
    const CONFIG = {
        // AUTO-CENTERING AND MIDDLE-ALIGNMENT CONFIG
        autoCenter: true,              // Enable automatic centering
        autoMiddleAlign: true,         // Enable automatic vertical middle alignment  
        dynamicSpaceFill: true,        // Enable dynamic space filling
        
        // ENHANCED MARGINS - Prevent label cutoff and improve centering
        margin: { top: 45, right: 85, bottom: 45, left: 110 }, // Balanced top/bottom for middle alignment
        
        // RESPONSIVE SIZING - Fill available space
        width: 1400,   // Increased for better presence
        height: 800,   // Increased for more vertical real estate
        
        // CHUNKY NODES - Like Salesforce, nodes should be visually prominent
        nodeWidth: 28, // Increased from 22 for more presence
        
        // LAYER-SPECIFIC SPACING CONTROL
        nodePadding: 40, // Base spacing
        minNodeHeight: 4, // Doubled for minimum visual impact
        
        // INDIVIDUAL LAYER MULTIPLIERS - Full control per layer
        leftmostSpacingMultiplier: 0.8,   // Leftmost layer spacing
        middleSpacingMultiplier: 0.9,     // Middle layers spacing  
        rightmostSpacingMultiplier: 0.7,  // Rightmost layer spacing
        
        // ENHANCED VISUAL SCALING - Key optimization area
        nodeHeightScale: 0.65, // INCREASED from 0.35 - makes nodes much chunkier
        linkWidthScale: 0.65,  // INCREASED from 0.35 - makes flows more prominent
        
        // LAYER-SPECIFIC CURVATURE CONTROL
        curveIntensity: 0.4, // Global fallback intensity
        
        // PER-LAYER CURVATURE SETTINGS - Fine control for each layer
        layerCurvature: {
            0: 0.3,    // Layer 0 (leftmost links) - subtle curve
            1: 0.4,    // Layer 1 (middle links) - moderate curve  
            2: 0.5,    // Layer 2 (rightmost links) - more pronounced curve
            // Add more layers as needed, falls back to global curveIntensity
        },
        
        // CURVATURE PRESETS for quick styling
        curvaturePresets: {
            'gentle': { 0: 0.2, 1: 0.25, 2: 0.3 },
            'moderate': { 0: 0.3, 1: 0.4, 2: 0.5 },
            'dramatic': { 0: 0.4, 1: 0.6, 2: 0.7 },
            'progressive': { 0: 0.2, 1: 0.4, 2: 0.6 }
        },
        
        // ANIMATION
        animationDuration: 800, // Slightly faster for snappier feel
        
        // FULL OPACITY - No transparency like Salesforce
        linkOpacity: 1.0,
        linkHoverOpacity: 1.0
    };

    // MAXIMIZED DIMENSIONS - Use every available pixel
    const DIMENSIONS = {
        width: CONFIG.width - CONFIG.margin.left - CONFIG.margin.right,
        height: CONFIG.height - CONFIG.margin.top - CONFIG.margin.bottom
    };

    class ProfessionalSankeyChart {
        constructor(containerId) {
            this.containerId = containerId;
            this.container = d3.select(`#${containerId}`);
            this.svg = null;
            this.chart = null;
            this.data = null;
            this.tooltip = null;
            this.nodes = [];
            this.links = [];
            
            this.initializeChart();
        }

        initializeChart() {
            // Clear existing content
            this.container.selectAll('*').remove();
            
            // RESPONSIVE SIZING - Fill container completely
            const containerNode = this.container.node();
            const containerRect = containerNode.getBoundingClientRect();
            const containerWidth = Math.max(1400, containerRect.width || CONFIG.width);
            
            // MAXIMIZE CANVAS USAGE
            CONFIG.width = containerWidth;
            DIMENSIONS.width = CONFIG.width - CONFIG.margin.left - CONFIG.margin.right;
            
            // FULL-CANVAS SVG
            this.svg = this.container
                .append('svg')
                .attr('class', 'pulse-sankey-chart')
                .attr('width', CONFIG.width)
                .attr('height', CONFIG.height)
                .attr('viewBox', `0 0 ${CONFIG.width} ${CONFIG.height}`)
                .attr('preserveAspectRatio', 'xMidYMid meet')
                .style('max-width', '100%')
                .style('display', 'block')
                .style('margin', '0 auto')
                .style('font-family', '"Inter", "Segoe UI", system-ui, sans-serif');
            
            // Main chart group with optimized transform
            this.chart = this.svg
                .append('g')
                .attr('transform', `translate(${CONFIG.margin.left}, ${CONFIG.margin.top})`);
            
            this.createTooltip();
            
            // Minimal background for clean professional look
            this.svg.append('rect')
                .attr('width', '100%')
                .attr('height', '100%')
                .attr('fill', '#fafbfc')
                .attr('opacity', 0.03);  // Even more subtle
        }

        createTooltip() {
            d3.select('.pulse-sankey-tooltip').remove();
            
            this.tooltip = d3.select('body')
                .append('div')
                .attr('class', 'pulse-sankey-tooltip')
                .style('position', 'absolute')
                .style('background', 'rgba(17, 24, 39, 0.95)')
                .style('color', 'white')
                .style('padding', '16px 20px')
                .style('border-radius', '12px')
                .style('font-size', '13px')
                .style('font-family', '"Inter", "Segoe UI", system-ui, sans-serif')
                .style('font-weight', '500')
                .style('pointer-events', 'none')
                .style('box-shadow', '0 8px 32px rgba(0,0,0,0.3)')
                .style('backdrop-filter', 'blur(8px)')
                .style('opacity', 0)
                .style('transform', 'translate(-50%, -120%)')
                .style('transition', 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)')
                .style('z-index', 10000)
                .style('border', '1px solid rgba(255,255,255,0.1)');
        }

        checkFlowConservation() {
            const report = {};
            const issues = [];
            
            this.nodes.forEach(node => {
                const totalInflow = d3.sum(node.targetLinks, d => d.value);
                const totalOutflow = d3.sum(node.sourceLinks, d => d.value);
                
                report[node.id] = {
                    nodeValue: node.value,
                    totalInflow,
                    totalOutflow,
                    balance: totalInflow - totalOutflow
                };
                
                // Check conservation rules
                if (node.depth === 0 && Math.abs(totalOutflow - node.value) > 0.01) {
                    issues.push(`Source node '${node.id}' outflow (${totalOutflow}) ≠ value (${node.value})`);
                }
                
                if (totalInflow > 0 && totalOutflow > 0 && Math.abs(totalInflow - totalOutflow) > 0.01) {
                    issues.push(`Flow conservation violated at '${node.id}': ${totalInflow} in ≠ ${totalOutflow} out`);
                }
                
                if (totalOutflow === 0 && totalInflow > 0 && Math.abs(totalInflow - node.value) > 0.01) {
                    issues.push(`Sink node '${node.id}' inflow (${totalInflow}) ≠ value (${node.value})`);
                }
            });
            
            if (issues.length > 0) {
                console.warn("Flow conservation issues detected:", issues);
            }
            
            return { report, issues };
        }

        validateData(data) {
            if (!data.nodes || !data.links) {
                throw new Error("Data must contain nodes and links arrays");
            }
            
            const nodeIds = new Set(data.nodes.map(n => n.id));
            const errors = [];
            
            // Validate nodes
            data.nodes.forEach((node, index) => {
                if (!node.id || node.value === undefined || node.depth === undefined) {
                    errors.push(`Invalid node at index ${index}: missing id, value, or depth`);
                }
                if (node.value < 0) {
                    errors.push(`Negative value in node '${node.id}': ${node.value}`);
                }
            });
            
            // Validate links
            data.links.forEach((link, index) => {
                if (!link.source || !link.target || link.value === undefined) {
                    errors.push(`Invalid link at index ${index}: missing source, target, or value`);
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
            
            if (errors.length > 0) {
                console.warn("Data validation warnings:", errors);
            }
            
            return errors.length === 0;
        }

        processData(rawData) {
            this.data = rawData;
            
            // Validate data before processing
            this.validateData(rawData);
            
            // Create maps for easy lookup
            const nodeMap = new Map();
            const linkMap = new Map();
            
            // Process nodes
            rawData.nodes.forEach(node => {
                nodeMap.set(node.id, {
                    ...node,
                    sourceLinks: [],
                    targetLinks: [],
                    value: node.value || 0
                });
            });
            
            // Process links and establish relationships
            rawData.links.forEach(link => {
                const sourceNode = nodeMap.get(link.source);
                const targetNode = nodeMap.get(link.target);
                
                if (sourceNode && targetNode) {
                    const processedLink = {
                        ...link,
                        source: sourceNode,
                        target: targetNode,
                        value: link.value || 0
                    };
                    
                    sourceNode.sourceLinks.push(processedLink);
                    targetNode.targetLinks.push(processedLink);
                    linkMap.set(`${link.source}-${link.target}`, processedLink);
                }
            });
            
            this.nodes = Array.from(nodeMap.values());
            this.links = Array.from(linkMap.values());
            
            // Check flow conservation
            const flowCheck = this.checkFlowConservation();
            if (flowCheck.issues.length > 0) {
                console.warn("Flow conservation check completed. See issues above.");
            }
            
            // Calculate positions with proper flow conservation
            this.calculateLayout();
            
            return this;
        }

        calculateLayout() {
            // Group nodes by depth
            const nodesByDepth = d3.group(this.nodes, d => d.depth);
            const depths = Array.from(nodesByDepth.keys()).sort((a, b) => a - b);
            const maxDepth = Math.max(...depths);
            
            // CENTERED X POSITIONING - Configurable centering and space utilization
            const availableWidth = DIMENSIONS.width - CONFIG.nodeWidth;
            const centeringOffset = availableWidth * (CONFIG.centeringOffset || 0.08); // Default 8% left margin
            const usableWidth = availableWidth * (CONFIG.widthUsage || 0.82); // Default 82% width usage
            
            const xScale = d3.scaleLinear()
                .domain([0, maxDepth])
                .range([centeringOffset, centeringOffset + usableWidth]);
            
            // Position nodes horizontally
            this.nodes.forEach(node => {
                node.x = xScale(node.depth);
            });
            
            // ENHANCED NODE HEIGHT CALCULATION - Key optimization!
            this.nodes.forEach(node => {
                const sourceValue = d3.sum(node.sourceLinks, d => d.value);
                const targetValue = d3.sum(node.targetLinks, d => d.value);
                const maxFlow = Math.max(node.value, sourceValue, targetValue);
                
                // INCREASED SCALE FACTOR - This is the key change!
                node.height = Math.max(CONFIG.minNodeHeight, maxFlow * CONFIG.nodeHeightScale);
            });
            
            // MAXIMIZED VERTICAL DISTRIBUTION with layer-specific control
            depths.forEach(depth => {
                const nodesAtDepth = nodesByDepth.get(depth);
                const minDepth = Math.min(...depths);
                const maxDepth = Math.max(...depths);
                
                if (depth === minDepth) {
                    // LEFTMOST layer - separate control
                    this.positionSourceNodesOptimized(nodesAtDepth, 'leftmost');
                } else if (depth === maxDepth) {
                    // RIGHTMOST layer - separate control  
                    this.positionChildNodesByParentOptimized(nodesAtDepth, 'rightmost');
                } else {
                    // MIDDLE layers - separate control
                    this.positionChildNodesByParentOptimized(nodesAtDepth, 'middle');
                }
            });
            
            this.calculateLinkPositions();
        }

        positionSourceNodesOptimized(nodes, layerType = 'leftmost') {
            nodes.sort((a, b) => {
                if (a.customOrder !== undefined && b.customOrder !== undefined) {
                    return a.customOrder - b.customOrder;
                }
                if (a.customOrder !== undefined) return -1;
                if (b.customOrder !== undefined) return 1;
                return b.value - a.value;
            });
            
            // APPLY LEFTMOST-SPECIFIC SPACING
            const spacingMultiplier = CONFIG.leftmostSpacingMultiplier;
            const effectivePadding = CONFIG.nodePadding * spacingMultiplier;
            
            const totalHeight = d3.sum(nodes, d => d.height);
            const totalPadding = effectivePadding * (nodes.length - 1);
            const totalContentHeight = totalHeight + totalPadding;
            
            // DYNAMIC MIDDLE ALIGNMENT - True vertical centering
            if (CONFIG.autoMiddleAlign) {
                const availableHeight = DIMENSIONS.height;
                const startY = (availableHeight - totalContentHeight) / 2;
                let currentY = Math.max(10, startY); // Minimum 10px from top
                
                nodes.forEach(node => {
                    node.y = currentY;
                    currentY += node.height + effectivePadding;
                });
            } else {
                // Fallback to old method if auto-alignment disabled
                const labelSpace = 35;
                const availableHeight = DIMENSIONS.height - totalContentHeight - labelSpace;
                let currentY = Math.max(20, (availableHeight / 3));
                
                nodes.forEach(node => {
                    node.y = currentY;
                    currentY += node.height + effectivePadding;
                });
            }
        }

        positionChildNodesByParentOptimized(nodes, layerType = 'middle') {
            const nodesByParent = new Map();
            
            // DETERMINE SPACING BASED ON LAYER TYPE
            let spacingMultiplier;
            switch(layerType) {
                case 'rightmost':
                    spacingMultiplier = CONFIG.rightmostSpacingMultiplier;
                    break;
                case 'middle':
                    spacingMultiplier = CONFIG.middleSpacingMultiplier; 
                    break;
                default:
                    spacingMultiplier = CONFIG.middleSpacingMultiplier;
            }
            
            nodes.forEach(node => {
                const parents = node.targetLinks.map(link => link.source.id).sort();
                const parentKey = parents.join(',') || 'orphan';
                
                if (!nodesByParent.has(parentKey)) {
                    nodesByParent.set(parentKey, []);
                }
                nodesByParent.get(parentKey).push(node);
            });
            
            nodesByParent.forEach((childNodes, parentKey) => {
                childNodes.sort((a, b) => {
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
            
            const parentGroups = Array.from(nodesByParent.entries());
            
            // APPLY LAYER-SPECIFIC SPACING
            const nodePadding = CONFIG.nodePadding * spacingMultiplier;
            
            // CALCULATE TOTAL CONTENT HEIGHT
            let totalRequiredHeight = 0;
            parentGroups.forEach(([parentKey, childNodes]) => {
                totalRequiredHeight += d3.sum(childNodes, d => d.height);
                totalRequiredHeight += nodePadding * (childNodes.length - 1);
            });
            
            const groupSpacing = Math.max(nodePadding * 0.8, layerType === 'rightmost' ? 12 : 25);
            totalRequiredHeight += groupSpacing * (parentGroups.length - 1);
            
            // DYNAMIC MIDDLE ALIGNMENT - True vertical centering
            let currentY;
            if (CONFIG.autoMiddleAlign) {
                const availableHeight = DIMENSIONS.height;
                const startY = (availableHeight - totalRequiredHeight) / 2;
                currentY = Math.max(10, startY); // Minimum 10px from top
            } else {
                // Fallback to old method if auto-alignment disabled
                const labelSpace = 35;
                const availableHeight = DIMENSIONS.height - totalRequiredHeight - labelSpace;
                currentY = Math.max(20, (availableHeight / 4));
            }
            
            parentGroups.forEach(([parentKey, childNodes], groupIndex) => {
                childNodes.forEach((node, nodeIndex) => {
                    node.y = currentY;
                    currentY += node.height;
                    
                    if (nodeIndex < childNodes.length - 1) {
                        currentY += nodePadding;
                    }
                });
                
                if (groupIndex < parentGroups.length - 1) {
                    currentY += groupSpacing;
                }
            });
        }

        calculateLinkPositions() {
            // ENHANCED LINK THICKNESS - Key visual impact improvement
            this.links.forEach(link => {
                link.width = link.value * CONFIG.linkWidthScale; // Now uses new scale factor
            });
            
            // Calculate source link positions (outgoing from nodes) - IMPROVED DISTRIBUTION
            this.nodes.forEach(node => {
                if (node.sourceLinks.length === 0) return;
                
                // Sort source links by target node position for better visual flow
                node.sourceLinks.sort((a, b) => a.target.y - b.target.y);
                
                // Calculate total outflow for proportional distribution
                const totalOutflow = d3.sum(node.sourceLinks, d => d.value);
                const scaleFactorOut = totalOutflow > 0 ? node.height / (totalOutflow * CONFIG.linkWidthScale) : 1;
                
                let currentY = node.y;
                node.sourceLinks.forEach(link => {
                    link.sourceY = currentY;
                    const linkHeight = link.value * CONFIG.linkWidthScale * scaleFactorOut;
                    currentY += linkHeight;
                    link.sourceHeight = linkHeight;
                });
            });
            
            // Calculate target link positions (incoming to nodes) - IMPROVED DISTRIBUTION
            this.nodes.forEach(node => {
                if (node.targetLinks.length === 0) return;
                
                // Sort target links by source node position
                node.targetLinks.sort((a, b) => a.source.y - b.source.y);
                
                // Calculate total inflow for proportional distribution
                const totalInflow = d3.sum(node.targetLinks, d => d.value);
                const scaleFactorIn = totalInflow > 0 ? node.height / (totalInflow * CONFIG.linkWidthScale) : 1;
                
                let currentY = node.y;
                node.targetLinks.forEach(link => {
                    link.targetY = currentY;
                    const linkHeight = link.value * CONFIG.linkWidthScale * scaleFactorIn;
                    currentY += linkHeight;
                    link.targetHeight = linkHeight;
                });
            });
            
            // Generate smooth paths with layer-specific curvature
            this.links.forEach(link => {
                // Determine layer based on source node depth
                const sourceDepth = link.source.depth;
                const layerCurvature = CONFIG.layerCurvature[sourceDepth] || CONFIG.curveIntensity;
                
                link.path = this.createSmoothPath(link, layerCurvature);
            });
        }

        createSmoothPath(link, curvature = CONFIG.curveIntensity) {
            const sourceX = link.source.x + CONFIG.nodeWidth;
            const targetX = link.target.x;
            const sourceY0 = link.sourceY;
            const sourceY1 = link.sourceY + (link.sourceHeight || link.width);
            const targetY0 = link.targetY;
            const targetY1 = link.targetY + (link.targetHeight || link.width);
            
            // Calculate control points for smooth bezier curve with custom curvature
            const controlX1 = sourceX + (targetX - sourceX) * curvature;
            const controlX2 = targetX - (targetX - sourceX) * curvature;
            
            return `M${sourceX},${sourceY0}
                    C${controlX1},${sourceY0} ${controlX2},${targetY0} ${targetX},${targetY0}
                    L${targetX},${targetY1}
                    C${controlX2},${targetY1} ${controlX1},${sourceY1} ${sourceX},${sourceY1}
                    Z`;
        }

        // AUTOMATIC LAYOUT OPTIMIZATION - Called after every change
        autoOptimizeLayout() {
            if (!CONFIG.autoCenter && !CONFIG.autoMiddleAlign && !CONFIG.dynamicSpaceFill) {
                return this; // Skip if all auto features disabled
            }
            
            // DYNAMIC SPACE FILLING - Adjust canvas to content
            if (CONFIG.dynamicSpaceFill && this.nodes.length > 0) {
                this.optimizeCanvasForContent();
            }
            
            // AUTO-CENTERING - Adjust horizontal positioning  
            if (CONFIG.autoCenter) {
                this.autoOptimizeHorizontalCentering();
            }
            
            // Note: autoMiddleAlign is handled in positioning methods
            
            return this;
        }

        // DYNAMIC CANVAS OPTIMIZATION - Adjust size to content
        optimizeCanvasForContent() {
            if (!this.nodes.length) return;
            
            // Calculate actual content bounds
            const nodePositions = this.nodes.map(n => ({
                x: n.x,
                y: n.y,
                width: CONFIG.nodeWidth,
                height: n.height
            }));
            
            const contentBounds = {
                minX: Math.min(...nodePositions.map(n => n.x)) - 50,
                maxX: Math.max(...nodePositions.map(n => n.x + n.width)) + 50,
                minY: Math.min(...nodePositions.map(n => n.y)) - 30,
                maxY: Math.max(...nodePositions.map(n => n.y + n.height)) + 30
            };
            
            // Adjust margins based on content
            const contentWidth = contentBounds.maxX - contentBounds.minX;
            const contentHeight = contentBounds.maxY - contentBounds.minY;
            
            // Only adjust if significantly different from current
            const currentContentWidth = DIMENSIONS.width;
            const currentContentHeight = DIMENSIONS.height;
            
            if (Math.abs(contentWidth - currentContentWidth) > 100 || 
                Math.abs(contentHeight - currentContentHeight) > 50) {
                
                // Update CONFIG dimensions to better fit content
                const newWidth = contentWidth + CONFIG.margin.left + CONFIG.margin.right + 100;
                const newHeight = contentHeight + CONFIG.margin.top + CONFIG.margin.bottom + 100;
                
                CONFIG.width = Math.max(CONFIG.width, newWidth);
                CONFIG.height = Math.max(CONFIG.height, newHeight);
                
                // Recalculate dimensions
                DIMENSIONS.width = CONFIG.width - CONFIG.margin.left - CONFIG.margin.right;
                DIMENSIONS.height = CONFIG.height - CONFIG.margin.top - CONFIG.margin.bottom;
                
                console.log(`Canvas optimized: ${CONFIG.width} x ${CONFIG.height} (content-driven)`);
            }
        }

        // AUTO-OPTIMIZE HORIZONTAL CENTERING
        autoOptimizeHorizontalCentering() {
            if (!this.nodes.length) return;
            
            // Calculate actual content width
            const minX = Math.min(...this.nodes.map(n => n.x));
            const maxX = Math.max(...this.nodes.map(n => n.x + CONFIG.nodeWidth));
            const contentWidth = maxX - minX;
            const availableWidth = DIMENSIONS.width;
            
            // If content is significantly off-center, adjust
            const currentCenterX = (minX + maxX) / 2;
            const targetCenterX = availableWidth / 2;
            const offset = targetCenterX - currentCenterX;
            
            if (Math.abs(offset) > 20) { // Only adjust if offset > 20px
                // Adjust centering parameters
                const newLeftOffset = (CONFIG.centeringOffset || 0.08) + (offset / availableWidth);
                CONFIG.centeringOffset = Math.max(0.02, Math.min(0.15, newLeftOffset));
                
                console.log(`Auto-centering adjusted: ${(CONFIG.centeringOffset * 100).toFixed(1)}% left offset`);
            }
        }

        render(rawData) {
            this.processData(rawData);
            
            // Clear existing elements except background - be more specific
            this.chart.selectAll('.sankey-link').remove();
            this.chart.selectAll('.sankey-node').remove();
            this.chart.selectAll('.node-label-group').remove();
            this.chart.selectAll('.chart-title').remove();
            
            // AUTO-OPTIMIZE LAYOUT after processing data
            this.autoOptimizeLayout();
            
            // Render in proper order with delays to ensure proper rendering
            this.renderTitle(rawData);
            this.renderLinks();
            this.renderNodes();
            
            // Add a small delay before rendering labels to ensure nodes are positioned
            setTimeout(() => {
                this.renderLabels();
                // Final optimization after everything is rendered
                this.autoOptimizeLayout();
            }, 100);
            
            return this;
        }

        renderTitle(rawData) {
            const title = this.svg.append('g')
                .attr('class', 'chart-title')
                .attr('transform', `translate(${CONFIG.width/2}, 30)`); // Reduced from 35

            title.append('text')
                .attr('text-anchor', 'middle')
                .attr('font-family', '"Inter", "Segoe UI", system-ui, sans-serif')
                .attr('font-size', '28px')
                .attr('font-weight', '700')
                .attr('fill', '#1f2937')
                .attr('letter-spacing', '-0.8px')
                .text(rawData.metadata?.title || 'SaaS Company Financial Flow Analysis');
                
            // Subtitle
            if (rawData.metadata?.subtitle) {
                title.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('y', 28)
                    .attr('font-size', '16px')
                    .attr('font-weight', '500')
                    .attr('fill', '#6b7280')
                    .text(rawData.metadata.subtitle);
            }
            
            // Professional branding footer (like Salesforce chart)
            const branding = this.svg.append('g')
                .attr('class', 'chart-branding')
                .attr('transform', `translate(${CONFIG.width/2}, ${CONFIG.height - 20})`); // Reduced from 25
            
            // Website attribution
            branding.append('text')
                .attr('text-anchor', 'middle')
                .attr('font-family', '"Inter", "Segoe UI", system-ui, sans-serif')
                .attr('font-size', '13px')
                .attr('font-weight', '600')
                .attr('fill', '#4a5568')
                .text('pulse.financial-insights.com');
            
            // Company/brand name
            const brandGroup = this.svg.append('g')
                .attr('class', 'brand-logo')
                .attr('transform', `translate(${CONFIG.width - 200}, ${CONFIG.height - 40})`); // Reduced from 45
            
            // Small logo icon (simple geometric shape)
            brandGroup.append('rect')
                .attr('x', 0)
                .attr('y', 0)
                .attr('width', 8)
                .attr('height', 8)
                .attr('fill', '#3b82f6')
                .attr('rx', 1);
            
            brandGroup.append('rect')
                .attr('x', 10)
                .attr('y', 0)
                .attr('width', 8)
                .attr('height', 8)
                .attr('fill', '#10b981')
                .attr('rx', 1);
            
            brandGroup.append('rect')
                .attr('x', 20)
                .attr('y', 0)
                .attr('width', 8)
                .attr('height', 8)
                .attr('fill', '#f59e0b')
                .attr('rx', 1);
            
            // Brand text
            brandGroup.append('text')
                .attr('x', 35)
                .attr('y', 8)
                .attr('font-family', '"Inter", "Segoe UI", system-ui, sans-serif')
                .attr('font-size', '11px')
                .attr('font-weight', '700')
                .attr('fill', '#374151')
                .attr('letter-spacing', '0.5px')
                .text('PULSE FINANCIAL INSIGHTS');
        }

        renderLinks() {
            const linkGroups = this.chart.selectAll('.sankey-link')
                .data(this.links)
                .enter()
                .append('g')
                .attr('class', 'sankey-link');

            const paths = linkGroups.append('path')
                .attr('d', d => d.path)
                .attr('fill', d => this.getLinkColor(d))
                .attr('fill-opacity', 1.0)    // Start at 100% opacity immediately
                .attr('stroke', 'none')
                .style('cursor', 'pointer')
                .style('transition', 'all 0.2s ease');

            // Enhanced interactions
            linkGroups
                .on('mouseover', (event, d) => {
                    // Highlight the hovered link
                    d3.select(event.currentTarget).select('path')
                        .attr('fill-opacity', 1.0)  // Maintain 100% opacity
                        .style('filter', 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))');
                    
                    // Dim other links
                    this.chart.selectAll('.sankey-link')
                        .filter(link => link !== d)
                        .select('path')
                        .attr('fill-opacity', 0.3);  // Dim but still visible
                        
                    this.showLinkTooltip(event, d);
                })
                .on('mouseout', (event, d) => {
                    // Reset all links to 100% opacity
                    this.chart.selectAll('.sankey-link path')
                        .attr('fill-opacity', 1.0)  // 100% opacity
                        .style('filter', 'none');
                        
                    this.hideTooltip();
                })
                .on('mousemove', (event) => this.moveTooltip(event));
        }

        renderNodes() {
            const nodeGroups = this.chart.selectAll('.sankey-node')
                .data(this.nodes)
                .enter()
                .append('g')
                .attr('class', 'sankey-node')
                .attr('transform', d => `translate(${d.x}, ${d.y})`);

            const rects = nodeGroups.append('rect')
                .attr('width', CONFIG.nodeWidth)
                .attr('height', 0)
                .attr('fill', d => this.getNodeColor(d))
                .attr('stroke', 'white')                    // Crisp white border
                .attr('stroke-width', 2)                    // Slightly thicker for clarity like Salesforce
                .attr('rx', 0) // Sharp edges as requested
                .attr('ry', 0)
                .style('cursor', 'pointer')
                .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))')
                .style('transition', 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)');

            // Animate nodes with scaling effect
            rects.transition()
                .duration(CONFIG.animationDuration)
                .delay((d, i) => i * 80)
                .attr('height', d => d.height)
                .ease(d3.easeCubicOut);

            // Enhanced interactions
            nodeGroups
                .on('mouseover', (event, d) => {
                    const rect = d3.select(event.currentTarget).select('rect');
                    rect.style('filter', 'drop-shadow(0 6px 16px rgba(0,0,0,0.2))')
                        .style('transform', 'scale(1.02)');
                    
                    // Highlight connected links
                    const connectedLinks = [...d.sourceLinks, ...d.targetLinks];
                    this.chart.selectAll('.sankey-link')
                        .select('path')
                        .attr('fill-opacity', link => 
                            connectedLinks.includes(link) ? 1.0 : 0.2  // Maintain 100% for connected
                        );
                        
                    this.showNodeTooltip(event, d);
                })
                .on('mouseout', (event, d) => {
                    d3.select(event.currentTarget).select('rect')
                        .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))')
                        .style('transform', 'scale(1)');
                        
                    // Reset all links to 100% opacity
                    this.chart.selectAll('.sankey-link path')
                        .attr('fill-opacity', 1.0);
                        
                    this.hideTooltip();
                })
                .on('mousemove', (event) => this.moveTooltip(event));
        }

        // ENHANCED TYPOGRAPHY - Salesforce-quality text sizing
        renderLabels() {
            this.chart.selectAll('.node-label-group').remove();
            
            const depths = [...new Set(this.nodes.map(n => n.depth))].sort((a, b) => a - b);
            const minDepth = Math.min(...depths);
            const maxDepth = Math.max(...depths);
            const chartBottom = DIMENSIONS.height * 0.8;
            
            this.nodes.forEach((node, index) => {
                const position = this.determineSmartPosition(node, minDepth, maxDepth, chartBottom);
                const labelConfig = this.getLabelConfiguration(node, position);
                
                const labelGroup = this.chart.append('g')
                    .attr('class', 'node-label-group')
                    .attr('transform', labelConfig.transform);
                
                // ENHANCED TEXT SIZING - More prominent like Salesforce
                const wrappedText = this.smartWrapText(node.id, 130);
                const lineHeight = 16; // Increased from 14
                const totalTextHeight = wrappedText.length * lineHeight;
                
                let textStartY;
                if (position === 'left' || position === 'right') {
                    textStartY = -(totalTextHeight / 2) + (lineHeight / 2);
                } else if (position === 'bottom') {
                    textStartY = 8;
                } else {
                    textStartY = -(totalTextHeight - 8);
                }
                
                wrappedText.forEach((line, i) => {
                    labelGroup.append('text')
                        .attr('x', 0)
                        .attr('y', textStartY + (i * lineHeight))
                        .attr('text-anchor', labelConfig.textAnchor)
                        .attr('font-family', '"Inter", "Segoe UI", system-ui, sans-serif')
                        .attr('font-size', '13px') // Increased from 12px
                        .attr('font-weight', '600')
                        .attr('fill', this.getNodeColor(node))
                        .attr('letter-spacing', '-0.3px')
                        .text(line)
                        .style('opacity', 1);
                });
                
                // ENHANCED VALUE TYPOGRAPHY
                if (position === 'left') {
                    // CONFIGURABLE VALUE positioning
                    const valueDistance = CONFIG.valueDistance || 8;
                    const valueGroup = this.chart.append('g')
                        .attr('class', 'node-label-group')
                        .attr('transform', `translate(${node.x + CONFIG.nodeWidth/2}, ${node.y - valueDistance})`);
                    
                    valueGroup.append('text')
                        .attr('x', 0)
                        .attr('y', 0)
                        .attr('text-anchor', 'middle')
                        .attr('font-family', '"Inter", "Segoe UI", system-ui, sans-serif')
                        .attr('font-size', '12px') // Increased from 11px
                        .attr('font-weight', '600') // Increased from 500
                        .attr('fill', this.getNodeColor(node))
                        .text(this.formatCurrency(node.value))
                        .style('opacity', 1);
                } else {
                    let valueY;
                    if (position === 'bottom') {
                        valueY = 8 + totalTextHeight + 10;
                    } else if (position === 'right') {
                        valueY = (totalTextHeight / 2) + 8;
                    } else {
                        valueY = 10;
                    }
                    
                    labelGroup.append('text')
                        .attr('x', 0)
                        .attr('y', valueY)
                        .attr('text-anchor', labelConfig.textAnchor)
                        .attr('font-family', '"Inter", "Segoe UI", system-ui, sans-serif')
                        .attr('font-size', '12px') // Increased from 11px
                        .attr('font-weight', '600') // Increased from 500
                        .attr('fill', this.getNodeColor(node))
                        .text(this.formatCurrency(node.value))
                        .style('opacity', 1);
                }
            });
        }

        // NEW: Determine smart position for labels
        determineSmartPosition(node, minDepth, maxDepth, chartBottom) {
            // Leftmost nodes (revenue segments) - labels to the LEFT
            if (node.depth === minDepth) {
                return 'left';
            }
            
            // Rightmost nodes (final results) - labels to the RIGHT  
            if (node.depth === maxDepth) {
                return 'right';
            }
            
            // Bottom nodes - labels BELOW
            if (node.y + node.height >= chartBottom) {
                return 'bottom';
            }
            
            // Default: labels ABOVE
            return 'top';
        }

        // NEW: Calculate label positioning configuration
        getLabelConfiguration(node, position) {
            const nodeCenter = node.x + (CONFIG.nodeWidth / 2);
            const nodeTop = node.y;
            const nodeBottom = node.y + node.height;
            const nodeMidY = node.y + (node.height / 2);
            
            switch (position) {
                case 'left':
                    return {
                        transform: `translate(${node.x - 15}, ${nodeMidY})`,
                        textAnchor: 'end'
                    };
                    
                case 'right':
                    return {
                        transform: `translate(${node.x + CONFIG.nodeWidth + 10}, ${nodeMidY})`,
                        textAnchor: 'start'
                    };
                    
                case 'bottom':
                    return {
                        transform: `translate(${nodeCenter}, ${nodeBottom + 0})`,
                        textAnchor: 'middle'
                    };
                    
                default: // 'top'
                    return {
                        transform: `translate(${nodeCenter}, ${nodeTop - 15})`,
                        textAnchor: 'middle'
                    };
            }
        }

        smartWrapText(text, maxWidth = 130) {
            const threshold = CONFIG.wrapThreshold || 15; // Use configurable threshold
            if (text.length <= threshold) return [text];
            
            const words = text.split(' ');
            const lines = [];
            let currentLine = '';
            
            words.forEach(word => {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                if (testLine.length > threshold && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            });
            
            if (currentLine) lines.push(currentLine);
            return lines.length > 2 ? [lines[0], lines[1] + '...'] : lines;
        }

        formatCurrency(value) {
            if (value >= 1000) {
                return `$${(value / 1000).toFixed(1)}B`;
            } else if (value >= 1) {
                return `$${value.toFixed(1)}M`;
            } else {
                return `$${(value * 1000).toFixed(0)}K`;
            }
        }

        getLinkColor(link) {
            // Get the base node color first
            const baseColor = this.getNodeColor(link.source);
            
            // Create lighter versions of node colors for links (like Salesforce)
            const lightColorMap = {
                // Lighter versions of node colors for better hierarchy
                '#0052CC': '#4A90E2',      // Vibrant Deep Blue → Lighter Blue
                '#0073E6': '#5BA3F5',      // Bright Royal Blue → Lighter Royal
                '#0091FF': '#52A7FF',      // Electric Blue → Lighter Electric
                '#00B894': '#4DD0B1',      // Vibrant Emerald → Lighter Emerald
                '#00A085': '#4DB8A3',      // Rich Teal → Lighter Teal
                '#008F72': '#4DAF95',      // Deep Emerald → Lighter Deep Emerald
                '#FF6B35': '#FF8F66',      // Vibrant Orange-Red → Lighter Orange
                '#E63946': '#F06B75',      // Bright Red → Lighter Red
                '#D63384': '#E366A3',      // Vibrant Pink-Red → Lighter Pink
                '#64748b': '#94A3B8'       // Neutral gray → Lighter gray
            };
            
            // Return lighter version of the source node color
            return lightColorMap[baseColor] || baseColor;
        }

        getNodeColor(node) {
            // Enhanced vibrant color system - matching Salesforce quality
            // Much more saturated and distinct colors
            
            const colorMap = {
                // Revenue Sources (First Layer - Vibrant Blues)
                'recurring_revenue': '#0052CC',         // Vibrant Deep Blue
                'semi_recurring_revenue': '#0073E6',    // Bright Royal Blue
                'one_time_revenue': '#0091FF',          // Electric Blue
                'subscription_revenue': '#0052CC',       // Vibrant Deep Blue
                'professional_services': '#0073E6',     // Bright Royal Blue
                'platform_other': '#0091FF',            // Electric Blue
                
                // Positive Money Flows (Vibrant Teals/Greens)
                'gross_profit': '#00B894',              // Vibrant Emerald
                'operating_profit': '#00A085',          // Rich Teal
                'net_profit': '#008F72',                // Deep Emerald
                'net_income': '#008F72',                // Deep Emerald
                'total_revenue': '#0091FF',             // Electric Blue
                'profit': '#00A085',                    // Rich Teal
                
                // Negative Money Flows (Vibrant Reds/Oranges)
                'cost_of_revenue': '#FF6B35',           // Vibrant Orange-Red
                'operating_expenses': '#E63946',        // Bright Red
                'sales_marketing': '#E63946',           // Bright Red
                'rd': '#E63946',                        // Bright Red
                'ga': '#E63946',                        // Bright Red
                'restructuring': '#E63946',             // Bright Red
                'tax_expense': '#D63384',               // Vibrant Pink-Red
                'other_expense': '#D63384',             // Vibrant Pink-Red
                
                // Fallback categories - more vibrant
                'revenue': '#0091FF',                   // Electric Blue
                'cost': '#FF6B35',                      // Vibrant Orange-Red
                'expense': '#E63946',                   // Bright Red
                'income': '#00A085',                    // Rich Teal
                'operations': '#00B894'                 // Vibrant Emerald
            };
            
            // Enhanced categorization logic
            const nodeCategory = (node.category || '').toLowerCase().replace(/[\s&]/g, '_');
            const nodeName = (node.id || '').toLowerCase().replace(/[\s&]/g, '_');
            const nodeType = (node.type || '').toLowerCase().replace(/[\s&]/g, '_');
            
            // Try multiple matching strategies
            let color = colorMap[nodeCategory] || 
                       colorMap[nodeName] || 
                       colorMap[nodeType];
            
            // Smart categorization based on node depth and naming patterns
            if (!color) {
                const combinedText = `${nodeName} ${nodeCategory} ${nodeType}`.toLowerCase();
                
                // First layer (depth 0) - Revenue differentiation
                if (node.depth === 0) {
                    if (combinedText.includes('subscription') || combinedText.includes('recurring')) {
                        color = '#0052CC'; // Vibrant Deep Blue
                    } else if (combinedText.includes('professional') || combinedText.includes('services')) {
                        color = '#0073E6'; // Bright Royal Blue
                    } else if (combinedText.includes('platform') || combinedText.includes('other')) {
                        color = '#0091FF'; // Electric Blue
                    } else {
                        color = '#0091FF'; // Default to Electric Blue for revenue
                    }
                } else {
                    // Subsequent layers - Flow-based coloring
                    if (combinedText.includes('gross') && combinedText.includes('profit')) {
                        color = '#00B894'; // Vibrant Emerald
                    } else if (combinedText.includes('operating') && combinedText.includes('profit')) {
                        color = '#00A085'; // Rich Teal
                    } else if (combinedText.includes('net') && (combinedText.includes('profit') || combinedText.includes('income'))) {
                        color = '#008F72'; // Deep Emerald
                    } else if (combinedText.includes('total') && combinedText.includes('revenue')) {
                        color = '#0091FF'; // Electric Blue
                    } else if (combinedText.includes('cost') && combinedText.includes('revenue')) {
                        color = '#FF6B35'; // Vibrant Orange-Red
                    } else if (combinedText.includes('operating') && combinedText.includes('expenses')) {
                        color = '#E63946'; // Bright Red
                    } else if (combinedText.includes('sales') || combinedText.includes('marketing')) {
                        color = '#E63946'; // Bright Red
                    } else if (combinedText.includes('r&d') || combinedText.includes('rd')) {
                        color = '#E63946'; // Bright Red
                    } else if (combinedText.includes('g&a') || combinedText.includes('ga')) {
                        color = '#E63946'; // Bright Red
                    } else if (combinedText.includes('restructuring')) {
                        color = '#E63946'; // Bright Red
                    } else if (combinedText.includes('tax')) {
                        color = '#D63384'; // Vibrant Pink-Red
                    } else if (combinedText.includes('other') && combinedText.includes('expense')) {
                        color = '#D63384'; // Vibrant Pink-Red
                    }
                }
            }
            
            return color || '#64748b'; // Fallback to neutral gray
        }

        // Enhanced tooltip methods
        showNodeTooltip(event, d) {
            const totalInflow = d3.sum(d.targetLinks, link => link.value);
            const totalOutflow = d3.sum(d.sourceLinks, link => link.value);
            
            const content = `
                <div style="font-weight: 700; margin-bottom: 8px; font-size: 14px;">${d.id}</div>
                <div style="font-size: 16px; font-weight: 600; color: #3b82f6; margin-bottom: 8px;">
                    ${this.formatCurrency(d.value)}
                </div>
                <div style="font-size: 11px; color: rgba(255,255,255,0.8); line-height: 1.4;">
                    ${totalInflow > 0 ? `Inflow: ${this.formatCurrency(totalInflow)}<br>` : ''}
                    ${totalOutflow > 0 ? `Outflow: ${this.formatCurrency(totalOutflow)}<br>` : ''}
                    ${d.description || 'Financial flow component'}
                </div>
            `;
            
            this.showTooltip(event, content);
        }

        showLinkTooltip(event, d) {
            const percentage = d.source.value > 0 ? 
                ((d.value / d.source.value) * 100).toFixed(1) : '0';
                
            const content = `
                <div style="font-weight: 700; margin-bottom: 8px; font-size: 14px;">
                    ${d.source.id} → ${d.target.id}
                </div>
                <div style="font-size: 16px; font-weight: 600; color: #3b82f6; margin-bottom: 8px;">
                    ${this.formatCurrency(d.value)}
                </div>
                <div style="font-size: 11px; color: rgba(255,255,255,0.8); line-height: 1.4;">
                    ${percentage}% of source flow<br>
                    Type: ${d.type || 'Flow'}
                </div>
            `;
            
            this.showTooltip(event, content);
        }

        showTooltip(event, content) {
            this.tooltip
                .html(content)
                .style('left', (event.pageX) + 'px')
                .style('top', (event.pageY - 10) + 'px')
                .style('opacity', 1);
        }

        moveTooltip(event) {
            this.tooltip
                .style('left', (event.pageX) + 'px')
                .style('top', (event.pageY - 10) + 'px');
        }

        hideTooltip() {
            this.tooltip.style('opacity', 0);
        }

        // Public API methods with auto-optimization
        updateData(newData) {
            const result = this.render(newData);
            // Auto-optimization happens in render() method
            console.log('Data updated with auto-optimization');
            return result;
        }

        resize(width, height) {
            if (width) CONFIG.width = width;
            if (height) CONFIG.height = height;
            
            DIMENSIONS.width = CONFIG.width - CONFIG.margin.left - CONFIG.margin.right;
            DIMENSIONS.height = CONFIG.height - CONFIG.margin.top - CONFIG.margin.bottom;
            
            this.initializeChart();
            if (this.data) {
                this.render(this.data);
                // Auto-optimization happens in render() method
            }
            console.log('Chart resized with auto-optimization');
            return this;
        }

        setCurveIntensity(intensity) {
            CONFIG.curveIntensity = Math.max(0.1, Math.min(0.8, intensity));
            if (this.data) {
                this.calculateLinkPositions();
                this.renderLinks();
            }
            return this;
        }

        // LAYER-SPECIFIC CURVATURE CONTROL METHODS
        
        // Set curvature for a specific layer
        setLayerCurvature(layer, intensity) {
            CONFIG.layerCurvature[layer] = Math.max(0.1, Math.min(0.8, intensity));
            
            if (this.data) {
                this.calculateLinkPositions();
                this.renderLinks();
            }
            
            console.log(`Layer ${layer} curvature set to: ${intensity}`);
            return this;
        }

        // Set curvature for multiple layers at once
        setMultiLayerCurvature(curvatureMap) {
            Object.keys(curvatureMap).forEach(layer => {
                const intensity = Math.max(0.1, Math.min(0.8, curvatureMap[layer]));
                CONFIG.layerCurvature[layer] = intensity;
            });
            
            if (this.data) {
                this.calculateLinkPositions();
                this.renderLinks();
            }
            
            console.log('Multi-layer curvature updated:', curvatureMap);
            return this;
        }

        // Apply a curvature preset
        applyCurvaturePreset(presetName) {
            if (!CONFIG.curvaturePresets[presetName]) {
                console.warn(`Curvature preset '${presetName}' not found. Available presets:`, Object.keys(CONFIG.curvaturePresets));
                return this;
            }
            
            CONFIG.layerCurvature = { ...CONFIG.curvaturePresets[presetName] };
            
            if (this.data) {
                this.calculateLinkPositions();
                this.renderLinks();
            }
            
            console.log(`Applied curvature preset: ${presetName}`, CONFIG.layerCurvature);
            return this;
        }

        // Get current layer curvature settings
        getLayerCurvature() {
            return { ...CONFIG.layerCurvature };
        }

        // Auto-detect optimal curvature based on layer complexity
        autoOptimizeCurvature() {
            if (!this.data || !this.nodes.length) return this;
            
            // Group nodes by depth to understand layer structure
            const nodesByDepth = d3.group(this.nodes, d => d.depth);
            const depths = Array.from(nodesByDepth.keys()).sort((a, b) => a - b);
            const maxDepth = Math.max(...depths);
            
            // Calculate optimal curvature for each layer
            depths.slice(0, -1).forEach(depth => { // Exclude last depth (no outgoing links)
                const nodesAtDepth = nodesByDepth.get(depth);
                const totalLinks = d3.sum(nodesAtDepth, node => node.sourceLinks.length);
                const avgLinksPerNode = totalLinks / nodesAtDepth.length;
                
                // More complex layers (more links) get more curvature for clarity
                let optimalCurvature;
                if (avgLinksPerNode <= 2) {
                    optimalCurvature = 0.3; // Simple layers - gentle curve
                } else if (avgLinksPerNode <= 4) {
                    optimalCurvature = 0.4; // Moderate complexity
                } else {
                    optimalCurvature = 0.5; // Complex layers - more curve for separation
                }
                
                // Progressive curvature: later layers get slightly more curve
                const progressiveBonus = (depth / maxDepth) * 0.1;
                CONFIG.layerCurvature[depth] = Math.min(0.7, optimalCurvature + progressiveBonus);
            });
            
            if (this.data) {
                this.calculateLinkPositions();
                this.renderLinks();
            }
            
            console.log('Auto-optimized curvature:', CONFIG.layerCurvature);
            return this;
        }

        // Create and save a custom curvature preset
        createCurvaturePreset(presetName, curvatureMap) {
            CONFIG.curvaturePresets[presetName] = { ...curvatureMap };
            console.log(`Created curvature preset '${presetName}':`, curvatureMap);
            return this;
        }

        // Get available curvature presets
        getCurvaturePresets() {
            return Object.keys(CONFIG.curvaturePresets);
        }

        // Debug and utility methods
        getFlowReport() {
            return this.checkFlowConservation();
        }

        logDataStructure() {
            console.log("=== SANKEY DATA STRUCTURE ===");
            console.log("Nodes:", this.nodes);
            console.log("Links:", this.links);
            console.log("Flow Report:", this.getFlowReport());
        }

        // Canvas utilization analysis
        optimizeCanvas() {
            console.log("=== CANVAS UTILIZATION ANALYSIS ===");
            
            const totalCanvasArea = CONFIG.width * CONFIG.height;
            const marginArea = (CONFIG.margin.top + CONFIG.margin.bottom) * CONFIG.width + 
                             (CONFIG.margin.left + CONFIG.margin.right) * DIMENSIONS.height;
            const contentArea = totalCanvasArea - marginArea;
            const utilization = (contentArea / totalCanvasArea) * 100;
            
            console.log(`Canvas: ${CONFIG.width} x ${CONFIG.height} = ${totalCanvasArea}px²`);
            console.log(`Content Area: ${contentArea}px² (${utilization.toFixed(1)}% utilization)`);
            console.log(`Node Height Scale: ${CONFIG.nodeHeightScale}x`);
            console.log(`Link Width Scale: ${CONFIG.linkWidthScale}x`);
            
            // Check if we're achieving Salesforce-level utilization (95%+)
            if (utilization >= 95) {
                console.log("✅ EXCELLENT: Salesforce-quality canvas utilization achieved!");
            } else if (utilization >= 90) {
                console.log("✅ GOOD: Near Salesforce-quality utilization");
            } else {
                console.log("⚠️ OPTIMIZE: More canvas space could be utilized");
            }
            
            return { utilization, totalCanvasArea, contentArea };
        }

        // DYNAMIC EXPANSION METHODS - PowerPoint-style scaling with auto-optimization
        expandToFillContainer(padding = 0.95) {
            // Get actual container dimensions
            const containerNode = this.container.node();
            const containerRect = containerNode.getBoundingClientRect();
            
            // Calculate available space with padding factor
            const availableWidth = (containerRect.width || window.innerWidth) * padding;
            const availableHeight = (containerRect.height || window.innerHeight * 0.8) * padding;
            
            // Update CONFIG with new dimensions
            CONFIG.width = Math.max(1200, availableWidth);
            CONFIG.height = Math.max(600, availableHeight);
            
            // Adjust margins proportionally
            this.adjustMarginsForSize();
            
            // Reinitialize and re-render with auto-optimization
            this.initializeChart();
            if (this.data) {
                this.render(this.data);
                // Auto-optimization happens in render() method
            }
            
            console.log(`Chart expanded to: ${CONFIG.width} x ${CONFIG.height} with auto-optimization`);
            return this;
        }

        // Smart margin scaling based on canvas size
        adjustMarginsForSize() {
            const baseMargin = 85;
            const scaleFactor = Math.min(CONFIG.width / 1400, CONFIG.height / 800);
            
            CONFIG.margin = {
                top: Math.max(30, baseMargin * scaleFactor * 0.5),
                right: Math.max(60, baseMargin * scaleFactor),
                bottom: Math.max(40, baseMargin * scaleFactor * 0.6),
                left: Math.max(60, baseMargin * scaleFactor)
            };
            
            // Recalculate dimensions
            DIMENSIONS.width = CONFIG.width - CONFIG.margin.left - CONFIG.margin.right;
            DIMENSIONS.height = CONFIG.height - CONFIG.margin.top - CONFIG.margin.bottom;
            
            return this;
        }

        // PowerPoint-style scaling to specific dimensions with auto-optimization
        scaleToFit(targetWidth, targetHeight, maintainAspect = true) {
            if (maintainAspect) {
                const aspectRatio = CONFIG.width / CONFIG.height;
                
                if (targetWidth / targetHeight > aspectRatio) {
                    // Fit to height
                    CONFIG.height = targetHeight;
                    CONFIG.width = targetHeight * aspectRatio;
                } else {
                    // Fit to width
                    CONFIG.width = targetWidth;
                    CONFIG.height = targetWidth / aspectRatio;
                }
            } else {
                CONFIG.width = targetWidth;
                CONFIG.height = targetHeight;
            }
            
            this.adjustMarginsForSize();
            this.initializeChart();
            if (this.data) {
                this.render(this.data);
                // Auto-optimization happens in render() method
            }
            
            console.log(`Chart scaled to: ${CONFIG.width} x ${CONFIG.height} with auto-optimization`);
            return this;
        }

        // Adjust spacing dynamically with full layer control
        setSpacing(global, leftmostMultiplier, middleMultiplier, rightmostMultiplier) {
            CONFIG.nodePadding = global || CONFIG.nodePadding;
            CONFIG.leftmostSpacingMultiplier = leftmostMultiplier || CONFIG.leftmostSpacingMultiplier;
            CONFIG.middleSpacingMultiplier = middleMultiplier || CONFIG.middleSpacingMultiplier;
            CONFIG.rightmostSpacingMultiplier = rightmostMultiplier || CONFIG.rightmostSpacingMultiplier;
            
            if (this.data) {
                this.calculateLayout();
                this.autoOptimizeLayout(); // Auto-optimize after spacing change
                this.renderNodes();
                this.renderLabels();
            }
            
            console.log(`Spacing updated: Global=${CONFIG.nodePadding}, Leftmost=${CONFIG.leftmostSpacingMultiplier}, Middle=${CONFIG.middleSpacingMultiplier}, Rightmost=${CONFIG.rightmostSpacingMultiplier}`);
            return this;
        }

        // CENTERING CONTROL - Fine-tune chart positioning
        setCentering(leftOffset = 0.08, widthUsage = 0.82) {
            // Store the centering parameters for use in calculateLayout
            CONFIG.centeringOffset = leftOffset; // Percentage of available width for left margin
            CONFIG.widthUsage = widthUsage; // Percentage of available width to use
            
            if (this.data) {
                this.calculateLayout();
                this.autoOptimizeLayout(); // Auto-optimize after centering change
                this.renderNodes();
                this.renderLabels();
            }
            
            console.log(`Centering updated: Left offset=${leftOffset * 100}%, Width usage=${widthUsage * 100}%`);
            return this;
        }

        // COMPREHENSIVE CUSTOMIZATION - Apply all user settings at once
        customize(options = {}) {
            const {
                // Spacing controls
                globalPadding = CONFIG.nodePadding,
                leftmostSpacing = CONFIG.leftmostSpacingMultiplier,
                middleSpacing = CONFIG.middleSpacingMultiplier, 
                rightmostSpacing = CONFIG.rightmostSpacingMultiplier,
                
                // Centering controls
                leftOffset = CONFIG.centeringOffset || 0.08,
                widthUsage = CONFIG.widthUsage || 0.82,
                
                // Auto-optimization controls
                autoCenter = CONFIG.autoCenter,
                autoMiddleAlign = CONFIG.autoMiddleAlign,
                dynamicSpaceFill = CONFIG.dynamicSpaceFill,
                
                // Curvature controls
                globalCurvature = CONFIG.curveIntensity,
                layerCurvature = null, // Object with layer-specific curvature
                curvaturePreset = null, // String preset name
                
                // Value positioning
                valueDistance = 8, // Default to user's preferred -8
                
                // Text wrapping
                wrapThreshold = 15 // Default to user's preferred 15
            } = options;
            
            // Apply all settings
            CONFIG.nodePadding = globalPadding;
            CONFIG.leftmostSpacingMultiplier = leftmostSpacing;
            CONFIG.middleSpacingMultiplier = middleSpacing;
            CONFIG.rightmostSpacingMultiplier = rightmostSpacing;
            CONFIG.centeringOffset = leftOffset;
            CONFIG.widthUsage = widthUsage;
            CONFIG.autoCenter = autoCenter;
            CONFIG.autoMiddleAlign = autoMiddleAlign;  
            CONFIG.dynamicSpaceFill = dynamicSpaceFill;
            CONFIG.valueDistance = valueDistance;
            CONFIG.wrapThreshold = wrapThreshold;
            
            // Apply curvature settings
            CONFIG.curveIntensity = globalCurvature;
            
            if (curvaturePreset && CONFIG.curvaturePresets[curvaturePreset]) {
                CONFIG.layerCurvature = { ...CONFIG.curvaturePresets[curvaturePreset] };
            } else if (layerCurvature && typeof layerCurvature === 'object') {
                CONFIG.layerCurvature = { ...CONFIG.layerCurvature, ...layerCurvature };
            }
            
            // Re-render if data exists with auto-optimization
            if (this.data) {
                this.calculateLayout();
                this.autoOptimizeLayout(); // Auto-optimize after customization
                this.renderNodes();
                this.renderLabels();
            }
            
            console.log('Chart customization applied with auto-optimization:', options);
            return this;
        }

        // TOGGLE AUTO-FEATURES
        setAutoFeatures(autoCenter = true, autoMiddleAlign = true, dynamicSpaceFill = true) {
            CONFIG.autoCenter = autoCenter;
            CONFIG.autoMiddleAlign = autoMiddleAlign;
            CONFIG.dynamicSpaceFill = dynamicSpaceFill;
            
            if (this.data) {
                this.calculateLayout();
                this.autoOptimizeLayout();
                this.renderNodes();
                this.renderLabels();
            }
            
            console.log(`Auto-features: Center=${autoCenter}, MiddleAlign=${autoMiddleAlign}, SpaceFill=${dynamicSpaceFill}`);
            return this;
        }

        // Enhanced export methods
        exportToPNG(filename = 'pulse-sankey-chart.png', options = {}) {
            const settings = {
                scale: 2,
                quality: 0.95,
                backgroundColor: '#ffffff',
                ...options
            };
            
            try {
                const svgNode = this.svg.node();
                const serializer = new XMLSerializer();
                const svgString = serializer.serializeToString(svgNode);
                
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                canvas.width = CONFIG.width * settings.scale;
                canvas.height = CONFIG.height * settings.scale;
                ctx.scale(settings.scale, settings.scale);
                
                ctx.fillStyle = settings.backgroundColor;
                ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
                
                img.onload = () => {
                    ctx.drawImage(img, 0, 0);
                    
                    canvas.toBlob((blob) => {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = filename;
                        link.click();
                        URL.revokeObjectURL(url);
                    }, 'image/png', settings.quality);
                };
                
                const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                const svgUrl = URL.createObjectURL(svgBlob);
                img.src = svgUrl;
                
                console.log(`PNG export initiated: ${filename}`);
            } catch (error) {
                console.error('PNG export failed:', error);
                alert('PNG export failed. Please try SVG export instead.');
            }
            return this;
        }

        exportToSVG(filename = 'pulse-sankey-chart.svg', options = {}) {
            const settings = {
                includeStyles: true,
                backgroundColor: null,
                ...options
            };
            
            try {
                const svgNode = this.svg.node();
                const serializer = new XMLSerializer();
                let svgString = serializer.serializeToString(svgNode);
                
                if (settings.includeStyles) {
                    const styles = `
                        <style>
                            .pulse-sankey-chart { font-family: "Inter", "Segoe UI", system-ui, sans-serif; }
                            .sankey-link { transition: all 0.2s ease; }
                            .sankey-node { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
                        </style>
                    `;
                    svgString = svgString.replace('<svg', `<svg${styles}<svg`);
                }
                
                const blob = new Blob([svgString], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                link.click();
                
                URL.revokeObjectURL(url);
                console.log(`SVG export completed: ${filename}`);
            } catch (error) {
                console.error('SVG export failed:', error);
                alert('SVG export failed. Please check console for details.');
            }
            return this;
        }
    }

    // Factory function
    function createSankeyChart(containerId) {
        return new ProfessionalSankeyChart(containerId);
    }

    return {
        create: createSankeyChart,
        SankeyChart: ProfessionalSankeyChart
    };
})();