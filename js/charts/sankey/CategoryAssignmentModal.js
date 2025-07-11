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
                        <div class="md-section">
                            <h3 class="md-section-title">Categories</h3>
                            <div class="md-category-grid">
                                ${this.renderMaterialCategoryChips()}
                            </div>
                        </div>
                        
                        <div class="md-section md-create-section">
                            <div class="md-create-header">
                                <span class="md-create-title">Create Category</span>
                                <div class="md-create-controls">
                                    <input type="text" id="category-name-input" class="md-name-input" placeholder="Name" maxlength="20">
                                    <input type="text" id="category-icon-input" class="md-icon-input" placeholder="📊" maxlength="2" value="📊">
                                    <input type="color" id="category-color-input" class="md-color-input" value="#1e40af">
                                    <button id="category-create-btn" class="md-add-btn" type="button">+</button>
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
                <span class="md-chip-text">None</span>
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
        
        // Setup chip listeners
        this.setupChipListeners(modal);
        
        // Custom category creation
        modal.querySelector('#category-create-btn').addEventListener('click', () => this.createCustomCategory());
        
        // Enter key support for text inputs
        modal.querySelector('#category-name-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.createCustomCategory();
            }
        });
        
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
        const iconInput = modal.querySelector('#category-icon-input');
        
        const name = nameInput.value.trim();
        const color = colorInput.value;
        const icon = iconInput.value.trim() || '📊';
        
        if (!name) {
            this.showSnackbar('Please enter a category name', 'error');
            nameInput.focus();
            return;
        }
        
        // Create the category
        if (this.chart.createCustomCategory(name, color, icon)) {
            // Clear form
            nameInput.value = '';
            iconInput.value = '📊';
            
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
            chip.addEventListener('click', (e) => {
                const categoryName = e.currentTarget.dataset.category;
                this.selectCategory(categoryName);
            });
            
            // Keyboard support
            chip.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const categoryName = e.currentTarget.dataset.category;
                    this.selectCategory(categoryName);
                }
            });
        });
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
     * Save category assignment
     */
    save() {
        // If no category was explicitly selected, use the current selection
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
                min-width: 280px;
                max-width: 360px;
                width: auto;
                max-height: 420px;
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
                padding: 0 16px;
                overflow-y: auto;
                max-height: 300px;
            }
            
            /* Sections */
            .md-section {
                margin-bottom: 12px;
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
                grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
                gap: 6px;
                justify-content: space-between;
            }
            
            /* Category Chips */
            .md-category-chip {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 32px;
                padding: 4px 8px;
                border-radius: 6px;
                background-color: var(--chip-color, #f3f4f6);
                cursor: pointer;
                font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 11px;
                line-height: 14px;
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
                font-size: 11px;
                font-weight: 600;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
            }
            
            /* Create Category Section */
            .md-create-section {
                background-color: #f8fafc;
                border-radius: 8px;
                padding: 12px;
                margin: 4px 0;
            }
            
            .md-create-header {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .md-create-title {
                font-size: 11px;
                font-weight: 600;
                color: #64748b;
                min-width: 80px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
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
            
            .md-icon-input {
                width: 40px;
                height: 32px;
                padding: 0;
                border: 1px solid #cbd5e1;
                border-radius: 6px;
                font-size: 14px;
                text-align: center;
                outline: none;
                transition: all 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
                background-color: #ffffff;
            }
            
            .md-icon-input:focus {
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
                padding: 12px 16px;
                border-top: 1px solid #e2e8f0;
                background-color: #f8fafc;
            }
            
            .md-action-group {
                display: flex;
                gap: 6px;
            }
            
            /* Action Buttons */
            .md-action-btn {
                height: 28px;
                padding: 0 12px;
                border-radius: 6px;
                border: none;
                font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 11px;
                font-weight: 600;
                letter-spacing: 0.1px;
                cursor: pointer;
                transition: all 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
                outline: none;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 60px;
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
        `;
        
        document.head.appendChild(styles);
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