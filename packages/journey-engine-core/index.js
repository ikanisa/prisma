// Runtime registration for TypeScript sources so that the package can be used
// without a pre-build step in testing / CI environments where the TypeScript
// compiler may not be available. We fall back to the emitted JavaScript in
// `dist` if it exists and require succeeds.

/* eslint-disable @typescript-eslint/no-var-requires */
let impl;

try {
  // Prefer compiled output when present.
  impl = require('./dist/index.js');
} catch (_) {
  // Dynamically register ts-node (if available) and fall back to raw sources.
  try {
    require('ts-node/register/transpile-only');
  } catch (err) {
    // `ts-node` might not be available – in that case we rely on the runtime
    // (e.g. Bun) being able to execute TypeScript directly.
  }
  impl = require('./src/index.ts');
}

module.exports = impl;

