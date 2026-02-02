/**
 * Enumeration of possible domain availability statuses
 */
export enum AvailabilityStatus {
  /** Domain is available for registration */
  AVAILABLE = 'available',
  /** Domain is already registered/taken */
  TAKEN = 'taken',
  /** Domain availability check is in progress */
  CHECKING = 'checking',
  /** Error occurred during availability check */
  ERROR = 'error',
  /** Domain availability status is unknown */
  UNKNOWN = 'unknown'
}