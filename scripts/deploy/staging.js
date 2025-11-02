#!/usr/bin/env node
import { runDeployment } from './utils.js';

runDeployment('staging').catch((error) => {
  console.error(error);
  process.exit(1);
});
