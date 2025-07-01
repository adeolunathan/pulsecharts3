/* TEST SCRIPT: Debug barChartType dropdown execution flow */
/* Add this to browser console when chart.html is loaded */

console.log('🔍 =====  DROPDOWN DEBUG TEST STARTED =====');

// 1. Test if the dropdown element exists
const dropdown = document.querySelector('select.control-dropdown');
console.log('1. Dropdown element found:', dropdown);
if (dropdown) {
    console.log('   - Dropdown options:', Array.from(dropdown.options).map(opt => ({value: opt.value, text: opt.text})));
    console.log('   - Current value:', dropdown.value);
}

// 2. Test if the control panel exists
console.log('2. Control panel exists:', !!window.pulseApp?.controlPanel);
if (window.pulseApp?.controlPanel) {
    console.log('   - Control module exists:', !!window.pulseApp.controlPanel.controlModule);
    console.log('   - Chart exists:', !!window.pulseApp.controlPanel.chart);
}

// 3. Test if bar controls module exists
console.log('3. BarControlModule exists:', !!window.BarControlModule);

// 4. Add event listener to track dropdown changes
if (dropdown) {
    dropdown.addEventListener('change', function(event) {
        console.log('🔥 DROPDOWN CHANGED:', event.target.value);
        console.log('   - Event object:', event);
        console.log('   - Target element:', event.target);
        console.log('   - New value:', event.target.value);
        
        // Manually trace the execution path
        console.log('🚀 Manually triggering handleChange...');
        if (window.pulseApp?.controlPanel) {
            try {
                window.pulseApp.controlPanel.handleChange('barChartType', event.target.value);
                console.log('✅ handleChange called successfully');
            } catch (error) {
                console.error('❌ Error in handleChange:', error);
            }
        }
    });
    console.log('✅ Event listener added to dropdown');
}

// 5. Test manual dropdown change
console.log('5. Testing manual dropdown change...');
function testDropdownChange(newValue) {
    console.log(`🧪 Testing dropdown change to: ${newValue}`);
    
    if (dropdown) {
        // Change the dropdown value
        dropdown.value = newValue;
        
        // Trigger change event
        const changeEvent = new Event('change', { bubbles: true });
        dropdown.dispatchEvent(changeEvent);
        
        console.log(`📊 Dropdown manually changed to: ${newValue}`);
    } else {
        console.warn('⚠️ Dropdown not found for manual test');
    }
}

// 6. Test if chart is properly initialized
console.log('6. Chart initialization status:');
if (window.pulseApp?.chart) {
    console.log('   - Chart instance:', window.pulseApp.chart);
    console.log('   - Chart config:', window.pulseApp.chart.config);
    console.log('   - Chart data:', window.pulseApp.chart.data);
    console.log('   - Current barChartType:', window.pulseApp.chart.config?.barChartType);
}

// 7. Test the control module's getCurrentValue method
console.log('7. Testing getCurrentValue for barChartType...');
if (window.pulseApp?.controlPanel?.controlModule) {
    try {
        const currentValue = window.pulseApp.controlPanel.controlModule.getCurrentValue('barChartType', window.pulseApp.chart);
        console.log('   - getCurrentValue result:', currentValue);
    } catch (error) {
        console.error('   - Error in getCurrentValue:', error);
    }
}

// 8. Expose test functions to global scope
window.testDropdownChange = testDropdownChange;
window.debugDropdown = {
    testChange: testDropdownChange,
    forceHandleChange: (value) => {
        if (window.pulseApp?.controlPanel) {
            window.pulseApp.controlPanel.handleChange('barChartType', value);
        }
    },
    checkControlModule: () => {
        return {
            exists: !!window.pulseApp?.controlPanel?.controlModule,
            type: window.pulseApp?.controlPanel?.controlModule?.constructor?.name,
            hasHandleControlChange: typeof window.pulseApp?.controlPanel?.controlModule?.handleControlChange === 'function'
        };
    },
    checkChart: () => {
        return {
            exists: !!window.pulseApp?.chart,
            type: window.pulseApp?.chart?.constructor?.name,
            hasUpdateConfig: typeof window.pulseApp?.chart?.updateConfig === 'function',
            currentBarChartType: window.pulseApp?.chart?.config?.barChartType
        };
    }
};

console.log('🔍 ===== DROPDOWN DEBUG TEST COMPLETE =====');
console.log('💡 Available test commands:');
console.log('   - testDropdownChange("grouped") - Test dropdown change');
console.log('   - debugDropdown.forceHandleChange("stacked") - Force handleChange');
console.log('   - debugDropdown.checkControlModule() - Check control module');
console.log('   - debugDropdown.checkChart() - Check chart status');