/**
 * OpenAI Agent Builder Workflow Utilities
 * 
 * Functions for creating, validating, and exporting Agent Builder workflows
 */

import type {
  AgentBuilderWorkflow,
  AgentBuilderNode,
  AgentBuilderConnection,
  AgentBuilderValidationResult,
  AgentBuilderExport,
} from './types';

/**
 * Create a new Agent Builder workflow
 */
export function createWorkflow(
  name: string,
  description: string,
  nodes: AgentBuilderNode[] = [],
  connections: AgentBuilderConnection[] = []
): AgentBuilderWorkflow {
  return {
    id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name,
    description,
    version: '1.0.0',
    nodes,
    connections,
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Validate an Agent Builder workflow
 */
export function validateWorkflow(workflow: AgentBuilderWorkflow): AgentBuilderValidationResult {
  const errors: AgentBuilderValidationResult['errors'] = [];
  const warnings: AgentBuilderValidationResult['warnings'] = [];

  // Check for required fields
  if (!workflow.name || workflow.name.trim().length === 0) {
    errors.push({
      message: 'Workflow name is required',
      severity: 'error',
    });
  }

  if (!workflow.description || workflow.description.trim().length === 0) {
    warnings.push({
      message: 'Workflow description is recommended',
    });
  }

  // Validate nodes
  const nodeIds = new Set<string>();
  for (const node of workflow.nodes) {
    if (!node.id || node.id.trim().length === 0) {
      errors.push({
        nodeId: node.id,
        message: 'Node ID is required',
        severity: 'error',
      });
      continue;
    }

    if (nodeIds.has(node.id)) {
      errors.push({
        nodeId: node.id,
        message: `Duplicate node ID: ${node.id}`,
        severity: 'error',
      });
    }
    nodeIds.add(node.id);

    if (!node.type) {
      errors.push({
        nodeId: node.id,
        message: 'Node type is required',
        severity: 'error',
      });
    }

    if (!node.label || node.label.trim().length === 0) {
      warnings.push({
        nodeId: node.id,
        message: 'Node label is recommended for better visualization',
      });
    }
  }

  // Validate connections
  const connectionIds = new Set<string>();
  for (const connection of workflow.connections) {
    if (!connection.id || connection.id.trim().length === 0) {
      errors.push({
        connectionId: connection.id,
        message: 'Connection ID is required',
        severity: 'error',
      });
      continue;
    }

    if (connectionIds.has(connection.id)) {
      errors.push({
        connectionId: connection.id,
        message: `Duplicate connection ID: ${connection.id}`,
        severity: 'error',
      });
    }
    connectionIds.add(connection.id);

    if (!connection.source || !nodeIds.has(connection.source)) {
      errors.push({
        connectionId: connection.id,
        message: `Connection source node "${connection.source}" does not exist`,
        severity: 'error',
      });
    }

    if (!connection.target || !nodeIds.has(connection.target)) {
      errors.push({
        connectionId: connection.id,
        message: `Connection target node "${connection.target}" does not exist`,
        severity: 'error',
      });
    }
  }

  // Check for orphaned nodes (nodes with no connections)
  const connectedNodeIds = new Set<string>();
  for (const connection of workflow.connections) {
    connectedNodeIds.add(connection.source);
    connectedNodeIds.add(connection.target);
  }

  for (const node of workflow.nodes) {
    if (!connectedNodeIds.has(node.id) && node.type !== 'input' && node.type !== 'output') {
      warnings.push({
        nodeId: node.id,
        message: `Node "${node.id}" is not connected to any other node`,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Export workflow to different formats
 */
export function exportWorkflow(
  workflow: AgentBuilderWorkflow,
  format: AgentBuilderExport['format'] = 'json',
  includeMetadata = true
): string {
  const exportData: AgentBuilderExport = {
    format,
    workflow: includeMetadata ? workflow : {
      ...workflow,
      metadata: undefined,
    },
    includeMetadata,
  };

  switch (format) {
    case 'json':
      return JSON.stringify(exportData.workflow, null, 2);

    case 'yaml':
      // Simple YAML conversion (for production, use a YAML library)
      return convertToYAML(exportData.workflow);

    case 'python':
      return generatePythonCode(exportData.workflow);

    case 'typescript':
      return generateTypeScriptCode(exportData.workflow);

    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Convert workflow to YAML (simplified)
 */
function convertToYAML(workflow: AgentBuilderWorkflow): string {
  const lines: string[] = [];
  lines.push(`name: ${workflow.name}`);
  lines.push(`description: ${workflow.description}`);
  lines.push(`version: ${workflow.version}`);
  lines.push('');
  lines.push('nodes:');
  for (const node of workflow.nodes) {
    lines.push(`  - id: ${node.id}`);
    lines.push(`    type: ${node.type}`);
    lines.push(`    label: ${node.label}`);
    if (node.config && Object.keys(node.config).length > 0) {
      lines.push(`    config:`);
      for (const [key, value] of Object.entries(node.config)) {
        lines.push(`      ${key}: ${JSON.stringify(value)}`);
      }
    }
  }
  lines.push('');
  lines.push('connections:');
  for (const connection of workflow.connections) {
    lines.push(`  - id: ${connection.id}`);
    lines.push(`    source: ${connection.source}`);
    lines.push(`    target: ${connection.target}`);
  }
  return lines.join('\n');
}

/**
 * Generate Python code from workflow
 */
function generatePythonCode(workflow: AgentBuilderWorkflow): string {
  const lines: string[] = [];
  lines.push('"""');
  lines.push(`${workflow.name}`);
  lines.push(`${workflow.description}`);
  lines.push('"""');
  lines.push('');
  lines.push('from openai import OpenAI');
  lines.push('');
  lines.push('client = OpenAI()');
  lines.push('');
  lines.push(`def execute_${workflow.id.replace(/[^a-zA-Z0-9]/g, '_')}(input_data):`);
  lines.push('    """Execute workflow"""');
  lines.push('    results = {}');
  lines.push('');
  
  // Generate code for each node
  for (const node of workflow.nodes) {
    lines.push(`    # Node: ${node.label} (${node.type})`);
    switch (node.type) {
      case 'agent':
        lines.push(`    results['${node.id}'] = client.agents.run(`);
        lines.push(`        agent_id="${node.config.agentId || ''}",`);
        lines.push(`        input=input_data.get('${node.id}', {}),`);
        lines.push(`    )`);
        break;
      case 'tool':
        lines.push(`    results['${node.id}'] = client.tools.call(`);
        lines.push(`        tool_id="${node.config.toolId || ''}",`);
        lines.push(`        input=input_data.get('${node.id}', {}),`);
        lines.push(`    )`);
        break;
      default:
        lines.push(`    # TODO: Implement ${node.type} node`);
    }
    lines.push('');
  }
  
  lines.push('    return results');
  return lines.join('\n');
}

/**
 * Generate TypeScript code from workflow
 */
function generateTypeScriptCode(workflow: AgentBuilderWorkflow): string {
  const lines: string[] = [];
  lines.push('/**');
  lines.push(` * ${workflow.name}`);
  lines.push(` * ${workflow.description}`);
  lines.push(' */');
  lines.push('');
  lines.push("import OpenAI from 'openai';");
  lines.push('');
  lines.push('const client = new OpenAI({');
  lines.push("  apiKey: process.env.OPENAI_API_KEY,");
  lines.push('});');
  lines.push('');
  lines.push(`export async function execute${workflow.id.replace(/[^a-zA-Z0-9]/g, '')}(`);
  lines.push('  inputData: Record<string, unknown>');
  lines.push('): Promise<Record<string, unknown>> {');
  lines.push('  const results: Record<string, unknown> = {};');
  lines.push('');
  
  // Generate code for each node
  for (const node of workflow.nodes) {
    lines.push(`  // Node: ${node.label} (${node.type})`);
    switch (node.type) {
      case 'agent':
        lines.push(`  results['${node.id}'] = await client.agents.run({`);
        lines.push(`    agentId: "${node.config.agentId || ''}",`);
        lines.push(`    input: inputData['${node.id}'] || {},`);
        lines.push(`  });`);
        break;
      case 'tool':
        lines.push(`  results['${node.id}'] = await client.tools.call({`);
        lines.push(`    toolId: "${node.config.toolId || ''}",`);
        lines.push(`    input: inputData['${node.id}'] || {},`);
        lines.push(`  });`);
        break;
      default:
        lines.push(`  // TODO: Implement ${node.type} node`);
    }
    lines.push('');
  }
  
  lines.push('  return results;');
  lines.push('}');
  return lines.join('\n');
}

/**
 * Find workflow nodes by type
 */
export function findNodesByType(
  workflow: AgentBuilderWorkflow,
  type: AgentBuilderNode['type']
): AgentBuilderNode[] {
  return workflow.nodes.filter((node) => node.type === type);
}

/**
 * Get workflow entry points (input nodes)
 */
export function getEntryPoints(workflow: AgentBuilderWorkflow): AgentBuilderNode[] {
  return findNodesByType(workflow, 'input');
}

/**
 * Get workflow exit points (output nodes)
 */
export function getExitPoints(workflow: AgentBuilderWorkflow): AgentBuilderNode[] {
  return findNodesByType(workflow, 'output');
}

/**
 * Get node dependencies (nodes that must execute before this node)
 */
export function getNodeDependencies(
  workflow: AgentBuilderWorkflow,
  nodeId: string
): AgentBuilderNode[] {
  const dependencies: AgentBuilderNode[] = [];
  const nodeMap = new Map(workflow.nodes.map((n) => [n.id, n]));

  for (const connection of workflow.connections) {
    if (connection.target === nodeId) {
      const sourceNode = nodeMap.get(connection.source);
      if (sourceNode) {
        dependencies.push(sourceNode);
        // Recursively get dependencies of dependencies
        const subDependencies = getNodeDependencies(workflow, sourceNode.id);
        for (const dep of subDependencies) {
          if (!dependencies.find((d) => d.id === dep.id)) {
            dependencies.push(dep);
          }
        }
      }
    }
  }

  return dependencies;
}

