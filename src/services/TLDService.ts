/**
 * Service for managing TLD (Top Level Domain) operations
 * Handles TLD validation, construction, and supported TLD management
 */
export class TLDService {
  private static readonly SUPPORTED_TLDS = [
    '.com', '.net', '.org', '.ai', '.dev', '.io', '.co',
    '.app', '.tech', '.online', '.store', '.shop', '.site',
    '.blog', '.news', '.info', '.biz', '.me', '.tv'
  ];

  /**
   * Get all supported TLDs
   */
  getSupportedTLDs(): string[] {
    return [...TLDService.SUPPORTED_TLDS];
  }

  /**
   * Construct full domain names from base domain and TLDs
   */
  constructDomains(baseDomain: string, tlds?: string[]): string[] {
    if (!baseDomain || typeof baseDomain !== 'string') {
      throw new Error('Base domain must be a non-empty string');
    }

    const sanitizedBase = baseDomain.toLowerCase().trim();
    if (!sanitizedBase) {
      throw new Error('Base domain cannot be empty after sanitization');
    }

    const targetTLDs = tlds || TLDService.SUPPORTED_TLDS;
    return targetTLDs.map(tld => `${sanitizedBase}${tld}`);
  }

  /**
   * Validate that a domain belongs to the supported TLDs
   */
  isSupportedDomain(domain: string): boolean {
    return TLDService.SUPPORTED_TLDS.some(tld => 
      domain.toLowerCase().endsWith(tld)
    );
  }

  /**
   * Extract base domain from a full domain name
   */
  extractBaseDomain(domain: string): string | null {
    const lowerDomain = domain.toLowerCase();
    
    for (const tld of TLDService.SUPPORTED_TLDS) {
      if (lowerDomain.endsWith(tld)) {
        return lowerDomain.slice(0, -tld.length);
      }
    }
    
    return null;
  }

  /**
   * Extract TLD from a full domain name
   */
  extractTLD(domain: string): string | null {
    const lowerDomain = domain.toLowerCase();
    
    for (const tld of TLDService.SUPPORTED_TLDS) {
      if (lowerDomain.endsWith(tld)) {
        return tld;
      }
    }
    
    return null;
  }
}