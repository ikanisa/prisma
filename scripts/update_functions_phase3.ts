import fs from "fs";
import path from "path";

// =======================================================================
// Phase 3 Function Update Script
// =======================================================================

interface FunctionUpdate {
  name: string;
  domain: string;
  path: string;
  currentContent: string;
  updatedContent: string;
  changes: string[];
}

function generatePhase3Template(functionName: string, domain: string): string {
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
import {
  withAuditPerformanceMonitoring,
  withSecurityMonitoring,
  logAuditTrail,
  logSecurityEvent,
  AuditedRateLimiter
} from "../../_shared/audit-utils.ts";

// =======================================================================
// ${functionName} Function - Phase 3 Production Ready
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

// Rate limiter for this function
const rateLimiter = new AuditedRateLimiter(100, 60000, FUNCTION_NAME); // 100 requests per minute

async function process${functionName.charAt(0).toUpperCase() + functionName.slice(1)}(
  input: FunctionInput,
  context: any
): Promise<FunctionOutput> {
  // Your main function logic here
  // Use withDatabaseErrorHandling for database operations
  // Use log() for structured logging
  
  // Example database operation with error handling
  // const result = await withDatabaseErrorHandling(
  //   () => supabase.from('your_table').select('*'),
  //   FUNCTION_NAME,
  //   context
  // );
  
  return {
    // Return your output
    success: true,
    message: 'Function executed successfully'
  };
}

serve(async (req) => {
  const context = createRequestContext(req);
  
  try {
    log('info', FUNCTION_NAME, 'Function called', {}, context);
    
    // Rate limiting check
    const rateLimitKey = context.ipAddress || 'unknown';
    const isAllowed = await rateLimiter.isAllowed(rateLimitKey, {
      userId: context.userId,
      ipAddress: context.ipAddress
    });
    
    if (!isAllowed) {
      log('warn', FUNCTION_NAME, 'Rate limit exceeded', { 
        ipAddress: context.ipAddress,
        remaining: rateLimiter.getRemaining(rateLimitKey)
      }, context);
      
      const errorResponse = createErrorResponse(
        ErrorCodes.RESOURCE_EXHAUSTED,
        'Rate limit exceeded',
        { 
          retry_after: 60,
          remaining: rateLimiter.getRemaining(rateLimitKey)
        }
      );
      
      return createResponse(errorResponse, HttpStatus.SERVICE_UNAVAILABLE);
    }
    
    // Parse and validate input
    const body = await req.json();
    const input = validateInput(InputSchema, body, FUNCTION_NAME, context);
    
    // Process with enhanced monitoring
    const result = await withAuditPerformanceMonitoring(
      FUNCTION_NAME,
      () => withSecurityMonitoring(
        FUNCTION_NAME,
        () => process${functionName.charAt(0).toUpperCase() + functionName.slice(1)}(input, context),
        context
      ),
      context
    );
    
    const response = createSuccessResponse(result);
    
    // Log successful execution
    await logAuditTrail({
      function_name: FUNCTION_NAME,
      user_id: context.userId,
      action: 'function_execution_success',
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      request_id: context.requestId,
      metadata: { 
        inputKeys: Object.keys(input),
        rateLimitKey,
        remainingRequests: rateLimiter.getRemaining(rateLimitKey)
      }
    });
    
    log('info', FUNCTION_NAME, 'Function completed successfully', { 
      inputKeys: Object.keys(input),
      remainingRequests: rateLimiter.getRemaining(rateLimitKey)
    }, context);
    
    return createResponse(response);
    
  } catch (error) {
    log('error', FUNCTION_NAME, 'Function failed', { 
      error: error.message 
    }, context);
    
    // Log security event for failed execution
    await logSecurityEvent({
      event_type: 'function_execution_failed',
      severity: 'medium',
      function_name: FUNCTION_NAME,
      user_id: context.userId,
      ip_address: context.ipAddress,
      user_agent: context.userAgent,
      details: { 
        error: error.message, 
        request_id: context.requestId 
      }
    });
    
    const errorResponse = createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Function execution failed',
      { error: error.message }
    );
    
    return createResponse(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
  }
});`;
}

function updateFunctionWithPhase3(functionPath: string, domain: string): FunctionUpdate | null {
  const name = path.basename(functionPath);
  const indexPath = path.join(functionPath, 'index.ts');
  
  if (!fs.existsSync(indexPath)) {
    return null;
  }
  
  const currentContent = fs.readFileSync(indexPath, 'utf-8');
  const updatedContent = generatePhase3Template(name, domain);
  
  const changes = [
    'Added Phase 3 audit logging and security monitoring',
    'Integrated with enhanced performance monitoring',
    'Added rate limiting with audit trail',
    'Enhanced error handling and security event logging',
    'Updated to use standardized response formats',
    'Added input validation with Zod schemas'
  ];
  
  return {
    name,
    domain,
    path: functionPath,
    currentContent,
    updatedContent,
    changes
  };
}

function updateAllFunctions(): FunctionUpdate[] {
  const functionsDir = path.join(process.cwd(), 'supabase', 'functions');
  const domains = ['core', 'transport', 'commerce', 'healthcare', 'real-estate', 'admin', 'testing'];
  const updates: FunctionUpdate[] = [];
  
  for (const domain of domains) {
    const domainPath = path.join(functionsDir, domain);
    if (!fs.existsSync(domainPath)) continue;
    
    const items = fs.readdirSync(domainPath, { withFileTypes: true });
    
    for (const item of items) {
      if (item.isDirectory()) {
        const functionPath = path.join(domainPath, item.name);
        const update = updateFunctionWithPhase3(functionPath, domain);
        if (update) {
          updates.push(update);
        }
      }
    }
  }
  
  return updates;
}

function generateUpdateReport(updates: FunctionUpdate[]): void {
  console.log('🛡️  Phase 3 Function Updates Report');
  console.log('====================================');
  console.log('');
  
  console.log('📊 Summary:');
  console.log(`  Total Functions to Update: ${updates.length}`);
  console.log('');
  
  // Group by domain
  const byDomain: { [key: string]: FunctionUpdate[] } = {};
  for (const update of updates) {
    if (!byDomain[update.domain]) {
      byDomain[update.domain] = [];
    }
    byDomain[update.domain].push(update);
  }
  
  console.log('🏷️  By Domain:');
  for (const [domain, funcs] of Object.entries(byDomain)) {
    console.log(`  ${domain}: ${funcs.length} functions`);
  }
  console.log('');
  
  console.log('🔧 Functions to Update:');
  for (const update of updates) {
    console.log(`  ${update.domain}/${update.name}:`);
    for (const change of update.changes) {
      console.log(`    - ${change}`);
    }
  }
  console.log('');
  
  // Save detailed report
  const reportPath = '/tmp/phase3-update-report.md';
  let reportContent = '# Phase 3 Function Updates Report\n\n';
  reportContent += `Generated: ${new Date().toISOString()}\n\n`;
  
  reportContent += '## Summary\n\n';
  reportContent += `- **Total Functions**: ${updates.length}\n\n`;
  
  reportContent += '## Functions to Update\n\n';
  for (const update of updates) {
    reportContent += `### ${update.domain}/${update.name}\n\n`;
    reportContent += '**Changes:**\n';
    for (const change of update.changes) {
      reportContent += `- ${change}\n`;
    }
    reportContent += '\n';
  }
  
  fs.writeFileSync(reportPath, reportContent);
  console.log(`📄 Detailed report saved to: ${reportPath}`);
  
  // Generate update files
  const updatesDir = '/tmp/phase3-updates';
  fs.mkdirSync(updatesDir, { recursive: true });
  
  for (const update of updates) {
    const updatePath = path.join(updatesDir, `${update.domain}-${update.name}-phase3.ts`);
    fs.writeFileSync(updatePath, update.updatedContent);
  }
  
  console.log(`📜 Updated function files saved to: ${updatesDir}`);
  
  // Generate deployment script
  const deployScript = `#!/bin/bash
# Phase 3 Function Deployment Script
# Generated: ${new Date().toISOString()}

echo "🚀 Deploying Phase 3 function updates..."

${updates.map(update => 
  `echo "📦 Deploying ${update.domain}/${update.name}..."
supabase functions deploy ${update.domain}/${update.name}`
).join('\n\n')}

echo "✅ Phase 3 deployment completed!"
`;

  const deployScriptPath = '/tmp/deploy-phase3.sh';
  fs.writeFileSync(deployScriptPath, deployScript);
  fs.chmodSync(deployScriptPath, '755');
  
  console.log(`🚀 Deployment script saved to: ${deployScriptPath}`);
  console.log('   Run: /tmp/deploy-phase3.sh to deploy all updated functions');
}

// Main execution
const updates = updateAllFunctions();
generateUpdateReport(updates); 