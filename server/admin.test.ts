import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
    name: "Admin User",
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

describe("管理后台功能测试", () => {
  let testTableId: number;

  describe("桌台管理", () => {
    it("应该能够创建新桌台", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const newTable = await caller.table.create({
        tableNumber: "TEST1",
        maxCapacity: 6,
        defaultDuration: 120,
        bufferDuration: 20,
      });

      expect(newTable).toBeDefined();
      expect(newTable.tableNumber).toBe("TEST1");
      expect(newTable.maxCapacity).toBe(6);
      expect(newTable.defaultDuration).toBe(120);
      expect(newTable.bufferDuration).toBe(20);
      expect(newTable.status).toBe("idle");

      testTableId = newTable.id;
    });

    it("应该能够更新桌台信息", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const updatedTable = await caller.table.update({
        id: testTableId,
        tableNumber: "TEST1-UPDATED",
        maxCapacity: 8,
        defaultDuration: 150,
        bufferDuration: 25,
      });

      expect(updatedTable).toBeDefined();
      expect(updatedTable.tableNumber).toBe("TEST1-UPDATED");
      expect(updatedTable.maxCapacity).toBe(8);
      expect(updatedTable.defaultDuration).toBe(150);
      expect(updatedTable.bufferDuration).toBe(25);
    });

    it("应该能够获取单个桌台信息", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const table = await caller.table.getById({ id: testTableId });

      expect(table).toBeDefined();
      expect(table.id).toBe(testTableId);
      expect(table.tableNumber).toBe("TEST1-UPDATED");
    });

    it("应该能够删除桌台", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.table.delete({ id: testTableId });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      // 验证桌台已被删除
      try {
        await caller.table.getById({ id: testTableId });
        // 如果没有抛出错误，测试应该失败
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toContain("桌台不存在");
      }
    });

    it("创建桌台时应该验证必填字段", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.table.create({
          tableNumber: "",
          maxCapacity: 4,
          defaultDuration: 90,
          bufferDuration: 15,
        });
        // 如果没有抛出错误，测试应该失败
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toContain("桌号不能为空");
      }
    });

    it("创建桌台时应该验证数值范围", async () => {
      const ctx = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.table.create({
          tableNumber: "TEST2",
          maxCapacity: 0,
          defaultDuration: 90,
          bufferDuration: 15,
        });
        // 如果没有抛出错误，测试应该失败
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toContain("最大人数至少为1");
      }
    });
  });
});
