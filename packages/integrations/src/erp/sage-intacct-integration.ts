/**
 * Sage Intacct Integration
 * 
 * Integration with Sage Intacct via Web Services API.
 * 
 * Features:
 * - Session-based authentication
 * - Multi-entity support
 * - General ledger and account access
 * - Transaction management
 * - Dimensional reporting
 * - Custom objects
 * 
 * @example
 * ```typescript
 * import { sageClient } from './sage-intacct-integration';
 * 
 * // Get trial balance
 * const tb = await sageClient.getTrialBalance('2025-12');
 * 
 * // Create journal entry
 * const je = await sageClient.createJournalEntry(journalData);
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SageIntacctConfig {
    senderId: string;
    senderPassword: string;
    companyId: string;
    userId: string;
    userPassword: string;
    entityId?: string;
}

export interface SageAccount {
    RECORDNO: string;
    ACCOUNTNO: string;
    TITLE: string;
    ACCOUNTTYPE: string;
    NORMALBALANCE: 'debit' | 'credit';
    STATUS: 'active' | 'inactive';
    CLOSINGTYPE: 'non-closing' | 'closing to retained earnings';
}

export interface SageGLEntry {
    RECORDNO: string;
    BATCH_NO: string;
    BATCH_TITLE: string;
    JOURNAL: string;
    ENTRY_DATE: string;
    ACCOUNTNO: string;
    AMOUNT: number;
    DESCRIPTION: string;
    LOCATIONID?: string;
    DEPARTMENTID?: string;
    CUSTOMERID?: string;
    VENDORID?: string;
    PROJECTID?: string;
}

export interface SageTrialBalance {
    period: string;
    reportingBook?: string;
    accounts: {
        accountNo: string;
        accountTitle: string;
        beginningBalance: number;
        debit: number;
        credit: number;
        endingBalance: number;
    }[];
}

export interface SageJournalEntry {
    BATCH_DATE: string;
    BATCH_TITLE: string;
    ENTRIES: {
        ACCOUNTNO: string;
        AMOUNT: number;
        MEMO?: string;
        LOCATIONID?: string;
        DEPARTMENTID?: string;
    }[];
}

export interface SageResponse<T> {
    success: boolean;
    data?: T;
    error?: { code: string; message: string };
}

// ============================================================================
// SAGE INTACCT CLIENT
// ============================================================================

export class SageIntacctClient {
    private config: SageIntacctConfig;
    private sessionId: string | null = null;
    private baseUrl = 'https://api.intacct.com/ia/xml/xmlgw.phtml';

    constructor(config: SageIntacctConfig) {
        this.config = config;
    }

    /**
     * Create a session
     */
    async createSession(): Promise<string> {
        const request = this.buildRequest('getAPISession', {});
        const response = await this.sendRequest<{ api_session: { sessionid: string } }>(request);

        if (response.success && response.data) {
            this.sessionId = response.data.api_session.sessionid;
            return this.sessionId;
        }

        throw new Error('Failed to create session');
    }

    /**
     * Get chart of accounts
     */
    async getAccounts(): Promise<SageAccount[]> {
        const request = this.buildRequest('readByQuery', {
            object: 'GLACCOUNT',
            fields: 'RECORDNO,ACCOUNTNO,TITLE,ACCOUNTTYPE,NORMALBALANCE,STATUS,CLOSINGTYPE',
            query: "STATUS = 'active'",
            pagesize: 1000,
        });

        const response = await this.sendRequest<{ data: { GLACCOUNT: SageAccount[] } }>(request);
        return response.data?.data.GLACCOUNT ?? [];
    }

    /**
     * Get trial balance
     */
    async getTrialBalance(period: string, entityId?: string): Promise<SageTrialBalance> {
        const request = this.buildRequest('readReport', {
            reportname: 'Trial Balance',
            period,
            entityid: entityId ?? this.config.entityId,
        });

        const response = await this.sendRequest<{ data: unknown }>(request);

        // Parse report data into structured format
        return {
            period,
            accounts: [], // Would parse from response
        };
    }

    /**
     * Get GL entries
     */
    async getGLEntries(fromDate: string, toDate: string): Promise<SageGLEntry[]> {
        const request = this.buildRequest('readByQuery', {
            object: 'GLENTRY',
            fields: '*',
            query: `ENTRY_DATE >= '${fromDate}' AND ENTRY_DATE <= '${toDate}'`,
            pagesize: 1000,
        });

        const response = await this.sendRequest<{ data: { GLENTRY: SageGLEntry[] } }>(request);
        return response.data?.data.GLENTRY ?? [];
    }

    /**
     * Create journal entry
     */
    async createJournalEntry(entry: SageJournalEntry): Promise<{ recordNo: string }> {
        const glbatch = {
            JOURNAL: 'GJ',
            BATCH_DATE: entry.BATCH_DATE,
            BATCH_TITLE: entry.BATCH_TITLE,
            ENTRIES: entry.ENTRIES.map(e => ({
                GLENTRY: {
                    ACCOUNTNO: e.ACCOUNTNO,
                    TR_TYPE: e.AMOUNT >= 0 ? 1 : -1,
                    AMOUNT: Math.abs(e.AMOUNT),
                    MEMO: e.MEMO,
                    LOCATIONID: e.LOCATIONID,
                    DEPARTMENTID: e.DEPARTMENTID,
                },
            })),
        };

        const request = this.buildRequest('create', { GLBATCH: glbatch });
        const response = await this.sendRequest<{ data: { GLBATCH: { RECORDNO: string } } }>(request);

        return { recordNo: response.data?.data.GLBATCH.RECORDNO ?? '' };
    }

    /**
     * Get dimensions (locations, departments, etc.)
     */
    async getDimensions(type: 'LOCATION' | 'DEPARTMENT' | 'CLASS' | 'CUSTOMER' | 'VENDOR' | 'PROJECT'): Promise<{ id: string; name: string }[]> {
        const request = this.buildRequest('readByQuery', {
            object: type,
            fields: `${type}ID,NAME`,
            query: "STATUS = 'active'",
            pagesize: 1000,
        });

        const response = await this.sendRequest<{ data: Record<string, { [key: string]: string }[]> }>(request);
        const items = response.data?.data[type] ?? [];

        return items.map(item => ({
            id: item[`${type}ID`],
            name: item.NAME,
        }));
    }

    /**
     * Test connection
     */
    async testConnection(): Promise<{ connected: boolean; companyId: string }> {
        try {
            await this.createSession();
            return { connected: true, companyId: this.config.companyId };
        } catch {
            return { connected: false, companyId: '' };
        }
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private buildRequest(functionName: string, params: Record<string, unknown>): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
<request>
  <control>
    <senderid>${this.config.senderId}</senderid>
    <password>${this.config.senderPassword}</password>
    <controlid>${Date.now()}</controlid>
    <uniqueid>false</uniqueid>
    <dtdversion>3.0</dtdversion>
  </control>
  <operation>
    <authentication>
      ${this.sessionId
                ? `<sessionid>${this.sessionId}</sessionid>`
                : `<login>
            <userid>${this.config.userId}</userid>
            <companyid>${this.config.companyId}</companyid>
            <password>${this.config.userPassword}</password>
            ${this.config.entityId ? `<locationid>${this.config.entityId}</locationid>` : ''}
          </login>`
            }
    </authentication>
    <content>
      <function controlid="${Date.now()}">
        <${functionName}>
          ${this.paramsToXml(params)}
        </${functionName}>
      </function>
    </content>
  </operation>
</request>`;
    }

    private paramsToXml(params: Record<string, unknown>): string {
        return Object.entries(params)
            .map(([key, value]) => {
                if (value === undefined || value === null) return '';
                if (typeof value === 'object') {
                    return `<${key}>${this.paramsToXml(value as Record<string, unknown>)}</${key}>`;
                }
                return `<${key}>${value}</${key}>`;
            })
            .join('\n');
    }

    private async sendRequest<T>(xml: string): Promise<SageResponse<T>> {
        // In production, would make actual SOAP request
        // This is a simulation for demonstration

        return this.simulateResponse<T>(xml);
    }

    private simulateResponse<T>(_xml: string): SageResponse<T> {
        return {
            success: true,
            data: {} as T,
        };
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createSageIntacctClient(config: SageIntacctConfig): SageIntacctClient {
    return new SageIntacctClient(config);
}

export const sageClient = new SageIntacctClient({
    senderId: process.env.SAGE_SENDER_ID ?? '',
    senderPassword: process.env.SAGE_SENDER_PASSWORD ?? '',
    companyId: process.env.SAGE_COMPANY_ID ?? '',
    userId: process.env.SAGE_USER_ID ?? '',
    userPassword: process.env.SAGE_USER_PASSWORD ?? '',
    entityId: process.env.SAGE_ENTITY_ID,
});
