// Placeholder for SankeyRenderer.js
/* ===== SANKEY RENDERER MODULE ===== */
/* DOM manipulation and visual rendering */

(function() {
    'use strict';

    class SankeyRenderer {
        constructor(containerId, config) {
            this.containerId = containerId;
            this.config = config;
            this.container = d3.select(`#${containerId}`);
            this.svg = null;
            this.chart = null;
            this.defs = null;
            
            // Rendering state
            this.renderingState = {
                initialized: false,
                lastRenderTime: null,
                animationsActive: false
            };
            
            this.initializeSVG();
        }

        // Initialize SVG container and basic structure
        initializeSVG() {
            // Clear existing content
            this.container.selectAll('*').remove();
            
            // Get dimensions
            const width = this.config.get('layout.width');
            const height = this.config.get('layout.height');
            
            // Create main SVG
            this.svg = this.container
                .append('svg')
                .attr('class', 'pulse-sankey-chart')
                .attr('width', width)
                .attr('height', height)
                .attr('viewBox', `0 0 ${width} ${height}`)
                .attr('preserveAspectRatio', 'xMidYMid meet')
                .style('max-width', '100%')
                .style('display', 'block')
                .style('margin', '0 auto')
                .style('font-family', '"Inter", "Segoe UI", system-ui, sans-serif');
            
            // Create definitions for gradients, patterns, etc.
            this.defs = this.svg.append('defs');
            
            // Create chart group with margins
            const margin = this.config.get('layout.margin');
            this.chart = this.svg
                .append('g')
                .attr('class', 'chart-content')
                .attr('transform', `translate(${margin.left}, ${margin.top})`);
            
            // Add subtle background
            this.svg.insert('rect', ':first-child')
                .attr('class', 'chart-background')
                .attr('width', '100%')
                .attr('height', '100%')
                .attr('fill', '#fafbfc')
                .attr('opacity', 0.03);
            
            this.renderingState.initialized = true;
            console.log('SVG initialized successfully');
        }

        // Update SVG dimensions
        updateSVGDimensions(newDimensions) {
            const { width, height } = newDimensions;
            
            this.svg
                .attr('width', width)
                .attr('height', height)
                .attr('viewBox', `0 0 ${width} ${height}`);
            
            // Update chart group transform if margins changed
            const margin = this.config.get('layout.margin');
            this.chart.attr('transform', `translate(${margin.left}, ${margin.top})`);
            
            console.log(`SVG dimensions updated: ${width}x${height}`);
        }

        // Main rendering pipeline
        renderChart(layoutData, metadata) {
            console.log('Starting chart render...');
            this.renderingState.lastRenderTime = Date.now();
            
            // Clear existing chart elements (preserve background and structure)
            this.clearChartContent();
            
            // Render in proper order for correct layering
            this.renderTitle(metadata);
            this.renderLinks(layoutData.links);
            this.renderNodes(layoutData.nodes);
            this.renderLabels(layoutData.nodes);
            this.renderBranding();
            
            // Update rendering state
            this.renderingState.animationsActive = true;
            
            console.log('Chart render completed');
            return this;
        }

        // Clear chart content while preserving structure
        clearChartContent() {
            this.chart.selectAll('.sankey-link').remove();
            this.chart.selectAll('.sankey-node').remove();
            this.chart.selectAll('.node-label-group').remove();
            this.svg.selectAll('.chart-title').remove();
            this.svg.selectAll('.chart-branding').remove();
        }

        // Complete chart clear
        clearChart() {
            this.chart.selectAll('*').remove();
            this.svg.selectAll('.chart-title').remove();
            this.svg.selectAll('.chart-branding').remove();
            console.log('Chart cleared');
        }

        // Render chart title and subtitle
        renderTitle(metadata) {
            const width = this.config.get('layout.width');
            
            const titleGroup = this.svg.append('g')
                .attr('class', 'chart-title')
                .attr('transform', `translate(${width/2}, 30)`);

            // Main title
            titleGroup.append('text')
                .attr('text-anchor', 'middle')
                .attr('font-family', '"Inter", "Segoe UI", system-ui, sans-serif')
                .attr('font-size', '28px')
                .attr('font-weight', '700')
                .attr('fill', '#1f2937')
                .attr('letter-spacing', '-0.8px')
                .text(metadata?.title || 'Financial Flow Analysis');
                
            // Subtitle
            if (metadata?.subtitle) {
                titleGroup.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('y', 28)
                    .attr('font-size', '16px')
                    .attr('font-weight', '500')
                    .attr('fill', '#6b7280')
                    .text(metadata.subtitle);
            }
        }

        // Render all links with animations
        renderLinks(links) {
            console.log(`Rendering ${links.length} links...`);
            
            const linkGroups = this.chart.selectAll('.sankey-link')
                .data(links)
                .enter()
                .append('g')
                .attr('class', 'sankey-link')
                .attr('data-source', d => d.source.id)
                .attr('data-target', d => d.target.id);

            // Create paths with initial state
            const paths = linkGroups.append('path')
                .attr('d', d => d.path)
                .attr('fill', d => this.getLinkColor(d))
                .attr('fill-opacity', 0) // Start invisible
                .attr('stroke', 'none')
                .style('cursor', 'pointer')
                .style('transition', 'all 0.2s ease');

            // Animate link appearance with staggered timing
            paths.transition()
                .duration(this.config.get('interaction.animationDuration'))
                .delay((d, i) => i * 50)
                .attr('fill-opacity', 1.0) // Full opacity
                .ease(d3.easeCubicOut);

            return linkGroups;
        }

        // Render all nodes with animations
        renderNodes(nodes) {
            console.log(`Rendering ${nodes.length} nodes...`);
            
            const nodeGroups = this.chart.selectAll('.sankey-node')
                .data(nodes)
                .enter()
                .append('g')
                .attr('class', 'sankey-node')
                .attr('data-id', d => d.id)
                .attr('transform', d => `translate(${d.x}, ${d.y})`);

            // Create rectangles with initial state
            const rects = nodeGroups.append('rect')
                .attr('width', this.config.get('layout.nodeWidth'))
                .attr('height', 0) // Start with 0 height
                .attr('fill', d => this.getNodeColor(d))
                .attr('stroke', 'white')
                .attr('stroke-width', 2)
                .attr('rx', 0)
                .attr('ry', 0)
                .style('cursor', 'pointer')
                .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))')
                .style('transition', 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)');

            // Animate node growth with staggered timing
            rects.transition()
                .duration(this.config.get('interaction.animationDuration'))
                .delay((d, i) => i * 80)
                .attr('height', d => d.height)
                .ease(d3.easeCubicOut);

            return nodeGroups;
        }

        // Render all labels with smart positioning
        renderLabels(nodes) {
            console.log(`Rendering labels for ${nodes.length} nodes...`);
            
            const dimensions = this.config.getDimensions();
            const depths = [...new Set(nodes.map(n => n.depth))].sort((a, b) => a - b);
            const minDepth = Math.min(...depths);
            const maxDepth = Math.max(...depths);
            const chartBottom = dimensions.height * 0.8;
            
            nodes.forEach((node, index) => {
                const position = this.determineSmartLabelPosition(node, minDepth, maxDepth, chartBottom);
                const labelConfig = this.getLabelConfiguration(node, position);
                
                const labelGroup = this.chart.append('g')
                    .attr('class', 'node-label-group')
                    .attr('data-node-id', node.id)
                    .attr('transform', labelConfig.transform)
                    .style('opacity', 0); // Start invisible
                
                // Create wrapped text
                const wrappedText = this.smartWrapText(node.id, this.config.get('interaction.wrapThreshold'));
                const lineHeight = 16;
                const totalTextHeight = wrappedText.length * lineHeight;
                
                let textStartY;
                if (position === 'left' || position === 'right') {
                    textStartY = -(totalTextHeight / 2) + (lineHeight / 2);
                } else if (position === 'bottom') {
                    textStartY = 8;
                } else {
                    textStartY = -(totalTextHeight - 8);
                }
                
                // Add text lines
                wrappedText.forEach((line, i) => {
                    labelGroup.append('text')
                        .attr('x', 0)
                        .attr('y', textStartY + (i * lineHeight))
                        .attr('text-anchor', labelConfig.textAnchor)
                        .attr('font-family', '"Inter", "Segoe UI", system-ui, sans-serif')
                        .attr('font-size', '13px')
                        .attr('font-weight', '600')
                        .attr('fill', this.getNodeColor(node))
                        .attr('letter-spacing', '-0.3px')
                        .text(line);
                });
                
                // Add value label
                this.addValueLabel(labelGroup, node, position, totalTextHeight, labelConfig);
                
                // Animate label appearance
                labelGroup.transition()
                    .duration(this.config.get('interaction.animationDuration'))
                    .delay(index * 60 + 400) // After nodes appear
                    .style('opacity', 1)
                    .ease(d3.easeCubicOut);
            });
        }

        // Add value label to a node
        addValueLabel(labelGroup, node, position, textHeight, labelConfig) {
            if (position === 'left') {
                // Special positioning for left labels
                const valueDistance = this.config.get('interaction.valueDistance') || 8;
                const valueGroup = this.chart.append('g')
                    .attr('class', 'node-label-group')
                    .attr('transform', `translate(${node.x + this.config.get('layout.nodeWidth')/2}, ${node.y - valueDistance})`)
                    .style('opacity', 0);
                
                valueGroup.append('text')
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('text-anchor', 'middle')
                    .attr('font-family', '"Inter", "Segoe UI", system-ui, sans-serif')
                    .attr('font-size', '12px')
                    .attr('font-weight', '600')
                    .attr('fill', this.getNodeColor(node))
                    .text(this.formatCurrency(node.value));
                
                // Animate value label
                valueGroup.transition()
                    .duration(this.config.get('interaction.animationDuration'))
                    .delay(600)
                    .style('opacity', 1)
                    .ease(d3.easeCubicOut);
            } else {
                // Standard value positioning
                let valueY;
                if (position === 'bottom') {
                    valueY = 8 + textHeight + 10;
                } else if (position === 'right') {
                    valueY = (textHeight / 2) + 8;
                } else {
                    valueY = 10;
                }
                
                labelGroup.append('text')
                    .attr('x', 0)
                    .attr('y', valueY)
                    .attr('text-anchor', labelConfig.textAnchor)
                    .attr('font-family', '"Inter", "Segoe UI", system-ui, sans-serif')
                    .attr('font-size', '12px')
                    .attr('font-weight', '600')
                    .attr('fill', this.getNodeColor(node))
                    .text(this.formatCurrency(node.value));
            }
        }

        // Render professional branding
        renderBranding() {
            const width = this.config.get('layout.width');
            const height = this.config.get('layout.height');
            
            // Website attribution
            const branding = this.svg.append('g')
                .attr('class', 'chart-branding')
                .attr('transform', `translate(${width/2}, ${height - 20})`);
            
            branding.append('text')
                .attr('text-anchor', 'middle')
                .attr('font-family', '"Inter", "Segoe UI", system-ui, sans-serif')
                .attr('font-size', '13px')
                .attr('font-weight', '600')
                .attr('fill', '#4a5568')
                .text('pulse.financial-insights.com');
            
            // Brand logo
            const brandGroup = this.svg.append('g')
                .attr('class', 'brand-logo')
                .attr('transform', `translate(${width - 200}, ${height - 40})`);
            
            // Logo elements
            [
                { x: 0, fill: '#3b82f6' },
                { x: 10, fill: '#10b981' },
                { x: 20, fill: '#f59e0b' }
            ].forEach(({ x, fill }) => {
                brandGroup.append('rect')
                    .attr('x', x)
                    .attr('y', 0)
                    .attr('width', 8)
                    .attr('height', 8)
                    .attr('fill', fill)
                    .attr('rx', 1);
            });
            
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

        // Apply node styling based on data
        applyNodeStyling(nodeElement, nodeData) {
            nodeElement
                .attr('fill', this.getNodeColor(nodeData))
                .attr('stroke', 'white')
                .attr('stroke-width', 2)
                .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))');
        }

        // Apply link styling based on data
        applyLinkStyling(linkElement, linkData) {
            linkElement
                .attr('fill', this.getLinkColor(linkData))
                .attr('fill-opacity', 1.0)
                .attr('stroke', 'none');
        }

        // Get color for node based on category and properties
        getNodeColor(node) {
            // Enhanced vibrant color system
            const colorMap = {
                // Revenue Sources (Vibrant Blues)
                'recurring_revenue': '#0052CC',
                'semi_recurring_revenue': '#0073E6',
                'one_time_revenue': '#0091FF',
                'subscription_revenue': '#0052CC',
                'professional_services': '#0073E6',
                'platform_other': '#0091FF',
                
                // Positive Flows (Vibrant Teals/Greens)
                'gross_profit': '#00B894',
                'operating_profit': '#00A085',
                'net_profit': '#008F72',
                'net_income': '#008F72',
                'total_revenue': '#0091FF',
                'profit': '#00A085',
                
                // Negative Flows (Vibrant Reds/Oranges)
                'cost_of_revenue': '#FF6B35',
                'operating_expenses': '#E63946',
                'sales_marketing': '#E63946',
                'rd': '#E63946',
                'ga': '#E63946',
                'restructuring': '#E63946',
                'tax_expense': '#D63384',
                'other_expense': '#D63384',
                
                // Category fallbacks
                'revenue': '#0091FF',
                'cost': '#FF6B35',
                'expense': '#E63946',
                'income': '#00A085',
                'operations': '#00B894'
            };
            
            // Try multiple matching strategies
            const nodeCategory = (node.category || '').toLowerCase().replace(/[\s&]/g, '_');
            const nodeName = (node.id || '').toLowerCase().replace(/[\s&]/g, '_');
            const nodeType = (node.type || '').toLowerCase().replace(/[\s&]/g, '_');
            
            let color = colorMap[nodeCategory] || colorMap[nodeName] || colorMap[nodeType];
            
            // Smart categorization based on node properties
            if (!color) {
                const combinedText = `${nodeName} ${nodeCategory} ${nodeType}`.toLowerCase();
                
                if (node.depth === 0) {
                    // Revenue differentiation for source nodes
                    if (combinedText.includes('subscription') || combinedText.includes('recurring')) {
                        color = '#0052CC';
                    } else if (combinedText.includes('professional') || combinedText.includes('services')) {
                        color = '#0073E6';
                    } else {
                        color = '#0091FF';
                    }
                } else {
                    // Flow-based coloring for other nodes
                    if (combinedText.includes('profit') || combinedText.includes('income')) {
                        color = combinedText.includes('net') ? '#008F72' : 
                               combinedText.includes('operating') ? '#00A085' : '#00B894';
                    } else if (combinedText.includes('cost') || combinedText.includes('expense')) {
                        color = combinedText.includes('tax') ? '#D63384' : 
                               combinedText.includes('cost') ? '#FF6B35' : '#E63946';
                    } else if (combinedText.includes('revenue')) {
                        color = '#0091FF';
                    }
                }
            }
            
            return color || '#64748b'; // Fallback neutral gray
        }

        // Get color for link based on source node
        getLinkColor(link) {
            const baseColor = this.getNodeColor(link.source);
            
            // Create lighter versions for better hierarchy
            const lightColorMap = {
                '#0052CC': '#4A90E2',
                '#0073E6': '#5BA3F5',
                '#0091FF': '#52A7FF',
                '#00B894': '#4DD0B1',
                '#00A085': '#4DB8A3',
                '#008F72': '#4DAF95',
                '#FF6B35': '#FF8F66',
                '#E63946': '#F06B75',
                '#D63384': '#E366A3',
                '#64748b': '#94A3B8'
            };
            
            return lightColorMap[baseColor] || baseColor;
        }

        // Determine smart label position
        determineSmartLabelPosition(node, minDepth, maxDepth, chartBottom) {
            if (node.depth === minDepth) {
                return 'left';
            }
            if (node.depth === maxDepth) {
                return 'right';
            }
            if (node.y + node.height >= chartBottom) {
                return 'bottom';
            }
            return 'top';
        }

        // Get label configuration for positioning
        getLabelConfiguration(node, position) {
            const nodeCenter = node.x + (this.config.get('layout.nodeWidth') / 2);
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
                        transform: `translate(${node.x + this.config.get('layout.nodeWidth') + 10}, ${nodeMidY})`,
                        textAnchor: 'start'
                    };
                case 'bottom':
                    return {
                        transform: `translate(${nodeCenter}, ${nodeBottom})`,
                        textAnchor: 'middle'
                    };
                default: // 'top'
                    return {
                        transform: `translate(${nodeCenter}, ${nodeTop - 15})`,
                        textAnchor: 'middle'
                    };
            }
        }

        // Smart text wrapping
        smartWrapText(text, maxLength = 15) {
            if (text.length <= maxLength) return [text];
            
            const words = text.split(' ');
            const lines = [];
            let currentLine = '';
            
            words.forEach(word => {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                if (testLine.length > maxLength && currentLine) {
                    lines.push(currentLine);
                    currentLine = word;
                } else {
                    currentLine = testLine;
                }
            });
            
            if (currentLine) lines.push(currentLine);
            return lines.length > 2 ? [lines[0], lines[1] + '...'] : lines;
        }

        // Format currency values
        formatCurrency(value) {
            if (value >= 1000) {
                return `$${(value / 1000).toFixed(1)}B`;
            } else if (value >= 1) {
                return `$${value.toFixed(0)}M`;
            } else {
                return `$${(value * 1000).toFixed(0)}K`;
            }
        }

        // Animation management
        animateNodes(nodes, duration) {
            const nodeElements = this.chart.selectAll('.sankey-node');
            
            nodeElements.transition()
                .duration(duration || this.config.get('interaction.animationDuration'))
                .ease(d3.easeCubicOut);
            
            this.renderingState.animationsActive = true;
            setTimeout(() => {
                this.renderingState.animationsActive = false;
            }, duration || this.config.get('interaction.animationDuration'));
        }

        animateLinks(links, duration) {
            const linkElements = this.chart.selectAll('.sankey-link');
            
            linkElements.select('path').transition()
                .duration(duration || this.config.get('interaction.animationDuration'))
                .ease(d3.easeCubicOut);
        }

        // Get rendering state information
        getRenderingState() {
            return { ...this.renderingState };
        }

        // Get SVG element for export
        getSVGElement() {
            return this.svg;
        }

        // Get chart dimensions
        getChartDimensions() {
            return {
                width: this.config.get('layout.width'),
                height: this.config.get('layout.height'),
                contentArea: this.config.getDimensions()
            };
        }

        // Debug method to highlight elements
        highlightElement(selector, duration = 2000) {
            const element = this.chart.select(selector);
            if (!element.empty()) {
                element.style('outline', '2px solid red')
                    .style('outline-offset', '2px');
                
                setTimeout(() => {
                    element.style('outline', null)
                        .style('outline-offset', null);
                }, duration);
            }
        }
    }

    // Export the renderer class
    window.SankeyRenderer = SankeyRenderer;

})();