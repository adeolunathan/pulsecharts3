// Placeholder for SankeyDataProcessor.js
/* ===== SANKEY DATA PROCESSOR MODULE ===== */
/* Data transformation, validation, and Sankey-specific processing */

(function() {
    'use strict';

    class SankeyDataProcessor {
        constructor() {
            this.processingOptions = {
                validateFlowConservation: true,
                autoFixMinorIssues: true,
                toleranceLevel: 0.01, // 1% tolerance for rounding errors
                requirePositiveValues: true
            };
        }

        // Main processing pipeline
        processData(rawData) {
            if (!rawData) {
                throw new Error('No data provided for processing');
            }

            // Step 1: Validate basic structure
            this.validateStructure(rawData);

            // Step 2: Create working copy
            const processedData = this.createDeepCopy(rawData);

            // Step 3: Process nodes
            const { nodeMap, processedNodes } = this.processNodes(processedData.nodes);

            // Step 4: Process links
            const processedLinks = this.processLinks(processedData.links, nodeMap);

            // Step 5: Build relationships
            this.buildRelationships(processedNodes, processedLinks);

            // Step 6: Validate flow conservation
            if (this.processingOptions.validateFlowConservation) {
                const flowReport = this.validateFlowConservation({
                    nodes: processedNodes,
                    links: processedLinks
                });
                
                if (flowReport.errors.length > 0) {
                    console.warn('Flow conservation issues detected:', flowReport.errors);
                }
            }

            // Step 7: Return processed data
            return {
                nodes: processedNodes,
                links: processedLinks,
                metadata: processedData.metadata || {},
                colorScheme: processedData.colorScheme || {},
                processingReport: {
                    timestamp: new Date().toISOString(),
                    nodeCount: processedNodes.length,
                    linkCount: processedLinks.length,
                    validated: true
                }
            };
        }

        // Validate basic data structure
        validateStructure(data) {
            const errors = [];

            // Check for required properties
            if (!data.nodes || !Array.isArray(data.nodes)) {
                errors.push('Data must contain a nodes array');
            }

            if (!data.links || !Array.isArray(data.links)) {
                errors.push('Data must contain a links array');
            }

            if (data.nodes && data.nodes.length === 0) {
                errors.push('Nodes array cannot be empty');
            }

            if (data.links && data.links.length === 0) {
                errors.push('Links array cannot be empty');
            }

            if (errors.length > 0) {
                throw new Error(`Data structure validation failed: ${errors.join(', ')}`);
            }

            return true;
        }

        // Process and validate nodes
        processNodes(rawNodes) {
            const nodeMap = new Map();
            const processedNodes = [];
            const errors = [];

            rawNodes.forEach((node, index) => {
                try {
                    // Validate required fields
                    if (!node.id) {
                        errors.push(`Node at index ${index}: missing 'id' field`);
                        return;
                    }

                    if (node.value === undefined || node.value === null) {
                        errors.push(`Node '${node.id}': missing 'value' field`);
                        return;
                    }

                    if (node.depth === undefined || node.depth === null) {
                        errors.push(`Node '${node.id}': missing 'depth' field`);
                        return;
                    }

                    // Validate data types and ranges
                    if (typeof node.value !== 'number' || isNaN(node.value)) {
                        errors.push(`Node '${node.id}': value must be a number`);
                        return;
                    }

                    if (this.processingOptions.requirePositiveValues && node.value < 0) {
                        errors.push(`Node '${node.id}': negative value not allowed (${node.value})`);
                        return;
                    }

                    if (typeof node.depth !== 'number' || node.depth < 0) {
                        errors.push(`Node '${node.id}': depth must be a non-negative number`);
                        return;
                    }

                    // Check for duplicate IDs
                    if (nodeMap.has(node.id)) {
                        errors.push(`Duplicate node ID: '${node.id}'`);
                        return;
                    }

                    // Create processed node
                    const processedNode = {
                        id: node.id,
                        value: node.value,
                        depth: node.depth,
                        category: node.category || 'default',
                        description: node.description || '',
                        customOrder: node.customOrder,
                        parentOrder: node.parentOrder,
                        
                        // Initialize relationship arrays
                        sourceLinks: [],
                        targetLinks: [],
                        
                        // Copy additional properties
                        ...this.extractAdditionalProperties(node, ['id', 'value', 'depth', 'category', 'description', 'customOrder', 'parentOrder'])
                    };

                    nodeMap.set(node.id, processedNode);
                    processedNodes.push(processedNode);

                } catch (error) {
                    errors.push(`Node at index ${index}: ${error.message}`);
                }
            });

            if (errors.length > 0) {
                throw new Error(`Node processing failed:\n${errors.join('\n')}`);
            }

            return { nodeMap, processedNodes };
        }

        // Process and validate links
        processLinks(rawLinks, nodeMap) {
            const processedLinks = [];
            const errors = [];

            rawLinks.forEach((link, index) => {
                try {
                    // Validate required fields
                    if (!link.source || !link.target) {
                        errors.push(`Link at index ${index}: missing source or target`);
                        return;
                    }

                    if (link.value === undefined || link.value === null) {
                        errors.push(`Link at index ${index}: missing value field`);
                        return;
                    }

                    // Validate data types
                    if (typeof link.value !== 'number' || isNaN(link.value)) {
                        errors.push(`Link at index ${index}: value must be a number`);
                        return;
                    }

                    if (link.value <= 0) {
                        errors.push(`Link at index ${index}: value must be positive (got ${link.value})`);
                        return;
                    }

                    // Validate node references
                    if (!nodeMap.has(link.source)) {
                        errors.push(`Link at index ${index}: source node '${link.source}' not found`);
                        return;
                    }

                    if (!nodeMap.has(link.target)) {
                        errors.push(`Link at index ${index}: target node '${link.target}' not found`);
                        return;
                    }

                    // Check for self-loops
                    if (link.source === link.target) {
                        errors.push(`Link at index ${index}: self-loop not allowed (${link.source} → ${link.target})`);
                        return;
                    }

                    // Create processed link
                    const processedLink = {
                        source: nodeMap.get(link.source),
                        target: nodeMap.get(link.target),
                        value: link.value,
                        type: link.type || 'default',
                        
                        // Store original string references for reference
                        sourceId: link.source,
                        targetId: link.target,
                        
                        // Copy additional properties
                        ...this.extractAdditionalProperties(link, ['source', 'target', 'value', 'type'])
                    };

                    processedLinks.push(processedLink);

                } catch (error) {
                    errors.push(`Link at index ${index}: ${error.message}`);
                }
            });

            if (errors.length > 0) {
                throw new Error(`Link processing failed:\n${errors.join('\n')}`);
            }

            return processedLinks;
        }

        // Build relationships between nodes and links
        buildRelationships(nodes, links) {
            // Clear existing relationships
            nodes.forEach(node => {
                node.sourceLinks = [];
                node.targetLinks = [];
            });

            // Build relationships
            links.forEach(link => {
                link.source.sourceLinks.push(link);
                link.target.targetLinks.push(link);
            });

            // Calculate derived metrics
            nodes.forEach(node => {
                node.totalInflow = node.targetLinks.reduce((sum, link) => sum + link.value, 0);
                node.totalOutflow = node.sourceLinks.reduce((sum, link) => sum + link.value, 0);
                node.flowBalance = node.totalInflow - node.totalOutflow;
            });
        }

        // Validate flow conservation
        validateFlowConservation(data) {
            const errors = [];
            const warnings = [];
            const nodeReports = new Map();

            data.nodes.forEach(node => {
                const report = {
                    nodeId: node.id,
                    nodeValue: node.value,
                    totalInflow: node.totalInflow || 0,
                    totalOutflow: node.totalOutflow || 0,
                    balance: (node.totalInflow || 0) - (node.totalOutflow || 0),
                    conservationCheck: 'unknown'
                };

                // Determine node type and check conservation
                const isSource = report.totalInflow === 0 && report.totalOutflow > 0;
                const isSink = report.totalOutflow === 0 && report.totalInflow > 0;
                const isIntermediate = report.totalInflow > 0 && report.totalOutflow > 0;

                if (isSource) {
                    // Source nodes: outflow should equal node value
                    const diff = Math.abs(report.totalOutflow - report.nodeValue);
                    if (diff > this.processingOptions.toleranceLevel) {
                        errors.push(`Source node '${node.id}': outflow (${report.totalOutflow}) ≠ value (${report.nodeValue})`);
                        report.conservationCheck = 'failed';
                    } else {
                        report.conservationCheck = 'passed';
                    }
                } else if (isSink) {
                    // Sink nodes: inflow should equal node value
                    const diff = Math.abs(report.totalInflow - report.nodeValue);
                    if (diff > this.processingOptions.toleranceLevel) {
                        errors.push(`Sink node '${node.id}': inflow (${report.totalInflow}) ≠ value (${report.nodeValue})`);
                        report.conservationCheck = 'failed';
                    } else {
                        report.conservationCheck = 'passed';
                    }
                } else if (isIntermediate) {
                    // Intermediate nodes: inflow should equal outflow
                    const diff = Math.abs(report.balance);
                    if (diff > this.processingOptions.toleranceLevel) {
                        errors.push(`Intermediate node '${node.id}': inflow (${report.totalInflow}) ≠ outflow (${report.totalOutflow})`);
                        report.conservationCheck = 'failed';
                    } else {
                        report.conservationCheck = 'passed';
                    }
                } else {
                    // Isolated nodes
                    warnings.push(`Isolated node '${node.id}': no inflow or outflow`);
                    report.conservationCheck = 'isolated';
                }

                nodeReports.set(node.id, report);
            });

            return {
                valid: errors.length === 0,
                errors,
                warnings,
                nodeReports: Array.from(nodeReports.values()),
                summary: {
                    totalNodes: data.nodes.length,
                    passedNodes: Array.from(nodeReports.values()).filter(r => r.conservationCheck === 'passed').length,
                    failedNodes: Array.from(nodeReports.values()).filter(r => r.conservationCheck === 'failed').length,
                    isolatedNodes: Array.from(nodeReports.values()).filter(r => r.conservationCheck === 'isolated').length
                }
            };
        }

        // Check data integrity
        checkDataIntegrity(data) {
            const issues = [];
            const suggestions = [];

            // Check for common issues
            const depthGroups = this.groupNodesByDepth(data.nodes);
            
            // Check depth continuity
            const depths = Array.from(depthGroups.keys()).sort((a, b) => a - b);
            for (let i = 1; i < depths.length; i++) {
                if (depths[i] - depths[i-1] > 1) {
                    issues.push(`Gap in depth sequence: missing depth ${depths[i-1] + 1}`);
                    suggestions.push('Ensure depths form a continuous sequence starting from 0');
                }
            }

            // Check for orphaned nodes
            data.nodes.forEach(node => {
                if (node.sourceLinks.length === 0 && node.targetLinks.length === 0) {
                    issues.push(`Orphaned node '${node.id}': no connections`);
                    suggestions.push(`Connect '${node.id}' to other nodes or remove it`);
                }
            });

            // Check for very small values
            const allValues = [...data.nodes.map(n => n.value), ...data.links.map(l => l.value)];
            const maxValue = Math.max(...allValues);
            const minValue = Math.min(...allValues.filter(v => v > 0));
            
            if (maxValue / minValue > 1000) {
                issues.push(`Large value range: ${minValue} to ${maxValue} (ratio: ${(maxValue/minValue).toFixed(1)}:1)`);
                suggestions.push('Consider normalizing values or using logarithmic scaling');
            }

            return {
                healthy: issues.length === 0,
                issues,
                suggestions,
                statistics: {
                    nodeCount: data.nodes.length,
                    linkCount: data.links.length,
                    valueRange: `${minValue} - ${maxValue}`,
                    depthRange: `${Math.min(...depths)} - ${Math.max(...depths)}`
                }
            };
        }

        // Normalize node values
        normalizeNodeValues(nodes, targetRange = { min: 1, max: 100 }) {
            const values = nodes.map(n => n.value).filter(v => v > 0);
            const minValue = Math.min(...values);
            const maxValue = Math.max(...values);
            
            if (minValue === maxValue) {
                // All values are the same, set to middle of target range
                const targetValue = (targetRange.min + targetRange.max) / 2;
                nodes.forEach(node => {
                    node.originalValue = node.value;
                    node.value = targetValue;
                });
                return { scale: 1, offset: 0, method: 'constant' };
            }
            
            // Linear normalization
            const scale = (targetRange.max - targetRange.min) / (maxValue - minValue);
            const offset = targetRange.min - (minValue * scale);
            
            nodes.forEach(node => {
                node.originalValue = node.value;
                node.value = node.value * scale + offset;
            });
            
            return { scale, offset, method: 'linear', originalRange: { min: minValue, max: maxValue } };
        }

        // Optimize data for Sankey display
        optimizeForSankey(data) {
            const optimized = this.createDeepCopy(data);
            
            // Sort nodes within each depth by value (descending)
            const depthGroups = this.groupNodesByDepth(optimized.nodes);
            
            depthGroups.forEach((nodes, depth) => {
                nodes.sort((a, b) => {
                    // Custom order takes precedence
                    if (a.customOrder !== undefined && b.customOrder !== undefined) {
                        return a.customOrder - b.customOrder;
                    }
                    if (a.customOrder !== undefined) return -1;
                    if (b.customOrder !== undefined) return 1;
                    
                    // Parent order takes precedence within groups
                    if (a.parentOrder !== undefined && b.parentOrder !== undefined) {
                        return a.parentOrder - b.parentOrder;
                    }
                    if (a.parentOrder !== undefined) return -1;
                    if (b.parentOrder !== undefined) return 1;
                    
                    // Default to value-based sorting (highest first)
                    return b.value - a.value;
                });
            });
            
            return optimized;
        }

        // Generate error report with actionable feedback
        generateErrorReport(data) {
            const report = {
                timestamp: new Date().toISOString(),
                dataOverview: {
                    nodeCount: data.nodes ? data.nodes.length : 0,
                    linkCount: data.links ? data.links.length : 0
                },
                errors: [],
                warnings: [],
                suggestions: []
            };

            try {
                // Structure validation
                this.validateStructure(data);
                
                // Process data to catch detailed errors
                this.processData(data);
                
                report.status = 'valid';
                report.message = 'Data passed all validation checks';
                
            } catch (error) {
                report.status = 'invalid';
                report.message = error.message;
                report.errors.push(error.message);
                
                // Add specific suggestions based on error type
                if (error.message.includes('missing')) {
                    report.suggestions.push('Ensure all required fields (id, value, depth for nodes; source, target, value for links) are present');
                }
                if (error.message.includes('duplicate')) {
                    report.suggestions.push('Check for and remove duplicate node IDs');
                }
                if (error.message.includes('not found')) {
                    report.suggestions.push('Verify that all link sources and targets reference existing node IDs');
                }
            }

            return report;
        }

        // Suggest fixes for common issues
        suggestFixes(errors) {
            const fixes = [];
            
            errors.forEach(error => {
                if (error.includes('missing')) {
                    fixes.push({
                        issue: error,
                        fix: 'Add the missing required field',
                        severity: 'high',
                        automated: false
                    });
                } else if (error.includes('duplicate')) {
                    fixes.push({
                        issue: error,
                        fix: 'Rename one of the duplicate IDs to make it unique',
                        severity: 'high',
                        automated: false
                    });
                } else if (error.includes('not found')) {
                    fixes.push({
                        issue: error,
                        fix: 'Check link references and ensure all node IDs exist',
                        severity: 'high',
                        automated: false
                    });
                } else if (error.includes('flow conservation')) {
                    fixes.push({
                        issue: error,
                        fix: 'Adjust values to ensure flows balance correctly',
                        severity: 'medium',
                        automated: false
                    });
                }
            });
            
            return fixes;
        }

        // Calculate node metrics
        calculateNodeMetrics(node, links) {
            const incomingLinks = links.filter(l => l.target === node.id);
            const outgoingLinks = links.filter(l => l.source === node.id);
            
            return {
                incomingCount: incomingLinks.length,
                outgoingCount: outgoingLinks.length,
                totalInflow: incomingLinks.reduce((sum, l) => sum + l.value, 0),
                totalOutflow: outgoingLinks.reduce((sum, l) => sum + l.value, 0),
                efficiency: incomingLinks.length > 0 ? 
                    outgoingLinks.reduce((sum, l) => sum + l.value, 0) / incomingLinks.reduce((sum, l) => sum + l.value, 0) : 
                    null
            };
        }

        // Generate comprehensive flow report
        generateFlowReport(data) {
            const processedData = this.processData(data);
            const flowValidation = this.validateFlowConservation(processedData);
            const integrityCheck = this.checkDataIntegrity(processedData);
            
            return {
                summary: {
                    totalNodes: processedData.nodes.length,
                    totalLinks: processedData.links.length,
                    totalValue: processedData.links.reduce((sum, l) => sum + l.value, 0),
                    conservationStatus: flowValidation.valid ? 'passed' : 'failed',
                    integrityStatus: integrityCheck.healthy ? 'healthy' : 'issues_detected'
                },
                conservation: flowValidation,
                integrity: integrityCheck,
                nodeMetrics: processedData.nodes.map(node => ({
                    id: node.id,
                    value: node.value,
                    inflow: node.totalInflow,
                    outflow: node.totalOutflow,
                    balance: node.flowBalance,
                    connections: node.sourceLinks.length + node.targetLinks.length
                })),
                recommendations: this.generateRecommendations(processedData, flowValidation, integrityCheck)
            };
        }

        // Generate optimization recommendations
        generateRecommendations(data, flowValidation, integrityCheck) {
            const recommendations = [];
            
            if (!flowValidation.valid) {
                recommendations.push({
                    type: 'critical',
                    category: 'flow_conservation',
                    message: 'Fix flow conservation issues to ensure accurate visualization',
                    actionable: true
                });
            }
            
            if (!integrityCheck.healthy) {
                recommendations.push({
                    type: 'warning',
                    category: 'data_integrity',
                    message: 'Address data integrity issues for better visualization quality',
                    actionable: true
                });
            }
            
            // Check for optimization opportunities
            const depthGroups = this.groupNodesByDepth(data.nodes);
            const depths = Array.from(depthGroups.keys());
            
            if (depths.length > 6) {
                recommendations.push({
                    type: 'suggestion',
                    category: 'layout',
                    message: 'Consider consolidating some layers to improve readability',
                    actionable: false
                });
            }
            
            const largeGroups = Array.from(depthGroups.values()).filter(group => group.length > 8);
            if (largeGroups.length > 0) {
                recommendations.push({
                    type: 'suggestion',
                    category: 'grouping',
                    message: 'Consider grouping smaller nodes within large layers',
                    actionable: false
                });
            }
            
            return recommendations;
        }

        // Utility methods
        groupNodesByDepth(nodes) {
            const groups = new Map();
            nodes.forEach(node => {
                if (!groups.has(node.depth)) {
                    groups.set(node.depth, []);
                }
                groups.get(node.depth).push(node);
            });
            return groups;
        }

        extractAdditionalProperties(obj, excludeKeys) {
            const additional = {};
            Object.keys(obj).forEach(key => {
                if (!excludeKeys.includes(key)) {
                    additional[key] = obj[key];
                }
            });
            return additional;
        }

        createDeepCopy(obj) {
            if (obj === null || typeof obj !== 'object') return obj;
            if (obj instanceof Date) return new Date(obj.getTime());
            if (obj instanceof Array) return obj.map(item => this.createDeepCopy(item));
            
            const copied = {};
            Object.keys(obj).forEach(key => {
                copied[key] = this.createDeepCopy(obj[key]);
            });
            return copied;
        }
    }

    // Export the data processor class
    window.SankeyDataProcessor = SankeyDataProcessor;

})();