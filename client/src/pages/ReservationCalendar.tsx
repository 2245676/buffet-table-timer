import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function ReservationCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // 查询整个月的预约数据
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const { data: monthReservations } = trpc.reservation.getByDateRange.useQuery(
    {
      startDate: format(monthStart, "yyyy-MM-dd"),
      endDate: format(monthEnd, "yyyy-MM-dd"),
    },
    { refetchInterval: 60000 }
  );

  // 查询选中日期的预约
  const { data: selectedDateReservations } = trpc.reservation.getByDate.useQuery(
    selectedDate ? { date: format(selectedDate, "yyyy-MM-dd") } : { date: "" },
    { refetchInterval: 60000, enabled: !!selectedDate }
  );

  // 按日期分组统计预约数
  const reservationsByDate = useMemo(() => {
    const grouped: Record<string, number> = {};
    if (monthReservations) {
      monthReservations.forEach((res: any) => {
        const date = res.reservationDate;
        grouped[date] = (grouped[date] || 0) + 1;
      });
    }
    return grouped;
  }, [monthReservations]);

  // 生成日历天数
  const days = eachDayOfInterval({
    start: monthStart,
    end: monthEnd,
  });

  // 填充前后空白天数
  const firstDayOfWeek = monthStart.getDay();
  const lastDayOfWeek = monthEnd.getDay();
  const prevMonthDays = Array(firstDayOfWeek).fill(null);
  const nextMonthDays = Array(6 - lastDayOfWeek).fill(null);
  const allDays = [...prevMonthDays, ...days, ...nextMonthDays];

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl font-bold">预约日历</h1>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setCurrentDate(new Date());
              setSelectedDate(null);
            }}
            className="bg-white"
          >
            返回今天
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧日历 */}
          <div className="lg:col-span-2">
            <Card className="shadow-elegant">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevMonth}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <CardTitle className="text-xl">
                    {format(currentDate, "yyyy年 MMMM", { locale: zhCN })}
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextMonth}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* 星期头 */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
                    <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* 日期网格 */}
                <div className="grid grid-cols-7 gap-2">
                  {allDays.map((day, index) => {
                    if (!day) {
                      return <div key={`empty-${index}`} className="aspect-square" />;
                    }

                    const dateStr = format(day, "yyyy-MM-dd");
                    const count = reservationsByDate[dateStr] || 0;
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());
                    const isCurrentMonth = isSameMonth(day, currentDate);

                    return (
                      <button
                        key={dateStr}
                        onClick={() => setSelectedDate(day)}
                        className={`aspect-square rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1 p-1 ${
                          isSelected
                            ? "border-red-500 bg-red-50"
                            : isToday
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200 hover:border-slate-300"
                        } ${!isCurrentMonth ? "opacity-40" : ""}`}
                      >
                        <div className={`text-sm font-semibold ${!isCurrentMonth ? "text-muted-foreground" : ""}`}>
                          {format(day, "d")}
                        </div>
                        {count > 0 && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">
                            {count}个预约
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧预约列表 */}
          <div>
            <Card className="shadow-elegant h-full flex flex-col">
              <CardHeader className="pb-3 border-b flex-shrink-0">
                <CardTitle className="text-lg">
                  {selectedDate
                    ? format(selectedDate, "yyyy年M月d日 EEEE", { locale: zhCN })
                    : "选择日期"}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto pt-4">
                {selectedDate && selectedDateReservations && selectedDateReservations.length > 0 && selectedDate ? (
                  <div className="space-y-3">
                    {selectedDateReservations.map((res: any) => (
                      <div
                        key={res.id}
                        className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold text-sm">{res.guestName}</div>
                          <Badge
                            variant={
                              res.status === "confirmed"
                                ? "default"
                                : res.status === "arrived"
                                ? "secondary"
                                : res.status === "completed"
                                ? "outline"
                                : "destructive"
                            }
                            className="text-xs"
                          >
                            {res.status === "pending"
                              ? "待确认"
                              : res.status === "confirmed"
                              ? "已确认"
                              : res.status === "arrived"
                              ? "已到店"
                              : res.status === "completed"
                              ? "已完成"
                              : "已取消"}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>📞 {res.guestPhone}</div>
                          <div>🕐 {res.reservationTime}</div>
                          <div>👥 {res.partySize}人</div>
                          {res.remarks && <div>📝 {res.remarks}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : selectedDate ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
                    <Calendar className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">该日期暂无预约</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-8">
                    <Calendar className="w-8 h-8 mb-2 opacity-50" />
                    <p className="text-sm">请选择日期查看预约</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
