import { TrendingUp, Clock, Users, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QueueItem {
  tableId: number;
  tableNumber: string;
  availableAt: number;
  status: "idle" | "dining" | "warning" | "timeout" | "buffer" | "disabled";
}

interface QueuePredictionPanelProps {
  prediction: QueueItem[];
}

export function QueuePredictionPanel({ prediction }: QueuePredictionPanelProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "idle":
        return "bg-green-50 border-l-4 border-green-400";
      case "dining":
        return "bg-blue-50 border-l-4 border-blue-400";
      case "warning":
        return "bg-yellow-50 border-l-4 border-yellow-400";
      case "timeout":
        return "bg-red-50 border-l-4 border-red-400";
      case "buffer":
        return "bg-purple-50 border-l-4 border-purple-400";
      default:
        return "bg-gray-50 border-l-4 border-gray-400";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "idle":
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">
            立即可用
          </Badge>
        );
      case "dining":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
            用餐中
          </Badge>
        );
      case "warning":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300 text-xs">
            即将可用
          </Badge>
        );
      case "timeout":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">
            已超时
          </Badge>
        );
      case "buffer":
        return (
          <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-xs">
            缓冲期
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-700 border-gray-300 text-xs">
            停用
          </Badge>
        );
    }
  };

  return (
    <Card className="shadow-elegant h-full flex flex-col sticky top-24">
      <CardHeader className="pb-3 border-b flex-shrink-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-primary" />
          排队预测
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          按可用时间排序
        </p>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pt-3">
        <div className="space-y-2">
          {prediction && prediction.length > 0 ? (
            prediction.slice(0, 12).map((item, index) => (
              <div
                key={item.tableId}
                className={`p-3 rounded-lg transition-all hover:shadow-md ${getStatusColor(
                  item.status
                )}`}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* 左侧：排序号和桌号 */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm">桌号 {item.tableNumber}</div>
                      <div className="text-xs">
                        {getStatusBadge(item.status)}
                      </div>
                    </div>
                  </div>

                  {/* 右侧：可用时间（重点显示） */}
                  <div className="flex flex-col items-end flex-shrink-0">
                    {item.status === "idle" ? (
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">立即可用</div>
                        <div className="text-lg font-bold text-green-600">✓</div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">可用时间</div>
                        <div className="text-base font-bold text-primary">
                          {formatTime(item.availableAt)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Users className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">暂无排队信息</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default QueuePredictionPanel;
