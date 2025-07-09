/* ===== CONTEXT MENU COMPONENT ===== */
/* Reusable context menu system with positioning and keyboard navigation */

class ContextMenu {
    constructor(options = {}) {
        this.options = {
            className: 'pulse-context-menu',
            closeOnOutsideClick: true,
            closeOnEscape: true,
            showIcons: true,
            ...options
        };
        
        this.element = null;
        this.isVisible = false;
        this.menuItems = [];
        this.activeIndex = -1;
        this.callbacks = {
            onShow: null,
            onHide: null,
            onItemClick: null
        };
        
        this.boundHandlers = {
            handleOutsideClick: this.handleOutsideClick.bind(this),
            handleKeyDown: this.handleKeyDown.bind(this),
            handleItemClick: this.handleItemClick.bind(this)
        };
        
        this.init();
    }
    
    init() {
        this.createMenuElement();
        this.bindEvents();
    }
    
    createMenuElement() {
        this.element = document.createElement('div');
        this.element.className = this.options.className;
        this.element.style.cssText = `
            position: fixed;
            z-index: 10000;
            background: white;
            border: 1px solid #ddd;
            border-radius: 6px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            min-width: 180px;
            max-width: 300px;
            opacity: 0;
            transform: scale(0.95);
            transition: all 0.15s ease;
            pointer-events: none;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            padding: 4px 0;
        `;
        
        document.body.appendChild(this.element);
    }
    
    bindEvents() {
        if (this.options.closeOnOutsideClick) {
            document.addEventListener('click', this.boundHandlers.handleOutsideClick);
        }
        
        if (this.options.closeOnEscape) {
            document.addEventListener('keydown', this.boundHandlers.handleKeyDown);
        }
    }
    
    addItem(label, action, options = {}) {
        const item = {
            label,
            action,
            icon: options.icon || null,
            disabled: options.disabled || false,
            separator: options.separator || false,
            submenu: options.submenu || null,
            id: options.id || `item-${this.menuItems.length}`
        };
        
        this.menuItems.push(item);
        return this;
    }
    
    addSeparator() {
        this.menuItems.push({
            separator: true,
            id: `separator-${this.menuItems.length}`
        });
        return this;
    }
    
    clear() {
        this.menuItems = [];
        this.activeIndex = -1;
        return this;
    }
    
    show(x, y) {
        if (this.isVisible) {
            this.hide();
        }
        
        this.render();
        this.position(x, y);
        
        this.element.style.opacity = '1';
        this.element.style.transform = 'scale(1)';
        this.element.style.pointerEvents = 'auto';
        
        this.isVisible = true;
        this.activeIndex = -1;
        
        // Focus the menu for keyboard navigation
        this.element.focus();
        
        if (this.callbacks.onShow) {
            this.callbacks.onShow();
        }
        
        return this;
    }
    
    hide() {
        if (!this.isVisible) return this;
        
        this.element.style.opacity = '0';
        this.element.style.transform = 'scale(0.95)';
        this.element.style.pointerEvents = 'none';
        
        this.isVisible = false;
        this.activeIndex = -1;
        
        if (this.callbacks.onHide) {
            this.callbacks.onHide();
        }
        
        return this;
    }
    
    render() {
        const html = this.menuItems.map((item, index) => {
            if (item.separator) {
                return '<div class="menu-separator" style="height: 1px; background: #eee; margin: 4px 0;"></div>';
            }
            
            const iconHtml = this.options.showIcons && item.icon ? 
                `<span class="menu-icon" style="margin-right: 8px;">${item.icon}</span>` : '';
            
            const disabledClass = item.disabled ? 'disabled' : '';
            
            return `
                <div class="menu-item ${disabledClass}" 
                     data-index="${index}"
                     style="
                         padding: 8px 16px;
                         cursor: ${item.disabled ? 'not-allowed' : 'pointer'};
                         display: flex;
                         align-items: center;
                         color: ${item.disabled ? '#999' : '#333'};
                         transition: background-color 0.1s ease;
                     "
                     onmouseover="this.style.backgroundColor='#f5f5f5'"
                     onmouseout="this.style.backgroundColor='transparent'">
                    ${iconHtml}
                    <span class="menu-label">${item.label}</span>
                    ${item.submenu ? '<span style="margin-left: auto;">▶</span>' : ''}
                </div>
            `;
        }).join('');
        
        this.element.innerHTML = html;
        
        // Add click handlers to menu items
        this.element.querySelectorAll('.menu-item:not(.disabled)').forEach(itemEl => {
            itemEl.addEventListener('click', this.boundHandlers.handleItemClick);
        });
    }
    
    position(x, y) {
        const rect = this.element.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Adjust position to keep menu within viewport
        let adjustedX = x;
        let adjustedY = y;
        
        if (x + rect.width > viewportWidth) {
            adjustedX = viewportWidth - rect.width - 10;
        }
        
        if (y + rect.height > viewportHeight) {
            adjustedY = viewportHeight - rect.height - 10;
        }
        
        this.element.style.left = `${Math.max(10, adjustedX)}px`;
        this.element.style.top = `${Math.max(10, adjustedY)}px`;
    }
    
    handleOutsideClick(event) {
        if (this.isVisible && !this.element.contains(event.target)) {
            this.hide();
        }
    }
    
    handleKeyDown(event) {
        if (!this.isVisible) return;
        
        switch (event.key) {
            case 'Escape':
                event.preventDefault();
                this.hide();
                break;
                
            case 'ArrowDown':
                event.preventDefault();
                this.navigateDown();
                break;
                
            case 'ArrowUp':
                event.preventDefault();
                this.navigateUp();
                break;
                
            case 'Enter':
                event.preventDefault();
                this.activateItem();
                break;
        }
    }
    
    handleItemClick(event) {
        const itemElement = event.currentTarget;
        const index = parseInt(itemElement.dataset.index);
        const item = this.menuItems[index];
        
        if (item && !item.disabled && item.action) {
            item.action();
            this.hide();
        }
    }
    
    navigateDown() {
        const enabledItems = this.menuItems
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => !item.separator && !item.disabled);
        
        if (enabledItems.length === 0) return;
        
        const currentEnabledIndex = enabledItems.findIndex(({ index }) => index === this.activeIndex);
        const nextIndex = currentEnabledIndex < enabledItems.length - 1 ? currentEnabledIndex + 1 : 0;
        
        this.setActiveItem(enabledItems[nextIndex].index);
    }
    
    navigateUp() {
        const enabledItems = this.menuItems
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => !item.separator && !item.disabled);
        
        if (enabledItems.length === 0) return;
        
        const currentEnabledIndex = enabledItems.findIndex(({ index }) => index === this.activeIndex);
        const prevIndex = currentEnabledIndex > 0 ? currentEnabledIndex - 1 : enabledItems.length - 1;
        
        this.setActiveItem(enabledItems[prevIndex].index);
    }
    
    setActiveItem(index) {
        // Clear previous active state
        this.element.querySelectorAll('.menu-item').forEach(item => {
            item.style.backgroundColor = 'transparent';
        });
        
        // Set new active state
        this.activeIndex = index;
        const activeElement = this.element.querySelector(`[data-index="${index}"]`);
        if (activeElement) {
            activeElement.style.backgroundColor = '#e3f2fd';
        }
    }
    
    activateItem() {
        if (this.activeIndex >= 0 && this.activeIndex < this.menuItems.length) {
            const item = this.menuItems[this.activeIndex];
            if (item && !item.disabled && item.action) {
                item.action();
                this.hide();
            }
        }
    }
    
    onShow(callback) {
        this.callbacks.onShow = callback;
        return this;
    }
    
    onHide(callback) {
        this.callbacks.onHide = callback;
        return this;
    }
    
    onItemClick(callback) {
        this.callbacks.onItemClick = callback;
        return this;
    }
    
    destroy() {
        this.hide();
        
        // Remove event listeners
        document.removeEventListener('click', this.boundHandlers.handleOutsideClick);
        document.removeEventListener('keydown', this.boundHandlers.handleKeyDown);
        
        // Remove from DOM
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        
        this.element = null;
        this.menuItems = [];
        this.callbacks = {};
    }
}

// Node-specific context menu class
class NodeContextMenu extends ContextMenu {
    constructor(node, event, chart) {
        super({
            className: 'pulse-node-context-menu',
            showIcons: true
        });
        
        this.node = node;
        this.chart = chart;
        this.setupNodeMenuItems();
        this.show(event.pageX, event.pageY);
    }
    
    setupNodeMenuItems() {
        const currentCategory = this.chart.categoryManager.nodeCategories.get(this.node.id);
        const selectedNodes = this.chart.getSelectedNodes();
        const isMultipleSelection = selectedNodes.length > 1;
        
        // Bulk operations for multiple selected nodes
        if (isMultipleSelection) {
            this.addItem(`Bulk Operations (${selectedNodes.length} nodes)`, () => {
                // This is a header, no action
            }, { icon: '📦', disabled: true });
            
            this.addItem('Assign Category to Selected', () => {
                this.chart.openBulkCategoryAssignmentModal(selectedNodes);
            }, { icon: '🏷️' });
            
            this.addItem('Copy Category to Selected', () => {
                if (currentCategory) {
                    this.chart.applyCategoryToSelectedNodes(currentCategory);
                } else {
                    this.chart.showNotification('This node has no category to copy', 'error');
                }
            }, { icon: '📋', disabled: !currentCategory });
            
            this.addItem('Remove Category from Selected', () => {
                this.chart.removeCategoryFromSelectedNodes();
            }, { icon: '🗑️' });
            
            this.addSeparator();
        }
        
        // Individual node operations
        this.addItem('Assign Category', () => {
            this.chart.showCategoryAssignmentModal(this.node);
        }, { icon: '🏷️' });
        
        // Copy category (if node has category)
        if (currentCategory) {
            this.addItem('Copy Category', () => {
                this.chart.copyNodeCategory(this.node);
            }, { icon: '📋' });
        }
        
        // Remove category (if node has category)
        if (currentCategory) {
            this.addItem('Remove Category', () => {
                this.chart.removeNodeCategory(this.node);
            }, { icon: '🗑️' });
        }
        
        this.addSeparator();
        
        // Selection operations
        if (!isMultipleSelection) {
            this.addItem('Select Similar Nodes', () => {
                this.chart.selectSimilarNodes(this.node);
            }, { icon: '🔍' });
        }
        
        this.addItem('Clear Selection', () => {
            this.chart.clearSelection();
        }, { icon: '❌' });
        
        this.addSeparator();
        
        // Color options
        this.addItem('Change Color', () => {
            this.chart.showColorPickerForNode(this.node);
        }, { icon: '🎨' });
        
        // Reset color
        this.addItem('Reset Color', () => {
            this.chart.resetNodeColor(this.node);
        }, { icon: '↺' });
        
        this.addSeparator();
        
        // Node details
        this.addItem('Node Details', () => {
            this.chart.showNodeDetailsModal(this.node);
        }, { icon: 'ℹ️' });
        
        // Focus on node
        this.addItem('Focus on Node', () => {
            this.chart.focusOnNode(this.node);
        }, { icon: '🔍' });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ContextMenu, NodeContextMenu };
}