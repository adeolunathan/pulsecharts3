// Placeholder for SankeyExport.js
/* ===== SANKEY EXPORT MODULE ===== */
/* Export functionality and format conversion */

(function() {
    'use strict';

    class SankeyExport {
        constructor(renderer, config) {
            this.renderer = renderer;
            this.config = config;
            
            // Export settings with defaults
            this.exportSettings = {
                png: {
                    scale: 2,
                    quality: 0.95,
                    backgroundColor: '#ffffff',
                    includeMetadata: true
                },
                svg: {
                    includeStyles: true,
                    responsive: true,
                    backgroundColor: null,
                    standalone: true
                },
                csv: {
                    delimiter: ',',
                    includeHeaders: true,
                    includeMetadata: true,
                    encoding: 'utf-8'
                },
                pdf: {
                    format: 'A4',
                    orientation: 'landscape',
                    scale: 3,
                    includeMetadata: true
                }
            };
            
            // Export history for analytics
            this.exportHistory = [];
            
            // Check browser support
            this.browserSupport = this.checkBrowserSupport();
        }

        // Export to PNG format
        exportToPNG(filename = 'pulse-sankey-chart.png', options = {}) {
            return new Promise((resolve, reject) => {
                try {
                    if (!this.browserSupport.canvas) {
                        throw new Error('Canvas not supported in this browser');
                    }

                    const settings = { ...this.exportSettings.png, ...options };
                    const svgElement = this.renderer.getSVGElement();
                    
                    this.logExportAttempt('png', filename, settings);
                    
                    // Get SVG data
                    const svgNode = svgElement.node();
                    const svgRect = svgNode.getBoundingClientRect();
                    const serializer = new XMLSerializer();
                    let svgString = serializer.serializeToString(svgNode);
                    
                    // Ensure proper namespaces
                    svgString = this.addSVGNamespaces(svgString);
                    
                    // Create canvas
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const img = new Image();
                    
                    // Set canvas dimensions with scaling
                    canvas.width = svgRect.width * settings.scale;
                    canvas.height = svgRect.height * settings.scale;
                    
                    img.onload = () => {
                        try {
                            // Fill background
                            ctx.fillStyle = settings.backgroundColor;
                            ctx.fillRect(0, 0, canvas.width, canvas.height);
                            
                            // Scale and draw image
                            ctx.scale(settings.scale, settings.scale);
                            ctx.drawImage(img, 0, 0);
                            
                            // Convert to blob and download
                            canvas.toBlob((blob) => {
                                if (blob) {
                                    this.downloadBlob(blob, filename);
                                    this.logExportSuccess('png', filename, blob.size);
                                    resolve({
                                        success: true,
                                        format: 'png',
                                        filename,
                                        size: blob.size
                                    });
                                } else {
                                    throw new Error('Failed to create PNG blob');
                                }
                            }, 'image/png', settings.quality);
                            
                        } catch (error) {
                            this.logExportError('png', filename, error);
                            reject(error);
                        }
                    };
                    
                    img.onerror = (error) => {
                        this.logExportError('png', filename, new Error('Image loading failed'));
                        reject(new Error('PNG export failed: Image loading error'));
                    };
                    
                    // Convert SVG to data URL
                    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                    const url = URL.createObjectURL(svgBlob);
                    img.src = url;
                    
                    // Cleanup URL after a delay
                    setTimeout(() => URL.revokeObjectURL(url), 5000);
                    
                } catch (error) {
                    this.logExportError('png', filename, error);
                    reject(new Error(`PNG export failed: ${error.message}`));
                }
            });
        }

        // Export to SVG format
        exportToSVG(filename = 'pulse-sankey-chart.svg', options = {}) {
            return new Promise((resolve, reject) => {
                try {
                    const settings = { ...this.exportSettings.svg, ...options };
                    const svgElement = this.renderer.getSVGElement();
                    
                    this.logExportAttempt('svg', filename, settings);
                    
                    // Clone SVG to avoid modifying original
                    const svgNode = svgElement.node();
                    const clonedSvg = svgNode.cloneNode(true);
                    
                    // Enhance SVG for standalone use
                    this.prepareSVGForExport(clonedSvg, settings);
                    
                    // Serialize SVG
                    const serializer = new XMLSerializer();
                    let svgString = serializer.serializeToString(clonedSvg);
                    
                    // Add XML declaration and DOCTYPE if standalone
                    if (settings.standalone) {
                        svgString = this.addXMLDeclaration(svgString);
                    }
                    
                    // Create and download blob
                    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                    this.downloadBlob(blob, filename);
                    
                    this.logExportSuccess('svg', filename, blob.size);
                    
                    resolve({
                        success: true,
                        format: 'svg',
                        filename,
                        size: blob.size,
                        scalable: true
                    });
                    
                } catch (error) {
                    this.logExportError('svg', filename, error);
                    reject(new Error(`SVG export failed: ${error.message}`));
                }
            });
        }

        // Export data to CSV format
        exportDataToCSV(data, filename = 'pulse-sankey-data.csv', options = {}) {
            return new Promise((resolve, reject) => {
                try {
                    if (!data || !data.nodes || !data.links) {
                        throw new Error('Invalid data structure for CSV export');
                    }

                    const settings = { ...this.exportSettings.csv, ...options };
                    
                    this.logExportAttempt('csv', filename, settings);
                    
                    // Generate CSV content
                    const csvContent = this.generateCSVContent(data, settings);
                    
                    // Create and download blob
                    const blob = new Blob([csvContent], { 
                        type: `text/csv;charset=${settings.encoding}` 
                    });
                    this.downloadBlob(blob, filename);
                    
                    this.logExportSuccess('csv', filename, blob.size);
                    
                    resolve({
                        success: true,
                        format: 'csv',
                        filename,
                        size: blob.size,
                        rows: data.nodes.length + data.links.length
                    });
                    
                } catch (error) {
                    this.logExportError('csv', filename, error);
                    reject(new Error(`CSV export failed: ${error.message}`));
                }
            });
        }

        // High-resolution PNG export for print
        exportHighRes(filename = 'pulse-sankey-high-res.png', options = {}) {
            const printSettings = {
                scale: 4, // Very high DPI
                quality: 1.0,
                backgroundColor: '#ffffff',
                ...options
            };
            
            return this.exportToPNG(filename, printSettings);
        }

        // Export multiple formats
        exportMultiple(baseName = 'pulse-sankey', formats = ['png', 'svg'], data = null) {
            const exportPromises = [];
            const results = [];
            
            formats.forEach(format => {
                let promise;
                
                switch (format.toLowerCase()) {
                    case 'png':
                        promise = this.exportToPNG(`${baseName}.png`);
                        break;
                    case 'svg':
                        promise = this.exportToSVG(`${baseName}.svg`);
                        break;
                    case 'csv':
                        if (data) {
                            promise = this.exportDataToCSV(data, `${baseName}-data.csv`);
                        } else {
                            promise = Promise.reject(new Error('Data required for CSV export'));
                        }
                        break;
                    case 'high-res':
                        promise = this.exportHighRes(`${baseName}-high-res.png`);
                        break;
                    default:
                        promise = Promise.reject(new Error(`Unsupported format: ${format}`));
                }
                
                exportPromises.push(
                    promise.then(result => ({ ...result, format }))
                           .catch(error => ({ success: false, format, error: error.message }))
                );
            });
            
            return Promise.all(exportPromises).then(results => {
                const summary = {
                    total: results.length,
                    successful: results.filter(r => r.success).length,
                    failed: results.filter(r => !r.success).length,
                    results
                };
                
                console.log('Batch export completed:', summary);
                return summary;
            });
        }

        // Show interactive export menu
        showExportMenu() {
            // Remove existing menu
            d3.select('.export-menu').remove();
            
            // Create menu overlay
            const overlay = d3.select('body')
                .append('div')
                .attr('class', 'export-menu-overlay')
                .style('position', 'fixed')
                .style('top', '0')
                .style('left', '0')
                .style('width', '100%')
                .style('height', '100%')
                .style('background', 'rgba(0,0,0,0.5)')
                .style('z-index', '10000')
                .style('display', 'flex')
                .style('align-items', 'center')
                .style('justify-content', 'center')
                .on('click', () => overlay.remove());
            
            // Create menu panel
            const menu = overlay.append('div')
                .attr('class', 'export-menu')
                .style('background', 'white')
                .style('border-radius', '12px')
                .style('padding', '24px')
                .style('box-shadow', '0 20px 60px rgba(0,0,0,0.3)')
                .style('max-width', '400px')
                .style('width', '90%')
                .on('click', (event) => event.stopPropagation());
            
            // Menu title
            menu.append('h3')
                .style('margin', '0 0 20px 0')
                .style('font-family', '"Inter", "Segoe UI", system-ui, sans-serif')
                .style('font-size', '20px')
                .style('font-weight', '600')
                .style('color', '#1f2937')
                .text('Export Chart');
            
            // Export options
            const options = [
                { id: 'png', label: 'PNG Image', desc: 'High-quality raster image for presentations', icon: '🖼️' },
                { id: 'svg', label: 'SVG Vector', desc: 'Scalable vector format for web and print', icon: '📊' },
                { id: 'high-res', label: 'High-Res PNG', desc: 'Ultra high-resolution for large prints', icon: '🖨️' },
                { id: 'csv', label: 'Data CSV', desc: 'Raw data in spreadsheet format', icon: '📋' },
                { id: 'all', label: 'All Formats', desc: 'Export everything at once', icon: '📦' }
            ];
            
            options.forEach(option => {
                const button = menu.append('div')
                    .style('display', 'flex')
                    .style('align-items', 'center')
                    .style('padding', '12px 16px')
                    .style('margin', '8px 0')
                    .style('border', '2px solid #e5e7eb')
                    .style('border-radius', '8px')
                    .style('cursor', 'pointer')
                    .style('transition', 'all 0.2s ease')
                    .on('mouseover', function() {
                        d3.select(this)
                            .style('border-color', '#3b82f6')
                            .style('background-color', '#f8fafc');
                    })
                    .on('mouseout', function() {
                        d3.select(this)
                            .style('border-color', '#e5e7eb')
                            .style('background-color', 'transparent');
                    })
                    .on('click', () => {
                        overlay.remove();
                        this.handleMenuExport(option.id);
                    });
                
                button.append('div')
                    .style('font-size', '24px')
                    .style('margin-right', '12px')
                    .text(option.icon);
                
                const textDiv = button.append('div');
                
                textDiv.append('div')
                    .style('font-weight', '600')
                    .style('font-size', '16px')
                    .style('color', '#1f2937')
                    .text(option.label);
                
                textDiv.append('div')
                    .style('font-size', '14px')
                    .style('color', '#6b7280')
                    .style('margin-top', '2px')
                    .text(option.desc);
            });
            
            // Close button
            menu.append('button')
                .style('margin-top', '20px')
                .style('padding', '8px 16px')
                .style('background', '#f3f4f6')
                .style('border', 'none')
                .style('border-radius', '6px')
                .style('cursor', 'pointer')
                .style('font-family', '"Inter", "Segoe UI", system-ui, sans-serif')
                .style('font-size', '14px')
                .style('color', '#374151')
                .text('Cancel')
                .on('click', () => overlay.remove());
        }

        // Handle export menu selection
        handleMenuExport(optionId) {
            switch (optionId) {
                case 'png':
                    this.exportToPNG();
                    break;
                case 'svg':
                    this.exportToSVG();
                    break;
                case 'high-res':
                    this.exportHighRes();
                    break;
                case 'csv':
                    // Would need data passed from main chart
                    console.warn('CSV export requires data to be passed from main chart');
                    break;
                case 'all':
                    this.exportMultiple();
                    break;
            }
        }

        // Prepare SVG for standalone export
        prepareSVGForExport(svgElement, settings) {
            // Ensure proper namespaces
            svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svgElement.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
            
            // Add embedded styles if requested
            if (settings.includeStyles) {
                this.addEmbeddedStyles(svgElement);
            }
            
            // Set background if specified
            if (settings.backgroundColor) {
                const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                background.setAttribute('width', '100%');
                background.setAttribute('height', '100%');
                background.setAttribute('fill', settings.backgroundColor);
                svgElement.insertBefore(background, svgElement.firstChild);
            }
            
            // Make responsive if requested
            if (settings.responsive) {
                svgElement.removeAttribute('width');
                svgElement.removeAttribute('height');
                svgElement.style.width = '100%';
                svgElement.style.height = 'auto';
            }
        }

        // Add embedded CSS styles to SVG
        addEmbeddedStyles(svgElement) {
            const styles = `
                <style>
                    <![CDATA[
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
                    .sankey-link:hover path {
                        filter: drop-shadow(0 2px 8px rgba(0,0,0,0.15));
                    }
                    .sankey-node:hover rect {
                        filter: drop-shadow(0 6px 16px rgba(0,0,0,0.2));
                        transform: scale(1.02);
                    }
                    ]]>
                </style>
            `;
            
            const defs = svgElement.querySelector('defs') || 
                         svgElement.insertBefore(
                             document.createElementNS('http://www.w3.org/2000/svg', 'defs'), 
                             svgElement.firstChild
                         );
            
            defs.innerHTML += styles;
        }

        // Generate CSV content from data
        generateCSVContent(data, settings) {
            let csvContent = '';
            
            // Add metadata header if requested
            if (settings.includeMetadata && data.metadata) {
                csvContent += `# Pulse Financial Data Export\n`;
                csvContent += `# Title: ${data.metadata.title || 'N/A'}\n`;
                csvContent += `# Exported: ${new Date().toISOString()}\n`;
                csvContent += `# Currency: ${data.metadata.currency || 'USD'}\n`;
                csvContent += `# Unit: ${data.metadata.unit || 'millions'}\n`;
                csvContent += `#\n`;
            }
            
            // Nodes section
            if (settings.includeHeaders) {
                csvContent += 'Type,ID,Depth,Value,Category,Description\n';
            }
            
            data.nodes.forEach(node => {
                const row = [
                    'Node',
                    this.escapeCSVField(node.id || ''),
                    node.depth || 0,
                    node.value || 0,
                    this.escapeCSVField(node.category || ''),
                    this.escapeCSVField(node.description || '')
                ].join(settings.delimiter);
                csvContent += row + '\n';
            });
            
            // Separator
            csvContent += '\n';
            
            // Links section
            if (settings.includeHeaders) {
                csvContent += 'Type,Source,Target,Value,Flow Type\n';
            }
            
            data.links.forEach(link => {
                const row = [
                    'Link',
                    this.escapeCSVField(link.source?.id || link.sourceId || ''),
                    this.escapeCSVField(link.target?.id || link.targetId || ''),
                    link.value || 0,
                    this.escapeCSVField(link.type || '')
                ].join(settings.delimiter);
                csvContent += row + '\n';
            });
            
            return csvContent;
        }

        // Utility methods
        addSVGNamespaces(svgString) {
            if (!svgString.includes('xmlns=')) {
                svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
            }
            if (!svgString.includes('xmlns:xlink=')) {
                svgString = svgString.replace('<svg', '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
            }
            return svgString;
        }

        addXMLDeclaration(svgString) {
            return `<?xml version="1.0" encoding="UTF-8"?>\n${svgString}`;
        }

        escapeCSVField(field) {
            const stringField = String(field);
            if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
                return `"${stringField.replace(/"/g, '""')}"`;
            }
            return stringField;
        }

        downloadBlob(blob, filename) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up URL after a delay
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }

        // Browser support detection
        checkBrowserSupport() {
            return {
                canvas: !!(document.createElement('canvas').getContext),
                svg: !!window.XMLSerializer,
                download: !!(document.createElement('a').download !== undefined),
                blob: !!window.Blob
            };
        }

        // Export analytics and logging
        logExportAttempt(format, filename, settings) {
            const logEntry = {
                timestamp: new Date().toISOString(),
                action: 'attempt',
                format,
                filename,
                settings: { ...settings }
            };
            
            this.exportHistory.push(logEntry);
            console.log(`Export attempt: ${format} -> ${filename}`);
        }

        logExportSuccess(format, filename, fileSize) {
            const logEntry = {
                timestamp: new Date().toISOString(),
                action: 'success',
                format,
                filename,
                fileSize
            };
            
            this.exportHistory.push(logEntry);
            console.log(`Export successful: ${format} -> ${filename} (${this.formatFileSize(fileSize)})`);
        }

        logExportError(format, filename, error) {
            const logEntry = {
                timestamp: new Date().toISOString(),
                action: 'error',
                format,
                filename,
                error: error.message
            };
            
            this.exportHistory.push(logEntry);
            console.error(`Export failed: ${format} -> ${filename}:`, error);
        }

        formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        // Get export configuration
        getExportOptions(format) {
            return this.exportSettings[format] || {};
        }

        // Validate export settings
        validateExportSettings(options, format) {
            const validFormats = ['png', 'svg', 'csv', 'pdf'];
            
            if (!validFormats.includes(format)) {
                throw new Error(`Unsupported export format: ${format}`);
            }
            
            // Format-specific validation
            if (format === 'png' && options.scale && (options.scale < 0.5 || options.scale > 5)) {
                throw new Error('PNG scale must be between 0.5 and 5');
            }
            
            if (format === 'png' && options.quality && (options.quality < 0.1 || options.quality > 1)) {
                throw new Error('PNG quality must be between 0.1 and 1');
            }
            
            return true;
        }

        // Update export settings
        updateExportSettings(format, newSettings) {
            if (this.exportSettings[format]) {
                this.exportSettings[format] = { ...this.exportSettings[format], ...newSettings };
                console.log(`Export settings updated for ${format}:`, this.exportSettings[format]);
            }
        }

        // Get export information and capabilities
        getExportInfo() {
            return {
                supportedFormats: Object.keys(this.exportSettings),
                browserSupport: this.browserSupport,
                exportHistory: this.exportHistory.slice(-10), // Last 10 exports
                settings: { ...this.exportSettings }
            };
        }

        // Clear export history
        clearExportHistory() {
            this.exportHistory = [];
            console.log('Export history cleared');
        }
    }

    // Export the class
    window.SankeyExport = SankeyExport;

})();