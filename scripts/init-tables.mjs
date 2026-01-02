import { drizzle } from "drizzle-orm/mysql2";
import { tables } from "../drizzle/schema.js";
import "dotenv/config";

async function initTables() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);

  console.log("正在初始化桌台数据...");

  const tablesToCreate = [
    { tableNumber: "A1", maxCapacity: 4, defaultDuration: 90, bufferDuration: 15 },
    { tableNumber: "A2", maxCapacity: 4, defaultDuration: 90, bufferDuration: 15 },
    { tableNumber: "A3", maxCapacity: 6, defaultDuration: 120, bufferDuration: 20 },
    { tableNumber: "A4", maxCapacity: 2, defaultDuration: 60, bufferDuration: 10 },
    { tableNumber: "B1", maxCapacity: 4, defaultDuration: 90, bufferDuration: 15 },
    { tableNumber: "B2", maxCapacity: 4, defaultDuration: 90, bufferDuration: 15 },
    { tableNumber: "B3", maxCapacity: 8, defaultDuration: 150, bufferDuration: 25 },
    { tableNumber: "B4", maxCapacity: 2, defaultDuration: 60, bufferDuration: 10 },
  ];

  try {
    for (const table of tablesToCreate) {
      await db.insert(tables).values(table);
      console.log(`✓ 创建桌台: ${table.tableNumber}`);
    }
    console.log("\n初始化完成!");
  } catch (error) {
    console.error("初始化失败:", error);
    process.exit(1);
  }

  process.exit(0);
}

initTables();
