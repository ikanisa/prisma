import type { Request, Response } from 'express';
import { runAgent, getAgentConfig, getAllAgents, getAgentsByGroup, getAgentStats, validateRegistry } from '../../agents/agentRegistry';

export async function askAgentHandler(req: Request, res: Response) {
  try {
    const { agentId, message, history } = req.body;
    if (!agentId) return res.status(400).json({ error: 'agentId is required' });
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message is required and must be a string' });
    const result = await runAgent(agentId, message, { history });
    return res.json({ reply: result.text, agent_id: result.agent_id, model: result.model, sources: result.sources });
  } catch (error: any) {
    console.error('askAgent error:', error);
    if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getAgentHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const config = getAgentConfig(id);
    if (!config) return res.status(404).json({ error: `Agent not found: ${id}` });
    return res.json(config);
  } catch (error: any) {
    console.error('getAgent error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function listAgentsHandler(req: Request, res: Response) {
  try {
    const { group } = req.query;
    let agents;
    if (group && typeof group === 'string') {
      agents = getAgentsByGroup(group);
    } else {
      agents = getAllAgents();
    }
    return res.json({ agents, total: agents.length });
  } catch (error: any) {
    console.error('listAgents error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function getStatsHandler(req: Request, res: Response) {
  try {
    const stats = getAgentStats();
    return res.json(stats);
  } catch (error: any) {
    console.error('getStats error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

export async function validateHandler(req: Request, res: Response) {
  try {
    const errors = validateRegistry();
    return res.json({ valid: errors.length === 0, errors });
  } catch (error: any) {
    console.error('validate error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
