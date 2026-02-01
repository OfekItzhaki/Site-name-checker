/**
 * Basic setup test to verify testing framework is working
 */

describe('Project Setup', () => {
  it('should have working test environment', () => {
    expect(true).toBe(true);
  });

  it('should be able to import from models', () => {
    const { AvailabilityStatus } = require('../src/models');
    expect(AvailabilityStatus).toBeDefined();
    expect(AvailabilityStatus.AVAILABLE).toBe('available');
  });

  it('should have fast-check available for property-based testing', () => {
    const fc = require('fast-check');
    expect(fc).toBeDefined();
    expect(typeof fc.integer).toBe('function');
  });
});