// Let's trace exactly what happens when we process "57,405"

console.log('=== Comprehensive Parse Test ===');

// Test the exact parseNumber function logic step by step
function testParseNumber(value) {
    console.log('\n🔢 parseNumber called with:', JSON.stringify(value), 'type:', typeof value);
    
    if (value === null || value === undefined || value === '') {
        console.log('🔢 parseNumber: empty value, returning 0');
        return 0;
    }
    
    let cleanValue = String(value).trim();
    console.log('🔢 parseNumber: initial cleanValue:', JSON.stringify(cleanValue));
    
    // Remove currency symbols
    const beforeCurrency = cleanValue;
    cleanValue = cleanValue.replace(/[$€£¥₹₽₿₩₽₴₸₺₼₾₨₦₡₱₪₡]/g, '');
    if (beforeCurrency !== cleanValue) {
        console.log('🔢 parseNumber: removed currency symbols:', JSON.stringify(beforeCurrency), '->', JSON.stringify(cleanValue));
    }
    
    // Handle percentage
    if (cleanValue.endsWith('%')) {
        cleanValue = cleanValue.slice(0, -1);
        const num = parseFloat(cleanValue);
        const result = isNaN(num) ? 0 : Math.trunc(num / 100);
        console.log('🔢 parseNumber: percentage value:', JSON.stringify(cleanValue), 'result:', result);
        return result;
    }
    
    // Handle parentheses as negative
    if (cleanValue.startsWith('(') && cleanValue.endsWith(')')) {
        cleanValue = '-' + cleanValue.slice(1, -1);
        console.log('🔢 parseNumber: converted parentheses to negative:', JSON.stringify(cleanValue));
    }
    
    // Handle thousands separators - be more careful
    if (cleanValue.includes(',')) {
        console.log('🔢 parseNumber: contains comma, original:', JSON.stringify(cleanValue));
        
        // Handle thousands separators with flexibility
        // Standard format: 1,234,567 (1-3 digits, then groups of 3)
        // Also support: 57,405 (any digits before comma, then any digits after)
        const standardThousandsRegex = /^-?\d{1,3}(,\d{3})*(\.\d+)?$/;
        const flexibleCommaRegex = /^-?\d+(,\d+)*(\.\d+)?$/;
        console.log('🔢 parseNumber: testing thousands separator regex against:', JSON.stringify(cleanValue));
        const standardMatch = standardThousandsRegex.test(cleanValue);
        const flexibleMatch = flexibleCommaRegex.test(cleanValue);
        console.log('🔢 parseNumber: standard regex test result:', standardMatch);
        console.log('🔢 parseNumber: flexible regex test result:', flexibleMatch);
        
        if (standardMatch || flexibleMatch) {
            const before = cleanValue;
            cleanValue = cleanValue.replace(/,/g, '');
            console.log('🔢 parseNumber: removed thousands separators:', JSON.stringify(before), '->', JSON.stringify(cleanValue));
        }
        // European style (1.234.567,50) - but only if we detect this pattern
        else {
            const europeanRegex = /^-?\d{1,3}(\.\d{3})*(,\d+)?$/;
            console.log('🔢 parseNumber: testing European format regex against:', JSON.stringify(cleanValue));
            console.log('🔢 parseNumber: European regex test result:', europeanRegex.test(cleanValue));
            
            if (europeanRegex.test(cleanValue)) {
                const before = cleanValue;
                cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
                console.log('🔢 parseNumber: converted European format:', JSON.stringify(before), '->', JSON.stringify(cleanValue));
            } else {
                console.log('🔢 parseNumber: comma found but no pattern matched - might be a different format');
                // Try removing commas anyway as a fallback
                const before = cleanValue;
                cleanValue = cleanValue.replace(/,/g, '');
                console.log('🔢 parseNumber: fallback comma removal:', JSON.stringify(before), '->', JSON.stringify(cleanValue));
            }
        }
    }
    
    // Parse the cleaned value
    console.log('🔢 parseNumber: about to parse:', JSON.stringify(cleanValue));
    const num = parseFloat(cleanValue);
    console.log('🔢 parseNumber: parseFloat result:', num, 'isNaN:', isNaN(num));
    
    if (isNaN(num)) {
        console.log('🔢 parseNumber: NaN detected, returning 0');
        return 0;
    }
    
    // Return whole number (truncate decimals completely)
    const result = Math.trunc(num);
    console.log('🔢 parseNumber: final result:', result);
    return result;
}

// Test the problematic value
const result = testParseNumber("57,405");
console.log('\n=== FINAL RESULT ===');
console.log('Input: "57,405"');
console.log('Output:', result);
console.log('Expected: 57405');
console.log('Match?', result === 57405);

// Let's also test what happens if parseFloat is called directly (this would be the bug)
console.log('\n=== DIRECT parseFloat TEST ===');
console.log('parseFloat("57,405"):', parseFloat("57,405"));
console.log('This should explain the 57 vs 57405 issue!');