import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, PlayCircle, PauseCircle, Plus } from "lucide-react";
import { Table, DiningSession } from "../../../drizzle/schema";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface TableCardProps {
  table: Table;
  session: DiningSession | null;
  onStartDining: (tableId: number) => void;
  onExtend: (sessionId: number, minutes: number) => void;
  onComplete: (sessionId: number) => void;
  remainingMinutes?: number;
}

const statusConfig = {
  idle: { label: "空闲", className: "status-idle", icon: PlayCircle },
  dining: { label: "用餐中", className: "status-dining", icon: Clock },
  warning: { label: "即将超时", className: "status-warning", icon: Clock },
  timeout: { label: "已超时", className: "status-timeout", icon: Clock },
  buffer: { label: "缓冲期", className: "status-buffer", icon: PauseCircle },
  disabled: { label: "停用", className: "status-disabled", icon: PauseCircle },
};

export function TableCard({
  table,
  session,
  onStartDining,
  onExtend,
  onComplete,
  remainingMinutes,
}: TableCardProps) {
  const config = statusConfig[table.status];
  const StatusIcon = config.icon;

  const formatTime = (ms: number) => {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;
  };

  const getRemainingTime = () => {
    if (!session || table.status === "buffer") return null;
    const now = Date.now();
    const remaining = session.endTime - now;
    return remaining;
  };

  const remainingTime = getRemainingTime();

  return (
    <Card className={`shadow-elegant hover:shadow-elegant-lg transition-shadow duration-300 ${config.className} border-2`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <StatusIcon className="w-6 h-6" />
            桌号 {table.tableNumber}
          </CardTitle>
          <Badge variant="outline" className="text-sm font-semibold">
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 桌台信息 */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>最多 {table.maxCapacity} 人</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>标准 {table.defaultDuration} 分钟</span>
          </div>
        </div>

        {/* 用餐信息 */}
        {session && table.status !== "buffer" && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">开始时间</span>
              <span className="font-medium">
                {new Date(session.startTime).toLocaleTimeString("zh-CN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">预计结束</span>
              <span className="font-medium">
                {new Date(session.endTime).toLocaleTimeString("zh-CN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            {remainingTime !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">剩余时间</span>
                <span
                  className={`font-bold text-lg ${
                    remainingTime <= 300000
                      ? "text-red-600 animate-pulse"
                      : remainingTime <= 900000
                      ? "text-yellow-600"
                      : "text-blue-600"
                  }`}
                >
                  {remainingTime > 0 ? formatTime(remainingTime) : "已超时"}
                </span>
              </div>
            )}
            {session.extensionCount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">已延时</span>
                <span className="font-medium">
                  {session.extensionCount} 次 ({session.totalExtensionMinutes} 分钟)
                </span>
              </div>
            )}
          </div>
        )}

        {/* 缓冲期信息 */}
        {table.status === "buffer" && session?.bufferEndTime && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">缓冲期结束</span>
              <span className="font-medium">
                {formatDistanceToNow(new Date(session.bufferEndTime), {
                  addSuffix: true,
                  locale: zhCN,
                })}
              </span>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-2">
          {table.status === "idle" && (
            <Button
              onClick={() => onStartDining(table.id)}
              className="flex-1"
              size="lg"
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              开始用餐
            </Button>
          )}

          {session && table.status !== "idle" && table.status !== "buffer" && (
            <>
              <Button
                onClick={() => onExtend(session.id, 5)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-1" />
                +5分钟
              </Button>
              <Button
                onClick={() => onExtend(session.id, 10)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-1" />
                +10分钟
              </Button>
              <Button
                onClick={() => onComplete(session.id)}
                variant="default"
                size="sm"
                className="flex-1"
              >
                <PauseCircle className="w-4 h-4 mr-1" />
                结束
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
