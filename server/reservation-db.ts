import { eq, and, gte, lte, like, or, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { reservations, operationLogs, capacityConfig, blacklist, InsertReservation, Reservation } from "../drizzle/schema";
import { getDb } from "./db";

/**
 * 创建预约
 */
export async function createReservation(data: InsertReservation & { operatedBy: number }): Promise<Reservation | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const { operatedBy, ...reservationData } = data;
    
    // 插入预约
    const result = await db.insert(reservations).values({
      ...reservationData,
      createdBy: operatedBy,
      updatedBy: operatedBy,
    });

    // 记录操作日志
    const reservationId = result[0]?.insertId || 0;
    if (reservationId) {
      await db.insert(operationLogs).values({
        operationType: "create",
        reservationId,
        operatedBy,
        details: JSON.stringify(reservationData),
      });
    }

    return null;
  } catch (error) {
    console.error("[Reservation] Failed to create:", error);
    throw error;
  }
}

/**
 * 更新预约
 */
export async function updateReservation(
  id: number,
  data: Partial<InsertReservation>,
  operatedBy: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.update(reservations).set({
      ...data,
      updatedBy: operatedBy,
    }).where(eq(reservations.id, id));

    // 记录操作日志
    await db.insert(operationLogs).values({
      operationType: "update",
      reservationId: id,
      operatedBy,
      details: JSON.stringify(data),
    });
  } catch (error) {
    console.error("[Reservation] Failed to update:", error);
    throw error;
  }
}

/**
 * 删除预约
 */
export async function deleteReservation(id: number, operatedBy: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.delete(reservations).where(eq(reservations.id, id));

    // 记录操作日志
    await db.insert(operationLogs).values({
      operationType: "delete",
      reservationId: id,
      operatedBy,
      details: JSON.stringify({ deletedReservationId: id }),
    });
  } catch (error) {
    console.error("[Reservation] Failed to delete:", error);
    throw error;
  }
}

/**
 * 获取指定日期的所有预约
 */
export async function getReservationsByDate(date: string): Promise<Reservation[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(reservations).where(
      eq(reservations.reservationDate, date)
    ).orderBy(reservations.reservationTime);
  } catch (error) {
    console.error("[Reservation] Failed to get by date:", error);
    return [];
  }
}

/**
 * 获取日期范围内的预约
 */
export async function getReservationsByDateRange(startDate: string, endDate: string): Promise<Reservation[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(reservations).where(
      and(
        gte(reservations.reservationDate, startDate),
        lte(reservations.reservationDate, endDate)
      )
    ).orderBy(reservations.reservationDate, reservations.reservationTime);
  } catch (error) {
    console.error("[Reservation] Failed to get by date range:", error);
    return [];
  }
}

/**
 * 搜索预约（按姓名或电话）
 */
export async function searchReservations(query: string, date?: string): Promise<Reservation[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    const conditions = [
      like(reservations.guestName, `%${query}%`),
      like(reservations.guestPhone, `%${query}%`),
    ];

    if (date) {
      return await db.select().from(reservations).where(
        and(
          eq(reservations.reservationDate, date),
          or(...conditions)
        )
      ).orderBy(reservations.reservationTime);
    }

    return await db.select().from(reservations).where(
      or(...conditions)
    ).orderBy(reservations.reservationDate, reservations.reservationTime);
  } catch (error) {
    console.error("[Reservation] Failed to search:", error);
    return [];
  }
}

/**
 * 获取指定时间段的预约总人数
 */
export async function getCapacityForTimeSlot(
  date: string,
  startTime: string,
  endTime: string
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const result = await db.select({
      totalPeople: reservations.partySize,
    }).from(reservations).where(
      and(
        eq(reservations.reservationDate, date),
        gte(reservations.reservationTime, startTime),
        lte(reservations.reservationTime, endTime),
        or(
          eq(reservations.status, "confirmed"),
          eq(reservations.status, "arrived"),
          eq(reservations.status, "pending")
        )
      )
    );

    return result.reduce((sum, row) => sum + (row.totalPeople || 0), 0);
  } catch (error) {
    console.error("[Reservation] Failed to get capacity:", error);
    return 0;
  }
}

/**
 * 检查是否存在重复预约（同一电话同一天）
 */
export async function checkDuplicateReservation(
  phone: string,
  date: string,
  excludeId?: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const conditions = [
      eq(reservations.guestPhone, phone),
      eq(reservations.reservationDate, date),
      or(
        eq(reservations.status, "pending"),
        eq(reservations.status, "confirmed"),
        eq(reservations.status, "arrived")
      ),
    ];

    if (excludeId) {
      conditions.push(ne(reservations.id, excludeId));
    }

    const result = await db.select().from(reservations).where(
      and(...conditions)
    ).limit(1);

    return result.length > 0;
  } catch (error) {
    console.error("[Reservation] Failed to check duplicate:", error);
    return false;
  }
}

/**
 * 检查客人是否在黑名单中
 */
export async function isPhoneInBlacklist(phone: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const result = await db.select().from(blacklist).where(
      eq(blacklist.guestPhone, phone)
    ).limit(1);

    return result.length > 0;
  } catch (error) {
    console.error("[Reservation] Failed to check blacklist:", error);
    return false;
  }
}

/**
 * 获取容量配置
 */
export async function getCapacityConfig(): Promise<any[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db.select().from(capacityConfig).orderBy(capacityConfig.startTime);
  } catch (error) {
    console.error("[Reservation] Failed to get capacity config:", error);
    return [];
  }
}

/**
 * 获取今日统计数据
 */
export async function getTodayStats(date: string): Promise<{
  totalReservations: number;
  totalPeople: number;
  arrivedCount: number;
  pendingCount: number;
  cancelledCount: number;
  noShowCount: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalReservations: 0,
      totalPeople: 0,
      arrivedCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
      noShowCount: 0,
    };
  }

  try {
    const allReservations = await getReservationsByDate(date);

    return {
      totalReservations: allReservations.length,
      totalPeople: allReservations.reduce((sum, r) => sum + r.partySize, 0),
      arrivedCount: allReservations.filter(r => r.status === "arrived").length,
      pendingCount: allReservations.filter(r => r.status === "pending").length,
      cancelledCount: allReservations.filter(r => r.status === "cancelled").length,
      noShowCount: allReservations.filter(r => r.isHighRisk === 1 && r.status === "cancelled").length,
    };
  } catch (error) {
    console.error("[Reservation] Failed to get today stats:", error);
    return {
      totalReservations: 0,
      totalPeople: 0,
      arrivedCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
      noShowCount: 0,
    };
  }
}
