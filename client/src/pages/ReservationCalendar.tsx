import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Calendar, ArrowLeft } from "lucide-react";
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
  const calendarDays = [
    ...Array(firstDayOfWeek).fill(null),
    ...days,
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700 text-xs">待确认</Badge>;
      case "confirmed":
        return <Badge className="bg-blue-100 text-blue-700 text-xs">已确认</Badge>;
      case "arrived":
        return <Badge className="bg-green-100 text-green-700 text-xs">已到店</Badge>;
      case "completed":
        return <Badge className="bg-gray-100 text-gray-700 text-xs">已完成</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-700 text-xs">已取消</Badge>;
      default:
        return <Badge className="text-xs">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* 头部 */}
      <header className="bg-gradient-to-r from-primary to-primary/80 shadow-elegant border-b sticky top-0 z-20">
        <div className="container py-4 md:py-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => (window.location.href = "/reservations")}
                className="text-white hover:bg-white/20 flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div className="p-1.5 md:p-2 bg-white rounded-lg shadow-md flex-shrink-0">
                <Calendar className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg md:text-2xl font-bold text-white truncate">预约日历</h1>
                <p className="text-blue-100 text-xs md:text-sm mt-0.5">查看未来预约</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = "/")}
              className="gap-2 bg-white hover:bg-blue-50 text-xs md:text-sm flex-shrink-0"
            >
              返回桌台
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-4 md:py-8 px-2 md:px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* 日历部分 */}
          <div className="lg:col-span-2">
            <Card className="shadow-elegant">
              <CardHeader className="pb-3 md:pb-4">
                <div className="flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <h2 className="text-base md:text-lg font-bold">
                    {format(currentDate, "yyyy年MM月", { locale: zhCN })}
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* 星期头 */}
                <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
                  {["日", "一", "二", "三", "四", "五", "六"].map((day) => (
                    <div key={day} className="text-center font-semibold text-xs md:text-sm text-muted-foreground py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* 日期网格 */}
                <div className="grid grid-cols-7 gap-1 md:gap-2">
                  {calendarDays.map((day, idx) => {
                    if (!day) {
                      return <div key={`empty-${idx}`} className="aspect-square" />;
                    }

                    const dateStr = format(day, "yyyy-MM-dd");
                    const count = reservationsByDate[dateStr] || 0;
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());

                    return (
                      <button
                        key={dateStr}
                        onClick={() => setSelectedDate(day)}
                        className={`aspect-square rounded-lg border-2 p-1 md:p-2 text-xs md:text-sm font-medium transition-all flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? "border-primary bg-primary/10"
                            : isToday
                            ? "border-blue-300 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <span className={isSelected ? "text-primary font-bold" : ""}>{day.getDate()}</span>
                        {count > 0 && (
                          <Badge className="bg-red-100 text-red-700 text-xs px-1 py-0 h-5">
                            {count}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 预约列表部分 */}
          <div className="lg:col-span-1">
            {selectedDate ? (
              <Card className="shadow-elegant">
                <CardHeader className="pb-3 md:pb-4">
                  <CardTitle className="text-base md:text-lg">
                    {format(selectedDate, "MM月dd日", { locale: zhCN })}的预约
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 md:space-y-3 max-h-96 overflow-y-auto">
                  {selectedDateReservations && selectedDateReservations.length > 0 ? (
                    selectedDateReservations.map((res: any) => (
                      <div key={res.id} className="border rounded-lg p-2 md:p-3 bg-gray-50 text-xs md:text-sm">
                        <div className="flex justify-between items-start gap-2 mb-1.5">
                          <div className="font-semibold truncate">{res.guestName}</div>
                          {getStatusBadge(res.status)}
                        </div>
                        <div className="text-muted-foreground space-y-0.5 text-xs">
                          <div>📞 {res.guestPhone}</div>
                          <div>⏰ {res.reservationTime}</div>
                          <div>👥 {res.partySize}人</div>
                          {res.remarks && <div>📝 {res.remarks}</div>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-8 text-xs md:text-sm">
                      该日期暂无预约
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-elegant">
                <CardContent className="pt-6 md:pt-8 text-center text-muted-foreground text-xs md:text-sm">
                  <Calendar className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-2 md:mb-3 opacity-50" />
                  <p>请选择日期查看预约</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
