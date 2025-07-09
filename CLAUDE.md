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

**4. Capabilities-Driven Control System**
- Control modules use a `capabilities` object to define available controls dynamically
- Supports immediate updates (colors, opacity) vs debounced updates (layout changes) 
- Dynamic control generation based on chart data (e.g., Sankey layer spacing, Bar chart series colors)
- Chart-type-aware filtering (Bar chart controls change based on chart subtype)

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
- `PulseDataManager` (`js/core/DataManager.js`) - Handles data loading, validation, and caching
- `FinancialDataProcessor` (`js/charts/sankey/FinancialDataProcessor.js`) - Converts financial data to Sankey format
- Support for income statements, balance sheets, and custom JSON data
- Automatic statement type detection (Income Statement vs Balance Sheet)
- Intelligent data format validation with chart-type-specific rules

### Utility Modules

The codebase uses a modular utility system:

- **`ChartUtils.js`** - Common chart operations and calculations
- **`ChartExports.js`** - PNG, SVG, and CSV export functionality  
- **`ChartZoom.js`** - Pan and zoom capabilities for charts
- **`ChartColorPicker.js`** - Interactive color selection tools
- **`ChartBrandingUtils.js`** - Logo and branding integration
- **`GlobalChartConfig.js`** - Shared configuration constants
- **`ExportUtils.js`** - Comprehensive export system with multi-format support (PNG, SVG, CSV, JSON)
- **`FinancialDataProcessor.js`** - Specialized financial data analysis and transformation

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
- Data editor: `UnifiedSpreadsheetEditor.js` (supports all chart types)

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
- Use immediate vs debounced updates: colors/opacity update immediately, layout changes are debounced

**Color System**
- Charts store custom colors in `this.customColors` object
- Control modules handle color changes via `handleControlChange()`
- Color presets are managed through control module methods
- Support for both individual color controls and preset application
- Hierarchical color management: Global defaults → Chart-specific → User overrides → Dynamic detection

**Chart Implementation Interface**
All charts must implement:
- `render(data)` - Core rendering method
- `updateConfig(newConfig)` - Apply configuration changes
- `exportToPNG()`, `exportToSVG()`, `exportDataToCSV()` - Export methods
- `getInitialConfig()` - Return default configuration
- `applyControlDefaults()` - Apply control module defaults

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

## Data Formats and Processing

**Supported Data Formats:**
- **Sankey Charts**: `{nodes: [...], links: [...]}` or `{flows: [...]}` format
- **Bar Charts**: `{categories: [...], values: [...]}` or array of objects with category/value properties
- **Financial Data**: Income statement and balance sheet formats with automatic conversion

**Data Validation Patterns:**
- Chart-type-specific validation using `DataManager.validateData()`
- Automatic format detection: `isBarChartData = data.categories || data.series || data.values`
- Financial statement type detection: Income Statement vs Balance Sheet

**Data Transformation Pipeline:**
```
Raw Data → Format Detection → Validation → Chart-Specific Processing → Render
```

**Financial Data Processing:**
- Automatic detection of financial statement types
- Revenue hub analysis for Sankey positioning
- Hierarchical color assignment based on financial categories
- Support for both percentage and absolute value representations


## Code Review Guidelines

Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
Add a review section to the [todo.md](http://todo.md/) file with a summary of the changes you made and any other relevant information.

## Security and Vulnerability Checks

Please check through all the code you just wrote and make sure it follows security best practices. make sure there are no sensitive information in the front and and there are no vulnerabilities that can be exploited
