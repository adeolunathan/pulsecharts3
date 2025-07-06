/**
 * ChartFlowEditor - Edit flow modal UI for Sankey charts
 * 
 * This module provides a complete flow editing interface for Sankey charts.
 * It allows users to modify link properties including source/target nodes and values.
 */
(function() {
    'use strict';

    /**
     * Initialize flow editor modal UI
     * Creates the flow editor interface and binds events
     * @param {Function} onSaveFlow - Callback function when flow is saved
     * @param {Function} onDeleteFlow - Callback function when flow is deleted
     */
    function initializeFlowEditor(onSaveFlow, onDeleteFlow) {
        // Store the callbacks for later use
        this.onSaveFlowCallback = onSaveFlow;
        this.onDeleteFlowCallback = onDeleteFlow;
        
        // Remove existing flow editor
        d3.select('.flow-editor-modal').remove();
        
        // Create flow editor modal
        this.flowEditor = d3.select('body')
            .append('div')
            .attr('class', 'flow-editor-modal')
            .style('position', 'fixed')
            .style('top', '50%')
            .style('left', '50%')
            .style('transform', 'translate(-50%, -50%)')
            .style('width', '280px')
            .style('background', 'white')
            .style('border-radius', '8px')
            .style('box-shadow', '0 8px 32px rgba(0,0,0,0.15)')
            .style('z-index', '1000')
            .style('display', 'none')
            .style('font-family', '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif')
            .style('border', '1px solid rgba(0,0,0,0.08)');

        // Header with title and remove button
        const header = this.flowEditor.append('div')
            .style('display', 'flex')
            .style('justify-content', 'space-between')
            .style('align-items', 'center')
            .style('padding', '16px 16px 12px 16px')
            .style('border-bottom', '1px solid #e5e7eb');

        header.append('h3')
            .text('Edit flow')
            .style('margin', '0')
            .style('font-size', '16px')
            .style('font-weight', '600')
            .style('color', '#374151');

        // Remove button with trash icon
        header.append('button')
            .attr('class', 'remove-flow-btn')
            .html('🗑️')
            .style('background', 'none')
            .style('border', 'none')
            .style('font-size', '16px')
            .style('cursor', 'pointer')
            .style('padding', '4px')
            .style('border-radius', '4px')
            .style('color', '#ef4444')
            .style('transition', 'all 0.15s ease')
            .on('mouseover', function() {
                d3.select(this).style('background', '#fef2f2');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', 'none');
            })
            .on('click', () => deleteFlow.call(this));

        // Form container
        const form = this.flowEditor.append('div')
            .style('padding', '16px');

        // From field
        form.append('label')
            .text('From')
            .style('display', 'block')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .style('color', '#374151')
            .style('margin-bottom', '4px');

        const fromSelect = form.append('select')
            .attr('class', 'from-select')
            .style('width', '100%')
            .style('padding', '8px')
            .style('border', '1px solid #d1d5db')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('margin-bottom', '12px')
            .style('background', 'white');

        // To field
        form.append('label')
            .text('To')
            .style('display', 'block')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .style('color', '#374151')
            .style('margin-bottom', '4px');

        const toSelect = form.append('select')
            .attr('class', 'to-select')
            .style('width', '100%')
            .style('padding', '8px')
            .style('border', '1px solid #d1d5db')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('margin-bottom', '12px')
            .style('background', 'white');

        // Amount fields row
        const amountRow = form.append('div')
            .style('display', 'flex')
            .style('gap', '8px')
            .style('margin-bottom', '16px');

        // Amount current
        const currentColumn = amountRow.append('div')
            .style('flex', '1');

        currentColumn.append('label')
            .text('Current')
            .style('display', 'block')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .style('color', '#374151')
            .style('margin-bottom', '4px');

        const currentInput = currentColumn.append('input')
            .attr('type', 'number')
            .attr('class', 'amount-current')
            .style('width', '100%')
            .style('padding', '8px')
            .style('border', '1px solid #d1d5db')
            .style('border-radius', '4px')
            .style('font-size', '12px');

        // Amount previous
        const comparisonColumn = amountRow.append('div')
            .style('flex', '1');

        comparisonColumn.append('label')
            .text('Previous')
            .style('display', 'block')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .style('color', '#374151')
            .style('margin-bottom', '4px');

        const comparisonInput = comparisonColumn.append('input')
            .attr('type', 'number')
            .attr('class', 'amount-comparison')
            .style('width', '100%')
            .style('padding', '8px')
            .style('border', '1px solid #d1d5db')
            .style('border-radius', '4px')
            .style('font-size', '12px');

        // Action buttons
        const buttonRow = form.append('div')
            .style('display', 'flex')
            .style('gap', '8px');

        // Cancel button
        buttonRow.append('button')
            .text('Cancel')
            .style('flex', '1')
            .style('padding', '8px 16px')
            .style('background', '#f3f4f6')
            .style('color', '#374151')
            .style('border', '1px solid #d1d5db')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('font-weight', '500')
            .style('cursor', 'pointer')
            .style('transition', 'all 0.15s ease')
            .on('mouseover', function() {
                d3.select(this).style('background', '#e5e7eb');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', '#f3f4f6');
            })
            .on('click', () => hideFlowEditor.call(this));

        // Save button
        buttonRow.append('button')
            .text('Save')
            .style('flex', '1')
            .style('padding', '8px 16px')
            .style('background', '#3b82f6')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('font-weight', '500')
            .style('cursor', 'pointer')
            .style('transition', 'all 0.15s ease')
            .on('mouseover', function() {
                d3.select(this).style('background', '#2563eb');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', '#3b82f6');
            })
            .on('click', () => saveFlow.call(this));

        // Store references for easy access
        this.flowEditorElements = {
            fromSelect,
            toSelect,
            currentInput,
            comparisonInput
        };
    }

    /**
     * Show flow editor for a link
     * @param {Element} element - The DOM element that was clicked
     * @param {Object} linkData - Link data object
     * @param {Array} availableNodes - Array of available nodes for dropdowns
     */
    function showFlowEditor(element, linkData, availableNodes) {
        this.selectedElement = element;
        this.currentLinkData = linkData;
        this.isFlowEditorActive = true;
        
        // Populate dropdowns with available nodes
        populateNodeDropdowns.call(this, availableNodes);
        
        // Set current values
        this.flowEditorElements.fromSelect.property('value', linkData.source.id || linkData.source);
        this.flowEditorElements.toSelect.property('value', linkData.target.id || linkData.target);
        this.flowEditorElements.currentInput.property('value', linkData.value || '');
        this.flowEditorElements.comparisonInput.property('value', linkData.previousValue || '');
        
        this.flowEditor.style('display', 'block');
    }

    /**
     * Populate node dropdowns with available nodes
     * @param {Array} availableNodes - Array of available nodes
     */
    function populateNodeDropdowns(availableNodes) {
        if (!availableNodes || !Array.isArray(availableNodes)) {
            console.warn('⚠️ No available nodes provided for dropdowns');
            return;
        }

        // Clear existing options
        this.flowEditorElements.fromSelect.selectAll('option').remove();
        this.flowEditorElements.toSelect.selectAll('option').remove();

        // Add options to both dropdowns
        availableNodes.forEach(node => {
            const nodeId = node.id || node.name || node;
            const nodeLabel = nodeId;

            this.flowEditorElements.fromSelect.append('option')
                .attr('value', nodeId)
                .text(nodeLabel);

            this.flowEditorElements.toSelect.append('option')
                .attr('value', nodeId)
                .text(nodeLabel);
        });
    }

    /**
     * Hide flow editor modal
     */
    function hideFlowEditor() {
        this.isFlowEditorActive = false;
        this.selectedElement = null;
        this.currentLinkData = null;
        this.flowEditor.style('display', 'none');
    }

    /**
     * Save flow changes using chart-specific callback
     */
    function saveFlow() {
        if (!this.selectedElement || !this.currentLinkData) return;
        
        const updatedFlow = {
            originalLink: this.currentLinkData,
            source: this.flowEditorElements.fromSelect.property('value'),
            target: this.flowEditorElements.toSelect.property('value'),
            value: parseFloat(this.flowEditorElements.currentInput.property('value')) || 0,
            previousValue: parseFloat(this.flowEditorElements.comparisonInput.property('value')) || 0
        };
        
        // Call the chart-specific callback function
        if (this.onSaveFlowCallback && typeof this.onSaveFlowCallback === 'function') {
            this.onSaveFlowCallback(updatedFlow, this.selectedElement);
        } else {
            console.warn('⚠️ No save flow callback provided to ChartFlowEditor');
        }
        
        hideFlowEditor.call(this);
    }

    /**
     * Delete flow using chart-specific callback
     */
    function deleteFlow() {
        if (!this.selectedElement || !this.currentLinkData) return;
        
        // Call the chart-specific callback function
        if (this.onDeleteFlowCallback && typeof this.onDeleteFlowCallback === 'function') {
            this.onDeleteFlowCallback(this.currentLinkData, this.selectedElement);
        } else {
            console.warn('⚠️ No delete flow callback provided to ChartFlowEditor');
        }
        
        hideFlowEditor.call(this);
    }

    // Export functions to global namespace
    window.ChartFlowEditor = {
        initializeFlowEditor,
        showFlowEditor,
        hideFlowEditor,
        saveFlow,
        deleteFlow
    };

    // Debug: Confirm ChartFlowEditor is loaded
    console.log('✅ ChartFlowEditor utility loaded successfully');
    
    // Verify export worked
    if (typeof window.ChartFlowEditor === 'undefined') {
        console.error('❌ ChartFlowEditor export failed - window.ChartFlowEditor is undefined');
    } else {
        console.log('✅ ChartFlowEditor exported successfully with', Object.keys(window.ChartFlowEditor).length, 'functions');
    }

})();