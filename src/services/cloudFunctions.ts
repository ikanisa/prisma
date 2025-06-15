
import { initializeSession, logSessionEvent } from './firestore';

const FUNCTIONS_BASE_URL = 'https://us-central1-ikanisa-ac07c.cloudfunctions.net';

interface GenerateQRCodeRequest {
  receiver: string;
  amount: number;
  sessionId: string;
}

interface GenerateQRCodeResponse {
  qrCodeImage: string;
  ussdString: string;
  qrCodeUrl: string;
}

interface ScanQRCodeRequest {
  qrImage: string;
  sessionId: string;
}

interface ScanQRCodeResponse {
  ussdString: string;
  parsedReceiver: string;
  parsedAmount: number;
  result: string;
}

interface CreatePaymentLinkRequest {
  receiver: string;
  amount: number;
  sessionId: string;
}

interface CreatePaymentLinkResponse {
  paymentLink: string;
}

class CloudFunctionsService {
  private async callFunction<T>(functionName: string, data: any): Promise<T> {
    try {
      console.log(`[QR DEBUG] Call cloud function: ${functionName}`, data);
      const response = await fetch(`${FUNCTIONS_BASE_URL}/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      // Log raw response for diagnostics
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (parseErr) {
        console.error(`[QR DEBUG] Failed to parse JSON from ${functionName}:`, text);
        throw new Error('Malformed response from server');
      }

      console.log(`[QR DEBUG] Result from ${functionName}:`, result);

      if (!response.ok) {
        console.error(`[QR DEBUG] HTTP error (${response.status}) from ${functionName}:`, result);
        throw new Error(result?.error || `HTTP error! status: ${response.status}`);
      }

      await logSessionEvent({
        function: functionName,
        status: 'success'
      });

      return result;
    } catch (error) {
      console.error(`[QR DEBUG] Error in ${functionName}:`, error);
      
      await logSessionEvent({
        function: functionName,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  async generateQRCode(receiver: string, amount: number): Promise<GenerateQRCodeResponse> {
    const sessionId = await initializeSession();
    console.log('[QR DEBUG] generateQRCode input:', { receiver, amount, sessionId });
    return this.callFunction<GenerateQRCodeResponse>('generateQRCode', {
      receiver,
      amount,
      sessionId
    });
  }

  async scanQRCodeImage(qrImage: string): Promise<ScanQRCodeResponse> {
    const sessionId = await initializeSession();
    return this.callFunction<ScanQRCodeResponse>('scanQRCodeImage', {
      qrImage,
      sessionId
    });
  }

  async createPaymentLink(receiver: string, amount: number): Promise<CreatePaymentLinkResponse> {
    const sessionId = await initializeSession();
    return this.callFunction<CreatePaymentLinkResponse>('createPaymentLink', {
      receiver,
      amount,
      sessionId
    });
  }

  async logShareEvent(method: string): Promise<void> {
    const sessionId = await initializeSession();
    await this.callFunction('logShareEvent', {
      sessionId,
      method,
      timestamp: new Date().toISOString()
    });
  }

  async getOfflineQRCode(): Promise<any> {
    const sessionId = await initializeSession();
    return this.callFunction('getOfflineQRCode', { sessionId });
  }
}

export const cloudFunctions = new CloudFunctionsService();

