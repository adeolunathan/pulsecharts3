/* ===== CATEGORY ASSIGNMENT MODAL ===== */
/* Modal component for assigning categories to Sankey chart nodes */

class CategoryAssignmentModal {
    constructor(chart, node) {
        this.chart = chart;
        this.node = node;
        this.modalId = `category-modal-${Date.now()}`;
        this.currentCategory = this.chart.getCategoryForNode(this.node.id);
        
        // For newly created nodes, initialize with a selected category if none exists
        if (!this.currentCategory && this.node.userCreated) {
            this.selectedCategory = ''; // Start with "None" selected for new nodes
        } else {
            this.selectedCategory = this.currentCategory;
        }
        
        // Debug log for troubleshooting
        console.log(`🔍 CategoryAssignmentModal for node '${this.node.id}', current category: ${this.currentCategory || 'none'}, userCreated: ${this.node.userCreated}`);
        
        // Track the current active tab mode
        this.activeTab = 'category'; // Start with category assignment
        
        this.createModal();
        this.setupEventListeners();
    }

    /**
     * Create the modal HTML structure with Material Design principles
     */
    createModal() {
        const modalHTML = `
            <div class="md-modal-backdrop" id="${this.modalId}" role="dialog" aria-labelledby="modal-title" aria-modal="true">
                <div class="md-modal-surface">
                    <div class="md-modal-header">
                        <div class="md-modal-title-container">
                            <h2 id="modal-title" class="md-modal-title">Category Assignment</h2>
                            <div class="md-modal-subtitle">
                                <span class="md-node-name">${this.node.id}</span>
                            </div>
                        </div>
                        <button class="md-icon-button md-modal-close" aria-label="Close" type="button">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="md-modal-content">
                        <!-- Color Mode Tabs -->
                        <div class="md-tabs">
                            <button class="md-tab-btn active" id="tab-category" data-tab="category">
                                🏷️ Assign Category
                            </button>
                            <button class="md-tab-btn" id="tab-color" data-tab="color">
                                🎨 Set Color Only
                            </button>
                        </div>
                        
                        <!-- Category Assignment Tab -->
                        <div class="md-tab-content active" id="content-category">
                            <div class="md-section">
                                <div class="md-section-title">Choose Category</div>
                                <div class="md-category-grid">
                                    ${this.renderMaterialCategoryChips()}
                                </div>
                            </div>
                            
                            <div class="md-section md-create-section">
                                <div class="md-create-title">Create New Category</div>
                                <div class="md-create-controls">
                                    <input type="text" id="category-name-input" class="md-name-input" placeholder="Category name" maxlength="20">
                                    <input type="color" id="category-color-input" class="md-color-input" value="#1e40af">
                                    <button id="category-create-btn" class="md-add-btn" type="button">+</button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Independent Color Tab -->
                        <div class="md-tab-content" id="content-color">
                            <div class="md-section">
                                <div class="md-section-title">Set Node Color</div>
                                <div class="md-color-section">
                                    <div class="md-color-preview-container">
                                        <div class="md-color-preview" id="color-preview" style="background-color: ${this.getCurrentNodeColor()}"></div>
                                        <span class="md-color-label">Current Color</span>
                                    </div>
                                    <input type="color" id="independent-color-input" class="md-color-picker" value="${this.getCurrentNodeColor()}">
                                    <button class="md-color-reset-btn" id="color-reset-btn" type="button">
                                        Reset to Default
                                    </button>
                                </div>
                                <div class="md-color-presets">
                                    <div class="md-presets-title">Quick Colors</div>
                                    <div class="md-preset-colors">
                                        ${this.renderColorPresets()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="md-modal-actions">
                        <button class="md-action-btn md-add-node-btn" id="category-add-node-btn" type="button">
                            + Add Node
                        </button>
                        <div class="md-action-group">
                            <button class="md-action-btn md-cancel-btn" id="category-cancel-btn" type="button">
                                Cancel
                            </button>
                            <button class="md-action-btn md-save-btn" id="category-save-btn" type="button">
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Apply styles
        this.applyStyles();
        
        // Show modal
        this.showModal();
    }

    /**
     * Render Material Design category chips for selection
     */
    renderMaterialCategoryChips() {
        const allCategories = this.chart.getAllCategories();
        let chipsHTML = '';
        
        // Add "Remove Category" option
        const isRemoveSelected = this.currentCategory === '' || this.currentCategory === null || this.currentCategory === undefined;
        chipsHTML += `
            <div class="md-category-chip md-remove-chip ${isRemoveSelected ? 'md-chip-active' : ''}" 
                 data-category="" 
                 role="button" 
                 tabindex="0" 
                 aria-label="Remove category">
                <span class="md-chip-icon">✕</span>
            </div>
        `;
        
        // Add all available categories
        for (const [name, category] of Object.entries(allCategories)) {
            const isSelected = this.currentCategory === name;
            chipsHTML += `
                <div class="md-category-chip ${isSelected ? 'md-chip-active' : ''}" 
                     data-category="${name}" 
                     role="button" 
                     tabindex="0" 
                     aria-label="Select ${name} category"
                     style="--chip-color: ${category.color}">
                    <span class="md-chip-text">${name}</span>
                </div>
            `;
        }
        
        return chipsHTML;
    }

    /**
     * Render color preset buttons for quick color selection
     */
    renderColorPresets() {
        const presetColors = [
            '#1e40af', '#dc2626', '#059669', '#7c3aed', '#f59e0b',
            '#ef4444', '#22c55e', '#3b82f6', '#8b5cf6', '#f97316',
            '#10b981', '#6366f1', '#f43f5e', '#14b8a6', '#a855f7'
        ];
        
        return presetColors.map(color => 
            `<button class="md-preset-color" data-color="${color}" style="background-color: ${color}" title="${color}"></button>`
        ).join('');
    }

    /**
     * Get color for a category
     */
    getCategoryColor(categoryName) {
        const categories = this.chart.getAllCategories();
        return categories[categoryName]?.color || '#6b7280';
    }

    /**
     * Get icon for a category
     */
    getCategoryIcon(categoryName) {
        const categories = this.chart.getAllCategories();
        return categories[categoryName]?.icon || '📊';
    }

    /**
     * Get the current color of the node
     */
    getCurrentNodeColor() {
        // Check for independent color first
        if (this.chart.getIndependentNodeColor) {
            const independentColor = this.chart.getIndependentNodeColor(this.node.id);
            if (independentColor) {
                return independentColor;
            }
        }
        
        // Check node's direct customColor property
        if (this.node.customColor) {
            return this.node.customColor;
        }
        
        // Use chart's getNodeColor method as fallback
        if (this.chart.getNodeColor) {
            return this.chart.getNodeColor(this.node);
        }
        
        // Final fallback to a default color
        return '#6b7280';
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const modal = document.getElementById(this.modalId);
        
        // Close modal events
        modal.querySelector('.md-modal-close').addEventListener('click', () => this.close());
        modal.querySelector('#category-cancel-btn').addEventListener('click', () => this.close());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });
        
        // Keyboard events
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Tab switching between category and color modes
        modal.querySelector('#tab-category').addEventListener('click', () => this.switchTab('category'));
        modal.querySelector('#tab-color').addEventListener('click', () => this.switchTab('color'));
        
        // Setup chip listeners for category assignment
        this.setupChipListeners(modal);
        
        // Node name color changing (right-click or Ctrl+click)
        const nodeName = modal.querySelector('.md-node-name');
        if (nodeName) {
            // Add visual hint that it's interactive
            nodeName.style.cursor = 'pointer';
            nodeName.title = 'Right-click or Ctrl+click to change node color';
            
            // Right-click for color changing
            nodeName.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showNodeColorPicker(nodeName);
            });
            
            // Ctrl+click alternative
            nodeName.addEventListener('click', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.showNodeColorPicker(nodeName);
                }
            });
        }
        
        // Custom category creation
        modal.querySelector('#category-create-btn').addEventListener('click', () => this.createCustomCategory());
        
        // Enter key support for text inputs
        modal.querySelector('#category-name-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.createCustomCategory();
            }
        });
        
        // Independent color input handling
        const colorInput = modal.querySelector('#independent-color-input');
        if (colorInput) {
            colorInput.addEventListener('input', (e) => this.handleColorChange(e.target.value));
            colorInput.addEventListener('change', (e) => this.handleColorChange(e.target.value));
        }
        
        // Color preset selection
        modal.querySelectorAll('.md-preset-color').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const color = e.target.getAttribute('data-color');
                this.setIndependentColor(color);
            });
        });
        
        // Color reset functionality
        const resetBtn = modal.querySelector('#color-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetNodeColor());
        }
        
        // Save button
        modal.querySelector('#category-save-btn').addEventListener('click', () => this.save());
        
        // Add Node button
        modal.querySelector('#category-add-node-btn').addEventListener('click', () => {
            this.close();
            this.chart.showCompleteNodeCreationModal(this.node);
        });
        
        // Focus management
        setTimeout(() => {
            modal.querySelector('.md-modal-surface').focus();
        }, 100);
    }

    /**
     * Handle keyboard events
     */
    handleKeyDown(e) {
        if (e.key === 'Escape') {
            this.close();
        } else if (e.key === 'Enter' && e.target.id === 'category-name-input') {
            this.createCustomCategory();
        }
    }

    /**
     * Select a category
     */
    selectCategory(categoryName) {
        const modal = document.getElementById(this.modalId);
        
        // Remove previous selection
        modal.querySelectorAll('.md-category-chip').forEach(chip => {
            chip.classList.remove('md-chip-active');
        });
        
        // Add selection to clicked chip
        const selectedChip = modal.querySelector(`[data-category="${categoryName}"]`);
        if (selectedChip) {
            selectedChip.classList.add('md-chip-active');
        }
        
        this.selectedCategory = categoryName;
    }

    /**
     * Create a custom category
     */
    createCustomCategory() {
        const modal = document.getElementById(this.modalId);
        const nameInput = modal.querySelector('#category-name-input');
        const colorInput = modal.querySelector('#category-color-input');
        
        const name = nameInput.value.trim();
        const color = colorInput.value;
        const icon = '📊'; // Default icon since we removed the picker
        
        if (!name) {
            this.showSnackbar('Please enter a category name', 'error');
            nameInput.focus();
            return;
        }
        
        // Create the category
        if (this.chart.createCustomCategory(name, color, icon)) {
            // Clear form
            nameInput.value = '';
            
            // Refresh category chips
            const chipsContainer = modal.querySelector('.md-category-grid');
            chipsContainer.innerHTML = this.renderMaterialCategoryChips();
            
            // Re-setup chip event listeners
            this.setupChipListeners(modal);
            
            // Auto-select the new category
            this.selectCategory(name);
            
            // Show success message
            this.showSnackbar(`Category "${name}" created successfully!`, 'success');
        } else {
            this.showSnackbar('Failed to create category. Name may already exist.', 'error');
        }
    }

    /**
     * Setup chip event listeners
     */
    setupChipListeners(modal) {
        modal.querySelectorAll('.md-category-chip').forEach(chip => {
            const categoryName = chip.dataset.category;
            
            // Regular click for all chips
            chip.addEventListener('click', (e) => {
                const categoryName = e.currentTarget.dataset.category;
                this.selectCategory(categoryName);
            });
            
            // Skip color editing for the "remove category" chip
            if (categoryName === '') return;
            
            // Right-click to edit color
            chip.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showCategoryColorPicker(categoryName, e.currentTarget);
            });
            
            // Double-click alternative for color editing
            chip.addEventListener('dblclick', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showCategoryColorPicker(categoryName, e.currentTarget);
            });
            
            // Keyboard support
            chip.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const categoryName = e.currentTarget.dataset.category;
                    this.selectCategory(categoryName);
                } else if (e.key === 'e' || e.key === 'E') {
                    // Press 'E' to edit color
                    e.preventDefault();
                    this.showCategoryColorPicker(categoryName, e.currentTarget);
                }
            });
        });
    }

    /**
     * Show category color picker popup
     */
    showCategoryColorPicker(categoryName, chipElement) {
        // Remove any existing color picker
        const existingPicker = document.querySelector('.category-color-picker');
        if (existingPicker) {
            existingPicker.remove();
        }
        
        const allCategories = this.chart.getAllCategories();
        const category = allCategories[categoryName];
        if (!category) return;
        
        // Create color picker popup
        const picker = document.createElement('div');
        picker.className = 'category-color-picker';
        picker.innerHTML = `
            <div class="color-picker-content">
                <div class="color-picker-header">
                    <span class="color-picker-title">Edit "${categoryName}" Color</span>
                    <button class="color-picker-close">×</button>
                </div>
                <div class="color-picker-body">
                    <input type="color" value="${category.color}" class="color-input">
                    <div class="color-presets">
                        <div class="preset-color" data-color="#1e40af" style="background: #1e40af"></div>
                        <div class="preset-color" data-color="#dc2626" style="background: #dc2626"></div>
                        <div class="preset-color" data-color="#059669" style="background: #059669"></div>
                        <div class="preset-color" data-color="#d97706" style="background: #d97706"></div>
                        <div class="preset-color" data-color="#7c3aed" style="background: #7c3aed"></div>
                        <div class="preset-color" data-color="#db2777" style="background: #db2777"></div>
                    </div>
                    <div class="color-picker-actions">
                        <button class="btn-apply">Apply</button>
                        <button class="btn-cancel">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        // Position near the chip
        const chipRect = chipElement.getBoundingClientRect();
        picker.style.position = 'fixed';
        picker.style.left = chipRect.left + 'px';
        picker.style.top = (chipRect.bottom + 5) + 'px';
        picker.style.zIndex = '10001';
        
        document.body.appendChild(picker);
        
        // Event handlers
        const colorInput = picker.querySelector('.color-input');
        const presetColors = picker.querySelectorAll('.preset-color');
        const applyBtn = picker.querySelector('.btn-apply');
        const cancelBtn = picker.querySelector('.btn-cancel');
        const closeBtn = picker.querySelector('.color-picker-close');
        
        // Preset color selection
        presetColors.forEach(preset => {
            preset.addEventListener('click', () => {
                colorInput.value = preset.dataset.color;
            });
        });
        
        // Apply color change
        const applyColor = () => {
            const newColor = colorInput.value;
            this.updateCategoryColor(categoryName, newColor);
            picker.remove();
        };
        
        // Cancel
        const cancelColor = () => {
            picker.remove();
        };
        
        applyBtn.addEventListener('click', applyColor);
        cancelBtn.addEventListener('click', cancelColor);
        closeBtn.addEventListener('click', cancelColor);
        
        // Close on outside click
        document.addEventListener('click', function outsideClick(e) {
            if (!picker.contains(e.target)) {
                picker.remove();
                document.removeEventListener('click', outsideClick);
            }
        });
        
        // Focus color input
        colorInput.focus();
    }

    /**
     * Show node color picker popup
     */
    showNodeColorPicker(nodeElement) {
        // Remove any existing color picker
        const existingPicker = document.querySelector('.node-color-picker');
        if (existingPicker) {
            existingPicker.remove();
        }
        
        const currentColor = this.getCurrentNodeColor();
        
        // Create color picker popup
        const picker = document.createElement('div');
        picker.className = 'node-color-picker';
        picker.innerHTML = `
            <div class="color-picker-content">
                <div class="color-picker-header">
                    <span class="color-picker-title">Edit Node "${this.node.id}" Color</span>
                    <button class="color-picker-close">×</button>
                </div>
                <div class="color-picker-body">
                    <input type="color" value="${currentColor}" class="color-input">
                    <div class="color-presets">
                        <div class="preset-color" data-color="#1e40af" style="background: #1e40af"></div>
                        <div class="preset-color" data-color="#dc2626" style="background: #dc2626"></div>
                        <div class="preset-color" data-color="#059669" style="background: #059669"></div>
                        <div class="preset-color" data-color="#d97706" style="background: #d97706"></div>
                        <div class="preset-color" data-color="#7c3aed" style="background: #7c3aed"></div>
                        <div class="preset-color" data-color="#db2777" style="background: #db2777"></div>
                    </div>
                    <div class="color-picker-actions">
                        <button class="btn-apply">Apply</button>
                        <button class="btn-reset">Reset</button>
                        <button class="btn-cancel">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        
        // Position near the node name
        const nodeRect = nodeElement.getBoundingClientRect();
        picker.style.position = 'fixed';
        picker.style.left = nodeRect.left + 'px';
        picker.style.top = (nodeRect.bottom + 5) + 'px';
        picker.style.zIndex = '10002';
        
        document.body.appendChild(picker);
        
        // Event handlers
        const colorInput = picker.querySelector('.color-input');
        const presetColors = picker.querySelectorAll('.preset-color');
        const applyBtn = picker.querySelector('.btn-apply');
        const resetBtn = picker.querySelector('.btn-reset');
        const cancelBtn = picker.querySelector('.btn-cancel');
        const closeBtn = picker.querySelector('.color-picker-close');
        
        // Preset color selection
        presetColors.forEach(preset => {
            preset.addEventListener('click', () => {
                colorInput.value = preset.dataset.color;
            });
        });
        
        // Apply color change
        const applyColor = () => {
            const newColor = colorInput.value;
            this.updateNodeColor(newColor);
            picker.remove();
        };
        
        // Reset to default
        const resetColor = () => {
            this.resetNodeColor();
            picker.remove();
        };
        
        // Cancel
        const cancelColor = () => {
            picker.remove();
        };
        
        applyBtn.addEventListener('click', applyColor);
        resetBtn.addEventListener('click', resetColor);
        cancelBtn.addEventListener('click', cancelColor);
        closeBtn.addEventListener('click', cancelColor);
        
        // Close on outside click
        document.addEventListener('click', function outsideClick(e) {
            if (!picker.contains(e.target)) {
                picker.remove();
                document.removeEventListener('click', outsideClick);
            }
        });
        
        // Focus color input
        colorInput.focus();
    }

    /**
     * Update individual node color
     */
    updateNodeColor(newColor) {
        // Set custom color for this specific node
        if (this.chart.setNodeCustomColor(this.node.id, newColor)) {
            // Update the color preview in the modal if it exists
            const colorPreview = document.querySelector('#color-preview');
            if (colorPreview) {
                colorPreview.style.backgroundColor = newColor;
            }
            
            // Update the independent color input if it exists
            const independentColorInput = document.querySelector('#independent-color-input');
            if (independentColorInput) {
                independentColorInput.value = newColor;
            }
            
            // Show success message
            this.showSnackbar(`Updated color for node "${this.node.id}"`, 'success');
            
            // Trigger chart re-render to apply new color
            this.chart.render(this.chart.originalData);
        } else {
            this.showSnackbar('Failed to update node color', 'error');
        }
    }

    /**
     * Reset node color to default
     */
    resetNodeColor() {
        if (this.chart.resetNodeColor(this.node.id)) {
            // Update the color preview in the modal if it exists
            const colorPreview = document.querySelector('#color-preview');
            if (colorPreview) {
                colorPreview.style.backgroundColor = this.getCurrentNodeColor();
            }
            
            // Update the independent color input if it exists
            const independentColorInput = document.querySelector('#independent-color-input');
            if (independentColorInput) {
                independentColorInput.value = this.getCurrentNodeColor();
            }
            
            // Show success message
            this.showSnackbar(`Reset color for node "${this.node.id}"`, 'success');
            
            // Trigger chart re-render
            this.chart.render(this.chart.originalData);
        } else {
            this.showSnackbar('Failed to reset node color', 'error');
        }
    }

    /**
     * Update category color
     */
    updateCategoryColor(categoryName, newColor) {
        // Update the category in the chart
        if (this.chart.updateCategoryColor(categoryName, newColor)) {
            // Refresh the category chips to show new color
            const modal = document.getElementById(this.modalId);
            const chipsContainer = modal.querySelector('.md-category-grid');
            chipsContainer.innerHTML = this.renderMaterialCategoryChips();
            
            // Re-setup chip event listeners
            this.setupChipListeners(modal);
            
            // Re-select current category if it was the one we updated
            if (this.selectedCategory === categoryName) {
                this.selectCategory(categoryName);
            }
            
            // Show success message
            this.showSnackbar(`Updated color for "${categoryName}"`, 'success');
            
            // Trigger chart re-render to apply new colors
            this.chart.render(this.chart.originalData);
        } else {
            this.showSnackbar('Failed to update category color', 'error');
        }
    }

    /**
     * Show Material Design snackbar
     */
    showSnackbar(message, type = 'info') {
        // Remove existing snackbar
        const existingSnackbar = document.querySelector('.md-snackbar');
        if (existingSnackbar) {
            existingSnackbar.remove();
        }
        
        const snackbar = document.createElement('div');
        snackbar.className = `md-snackbar md-snackbar-${type}`;
        snackbar.innerHTML = `
            <div class="md-snackbar-content">
                <span class="md-snackbar-text">${message}</span>
            </div>
        `;
        
        document.body.appendChild(snackbar);
        
        // Show animation
        setTimeout(() => snackbar.classList.add('md-snackbar-show'), 100);
        
        // Auto-hide after 4 seconds
        setTimeout(() => {
            snackbar.classList.remove('md-snackbar-show');
            setTimeout(() => snackbar.remove(), 300);
        }, 4000);
    }

    /**
     * Save category assignment or color-only change based on active tab
     */
    save() {
        console.log(`💾 Save clicked - Active tab: ${this.activeTab}`);
        
        if (this.activeTab === 'color') {
            // Color-only tab: Just apply the independent color and close
            console.log(`🎨 Color-only save for node '${this.node.id}' - no category assignment`);
            // Color changes are already applied in real-time via handleColorChange/setIndependentColor
            // No category assignment needed for color-only mode
        } else {
            // Category tab: Handle category assignment
            const categoryToAssign = this.selectedCategory !== undefined ? this.selectedCategory : this.currentCategory;
            
            if (categoryToAssign === undefined || categoryToAssign === null) {
                // No valid category, treat as remove category
                console.log(`🗑️ No category selected for node '${this.node.id}', treating as remove category`);
                this.chart.removeNodeFromCategory(this.node.id);
            } else if (categoryToAssign === '') {
                // Explicitly remove category
                console.log(`🗑️ Removing category from node '${this.node.id}'`);
                this.chart.removeNodeFromCategory(this.node.id);
            } else {
                console.log(`✅ Assigning category '${categoryToAssign}' to node '${this.node.id}'`);
                this.chart.assignNodeToCategory(this.node.id, categoryToAssign);
            }
        }
        
        // Close modal
        this.close();
    }

    /**
     * Show the modal
     */
    showModal() {
        const modal = document.getElementById(this.modalId);
        modal.style.display = 'flex';
        
        // Focus on modal content with animation
        requestAnimationFrame(() => {
            modal.classList.add('md-modal-show');
            setTimeout(() => {
                modal.querySelector('.md-modal-surface').focus();
            }, 150);
        });
    }

    /**
     * Close the modal with animation
     */
    close() {
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.classList.remove('md-modal-show');
            setTimeout(() => {
                // Remove event listeners
                document.removeEventListener('keydown', this.handleKeyDown.bind(this));
                
                // Remove modal from DOM
                modal.remove();
            }, 200);
        }
    }

    /**
     * Apply Material Design CSS styles for the modal
     */
    applyStyles() {
        const existingStyles = document.getElementById('md-category-modal-styles');
        if (existingStyles) return; // Styles already applied
        
        const styles = document.createElement('style');
        styles.id = 'md-category-modal-styles';
        styles.textContent = `
            /* Material Design Modal Backdrop */
            .md-modal-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.32);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                opacity: 0;
                transition: opacity 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
            }
            
            .md-modal-backdrop.md-modal-show {
                opacity: 1;
            }
            
            /* Material Design Modal Surface */
            .md-modal-surface {
                background: #ffffff;
                border-radius: 8px;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
                min-width: 260px;
                max-width: 320px;
                width: auto;
                max-height: 380px;
                overflow: hidden;
                outline: none;
                transform: scale(0.8);
                transition: transform 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
            }
            
            .md-modal-backdrop.md-modal-show .md-modal-surface {
                transform: scale(1);
            }
            
            /* Modal Header */
            .md-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px 8px 16px;
            }
            
            .md-modal-title-container {
                flex: 1;
            }
            
            .md-modal-title {
                margin: 0;
                font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 14px;
                line-height: 18px;
                font-weight: 500;
                color: #1d1b20;
                letter-spacing: 0;
            }
            
            .md-modal-subtitle {
                margin: 1px 0 0 0;
                font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 11px;
                line-height: 14px;
                font-weight: 400;
                color: #49454f;
                letter-spacing: 0.1px;
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
            }
            
            .md-node-name {
                font-weight: 500;
                color: #1d1b20;
            }
            
            .md-current-category {
                display: inline-flex;
                align-items: center;
                gap: 2px;
                padding: 2px 6px;
                border-radius: 8px;
                background-color: var(--category-color);
                color: white;
                font-size: 9px;
                font-weight: 500;
                white-space: nowrap;
            }
            
            .md-no-category {
                font-size: 9px;
                color: #9ca3af;
                font-style: italic;
            }
            
            /* Icon Button */
            .md-icon-button {
                background: none;
                border: none;
                width: 24px;
                height: 24px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                color: #49454f;
                transition: background-color 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
                margin: 0;
            }
            
            .md-icon-button svg {
                width: 16px;
                height: 16px;
            }
            
            .md-icon-button:hover {
                background-color: rgba(73, 69, 79, 0.08);
            }
            
            .md-icon-button:focus {
                outline: none;
                background-color: rgba(73, 69, 79, 0.12);
            }
            
            .md-icon-button:active {
                background-color: rgba(73, 69, 79, 0.16);
            }
            
            /* Modal Content */
            .md-modal-content {
                padding: 0 12px;
                overflow-y: auto;
                max-height: 280px;
            }
            
            /* Sections */
            .md-section {
                margin-bottom: 8px;
            }
            
            .md-section-title {
                margin: 0 0 6px 0;
                font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 12px;
                line-height: 16px;
                font-weight: 500;
                color: #1d1b20;
                letter-spacing: 0.1px;
            }
            
            /* Category Grid - Two Rows Layout */
            .md-category-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
                gap: 4px;
                justify-content: space-between;
            }
            
            /* Category Chips */
            .md-category-chip {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 28px;
                padding: 3px 6px;
                border-radius: 5px;
                background-color: var(--chip-color, #f3f4f6);
                cursor: pointer;
                font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 10px;
                line-height: 12px;
                font-weight: 600;
                color: #ffffff;
                transition: all 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
                user-select: none;
                outline: none;
                border: 2px solid transparent;
                position: relative;
            }
            
            .md-category-chip:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            
            .md-category-chip:focus {
                border-color: #6750a4;
            }
            
            /* Active (Selected) State with Glow */
            .md-category-chip.md-chip-active {
                border-color: #ffffff;
                box-shadow: 0 0 0 3px rgba(103, 80, 164, 0.4), 0 0 20px rgba(103, 80, 164, 0.3);
                transform: scale(1.05);
            }
            
            /* Remove Category Chip */
            .md-remove-chip {
                background-color: #dc3545 !important;
                color: #ffffff;
            }
            
            .md-remove-chip.md-chip-active {
                box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.4), 0 0 20px rgba(220, 53, 69, 0.3);
            }
            
            .md-chip-text {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 100%;
                text-align: center;
                font-size: 10px;
                font-weight: 600;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            }
            
            .md-chip-icon {
                font-size: 12px;
                font-weight: bold;
            }
            
            /* Create Category Section */
            .md-create-section {
                background-color: #f8fafc;
                border-radius: 6px;
                padding: 8px;
                margin: 6px 0 0 0;
            }
            
            .md-create-title {
                font-size: 10px;
                font-weight: 600;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 6px;
            }
            
            .md-create-controls {
                display: flex;
                gap: 6px;
                align-items: center;
                flex: 1;
            }
            
            .md-name-input {
                flex: 1;
                height: 32px;
                padding: 0 10px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 12px;
                color: #1e293b;
                outline: none;
                transition: all 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
                background-color: #ffffff;
            }
            
            .md-name-input:focus {
                border-color: #6750a4;
                box-shadow: 0 0 0 3px rgba(103, 80, 164, 0.1);
            }
            
            
            .md-color-input {
                width: 32px;
                height: 32px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                cursor: pointer;
                background: none;
                transition: all 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
            }
            
            .md-color-input:focus {
                border-color: #6750a4;
                box-shadow: 0 0 0 3px rgba(103, 80, 164, 0.1);
            }
            
            .md-add-btn {
                width: 32px;
                height: 32px;
                border: none;
                border-radius: 6px;
                background-color: #6750a4;
                color: #ffffff;
                cursor: pointer;
                font-size: 16px;
                font-weight: 600;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
                box-shadow: 0 2px 4px rgba(103, 80, 164, 0.2);
            }
            
            .md-add-btn:hover {
                background-color: #5d4e99;
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(103, 80, 164, 0.3);
            }
            
            .md-add-btn:active {
                transform: translateY(0);
            }
            
            /* Material Design Text Field */
            .md-text-field {
                position: relative;
                flex: 1;
                min-width: 80px;
            }
            
            .md-text-field-small {
                flex: 0 0 40px;
            }
            
            .md-text-field-input {
                width: 100%;
                height: 32px;
                padding: 8px 8px 4px 8px;
                border: 1px solid #79747e;
                border-radius: 4px;
                background-color: transparent;
                font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 12px;
                line-height: 16px;
                color: #1d1b20;
                outline: none;
                transition: border-color 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
                box-sizing: border-box;
            }
            
            .md-text-field-input:focus {
                border-color: #6750a4;
                border-width: 2px;
            }
            
            .md-text-field-input:not(:placeholder-shown) + .md-text-field-label,
            .md-text-field-input:focus + .md-text-field-label {
                transform: translateY(-14px) scale(0.75);
                color: #6750a4;
            }
            
            .md-text-field-label {
                position: absolute;
                top: 8px;
                left: 8px;
                font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 12px;
                line-height: 16px;
                color: #49454f;
                pointer-events: none;
                transform-origin: top left;
                transition: all 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
            }
            
            /* Color Field */
            .md-color-field {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
            }
            
            .md-color-input {
                width: 32px;
                height: 32px;
                border: 1px solid #79747e;
                border-radius: 4px;
                cursor: pointer;
                background: none;
                transition: border-color 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
            }
            
            .md-color-input:focus {
                outline: none;
                border-color: #6750a4;
                border-width: 2px;
            }
            
            .md-color-label {
                font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 10px;
                line-height: 12px;
                color: #49454f;
                letter-spacing: 0.4px;
            }
            
            
            /* Modal Actions Layout */
            .md-modal-actions {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                border-top: 1px solid #e2e8f0;
                background-color: #f8fafc;
            }
            
            .md-action-group {
                display: flex;
                gap: 6px;
            }
            
            /* Action Buttons */
            .md-action-btn {
                height: 24px;
                padding: 0 8px;
                border-radius: 4px;
                border: none;
                font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 10px;
                font-weight: 600;
                letter-spacing: 0.1px;
                cursor: pointer;
                transition: all 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
                outline: none;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 50px;
            }
            
            .md-add-node-btn {
                background-color: #0ea5e9;
                color: #ffffff;
                box-shadow: 0 2px 4px rgba(14, 165, 233, 0.2);
            }
            
            .md-add-node-btn:hover {
                background-color: #0284c7;
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(14, 165, 233, 0.3);
            }
            
            .md-cancel-btn {
                background-color: transparent;
                color: #64748b;
                border: 1px solid #cbd5e1;
            }
            
            .md-cancel-btn:hover {
                background-color: #f1f5f9;
                border-color: #94a3b8;
            }
            
            .md-save-btn {
                background-color: #10b981;
                color: #ffffff;
                box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
            }
            
            .md-save-btn:hover {
                background-color: #059669;
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
            }
            
            .md-action-btn:active {
                transform: translateY(0);
            }
            
            /* Material Design Snackbar */
            .md-snackbar {
                position: fixed;
                bottom: 16px;
                left: 50%;
                transform: translateX(-50%) translateY(100px);
                background-color: #323232;
                color: #ffffff;
                padding: 14px 16px;
                border-radius: 4px;
                font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 14px;
                line-height: 20px;
                font-weight: 400;
                letter-spacing: 0.25px;
                box-shadow: 0 3px 5px -1px rgba(0, 0, 0, 0.2),
                           0 6px 10px 0 rgba(0, 0, 0, 0.14),
                           0 1px 18px 0 rgba(0, 0, 0, 0.12);
                z-index: 10001;
                transition: transform 300ms cubic-bezier(0.4, 0.0, 0.2, 1);
                max-width: 344px;
                min-width: 288px;
            }
            
            .md-snackbar.md-snackbar-show {
                transform: translateX(-50%) translateY(0);
            }
            
            .md-snackbar-success {
                background-color: #2e7d32;
            }
            
            .md-snackbar-error {
                background-color: #d32f2f;
            }
            
            .md-snackbar-content {
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            
            .md-snackbar-text {
                flex: 1;
            }
            
            /* Tab Interface Styles */
            .md-tabs {
                display: flex;
                border-bottom: 2px solid #e5e7eb;
                margin-bottom: 16px;
                background-color: #f8fafc;
                border-radius: 8px 8px 0 0;
                padding: 4px;
                gap: 2px;
            }
            
            .md-tab-btn {
                flex: 1;
                padding: 8px 16px;
                border: none;
                background: transparent;
                color: #64748b;
                font-size: 12px;
                font-weight: 500;
                border-radius: 6px;
                cursor: pointer;
                transition: all 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
            }
            
            .md-tab-btn:hover {
                background-color: #e2e8f0;
                color: #475569;
            }
            
            .md-tab-btn.active {
                background-color: #6750a4;
                color: #ffffff;
                box-shadow: 0 2px 4px rgba(103, 80, 164, 0.2);
            }
            
            .md-tab-content {
                display: none;
            }
            
            .md-tab-content.active {
                display: block;
            }
            
            /* Color-only mode specific styles */
            .md-color-section {
                display: flex;
                flex-direction: column;
                gap: 12px;
                align-items: center;
                padding: 16px;
                background-color: #f8fafc;
                border-radius: 8px;
                margin-bottom: 16px;
            }
            
            .md-color-preview-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
            }
            
            .md-color-preview {
                width: 48px;
                height: 48px;
                border-radius: 8px;
                border: 2px solid #e2e8f0;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .md-color-label {
                font-size: 12px;
                color: #64748b;
                font-weight: 500;
            }
            
            .md-color-picker {
                width: 100%;
                height: 36px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                cursor: pointer;
                background: none;
            }
            
            .md-color-reset-btn {
                padding: 6px 12px;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                background-color: #ffffff;
                color: #64748b;
                font-size: 11px;
                cursor: pointer;
                transition: all 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
            }
            
            .md-color-reset-btn:hover {
                background-color: #f1f5f9;
                border-color: #94a3b8;
            }
            
            .md-color-presets {
                margin-top: 8px;
            }
            
            .md-presets-title {
                font-size: 11px;
                font-weight: 600;
                color: #64748b;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 8px;
                text-align: center;
            }
            
            .md-preset-colors {
                display: grid;
                grid-template-columns: repeat(6, 1fr);
                gap: 6px;
                justify-items: center;
            }
            
            .md-preset-color {
                width: 24px;
                height: 24px;
                border-radius: 4px;
                border: 1px solid rgba(0, 0, 0, 0.1);
                cursor: pointer;
                transition: all 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
            }
            
            .md-preset-color:hover {
                transform: scale(1.1);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                border-color: #6750a4;
            }
            
            /* Category Color Picker Popup */
            .category-color-picker {
                position: fixed;
                background: white;
                border-radius: 8px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                border: 1px solid #e2e8f0;
                z-index: 10001;
                min-width: 240px;
                animation: colorPickerFadeIn 0.2s ease-out;
            }
            
            @keyframes colorPickerFadeIn {
                from { opacity: 0; transform: scale(0.9) translateY(-5px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }
            
            .color-picker-content {
                padding: 0;
            }
            
            .color-picker-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid #e2e8f0;
                background: #f8fafc;
            }
            
            .color-picker-title {
                font-size: 14px;
                font-weight: 600;
                color: #374151;
            }
            
            .color-picker-close {
                background: none;
                border: none;
                font-size: 18px;
                color: #6b7280;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: background-color 0.2s;
            }
            
            .color-picker-close:hover {
                background: #e5e7eb;
                color: #374151;
            }
            
            .color-picker-body {
                padding: 16px;
            }
            
            .color-input {
                width: 100%;
                height: 40px;
                border: 2px solid #e2e8f0;
                border-radius: 6px;
                cursor: pointer;
                margin-bottom: 12px;
                transition: border-color 0.2s;
            }
            
            .color-input:hover {
                border-color: #6366f1;
            }
            
            .color-presets {
                margin-bottom: 16px;
            }
            
            .color-presets {
                display: grid;
                grid-template-columns: repeat(6, 1fr);
                gap: 8px;
                margin-bottom: 16px;
            }
            
            .preset-color {
                width: 28px;
                height: 28px;
                border-radius: 50%;
                cursor: pointer;
                border: 2px solid #e2e8f0;
                transition: all 0.2s;
            }
            
            .preset-color:hover {
                transform: scale(1.1);
                border-color: #6366f1;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            }
            
            .color-picker-actions {
                display: flex;
                gap: 8px;
                justify-content: flex-end;
            }
            
            .btn-apply, .btn-cancel {
                padding: 8px 16px;
                border-radius: 6px;
                border: none;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .btn-apply {
                background: #6366f1;
                color: white;
            }
            
            .btn-apply:hover {
                background: #5855eb;
                transform: translateY(-1px);
            }
            
            .btn-cancel {
                background: #f3f4f6;
                color: #374151;
            }
            
            .btn-cancel:hover {
                background: #e5e7eb;
            }
            
            /* Node Color Picker Popup */
            .node-color-picker {
                position: fixed;
                background: white;
                border-radius: 8px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                border: 1px solid #e2e8f0;
                z-index: 10002;
                min-width: 260px;
                animation: colorPickerFadeIn 0.2s ease-out;
            }
            
            /* Make node name interactive */
            .md-node-name {
                transition: color 0.2s ease;
            }
            
            .md-node-name:hover {
                color: #6366f1;
                text-decoration: underline;
            }
        `;
        
        document.head.appendChild(styles);
    }

    /**
     * Switch between category and color tabs
     */
    switchTab(tabName) {
        const modal = document.getElementById(this.modalId);
        
        // Update tab buttons
        modal.querySelectorAll('.md-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        modal.querySelector(`#tab-${tabName}`).classList.add('active');
        
        // Update tab content
        modal.querySelectorAll('.md-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        modal.querySelector(`#content-${tabName}`).classList.add('active');
        
        this.activeTab = tabName;
        console.log(`🔄 Switched to ${tabName} tab`);
    }

    /**
     * Handle color change from the independent color picker
     */
    handleColorChange(color) {
        // Update the color preview
        const preview = document.querySelector('#color-preview');
        if (preview) {
            preview.style.backgroundColor = color;
        }
        
        // Update the color input
        const colorInput = document.querySelector('#independent-color-input');
        if (colorInput) {
            colorInput.value = color;
        }
        
        // Apply the color to the node
        this.setIndependentColor(color);
    }

    /**
     * Set independent color for the node
     */
    setIndependentColor(color) {
        if (this.chart.setIndependentNodeColor) {
            this.chart.setIndependentNodeColor(this.node.id, color);
            console.log(`🎨 Set independent color for node ${this.node.id}: ${color}`);
        }
        
        // Update the color preview and input
        const preview = document.querySelector('#color-preview');
        const colorInput = document.querySelector('#independent-color-input');
        
        if (preview) {
            preview.style.backgroundColor = color;
        }
        if (colorInput) {
            colorInput.value = color;
        }
    }

    /**
     * Reset node color to default
     */
    resetNodeColor() {
        if (this.chart.removeIndependentNodeColor) {
            this.chart.removeIndependentNodeColor(this.node.id);
            console.log(`🔄 Reset color for node ${this.node.id}`);
        }
        
        // Update the UI with the new default color
        const newColor = this.getCurrentNodeColor();
        this.handleColorChange(newColor);
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CategoryAssignmentModal;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.CategoryAssignmentModal = CategoryAssignmentModal;
}