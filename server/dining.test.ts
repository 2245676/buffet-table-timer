import { describe, expect, it, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("桌台管理系统测试", () => {
  let testTableId: number;

  beforeAll(async () => {
    // 创建测试桌台
    const tables = await db.getAllTables();
    if (tables.length > 0) {
      testTableId = tables[0].id;
    }
  });

  describe("桌台列表", () => {
    it("应该能够获取所有桌台", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const tables = await caller.table.list();

      expect(tables).toBeDefined();
      expect(Array.isArray(tables)).toBe(true);
      expect(tables.length).toBeGreaterThan(0);
    });
  });

  describe("用餐流程", () => {
    it("应该能够开始用餐", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // 确保桌台是空闲状态
      const table = await db.getTableById(testTableId);
      if (table && table.status !== "idle") {
        await db.updateTableStatus(testTableId, "idle");
      }

      const session = await caller.dining.start({ tableId: testTableId });

      expect(session).toBeDefined();
      expect(session.tableId).toBe(testTableId);
      expect(session.startTime).toBeDefined();
      expect(session.endTime).toBeGreaterThan(session.startTime);
      expect(session.isCompleted).toBe(0);
    });

    it("应该能够延长用餐时间", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // 获取当前活动的用餐记录
      const activeSession = await db.getActiveDiningSession(testTableId);
      expect(activeSession).toBeDefined();

      if (activeSession) {
        const originalEndTime = activeSession.endTime;
        const extensionMinutes = 10;

        const updatedSession = await caller.dining.extend({
          sessionId: activeSession.id,
          extensionMinutes,
        });

        expect(updatedSession).toBeDefined();
        expect(updatedSession.endTime).toBe(originalEndTime + extensionMinutes * 60 * 1000);
        expect(updatedSession.extensionCount).toBe(activeSession.extensionCount + 1);
        expect(updatedSession.totalExtensionMinutes).toBe(
          activeSession.totalExtensionMinutes + extensionMinutes
        );
      }
    });

    it("应该能够结束用餐", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      // 获取当前活动的用餐记录
      const activeSession = await db.getActiveDiningSession(testTableId);
      expect(activeSession).toBeDefined();

      if (activeSession) {
        const completedSession = await caller.dining.complete({
          sessionId: activeSession.id,
        });

        expect(completedSession).toBeDefined();
        expect(completedSession.isCompleted).toBe(1);
        expect(completedSession.actualEndTime).toBeDefined();
        expect(completedSession.bufferEndTime).toBeDefined();

        // 检查桌台状态是否更新为缓冲期
        const table = await db.getTableById(testTableId);
        expect(table?.status).toBe("buffer");
      }
    });
  });

  describe("监控和预测", () => {
    it("应该能够获取所有桌台状态", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const status = await caller.monitor.getAllStatus();

      expect(status).toBeDefined();
      expect(Array.isArray(status)).toBe(true);
      expect(status.length).toBeGreaterThan(0);
      expect(status[0]).toHaveProperty("table");
      expect(status[0]).toHaveProperty("session");
    });

    it("应该能够获取排队预测", async () => {
      const ctx = createTestContext();
      const caller = appRouter.createCaller(ctx);

      const prediction = await caller.monitor.queuePrediction();

      expect(prediction).toBeDefined();
      expect(Array.isArray(prediction)).toBe(true);
      
      if (prediction.length > 0) {
        expect(prediction[0]).toHaveProperty("tableId");
        expect(prediction[0]).toHaveProperty("tableNumber");
        expect(prediction[0]).toHaveProperty("availableAt");
        expect(prediction[0]).toHaveProperty("status");

        // 检查排序是否正确（按可用时间升序）
        for (let i = 1; i < prediction.length; i++) {
          expect(prediction[i].availableAt).toBeGreaterThanOrEqual(
            prediction[i - 1].availableAt
          );
        }
      }
    });
  });
});
