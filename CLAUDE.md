# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

Since this is a client-side JavaScript application without a package.json, no build commands are required. The application runs directly in the browser.

**Running the Application:**
- Open `chart.html` in a web browser to access the main charting interface
- Open `guided.html` for the guided setup flow
- For local development, serve files using a local HTTP server (e.g., `python -m http.server 8000`)

**Testing:**
- Open `smoke-tests.html` in browser for interactive test suite
- Open `robust-smoke-test.html` for simplified test validation
- Run `console-smoke-tests.js` in browser developer console
- No automated testing framework is configured

## Architecture Overview

**PulseCharts** is a web-based data visualization platform built with D3.js that specializes in financial data charts, particularly Sankey flow diagrams and bar charts.

### Core Architecture Patterns

**1. Chart Registry System**
- `PulseApplication` maintains a `chartRegistry` that maps chart types to their implementations
- Each chart type has: `chartClass`, `controlModuleClass`, `name`, and `description`
- Currently supports: Sankey charts (`PulseSankeyChart`) and Bar charts (`PulseBarChart`)

**2. Control Module Architecture**
- Each chart type has a corresponding control module (e.g., `SankeyControlModule`, `BarControlModule`)
- Control modules define capabilities, handle control changes, and manage chart-specific configurations
- `PulseControlPanel` is chart-agnostic and works with any control module

**3. Data Bridge Pattern**
- `PulseDataBridge` enables cross-tab communication and data synchronization
- Charts register with the bridge to receive data updates from other instances
- Prevents infinite loops with source tracking

### Key Components

**Main Application (`js/app.js`)**
- `PulseApplication` class manages the entire application lifecycle
- Handles chart type switching, data loading, and URL parameter processing
- Integrates with Data Bridge for cross-tab communication

**Chart Implementations**
- `PulseSankeyChart` (`js/charts/sankey/SankeyChart.js`) - Financial flow visualization
- `PulseBarChart` (`js/charts/bar/BarChart.js`) - Categorical data visualization
- Each chart follows the same interface: `render()`, `updateConfig()`, `exportTo*()` methods

**Control System**
- `PulseControlPanel` (`js/core/ControlPanel.js`) - Generic control panel renderer
- Control modules define capabilities and handle chart-specific logic
- Dynamic controls can be generated based on chart data (e.g., layer spacing controls)

**Data Management**
- `PulseDataManager` (`js/core/DataManager.js`) - Handles data loading and validation
- `FinancialDataProcessor` (`js/charts/sankey/FinancialDataProcessor.js`) - Converts financial data to Sankey format
- Support for income statements, balance sheets, and custom JSON data

### Utility Modules

The codebase uses a modular utility system:

- **`ChartUtils.js`** - Common chart operations and calculations
- **`ChartExports.js`** - PNG, SVG, and CSV export functionality
- **`ChartZoom.js`** - Pan and zoom capabilities for charts
- **`ChartColorPicker.js`** - Interactive color selection tools
- **`ChartBrandingUtils.js`** - Logo and branding integration
- **`GlobalChartConfig.js`** - Shared configuration constants

### Data Flow Patterns

**1. Chart Type Switching**
```
User selects chart type → PulseApplication.switchChartType() → 
Destroy old chart/controls → Initialize new chart type → 
Apply control defaults → Render with existing data
```

**2. Data Loading**
```
Data source selected → DataManager.loadDataset() → 
Data validation → Chart.render() → 
Dynamic controls initialization → UI update
```

**3. Control Changes**
```
User adjusts control → ControlPanel.handleChange() → 
ControlModule.handleControlChange() → Chart.updateConfig() → 
Immediate re-render (colors, opacity) or debounced update
```

## File Structure Patterns

**Chart Organization**
- Each chart type has its own directory under `js/charts/`
- Chart files follow naming pattern: `[Type]Chart.js`, `[Type]Controls.js`, `[Type]Config.js`
- Data editors are chart-specific: `BarDataEditor.js`

**Sample Data**
- `data/samples/` contains JSON examples for different chart types
- `data/templates/` contains data structure templates
- Financial data supports both income statement and balance sheet formats

## Development Guidelines

**Adding New Chart Types**
1. Create new directory under `js/charts/[charttype]/`
2. Implement chart class extending base chart interface
3. Create corresponding control module with capabilities
4. Register in `PulseApplication.chartRegistry`
5. Add to chart type selector HTML

**Control Module Development**
- Implement `capabilities` object with sections and controls
- Provide `handleControlChange()` method for config updates
- Support `hasDynamicControls()` for data-dependent controls
- Use `getCurrentValue()` for proper control state synchronization

**Color System**
- Charts store custom colors in `this.customColors` object
- Control modules handle color changes via `handleControlChange()`
- Color presets are managed through control module methods
- Support for both individual color controls and preset application

## Important Implementation Notes

**Data Bridge Integration**
- Always register charts with Data Bridge: `dataBridge.setChartInstance(chart)`
- Use source tracking to prevent infinite update loops
- Handle data updates from other tabs via `pulseDataChanged` events

**Dynamic Controls**
- Control modules can implement `hasDynamicControls()` and `initializeDynamicControls()`
- Used for controls that depend on loaded data (e.g., layer spacing for Sankey charts)
- Control panel automatically refreshes when chart data changes

**Export Functionality**
- All charts support PNG, SVG, and CSV export through `ChartExports` utility
- Export methods are: `exportToPNG()`, `exportToSVG()`, `exportDataToCSV()`
- Branding integration available through `ChartBrandingUtils`

**URL Parameter Handling**
- Application supports loading data via URL parameters
- Chart type can be specified with `?type=` parameter
- Custom data can be passed with `?data=` parameter (URL-encoded JSON)

## Using Gemini CLI for Large Codebase Analysis

When analyzing large codebases or multiple files that might exceed context limits, use the Gemini CLI with its massive context window. Use `gemini -p` to leverage Google Gemini's large context capacity.

### File and Directory Inclusion Syntax

Use the `@` syntax to include files and directories in your Gemini prompts. The paths should be relative to WHERE you run the gemini command:

#### Examples:

**Single file analysis:**
```bash
gemini -p "@src/main.py Explain this file's purpose and structure"
```

**Multiple files:**
```bash
gemini -p "@package.json @src/index.js Analyze the dependencies used in the code"
```

**Entire directory:**
```bash
gemini -p "@src/ Summarize the architecture of this codebase"
```

**Multiple directories:**
```bash
gemini -p "@src/ @tests/ Analyze test coverage for the source code"
```

**Current directory and subdirectories:**
```bash
gemini -p "@./ Give me an overview of this entire project"
```

**Or use --all_files flag:**
```bash
gemini --all_files -p "Analyze the project structure and dependencies"
```

### Implementation Verification Examples

**Check if a feature is implemented:**
```bash
gemini -p "@src/ @lib/ Has dark mode been implemented in this codebase? Show me the relevant files and functions"
```

**Verify authentication implementation:**
```bash
gemini -p "@src/ @middleware/ Is JWT authentication implemented? List all auth-related endpoints and middleware"
```

**Check for specific patterns:**
```bash
gemini -p "@src/ Are there any React hooks that handle WebSocket connections? List them with file paths"
```

**Verify error handling:**
```bash
gemini -p "@src/ @api/ Is proper error handling implemented for all API endpoints? Show examples of try-catch blocks"
```

**Check for rate limiting:**
```bash
gemini -p "@backend/ @middleware/ Is rate limiting implemented for the API? Show the implementation details"
```

**Verify caching strategy:**
```bash
gemini -p "@src/ @lib/ @services/ Is Redis caching implemented? List all cache-related functions and their usage"
```

**Check for specific security measures:**
```bash
gemini -p "@src/ @api/ Are SQL injection protections implemented? Show how user inputs are sanitized"
```

**Verify test coverage for features:**
```bash
gemini -p "@src/payment/ @tests/ Is the payment processing module fully tested? List all test cases"
```

### When to Use Gemini CLI

Use `gemini -p` when:
- Analyzing entire codebases or large directories
- Comparing multiple large files
- Need to understand project-wide patterns or architecture
- Current context window is insufficient for the task
- Working with files totaling more than 100KB
- Verifying if specific features, patterns, or security measures are implemented
- Checking for the presence of certain coding patterns across the entire codebase

### Important Notes

- Paths in @ syntax are relative to your current working directory when invoking gemini
- The CLI will include file contents directly in the context
- No need for --yolo flag for read-only analysis
- Gemini's context window can handle entire codebases that would overflow Claude's context
- When checking implementations, be specific about what you're looking for to get accurate results