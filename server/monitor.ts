import * as db from "./db";
import { notifyOwner } from "./_core/notification";

/**
 * 全局定时器 - 每分钟检查所有桌台状态
 * 自动更新桌台状态并发送超时通知
 */
export function startMonitoring() {
  console.log("[Monitor] 启动全局定时器...");

  // 立即执行一次检查
  checkAllTables();

  // 每分钟执行一次检查
  setInterval(() => {
    checkAllTables();
  }, 60000); // 60秒 = 1分钟
}

async function checkAllTables() {
  try {
    const now = Date.now();
    const allTables = await db.getAllTables();
    const activeSessions = await db.getAllActiveDiningSessions();

    // 创建桌台ID到用餐记录的映射
    const sessionMap = new Map<number, typeof activeSessions[0]>();
    activeSessions.forEach((session) => {
      sessionMap.set(session.tableId, session);
    });

    const timeoutTables: string[] = [];

    for (const table of allTables) {
      const session = sessionMap.get(table.id);

      // 去掉缓冲期处理逻辑

      // 处理用餐中的桌台
      if (session && session.isCompleted === 0) {
        const remaining = session.endTime - now;

        // 已超时
        if (remaining <= 0) {
          if (table.status !== "timeout") {
            await db.updateTableStatus(table.id, "timeout");
            console.log(`[Monitor] 桌号 ${table.tableNumber} 已超时`);
          }

          // 检查是否需要发送通知（每3分钟一次）
          const lastAlert = session.lastAlertTime || 0;
          const timeSinceLastAlert = now - lastAlert;

          if (timeSinceLastAlert >= 180000 || lastAlert === 0) {
            // 3分钟 = 180000ms
            timeoutTables.push(table.tableNumber);
            await db.updateLastAlertTime(session.id, now);
          }
        }
        // 即将超时（≤15分钟）
        else if (remaining <= 900000) {
          // 15分钟 = 900000ms
          if (table.status !== "warning") {
            await db.updateTableStatus(table.id, "warning");
            console.log(`[Monitor] 桌号 ${table.tableNumber} 即将超时（剩余 ${Math.floor(remaining / 60000)} 分钟）`);
          }
        }
        // 正常用餐中
        else {
          if (table.status !== "dining") {
            await db.updateTableStatus(table.id, "dining");
          }
        }
      }
    }

    // 批量发送超时通知
    if (timeoutTables.length > 0) {
      const tableList = timeoutTables.join("、");
      const title = "桌台超时提醒";
      const content = `以下桌台已超时，请及时处理：${tableList}`;

      const success = await notifyOwner({ title, content });
      if (success) {
        console.log(`[Monitor] 已发送超时通知: ${tableList}`);
      } else {
        console.warn(`[Monitor] 发送超时通知失败: ${tableList}`);
      }
    }
  } catch (error) {
    console.error("[Monitor] 检查桌台状态时发生错误:", error);
  }
}
