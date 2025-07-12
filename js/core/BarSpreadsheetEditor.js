/* ===== BAR CHART SPREADSHEET EDITOR ===== */
/* Specialized spreadsheet editor for Bar charts with dynamic column support */

class BarSpreadsheetEditor extends SpreadsheetEditor {
    constructor(containerId, chartInstance) {
        super(containerId, chartInstance);
        this.chartType = 'bar';
        this.init();
    }

    getDefaultConfig() {
        return {
            columns: [
                { id: 'category', label: 'Category', type: 'text', required: true },
                { id: 'value', label: 'Value', type: 'number', required: true }
            ],
            dataFormat: 'categories',
            title: '📊 Bar Chart Data Editor',
            allowDynamicColumns: true
        };
    }

    hasValidChartData(chartData) {
        return chartData && (chartData.categories || chartData.values || chartData.series);
    }

    loadExistingChartData(chartData) {
        try {
            this.loadBarChartData(chartData);
            console.log('📊 Successfully loaded Bar chart data into editor');
        } catch (error) {
            console.error('⚠️ Error loading Bar chart data:', error);
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

    getChartFormattedData() {
        return this.getBarChartFormattedData();
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
                metadata: { title: "Chart Data", chartType: "bar", source: "bar-spreadsheet-editor" },
                categories: [], values: [], labels: []
            };
        }
        
        if (valueColumns.length === 1) {
            // Single series
            return {
                metadata: { title: "Chart Data", chartType: "bar", source: "bar-spreadsheet-editor" },
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
                metadata: { title: "Multi-Series Chart Data", chartType: "bar", source: "bar-spreadsheet-editor" },
                categories: validData.map(row => row[categoryCol.id]),
                series: series,
                values: validData.map(row => row[valueColumns[0].id]),
                labels: validData.map(row => row[categoryCol.id])
            };
        }
    }

    createColumnsFromHeaders(headerRow) {
        // Clear existing columns
        this.columns = [];
        
        // Create columns based on headers for Bar charts
        headerRow.forEach((header, index) => {
            let columnId, columnType;
            
            columnId = index === 0 ? 'category' : (index === 1 ? 'value' : `value_${index}`);
            columnType = index === 0 ? 'text' : 'number';
            
            this.columns.push({
                id: columnId,
                name: header || `Column ${index + 1}`,
                label: header || `Column ${index + 1}`,
                type: columnType,
                required: index === 0
            });
        });
    }

    // Dynamic column management (Bar charts support this)
    addColumn() {
        if (!this.config.allowDynamicColumns) return;
        
        const valueColumnCount = this.columns.filter(col => col.type === 'number').length;
        const newColumnId = valueColumnCount === 0 ? 'value' : `value_${valueColumnCount + 1}`;
        const newColumn = {
            id: newColumnId,
            label: `Value ${valueColumnCount + 1}`,
            name: `Value ${valueColumnCount + 1}`,
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
        if (!this.config.allowDynamicColumns) return;
        
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
        if (!this.config.allowDynamicColumns) return;
        
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

    testPaste() {
        const testData = `Product	Q1 Sales	Q2 Sales
Laptops	$1,250.50	$1,450.75
Tablets	$890.25	$920.00
Phones	$2,100.00	$2,250.50`;
        
        console.log('🧪 Testing Bar chart paste with sample data');
        this.processPasteData(testData);
    }

    // Bar chart-specific validation
    validateBarData(row) {
        const categoryCol = this.columns.find(c => c.type === 'text' || c.id === 'category');
        const valueColumns = this.columns.filter(c => c.type === 'number');
        
        if (!categoryCol) return false;
        
        const hasCategory = row[categoryCol.id] && row[categoryCol.id].trim();
        const hasValue = valueColumns.some(col => {
            const value = row[col.id];
            return value !== undefined && value !== null && value !== '' && typeof value === 'number';
        });
        
        return hasCategory && hasValue;
    }

    // Override updateChart to include Bar chart-specific validation
    updateChart() {
        console.log('🔄 BarSpreadsheetEditor: updateChart() called');
        
        // Validate data before updating
        const invalidRows = this.data.filter((row, index) => {
            const isEmpty = this.columns.every(col => !row[col.id] || row[col.id] === '');
            return !isEmpty && !this.validateBarData(row);
        });
        
        if (invalidRows.length > 0) {
            console.warn('⚠️ Found invalid Bar chart data rows:', invalidRows);
        }
        
        // Call parent updateChart
        super.updateChart();
    }

    // Add method to get chart statistics
    getChartStatistics() {
        const categoryCol = this.columns.find(c => c.type === 'text' || c.id === 'category');
        const valueColumns = this.columns.filter(c => c.type === 'number');
        
        if (!categoryCol || valueColumns.length === 0) {
            return { error: 'Invalid chart configuration' };
        }
        
        const validData = this.data.filter(row => this.validateBarData(row));
        
        const stats = {
            totalCategories: validData.length,
            valueColumns: valueColumns.length,
            series: {}
        };
        
        valueColumns.forEach(col => {
            const values = validData.map(row => row[col.id]).filter(v => typeof v === 'number');
            if (values.length > 0) {
                stats.series[col.label] = {
                    min: Math.min(...values),
                    max: Math.max(...values),
                    avg: values.reduce((sum, v) => sum + v, 0) / values.length,
                    total: values.reduce((sum, v) => sum + v, 0)
                };
            }
        });
        
        return stats;
    }

    // Helper method to detect data patterns
    detectDataPatterns() {
        const patterns = {
            hasNegativeValues: false,
            hasZeroValues: false,
            hasDecimalValues: false,
            hasCurrencyPattern: false,
            hasPercentagePattern: false,
            largestValue: 0,
            smallestValue: Infinity
        };
        
        const valueColumns = this.columns.filter(c => c.type === 'number');
        
        this.data.forEach(row => {
            valueColumns.forEach(col => {
                const value = row[col.id];
                if (typeof value === 'number') {
                    if (value < 0) patterns.hasNegativeValues = true;
                    if (value === 0) patterns.hasZeroValues = true;
                    if (value % 1 !== 0) patterns.hasDecimalValues = true;
                    if (value > patterns.largestValue) patterns.largestValue = value;
                    if (value < patterns.smallestValue) patterns.smallestValue = value;
                }
            });
        });
        
        // Check for currency and percentage patterns in original data
        this.data.forEach(row => {
            valueColumns.forEach(col => {
                const originalValue = String(row[col.id] || '');
                if (originalValue.includes('$') || originalValue.includes('€') || originalValue.includes('£')) {
                    patterns.hasCurrencyPattern = true;
                }
                if (originalValue.includes('%')) {
                    patterns.hasPercentagePattern = true;
                }
            });
        });
        
        if (patterns.smallestValue === Infinity) patterns.smallestValue = 0;
        
        return patterns;
    }

    // Method to suggest chart optimizations
    suggestOptimizations() {
        const stats = this.getChartStatistics();
        const patterns = this.detectDataPatterns();
        const suggestions = [];
        
        // Suggest sorting
        if (stats.totalCategories > 3) {
            suggestions.push({
                type: 'sorting',
                message: 'Consider sorting categories by value for better visualization',
                action: 'sort'
            });
        }
        
        // Suggest handling negative values
        if (patterns.hasNegativeValues) {
            suggestions.push({
                type: 'negative-values',
                message: 'Chart contains negative values - consider using a different chart type or data transformation',
                action: 'transform'
            });
        }
        
        // Suggest removing zero values
        if (patterns.hasZeroValues && stats.totalCategories > 5) {
            suggestions.push({
                type: 'zero-values',
                message: 'Consider removing categories with zero values to improve readability',
                action: 'filter'
            });
        }
        
        // Suggest value formatting
        if (patterns.largestValue > 1000000) {
            suggestions.push({
                type: 'large-numbers',
                message: 'Large numbers detected - consider using abbreviated formats (K, M, B)',
                action: 'format'
            });
        }
        
        return suggestions;
    }

    // Auto-sort functionality
    sortDataByValue(ascending = false) {
        const valueColumns = this.columns.filter(c => c.type === 'number');
        if (valueColumns.length === 0) return;
        
        const primaryValueColumn = valueColumns[0];
        
        this.data.sort((a, b) => {
            const aValue = a[primaryValueColumn.id] || 0;
            const bValue = b[primaryValueColumn.id] || 0;
            return ascending ? aValue - bValue : bValue - aValue;
        });
        
        this.render();
        this.updateChart();
        
        console.log(`📊 Data sorted by ${primaryValueColumn.label} (${ascending ? 'ascending' : 'descending'})`);
    }
}

// Export for use
window.BarSpreadsheetEditor = BarSpreadsheetEditor;
