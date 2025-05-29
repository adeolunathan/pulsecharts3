// Placeholder for SankeyConfig.js
/* ===== SANKEY CONFIGURATION MODULE ===== */
/* Centralized configuration management and defaults */

(function() {
    'use strict';

    // Default configuration with comprehensive settings
    const DEFAULT_CONFIG = {
        // AUTO-CENTERING AND ALIGNMENT
        autoCenter: true,
        autoMiddleAlign: true,
        dynamicSpaceFill: true,
        
        // CANVAS DIMENSIONS
        width: 1400,
        height: 800,
        margin: { top: 45, right: 85, bottom: 45, left: 110 },
        
        // NODE APPEARANCE
        nodeWidth: 28,
        minNodeHeight: 4,
        nodeHeightScale: 0.65,
        
        // SPACING CONTROL
        nodePadding: 40,
        leftmostSpacingMultiplier: 0.8,
        middleSpacingMultiplier: 0.9,
        rightmostSpacingMultiplier: 0.7,
        
        // LINK APPEARANCE
        linkWidthScale: 0.65,
        linkOpacity: 1.0,
        linkHoverOpacity: 1.0,
        
        // CURVATURE SYSTEM
        curveIntensity: 0.4,
        layerCurvature: {
            0: 0.3,
            1: 0.4,
            2: 0.5
        },
        
        // CURVATURE PRESETS
        curvaturePresets: {
            'gentle': { 0: 0.2, 1: 0.25, 2: 0.3 },
            'moderate': { 0: 0.3, 1: 0.4, 2: 0.5 },
            'dramatic': { 0: 0.4, 1: 0.6, 2: 0.7 },
            'progressive': { 0: 0.2, 1: 0.4, 2: 0.6 }
        },
        
        // POSITIONING
        centeringOffset: 0.08,
        widthUsage: 0.82,
        valueDistance: 8,
        
        // TEXT AND LABELS
        wrapThreshold: 15,
        
        // ANIMATION
        animationDuration: 800
    };

    // Configuration validation rules
    const VALIDATION_RULES = {
        width: { min: 400, max: 5000, type: 'number' },
        height: { min: 300, max: 3000, type: 'number' },
        nodeWidth: { min: 10, max: 100, type: 'number' },
        nodeHeightScale: { min: 0.1, max: 2.0, type: 'number' },
        linkWidthScale: { min: 0.1, max: 2.0, type: 'number' },
        curveIntensity: { min: 0.1, max: 0.8, type: 'number' },
        animationDuration: { min: 100, max: 3000, type: 'number' }
    };

    class SankeyConfig {
        constructor(initialConfig = {}) {
            // Deep clone default config to avoid mutations
            this.config = this.deepClone(DEFAULT_CONFIG);
            
            // Apply initial configuration if provided
            if (Object.keys(initialConfig).length > 0) {
                this.update(initialConfig);
            }
        }

        // Get configuration value by key path (e.g., 'margin.top')
        get(keyPath) {
            const keys = keyPath.split('.');
            let value = this.config;
            
            for (const key of keys) {
                if (value && typeof value === 'object' && key in value) {
                    value = value[key];
                } else {
                    return undefined;
                }
            }
            
            return value;
        }

        // Set configuration value by key path
        set(keyPath, value) {
            const keys = keyPath.split('.');
            const lastKey = keys.pop();
            let target = this.config;
            
            // Navigate to the parent object
            for (const key of keys) {
                if (!target[key] || typeof target[key] !== 'object') {
                    target[key] = {};
                }
                target = target[key];
            }
            
            // Validate the value if rules exist
            const fullKey = keyPath.replace(/\./g, '_');
            if (VALIDATION_RULES[fullKey] || VALIDATION_RULES[lastKey]) {
                const rule = VALIDATION_RULES[fullKey] || VALIDATION_RULES[lastKey];
                if (!this.validateValue(value, rule)) {
                    throw new Error(`Invalid value for ${keyPath}: ${value}`);
                }
            }
            
            target[lastKey] = value;
            return this;
        }

        // Update multiple configuration values
        update(configObject) {
            if (!configObject || typeof configObject !== 'object') {
                throw new Error('Configuration must be an object');
            }

            // Validate the entire config object
            const validation = this.validate(configObject);
            if (!validation.valid) {
                throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
            }

            // Deep merge the configuration
            this.config = this.deepMerge(this.config, configObject);
            return this;
        }

        // Reset to default configuration
        reset() {
            this.config = this.deepClone(DEFAULT_CONFIG);
            return this;
        }

        // Get all configuration
        getAll() {
            return this.deepClone(this.config);
        }

        // Get default configuration
        getDefaults() {
            return this.deepClone(DEFAULT_CONFIG);
        }

        // Validate configuration object
        validate(config) {
            const errors = [];
            
            const validateRecursive = (obj, path = '') => {
                Object.keys(obj).forEach(key => {
                    const fullKey = path ? `${path}.${key}` : key;
                    const value = obj[key];
                    
                    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                        validateRecursive(value, fullKey);
                    } else {
                        const rule = VALIDATION_RULES[fullKey.replace(/\./g, '_')] || VALIDATION_RULES[key];
                        if (rule && !this.validateValue(value, rule)) {
                            errors.push(`Invalid ${fullKey}: ${value} (expected ${rule.type} between ${rule.min}-${rule.max})`);
                        }
                    }
                });
            };
            
            validateRecursive(config);
            
            return {
                valid: errors.length === 0,
                errors: errors
            };
        }

        // Apply curvature preset
        applyPreset(presetName) {
            if (!this.config.curvaturePresets[presetName]) {
                throw new Error(`Curvature preset '${presetName}' not found`);
            }
            
            this.config.layerCurvature = { ...this.config.curvaturePresets[presetName] };
            return this;
        }

        // Create custom curvature preset
        createPreset(name, curvatureMap) {
            if (!name || typeof name !== 'string') {
                throw new Error('Preset name must be a non-empty string');
            }
            
            if (!curvatureMap || typeof curvatureMap !== 'object') {
                throw new Error('Curvature map must be an object');
            }
            
            // Validate curvature values
            Object.values(curvatureMap).forEach(value => {
                if (typeof value !== 'number' || value < 0.1 || value > 0.8) {
                    throw new Error('Curvature values must be numbers between 0.1 and 0.8');
                }
            });
            
            this.config.curvaturePresets[name] = { ...curvatureMap };
            return this;
        }

        // Get available presets
        getPresets() {
            return Object.keys(this.config.curvaturePresets);
        }

        // Configuration categories for organized access
        get layout() {
            return {
                width: this.config.width,
                height: this.config.height,
                margin: this.config.margin,
                nodeWidth: this.config.nodeWidth,
                nodePadding: this.config.nodePadding,
                centeringOffset: this.config.centeringOffset,
                widthUsage: this.config.widthUsage
            };
        }

        get visual() {
            return {
                nodeHeightScale: this.config.nodeHeightScale,
                linkWidthScale: this.config.linkWidthScale,
                minNodeHeight: this.config.minNodeHeight,
                linkOpacity: this.config.linkOpacity,
                linkHoverOpacity: this.config.linkHoverOpacity
            };
        }

        get interaction() {
            return {
                animationDuration: this.config.animationDuration,
                valueDistance: this.config.valueDistance,
                wrapThreshold: this.config.wrapThreshold
            };
        }

        get curvature() {
            return {
                curveIntensity: this.config.curveIntensity,
                layerCurvature: { ...this.config.layerCurvature },
                presets: { ...this.config.curvaturePresets }
            };
        }

        get spacing() {
            return {
                leftmostSpacingMultiplier: this.config.leftmostSpacingMultiplier,
                middleSpacingMultiplier: this.config.middleSpacingMultiplier,
                rightmostSpacingMultiplier: this.config.rightmostSpacingMultiplier
            };
        }

        get autoFeatures() {
            return {
                autoCenter: this.config.autoCenter,
                autoMiddleAlign: this.config.autoMiddleAlign,
                dynamicSpaceFill: this.config.dynamicSpaceFill
            };
        }

        // Utility methods
        validateValue(value, rule) {
            if (rule.type === 'number') {
                return typeof value === 'number' && 
                       value >= rule.min && 
                       value <= rule.max;
            }
            if (rule.type === 'boolean') {
                return typeof value === 'boolean';
            }
            if (rule.type === 'string') {
                return typeof value === 'string' && value.length > 0;
            }
            return true;
        }

        deepClone(obj) {
            if (obj === null || typeof obj !== 'object') return obj;
            if (obj instanceof Date) return new Date(obj.getTime());
            if (obj instanceof Array) return obj.map(item => this.deepClone(item));
            
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = this.deepClone(obj[key]);
            });
            return cloned;
        }

        deepMerge(target, source) {
            const result = this.deepClone(target);
            
            Object.keys(source).forEach(key => {
                if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                    result[key] = this.deepMerge(result[key] || {}, source[key]);
                } else {
                    result[key] = source[key];
                }
            });
            
            return result;
        }

        // Debug and information methods
        getDimensions() {
            return {
                width: this.config.width - this.config.margin.left - this.config.margin.right,
                height: this.config.height - this.config.margin.top - this.config.margin.bottom,
                totalWidth: this.config.width,
                totalHeight: this.config.height
            };
        }

        getUtilization() {
            const dimensions = this.getDimensions();
            const totalArea = this.config.width * this.config.height;
            const contentArea = dimensions.width * dimensions.height;
            return {
                contentArea,
                totalArea,
                utilization: (contentArea / totalArea) * 100
            };
        }

        toString() {
            return JSON.stringify(this.config, null, 2);
        }
    }

    // Export the configuration class
    window.SankeyConfig = SankeyConfig;

    // Also create a default instance for immediate use
    window.DefaultSankeyConfig = new SankeyConfig();

})();