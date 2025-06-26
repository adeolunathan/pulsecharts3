/* ===== CHART UTILITIES ===== */
/* Pure utility functions for chart operations - reusable across chart types */
/* Extracted from SankeyChart.js for better modularity */

window.ChartUtils = (function() {
    'use strict';

    /**
     * Lightens a hex color by a given percentage
     * @param {string} hex - Hex color code (e.g., "#ff0000")
     * @param {number} percent - Percentage to lighten (0-100)
     * @returns {string} Lightened hex color
     */
    function lightenColor(hex, percent) {
        const num = parseInt(hex.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = (num >> 8 & 0x00FF) + amt;
        const B = (num & 0x0000FF) + amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    /**
     * Converts hex color to RGBA with specified opacity
     * @param {string} hex - Hex color code (e.g., "#ff0000")
     * @param {number} opacity - Opacity value (0-1)
     * @returns {string} RGBA color string
     */
    function hexToRgba(hex, opacity) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return hex;
        
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    /**
     * Wraps text into multiple lines based on maximum length
     * @param {string} text - Text to wrap
     * @param {number} maxLength - Maximum characters per line
     * @returns {Array<string>} Array of text lines
     */
    function wrapText(text, maxLength = 15) {
        if (text.length <= maxLength) return [text];
        
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        words.forEach(word => {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            
            if (testLine.length <= maxLength) {
                currentLine = testLine;
            } else {
                if (currentLine) {
                    lines.push(currentLine);
                    currentLine = word.length > maxLength ? word.substring(0, maxLength - 3) + '...' : word;
                } else {
                    lines.push(word.length > maxLength ? word.substring(0, maxLength - 3) + '...' : word);
                }
            }
        });
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }

    // Public API
    return {
        lightenColor: lightenColor,
        hexToRgba: hexToRgba,
        wrapText: wrapText
    };
})();