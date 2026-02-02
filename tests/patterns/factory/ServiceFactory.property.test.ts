import * as fc from 'fast-check';
import { ServiceFactory } from '../../../src/patterns/factory/ServiceFactory';
import type { IServiceConfig } from '../../../src/patterns/factory/IServiceFactory';

describe('ServiceFactory Property Tests', () => {
  let factory: ServiceFactory;

  beforeEach(() => {
    factory = new ServiceFactory();
  });

  afterEach(() => {
    factory.dispose();
  });

  describe('Service Creation Properties', () => {
    test('should always create services with valid configuration', () => {
      fc.assert(fc.property(
        fc.record({
          timeoutMs: fc.integer({ min: 100, max: 30000 }),
          maxRetries: fc.integer({ min: 0, max: 10 }),
          retryDelayMs: fc.integer({ min: 0, max: 5000 }),
          useExponentialBackoff: fc.boolean()
        }),
        (config: Partial<IServiceConfig>) => {
          const service = factory.createDNSService(config);
          const serviceConfig = service.getConfig();
          
          // Service should have valid configuration
          expect(serviceConfig.timeoutMs).toBeGreaterThan(0);
          expect(serviceConfig.maxRetries).toBeGreaterThanOrEqual(0);
          expect(serviceConfig.retryDelayMs).toBeGreaterThanOrEqual(0);
          expect(typeof serviceConfig.useExponentialBackoff).toBe('boolean');
          
          // Configuration should match input where provided
          if (config.timeoutMs !== undefined) {
            expect(serviceConfig.timeoutMs).toBe(config.timeoutMs);
          }
          if (config.maxRetries !== undefined) {
            expect(serviceConfig.maxRetries).toBe(config.maxRetries);
          }
        }
      ), { numRuns: 100 });
    });

    test('should create services of correct type regardless of configuration', () => {
      fc.assert(fc.property(
        fc.record({
          timeoutMs: fc.integer({ min: 1000, max: 10000 }),
          maxRetries: fc.integer({ min: 1, max: 5 }),
          retryDelayMs: fc.integer({ min: 100, max: 2000 }),
          useExponentialBackoff: fc.boolean()
        }),
        fc.constantFrom('DNS' as const, 'WHOIS' as const, 'HYBRID' as const),
        (config: Partial<IServiceConfig>, serviceType: 'DNS' | 'WHOIS' | 'HYBRID') => {
          const service = factory.getServiceByType(serviceType, config);
          
          expect(service.getServiceType()).toBe(serviceType);
          expect(typeof service.checkDomain).toBe('function');
          expect(typeof service.getConfig).toBe('function');
          expect(typeof service.setConfig).toBe('function');
        }
      ), { numRuns: 100 });
    });
  });

  describe('Configuration Management Properties', () => {
    test('should preserve configuration consistency across operations', () => {
      fc.assert(fc.property(
        fc.record({
          timeoutMs: fc.integer({ min: 1000, max: 15000 }),
          maxRetries: fc.integer({ min: 1, max: 8 }),
          retryDelayMs: fc.integer({ min: 100, max: 3000 }),
          useExponentialBackoff: fc.boolean()
        }),
        (config: Partial<IServiceConfig>) => {
          // Set default configuration
          factory.setDefaultConfig(config);
          const retrievedConfig = factory.getDefaultConfig();
          
          // Configuration should be preserved
          if (config.timeoutMs !== undefined) {
            expect(retrievedConfig.timeoutMs).toBe(config.timeoutMs);
          }
          if (config.maxRetries !== undefined) {
            expect(retrievedConfig.maxRetries).toBe(config.maxRetries);
          }
          if (config.retryDelayMs !== undefined) {
            expect(retrievedConfig.retryDelayMs).toBe(config.retryDelayMs);
          }
          if (config.useExponentialBackoff !== undefined) {
            expect(retrievedConfig.useExponentialBackoff).toBe(config.useExponentialBackoff);
          }
          
          // New services should use the updated configuration
          const service = factory.createDNSService();
          const serviceConfig = service.getConfig();
          
          if (config.timeoutMs !== undefined) {
            expect(serviceConfig.timeoutMs).toBe(config.timeoutMs);
          }
        }
      ), { numRuns: 100 });
    });

    test('should return immutable configuration copies', () => {
      fc.assert(fc.property(
        fc.record({
          timeoutMs: fc.integer({ min: 1000, max: 10000 }),
          maxRetries: fc.integer({ min: 1, max: 5 })
        }),
        (config: Partial<IServiceConfig>) => {
          factory.setDefaultConfig(config);
          
          const config1 = factory.getDefaultConfig();
          const config2 = factory.getDefaultConfig();
          
          // Should be equal but not the same object
          expect(config1).toEqual(config2);
          expect(config1).not.toBe(config2);
          
          // Modifying one should not affect the other
          config1.timeoutMs = 99999;
          expect(config2.timeoutMs).not.toBe(99999);
        }
      ), { numRuns: 50 });
    });
  });

  describe('Domain Optimization Properties', () => {
    test('should create valid optimized services for any domain', () => {
      fc.assert(fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.constantFrom('DNS' as const, 'WHOIS' as const, 'HYBRID' as const),
        (domain: string, serviceType: 'DNS' | 'WHOIS' | 'HYBRID') => {
          const service = factory.createOptimizedService(domain, serviceType);
          
          expect(service.getServiceType()).toBe(serviceType);
          
          const config = service.getConfig();
          expect(config.timeoutMs).toBeGreaterThan(0);
          expect(config.maxRetries).toBeGreaterThanOrEqual(0);
          expect(config.retryDelayMs).toBeGreaterThanOrEqual(0);
        }
      ), { numRuns: 100 });
    });

    test('should provide consistent optimization for same domain', () => {
      fc.assert(fc.property(
        fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.includes('.')),
        (domain: string) => {
          const service1 = factory.createOptimizedService(domain, 'DNS');
          const service2 = factory.createOptimizedService(domain, 'DNS');
          
          const config1 = service1.getConfig();
          const config2 = service2.getConfig();
          
          // Same domain should get same optimization
          expect(config1.timeoutMs).toBe(config2.timeoutMs);
          expect(config1.maxRetries).toBe(config2.maxRetries);
          expect(config1.retryDelayMs).toBe(config2.retryDelayMs);
        }
      ), { numRuns: 50 });
    });
  });

  describe('Caching Properties', () => {
    test('should maintain cache consistency with configuration changes', () => {
      fc.assert(fc.property(
        fc.record({
          timeoutMs: fc.integer({ min: 1000, max: 8000 }),
          maxRetries: fc.integer({ min: 1, max: 4 })
        }),
        fc.boolean(),
        (config: Partial<IServiceConfig>, enableCaching: boolean) => {
          factory.setCachingEnabled(enableCaching);
          
          // Create initial service
          const service1 = factory.createDNSService(config);
          
          // Create another service with same config
          const service2 = factory.createDNSService(config);
          const finalCacheSize = factory.getCacheStats().size;
          
          if (enableCaching) {
            // Should reuse cached instance
            expect(service1).toBe(service2);
          } else {
            // Should create new instance
            expect(service1).not.toBe(service2);
            expect(finalCacheSize).toBe(0); // No caching
          }
        }
      ), { numRuns: 50 });
    });

    test('should clear cache properly on configuration updates', () => {
      fc.assert(fc.property(
        fc.record({
          timeoutMs: fc.integer({ min: 2000, max: 6000 }),
          maxRetries: fc.integer({ min: 1, max: 3 })
        }),
        fc.record({
          timeoutMs: fc.integer({ min: 7000, max: 12000 }),
          maxRetries: fc.integer({ min: 4, max: 6 })
        }),
        (config1: Partial<IServiceConfig>, config2: Partial<IServiceConfig>) => {
          // Ensure configs are different
          if (config1.timeoutMs === config2.timeoutMs && config1.maxRetries === config2.maxRetries) {
            return; // Skip if configs are identical
          }
          
          // Create service with first config
          factory.setDefaultConfig(config1);
          const service1 = factory.createDNSService();
          
          // Update default config
          factory.setDefaultConfig(config2);
          const cacheSize2 = factory.getCacheStats().size;
          
          // Create service with new config
          const service2 = factory.createDNSService();
          
          // Cache should be cleared when config changes
          expect(cacheSize2).toBe(0);
          expect(service1).not.toBe(service2);
          
          // New service should have updated config
          const newConfig = service2.getConfig();
          if (config2.timeoutMs !== undefined) {
            expect(newConfig.timeoutMs).toBe(config2.timeoutMs);
          }
        }
      ), { numRuns: 50 });
    });
  });

  describe('Service Suite Properties', () => {
    test('should create complete service suite with consistent configuration', () => {
      fc.assert(fc.property(
        fc.record({
          timeoutMs: fc.integer({ min: 1000, max: 10000 }),
          maxRetries: fc.integer({ min: 1, max: 5 }),
          retryDelayMs: fc.integer({ min: 100, max: 2000 }),
          useExponentialBackoff: fc.boolean()
        }),
        (config: Partial<IServiceConfig>) => {
          const suite = factory.createServiceSuite(config);
          
          // Should have all three service types
          expect(suite.dns.getServiceType()).toBe('DNS');
          expect(suite.whois.getServiceType()).toBe('WHOIS');
          expect(suite.hybrid.getServiceType()).toBe('HYBRID');
          
          // All services should have consistent configuration
          const dnsConfig = suite.dns.getConfig();
          const whoisConfig = suite.whois.getConfig();
          const hybridConfig = suite.hybrid.getConfig();
          
          if (config.timeoutMs !== undefined) {
            expect(dnsConfig.timeoutMs).toBe(config.timeoutMs);
            expect(whoisConfig.timeoutMs).toBe(config.timeoutMs);
            expect(hybridConfig.timeoutMs).toBe(config.timeoutMs);
          }
          
          if (config.maxRetries !== undefined) {
            expect(dnsConfig.maxRetries).toBe(config.maxRetries);
            expect(whoisConfig.maxRetries).toBe(config.maxRetries);
            expect(hybridConfig.maxRetries).toBe(config.maxRetries);
          }
        }
      ), { numRuns: 100 });
    });
  });

  describe('Resource Management Properties', () => {
    test('should handle disposal gracefully regardless of state', () => {
      fc.assert(fc.property(
        fc.integer({ min: 0, max: 10 }),
        fc.boolean(),
        (numServices: number, enableCaching: boolean) => {
          factory.setCachingEnabled(enableCaching);
          
          // Create various services
          for (let i = 0; i < numServices; i++) {
            const serviceType = ['DNS', 'WHOIS', 'HYBRID'][i % 3] as 'DNS' | 'WHOIS' | 'HYBRID';
            factory.getServiceByType(serviceType);
          }
          
          // Dispose should not throw
          expect(() => factory.dispose()).not.toThrow();
          
          // Cache should be cleared
          expect(factory.getCacheStats().size).toBe(0);
          
          // Multiple dispose calls should be safe
          expect(() => factory.dispose()).not.toThrow();
        }
      ), { numRuns: 50 });
    });
  });
});