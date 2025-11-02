#!/usr/bin/env node
import { runDeployment } from './utils.js';

runDeployment('prod').catch((error) => {
  console.error(error);
  process.exit(1);
});
