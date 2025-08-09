import { getLogger } from './util';
import { Socket } from 'socket.io';

const logger = getLogger('IOHandler');

export class IOHandler {
  /**
   * Constructor
   *
   * @class IOHandler
   * @constructor
   */
  constructor() {}

  public async handle(socket: Socket): Promise<boolean> {
    logger.debug('Going to handle %s', socket.id);
    return true;
  }
}
