/**
 * Malta Integrations Index
 */

export {
    CFReServicesClient,
    createCFReServicesClient,
    createSandboxCFRClient,
    type CFReServicesConfig,
} from './cfr-eservices-client.js';

export {
    BAM2Client,
    default as bam2Client,
    type BAM2Credentials,
    type AccessToken,
    type BAM2APIError,
    type SubmissionResult,
    type VatReturnSubmission,
    type CITRefundSubmission,
    type PayrollSubmission,
    type PayrollRecord,
    type FilingStatus,
} from './bam2-client.js';
