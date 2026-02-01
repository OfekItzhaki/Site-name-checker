import type { IDomainResult } from './IDomainResult';
import type { IQueryError } from './IQueryError';

/**
 * Interface representing the response from a domain availability query
 */
export interface IQueryResponse {
  /** Unique identifier matching the original request */
  requestId: string;
  /** Array of domain availability results */
  results: IDomainResult[];
  /** Timestamp when the query was completed */
  completedAt: Date;
  /** Array of errors that occurred during the query */
  errors: IQueryError[];
  /** Total execution time for all queries in milliseconds */
  totalExecutionTime: number;
}