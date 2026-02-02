import type { IDomainResult } from './IDomainResult';
import type { IQueryError } from './IQueryError';

/**
 * Interface representing the response from a domain availability query
 */
export interface IQueryResponse {
  /** Whether the query was successful */
  success: boolean;
  /** Unique identifier for the query */
  queryId: string;
  /** Array of domain availability results */
  results: IDomainResult[];
  /** Timestamp when the query was completed */
  timestamp: string;
  /** Array of errors that occurred during the query */
  errors: string[];
  /** Total execution time for all queries in milliseconds */
  totalExecutionTime?: number;
}