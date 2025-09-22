import fs from "fs";
import path from "path";

// Domain categorization rules
const DOMAIN_RULES = {
  core: [
    'agent', 'router', 'webhook', 'gateway', 'orchestrator', 'processor',
    'memory', 'context', 'conversation', 'message', 'notification',
    'authentication', 'authorization', 'security', 'audit', 'logging',
    'monitor', 'metrics', 'health', 'system', 'config', 'setup',
    'test-', 'test_', 'validation', 'verify', 'check', 'env-',
    'circuit-breaker', 'rate-limit', 'performance', 'quality-gate'
  ],
  transport: [
    'driver', 'passenger', 'ride', 'trip', 'booking', 'fare',
    'vehicle', 'transport', 'location', 'spatial', 'nearby',
    'driver-', 'passenger-', 'ride-', 'trip-', 'booking-',
    'driver_', 'passenger_', 'ride_', 'trip_', 'booking_'
  ],
  commerce: [
    'payment', 'order', 'cart', 'checkout', 'product', 'inventory',
    'catalog', 'catalogue', 'shopping', 'purchase', 'transaction',
    'momo', 'qr-', 'qr_', 'split-', 'split_', 'tip', 'tips',
    'pos-', 'pos_', 'market', 'price', 'vendor', 'hardware'
  ],
  healthcare: [
    'pharmacy', 'prescription', 'rx-', 'rx_', 'medical', 'health',
    'drug', 'medicine', 'patient', 'doctor', 'clinic', 'hospital',
    'pharmacy-', 'prescription-', 'medical-', 'health-'
  ],
  'real-estate': [
    'property', 'real-estate', 'listing', 'house', 'apartment',
    'rent', 'buy', 'sell', 'agent', 'broker', 'mortgage',
    'property-', 'listing-', 'real-estate-', 'house-', 'apartment-'
  ],
  admin: [
    'admin', 'management', 'dashboard', 'analytics', 'report',
    'user-', 'user_', 'business-', 'business_', 'data-', 'data_',
    'export', 'import', 'sync', 'backup', 'restore', 'migration'
  ],
  testing: [
    'test', 'testing', 'mock', 'fixture', 'scenario', 'suite',
    'evaluation', 'benchmark', 'performance-test', 'load-test',
    'stress-test', 'integration-test', 'unit-test'
  ]
};

interface FunctionInfo {
  name: string;
  domain: string;
  confidence: number;
  path: string;
  exists: boolean;
}

function categorizeFunction(name: string): { domain: string; confidence: number } {
  const lowerName = name.toLowerCase();
  let bestMatch = { domain: 'core', confidence: 0 };

  for (const [domain, patterns] of Object.entries(DOMAIN_RULES)) {
    let matches = 0;
    for (const pattern of patterns) {
      if (lowerName.includes(pattern.toLowerCase())) {
        matches++;
      }
    }
    
    const confidence = matches / patterns.length;
    if (confidence > bestMatch.confidence) {
      bestMatch = { domain, confidence };
    }
  }

  return bestMatch;
}

function analyzeFunctions(): FunctionInfo[] {
  const functionsDir = path.join(process.cwd(), 'supabase', 'functions');
  const functions: FunctionInfo[] = [];

  if (!fs.existsSync(functionsDir)) {
    console.error('Functions directory not found');
    return functions;
  }

  const items = fs.readdirSync(functionsDir, { withFileTypes: true });
  
  for (const item of items) {
    if (item.isDirectory() && !item.name.startsWith('.') && !['core', 'transport', 'commerce', 'healthcare', 'real-estate', 'admin', 'testing'].includes(item.name)) {
      const { domain, confidence } = categorizeFunction(item.name);
      const functionPath = path.join(functionsDir, item.name);
      
      functions.push({
        name: item.name,
        domain,
        confidence,
        path: functionPath,
        exists: fs.existsSync(functionPath)
      });
    }
  }

  return functions.sort((a, b) => b.confidence - a.confidence);
}

function generateMoveCommands(functions: FunctionInfo[]): string[] {
  const commands: string[] = [];
  
  for (const func of functions) {
    if (func.confidence > 0.1) { // Lowered threshold from 0.3 to 0.1
      const sourcePath = `supabase/functions/${func.name}`;
      const targetPath = `supabase/functions/${func.domain}/${func.name}`;
      
      commands.push(`# ${func.name} -> ${func.domain} (confidence: ${(func.confidence * 100).toFixed(1)}%)`);
      commands.push(`mv "${sourcePath}" "${targetPath}"`);
    }
  }
  
  return commands;
}

function generateReport(functions: FunctionInfo[]): void {
  console.log('📊 Function Categorization Report');
  console.log('==================================');
  console.log('');

  // Group by domain
  const byDomain: { [key: string]: FunctionInfo[] } = {};
  for (const func of functions) {
    if (!byDomain[func.domain]) {
      byDomain[func.domain] = [];
    }
    byDomain[func.domain].push(func);
  }

  // Print summary
  console.log('📈 Summary by Domain:');
  for (const [domain, funcs] of Object.entries(byDomain)) {
    console.log(`  ${domain}: ${funcs.length} functions`);
  }
  console.log('');

  // Print detailed breakdown
  for (const [domain, funcs] of Object.entries(byDomain)) {
    console.log(`🏷️  ${domain.toUpperCase()} (${funcs.length} functions):`);
    for (const func of funcs) {
      const confidence = (func.confidence * 100).toFixed(1);
      console.log(`  - ${func.name} (${confidence}% confidence)`);
    }
    console.log('');
  }

  // Generate move commands
  const moveCommands = generateMoveCommands(functions);
  if (moveCommands.length > 0) {
    console.log('🚀 Move Commands:');
    console.log('================');
    console.log('');
    console.log('Run these commands to organize functions by domain:');
    console.log('');
    for (const command of moveCommands) {
      console.log(command);
    }
    console.log('');
  }

  // Save to file
  const reportPath = '/tmp/function-categorization-report.md';
  const moveScriptPath = '/tmp/move-functions.sh';
  
  let reportContent = '# Function Categorization Report\n\n';
  reportContent += `Generated: ${new Date().toISOString()}\n\n`;
  
  reportContent += '## Summary by Domain\n\n';
  for (const [domain, funcs] of Object.entries(byDomain)) {
    reportContent += `- **${domain}**: ${funcs.length} functions\n`;
  }
  
  reportContent += '\n## Detailed Breakdown\n\n';
  for (const [domain, funcs] of Object.entries(byDomain)) {
    reportContent += `### ${domain.toUpperCase()}\n\n`;
    for (const func of funcs) {
      const confidence = (func.confidence * 100).toFixed(1);
      reportContent += `- \`${func.name}\` (${confidence}% confidence)\n`;
    }
    reportContent += '\n';
  }
  
  fs.writeFileSync(reportPath, reportContent);
  
  let scriptContent = '#!/bin/bash\n\n';
  scriptContent += '# Function Organization Script\n';
  scriptContent += '# Generated automatically - review before running\n\n';
  scriptContent += 'set -e\n\n';
  scriptContent += 'echo "Organizing functions by domain..."\n\n';
  
  for (const command of moveCommands) {
    if (!command.startsWith('#')) {
      scriptContent += command + '\n';
    }
  }
  
  scriptContent += '\necho "Function organization complete!"\n';
  
  fs.writeFileSync(moveScriptPath, scriptContent);
  fs.chmodSync(moveScriptPath, '755');
  
  console.log(`📄 Report saved to: ${reportPath}`);
  console.log(`📜 Move script saved to: ${moveScriptPath}`);
}

// Main execution
const functions = analyzeFunctions();
generateReport(functions); 