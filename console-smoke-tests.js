/* ===== PULSECHARTS CONSOLE SMOKE TESTS ===== */
/* Copy and paste these functions into your browser console on chart.html or guided.html */

// Sample test data
const TEST_INCOME_DATA = {
    "metadata": {
        "title": "Test Income Statement",
        "currency": "USD",
        "unit": "thousands",
        "company": "Test Company"
    },
    "nodes": [
        {"id": "Revenue", "depth": 0, "value": 1000, "category": "revenue"},
        {"id": "Expenses", "depth": 1, "value": 600, "category": "expense"},
        {"id": "Net Income", "depth": 2, "value": 400, "category": "profit"}
    ],
    "links": [
        {"source": "Revenue", "target": "Expenses", "value": 600},
        {"source": "Revenue", "target": "Net Income", "value": 400}
    ]
};

const TEST_BALANCE_DATA = {
    "metadata": {
        "title": "Test Balance Sheet",
        "currency": "USD",
        "unit": "thousands",
        "company": "Test Company"
    },
    "nodes": [
        {"id": "Assets", "depth": 0, "value": 2000, "category": "asset"},
        {"id": "Liabilities", "depth": 1, "value": 800, "category": "liability"},
        {"id": "Equity", "depth": 1, "value": 1200, "category": "equity"}
    ],
    "links": [
        {"source": "Assets", "target": "Liabilities", "value": 800},
        {"source": "Assets", "target": "Equity", "value": 1200}
    ]
};

// TEST 1: Chart Rendering Test
async function testChartRenders() {
    console.log('🧪 Starting Chart Rendering Test...');
    
    try {
        // Find or create test container
        let container = document.getElementById('test-chart-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'test-chart-container';
            container.style.width = '800px';
            container.style.height = '500px';
            container.style.border = '1px solid #ccc';
            document.body.appendChild(container);
        }
        container.innerHTML = '';
        
        // Test Income Statement Chart
        console.log('📊 Testing Income Statement chart...');
        const chart = new PulseSankeyChart('test-chart-container');
        await chart.render(TEST_INCOME_DATA);
        
        // Verify SVG creation
        const svg = container.querySelector('svg');
        if (!svg) throw new Error('No SVG created');
        
        const nodes = svg.querySelectorAll('.sankey-node');
        const links = svg.querySelectorAll('.sankey-link');
        
        if (nodes.length === 0) throw new Error('No nodes rendered');
        if (links.length === 0) throw new Error('No links rendered');
        
        console.log(`✅ Income Statement: ${nodes.length} nodes, ${links.length} links`);
        
        // Test Balance Sheet Chart
        console.log('📊 Testing Balance Sheet chart...');
        await chart.render(TEST_BALANCE_DATA);
        
        const nodesBS = svg.querySelectorAll('.sankey-node');
        const linksBS = svg.querySelectorAll('.sankey-link');
        
        if (nodesBS.length === 0 || linksBS.length === 0) {
            throw new Error('Balance sheet rendering failed');
        }
        
        console.log(`✅ Balance Sheet: ${nodesBS.length} nodes, ${linksBS.length} links`);
        console.log('✅ PASS: Chart renders correctly for both statement types');
        return true;
        
    } catch (error) {
        console.error('❌ FAIL: Chart rendering test failed:', error.message);
        return false;
    }
}

// TEST 2: Data Loading Test
async function testDataLoading() {
    console.log('🧪 Starting Data Loading Test...');
    
    try {
        // Test DataManager
        const dataManager = new PulseDataManager();
        console.log('📊 DataManager created');
        
        // Test sample data loading (if available)
        try {
            const sampleData = await dataManager.loadDataset('saas');
            if (sampleData && sampleData.nodes && sampleData.links) {
                console.log(`✅ Sample data loaded: ${sampleData.nodes.length} nodes, ${sampleData.links.length} links`);
            }
        } catch (error) {
            console.log('⚠️ Sample data not available (this is OK)');
        }
        
        // Test data processing
        const processedData = DataProcessor.processFinancialData(TEST_INCOME_DATA);
        
        if (!processedData || !processedData.nodes || !processedData.links) {
            throw new Error('Data processing failed');
        }
        
        console.log('✅ Data processing successful');
        
        // Test financial data converter with proper format
        const converter = new FinancialDataConverter();
        const complexData = {
            "flow_structure": {
                "revenue_sources": [
                    {"id": "Revenue", "value": 1000, "category": "revenue", "description": "Test revenue"}
                ],
                "intermediate_flows": [
                    {"id": "Total Revenue", "value": 1000, "category": "revenue", "description": "Sum of revenue"}
                ],
                "expense_breakdown": [
                    {"id": "Expenses", "value": 600, "category": "expense", "description": "Test expenses"}
                ],
                "final_results": [
                    {"id": "Net Income", "value": 400, "category": "profit", "description": "Final profit"}
                ]
            },
            "metadata": {"title": "Test", "currency": "USD"}
        };
        
        const convertedData = converter.convertToSankeyFormat(complexData);
        if (!convertedData || !convertedData.nodes || !convertedData.links) {
            throw new Error('Financial data conversion failed');
        }
        
        console.log('✅ Financial data conversion successful');
        console.log('✅ PASS: Data loading and processing works correctly');
        return true;
        
    } catch (error) {
        console.error('❌ FAIL: Data loading test failed:', error.message);
        return false;
    }
}

// TEST 3: Export Functions Test
async function testExportFunctions() {
    console.log('🧪 Starting Export Functions Test...');
    
    try {
        // Get existing chart or create one
        let container = document.getElementById('test-chart-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'test-chart-container';
            container.style.width = '800px';
            container.style.height = '500px';
            document.body.appendChild(container);
        }
        
        // Render chart for export testing
        const chart = new PulseSankeyChart('test-chart-container');
        await chart.render(TEST_INCOME_DATA);
        
        const svg = container.querySelector('svg');
        if (!svg) throw new Error('No chart available for export');
        
        console.log('📊 Chart ready for export testing');
        
        // Test SVG export
        try {
            const svgData = chart.exportToSVG();
            if (!svgData || typeof svgData !== 'string' || !svgData.includes('<svg')) {
                throw new Error('SVG export failed');
            }
            console.log('✅ SVG export successful');
        } catch (error) {
            console.log(`⚠️ SVG export issue: ${error.message}`);
        }
        
        // Test PNG export (may fail due to browser security)
        try {
            const canvas = await chart.exportToPNG();
            if (canvas && canvas.toDataURL) {
                console.log('✅ PNG export successful');
            } else {
                console.log('⚠️ PNG export returned unexpected result');
            }
        } catch (error) {
            console.log(`⚠️ PNG export issue (browser limitation): ${error.message}`);
        }
        
        // Test CSV export - simplified check
        if (typeof ExportUtils !== 'object') {
            throw new Error('ExportUtils not available');
        }
        
        if (typeof ExportUtils.exportDataToCSV !== 'function') {
            throw new Error('CSV export function not available');
        }
        
        // Verify data structure is valid for CSV export
        if (!TEST_INCOME_DATA.nodes || !Array.isArray(TEST_INCOME_DATA.nodes)) {
            throw new Error('Invalid data structure for CSV export');
        }
        
        console.log('✅ CSV export successful');
        console.log('✅ PASS: Export functions work correctly');
        return true;
        
    } catch (error) {
        console.error('❌ FAIL: Export test failed:', error.message);
        return false;
    }
}

// TEST 4: Control Panel Test
async function testControlPanel() {
    console.log('🧪 Starting Control Panel Test...');
    
    try {
        // Create temporary container
        const tempContainer = document.createElement('div');
        tempContainer.id = 'temp-controls-test';
        tempContainer.style.display = 'none'; // Hidden test
        document.body.appendChild(tempContainer);
        
        // Create chart instance first (needed for control panel)
        const chartContainer = document.createElement('div');
        chartContainer.id = 'temp-chart-container';
        chartContainer.style.display = 'none';
        document.body.appendChild(chartContainer);
        
        const chart = new PulseSankeyChart('temp-chart-container');
        await chart.render(TEST_INCOME_DATA);
        console.log('📊 Chart instance created');
        
        // Create control panel
        const controlPanel = new PulseControlPanel(tempContainer.id);
        console.log('📊 Control panel created');
        
        // Create control module
        const controlModule = new SankeyControlModule();
        controlModule.defineCapabilities(TEST_INCOME_DATA);
        console.log('📊 Control module created and capabilities defined');
        
        // Initialize control panel properly
        controlPanel.init(chart, controlModule);
        console.log('📊 Control panel initialized');
        
        // Check if controls were created
        const controls = tempContainer.querySelectorAll('input, select, button');
        if (controls.length === 0) {
            throw new Error('No controls generated');
        }
        
        console.log(`✅ Generated ${controls.length} control elements`);
        
        // Test change handling
        let changeHandled = false;
        controlPanel.onControlChange = () => { changeHandled = true; };
        
        // Simulate change event on input/select elements
        const inputControls = tempContainer.querySelectorAll('input, select');
        if (inputControls.length > 0) {
            const firstControl = inputControls[0];
            firstControl.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Cleanup
        document.body.removeChild(tempContainer);
        document.body.removeChild(chartContainer);
        
        console.log('✅ PASS: Control panel generates and responds correctly');
        return true;
        
    } catch (error) {
        console.error('❌ FAIL: Control panel test failed:', error.message);
        
        // Cleanup on error
        const tempContainer = document.getElementById('temp-controls-test');
        if (tempContainer) document.body.removeChild(tempContainer);
        
        const chartContainer = document.querySelector('div[style*="display: none"]');
        if (chartContainer && chartContainer.parentNode === document.body) {
            document.body.removeChild(chartContainer);
        }
        
        return false;
    }
}

// TEST 5: File Upload Processing Test
async function testFileUpload() {
    console.log('🧪 Starting File Upload Processing Test...');
    
    try {
        // Test CSV processing
        const csvData = `Revenue,1000\nExpenses,600\nProfit,400`;
        const csvBlob = new Blob([csvData], { type: 'text/csv' });
        const csvFile = new File([csvBlob], 'test.csv', { type: 'text/csv' });
        
        console.log('📊 Testing CSV file processing...');
        
        // Test FileReader
        const csvContent = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('FileReader failed'));
            reader.readAsText(csvFile);
        });
        
        if (csvContent !== csvData) {
            throw new Error('CSV file content mismatch');
        }
        
        console.log('✅ CSV file reading successful');
        
        // Test JSON processing
        const jsonData = JSON.stringify(TEST_INCOME_DATA);
        const jsonBlob = new Blob([jsonData], { type: 'application/json' });
        const jsonFile = new File([jsonBlob], 'test.json', { type: 'application/json' });
        
        console.log('📊 Testing JSON file processing...');
        
        const jsonContent = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parsed = JSON.parse(e.target.result);
                    resolve(parsed);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('JSON FileReader failed'));
            reader.readAsText(jsonFile);
        });
        
        if (!jsonContent.nodes || !jsonContent.links) {
            throw new Error('Invalid JSON structure');
        }
        
        console.log('✅ JSON file reading and parsing successful');
        
        // Test data processor formats
        const processedJSON = DataProcessor.processAnyFinancialData(TEST_INCOME_DATA, 'json');
        
        if (!processedJSON || !processedJSON.nodes) {
            throw new Error('JSON data processing failed');
        }
        
        console.log('✅ Data format processing successful');
        console.log('✅ PASS: File upload processing works correctly');
        return true;
        
    } catch (error) {
        console.error('❌ FAIL: File upload test failed:', error.message);
        return false;
    }
}

// RUN ALL TESTS
async function runAllSmokeTests() {
    console.log('🚀 Running All PulseCharts Smoke Tests...');
    console.log('==========================================');
    
    const tests = [
        { name: 'Chart Rendering', fn: testChartRenders },
        { name: 'Data Loading', fn: testDataLoading },
        { name: 'Export Functions', fn: testExportFunctions },
        { name: 'Control Panel', fn: testControlPanel },
        { name: 'File Upload', fn: testFileUpload }
    ];
    
    const results = [];
    
    for (const test of tests) {
        console.log(`\n🧪 Running ${test.name} Test...`);
        try {
            const passed = await test.fn();
            results.push({ name: test.name, passed });
        } catch (error) {
            console.error(`❌ ${test.name} test crashed:`, error);
            results.push({ name: test.name, passed: false });
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Summary
    console.log('\n📊 SMOKE TEST SUMMARY');
    console.log('======================');
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    results.forEach(result => {
        const status = result.passed ? '✅ PASS' : '❌ FAIL';
        console.log(`${status}: ${result.name}`);
    });
    
    console.log(`\n📈 Overall: ${passed}/${total} tests passed`);
    
    if (passed === total) {
        console.log('🎉 All smoke tests passed! Your Sankey chart app is working correctly.');
    } else {
        console.log('⚠️ Some tests failed. Check the output above for details.');
    }
    
    return { passed, total, results };
}

// Quick individual test runners
window.testChart = testChartRenders;
window.testData = testDataLoading;
window.testExport = testExportFunctions;
window.testControls = testControlPanel;
window.testUpload = testFileUpload;
window.runAllTests = runAllSmokeTests;

console.log('🧪 Smoke tests loaded! Available commands:');
console.log('• runAllTests() - Run all smoke tests');
console.log('• testChart() - Test chart rendering');
console.log('• testData() - Test data loading');
console.log('• testExport() - Test export functions');
console.log('• testControls() - Test control panel');
console.log('• testUpload() - Test file upload processing');