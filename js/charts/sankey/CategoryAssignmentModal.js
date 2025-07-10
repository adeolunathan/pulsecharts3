/* ===== CATEGORY ASSIGNMENT MODAL ===== */
/* Modal component for assigning categories to Sankey chart nodes */

class CategoryAssignmentModal {
    constructor(chart, node) {
        this.chart = chart;
        this.node = node;
        this.modalId = `category-modal-${Date.now()}`;
        this.currentCategory = this.chart.getCategoryForNode(this.node.id);
        this.similarNodes = this.findSimilarNodes();
        
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
                            <div class="md-modal-subtitle">${this.node.id}</div>
                        </div>
                        <button class="md-icon-button md-modal-close" aria-label="Close" type="button">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="md-modal-content">
                        <div class="md-section">
                            <h3 class="md-section-title">Available Categories</h3>
                            <div class="md-chips-container">
                                ${this.renderMaterialCategoryChips()}
                            </div>
                        </div>
                        
                        <div class="md-section">
                            <h3 class="md-section-title">Create New Category</h3>
                            <div class="md-form-row">
                                <div class="md-text-field">
                                    <input type="text" id="category-name-input" class="md-text-field-input" placeholder=" " maxlength="30">
                                    <label for="category-name-input" class="md-text-field-label">Category name</label>
                                </div>
                                <div class="md-color-field">
                                    <input type="color" id="category-color-input" class="md-color-input" value="#1e40af">
                                    <label class="md-color-label">Color</label>
                                </div>
                                <div class="md-text-field md-text-field-small">
                                    <input type="text" id="category-icon-input" class="md-text-field-input" placeholder=" " maxlength="2" value="📊">
                                    <label for="category-icon-input" class="md-text-field-label">Icon</label>
                                </div>
                                <button id="category-create-btn" class="md-button md-button-outlined" type="button">
                                    <span>Create</span>
                                </button>
                            </div>
                        </div>
                        
                        <div class="md-section">
                            <label class="md-checkbox-container">
                                <input type="checkbox" id="category-apply-similar" class="md-checkbox-input" ${this.similarNodes.length > 0 ? '' : 'disabled'}>
                                <div class="md-checkbox-box">
                                    <svg class="md-checkbox-checkmark" width="18" height="18" viewBox="0 0 18 18">
                                        <path d="M6.61 11.89L3.5 8.78 2.44 9.84 6.61 14.01 15.56 5.06 14.5 4z" fill="currentColor"/>
                                    </svg>
                                </div>
                                <span class="md-checkbox-label">Apply to similar nodes (${this.similarNodes.length} found)</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="md-modal-actions">
                        <button class="md-button md-button-text" id="category-cancel-btn" type="button">
                            <span>Cancel</span>
                        </button>
                        <button class="md-button md-button-filled" id="category-save-btn" type="button">
                            <span>Save</span>
                        </button>
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
        
        // Add "Remove Category" option with trash icon
        chipsHTML += `
            <div class="md-chip md-chip-remove" data-category="" role="button" tabindex="0" aria-label="Remove category">
                <svg class="md-chip-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
                <span class="md-chip-text">Remove</span>
            </div>
        `;
        
        // Add all available categories
        for (const [name, category] of Object.entries(allCategories)) {
            const isSelected = this.currentCategory === name;
            chipsHTML += `
                <div class="md-chip ${isSelected ? 'md-chip-selected' : ''}" 
                     data-category="${name}" 
                     role="button" 
                     tabindex="0" 
                     aria-label="Select ${name} category"
                     style="--chip-color: ${category.color}">
                    <span class="md-chip-icon">${category.icon}</span>
                    <span class="md-chip-text">${name}</span>
                </div>
            `;
        }
        
        return chipsHTML;
    }

    /**
     * Find nodes with similar names for bulk assignment
     */
    findSimilarNodes() {
        if (!this.chart.data || !this.chart.data.nodes) return [];
        
        const currentNodeName = this.node.id.toLowerCase();
        const similarNodes = [];
        
        this.chart.data.nodes.forEach(node => {
            if (node.id !== this.node.id) {
                const nodeName = node.id.toLowerCase();
                
                // Check for similar words (basic similarity)
                const currentWords = currentNodeName.split(/\s+/);
                const nodeWords = nodeName.split(/\s+/);
                
                const commonWords = currentWords.filter(word => 
                    nodeWords.some(nodeWord => 
                        nodeWord.includes(word) || word.includes(nodeWord)
                    )
                );
                
                // If more than 50% of words are similar, consider it similar
                if (commonWords.length > 0 && commonWords.length / currentWords.length > 0.5) {
                    similarNodes.push(node);
                }
            }
        });
        
        return similarNodes;
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
        modal.querySelectorAll('.md-chip').forEach(chip => {
            chip.classList.remove('md-chip-selected');
        });
        
        // Add selection to clicked chip
        const selectedChip = modal.querySelector(`[data-category="${categoryName}"]`);
        if (selectedChip) {
            selectedChip.classList.add('md-chip-selected');
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
            const chipsContainer = modal.querySelector('.md-chips-container');
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
        modal.querySelectorAll('.md-chip').forEach(chip => {
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
        const modal = document.getElementById(this.modalId);
        const applySimilar = modal.querySelector('#category-apply-similar').checked;
        
        if (this.selectedCategory === undefined) {
            // No category selected, do nothing
            this.close();
            return;
        }
        
        // Assign category to current node
        if (this.selectedCategory === '') {
            // Remove category
            this.chart.removeNodeFromCategory(this.node.id);
        } else {
            this.chart.assignNodeToCategory(this.node.id, this.selectedCategory);
        }
        
        // Apply to similar nodes if requested
        if (applySimilar && this.similarNodes.length > 0) {
            this.similarNodes.forEach(node => {
                if (this.selectedCategory === '') {
                    this.chart.removeNodeFromCategory(node.id);
                } else {
                    this.chart.assignNodeToCategory(node.id, this.selectedCategory);
                }
            });
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
                border-radius: 28px;
                box-shadow: 0 24px 38px 3px rgba(0, 0, 0, 0.14),
                           0 9px 46px 8px rgba(0, 0, 0, 0.12),
                           0 11px 15px -7px rgba(0, 0, 0, 0.20);
                min-width: 280px;
                max-width: 720px;
                width: 90vw;
                max-height: 90vh;
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
                align-items: flex-start;
                justify-content: space-between;
                padding: 24px 24px 16px 24px;
            }
            
            .md-modal-title-container {
                flex: 1;
            }
            
            .md-modal-title {
                margin: 0;
                font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 24px;
                line-height: 32px;
                font-weight: 400;
                color: #1d1b20;
                letter-spacing: 0;
            }
            
            .md-modal-subtitle {
                margin: 2px 0 0 0;
                font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 14px;
                line-height: 20px;
                font-weight: 500;
                color: #49454f;
                letter-spacing: 0.1px;
            }
            
            /* Icon Button */
            .md-icon-button {
                background: none;
                border: none;
                width: 48px;
                height: 48px;
                border-radius: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                color: #49454f;
                transition: background-color 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
                margin: -12px -12px 0 0;
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
                padding: 0 24px;
                overflow-y: auto;
                max-height: calc(90vh - 200px);
            }
            
            /* Sections */
            .md-section {
                margin-bottom: 32px;
            }
            
            .md-section-title {
                margin: 0 0 16px 0;
                font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 16px;
                line-height: 24px;
                font-weight: 500;
                color: #1d1b20;
                letter-spacing: 0.1px;
            }
            
            /* Material Design Chips */
            .md-chips-container {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            
            .md-chip {
                display: inline-flex;
                align-items: center;
                height: 32px;
                padding: 0 16px;
                border-radius: 8px;
                border: 1px solid #79747e;
                background-color: transparent;
                cursor: pointer;
                font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 14px;
                line-height: 20px;
                font-weight: 500;
                letter-spacing: 0.1px;
                color: #1d1b20;
                transition: all 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
                user-select: none;
                outline: none;
            }
            
            .md-chip:hover {
                background-color: rgba(29, 27, 32, 0.08);
            }
            
            .md-chip:focus {
                border-color: #6750a4;
                background-color: rgba(103, 80, 164, 0.12);
            }
            
            .md-chip.md-chip-selected {
                background-color: #e8def8;
                border-color: #6750a4;
                color: #21005d;
            }
            
            .md-chip.md-chip-remove {
                border-color: #ba1a1a;
                color: #ba1a1a;
            }
            
            .md-chip.md-chip-remove:hover {
                background-color: rgba(186, 26, 26, 0.08);
            }
            
            .md-chip.md-chip-remove.md-chip-selected {
                background-color: #ffdad6;
                color: #410002;
            }
            
            .md-chip:not(.md-chip-remove) {
                background-color: var(--chip-color, #e8def8);
                border-color: var(--chip-color, #6750a4);
                color: #ffffff;
            }
            
            .md-chip:not(.md-chip-remove):hover {
                filter: brightness(1.1);
            }
            
            .md-chip-icon {
                margin-right: 8px;
                flex-shrink: 0;
            }
            
            .md-chip-text {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 120px;
            }
            
            /* Form Row */
            .md-form-row {
                display: flex;
                gap: 16px;
                align-items: flex-end;
                flex-wrap: wrap;
            }
            
            /* Material Design Text Field */
            .md-text-field {
                position: relative;
                flex: 1;
                min-width: 120px;
            }
            
            .md-text-field-small {
                flex: 0 0 80px;
            }
            
            .md-text-field-input {
                width: 100%;
                height: 56px;
                padding: 16px 16px 8px 16px;
                border: 1px solid #79747e;
                border-radius: 4px;
                background-color: transparent;
                font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 16px;
                line-height: 24px;
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
                transform: translateY(-24px) scale(0.75);
                color: #6750a4;
            }
            
            .md-text-field-label {
                position: absolute;
                top: 16px;
                left: 16px;
                font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 16px;
                line-height: 24px;
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
                gap: 8px;
            }
            
            .md-color-input {
                width: 56px;
                height: 56px;
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
                font-size: 12px;
                line-height: 16px;
                color: #49454f;
                letter-spacing: 0.4px;
            }
            
            /* Checkbox */
            .md-checkbox-container {
                display: flex;
                align-items: center;
                gap: 16px;
                cursor: pointer;
                min-height: 48px;
            }
            
            .md-checkbox-input {
                position: absolute;
                opacity: 0;
                width: 0;
                height: 0;
            }
            
            .md-checkbox-box {
                position: relative;
                width: 18px;
                height: 18px;
                border: 2px solid #79747e;
                border-radius: 2px;
                transition: all 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
            }
            
            .md-checkbox-input:checked + .md-checkbox-box {
                background-color: #6750a4;
                border-color: #6750a4;
            }
            
            .md-checkbox-input:disabled + .md-checkbox-box {
                border-color: #c7c5ca;
            }
            
            .md-checkbox-checkmark {
                position: absolute;
                top: -2px;
                left: -2px;
                opacity: 0;
                color: #ffffff;
                transition: opacity 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
            }
            
            .md-checkbox-input:checked + .md-checkbox-box .md-checkbox-checkmark {
                opacity: 1;
            }
            
            .md-checkbox-label {
                font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 14px;
                line-height: 20px;
                color: #1d1b20;
                letter-spacing: 0.25px;
            }
            
            /* Modal Actions */
            .md-modal-actions {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                padding: 16px 24px 24px 24px;
            }
            
            /* Material Design Buttons */
            .md-button {
                height: 40px;
                padding: 0 24px;
                border-radius: 20px;
                border: none;
                font-family: 'Roboto', -apple-system, BlinkMacSystemFont, sans-serif;
                font-size: 14px;
                line-height: 20px;
                font-weight: 500;
                letter-spacing: 0.1px;
                cursor: pointer;
                transition: all 200ms cubic-bezier(0.4, 0.0, 0.2, 1);
                outline: none;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 64px;
            }
            
            .md-button-text {
                background-color: transparent;
                color: #6750a4;
            }
            
            .md-button-text:hover {
                background-color: rgba(103, 80, 164, 0.08);
            }
            
            .md-button-text:focus {
                background-color: rgba(103, 80, 164, 0.12);
            }
            
            .md-button-text:active {
                background-color: rgba(103, 80, 164, 0.16);
            }
            
            .md-button-outlined {
                background-color: transparent;
                color: #6750a4;
                border: 1px solid #79747e;
            }
            
            .md-button-outlined:hover {
                background-color: rgba(103, 80, 164, 0.08);
                border-color: #6750a4;
            }
            
            .md-button-outlined:focus {
                background-color: rgba(103, 80, 164, 0.12);
                border-color: #6750a4;
            }
            
            .md-button-filled {
                background-color: #6750a4;
                color: #ffffff;
            }
            
            .md-button-filled:hover {
                background-color: #5d4e99;
                box-shadow: 0 1px 3px 1px rgba(0, 0, 0, 0.15);
            }
            
            .md-button-filled:focus {
                background-color: #5d4e99;
                box-shadow: 0 1px 3px 1px rgba(0, 0, 0, 0.15);
            }
            
            .md-button-filled:active {
                background-color: #4c4289;
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