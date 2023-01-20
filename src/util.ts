import { createLogger, format, transports, Logger } from "winston";

const LOG_LEVEL = process.env.BE_LOG_LEVEL || 'debug';
const APP_NAME = process.env.BE_APP_NAME || 'express-base';
const loggerFormat = 'simple' === (process.env.BE_LOG_FORMAT || 'simple') ?
  format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.printf(
      ({ level, message, timestamp }) => {
        return `${timestamp} ${level}: ${message}`;
      })
  ) : format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  );
const logger = createLogger({
  level: LOG_LEVEL,
  format: loggerFormat,
  defaultMeta: { service: APP_NAME },
  transports: [
    new transports.Console()
  ],
});

export const getLogger = (name: string): any => {
  return logger.child({ for: name });
}

export class UtilService {

  /**
   * Constructor
   *
   * @class UtilService
   * @constructor
   */
  constructor() {
  }

  public rnd(start: number = 1, end: number = 100): number {
    return start + Math.floor(Math.random() * (end - start));
  }

  public objToArray(obj: any): any[] {
    let ret = [];
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        ret.push({ name: key, value: obj[key] });
      }
    }
    return ret;
  }

  public toCamelCase(text: string): string {
    return text
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (leftTrim: string, index: number) =>
        index === 0 ? leftTrim.toLowerCase() : leftTrim.toUpperCase(),
      )
      .replace(/\s+/g, '');
  };

  public async snooze(ms = 1000): Promise<any> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getLogger(name: string): Logger {
    return logger.child({ for: name });
  }


}