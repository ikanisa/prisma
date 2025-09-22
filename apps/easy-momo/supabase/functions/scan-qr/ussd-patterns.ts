
import { UssdPattern } from './types.ts';

export const USSD_PATTERNS: UssdPattern[] = [
  { name: 'rwanda_mtn_phone', country: 'Rwanda', provider: 'MTN', pattern: /^\*182\*1\*1\*\d{9}\*\d{3,}#$/ },
  { name: 'rwanda_mtn_code', country: 'Rwanda', provider: 'MTN', pattern: /^\*182\*8\*1\*\d{4,6}\*\d{3,}#$/ },
  { name: 'uganda_mtn', country: 'Uganda', provider: 'MTN', pattern: /^\*165\*\d+\*\d+#$/ },
  { name: 'kenya_mpesa', country: 'Kenya', provider: 'Safaricom', pattern: /^\*234\*\d+\*\d+#$/ },
  { name: 'south_africa_mtn', country: 'South Africa', provider: 'MTN', pattern: /^\*134\*\d{3,}#$/ },
  { name: 'orange_money', country: 'Multiple', provider: 'Orange', pattern: /^\*126\*\d{3,}#$/ },
  { name: 'airtel_money', country: 'Multiple', provider: 'Airtel', pattern: /^\*144\*\d{3,}#$/ },
  { name: 'ghana_mtn', country: 'Ghana', provider: 'MTN', pattern: /^\*170\*\d+#$/ },
  { name: 'nigeria_gtbank', country: 'Nigeria', provider: 'GTBank', pattern: /^\*737\*\d+#$/ }
];
