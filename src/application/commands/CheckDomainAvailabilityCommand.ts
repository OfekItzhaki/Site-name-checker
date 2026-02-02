import type { ICommand } from '../../patterns/mediator';
import type { IQueryResponse } from '../../models';

/**
 * Command to check domain availability across multiple TLDs
 */
export class CheckDomainAvailabilityCommand implements ICommand<IQueryResponse> {
  readonly type = 'CheckDomainAvailability';

  constructor(
    public readonly baseDomain: string,
    public readonly tlds: string[] = ['.com', '.net', '.org']
  ) {}
}