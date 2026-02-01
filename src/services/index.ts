// Service implementations
export { BaseQueryService } from './BaseQueryService';
export { DNSLookupService } from './DNSLookupService';
export { WHOISQueryService } from './WHOISQueryService';
export { HybridQueryService } from './HybridQueryService';

// Re-export factory interfaces for convenience
export type { IQueryService, IServiceConfig } from '../patterns/factory/IServiceFactory';