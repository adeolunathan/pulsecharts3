/* ===== BASE SPREADSHEET EDITOR CLASS ===== */
/* Common functionality shared between Sankey and Bar chart spreadsheet editors */

class SpreadsheetEditor {
    constructor(containerId, chartInstance) {
        this.container = document.getElementById(containerId);
        this.chart = chartInstance;
        this.data = [];
        this.columns = [];
        this.selectedCell = null;
        this.selectedCells = new Set();
        this.isEditing = false;
        this.selectionStart = null;
        this.clipboard = null;
        this.isDragging = false;
        
        // Chart-specific configuration - to be overridden by subclasses
        this.config = this.getDefaultConfig();
        this.columns = [...this.config.columns];
    }

    // Abstract methods - must be implemented by subclasses
    getDefaultConfig() {
        throw new Error('getDefaultConfig() must be implemented by subclass');
    }

    getChartFormattedData() {
        throw new Error('getChartFormattedData() must be implemented by subclass');
    }

    loadExistingChartData(chartData) {
        throw new Error('loadExistingChartData() must be implemented by subclass');
    }

    hasValidChartData(chartData) {
        throw new Error('hasValidChartData() must be implemented by subclass');
    }

    // Common initialization
    init() {
        if (!this.container) {
            console.error('Spreadsheet container not found');
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
                        <h3 style="margin: 0; color: white; font-size: 16px; font-weight: 600;">${this.config.title}</h3>
                        <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.8); font-size: 13px;">Universal data editor with Excel-like functionality</p>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        ${this.config.allowDynamicColumns ? `
                        <button class="add-column-btn" style="padding: 6px 12px; background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;" title="Add new column">
                            ➕ Column
                        </button>
                        <button class="clear-all-btn" style="padding: 6px 12px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;" title="Clear all spreadsheet content">
                            🗑️
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
        container.querySelector('.test-paste-btn').addEventListener('click', () => this.testPaste());
        
        // Dynamic column button (only for charts that support it)
        const addColumnBtn = container.querySelector('.add-column-btn');
        if (addColumnBtn) {
            addColumnBtn.addEventListener('click', () => this.addColumn());
        }
        
        // Clear all button (only when dynamic columns are enabled)
        const clearAllBtn = container.querySelector('.clear-all-btn');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => this.clearAllData());
        }
        
        // Enhanced focus management for paste functionality
        const wrapper = container.querySelector('.spreadsheet-wrapper');
        const pasteHint = container.querySelector('.paste-hint');
        
        // Store reference for focus management
        this.spreadsheetWrapper = wrapper;
        
        // Focus management for paste functionality
        wrapper.setAttribute('tabindex', '0');
        wrapper.style.outline = 'none';
        
        const ensureFocus = () => {
            if (document.activeElement !== wrapper) {
                wrapper.focus();
                console.log('📋 Ensuring wrapper focus, active element is now:', document.activeElement);
            }
        };
        
        // Focus wrapper on interactions
        container.addEventListener('click', (e) => {
            console.log('📋 Container clicked, forcing wrapper focus');
            ensureFocus();
        });
        
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
            console.log('📋 ⚠️ Wrapper lost focus');
            
            setTimeout(() => {
                if (this.selectedCell) {
                    ensureFocus();
                }
            }, 50);
        });
        
        // Initial focus setup
        setTimeout(() => {
            ensureFocus();
            console.log('📋 Initial wrapper focus set');
        }, 100);
        
        // Keep checking focus
        setInterval(() => {
            if (this.selectedCell && document.activeElement !== wrapper) {
                console.log('📋 Focus drift detected, refocusing wrapper');
                ensureFocus();
            }
        }, 100);
        
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Cell interaction handlers - use delegation for better reliability
        container.addEventListener('click', (e) => this.handleCellClick(e));
        container.addEventListener('dblclick', (e) => this.handleCellDoubleClick(e));
        
        // Store references for proper cleanup
        this.globalClickHandler = (e) => {
            if (container.contains(e.target) && !e.defaultPrevented) {
                const cell = e.target.closest('.spreadsheet-cell') || e.target.closest('.header-cell');
                if (cell && container.contains(cell)) {
                    this.handleCellClick(e);
                }
            }
        };
        
        this.globalDblClickHandler = (e) => {
            if (container.contains(e.target) && !e.defaultPrevented) {
                const cell = e.target.closest('.spreadsheet-cell') || e.target.closest('.header-cell');
                if (cell && container.contains(cell)) {
                    this.handleCellDoubleClick(e);
                }
            }
        };
        
        // Add global listeners
        document.addEventListener('click', this.globalClickHandler);
        document.addEventListener('dblclick', this.globalDblClickHandler);
        
        // Keypress handler for immediate typing
        document.addEventListener('keypress', (e) => this.handleKeypress(e));
        
        // Paste event handling
        wrapper.addEventListener('paste', (e) => {
            console.log('📋 Paste event on wrapper:', e);
            this.handlePaste(e);
        });
        
        container.addEventListener('paste', (e) => {
            console.log('📋 Paste event on container:', e);
            this.handlePaste(e);
        });
        
        // Global paste listener
        document.addEventListener('paste', (e) => {
            
            const shouldHandlePaste = 
                this.selectedCell ||
                document.activeElement === wrapper ||
                container.contains(e.target) ||
                wrapper.contains(document.activeElement);
            
            if (shouldHandlePaste) {
                console.log('📋 🎯 HANDLING PASTE EVENT');
                e.preventDefault();
                e.stopPropagation();
                
                wrapper.focus();
                this.handlePaste(e);
            }
        });
        
        // Ctrl+V handler
        wrapper.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
                console.log('📋 Ctrl+V detected directly on wrapper');
                e.preventDefault();
                
                navigator.clipboard.readText().then(text => {
                    if (text) {
                        console.log('📋 Got clipboard text via direct API');
                        this.processPasteData(text);
                    }
                }).catch(err => {
                    console.log('📋 Clipboard API failed:', err);
                });
            }
        });
    }

    loadInitialData() {
        console.log('📊 SpreadsheetEditor: Loading initial data...');
        
        const chartData = window.pulseApp?.currentData;
        
        if (chartData && this.hasValidChartData(chartData)) {
            console.log('📊 Found existing chart data, loading it into editor');
            this.loadExistingChartData(chartData);
            
            setTimeout(() => {
                console.log('📊 Syncing loaded data back to chart');
                this.updateChart();
            }, 100);
        } else {
            console.log('📊 No chart data found, starting with empty state');
            this.data = [this.createEmptyRow()];
            
            setTimeout(() => {
                console.log('📊 Clearing chart to show empty state');
                this.updateChart();
            }, 100);
        }
        
        this.render();
        
        // Auto-select first cell
        setTimeout(() => {
            const firstCell = this.container.querySelector('.spreadsheet-cell');
            if (firstCell && !this.selectedCell) {
                console.log('📋 Auto-selecting first cell');
                this.selectCell(firstCell);
            }
        }, 200);
        
        console.log('📊 SpreadsheetEditor: Initialization complete');
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
        
        // Remove existing event listeners before clearing
        if (thead.clickHandler) {
            thead.removeEventListener('click', thead.clickHandler);
        }
        
        thead.innerHTML = '';
        
        // Controls row (only for dynamic column charts)
        if (this.config.allowDynamicColumns) {
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
            
            // Setup control event listeners with delegation
            thead.clickHandler = (e) => {
                if (e.target.classList.contains('column-type-toggle')) {
                    e.stopPropagation();
                    this.toggleColumnType(e.target.dataset.col);
                }
                
                if (e.target.classList.contains('delete-column-btn')) {
                    e.stopPropagation();
                    this.deleteColumn(e.target.dataset.col);
                }
            };
            thead.addEventListener('click', thead.clickHandler);
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
        
        // Remove existing event listeners before clearing
        if (tbody.clickHandler) {
            tbody.removeEventListener('click', tbody.clickHandler);
        }
        
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
            
            // Data cells
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
                const rawValue = row[column.id] || '';
                const formattedValue = this.formatCellValueSafe(rawValue, column.type);
                cellContent.textContent = formattedValue;
                
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
        
        // Setup delete row button handlers with event delegation
        tbody.clickHandler = (e) => {
            if (e.target.classList.contains('delete-row-btn')) {
                e.stopPropagation();
                const rowIndex = parseInt(e.target.dataset.row);
                this.deleteRow(rowIndex);
            }
        };
        tbody.addEventListener('click', tbody.clickHandler);
    }

    formatCellValueSafe(value, type) {
        
        if (type === 'number') {
            if (typeof value === 'number') {
                // Display numbers exactly as stored, with locale formatting but no truncation
                const result = value.toLocaleString();
                return result;
            }
            const fallback = value || '0';
            return fallback;
        }
        const result = String(value || '');
        return result;
    }

    // Cell interaction methods
    handleCellClick(e) {
        const cell = e.target.closest('.spreadsheet-cell') || e.target.closest('.header-cell');
        if (!cell) return;
        
        // Prevent multiple event handling
        e.stopPropagation();
        
        if (this.selectedCell === cell && !this.isEditing) {
            this.editCell(cell);
        } else {
            this.selectCell(cell);
        }
    }

    handleCellDoubleClick(e) {
        const cell = e.target.closest('.spreadsheet-cell') || e.target.closest('.header-cell');
        if (!cell) return;
        
        e.preventDefault();
        e.stopPropagation();
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
        
        // Ensure wrapper stays focused
        if (this.spreadsheetWrapper) {
            this.spreadsheetWrapper.focus();
            console.log('📋 Cell selected, wrapper focused');
            
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
                column.name = newValue.trim() || `Column ${column.id}`;
                column.label = column.name;
                content.textContent = column.name;
            } else {
                this.setCellValue(cell, newValue);
                
                const row = parseInt(cell.dataset.row);
                const col = cell.dataset.col;
                const column = this.columns.find(c => c.id === col);
                content.textContent = this.formatCellValueSafe(this.data[row][col], column.type);
            }
            
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
                this.render();
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

    // Keyboard navigation and shortcuts
    handleKeydown(e) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
            
            const shouldHandlePaste = 
                this.selectedCell ||
                document.activeElement === this.spreadsheetWrapper ||
                this.container.contains(document.activeElement);
            
            if (shouldHandlePaste) {
                e.preventDefault();
                e.stopPropagation();
                console.log('📋 🎯 HANDLING CTRL+V FOR SPREADSHEET');
                
                if (this.spreadsheetWrapper) {
                    this.spreadsheetWrapper.focus();
                }
                
                navigator.clipboard.readText().then(text => {
                    if (text && text.trim()) {
                        console.log('📋 ✅ SUCCESS! Got clipboard text');
                        this.processPasteData(text);
                    } else {
                        this.handlePasteButton();
                    }
                }).catch(err => {
                    console.log('📋 Async clipboard failed:', err);
                    this.handlePasteButton();
                });
                
                return;
            }
        }
        
        if (this.isEditing) return;
        
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
        if (!this.selectedCell || this.isEditing) return;
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        if (['Enter', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
        
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

    // Paste functionality
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
        
        e.preventDefault();
        e.stopPropagation();
        
        let text = null;
        
        if (e.clipboardData) {
            const formats = ['text/plain', 'text/csv', 'text/tab-separated-values', 'text/html'];
            
            for (const format of formats) {
                try {
                    const data = e.clipboardData.getData(format);
                    if (data && data.trim()) {
                        text = data;
                        console.log(`📋 Got data from format: ${format}`);
                        break;
                    }
                } catch (err) {
                    console.log(`📋 Failed to get data from format: ${format}`, err);
                }
            }
            
            if (!text && e.clipboardData.getData('text/html')) {
                text = this.extractTextFromHTML(e.clipboardData.getData('text/html'));
            }
        }
        
        if (!text || !text.trim()) {
            console.warn('📋 No clipboard data found');
            this.handlePasteButton();
            return;
        }
        
        console.log('📋 Processing paste data');
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
        
        console.log('📋 Processing paste data');
        
        const { delimiter, lines } = this.parseClipboardData(text);
        
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
        if (this.config.allowDynamicColumns) {
            let maxColumnsNeeded = startColIndex;
            lines.forEach(values => {
                maxColumnsNeeded = Math.max(maxColumnsNeeded, startColIndex + values.length - 1);
            });
            
            while (this.columns.length <= maxColumnsNeeded) {
                this.addColumn();
            }
        }
        
        // Handle header updates
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
            
            while (this.data.length <= targetRow) {
                this.data.push(this.createEmptyRow());
            }
            
            values.forEach((value, valueIndex) => {
                const targetColIndex = startColIndex + valueIndex;
                if (targetColIndex < this.columns.length) {
                    const targetCol = this.columns[targetColIndex];
                    const cleanValue = (value || '').trim();
                    console.log('📋 Processing paste value:', JSON.stringify(value), 'cleaned:', JSON.stringify(cleanValue), 'column type:', targetCol.type, 'column id:', targetCol.id);
                    
                    if (targetCol.type === 'number') {
                        const parsedValue = this.parseNumber(cleanValue);
                        this.data[targetRow][targetCol.id] = parsedValue;
                        console.log('📋 Assigned number value:', parsedValue, 'to row', targetRow, 'col', targetCol.id);
                    } else {
                        this.data[targetRow][targetCol.id] = cleanValue;
                        console.log('📋 Assigned text value:', JSON.stringify(cleanValue), 'to row', targetRow, 'col', targetCol.id);
                    }
                }
            });
        });
        
        this.render();
        this.updateChart();
        
        // For paste operations, ensure title clickability (let centralized system handle retries)
        setTimeout(() => {
            this.ensureChartTitleClickable();
        }, 300);
        
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
        // Use the centralized robust number parser
        if (window.robustParseNumber) {
            return window.robustParseNumber(value);
        }
        
        // Fallback to original logic if robust parser not available
        
        if (value === null || value === undefined || value === '') {
            return 0;
        }
        
        let cleanValue = String(value).trim();
        
        // Remove currency symbols
        const beforeCurrency = cleanValue;
        cleanValue = cleanValue.replace(/[$€£¥₹₽₿₩₽₴₸₺₼₾₨₦₡₱₪₡]/g, '');
        
        // Handle percentage
        if (cleanValue.endsWith('%')) {
            cleanValue = cleanValue.slice(0, -1);
            const num = parseFloat(cleanValue);
            const result = isNaN(num) ? 0 : Math.floor(num / 100);
            return result;
        }
        
        // Handle parentheses as negative
        if (cleanValue.startsWith('(') && cleanValue.endsWith(')')) {
            cleanValue = '-' + cleanValue.slice(1, -1);
        }
        
        // Handle thousands separators - be more careful
        if (cleanValue.includes(',')) {
            
            // Handle thousands separators with flexibility
            // Standard format: 1,234,567 (1-3 digits, then groups of 3)
            // Fixed format: Accept any pattern with commas and digits (like 57,405)
            const standardThousandsRegex = /^-?\d{1,3}(,\d{3})*(\.\d+)?$/;
            const flexibleCommaRegex = /^-?\d+(,\d+)+(\.\d+)?$/; // Fixed: require at least one comma group
            const anyCommaRegex = /^-?\d+([,\d]+)*(\.\d+)?$/; // Accept any comma pattern
            const standardMatch = standardThousandsRegex.test(cleanValue);
            const flexibleMatch = flexibleCommaRegex.test(cleanValue);
            const anyCommaMatch = anyCommaRegex.test(cleanValue);
            
            if (standardMatch || flexibleMatch || anyCommaMatch) {
                const before = cleanValue;
                cleanValue = cleanValue.replace(/,/g, '');
            }
            // European style (1.234.567,50) - but only if we detect this pattern
            else {
                const europeanRegex = /^-?\d{1,3}(\.\d{3})*(,\d+)?$/;
                
                if (europeanRegex.test(cleanValue)) {
                    const before = cleanValue;
                    cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
                } else {
                    // Try removing commas anyway as a fallback
                    cleanValue = cleanValue.replace(/,/g, '');
                }
            }
        }
        
        // Parse the cleaned value
        const num = parseFloat(cleanValue);
        
        if (isNaN(num)) {
            return 0;
        }
        
        // Return whole number (floor decimals for consistent behavior)
        const result = Math.floor(num);
        return result;
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
        
        // Create new columns based on headers - to be implemented by subclasses
        this.createColumnsFromHeaders(headerRow);
        
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
        
        // For full dataset paste operations, ensure title clickability (centralized system handles retries)
        setTimeout(() => {
            this.ensureChartTitleClickable();
        }, 600);
        
        console.log('✅ Full dataset pasted successfully');
    }

    // To be implemented by subclasses
    createColumnsFromHeaders(headerRow) {
        throw new Error('createColumnsFromHeaders() must be implemented by subclass');
    }

    // Dynamic column management (for charts that support it)
    addColumn() {
        if (!this.config.allowDynamicColumns) return;
        
        // To be implemented by subclasses that support dynamic columns
        throw new Error('addColumn() must be implemented by subclass that supports dynamic columns');
    }

    toggleColumnType(columnId) {
        if (!this.config.allowDynamicColumns) return;
        
        // To be implemented by subclasses that support dynamic columns
        throw new Error('toggleColumnType() must be implemented by subclass that supports dynamic columns');
    }

    deleteColumn(columnId) {
        if (!this.config.allowDynamicColumns) return;
        
        // To be implemented by subclasses that support dynamic columns
        throw new Error('deleteColumn() must be implemented by subclass that supports dynamic columns');
    }

    // Row management
    addRow() {
        this.data.push(this.createEmptyRow());
        this.render();
        
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

    clearAllData() {
        if (confirm('Clear all spreadsheet content?')) {
            this.data = [this.createEmptyRow()];
            this.render();
            this.updateChart();
        }
    }

    // Test functionality - to be implemented by subclasses
    testPaste() {
        throw new Error('testPaste() must be implemented by subclass');
    }

    updateStatus() {
        const rowCount = this.container.querySelector('.row-count');
        const colCount = this.container.querySelector('.col-count');
        
        if (rowCount) rowCount.textContent = `${this.data.length} rows`;
        if (colCount) colCount.textContent = `${this.columns.length} cols`;
    }

    updateChart() {
        console.log('🔄 SpreadsheetEditor: updateChart() called');
        
        // Update via the app (primary method)
        if (window.pulseApp && window.pulseApp.updateData) {
            const chartData = this.getChartFormattedData();
            console.log('🔄 Formatted chart data:', chartData);
            if (chartData) {
                const result = window.pulseApp.updateData(chartData, 'spreadsheet-editor');
                console.log('✅ Chart update result:', result);
                
                // Ensure chart title remains clickable after update
                setTimeout(() => {
                    this.ensureChartTitleClickable();
                }, 300);
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
                
                // Ensure chart title remains clickable after direct render
                setTimeout(() => {
                    this.ensureChartTitleClickable();
                }, 300);
            }
        }
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

    destroy() {
        // Cleanup event listeners
        document.removeEventListener('keydown', this.handleKeydown);
        document.removeEventListener('keypress', this.handleKeypress);
        
        // Remove global listeners if they exist
        if (this.globalClickHandler) {
            document.removeEventListener('click', this.globalClickHandler);
        }
        if (this.globalDblClickHandler) {
            document.removeEventListener('dblclick', this.globalDblClickHandler);
        }
        
        this.container.innerHTML = '';
    }

    // Ensure chart title remains clickable after chart updates
    ensureChartTitleClickable() {
        
        // Dispatch a custom event to notify the centralized system
        try {
            const event = new CustomEvent('chartTitleUpdateNeeded', {
                detail: { 
                    source: 'spreadsheet-editor',
                    timestamp: Date.now(),
                    dataRows: this.data.length
                }
            });
            document.dispatchEvent(event);
            console.log('📝 ensureChartTitleClickable: Dispatched chartTitleUpdateNeeded event');
        } catch (error) {
            console.warn('Failed to dispatch chartTitleUpdateNeeded event:', error);
        }
    }
}

// Export for use
window.SpreadsheetEditor = SpreadsheetEditor;
