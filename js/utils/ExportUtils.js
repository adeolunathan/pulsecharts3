/* ===== PULSE EXPORT UTILITIES - ENHANCED ===== */
/* Complete export functionality for charts and financial data */

window.ExportUtils = (function() {
    'use strict';

    // Export chart as PNG using canvas conversion
    function exportToPNG(svgElement, filename = 'pulse-chart.png', options = {}) {
        const settings = {
            scale: options.scale || 2, // High DPI for crisp images
            quality: options.quality || 0.95,
            backgroundColor: options.backgroundColor || '#ffffff',
            ...options
        };

        try {
            // Get SVG dimensions
            const svgNode = svgElement.node ? svgElement.node() : svgElement;
            const svgRect = svgNode.getBoundingClientRect();
            const svgData = new XMLSerializer().serializeToString(svgNode);
            
            // Create canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            // Set canvas size with scaling
            canvas.width = svgRect.width * settings.scale;
            canvas.height = svgRect.height * settings.scale;
            
            img.onload = function() {
                // Fill background
                ctx.fillStyle = settings.backgroundColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw image scaled
                ctx.scale(settings.scale, settings.scale);
                ctx.drawImage(img, 0, 0);
                
                // Convert to PNG and download
                canvas.toBlob(function(blob) {
                    downloadBlob(blob, filename);
                }, 'image/png', settings.quality);
            };
            
            img.onerror = function(error) {
                console.error('Error converting SVG to PNG:', error);
                alert('Export failed. Please try SVG export instead.');
            };
            
            // Convert SVG to data URL
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            img.src = url;
            
        } catch (error) {
            console.error('PNG Export Error:', error);
            alert('PNG export failed. Please try SVG export instead.');
        }
    }

    // Enhanced SVG export with proper styling
    function exportToSVG(svgElement, filename = 'pulse-chart.svg', options = {}) {
        try {
            const svgNode = svgElement.node ? svgElement.node() : svgElement;
            
            // Clone the SVG to avoid modifying the original
            const clonedSvg = svgNode.cloneNode(true);
            
            // Ensure proper SVG namespace and attributes
            clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
            
            // Add embedded styles if requested
            if (options.includeStyles !== false) {
                addEmbeddedStyles(clonedSvg);
            }
            
            // Set background if specified
            if (options.backgroundColor) {
                const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                background.setAttribute('width', '100%');
                background.setAttribute('height', '100%');
                background.setAttribute('fill', options.backgroundColor);
                clonedSvg.insertBefore(background, clonedSvg.firstChild);
            }
            
            // Serialize and download
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(clonedSvg);
            const blob = new Blob([svgString], { type: 'image/svg+xml' });
            downloadBlob(blob, filename);
            
        } catch (error) {
            console.error('SVG Export Error:', error);
            alert('SVG export failed. Please check console for details.');
        }
    }

    // Export data as CSV
    function exportDataToCSV(data, filename = 'pulse-data.csv', options = {}) {
        try {
            const settings = {
                delimiter: options.delimiter || ',',
                includeHeaders: options.includeHeaders !== false,
                includeMetadata: options.includeMetadata || false,
                ...options
            };
            
            let csvContent = '';
            
            // Add metadata as comments if requested
            if (settings.includeMetadata && data.metadata) {
                csvContent += `# Financial Data Export\n`;
                csvContent += `# Title: ${data.metadata.title || 'N/A'}\n`;
                csvContent += `# Exported: ${new Date().toISOString()}\n`;
                csvContent += `# Currency: ${data.metadata.currency || 'USD'}\n`;
                csvContent += `# Unit: ${data.metadata.unit || 'millions'}\n\n`;
            }
            
            // Nodes data
            if (settings.includeHeaders) {
                csvContent += 'Type,ID,Depth,Value,Category,Description\n';
            }
            
            data.nodes.forEach(node => {
                const row = [
                    'Node',
                    `"${node.id || ''}"`,
                    node.depth || 0,
                    node.value || 0,
                    `"${node.category || ''}"`,
                    `"${(node.description || '').replace(/"/g, '""')}"`
                ].join(settings.delimiter);
                csvContent += row + '\n';
            });
            
            // Add separator
            csvContent += '\n';
            
            // Links data
            if (settings.includeHeaders) {
                csvContent += 'Type,Source,Target,Value,Flow Type\n';
            }
            
            data.links.forEach(link => {
                const row = [
                    'Link',
                    `"${link.source || ''}"`,
                    `"${link.target || ''}"`,
                    link.value || 0,
                    `"${link.type || ''}"`
                ].join(settings.delimiter);
                csvContent += row + '\n';
            });
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            downloadBlob(blob, filename);
            
        } catch (error) {
            console.error('CSV Export Error:', error);
            alert('CSV export failed. Please check console for details.');
        }
    }

    // NEW: Export financial flows to CSV (template format)
    // NEW: Export financial flows to CSV (template format)
    function exportFinancialFlowsToCSV(flowData, options = {}) {
        try {
            const filename = generateFinancialFileName(flowData.metadata, 'csv');
            
            let csvContent = '';
            
            // Add metadata header
            if (options.includeMetadata !== false) {
                csvContent += `# Financial Flow Export\n`;
                csvContent += `# Company: ${flowData.metadata.company || 'N/A'}\n`;
                csvContent += `# Period: ${flowData.metadata.period || 'N/A'}\n`;
                csvContent += `# Statement Type: ${flowData.metadata.statementType || 'income'}\n`;
                csvContent += `# Currency: ${flowData.metadata.currency || 'USD'}\n`;
                csvContent += `# Unit: ${flowData.metadata.unit || 'millions'}\n`;
                csvContent += `# Exported: ${new Date().toISOString()}\n\n`;
            }
            
            // Header row - include Previous Amount if comparison mode is enabled
            if (flowData.metadata.comparisonMode) {
                csvContent += 'Statement Type,Source,Target,Amount,Previous Amount,Flow Type,Source Layer,Target Layer,Source Category,Target Category,Description\n';
            } else {
                csvContent += 'Statement Type,Source,Target,Amount,Flow Type,Source Layer,Target Layer,Source Category,Target Category,Description\n';
            }
            
            // Data rows
            flowData.flows.forEach(flow => {
                if (flowData.metadata.comparisonMode) {
                    const row = [
                        `"${flowData.metadata.statementType || 'income'}"`,
                        `"${flow.source || ''}"`,
                        `"${flow.target || ''}"`,
                        flow.value || 0,
                        flow.previousValue || 0,
                        `"${flow.flowType || ''}"`,
                        flow.sourceLayer || 0,
                        flow.targetLayer || 0,
                        `"${flow.sourceCategory || ''}"`,
                        `"${flow.targetCategory || ''}"`,
                        `"${(flow.description || '').replace(/"/g, '""')}"`
                    ].join(',');
                    csvContent += row + '\n';
                } else {
                    const row = [
                        `"${flowData.metadata.statementType || 'income'}"`,
                        `"${flow.source || ''}"`,
                        `"${flow.target || ''}"`,
                        flow.value || 0,
                        `"${flow.flowType || ''}"`,
                        flow.sourceLayer || 0,
                        flow.targetLayer || 0,
                        `"${flow.sourceCategory || ''}"`,
                        `"${flow.targetCategory || ''}"`,
                        `"${(flow.description || '').replace(/"/g, '""')}"`
                    ].join(',');
                    csvContent += row + '\n';
                }
            });
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            downloadBlob(blob, filename);
            
            console.log(`✅ Exported ${flowData.flows.length} flows to ${filename}`);
            
        } catch (error) {
            console.error('Financial flows CSV export failed:', error);
            alert('Failed to export financial flows. Please check console for details.');
        }
    }

    // NEW: Export financial flows to JSON (template format)
    function exportFinancialFlowsToJSON(flowData, options = {}) {
        try {
            const filename = generateFinancialFileName(flowData.metadata, 'json');
            
            const exportData = {
                metadata: {
                    ...flowData.metadata,
                    exportedAt: new Date().toISOString(),
                    exportVersion: '1.0'
                },
                flows: flowData.flows,
                summary: {
                    totalFlows: flowData.flows.length,
                    statementType: flowData.metadata.statementType || 'income',
                    balanceScore: calculateBalanceScore(flowData.flows)
                }
            };
            
            const jsonString = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            downloadBlob(blob, filename);
            
            console.log(`✅ Exported flow data to ${filename}`);
            
        } catch (error) {
            console.error('Financial flows JSON export failed:', error);
            alert('Failed to export financial flows as JSON. Please check console for details.');
        }
    }

    // Generate filename for financial data using existing convention
    function generateFinancialFileName(metadata, extension = 'csv') {
        let company = metadata.company || metadata.title || 'Company';
        company = company.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
        
        let period = metadata.period || 'Period';
        period = period.replace(/[^a-zA-Z0-9\-]/g, '').substring(0, 10);
        
        const statementType = metadata.statementType || 'financial';
        
        const now = new Date();
        const timestamp = now.getFullYear().toString() +
                         (now.getMonth() + 1).toString().padStart(2, '0') +
                         now.getDate().toString().padStart(2, '0') + '-' +
                         now.getHours().toString().padStart(2, '0') +
                         now.getMinutes().toString().padStart(2, '0');
        
        return `${company}_${statementType}_${period}_${timestamp}.${extension}`;
    }

    // Calculate balance score for flows
    function calculateBalanceScore(flows) {
        if (flows.length === 0) return 0;
        
        let balancedFlows = 0;
        flows.forEach(flow => {
            const isValid = flow.source && flow.target && flow.value !== 0 && flow.sourceLayer < flow.targetLayer;
            if (isValid) balancedFlows++;
        });
        
        return Math.round((balancedFlows / flows.length) * 100);
    }

    // Generate filename using existing convention (from original ExportUtils)
    function generateFileName(metadata, extension = 'png') {
        let company = metadata?.company || metadata?.title || 'Chart';
        company = company.replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
        
        let period = metadata?.period || 'Period';
        period = period.replace(/[^a-zA-Z0-9\-]/g, '').substring(0, 10);
        
        const now = new Date();
        const timestamp = now.getFullYear().toString() +
                         (now.getMonth() + 1).toString().padStart(2, '0') +
                         now.getDate().toString().padStart(2, '0') + '-' +
                         now.getHours().toString().padStart(2, '0') +
                         now.getMinutes().toString().padStart(2, '0');
        
        return `${company}_${period}_${timestamp}.${extension}`;
    }

    // Export comprehensive PDF report
    function exportToPDF(svgElement, data, filename = 'pulse-report.pdf', options = {}) {
        // For now, convert to PNG and provide instructions
        // Full PDF generation would require a library like jsPDF
        console.log('PDF export would require jsPDF library. Converting to high-quality PNG instead.');
        
        const pngOptions = {
            scale: 3, // Very high resolution for print
            quality: 1.0,
            backgroundColor: '#ffffff'
        };
        
        const pngFilename = filename.replace('.pdf', '-high-res.png');
        exportToPNG(svgElement, pngFilename, pngOptions);
        
        // Provide instructions for PDF conversion
        setTimeout(() => {
            alert(`High-resolution PNG exported as ${pngFilename}.\n\nTo create a PDF:\n1. Open the PNG in any image viewer\n2. Print to PDF\n3. Choose appropriate paper size\n\nFor automated PDF generation, consider integrating jsPDF library.`);
        }, 1000);
    }

    // Add embedded CSS styles to SVG for standalone viewing
    function addEmbeddedStyles(svgElement) {
        // Load styles from the main CSS file for embedded SVG exports
        const link = document.querySelector('link[href*="pulse-analytics.css"]');
        if (link) {
            // For standalone SVG, we still need some basic styles
            const styles = `
                <style>
                    .pulse-sankey-chart {
                        font-family: "Inter", "Segoe UI", system-ui, sans-serif;
                    }
                    .sankey-link path {
                        transition: all 0.2s ease;
                    }
                    .sankey-node rect {
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    }
                    .node-label-group text {
                        font-family: "Inter", "Segoe UI", system-ui, sans-serif;
                    }
                    .chart-svg {
                        max-width: 100%;
                        display: block;
                        margin: 0 auto;
                    }
                </style>
            `;
            
            const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            styleElement.innerHTML = styles;
            svgElement.insertBefore(styleElement, svgElement.firstChild);
        }
    }

    // Utility: Download blob as file
    function downloadBlob(blob, filename) {
        try {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
        } catch (error) {
            console.error('Download Error:', error);
            alert('Download failed. Please check your browser settings.');
        }
    }

    // Utility: Create download link
    function createDownloadLink(data, filename, mimeType) {
        try {
            const blob = new Blob([data], { type: mimeType });
            return URL.createObjectURL(blob);
        } catch (error) {
            console.error('Create Download Link Error:', error);
            return null;
        }
    }

    // Get optimal export dimensions
    function getExportDimensions(svgElement, targetFormat = 'png') {
        const svgNode = svgElement.node ? svgElement.node() : svgElement;
        const rect = svgNode.getBoundingClientRect();
        
        const dimensions = {
            width: rect.width,
            height: rect.height,
            aspectRatio: rect.width / rect.height
        };
        
        // Format-specific optimizations
        switch (targetFormat.toLowerCase()) {
            case 'png':
                return {
                    ...dimensions,
                    recommendedScale: 2,
                    maxWidth: 4096,
                    maxHeight: 4096
                };
            case 'svg':
                return {
                    ...dimensions,
                    scalable: true,
                    vectorFormat: true
                };
            case 'pdf':
                return {
                    ...dimensions,
                    recommendedDPI: 300,
                    printSize: {
                        a4: { width: 210, height: 297 }, // mm
                        letter: { width: 216, height: 279 } // mm
                    }
                };
            default:
                return dimensions;
        }
    }

    // Validate export compatibility
    function validateExportSupport() {
        const support = {
            png: !!(document.createElement('canvas').getContext),
            svg: !!window.XMLSerializer,
            csv: !!window.Blob,
            pdf: false, // Would be true if jsPDF is loaded
            download: !!(document.createElement('a').download !== undefined)
        };
        
        return support;
    }

    // Export public API
    return {
        // Primary export functions
        exportToPNG: exportToPNG,
        exportToSVG: exportToSVG,
        exportDataToCSV: exportDataToCSV,
        exportToPDF: exportToPDF,
        
        // NEW: Financial data specific exports
        exportFinancialFlowsToCSV: exportFinancialFlowsToCSV,
        exportFinancialFlowsToJSON: exportFinancialFlowsToJSON,
        generateFinancialFileName: generateFinancialFileName,
        
        // Utility functions
        downloadBlob: downloadBlob,
        createDownloadLink: createDownloadLink,
        getExportDimensions: getExportDimensions,
        validateExportSupport: validateExportSupport,
        generateFileName: generateFileName,
        
        // Batch export (export multiple formats at once)
        exportMultiple: function(svgElement, data, baseName = 'pulse-chart', formats = ['png', 'svg']) {
            const results = [];
            
            formats.forEach(format => {
                try {
                    switch (format.toLowerCase()) {
                        case 'png':
                            exportToPNG(svgElement, `${baseName}.png`);
                            results.push({ format: 'png', success: true });
                            break;
                        case 'svg':
                            exportToSVG(svgElement, `${baseName}.svg`);
                            results.push({ format: 'svg', success: true });
                            break;
                        case 'csv':
                            exportDataToCSV(data, `${baseName}.csv`);
                            results.push({ format: 'csv', success: true });
                            break;
                        default:
                            results.push({ format, success: false, error: 'Unsupported format' });
                    }
                } catch (error) {
                    results.push({ format, success: false, error: error.message });
                }
            });
            
            return results;
        },
        
        // Configuration for export settings
        defaultSettings: {
            png: {
                scale: 2,
                quality: 0.95,
                backgroundColor: '#ffffff'
            },
            svg: {
                includeStyles: true,
                responsive: true,
                backgroundColor: null
            },
            csv: {
                delimiter: ',',
                includeHeaders: true,
                includeMetadata: true
            },
            pdf: {
                format: 'A4',
                orientation: 'landscape',
                includeMetadata: true,
                scale: 3
            }
        }
    };
})();



