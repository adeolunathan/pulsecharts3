/* ===== UNIVERSAL CHART LIBRARY ===== */
/* Save and load functionality for all chart types */

class ChartLibrary {
    constructor() {
        this.storageKey = 'pulsecharts_saved_charts';
        this.savedCharts = this.loadSavedCharts();
        this.isLibraryOpen = false;
        
        // Track current chart for Quick Save functionality
        this.currentChartId = null;
        this.hasUnsavedChanges = false;
        
        
        this.init();
    }

    init() {
        this.createSaveModal();
        this.createLibrarySidebar();
        this.addSaveButton();
        this.setupEventListeners();
        // Dual save functionality initialized
    }

    // Save functionality (Save As - creates new chart)
    saveChart(name, data, config, chartType) {
        // Check storage space before creating chart
        this.checkStorageSpace();
        
        const chart = {
            id: this.generateId(),
            name: name.trim() || 'Untitled Chart',
            data: JSON.parse(JSON.stringify(data)), // Deep clone
            config: JSON.parse(JSON.stringify(config)), // Deep clone
            chartType: chartType,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Capture latest state before saving
        if (window.pulseApp.chart && window.pulseApp.chart.captureCompleteState) {
            window.pulseApp.chart.captureCompleteState();
        }
        
        // Include chart state (colors, categories, positions) if available
        // Enhanced to use BaseChart unified interface
        if (window.pulseApp.chart) {
            if (window.pulseApp.chart.getStateData) {
                // Use BaseChart unified interface
                chart.config.chartState = window.pulseApp.chart.getStateData();
            } else if (window.pulseApp.chart.statePersistence) {
                // Fallback to direct state persistence access for compatibility
                const state = window.pulseApp.chart.statePersistence;
                chart.config.chartState = {
                    linkCustomColors: Object.fromEntries(state.linkCustomColors || new Map()),
                    nodeCustomColors: Object.fromEntries(state.nodeCustomColors || new Map()),
                    categoryAssignments: Object.fromEntries(state.categoryAssignments || new Map()),
                    categoryColors: Object.fromEntries(state.categoryColors || new Map()),
                    nodePositions: Object.fromEntries(state.nodePositions || new Map()),
                    manualPositions: Object.fromEntries(state.manualPositions || new Map()),
                    independentNodeColors: { ...window.pulseApp.chart.independentNodeColors } || {}
                };
            }
        }

        this.savedCharts.push(chart);
        this.saveSavedCharts();
        this.refreshLibraryUI();
        
        // Set as current chart after saving
        this.currentChartId = chart.id;
        this.hasUnsavedChanges = false;
        
        console.log(`💾 Chart "${chart.name}" saved successfully`);
        return chart;
    }

    // Quick Save functionality - saves to existing chart without prompts
    quickSaveChart() {
        const currentChart = this.getCurrentChartData();
        if (!currentChart) {
            this.showNotification('No chart data available to save', 'error');
            return false;
        }


        if (!this.currentChartId) {
            // No current chart - try to find most recently used chart of same type
            const recentChart = this.findMostRecentChartOfType(currentChart.chartType);
            if (recentChart && this.confirmQuickSaveToRecentChart(recentChart)) {
                this.currentChartId = recentChart.id;
            } else {
                // No suitable chart found or user declined - open Save As modal
                this.openSaveModal();
                return false;
            }
        }

        // Find existing chart and update it
        const existingChart = this.savedCharts.find(c => c.id === this.currentChartId);
        if (!existingChart) {
            // Current chart ID not found - treat as Save As
            this.openSaveModal();
            return false;
        }

        // Update existing chart
        existingChart.data = JSON.parse(JSON.stringify(currentChart.data));
        existingChart.config = JSON.parse(JSON.stringify(currentChart.config));
        existingChart.updatedAt = new Date().toISOString();
        
        // Capture current chart state (colors, categories, positions) if available
        // Enhanced to use BaseChart unified interface
        if (window.pulseApp.chart) {
            if (window.pulseApp.chart.getStateData) {
                // Use BaseChart unified interface
                existingChart.config.chartState = window.pulseApp.chart.getStateData();
            } else if (window.pulseApp.chart.statePersistence) {
                // Fallback to direct state persistence access for compatibility
                // Force capture current state
                if (window.pulseApp.chart.captureCompleteState) {
                    window.pulseApp.chart.captureCompleteState();
                }
                
                // Save the chart state to the config
                const state = window.pulseApp.chart.statePersistence;
                existingChart.config.chartState = {
                    linkCustomColors: Object.fromEntries(state.linkCustomColors || new Map()),
                    nodeCustomColors: Object.fromEntries(state.nodeCustomColors || new Map()),
                    categoryAssignments: Object.fromEntries(state.categoryAssignments || new Map()),
                    categoryColors: Object.fromEntries(state.categoryColors || new Map()),
                    nodePositions: Object.fromEntries(state.nodePositions || new Map()),
                    manualPositions: Object.fromEntries(state.manualPositions || new Map()),
                    independentNodeColors: { ...window.pulseApp.chart.independentNodeColors } || {}
                };
            }
        }

        this.saveSavedCharts();
        this.refreshLibraryUI();
        this.hasUnsavedChanges = false;
        
        console.log(`💾 Quick saved chart "${existingChart.name}"`);
        this.showQuickSaveFeedback();
        return true;
    }

    // Load functionality
    loadChart(chartId) {
        const chart = this.savedCharts.find(c => c.id === chartId);
        if (!chart) {
            console.error('❌ Chart not found:', chartId);
            return null;
        }

        console.log(`📖 Loading chart "${chart.name}"`);
        
        // Set as current chart for Quick Save
        this.currentChartId = chartId;
        this.hasUnsavedChanges = false;
        
        // Update chart in the application
        if (window.pulseApp) {
            // Switch to correct chart type if needed
            if (window.pulseApp.currentChartType !== chart.chartType) {
                console.log(`🔄 Switching from ${window.pulseApp.currentChartType} to ${chart.chartType}`);
                window.pulseApp.switchChartType(chart.chartType);
            }

            // Wait for chart type switch to complete, then load data
            setTimeout(() => {
                // Embed chart state in data metadata before loading
                if (chart.config && chart.config.chartState) {
                    if (!chart.data.metadata) {
                        chart.data.metadata = {};
                    }
                    chart.data.metadata.chartState = chart.config.chartState;
                    console.log('📦 Embedded chart state in data metadata for restoration');
                }
                
                // CRITICAL: Pre-populate state BEFORE data loading to fix X coordinate timing
                // Enhanced to use BaseChart unified interface
                if (window.pulseApp.chart && chart.config && chart.config.chartState) {
                    if (window.pulseApp.chart.setStateData) {
                        // Use BaseChart unified interface
                        window.pulseApp.chart.setStateData(chart.config.chartState);
                        console.log(`🔧 Pre-loaded state using BaseChart unified interface`);
                    } else if (window.pulseApp.chart.statePersistence) {
                        // Fallback to direct state persistence access for compatibility
                        const stateData = chart.config.chartState;
                        
                        // Pre-populate the statePersistence maps before render
                        if (stateData.nodePositions) {
                            window.pulseApp.chart.statePersistence.nodePositions = new Map(Object.entries(stateData.nodePositions));
                            console.log(`🔧 Pre-loaded ${window.pulseApp.chart.statePersistence.nodePositions.size} node positions BEFORE render`);
                        }
                        
                        if (stateData.manualPositions) {
                            window.pulseApp.chart.statePersistence.manualPositions = new Map(Object.entries(stateData.manualPositions));
                            console.log(`🔧 Pre-loaded ${window.pulseApp.chart.statePersistence.manualPositions.size} manual position flags BEFORE render`);
                        }
                        
                        // Pre-load independent colors BEFORE render
                        if (stateData.independentNodeColors) {
                            window.pulseApp.chart.independentNodeColors = { ...stateData.independentNodeColors };
                            console.log(`🎨 Pre-loaded independent colors for ${Object.keys(stateData.independentNodeColors).length} nodes BEFORE render`);
                        }
                    }
                }
                
                // Load the chart data (with embedded state) - now state is available during render
                window.pulseApp.updateData(chart.data, 'chart-library');
                
                // Apply configuration if chart supports it
                if (window.pulseApp.chart && window.pulseApp.chart.updateConfig) {
                    window.pulseApp.chart.updateConfig(chart.config);
                }
                
                // Trigger complete state restoration after data loading for colors and categories
                // Enhanced to use BaseChart unified interface
                if (window.pulseApp.chart && chart.config && chart.config.chartState) {
                    if (window.pulseApp.chart.restoreCompleteState) {
                        console.log('🔄 Triggering complete state restoration for colors and categories');
                        window.pulseApp.chart.restoreCompleteState();
                    }
                }

                // Update spreadsheet editor with the loaded data
                setTimeout(() => {
                    this.updateSpreadsheetWithData(chart.data, chart.chartType);
                }, 200);

                console.log(`✅ Chart "${chart.name}" loaded successfully`);
                
                // Close library sidebar
                this.closeLibrary();
                
                // Show success message
                this.showNotification(`Chart "${chart.name}" loaded successfully`, 'success');
            }, 100);
        } else {
            console.error('❌ PulseApp not available for loading chart');
        }

        return chart;
    }

    // Delete functionality
    deleteChart(chartId) {
        const chartIndex = this.savedCharts.findIndex(c => c.id === chartId);
        if (chartIndex === -1) {
            console.error('❌ Chart not found for deletion:', chartId);
            return false;
        }

        const chart = this.savedCharts[chartIndex];
        
        if (confirm(`Are you sure you want to delete "${chart.name}"?`)) {
            this.savedCharts.splice(chartIndex, 1);
            this.saveSavedCharts();
            this.refreshLibraryUI();
            
            console.log(`🗑️ Chart "${chart.name}" deleted successfully`);
            this.showNotification(`Chart "${chart.name}" deleted`, 'info');
            return true;
        }
        
        return false;
    }

    // Get current chart data and config for saving
    getCurrentChartData() {
        if (!window.pulseApp) {
            console.error('❌ PulseApp not available');
            return null;
        }

        const data = window.pulseApp.currentData;
        const chartType = window.pulseApp.currentChartType;
        
        // Get configuration from the current chart
        let config = {};
        if (window.pulseApp.chart) {
            // Try to get current configuration
            if (window.pulseApp.chart.getConfig) {
                config = window.pulseApp.chart.getConfig();
            } else if (window.pulseApp.chart.config) {
                config = window.pulseApp.chart.config;
            }
            
            // Include control panel configuration if available
            if (window.pulseApp.controlModule && window.pulseApp.controlModule.getCurrentConfig) {
                config.controls = window.pulseApp.controlModule.getCurrentConfig();
            }
        }

        return {
            data: data,
            config: config,
            chartType: chartType
        };
    }

    // Create save modal
    createSaveModal() {
        const modal = document.createElement('div');
        modal.id = 'chart-save-modal';
        modal.className = 'chart-library-modal';
        modal.style.display = 'none';
        
        modal.innerHTML = `
            <div class="modal-overlay" id="save-modal-overlay"></div>
            <div class="modern-save-modal">
                <div class="save-modal-header">
                    <h2>Save Chart</h2>
                </div>
                
                <div class="save-modal-body">
                    <div class="input-group">
                        <label for="chart-name-input">Chart Name</label>
                        <input 
                            type="text" 
                            id="chart-name-input" 
                            class="modern-input"
                            placeholder="Enter chart name..."
                            maxlength="80"
                            autocomplete="off"
                        >
                    </div>
                </div>
                
                <div class="save-modal-footer">
                    <button class="btn btn-ghost" id="save-cancel-btn">Cancel</button>
                    <button class="btn btn-primary" id="save-confirm-btn">Save Chart</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add styles and interactivity
        this.inlineAddSaveModalStyles();
        this.inlineAddSaveModalInteractivity();
    }

    // Inline version of addSaveModalStyles to avoid method resolution issues
    inlineAddSaveModalStyles() {
        const existingStyle = document.getElementById('modern-save-modal-styles');
        if (existingStyle) {
            existingStyle.remove();
        }

        const style = document.createElement('style');
        style.id = 'modern-save-modal-styles';
        style.textContent = `
            .modern-save-modal {
                position: relative;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
                width: 100%;
                max-width: 300px;
                max-height: 90vh;
                overflow: hidden;
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                animation: modalSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: scale(0.9) translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            .save-modal-header {
                padding: 16px 20px 12px;
                border-bottom: 1px solid rgba(226, 232, 240, 0.6);
                text-align: center;
            }


            .save-modal-header h2 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: #1e293b;
                line-height: 1.2;
            }

            .save-modal-header p {
                margin: 4px 0 0;
                font-size: 15px;
                color: #64748b;
                font-weight: 500;
            }


            .save-modal-body {
                padding: 16px 20px;
            }


            .form-section {
                margin-top: 8px;
            }

            .input-group {
                margin-bottom: 0;
            }

            .input-label {
                font-size: 13px;
                font-weight: 500;
                color: #374151;
                margin-bottom: 6px;
                display: block;
            }

            .modern-input {
                width: 100%;
                padding: 10px 12px;
                font-size: 14px;
                color: #1e293b;
                background: #ffffff;
                border: 1px solid rgba(226, 232, 240, 0.8);
                border-radius: 6px;
                outline: none;
                transition: all 0.2s ease;
                box-sizing: border-box;
            }

            .modern-input:focus {
                border-color: #667eea;
                box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
                background: rgba(255, 255, 255, 0.95);
            }

            .modern-input::placeholder {
                color: #94a3b8;
                font-weight: 400;
            }

            .char-counter {
                font-size: 12px;
                color: #64748b;
                font-weight: 500;
                margin-top: 8px;
            }


            .save-modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                padding: 12px 20px 16px;
                border-top: 1px solid rgba(226, 232, 240, 0.6);
            }

            .btn {
                padding: 8px 16px;
                font-size: 13px;
                font-weight: 500;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                border: none;
                outline: none;
            }

            .btn-ghost {
                background: rgba(148, 163, 184, 0.1);
                color: #64748b;
                border: 1px solid rgba(148, 163, 184, 0.2);
            }

            .btn-ghost:hover {
                background: rgba(148, 163, 184, 0.15);
                color: #475569;
                transform: translateY(-1px);
            }

            .btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }

            .btn-primary:hover {
                box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
                transform: translateY(-2px);
            }

            .btn-primary:active {
                transform: translateY(0);
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
            }

            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .modern-save-modal {
                    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
                    border-color: rgba(71, 85, 105, 0.3);
                }

                .save-modal-header {
                    border-color: rgba(71, 85, 105, 0.3);
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
                }

                .save-modal-header h2 {
                    color: #f1f5f9;
                }


                .modern-input {
                    background: rgba(30, 41, 59, 0.6);
                    border-color: rgba(71, 85, 105, 0.4);
                    color: #f1f5f9;
                }

            }

            /* Responsive design */
            @media (max-width: 640px) {
                .modern-save-modal {
                    max-width: 95vw;
                    border-radius: 20px;
                }

                .save-modal-header,
                .save-modal-body,
                .save-modal-footer {
                    padding-left: 20px;
                    padding-right: 20px;
                }


                .save-modal-footer {
                    flex-direction: column-reverse;
                }

                .btn {
                    width: 100%;
                    justify-content: center;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Inline version of addSaveModalInteractivity to avoid method resolution issues
    inlineAddSaveModalInteractivity() {
        // Character counter
        const nameInput = document.getElementById('chart-name-input');
        const charCount = document.getElementById('char-count');
        
        if (nameInput && charCount) {
            nameInput.addEventListener('input', (e) => {
                const count = e.target.value.length;
                charCount.textContent = count;
                
                // Visual feedback for character limit
                if (count > 80) {
                    charCount.style.color = '#ef4444';
                } else if (count > 60) {
                    charCount.style.color = '#f59e0b';
                } else {
                    charCount.style.color = '#64748b';
                }
            });
        }

        // Auto-focus on input when modal opens
        nameInput?.focus();
    }

    // Add modern styles for the save modal
    addSaveModalStyles() {
        const existingStyle = document.getElementById('modern-save-modal-styles');
        if (existingStyle) {
            existingStyle.remove();
        }

        const style = document.createElement('style');
        style.id = 'modern-save-modal-styles';
        style.textContent = `
            .modern-save-modal {
                position: relative;
                background: #ffffff;
                border-radius: 12px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
                width: 100%;
                max-width: 300px;
                max-height: 90vh;
                overflow: hidden;
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.2);
                animation: modalSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            }

            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: scale(0.9) translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }

            .save-modal-header {
                padding: 16px 20px 12px;
                border-bottom: 1px solid rgba(226, 232, 240, 0.6);
                text-align: center;
            }


            .save-modal-header h2 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: #1e293b;
                line-height: 1.2;
            }

            .save-modal-header p {
                margin: 4px 0 0;
                font-size: 15px;
                color: #64748b;
                font-weight: 500;
            }


            .save-modal-body {
                padding: 16px 20px;
            }


            .form-section {
                margin-top: 8px;
            }

            .input-group {
                margin-bottom: 0;
            }

            .input-label {
                font-size: 13px;
                font-weight: 500;
                color: #374151;
                margin-bottom: 6px;
                display: block;
            }

            .modern-input {
                width: 100%;
                padding: 10px 12px;
                font-size: 14px;
                color: #1e293b;
                background: #ffffff;
                border: 1px solid rgba(226, 232, 240, 0.8);
                border-radius: 6px;
                outline: none;
                transition: all 0.2s ease;
                box-sizing: border-box;
            }

            .modern-input:focus {
                border-color: #667eea;
                box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
                background: rgba(255, 255, 255, 0.95);
            }

            .modern-input::placeholder {
                color: #94a3b8;
                font-weight: 400;
            }

            .char-counter {
                font-size: 12px;
                color: #64748b;
                font-weight: 500;
                margin-top: 8px;
            }


            .save-modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                padding: 12px 20px 16px;
                border-top: 1px solid rgba(226, 232, 240, 0.6);
            }

            .btn {
                padding: 8px 16px;
                font-size: 13px;
                font-weight: 500;
                border-radius: 6px;
                cursor: pointer;
                transition: all 0.2s ease;
                border: none;
                outline: none;
            }

            .btn-ghost {
                background: rgba(148, 163, 184, 0.1);
                color: #64748b;
                border: 1px solid rgba(148, 163, 184, 0.2);
            }

            .btn-ghost:hover {
                background: rgba(148, 163, 184, 0.15);
                color: #475569;
                transform: translateY(-1px);
            }

            .btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }

            .btn-primary:hover {
                box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
                transform: translateY(-2px);
            }

            .btn-primary:active {
                transform: translateY(0);
                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
            }

            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                .modern-save-modal {
                    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
                    border-color: rgba(71, 85, 105, 0.3);
                }

                .save-modal-header {
                    border-color: rgba(71, 85, 105, 0.3);
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
                }

                .save-modal-header h2 {
                    color: #f1f5f9;
                }


                .modern-input {
                    background: rgba(30, 41, 59, 0.6);
                    border-color: rgba(71, 85, 105, 0.4);
                    color: #f1f5f9;
                }

            }

            /* Responsive design */
            @media (max-width: 640px) {
                .modern-save-modal {
                    max-width: 95vw;
                    border-radius: 20px;
                }

                .save-modal-header,
                .save-modal-body,
                .save-modal-footer {
                    padding-left: 20px;
                    padding-right: 20px;
                }


                .save-modal-footer {
                    flex-direction: column-reverse;
                }

                .btn {
                    width: 100%;
                    justify-content: center;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Add interactivity to the save modal
    addSaveModalInteractivity() {
        // Character counter
        const nameInput = document.getElementById('chart-name-input');
        const charCount = document.getElementById('char-count');
        
        if (nameInput && charCount) {
            nameInput.addEventListener('input', (e) => {
                const count = e.target.value.length;
                charCount.textContent = count;
                
                // Visual feedback for character limit
                if (count > 80) {
                    charCount.style.color = '#ef4444';
                } else if (count > 60) {
                    charCount.style.color = '#f59e0b';
                } else {
                    charCount.style.color = '#64748b';
                }
            });
        }

        // Suggestion buttons
        const suggestionBtns = document.querySelectorAll('.suggestion-btn');
        suggestionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const suggestion = btn.getAttribute('data-suggestion');
                if (nameInput && suggestion) {
                    nameInput.value = suggestion;
                    nameInput.dispatchEvent(new Event('input'));
                    nameInput.focus();
                }
            });
        });

        // Auto-focus on input when modal opens
        nameInput?.focus();
    }

    // Create library sidebar
    createLibrarySidebar() {
        const sidebar = document.createElement('div');
        sidebar.id = 'chart-library-sidebar';
        sidebar.className = 'chart-library-sidebar';
        sidebar.style.display = 'none';
        
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <div class="header-content">
                    <div class="header-icon">📚</div>
                    <div class="header-text">
                        <h3>Chart Library</h3>
                        <p>Manage your saved visualizations</p>
                    </div>
                </div>
                <button class="sidebar-close" id="library-close-btn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="sidebar-content">
                <div class="library-stats">
                    <div class="stats-item">
                        <div class="stats-number" id="library-count-number">0</div>
                        <div class="stats-label">Saved Charts</div>
                    </div>
                    <div class="library-actions">
                        <button class="btn btn-ghost btn-sm" id="export-library-btn" title="Export all charts as JSON file">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7,10 12,15 17,10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="search-container">
                    <div class="search-input-wrapper">
                        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="m21 21-4.35-4.35"/>
                        </svg>
                        <input type="text" placeholder="Search charts..." id="search-charts" class="search-input">
                    </div>
                </div>
                <div class="bulk-actions" id="bulk-actions" style="display: none;">
                    <div class="bulk-actions-content">
                        <div class="selection-info">
                            <span id="selected-count">0</span> charts selected
                        </div>
                        <div class="bulk-buttons">
                            <button class="btn btn-sm btn-secondary" id="select-all-btn">Select All</button>
                            <button class="btn btn-sm btn-secondary" id="deselect-all-btn">Deselect All</button>
                            <button class="btn btn-sm btn-danger" id="bulk-delete-btn">Delete Selected</button>
                        </div>
                    </div>
                </div>
                <div class="charts-list" id="charts-list">
                    <!-- Charts will be populated here -->
                </div>
            </div>
            <div class="sidebar-footer">
                <div class="footer-buttons">
                    <button class="btn btn-secondary btn-block" id="new-chart-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="16"/>
                            <line x1="8" y1="12" x2="16" y2="12"/>
                        </svg>
                        New Chart
                    </button>
                    <button class="btn btn-primary btn-block" id="save-as-btn-footer">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                            <polyline points="17,21 17,13 7,13 7,21"/>
                            <polyline points="7,3 7,8 15,8"/>
                        </svg>
                        Save as New Chart
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(sidebar);
    }

    // Add save button to interface
    addSaveButton() {
        // Find a suitable location for the save button
        const toolbar = document.querySelector('.chart-controls') || 
                       document.querySelector('.main-controls') || 
                       document.querySelector('.control-section');
        
        if (toolbar) {
            const saveButtonContainer = document.createElement('div');
            saveButtonContainer.className = 'chart-library-controls';
            saveButtonContainer.innerHTML = `
                <button class="btn btn-primary" id="quick-save-btn" title="Save (Ctrl+S)" style="margin-right: 4px;">
                    💾 Save
                </button>
                <button class="btn btn-success" id="save-as-btn" title="Save as new chart">
                    💾 Save As
                </button>
                <button class="btn btn-info" id="open-library-btn" title="Open chart library" style="margin-left: 8px;">
                    📚 Library
                </button>
            `;
            
            // Insert at the beginning of toolbar
            toolbar.insertBefore(saveButtonContainer, toolbar.firstChild);
        } else {
            // Fallback: Create floating buttons
            this.createFloatingButtons();
        }
    }

    // Create floating buttons if no toolbar found
    createFloatingButtons() {
        // Remove any existing floating buttons first
        this.removeExistingFloatingButtons();
        
        // Try to add to header first
        const headerControls = document.querySelector('.header-controls');
        if (headerControls) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'chart-library-header-buttons';
            buttonContainer.innerHTML = `
                <button class="btn btn-primary header-btn" id="quick-save-btn" title="Save (Ctrl+S)" style="margin-right: 4px;">
                    💾
                </button>
                <button class="btn btn-success header-btn" id="save-as-btn" title="Save as new chart">
                    💾+
                </button>
                <button class="btn btn-info header-btn" id="open-library-btn" title="Open chart library" style="margin-left: 4px;">
                    📚
                </button>
            `;
            headerControls.appendChild(buttonContainer);
        } else {
            // Fallback: Create floating buttons
            const floatingContainer = document.createElement('div');
            floatingContainer.className = 'chart-library-floating';
            floatingContainer.innerHTML = `
                <button class="btn btn-primary floating-btn" id="quick-save-btn" title="Save (Ctrl+S)" style="margin-bottom: 4px;">
                    💾
                </button>
                <button class="btn btn-success floating-btn" id="save-as-btn" title="Save as new chart" style="margin-bottom: 8px;">
                    💾+
                </button>
                <button class="btn btn-info floating-btn" id="open-library-btn" title="Open chart library">
                    📚
                </button>
            `;
            document.body.appendChild(floatingContainer);
        }
    }

    // Remove existing floating buttons to prevent duplicates
    removeExistingFloatingButtons() {
        const existingContainers = document.querySelectorAll('.chart-library-floating, .chart-library-header-buttons');
        existingContainers.forEach(container => container.remove());
    }

    // Setup event listeners
    setupEventListeners() {
        // Save buttons
        document.addEventListener('click', (e) => {
            // Quick Save button (Ctrl+S equivalent)
            if (e.target.id === 'quick-save-btn') {
                this.quickSaveChart();
            }
            
            // Save As button (former save behavior)
            if (e.target.id === 'save-as-btn') {
                this.openSaveModal();
            }
            
            // Library button
            if (e.target.id === 'open-library-btn') {
                this.openLibrary();
            }
            
            // Save modal events
            if (e.target.id === 'save-modal-overlay' || e.target.id === 'save-cancel-btn') {
                this.closeSaveModal();
            }
            
            if (e.target.id === 'save-confirm-btn') {
                this.handleSaveConfirm();
            }
            
            // Library sidebar events
            if (e.target.id === 'library-close-btn' || e.target.id === 'library-close-footer') {
                this.closeLibrary();
            }
            
            // Save As button in footer
            if (e.target.id === 'save-as-btn-footer' || e.target.id === 'save-first-chart') {
                this.openSaveModal();
            }
            
            // New Chart button
            if (e.target.id === 'new-chart-btn') {
                this.createNewChart();
            }
            
            // Export button
            if (e.target.id === 'export-library-btn' || e.target.closest('#export-library-btn')) {
                this.exportCharts();
            }
            
            // Chart actions
            if (e.target.classList.contains('load-chart-btn')) {
                const chartId = e.target.dataset.chartId;
                this.loadChart(chartId);
            }
            
            if (e.target.classList.contains('delete-chart-btn')) {
                const chartId = e.target.dataset.chartId;
                this.deleteChart(chartId);
            }
            
            if (e.target.classList.contains('rename-chart-btn')) {
                const chartId = e.target.dataset.chartId;
                this.renameChart(chartId);
            }
            
            if (e.target.classList.contains('duplicate-chart-btn')) {
                const chartId = e.target.dataset.chartId;
                this.duplicateChart(chartId);
            }
            
            if (e.target.classList.contains('export-chart-btn')) {
                const chartId = e.target.dataset.chartId;
                this.exportSingleChart(chartId);
            }
            
            // Bulk action buttons
            if (e.target.id === 'bulk-delete-btn') {
                this.bulkDeleteCharts();
            }
            
            if (e.target.id === 'select-all-btn') {
                this.selectAllCharts();
            }
            
            if (e.target.id === 'deselect-all-btn') {
                this.deselectAllCharts();
            }

            // More actions menu - improved detection
            if (e.target.classList.contains('more-actions-btn') || e.target.closest('.more-actions-btn')) {
                e.preventDefault();
                e.stopPropagation();
                
                const menuButton = e.target.classList.contains('more-actions-btn') ? e.target : e.target.closest('.more-actions-btn');
                let chartId = menuButton?.dataset?.chartId;
                
                // If no chartId on button, try to get from SVG or child elements
                if (!chartId && menuButton) {
                    const svgElement = menuButton.querySelector('svg');
                    if (svgElement) {
                        chartId = svgElement.dataset.chartId;
                    }
                }
                
                // Fallback: get from any child element with data-chart-id
                if (!chartId && menuButton) {
                    const elementWithId = menuButton.querySelector('[data-chart-id]');
                    if (elementWithId) {
                        chartId = elementWithId.dataset.chartId;
                    }
                }
                
                if (chartId) {
                    console.log('Menu button clicked for chart:', chartId);
                    this.toggleActionsMenu(chartId);
                } else {
                    console.error('No chart ID found on menu button or its children');
                }
            }
            
            // Close menus when clicking outside
            if (!e.target.closest('.chart-actions-menu') && !e.target.closest('.more-actions-btn')) {
                this.closeAllMenus();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Save modal Enter key
            if (e.key === 'Enter' && document.getElementById('chart-save-modal').style.display !== 'none') {
                this.handleSaveConfirm();
            }
            
            // Ctrl+S for Quick Save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.quickSaveChart();
            }
            
            if (e.key === 'Escape') {
                if (document.getElementById('chart-save-modal').style.display !== 'none') {
                    this.closeSaveModal();
                }
                if (this.isLibraryOpen) {
                    this.closeLibrary();
                }
            }
        });

        // Search functionality
        document.addEventListener('input', (e) => {
            if (e.target.id === 'search-charts') {
                this.handleSearch(e.target.value);
            }
        });

        // Bulk selection handlers
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('chart-checkbox')) {
                this.updateBulkActions();
            }
        });
    }

    // Open save modal
    openSaveModal() {
        const currentChart = this.getCurrentChartData();
        if (!currentChart) {
            this.showNotification('No chart data available to save', 'error');
            return;
        }

        const modal = document.getElementById('chart-save-modal');
        const nameInput = document.getElementById('chart-name-input');

        // Populate modal with current chart info
        if (nameInput) {
            nameInput.value = '';
        }

        if (modal) {
            modal.style.display = 'flex';
        }
        if (nameInput) {
            nameInput.focus();
        }
    }

    // Close save modal
    closeSaveModal() {
        document.getElementById('chart-save-modal').style.display = 'none';
    }

    // Handle save confirmation
    handleSaveConfirm() {
        const nameInput = document.getElementById('chart-name-input');
        const name = nameInput.value.trim();
        
        if (!name) {
            nameInput.focus();
            this.showNotification('Please enter a chart name', 'error');
            return;
        }

        const currentChart = this.getCurrentChartData();
        if (!currentChart) {
            this.showNotification('No chart data available to save', 'error');
            return;
        }

        // Capture current chart state before saving
        // Enhanced to use BaseChart unified interface
        if (window.pulseApp.chart) {
            if (window.pulseApp.chart.captureCompleteState) {
                window.pulseApp.chart.captureCompleteState();
            }
        }
        
        this.saveChart(name, currentChart.data, currentChart.config, currentChart.chartType);
        this.closeSaveModal();
        this.showNotification(`Chart "${name}" saved successfully!`, 'success');
    }

    // Open library sidebar
    openLibrary() {
        const sidebar = document.getElementById('chart-library-sidebar');
        sidebar.style.display = 'block';
        this.isLibraryOpen = true;
        this.refreshLibraryUI();
        
        // Add overlay
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.id = 'library-sidebar-overlay';
        overlay.addEventListener('click', () => this.closeLibrary());
        document.body.appendChild(overlay);
    }

    // Close library sidebar
    closeLibrary() {
        document.getElementById('chart-library-sidebar').style.display = 'none';
        this.isLibraryOpen = false;
        
        // Remove overlay
        const overlay = document.getElementById('library-sidebar-overlay');
        if (overlay) {
            overlay.remove();
        }
    }

    // Refresh library UI
    refreshLibraryUI() {
        const chartsList = document.getElementById('charts-list');
        const libraryCountNumber = document.getElementById('library-count-number');
        
        if (!chartsList || !libraryCountNumber) return;

        libraryCountNumber.textContent = this.savedCharts.length;

        if (this.savedCharts.length === 0) {
            chartsList.innerHTML = `
                <div class="empty-library">
                    <div class="empty-icon">📊</div>
                    <h4>No saved charts yet</h4>
                    <p>Save your first chart to get started!</p>
                    <button class="btn btn-primary" id="save-first-chart">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                            <polyline points="17,21 17,13 7,13 7,21"/>
                            <polyline points="7,3 7,8 15,8"/>
                        </svg>
                        Save Current Chart
                    </button>
                </div>
            `;
            return;
        }

        // Sort charts by creation date (newest first)
        const sortedCharts = [...this.savedCharts].sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        chartsList.innerHTML = sortedCharts.map(chart => `
            <div class="chart-item" data-chart-id="${chart.id}">
                <div class="chart-selection">
                    <input type="checkbox" class="chart-checkbox" data-chart-id="${chart.id}">
                </div>
                <div class="chart-info">
                    <div class="chart-details">
                        <div class="chart-name">${this.escapeHtml(chart.name)}</div>
                        <div class="chart-meta">
                            <span class="chart-type-badge ${chart.chartType}">${this.formatChartType(chart.chartType)}</span>
                            <span class="chart-date">${this.formatRelativeDate(chart.createdAt)}</span>
                        </div>
                    </div>
                </div>
                <div class="chart-actions">
                    <button class="btn btn-primary btn-sm load-chart-btn" data-chart-id="${chart.id}" title="Load chart">
                        Load
                    </button>
                    <button class="btn btn-ghost btn-sm more-actions-btn" data-chart-id="${chart.id}" title="More actions">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="1"/>
                            <circle cx="19" cy="12" r="1"/>
                            <circle cx="5" cy="12" r="1"/>
                        </svg>
                    </button>
                </div>
                <div class="chart-actions-menu" id="actions-menu-${chart.id}" style="display: none;">
                    <button class="menu-item load-chart-btn" data-chart-id="${chart.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14,2 14,8 20,8"/>
                            <line x1="16" y1="13" x2="8" y2="13"/>
                            <line x1="16" y1="17" x2="8" y2="17"/>
                            <polyline points="10,9 9,9 8,9"/>
                        </svg>
                        Load Chart
                    </button>
                    <button class="menu-item rename-chart-btn" data-chart-id="${chart.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 20h9"/>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                        </svg>
                        Rename
                    </button>
                    <button class="menu-item duplicate-chart-btn" data-chart-id="${chart.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Duplicate
                    </button>
                    <button class="menu-item export-chart-btn" data-chart-id="${chart.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7,10 12,15 17,10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Export
                    </button>
                    <div class="menu-divider"></div>
                    <button class="menu-item delete-chart-btn" data-chart-id="${chart.id}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3,6 5,6 21,6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Utility functions
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    formatRelativeDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }

    formatChartType(chartType) {
        const types = {
            'sankey': 'Sankey',
            'bar': 'Bar',
            'line': 'Line',
            'pie': 'Pie'
        };
        return types[chartType] || chartType.charAt(0).toUpperCase() + chartType.slice(1);
    }

    getChartTypeIcon(chartType) {
        const icons = {
            'sankey': '🌊',
            'bar': '📊', 
            'line': '📈',
            'pie': '🥧'
        };
        return icons[chartType] || '📊';
    }

    getDataStats(data) {
        if (!data) return '<span class="data-stat">No data</span>';
        
        let count = 0;
        let type = '';
        
        if (data.flows) {
            count = data.flows.length;
            type = 'flows';
        } else if (data.categories) {
            count = data.categories.length;
            type = 'categories';
        } else if (data.values) {
            count = data.values.length;
            type = 'values';
        } else if (data.nodes) {
            count = data.nodes.length;
            type = 'nodes';
        }
        
        return `<span class="data-stat">${count} ${type}</span>`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Enhanced functionality
    handleSearch(query) {
        const chartItems = document.querySelectorAll('.chart-item');
        const searchTerm = query.toLowerCase().trim();
        
        chartItems.forEach(item => {
            const chartName = item.querySelector('.chart-name').textContent.toLowerCase();
            const chartType = item.querySelector('.chart-type-badge').textContent.toLowerCase();
            
            if (chartName.includes(searchTerm) || chartType.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // Rename chart functionality
    renameChart(chartId) {
        const chart = this.savedCharts.find(c => c.id === chartId);
        if (!chart) return;

        const newName = prompt('Enter new chart name:', chart.name);
        if (newName && newName.trim() && newName.trim() !== chart.name) {
            chart.name = newName.trim();
            chart.updatedAt = new Date().toISOString();
            this.saveSavedCharts();
            this.refreshLibraryUI();
            this.showNotification(`Chart renamed to "${chart.name}"`, 'success');
        }
    }

    // Bulk selection functionality
    updateBulkActions() {
        const checkboxes = document.querySelectorAll('.chart-checkbox');
        const selectedCheckboxes = document.querySelectorAll('.chart-checkbox:checked');
        const bulkActions = document.getElementById('bulk-actions');
        const selectedCount = document.getElementById('selected-count');

        if (selectedCheckboxes.length > 0) {
            bulkActions.style.display = 'block';
            selectedCount.textContent = selectedCheckboxes.length;
        } else {
            bulkActions.style.display = 'none';
        }
    }

    selectAllCharts() {
        const checkboxes = document.querySelectorAll('.chart-checkbox');
        checkboxes.forEach(cb => cb.checked = true);
        this.updateBulkActions();
    }

    deselectAllCharts() {
        const checkboxes = document.querySelectorAll('.chart-checkbox:checked');
        checkboxes.forEach(cb => cb.checked = false);
        this.updateBulkActions();
    }

    bulkDeleteCharts() {
        const selectedCheckboxes = document.querySelectorAll('.chart-checkbox:checked');
        const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.chartId);
        
        if (selectedIds.length === 0) return;

        const confirmMsg = `Are you sure you want to delete ${selectedIds.length} chart${selectedIds.length > 1 ? 's' : ''}?`;
        if (confirm(confirmMsg)) {
            selectedIds.forEach(chartId => {
                const chartIndex = this.savedCharts.findIndex(c => c.id === chartId);
                if (chartIndex !== -1) {
                    this.savedCharts.splice(chartIndex, 1);
                }
            });
            
            this.saveSavedCharts();
            this.refreshLibraryUI();
            this.showNotification(`${selectedIds.length} chart${selectedIds.length > 1 ? 's' : ''} deleted`, 'info');
        }
    }

    // New Chart functionality
    createNewChart() {
        if (this.hasUnsavedChanges()) {
            const save = confirm('You have unsaved changes. Would you like to save the current chart before creating a new one?');
            if (save) {
                this.openSaveModal();
                return;
            }
        }

        // Clear current chart data
        if (window.pulseApp && window.pulseApp.clearCurrentChart) {
            window.pulseApp.clearCurrentChart();
        } else if (window.pulseApp) {
            // Fallback: try to clear data manually
            window.pulseApp.currentData = null;
            if (window.pulseApp.chart && window.pulseApp.chart.clear) {
                window.pulseApp.chart.clear();
            }
        }

        this.closeLibrary();
        this.showNotification('New chart created. Start by loading data or using the data editor.', 'info');
    }

    // Check for unsaved changes (simplified check)
    hasUnsavedChanges() {
        if (!window.pulseApp || !window.pulseApp.currentData) return false;
        
        // Simple check - in a real implementation, you'd track modification state
        return !!window.pulseApp.currentData;
    }

    duplicateChart(chartId) {
        const chart = this.savedCharts.find(c => c.id === chartId);
        if (!chart) return;

        const duplicatedChart = {
            ...chart,
            id: this.generateId(),
            name: `${chart.name} (Copy)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.savedCharts.push(duplicatedChart);
        this.saveSavedCharts();
        this.refreshLibraryUI();
        this.showNotification(`Chart "${duplicatedChart.name}" duplicated successfully`, 'success');
    }

    exportSingleChart(chartId) {
        const chart = this.savedCharts.find(c => c.id === chartId);
        if (!chart) return;

        const dataStr = JSON.stringify(chart, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `${chart.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        link.click();
        
        this.showNotification(`Chart "${chart.name}" exported successfully`, 'success');
    }


    toggleActionsMenu(chartId) {
        console.log('Toggling menu for chart:', chartId);
        
        const menu = document.getElementById(`actions-menu-${chartId}`);
        if (menu) {
            const isVisible = menu.style.display === 'block';
            
            // Close all other menus first
            this.closeAllMenus();
            
            // If this menu was not visible, show it
            if (!isVisible) {
                // Move menu to body to escape overflow hidden containers
                if (menu.parentElement !== document.body) {
                    document.body.appendChild(menu);
                }
                
                // Position the menu correctly
                this.positionMenu(menu, chartId);
                
                menu.style.display = 'block';
                menu.style.opacity = '1';
                menu.style.visibility = 'visible';
                menu.style.pointerEvents = 'auto';
                
                // Add menu-open class to parent chart-actions for visibility
                const chartActions = menu.closest('.chart-actions');
                if (chartActions) {
                    chartActions.classList.add('menu-open');
                }
                console.log('Menu visibility changed to: block');
            } else {
                console.log('Menu was visible, now closed by closeAllMenus()');
            }
        } else {
            console.error('Menu not found for chart:', chartId);
        }
    }

    positionMenu(menu, chartId) {
        // Find the menu button for this chart
        const menuButton = document.querySelector(`.more-actions-btn[data-chart-id="${chartId}"]`);
        if (!menuButton) {
            console.error('Menu button not found for positioning');
            return;
        }
        
        // Get button position and viewport dimensions
        const buttonRect = menuButton.getBoundingClientRect();
        const menuWidth = 180; // min-width from CSS
        const menuHeight = 300; // estimated height
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const padding = 10; // padding from viewport edges
        
        // Calculate initial position (below and to the left of button)
        let top = buttonRect.bottom + 8;
        let left = buttonRect.left - menuWidth + buttonRect.width;
        
        // Adjust if menu would go off right edge of screen
        if (left + menuWidth > viewportWidth - padding) {
            left = buttonRect.left - menuWidth - 8; // Show to the left of button instead
        }
        
        // Adjust if menu would go off left edge of screen
        if (left < padding) {
            left = padding;
        }
        
        // Adjust if menu would go off bottom of screen
        if (top + menuHeight > viewportHeight - padding) {
            top = buttonRect.top - menuHeight - 8; // Show above button instead
        }
        
        // Adjust if menu would go off top of screen
        if (top < padding) {
            top = padding;
        }
        
        // Apply position
        menu.style.top = `${top}px`;
        menu.style.left = `${left}px`;
        menu.style.right = 'auto';
        
        console.log('Positioning menu near button:', {
            buttonRect,
            menuPosition: { top, left },
            viewport: { width: viewportWidth, height: viewportHeight }
        });
    }

    closeAllMenus() {
        const menus = document.querySelectorAll('.chart-actions-menu');
        menus.forEach(menu => {
            menu.style.display = 'none';
            menu.style.opacity = '';
            menu.style.visibility = '';
            menu.style.pointerEvents = '';
            menu.style.top = '';
            menu.style.left = '';
            menu.style.right = '';
            // Remove menu-open class from parent chart-actions
            const chartActions = menu.closest('.chart-actions');
            if (chartActions) {
                chartActions.classList.remove('menu-open');
            }
        });
    }

    // LocalStorage operations
    loadSavedCharts() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('❌ Error loading saved charts:', error);
            return [];
        }
    }

    saveSavedCharts() {
        try {
            const chartsData = JSON.stringify(this.savedCharts);
            const dataSize = new Blob([chartsData]).size;
            
            console.log(`💾 Attempting to save ${this.savedCharts.length} charts (${this.formatStorageSize(dataSize)})`);
            
            localStorage.setItem(this.storageKey, chartsData);
            console.log(`✅ Successfully saved charts to localStorage`);
            
        } catch (error) {
            console.error('❌ Error saving charts:', error);
            
            if (error.name === 'QuotaExceededError') {
                this.handleStorageQuotaExceeded();
            } else {
                this.showNotification('Error saving chart to local storage', 'error');
            }
        }
    }

    /**
     * Handle localStorage quota exceeded error with intelligent cleanup
     */
    handleStorageQuotaExceeded() {
        console.log('🧹 Storage quota exceeded - attempting cleanup...');
        
        // Get current storage usage
        const storageInfo = this.getStorageInfo();
        console.log('📊 Current storage usage:', storageInfo);
        
        // Show user-friendly error with options
        const shouldCleanup = confirm(
            `Storage is full! You have ${this.savedCharts.length} saved charts using ${storageInfo.chartsSize}.\n\n` +
            `Options:\n` +
            `• Click OK to automatically remove oldest charts and save\n` +
            `• Click Cancel to export your charts first (recommended)\n\n` +
            `Note: You can always re-import exported charts later.`
        );
        
        if (shouldCleanup) {
            this.performStorageCleanup();
        } else {
            this.showStorageFullDialog();
        }
    }

    /**
     * Perform intelligent storage cleanup
     */
    performStorageCleanup() {
        const originalCount = this.savedCharts.length;
        
        // Strategy 1: Remove largest charts first (they're usually the most storage-intensive)
        this.savedCharts.sort((a, b) => {
            const sizeA = JSON.stringify(a).length;
            const sizeB = JSON.stringify(b).length;
            return sizeB - sizeA; // Largest first
        });
        
        // Strategy 2: Remove oldest charts that haven't been updated recently
        const now = Date.now();
        const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
        
        let removedCount = 0;
        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts && this.savedCharts.length > 0) {
            // Remove oldest large charts or charts older than 30 days
            const toRemove = this.savedCharts.filter(chart => {
                const updatedAt = new Date(chart.updatedAt).getTime();
                const chartSize = JSON.stringify(chart).length;
                return updatedAt < oneMonthAgo || chartSize > 100000; // Remove if old or >100KB
            });
            
            if (toRemove.length === 0) {
                // If no old/large charts, remove oldest 25%
                const removeCount = Math.max(1, Math.floor(this.savedCharts.length * 0.25));
                toRemove.push(...this.savedCharts.slice(-removeCount));
            }
            
            // Remove selected charts
            toRemove.forEach(chart => {
                const index = this.savedCharts.findIndex(c => c.id === chart.id);
                if (index !== -1) {
                    this.savedCharts.splice(index, 1);
                    removedCount++;
                }
            });
            
            // Try to save again
            try {
                const chartsData = JSON.stringify(this.savedCharts);
                localStorage.setItem(this.storageKey, chartsData);
                
                console.log(`✅ Storage cleanup successful: removed ${removedCount} charts, ${this.savedCharts.length} remaining`);
                this.refreshLibraryUI();
                this.showNotification(
                    `Storage cleaned up! Removed ${removedCount} old charts. ${this.savedCharts.length} charts remaining.`,
                    'success'
                );
                return;
                
            } catch (error) {
                if (error.name !== 'QuotaExceededError') {
                    throw error; // Different error, re-throw
                }
                attempts++;
                console.log(`🧹 Cleanup attempt ${attempts}/${maxAttempts} - still need more space`);
            }
        }
        
        // If we get here, cleanup failed
        console.error('❌ Storage cleanup failed after maximum attempts');
        this.showNotification(
            `Unable to free enough storage space. Please export and delete charts manually.`,
            'error'
        );
        this.showStorageFullDialog();
    }

    /**
     * Show dialog with storage management options
     */
    showStorageFullDialog() {
        const storageInfo = this.getStorageInfo();
        
        const dialog = document.createElement('div');
        dialog.className = 'storage-full-dialog';
        dialog.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content storage-dialog">
                <div class="modal-header">
                    <h3>🚨 Storage Full</h3>
                    <button class="modal-close" onclick="this.closest('.storage-full-dialog').remove()">×</button>
                </div>
                <div class="modal-body">
                    <div class="storage-info">
                        <h4>Current Storage Usage:</h4>
                        <ul>
                            <li><strong>${this.savedCharts.length}</strong> saved charts</li>
                            <li><strong>${storageInfo.chartsSize}</strong> used by charts</li>
                            <li><strong>${storageInfo.totalSize}</strong> total localStorage usage</li>
                        </ul>
                    </div>
                    <div class="storage-actions">
                        <h4>Recommended Actions:</h4>
                        <button class="btn btn-primary" onclick="window.chartLibrary.exportCharts(); this.closest('.storage-full-dialog').remove();">
                            📥 Export All Charts
                        </button>
                        <button class="btn btn-warning" onclick="window.chartLibrary.showBulkDeleteDialog(); this.closest('.storage-full-dialog').remove();">
                            🗑️ Delete Old Charts
                        </button>
                        <button class="btn btn-secondary" onclick="window.chartLibrary.showStorageOptimization(); this.closest('.storage-full-dialog').remove();">
                            ⚙️ Optimize Storage
                        </button>
                    </div>
                </div>
                <div class="modal-footer">
                    <p><small>💡 Tip: Exported charts can be re-imported later without losing data.</small></p>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
    }

    /**
     * Show bulk delete dialog for storage management
     */
    showBulkDeleteDialog() {
        // Sort charts by size and age for easier selection
        const chartsWithInfo = this.savedCharts.map(chart => ({
            ...chart,
            size: JSON.stringify(chart).length,
            age: Date.now() - new Date(chart.updatedAt).getTime()
        })).sort((a, b) => b.size - a.size); // Largest first
        
        this.openLibrary();
        
        // Auto-select large/old charts
        setTimeout(() => {
            chartsWithInfo.forEach(chart => {
                if (chart.size > 50000 || chart.age > (7 * 24 * 60 * 60 * 1000)) { // >50KB or >7 days old
                    const checkbox = document.querySelector(`input[data-chart-id="${chart.id}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                }
            });
            this.updateBulkActions();
            
            this.showNotification(
                'Large and old charts have been pre-selected for deletion. Uncheck any you want to keep.',
                'info'
            );
        }, 100);
    }

    /**
     * Show storage optimization options
     */
    showStorageOptimization() {
        alert(
            'Storage Optimization Tips:\n\n' +
            '• Export charts you don\'t use frequently\n' +
            '• Delete duplicate or test charts\n' +
            '• Large charts with many data points use more storage\n' +
            '• Consider using fewer custom colors and positions\n\n' +
            'Current storage is managed automatically, but manual cleanup gives you more control.'
        );
    }

    /**
     * Get detailed storage information
     */
    getStorageInfo() {
        try {
            const chartsData = JSON.stringify(this.savedCharts);
            const chartsSize = new Blob([chartsData]).size;
            
            // Estimate total localStorage usage
            let totalSize = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length;
                }
            }
            
            return {
                chartsCount: this.savedCharts.length,
                chartsSize: this.formatStorageSize(chartsSize),
                chartsBytes: chartsSize,
                totalSize: this.formatStorageSize(totalSize),
                totalBytes: totalSize,
                availableSpace: this.formatStorageSize(Math.max(0, 5242880 - totalSize)) // 5MB typical limit
            };
        } catch (error) {
            return {
                chartsCount: this.savedCharts.length,
                chartsSize: 'Unknown',
                chartsBytes: 0,
                totalSize: 'Unknown',
                totalBytes: 0,
                availableSpace: 'Unknown'
            };
        }
    }

    /**
     * Format storage size for display
     */
    formatStorageSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Check storage space and warn user if getting close to limit
     */
    checkStorageSpace() {
        try {
            const storageInfo = this.getStorageInfo();
            const usagePercentage = (storageInfo.totalBytes / 5242880) * 100; // 5MB typical limit
            
            if (usagePercentage > 80) {
                console.warn(`⚠️ Storage usage at ${usagePercentage.toFixed(1)}% (${storageInfo.totalSize})`);
                
                if (usagePercentage > 90) {
                    this.showNotification(
                        `Storage almost full (${usagePercentage.toFixed(1)}%)! Consider exporting or deleting old charts.`,
                        'warning'
                    );
                }
            }
        } catch (error) {
            console.warn('Unable to check storage space:', error);
        }
    }

    // Notification system
    showNotification(message, type = 'info') {
        // Remove existing notification
        const existing = document.getElementById('chart-library-notification');
        if (existing) {
            existing.remove();
        }

        const notification = document.createElement('div');
        notification.id = 'chart-library-notification';
        notification.className = `chart-notification ${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close">×</button>
        `;

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }

    // Quick Save visual feedback
    showQuickSaveFeedback() {
        // Create temporary feedback element
        const feedback = document.createElement('div');
        feedback.id = 'quick-save-feedback';
        feedback.innerHTML = '✓ Saved';
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            z-index: 10000;
            animation: quickSaveFade 2s ease-in-out forwards;
        `;

        // Add CSS animation if not already present
        if (!document.getElementById('quick-save-styles')) {
            const style = document.createElement('style');
            style.id = 'quick-save-styles';
            style.textContent = `
                @keyframes quickSaveFade {
                    0% { opacity: 0; transform: translateY(-10px); }
                    15% { opacity: 1; transform: translateY(0); }
                    85% { opacity: 1; transform: translateY(0); }
                    100% { opacity: 0; transform: translateY(-10px); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(feedback);

        // Remove after animation
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 2000);
    }

    // Helper method to find the most recently used chart of a specific type
    findMostRecentChartOfType(chartType) {
        if (!this.savedCharts || this.savedCharts.length === 0) return null;
        
        const chartsOfType = this.savedCharts.filter(c => c.chartType === chartType);
        if (chartsOfType.length === 0) return null;
        
        // Sort by updatedAt (most recent first)
        chartsOfType.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        return chartsOfType[0];
    }

    // Confirm with user if they want to save to the most recent chart
    confirmQuickSaveToRecentChart(chart) {
        return confirm(`Save changes to "${chart.name}"?\n\nClick OK to update the existing chart, or Cancel to create a new chart.`);
    }

    // Note: Chart state restoration is now handled by embedding state in data.metadata.chartState
    // and letting the chart's built-in restoreCompleteState() method handle it

    // Public API
    getSavedCharts() {
        return [...this.savedCharts];
    }

    getSavedChart(chartId) {
        return this.savedCharts.find(c => c.id === chartId);
    }

    exportCharts() {
        if (this.savedCharts.length === 0) {
            this.showNotification('No charts to export', 'info');
            return;
        }
        
        const dataStr = JSON.stringify(this.savedCharts, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `pulsecharts_library_${new Date().toISOString().split('T')[0]}.json`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL object
        setTimeout(() => {
            URL.revokeObjectURL(link.href);
        }, 100);
        
        this.showNotification(`Exported ${this.savedCharts.length} charts successfully`, 'success');
    }


    // Update spreadsheet editor with loaded data
    updateSpreadsheetWithData(data, chartType) {
        console.log('📊 Updating spreadsheet with loaded data:', data);
        
        // Check if spreadsheet editor container exists, if not, try to wait for it
        const editorContainer = document.getElementById('unified-data-editor-container');
        if (!editorContainer) {
            // Try again after a short delay to allow DOM to load
            setTimeout(() => {
                const retryContainer = document.getElementById('unified-data-editor-container');
                if (!retryContainer) {
                    console.log('📝 Spreadsheet editor not available - this is normal for chart library loading');
                    return;
                }
                this.updateSpreadsheetWithData(data, chartType);
            }, 500);
            return;
        }
        
        if (!window.unifiedDataEditor && window.pulseApp && window.pulseApp.chart) {
            console.log('📝 Creating unified data editor for chart loading');
            window.unifiedDataEditor = new UnifiedSpreadsheetEditor('unified-data-editor-container', window.pulseApp.chart, chartType);
        }
        
        // Try to find the active unified data editor
        if (window.unifiedDataEditor) {
            try {
                // Switch chart type if needed
                if (window.unifiedDataEditor.chartType !== chartType) {
                    console.log(`🔄 Switching spreadsheet editor from ${window.unifiedDataEditor.chartType} to ${chartType}`);
                    window.unifiedDataEditor.switchChartType(chartType);
                }
                
                // Wait a bit for the switch to complete, then load data
                setTimeout(() => {
                    if (window.unifiedDataEditor.loadExistingChartData) {
                        window.unifiedDataEditor.loadExistingChartData(data);
                        window.unifiedDataEditor.render();
                        console.log('✅ Spreadsheet updated with loaded chart data');
                    } else {
                        console.warn('⚠️ loadExistingChartData method not available on editor');
                    }
                }, 100);
                
            } catch (error) {
                console.error('❌ Error updating spreadsheet with data:', error);
            }
        } else {
            console.warn('⚠️ No unified data editor found to update');
        }
    }
}

// Export for use
window.ChartLibrary = ChartLibrary;
