/**
 * Version Module Tests
 * 
 * Tests for semantic versioning utilities.
 */
import { describe, it, expect } from 'vitest';
import {
    VERSION,
    VERSION_INFO,
    getVersionString,
    getFullVersionInfo,
    compareVersions,
    isNewerVersion,
} from '../version';

describe('Version Module', () => {
    describe('VERSION', () => {
        it('should be a valid semver string', () => {
            expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
        });

        it('should be version 3.0.0', () => {
            expect(VERSION).toBe('3.0.0');
        });
    });

    describe('VERSION_INFO', () => {
        it('should contain version', () => {
            expect(VERSION_INFO.version).toBe(VERSION);
        });

        it('should contain name', () => {
            expect(VERSION_INFO.name).toBe('Prisma Glow');
        });

        it('should contain release date', () => {
            expect(VERSION_INFO.releaseDate).toBeDefined();
        });

        it('should contain environment', () => {
            expect(VERSION_INFO.environment).toBeDefined();
        });
    });

    describe('getVersionString', () => {
        it('should return version with v prefix', () => {
            expect(getVersionString()).toBe('v3.0.0');
        });
    });

    describe('getFullVersionInfo', () => {
        it('should return complete version info', () => {
            const info = getFullVersionInfo();
            expect(info).toEqual(VERSION_INFO);
        });
    });

    describe('compareVersions', () => {
        it('should return 0 for equal versions', () => {
            expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
            expect(compareVersions('2.3.4', '2.3.4')).toBe(0);
        });

        it('should return 1 when first is greater', () => {
            expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
            expect(compareVersions('1.1.0', '1.0.0')).toBe(1);
            expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
        });

        it('should return -1 when second is greater', () => {
            expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
            expect(compareVersions('1.0.0', '1.1.0')).toBe(-1);
            expect(compareVersions('1.0.0', '1.0.1')).toBe(-1);
        });
    });

    describe('isNewerVersion', () => {
        it('should return true when current is newer', () => {
            expect(isNewerVersion('2.0.0')).toBe(true);
            expect(isNewerVersion('1.0.0')).toBe(true);
        });

        it('should return false when current is same or older', () => {
            expect(isNewerVersion('3.0.0')).toBe(false);
            expect(isNewerVersion('4.0.0')).toBe(false);
        });
    });
});
