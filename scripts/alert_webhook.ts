/* eslint-env node */
const url = process.env.ALERT_WEBHOOK_URL;
const message = process.argv[2] ?? 'Alert triggered';

if (!url) {
  console.error('ALERT_WEBHOOK_URL is not set');
  process.exit(1);
}

await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: message }),
});

console.log('Alert sent');
