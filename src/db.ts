import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs/promises';

export interface Model {
  id?: string;
  createdDate?: number;
}

export interface Database {
  uuid(): string;
  init(): Promise<boolean>;
  createOrUpdate(tableName: string, item: any): any;
  findById(tableName: string, id?: string): any | undefined;
  deleteById(tableName: string, id?: string): any | undefined;
  deleteByTable(tableName: string): number;
  getAll(tableName: string): any[];
  deleteAll(): boolean;
  findFirstByExample(tableName: string, model: any): any | undefined;
  findAllByExample(tableName: string, model: any): any[];
  saveDB(): Promise<void>;
  loadDB(): Promise<void>;
}

export interface DatabaseConfig {
  type: 'InMemory';
  path: string;
  loadOnStartup: boolean;
}

export class InMemoryDatabase implements Database {
  private tables: Map<string, Map<string, Model>>;
  private cfg: DatabaseConfig;
  constructor(cfg?: DatabaseConfig) {
    this.tables = new Map();
    this.cfg = cfg || { type: 'InMemory', path: '', loadOnStartup: false } as DatabaseConfig;
  }

  async init(): Promise<boolean> {
    let ret = false;
    if (this.cfg.loadOnStartup) {
      await this.loadDB();
      ret = true;
    }
    return ret;
  }

  uuid() {
    return uuidv4();
  }

  createOrUpdate<T extends Model>(tableName: string, item: T): T {
    let table = this.tables.get(tableName);
    if (!table) {
      table = new Map<string, Model>();
      this.tables.set(tableName, table);
    }

    if (!item.id) {
      item.id = this.uuid();
    }
    item.createdDate = Date.now();
    table.set(item.id, item);

    return item;
  }

  findById<T extends Model>(tableName: string, id?: string): T | undefined {
    const table = this.tables.get(tableName);
    return table && id ? table.get(id) as T : undefined;
  }

  deleteById<T extends Model>(tableName: string, id?: string): T | undefined {
    const table = this.tables.get(tableName);
    if (table && id && table.has(id)) {
      const item = table.get(id) as T;
      table.delete(id);
      return item;
    }
    return undefined;
  }

  deleteByTable(tableName: string): number {
    const table = this.tables.get(tableName);
    if (table) {
      const size = table.size;
      this.tables.delete(tableName);
      return size;
    }
    return 0;
  }

  deleteAll(): boolean {
    this.tables.clear();
    return true;
  }

  getAll(tableName: string): any[] {
    const table = this.tables.get(tableName);
    return table ? Array.from(table.values()) : []
  }

  findFirstByExample<T extends Model>(tableName: string, model: Partial<T>): T | undefined {
    const table = this.tables.get(tableName);
    if (!table) return undefined;

    console.log('matching', model);


    for (const item of table.values()) {
      if (this.matches(item as T, model)) {
        return item as T;
      }
    }
    return undefined;
  }

  findAllByExample<T extends Model>(tableName: string, model: Partial<T>): T[] {
    const table = this.tables.get(tableName);
    if (!table) return [];

    return Array.from(table.values()).filter(item => this.matches(item as T, model)) as T[];
  }

  private isObject(obj: any): obj is Record<string, any> {
    return obj !== null && typeof obj === 'object';
  }

  private deepEquals(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) {
      return true;
    }

    if (!this.isObject(obj1) || !this.isObject(obj2)) {
      return false;
    }

    const keys1 = Object.keys(obj1);

    for (const key of keys1) {
      if (!(key in obj2)) {
        return false;
      }

      if (!this.deepEquals(obj1[key], obj2[key])) {
        return false;
      }
    }
    return true;
  }

  private matches<T extends Model>(item: T, model: Partial<T>): boolean {
    for (const key in model) {
      if (model.hasOwnProperty(key)) {
        const modelValue = model[key as keyof T];
        const itemValue = item[key as keyof T];

        if (Array.isArray(modelValue) && Array.isArray(itemValue)) {
          if (!modelValue.every(modelEl =>
            itemValue.some(itemEl => this.deepEquals(modelEl, itemEl)))) {
            return false;
          }
        } else if (this.isObject(modelValue)) {
          if (!this.deepEquals(modelValue, itemValue)) {
            return false;
          }
        } else {
          if (modelValue !== itemValue) {
            return false;
          }
        }
      }
    }
    return true;
  }

  async saveDB(): Promise<void> {
    try {
      const data = Array.from(this.tables).map(([tableName, table]) => [
        tableName,
        Array.from(table.values())
      ]);
      await fs.writeFile(this.cfg.path, JSON.stringify(data, null, 2));
    } catch (error) {
      throw new Error(`Failed to save database: ${(error as Error).message}`);
    }
  }

  async loadDB(): Promise<void> {
    try {
      const content = await fs.readFile(this.cfg.path, 'utf-8');
      const data = JSON.parse(content) as [string, Model[]][];
      
      this.tables.clear();
      for (const [tableName, items] of data) {
        this.tables.set(tableName, new Map(
          items
            .filter(item => item.id)
            .map(item => [item.id!, item])
        ));
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.tables.clear();
      } else {
        throw new Error(`Failed to load database: ${(error as Error).message}`);
      }
    }
  }
}
