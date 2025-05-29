/* ===== ERROR HANDLER ===== */
/* Centralized error management and user communication */

(function() {
    'use strict';

    class ErrorHandler {
        constructor() {
            this.errors = [];
            this.errorCounts = new Map();
            this.errorListeners = [];
            this.suppressedErrors = new Set();
            
            // Error display settings
            this.displaySettings = {
                showUserFriendlyMessages: true,
                showTechnicalDetails: false,
                maxDisplayedErrors: 5,
                autoHideDelay: 5000,
                logToConsole: true
            };
            
            // Error categorization
            this.errorCategories = {
                DATA: 'data',
                RENDER: 'render',
                EXPORT: 'export',
                CONFIG: 'config',
                NETWORK: 'network',
                PERMISSION: 'permission',
                UNKNOWN: 'unknown'
            };
            
            // Error severity levels
            this.severityLevels = {
                LOW: 'low',
                MEDIUM: 'medium',
                HIGH: 'high',
                CRITICAL: 'critical'
            };
            
            // Initialize error display container
            this.initializeErrorDisplay();
            
            // Set up global error handlers
            this.setupGlobalErrorHandlers();
            
            console.log('ErrorHandler initialized');
        }

        // === ERROR REPORTING ===

        // Main error reporting method
        reportError(error, context = {}) {
            try {
                // Create standardized error object
                const errorObject = this.createErrorObject(error, context);
                
                // Check if error should be suppressed
                if (this.isErrorSuppressed(errorObject)) {
                    return;
                }
                
                // Store error
                this.storeError(errorObject);
                
                // Log to console if enabled
                if (this.displaySettings.logToConsole) {
                    this.logError(errorObject);
                }
                
                // Display to user if appropriate
                if (this.shouldDisplayToUser(errorObject)) {
                    this.displayError(errorObject);
                }
                
                // Notify listeners
                this.notifyErrorListeners(errorObject);
                
                // Report to analytics if available
                this.reportToAnalytics(errorObject);
                
            } catch (handlerError) {
                // Fallback error handling
                console.error('Error in ErrorHandler.reportError:', handlerError);
                console.error('Original error:', error);
            }
        }

        // Report multiple errors
        reportErrors(errors, context = {}) {
            errors.forEach(error => this.reportError(error, context));
        }

        // === ERROR OBJECT CREATION ===

        createErrorObject(error, context) {
            const timestamp = new Date().toISOString();
            const errorId = this.generateErrorId();
            
            // Extract error information
            let message, stack, name;
            if (error instanceof Error) {
                message = error.message;
                stack = error.stack;
                name = error.name;
            } else if (typeof error === 'string') {
                message = error;
                stack = new Error().stack;
                name = 'StringError';
            } else {
                message = JSON.stringify(error);
                stack = new Error().stack;
                name = 'UnknownError';
            }
            
            // Categorize and assess severity
            const category = this.categorizeError(error, context);
            const severity = this.assessSeverity(error, context);
            
            // Create error object
            const errorObject = {
                id: errorId,
                timestamp,
                message,
                stack,
                name,
                category,
                severity,
                context: { ...context },
                userAgent: navigator.userAgent,
                url: window.location.href,
                userId: this.getUserId(),
                sessionId: this.getSessionId(),
                count: 1
            };
            
            // Add user-friendly message
            errorObject.userMessage = this.generateUserFriendlyMessage(errorObject);
            
            return errorObject;
        }

        // === ERROR CATEGORIZATION ===

        categorizeError(error, context) {
            const message = error.message || error.toString();
            const contextComponent = context.component || '';
            
            // Network errors
            if (message.includes('fetch') || message.includes('network') || message.includes('CORS')) {
                return this.errorCategories.NETWORK;
            }
            
            // Data errors
            if (message.includes('data') || message.includes('validation') || 
                contextComponent.includes('data') || contextComponent.includes('processor')) {
                return this.errorCategories.DATA;
            }
            
            // Render errors
            if (message.includes('render') || message.includes('SVG') || message.includes('canvas') ||
                contextComponent.includes('render') || contextComponent.includes('chart')) {
                return this.errorCategories.RENDER;
            }
            
            // Export errors
            if (message.includes('export') || message.includes('download') || message.includes('blob') ||
                contextComponent.includes('export')) {
                return this.errorCategories.EXPORT;
            }
            
            // Configuration errors
            if (message.includes('config') || message.includes('setting') ||
                contextComponent.includes('config')) {
                return this.errorCategories.CONFIG;
            }
            
            // Permission errors
            if (message.includes('permission') || message.includes('denied') || message.includes('unauthorized')) {
                return this.errorCategories.PERMISSION;
            }
            
            return this.errorCategories.UNKNOWN;
        }

        assessSeverity(error, context) {
            const message = error.message || error.toString();
            const category = context.category || this.categorizeError(error, context);
            
            // Critical errors that break core functionality
            if (message.includes('Cannot read property') || 
                message.includes('is not a function') ||
                category === this.errorCategories.RENDER) {
                return this.severityLevels.CRITICAL;
            }
            
            // High severity for data and export issues
            if (category === this.errorCategories.DATA || 
                category === this.errorCategories.EXPORT) {
                return this.severityLevels.HIGH;
            }
            
            // Medium severity for configuration issues
            if (category === this.errorCategories.CONFIG) {
                return this.severityLevels.MEDIUM;
            }
            
            // Low severity for others
            return this.severityLevels.LOW;
        }

        // === USER-FRIENDLY MESSAGES ===

        generateUserFriendlyMessage(errorObject) {
            const category = errorObject.category;
            const severity = errorObject.severity;
            
            const messageTemplates = {
                [this.errorCategories.DATA]: {
                    [this.severityLevels.CRITICAL]: "There's a problem with your data that prevents the chart from loading. Please check your data format.",
                    [this.severityLevels.HIGH]: "Your data has some issues that might affect the chart display. Please review your data.",
                    [this.severityLevels.MEDIUM]: "We found some minor data inconsistencies, but the chart should still work.",
                    [this.severityLevels.LOW]: "Minor data validation warning detected."
                },
                [this.errorCategories.RENDER]: {
                    [this.severityLevels.CRITICAL]: "The chart failed to display. Please try refreshing the page.",
                    [this.severityLevels.HIGH]: "There was a problem rendering the chart. Some features might not work properly.",
                    [this.severityLevels.MEDIUM]: "Chart rendering encountered an issue, but basic functionality should work.",
                    [this.severityLevels.LOW]: "Minor rendering issue detected."
                },
                [this.errorCategories.EXPORT]: {
                    [this.severityLevels.CRITICAL]: "Export failed completely. Please try a different format.",
                    [this.severityLevels.HIGH]: "Export encountered problems. The file might be corrupted.",
                    [this.severityLevels.MEDIUM]: "Export completed with warnings. Please check the output.",
                    [this.severityLevels.LOW]: "Export completed successfully with minor issues."
                },
                [this.errorCategories.NETWORK]: {
                    [this.severityLevels.CRITICAL]: "Network connection failed. Please check your internet connection.",
                    [this.severityLevels.HIGH]: "Network request failed. Some features might not work.",
                    [this.severityLevels.MEDIUM]: "Intermittent network issues detected.",
                    [this.severityLevels.LOW]: "Minor network delay occurred."
                },
                [this.errorCategories.CONFIG]: {
                    [this.severityLevels.CRITICAL]: "Configuration error prevents the application from working. Please reset to defaults.",
                    [this.severityLevels.HIGH]: "Configuration issue detected. Some features might not work as expected.",
                    [this.severityLevels.MEDIUM]: "Configuration warning: please review your settings.",
                    [this.severityLevels.LOW]: "Minor configuration issue detected."
                },
                [this.errorCategories.PERMISSION]: {
                    [this.severityLevels.CRITICAL]: "Permission denied. This feature cannot be used in your current environment.",
                    [this.severityLevels.HIGH]: "Limited permissions detected. Some features might not work.",
                    [this.severityLevels.MEDIUM]: "Permission warning: some functionality might be restricted.",
                    [this.severityLevels.LOW]: "Minor permission issue detected."
                }
            };
            
            const categoryMessages = messageTemplates[category] || messageTemplates[this.errorCategories.UNKNOWN];
            const fallbackMessage = "An unexpected error occurred. Please try again or contact support.";
            
            if (categoryMessages) {
                return categoryMessages[severity] || fallbackMessage;
            }
            
            return fallbackMessage;
        }

        // === ERROR STORAGE AND TRACKING ===

        storeError(errorObject) {
            // Check for duplicate errors
            const existingError = this.findSimilarError(errorObject);
            
            if (existingError) {
                // Increment count for similar error
                existingError.count++;
                existingError.lastOccurrence = errorObject.timestamp;
            } else {
                // Store new error
                this.errors.push(errorObject);
                
                // Limit stored errors to prevent memory issues
                if (this.errors.length > 100) {
                    this.errors.shift();
                }
            }
            
            // Update error counts by category
            const category = errorObject.category;
            this.errorCounts.set(category, (this.errorCounts.get(category) || 0) + 1);
        }

        findSimilarError(errorObject) {
            return this.errors.find(existing => 
                existing.message === errorObject.message &&
                existing.category === errorObject.category &&
                existing.context.component === errorObject.context.component
            );
        }

        // === ERROR DISPLAY ===

        initializeErrorDisplay() {
            // Create error display container
            this.errorContainer = d3.select('body')
                .append('div')
                .attr('id', 'pulse-error-container')
                .style('position', 'fixed')
                .style('top', '20px')
                .style('right', '20px')
                .style('z-index', '10000')
                .style('max-width', '400px')
                .style('pointer-events', 'none');
        }

        displayError(errorObject) {
            if (!this.shouldDisplayToUser(errorObject)) {
                return;
            }
            
            // Ensure error display is initialized
            if (!this.errorDisplayInitialized) {
                this.initializeErrorDisplay();
                
                // If still not initialized (d3 not available), fall back to alert
                if (!this.errorDisplayInitialized) {
                    console.warn('Cannot display visual error - falling back to console');
                    console.error('Error Display:', errorObject.userMessage);
                    return;
                }
            }
            
            const errorElement = this.errorContainer
                .append('div')
                .attr('class', 'pulse-error-message')
                .attr('data-error-id', errorObject.id)
                .style('background', this.getErrorBackgroundColor(errorObject.severity))
                .style('color', 'white')
                .style('padding', '12px 16px')
                .style('margin-bottom', '8px')
                .style('border-radius', '6px')
                .style('box-shadow', '0 4px 12px rgba(0,0,0,0.3)')
                .style('pointer-events', 'auto')
                .style('cursor', 'pointer')
                .style('opacity', '0')
                .style('transform', 'translateX(100%)')
                .style('transition', 'all 0.3s ease');
            
            // Error icon
            const icon = this.getErrorIcon(errorObject.severity);
            
            // Error content
            errorElement.html(`
                <div style="display: flex; align-items: flex-start; gap: 8px;">
                    <div style="font-size: 18px;">${icon}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; margin-bottom: 4px;">
                            ${this.getSeverityLabel(errorObject.severity)}
                        </div>
                        <div style="font-size: 13px; line-height: 1.4;">
                            ${errorObject.userMessage}
                        </div>
                        ${this.displaySettings.showTechnicalDetails ? 
                            `<div style="font-size: 11px; opacity: 0.8; margin-top: 4px;">
                                ${errorObject.message}
                            </div>` : ''
                        }
                    </div>
                    <div style="font-size: 16px; cursor: pointer;" onclick="this.parentElement.parentElement.remove()">
                        ×
                    </div>
                </div>
            `);
            
            // Animate in
            setTimeout(() => {
                errorElement
                    .style('opacity', '1')
                    .style('transform', 'translateX(0)');
            }, 10);
            
            // Auto-hide after delay
            if (this.displaySettings.autoHideDelay > 0) {
                setTimeout(() => {
                    this.hideError(errorObject.id);
                }, this.displaySettings.autoHideDelay);
            }
            
            // Click to dismiss
            errorElement.on('click', () => {
                this.hideError(errorObject.id);
            });
        }

        hideError(errorId) {
            const errorElement = this.errorContainer.select(`[data-error-id="${errorId}"]`);
            if (!errorElement.empty()) {
                errorElement
                    .style('opacity', '0')
                    .style('transform', 'translateX(100%)')
                    .transition()
                    .duration(300)
                    .remove();
            }
        }

        shouldDisplayToUser(errorObject) {
            // Don't display if user-friendly messages are disabled
            if (!this.displaySettings.showUserFriendlyMessages) {
                return false;
            }
            
            // Don't display low severity errors
            if (errorObject.severity === this.severityLevels.LOW) {
                return false;
            }
            
            // Don't display if we've hit the max display limit
            const currentDisplayed = this.errorContainer.selectAll('.pulse-error-message').size();
            if (currentDisplayed >= this.displaySettings.maxDisplayedErrors) {
                return false;
            }
            
            return true;
        }

        // === UTILITY METHODS ===

        getErrorBackgroundColor(severity) {
            const colors = {
                [this.severityLevels.CRITICAL]: '#dc3545',
                [this.severityLevels.HIGH]: '#fd7e14',
                [this.severityLevels.MEDIUM]: '#ffc107',
                [this.severityLevels.LOW]: '#17a2b8'
            };
            return colors[severity] || colors[this.severityLevels.MEDIUM];
        }

        getErrorIcon(severity) {
            const icons = {
                [this.severityLevels.CRITICAL]: '🚨',
                [this.severityLevels.HIGH]: '⚠️',
                [this.severityLevels.MEDIUM]: '⚡',
                [this.severityLevels.LOW]: 'ℹ️'
            };
            return icons[severity] || icons[this.severityLevels.MEDIUM];
        }

        getSeverityLabel(severity) {
            const labels = {
                [this.severityLevels.CRITICAL]: 'Critical Error',
                [this.severityLevels.HIGH]: 'Error',
                [this.severityLevels.MEDIUM]: 'Warning',
                [this.severityLevels.LOW]: 'Info'
            };
            return labels[severity] || 'Error';
        }

        logError(errorObject) {
            const logMethods = {
                [this.severityLevels.CRITICAL]: 'error',
                [this.severityLevels.HIGH]: 'error',
                [this.severityLevels.MEDIUM]: 'warn',
                [this.severityLevels.LOW]: 'info'
            };
            
            const logMethod = logMethods[errorObject.severity] || 'error';
            console[logMethod](`[${errorObject.category.toUpperCase()}] ${errorObject.message}`, errorObject);
        }

        generateErrorId() {
            return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }

        getUserId() {
            // Implement user identification logic
            return 'anonymous';
        }

        getSessionId() {
            // Generate or retrieve session ID
            if (!sessionStorage.getItem('pulse-session-id')) {
                sessionStorage.setItem('pulse-session-id', 
                    Date.now().toString(36) + Math.random().toString(36).substr(2));
            }
            return sessionStorage.getItem('pulse-session-id');
        }

        // === GLOBAL ERROR HANDLERS ===

        setupGlobalErrorHandlers() {
            // Uncaught JavaScript errors
            window.addEventListener('error', (event) => {
                this.reportError(event.error || new Error(event.message), {
                    component: 'global',
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno
                });
            });
            
            // Unhandled promise rejections
            window.addEventListener('unhandledrejection', (event) => {
                this.reportError(event.reason, {
                    component: 'promise',
                    type: 'unhandledRejection'
                });
            });
        }

        // === ERROR LISTENERS ===

        addErrorListener(callback) {
            this.errorListeners.push(callback);
        }

        removeErrorListener(callback) {
            const index = this.errorListeners.indexOf(callback);
            if (index > -1) {
                this.errorListeners.splice(index, 1);
            }
        }

        notifyErrorListeners(errorObject) {
            this.errorListeners.forEach(listener => {
                try {
                    listener(errorObject);
                } catch (error) {
                    console.error('Error in error listener:', error);
                }
            });
        }

        // === ERROR SUPPRESSION ===

        suppressError(errorPattern) {
            this.suppressedErrors.add(errorPattern);
        }

        unsuppressError(errorPattern) {
            this.suppressedErrors.delete(errorPattern);
        }

        isErrorSuppressed(errorObject) {
            for (const pattern of this.suppressedErrors) {
                if (errorObject.message.includes(pattern)) {
                    return true;
                }
            }
            return false;
        }

        // === ANALYTICS REPORTING ===

        reportToAnalytics(errorObject) {
            // Implement analytics reporting
            // This could send to Google Analytics, Sentry, etc.
            if (window.gtag) {
                window.gtag('event', 'exception', {
                    description: errorObject.message,
                    fatal: errorObject.severity === this.severityLevels.CRITICAL
                });
            }
        }

        // === ERROR STATISTICS ===

        getErrorStats() {
            return {
                totalErrors: this.errors.length,
                errorsByCategory: Object.fromEntries(this.errorCounts.entries()),
                errorsBySeverity: this.getErrorsBySeverity(),
                recentErrors: this.errors.slice(-10),
                mostCommonErrors: this.getMostCommonErrors()
            };
        }

        getErrorsBySeverity() {
            const severityCounts = {};
            this.errors.forEach(error => {
                severityCounts[error.severity] = (severityCounts[error.severity] || 0) + 1;
            });
            return severityCounts;
        }

        getMostCommonErrors() {
            const errorMessages = {};
            this.errors.forEach(error => {
                errorMessages[error.message] = (errorMessages[error.message] || 0) + error.count;
            });
            
            return Object.entries(errorMessages)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([message, count]) => ({ message, count }));
        }

        // === CLEANUP ===

        clearErrors() {
            this.errors = [];
            this.errorCounts.clear();
            this.errorContainer.selectAll('.pulse-error-message').remove();
        }

        // === DEBUGGING ===

        debug() {
            console.group('ErrorHandler Debug');
            console.log('Error Stats:', this.getErrorStats());
            console.log('Display Settings:', this.displaySettings);
            console.log('Suppressed Errors:', Array.from(this.suppressedErrors));
            console.groupEnd();
            
            return this.getErrorStats();
        }
    }

    // Create singleton instance
    const errorHandler = new ErrorHandler();

    // Export both class and singleton
    window.ErrorHandler = ErrorHandler;
    window.errorHandler = errorHandler;

    console.log('ErrorHandler loaded successfully');

})();