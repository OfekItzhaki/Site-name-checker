/**
 * Interface for domain result repository implementation
 * Provides consistent interface for result storage and retrieval
 */
export interface IDomainResultRepository {
  /**
   * Save a domain result
   * @param result - Domain result to save
   */
  save(result: import('../../models').IDomainResult): void;

  /**
   * Find domain result by domain name
   * @param domain - Full domain name to search for
   * @returns Domain result if found, null otherwise
   */
  findByDomain(domain: string): import('../../models').IDomainResult | null;

  /**
   * Find domain results by base domain
   * @param baseDomain - Base domain name to search for
   * @returns Array of domain results for the base domain
   */
  findByBaseDomain(baseDomain: string): import('../../models').IDomainResult[];

  /**
   * Find domain results by TLD
   * @param tld - TLD to search for
   * @returns Array of domain results for the TLD
   */
  findByTLD(tld: string): import('../../models').IDomainResult[];

  /**
   * Find domain results by availability status
   * @param status - Availability status to search for
   * @returns Array of domain results with the specified status
   */
  findByStatus(status: import('../../models').AvailabilityStatus): import('../../models').IDomainResult[];

  /**
   * Get all stored domain results
   * @returns Array of all domain results
   */
  findAll(): import('../../models').IDomainResult[];

  /**
   * Update an existing domain result
   * @param domain - Domain name to update
   * @param updates - Partial updates to apply
   * @returns True if update was successful, false if domain not found
   */
  update(domain: string, updates: Partial<import('../../models').IDomainResult>): boolean;

  /**
   * Delete a domain result
   * @param domain - Domain name to delete
   * @returns True if deletion was successful, false if domain not found
   */
  delete(domain: string): boolean;

  /**
   * Clear all stored results
   */
  clear(): void;

  /**
   * Get the count of stored results
   * @returns Number of stored domain results
   */
  count(): number;

  /**
   * Check if a domain result exists
   * @param domain - Domain name to check
   * @returns True if domain result exists
   */
  exists(domain: string): boolean;

  /**
   * Get results within a date range
   * @param startDate - Start date for the range
   * @param endDate - End date for the range
   * @returns Array of domain results within the date range
   */
  findByDateRange(startDate: Date, endDate: Date): import('../../models').IDomainResult[];

  /**
   * Get the most recently checked results
   * @param limit - Maximum number of results to return
   * @returns Array of most recent domain results
   */
  findMostRecent(limit: number): import('../../models').IDomainResult[];
}

/**
 * Interface for query history repository
 */
export interface IQueryHistoryRepository {
  /**
   * Save a query request
   * @param request - Query request to save
   */
  saveRequest(request: import('../../models').IQueryRequest): void;

  /**
   * Save a query response
   * @param response - Query response to save
   */
  saveResponse(response: import('../../models').IQueryResponse): void;

  /**
   * Find query request by ID
   * @param requestId - Request ID to search for
   * @returns Query request if found, null otherwise
   */
  findRequestById(requestId: string): import('../../models').IQueryRequest | null;

  /**
   * Find query response by request ID
   * @param requestId - Request ID to search for
   * @returns Query response if found, null otherwise
   */
  findResponseByRequestId(requestId: string): import('../../models').IQueryResponse | null;

  /**
   * Get all query requests
   * @returns Array of all query requests
   */
  getAllRequests(): import('../../models').IQueryRequest[];

  /**
   * Get all query responses
   * @returns Array of all query responses
   */
  getAllResponses(): import('../../models').IQueryResponse[];

  /**
   * Clear all query history
   */
  clearHistory(): void;

  /**
   * Get query statistics
   * @returns Query statistics object
   */
  getStatistics(): IQueryStatistics;
}

/**
 * Query statistics interface
 */
export interface IQueryStatistics {
  /** Total number of queries performed */
  totalQueries: number;
  /** Number of successful queries */
  successfulQueries: number;
  /** Number of failed queries */
  failedQueries: number;
  /** Average query execution time in milliseconds */
  averageExecutionTime: number;
  /** Most commonly checked TLDs */
  popularTLDs: Array<{ tld: string; count: number }>;
  /** Most commonly checked base domains */
  popularBaseDomains: Array<{ baseDomain: string; count: number }>;
  /** Query success rate as percentage */
  successRate: number;
}