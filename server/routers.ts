import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // 桌台管理
  table: router({
    // 获取所有桌台
    list: publicProcedure.query(async () => {
      return await db.getAllTables();
    }),

    // 获取单个桌台
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const table = await db.getTableById(input.id);
        if (!table) {
          throw new TRPCError({ code: "NOT_FOUND", message: "桌台不存在" });
        }
        return table;
      }),

    // 创建桌台
    create: protectedProcedure
      .input(
        z.object({
          tableNumber: z.string().min(1, "桌号不能为空"),
          maxCapacity: z.number().min(1, "最大人数至少为1"),
          defaultDuration: z.number().min(1, "默认用餐时长至少为1分钟"),
          bufferDuration: z.number().min(0, "缓冲期时长不能为负数"),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createTable(input);
      }),

    // 更新桌台
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          tableNumber: z.string().min(1, "桌号不能为空").optional(),
          maxCapacity: z.number().min(1, "最大人数至少为1").optional(),
          defaultDuration: z.number().min(1, "默认用餐时长至少为1分钟").optional(),
          bufferDuration: z.number().min(0, "缓冲期时长不能为负数").optional(),
          status: z.enum(["idle", "dining", "warning", "timeout", "buffer", "disabled"]).optional(),
          isActive: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updated = await db.updateTable(id, data);
        if (!updated) {
          throw new TRPCError({ code: "NOT_FOUND", message: "桌台不存在" });
        }
        return updated;
      }),

    // 删除桌台
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const success = await db.deleteTable(input.id);
        if (!success) {
          throw new TRPCError({ code: "NOT_FOUND", message: "桌台不存在" });
        }
        return { success: true };
      }),
  }),

  // 用餐管理
  dining: router({
    // 开始用餐
    start: publicProcedure
      .input(z.object({ tableId: z.number() }))
      .mutation(async ({ input }) => {
        const table = await db.getTableById(input.tableId);
        if (!table) {
          throw new TRPCError({ code: "NOT_FOUND", message: "桌台不存在" });
        }

        if (table.status !== "idle") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "桌台当前不可用" });
        }

        // 检查是否已有活动的用餐记录
        const activeSession = await db.getActiveDiningSession(input.tableId);
        if (activeSession) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "该桌台已有进行中的用餐" });
        }

        const now = Date.now();
        const endTime = now + table.defaultDuration * 60 * 1000;

        // 创建用餐记录
        const session = await db.createDiningSession({
          tableId: input.tableId,
          startTime: now,
          endTime: endTime,
          extensionCount: 0,
          totalExtensionMinutes: 0,
          isCompleted: 0,
        });

        // 更新桌台状态
        await db.updateTableStatus(input.tableId, "dining");

        return session;
      }),

    // 延长用餐时间
    extend: publicProcedure
      .input(
        z.object({
          sessionId: z.number(),
          extensionMinutes: z.number().min(1, "延长时间至少为1分钟"),
        })
      )
      .mutation(async ({ input }) => {
        const session = await db.extendDiningSession(input.sessionId, input.extensionMinutes);
        if (!session) {
          throw new TRPCError({ code: "NOT_FOUND", message: "用餐记录不存在" });
        }
        return session;
      }),

    // 结束用餐
    complete: publicProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ input }) => {
        const session = await db.completeDiningSession(input.sessionId);
        if (!session) {
          throw new TRPCError({ code: "NOT_FOUND", message: "用餐记录不存在" });
        }

        // 更新桌台状态为缓冲期
        await db.updateTableStatus(session.tableId, "buffer");

        return session;
      }),

    // 获取桌台的当前用餐记录
    getActiveSession: publicProcedure
      .input(z.object({ tableId: z.number() }))
      .query(async ({ input }) => {
        return await db.getActiveDiningSession(input.tableId);
      }),

    // 获取所有活动的用餐记录
    getAllActiveSessions: publicProcedure.query(async () => {
      return await db.getAllActiveDiningSessions();
    }),

    // 更新最后提醒时间
    updateAlertTime: publicProcedure
      .input(
        z.object({
          sessionId: z.number(),
          time: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateLastAlertTime(input.sessionId, input.time);
        return { success: true };
      }),
  }),

  // 状态监控和排队预测
  monitor: router({
    // 获取所有桌台的完整状态（包含用餐记录）
    getAllStatus: publicProcedure.query(async () => {
      const allTables = await db.getAllTables();
      const activeSessions = await db.getAllActiveDiningSessions();

      // 创建桌台ID到用餐记录的映射
      const sessionMap = new Map<number, typeof activeSessions[0]>();
      activeSessions.forEach(session => {
        sessionMap.set(session.tableId, session);
      });

      // 组合桌台和用餐记录信息
      const tableStatus = allTables.map(table => {
        const session = sessionMap.get(table.id);
        return {
          table,
          session: session || null,
        };
      });

      return tableStatus;
    }),

    // 排队预测
    queuePrediction: publicProcedure.query(async () => {
      const allTables = await db.getAllTables();
      const activeSessions = await db.getAllActiveDiningSessions();

      const sessionMap = new Map<number, typeof activeSessions[0]>();
      activeSessions.forEach(session => {
        sessionMap.set(session.tableId, session);
      });

      // 计算每个桌台的可用时间
      const availableTimes = allTables
        .filter(table => table.isActive === 1 && table.status !== "disabled")
        .map(table => {
          const session = sessionMap.get(table.id);
          
          let availableAt: number;
          if (table.status === "idle") {
            // 空闲桌台立即可用
            availableAt = Date.now();
          } else if (session) {
            // 有用餐记录的桌台，计算结束时间+缓冲期
            availableAt = session.endTime + table.bufferDuration * 60 * 1000;
          } else {
            // 其他状态（如缓冲期），使用当前时间
            availableAt = Date.now();
          }

          return {
            tableId: table.id,
            tableNumber: table.tableNumber,
            availableAt,
            status: table.status,
          };
        })
        .sort((a, b) => a.availableAt - b.availableAt);

      return availableTimes;
    }),
  }),
});

export type AppRouter = typeof appRouter;
