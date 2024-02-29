import { v4 as uuidv4 } from 'uuid';
import { Model } from './db';

export class InMemoryCRUD<T extends Model> {
  private items: Map<string, T>;

  constructor() {
    this.items = new Map<string, T>();
  }

  uuid() {
    return uuidv4();
  }

  save(item: T): T {
    if (!item.id) {
      item.id = this.uuid();
      item.createdDate = new Date().getTime();
    }
    this.items.set(item.id, item);
    return item;
  }

  getById(id: string): T | undefined {
    return this.items.get(id);
  }

  getAll(): T[] {
    return Array.from(this.items.values());
  }

  delete(id: string | undefined): boolean {
    return id ? this.items.delete(id) : false;
  }

  deleteAll(): boolean {
    this.items.clear();
    return true;
  }

  sortByNumber(a?: number, b?: number): number {
    let ret = 0;
    if (a && b) {
      ret = a - b;
    } else if (a) {
      ret = 1;
    } else {
      ret = -1;
    }
    return ret;
  }

  findBy(fieldName: keyof T, value: any): T[] {
    const result: T[] = [];
    for (const item of this.items.values()) {
      if ((item as any)[fieldName] === value) {
        result.push(item);
      }
    }
    return result.sort((a, b) => this.sortByNumber(b.createdDate, a.createdDate));
  }

  findFirstOf(fieldName: keyof T, value: any): T | undefined {
    const result: T[] = [];
    for (const item of this.items.values()) {
      if ((item as any)[fieldName] === value) {
        result.push(item);
      }
    }
    return 0 < result.length ? result[0] : undefined;
  }
}

