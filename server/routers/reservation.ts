import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  createReservation,
  updateReservation,
  deleteReservation,
  getReservationsByDate,
  getReservationsByDateRange,
  searchReservations,
  getCapacityForTimeSlot,
  checkDuplicateReservation,
  isPhoneInBlacklist,
  getCapacityConfig,
  getTodayStats,
} from "../reservation-db";
import { TRPCError } from "@trpc/server";

export const reservationRouter = router({
  /**
   * 创建预约
   */
  create: protectedProcedure
    .input(
      z.object({
        reservationDate: z.string(),
        reservationTime: z.string(),
        guestName: z.string().min(1),
        guestPhone: z.string().min(1),
        partySize: z.number().min(1),
        source: z.enum(["phone", "wechat", "walk-in", "platform", "other"]),
        remarks: z.string().nullish(),
        tags: z.string().nullish(),
        tableId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 检查黑名单
      const inBlacklist = await isPhoneInBlacklist(input.guestPhone);
      if (inBlacklist) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "该客人在黑名单中，无法预约",
        });
      }

      // 检查重复预约
      const isDuplicate = await checkDuplicateReservation(
        input.guestPhone,
        input.reservationDate
      );
      if (isDuplicate) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "该客人在同一天已有预约，请确认是否重复预约",
        });
      }

      try {
        await createReservation({
          ...input,
          createdBy: ctx.user!.id,
          updatedBy: ctx.user!.id,
          operatedBy: ctx.user!.id,
        });

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "创建预约失败",
        });
      }
    }),

  /**
   * 更新预约
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        reservationDate: z.string().optional(),
        reservationTime: z.string().optional(),
        guestName: z.string().optional(),
        guestPhone: z.string().optional(),
        partySize: z.number().optional(),
        source: z.enum(["phone", "wechat", "walk-in", "platform", "other"]).optional(),
        status: z.enum(["pending", "confirmed", "arrived", "completed", "cancelled"]).optional(),
        remarks: z.string().nullish(),
        tags: z.string().nullish(),
        tableId: z.number().optional().nullable(),
        isHighRisk: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;

      try {
        await updateReservation(id, data, ctx.user!.id);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "更新预约失败",
        });
      }
    }),

  /**
   * 删除预约
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        await deleteReservation(input.id, ctx.user!.id);
        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "删除预约失败",
        });
      }
    }),

  /**
   * 获取指定日期的预约
   */
  getByDate: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      return await getReservationsByDate(input.date);
    }),

  /**
   * 获取日期范围内的预约
   */
  getByDateRange: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      return await getReservationsByDateRange(input.startDate, input.endDate);
    }),

  /**
   * 搜索预约
   */
  search: protectedProcedure
    .input(
      z.object({
        query: z.string(),
        date: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return await searchReservations(input.query, input.date);
    }),

  /**
   * 获取容量配置
   */
  getCapacityConfig: protectedProcedure.query(async () => {
    return await getCapacityConfig();
  }),

  /**
   * 检查容量
   */
  checkCapacity: protectedProcedure
    .input(
      z.object({
        date: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        maxCapacity: z.number(),
      })
    )
    .query(async ({ input }) => {
      const currentCapacity = await getCapacityForTimeSlot(
        input.date,
        input.startTime,
        input.endTime
      );

      return {
        currentCapacity,
        maxCapacity: input.maxCapacity,
        isOverCapacity: currentCapacity >= input.maxCapacity,
        availableSeats: Math.max(0, input.maxCapacity - currentCapacity),
      };
    }),

  /**
   * 获取今日统计
   */
  getTodayStats: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      return await getTodayStats(input.date);
    }),
});
