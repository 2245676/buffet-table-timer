import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, bigint } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 桌台配置表
 * 存储餐厅所有桌台的基本配置信息
 */
export const tables = mysqlTable("tables", {
  id: int("id").autoincrement().primaryKey(),
  /** 桌号 */
  tableNumber: varchar("tableNumber", { length: 20 }).notNull().unique(),
  /** 最大人数 */
  maxCapacity: int("maxCapacity").notNull().default(4),
  /** 默认用餐时长（分钟） */
  defaultDuration: int("defaultDuration").notNull().default(90),
  /** 缓冲期时长（分钟） */
  bufferDuration: int("bufferDuration").notNull().default(15),
  /** 当前状态：idle=空闲, dining=用餐中, warning=即将超时, timeout=已超时, buffer=缓冲期, disabled=停用 */
  status: mysqlEnum("status", ["idle", "dining", "warning", "timeout", "buffer", "disabled"]).default("idle").notNull(),
  /** 是否启用 */
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Table = typeof tables.$inferSelect;
export type InsertTable = typeof tables.$inferInsert;

/**
 * 用餐记录表
 * 记录每次用餐的详细信息
 */
export const diningSessions = mysqlTable("dining_sessions", {
  id: int("id").autoincrement().primaryKey(),
  /** 关联的桌台ID */
  tableId: int("tableId").notNull(),
  /** 用餐开始时间（Unix时间戳，毫秒） */
  startTime: bigint("startTime", { mode: "number" }).notNull(),
  /** 计划结束时间（Unix时间戳，毫秒） */
  endTime: bigint("endTime", { mode: "number" }).notNull(),
  /** 实际结束时间（Unix时间戳，毫秒） */
  actualEndTime: bigint("actualEndTime", { mode: "number" }),
  /** 缓冲期结束时间（Unix时间戳，毫秒） */
  bufferEndTime: bigint("bufferEndTime", { mode: "number" }),
  /** 延时次数 */
  extensionCount: int("extensionCount").notNull().default(0),
  /** 总延时分钟数 */
  totalExtensionMinutes: int("totalExtensionMinutes").notNull().default(0),
  /** 是否已结束 */
  isCompleted: int("isCompleted").notNull().default(0),
  /** 备注 */
  remarks: text("remarks"),
  /** 最后提醒时间（Unix时间戳，毫秒），用于控制重复提醒间隔 */
  lastAlertTime: bigint("lastAlertTime", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DiningSession = typeof diningSessions.$inferSelect;
export type InsertDiningSession = typeof diningSessions.$inferInsert;
