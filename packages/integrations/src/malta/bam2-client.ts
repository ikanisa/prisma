/**
 * BAM II (Business Accounts Management) API Client
 * 
 * Integration with Malta Commissioner for Revenue BAM II portal
 * 
 * Endpoints:
 * - VAT return submission
 * - CIT return submission
 * - CIT refund submission
 * - PAYE real-time reporting
 * - Status tracking
 * 
 * Authentication: OAuth 2.0 Client Credentials Flow
 */

// ============================================================================
// TYPES
// ============================================================================

export interface BAM2Credentials {
  clientId: string;
  clientSecret: string;
  environment: 'sandbox' | 'production';
}

export interface AccessToken {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;  // Seconds
  scope: string;
  expiresAt: Date;  // Calculated
}

export interface BAM2APIError {
  error: string;
  error_description?: string;
  error_code?: string;
  details?: Record<string, unknown>;
}

export interface SubmissionResult {
  success: boolean;
  reference: string;
  submissionDate: Date;
  status: 'submitted' | 'accepted' | 'rejected' | 'processing';
  confirmationNumber?: string;
  errors?: string[];
  warnings?: string[];
}

export interface VatReturnSubmission {
  periodStart: Date;
  periodEnd: Date;
  vatNumber: string;
  xmlContent: string;  // BAM II XML format
}

export interface CITRefundSubmission {
  refundClaimForm: {
    formType: 'FS4';
    xmlContent: string;
    attachments?: string[];  // File URLs or base64
  };
}

export interface PayrollSubmission {
  entityId: string;
  vatNumber: string;
  payPeriod: {
    start: Date;
    end: Date;
  };
  employees: PayrollRecord[];
}

export interface PayrollRecord {
  employeeId: string;
  idCardNumber: string;
  grossPay: number;
  incomeTax: number;
  socialSecurity: number;
  netPay: number;
  paymentDate: Date;
}

export interface FilingStatus {
  reference: string;
  status: 'submitted' | 'processing' | 'accepted' | 'rejected';
  submittedAt: Date;
  processedAt?: Date;
  errors?: string[];
  paymentStatus?: 'pending' | 'paid' | 'overdue';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BAM2_BASE_URLS = {
  sandbox: 'https://sandbox.cfr.gov.mt/bam/api/v2',
  production: 'https://cfr.gov.mt/bam/api/v2'
};

const API_ENDPOINTS = {
  TOKEN: '/oauth/token',
  VAT_RETURNS: '/vat/returns',
  CIT_RETURNS: '/cit/returns',
  REFUND_CLAIMS: '/cit/refund-claims',
  PAYROLL: '/paye/payroll',
  STATUS: '/filings/status'
};

// Rate limiting
const RATE_LIMITS = {
  REQUESTS_PER_MINUTE: 100,
  REQUESTS_PER_HOUR: 5000
};

// ============================================================================
// BAM II CLIENT
// ============================================================================

export class BAM2Client {
  private baseUrl: string;
  private credentials: BAM2Credentials;
  private accessToken: AccessToken | null = null;
  private tokenExpiry: Date | null = null;
  private rateLimiter: Map<string, number[]> = new Map();  // Simple in-memory rate limiter

  constructor(credentials: BAM2Credentials) {
    this.credentials = credentials;
    this.baseUrl = BAM2_BASE_URLS[credentials.environment];
  }

  /**
   * Authenticate using OAuth 2.0 client credentials flow
   */
  async authenticate(): Promise<AccessToken> {
    // Check if existing token is still valid
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken;
    }

    const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.TOKEN}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        scope: 'vat:write cit:write paye:read refund:write'
      })
    });

    if (!response.ok) {
      const error: BAM2APIError = await response.json();
      throw new Error(`BAM II authentication failed: ${error.error_description || error.error}`);
    }

    const data = await response.json();
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + data.expires_in - 60); // 60s buffer

    this.accessToken = {
      ...data,
      expiresAt
    };
    this.tokenExpiry = expiresAt;

    return this.accessToken;
  }

  /**
   * Get valid access token (refresh if needed)
   */
  private async getValidToken(): Promise<string> {
    const token = await this.authenticate();
    return token.access_token;
  }

  /**
   * Check rate limits
   */
  private checkRateLimit(endpoint: string): void {
    const now = Date.now();
    const key = endpoint;
    const requests = this.rateLimiter.get(key) || [];

    // Remove requests older than 1 minute
    const recentRequests = requests.filter(timestamp => now - timestamp < 60000);

    if (recentRequests.length >= RATE_LIMITS.REQUESTS_PER_MINUTE) {
      throw new Error(`Rate limit exceeded for ${endpoint}. Max ${RATE_LIMITS.REQUESTS_PER_MINUTE} requests per minute.`);
    }

    recentRequests.push(now);
    this.rateLimiter.set(key, recentRequests);
  }

  /**
   * Retry with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (error instanceof Error) {
          if (error.message.includes('authentication') || 
              error.message.includes('unauthorized') ||
              error.message.includes('validation')) {
            throw error;
          }
        }

        // Calculate backoff delay
        const delay = initialDelay * Math.pow(2, attempt);
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Retry failed');
  }

  /**
   * Submit VAT return to BAM II
   */
  async submitVatReturn(vatReturn: VatReturnSubmission): Promise<SubmissionResult> {
    this.checkRateLimit(API_ENDPOINTS.VAT_RETURNS);
    
    return this.retryWithBackoff(async () => {
      const token = await this.getValidToken();

      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.VAT_RETURNS}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/xml',
          'Accept': 'application/json'
        },
        body: vatReturn.xmlContent
      });

      if (!response.ok) {
        const error: BAM2APIError = await response.json();
        throw new Error(`VAT return submission failed: ${error.error_description || error.error}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        reference: data.filingReference || data.reference,
        submissionDate: new Date(data.submittedAt || Date.now()),
        status: data.status || 'submitted',
        confirmationNumber: data.confirmationNumber,
        errors: data.errors || [],
        warnings: data.warnings || []
      };
    });
  }

  /**
   * Submit CIT refund claim
   */
  async submitCITRefund(refundSubmission: CITRefundSubmission): Promise<SubmissionResult> {
    this.checkRateLimit(API_ENDPOINTS.REFUND_CLAIMS);
    
    return this.retryWithBackoff(async () => {
      const token = await this.getValidToken();

      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.REFUND_CLAIMS}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/xml',
          'Accept': 'application/json'
        },
        body: refundSubmission.refundClaimForm.xmlContent
      });

      if (!response.ok) {
        const error: BAM2APIError = await response.json();
        throw new Error(`CIT refund submission failed: ${error.error_description || error.error}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        reference: data.claimReference || data.reference,
        submissionDate: new Date(data.submittedAt || Date.now()),
        status: data.status || 'submitted',
        confirmationNumber: data.confirmationNumber,
        errors: data.errors || [],
        warnings: data.warnings || []
      };
    });
  }

  /**
   * Submit real-time payroll data
   */
  async submitPayroll(payroll: PayrollSubmission): Promise<SubmissionResult> {
    this.checkRateLimit(API_ENDPOINTS.PAYROLL);
    
    return this.retryWithBackoff(async () => {
      const token = await this.getValidToken();

      const payload = {
        entityId: payroll.entityId,
        vatNumber: payroll.vatNumber,
        payPeriod: {
          start: payroll.payPeriod.start.toISOString(),
          end: payroll.payPeriod.end.toISOString()
        },
        employees: payroll.employees.map(emp => ({
          employeeId: emp.employeeId,
          idCardNumber: emp.idCardNumber,
          grossPay: this.roundCurrency(emp.grossPay),
          incomeTax: this.roundCurrency(emp.incomeTax),
          socialSecurity: this.roundCurrency(emp.socialSecurity),
          netPay: this.roundCurrency(emp.netPay),
          paymentDate: emp.paymentDate.toISOString().split('T')[0]
        }))
      };

      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.PAYROLL}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error: BAM2APIError = await response.json();
        throw new Error(`Payroll submission failed: ${error.error_description || error.error}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        reference: data.submissionReference || data.reference,
        submissionDate: new Date(data.submittedAt || Date.now()),
        status: data.status || 'submitted',
        errors: data.errors || [],
        warnings: data.warnings || []
      };
    });
  }

  /**
   * Get filing status
   */
  async getFilingStatus(reference: string): Promise<FilingStatus> {
    this.checkRateLimit(API_ENDPOINTS.STATUS);
    
    const token = await this.getValidToken();

    const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.STATUS}/${reference}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const error: BAM2APIError = await response.json();
      throw new Error(`Status check failed: ${error.error_description || error.error}`);
    }

    const data = await response.json();
    
    return {
      reference: data.reference || reference,
      status: data.status,
      submittedAt: new Date(data.submittedAt),
      processedAt: data.processedAt ? new Date(data.processedAt) : undefined,
      errors: data.errors || [],
      paymentStatus: data.paymentStatus
    };
  }

  /**
   * Round currency to 2 decimal places
   */
  private roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default BAM2Client;
