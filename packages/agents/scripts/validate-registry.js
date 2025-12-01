#!/usr/bin/env node
import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';

function main() {
  console.log('🔍 Validating Agent Registry...\n');

  try {
    const registryPath = join(process.cwd(), 'config', 'agent_registry.yaml');
    const content = readFileSync(registryPath, 'utf-8');
    const registry = parse(content);

    console.log('📊 Registry Statistics:');
    console.log(`   Total Agents: ${registry.agents.length}`);
    console.log(`   Total Tools: ${registry.tools.length}`);
    
    const groups = [...new Set(registry.agents.map(a => a.group))];
    console.log(`   Groups: ${groups.join(', ')}`);
    console.log('');

    // Validation
    const errors = [];
    
    for (const agent of registry.agents) {
      if (!agent.id || !agent.label || !agent.group) {
        errors.push(`Agent missing required fields: ${agent.id || '(no id)'}`);
      }
      if (!agent.runtime?.openai || !agent.runtime?.gemini) {
        errors.push(`Agent ${agent.id} missing runtime config`);
      }
      if (!agent.persona || agent.persona.trim().length === 0) {
        errors.push(`Agent ${agent.id} missing persona`);
      }
    }

    if (errors.length > 0) {
      console.error('❌ Validation Failed:\n');
      errors.forEach((err, idx) => {
        console.error(`   ${idx + 1}. ${err}`);
      });
      process.exit(1);
    }

    console.log('✅ Validation Passed!\n');

    console.log('📋 Agent Breakdown by Group:');
    for (const group of groups) {
      const agents = registry.agents.filter(a => a.group === group);
      console.log(`   ${group}: ${agents.length} agents`);
      
      if (process.argv.includes('--verbose')) {
        agents.forEach(agent => {
          console.log(`      - ${agent.id}: ${agent.label}`);
        });
      }
    }
    console.log('');

    console.log('🔧 Tool Configuration:');
    for (const tool of registry.tools) {
      console.log(`   ${tool.id} (${tool.kind})`);
      console.log(`      OpenAI: ${tool.implementation.openai.tool_name}`);
      console.log(`      Gemini: ${tool.implementation.gemini.function_name}`);
    }
    console.log('');

    if (process.argv.includes('--check-scopes')) {
      console.log('🔍 Checking KB Scopes:');
      let totalScopes = 0;
      let multiScopeAgents = 0;

      for (const agent of registry.agents) {
        const scopes = agent.kb_scopes || [];
        totalScopes += scopes.length;
        if (scopes.length > 1) {
          multiScopeAgents++;
        }
      }

      console.log(`   Total KB Scopes: ${totalScopes}`);
      console.log(`   Agents with multiple scopes: ${multiScopeAgents}`);
      console.log('');
    }

    if (process.argv.includes('--check-models')) {
      console.log('🤖 Model Distribution:');
      const openaiModels = new Map();
      const geminiModels = new Map();

      for (const agent of registry.agents) {
        const openaiModel = agent.runtime.openai.model;
        const geminiModel = agent.runtime.gemini.model;

        openaiModels.set(openaiModel, (openaiModels.get(openaiModel) || 0) + 1);
        geminiModels.set(geminiModel, (geminiModels.get(geminiModel) || 0) + 1);
      }

      console.log('   OpenAI:');
      for (const [model, count] of openaiModels) {
        console.log(`      ${model}: ${count} agents`);
      }

      console.log('   Gemini:');
      for (const [model, count] of geminiModels) {
        console.log(`      ${model}: ${count} agents`);
      }
      console.log('');
    }

    console.log('✨ Registry is ready for use!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error loading registry:');
    console.error(`   ${error.message || String(error)}`);
    process.exit(1);
  }
}

main();
