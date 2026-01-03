import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, PlayCircle, PauseCircle, Plus } from "lucide-react";
import type { Table } from "../../../drizzle/schema";

interface DiningSession {
  id: number;
  tableId: number;
  startTime: number;
  endTime: number;
  actualEndTime: number | null;
  bufferEndTime: number | null;
  extensionCount: number;
  totalExtensionMinutes: number;
  isCompleted: number;
  lastAlertTime: number | null;
}

interface TableCardProps {
  table: Table;
  session: DiningSession | null;
  onStartDining?: (tableId: number) => void;
  onExtend?: (sessionId: number, minutes: number) => void;
  onComplete?: (sessionId: number) => void;
  onRefresh?: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "idle":
      return "bg-green-50 border-green-200";
    case "dining":
      return "bg-blue-50 border-blue-200";
    case "warning":
      return "bg-yellow-50 border-yellow-200";
    case "timeout":
      return "bg-red-50 border-red-200";
    case "disabled":
      return "bg-gray-50 border-gray-200";
    default:
      return "bg-white border-gray-200";
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "idle":
      return <Badge className="bg-green-100 text-green-700 border-green-300">空闲</Badge>;
    case "dining":
      return <Badge className="bg-blue-100 text-blue-700 border-blue-300">用餐中</Badge>;
    case "warning":
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">即将超时</Badge>;
    case "timeout":
      return <Badge className="bg-red-100 text-red-700 border-red-300">已超时</Badge>;
    case "disabled":
      return <Badge className="bg-gray-100 text-gray-700 border-gray-300">停用</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export default function TableCard({
  table,
  session,
  onStartDining,
  onExtend,
  onComplete,
  onRefresh,
}: TableCardProps) {
  const [remaining, setRemaining] = useState(0);
  const [remainingDisplay, setRemainingDisplay] = useState("--:--");

  const isActive = session && session.isCompleted === 0 && (table.status === "dining" || table.status === "warning" || table.status === "timeout");

  useEffect(() => {
    if (!isActive) return;

    const updateRemaining = () => {
      const now = Date.now();
      const diff = session!.endTime - now;
      setRemaining(diff);

      if (diff <= 0) {
        setRemainingDisplay("已超时");
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setRemainingDisplay(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [isActive, session]);

  return (
    <Card className={`border-2 h-48 flex flex-col ${getStatusColor(table.status)}`}>
      <CardContent className="p-3 flex flex-col h-full">
        {/* 顶部行：桌号在最上面 */}
        <div className="flex items-center justify-between gap-2 mb-2 flex-shrink-0">
          <h3 className="text-base font-bold text-foreground whitespace-nowrap">
            桌号 {table.tableNumber}
          </h3>
          {getStatusBadge(table.status)}
        </div>

        {/* 第二行：时间信息 */}
        <div className="flex items-center justify-between gap-3 mb-2 flex-shrink-0">
          {/* 时间信息 */}
          {isActive && (
            <div className="flex items-center gap-3 text-xs min-w-0 flex-1">
              <div className="whitespace-nowrap">
                <span className="text-muted-foreground">开始:</span>
                <span className="font-semibold ml-1">{formatTime(session!.startTime)}</span>
              </div>
              <div className="whitespace-nowrap">
                <span className="text-muted-foreground">结束:</span>
                <span className="font-semibold ml-1">{formatTime(session!.endTime)}</span>
              </div>
              <div className="whitespace-nowrap">
                <span
                  className={`font-bold ml-1 ${
                    remaining <= 300000
                      ? "text-red-600"
                      : remaining <= 900000
                      ? "text-yellow-600"
                      : "text-blue-600"
                  }`}
                >
                  {remainingDisplay}
                </span>
              </div>
            </div>
          )}

          {/* 空闲状态 */}
          {table.status === "idle" && (
            <div className="text-xs text-muted-foreground whitespace-nowrap">
              空闲可用
            </div>
          )}

          {/* 已超时状态 */}
          {table.status === "timeout" && (
            <div className="text-xs text-red-600 font-semibold whitespace-nowrap">
              已超时
            </div>
          )}
        </div>

        {/* 延时信息 */}
        {isActive && session!.extensionCount > 0 && (
          <div className="text-xs text-muted-foreground mb-2 flex-shrink-0">
            已延时 {session!.extensionCount} 次 ({session!.totalExtensionMinutes} 分钟)
          </div>
        )}

        {/* 中间弹性空间 */}
        <div className="flex-1" />

        {/* 底部行：操作按钮 */}
        <div className="flex gap-2 flex-wrap flex-shrink-0">
          {table.status === "idle" ? (
            <Button
              onClick={() => onStartDining?.(table.id)}
              className="flex-1 min-w-[80px] bg-red-600 hover:bg-red-700 text-white text-xs h-8"
              size="sm"
            >
              <PlayCircle className="w-3 h-3 mr-1" />
              开始用餐
            </Button>
          ) : isActive ? (
            <>
              <Button
                onClick={() => onExtend?.(session!.id, 5)}
                variant="outline"
                size="sm"
                className="flex-1 min-w-[60px] text-xs h-8"
              >
                <Plus className="w-3 h-3 mr-1" />
                +5分
              </Button>
              <Button
                onClick={() => onExtend?.(session!.id, 10)}
                variant="outline"
                size="sm"
                className="flex-1 min-w-[60px] text-xs h-8"
              >
                <Plus className="w-3 h-3 mr-1" />
                +10分
              </Button>
              <Button
                onClick={() => onComplete?.(session!.id)}
                className="flex-1 min-w-[60px] bg-red-600 hover:bg-red-700 text-white text-xs h-8"
                size="sm"
              >
                <PauseCircle className="w-3 h-3 mr-1" />
                结束
              </Button>
            </>
          ) : table.status === "timeout" ? (
            <Button
              onClick={() => onComplete?.(session!.id)}
              className="w-full bg-red-600 hover:bg-red-700 text-white text-xs h-8"
              size="sm"
            >
              <PauseCircle className="w-3 h-3 mr-1" />
              结束
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
