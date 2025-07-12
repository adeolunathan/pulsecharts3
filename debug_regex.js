// Debug the regex patterns to understand the issue

const testValue = "57,405";

// These are the regex patterns from the parseNumber function
const standardThousandsRegex = /^-?\d{1,3}(,\d{3})*(\.\d+)?$/;
const flexibleCommaRegex = /^-?\d+(,\d+)*(\.\d+)?$/;

console.log('Testing value:', testValue);
console.log('Standard regex test:', standardThousandsRegex.test(testValue));
console.log('Flexible regex test:', flexibleCommaRegex.test(testValue));

// Let's break down what each regex does:
console.log('\nStandard regex breakdown:');
console.log('Pattern: /^-?\\d{1,3}(,\\d{3})*(\\.\\d+)?$/');
console.log('- Starts with optional minus');
console.log('- 1-3 digits');
console.log('- Followed by groups of comma + exactly 3 digits');
console.log('- Optional decimal part');

console.log('\nFlexible regex breakdown:');
console.log('Pattern: /^-?\\d+(,\\d+)*(\\.\\d+)?$/');
console.log('- Starts with optional minus');
console.log('- One or more digits');
console.log('- Followed by groups of comma + one or more digits');
console.log('- Optional decimal part');

// Test different cases
const testCases = [
    "57,405",    // Should match flexible (57 + ,405)
    "1,234",     // Should match both
    "12,34",     // Should match flexible only (12 + ,34)
    "1,234,567", // Should match both
    "12,345,678" // Should match both
];

testCases.forEach(test => {
    console.log(`\nTesting: "${test}"`);
    console.log(`Standard: ${standardThousandsRegex.test(test)}`);
    console.log(`Flexible: ${flexibleCommaRegex.test(test)}`);
});

// The issue is that the flexible regex treats "57,405" as:
// - "57" (one or more digits)
// - ",405" (comma + one or more digits)
// 
// This is not a thousands separator format!
// The function should be more strict about thousands separators.

// Let's check what parseFloat does with the problematic value
console.log('\nparseFloat tests:');
console.log('parseFloat("57,405"):', parseFloat("57,405"));
console.log('parseFloat("57405"):', parseFloat("57405"));

// The issue is that parseFloat("57,405") returns 57 because it stops at the comma!