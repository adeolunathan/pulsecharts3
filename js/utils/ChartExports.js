/* ===== CHART EXPORTS ===== */
/* Generic export functions for chart components - reusable across chart types */
/* Extracted from SankeyChart.js for better modularity */

window.ChartExports = (function() {
    'use strict';

    /**
     * Export chart to PNG format
     * Requires: this.svg (the SVG element), this.config.backgroundColor, this.generateFileName function
     */
    function exportToPNG() {
        const filename = this.generateFileName('png');
        console.log('📊 CHART TYPE:', this.constructor.name);
        console.log('🎨 CHART CONFIG BACKGROUND:', this.config.backgroundColor);
        
        const options = {
            scale: 2,
            quality: 0.95,
            backgroundColor: this.config.backgroundColor
        };
        
        console.log('🎨 FINAL EXPORT BACKGROUND:', options.backgroundColor);
        
        if (window.ExportUtils) {
            window.ExportUtils.exportToPNG(this.svg, filename, options);
        } else {
            console.error('ExportUtils not loaded');
            alert('Export functionality not available. Please ensure ExportUtils.js is loaded.');
        }
    }

    /**
     * Export chart to SVG format
     * Requires: this.svg (the SVG element), this.config.backgroundColor, this.generateFileName function
     */
    function exportToSVG() {
        const filename = this.generateFileName('svg');
        console.log('🔍 SVG Export - Chart config backgroundColor:', this.config.backgroundColor);
        
        const options = {
            includeStyles: true,
            backgroundColor: this.config.backgroundColor || window.GlobalChartConfig?.getGlobalBackgroundColor() || '#faf9f0' // Force beige
        };
        
        console.log('🔍 SVG Export options backgroundColor:', options.backgroundColor);
        
        if (window.ExportUtils) {
            window.ExportUtils.exportToSVG(this.svg, filename, options);
        } else {
            console.error('ExportUtils not loaded');
            alert('Export functionality not available. Please ensure ExportUtils.js is loaded.');
        }
    }

    /**
     * Export data to CSV format
     * Requires: this.generateFileName function
     * @param {Object} data - Data to export
     */
    function exportDataToCSV(data) {
        const filename = this.generateFileName('csv');
        const options = {
            includeHeaders: true,
            includeMetadata: true
        };
        
        if (window.ExportUtils) {
            window.ExportUtils.exportDataToCSV(data, filename, options);
        } else {
            console.error('ExportUtils not loaded');
            alert('Export functionality not available. Please ensure ExportUtils.js is loaded.');
        }
    }

    /**
     * Generate filename for exported files
     * Requires: this.data (chart data with metadata)
     * @param {string} extension - File extension (png, svg, csv, etc.)
     * @returns {string} Generated filename
     */
    function generateFileName(extension = 'png') {
        const metadata = this.data?.metadata || {};
        
        let company = metadata.company || metadata.title || 'Chart';
        company = company.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
        
        let period = metadata.period || 'Period';
        period = period.replace(/[^a-zA-Z0-9\-]/g, '').substring(0, 10);
        
        const now = new Date();
        const timestamp = now.getFullYear().toString() +
                         (now.getMonth() + 1).toString().padStart(2, '0') +
                         now.getDate().toString().padStart(2, '0') + '-' +
                         now.getHours().toString().padStart(2, '0') +
                         now.getMinutes().toString().padStart(2, '0');
        
        return `${company}_${period}_${timestamp}.${extension}`;
    }

    // Public API
    return {
        exportToPNG: exportToPNG,
        exportToSVG: exportToSVG,
        exportDataToCSV: exportDataToCSV,
        generateFileName: generateFileName
    };
})();