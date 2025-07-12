/* ===== UNIVERSAL CHART LIBRARY ===== */
/* Save and load functionality for all chart types */

class ChartLibrary {
    constructor() {
        this.storageKey = 'pulsecharts_saved_charts';
        this.savedCharts = this.loadSavedCharts();
        this.isLibraryOpen = false;
        
        this.init();
    }

    init() {
        this.createSaveModal();
        this.createLibrarySidebar();
        this.addSaveButton();
        this.setupEventListeners();
        
        console.log('📚 ChartLibrary initialized successfully');
    }

    // Save functionality
    saveChart(name, data, config, chartType) {
        const chart = {
            id: this.generateId(),
            name: name.trim() || 'Untitled Chart',
            data: JSON.parse(JSON.stringify(data)), // Deep clone
            config: JSON.parse(JSON.stringify(config)), // Deep clone
            chartType: chartType,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        this.savedCharts.push(chart);
        this.saveSavedCharts();
        this.refreshLibraryUI();
        
        console.log(`💾 Chart "${chart.name}" saved successfully`);
        return chart;
    }

    // Load functionality
    loadChart(chartId) {
        const chart = this.savedCharts.find(c => c.id === chartId);
        if (!chart) {
            console.error('❌ Chart not found:', chartId);
            return null;
        }

        console.log(`📖 Loading chart "${chart.name}"`);
        
        // Update chart in the application
        if (window.pulseApp) {
            // Switch to correct chart type if needed
            if (window.pulseApp.currentChartType !== chart.chartType) {
                console.log(`🔄 Switching from ${window.pulseApp.currentChartType} to ${chart.chartType}`);
                window.pulseApp.switchChartType(chart.chartType);
            }

            // Wait for chart type switch to complete, then load data
            setTimeout(() => {
                // Load the chart data
                window.pulseApp.updateData(chart.data, 'chart-library');
                
                // Apply configuration if chart supports it
                if (window.pulseApp.chart && window.pulseApp.chart.updateConfig) {
                    window.pulseApp.chart.updateConfig(chart.config);
                }

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
            <div class="modal-content">
                <div class="modal-header">
                    <h3>💾 Save Chart</h3>
                    <button class="modal-close" id="save-modal-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="chart-name-input">Chart Name:</label>
                        <input type="text" id="chart-name-input" placeholder="Enter chart name..." maxlength="50">
                    </div>
                    <div class="chart-info">
                        <div class="info-item">
                            <span class="label">Chart Type:</span>
                            <span id="save-chart-type">-</span>
                        </div>
                        <div class="info-item">
                            <span class="label">Data Points:</span>
                            <span id="save-data-count">-</span>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="save-cancel-btn">Cancel</button>
                    <button class="btn btn-primary" id="save-confirm-btn">Save Chart</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // Create library sidebar
    createLibrarySidebar() {
        const sidebar = document.createElement('div');
        sidebar.id = 'chart-library-sidebar';
        sidebar.className = 'chart-library-sidebar';
        sidebar.style.display = 'none';
        
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h3>📚 Chart Library</h3>
                <button class="sidebar-close" id="library-close-btn">×</button>
            </div>
            <div class="sidebar-content">
                <div class="library-stats">
                    <span id="library-count">0 saved charts</span>
                </div>
                <div class="charts-list" id="charts-list">
                    <!-- Charts will be populated here -->
                </div>
            </div>
            <div class="sidebar-footer">
                <button class="btn btn-secondary btn-block" id="library-close-footer">Close Library</button>
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
                <button class="btn btn-success" id="save-chart-btn" title="Save current chart">
                    💾 Save Chart
                </button>
                <button class="btn btn-info" id="open-library-btn" title="Open chart library">
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
        const floatingContainer = document.createElement('div');
        floatingContainer.className = 'chart-library-floating';
        floatingContainer.innerHTML = `
            <button class="btn btn-success floating-btn" id="save-chart-btn" title="Save current chart">
                💾
            </button>
            <button class="btn btn-info floating-btn" id="open-library-btn" title="Open chart library">
                📚
            </button>
        `;
        
        document.body.appendChild(floatingContainer);
    }

    // Setup event listeners
    setupEventListeners() {
        // Save button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'save-chart-btn') {
                this.openSaveModal();
            }
            
            // Library button
            if (e.target.id === 'open-library-btn') {
                this.openLibrary();
            }
            
            // Save modal events
            if (e.target.id === 'save-modal-close' || e.target.id === 'save-modal-overlay' || e.target.id === 'save-cancel-btn') {
                this.closeSaveModal();
            }
            
            if (e.target.id === 'save-confirm-btn') {
                this.handleSaveConfirm();
            }
            
            // Library sidebar events
            if (e.target.id === 'library-close-btn' || e.target.id === 'library-close-footer') {
                this.closeLibrary();
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
        });

        // Save modal Enter key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && document.getElementById('chart-save-modal').style.display !== 'none') {
                this.handleSaveConfirm();
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
        const chartType = document.getElementById('save-chart-type');
        const dataCount = document.getElementById('save-data-count');

        // Populate modal with current chart info
        nameInput.value = '';
        chartType.textContent = currentChart.chartType.charAt(0).toUpperCase() + currentChart.chartType.slice(1);
        
        // Count data points
        let count = 0;
        if (currentChart.data) {
            if (currentChart.data.flows) {
                count = currentChart.data.flows.length;
            } else if (currentChart.data.categories) {
                count = currentChart.data.categories.length;
            } else if (currentChart.data.values) {
                count = currentChart.data.values.length;
            }
        }
        dataCount.textContent = count;

        modal.style.display = 'flex';
        nameInput.focus();
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
        const libraryCount = document.getElementById('library-count');
        
        if (!chartsList || !libraryCount) return;

        libraryCount.textContent = `${this.savedCharts.length} saved chart${this.savedCharts.length !== 1 ? 's' : ''}`;

        if (this.savedCharts.length === 0) {
            chartsList.innerHTML = `
                <div class="empty-library">
                    <p>📊 No saved charts yet</p>
                    <p>Save your first chart to get started!</p>
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
                <div class="chart-info">
                    <div class="chart-name">${this.escapeHtml(chart.name)}</div>
                    <div class="chart-meta">
                        <span class="chart-type">${chart.chartType}</span>
                        <span class="chart-date">${this.formatDate(chart.createdAt)}</span>
                    </div>
                </div>
                <div class="chart-actions">
                    <button class="btn btn-sm btn-primary load-chart-btn" data-chart-id="${chart.id}" title="Load chart">
                        📖 Load
                    </button>
                    <button class="btn btn-sm btn-danger delete-chart-btn" data-chart-id="${chart.id}" title="Delete chart">
                        🗑️
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
            localStorage.setItem(this.storageKey, JSON.stringify(this.savedCharts));
        } catch (error) {
            console.error('❌ Error saving charts:', error);
            this.showNotification('Error saving chart to local storage', 'error');
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

    // Public API
    getSavedCharts() {
        return [...this.savedCharts];
    }

    getSavedChart(chartId) {
        return this.savedCharts.find(c => c.id === chartId);
    }

    exportCharts() {
        const dataStr = JSON.stringify(this.savedCharts, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = 'pulsecharts_library.json';
        link.click();
        
        this.showNotification('Chart library exported successfully', 'success');
    }

    importCharts(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedCharts = JSON.parse(e.target.result);
                if (Array.isArray(importedCharts)) {
                    this.savedCharts.push(...importedCharts);
                    this.saveSavedCharts();
                    this.refreshLibraryUI();
                    this.showNotification(`Imported ${importedCharts.length} charts successfully`, 'success');
                } else {
                    throw new Error('Invalid file format');
                }
            } catch (error) {
                console.error('❌ Error importing charts:', error);
                this.showNotification('Error importing charts - invalid file format', 'error');
            }
        };
        reader.readAsText(file);
    }
}

// Export for use
window.ChartLibrary = ChartLibrary;
console.log('🚀 ChartLibrary loaded successfully');