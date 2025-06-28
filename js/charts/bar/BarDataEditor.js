/* ===== PROFESSIONAL MULTI-COLUMN SPREADSHEET DATA EDITOR ===== */
/* Excel/Google Sheets-like data input interface supporting dynamic columns */

class BarDataEditor {
    constructor(containerId, chartInstance) {
        this.container = document.getElementById(containerId);
        this.chart = chartInstance;
        this.data = [];
        this.columns = [
            { id: 'category', label: 'Category', type: 'text', required: true },
            { id: 'value', label: 'Value', type: 'number', required: true }
        ];
        this.selectedCell = null;
        this.isEditing = false;
        this.clipboard = null;
        this.init();
    }

    init() {
        if (!this.container) {
            console.error('Data editor container not found');
            return;
        }
        this.createSpreadsheetInterface();
        this.setupEventListeners();
        this.loadInitialData();
    }

    createSpreadsheetInterface() {
        this.container.innerHTML = `
            <div class="advanced-spreadsheet-container" style="max-width: 1000px; margin: 0 auto;">
                <!-- Enhanced Toolbar -->
                <div class="spreadsheet-toolbar" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 12px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; color: white;">
                    <div>
                        <h3 style="margin: 0; color: white; font-size: 16px; font-weight: 600;">📊 Professional Data Editor</h3>
                        <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.8); font-size: 13px;">Excel-like interface with dynamic columns</p>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button class="add-column-btn" style="padding: 6px 12px; background: rgba(255,255,255,0.2); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;" title="Add new column">
                            ➕ Column
                        </button>
                        <button class="paste-btn" style="padding: 6px 12px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;" title="Paste data (Cmd+V / Ctrl+V)">
                            📋 Paste
                        </button>
                        <button class="add-row-btn" style="padding: 6px 12px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                            ➕ Row
                        </button>
                        <button class="clear-btn" style="padding: 6px 12px; background: #dc2626; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                            🗑 Clear
                        </button>
                    </div>
                </div>
                
                <!-- Enhanced Spreadsheet Table -->
                <div class="spreadsheet-wrapper" style="background: white; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div style="overflow-x: auto;">
                        <table class="spreadsheet-table" style="width: 100%; min-width: 600px; border-collapse: collapse; font-family: 'SF Mono', 'Monaco', 'Cascadia Code', monospace;">
                            <thead class="spreadsheet-header" style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-bottom: 2px solid #cbd5e0;">
                                <!-- Dynamic headers will be generated -->
                            </thead>
                            <tbody class="spreadsheet-tbody">
                                <!-- Dynamic rows will be generated -->
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Enhanced Status Bar -->
                <div class="spreadsheet-status" style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding: 8px 12px; background: #f9fafb; border-radius: 4px; border: 1px solid #f3f4f6;">
                    <div style="color: #6b7280; font-size: 12px;">
                        <span class="row-count">0 rows</span> × <span class="col-count">2 cols</span> • Click to edit • Cmd+V/Ctrl+V to paste • Tab/Enter to navigate
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
        container.querySelector('.add-column-btn').addEventListener('click', () => this.addColumn());
        container.querySelector('.paste-btn').addEventListener('click', () => this.handlePasteButton());
        container.querySelector('.add-row-btn').addEventListener('click', () => this.addRow());
        container.querySelector('.clear-btn').addEventListener('click', () => this.clearData());
        
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Cell interaction handlers (delegated)
        container.addEventListener('click', (e) => this.handleCellClick(e));
        container.addEventListener('dblclick', (e) => this.handleCellDoubleClick(e));
        
        // Prevent default paste behavior and handle it ourselves
        container.addEventListener('paste', (e) => this.handlePaste(e));
        
        // Listen for chart type changes to refresh data
        window.addEventListener('chartTypeChanged', (e) => {
            console.log('📊 BarDataEditor: Chart type changed event received:', e.detail);
            setTimeout(() => {
                console.log('📊 BarDataEditor: Refreshing chart data for new chart type');
                this.updateChart();
            }, 50);
        });
    }

    loadInitialData() {
        console.log('📊 BarDataEditor: Loading initial data...');
        console.log('📊 BarDataEditor: Existing chart data:', this.chart?.data);
        
        // ALWAYS use multi-column default data for better demo
        this.data = [
            { category: 'Product A', value: 100, value_2: 120, value_3: 90 },
            { category: 'Product B', value: 150, value_2: 180, value_3: 140 },
            { category: 'Product C', value: 200, value_2: 250, value_3: 190 }
        ];
        
        // Always set up multi-column structure
        this.columns = [
            { id: 'category', label: 'Category', type: 'text', required: true },
            { id: 'value', label: 'Value 1', type: 'number', required: true },
            { id: 'value_2', label: 'Value 2', type: 'number', required: false },
            { id: 'value_3', label: 'Value 3', type: 'number', required: false }
        ];
        
        console.log('📊 BarDataEditor: Set up data:', this.data);
        console.log('📊 BarDataEditor: Set up columns:', this.columns);
        
        this.render();
        
        // Immediately update chart with default data
        setTimeout(() => {
            console.log('📊 BarDataEditor: Triggering initial updateChart...');
            this.updateChart();
        }, 100);
    }

    render() {
        this.renderHeaders();
        this.renderRows();
        this.updateStatus();
    }

    renderHeaders() {
        const thead = this.container.querySelector('.spreadsheet-header');
        thead.innerHTML = '';
        
        const headerRow = document.createElement('tr');
        
        // Row number header
        const rowNumHeader = document.createElement('th');
        rowNumHeader.innerHTML = '#';
        rowNumHeader.style.cssText = `
            padding: 12px 8px; text-align: center; font-size: 12px; font-weight: 600; 
            color: #475569; width: 50px; border-right: 1px solid #cbd5e0; background: #f1f5f9;
        `;
        headerRow.appendChild(rowNumHeader);
        
        // Dynamic column headers
        this.columns.forEach((column) => {
            const th = document.createElement('th');
            const typeIcon = column.type === 'number' ? '🔢' : '📝';
            const typeLabel = column.type === 'number' ? 'Numeric' : 'Text';
            th.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 4px; flex: 1;">
                        <span class="column-label" data-col="${column.id}" style="cursor: pointer;">${column.label}</span>
                        <button class="column-type-toggle" data-col="${column.id}" style="padding: 1px 4px; background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 3px; cursor: pointer; font-size: 9px;" title="Toggle column type: ${typeLabel}">
                            ${typeIcon}
                        </button>
                    </div>
                    <div style="display: flex; gap: 2px;">
                        ${this.columns.length > 2 ? `<button class="delete-column-btn" data-col="${column.id}" style="padding: 2px 6px; background: #fee2e2; color: #dc2626; border: none; border-radius: 3px; cursor: pointer; font-size: 10px;" title="Delete column">×</button>` : ''}
                    </div>
                </div>
            `;
            th.style.cssText = `
                padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; 
                color: #475569; border-right: 1px solid #cbd5e0; min-width: 140px;
            `;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        
        // Setup header event listeners
        thead.querySelectorAll('.column-label').forEach(label => {
            label.addEventListener('click', (e) => this.editColumnHeader(e.target));
        });
        
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
                cellContent.innerHTML = this.formatCellValue(row[column.id] || '', column.type);
                
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

    formatCellValue(value, type) {
        if (type === 'number') {
            return typeof value === 'number' ? value.toLocaleString() : (value || '0');
        }
        return this.escapeHtml(value || '');
    }

    handleCellClick(e) {
        const cell = e.target.closest('.spreadsheet-cell');
        if (!cell) return;
        
        // Single click just selects the cell
        this.selectCell(cell);
    }

    handleCellDoubleClick(e) {
        const cell = e.target.closest('.spreadsheet-cell');
        if (!cell) return;
        
        // Double click starts editing
        e.preventDefault();
        this.editCell(cell);
    }

    selectCell(cell) {
        // Remove previous selection
        this.container.querySelectorAll('.spreadsheet-cell').forEach(c => {
            c.style.backgroundColor = '';
            c.style.outline = '';
        });
        
        // Select new cell
        cell.style.backgroundColor = '#dbeafe';
        cell.style.outline = '2px solid #3b82f6';
        this.selectedCell = cell;
        
        // Update status
        const row = cell.dataset.row;
        const col = cell.dataset.col;
        const column = this.columns.find(c => c.id === col);
        const statusInfo = this.container.querySelector('.selected-cell-info');
        statusInfo.textContent = `${column ? column.label : col} ${parseInt(row) + 1}`;
    }

    editCell(cell) {
        if (this.isEditing) return;
        
        this.isEditing = true;
        const content = cell.querySelector('.cell-content');
        const column = this.columns.find(c => c.id === cell.dataset.col);
        const currentValue = this.getCellValue(cell);
        
        // Create input
        const input = document.createElement('input');
        input.type = column.type === 'number' ? 'number' : 'text';
        input.value = currentValue;
        input.style.cssText = `
            width: 100%; height: 100%; border: none; outline: none; 
            padding: 8px 12px; font-family: inherit; font-size: inherit;
            background: white; text-align: ${column.type === 'number' ? 'right' : 'left'};
        `;
        
        // Replace content with input
        content.innerHTML = '';
        content.appendChild(input);
        input.focus();
        input.select();
        
        // Handle input completion
        const finishEdit = () => {
            if (!this.isEditing) return;
            this.isEditing = false;
            
            const newValue = input.value;
            this.setCellValue(cell, newValue);
            
            // Restore content display
            const row = parseInt(cell.dataset.row);
            const col = cell.dataset.col;
            const column = this.columns.find(c => c.id === col);
            content.innerHTML = this.formatCellValue(this.data[row][col], column.type);
            
            // Update chart with small delay to ensure data is set
            setTimeout(() => {
                this.updateChart();
            }, 10);
        };
        
        input.addEventListener('blur', finishEdit);
        
        // Add input event for real-time updates (optional)
        let updateTimeout;
        input.addEventListener('input', () => {
            // Clear previous timeout
            if (updateTimeout) clearTimeout(updateTimeout);
            
            // Set new timeout for live updates (debounced)
            updateTimeout = setTimeout(() => {
                const tempValue = input.value;
                this.setCellValue(cell, tempValue);
                this.updateChart();
            }, 500); // Update after 500ms of no typing
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                if (updateTimeout) clearTimeout(updateTimeout);
                finishEdit();
                this.navigateCell('down');
            } else if (e.key === 'Tab') {
                e.preventDefault();
                if (updateTimeout) clearTimeout(updateTimeout);
                finishEdit();
                this.navigateCell(e.shiftKey ? 'left' : 'right');
            } else if (e.key === 'Escape') {
                if (updateTimeout) clearTimeout(updateTimeout);
                this.isEditing = false;
                this.render(); // Restore original value
            }
        });
    }

    editColumnHeader(labelElement) {
        const columnId = labelElement.dataset.col;
        const column = this.columns.find(c => c.id === columnId);
        
        const input = document.createElement('input');
        input.type = 'text';
        input.value = column.label;
        input.style.cssText = 'width: 100%; background: transparent; border: 1px solid #3b82f6; border-radius: 2px; padding: 2px 4px;';
        
        labelElement.innerHTML = '';
        labelElement.appendChild(input);
        input.focus();
        input.select();
        
        const finishEdit = () => {
            const newLabel = input.value.trim() || column.label;
            column.label = newLabel;
            labelElement.innerHTML = newLabel;
            this.updateChart();
        };
        
        input.addEventListener('blur', finishEdit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                finishEdit();
            } else if (e.key === 'Escape') {
                labelElement.innerHTML = column.label;
            }
        });
    }

    toggleColumnType(columnId) {
        const column = this.columns.find(c => c.id === columnId);
        if (!column) return;
        
        // Don't allow changing the first column (category) to number
        if (columnId === 'category') {
            alert('The category column must remain as text type.');
            return;
        }
        
        // Toggle between text and number
        const newType = column.type === 'number' ? 'text' : 'number';
        column.type = newType;
        
        // Convert existing data to match new type
        this.data.forEach(row => {
            if (newType === 'number') {
                row[columnId] = this.parseNumber(row[columnId]);
            } else {
                row[columnId] = String(row[columnId] || '');
            }
        });
        
        this.render();
        this.updateChart();
        
        console.log(`✅ Column ${column.label} changed to ${newType} type`);
    }

    addColumn() {
        const newColumnId = 'col_' + Date.now();
        const newColumn = {
            id: newColumnId,
            label: `Value ${this.getValueColumnCount() + 1}`,
            type: 'number', // Default to numeric for value columns
            required: false
        };
        
        this.columns.push(newColumn);
        
        // Add the new column to existing data
        this.data.forEach(row => {
            row[newColumnId] = 0; // Default to 0 for numeric columns
        });
        
        this.render();
    }

    getValueColumnCount() {
        return this.columns.filter(col => col.type === 'number').length;
    }

    deleteColumn(columnId) {
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

    handleKeydown(e) {
        if (!this.selectedCell || this.isEditing) return;
        
        // Handle keyboard shortcuts
        if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
            e.preventDefault();
            this.handlePasteButton();
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
            this.processPasteData(text);
        } catch (err) {
            // Fallback: show paste dialog
            const text = prompt('Paste your data here (CSV/TSV format):\nExample:\nProduct A,100\nProduct B,150');
            if (text) {
                this.processPasteData(text);
            }
        }
    }

    handlePaste(e) {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        this.processPasteData(text);
    }

    processPasteData(text) {
        if (!text || !text.trim()) return;
        
        const lines = text.trim().split('\n');
        const startRow = this.selectedCell ? parseInt(this.selectedCell.dataset.row) : 0;
        const startCol = this.selectedCell ? this.selectedCell.dataset.col : this.columns[0].id;
        const startColIndex = this.columns.findIndex(c => c.id === startCol);
        
        // First pass: determine if we need more columns
        let maxColumnsNeeded = startColIndex;
        lines.forEach(line => {
            const values = line.split(/[\t,]/).map(v => v.trim());
            maxColumnsNeeded = Math.max(maxColumnsNeeded, startColIndex + values.length - 1);
        });
        
        // Add columns if needed
        while (this.columns.length <= maxColumnsNeeded) {
            this.addColumn();
        }
        
        // Second pass: paste data
        lines.forEach((line, lineIndex) => {
            const values = line.split(/[\t,]/).map(v => v.trim());
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
                    if (targetCol.type === 'number') {
                        this.data[targetRow][targetCol.id] = this.parseNumber(value);
                    } else {
                        this.data[targetRow][targetCol.id] = value;
                    }
                }
            });
        });
        
        this.render();
        this.updateChart();
        
        console.log('✅ Pasted data successfully with auto-column expansion');
    }

    getCellValue(cell) {
        const row = parseInt(cell.dataset.row);
        const col = cell.dataset.col;
        return this.data[row][col];
    }

    setCellValue(cell, value) {
        const row = parseInt(cell.dataset.row);
        const col = cell.dataset.col;
        const column = this.columns.find(c => c.id === col);
        
        if (column.type === 'number') {
            this.data[row][col] = this.parseNumber(value);
        } else {
            this.data[row][col] = value;
        }
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
            // Don't delete the last row, just clear it
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

    updateStatus() {
        const rowCount = this.container.querySelector('.row-count');
        const colCount = this.container.querySelector('.col-count');
        rowCount.textContent = `${this.data.length} rows`;
        colCount.textContent = `${this.columns.length} cols`;
    }

    updateChart() {
        console.log('🔄 BarDataEditor: updateChart() called');
        console.log('🔄 BarDataEditor: Current data:', this.data);
        console.log('🔄 BarDataEditor: pulseApp available:', !!(window.pulseApp && window.pulseApp.updateData));
        
        // Update via the app (primary method for multi-column support)
        if (window.pulseApp && window.pulseApp.updateData) {
            const chartData = this.getChartFormattedData();
            console.log('🔄 BarDataEditor: Formatted chart data:', chartData);
            if (chartData) {
                const result = window.pulseApp.updateData(chartData, 'data-editor');
                console.log('✅ BarDataEditor: Chart update result:', result);
            } else {
                console.warn('⚠️ BarDataEditor: No chart data to send');
            }
        } else {
            console.warn('⚠️ BarDataEditor: pulseApp.updateData not available');
        }
        
        // Legacy support for direct chart instance
        if (this.chart && this.chart.render) {
            const chartData = this.getSimpleChartData();
            if (chartData.length > 0) {
                this.chart.render(chartData);
                console.log('✅ Chart updated with simple data via chart instance');
            }
        }
    }

    getSimpleChartData() {
        const categoryCol = this.columns.find(c => c.id === 'category' || c.label.toLowerCase().includes('category'));
        const valueCol = this.columns.find(c => c.id === 'value' || c.type === 'number');
        
        if (!categoryCol || !valueCol) return [];
        
        return this.data.filter(row => row[categoryCol.id] && row[valueCol.id] > 0)
            .map(row => ({
                category: row[categoryCol.id],
                value: row[valueCol.id]
            }));
    }

    getChartFormattedData() {
        // Find category column (text type)
        const categoryCol = this.columns.find(c => c.type === 'text' || c.id === 'category');
        if (!categoryCol) {
            console.warn('⚠️ No category column found');
            return null;
        }
        
        // Find all numeric columns (value series)
        const valueColumns = this.columns.filter(c => c.type === 'number');
        console.log('📊 All columns:', this.columns);
        console.log('📊 Numeric columns filter result:', valueColumns);
        
        if (valueColumns.length === 0) {
            console.warn('⚠️ No numeric columns found');
            return null;
        }
        
        // Filter valid data (must have category and at least one numeric value)
        console.log('📊 Raw data before validation:', this.data);
        console.log('📊 Category column ID:', categoryCol.id);
        
        const validData = this.data.filter(row => {
            const hasCategory = row[categoryCol.id] && row[categoryCol.id].trim();
            const hasValues = valueColumns.some(col => {
                const value = row[col.id];
                console.log(`📊 Checking row ${row[categoryCol.id]}, column ${col.id}: ${value} (type: ${typeof value})`);
                return value > 0;
            });
            
            console.log(`📊 Row ${row[categoryCol.id]}: hasCategory=${hasCategory}, hasValues=${hasValues}`);
            return hasCategory && hasValues;
        });
        
        console.log('📊 Valid data after filtering:', validData);
        
        if (validData.length === 0) {
            console.warn('⚠️ No valid data rows found');
            return null;
        }
        
        console.log(`📊 Formatting data: ${validData.length} rows, ${valueColumns.length} value columns`);
        console.log('📊 Value columns found:', valueColumns.map(col => ({ id: col.id, label: col.label, type: col.type })));
        console.log('📊 Sample valid data row:', validData[0]);
        
        // For single value column (simple bar chart)
        if (valueColumns.length === 1) {
            console.log('📊 Creating single-column format (categories + values)');
        } else {
            console.log('📊 Creating multi-column format (categories + series)');
        }
        
        if (valueColumns.length === 1) {
            return {
                metadata: {
                    title: "Chart Data",
                    chartType: "bar"
                },
                categories: validData.map(row => row[categoryCol.id]),
                values: validData.map(row => row[valueColumns[0].id]),
                labels: validData.map(row => row[categoryCol.id])
            };
        }
        
        // For multiple value columns (grouped/stacked bar chart)
        const series = valueColumns.map(col => ({
            name: col.label,
            data: validData.map(row => row[col.id] || 0)
        }));
        
        console.log('📊 Created series data:', series);
        
        const result = {
            metadata: {
                title: "Multi-Series Chart Data",
                chartType: "bar"
            },
            categories: validData.map(row => row[categoryCol.id]),
            series: series,
            // Legacy format for backward compatibility
            values: validData.map(row => row[valueColumns[0].id]),
            labels: validData.map(row => row[categoryCol.id])
        };
        
        console.log('📊 Final formatted result:', result);
        return result;
    }

    parseNumber(value) {
        const num = parseFloat(value);
        return isNaN(num) ? 0 : num;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
        this.container.innerHTML = '';
    }
}