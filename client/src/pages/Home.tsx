import { useEffect, useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { TableCard } from "@/components/TableCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Clock, TrendingUp, RefreshCw } from "lucide-react";

export default function Home() {
  const [timeoutDialogOpen, setTimeoutDialogOpen] = useState(false);
  const [timeoutTables, setTimeoutTables] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastCheckRef = useRef<number>(Date.now());

  // 查询所有桌台状态
  const { data: tableStatus, refetch: refetchStatus } = trpc.monitor.getAllStatus.useQuery(undefined, {
    refetchInterval: 60000, // 每分钟刷新一次
  });

  // 查询排队预测
  const { data: queuePrediction } = trpc.monitor.queuePrediction.useQuery(undefined, {
    refetchInterval: 60000,
  });

  // Mutations
  const startDining = trpc.dining.start.useMutation({
    onSuccess: () => {
      toast.success("开始用餐成功");
      refetchStatus();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const extendDining = trpc.dining.extend.useMutation({
    onSuccess: () => {
      toast.success("延时成功");
      refetchStatus();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const completeDining = trpc.dining.complete.useMutation({
    onSuccess: () => {
      toast.success("用餐结束,进入缓冲期");
      refetchStatus();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateAlertTime = trpc.dining.updateAlertTime.useMutation();

  // 检查超时和状态更新
  useEffect(() => {
    if (!tableStatus) return;

    const checkInterval = setInterval(() => {
      const now = Date.now();
      const newTimeoutTables: string[] = [];

      tableStatus.forEach(({ table, session }) => {
        if (!session || session.isCompleted === 1) return;

        const remaining = session.endTime - now;

        // 检查是否超时（每3分钟提醒一次）
        if (remaining <= 0) {
          const lastAlert = session.lastAlertTime || 0;
          const timeSinceLastAlert = now - lastAlert;

          if (timeSinceLastAlert >= 180000 || lastAlert === 0) {
            // 3分钟 = 180000ms
            newTimeoutTables.push(table.tableNumber);
            updateAlertTime.mutate({ sessionId: session.id, time: now });
          }
        }
        // 5分钟提醒
        else if (remaining <= 300000 && remaining > 240000) {
          const lastCheck = lastCheckRef.current;
          if (now - lastCheck >= 60000) {
            toast.warning(`桌号 ${table.tableNumber} 还有5分钟即将超时`, {
              duration: 5000,
            });
          }
        }
      });

      if (newTimeoutTables.length > 0) {
        setTimeoutTables(newTimeoutTables);
        setTimeoutDialogOpen(true);
        playAlertSound();
      }

      lastCheckRef.current = now;
    }, 60000); // 每分钟检查一次

    return () => clearInterval(checkInterval);
  }, [tableStatus]);

  // 播放提醒声音
  const playAlertSound = () => {
    try {
      // 使用Web Audio API生成简单的提示音
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error("播放声音失败:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 头部 */}
      <header className="bg-card shadow-elegant border-b sticky top-0 z-10">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">自助餐桌台计时系统</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchStatus()}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              刷新
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* 桌台网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
          {tableStatus?.map(({ table, session }) => (
            <TableCard
              key={table.id}
              table={table}
              session={session}
              onStartDining={(tableId) => startDining.mutate({ tableId })}
              onExtend={(sessionId, minutes) =>
                extendDining.mutate({ sessionId, extensionMinutes: minutes })
              }
              onComplete={(sessionId) => completeDining.mutate({ sessionId })}
            />
          ))}
        </div>

        {/* 排队预测 */}
        {queuePrediction && queuePrediction.length > 0 && (
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                排队预测
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {queuePrediction.slice(0, 8).map((item, index) => (
                  <div
                    key={item.tableId}
                    className="p-4 rounded-lg border bg-muted/50"
                  >
                    <div className="text-sm text-muted-foreground mb-1">
                      第 {index + 1} 位
                    </div>
                    <div className="font-bold text-lg">桌号 {item.tableNumber}</div>
                    <div className="text-sm text-muted-foreground mt-2">
                      {item.status === "idle"
                        ? "立即可用"
                        : `预计 ${new Date(item.availableAt).toLocaleTimeString("zh-CN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })} 可用`}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* 超时提醒对话框 */}
      <Dialog open={timeoutDialogOpen} onOpenChange={setTimeoutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 text-xl">⚠️ 桌台超时提醒</DialogTitle>
            <DialogDescription className="text-base">
              以下桌台已超时,请及时处理:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {timeoutTables.map((tableNumber) => (
              <div
                key={tableNumber}
                className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 font-semibold"
              >
                桌号 {tableNumber}
              </div>
            ))}
          </div>
          <Button onClick={() => setTimeoutDialogOpen(false)} className="w-full">
            我知道了
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
