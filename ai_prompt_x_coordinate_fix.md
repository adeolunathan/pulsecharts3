# AI Prompt: Fix X Coordinate Preservation Issue in Sankey Chart

## Problem Statement

I have a JavaScript Sankey chart application where users can drag nodes to custom positions. The chart has a save/load system, but there's a critical issue: **only Y coordinates are preserved when loading saved charts, X coordinates are lost**.

## Current Behavior
- User drags node diagonally (up and forward)
- Save chart works correctly
- Load chart: node appears in correct Y position but wrong X position (horizontal movement lost)

## Root Cause Analysis

Based on debugging logs, the issue is a **sequencing problem**:

1. Chart loads with data → `render()` → `calculateLayout()` runs first
2. `calculateLayout()` tries to preserve positions but X coordinates are `undefined` at this point
3. Later, `restoreCompleteState()` runs but layout calculation already completed with undefined values

**Debug evidence:**
```
🔍 Layout check for NodeName: preserved=true, manuallyPositioned=true, x=undefined
🧮 Calculated X position for NodeName: [calculated_value]
...later...
📍 Restored 15 node positions from saved state
🎯 Pre-marked NodeName as manually positioned for layout respect
```

## Technical Context

**Key Methods:**
- `calculateLayout()` - Calculates node positions, runs during `render()`
- `restoreCompleteState()` - Restores saved positions, runs after `render()`
- `preservedPositions` Map - Stores positions for manual preservation during layout

**The Issue:**
When `calculateLayout()` runs, it creates a `preservedPositions` map from current node positions, but at that point `node.x` values are undefined because the chart just loaded and hasn't been positioned yet.

## Goal

Make X coordinates persist exactly like Y coordinates do. When a user drags a node to position (200, 100) and saves/loads the chart, the node should appear at exactly (200, 100).

## Code Structure

The application has these key files:
- `SankeyChart.js` - Main chart implementation with `calculateLayout()` and `restoreCompleteState()`
- `ChartLibrary.js` - Save/load system that embeds chart state in data metadata

## Request to AI

Please approach this methodically and thoughtfully:

1. **Analyze the sequencing issue**: The core problem is that `calculateLayout()` runs before `restoreCompleteState()`, so saved positions aren't available when layout preservation logic runs.

2. **Consider multiple solution approaches**:
   - Option A: Modify the call sequence so restoration happens before layout calculation
   - Option B: Make `calculateLayout()` aware of pending saved positions
   - Option C: Defer layout calculation until after state restoration
   - Option D: Other creative solutions

3. **Ensure the solution is robust**: The fix should work for both normal operation (dragging nodes) and chart loading scenarios without breaking existing functionality.

4. **Key constraints**:
   - Y coordinate preservation already works correctly
   - Don't break the existing drag-and-drop functionality
   - Maintain compatibility with the existing save/load system
   - The solution should be clean and maintainable

## Current Attempted Fix

I tried making `calculateLayout()` check for saved positions in the state persistence system:

```javascript
// Check if we have saved positions for this node from state restoration
const savedPos = this.statePersistence.nodePositions.get(node.id);
const savedManual = this.statePersistence.manualPositions.get(node.id);

if (savedPos && savedManual) {
    // Use saved positions if available
    preservedPositions.set(node.id, {
        x: savedPos.x,
        y: savedPos.y,
        manuallyPositioned: true
    });
}
```

But this didn't work because the state persistence maps are populated AFTER `calculateLayout()` runs.

## Question for AI

**How would you solve this X coordinate preservation issue?** 

Please think through the problem systematically, consider the timing/sequencing challenges, and propose a solution that ensures saved X coordinates are properly preserved during chart loading while maintaining normal drag-and-drop functionality.

Be specific about:
1. Which methods need to be modified
2. What the new call sequence should be
3. How to handle both loading and normal operation scenarios
4. Any potential side effects to watch out for

Thank you for your thoughtful analysis and solution!