// Placeholder for ConfigManager.js
/* ===== CONFIG MANAGER ===== */
/* Global configuration management and inheritance */

(function() {
    'use strict';

    class ConfigManager {
        constructor() {
            // Global application configuration
            this.globalConfig = {
                // Application metadata
                app: {
                    name: 'Pulse Financial Visualization Platform',
                    version: '1.0.0',
                    author: 'Pulse Financial Insights',
                    website: 'pulse.financial-insights.com'
                },
                
                // Global chart defaults
                charts: {
                    defaultAnimationDuration: 800,
                    defaultColorScheme: 'pulse',
                    defaultTheme: 'professional',
                    enableGlobalTooltips: true,
                    enableGlobalExport: true,
                    globalFontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                },
                
                // Global export settings
                export: {
                    defaultFormat: 'png',
                    defaultQuality: 0.95,
                    defaultScale: 2,
                    includeWatermark: true,
                    watermarkText: 'Pulse Financial Insights'
                },
                
                // Performance settings
                performance: {
                    enableMetrics: true,
                    maxRenderTime: 5000, // 5 seconds
                    enableLazyLoading: true,
                    enableCaching: true
                },
                
                // Accessibility settings
                accessibility: {
                    enableKeyboardNavigation: false,
                    enableScreenReader: false,
                    highContrastMode: false,
                    reduceMotion: false
                },
                
                // Development settings
                development: {
                    enableDebugMode: false,
                    enableConsoleLogging: true,
                    enablePerformanceLogging: false,
                    showVersionInfo: true
                }
            };
            
            // Chart-specific configurations
            this.chartConfigs = new Map();
            
            // Configuration presets
            this.presets = new Map();
            
            // Configuration inheritance hierarchy
            this.inheritanceChain = ['global', 'chartType', 'instance'];
            
            // Configuration change listeners
            this.changeListeners = new Map();
            
            // Initialize default presets
            this.initializeDefaultPresets();
            
            console.log('ConfigManager initialized');
        }

        // === GLOBAL CONFIGURATION ===

        // Get global configuration value
        getGlobal(keyPath) {
            return this.getNestedValue(this.globalConfig, keyPath);
        }

        // Set global configuration value
        setGlobal(keyPath, value) {
            this.setNestedValue(this.globalConfig, keyPath, value);
            this.notifyChange('global', keyPath, value);
            return this;
        }

        // Update multiple global configuration values
        updateGlobal(configObject) {
            this.deepMerge(this.globalConfig, configObject);
            this.notifyChange('global', 'batch_update', configObject);
            return this;
        }

        // === CHART-SPECIFIC CONFIGURATION ===

        // Get configuration for specific chart type
        getChartConfig(chartType) {
            return this.chartConfigs.get(chartType) || {};
        }

        // Set configuration for specific chart type
        setChartConfig(chartType, config) {
            this.chartConfigs.set(chartType, config);
            this.notifyChange('chartType', chartType, config);
            return this;
        }

        // Update configuration for specific chart type
        updateChartConfig(chartType, configUpdates) {
            const existingConfig = this.getChartConfig(chartType);
            const mergedConfig = this.deepMerge(existingConfig, configUpdates);
            this.setChartConfig(chartType, mergedConfig);
            return this;
        }

        // === CONFIGURATION INHERITANCE ===

        // Get resolved configuration for a chart instance
        getResolvedConfig(chartType, instanceConfig = {}) {
            let resolvedConfig = {};
            
            // Step 1: Start with global chart defaults
            resolvedConfig = this.deepMerge(resolvedConfig, this.globalConfig.charts);
            
            // Step 2: Apply chart-type-specific configuration
            const chartTypeConfig = this.getChartConfig(chartType);
            resolvedConfig = this.deepMerge(resolvedConfig, chartTypeConfig);
            
            // Step 3: Apply instance-specific configuration
            resolvedConfig = this.deepMerge(resolvedConfig, instanceConfig);
            
            return resolvedConfig;
        }

        // Get configuration value with inheritance
        getWithInheritance(chartType, keyPath, instanceConfig = {}) {
            const resolvedConfig = this.getResolvedConfig(chartType, instanceConfig);
            return this.getNestedValue(resolvedConfig, keyPath);
        }

        // === CONFIGURATION PRESETS ===

        // Initialize default presets
        initializeDefaultPresets() {
            // Performance presets
            this.createPreset('high-performance', {
                charts: {
                    defaultAnimationDuration: 400,
                    enableGlobalTooltips: false
                },
                performance: {
                    enableLazyLoading: true,
                    enableCaching: true
                }
            });

            this.createPreset('accessibility', {
                charts: {
                    defaultAnimationDuration: 0
                },
                accessibility: {
                    enableKeyboardNavigation: true,
                    enableScreenReader: true,
                    reduceMotion: true
                }
            });

            this.createPreset('presentation', {
                export: {
                    defaultQuality: 1.0,
                    defaultScale: 3,
                    includeWatermark: false
                },
                charts: {
                    defaultAnimationDuration: 1200
                }
            });

            this.createPreset('development', {
                development: {
                    enableDebugMode: true,
                    enableConsoleLogging: true,
                    enablePerformanceLogging: true
                },
                performance: {
                    enableMetrics: true
                }
            });

            console.log('Default configuration presets created');
        }

        // Create a configuration preset
        createPreset(presetName, config) {
            this.presets.set(presetName, this.deepClone(config));
            console.log(`Configuration preset '${presetName}' created`);
            return this;
        }

        // Apply a configuration preset
        applyPreset(presetName) {
            if (!this.presets.has(presetName)) {
                throw new Error(`Configuration preset '${presetName}' not found`);
            }

            const presetConfig = this.presets.get(presetName);
            this.updateGlobal(presetConfig);
            
            console.log(`Configuration preset '${presetName}' applied`);
            return this;
        }

        // Get available presets
        getAvailablePresets() {
            return Array.from(this.presets.keys());
        }

        // === THEME MANAGEMENT ===

        // Set application theme
        setTheme(themeName) {
            const themeConfigs = {
                'professional': {
                    charts: {
                        defaultColorScheme: 'professional',
                        globalFontFamily: '"Inter", "Segoe UI", system-ui, sans-serif'
                    }
                },
                'dark': {
                    charts: {
                        defaultColorScheme: 'dark',
                        globalBackgroundColor: '#1a1a1a'
                    }
                },
                'accessible': {
                    charts: {
                        defaultColorScheme: 'high-contrast'
                    },
                    accessibility: {
                        highContrastMode: true
                    }
                }
            };

            if (themeConfigs[themeName]) {
                this.updateGlobal(themeConfigs[themeName]);
                this.setGlobal('charts.defaultTheme', themeName);
                console.log(`Theme '${themeName}' applied`);
            } else {
                console.warn(`Theme '${themeName}' not found`);
            }

            return this;
        }

        // Get current theme
        getCurrentTheme() {
            return this.getGlobal('charts.defaultTheme');
        }

        // === ENVIRONMENT DETECTION ===

        // Detect and apply environment-specific settings
        detectAndApplyEnvironment() {
            const environment = this.detectEnvironment();
            
            console.log(`Environment detected: ${environment}`);
            
            switch (environment) {
                case 'development':
                    this.applyPreset('development');
                    break;
                case 'production':
                    this.setGlobal('development.enableDebugMode', false);
                    this.setGlobal('development.enableConsoleLogging', false);
                    break;
                case 'presentation':
                    this.applyPreset('presentation');
                    break;
            }

            return environment;
        }

        detectEnvironment() {
            // Check for localhost or development indicators
            if (window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' ||
                window.location.search.includes('debug=true')) {
                return 'development';
            }

            // Check for presentation mode
            if (window.location.search.includes('presentation=true') ||
                window.location.search.includes('fullscreen=true')) {
                return 'presentation';
            }

            // Default to production
            return 'production';
        }

        // === RESPONSIVE CONFIGURATION ===

        // Apply responsive configuration based on screen size
        applyResponsiveConfig() {
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            
            let responsiveConfig = {};
            
            if (screenWidth < 768) {
                // Mobile configuration
                responsiveConfig = {
                    charts: {
                        defaultAnimationDuration: 400, // Faster on mobile
                        enableGlobalTooltips: false // Touch-friendly
                    },
                    export: {
                        defaultScale: 1 // Lower resolution for mobile
                    }
                };
                console.log('Applied mobile responsive configuration');
                
            } else if (screenWidth < 1200) {
                // Tablet configuration
                responsiveConfig = {
                    charts: {
                        defaultAnimationDuration: 600
                    },
                    export: {
                        defaultScale: 1.5
                    }
                };
                console.log('Applied tablet responsive configuration');
                
            } else {
                // Desktop configuration
                responsiveConfig = {
                    charts: {
                        defaultAnimationDuration: 800
                    },
                    export: {
                        defaultScale: 2
                    }
                };
                console.log('Applied desktop responsive configuration');
            }
            
            this.updateGlobal(responsiveConfig);
            return responsiveConfig;
        }

        // === CONFIGURATION VALIDATION ===

        // Validate configuration object
        validateConfig(config, rules = {}) {
            const errors = [];
            
            // Basic validation rules
            const defaultRules = {
                'charts.defaultAnimationDuration': { type: 'number', min: 0, max: 5000 },
                'export.defaultQuality': { type: 'number', min: 0.1, max: 1.0 },
                'export.defaultScale': { type: 'number', min: 0.5, max: 10 },
                'performance.maxRenderTime': { type: 'number', min: 1000, max: 30000 }
            };
            
            const allRules = { ...defaultRules, ...rules };
            
            Object.keys(allRules).forEach(keyPath => {
                const rule = allRules[keyPath];
                const value = this.getNestedValue(config, keyPath);
                
                if (value !== undefined) {
                    if (rule.type && typeof value !== rule.type) {
                        errors.push(`${keyPath}: expected ${rule.type}, got ${typeof value}`);
                    }
                    
                    if (rule.min !== undefined && value < rule.min) {
                        errors.push(`${keyPath}: value ${value} below minimum ${rule.min}`);
                    }
                    
                    if (rule.max !== undefined && value > rule.max) {
                        errors.push(`${keyPath}: value ${value} above maximum ${rule.max}`);
                    }
                }
            });
            
            return {
                valid: errors.length === 0,
                errors
            };
        }

        // === CHANGE LISTENERS ===

        // Add configuration change listener
        addChangeListener(scope, callback) {
            if (!this.changeListeners.has(scope)) {
                this.changeListeners.set(scope, []);
            }
            this.changeListeners.get(scope).push(callback);
            return this;
        }

        // Remove configuration change listener
        removeChangeListener(scope, callback) {
            if (this.changeListeners.has(scope)) {
                const listeners = this.changeListeners.get(scope);
                const index = listeners.indexOf(callback);
                if (index > -1) {
                    listeners.splice(index, 1);
                }
            }
            return this;
        }

        // Notify change listeners
        notifyChange(scope, key, value) {
            if (this.changeListeners.has(scope)) {
                this.changeListeners.get(scope).forEach(callback => {
                    try {
                        callback({ scope, key, value, timestamp: Date.now() });
                    } catch (error) {
                        console.error('Error in config change listener:', error);
                    }
                });
            }
            
            // Also notify global listeners
            if (scope !== 'global' && this.changeListeners.has('global')) {
                this.changeListeners.get('global').forEach(callback => {
                    try {
                        callback({ scope, key, value, timestamp: Date.now() });
                    } catch (error) {
                        console.error('Error in global config change listener:', error);
                    }
                });
            }
        }

        // === UTILITY METHODS ===

        // Get nested value from object using dot notation
        getNestedValue(obj, keyPath) {
            const keys = keyPath.split('.');
            let value = obj;
            
            for (const key of keys) {
                if (value && typeof value === 'object' && key in value) {
                    value = value[key];
                } else {
                    return undefined;
                }
            }
            
            return value;
        }

        // Set nested value in object using dot notation
        setNestedValue(obj, keyPath, value) {
            const keys = keyPath.split('.');
            const lastKey = keys.pop();
            let target = obj;
            
            for (const key of keys) {
                if (!target[key] || typeof target[key] !== 'object') {
                    target[key] = {};
                }
                target = target[key];
            }
            
            target[lastKey] = value;
        }

        // Deep merge objects
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

        // Deep clone object
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

        // === EXPORT/IMPORT ===

        // Export current configuration
        exportConfig() {
            return {
                global: this.deepClone(this.globalConfig),
                chartConfigs: Object.fromEntries(this.chartConfigs.entries()),
                presets: Object.fromEntries(this.presets.entries()),
                exportedAt: new Date().toISOString(),
                version: this.getGlobal('app.version')
            };
        }

        // Import configuration
        importConfig(configData) {
            try {
                if (configData.global) {
                    this.globalConfig = this.deepMerge(this.globalConfig, configData.global);
                }
                
                if (configData.chartConfigs) {
                    Object.entries(configData.chartConfigs).forEach(([chartType, config]) => {
                        this.setChartConfig(chartType, config);
                    });
                }
                
                if (configData.presets) {
                    Object.entries(configData.presets).forEach(([presetName, config]) => {
                        this.createPreset(presetName, config);
                    });
                }
                
                console.log('Configuration imported successfully');
                this.notifyChange('global', 'import', configData);
                
            } catch (error) {
                console.error('Failed to import configuration:', error);
                throw error;
            }
            
            return this;
        }

        // === DEBUGGING ===

        debug() {
            console.group('ConfigManager Debug');
            console.log('Global Config:', this.globalConfig);
            console.log('Chart Configs:', Object.fromEntries(this.chartConfigs.entries()));
            console.log('Available Presets:', this.getAvailablePresets());
            console.log('Change Listeners:', Object.fromEntries(this.changeListeners.entries()));
            console.groupEnd();
            
            return this.exportConfig();
        }

        // Get configuration summary
        getSummary() {
            return {
                globalConfigKeys: Object.keys(this.globalConfig),
                chartTypes: Array.from(this.chartConfigs.keys()),
                availablePresets: this.getAvailablePresets(),
                currentTheme: this.getCurrentTheme(),
                environment: this.detectEnvironment(),
                changeListeners: Array.from(this.changeListeners.keys())
            };
        }
    }

    // Create singleton instance
    const configManager = new ConfigManager();

    // Auto-detect and apply environment settings
    configManager.detectAndApplyEnvironment();

    // Apply responsive configuration
    configManager.applyResponsiveConfig();

    // Listen for window resize to update responsive config
    window.addEventListener('resize', () => {
        configManager.applyResponsiveConfig();
    });

    // Export both class and singleton
    window.ConfigManager = ConfigManager;
    window.configManager = configManager;

    console.log('ConfigManager loaded successfully');

})();