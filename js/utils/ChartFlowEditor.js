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

        const fromContainer = form.append('div')
            .attr('class', 'from-container')
            .style('position', 'relative')
            .style('margin-bottom', '12px');

        const fromInput = fromContainer.append('input')
            .attr('type', 'text')
            .attr('class', 'from-input')
            .attr('placeholder', 'Type to search or create new...')
            .style('width', '100%')
            .style('padding', '8px')
            .style('border', '1px solid #d1d5db')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('background', 'white');

        const fromDropdown = fromContainer.append('div')
            .attr('class', 'from-dropdown')
            .style('position', 'absolute')
            .style('top', '100%')
            .style('left', '0')
            .style('right', '0')
            .style('background', 'white')
            .style('border', '1px solid #d1d5db')
            .style('border-top', 'none')
            .style('border-radius', '0 0 4px 4px')
            .style('max-height', '150px')
            .style('overflow-y', 'auto')
            .style('z-index', '1001')
            .style('display', 'none');

        // To field
        form.append('label')
            .text('To')
            .style('display', 'block')
            .style('font-size', '12px')
            .style('font-weight', '600')
            .style('color', '#374151')
            .style('margin-bottom', '4px');

        const toContainer = form.append('div')
            .attr('class', 'to-container')
            .style('position', 'relative')
            .style('margin-bottom', '12px');

        const toInput = toContainer.append('input')
            .attr('type', 'text')
            .attr('class', 'to-input')
            .attr('placeholder', 'Type to search or create new...')
            .style('width', '100%')
            .style('padding', '8px')
            .style('border', '1px solid #d1d5db')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('background', 'white');

        const toDropdown = toContainer.append('div')
            .attr('class', 'to-dropdown')
            .style('position', 'absolute')
            .style('top', '100%')
            .style('left', '0')
            .style('right', '0')
            .style('background', 'white')
            .style('border', '1px solid #d1d5db')
            .style('border-top', 'none')
            .style('border-radius', '0 0 4px 4px')
            .style('max-height', '150px')
            .style('overflow-y', 'auto')
            .style('z-index', '1001')
            .style('display', 'none');

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

        // Save & Reset button
        buttonRow.append('button')
            .text('💾🔄 Save & Sync')
            .style('flex', '1')
            .style('padding', '8px 16px')
            .style('background', '#059669')
            .style('color', 'white')
            .style('border', 'none')
            .style('border-radius', '4px')
            .style('font-size', '12px')
            .style('font-weight', '500')
            .style('cursor', 'pointer')
            .style('transition', 'all 0.15s ease')
            .on('mouseover', function() {
                d3.select(this).style('background', '#047857');
            })
            .on('mouseout', function() {
                d3.select(this).style('background', '#059669');
            })
            .on('click', () => resetTableFromModal.call(this));

        // Store references for easy access
        this.flowEditorElements = {
            fromInput,
            fromDropdown,
            toInput,
            toDropdown,
            currentInput,
            comparisonInput
        };

        // Set up autocomplete functionality for both inputs
        setupAutocomplete.call(this, fromInput, fromDropdown, 'from');
        setupAutocomplete.call(this, toInput, toDropdown, 'to');
    }

    /**
     * Set up autocomplete functionality for input fields
     * @param {Object} input - D3 input element
     * @param {Object} dropdown - D3 dropdown element  
     * @param {string} type - 'from' or 'to'
     */
    function setupAutocomplete(input, dropdown, type) {
        // Store available options
        this.availableOptions = this.availableOptions || [];
        
        // Input event handler for filtering
        input.on('input', () => {
            const value = input.property('value').toLowerCase();
            const filteredOptions = this.availableOptions.filter(option => 
                option.toLowerCase().includes(value)
            );
            
            // Show dropdown if there are matches or if input is not empty
            if (value.length > 0) {
                showDropdownOptions.call(this, dropdown, filteredOptions, value, input);
            } else {
                dropdown.style('display', 'none');
            }
        });
        
        // Focus event handler
        input.on('focus', () => {
            const value = input.property('value').toLowerCase();
            if (value.length > 0) {
                const filteredOptions = this.availableOptions.filter(option => 
                    option.toLowerCase().includes(value)
                );
                showDropdownOptions.call(this, dropdown, filteredOptions, value, input);
            }
        });
        
        // Blur event handler (with delay to allow dropdown clicks)
        input.on('blur', () => {
            setTimeout(() => {
                dropdown.style('display', 'none');
            }, 150);
        });
    }

    /**
     * Show dropdown options
     * @param {Object} dropdown - D3 dropdown element
     * @param {Array} options - Filtered options array
     * @param {string} inputValue - Current input value
     * @param {Object} input - D3 input element
     */
    function showDropdownOptions(dropdown, options, inputValue, input) {
        dropdown.selectAll('.dropdown-option').remove();
        
        // Add filtered options
        options.forEach(option => {
            const optionDiv = dropdown.append('div')
                .attr('class', 'dropdown-option')
                .style('padding', '8px')
                .style('cursor', 'pointer')
                .style('font-size', '12px')
                .style('border-bottom', '1px solid #f3f4f6')
                .style('transition', 'background 0.15s ease')
                .text(option)
                .on('mouseover', function() {
                    d3.select(this).style('background', '#f3f4f6');
                })
                .on('mouseout', function() {
                    d3.select(this).style('background', 'white');
                })
                .on('click', () => {
                    input.property('value', option);
                    dropdown.style('display', 'none');
                });
        });
        
        // Add "Create new" option if input doesn't match exactly
        const exactMatch = options.some(option => 
            option.toLowerCase() === inputValue.toLowerCase()
        );
        
        if (!exactMatch && inputValue.trim().length > 0) {
            const createOption = dropdown.append('div')
                .attr('class', 'dropdown-option create-new')
                .style('padding', '8px')
                .style('cursor', 'pointer')
                .style('font-size', '12px')
                .style('border-bottom', '1px solid #f3f4f6')
                .style('background', '#f8f9fa')
                .style('font-style', 'italic')
                .style('color', '#6b7280')
                .style('transition', 'background 0.15s ease')
                .text(`Create new: "${inputValue}"`)
                .on('mouseover', function() {
                    d3.select(this).style('background', '#e5e7eb');
                })
                .on('mouseout', function() {
                    d3.select(this).style('background', '#f8f9fa');
                })
                .on('click', () => {
                    input.property('value', inputValue);
                    dropdown.style('display', 'none');
                    // Add to available options for future use
                    if (!this.availableOptions.includes(inputValue)) {
                        this.availableOptions.push(inputValue);
                    }
                });
        }
        
        dropdown.style('display', options.length > 0 || inputValue.trim().length > 0 ? 'block' : 'none');
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
        
        // Populate available options for autocomplete
        populateAvailableOptions.call(this, availableNodes);
        
        // Set current values
        this.flowEditorElements.fromInput.property('value', linkData.source.id || linkData.source);
        this.flowEditorElements.toInput.property('value', linkData.target.id || linkData.target);
        this.flowEditorElements.currentInput.property('value', linkData.value || '');
        this.flowEditorElements.comparisonInput.property('value', linkData.previousValue || '');
        
        this.flowEditor.style('display', 'block');
    }

    /**
     * Populate available options for autocomplete
     * @param {Array} availableNodes - Array of available nodes
     */
    function populateAvailableOptions(availableNodes) {
        if (!availableNodes || !Array.isArray(availableNodes)) {
            console.warn('⚠️ No available nodes provided for autocomplete');
            return;
        }

        // Extract node IDs/names for autocomplete
        this.availableOptions = availableNodes.map(node => {
            return node.id || node.name || node;
        });
        
        console.log('📋 Available autocomplete options:', this.availableOptions);
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
            source: this.flowEditorElements.fromInput.property('value'),
            target: this.flowEditorElements.toInput.property('value'),
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
     * Save AND reset table from modal - combines save and reset functionality
     */
    function resetTableFromModal() {
        console.log('🔄💾 Save & Reset button clicked from modal - saving changes and updating table...');
        
        // STEP 1: Save the flow changes (same as Save button)
        if (!this.selectedElement || !this.currentLinkData) {
            console.warn('⚠️ No flow data to save');
            return;
        }
        
        const updatedFlow = {
            originalLink: this.currentLinkData,
            source: this.flowEditorElements.fromInput.property('value'),
            target: this.flowEditorElements.toInput.property('value'),
            value: parseFloat(this.flowEditorElements.currentInput.property('value')) || 0,
            previousValue: parseFloat(this.flowEditorElements.comparisonInput.property('value')) || 0
        };
        
        // Call the chart-specific save callback
        if (this.onSaveFlowCallback && typeof this.onSaveFlowCallback === 'function') {
            console.log('💾 Saving flow changes...');
            this.onSaveFlowCallback(updatedFlow, this.selectedElement);
            console.log('✅ Flow changes saved successfully');
        } else {
            console.warn('⚠️ No save flow callback provided to ChartFlowEditor');
            return;
        }
        
        // STEP 2: Reset the table (same as external reset button)
        // Give the save a moment to complete, then reset the table
        setTimeout(() => {
            if (typeof window.loadCurrentChartData === 'function') {
                console.log('🔄 Updating spreadsheet table...');
                window.loadCurrentChartData();
                console.log('✅ Save & Sync completed successfully - chart and table synchronized!');
            } else {
                console.warn('⚠️ loadCurrentChartData function not available');
            }
            
            // STEP 3: Close the modal automatically after sync is complete
            setTimeout(() => {
                console.log('🚪 Closing modal after successful save & sync');
                hideFlowEditor.call(this);
            }, 50);
        }, 100);
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