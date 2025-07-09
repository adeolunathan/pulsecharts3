/* ===== UNIFIED SPREADSHEET EDITOR FOR ALL CHART TYPES ===== */
/* Combines best features from both Sankey and Bar chart data editors */

class UnifiedSpreadsheetEditor {
    constructor(containerId, chartInstance, chartType = 'sankey') {
        this.container = document.getElementById(containerId);
        this.chart = chartInstance;
        this.chartType = chartType;
        this.data = [];
        this.columns = [];
        this.selectedCell = null;
        this.selectedCells = new Set();
        this.isEditing = false;
        this.selectionStart = null;
        this.clipboard = null;
        this.isDragging = false;
        
        // Chart-specific configurations
        this.chartConfigs = {
            sankey: {
                columns: [
                    { id: 'source', label: 'From', type: 'text', required: true },
                    { id: 'target', label: 'To', type: 'text', required: true },
                    { id: 'value', label: 'Current', type: 'number', required: true },
                    { id: 'previousValue', label: 'Previous', type: 'number', required: false },
                    { id: 'description', label: 'Description', type: 'text', required: false }
                ],
                dataFormat: 'flows',
                title: '🌊 Flow Data Editor'
            },
            bar: {
                columns: [
                    { id: 'category', label: 'Category', type: 'text', required: true },
                    { id: 'value', label: 'Value', type: 'number', required: true }
                ],
                dataFormat: 'categories',
                title: '📊 Bar Chart Data Editor',
                allowDynamicColumns: true
            }
        };
        
        this.currentConfig = this.chartConfigs[chartType] || this.chartConfigs.sankey;
        this.columns = [...this.currentConfig.columns];
        
        this.init();
    }

    init() {
        if (!this.container) {
            console.error('Unified spreadsheet container not found');
            return;
        }
        this.createSpreadsheetInterface();
        this.setupEventListeners();
        this.loadInitialData();
    }

    createSpreadsheetInterface() {
        this.container.innerHTML = `
            <div class="unified-spreadsheet-container" style="max-width: 1200px; margin: 0 auto;">
                <!-- Enhanced Toolbar -->
                <div class="spreadsheet-toolbar" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 12px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; color: white;">
                    <div>
                        <h3 style="margin: 0; color: white; font-size: 16px; font-weight: 600;">${this.currentConfig.title}</h3>
                        <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.8); font-size: 13px;">Universal data editor with Excel-like functionality</p>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        ${this.currentConfig.allowDynamicColumns ? `
                        <button class="add-column-btn" style="padding: 6px 12px; background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;" title="Add new column">
                            ➕ Column
                        </button>` : ''}
                        <button class="paste-btn" style="padding: 6px 12px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;" title="Paste from clipboard (or use Ctrl+V)">
                            📋 Paste
                        </button>
                        <button class="paste-dataset-btn" style="padding: 6px 12px; background: #8b5cf6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;" title="Replace all data with clipboard content (including headers)">
                            📊 Replace All
                        </button>
                        <button class="add-row-btn" style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                            ➕ Row
                        </button>
                        <button class="clear-btn" style="padding: 6px 12px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                            🗑 Clear
                        </button>
                        <button class="test-paste-btn" style="padding: 6px 12px; background: #f59e0b; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;" title="Test paste with sample data">
                            🧪 Test
                        </button>
                    </div>
                </div>
                
                <!-- Enhanced Spreadsheet Table -->
                <div class="spreadsheet-wrapper" tabindex="0" style="background: white; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); outline: none; position: relative;">
                    <div style="overflow-x: auto;">
                        <table class="unified-spreadsheet-table" style="width: 100%; min-width: 600px; border-collapse: collapse; font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;">
                            <thead class="spreadsheet-header" style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-bottom: 2px solid #cbd5e0;">
                                <!-- Dynamic headers will be generated -->
                            </thead>
                            <tbody class="spreadsheet-tbody">
                                <!-- Dynamic rows will be generated -->
                            </tbody>
                        </table>
                    </div>
                    <div class="paste-hint" style="position: absolute; top: 10px; right: 10px; background: rgba(59, 130, 246, 0.1); color: #3b82f6; padding: 4px 8px; border-radius: 4px; font-size: 11px; pointer-events: none; opacity: 0; transition: opacity 0.3s; z-index: 10;">
                        📋 Ready for paste! Use Ctrl+V
                    </div>
                </div>
                
                <!-- Enhanced Status Bar -->
                <div class="spreadsheet-status" style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding: 8px 12px; background: #f9fafb; border-radius: 4px; border: 1px solid #f3f4f6;">
                    <div style="color: #6b7280; font-size: 12px;">
                        <span class="row-count">0 rows</span> × <span class="col-count">0 cols</span> • Click to edit • Cmd+V/Ctrl+V to paste • Tab/Enter to navigate
                    </div>
                    <div style="color: #6b7280; font-size: 12px;">
                        <span class="selected-cell-info">No cell selected</span>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        const container = this.container;
        
        // Button event listeners
        container.querySelector('.paste-btn').addEventListener('click', () => this.handlePasteButton());
        container.querySelector('.paste-dataset-btn').addEventListener('click', () => this.handlePasteDatasetButton());
        container.querySelector('.add-row-btn').addEventListener('click', () => this.addRow());
        container.querySelector('.clear-btn').addEventListener('click', () => this.clearData());
        container.querySelector('.test-paste-btn').addEventListener('click', () => this.testPaste());
        
        // Dynamic column button (only for bar charts)
        const addColumnBtn = container.querySelector('.add-column-btn');
        if (addColumnBtn) {
            addColumnBtn.addEventListener('click', () => this.addColumn());
        }
        
        // Enhanced focus management for paste functionality
        const wrapper = container.querySelector('.spreadsheet-wrapper');
        const pasteHint = container.querySelector('.paste-hint');
        
        // Store reference for focus management
        this.spreadsheetWrapper = wrapper;
        
        // SUPER AGGRESSIVE focus management - CRITICAL for paste functionality
        
        // Make wrapper always focusable and ready for paste
        wrapper.setAttribute('tabindex', '0');
        wrapper.style.outline = 'none'; // Remove default focus outline, we have custom styling
        
        // MOST IMPORTANT: Always keep wrapper focused
        const ensureFocus = () => {
            if (document.activeElement !== wrapper) {
                wrapper.focus();
                console.log('📋 Ensuring wrapper focus, active element is now:', document.activeElement);
            }
        };
        
        // Focus wrapper on ANY interaction with the spreadsheet
        container.addEventListener('click', (e) => {
            console.log('📋 Container clicked, forcing wrapper focus');
            ensureFocus();
        });
        
        container.addEventListener('mousedown', (e) => {
            console.log('📋 Container mousedown, forcing wrapper focus');
            ensureFocus();
        });
        
        wrapper.addEventListener('mousedown', (e) => {
            console.log('📋 Wrapper mousedown, ensuring focus');
            ensureFocus();
        });
        
        // Keep focus on wrapper when it gets focus
        wrapper.addEventListener('focus', () => {
            wrapper.style.borderColor = '#3b82f6';
            wrapper.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.1)';
            pasteHint.style.opacity = '1';
            console.log('📋 ✅ Wrapper focused and ready for paste');
        });
        
        wrapper.addEventListener('blur', (e) => {
            wrapper.style.borderColor = '#e5e7eb';
            wrapper.style.boxShadow = 'none';
            pasteHint.style.opacity = '0';
            console.log('📋 ⚠️ Wrapper lost focus, will try to refocus');
            
            // Try to regain focus after a short delay if we're still the active spreadsheet
            setTimeout(() => {
                if (this.selectedCell) {
                    ensureFocus();
                }
            }, 50);
        });
        
        // Aggressively focus wrapper on page interactions
        document.addEventListener('click', (e) => {
            if (container.contains(e.target)) {
                ensureFocus();
            }
        });
        
        // Ensure wrapper can receive focus immediately and keep it
        setTimeout(() => {
            ensureFocus();
            console.log('📋 Initial wrapper focus set');
        }, 100);
        
        // Keep checking focus every 100ms when a cell is selected
        setInterval(() => {
            if (this.selectedCell && document.activeElement !== wrapper) {
                console.log('📋 Focus drift detected, refocusing wrapper');
                ensureFocus();
            }
        }, 100);
        
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Cell interaction handlers (delegated)
        container.addEventListener('click', (e) => this.handleCellClick(e));
        container.addEventListener('dblclick', (e) => this.handleCellDoubleClick(e));
        
        // Add keypress handler for immediate typing
        document.addEventListener('keypress', (e) => this.handleKeypress(e));
        
        // CRITICAL: Enhanced paste event handling with aggressive focus management
        
        // Primary paste handler on the wrapper (most reliable)
        wrapper.addEventListener('paste', (e) => {
            console.log('📋 Paste event on wrapper:', e);
            this.handlePaste(e);
        });
        
        // Secondary paste handler on container as fallback
        container.addEventListener('paste', (e) => {
            console.log('📋 Paste event on container:', e);
            this.handlePaste(e);
        });
        
        // SUPER AGGRESSIVE: Global paste listener - handle ALL paste events if we have a selected cell
        document.addEventListener('paste', (e) => {
            console.log('📋 🚨 GLOBAL PASTE EVENT DETECTED 🚨');
            console.log('📋 Event target:', e.target);
            console.log('📋 Active element:', document.activeElement);
            console.log('📋 Selected cell exists:', !!this.selectedCell);
            console.log('📋 Container contains target:', container.contains(e.target));
            
            // SUPER AGGRESSIVE: If we have a selected cell, we handle ALL paste events
            const shouldHandlePaste = 
                this.selectedCell ||  // We have a selected cell (most important)
                document.activeElement === wrapper ||  // Wrapper is focused
                container.contains(e.target) ||  // Event target is within our container
                wrapper.contains(document.activeElement);  // Focus is within wrapper
            
            console.log('📋 Should handle paste?', shouldHandlePaste);
            
            if (shouldHandlePaste) {
                console.log('📋 🎯 HANDLING PASTE EVENT');
                e.preventDefault();
                e.stopPropagation();
                
                // Force focus on wrapper
                wrapper.focus();
                this.handlePaste(e);
            } else {
                console.log('📋 ❌ Ignoring paste - no interaction with spreadsheet yet');
            }
        });
        
        // BACKUP: Listen for Ctrl+V specifically on the wrapper
        wrapper.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
                console.log('📋 Ctrl+V detected directly on wrapper - triggering paste');
                e.preventDefault();
                
                // Try to get clipboard data directly
                navigator.clipboard.readText().then(text => {
                    if (text) {
                        console.log('📋 Got clipboard text via direct API, processing...');
                        this.processPasteData(text);
                    }
                }).catch(err => {
                    console.log('📋 Clipboard API failed, will rely on paste event:', err);
                });
            }
        });
        
        // Listen for chart type changes to refresh data
        window.addEventListener('chartTypeChanged', (e) => {
            console.log('📊 UnifiedSpreadsheetEditor: Chart type changed event received:', e.detail);
            this.switchChartType(e.detail.newType);
        });
    }

    switchChartType(newChartType) {
        console.log(`🔄 Switching spreadsheet from ${this.chartType} to ${newChartType}`);
        
        // Update chart type and configuration
        this.chartType = newChartType;
        this.currentConfig = this.chartConfigs[newChartType] || this.chartConfigs.sankey;
        this.columns = [...this.currentConfig.columns];
        
        // Clear existing data when switching chart types
        this.data = [];
        
        // Recreate interface with new configuration
        this.createSpreadsheetInterface();
        this.setupEventListeners();
        this.loadInitialData();
    }

    loadInitialData() {
        console.log('📊 UnifiedSpreadsheetEditor: Loading initial data...');
        
        // Check if there's existing data in the chart
        const chartData = window.pulseApp?.currentData;
        
        if (chartData && this.hasValidChartData(chartData)) {
            console.log('📊 Found existing chart data, loading it into editor');
            this.loadExistingChartData(chartData);
            
            // Immediately sync editor data back to chart to establish connection
            setTimeout(() => {
                console.log('📊 Syncing loaded data back to chart to establish connection');
                this.updateChart();
            }, 100);
        } else {
            console.log('📊 No chart data found, starting with empty state');
            // Start with one empty row for user input
            this.data = [this.createEmptyRow()];
            
            // Clear the chart to show empty state
            setTimeout(() => {
                console.log('📊 Clearing chart to show empty state for user input');
                this.updateChart();
            }, 100);
        }
        
        this.render();
        
        // CRITICAL: Auto-select first cell to enable paste immediately
        setTimeout(() => {
            const firstCell = this.container.querySelector('.spreadsheet-cell');
            if (firstCell && !this.selectedCell) {
                console.log('📋 Auto-selecting first cell to enable paste');
                this.selectCell(firstCell);
            }
        }, 200);
        
        console.log('📊 UnifiedSpreadsheetEditor: Initialization complete');
    }

    hasValidChartData(chartData) {
        if (this.chartType === 'bar') {
            return chartData && (chartData.categories || chartData.values || chartData.series);
        } else if (this.chartType === 'sankey') {
            return chartData && (chartData.flows || (chartData.nodes && chartData.links));
        }
        return false;
    }

    loadExistingChartData(chartData) {
        try {
            if (this.chartType === 'bar') {
                this.loadBarChartData(chartData);
            } else if (this.chartType === 'sankey') {
                this.loadSankeyChartData(chartData);
            }
            console.log('📊 Successfully loaded chart data into editor');
        } catch (error) {
            console.error('⚠️ Error loading chart data:', error);
            this.data = [this.createEmptyRow()];
        }
    }

    loadBarChartData(chartData) {
        if (chartData.categories && chartData.values && !chartData.series) {
            // Single series format
            this.data = chartData.categories.map((category, index) => ({
                category: category,
                value: chartData.values[index] || 0
            }));
            
            this.columns = [
                { id: 'category', label: 'Category', type: 'text', required: true },
                { id: 'value', label: 'Value', type: 'number', required: true }
            ];
        } else if (chartData.categories && chartData.series) {
            // Multi-series format
            this.data = chartData.categories.map((category, index) => {
                const row = { category: category };
                chartData.series.forEach((series, seriesIndex) => {
                    const columnId = seriesIndex === 0 ? 'value' : `value_${seriesIndex + 1}`;
                    row[columnId] = series.data[index] || 0;
                });
                return row;
            });
            
            this.columns = [
                { id: 'category', label: 'Category', type: 'text', required: true }
            ];
            chartData.series.forEach((series, index) => {
                const columnId = index === 0 ? 'value' : `value_${index + 1}`;
                this.columns.push({
                    id: columnId,
                    label: series.name || `Value ${index + 1}`,
                    type: 'number',
                    required: index === 0
                });
            });
        }
    }

    loadSankeyChartData(chartData) {
        // Handle different Sankey data formats
        let flows = [];
        
        if (chartData.flows) {
            flows = chartData.flows;
        } else if (chartData.links) {
            // Convert D3 Sankey format to flow format
            flows = chartData.links.map((link, index) => ({
                id: `flow_${index}`,
                source: link.source.id || link.source,
                target: link.target.id || link.target,
                value: link.value,
                previousValue: link.previousValue || 0,
                description: link.description || ''
            }));
        }
        
        this.data = flows.map(flow => ({
            source: flow.source || '',
            target: flow.target || '',
            value: flow.value || 0,
            previousValue: flow.previousValue || 0,
            description: flow.description || ''
        }));
        
        // Ensure we have the standard Sankey columns
        this.columns = [
            { id: 'source', label: 'From', type: 'text', required: true },
            { id: 'target', label: 'To', type: 'text', required: true },
            { id: 'value', label: 'Current', type: 'number', required: true },
            { id: 'previousValue', label: 'Previous', type: 'number', required: false },
            { id: 'description', label: 'Description', type: 'text', required: false }
        ];
    }

    createEmptyRow() {
        const row = {};
        this.columns.forEach(column => {
            if (column.type === 'number') {
                row[column.id] = 0;
            } else {
                row[column.id] = '';
            }
        });
        return row;
    }

    render() {
        this.renderHeaders();
        this.renderRows();
        this.updateStatus();
    }

    renderHeaders() {
        const thead = this.container.querySelector('.spreadsheet-header');
        thead.innerHTML = '';
        
        // Controls row (only for dynamic column charts like bar)
        if (this.currentConfig.allowDynamicColumns) {
            const controlRow = document.createElement('tr');
            controlRow.style.cssText = 'background: #f8fafc; border-bottom: 1px solid #e2e8f0;';
            
            // Row number control header
            const rowNumControl = document.createElement('th');
            rowNumControl.innerHTML = '#';
            rowNumControl.style.cssText = `
                padding: 8px; text-align: center; font-size: 11px; font-weight: 600; 
                color: #64748b; width: 50px; border-right: 1px solid #cbd5e0; background: #f1f5f9;
            `;
            controlRow.appendChild(rowNumControl);
            
            // Column controls
            this.columns.forEach((column) => {
                const th = document.createElement('th');
                const typeIcon = column.type === 'number' ? '🔢' : '📝';
                const typeLabel = column.type === 'number' ? 'Numeric' : 'Text';
                th.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 4px;">
                        <button class="column-type-toggle" data-col="${column.id}" style="padding: 2px 6px; background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 3px; cursor: pointer; font-size: 10px; font-weight: 500;" title="Toggle column type: ${typeLabel}">
                            ${typeIcon} ${typeLabel}
                        </button>
                        ${this.columns.length > 2 ? `<button class="delete-column-btn" data-col="${column.id}" style="padding: 2px 6px; background: #fee2e2; color: #dc2626; border: none; border-radius: 3px; cursor: pointer; font-size: 10px; font-weight: 500;" title="Delete column">× Delete</button>` : ''}
                    </div>
                `;
                th.style.cssText = `
                    padding: 6px 8px; text-align: left; font-size: 11px; 
                    color: #64748b; border-right: 1px solid #cbd5e0; min-width: 140px; background: #f8fafc;
                `;
                controlRow.appendChild(th);
            });
            
            thead.appendChild(controlRow);
            
            // Setup control event listeners
            thead.querySelectorAll('.column-type-toggle').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleColumnType(btn.dataset.col);
                });
            });
            
            thead.querySelectorAll('.delete-column-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deleteColumn(btn.dataset.col);
                });
            });
        }
        
        // Header cells row
        const headerRow = document.createElement('tr');
        
        // Row number for header row
        const rowNumHeader = document.createElement('th');
        rowNumHeader.innerHTML = 'H';
        rowNumHeader.style.cssText = `
            padding: 8px; text-align: center; font-size: 12px; font-weight: 600; 
            color: #475569; width: 50px; border-right: 1px solid #cbd5e0; background: #f1f5f9;
        `;
        headerRow.appendChild(rowNumHeader);
        
        // Header cells
        this.columns.forEach((column) => {
            const td = document.createElement('td');
            td.dataset.row = 'header';
            td.dataset.col = column.id;
            td.className = 'header-cell spreadsheet-cell';
            
            const cellContent = document.createElement('div');
            cellContent.className = 'cell-content';
            cellContent.textContent = column.name || column.label || `Column ${column.id}`;
            
            td.appendChild(cellContent);
            td.style.cssText = `
                padding: 8px 12px; border: 1px solid #e5e7eb; border-right: 1px solid #cbd5e0;
                background: #f9fafb; font-weight: 600; color: #374151; cursor: pointer;
                min-width: 140px; position: relative;
            `;
            
            headerRow.appendChild(td);
        });
        
        thead.appendChild(headerRow);
    }

    renderRows() {
        const tbody = this.container.querySelector('.spreadsheet-tbody');
        tbody.innerHTML = '';
        
        // Ensure we have at least one row
        if (this.data.length === 0) {
            this.data.push(this.createEmptyRow());
        }
        
        this.data.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');
            tr.className = 'spreadsheet-row';
            
            // Row number
            const rowNumCell = document.createElement('td');
            rowNumCell.innerHTML = rowIndex + 1;
            rowNumCell.style.cssText = `
                padding: 8px; background: #f8fafc; text-align: center; color: #64748b; 
                font-weight: 500; font-size: 12px; border-right: 1px solid #e2e8f0; 
                border-bottom: 1px solid #f1f5f9;
            `;
            tr.appendChild(rowNumCell);
            
            // Dynamic data cells
            this.columns.forEach(column => {
                const td = document.createElement('td');
                td.className = 'spreadsheet-cell';
                td.dataset.row = rowIndex;
                td.dataset.col = column.id;
                td.style.cssText = `
                    padding: 0; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #f1f5f9; 
                    position: relative; cursor: text;
                `;
                
                const cellContent = document.createElement('div');
                cellContent.className = 'cell-content';
                cellContent.style.cssText = `
                    padding: 8px 12px; min-height: 20px; background: transparent;
                    text-align: ${column.type === 'number' ? 'right' : 'left'};
                `;
                cellContent.textContent = this.formatCellValueSafe(row[column.id] || '', column.type);
                
                td.appendChild(cellContent);
                tr.appendChild(td);
            });
            
            // Delete row button
            const deleteCell = document.createElement('td');
            deleteCell.style.cssText = `
                padding: 8px; text-align: center; border-bottom: 1px solid #f1f5f9;
            `;
            deleteCell.innerHTML = `
                <button class="delete-row-btn" data-row="${rowIndex}" style="padding: 4px 6px; background: #fee2e2; color: #dc2626; border: none; border-radius: 3px; cursor: pointer; font-size: 11px;" title="Delete row">
                    🗑
                </button>
            `;
            tr.appendChild(deleteCell);
            
            tbody.appendChild(tr);
        });
        
        // Setup delete row button handlers
        tbody.querySelectorAll('.delete-row-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const rowIndex = parseInt(btn.dataset.row);
                this.deleteRow(rowIndex);
            });
        });
    }

    formatCellValue(value, type) {
        if (type === 'number') {
            return typeof value === 'number' ? value.toLocaleString() : (value || '0');
        }
        return this.escapeHtml(value || '');
    }

    formatCellValueSafe(value, type) {
        if (type === 'number') {
            return typeof value === 'number' ? value.toLocaleString() : (value || '0');
        }
        return String(value || '');
    }

    handleCellClick(e) {
        const cell = e.target.closest('.spreadsheet-cell') || e.target.closest('.header-cell');
        if (!cell) return;
        
        // Check if this is a second click on the already selected cell
        if (this.selectedCell === cell && !this.isEditing) {
            // Second click on selected cell starts editing
            this.editCell(cell);
        } else {
            // First click just selects the cell
            this.selectCell(cell);
        }
    }

    handleCellDoubleClick(e) {
        const cell = e.target.closest('.spreadsheet-cell') || e.target.closest('.header-cell');
        if (!cell) return;
        
        // Double click starts editing
        e.preventDefault();
        this.editCell(cell);
    }

    selectCell(cell) {
        // Remove previous selection
        this.container.querySelectorAll('.spreadsheet-cell, .header-cell').forEach(c => {
            c.style.backgroundColor = '';
            c.style.outline = '';
        });
        
        // Select new cell
        if (cell.classList.contains('header-cell')) {
            cell.style.backgroundColor = '#e0e7ff';
            cell.style.outline = '2px solid #6366f1';
        } else {
            cell.style.backgroundColor = '#dbeafe';
            cell.style.outline = '2px solid #3b82f6';
        }
        this.selectedCell = cell;
        
        // CRITICAL: Ensure wrapper stays focused for paste functionality
        if (this.spreadsheetWrapper) {
            // Force focus on wrapper for paste events
            this.spreadsheetWrapper.focus();
            console.log('📋 Cell selected, wrapper focused for paste. Active element:', document.activeElement);
            
            // Double-check focus after a brief delay
            setTimeout(() => {
                if (document.activeElement !== this.spreadsheetWrapper) {
                    console.log('📋 Focus lost, refocusing wrapper...');
                    this.spreadsheetWrapper.focus();
                }
            }, 10);
        }
        
        // Update status
        const row = cell.dataset.row;
        const col = cell.dataset.col;
        const column = this.columns.find(c => c.id === col);
        const statusInfo = this.container.querySelector('.selected-cell-info');
        
        if (row === 'header') {
            statusInfo.textContent = `Header: ${column ? (column.name || column.label) : col}`;
        } else {
            statusInfo.textContent = `${column ? (column.name || column.label) : col} ${parseInt(row) + 1}`;
        }
    }

    editCell(cell, initialChar = null) {
        if (this.isEditing) return;
        
        this.isEditing = true;
        const content = cell.querySelector('.cell-content');
        const column = this.columns.find(c => c.id === cell.dataset.col);
        const isHeaderCell = cell.dataset.row === 'header';
        
        let currentValue;
        if (isHeaderCell) {
            currentValue = column.name || column.label || `Column ${column.id}`;
        } else {
            currentValue = this.getCellValue(cell);
        }
        
        // Create input
        const input = document.createElement('input');
        input.type = (!isHeaderCell && column.type === 'number') ? 'number' : 'text';
        
        // Set initial value
        if (initialChar) {
            input.value = initialChar;
        } else {
            input.value = currentValue;
        }
        
        input.style.cssText = `
            width: 100%; height: 100%; border: none; outline: none; 
            padding: 8px 12px; font-family: inherit; font-size: inherit;
            background: white; text-align: ${(!isHeaderCell && column.type === 'number') ? 'right' : 'left'};
        `;
        
        // Replace content with input
        content.innerHTML = '';
        content.appendChild(input);
        input.focus();
        
        // Select all text or position cursor
        if (initialChar) {
            input.setSelectionRange(1, 1);
        } else {
            input.select();
        }
        
        // Handle input completion
        const finishEdit = () => {
            if (!this.isEditing) return;
            this.isEditing = false;
            
            const newValue = input.value;
            
            if (isHeaderCell) {
                // Update column name
                column.name = newValue.trim() || `Column ${column.id}`;
                column.label = column.name;
                content.textContent = column.name;
            } else {
                // Update cell value
                this.setCellValue(cell, newValue);
                
                // Restore content display
                const row = parseInt(cell.dataset.row);
                const col = cell.dataset.col;
                const column = this.columns.find(c => c.id === col);
                content.textContent = this.formatCellValueSafe(this.data[row][col], column.type);
            }
            
            // Update chart
            setTimeout(() => {
                this.updateChart();
            }, 10);
        };
        
        input.addEventListener('blur', finishEdit);
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                finishEdit();
                this.navigateCell('down');
            } else if (e.key === 'Tab') {
                e.preventDefault();
                finishEdit();
                this.navigateCell(e.shiftKey ? 'left' : 'right');
            } else if (e.key === 'Escape') {
                this.isEditing = false;
                this.render(); // Restore original value
            }
        });
    }

    getCellValue(cell) {
        const row = cell.dataset.row;
        const col = cell.dataset.col;
        const column = this.columns.find(c => c.id === col);
        
        if (row === 'header') {
            return column.name || column.label || `Column ${column.id}`;
        } else {
            return this.data[parseInt(row)][col];
        }
    }

    setCellValue(cell, value) {
        const row = cell.dataset.row;
        const col = cell.dataset.col;
        const column = this.columns.find(c => c.id === col);
        
        if (row === 'header') {
            column.name = value.trim() || `Column ${column.id}`;
            column.label = column.name;
        } else {
            const rowIndex = parseInt(row);
            if (column.type === 'number') {
                this.data[rowIndex][col] = this.parseNumber(value);
            } else {
                this.data[rowIndex][col] = value;
            }
        }
    }

    handleKeydown(e) {
        // SUPER AGGRESSIVE: Handle Ctrl+V/Cmd+V ALWAYS if we have a selected cell
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
            console.log('📋 🚨 CTRL+V/CMD+V DETECTED 🚨');
            console.log('📋 Selected cell:', this.selectedCell);
            console.log('📋 Active element:', document.activeElement);
            console.log('📋 Wrapper element:', this.spreadsheetWrapper);
            
            // SUPER AGGRESSIVE: If we have ANY selected cell, handle the paste
            const shouldHandlePaste = 
                this.selectedCell ||  // Most important - user has interacted with spreadsheet
                document.activeElement === this.spreadsheetWrapper ||
                this.container.contains(document.activeElement);
            
            console.log('📋 Should handle paste from keyboard?', shouldHandlePaste);
            
            if (shouldHandlePaste) {
                e.preventDefault();
                e.stopPropagation();
                console.log('📋 🎯 HANDLING CTRL+V FOR SPREADSHEET');
                
                // Force focus on wrapper
                if (this.spreadsheetWrapper) {
                    this.spreadsheetWrapper.focus();
                    console.log('📋 Focused wrapper, active element now:', document.activeElement);
                }
                
                // Try async clipboard API FIRST (most reliable)
                navigator.clipboard.readText().then(text => {
                    if (text && text.trim()) {
                        console.log('📋 ✅ SUCCESS! Got clipboard text:', text.substring(0, 100) + '...');
                        this.processPasteData(text);
                    } else {
                        console.log('📋 No text in async clipboard, trying fallback');
                        this.handlePasteButton();
                    }
                }).catch(err => {
                    console.log('📋 Async clipboard failed, trying fallback:', err);
                    this.handlePasteButton();
                });
                
                return; // Exit early for paste handling
            } else {
                console.log('📋 ❌ Not handling paste - no spreadsheet interaction');
            }
        }
        
        if (this.isEditing) return;
        
        // Handle other keyboard shortcuts
        if (!this.selectedCell) {
            return;
        } else if (e.key === 'Tab') {
            e.preventDefault();
            this.navigateCell(e.shiftKey ? 'left' : 'right');
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.navigateCell('up');
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.navigateCell('down');
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            this.navigateCell('left');
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            this.navigateCell('right');
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();
            this.setCellValue(this.selectedCell, '');
            this.render();
            this.updateChart();
        }
    }

    handleKeypress(e) {
        // Only handle if we have a selected cell and we're not already editing
        if (!this.selectedCell || this.isEditing) return;
        
        // Ignore special keys
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        
        // Ignore navigation keys
        if (['Enter', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
        
        // Start editing with the typed character
        e.preventDefault();
        this.editCell(this.selectedCell, e.key);
    }

    navigateCell(direction) {
        if (!this.selectedCell) return;
        
        const currentRow = parseInt(this.selectedCell.dataset.row);
        const currentColId = this.selectedCell.dataset.col;
        const currentColIndex = this.columns.findIndex(c => c.id === currentColId);
        
        let newRow = currentRow;
        let newColIndex = currentColIndex;
        
        switch (direction) {
            case 'up':
                newRow = Math.max(0, currentRow - 1);
                break;
            case 'down':
                if (currentRow + 1 >= this.data.length) {
                    this.addRow();
                }
                newRow = Math.min(this.data.length - 1, currentRow + 1);
                break;
            case 'left':
                newColIndex = Math.max(0, currentColIndex - 1);
                break;
            case 'right':
                newColIndex = Math.min(this.columns.length - 1, currentColIndex + 1);
                break;
        }
        
        const newColId = this.columns[newColIndex].id;
        const newCell = this.container.querySelector(`[data-row="${newRow}"][data-col="${newColId}"]`);
        if (newCell) {
            this.selectCell(newCell);
        }
    }

    async handlePasteButton() {
        try {
            const text = await navigator.clipboard.readText();
            if (text && text.trim()) {
                this.processPasteData(text);
                return;
            } else {
                if (!this.selectedCell && this.container.querySelector('.spreadsheet-cell')) {
                    this.selectCell(this.container.querySelector('.spreadsheet-cell'));
                }
                return;
            }
        } catch (err) {
            console.log('Clipboard access denied. Please use Ctrl+V to paste.');
            if (!this.selectedCell && this.container.querySelector('.spreadsheet-cell')) {
                this.selectCell(this.container.querySelector('.spreadsheet-cell'));
            }
        }
    }

    handlePaste(e) {
        console.log('📋 Paste event triggered!', e);
        console.log('📋 Event target:', e.target);
        console.log('📋 Document active element:', document.activeElement);
        console.log('📋 Clipboard data available:', !!e.clipboardData);
        
        e.preventDefault();
        e.stopPropagation();
        
        // Try multiple clipboard data formats
        let text = null;
        
        if (e.clipboardData) {
            console.log('📋 Clipboard data types:', Array.from(e.clipboardData.types));
            
            const formats = ['text/plain', 'text/csv', 'text/tab-separated-values', 'text/html'];
            
            for (const format of formats) {
                try {
                    const data = e.clipboardData.getData(format);
                    if (data && data.trim()) {
                        text = data;
                        console.log(`📋 Got data from format: ${format}, length: ${data.length}`);
                        break;
                    }
                } catch (err) {
                    console.log(`📋 Failed to get data from format: ${format}`, err);
                }
            }
            
            // Try HTML extraction if needed
            if (!text && e.clipboardData.getData('text/html')) {
                console.log('📋 Trying to extract from HTML format');
                text = this.extractTextFromHTML(e.clipboardData.getData('text/html'));
            }
        } else {
            console.warn('📋 No clipboard data object available');
        }
        
        if (!text || !text.trim()) {
            console.warn('📋 No clipboard data found, trying async clipboard API...');
            this.handlePasteButton();
            return;
        }
        
        console.log('📋 Processing paste data, length:', text.length);
        this.processPasteData(text);
    }

    extractTextFromHTML(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        const table = tempDiv.querySelector('table');
        if (table) {
            const rows = Array.from(table.querySelectorAll('tr'));
            return rows.map(row => {
                const cells = Array.from(row.querySelectorAll('td, th'));
                return cells.map(cell => cell.textContent.trim()).join('\t');
            }).join('\n');
        }
        
        return tempDiv.textContent || tempDiv.innerText || '';
    }

    processPasteData(text) {
        if (!text || !text.trim()) return;
        
        console.log('📋 Processing paste data:', text.substring(0, 200) + '...');
        
        const { delimiter, lines } = this.parseClipboardData(text);
        console.log('📋 Detected delimiter:', delimiter === '\t' ? 'TAB' : delimiter);
        console.log('📋 Parsed lines count:', lines.length);
        
        if (lines.length === 0) {
            console.warn('⚠️ No valid data lines found');
            return;
        }
        
        // Determine where to start pasting
        let startRow = 0;
        let startColIndex = 0;
        let shouldUpdateHeaders = false;
        
        if (this.selectedCell) {
            if (this.selectedCell.dataset.row === 'header') {
                const firstLineValues = lines[0];
                const hasLikelyHeaders = lines.length > 1 && firstLineValues.some(cell => 
                    cell && cell.trim() && isNaN(parseFloat(cell.trim()))
                );
                
                if (hasLikelyHeaders) {
                    shouldUpdateHeaders = true;
                    startRow = 0;
                } else {
                    startRow = 0;
                }
                startColIndex = this.columns.findIndex(c => c.id === this.selectedCell.dataset.col);
            } else {
                startRow = parseInt(this.selectedCell.dataset.row);
                startColIndex = this.columns.findIndex(c => c.id === this.selectedCell.dataset.col);
            }
        }
        
        // Add columns if needed (for dynamic charts)
        if (this.currentConfig.allowDynamicColumns) {
            let maxColumnsNeeded = startColIndex;
            lines.forEach(values => {
                maxColumnsNeeded = Math.max(maxColumnsNeeded, startColIndex + values.length - 1);
            });
            
            while (this.columns.length <= maxColumnsNeeded) {
                this.addColumn();
            }
        }
        
        // Handle header updates if needed
        if (shouldUpdateHeaders && lines.length > 0) {
            const headerValues = lines[0];
            headerValues.forEach((headerValue, valueIndex) => {
                const targetColIndex = startColIndex + valueIndex;
                if (targetColIndex < this.columns.length) {
                    const column = this.columns[targetColIndex];
                    column.name = (headerValue || '').trim() || `Column ${column.id}`;
                    column.label = column.name;
                }
            });
        }
        
        // Paste data
        const dataLines = shouldUpdateHeaders ? lines.slice(1) : lines;
        dataLines.forEach((values, lineIndex) => {
            const targetRow = startRow + lineIndex;
            
            // Expand data array if needed
            while (this.data.length <= targetRow) {
                this.data.push(this.createEmptyRow());
            }
            
            // Paste values
            values.forEach((value, valueIndex) => {
                const targetColIndex = startColIndex + valueIndex;
                if (targetColIndex < this.columns.length) {
                    const targetCol = this.columns[targetColIndex];
                    const cleanValue = (value || '').trim();
                    
                    if (targetCol.type === 'number') {
                        this.data[targetRow][targetCol.id] = this.parseNumber(cleanValue);
                    } else {
                        this.data[targetRow][targetCol.id] = cleanValue;
                    }
                }
            });
        });
        
        this.render();
        this.updateChart();
        
        console.log('✅ Pasted data successfully');
    }

    parseClipboardData(text) {
        const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const rawLines = normalizedText.trim().split('\n');
        
        // Auto-detect delimiter
        const possibleDelimiters = ['\t', ',', ';', '|'];
        let bestDelimiter = '\t';
        let maxColumns = 0;
        
        for (const delimiter of possibleDelimiters) {
            const testLines = rawLines.slice(0, Math.min(3, rawLines.length));
            let totalColumns = 0;
            let validLines = 0;
            
            testLines.forEach(line => {
                const parsed = this.parseCSVLine(line, delimiter);
                if (parsed.length > 1) {
                    totalColumns += parsed.length;
                    validLines++;
                }
            });
            
            const avgColumns = validLines > 0 ? totalColumns / validLines : 0;
            if (avgColumns > maxColumns) {
                maxColumns = avgColumns;
                bestDelimiter = delimiter;
            }
        }
        
        const lines = rawLines
            .map(line => this.parseCSVLine(line, bestDelimiter))
            .filter(values => values.length > 0 && values.some(v => v.trim() !== ''));
        
        return { delimiter: bestDelimiter, lines };
    }

    parseCSVLine(line, delimiter) {
        const values = [];
        let current = '';
        let inQuotes = false;
        let i = 0;
        
        while (i < line.length) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i += 2;
                } else {
                    inQuotes = !inQuotes;
                    i++;
                }
            } else if (char === delimiter && !inQuotes) {
                values.push(current);
                current = '';
                i++;
            } else {
                current += char;
                i++;
            }
        }
        
        values.push(current);
        
        return values.map(value => {
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            return value.trim();
        });
    }

    parseNumber(value) {
        if (value === null || value === undefined || value === '') {
            return 0;
        }
        
        let cleanValue = String(value).trim();
        
        // Remove currency symbols
        cleanValue = cleanValue.replace(/[$€£¥₹₽₿₩₽₴₸₺₼₾₨₦₡₱₪₡]/g, '');
        
        // Handle percentage
        if (cleanValue.endsWith('%')) {
            cleanValue = cleanValue.slice(0, -1);
            const num = parseFloat(cleanValue);
            return isNaN(num) ? 0 : num / 100;
        }
        
        // Handle parentheses as negative
        if (cleanValue.startsWith('(') && cleanValue.endsWith(')')) {
            cleanValue = '-' + cleanValue.slice(1, -1);
        }
        
        // Handle thousands separators
        if (cleanValue.includes(',')) {
            if (/,\d{3}(?!\d)/.test(cleanValue)) {
                cleanValue = cleanValue.replace(/,(?=\d{3}(?!\d))/g, '');
            } else if (/^\d+,\d+$/.test(cleanValue)) {
                cleanValue = cleanValue.replace(',', '.');
            }
        }
        
        const num = parseFloat(cleanValue);
        return isNaN(num) ? 0 : num;
    }

    async handlePasteDatasetButton() {
        try {
            const text = await navigator.clipboard.readText();
            if (text && text.trim()) {
                this.processFullDatasetPaste(text);
            }
        } catch (err) {
            console.log('Clipboard access denied. Copy your dataset first, then try again.');
        }
    }

    processFullDatasetPaste(text) {
        if (!text || !text.trim()) return;
        
        console.log('📋 Processing full dataset replacement');
        
        const { lines } = this.parseClipboardData(text);
        
        if (lines.length < 2) {
            alert('Dataset must have at least a header row and one data row.');
            return;
        }
        
        const headerRow = lines[0];
        const dataRows = lines.slice(1);
        
        // Clear existing data and columns
        this.data = [];
        this.columns = [];
        
        // Create new columns based on headers
        headerRow.forEach((header, index) => {
            let columnId, columnType;
            
            if (this.chartType === 'bar') {
                columnId = index === 0 ? 'category' : (index === 1 ? 'value' : `value_${index}`);
                columnType = index === 0 ? 'text' : 'number';
            } else if (this.chartType === 'sankey') {
                const sankeyColumns = ['source', 'target', 'value', 'previousValue', 'description'];
                columnId = sankeyColumns[index] || `col_${index + 1}`;
                columnType = ['source', 'target', 'description'].includes(columnId) ? 'text' : 'number';
            } else {
                columnId = `col_${index + 1}`;
                columnType = this.detectColumnTypeFromParsedData(dataRows, index);
            }
            
            this.columns.push({
                id: columnId,
                name: header || `Column ${index + 1}`,
                label: header || `Column ${index + 1}`,
                type: columnType,
                required: index === 0
            });
        });
        
        // Process data rows
        dataRows.forEach(values => {
            const rowData = this.createEmptyRow();
            
            values.forEach((value, index) => {
                if (index < this.columns.length) {
                    const column = this.columns[index];
                    const cleanValue = (value || '').trim();
                    
                    if (column.type === 'number') {
                        rowData[column.id] = this.parseNumber(cleanValue);
                    } else {
                        rowData[column.id] = cleanValue;
                    }
                }
            });
            
            this.data.push(rowData);
        });
        
        this.render();
        this.updateChart();
        
        console.log('✅ Full dataset pasted successfully');
    }

    detectColumnTypeFromParsedData(dataRows, columnIndex) {
        const sampleValues = dataRows.slice(0, Math.min(5, dataRows.length))
            .map(values => values[columnIndex])
            .filter(v => v && v.trim());
        
        if (sampleValues.length === 0) return 'text';
        
        const numericCount = sampleValues.filter(v => !isNaN(parseFloat(v.trim()))).length;
        const threshold = Math.ceil(sampleValues.length * 0.8);
        
        return numericCount >= threshold ? 'number' : 'text';
    }

    addColumn() {
        if (!this.currentConfig.allowDynamicColumns) return;
        
        const valueColumnCount = this.columns.filter(col => col.type === 'number').length;
        const newColumnId = valueColumnCount === 0 ? 'value' : `value_${valueColumnCount + 1}`;
        const newColumn = {
            id: newColumnId,
            label: `Value ${valueColumnCount + 1}`,
            type: 'number',
            required: false
        };
        
        this.columns.push(newColumn);
        
        // Add the new column to existing data
        this.data.forEach(row => {
            row[newColumnId] = 0;
        });
        
        this.render();
    }

    toggleColumnType(columnId) {
        if (!this.currentConfig.allowDynamicColumns) return;
        
        const column = this.columns.find(c => c.id === columnId);
        if (!column) return;
        
        // Don't allow changing the first column (category) to number
        if (columnId === 'category') {
            alert('The category column must remain as text type.');
            return;
        }
        
        const newType = column.type === 'number' ? 'text' : 'number';
        column.type = newType;
        
        // Convert existing data
        this.data.forEach(row => {
            if (newType === 'number') {
                row[columnId] = this.parseNumber(row[columnId]);
            } else {
                row[columnId] = String(row[columnId] || '');
            }
        });
        
        this.render();
        this.updateChart();
    }

    deleteColumn(columnId) {
        if (!this.currentConfig.allowDynamicColumns) return;
        
        if (this.columns.length <= 2) {
            alert('You must have at least two columns.');
            return;
        }
        
        this.columns = this.columns.filter(col => col.id !== columnId);
        
        // Remove the column from existing data
        this.data.forEach(row => {
            delete row[columnId];
        });
        
        this.render();
        this.updateChart();
    }

    addRow() {
        this.data.push(this.createEmptyRow());
        this.render();
        
        // Select the new row's first cell
        setTimeout(() => {
            const firstColId = this.columns[0].id;
            const newCell = this.container.querySelector(`[data-row="${this.data.length - 1}"][data-col="${firstColId}"]`);
            if (newCell) {
                this.selectCell(newCell);
            }
        }, 100);
    }

    deleteRow(index) {
        if (this.data.length <= 1) {
            this.data[0] = this.createEmptyRow();
        } else {
            this.data.splice(index, 1);
        }
        this.render();
        this.updateChart();
    }

    clearData() {
        if (confirm('Clear all data?')) {
            this.data = [this.createEmptyRow()];
            this.render();
            this.updateChart();
        }
    }

    testPaste() {
        let testData;
        
        if (this.chartType === 'bar') {
            testData = `Product	Q1 Sales	Q2 Sales
Laptops	$1,250.50	$1,450.75
Tablets	$890.25	$920.00
Phones	$2,100.00	$2,250.50`;
        } else if (this.chartType === 'sankey') {
            testData = `From	To	Current	Previous	Description
Revenue	Operations	1000000	950000	Core operational expenses
Operations	Marketing	250000	200000	Marketing and advertising
Operations	R&D	300000	280000	Research and development
Marketing	Customer Acquisition	150000	120000	New customer acquisition`;
        }
        
        console.log('🧪 Testing paste with sample data');
        this.processPasteData(testData);
    }

    updateStatus() {
        const rowCount = this.container.querySelector('.row-count');
        const colCount = this.container.querySelector('.col-count');
        
        if (rowCount) rowCount.textContent = `${this.data.length} rows`;
        if (colCount) colCount.textContent = `${this.columns.length} cols`;
    }

    updateChart() {
        console.log('🔄 UnifiedSpreadsheetEditor: updateChart() called');
        console.log('🔄 Chart type:', this.chartType);
        console.log('🔄 Current data:', this.data);
        
        // Update via the app (primary method)
        if (window.pulseApp && window.pulseApp.updateData) {
            const chartData = this.getChartFormattedData();
            console.log('🔄 Formatted chart data:', chartData);
            if (chartData) {
                const result = window.pulseApp.updateData(chartData, 'unified-data-editor');
                console.log('✅ Chart update result:', result);
            }
        } else {
            console.warn('⚠️ pulseApp.updateData not available');
        }
        
        // Legacy support for direct chart instance
        if (this.chart && this.chart.render) {
            const chartData = this.getChartFormattedData();
            if (chartData) {
                this.chart.render(chartData);
                console.log('✅ Chart updated via direct chart instance');
            }
        }
    }

    getChartFormattedData() {
        if (this.chartType === 'bar') {
            return this.getBarChartFormattedData();
        } else if (this.chartType === 'sankey') {
            return this.getSankeyChartFormattedData();
        }
        return null;
    }

    getBarChartFormattedData() {
        // Find category column
        const categoryCol = this.columns.find(c => c.type === 'text' || c.id === 'category');
        if (!categoryCol) return null;
        
        // Find all numeric columns
        const valueColumns = this.columns.filter(c => c.type === 'number');
        if (valueColumns.length === 0) return null;
        
        // Filter valid data
        const validData = this.data.filter(row => {
            const hasCategory = row[categoryCol.id] && row[categoryCol.id].trim();
            const hasValues = valueColumns.some(col => {
                const value = row[col.id];
                return value !== undefined && value !== null && value !== '';
            });
            return hasCategory && hasValues;
        });
        
        if (validData.length === 0) {
            return {
                metadata: { title: "Chart Data", chartType: "bar", source: "unified-data-editor" },
                categories: [], values: [], labels: []
            };
        }
        
        if (valueColumns.length === 1) {
            // Single series
            return {
                metadata: { title: "Chart Data", chartType: "bar", source: "unified-data-editor" },
                categories: validData.map(row => row[categoryCol.id]),
                values: validData.map(row => row[valueColumns[0].id]),
                labels: validData.map(row => row[categoryCol.id])
            };
        } else {
            // Multi-series
            const series = valueColumns.map(col => ({
                name: col.label,
                data: validData.map(row => row[col.id] || 0)
            }));
            
            return {
                metadata: { title: "Multi-Series Chart Data", chartType: "bar", source: "unified-data-editor" },
                categories: validData.map(row => row[categoryCol.id]),
                series: series,
                values: validData.map(row => row[valueColumns[0].id]),
                labels: validData.map(row => row[categoryCol.id])
            };
        }
    }

    getSankeyChartFormattedData() {
        // Filter valid flows
        const validFlows = this.data.filter(row => {
            return row.source && row.source.trim() && 
                   row.target && row.target.trim() && 
                   row.value && row.value > 0;
        });
        
        if (validFlows.length === 0) {
            return {
                metadata: { title: "Sankey Data", chartType: "sankey", source: "unified-data-editor" },
                flows: []
            };
        }
        
        // Convert to flow format
        const flows = validFlows.map((row, index) => ({
            id: `flow_${index}`,
            source: row.source,
            target: row.target,
            value: row.value,
            previousValue: row.previousValue || 0,
            description: row.description || ''
        }));
        
        return {
            metadata: { title: "Sankey Flow Data", chartType: "sankey", source: "unified-data-editor" },
            flows: flows
        };
    }

    // Public API methods
    loadData(data) {
        if (Array.isArray(data)) {
            this.data = data.map(d => {
                const row = {};
                this.columns.forEach(col => {
                    if (col.type === 'number') {
                        row[col.id] = this.parseNumber(d[col.id]);
                    } else {
                        row[col.id] = String(d[col.id] || '');
                    }
                });
                return row;
            });
        }
        this.render();
    }

    getData() {
        return this.data.filter(row => {
            return this.columns.some(col => row[col.id] && row[col.id] !== '');
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    destroy() {
        // Cleanup event listeners
        document.removeEventListener('keydown', this.handleKeydown);
        document.removeEventListener('keypress', this.handleKeypress);
        this.container.innerHTML = '';
    }
}

// Export for use
window.UnifiedSpreadsheetEditor = UnifiedSpreadsheetEditor;
console.log('🚀 UnifiedSpreadsheetEditor loaded successfully and available globally');
console.log('📋 UnifiedSpreadsheetEditor class:', UnifiedSpreadsheetEditor);