import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Order } from "../../../packages/core/src/domain.ts";

export type Event = {
  sequence: number;
  orderId: string;
  timestamp: number;
  step: string;
  detail: string;
  link?: string;
};
export class Store {
  readonly db: DatabaseSync;
  constructor(path: string) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY, body TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events(sequence INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL REFERENCES orders(id), timestamp INTEGER NOT NULL, step TEXT NOT NULL, detail TEXT NOT NULL, link TEXT);
      CREATE TABLE IF NOT EXISTS payment_claims(tx TEXT PRIMARY KEY, order_id TEXT NOT NULL UNIQUE REFERENCES orders(id));
      CREATE TABLE IF NOT EXISTS jobs(order_id TEXT PRIMARY KEY REFERENCES orders(id), state TEXT NOT NULL DEFAULT 'queued');`);
  }
  save(order: Order) {
    this.db
      .prepare(
        "INSERT INTO orders VALUES(?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body",
      )
      .run(order.id, JSON.stringify(order));
    return order;
  }
  get(id: string): Order {
    const row = this.db
      .prepare("SELECT body FROM orders WHERE id=?")
      .get(id) as { body: string } | undefined;
    if (!row) throw new Error("ORDER_NOT_FOUND");
    return JSON.parse(row.body);
  }
  list(): Order[] {
    return (
      this.db
        .prepare("SELECT body FROM orders ORDER BY rowid DESC LIMIT 50")
        .all() as { body: string }[]
    ).map((row) => JSON.parse(row.body));
  }
  event(id: string, step: string, detail: string, link?: string) {
    this.db
      .prepare(
        "INSERT INTO events(order_id,timestamp,step,detail,link) VALUES(?,?,?,?,?)",
      )
      .run(id, Date.now(), step, detail, link ?? null);
  }
  events(id: string, after = 0): Event[] {
    return this.db
      .prepare(
        "SELECT sequence,order_id AS orderId,timestamp,step,detail,link FROM events WHERE order_id=? AND sequence>? ORDER BY sequence",
      )
      .all(id, after) as unknown as Event[];
  }
  claimPayment(tx: string, orderId: string) {
    const existing = this.db
      .prepare("SELECT order_id FROM payment_claims WHERE tx=? OR order_id=?")
      .get(tx, orderId) as { order_id: string } | undefined;
    if (existing) {
      if (
        existing.order_id === orderId &&
        this.db
          .prepare("SELECT tx FROM payment_claims WHERE order_id=?")
          .get(orderId)?.tx === tx
      )
        return;
      throw new Error("PAYMENT_REUSED");
    }
    this.db.prepare("INSERT INTO payment_claims VALUES(?,?)").run(tx, orderId);
  }
  enqueue(id: string) {
    this.db.prepare("INSERT OR IGNORE INTO jobs(order_id) VALUES(?)").run(id);
  }
  next(): string | undefined {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const row = this.db
        .prepare(
          "SELECT order_id FROM jobs WHERE state='queued' ORDER BY rowid LIMIT 1",
        )
        .get() as { order_id: string } | undefined;
      if (row)
        this.db
          .prepare("UPDATE jobs SET state='running' WHERE order_id=?")
          .run(row.order_id);
      this.db.exec("COMMIT");
      return row?.order_id;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  finish(id: string) {
    this.db.prepare("UPDATE jobs SET state='done' WHERE order_id=?").run(id);
  }
  recover() {
    this.db.exec("UPDATE jobs SET state='queued' WHERE state='running'");
  }
  close() {
    this.db.close();
  }
}
