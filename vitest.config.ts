/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// @ts-expect-error: vitest types
export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./test/setup.ts'],
        css: true,
        exclude: [
            '**/node_modules/**',
            '**/temp_aios_core/**',
            '**/testsprite_tests/**',
            '**/.aios-core/**',
            '**/dist/**',
            '**/cypress/**',
            '**/.{idea,git,cache,output,temp}/**',
            '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*'
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'test/',
                '**/*.test.ts',
                '**/*.test.tsx',
                'dist/',
                'clerk-migration/',
                'testsprite_tests/',
                'temp_aios_core/',
                'scripts/',
                '*.config.ts',
                '*.config.js',
            ],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './'),
        },
    },
});
