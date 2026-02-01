import { ServiceFactory } from '../../../src/patterns/factory/ServiceFactory';
import type { IServiceConfig } from '../../../src/patterns/factory/IServiceFactory';
import { DNSLookupService } from '../../../src/services/DNSLookupService';
import { WHOISQueryService } from '../../../src/services/WHOISQueryService';
import { HybridQueryService } from '../../../src/services/HybridQueryService';

describe('ServiceFactory', () => {
  let factory: ServiceFactory;
  const defaultConfig: Partial<IServiceConfig> = {
    timeoutMs: 3000,
    maxRetries: 2,
    retryDelayMs: 500,
    useExponentialBackoff: false
  };

  beforeEach(() => {
    factory = new ServiceFactory(defaultConfig);
  });

  afterEach(() => {
    factory.dispose();
  });

  describe('Service Creation', () => {
    test('should create DNS service with default configuration', () => {
      const service = factory.createDNSService();
      
      expect(service).toBeInstanceOf(DNSLookupService);
      expect(service.getServiceType()).toBe('DNS');
      
      const config = service.getConfig();
      expect(config.timeoutMs).toBe(3000);
      expect(config.maxRetries).toBe(2);
      expect(config.retryDelayMs).toBe(500);
      expect(config.useExponentialBackoff).toBe(false);
    });

    test('should create WHOIS service with default configuration', () => {
      const service = factory.createWHOISService();
      
      expect(service).toBeInstanceOf(WHOISQueryService);
      expect(service.getServiceType()).toBe('WHOIS');
      
      const config = service.getConfig();
      expect(config.timeoutMs).toBe(3000);
      expect(config.maxRetries).toBe(2);
    });

    test('should create Hybrid service with default configuration', () => {
      const service = factory.createHybridService();
      
      expect(service).toBeInstanceOf(HybridQueryService);
      expect(service.getServiceType()).toBe('HYBRID');
      
      const config = service.getConfig();
      expect(config.timeoutMs).toBe(3000);
      expect(config.maxRetries).toBe(2);
    });

    test('should create service with custom configuration', () => {
      const customConfig: Partial<IServiceConfig> = {
        timeoutMs: 8000,
        maxRetries: 5,
        retryDelayMs: 2000,
        useExponentialBackoff: true
      };

      const service = factory.createDNSService(customConfig);
      const config = service.getConfig();
      
      expect(config.timeoutMs).toBe(8000);
      expect(config.maxRetries).toBe(5);
      expect(config.retryDelayMs).toBe(2000);
      expect(config.useExponentialBackoff).toBe(true);
    });

    test('should merge custom config with default config', () => {
      const customConfig: Partial<IServiceConfig> = {
        timeoutMs: 10000
      };

      const service = factory.createDNSService(customConfig);
      const config = service.getConfig();
      
      expect(config.timeoutMs).toBe(10000); // Custom value
      expect(config.maxRetries).toBe(2); // Default value
      expect(config.retryDelayMs).toBe(500); // Default value
    });
  });

  describe('Service Type Selection', () => {
    test('should create correct service by type', () => {
      const dnsService = factory.getServiceByType('DNS');
      const whoisService = factory.getServiceByType('WHOIS');
      const hybridService = factory.getServiceByType('HYBRID');

      expect(dnsService.getServiceType()).toBe('DNS');
      expect(whoisService.getServiceType()).toBe('WHOIS');
      expect(hybridService.getServiceType()).toBe('HYBRID');
    });

    test('should throw error for unknown service type', () => {
      expect(() => {
        // @ts-expect-error Testing invalid type
        factory.getServiceByType('INVALID');
      }).toThrow('Unknown service type: INVALID');
    });
  });

  describe('Configuration Management', () => {
    test('should update default configuration', () => {
      const newDefaultConfig: Partial<IServiceConfig> = {
        timeoutMs: 7000,
        maxRetries: 4
      };

      factory.setDefaultConfig(newDefaultConfig);
      const updatedConfig = factory.getDefaultConfig();

      expect(updatedConfig.timeoutMs).toBe(7000);
      expect(updatedConfig.maxRetries).toBe(4);
      expect(updatedConfig.retryDelayMs).toBe(500); // Should retain original default
    });

    test('should apply updated default config to new services', () => {
      factory.setDefaultConfig({ timeoutMs: 9000 });
      
      const service = factory.createDNSService();
      const config = service.getConfig();
      
      expect(config.timeoutMs).toBe(9000);
    });

    test('should return copy of default configuration', () => {
      const config1 = factory.getDefaultConfig();
      const config2 = factory.getDefaultConfig();
      
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Should be different objects
    });
  });

  describe('Service Caching', () => {
    test('should cache service instances when caching is enabled', () => {
      const service1 = factory.createDNSService();
      const service2 = factory.createDNSService();
      
      expect(service1).toBe(service2); // Should be same instance
    });

    test('should not cache when caching is disabled', () => {
      factory.setCachingEnabled(false);
      
      const service1 = factory.createDNSService();
      const service2 = factory.createDNSService();
      
      expect(service1).not.toBe(service2); // Should be different instances
      expect(service1.getServiceType()).toBe(service2.getServiceType()); // But same type
    });

    test('should clear cache when requested', () => {
      const service1 = factory.createDNSService();
      factory.clearCache();
      const service2 = factory.createDNSService();
      
      expect(service1).not.toBe(service2);
    });

    test('should provide cache statistics', () => {
      factory.createDNSService();
      factory.createWHOISService();
      
      const stats = factory.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toHaveLength(2);
    });

    test('should clear cache when default config changes', () => {
      const service1 = factory.createDNSService();
      factory.setDefaultConfig({ timeoutMs: 8000 });
      const service2 = factory.createDNSService();
      
      expect(service1).not.toBe(service2);
      expect(service1.getConfig().timeoutMs).toBe(3000); // Original config
      expect(service2.getConfig().timeoutMs).toBe(8000); // New config
    });
  });

  describe('Optimized Service Creation', () => {
    test('should create optimized service for common TLDs', () => {
      const service = factory.createOptimizedService('example.com', 'DNS');
      const config = service.getConfig();
      
      expect(config.timeoutMs).toBe(3000); // Optimized for .com
      expect(config.maxRetries).toBe(2);
    });

    test('should create optimized service for premium TLDs', () => {
      const service = factory.createOptimizedService('example.ai', 'DNS');
      const config = service.getConfig();
      
      expect(config.timeoutMs).toBe(8000); // Longer timeout for .ai
      expect(config.maxRetries).toBe(3);
      expect(config.retryDelayMs).toBe(1500);
    });

    test('should use conservative settings for unknown TLDs', () => {
      const service = factory.createOptimizedService('example.xyz', 'DNS');
      const config = service.getConfig();
      
      expect(config.timeoutMs).toBe(6000); // Conservative timeout
      expect(config.maxRetries).toBe(3);
    });

    test('should default to HYBRID service type when not specified', () => {
      const service = factory.createOptimizedService('example.com');
      expect(service.getServiceType()).toBe('HYBRID');
    });
  });

  describe('Service Suite Creation', () => {
    test('should create all service types with shared configuration', () => {
      const customConfig: Partial<IServiceConfig> = {
        timeoutMs: 6000,
        maxRetries: 4
      };

      const suite = factory.createServiceSuite(customConfig);
      
      expect(suite.dns.getServiceType()).toBe('DNS');
      expect(suite.whois.getServiceType()).toBe('WHOIS');
      expect(suite.hybrid.getServiceType()).toBe('HYBRID');
      
      // All should have the same configuration
      expect(suite.dns.getConfig().timeoutMs).toBe(6000);
      expect(suite.whois.getConfig().timeoutMs).toBe(6000);
      expect(suite.hybrid.getConfig().timeoutMs).toBe(6000);
    });

    test('should create service suite with default configuration', () => {
      const suite = factory.createServiceSuite();
      
      expect(suite.dns.getConfig().timeoutMs).toBe(3000); // Default config
      expect(suite.whois.getConfig().maxRetries).toBe(2);
      expect(suite.hybrid.getConfig().retryDelayMs).toBe(500);
    });
  });

  describe('Resource Management', () => {
    test('should dispose of all resources', () => {
      factory.createDNSService();
      factory.createWHOISService();
      
      expect(factory.getCacheStats().size).toBe(2);
      
      factory.dispose();
      
      expect(factory.getCacheStats().size).toBe(0);
    });

    test('should handle multiple dispose calls gracefully', () => {
      factory.createDNSService();
      
      expect(() => {
        factory.dispose();
        factory.dispose();
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty domain for optimization', () => {
      const service = factory.createOptimizedService('', 'DNS');
      expect(service.getServiceType()).toBe('DNS');
    });

    test('should handle domain without TLD for optimization', () => {
      const service = factory.createOptimizedService('example', 'DNS');
      const config = service.getConfig();
      
      expect(config.timeoutMs).toBe(6000); // Should use conservative settings
    });

    test('should handle malformed domain for optimization', () => {
      const service = factory.createOptimizedService('...', 'DNS');
      expect(service.getServiceType()).toBe('DNS');
    });
  });
});