export const RESPONSE_POLICY = {
  sessionWindowMinutes: 24 * 60,
  clarifyThreshold: 0.4,              // intent confidence
  templateDomains: [
    'payments', 'mobility_driver', 'mobility_pass',
    'ordering', 'partner', 'support', 'profile',
    'marketing', 'listings_prop', 'listings_veh'
  ],
  plainDomains: ['core', 'dev', 'qa']
};