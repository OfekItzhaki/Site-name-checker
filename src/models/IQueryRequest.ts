/**
 * Interface representing a domain availability query request
 */
export interface IQueryRequest {
  /** Base domain name to check (without TLD) */
  baseDomain: string;
  /** List of TLDs to check availability for */
  tlds: string[];
  /** Timestamp when the request was created */
  timestamp: Date;
  /** Unique identifier for this request */
  requestId: string;
  /** Optional strategy type to use for this request */
  strategy?: 'DNS_FIRST' | 'WHOIS_ONLY' | 'HYBRID' | 'FAST_CHECK';
}