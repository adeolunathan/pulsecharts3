/* ===== PULSE SANKEY CHART - MODULAR IMPLEMENTATION ===== */
/* Professional Sankey chart with seamless link stacking and external data loading */

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
        
        // Configuration
        this.config = {
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
            // **LABEL POSITIONING CONTROLS BY LAYER**
            labelDistance: {
                leftmost: 15,
                middle: 12,
                rightmost: 15
            },
            valueDistance: 8,
            layerSpacing: {
                0: 0.8,  // Leftmost
                1: 1.0,  // Middle layers
                2: 1.0,
                3: 0.9,
                4: 0.7   // Rightmost
            }
        };
        
        this.initializeChart();
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

    processData(data) {
        const nodeMap = new Map();
        
        data.nodes.forEach(node => {
            nodeMap.set(node.id, {
                ...node,
                sourceLinks: [],
                targetLinks: [],
                value: node.value || 0
            });
        });
        
        // Process links and establish relationships
        const processedLinks = [];
        data.links.forEach(link => {
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
                processedLinks.push(processedLink);
            }
        });
        
        this.nodes = Array.from(nodeMap.values());
        this.links = processedLinks;
    }

    calculateLayout() {
        const dimensions = {
            width: this.config.width - this.config.margin.left - this.config.margin.right,
            height: this.config.height - this.config.margin.top - this.config.margin.bottom
        };

        // Group by depth
        const nodesByDepth = d3.group(this.nodes, d => d.depth);
        const depths = Array.from(nodesByDepth.keys()).sort((a, b) => a - b);
        const maxDepth = Math.max(...depths);

        // X positioning
        const xScale = d3.scaleLinear()
            .domain([0, maxDepth])
            .range([0, dimensions.width - this.config.nodeWidth]);

        this.nodes.forEach(node => {
            node.x = xScale(node.depth);
        });

        // Node heights
        this.nodes.forEach(node => {
            node.height = Math.max(8, node.value * this.config.nodeHeightScale);
        });

        // Y positioning with improved sorting
        depths.forEach(depth => {
            const nodesAtDepth = nodesByDepth.get(depth);
            this.positionNodesAtDepth(nodesAtDepth, dimensions.height);
        });

        this.calculateLinkPositions();
    }

    positionNodesAtDepth(nodes, availableHeight) {
        // **IMPROVED: Consistent cross-layer sorting for better logical flow**
        const groupedNodes = this.groupAndSortNodes(nodes);
        
        // **USE PER-LAYER SPACING**
        const depth = nodes[0]?.depth ?? 0;
        const spacingMultiplier = this.config.layerSpacing[depth] ?? 1.0;
        const layerPadding = this.config.nodePadding * spacingMultiplier;
        
        const totalHeight = d3.sum(groupedNodes, d => d.height);
        const totalPadding = layerPadding * (groupedNodes.length - 1);
        const totalRequired = totalHeight + totalPadding;
        
        const startY = Math.max(20, (availableHeight - totalRequired) / 2);
        let currentY = startY;
        
        groupedNodes.forEach(node => {
            node.y = currentY;
            currentY += node.height + layerPadding;
        });
    }

    groupAndSortNodes(nodes) {
        // **CONSISTENT CROSS-LAYER SORTING MECHANISM**
        // For final layer: group by source parent, then sort by value
        // For other layers: group by functional category
        
        const depth = nodes[0]?.depth;
        
        // **SPECIAL HANDLING FOR FINAL LAYER (depth 4)**
        if (depth === 4) {
            return this.sortFinalLayerBySource(nodes);
        }
        
        // **STANDARD SORTING FOR OTHER LAYERS**
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
        // **GROUP BY SOURCE PARENT FOR FINAL LAYER**
        // Sort by source node Y position to prevent crossing
        
        const sourceGroups = new Map();
        
        nodes.forEach(node => {
            let sourceParent = 'unknown';
            let sourceNode = null;
            
            // Find which parent this node comes from by checking links
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
        
        // **SORT SOURCE GROUPS BY THEIR Y POSITION**
        // This prevents crossing by maintaining spatial order
        const sortedSourceGroups = Array.from(sourceGroups.entries())
            .sort((a, b) => {
                const aSourceY = a[1].sourceNode?.y || 0;
                const bSourceY = b[1].sourceNode?.y || 0;
                return aSourceY - bSourceY;
            });
        
        const sortedNodes = [];
        
        // Process each source group in Y order
        sortedSourceGroups.forEach(([sourceName, groupData]) => {
            const sourceNodes = groupData.nodes;
            
            // **SORT WITHIN EACH SOURCE GROUP BY VALUE (DESCENDING)**
            sourceNodes.sort((a, b) => b.value - a.value);
            
            sortedNodes.push(...sourceNodes);
        });
        
        return sortedNodes;
    }

    getCategoryPriority(categoryA, categoryB, groupName) {
        // **CATEGORY-BASED PRIORITY SYSTEM**
        // Ensures logical ordering within functional groups
        
        const categoryPriorities = {
            // Positive flow categories (appear first)
            'income': 1,
            'profit': 2,
            'revenue': 3,
            
            // Neutral categories  
            'cost': 4,
            
            // Negative flow categories (appear last)
            'expense': 5,
            'tax': 6,
            'other': 7
        };
        
        // Special handling for specific groups
        if (groupName === 'final_results') {
            // In final results, prioritize income/profit outcomes
            if (categoryA === 'income' && categoryB !== 'income') return -1;
            if (categoryB === 'income' && categoryA !== 'income') return 1;
        }
        
        if (groupName === 'final_adjustments') {
            // In adjustments, taxes typically come before other expenses
            if (categoryA === 'tax' && categoryB !== 'tax') return -1;
            if (categoryB === 'tax' && categoryA !== 'tax') return 1;
        }
        
        const priorityA = categoryPriorities[categoryA] || 5;
        const priorityB = categoryPriorities[categoryB] || 5;
        
        return priorityA - priorityB;
    }

    calculateLinkPositions() {
        // Calculate link widths
        this.links.forEach(link => {
            link.width = link.value * this.config.linkWidthScale;
        });
        
        // SEAMLESS STACKING: Calculate source link positions (outgoing from nodes)
        this.nodes.forEach(node => {
            if (node.sourceLinks.length === 0) return;
            
            // Sort source links by target node position for better visual flow
            node.sourceLinks.sort((a, b) => a.target.y - b.target.y);
            
            // Scale links to fill ENTIRE node height with NO GAPS
            const totalOutflow = d3.sum(node.sourceLinks, d => d.value);
            
            // Links must collectively fill the full node height
            let currentY = node.y;  // Start at top of node
            
            node.sourceLinks.forEach((link, index) => {
                link.sourceY = currentY;
                
                // PROPORTIONAL HEIGHT: Each link gets height proportional to its value
                const proportionalHeight = (link.value / totalOutflow) * node.height;
                link.sourceHeight = proportionalHeight;
                
                // SEAMLESS STACKING: Next link starts exactly where this one ends
                currentY += proportionalHeight;
            });
            
            // Ensure perfect fill (handle any rounding errors)
            const totalUsedHeight = d3.sum(node.sourceLinks, d => d.sourceHeight);
            if (Math.abs(totalUsedHeight - node.height) > 0.01) {
                const lastLink = node.sourceLinks[node.sourceLinks.length - 1];
                lastLink.sourceHeight += (node.height - totalUsedHeight);
            }
        });
        
        // SEAMLESS STACKING: Calculate target link positions (incoming to nodes)
        this.nodes.forEach(node => {
            if (node.targetLinks.length === 0) return;
            
            // Sort target links by source node position for visual consistency
            node.targetLinks.sort((a, b) => a.source.y - b.source.y);
            
            // Scale links to fill ENTIRE node height with NO GAPS
            const totalInflow = d3.sum(node.targetLinks, d => d.value);
            
            // Links must collectively fill the full node height
            let currentY = node.y;  // Start at top of node
            
            node.targetLinks.forEach((link, index) => {
                link.targetY = currentY;
                
                // PROPORTIONAL HEIGHT: Each link gets height proportional to its value
                const proportionalHeight = (link.value / totalInflow) * node.height;
                link.targetHeight = proportionalHeight;
                
                // SEAMLESS STACKING: Next link starts exactly where this one ends
                currentY += proportionalHeight;
            });
            
            // Ensure perfect fill (handle any rounding errors)
            const totalUsedHeight = d3.sum(node.targetLinks, d => d.targetHeight);
            if (Math.abs(totalUsedHeight - node.height) > 0.01) {
                const lastLink = node.targetLinks[node.targetLinks.length - 1];
                lastLink.targetHeight += (node.height - totalUsedHeight);
            }
        });
        
        // Generate smooth paths
        this.links.forEach(link => {
            const sourceDepth = link.source.depth;
            const layerCurvature = this.config.layerCurvature?.[sourceDepth] || this.config.curveIntensity;
            link.path = this.createSmoothPath(link, layerCurvature);
        });
    }

    createSmoothPath(link, curvature = this.config.curveIntensity) {
        // Source and target positions with proper edge alignment
        const sourceX = link.source.x + this.config.nodeWidth;
        const targetX = link.target.x;
        
        // Use calculated link heights for seamless connections
        const sourceY0 = link.sourceY;
        const sourceY1 = link.sourceY + link.sourceHeight;
        const targetY0 = link.targetY;
        const targetY1 = link.targetY + link.targetHeight;
        
        // Calculate control points for smooth bezier curve
        const controlX1 = sourceX + (targetX - sourceX) * curvature;
        const controlX2 = targetX - (targetX - sourceX) * curvature;
        
        // Create path that perfectly connects the calculated link heights
        return `M${sourceX},${sourceY0}
                C${controlX1},${sourceY0} ${controlX2},${targetY0} ${targetX},${targetY0}
                L${targetX},${targetY1}
                C${controlX2},${targetY1} ${controlX1},${sourceY1} ${sourceX},${sourceY1}
                Z`;
    }

    renderTitle() {
        // **CLEAN HEADER WITHOUT BACKGROUND**
        const headerGroup = this.svg.append('g')
            .attr('class', 'chart-header');

        // **MAIN TITLE: "Company Period Income Statement"**
        const company = this.data?.metadata?.company || 'Company';
        const period = this.data?.metadata?.period || 'Period';
        const titleText = `${company} ${period} Income Statement`;

        headerGroup.append('text')
            .attr('x', this.config.width / 2)
            .attr('y', 60)
            .attr('text-anchor', 'middle')
            .attr('font-size', '40px')
            .attr('font-weight', '1000')
            .attr('fill', '#1f2937')
            .attr('letter-spacing', '0.5px')
            .text(titleText);

        // Subtitle (if exists)
        if (this.data?.metadata?.subtitle) {
            headerGroup.append('text')
                .attr('x', this.config.width / 2)
                .attr('y', 85)
                .attr('text-anchor', 'middle')
                .attr('font-size', '13px')
                .attr('font-weight', '900')
                .attr('fill', '#1f2937')
                .text(this.data.metadata.subtitle);
        }
    }

    renderBrandingFooter() {
        const footerGroup = this.svg.append('g')
            .attr('class', 'chart-branding')
            .attr('transform', `translate(0, ${this.config.height - 35})`);

        // **LOGO IMAGE (Base64 or URL)**
        // You can replace this with your actual logo
        const logoUrl = this.data?.metadata?.logoUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiByeD0iNCIgZmlsbD0iIzY2N2VlYSIvPgo8dGV4dCB4PSIxMCIgeT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iYm9sZCI+UDwvdGV4dD4KPC9zdmc+';
        
        footerGroup.append('image')
            .attr('x', 20)
            .attr('y', -40)
            .attr('width', 24)
            .attr('height', 24)
            .attr('href', logoUrl)
            .attr('opacity', 0.8);

        // Company/Brand name next to logo
        footerGroup.append('text')
            .attr('x', 50)
            .attr('y', -25)
            .attr('font-size', '16px')
            .attr('font-weight', '800')
            .attr('fill', '#667eea')
            .text('PULSE ANALYTICS');

        // Center: Website
        footerGroup.append('text')
            .attr('x', this.config.width / 2)
            .attr('y', -25)
            .attr('text-anchor', 'middle')
            .attr('font-size', '16px')
            .attr('font-weight', '800')
            .attr('fill', '#667eea')
            .text('pulse-analytics.com');

        // Right: Chart type/watermark
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
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .attr('rx', 1)
            .style('cursor', 'pointer')
            .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))')
            .style('transition', 'all 0.2s ease')
            .on('mouseover', (event, d) => {
                d3.select(event.currentTarget)
                    .style('filter', 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))')
                    .style('transform', 'scale(1.02)');
                this.showNodeTooltip(event, d);
            })
            .on('mouseout', (event, d) => {
                d3.select(event.currentTarget)
                    .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))')
                    .style('transform', 'scale(1)');
                this.hideTooltip();
            });
    }

    renderLabels() {
        const maxDepth = Math.max(...this.nodes.map(n => n.depth));
        
        this.nodes.forEach(node => {
            const isLeftmost = node.depth === 0;
            const isRightmost = node.depth === maxDepth;
            const isMiddle = !isLeftmost && !isRightmost;
            
            if (isLeftmost) {
                // **LEFTMOST NODES**: Label outside left, value on top
                this.renderLeftmostLabels(node);
            } else if (isRightmost) {
                // **RIGHTMOST NODES**: Label outside right, value on top  
                this.renderRightmostLabels(node);
            } else {
                // **MIDDLE NODES**: Label above, value below label
                this.renderMiddleLabels(node);
            }
        });
    }

    renderLeftmostLabels(node) {
        const labelDistance = this.config.labelDistance.leftmost;
        const wrappedText = this.wrapText(node.id, 15);
        const nodeColor = this.getNodeColor(node);
        
        // Label outside to the left, vertically centered
        const labelGroup = this.chart.append('g')
            .attr('class', 'node-label')
            .attr('transform', `translate(${node.x - labelDistance}, ${node.y + node.height/2})`);

        // Multi-line text rendering
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

        // Value centered directly above the node
        const valueGroup = this.chart.append('g')
            .attr('class', 'node-value')
            .attr('transform', `translate(${node.x + this.config.nodeWidth/2}, ${node.y - this.config.valueDistance})`);

        valueGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('font-weight', '500')
            .attr('fill', nodeColor)
            .text(this.formatCurrency(node.value));
    }

    renderRightmostLabels(node) {
        const labelDistance = this.config.labelDistance.rightmost;
        const wrappedText = this.wrapText(node.id, 15);
        const nodeColor = this.getNodeColor(node);
        
        // Label outside to the right, vertically centered
        const labelGroup = this.chart.append('g')
            .attr('class', 'node-label')
            .attr('transform', `translate(${node.x + this.config.nodeWidth + labelDistance}, ${node.y + node.height/2})`);

        // Multi-line text rendering
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

        // Value centered directly above the node
        const valueGroup = this.chart.append('g')
            .attr('class', 'node-value')
            .attr('transform', `translate(${node.x + this.config.nodeWidth/2}, ${node.y - this.config.valueDistance})`);

        valueGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('font-size', '11px')
            .attr('font-weight', '500')
            .attr('fill', nodeColor)
            .text(this.formatCurrency(node.value));
    }

    renderMiddleLabels(node) {
        const labelDistance = this.config.labelDistance.middle;
        const wrappedText = this.wrapText(node.id, 18);
        const nodeColor = this.getNodeColor(node);
        
        const labelGroup = this.chart.append('g')
            .attr('class', 'node-label')
            .attr('transform', `translate(${node.x + this.config.nodeWidth/2}, ${node.y - labelDistance})`);

        // Multi-line label above the node
        wrappedText.forEach((line, index) => {
            labelGroup.append('text')
                .attr('text-anchor', 'middle')
                .attr('y', index * 14)
                .attr('font-size', '12px')
                .attr('font-weight', '600')
                .attr('fill', nodeColor)
                .text(line);
        });

        // Value below the label
        labelGroup.append('text')
            .attr('text-anchor', 'middle')
            .attr('y', (wrappedText.length * 14) + this.config.valueDistance)
            .attr('font-size', '11px')
            .attr('font-weight', '500')
            .attr('fill', nodeColor)
            .text(this.formatCurrency(node.value));
    }

    // Smart text wrapping utility
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
                    // Single word longer than maxLength
                    lines.push(word);
                }
            }
        });
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }

    formatCurrency(value) {
        if (value >= 1000) {
            return `$${(value/1000).toFixed(1)}B`;
        } else if (value >= 1) {
            return `$${value.toFixed(0)}M`;
        } else {
            return `$${(value * 1000).toFixed(0)}K`;
        }
    }

    getNodeColor(node) {
        const colors = {
            revenue: '#3498db',
            cost: '#e74c3c',
            profit: '#27ae60',
            expense: '#e67e22',
            income: '#9b59b6',
            tax: '#c0392b'
        };
        return colors[node.category] || '#95a5a6';
    }

    getLinkColor(link) {
        const baseColor = this.getNodeColor(link.source);
        // Make links slightly lighter
        const lighterColors = {
            '#3498db': '#5dade2',
            '#e74c3c': '#ec7063',
            '#27ae60': '#52c785',
            '#e67e22': '#f1975a',
            '#9b59b6': '#bb8fce',
            '#c0392b': '#e74c3c'
        };
        return lighterColors[baseColor] || baseColor;
    }

    // Tooltip methods
    showNodeTooltip(event, d) {
        const content = `
            <div style="font-weight: 700; margin-bottom: 8px; font-size: 14px;">${d.id}</div>
            <div style="font-size: 16px; color: #3b82f6; margin-bottom: 8px; font-weight: 600;">
                ${this.formatCurrency(d.value)}
            </div>
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
                ${this.formatCurrency(d.value)}
            </div>
            <div style="font-size: 11px; color: rgba(255,255,255,0.8);">
                ${percentage}% of source flow
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
        
        this.chart.selectAll('.sankey-node rect')
            .attr('fill-opacity', nodeOpacity);
        this.chart.selectAll('.sankey-link path')
            .attr('fill-opacity', linkOpacity);
        return this;
    }

    // **NEW CONTROL METHODS FOR ALL CONFIG OPTIONS**
    setLabelPositioning(labelDistance, valueDistance) {
        this.config.labelDistance = labelDistance;
        this.config.valueDistance = valueDistance;
        this.chart.selectAll('.node-label, .node-value').remove();
        this.renderLabels();
        return this;
    }

    setLayerSpacing(depth, multiplier) {
        this.config.layerSpacing[depth] = multiplier;
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

    // **GENERIC CONFIG UPDATE METHOD**
    updateConfig(newConfig) {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newConfig };
        
        // Apply layer spacing updates to layerSpacing object
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
        
        // Determine what needs to be re-rendered
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
            // Handle opacity changes
            if (newConfig.nodeOpacity !== undefined) {
                this.chart.selectAll('.sankey-node rect').attr('fill-opacity', newConfig.nodeOpacity);
            }
            if (newConfig.linkOpacity !== undefined) {
                this.chart.selectAll('.sankey-link path').attr('fill-opacity', newConfig.linkOpacity);
            }
        }
        
        return this;
    }

    configRequiresFullRender(oldConfig, newConfig) {
        const fullRenderKeys = ['nodeWidth', 'nodeHeightScale', 'nodePadding', 'layerSpacing'];
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
                    link.download = 'pulse-sankey-chart.png';
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
            link.download = 'pulse-sankey-chart.svg';
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
            link.download = 'pulse-financial-data.csv';
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