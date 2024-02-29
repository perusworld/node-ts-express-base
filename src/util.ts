import { DateTime, Settings } from 'luxon';
import { createLogger, format, transports, Logger } from "winston";
import * as fs from "fs";
import { v4 as uuidv4 } from 'uuid';

export const QUERY_DATE_FORMAT = 'yyyy-MM-dd';

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
  constructor(timeZone: string) {
    Settings.defaultZone = timeZone;
  }

  public rnd(start: number = 1, end: number = 100): number {
    return start + Math.floor(Math.random() * (end - start));
  }

  public rndWith(start: number = 0, end: number = 100000, divisor: number = 100): number {
    start = Math.ceil(start / divisor) * divisor;
    end = Math.floor(end / divisor) * divisor;
    return start + (Math.floor(Math.random() * ((end - start) / divisor)) * divisor);
  }

  public rndOf<T>(arr: T[]) {
    return arr[Math.floor((Math.random() * arr.length) + 1) - 1];
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

  /**
   * uuid
   */
  public uuid() {
    return uuidv4();
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


  public dateAsEpoch(date = '', from = QUERY_DATE_FORMAT, days = 0): number {
    const dateTime = date === '' ? DateTime.now() : DateTime.fromFormat(date, from);
    return dateTime.plus({ days }).toSeconds();
  }

  public dateEpochToDate(date = 0, days = 0): DateTime {
    const dateTime = date === 0 ? DateTime.now() : DateTime.fromSeconds(date);
    return dateTime.plus({ days });
  }


  public readString(name: string, prefix: string = "/config"): any {
    return fs.readFileSync(`.${prefix}/${name}`).toString();
  }

  public loadJson(name: string, prefix: string = "/config"): any {
    return JSON.parse(fs.readFileSync(`.${prefix}/${name}.json`).toString());
  }

  public pathOf(name: string, prefix: string = "/config"): any {
    return fs.realpathSync(`.${prefix}/${name}`);
  }

  async doWait(callBack: () => Promise<any>, sleepTime = 1000, maxRetry = 15): Promise<any | undefined> {
    let ret = await callBack();
    let done = false;
    do {
      if (undefined === ret) {
        console.log('ok waiting', maxRetry);
        await this.snooze(sleepTime);
        ret = await callBack();
      } else {
        done = true;
      }
    } while (!done && 0 < --maxRetry)
    return ret;
  }

}