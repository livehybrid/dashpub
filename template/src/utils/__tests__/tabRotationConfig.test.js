/**
 * Tests for tabRotationConfig utility
 */

import { getTabRotationInterval, formatInterval } from '../tabRotationConfig';

// Mock process.env
const originalEnv = process.env;

describe('tabRotationConfig', () => {
  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original process.env after all tests
    process.env = originalEnv;
  });

  describe('getTabRotationInterval', () => {
    it('should return default value when env variable is not set', () => {
      delete process.env.REACT_APP_TAB_ROTATION_INTERVAL;
      expect(getTabRotationInterval()).toBe(15000);
    });

    it('should return default value when env variable is empty', () => {
      process.env.REACT_APP_TAB_ROTATION_INTERVAL = '';
      expect(getTabRotationInterval()).toBe(15000);
    });

    it('should parse valid numeric string', () => {
      process.env.REACT_APP_TAB_ROTATION_INTERVAL = '10000';
      expect(getTabRotationInterval()).toBe(10000);
    });

    it('should return default value for invalid string', () => {
      process.env.REACT_APP_TAB_ROTATION_INTERVAL = 'invalid';
      expect(getTabRotationInterval()).toBe(15000);
    });

    it('should return default value for negative number', () => {
      process.env.REACT_APP_TAB_ROTATION_INTERVAL = '-1000';
      expect(getTabRotationInterval()).toBe(15000);
    });

    it('should return default value for zero', () => {
      process.env.REACT_APP_TAB_ROTATION_INTERVAL = '0';
      expect(getTabRotationInterval()).toBe(15000);
    });

    it('should enforce minimum value of 1000ms', () => {
      process.env.REACT_APP_TAB_ROTATION_INTERVAL = '500';
      expect(getTabRotationInterval()).toBe(1000);
    });

    it('should accept values above 5 minutes', () => {
      process.env.REACT_APP_TAB_ROTATION_INTERVAL = '600000';
      expect(getTabRotationInterval()).toBe(600000);
    });

    it('should use custom default value', () => {
      delete process.env.REACT_APP_TAB_ROTATION_INTERVAL;
      expect(getTabRotationInterval(30000)).toBe(30000);
    });
  });

  describe('formatInterval', () => {
    it('should format seconds correctly', () => {
      expect(formatInterval(5000)).toBe('5s');
      expect(formatInterval(30000)).toBe('30s');
    });

    it('should format minutes correctly', () => {
      expect(formatInterval(60000)).toBe('1m');
      expect(formatInterval(120000)).toBe('2m');
      expect(formatInterval(90000)).toBe('1m 30s');
    });

    it('should format hours correctly', () => {
      expect(formatInterval(3600000)).toBe('1h');
      expect(formatInterval(7200000)).toBe('2h');
      expect(formatInterval(3900000)).toBe('1h 5m');
    });

    it('should handle edge cases', () => {
      expect(formatInterval(0)).toBe('0s');
      expect(formatInterval(1000)).toBe('1s');
      expect(formatInterval(59999)).toBe('59s');
    });
  });
});
