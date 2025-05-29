// Placeholder for advanced-example.js
/* ===== ADVANCED EXAMPLE - NEW ARCHITECTURE SHOWCASE ===== */
/* Demonstrates the enhanced capabilities of Pulse v2.0 */

// Wait for the application to be ready
document.addEventListener('pulse:system:ready', function() {
    console.log('🚀 Advanced Example: Demonstrating Pulse v2.0 Architecture');
    console.log('='.repeat(60));
    
    // Get references to the core systems
    const app = window.PulseApp;
    const configManager = window.configManager;
    const eventManager = window.eventManager;
    const errorHandler = window.errorHandler;
    const chartFactory = window.chartFactory;
    
    // === DEMONSTRATE EVENT SYSTEM ===
    
    console.log('📡 Setting up advanced event listeners...');
    
    // Listen for chart events
    eventManager.on('chart:rendered', (event) => {
        console.log(`✅ Chart rendered in ${event.data.renderTime}ms with ${event.data.nodeCount} nodes`);
    });
    
    // Listen for data events
    eventManager.on('data:processed', (event) => {
        console.log(`📊 Data processed: ${event.data.chartType} chart with ${event.data.nodeCount} nodes`);
    });
    
    // Listen for export events
    eventManager.on('chart:exported', (event) => {
        console.log(`💾 Chart exported as ${event.data.format}: ${event.data.filename}`);
        showAdvancedNotification(`Export Complete`, `Chart saved as ${event.data.format.toUpperCase()}`, 'success');
    });
    
    // Listen for configuration changes
    eventManager.on('config:changed', (event) => {
        console.log(`⚙️ Configuration changed: ${event.data.key} = ${event.data.value}`);
    });
    
    // Custom event for demonstration
    eventManager.on('demo:showcase', (event) => {
        console.log(`🎭 Showcase event received:`, event.data);
    });
    
    // === DEMONSTRATE CONFIGURATION SYSTEM ===
    
    console.log('⚙️ Exploring configuration system...');
    
    // Show current configuration
    console.log('Current theme:', configManager.getCurrentTheme());
    console.log('Global config sample:', {
        animationDuration: configManager.getGlobal('charts.defaultAnimationDuration'),
        enableTooltips: configManager.getGlobal('charts.enableGlobalTooltips'),
        debugMode: configManager.getGlobal('development.enableDebugMode')
    });
    
    // Demonstrate configuration inheritance
    const sankeyConfig = configManager.getResolvedConfig('sankey', {
        customNodeWidth: 30,
        customCurvature: 0.6
    });
    console.log('Resolved Sankey config:', sankeyConfig);
    
    // === DEMONSTRATE ERROR HANDLING ===
    
    console.log('🚨 Testing error handling system...');
    
    // Add custom error listener
    errorHandler.addErrorListener((error) => {
        console.log(`📋 Custom error handler caught: ${error.category} - ${error.message}`);
    });
    
    // Simulate a test error (safe)
    setTimeout(() => {
        try {
            throw new Error('Demo error for testing - this is intentional');
        } catch (error) {
            errorHandler.reportError(error, {
                component: 'demo',
                action: 'test_error_handling',
                severity: 'low'
            });
        }
    }, 2000);
    
    // === DEMONSTRATE ADVANCED CHART FEATURES ===
    
    console.log('📈 Setting up advanced chart demonstrations...');
    
    // Add chart customization examples
    setTimeout(() => {
        demonstrateChartCustomization();
    }, 3000);
    
    setTimeout(() => {
        demonstrateAdvancedExports();
    }, 5000);
    
    setTimeout(() => {
        demonstrateDataProcessing();
    }, 7000);
    
    // === DEMONSTRATE PERFORMANCE MONITORING ===
    
    console.log('⚡ Setting up performance monitoring...');
    
    // Monitor chart performance
    eventManager.on('chart:rendered', (event) => {
        const renderTime = event.data.renderTime;
        if (renderTime > 1000) {
            eventManager.emit('performance:slow', {
                component: 'chart',
                renderTime,
                threshold: 1000
            });
        }
    });
    
    // Listen for performance issues
    eventManager.on('performance:slow', (event) => {
        console.warn(`⚠️ Slow performance detected: ${event.data.component} took ${event.data.renderTime}ms`);
    });
    
    console.log('✅ Advanced example setup complete!');
});

// === DEMONSTRATION FUNCTIONS ===

function demonstrateChartCustomization() {
    console.log('\n🎨 Demonstrating Advanced Chart Customization...');
    
    const chart = window.PulseApp.chart;
    
    if (!chart) {
        console.warn('Chart not available for customization demo');
        return;
    }
    
    // Get the actual chart instance
    const sankeyChart = window.chartFactory.getChartByContainer('sankey-chart');
    
    if (!sankeyChart) {
        console.warn('Sankey chart instance not found');
        return;
    }
    
    // Demonstrate curvature presets
    console.log('Applying curvature presets...');
    
    setTimeout(() => {
        sankeyChart.applyCurvaturePreset('dramatic');
        console.log('Applied dramatic curvature preset');
        showAdvancedNotification('Style Updated', 'Applied dramatic curvature preset', 'info');
    }, 1000);
    
    setTimeout(() => {
        sankeyChart.applyCurvaturePreset('gentle');
        console.log('Applied gentle curvature preset');
        showAdvancedNotification('Style Updated', 'Applied gentle curvature preset', 'info');
    }, 3000);
    
    // Demonstrate layer-specific curvature
    setTimeout(() => {
        sankeyChart.setLayerCurvature(0, 0.2);
        sankeyChart.setLayerCurvature(1, 0.5);
        sankeyChart.setLayerCurvature(2, 0.7);
        console.log('Applied progressive layer-specific curvature');
        showAdvancedNotification('Style Updated', 'Applied progressive curvature', 'info');
    }, 5000);
    
    // Demonstrate comprehensive customization
    setTimeout(() => {
        sankeyChart.customize({
            nodeHeightScale: 0.8,
            linkWidthScale: 0.8,
            leftmostSpacingMultiplier: 0.7,
            rightmostSpacingMultiplier: 0.6
        });
        console.log('Applied comprehensive customization');
        showAdvancedNotification('Chart Enhanced', 'Applied comprehensive styling', 'success');
    }, 7000);
}

function demonstrateAdvancedExports() {
    console.log('\n💾 Demonstrating Advanced Export Features...');
    
    const sankeyChart = window.chartFactory.getChartByContainer('sankey-chart');
    
    if (!sankeyChart) {
        console.warn('Sankey chart instance not found for export demo');
        return;
    }
    
    // Show export information
    const exportInfo = sankeyChart.getExportInfo();
    console.log('Export capabilities:', exportInfo);
    
    // Demonstrate export options
    console.log('Export formats available:', exportInfo.supportedFormats);
    console.log('Browser support:', exportInfo.browserSupport);
    
    showAdvancedNotification('Export Ready', 'Advanced export features available - check console', 'info');
}

function demonstrateDataProcessing() {
    console.log('\n📊 Demonstrating Enhanced Data Processing...');
    
    // Get the enhanced data processor
    const processor = window.DataProcessor.processor;
    
    if (!processor) {
        console.warn('Enhanced data processor not available');
        return;
    }
    
    // Show processor statistics
    const stats = processor.getStats();
    console.log('Data processor stats:', stats);
    
    // Demonstrate chart type detection
    const sampleData = window.SAMPLE_FINANCIAL_DATA;
    const detectedType = processor.detectChartType(sampleData);
    console.log(`Detected chart type: ${detectedType}`);
    
    // Get recommended chart types
    const recommendations = processor.getRecommendedChartTypes(sampleData);
    console.log('Chart type recommendations:', recommendations);
    
    // Demonstrate data validation
    const validation = processor.validateForChartType(sampleData, 'sankey');
    console.log('Data validation result:', validation);
    
    showAdvancedNotification('Data Analysis', 'Enhanced data processing completed - check console', 'info');
}

// === ADVANCED UI HELPERS ===

function showAdvancedNotification(title, message, type = 'info', duration = 3000) {
    // Create enhanced notification with animation
    const notification = document.createElement('div');
    notification.className = `pulse-advanced-notification pulse-notification-${type}`;
    
    // Enhanced styling
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%) translateY(-100px)',
        background: getNotificationColor(type),
        color: 'white',
        padding: '16px 24px',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(10px)',
        zIndex: '10002',
        minWidth: '320px',
        maxWidth: '500px',
        opacity: '0',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
        border: '1px solid rgba(255,255,255,0.2)'
    });
    
    // Content with icon
    const icon = getNotificationIcon(type);
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-size: 24px;">${icon}</div>
            <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 16px; margin-bottom: 4px;">${title}</div>
                <div style="font-size: 14px; opacity: 0.9; line-height: 1.4;">${message}</div>
            </div>
            <div style="cursor: pointer; font-size: 20px; opacity: 0.7; padding: 4px;" onclick="this.parentElement.parentElement.remove()">×</div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    requestAnimationFrame(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(-50%) translateY(0)';
    });
    
    // Auto-hide
    if (duration > 0) {
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(-50%) translateY(-100px)';
            setTimeout(() => notification.remove(), 400);
        }, duration);
    }
}

function getNotificationColor(type) {
    const colors = {
        success: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
        error: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
        warning: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
        info: 'linear-gradient(135deg, #2196F3 0%, #1976d2 100%)'
    };
    return colors[type] || colors.info;
}

function getNotificationIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

// === ADVANCED DEMO CONTROLS ===

// Add advanced demo controls to the page
function addAdvancedDemoControls() {
    // Only add in development
    if (window.location.hostname !== 'localhost' && !window.location.search.includes('demo=true')) {
        return;
    }
    
    const controlPanel = document.createElement('div');
    controlPanel.id = 'advanced-demo-controls';
    controlPanel.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        background: rgba(0,0,0,0.9);
        color: white;
        padding: 16px;
        border-radius: 8px;
        z-index: 10000;
        font-family: monospace;
        font-size: 12px;
        max-width: 300px;
    `;
    
    controlPanel.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 12px;">🧪 Advanced Demo Controls</div>
        <button onclick="demonstrateChartCustomization()" style="display: block; width: 100%; margin: 4px 0; padding: 6px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Chart Customization</button>
        <button onclick="demonstrateAdvancedExports()" style="display: block; width: 100%; margin: 4px 0; padding: 6px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Export Features</button>
        <button onclick="demonstrateDataProcessing()" style="display: block; width: 100%; margin: 4px 0; padding: 6px; background: #ffc107; color: black; border: none; border-radius: 4px; cursor: pointer;">Data Processing</button>
        <button onclick="window.eventManager.emit('demo:showcase', {message: 'Hello from demo!'})" style="display: block; width: 100%; margin: 4px 0; padding: 6px; background: #6f42c1; color: white; border: none; border-radius: 4px; cursor: pointer;">Test Events</button>
        <button onclick="console.log(window.PulseApp.debug.getStats())" style="display: block; width: 100%; margin: 4px 0; padding: 6px; background: #fd7e14; color: white; border: none; border-radius: 4px; cursor: pointer;">System Stats</button>
        <button onclick="this.parentElement.remove()" style="display: block; width: 100%; margin: 8px 0 0 0; padding: 6px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Close</button>
    `;
    
    document.body.appendChild(controlPanel);
}

// Add demo controls when page is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(addAdvancedDemoControls, 2000);
    });
} else {
    setTimeout(addAdvancedDemoControls, 2000);
}

// === ADVANCED TESTING UTILITIES ===

// Test all systems
window.testPulseV2 = function() {
    console.log('\n🧪 Testing Pulse v2.0 Architecture...');
    console.log('='.repeat(50));
    
    const results = {
        coreModules: testCoreModules(),
        chartSystem: testChartSystem(),
        eventSystem: testEventSystem(),
        configSystem: testConfigSystem(),
        errorHandling: testErrorHandling()
    };
    
    console.log('\n📊 Test Results Summary:');
    console.table(results);
    
    const allPassed = Object.values(results).every(result => result.status === 'pass');
    console.log(allPassed ? '✅ All tests passed!' : '❌ Some tests failed');
    
    return results;
};

function testCoreModules() {
    try {
        const requiredModules = ['BaseChart', 'ChartFactory', 'ConfigManager', 'ErrorHandler', 'EventManager'];
        const missing = requiredModules.filter(module => !window[module]);
        
        return {
            status: missing.length === 0 ? 'pass' : 'fail',
            details: missing.length === 0 ? 'All core modules loaded' : `Missing: ${missing.join(', ')}`
        };
    } catch (error) {
        return { status: 'error', details: error.message };
    }
}

function testChartSystem() {
    try {
        const factory = window.chartFactory;
        const types = factory.getAvailableChartTypes();
        const hasChart = factory.getChartByContainer('sankey-chart') !== null;
        
        return {
            status: types.length > 0 && hasChart ? 'pass' : 'fail',
            details: `${types.length} chart types, chart instance: ${hasChart}`
        };
    } catch (error) {
        return { status: 'error', details: error.message };
    }
}

function testEventSystem() {
    try {
        const eventManager = window.eventManager;
        let testPassed = false;
        
        // Test event emission and listening
        eventManager.once('test:event', () => { testPassed = true; });
        eventManager.emit('test:event', { test: true });
        
        return {
            status: testPassed ? 'pass' : 'fail',
            details: testPassed ? 'Events working correctly' : 'Event system failed'
        };
    } catch (error) {
        return { status: 'error', details: error.message };
    }
}

function testConfigSystem() {
    try {
        const configManager = window.configManager;
        const testValue = 'test_' + Date.now();
        
        configManager.setGlobal('test.value', testValue);
        const retrieved = configManager.getGlobal('test.value');
        
        return {
            status: retrieved === testValue ? 'pass' : 'fail',
            details: retrieved === testValue ? 'Config system working' : 'Config retrieval failed'
        };
    } catch (error) {
        return { status: 'error', details: error.message };
    }
}

function testErrorHandling() {
    try {
        const errorHandler = window.errorHandler;
        const initialCount = errorHandler.getErrorStats().totalErrors;
        
        // Test error reporting
        errorHandler.reportError(new Error('Test error'), { component: 'test' });
        
        const newCount = errorHandler.getErrorStats().totalErrors;
        
        return {
            status: newCount > initialCount ? 'pass' : 'fail',
            details: `Error count increased: ${initialCount} → ${newCount}`
        };
    } catch (error) {
        return { status: 'error', details: error.message };
    }
}

console.log('🎭 Advanced Example loaded - waiting for system ready...');