/* ===== UNIFIED SPREADSHEET EDITOR FACTORY ===== */
/* Factory class that creates appropriate specialized spreadsheet editors */
/* Maintains backward compatibility while using separated chart-specific editors */

class UnifiedSpreadsheetEditor {
    constructor(containerId, chartInstance, chartType = 'sankey') {
        console.log(`🏭 UnifiedSpreadsheetEditor Factory: Creating ${chartType} editor`);
        
        // Create the appropriate specialized editor based on chart type
        if (chartType === 'sankey') {
            this.editor = new SankeySpreadsheetEditor(containerId, chartInstance);
        } else if (chartType === 'bar') {
            this.editor = new BarSpreadsheetEditor(containerId, chartInstance);
        } else {
            console.warn(`⚠️ Unknown chart type: ${chartType}, defaulting to Sankey`);
            this.editor = new SankeySpreadsheetEditor(containerId, chartInstance);
        }
        
        // Store chart type for compatibility
        this.chartType = chartType;
        
        // Proxy all properties and methods to the underlying editor
        return new Proxy(this, {
            get(target, prop) {
                // Handle special cases for factory methods
                if (prop === 'switchChartType') {
                    return target.switchChartType.bind(target);
                }
                if (prop === 'destroy') {
                    return target.destroy.bind(target);
                }
                if (prop === 'editor') {
                    return target.editor;
                }
                if (prop === 'chartType') {
                    return target.chartType;
                }
                
                // Proxy everything else to the underlying editor
                if (target.editor && prop in target.editor) {
                    const value = target.editor[prop];
                    if (typeof value === 'function') {
                        return value.bind(target.editor);
                    }
                    return value;
                }
                
                return target[prop];
            },
            
            set(target, prop, value) {
                // Proxy property setting to the underlying editor
                if (target.editor && prop in target.editor) {
                    target.editor[prop] = value;
                } else {
                    target[prop] = value;
                }
                return true;
            }
        });
    }
    
    switchChartType(newChartType) {
        console.log(`🔄 Switching spreadsheet from ${this.chartType} to ${newChartType}`);
        
        if (this.chartType === newChartType) {
            console.log('📊 Chart type unchanged, no action needed');
            return;
        }
        
        // Store the container ID and chart instance before destroying
        const containerId = this.editor.container.id;
        const chartInstance = this.editor.chart;
        
        // Destroy current editor
        if (this.editor && this.editor.destroy) {
            this.editor.destroy();
        }
        
        // Update chart type
        this.chartType = newChartType;
        
        // Create new editor of the correct type
        if (newChartType === 'sankey') {
            this.editor = new SankeySpreadsheetEditor(containerId, chartInstance);
        } else if (newChartType === 'bar') {
            this.editor = new BarSpreadsheetEditor(containerId, chartInstance);
        } else {
            console.warn(`⚠️ Unknown chart type: ${newChartType}, defaulting to Sankey`);
            this.editor = new SankeySpreadsheetEditor(containerId, chartInstance);
        }
        
        console.log(`✅ Switched to ${newChartType} spreadsheet editor`);
    }
    
    destroy() {
        if (this.editor && this.editor.destroy) {
            this.editor.destroy();
        }
        this.editor = null;
    }
}

// Export for use
window.UnifiedSpreadsheetEditor = UnifiedSpreadsheetEditor;
console.log('🚀 UnifiedSpreadsheetEditor factory loaded successfully');
console.log('📋 UnifiedSpreadsheetEditor class:', UnifiedSpreadsheetEditor);