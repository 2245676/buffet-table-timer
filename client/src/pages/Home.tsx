import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import TableCard from "@/components/TableCard";
import QueuePredictionPanel from "@/components/QueuePredictionPanel";

export default function Home() {
  const [currentTime, setCurrentTime] = useState("");

  // 查询所有桌台状态
  const { data: allStatus, refetch: refetchStatus } = trpc.monitor.getAllStatus.useQuery(
    undefined,
    { refetchInterval: 60000 }
  );

  // 查询排队预测
  const { data: queuePrediction } = trpc.monitor.queuePrediction.useQuery(
    undefined,
    { refetchInterval: 60000 }
  );

  // 更新当前时间
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("zh-CN", { hour12: false }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* 红色头部横幅 */}
      <header className="bg-gradient-to-r from-red-500 to-red-600 shadow-elegant border-b sticky top-0 z-20">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            {/* 左侧：标题和描述 */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-md">
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">自助餐桌台计时系统</h1>
                <p className="text-red-100 text-sm mt-1">实时监控 • 智能提醒 • 高效管理</p>
              </div>
            </div>

            {/* 中间：当前时间 */}
            <div className="text-center">
              <div className="text-4xl font-bold text-white tracking-wider">{currentTime}</div>
              <p className="text-red-100 text-xs mt-1">当前时间</p>
            </div>

            {/* 右侧：按钮组 */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = "/reservations")}
                className="gap-2 bg-white hover:bg-red-50"
              >
                预约管理
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = "/admin")}
                className="gap-2 bg-white hover:bg-red-50"
              >
                管理后台
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchStatus()}
                className="gap-2 bg-white hover:bg-red-50"
              >
                <RefreshCw className="w-4 h-4" />
                刷新
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 左侧排队预测面板 */}
          <div className="lg:col-span-1">
            {queuePrediction && (
              <QueuePredictionPanel prediction={queuePrediction} />
            )}
          </div>

          {/* 右侧桌台网格 */}
          <div className="lg:col-span-3">
            {allStatus && allStatus.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
                {allStatus.map((item) => (
                  <TableCard
                    key={item.table.id}
                    table={item.table}
                    session={item.session}
                    onRefresh={() => refetchStatus()}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">加载中...</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
