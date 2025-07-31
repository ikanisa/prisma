import fs from "fs";
import path from "path";

// =======================================================================
// Function Standards Update Script
// =======================================================================

interface FunctionAnalysis {
  name: string;
  domain: string;
  path: string;
  hasErrorHandling: boolean;
  hasLogging: boolean;
  hasInputValidation: boolean;
  hasPerformanceMonitoring: boolean;
  usesSharedUtils: boolean;
  needsUpdate: boolean;
  recommendations: string[];
}

const STANDARDS = {
  requiredImports: [
    'createSuccessResponse',
    'createErrorResponse',
    'createRequestContext',
    'log',
    'withPerformanceMonitoring',
    'validateInput',
    'withDatabaseErrorHandling'
  ],
  requiredPatterns: [
    'try {',
    'catch (error) {',
    'log(',
    'createSuccessResponse(',
    'createErrorResponse('
  ],
  deprecatedPatterns: [
    'console.log(',
    'console.error(',
    'return new Response(',
    'JSON.stringify({'
  ]
};

function analyzeFunction(functionPath: string, domain: string): FunctionAnalysis {
  const name = path.basename(functionPath);
  const indexPath = path.join(functionPath, 'index.ts');
  
  if (!fs.existsSync(indexPath)) {
    return {
      name,
      domain,
      path: functionPath,
      hasErrorHandling: false,
      hasLogging: false,
      hasInputValidation: false,
      hasPerformanceMonitoring: false,
      usesSharedUtils: false,
      needsUpdate: true,
      recommendations: ['Function file not found']
    };
  }
  
  const content = fs.readFileSync(indexPath, 'utf-8');
  const lines = content.split('\n');
  
  const analysis: FunctionAnalysis = {
    name,
    domain,
    path: functionPath,
    hasErrorHandling: false,
    hasLogging: false,
    hasInputValidation: false,
    hasPerformanceMonitoring: false,
    usesSharedUtils: false,
    needsUpdate: false,
    recommendations: []
  };
  
  // Check for required imports
  const hasRequiredImports = STANDARDS.requiredImports.some(importName => 
    content.includes(importName)
  );
  
  // Check for required patterns
  const hasRequiredPatterns = STANDARDS.requiredPatterns.some(pattern => 
    content.includes(pattern)
  );
  
  // Check for deprecated patterns
  const hasDeprecatedPatterns = STANDARDS.deprecatedPatterns.some(pattern => 
    content.includes(pattern)
  );
  
  // Analyze specific patterns
  analysis.hasErrorHandling = content.includes('try {') && content.includes('catch (error) {');
  analysis.hasLogging = content.includes('log(');
  analysis.hasInputValidation = content.includes('validateInput(');
  analysis.hasPerformanceMonitoring = content.includes('withPerformanceMonitoring(');
  analysis.usesSharedUtils = content.includes('from "../../_shared/utils.ts"') || 
                             content.includes('from "../_shared/utils.ts"');
  
  // Determine if update is needed
  analysis.needsUpdate = !hasRequiredImports || !hasRequiredPatterns || hasDeprecatedPatterns;
  
  // Generate recommendations
  if (!analysis.hasErrorHandling) {
    analysis.recommendations.push('Add structured error handling with try-catch blocks');
  }
  
  if (!analysis.hasLogging) {
    analysis.recommendations.push('Add structured logging using the log() utility');
  }
  
  if (!analysis.hasInputValidation) {
    analysis.recommendations.push('Add input validation using validateInput() with Zod schemas');
  }
  
  if (!analysis.hasPerformanceMonitoring) {
    analysis.recommendations.push('Wrap main logic with withPerformanceMonitoring()');
  }
  
  if (!analysis.usesSharedUtils) {
    analysis.recommendations.push('Import utilities from _shared/utils.ts');
  }
  
  if (hasDeprecatedPatterns) {
    analysis.recommendations.push('Replace deprecated patterns with standardized utilities');
  }
  
  return analysis;
}

function generateUpdateTemplate(functionName: string, domain: string): string {
  return `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createRequestContext,
  log,
  withPerformanceMonitoring,
  validateInput,
  withDatabaseErrorHandling,
  createResponse,
  HttpStatus,
  ErrorCodes
} from "../../_shared/utils.ts";

// =======================================================================
// ${functionName} Function
// =======================================================================

const FUNCTION_NAME = '${functionName}';

// Input validation schema
const InputSchema = z.object({
  // Define your input schema here
  // example: name: z.string().min(1),
  // example: email: z.string().email(),
});

interface FunctionInput extends z.infer<typeof InputSchema> {
  // Add any additional input properties
}

interface FunctionOutput {
  // Define your output structure
  // example: result: string;
  // example: processed: boolean;
}

async function process${functionName.charAt(0).toUpperCase() + functionName.slice(1)}(
  input: FunctionInput,
  context: any
): Promise<FunctionOutput> {
  // Your main function logic here
  // Use withDatabaseErrorHandling for database operations
  // Use log() for structured logging
  
  return {
    // Return your output
  };
}

serve(async (req) => {
  const context = createRequestContext(req);
  
  try {
    log('info', FUNCTION_NAME, 'Function called', {}, context);
    
    // Parse and validate input
    const body = await req.json();
    const input = validateInput(InputSchema, body, FUNCTION_NAME, context);
    
    // Process with performance monitoring
    const result = await withPerformanceMonitoring(
      FUNCTION_NAME,
      () => process${functionName.charAt(0).toUpperCase() + functionName.slice(1)}(input, context),
      context
    );
    
    const response = createSuccessResponse(result);
    
    log('info', FUNCTION_NAME, 'Function completed successfully', { 
      inputKeys: Object.keys(input) 
    }, context);
    
    return createResponse(response);
    
  } catch (error) {
    log('error', FUNCTION_NAME, 'Function failed', { 
      error: error.message 
    }, context);
    
    const errorResponse = createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Function execution failed',
      { error: error.message }
    );
    
    return createResponse(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
  }
});`;
}

function analyzeAllFunctions(): FunctionAnalysis[] {
  const functionsDir = path.join(process.cwd(), 'supabase', 'functions');
  const domains = ['core', 'transport', 'commerce', 'healthcare', 'real-estate', 'admin', 'testing'];
  const analyses: FunctionAnalysis[] = [];
  
  for (const domain of domains) {
    const domainPath = path.join(functionsDir, domain);
    if (!fs.existsSync(domainPath)) continue;
    
    const items = fs.readdirSync(domainPath, { withFileTypes: true });
    
    for (const item of items) {
      if (item.isDirectory()) {
        const functionPath = path.join(domainPath, item.name);
        const analysis = analyzeFunction(functionPath, domain);
        analyses.push(analysis);
      }
    }
  }
  
  return analyses;
}

function generateReport(analyses: FunctionAnalysis[]): void {
  console.log('📊 Function Standards Analysis Report');
  console.log('=====================================');
  console.log('');
  
  const totalFunctions = analyses.length;
  const functionsNeedingUpdate = analyses.filter(a => a.needsUpdate).length;
  const compliantFunctions = totalFunctions - functionsNeedingUpdate;
  
  console.log('📈 Summary:');
  console.log(`  Total Functions: ${totalFunctions}`);
  console.log(`  Compliant: ${compliantFunctions} (${((compliantFunctions/totalFunctions)*100).toFixed(1)}%)`);
  console.log(`  Need Update: ${functionsNeedingUpdate} (${((functionsNeedingUpdate/totalFunctions)*100).toFixed(1)}%)`);
  console.log('');
  
  // Group by domain
  const byDomain: { [key: string]: FunctionAnalysis[] } = {};
  for (const analysis of analyses) {
    if (!byDomain[analysis.domain]) {
      byDomain[analysis.domain] = [];
    }
    byDomain[analysis.domain].push(analysis);
  }
  
  console.log('🏷️  By Domain:');
  for (const [domain, funcs] of Object.entries(byDomain)) {
    const compliant = funcs.filter(f => !f.needsUpdate).length;
    const total = funcs.length;
    console.log(`  ${domain}: ${compliant}/${total} compliant (${((compliant/total)*100).toFixed(1)}%)`);
  }
  console.log('');
  
  // Functions needing updates
  const needsUpdate = analyses.filter(a => a.needsUpdate);
  if (needsUpdate.length > 0) {
    console.log('🔧 Functions Needing Updates:');
    for (const analysis of needsUpdate) {
      console.log(`  ${analysis.domain}/${analysis.name}:`);
      for (const rec of analysis.recommendations) {
        console.log(`    - ${rec}`);
      }
    }
    console.log('');
  }
  
  // Save detailed report
  const reportPath = '/tmp/function-standards-report.md';
  let reportContent = '# Function Standards Analysis Report\n\n';
  reportContent += `Generated: ${new Date().toISOString()}\n\n`;
  
  reportContent += '## Summary\n\n';
  reportContent += `- **Total Functions**: ${totalFunctions}\n`;
  reportContent += `- **Compliant**: ${compliantFunctions} (${((compliantFunctions/totalFunctions)*100).toFixed(1)}%)\n`;
  reportContent += `- **Need Update**: ${functionsNeedingUpdate} (${((functionsNeedingUpdate/totalFunctions)*100).toFixed(1)}%)\n\n`;
  
  reportContent += '## Functions Needing Updates\n\n';
  for (const analysis of needsUpdate) {
    reportContent += `### ${analysis.domain}/${analysis.name}\n\n`;
    reportContent += '**Recommendations:**\n';
    for (const rec of analysis.recommendations) {
      reportContent += `- ${rec}\n`;
    }
    reportContent += '\n';
  }
  
  fs.writeFileSync(reportPath, reportContent);
  console.log(`📄 Detailed report saved to: ${reportPath}`);
  
  // Generate update templates
  const templatesDir = '/tmp/function-templates';
  fs.mkdirSync(templatesDir, { recursive: true });
  
  for (const analysis of needsUpdate) {
    const template = generateUpdateTemplate(analysis.name, analysis.domain);
    const templatePath = path.join(templatesDir, `${analysis.domain}-${analysis.name}-template.ts`);
    fs.writeFileSync(templatePath, template);
  }
  
  console.log(`📜 Update templates saved to: ${templatesDir}`);
}

// Main execution
const analyses = analyzeAllFunctions();
generateReport(analyses); 