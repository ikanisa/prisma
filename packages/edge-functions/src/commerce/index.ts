// Commerce Domain Functions
export * from './payment-generator';
// The real edge wrapper might live in a separate file (e.g. qr-generator.ts)
// but for unit testing we expose the pure, dependency-free core logic here.
export * from './qr-payment-generator-core';
export * from './process-qr-scan-core';
export * from './order-processor';
