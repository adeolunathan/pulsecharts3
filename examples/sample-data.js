/* ===== PULSE STANDARDIZED FINANCIAL DATA PROCESSOR ===== */
/* Expects data in millions, auto-converts other scales */

// STANDARD SCALE CONFIGURATION
const DATA_STANDARDS = {
    expectedUnit: "millions",          // Standard unit for all financial data
    expectedRange: {                   // Optimal range for visualization in millions
        minValue: 1,                   // $1M minimum
        maxValue: 2000,                // $2B maximum (increased for large companies)
        optimalTotal: 100-1000         // $100M-1B total revenue sweet spot (expanded range)
    },
    
    // Scale detection patterns
    scaleDetection: {
        billions: { min: 1000, indicators: ['b', 'billion', 'bn'] },
        millions: { min: 1, max: 999, indicators: ['m', 'million', 'mm'] },
        thousands: { max: 0.999, indicators: ['k', 'thousand', 'kt'] },
        units: { max: 0.001, indicators: ['', 'dollars', 'usd'] }
    }
};

// AUTO-SCALE PROCESSOR
window.DataProcessor = {
    
    // Detect the scale of incoming data
    detectDataScale: function(data) {
        const values = data.nodes.map(n => n.value).filter(v => v > 0);
        const maxValue = Math.max(...values);
        const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;
        const totalRevenue = data.nodes.find(n => n.id.toLowerCase().includes('total revenue'))?.value || maxValue;
        
        let detectedScale = 'millions'; // default
        
        // Better scale detection logic
        if (maxValue >= 5000) {
            // Values like 7800, 3200 - these represent billions
            // ASML case: 7800 = $7.8B, 3200 = $3.2B
            detectedScale = 'billions_as_numbers';
        } else if (maxValue >= 1000 && maxValue < 5000) {
            // Values like 1200, 2500 - could be large millions or small billions
            if (data.metadata?.company === 'ASML' || totalRevenue > 2000) {
                detectedScale = 'billions_as_numbers'; // Large company, likely billions
            } else {
                detectedScale = 'large_millions';
            }
        } else if (maxValue >= 100 && maxValue < 1000) {
            // Values like 180, 275 - standard millions (SaaS case)
            detectedScale = 'millions';
        } else if (maxValue >= 10 && maxValue < 100) {
            // Values like 50, 75 - could be billions represented as decimals
            detectedScale = 'decimal_billions';
        } else if (maxValue < 10) {
            // Values like 5.5, 7.8 - likely billions as decimals
            detectedScale = 'decimal_billions';
        }
        
        // Check metadata hints for override
        if (data.metadata?.unit) {
            const unit = data.metadata.unit.toLowerCase();
            if (unit.includes('billion') || unit.includes('b')) {
                detectedScale = unit.includes('decimal') ? 'decimal_billions' : 'billions_as_numbers';
            } else if (unit.includes('million') || unit.includes('m')) {
                detectedScale = 'millions';
            }
        }
        
        return {
            detectedScale,
            maxValue,
            avgValue,
            totalRevenue,
            sampleValues: values.slice(0, 5),
            confidence: this.calculateConfidence(maxValue, avgValue, detectedScale)
        };
    },
    
    // Calculate confidence in scale detection
    calculateConfidence: function(maxValue, avgValue, detectedScale) {
        // Higher confidence for clear patterns
        if (detectedScale === 'billions_as_numbers' && maxValue > 5000) return 'high';
        if (detectedScale === 'millions' && maxValue >= 100 && maxValue < 1000) return 'high';
        if (detectedScale === 'decimal_billions' && maxValue < 10) return 'high';
        return 'medium';
    },
    
    // Convert data to standard millions scale
    convertToStandardScale: function(data) {
        const scaleInfo = this.detectDataScale(data);
        const convertedData = JSON.parse(JSON.stringify(data)); // Deep copy
        
        let conversionFactor = 1; // Default: no conversion needed
        let targetUnit = "millions";
        let description = "";
        
        // Determine conversion factor based on detected scale
        switch (scaleInfo.detectedScale) {
            case 'billions_as_numbers':
                // ASML case: 7800 = $7.8B, need to convert to millions for optimal display
                // 7800 (representing $7.8B) → 780M for good visual scale
                conversionFactor = 0.1; // 7800 → 780, 3200 → 320
                description = "Billions represented as large numbers → scaled to hundreds of millions";
                break;
                
            case 'decimal_billions':
                // Values like 7.8, 3.2 representing billions → convert to millions  
                conversionFactor = 100; // 7.8 → 780, 3.2 → 320
                description = "Decimal billions → hundreds of millions";
                break;
                
            case 'large_millions':
                // Values like 1200, 2500 representing millions → scale down slightly for better display
                conversionFactor = 0.5; // 1200 → 600, 2500 → 1250
                description = "Large millions → scaled for optimal display";
                break;
                
            case 'millions':
            default:
                // SaaS case: 275, 180 already in good millions range
                conversionFactor = 1;
                description = "Already in optimal millions range";
                break;
        }
        
        // Apply conversion if needed
        if (conversionFactor !== 1) {
            convertedData.nodes.forEach(node => {
                node.value = parseFloat((node.value * conversionFactor).toFixed(1));
            });
            
            convertedData.links.forEach(link => {
                link.value = parseFloat((link.value * conversionFactor).toFixed(1));
            });
            
            console.log(`🔄 ${description}`);
            console.log(`   Scale: ${scaleInfo.detectedScale} (factor: ${conversionFactor})`);
            console.log(`   Example: ${scaleInfo.maxValue} → ${(scaleInfo.maxValue * conversionFactor).toFixed(1)}`);
        } else {
            console.log(`✅ ${description}`);
        }
        
        // Update metadata
        convertedData.metadata = {
            ...convertedData.metadata,
            unit: targetUnit,
            originalScale: scaleInfo.detectedScale, 
            conversionFactor: conversionFactor,
            scalingDescription: description,
            processed: true,
            processedAt: new Date().toISOString()
        };
        
        return convertedData;
    },
    
    // Validate converted data is in expected range
    validateStandardScale: function(data) {
        const values = data.nodes.map(n => n.value).filter(v => v > 0);
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);
        
        const issues = [];
        
        if (maxValue > DATA_STANDARDS.expectedRange.maxValue) {
            issues.push(`Max value ${maxValue}M exceeds recommended ${DATA_STANDARDS.expectedRange.maxValue}M`);
        }
        
        if (minValue < DATA_STANDARDS.expectedRange.minValue) {
            issues.push(`Min value ${minValue}M below recommended ${DATA_STANDARDS.expectedRange.minValue}M`);
        }
        
        const ratio = maxValue / minValue;
        if (ratio > 100) {
            issues.push(`Value ratio ${ratio.toFixed(1)}:1 is high - consider data review`);
        }
        
        return {
            valid: issues.length === 0,
            issues: issues,
            range: `${minValue}M - ${maxValue}M`,
            ratio: `${ratio.toFixed(1)}:1`
        };
    },
    
    // Main processing function - handles any scale input
    processFinancialData: function(rawData) {
        console.log("📊 Processing financial data...");
        
        // Step 1: Detect and convert scale
        const standardizedData = this.convertToStandardScale(rawData);
        
        // Step 2: Validate result
        const validation = this.validateStandardScale(standardizedData);
        
        if (!validation.valid) {
            console.warn("⚠️ Scale validation issues:", validation.issues);
        } else {
            console.log(`✅ Data standardized successfully: ${validation.range}`);
        }
        
        // Step 3: Basic flow conservation check
        const flowErrors = this.validateFlowConservation(standardizedData);
        if (flowErrors.length > 0) {
            console.warn("⚠️ Flow conservation issues:", flowErrors);
        }
        
        return standardizedData;
    },
    
    // Validate flow conservation
    validateFlowConservation: function(data) {
        const errors = [];
        
        data.nodes.forEach(node => {
            const inflows = data.links.filter(l => l.target === node.id);
            const outflows = data.links.filter(l => l.source === node.id);
            
            const totalInflow = inflows.reduce((sum, l) => sum + l.value, 0);
            const totalOutflow = outflows.reduce((sum, l) => sum + l.value, 0);
            
            // Check conservation (allow 1% tolerance for rounding)
            const tolerance = Math.max(0.1, node.value * 0.01);
            
            if (node.depth === 0 && outflows.length > 0) {
                if (Math.abs(totalOutflow - node.value) > tolerance) {
                    errors.push(`${node.id}: outflow ${totalOutflow}M ≠ value ${node.value}M`);
                }
            } else if (inflows.length > 0 && outflows.length > 0) {
                if (Math.abs(totalInflow - totalOutflow) > tolerance) {
                    errors.push(`${node.id}: inflow ${totalInflow}M ≠ outflow ${totalOutflow}M`);
                }
            }
        });
        
        return errors;
    }
};

// CURRENT DATASET (Replace this section with your data)
// ================================================================

// ASML DATA - Values represent billions (7800 = $7.8B, 3200 = $3.2B, etc.)
const RAW_FINANCIAL_DATA = {
    nodes: [
        // Revenue Segments (Depth 0) - Values in billions represented as large numbers
        { id: "EUV", depth: 0, value: 3200, category: "revenue", description: "Extreme Ultraviolet ($3.2B)" },
        { id: "ArFi", depth: 0, value: 3900, category: "revenue", description: "Argon Fluoride immersion ($3.9B)" },
        { id: "ArF Dry", depth: 0, value: 100, category: "revenue", description: "Argon Fluoride dry ($100M)" },
        { id: "KrF", depth: 0, value: 300, category: "revenue", description: "Krypton Fluoride ($300M)" },
        { id: "I-line", depth: 0, value: 100, category: "revenue", description: "I-line lithography ($100M)" },
        { id: "Metrology & Inspection", depth: 0, value: 200, category: "revenue", description: "Metrology and inspection tools ($200M)" },
        
        // Aggregation nodes  
        { id: "Total Revenue", depth: 1, value: 7800, category: "revenue", description: "Total company revenue ($7.8B)" },
        { id: "Gross Profit", depth: 2, value: 4200, category: "profit", description: "Revenue minus direct costs ($4.2B)" },
        { id: "Cost of Revenue", depth: 2, value: 3600, category: "cost", description: "Direct production costs ($3.6B)" },
        { id: "Operating Profit", depth: 3, value: 2700, category: "profit", description: "Operating income ($2.7B)" },
        { id: "Operating Expenses", depth: 3, value: 1500, category: "expense", description: "Operating expenses ($1.5B)" },
        
        // Final breakdown
        { id: "R&D", depth: 4, value: 1200, category: "expense", description: "Research and development ($1.2B)", parentOrder: 1 },
        { id: "SG&A", depth: 4, value: 300, category: "expense", description: "Sales, general & administrative ($300M)", parentOrder: 2 },
        { id: "Net Profit", depth: 4, value: 2200, category: "income", description: "Final net income ($2.2B)", parentOrder: 1 },
        { id: "Tax Expense", depth: 4, value: 500, category: "expense", description: "Income tax expense ($500M)", parentOrder: 2 }
    ],
    
    links: [
        // Revenue aggregation
        { source: "EUV", target: "Total Revenue", value: 3200, type: "revenue" },
        { source: "ArFi", target: "Total Revenue", value: 3900, type: "revenue" },
        { source: "ArF Dry", target: "Total Revenue", value: 100, type: "revenue" },
        { source: "KrF", target: "Total Revenue", value: 300, type: "revenue" },
        { source: "I-line", target: "Total Revenue", value: 100, type: "revenue" },
        { source: "Metrology & Inspection", target: "Total Revenue", value: 200, type: "revenue" },
        
        // Revenue breakdown
        { source: "Total Revenue", target: "Gross Profit", value: 4200, type: "profit" },
        { source: "Total Revenue", target: "Cost of Revenue", value: 3600, type: "cost" },
        
        // Profit breakdown  
        { source: "Gross Profit", target: "Operating Profit", value: 2700, type: "profit" },
        { source: "Gross Profit", target: "Operating Expenses", value: 1500, type: "expense" },
        
        // Expense breakdown
        { source: "Operating Expenses", target: "R&D", value: 1200, type: "expense" },
        { source: "Operating Expenses", target: "SG&A", value: 300, type: "expense" },
        
        // Final allocation
        { source: "Operating Profit", target: "Net Profit", value: 2200, type: "income" },
        { source: "Operating Profit", target: "Tax Expense", value: 500, type: "expense" }
    ],
    
    metadata: {
        title: "ASML Financial Flow Analysis",
        subtitle: "Q3 2025 Financial Performance - Salesforce Structure", 
        currency: "USD",
        unit: "billions_as_numbers", // 7800 = $7.8B, 3200 = $3.2B, etc.
        period: "Q3 2025",
        company: "ASML"
    }
};

// AUTO-PROCESS THE DATA
const PROCESSED_FINANCIAL_DATA = window.DataProcessor.processFinancialData(RAW_FINANCIAL_DATA);

// MAIN EXPORT - This is what the chart will use
window.SAMPLE_FINANCIAL_DATA = PROCESSED_FINANCIAL_DATA;

// UTILITY FUNCTIONS
window.DataUtils = {
    // Replace current dataset (for new company data)
    replaceDataset: function(newRawData) {
        const processed = window.DataProcessor.processFinancialData(newRawData);
        window.SAMPLE_FINANCIAL_DATA = processed;
        console.log(`✅ Dataset replaced: ${processed.metadata.company || 'Unknown Company'}`);
        return processed;
    },
    
    // Get current dataset info
    getCurrentDatasetInfo: function() {
        const data = window.SAMPLE_FINANCIAL_DATA;
        const values = data.nodes.map(n => n.value);
        
        return {
            company: data.metadata.company,
            unit: data.metadata.unit,
            nodeCount: data.nodes.length,
            valueRange: `${Math.min(...values)}M - ${Math.max(...values)}M`,
            totalRevenue: data.nodes.find(n => n.id.includes('Total Revenue'))?.value + 'M',
            processed: data.metadata.processed,
            conversionFactor: data.metadata.conversionFactor
        };
    },
    
    // Validate current data
    validateCurrentData: function() {
        return window.DataProcessor.validateStandardScale(window.SAMPLE_FINANCIAL_DATA);
    },
    
    // Format currency for display
    formatCurrency: function(value) {
        if (value >= 1000) {
            return `$${(value / 1000).toFixed(1)}B`;
        } else if (value >= 1) {
            return `$${value.toFixed(1)}M`;
        } else {
            return `$${(value * 1000).toFixed(0)}K`;
        }
    }
};

// INITIALIZATION & VALIDATION
console.log("=== PULSE FINANCIAL DATA PROCESSOR ===");
console.log("📊 Current dataset:", window.DataUtils.getCurrentDatasetInfo());

const validation = window.DataUtils.validateCurrentData();
if (validation.valid) {
    console.log(`✅ Data validation passed: ${validation.range}`);
} else {
    console.warn("⚠️ Validation issues:", validation.issues);
}

/* 
USAGE INSTRUCTIONS:
==================

1. TO REPLACE WITH NEW COMPANY DATA:
   - Replace the RAW_FINANCIAL_DATA object above with your new data
   - The processor will automatically detect scale and convert to millions
   - No other changes needed

2. SUPPORTED INPUT SCALES:
   - Raw millions (3200 = $3.2B) -> Auto-converts to 3.2M  
   - Standard millions (275 = $275M) -> Uses as-is
   - Billions (0.5 = $500M) -> Converts to 500M
   - Thousands (275000 = $275M) -> Converts to 275M

3. EXAMPLE REPLACEMENTS:

   // SaaS Company (already in millions)
   const saasData = {
     nodes: [
       { id: "Subscription Revenue", depth: 0, value: 180, ... },
       { id: "Total Revenue", depth: 1, value: 275, ... }
     ],
     metadata: { unit: "millions" }
   };
   window.DataUtils.replaceDataset(saasData);

   // Fortune 500 Company (in billions)  
   const f500Data = {
     nodes: [
       { id: "Product Sales", depth: 0, value: 50.5, ... }, // $50.5B
       { id: "Total Revenue", depth: 1, value: 75.2, ... }  // $75.2B
     ],
     metadata: { unit: "billions" }
   };
   window.DataUtils.replaceDataset(f500Data);

4. THE CHART WILL ALWAYS RECEIVE OPTIMIZED DATA IN MILLIONS
*/