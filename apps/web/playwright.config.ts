import { defineConfig, type PlaywrightTestConfig } from '@playwright/test';
import baseConfig from '../../playwright.config';

const config: PlaywrightTestConfig = {
  ...baseConfig,
  testDir: './tests/e2e',
};

export default defineConfig(config);
