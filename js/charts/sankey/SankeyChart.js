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
            margin: { top: 60, right: 100, bottom: 60, left: 100 },
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
            linkOpacity: 1.0
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
        
        this.renderTitle();
        this.renderLinks();
        this.renderNodes();
        this.renderLabels();
        
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
        // IMPROVED: Group-based sorting for better logical flow
        const groupedNodes = this.groupAndSortNodes(nodes);
        
        const totalHeight = d3.sum(groupedNodes, d => d.height);
        const totalPadding = this.config.nodePadding * (groupedNodes.length - 1);
        const totalRequired = totalHeight + totalPadding;
        
        const startY = Math.max(20, (availableHeight - totalRequired) / 2);
        let currentY = startY;
        
        groupedNodes.forEach(node => {
            node.y = currentY;
            currentY += node.height + this.config.nodePadding;
        });
    }

    groupAndSortNodes(nodes) {
        // Group nodes by their logical grouping
        const groups = new Map();
        
        nodes.forEach(node => {
            const group = node.group || 'default';
            if (!groups.has(group)) {
                groups.set(group, []);
            }
            groups.get(group).push(node);
        });

        // Define group order for logical financial flow
        const groupOrder = [
            'revenue_sources',
            'aggregated_revenue', 
            'gross_metrics',
            'operating_metrics',
            'final_results',        // Net Income should come first in final layer
            'operating_expenses',   // Operating expenses grouped together
            'final_adjustments'     // Tax and other adjustments last
        ];

        const sortedNodes = [];
        
        // Process groups in logical order
        groupOrder.forEach(groupName => {
            if (groups.has(groupName)) {
                const groupNodes = groups.get(groupName);
                
                // Sort within group
                groupNodes.sort((a, b) => {
                    // First sort by explicit sort_order if available
                    if (a.sort_order !== undefined && b.sort_order !== undefined) {
                        return a.sort_order - b.sort_order;
                    }
                    
                    // Then by category priority (profits first, then expenses)
                    const categoryPriority = {
                        'income': 1,
                        'profit': 2,
                        'revenue': 3,
                        'expense': 4,
                        'cost': 5
                    };
                    
                    const aPriority = categoryPriority[a.category] || 6;
                    const bPriority = categoryPriority[b.category] || 6;
                    
                    if (aPriority !== bPriority) {
                        return aPriority - bPriority;
                    }
                    
                    // Finally by value (descending for most groups, ascending for adjustments)
                    if (groupName === 'final_adjustments') {
                        return a.value - b.value; // Ascending for adjustments
                    } else {
                        return b.value - a.value; // Descending for everything else
                    }
                });
                
                sortedNodes.push(...groupNodes);
            }
        });

        // Add any remaining ungrouped nodes
        groups.forEach((groupNodes, groupName) => {
            if (!groupOrder.includes(groupName)) {
                groupNodes.sort((a, b) => b.value - a.value);
                sortedNodes.push(...groupNodes);
            }
        });
        
        return sortedNodes;
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
        const title = this.svg.append('g')
            .attr('class', 'chart-title')
            .attr('transform', `translate(${this.config.width/2}, 35)`);

        title.append('text')
            .attr('text-anchor', 'middle')
            .attr('font-size', '24px')
            .attr('font-weight', '700')
            .attr('fill', '#1f2937')
            .attr('letter-spacing', '-0.5px')
            .text(this.data?.metadata?.title || 'Financial Flow Analysis');

        if (this.data?.metadata?.subtitle) {
            title.append('text')
                .attr('text-anchor', 'middle')
                .attr('y', 22)
                .attr('font-size', '14px')
                .attr('font-weight', '500')
                .attr('fill', '#6b7280')
                .text(this.data.metadata.subtitle);
        }

        // Add data source indicator
        if (this.data?.metadata?.source) {
            const sourceColor = this.data.metadata.source.includes('external file') ? '#27ae60' : 
                               this.data.metadata.source.includes('SIMULATION') ? '#f39c12' : '#6b7280';
            
            title.append('text')
                .attr('text-anchor', 'middle')
                .attr('y', 40)
                .attr('font-size', '11px')
                .attr('font-weight', '500')
                .attr('fill', sourceColor)
                .text(`Source: ${this.data.metadata.source}`);
        }
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
        this.nodes.forEach(node => {
            const labelGroup = this.chart.append('g')
                .attr('class', 'node-label')
                .attr('transform', `translate(${node.x + this.config.nodeWidth/2}, ${node.y - 12})`);

            // Node name
            labelGroup.append('text')
                .attr('text-anchor', 'middle')
                .attr('font-size', '12px')
                .attr('font-weight', '600')
                .attr('fill', '#374151')
                .attr('letter-spacing', '-0.2px')
                .text(this.wrapText(node.id, 18));

            // Node value
            labelGroup.append('text')
                .attr('text-anchor', 'middle')
                .attr('y', node.height + 24)
                .attr('font-size', '11px')
                .attr('font-weight', '500')
                .attr('fill', this.getNodeColor(node))
                .text(this.formatCurrency(node.value));
        });
    }

    // Utility methods
    wrapText(text, maxLength) {
        if (text.length <= maxLength) return text;
        const words = text.split(' ');
        if (words.length === 1) {
            return text.length > maxLength ? text.substring(0, maxLength-2) + '...' : text;
        }
        let result = words[0];
        for (let i = 1; i < words.length; i++) {
            if ((result + ' ' + words[i]).length <= maxLength) {
                result += ' ' + words[i];
            } else {
                break;
            }
        }
        return result + (result !== text ? '...' : '');
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
            income: '#9b59b6'
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
            '#9b59b6': '#bb8fce'
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
        this.renderNodes();
        this.renderLabels();
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