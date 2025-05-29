// Placeholder for main.js
/* ===== PULSE MAIN APPLICATION - UPDATED ARCHITECTURE ===== */
/* Application controller with new modular architecture */

(function() {
    'use strict';

    // Application state
    let app = {
        charts: {},
        currentData: null,
        initialized: false,
        modules: {},
        version: '2.0.0'
    };

    // Initialize the application with new architecture
    function initializeApp() {
        console.log('=== Initializing Pulse Financial Visualization Platform v2.0 ===');
        
        try {
            // Step 1: Verify core modules are loaded
            checkCoreModules();
            
            // Step 2: Initialize core system
            initializeCoreSystem();
            
            // Step 3: Register chart types
            registerChartTypes();
            
            // Step 4: Setup application event listeners
            setupApplicationEventListeners();
            
            // Step 5: Initialize main chart
            initializeMainChart();
            
            // Step 6: Load and display default data
            loadDefaultData();
            
            // Step 7: Finalize initialization
            finalizeInitialization();
            
        } catch (error) {
            handleInitializationError(error);
        }
    }

    // Check if all required core modules are loaded
    function checkCoreModules() {
        const requiredModules = [
            'BaseChart',
            'ChartFactory', 
            'ConfigManager',
            'ErrorHandler',
            'EventManager',
            'SankeyChart'
        ];
        
        const missingModules = requiredModules.filter(module => !window[module]);
        
        if (missingModules.length > 0) {
            throw new Error(`Missing required modules: ${missingModules.join(', ')}`);
        }
        
        console.log('✅ All core modules loaded successfully');
    }

    // Initialize core system components
    function initializeCoreSystem() {
        console.log('Initializing core system...');
        
        // Store references to singletons
        app.modules = {
            configManager: window.configManager,
            errorHandler: window.errorHandler,
            eventManager: window.eventManager,
            chartFactory: window.chartFactory
        };
        
        // Configure application-specific settings
        app.modules.configManager.updateGlobal({
            app: {
                name: 'Pulse Financial Visualization Platform',
                version: app.version,
                initialized: true
            }
        });
        
        // Set up error handling for the application
        app.modules.errorHandler.addErrorListener((error) => {
            console.warn('Application error detected:', error);
            app.modules.eventManager.emit('app:error', { error });
        });
        
        console.log('✅ Core system initialized');
    }

    // Register available chart types
    function registerChartTypes() {
        console.log('Registering chart types...');
        
        try {
            // Register Sankey chart with metadata
            app.modules.chartFactory.registerChart('sankey', window.SankeyChart.SankeyChart, {
                name: 'Sankey Flow Chart',
                description: 'Professional financial flow visualization with Salesforce-quality design',
                category: 'flow',
                dataRequirements: ['nodes', 'links'],
                capabilities: {
                    supportsExport: true,
                    supportsInteraction: true,
                    supportsAnimation: true,
                    supportsResize: true,
                    supportedFormats: ['png', 'svg', 'csv']
                },
                version: '2.0.0',
                author: 'Pulse Financial Insights'
            });
            
            // Register default configuration for Sankey charts
            app.modules.chartFactory.registerDefaultConfig('sankey', {
                autoCenter: true,
                autoMiddleAlign: true,
                enableInteractions: true,
                animationDuration: 800
            });
            
            console.log('✅ Chart types registered successfully');
            
        } catch (error) {
            throw new Error(`Failed to register chart types: ${error.message}`);
        }
    }

    // Setup application-wide event listeners
    function setupApplicationEventListeners() {
        console.log('Setting up application event listeners...');
        
        const eventManager = app.modules.eventManager;
        
        // Chart lifecycle events
        eventManager.on('chart:created', (event) => {
            console.log(`Chart created: ${event.data.chartType} in ${event.data.chartId}`);
        });
        
        eventManager.on('chart:rendered', (event) => {
            console.log(`Chart rendered in ${event.data.renderTime}ms`);
        });
        
        eventManager.on('chart:error', (event) => {
            console.error('Chart error:', event.data.error);
            showUserMessage('Chart Error', 'There was a problem with the chart. Please try refreshing.', 'error');
        });
        
        // Data events
        eventManager.on('data:loaded', (event) => {
            console.log(`Data loaded: ${event.data.nodeCount} nodes, ${event.data.linkCount} links`);
        });
        
        eventManager.on('data:error', (event) => {
            console.error('Data error:', event.data.error);
            showUserMessage('Data Error', 'There was a problem loading the data. Please check your data format.', 'error');
        });
        
        // Export events
        eventManager.on('chart:exported', (event) => {
            console.log(`Chart exported: ${event.data.format} - ${event.data.filename}`);
            showUserMessage('Export Complete', `Chart exported as ${event.data.format.toUpperCase()}`, 'success');
        });
        
        // Configuration events
        eventManager.on('config:changed', (event) => {
            console.log('Configuration changed:', event.data.key);
        });
        
        // System events
        eventManager.on('system:ready', (event) => {
            console.log('System ready event received');
        });
        
        // Window resize handling with debouncing
        let resizeTimeout;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                eventManager.emit('system:resize', {
                    width: window.innerWidth,
                    height: window.innerHeight
                });
                handleWindowResize();
            }, 250);
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboardShortcuts);
        
        // Page visibility changes
        document.addEventListener('visibilitychange', () => {
            eventManager.emit('system:visibility', {
                visible: !document.hidden
            });
        });
        
        console.log('✅ Application event listeners set up');
    }

    // Initialize the main Sankey chart
    function initializeMainChart() {
        console.log('Initializing main Sankey chart...');
        
        try {
            // Create chart using factory
            app.charts.sankey = app.modules.chartFactory.createChart('sankey', 'sankey-chart');
            
            // Emit chart created event
            app.modules.eventManager.emit('chart:created', {
                chartId: 'sankey-chart',
                chartType: 'sankey',
                timestamp: Date.now()
            });
            
            console.log('✅ Main Sankey chart initialized');
            
        } catch (error) {
            throw new Error(`Failed to initialize main chart: ${error.message}`);
        }
    }

    // Load and display the default financial data
    function loadDefaultData() {
        console.log('Loading default financial data...');
        
        try {
            // Check if sample data is available
            if (typeof SAMPLE_FINANCIAL_DATA === 'undefined') {
                throw new Error('Sample financial data not available');
            }
            
            // Emit data loading event
            app.modules.eventManager.emit('data:loading', {
                source: 'sample',
                timestamp: Date.now()
            });
            
            // Process and validate data
            const startTime = performance.now();
            
            // Store current data
            app.currentData = SAMPLE_FINANCIAL_DATA;
            
            // Render the chart
            const renderStartTime = performance.now();
            app.charts.sankey.render(SAMPLE_FINANCIAL_DATA);
            const renderTime = performance.now() - renderStartTime;
            
            // Emit success events
            app.modules.eventManager.emit('data:loaded', {
                source: 'sample',
                nodeCount: SAMPLE_FINANCIAL_DATA.nodes.length,
                linkCount: SAMPLE_FINANCIAL_DATA.links.length,
                processingTime: performance.now() - startTime
            });
            
            app.modules.eventManager.emit('chart:rendered', {
                chartId: 'sankey-chart',
                renderTime: renderTime,
                nodeCount: SAMPLE_FINANCIAL_DATA.nodes.length
            });
            
            // Hide loading indicator
            hideLoadingIndicator();
            
            console.log(`✅ Default data loaded and rendered in ${renderTime.toFixed(2)}ms`);
            
        } catch (error) {
            app.modules.eventManager.emit('data:error', {
                error: error.message,
                source: 'sample'
            });
            throw new Error(`Failed to load default data: ${error.message}`);
        }
    }

    // Finalize application initialization
    function finalizeInitialization() {
        // Mark application as initialized
        app.initialized = true;
        
        // Update configuration
        app.modules.configManager.setGlobal('app.initialized', true);
        app.modules.configManager.setGlobal('app.initializationTime', Date.now());
        
        // Emit system ready event
        app.modules.eventManager.emit('system:ready', {
            version: app.version,
            modules: Object.keys(app.modules),
            charts: Object.keys(app.charts),
            timestamp: Date.now()
        });
        
        console.log('🎉 Pulse Financial Visualization Platform initialized successfully!');
        
        // Show welcome message in development
        if (window.location.hostname === 'localhost') {
            setTimeout(() => {
                showUserMessage('Welcome', 'Pulse v2.0 loaded successfully with modular architecture!', 'info', 3000);
            }, 1000);
        }
    }

    // Handle initialization errors
    function handleInitializationError(error) {
        console.error('💥 Failed to initialize Pulse application:', error);
        
        // Try to report to error handler if available
        if (app.modules.errorHandler) {
            app.modules.errorHandler.reportError(error, {
                component: 'application',
                action: 'initialize'
            });
        }
        
        // Show error message to user
        showError('Application failed to load properly. Please refresh the page.', error.message);
    }

    // === EVENT HANDLERS ===

    // Handle window resize
    function handleWindowResize() {
        if (!app.initialized || !app.charts.sankey) return;
        
        console.log('Handling window resize...');
        
        const container = document.getElementById('sankey-chart');
        if (!container) return;
        
        const containerRect = container.getBoundingClientRect();
        const newWidth = Math.max(800, containerRect.width);
        const newHeight = Math.max(500, containerRect.height || 600);
        
        // Resize chart
        app.charts.sankey.resize(newWidth, newHeight);
        
        // Emit resize event
        app.modules.eventManager.emit('chart:resized', {
            chartId: 'sankey-chart',
            newWidth,
            newHeight
        });
    }

    // Handle keyboard shortcuts
    function handleKeyboardShortcuts(event) {
        if (!app.initialized) return;
        
        // Check for modifier keys
        if (event.ctrlKey || event.metaKey) {
            switch (event.key.toLowerCase()) {
                case 's':
                    event.preventDefault();
                    exportChart('png');
                    break;
                case 'e':
                    event.preventDefault();
                    showExportMenu();
                    break;
                case 'r':
                    event.preventDefault();
                    refreshChart();
                    break;
                case 'd':
                    if (event.shiftKey) {
                        event.preventDefault();
                        toggleDebugMode();
                    }
                    break;
            }
        }
        
        // Function keys
        switch (event.key) {
            case 'F1':
                event.preventDefault();
                showHelp();
                break;
            case 'F5':
                // Allow default refresh behavior
                break;
        }
    }

    // === UTILITY FUNCTIONS ===

    // Hide loading indicator
    function hideLoadingIndicator() {
        const loadingDiv = document.querySelector('.chart-loading');
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
    }

    // Show user message
    function showUserMessage(title, message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `pulse-notification pulse-notification-${type}`;
        notification.innerHTML = `
            <div class="pulse-notification-content">
                <div class="pulse-notification-title">${title}</div>
                <div class="pulse-notification-message">${message}</div>
            </div>
            <div class="pulse-notification-close" onclick="this.parentElement.remove()">×</div>
        `;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: '10001',
            minWidth: '300px',
            opacity: '0',
            transform: 'translateX(100%)',
            transition: 'all 0.3s ease'
        });
        
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        });
        
        // Auto-hide
        if (duration > 0) {
            setTimeout(() => {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => notification.remove(), 300);
            }, duration);
        }
    }

    // Show error message
    function showError(message, technicalDetails = '') {
        hideLoadingIndicator();
        
        const chartContainer = document.getElementById('sankey-chart');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <div class="chart-error" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 400px;
                    color: #dc3545;
                    text-align: center;
                    padding: 2rem;
                ">
                    <div style="font-size: 48px; margin-bottom: 1rem;">⚠️</div>
                    <h3 style="margin-bottom: 1rem; color: #dc3545;">Error Loading Chart</h3>
                    <p style="color: #6c757d; max-width: 400px; margin-bottom: 1rem;">${message}</p>
                    ${technicalDetails ? `<details style="margin-top: 1rem; color: #6c757d;">
                        <summary style="cursor: pointer;">Technical Details</summary>
                        <pre style="margin-top: 0.5rem; font-size: 12px; text-align: left;">${technicalDetails}</pre>
                    </details>` : ''}
                    <button onclick="location.reload()" style="
                        margin-top: 1rem;
                        padding: 0.5rem 1rem;
                        background: #667eea;
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                    ">Reload Page</button>
                </div>
            `;
        }
    }

    // === CHART OPERATIONS ===

    // Export chart
    function exportChart(format = 'png') {
        if (!app.charts.sankey) {
            console.error('Chart not available for export');
            return;
        }
        
        try {
            switch (format.toLowerCase()) {
                case 'png':
                    app.charts.sankey.exportToPNG();
                    break;
                case 'svg':
                    app.charts.sankey.exportToSVG();
                    break;
                case 'csv':
                    app.charts.sankey.exportDataToCSV();
                    break;
                default:
                    console.warn(`Unknown export format: ${format}`);
            }
            
            app.modules.eventManager.emit('chart:exported', {
                format,
                filename: `pulse-chart.${format}`,
                timestamp: Date.now()
            });
            
        } catch (error) {
            app.modules.errorHandler.reportError(error, {
                component: 'export',
                format
            });
        }
    }

    // Show export menu
    function showExportMenu() {
        if (app.charts.sankey && app.charts.sankey.showExportMenu) {
            app.charts.sankey.showExportMenu();
        }
    }

    // Refresh chart
    function refreshChart() {
        if (app.charts.sankey && app.currentData) {
            console.log('Refreshing chart...');
            app.charts.sankey.render(app.currentData);
            showUserMessage('Chart Refreshed', 'Chart has been refreshed successfully', 'success', 2000);
        }
    }

    // Toggle debug mode
    function toggleDebugMode() {
        const isDebug = app.modules.configManager.getGlobal('development.enableDebugMode');
        app.modules.configManager.setGlobal('development.enableDebugMode', !isDebug);
        
        if (!isDebug) {
            app.modules.eventManager.enableDebugMode();
            console.log('🐛 Debug mode enabled');
            showUserMessage('Debug Mode', 'Debug mode enabled - check console for detailed logs', 'info', 2000);
        } else {
            app.modules.eventManager.disableDebugMode();
            console.log('🐛 Debug mode disabled');
            showUserMessage('Debug Mode', 'Debug mode disabled', 'info', 2000);
        }
    }

    // Show help
    function showHelp() {
        const helpContent = `
            <h3>Pulse Financial Visualization - Help</h3>
            <h4>Keyboard Shortcuts:</h4>
            <ul>
                <li><strong>Ctrl+S</strong> - Export as PNG</li>
                <li><strong>Ctrl+E</strong> - Show export menu</li>
                <li><strong>Ctrl+R</strong> - Refresh chart</li>
                <li><strong>Ctrl+Shift+D</strong> - Toggle debug mode</li>
                <li><strong>F1</strong> - Show this help</li>
            </ul>
            <h4>Chart Features:</h4>
            <ul>
                <li>Hover over nodes and links for details</li>
                <li>Click export buttons in the chart header</li>
                <li>Chart automatically resizes with window</li>
            </ul>
        `;
        
        showUserMessage('Help', helpContent, 'info', 0); // 0 = no auto-hide
    }

    // === PUBLIC API ===

    // Public API for external interaction
    window.PulseApp = {
        // Get application state
        getState: function() {
            return {
                ...app,
                initialized: app.initialized,
                version: app.version,
                currentData: app.currentData ? {
                    nodeCount: app.currentData.nodes?.length || 0,
                    linkCount: app.currentData.links?.length || 0
                } : null,
                modules: Object.keys(app.modules),
                charts: Object.keys(app.charts)
            };
        },
        
        // Load new data
        loadData: function(data) {
            try {
                if (!app.charts.sankey) {
                    throw new Error('Chart not initialized');
                }
                
                app.currentData = data;
                app.charts.sankey.render(data);
                
                app.modules.eventManager.emit('data:loaded', {
                    source: 'external',
                    nodeCount: data.nodes?.length || 0,
                    linkCount: data.links?.length || 0
                });
                
                return { success: true };
            } catch (error) {
                app.modules.errorHandler.reportError(error, {
                    component: 'dataLoader',
                    action: 'loadData'
                });
                return { success: false, error: error.message };
            }
        },
        
        // Chart operations
        chart: {
            export: exportChart,
            exportMenu: showExportMenu,
            refresh: refreshChart,
            resize: handleWindowResize,
            getState: () => app.charts.sankey ? app.charts.sankey.getState() : null
        },
        
        // Configuration
        config: {
            get: (key) => app.modules.configManager.getGlobal(key),
            set: (key, value) => app.modules.configManager.setGlobal(key, value),
            getTheme: () => app.modules.configManager.getCurrentTheme(),
            setTheme: (theme) => app.modules.configManager.setTheme(theme)
        },
        
        // Events
        events: {
            on: (event, callback) => app.modules.eventManager.on(event, callback),
            off: (event, callback) => app.modules.eventManager.off(event, callback),
            emit: (event, data) => app.modules.eventManager.emit(event, data)
        },
        
        // Debug utilities
        debug: {
            toggle: toggleDebugMode,
            getStats: () => ({
                config: app.modules.configManager.debug(),
                events: app.modules.eventManager.debug(),
                errors: app.modules.errorHandler.debug(),
                charts: app.modules.chartFactory.debug()
            }),
            showHelp: showHelp
        },
        
        // Version info
        version: app.version
    };

    // === INITIALIZATION ===

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeApp);
    } else {
        // DOM already loaded, initialize immediately
        setTimeout(initializeApp, 0);
    }

    // Global error handling
    window.addEventListener('error', function(event) {
        console.error('Global error caught:', event.error);
        if (app.modules?.errorHandler) {
            app.modules.errorHandler.reportError(event.error, {
                component: 'global',
                filename: event.filename,
                lineno: event.lineno
            });
        }
    });

    // Unhandled promise rejection handling
    window.addEventListener('unhandledrejection', function(event) {
        console.error('Unhandled promise rejection:', event.reason);
        if (app.modules?.errorHandler) {
            app.modules.errorHandler.reportError(event.reason, {
                component: 'promise',
                type: 'unhandledRejection'
            });
        }
    });

    console.log('Pulse main application loaded - waiting for DOM ready...');

})();