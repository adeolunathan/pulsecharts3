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
     * Create the modal HTML structure
     */
    createModal() {
        const modalHTML = `
            <div class="category-modal-overlay" id="${this.modalId}">
                <div class="category-modal-content">
                    <div class="category-modal-header">
                        <h3>Assign Category</h3>
                        <button class="category-modal-close" aria-label="Close modal">×</button>
                    </div>
                    
                    <div class="category-modal-body">
                        <div class="category-node-info">
                            <div class="category-node-name">${this.node.id}</div>
                            <div class="category-current-status">
                                Current category: ${this.currentCategory ? 
                                    `<span class="category-pill" style="background-color: ${this.getCategoryColor(this.currentCategory)}">${this.getCategoryIcon(this.currentCategory)} ${this.currentCategory}</span>` : 
                                    '<span class="category-none">No category assigned</span>'
                                }
                            </div>
                        </div>
                        
                        <div class="category-selection-section">
                            <h4>Select Category</h4>
                            <div class="category-pills-container">
                                ${this.renderCategoryPills()}
                            </div>
                        </div>
                        
                        <div class="category-custom-section">
                            <h4>Create New Category</h4>
                            <div class="category-custom-form">
                                <input type="text" id="category-custom-name" placeholder="Category name" maxlength="30">
                                <input type="color" id="category-custom-color" value="#1e40af">
                                <input type="text" id="category-custom-icon" placeholder="📊" maxlength="2">
                                <button id="category-create-btn" class="category-btn-secondary">Create</button>
                            </div>
                        </div>
                        
                        <div class="category-options-section">
                            <label class="category-checkbox-label">
                                <input type="checkbox" id="category-apply-similar" ${this.similarNodes.length > 0 ? '' : 'disabled'}>
                                Apply to similar nodes (${this.similarNodes.length} found)
                            </label>
                        </div>
                    </div>
                    
                    <div class="category-modal-footer">
                        <button class="category-btn-secondary" id="category-cancel-btn">Cancel</button>
                        <button class="category-btn-primary" id="category-save-btn">Save</button>
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
     * Render category pills for selection
     */
    renderCategoryPills() {
        const allCategories = this.chart.getAllCategories();
        let pillsHTML = '';
        
        // Add "Remove Category" option
        pillsHTML += `
            <div class="category-pill category-pill-remove" data-category="">
                🚫 Remove Category
            </div>
        `;
        
        // Add all available categories
        for (const [name, category] of Object.entries(allCategories)) {
            const isSelected = this.currentCategory === name;
            pillsHTML += `
                <div class="category-pill ${isSelected ? 'category-pill-selected' : ''}" 
                     data-category="${name}" 
                     style="background-color: ${category.color}">
                    ${category.icon} ${name}
                </div>
            `;
        }
        
        return pillsHTML;
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
        modal.querySelector('.category-modal-close').addEventListener('click', () => this.close());
        modal.querySelector('#category-cancel-btn').addEventListener('click', () => this.close());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });
        
        // Keyboard events
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Category pill selection
        modal.querySelectorAll('.category-pill').forEach(pill => {
            pill.addEventListener('click', (e) => {
                const categoryName = e.target.dataset.category;
                this.selectCategory(categoryName);
            });
        });
        
        // Custom category creation
        modal.querySelector('#category-create-btn').addEventListener('click', () => this.createCustomCategory());
        
        // Save button
        modal.querySelector('#category-save-btn').addEventListener('click', () => this.save());
        
        // Focus management
        modal.querySelector('.category-modal-content').focus();
    }

    /**
     * Handle keyboard events
     */
    handleKeyDown(e) {
        if (e.key === 'Escape') {
            this.close();
        } else if (e.key === 'Enter' && e.target.id === 'category-custom-name') {
            this.createCustomCategory();
        }
    }

    /**
     * Select a category
     */
    selectCategory(categoryName) {
        const modal = document.getElementById(this.modalId);
        
        // Remove previous selection
        modal.querySelectorAll('.category-pill').forEach(pill => {
            pill.classList.remove('category-pill-selected');
        });
        
        // Add selection to clicked pill
        const selectedPill = modal.querySelector(`[data-category="${categoryName}"]`);
        if (selectedPill) {
            selectedPill.classList.add('category-pill-selected');
        }
        
        this.selectedCategory = categoryName;
    }

    /**
     * Create a custom category
     */
    createCustomCategory() {
        const modal = document.getElementById(this.modalId);
        const nameInput = modal.querySelector('#category-custom-name');
        const colorInput = modal.querySelector('#category-custom-color');
        const iconInput = modal.querySelector('#category-custom-icon');
        
        const name = nameInput.value.trim();
        const color = colorInput.value;
        const icon = iconInput.value.trim() || '📊';
        
        if (!name) {
            alert('Please enter a category name');
            nameInput.focus();
            return;
        }
        
        // Create the category
        if (this.chart.createCustomCategory(name, color, icon)) {
            // Clear form
            nameInput.value = '';
            iconInput.value = '';
            
            // Refresh category pills
            const pillsContainer = modal.querySelector('.category-pills-container');
            pillsContainer.innerHTML = this.renderCategoryPills();
            
            // Re-setup pill event listeners
            pillsContainer.querySelectorAll('.category-pill').forEach(pill => {
                pill.addEventListener('click', (e) => {
                    const categoryName = e.target.dataset.category;
                    this.selectCategory(categoryName);
                });
            });
            
            // Auto-select the new category
            this.selectCategory(name);
            
            // Show success message
            this.showMessage(`Category "${name}" created successfully!`, 'success');
        } else {
            this.showMessage('Failed to create category. Name may already exist.', 'error');
        }
    }

    /**
     * Show a temporary message
     */
    showMessage(message, type) {
        const modal = document.getElementById(this.modalId);
        const existingMessage = modal.querySelector('.category-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `category-message category-message-${type}`;
        messageDiv.textContent = message;
        
        modal.querySelector('.category-modal-body').insertBefore(messageDiv, modal.querySelector('.category-modal-body').firstChild);
        
        // Remove message after 3 seconds
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
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
            this.chart.categoryManager.nodeCategories.delete(this.node.id);
        } else {
            this.chart.assignNodeToCategory(this.node.id, this.selectedCategory);
        }
        
        // Apply to similar nodes if requested
        if (applySimilar && this.similarNodes.length > 0) {
            this.similarNodes.forEach(node => {
                if (this.selectedCategory === '') {
                    this.chart.categoryManager.nodeCategories.delete(node.id);
                } else {
                    this.chart.assignNodeToCategory(node.id, this.selectedCategory);
                }
            });
        }
        
        // Re-render chart to show changes
        if (this.chart.render && this.chart.data) {
            this.chart.render(this.chart.data);
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
        
        // Focus on modal content
        setTimeout(() => {
            modal.querySelector('.category-modal-content').focus();
        }, 100);
    }

    /**
     * Close the modal
     */
    close() {
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
        
        // Remove modal from DOM
        const modal = document.getElementById(this.modalId);
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Apply CSS styles for the modal
     */
    applyStyles() {
        const existingStyles = document.getElementById('category-modal-styles');
        if (existingStyles) return; // Styles already applied
        
        const styles = document.createElement('style');
        styles.id = 'category-modal-styles';
        styles.textContent = `
            .category-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
            }
            
            .category-modal-content {
                background: white;
                border-radius: 8px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                min-width: 500px;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                outline: none;
            }
            
            .category-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #e5e7eb;
            }
            
            .category-modal-header h3 {
                margin: 0;
                font-size: 20px;
                color: #1f2937;
            }
            
            .category-modal-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #6b7280;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
            }
            
            .category-modal-close:hover {
                background-color: #f3f4f6;
                color: #374151;
            }
            
            .category-modal-body {
                padding: 20px;
            }
            
            .category-node-info {
                margin-bottom: 20px;
                padding: 15px;
                background-color: #f9fafb;
                border-radius: 6px;
            }
            
            .category-node-name {
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 8px;
            }
            
            .category-current-status {
                font-size: 14px;
                color: #6b7280;
            }
            
            .category-pill {
                display: inline-block;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
                color: white;
                margin: 2px;
            }
            
            .category-none {
                color: #6b7280;
                font-style: italic;
            }
            
            .category-selection-section {
                margin-bottom: 20px;
            }
            
            .category-selection-section h4 {
                margin: 0 0 10px 0;
                font-size: 16px;
                color: #1f2937;
            }
            
            .category-pills-container {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            
            .category-pills-container .category-pill {
                cursor: pointer;
                padding: 8px 12px;
                border: 2px solid transparent;
                transition: all 0.2s;
            }
            
            .category-pills-container .category-pill:hover {
                transform: scale(1.05);
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            }
            
            .category-pill-selected {
                border-color: #1f2937 !important;
                box-shadow: 0 0 0 2px rgba(31, 41, 55, 0.2);
            }
            
            .category-pill-remove {
                background-color: #6b7280 !important;
            }
            
            .category-custom-section {
                margin-bottom: 20px;
                padding: 15px;
                background-color: #f9fafb;
                border-radius: 6px;
            }
            
            .category-custom-section h4 {
                margin: 0 0 10px 0;
                font-size: 16px;
                color: #1f2937;
            }
            
            .category-custom-form {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            
            .category-custom-form input[type="text"] {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid #d1d5db;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .category-custom-form input[type="color"] {
                width: 40px;
                height: 36px;
                border: 1px solid #d1d5db;
                border-radius: 4px;
                cursor: pointer;
            }
            
            .category-custom-form input[type="text"]:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
            }
            
            .category-options-section {
                margin-bottom: 20px;
            }
            
            .category-checkbox-label {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 14px;
                color: #374151;
                cursor: pointer;
            }
            
            .category-checkbox-label input[type="checkbox"] {
                width: 16px;
                height: 16px;
            }
            
            .category-modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                padding: 20px;
                border-top: 1px solid #e5e7eb;
            }
            
            .category-btn-primary {
                background-color: #3b82f6;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                font-weight: 500;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .category-btn-primary:hover {
                background-color: #2563eb;
            }
            
            .category-btn-secondary {
                background-color: #f3f4f6;
                color: #374151;
                border: 1px solid #d1d5db;
                padding: 10px 20px;
                border-radius: 6px;
                font-weight: 500;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            
            .category-btn-secondary:hover {
                background-color: #e5e7eb;
            }
            
            .category-message {
                padding: 10px;
                border-radius: 4px;
                margin-bottom: 15px;
                font-size: 14px;
            }
            
            .category-message-success {
                background-color: #dcfce7;
                color: #166534;
                border: 1px solid #bbf7d0;
            }
            
            .category-message-error {
                background-color: #fef2f2;
                color: #dc2626;
                border: 1px solid #fecaca;
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