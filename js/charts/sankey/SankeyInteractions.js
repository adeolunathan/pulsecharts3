// Placeholder for SankeyInteractions.js
/* ===== SANKEY INTERACTIONS MODULE ===== */
/* User interaction and event handling */

(function() {
    'use strict';

    class SankeyInteractions {
        constructor(renderer, config) {
            this.renderer = renderer;
            this.config = config;
            this.tooltip = null;
            this.interactionState = {
                hoveredNode: null,
                hoveredLink: null,
                highlightedElements: new Set(),
                tooltipVisible: false,
                keyboardEnabled: false
            };
            
            // Interaction settings
            this.settings = {
                enableHover: true,
                enableClick: true,
                enableKeyboard: false,
                tooltipDelay: 100,
                highlightDuration: 300,
                fadeOpacity: 0.2
            };
            
            this.initializeTooltip();
        }

        // Initialize tooltip element
        initializeTooltip() {
            // Remove existing tooltip
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
                .style('border', '1px solid rgba(255,255,255,0.1)')
                .style('max-width', '280px')
                .style('line-height', '1.4');
        }

        // Bind all event listeners
        bindEvents() {
            this.bindNodeEvents();
            this.bindLinkEvents();
            
            if (this.settings.enableKeyboard) {
                this.bindKeyboardEvents();
            }
            
            // Global mouse move for tooltip positioning
            d3.select('body').on('mousemove.sankey-tooltip', (event) => {
                if (this.interactionState.tooltipVisible) {
                    this.updateTooltipPosition(event);
                }
            });
            
            console.log('Sankey interactions bound successfully');
        }

        // Unbind all event listeners
        unbindEvents() {
            const chart = this.renderer.chart;
            
            chart.selectAll('.sankey-node')
                .on('mouseover', null)
                .on('mouseout', null)
                .on('click', null);
            
            chart.selectAll('.sankey-link')
                .on('mouseover', null)
                .on('mouseout', null)
                .on('click', null);
            
            d3.select('body').on('mousemove.sankey-tooltip', null);
            d3.select('body').on('keydown.sankey', null);
            
            this.hideTooltip();
            console.log('Sankey interactions unbound');
        }

        // Bind node interaction events
        bindNodeEvents() {
            const chart = this.renderer.chart;
            const nodes = chart.selectAll('.sankey-node');
            
            nodes
                .on('mouseover', (event, nodeData) => {
                    if (this.settings.enableHover) {
                        this.handleNodeHover(nodeData, event.currentTarget, event);
                    }
                })
                .on('mouseout', (event, nodeData) => {
                    if (this.settings.enableHover) {
                        this.handleNodeLeave(nodeData, event.currentTarget);
                    }
                })
                .on('click', (event, nodeData) => {
                    if (this.settings.enableClick) {
                        this.handleNodeClick(nodeData, event.currentTarget, event);
                    }
                })
                .on('mousemove', (event) => {
                    if (this.interactionState.tooltipVisible) {
                        this.updateTooltipPosition(event);
                    }
                });
        }

        // Bind link interaction events
        bindLinkEvents() {
            const chart = this.renderer.chart;
            const links = chart.selectAll('.sankey-link');
            
            links
                .on('mouseover', (event, linkData) => {
                    if (this.settings.enableHover) {
                        this.handleLinkHover(linkData, event.currentTarget, event);
                    }
                })
                .on('mouseout', (event, linkData) => {
                    if (this.settings.enableHover) {
                        this.handleLinkLeave(linkData, event.currentTarget);
                    }
                })
                .on('click', (event, linkData) => {
                    if (this.settings.enableClick) {
                        this.handleLinkClick(linkData, event.currentTarget, event);
                    }
                })
                .on('mousemove', (event) => {
                    if (this.interactionState.tooltipVisible) {
                        this.updateTooltipPosition(event);
                    }
                });
        }

        // Bind keyboard events for accessibility
        bindKeyboardEvents() {
            d3.select('body').on('keydown.sankey', (event) => {
                this.handleKeyboard(event);
            });
        }

        // Handle node hover
        handleNodeHover(nodeData, element, event) {
            this.interactionState.hoveredNode = nodeData;
            
            // Visual feedback on the node
            d3.select(element).select('rect')
                .style('filter', 'drop-shadow(0 6px 16px rgba(0,0,0,0.2))')
                .style('transform', 'scale(1.02)');
            
            // Highlight connected elements
            this.highlightConnectedElements(nodeData);
            
            // Show tooltip with delay
            setTimeout(() => {
                if (this.interactionState.hoveredNode === nodeData) {
                    this.showNodeTooltip(nodeData, event);
                }
            }, this.settings.tooltipDelay);
        }

        // Handle node leave
        handleNodeLeave(nodeData, element) {
            this.interactionState.hoveredNode = null;
            
            // Reset node visual state
            d3.select(element).select('rect')
                .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))')
                .style('transform', 'scale(1)');
            
            // Reset highlighting
            this.resetHighlighting();
            
            // Hide tooltip
            this.hideTooltip();
        }

        // Handle node click
        handleNodeClick(nodeData, element, event) {
            console.log('Node clicked:', nodeData.id);
            
            // Dispatch custom event for external listeners
            const customEvent = new CustomEvent('sankeyNodeClick', {
                detail: {
                    node: nodeData,
                    element: element,
                    originalEvent: event
                }
            });
            document.dispatchEvent(customEvent);
            
            // Optional: Toggle selection state
            this.toggleNodeSelection(nodeData, element);
        }

        // Handle link hover
        handleLinkHover(linkData, element, event) {
            this.interactionState.hoveredLink = linkData;
            
            // Visual feedback on the link
            d3.select(element).select('path')
                .attr('fill-opacity', 1.0)
                .style('filter', 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))');
            
            // Dim other links
            this.renderer.chart.selectAll('.sankey-link')
                .filter(link => link !== linkData)
                .select('path')
                .attr('fill-opacity', this.settings.fadeOpacity);
            
            // Show tooltip with delay
            setTimeout(() => {
                if (this.interactionState.hoveredLink === linkData) {
                    this.showLinkTooltip(linkData, event);
                }
            }, this.settings.tooltipDelay);
        }

        // Handle link leave
        handleLinkLeave(linkData, element) {
            this.interactionState.hoveredLink = null;
            
            // Reset all links to full opacity
            this.renderer.chart.selectAll('.sankey-link path')
                .attr('fill-opacity', 1.0)
                .style('filter', 'none');
            
            // Hide tooltip
            this.hideTooltip();
        }

        // Handle link click
        handleLinkClick(linkData, element, event) {
            console.log('Link clicked:', `${linkData.source.id} → ${linkData.target.id}`);
            
            // Dispatch custom event
            const customEvent = new CustomEvent('sankeyLinkClick', {
                detail: {
                    link: linkData,
                    element: element,
                    originalEvent: event
                }
            });
            document.dispatchEvent(customEvent);
        }

        // Handle keyboard navigation
        handleKeyboard(event) {
            if (!this.settings.enableKeyboard) return;
            
            switch (event.key) {
                case 'Tab':
                    event.preventDefault();
                    this.navigateToNextElement(event.shiftKey);
                    break;
                case 'Enter':
                case ' ':
                    event.preventDefault();
                    this.activateCurrentElement();
                    break;
                case 'Escape':
                    this.resetHighlighting();
                    this.hideTooltip();
                    break;
            }
        }

        // Show tooltip for node
        showNodeTooltip(nodeData, event) {
            const totalInflow = nodeData.targetLinks ? 
                nodeData.targetLinks.reduce((sum, link) => sum + link.value, 0) : 0;
            const totalOutflow = nodeData.sourceLinks ? 
                nodeData.sourceLinks.reduce((sum, link) => sum + link.value, 0) : 0;
            
            const content = this.createNodeTooltipContent(nodeData, totalInflow, totalOutflow);
            this.showTooltip(content, event);
        }

        // Show tooltip for link
        showLinkTooltip(linkData, event) {
            const percentage = linkData.source.value > 0 ? 
                ((linkData.value / linkData.source.value) * 100).toFixed(1) : '0';
            
            const content = this.createLinkTooltipContent(linkData, percentage);
            this.showTooltip(content, event);
        }

        // Create node tooltip content
        createNodeTooltipContent(nodeData, totalInflow, totalOutflow) {
            const flows = [];
            if (totalInflow > 0) {
                flows.push(`Inflow: ${this.formatCurrency(totalInflow)}`);
            }
            if (totalOutflow > 0) {
                flows.push(`Outflow: ${this.formatCurrency(totalOutflow)}`);
            }
            
            return `
                <div style="font-weight: 700; margin-bottom: 8px; font-size: 14px;">${nodeData.id}</div>
                <div style="font-size: 16px; font-weight: 600; color: #3b82f6; margin-bottom: 8px;">
                    ${this.formatCurrency(nodeData.value)}
                </div>
                <div style="font-size: 11px; color: rgba(255,255,255,0.8); line-height: 1.4;">
                    ${flows.join('<br>')}
                    ${flows.length > 0 ? '<br>' : ''}
                    ${nodeData.description || 'Financial flow component'}
                </div>
            `;
        }

        // Create link tooltip content
        createLinkTooltipContent(linkData, percentage) {
            return `
                <div style="font-weight: 700; margin-bottom: 8px; font-size: 14px;">
                    ${linkData.source.id} → ${linkData.target.id}
                </div>
                <div style="font-size: 16px; font-weight: 600; color: #3b82f6; margin-bottom: 8px;">
                    ${this.formatCurrency(linkData.value)}
                </div>
                <div style="font-size: 11px; color: rgba(255,255,255,0.8); line-height: 1.4;">
                    ${percentage}% of source flow<br>
                    Type: ${linkData.type || 'Flow'}
                </div>
            `;
        }

        // Show tooltip at position
        showTooltip(content, event) {
            this.tooltip
                .html(content)
                .style('opacity', 1);
            
            this.updateTooltipPosition(event);
            this.interactionState.tooltipVisible = true;
        }

        // Update tooltip position
        updateTooltipPosition(event) {
            if (!this.interactionState.tooltipVisible) return;
            
            const tooltipNode = this.tooltip.node();
            const tooltipRect = tooltipNode.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            let left = event.pageX;
            let top = event.pageY - 10;
            
            // Adjust horizontal position to keep tooltip in viewport
            if (left + tooltipRect.width / 2 > viewportWidth - 20) {
                left = viewportWidth - tooltipRect.width / 2 - 20;
            }
            if (left - tooltipRect.width / 2 < 20) {
                left = tooltipRect.width / 2 + 20;
            }
            
            // Adjust vertical position to keep tooltip in viewport
            if (top - tooltipRect.height < 20) {
                top = event.pageY + 30; // Show below cursor instead
            }
            
            this.tooltip
                .style('left', left + 'px')
                .style('top', top + 'px');
        }

        // Hide tooltip
        hideTooltip() {
            this.tooltip.style('opacity', 0);
            this.interactionState.tooltipVisible = false;
        }

        // Highlight connected elements for a node
        highlightConnectedElements(nodeData) {
            const chart = this.renderer.chart;
            const connectedLinks = [...(nodeData.sourceLinks || []), ...(nodeData.targetLinks || [])];
            const connectedNodeIds = new Set();
            
            // Collect connected node IDs
            connectedLinks.forEach(link => {
                connectedNodeIds.add(link.source.id);
                connectedNodeIds.add(link.target.id);
            });
            
            // Dim non-connected links
            chart.selectAll('.sankey-link')
                .select('path')
                .attr('fill-opacity', link => 
                    connectedLinks.includes(link) ? 1.0 : this.settings.fadeOpacity
                );
            
            // Optionally highlight connected nodes
            chart.selectAll('.sankey-node')
                .select('rect')
                .style('opacity', node => 
                    connectedNodeIds.has(node.id) ? 1.0 : 0.7
                );
            
            // Store highlighted elements for cleanup
            this.interactionState.highlightedElements = new Set(connectedLinks.map(l => l.id));
        }

        // Reset all highlighting
        resetHighlighting() {
            const chart = this.renderer.chart;
            
            // Reset all links to full opacity
            chart.selectAll('.sankey-link path')
                .attr('fill-opacity', 1.0)
                .style('filter', 'none');
            
            // Reset all nodes to full opacity
            chart.selectAll('.sankey-node rect')
                .style('opacity', 1.0);
            
            // Clear highlighted elements set
            this.interactionState.highlightedElements.clear();
        }

        // Toggle node selection state
        toggleNodeSelection(nodeData, element) {
            const rect = d3.select(element).select('rect');
            const isSelected = rect.classed('selected');
            
            if (isSelected) {
                rect.classed('selected', false)
                    .style('stroke', 'white')
                    .style('stroke-width', '2px');
            } else {
                rect.classed('selected', true)
                    .style('stroke', '#3b82f6')
                    .style('stroke-width', '3px');
            }
            
            // Dispatch selection event
            const customEvent = new CustomEvent('sankeyNodeSelection', {
                detail: {
                    node: nodeData,
                    selected: !isSelected
                }
            });
            document.dispatchEvent(customEvent);
        }

        // Keyboard navigation (accessibility)
        navigateToNextElement(reverse = false) {
            // Implementation for keyboard navigation
            console.log('Navigate to next element (reverse:', reverse, ')');
        }

        // Activate current element (accessibility)
        activateCurrentElement() {
            console.log('Activate current element');
        }

        // Announce for screen readers (accessibility)
        announceForScreenReader(text) {
            const announcement = document.createElement('div');
            announcement.setAttribute('aria-live', 'polite');
            announcement.setAttribute('aria-atomic', 'true');
            announcement.style.position = 'absolute';
            announcement.style.left = '-10000px';
            announcement.style.width = '1px';
            announcement.style.height = '1px';
            announcement.style.overflow = 'hidden';
            announcement.textContent = text;
            
            document.body.appendChild(announcement);
            
            setTimeout(() => {
                document.body.removeChild(announcement);
            }, 1000);
        }

        // Add keyboard navigation support
        addKeyboardNavigation() {
            this.settings.enableKeyboard = true;
            
            // Make nodes focusable
            const chart = this.renderer.chart;
            chart.selectAll('.sankey-node')
                .attr('tabindex', 0)
                .on('focus', (event, nodeData) => {
                    this.handleNodeHover(nodeData, event.currentTarget, event);
                    this.announceForScreenReader(`Node: ${nodeData.id}, Value: ${this.formatCurrency(nodeData.value)}`);
                })
                .on('blur', (event, nodeData) => {
                    this.handleNodeLeave(nodeData, event.currentTarget);
                });
            
            // Make links focusable
            chart.selectAll('.sankey-link')
                .attr('tabindex', 0)
                .on('focus', (event, linkData) => {
                    this.handleLinkHover(linkData, event.currentTarget, event);
                    this.announceForScreenReader(`Flow from ${linkData.source.id} to ${linkData.target.id}, Value: ${this.formatCurrency(linkData.value)}`);
                })
                .on('blur', (event, linkData) => {
                    this.handleLinkLeave(linkData, event.currentTarget);
                });
            
            this.bindKeyboardEvents();
            console.log('Keyboard navigation enabled');
        }

        // Remove keyboard navigation
        removeKeyboardNavigation() {
            this.settings.enableKeyboard = false;
            
            const chart = this.renderer.chart;
            chart.selectAll('.sankey-node')
                .attr('tabindex', null)
                .on('focus', null)
                .on('blur', null);
            
            chart.selectAll('.sankey-link')
                .attr('tabindex', null)
                .on('focus', null)
                .on('blur', null);
            
            d3.select('body').on('keydown.sankey', null);
            console.log('Keyboard navigation disabled');
        }

        // Format currency for display
        formatCurrency(value) {
            if (value >= 1000) {
                return `$${(value / 1000).toFixed(1)}B`;
            } else if (value >= 1) {
                return `$${value.toFixed(1)}M`;
            } else {
                return `$${(value * 1000).toFixed(0)}K`;
            }
        }

        // Update interaction settings
        updateSettings(newSettings) {
            this.settings = { ...this.settings, ...newSettings };
            
            // Re-bind events if necessary
            if (newSettings.hasOwnProperty('enableKeyboard')) {
                if (newSettings.enableKeyboard) {
                    this.addKeyboardNavigation();
                } else {
                    this.removeKeyboardNavigation();
                }
            }
            
            console.log('Interaction settings updated:', this.settings);
        }

        // Get current interaction state
        getInteractionState() {
            return {
                ...this.interactionState,
                settings: { ...this.settings }
            };
        }

        // Cleanup method
        destroy() {
            this.unbindEvents();
            
            if (this.tooltip) {
                this.tooltip.remove();
                this.tooltip = null;
            }
            
            this.interactionState = {
                hoveredNode: null,
                hoveredLink: null,
                highlightedElements: new Set(),
                tooltipVisible: false,
                keyboardEnabled: false
            };
            
            console.log('Sankey interactions destroyed');
        }
    }

    // Export the interactions class
    window.SankeyInteractions = SankeyInteractions;

})();