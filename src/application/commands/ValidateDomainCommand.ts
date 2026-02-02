import type { ICommand } from '../../patterns/mediator';

/**
 * Command to validate domain format
 */
export class ValidateDomainCommand implements ICommand<boolean> {
  readonly type = 'ValidateDomain';

  constructor(public readonly domain: string) {}
}