/**
 * Document Tools
 * 
 * Tools for document management, classification, and entity extraction
 */

import type { ToolDefinition, ToolHandler, ToolContext, ToolResult } from './types';
import { getSupabaseServiceClient } from './database';
import { hasEngagementAccess } from './database';

/**
 * upload_document - Upload a document to an engagement
 */
export const uploadDocumentDefinition: ToolDefinition = {
  name: 'upload_document',
  description: 'Upload a document to an engagement',
  inputSchema: {
    type: 'object',
    properties: {
      engagementId: {
        type: 'string',
        description: 'Engagement ID',
      },
      fileId: {
        type: 'string',
        description: 'File ID from storage service',
      },
      fileName: {
        type: 'string',
        description: 'Original file name',
      },
      tags: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Tags for the document',
      },
    },
    required: ['engagementId', 'fileId', 'fileName'],
  },
  idempotent: false,
};

export const uploadDocument: ToolHandler = async (input, context) => {
  const { engagementId, fileId, fileName, tags = [] } = input;

  if (!engagementId || !fileId || !fileName) {
    return {
      success: false,
      error: {
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'engagementId, fileId, and fileName are required',
      },
    };
  }

  // Check access to engagement
  const hasAccess = await hasEngagementAccess(engagementId, context);
  if (!hasAccess) {
    return {
      success: false,
      error: {
        code: 'ACCESS_DENIED',
        message: 'You do not have access to this engagement',
      },
    };
  }

  const supabase = getSupabaseServiceClient();

  // Get engagement to get org_id
  const { data: engagement } = await supabase
    .from('engagements')
    .select('org_id')
    .eq('id', engagementId)
    .single();

  if (!engagement) {
    return {
      success: false,
      error: {
        code: 'ENGAGEMENT_NOT_FOUND',
        message: 'Engagement not found',
      },
    };
  }

  // Create document record
  const { data, error } = await supabase
    .from('documents')
    .insert({
      org_id: engagement.org_id,
      engagement_id: engagementId,
      name: fileName,
      file_path: fileId, // Store file ID in file_path for now
      uploaded_by: context.userId,
      // Store tags as JSONB if tags column exists, otherwise in metadata
    })
    .select()
    .single();

  if (error) {
    return {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: `Failed to upload document: ${error.message}`,
        details: error,
      },
    };
  }

  return {
    success: true,
    data: {
      documentId: data.id,
      engagementId: data.engagement_id,
      fileId: data.file_path,
      fileName: data.name,
      tags, // Return tags even if not stored in DB yet
      uploadedBy: data.uploaded_by,
      uploadedAt: data.created_at,
      status: 'PENDING_CLASSIFICATION',
    },
  };
};

/**
 * classify_document - Classify a document using AI
 */
export const classifyDocumentDefinition: ToolDefinition = {
  name: 'classify_document',
  description: 'Classify a document using AI (agent-assisted)',
  inputSchema: {
    type: 'object',
    properties: {
      fileId: {
        type: 'string',
        description: 'File ID to classify',
      },
      documentId: {
        type: 'string',
        description: 'Document ID (optional, if already uploaded)',
      },
    },
    required: ['fileId'],
  },
  idempotent: false,
};

export const classifyDocument: ToolHandler = async (input, context) => {
  const { fileId, documentId } = input;

  if (!fileId) {
    return {
      success: false,
      error: {
        code: 'MISSING_FILE_ID',
        message: 'fileId is required',
      },
    };
  }

  // In production, this would call AI classification service
  return {
    success: true,
    data: {
      documentId: documentId || `doc_${Date.now()}`,
      fileId,
      classification: {
        category: 'FINANCIAL_STATEMENT',
        subcategory: 'BALANCE_SHEET',
        confidence: 0.95,
      },
      classifiedAt: new Date().toISOString(),
    },
  };
};

/**
 * extract_entities - Extract entities from a document (invoice totals, dates, vendor, etc.)
 */
export const extractEntitiesDefinition: ToolDefinition = {
  name: 'extract_entities',
  description: 'Extract entities from a document (invoice totals, dates, vendor, etc.)',
  inputSchema: {
    type: 'object',
    properties: {
      fileId: {
        type: 'string',
        description: 'File ID to extract entities from',
      },
      documentId: {
        type: 'string',
        description: 'Document ID (optional)',
      },
      entityTypes: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['AMOUNT', 'DATE', 'VENDOR', 'INVOICE_NUMBER', 'TAX', 'TOTAL'],
        },
        description: 'Types of entities to extract',
      },
    },
    required: ['fileId'],
  },
  idempotent: false,
};

export const extractEntities: ToolHandler = async (input, context) => {
  const { fileId, documentId, entityTypes } = input;

  if (!fileId) {
    return {
      success: false,
      error: {
        code: 'MISSING_FILE_ID',
        message: 'fileId is required',
      },
    };
  }

  // In production, this would call AI entity extraction service
  return {
    success: true,
    data: {
      documentId: documentId || `doc_${Date.now()}`,
      fileId,
      entities: [],
      extractedAt: new Date().toISOString(),
    },
  };
};

/**
 * generate_request_for_documents - Generate a document request checklist
 */
export const generateRequestForDocumentsDefinition: ToolDefinition = {
  name: 'generate_request_for_documents',
  description: 'Generate a request for documents checklist for an engagement',
  inputSchema: {
    type: 'object',
    properties: {
      engagementId: {
        type: 'string',
        description: 'Engagement ID',
      },
      documentTypes: {
        type: 'array',
        items: {
          type: 'string',
        },
        description: 'Types of documents to request (optional, will auto-generate if not provided)',
      },
    },
    required: ['engagementId'],
  },
  idempotent: false,
};

export const generateRequestForDocuments: ToolHandler = async (input, context) => {
  const { engagementId, documentTypes } = input;

  if (!engagementId) {
    return {
      success: false,
      error: {
        code: 'MISSING_ENGAGEMENT_ID',
        message: 'engagementId is required',
      },
    };
  }

  // Check access
  const hasAccess = await hasEngagementAccess(engagementId, context);
  if (!hasAccess) {
    return {
      success: false,
      error: {
        code: 'ACCESS_DENIED',
        message: 'You do not have access to this engagement',
      },
    };
  }

  const supabase = getSupabaseServiceClient();

  // Get engagement to determine type
  const { data: engagement } = await supabase
    .from('engagements')
    .select('id, title, status')
    .eq('id', engagementId)
    .single();

  if (!engagement) {
    return {
      success: false,
      error: {
        code: 'ENGAGEMENT_NOT_FOUND',
        message: 'Engagement not found',
      },
    };
  }

  // Generate checklist based on engagement type or provided document types
  // This is a simplified version - in production, this would use AI or templates
  const defaultChecklist = documentTypes || [
    'Financial Statements',
    'Trial Balance',
    'General Ledger',
    'Bank Statements',
    'Invoices',
    'Receipts',
  ];

  // Create document request (if table exists) or return checklist
  const checklist = defaultChecklist.map((docType, index) => ({
    id: `item_${index}`,
    documentType: docType,
    status: 'PENDING',
    requestedAt: new Date().toISOString(),
  }));

  return {
    success: true,
    data: {
      requestId: `req_${Date.now()}`,
      engagementId,
      checklist,
      generatedAt: new Date().toISOString(),
    },
  };
};

