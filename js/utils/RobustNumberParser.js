/**
 * Robust Number Parser - Centralized IIFE Solution
 * 
 * This IIFE provides a single, robust number parsing method that handles:
 * - Comma thousands separators ("57,405" → 57405)
 * - Currency symbols removal
 * - Parentheses as negative numbers
 * - European number formats
 * - Returns whole numbers (no decimals for display)
 * 
 * All spreadsheet editors and number parsing should use this centralized method.
 */
(function() {
    'use strict';

    /**
     * Robust number parser that preserves comma-separated values
     * @param {string|number} value - The value to parse
     * @returns {number} - Parsed number (whole numbers only)
     */
    function robustParseNumber(value) {
        console.log('🔢 🚨 ROBUST PARSER: robustParseNumber called with:', JSON.stringify(value), 'type:', typeof value);
        
        if (value === null || value === undefined || value === '') {
            console.log('🔢 robustParseNumber: empty value, returning 0');
            return 0;
        }
        
        // If already a number, return it as whole number
        if (typeof value === 'number') {
            const result = Math.floor(value);
            console.log('🔢 robustParseNumber: already number, floored to:', result);
            return result;
        }
        
        let cleanValue = String(value).trim();
        console.log('🔢 robustParseNumber: initial cleanValue:', JSON.stringify(cleanValue));
        
        // Remove currency symbols - comprehensive list
        const beforeCurrency = cleanValue;
        cleanValue = cleanValue.replace(/[$€£¥₹₽₿₩₽₴₸₺₼₾₨₦₡₱₪₡]/g, '');
        if (beforeCurrency !== cleanValue) {
            console.log('🔢 robustParseNumber: removed currency symbols:', JSON.stringify(beforeCurrency), '->', JSON.stringify(cleanValue));
        }
        
        // Handle percentage
        if (cleanValue.endsWith('%')) {
            cleanValue = cleanValue.slice(0, -1);
            const num = parseFloat(cleanValue);
            const result = isNaN(num) ? 0 : Math.floor(num / 100);
            console.log('🔢 robustParseNumber: percentage value:', JSON.stringify(cleanValue), 'result:', result);
            return result;
        }
        
        // Handle parentheses as negative
        if (cleanValue.startsWith('(') && cleanValue.endsWith(')')) {
            cleanValue = '-' + cleanValue.slice(1, -1);
            console.log('🔢 robustParseNumber: converted parentheses to negative:', JSON.stringify(cleanValue));
        }
        
        // Handle thousands separators - FIXED LOGIC
        if (cleanValue.includes(',')) {
            console.log('🔢 🚨 ROBUST PARSER: contains comma, original:', JSON.stringify(cleanValue));
            
            // Enhanced regex patterns for comma handling
            const standardThousandsRegex = /^-?\d{1,3}(,\d{3})*(\.\d+)?$/;
            const flexibleCommaRegex = /^-?\d+(,\d+)+(\.\d+)?$/; // At least one comma group
            const anyCommaWithDigitsRegex = /^-?\d+([,\d]*\d)?(\.\d+)?$/; // Any comma pattern ending with digit
            
            console.log('🔢 🚨 ROBUST PARSER: testing regex patterns against:', JSON.stringify(cleanValue));
            
            const standardMatch = standardThousandsRegex.test(cleanValue);
            const flexibleMatch = flexibleCommaRegex.test(cleanValue);
            const anyCommaMatch = anyCommaWithDigitsRegex.test(cleanValue);
            
            console.log('🔢 🚨 ROBUST PARSER: standardMatch:', standardMatch, 'flexibleMatch:', flexibleMatch, 'anyCommaMatch:', anyCommaMatch);
            
            // If any comma pattern matches, remove commas
            if (standardMatch || flexibleMatch || anyCommaMatch) {
                const before = cleanValue;
                cleanValue = cleanValue.replace(/,/g, '');
                console.log('🔢 🚨 ROBUST PARSER: removed thousands separators:', JSON.stringify(before), '->', JSON.stringify(cleanValue));
            }
            // European style handling (1.234.567,50)
            else {
                const europeanRegex = /^-?\d{1,3}(\.\d{3})*(,\d+)?$/;
                console.log('🔢 robustParseNumber: testing European format regex against:', JSON.stringify(cleanValue));
                
                if (europeanRegex.test(cleanValue)) {
                    const before = cleanValue;
                    cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
                    console.log('🔢 robustParseNumber: converted European format:', JSON.stringify(before), '->', JSON.stringify(cleanValue));
                } else {
                    // Fallback: remove all commas anyway
                    console.log('🔢 robustParseNumber: comma found but no pattern matched - fallback comma removal');
                    const before = cleanValue;
                    cleanValue = cleanValue.replace(/,/g, '');
                    console.log('🔢 robustParseNumber: fallback comma removal:', JSON.stringify(before), '->', JSON.stringify(cleanValue));
                }
            }
        }
        
        // Parse the cleaned value
        console.log('🔢 🚨 ROBUST PARSER: about to parse final value:', JSON.stringify(cleanValue));
        const num = parseFloat(cleanValue);
        console.log('🔢 🚨 ROBUST PARSER: parseFloat result:', num, 'isNaN:', isNaN(num), 'type:', typeof num);
        
        if (isNaN(num)) {
            console.log('🔢 robustParseNumber: NaN detected, returning 0');
            return 0;
        }
        
        // Return whole number (floor decimals for consistent behavior)
        const result = Math.floor(num);
        console.log('🔢 🚨 ROBUST PARSER: final result:', result, 'original input was:', JSON.stringify(value));
        return result;
    }

    /**
     * Alternative parsing for cases where floating point precision is needed
     * @param {string|number} value - The value to parse
     * @returns {number} - Parsed number (preserves decimals)
     */
    function robustParseFloat(value) {
        const parsed = robustParseNumber(value);
        // For floating point version, don't floor the result
        if (value === null || value === undefined || value === '') {
            return 0;
        }
        
        let cleanValue = String(value).trim();
        cleanValue = cleanValue.replace(/[$€£¥₹₽₿₩₽₴₸₺₼₾₨₦₡₱₪₡]/g, '');
        
        if (cleanValue.endsWith('%')) {
            cleanValue = cleanValue.slice(0, -1);
            const num = parseFloat(cleanValue);
            return isNaN(num) ? 0 : num / 100;
        }
        
        if (cleanValue.startsWith('(') && cleanValue.endsWith(')')) {
            cleanValue = '-' + cleanValue.slice(1, -1);
        }
        
        if (cleanValue.includes(',')) {
            // Same comma handling logic but preserve decimals
            const standardThousandsRegex = /^-?\d{1,3}(,\d{3})*(\.\d+)?$/;
            const flexibleCommaRegex = /^-?\d+(,\d+)+(\.\d+)?$/;
            const anyCommaWithDigitsRegex = /^-?\d+([,\d]*\d)?(\.\d+)?$/;
            
            if (standardThousandsRegex.test(cleanValue) || flexibleCommaRegex.test(cleanValue) || anyCommaWithDigitsRegex.test(cleanValue)) {
                cleanValue = cleanValue.replace(/,/g, '');
            } else {
                const europeanRegex = /^-?\d{1,3}(\.\d{3})*(,\d+)?$/;
                if (europeanRegex.test(cleanValue)) {
                    cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
                } else {
                    cleanValue = cleanValue.replace(/,/g, '');
                }
            }
        }
        
        const num = parseFloat(cleanValue);
        return isNaN(num) ? 0 : num;
    }

    /**
     * Replace all instances of parseInt in the global scope
     * @param {string|number} value - The value to parse
     * @param {number} radix - Number base (optional, defaults to 10)
     * @returns {number} - Parsed integer
     */
    function robustParseInt(value, radix = 10) {
        // For integers, use the robust parser and then ensure it's an integer
        const parsed = robustParseNumber(value);
        return Math.floor(parsed);
    }

    /**
     * Test the parser with known problematic cases
     */
    function testRobustParser() {
        const testCases = [
            { input: '57,405', expected: 57405 },
            { input: '1,234,567', expected: 1234567 },
            { input: '57405', expected: 57405 },
            { input: '$1,500', expected: 1500 },
            { input: '(2,000)', expected: -2000 },
            { input: '50%', expected: 0 }, // 50% becomes 0.5, floored to 0
            { input: '1.234.567,89', expected: 1234567 }, // European style
            { input: '', expected: 0 },
            { input: null, expected: 0 },
            { input: 'abc', expected: 0 }
        ];

        console.log('🧪 Testing Robust Number Parser...');
        let passed = 0;
        let total = testCases.length;

        testCases.forEach(({ input, expected }, index) => {
            const result = robustParseNumber(input);
            const success = result === expected;
            console.log(`Test ${index + 1}: ${success ? '✅' : '❌'} Input: ${JSON.stringify(input)} → Expected: ${expected}, Got: ${result}`);
            if (success) passed++;
        });

        console.log(`🧪 Test Results: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`);
        return { passed, total };
    }

    // Export to window for global access
    window.RobustNumberParser = {
        parseNumber: robustParseNumber,
        parseFloat: robustParseFloat,
        parseInt: robustParseInt,
        test: testRobustParser
    };

    // Also provide as global shortcuts to replace standard parsing
    window.robustParseNumber = robustParseNumber;
    window.robustParseFloat = robustParseFloat;
    window.robustParseInt = robustParseInt;

    console.log('✅ RobustNumberParser IIFE loaded successfully');
    console.log('🔧 Available methods: parseNumber, parseFloat, parseInt, test');
    console.log('🔧 Global shortcuts: robustParseNumber, robustParseFloat, robustParseInt');

    // Run initial test
    testRobustParser();

})();