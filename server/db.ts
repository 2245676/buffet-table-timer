import { eq, and, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, tables, diningSessions, Table, DiningSession, InsertTable, InsertDiningSession } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== 桌台管理相关 ====================

/**
 * 获取所有桌台
 */
export async function getAllTables(): Promise<Table[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(tables).orderBy(tables.tableNumber);
}

/**
 * 根据ID获取桌台
 */
export async function getTableById(id: number): Promise<Table | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(tables).where(eq(tables.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * 创建桌台
 */
export async function createTable(data: InsertTable): Promise<Table> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(tables).values(data);
  const insertedId = Number(result[0].insertId);
  
  const newTable = await getTableById(insertedId);
  if (!newTable) throw new Error("Failed to retrieve created table");
  
  return newTable;
}

/**
 * 更新桌台
 */
export async function updateTable(id: number, data: Partial<InsertTable>): Promise<Table | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  await db.update(tables).set(data).where(eq(tables.id, id));
  return await getTableById(id);
}

/**
 * 删除桌台
 */
export async function deleteTable(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  await db.delete(tables).where(eq(tables.id, id));
  return true;
}

/**
 * 更新桌台状态
 */
export async function updateTableStatus(id: number, status: Table['status']): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(tables).set({ status }).where(eq(tables.id, id));
}

// ==================== 用餐记录相关 ====================

/**
 * 创建用餐记录
 */
export async function createDiningSession(data: InsertDiningSession): Promise<DiningSession> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(diningSessions).values(data);
  const insertedId = Number(result[0].insertId);
  
  const newSession = await getDiningSessionById(insertedId);
  if (!newSession) throw new Error("Failed to retrieve created session");
  
  return newSession;
}

/**
 * 根据ID获取用餐记录
 */
export async function getDiningSessionById(id: number): Promise<DiningSession | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(diningSessions).where(eq(diningSessions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * 获取桌台的当前活动用餐记录
 */
export async function getActiveDiningSession(tableId: number): Promise<DiningSession | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(diningSessions)
    .where(and(eq(diningSessions.tableId, tableId), eq(diningSessions.isCompleted, 0)))
    .orderBy(diningSessions.startTime)
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

/**
 * 获取所有未完成的用餐记录
 */
export async function getAllActiveDiningSessions(): Promise<DiningSession[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(diningSessions)
    .where(eq(diningSessions.isCompleted, 0))
    .orderBy(diningSessions.startTime);
}

/**
 * 更新用餐记录
 */
export async function updateDiningSession(id: number, data: Partial<InsertDiningSession>): Promise<DiningSession | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  await db.update(diningSessions).set(data).where(eq(diningSessions.id, id));
  return await getDiningSessionById(id);
}

/**
 * 延长用餐时间
 */
export async function extendDiningSession(id: number, extensionMinutes: number): Promise<DiningSession | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const session = await getDiningSessionById(id);
  if (!session) return undefined;
  
  const newEndTime = session.endTime + extensionMinutes * 60 * 1000;
  const newExtensionCount = session.extensionCount + 1;
  const newTotalExtensionMinutes = session.totalExtensionMinutes + extensionMinutes;
  
  return await updateDiningSession(id, {
    endTime: newEndTime,
    extensionCount: newExtensionCount,
    totalExtensionMinutes: newTotalExtensionMinutes,
  });
}

/**
 * 完成用餐记录
 */
export async function completeDiningSession(id: number): Promise<DiningSession | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const session = await getDiningSessionById(id);
  if (!session) return undefined;
  
  const now = Date.now();
  
  // 去掉缓冲期逻辑，直接标记为已完成
  return await updateDiningSession(id, {
    actualEndTime: now,
    isCompleted: 1,
  });
}

/**
 * 更新最后提醒时间
 */
export async function updateLastAlertTime(id: number, time: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(diningSessions).set({ lastAlertTime: time }).where(eq(diningSessions.id, id));
}
