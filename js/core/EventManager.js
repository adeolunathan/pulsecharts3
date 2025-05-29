// Placeholder for EventManager.js
/* ===== EVENT MANAGER ===== */
/* Inter-module communication and application-wide event handling */

(function() {
    'use strict';

    class EventManager {
        constructor() {
            this.eventListeners = new Map();
            this.eventHistory = [];
            this.eventFilters = new Map();
            this.eventMiddlewares = [];
            this.debugMode = false;
            
            // Event categories for organization
            this.eventCategories = {
                CHART: 'chart',
                DATA: 'data',
                CONFIG: 'config',
                USER: 'user',
                SYSTEM: 'system',
                ERROR: 'error',
                PERFORMANCE: 'performance'
            };
            
            // Built-in event types
            this.eventTypes = {
                // Chart events
                CHART_CREATED: 'chart:created',
                CHART_RENDERED: 'chart:rendered',
                CHART_UPDATED: 'chart:updated',
                CHART_DESTROYED: 'chart:destroyed',
                CHART_RESIZED: 'chart:resized',
                CHART_EXPORTED: 'chart:exported',
                
                // Data events
                DATA_LOADED: 'data:loaded',
                DATA_PROCESSED: 'data:processed',
                DATA_VALIDATED: 'data:validated',
                DATA_ERROR: 'data:error',
                
                // User interaction events
                USER_HOVER: 'user:hover',
                USER_CLICK: 'user:click',
                USER_SELECTION: 'user:selection',
                USER_NAVIGATION: 'user:navigation',
                
                // Configuration events
                CONFIG_CHANGED: 'config:changed',
                CONFIG_RESET: 'config:reset',
                CONFIG_EXPORTED: 'config:exported',
                CONFIG_IMPORTED: 'config:imported',
                
                // System events
                SYSTEM_READY: 'system:ready',
                SYSTEM_ERROR: 'system:error',
                SYSTEM_WARNING: 'system:warning',
                
                // Performance events
                PERFORMANCE_SLOW: 'performance:slow',
                PERFORMANCE_MEMORY: 'performance:memory'
            };
            
            this.setupGlobalEventHandlers();
            
            console.log('EventManager initialized');
        }

        // === EVENT REGISTRATION ===

        // Register event listener
        on(eventName, callback, options = {}) {
            if (typeof callback !== 'function') {
                throw new Error('Event callback must be a function');
            }
            
            // Normalize event name
            eventName = eventName.toLowerCase();
            
            // Create listener object
            const listener = {
                callback,
                id: this.generateListenerId(),
                once: options.once || false,
                priority: options.priority || 0,
                context: options.context || null,
                filter: options.filter || null,
                createdAt: Date.now()
            };
            
            // Store listener
            if (!this.eventListeners.has(eventName)) {
                this.eventListeners.set(eventName, []);
            }
            
            const listeners = this.eventListeners.get(eventName);
            listeners.push(listener);
            
            // Sort by priority (higher first)
            listeners.sort((a, b) => b.priority - a.priority);
            
            if (this.debugMode) {
                console.log(`Event listener registered: ${eventName}`, listener);
            }
            
            return listener.id;
        }

        // Register one-time event listener
        once(eventName, callback, options = {}) {
            return this.on(eventName, callback, { ...options, once: true });
        }

        // Remove event listener
        off(eventName, callbackOrId) {
            eventName = eventName.toLowerCase();
            
            if (!this.eventListeners.has(eventName)) {
                return false;
            }
            
            const listeners = this.eventListeners.get(eventName);
            let removed = false;
            
            for (let i = listeners.length - 1; i >= 0; i--) {
                const listener = listeners[i];
                
                // Match by callback function or listener ID
                if (listener.callback === callbackOrId || listener.id === callbackOrId) {
                    listeners.splice(i, 1);
                    removed = true;
                    
                    if (this.debugMode) {
                        console.log(`Event listener removed: ${eventName}`, listener);
                    }
                }
            }
            
            // Clean up empty listener arrays
            if (listeners.length === 0) {
                this.eventListeners.delete(eventName);
            }
            
            return removed;
        }

        // Remove all listeners for an event
        removeAllListeners(eventName) {
            eventName = eventName.toLowerCase();
            
            if (this.eventListeners.has(eventName)) {
                const count = this.eventListeners.get(eventName).length;
                this.eventListeners.delete(eventName);
                
                if (this.debugMode) {
                    console.log(`Removed ${count} listeners for event: ${eventName}`);
                }
                
                return count;
            }
            
            return 0;
        }

        // === EVENT EMISSION ===

        // Emit event to all registered listeners
        emit(eventName, data = {}, options = {}) {
            eventName = eventName.toLowerCase();
            
            // Create event object
            const eventObject = {
                name: eventName,
                data,
                timestamp: Date.now(),
                category: this.categorizeEvent(eventName),
                source: options.source || 'unknown',
                propagationStopped: false,
                defaultPrevented: false,
                
                // Event control methods
                stopPropagation: function() {
                    this.propagationStopped = true;
                },
                preventDefault: function() {
                    this.defaultPrevented = true;
                }
            };
            
            // Apply middleware
            const processedEvent = this.applyMiddleware(eventObject);
            if (!processedEvent) {
                return false; // Event was blocked by middleware
            }
            
            // Store in history
            this.storeEventInHistory(processedEvent);
            
            // Debug logging
            if (this.debugMode) {
                console.log(`Event emitted: ${eventName}`, processedEvent);
            }
            
            // Get listeners
            const listeners = this.eventListeners.get(eventName) || [];
            let handlersExecuted = 0;
            
            // Execute listeners
            for (const listener of listeners) {
                // Check if propagation was stopped
                if (processedEvent.propagationStopped) {
                    break;
                }
                
                // Apply filter if present
                if (listener.filter && !listener.filter(processedEvent)) {
                    continue;
                }
                
                try {
                    // Execute callback
                    if (listener.context) {
                        listener.callback.call(listener.context, processedEvent);
                    } else {
                        listener.callback(processedEvent);
                    }
                    
                    handlersExecuted++;
                    
                    // Remove one-time listeners
                    if (listener.once) {
                        this.off(eventName, listener.id);
                    }
                    
                } catch (error) {
                    console.error(`Error in event listener for '${eventName}':`, error);
                    
                    // Report error if ErrorHandler is available
                    if (window.errorHandler) {
                        window.errorHandler.reportError(error, {
                            component: 'eventManager',
                            eventName,
                            listenerId: listener.id
                        });
                    }
                }
            }
            
            // Emit to global DOM event system
            if (options.bubble !== false) {
                this.emitGlobalEvent(eventName, processedEvent);
            }
            
            return {
                event: processedEvent,
                handlersExecuted,
                propagationStopped: processedEvent.propagationStopped,
                defaultPrevented: processedEvent.defaultPrevented
            };
        }

        // Emit event and wait for all async handlers
        async emitAsync(eventName, data = {}, options = {}) {
            eventName = eventName.toLowerCase();
            
            const eventObject = {
                name: eventName,
                data,
                timestamp: Date.now(),
                category: this.categorizeEvent(eventName),
                source: options.source || 'unknown',
                propagationStopped: false,
                defaultPrevented: false,
                
                stopPropagation: function() {
                    this.propagationStopped = true;
                },
                preventDefault: function() {
                    this.defaultPrevented = true;
                }
            };
            
            const processedEvent = this.applyMiddleware(eventObject);
            if (!processedEvent) {
                return false;
            }
            
            this.storeEventInHistory(processedEvent);
            
            if (this.debugMode) {
                console.log(`Async event emitted: ${eventName}`, processedEvent);
            }
            
            const listeners = this.eventListeners.get(eventName) || [];
            const promises = [];
            
            for (const listener of listeners) {
                if (processedEvent.propagationStopped) {
                    break;
                }
                
                if (listener.filter && !listener.filter(processedEvent)) {
                    continue;
                }
                
                try {
                    const result = listener.context ? 
                        listener.callback.call(listener.context, processedEvent) :
                        listener.callback(processedEvent);
                    
                    // Handle promises
                    if (result && typeof result.then === 'function') {
                        promises.push(result);
                    }
                    
                    if (listener.once) {
                        this.off(eventName, listener.id);
                    }
                    
                } catch (error) {
                    console.error(`Error in async event listener for '${eventName}':`, error);
                }
            }
            
            // Wait for all promises to resolve
            const results = await Promise.allSettled(promises);
            
            return {
                event: processedEvent,
                results,
                handlersExecuted: listeners.length,
                propagationStopped: processedEvent.propagationStopped,
                defaultPrevented: processedEvent.defaultPrevented
            };
        }

        // === EVENT MIDDLEWARE ===

        // Add middleware function
        addMiddleware(middlewareFunction) {
            if (typeof middlewareFunction !== 'function') {
                throw new Error('Middleware must be a function');
            }
            
            this.eventMiddlewares.push(middlewareFunction);
            console.log('Event middleware added');
        }

        // Remove middleware function
        removeMiddleware(middlewareFunction) {
            const index = this.eventMiddlewares.indexOf(middlewareFunction);
            if (index > -1) {
                this.eventMiddlewares.splice(index, 1);
                console.log('Event middleware removed');
                return true;
            }
            return false;
        }

        // Apply all middleware to event
        applyMiddleware(eventObject) {
            let processedEvent = eventObject;
            
            for (const middleware of this.eventMiddlewares) {
                try {
                    processedEvent = middleware(processedEvent);
                    
                    // If middleware returns null/false, block the event
                    if (!processedEvent) {
                        if (this.debugMode) {
                            console.log(`Event blocked by middleware: ${eventObject.name}`);
                        }
                        return null;
                    }
                    
                } catch (error) {
                    console.error('Error in event middleware:', error);
                    // Continue with original event if middleware fails
                    processedEvent = eventObject;
                }
            }
            
            return processedEvent;
        }

        // === EVENT FILTERING ===

        // Add event filter
        addEventFilter(eventName, filterFunction) {
            eventName = eventName.toLowerCase();
            
            if (!this.eventFilters.has(eventName)) {
                this.eventFilters.set(eventName, []);
            }
            
            this.eventFilters.get(eventName).push(filterFunction);
        }

        // Remove event filter
        removeEventFilter(eventName, filterFunction) {
            eventName = eventName.toLowerCase();
            
            if (this.eventFilters.has(eventName)) {
                const filters = this.eventFilters.get(eventName);
                const index = filters.indexOf(filterFunction);
                if (index > -1) {
                    filters.splice(index, 1);
                    
                    if (filters.length === 0) {
                        this.eventFilters.delete(eventName);
                    }
                    
                    return true;
                }
            }
            
            return false;
        }

        // === EVENT HISTORY ===

        storeEventInHistory(eventObject) {
            // Store simplified version to avoid memory issues
            const historyEntry = {
                name: eventObject.name,
                timestamp: eventObject.timestamp,
                category: eventObject.category,
                source: eventObject.source,
                dataKeys: Object.keys(eventObject.data)
            };
            
            this.eventHistory.push(historyEntry);
            
            // Limit history size
            if (this.eventHistory.length > 100) {
                this.eventHistory.shift();
            }
        }

        getEventHistory(eventName = null, limit = 50) {
            let history = this.eventHistory;
            
            if (eventName) {
                history = history.filter(entry => entry.name === eventName.toLowerCase());
            }
            
            return history.slice(-limit);
        }

        clearEventHistory() {
            this.eventHistory = [];
        }

        // === GLOBAL EVENT INTEGRATION ===

        emitGlobalEvent(eventName, eventObject) {
            const customEvent = new CustomEvent(`pulse:${eventName}`, {
                detail: eventObject,
                bubbles: true,
                cancelable: true
            });
            
            document.dispatchEvent(customEvent);
        }

        setupGlobalEventHandlers() {
            // Listen for DOM events and convert to internal events
            document.addEventListener('pulse:system:ready', (event) => {
                this.emit(this.eventTypes.SYSTEM_READY, event.detail);
            });
            
            // Handle page visibility changes
            document.addEventListener('visibilitychange', () => {
                this.emit('system:visibility', {
                    visible: !document.hidden,
                    timestamp: Date.now()
                });
            });
            
            // Handle window focus/blur
            window.addEventListener('focus', () => {
                this.emit('system:focus', { focused: true });
            });
            
            window.addEventListener('blur', () => {
                this.emit('system:focus', { focused: false });
            });
        }

        // === UTILITY METHODS ===

        categorizeEvent(eventName) {
            const name = eventName.toLowerCase();
            
            if (name.startsWith('chart:')) return this.eventCategories.CHART;
            if (name.startsWith('data:')) return this.eventCategories.DATA;
            if (name.startsWith('config:')) return this.eventCategories.CONFIG;
            if (name.startsWith('user:')) return this.eventCategories.USER;
            if (name.startsWith('system:')) return this.eventCategories.SYSTEM;
            if (name.startsWith('error:')) return this.eventCategories.ERROR;
            if (name.startsWith('performance:')) return this.eventCategories.PERFORMANCE;
            
            return 'unknown';
        }

        generateListenerId() {
            return `listener-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        // === DEBUGGING ===

        enableDebugMode() {
            this.debugMode = true;
            console.log('EventManager debug mode enabled');
        }

        disableDebugMode() {
            this.debugMode = false;
            console.log('EventManager debug mode disabled');
        }

        // === STATISTICS ===

        getEventStats() {
            const listenerCounts = {};
            for (const [eventName, listeners] of this.eventListeners) {
                listenerCounts[eventName] = listeners.length;
            }
            
            const historyCounts = {};
            this.eventHistory.forEach(entry => {
                historyCounts[entry.name] = (historyCounts[entry.name] || 0) + 1;
            });
            
            return {
                totalListeners: Array.from(this.eventListeners.values())
                    .reduce((total, listeners) => total + listeners.length, 0),
                listenersByEvent: listenerCounts,
                totalEvents: this.eventHistory.length,
                eventsByType: historyCounts,
                middlewareCount: this.eventMiddlewares.length,
                filterCount: Array.from(this.eventFilters.values())
                    .reduce((total, filters) => total + filters.length, 0)
            };
        }

        // === BUILT-IN EVENT HELPERS ===

        // Chart lifecycle events
        chartCreated(chartId, chartType, data) {
            this.emit(this.eventTypes.CHART_CREATED, {
                chartId, chartType, data, timestamp: Date.now()
            });
        }

        chartRendered(chartId, renderTime, nodeCount) {
            this.emit(this.eventTypes.CHART_RENDERED, {
                chartId, renderTime, nodeCount, timestamp: Date.now()
            });
        }

        chartUpdated(chartId, updateType, data) {
            this.emit(this.eventTypes.CHART_UPDATED, {
                chartId, updateType, data, timestamp: Date.now()
            });
        }

        // Data events
        dataLoaded(source, dataSize, processingTime) {
            this.emit(this.eventTypes.DATA_LOADED, {
                source, dataSize, processingTime, timestamp: Date.now()
            });
        }

        dataError(error, context) {
            this.emit(this.eventTypes.DATA_ERROR, {
                error: error.message, context, timestamp: Date.now()
            });
        }

        // User interaction events
        userInteraction(type, target, details) {
            this.emit(`user:${type}`, {
                target, details, timestamp: Date.now()
            });
        }

        // Performance events
        performanceIssue(type, metric, threshold) {
            this.emit(`performance:${type}`, {
                metric, threshold, timestamp: Date.now()
            });
        }

        // === CLEANUP ===

        cleanup() {
            console.log('EventManager cleanup started');
            
            // Clear all listeners
            this.eventListeners.clear();
            
            // Clear middleware and filters
            this.eventMiddlewares = [];
            this.eventFilters.clear();
            
            // Clear history
            this.clearEventHistory();
            
            console.log('EventManager cleanup completed');
        }

        // === DEBUG METHODS ===

        debug() {
            console.group('EventManager Debug');
            console.log('Event Stats:', this.getEventStats());
            console.log('Active Listeners:', Object.fromEntries(this.eventListeners.entries()));
            console.log('Recent Events:', this.getEventHistory(null, 10));
            console.log('Middleware Count:', this.eventMiddlewares.length);
            console.groupEnd();
            
            return this.getEventStats();
        }

        // List all registered events
        listEvents() {
            return Array.from(this.eventListeners.keys());
        }

        // Get listeners for specific event
        getListeners(eventName) {
            return this.eventListeners.get(eventName.toLowerCase()) || [];
        }
    }

    // Create singleton instance
    const eventManager = new EventManager();

    // Export both class and singleton
    window.EventManager = EventManager;
    window.eventManager = eventManager;

    // Enable debug mode in development
    if (window.location.hostname === 'localhost' || window.location.search.includes('debug=true')) {
        eventManager.enableDebugMode();
    }

    console.log('EventManager loaded successfully');

})();