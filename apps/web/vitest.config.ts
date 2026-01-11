/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['lib/**/*.test.ts', 'lib/**/*.spec.ts'],
        exclude: ['node_modules/**'],
        testTimeout: 30000,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './'),
            '@/lib': path.resolve(__dirname, './lib'),
        },
    },
});
