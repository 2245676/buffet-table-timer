import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { eq, and } from "drizzle-orm";
import { reservations, diningSessions, tables } from "../../drizzle/schema";

/**
 * 预约与桌台联动路由
 * 处理预约分配、自动计时、状态同步等功能
 */
export const reservationTableSyncRouter = router({
  /**
   * 将预约分配至桌台
   */
  assignTableToReservation: protectedProcedure
    .input(
      z.object({
        reservationId: z.number(),
        tableId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      try {
        // 检查预约是否存在
        const reservation = await db
          .select()
          .from(reservations)
          .where(eq(reservations.id, input.reservationId))
          .limit(1);

        if (!reservation.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "预约不存在",
          });
        }

        // 检查桌台是否存在
        const table = await db
          .select()
          .from(tables)
          .where(eq(tables.id, input.tableId))
          .limit(1);

        if (!table.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "桌台不存在",
          });
        }

        // 更新预约的桌台ID
        await db
          .update(reservations)
          .set({ tableId: input.tableId })
          .where(eq(reservations.id, input.reservationId));

        return { success: true, message: "桌台分配成功" };
      } catch (error) {
        console.error("[ReservationTableSync] 分配桌台失败:", error);
        throw error;
      }
    }),

  /**
   * 预约到店时自动开始计时
   */
  startDiningFromReservation: protectedProcedure
    .input(
      z.object({
        reservationId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      try {
        // 获取预约信息
        const reservation = await db
          .select()
          .from(reservations)
          .where(eq(reservations.id, input.reservationId))
          .limit(1);

        if (!reservation.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "预约不存在",
          });
        }

        const res = reservation[0];

        if (!res.tableId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "预约未分配桌台，无法开始计时",
          });
        }

        // 获取桌台信息
        const table = await db
          .select()
          .from(tables)
          .where(eq(tables.id, res.tableId))
          .limit(1);

        if (!table.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "桌台不存在",
          });
        }

        const now = new Date();
        const endTime = new Date(now.getTime() + table[0].defaultDuration * 60 * 1000);

        // 创建用餐记录
        const result = await db.insert(diningSessions).values({
          tableId: res.tableId,
          startTime: now.getTime(),
          endTime: endTime.getTime(),
          bufferEndTime: new Date(endTime.getTime() + table[0].bufferDuration * 60 * 1000).getTime(),
          extensionCount: 0,
          totalExtensionMinutes: 0,
          isCompleted: 0,
          remarks: `来自预约 #${input.reservationId} - ${res.guestName}`,
        });

        // 更新预约的用餐记录ID和状态
        const insertedId = (result as any).insertId || 0;
        await db
          .update(reservations)
          .set({
            diningSessionId: insertedId,
            status: "arrived" as any,
          })
          .where(eq(reservations.id, input.reservationId));

        // 更新桌台状态
        await db
          .update(tables)
          .set({ status: "dining" as any })
          .where(eq(tables.id, res.tableId));

        return { success: true, message: "已开始计时", diningSessionId: insertedId };
      } catch (error) {
        console.error("[ReservationTableSync] 开始计时失败:", error);
        throw error;
      }
    }),

  /**
   * 预约取消时释放桌台
   */
  releaseTableFromReservation: protectedProcedure
    .input(
      z.object({
        reservationId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      try {
        // 获取预约信息
        const reservation = await db
          .select()
          .from(reservations)
          .where(eq(reservations.id, input.reservationId))
          .limit(1);

        if (!reservation.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "预约不存在",
          });
        }

        const res = reservation[0];

        if (res.tableId) {
          // 如果有关联的用餐记录，标记为已完成
          if (res.diningSessionId) {
            await db
              .update(diningSessions)
              .set({ isCompleted: 1 })
              .where(eq(diningSessions.id, res.diningSessionId));
          }

          // 释放桌台
          await db
            .update(tables)
            .set({ status: "idle" as any })
            .where(eq(tables.id, res.tableId));
        }

        // 更新预约状态
        await db
          .update(reservations)
          .set({
            status: "cancelled" as any,
            tableId: null,
            diningSessionId: null,
          })
          .where(eq(reservations.id, input.reservationId));

        return { success: true, message: "预约已取消，桌台已释放" };
      } catch (error) {
        console.error("[ReservationTableSync] 释放桌台失败:", error);
        throw error;
      }
    }),

  /**
   * 获取预约关联的桌台信息
   */
  getReservationTableInfo: protectedProcedure
    .input(
      z.object({
        reservationId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      try {
        const reservation = await db
          .select()
          .from(reservations)
          .where(eq(reservations.id, input.reservationId))
          .limit(1);

        if (!reservation.length) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "预约不存在",
          });
        }

        const res = reservation[0];

        if (!res.tableId) {
          return { reservation: res, table: null, diningSession: null };
        }

        const table = await db
          .select()
          .from(tables)
          .where(eq(tables.id, res.tableId))
          .limit(1);

        let diningSession = null;
        if (res.diningSessionId) {
          const session = await db
            .select()
            .from(diningSessions)
            .where(eq(diningSessions.id, res.diningSessionId))
            .limit(1);
          diningSession = session.length > 0 ? session[0] : null;
        }

        return {
          reservation: res,
          table: table.length > 0 ? table[0] : null,
          diningSession,
        };
      } catch (error) {
        console.error("[ReservationTableSync] 获取信息失败:", error);
        throw error;
      }
    }),
});
