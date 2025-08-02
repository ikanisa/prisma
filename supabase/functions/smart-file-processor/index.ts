import { supabaseClient } from "./client.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getOpenAI, generateIntelligentResponse } from '../_shared/openai-sdk.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const targetTable = formData.get('targetTable') as string;
    const action = formData.get('action') as string || 'process';

    if (!file) {
      throw new Error('No file provided');
    }

    console.log(`📄 Processing file: ${file.name} (${file.size} bytes) for table: ${targetTable}`);

    let fileContent = '';
    
    // Extract content based on file type
    if (file.type.includes('text/csv') || file.name.endsWith('.csv')) {
      fileContent = await file.text();
    } else if (file.type.includes('application/json') || file.name.endsWith('.json')) {
      fileContent = await file.text();
    } else if (file.type.includes('text/') || file.name.endsWith('.txt')) {
      fileContent = await file.text();
    } else if (file.type.includes('application/pdf')) {
      // For PDF, we'll need to extract text - for now, just indicate it's a PDF
      fileContent = `[PDF FILE: ${file.name}] - Content extraction would require additional processing`;
    } else {
      // Try to read as text anyway
      fileContent = await file.text();
    }

    console.log(`📝 Extracted content length: ${fileContent.length}`);

    // Use OpenAI to intelligently parse and structure the data
    const prompt = createExtractionPrompt(targetTable, fileContent, file.name);
    
    // Use OpenAI SDK with Rwanda-specific data extraction
    const systemPrompt = 'You are a data extraction expert for easyMO Rwanda business data. Extract and structure data from files into the specified database table format. Focus on mobile money integration, local business practices, and Rwanda market context. Always respond with valid JSON.';
    
    const extractedData = await generateIntelligentResponse(
      prompt,
      systemPrompt,
      [],
      {
        model: 'gpt-4.1-2025-04-14',
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      }
    );
    
    let structuredData;
    try {
      structuredData = JSON.parse(extractedData);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      throw new Error('AI response was not valid JSON');
    }

    console.log(`🤖 AI extracted content: ${JSON.stringify(structuredData).substring(0, 200)}...`);

    // Process based on action and target table
    let result;
    switch (action) {
      case 'process':
        result = await processDataToTable(targetTable, structuredData);
        break;
      case 'validate':
        result = await validateData(targetTable, structuredData);
        break;
      default:
        result = await processDataToTable(targetTable, structuredData);
    }

    // Log the operation
    await supabase.from('agent_execution_log').insert({
      function_name: 'smart-file-processor',
      input_data: { 
        fileName: file.name, 
        fileSize: file.size, 
        targetTable, 
        action,
        recordsProcessed: result.totalRecords || 0
      },
      success_status: true,
      execution_time_ms: Date.now(),
      model_used: 'gpt-4.1-2025-04-14'
    });

    return new Response(JSON.stringify({
      success: true,
      data: result,
      message: `Successfully processed ${file.name} for ${targetTable}`,
      aiResponse: JSON.stringify(structuredData).substring(0, 500)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Smart file processor error:', error);
    
    await supabase.from('agent_execution_log').insert({
      function_name: 'smart-file-processor',
      success_status: false,
      error_details: error.message,
      execution_time_ms: Date.now()
    });

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function createExtractionPrompt(targetTable: string, content: string, fileName: string): string {
  const tableSchemas = {
    farmers: {
      required: ['name', 'whatsapp'],
      optional: ['district', 'crops', 'status'],
      description: 'Farmers with their contact info and crop details'
    },
    contacts: {
      required: ['phone_number'],
      optional: ['name', 'contact_type', 'location'],
      description: 'Contact information for customers, drivers, farmers, etc.'
    },
    businesses: {
      required: ['name', 'category', 'momo_code'],
      optional: ['location_gps', 'owner_user_id', 'subscription_status'],
      description: 'Business entities like bars, pharmacies, shops'
    },
    drivers: {
      required: ['name', 'phone'],
      optional: ['license_number', 'vehicle_type', 'status', 'location'],
      description: 'Driver information for logistics'
    },
    products: {
      required: ['name', 'price'],
      optional: ['description', 'category', 'vendor_id', 'stock_quantity'],
      description: 'Product listings for marketplace'
    }
  };

  const schema = tableSchemas[targetTable] || {
    required: ['name'],
    optional: ['description'],
    description: 'Generic data entries'
  };

  return `
Please extract data from this file and structure it for the "${targetTable}" table.

File: ${fileName}
Target Table: ${targetTable}
Table Description: ${schema.description}

Required fields: ${schema.required.join(', ')}
Optional fields: ${schema.optional.join(', ')}

File Content:
${content}

Instructions:
1. Extract all relevant records from the file
2. Map the data to the appropriate fields for the ${targetTable} table
3. Ensure required fields are populated
4. Use intelligent field mapping (e.g., "phone" -> "phone_number", "mobile" -> "whatsapp")
5. For missing required data, try to infer reasonable defaults
6. Clean and normalize the data (phone numbers, names, etc.)
7. Return ONLY valid JSON in this format:

{
  "records": [
    {
      "field1": "value1",
      "field2": "value2"
    }
  ],
  "summary": {
    "total_records": 0,
    "valid_records": 0,
    "mapping_notes": "any important mapping decisions"
  }
}

For ${targetTable} specifically:
${targetTable === 'farmers' ? '- Extract crop types into an array for the crops field\n- Normalize district names\n- Ensure phone numbers are in international format' : ''}
${targetTable === 'contacts' ? '- Determine contact_type based on context (customer, driver, farmer, prospect)\n- Normalize phone numbers to international format' : ''}
${targetTable === 'businesses' ? '- Generate appropriate momo codes if missing\n- Categorize as bar, pharmacy, or shop based on context' : ''}
${targetTable === 'drivers' ? '- Extract vehicle information\n- Determine driver status from context' : ''}
${targetTable === 'products' ? '- Extract pricing information\n- Categorize products appropriately' : ''}
`;
}

async function processDataToTable(targetTable: string, structuredData: any) {
  const records = structuredData.records || [];
  let insertedCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  console.log(`📊 Processing ${records.length} records for ${targetTable}`);

  for (const record of records) {
    try {
      // Table-specific processing
      const processedRecord = await preprocessRecord(targetTable, record);
      
      const { error } = await supabase
        .from(targetTable)
        .insert([processedRecord]);

      if (error) {
        console.error(`Insert error for ${targetTable}:`, error);
        errors.push(`Row ${insertedCount + errorCount + 1}: ${error.message}`);
        errorCount++;
      } else {
        insertedCount++;
      }
    } catch (error) {
      console.error(`Processing error:`, error);
      errors.push(`Row ${insertedCount + errorCount + 1}: ${error.message}`);
      errorCount++;
    }
  }

  return {
    totalRecords: records.length,
    insertedCount,
    errorCount,
    errors,
    summary: structuredData.summary
  };
}

async function preprocessRecord(targetTable: string, record: any) {
  switch (targetTable) {
    case 'farmers':
      return {
        ...record,
        whatsapp: normalizePhoneNumber(record.whatsapp || record.phone || record.phone_number),
        crops: Array.isArray(record.crops) ? record.crops : 
               (record.crops ? record.crops.split(',').map(c => c.trim()) : []),
        status: record.status || 'active'
      };
    
    case 'contacts':
      return {
        ...record,
        phone_number: normalizePhoneNumber(record.phone_number || record.phone || record.whatsapp),
        contact_type: record.contact_type || 'prospect',
        first_contact_date: new Date().toISOString()
      };
    
    case 'businesses':
      return {
        ...record,
        momo_code: record.momo_code || generateMomoCode(record.name),
        category: record.category || inferBusinessCategory(record.name, record.description),
        subscription_status: record.subscription_status || 'trial'
      };
    
    case 'drivers':
      return {
        ...record,
        phone: normalizePhoneNumber(record.phone || record.phone_number || record.whatsapp),
        status: record.status || 'active'
      };
    
    default:
      return record;
  }
}

function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  
  let cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('0')) {
    cleaned = '250' + cleaned.substring(1);
  } else if (!cleaned.startsWith('250')) {
    cleaned = '250' + cleaned;
  }
  
  return '+' + cleaned;
}

function generateMomoCode(businessName: string): string {
  const cleaned = businessName.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const code = cleaned.substring(0, 6) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return code;
}

function inferBusinessCategory(name: string, description: string = ''): string {
  const text = (name + ' ' + description).toLowerCase();
  
  if (text.includes('bar') || text.includes('pub') || text.includes('restaurant') || text.includes('drink')) {
    return 'bar';
  }
  if (text.includes('pharmacy') || text.includes('medical') || text.includes('health') || text.includes('drug')) {
    return 'pharmacy';
  }
  return 'shop'; // default
}

async function validateData(targetTable: string, structuredData: any) {
  const records = structuredData.records || [];
  const validationResults = {
    validRecords: 0,
    invalidRecords: 0,
    errors: [] as string[]
  };

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const validation = validateRecord(targetTable, record);
    
    if (validation.isValid) {
      validationResults.validRecords++;
    } else {
      validationResults.invalidRecords++;
      validationResults.errors.push(`Row ${i + 1}: ${validation.errors.join(', ')}`);
    }
  }

  return validationResults;
}

function validateRecord(targetTable: string, record: any) {
  const errors: string[] = [];
  
  switch (targetTable) {
    case 'farmers':
      if (!record.name) errors.push('Name is required');
      if (!record.whatsapp && !record.phone && !record.phone_number) {
        errors.push('Phone number/WhatsApp is required');
      }
      break;
    
    case 'contacts':
      if (!record.phone_number && !record.phone && !record.whatsapp) {
        errors.push('Phone number is required');
      }
      break;
    
    case 'businesses':
      if (!record.name) errors.push('Business name is required');
      if (!record.category) errors.push('Category is required');
      break;
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}