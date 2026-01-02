import { TrendingUp, Clock, Users } from "lucide-react";
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
        return "bg-green-50 border-green-200";
      case "dining":
        return "bg-blue-50 border-blue-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      case "timeout":
        return "bg-red-50 border-red-200";
      case "buffer":
        return "bg-purple-50 border-purple-200";
      case "disabled":
        return "bg-gray-50 border-gray-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "idle":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
            立即可用
          </Badge>
        );
      case "dining":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
            用餐中
          </Badge>
        );
      case "warning":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-700 border-yellow-300">
            即将可用
          </Badge>
        );
      case "timeout":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
            已超时
          </Badge>
        );
      case "buffer":
        return (
          <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
            缓冲期
          </Badge>
        );
      case "disabled":
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
            停用
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-300">
            未知
          </Badge>
        );
    }
  };

  return (
    <Card className="shadow-elegant h-full flex flex-col sticky top-24">
      <CardHeader className="pb-4 border-b">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-primary" />
          排队预测
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          预计可用时间排序
        </p>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto pt-4">
        <div className="space-y-3">
          {prediction && prediction.length > 0 ? (
            prediction.slice(0, 12).map((item, index) => (
              <div
                key={item.tableId}
                className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${getStatusColor(
                  item.status
                )}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-bold text-base">桌号 {item.tableNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {getStatusBadge(item.status)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {item.status === "idle"
                      ? "立即可用"
                      : `${formatTime(item.availableAt)} 可用`}
                  </span>
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
