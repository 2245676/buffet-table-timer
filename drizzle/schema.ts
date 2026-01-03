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

/**
 * 邮件通知配置表
 * 存储管理员的邮件通知设置
 */
export const emailNotificationSettings = mysqlTable("email_notification_settings", {
  id: int("id").autoincrement().primaryKey(),
  /** 用户ID */
  userId: int("userId").notNull().unique(),
  /** 是否启用邮件通知 */
  enabled: int("enabled").notNull().default(1),
  /** 超时提醒邮件 */
  notifyOnTimeout: int("notifyOnTimeout").notNull().default(1),
  /** 邮件发送间隔（分钟） */
  notificationInterval: int("notificationInterval").notNull().default(5),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailNotificationSettings = typeof emailNotificationSettings.$inferSelect;
export type InsertEmailNotificationSettings = typeof emailNotificationSettings.$inferInsert;

/**
 * 预约表
 * 存储餐厅所有预约信息
 */
export const reservations = mysqlTable("reservations", {
  id: int("id").autoincrement().primaryKey(),
  /** 预约日期 (YYYY-MM-DD) */
  reservationDate: varchar("reservationDate", { length: 10 }).notNull(),
  /** 预约时间 (HH:MM) */
  reservationTime: varchar("reservationTime", { length: 5 }).notNull(),
  /** 客人姓名 */
  guestName: varchar("guestName", { length: 100 }).notNull(),
  /** 客人电话（唯一识别） */
  guestPhone: varchar("guestPhone", { length: 20 }).notNull(),
  /** 预约人数 */
  partySize: int("partySize").notNull(),
  /** 预约来源：phone/wechat/walk-in/platform/other */
  source: mysqlEnum("source", ["phone", "wechat", "walk-in", "platform", "other"]).notNull(),
  /** 预约状态：pending/confirmed/arrived/completed/cancelled */
  status: mysqlEnum("status", ["pending", "confirmed", "arrived", "completed", "cancelled"]).default("pending").notNull(),
  /** 备注 */
  remarks: text("remarks"),
  /** 标签（逗号分隔）：生日、忌口、过敏、儿童椅、窗边等 */
  tags: text("tags"),
  /** 关联的桌台ID（可选） */
  tableId: int("tableId"),
  /** 关联的用餐记录ID（可选） */
  diningSessionId: int("diningSessionId"),
  /** 录入人ID */
  createdBy: int("createdBy").notNull(),
  /** 最后修改人ID */
  updatedBy: int("updatedBy").notNull(),
  /** 是否为高风险客人（No-show标记） */
  isHighRisk: int("isHighRisk").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = typeof reservations.$inferInsert;

/**
 * 操作日志表
 * 记录所有预约相关的操作
 */
export const operationLogs = mysqlTable("operation_logs", {
  id: int("id").autoincrement().primaryKey(),
  /** 操作类型：create/update/delete/status_change */
  operationType: varchar("operationType", { length: 50 }).notNull(),
  /** 关联的预约ID */
  reservationId: int("reservationId"),
  /** 操作人ID */
  operatedBy: int("operatedBy").notNull(),
  /** 操作详情（JSON格式） */
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OperationLog = typeof operationLogs.$inferSelect;
export type InsertOperationLog = typeof operationLogs.$inferInsert;

/**
 * 容量配置表
 * 存储餐厅营业时间段和容量限制
 */
export const capacityConfig = mysqlTable("capacity_config", {
  id: int("id").autoincrement().primaryKey(),
  /** 时间段名称：午餐/晚餐 */
  periodName: varchar("periodName", { length: 50 }).notNull(),
  /** 开始时间 (HH:MM) */
  startTime: varchar("startTime", { length: 5 }).notNull(),
  /** 结束时间 (HH:MM) */
  endTime: varchar("endTime", { length: 5 }).notNull(),
  /** 该时间段最大接待人数 */
  maxCapacity: int("maxCapacity").notNull(),
  /** 迟到保留时间（分钟） */
  lateArrivalBuffer: int("lateArrivalBuffer").notNull().default(15),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CapacityConfig = typeof capacityConfig.$inferSelect;
export type InsertCapacityConfig = typeof capacityConfig.$inferInsert;

/**
 * 黑名单表
 * 记录高风险客人信息
 */
export const blacklist = mysqlTable("blacklist", {
  id: int("id").autoincrement().primaryKey(),
  /** 客人电话 */
  guestPhone: varchar("guestPhone", { length: 20 }).notNull().unique(),
  /** 客人姓名 */
  guestName: varchar("guestName", { length: 100 }),
  /** 原因 */
  reason: text("reason"),
  /** 添加人ID */
  addedBy: int("addedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Blacklist = typeof blacklist.$inferSelect;
export type InsertBlacklist = typeof blacklist.$inferInsert;
