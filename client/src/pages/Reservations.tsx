import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, AlertCircle, Users, Clock, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

type Reservation = {
  id: number;
  reservationDate: string;
  reservationTime: string;
  guestName: string;
  guestPhone: string;
  partySize: number;
  source: string;
  status: string;
  remarks: string | null;
  tags: string | null;
  tableId: number | null;
  diningSessionId: number | null;
  isHighRisk: number;
  createdAt: Date;
  updatedAt: Date;
};

export default function Reservations() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [currentDate, setCurrentDate] = useState(today);
  const [searchQuery, setSearchQuery] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  const [formData, setFormData] = useState({
    reservationDate: today,
    reservationTime: "12:00",
    guestName: "",
    guestPhone: "",
    partySize: 2,
    source: "phone" as const,
    remarks: "",
    tags: "",
  });

  // 查询今日预约
  const { data: reservations, refetch: refetchReservations } = trpc.reservation.getByDate.useQuery(
    { date: currentDate },
    { refetchInterval: 30000 }
  );

  // 查询今日统计
  const { data: stats } = trpc.reservation.getTodayStats.useQuery(
    { date: currentDate },
    { refetchInterval: 30000 }
  );

  // Mutations
  const createReservation = trpc.reservation.create.useMutation({
    onSuccess: () => {
      toast.success("预约创建成功");
      setAddDialogOpen(false);
      resetForm();
      refetchReservations();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateReservation = trpc.reservation.update.useMutation({
    onSuccess: () => {
      toast.success("预约更新成功");
      setEditDialogOpen(false);
      setSelectedReservation(null);
      refetchReservations();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteReservation = trpc.reservation.delete.useMutation({
    onSuccess: () => {
      toast.success("预约已取消");
      refetchReservations();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      reservationDate: today,
      reservationTime: "12:00",
      guestName: "",
      guestPhone: "",
      partySize: 2,
      source: "phone",
      remarks: "",
      tags: "",
    });
  };

  const handleAddClick = () => {
    resetForm();
    setAddDialogOpen(true);
  };

  const handleEditClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setFormData({
      reservationDate: reservation.reservationDate,
      reservationTime: reservation.reservationTime,
      guestName: reservation.guestName,
      guestPhone: reservation.guestPhone,
      partySize: reservation.partySize,
      source: reservation.source as any,
      remarks: reservation.remarks || "",
      tags: reservation.tags || "",
    });
    setEditDialogOpen(true);
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    createReservation.mutate(formData);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedReservation) {
      updateReservation.mutate({
        id: selectedReservation.id,
        reservationDate: formData.reservationDate,
        reservationTime: formData.reservationTime,
        guestName: formData.guestName,
        guestPhone: formData.guestPhone,
        partySize: formData.partySize,
        source: formData.source,
        remarks: formData.remarks || undefined,
        tags: formData.tags || undefined,
      });
    }
  };

  const handleStatusChange = (reservationId: number, newStatus: string) => {
    updateReservation.mutate({
      id: reservationId,
      status: newStatus as "pending" | "confirmed" | "arrived" | "completed" | "cancelled",
    });
  };

  const handleCancel = (reservationId: number) => {
    deleteReservation.mutate({ id: reservationId });
  };

  // 搜索预约
  const filteredReservations = (reservations || []).filter(
    (r) =>
      r.guestName.includes(searchQuery) ||
      r.guestPhone.includes(searchQuery)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">待确认</Badge>;
      case "confirmed":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-300">已确认</Badge>;
      case "arrived":
        return <Badge className="bg-green-100 text-green-700 border-green-300">已到店</Badge>;
      case "completed":
        return <Badge className="bg-gray-100 text-gray-700 border-gray-300">已完成</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-700 border-red-300">已取消</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getSourceBadge = (source: string) => {
    const sourceMap: Record<string, string> = {
      phone: "电话",
      wechat: "微信",
      "walk-in": "现场",
      platform: "平台",
      other: "其他",
    };
    return sourceMap[source] || source;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* 头部 */}
      <header className="bg-gradient-to-r from-primary to-primary/80 shadow-elegant border-b sticky top-0 z-20">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-md">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">预约管理系统</h1>
                <p className="text-blue-100 text-sm mt-1">多人协作 • 实时同步 • 容量管理</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = "/")}
                className="gap-2 bg-white hover:bg-blue-50"
              >
                切换到桌台计时
              </Button>
              <Button
                onClick={handleAddClick}
                className="gap-2 bg-white text-primary hover:bg-blue-50"
              >
                <Plus className="w-4 h-4" />
                新增预约
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* 统计面板 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="shadow-elegant">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{stats?.totalReservations || 0}</div>
                <p className="text-sm text-muted-foreground mt-1">今日预约</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 flex items-center justify-center gap-1">
                  <Users className="w-6 h-6" />
                  {stats?.totalPeople || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-1">总人数</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{stats?.arrivedCount || 0}</div>
                <p className="text-sm text-muted-foreground mt-1">已到店</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">{stats?.pendingCount || 0}</div>
                <p className="text-sm text-muted-foreground mt-1">待确认</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-elegant">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">{stats?.cancelledCount || 0}</div>
                <p className="text-sm text-muted-foreground mt-1">已取消</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 日期和搜索 */}
        <Card className="shadow-elegant mb-6">
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <Label className="text-sm font-medium mb-2 block">选择日期</Label>
                <Input
                  type="date"
                  value={currentDate}
                  onChange={(e) => setCurrentDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex-1">
                <Label className="text-sm font-medium mb-2 block">搜索预约</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="输入姓名或电话..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 预约列表 */}
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>预约列表</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredReservations.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">暂无预约信息</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReservations.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-lg">{reservation.guestName}</span>
                        {getStatusBadge(reservation.status)}
                        <Badge variant="outline" className="text-xs">
                          {getSourceBadge(reservation.source)}
                        </Badge>
                        {reservation.isHighRisk === 1 && (
                          <Badge className="bg-red-100 text-red-700 border-red-300 gap-1">
                            <AlertCircle className="w-3 h-3" />
                            高风险
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>📞 {reservation.guestPhone}</span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {reservation.partySize} 人
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {reservation.reservationTime}
                        </span>
                      </div>
                      {reservation.remarks && (
                        <p className="text-sm text-muted-foreground mt-2">📝 {reservation.remarks}</p>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      {reservation.status === "pending" && (
                        <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(reservation.id, "confirmed")}
                    >
                      确认
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(reservation.id, "arrived")}
                    >
                      到店
                    </Button>
                        </>
                      )}
                      {reservation.status === "confirmed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(reservation.id, "arrived")}
                        >
                          到店
                        </Button>
                      )}
                      {reservation.status === "arrived" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(reservation.id, "completed")}
                        >
                          完成
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditClick(reservation)}
                      >
                        编辑
                      </Button>

                      {reservation.status !== "cancelled" && reservation.status !== "completed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleCancel(reservation.id)}
                        >
                          取消
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* 新增预约对话框 */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增预约</DialogTitle>
            <DialogDescription>填写预约信息以创建新的预约</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitAdd}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-date">预约日期 *</Label>
                  <Input
                    id="add-date"
                    type="date"
                    value={formData.reservationDate}
                    onChange={(e) =>
                      setFormData({ ...formData, reservationDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-time">预约时间 *</Label>
                  <Input
                    id="add-time"
                    type="time"
                    value={formData.reservationTime}
                    onChange={(e) =>
                      setFormData({ ...formData, reservationTime: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-name">客人姓名 *</Label>
                  <Input
                    id="add-name"
                    value={formData.guestName}
                    onChange={(e) =>
                      setFormData({ ...formData, guestName: e.target.value })
                    }
                    placeholder="例如: 张三"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-phone">客人电话 *</Label>
                  <Input
                    id="add-phone"
                    value={formData.guestPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, guestPhone: e.target.value })
                    }
                    placeholder="例如: 13800138000"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-party">预约人数 *</Label>
                  <div className="flex gap-2">
                    {[2, 3, 4, 6, 8].map((size) => (
                      <Button
                        key={size}
                        type="button"
                        variant={formData.partySize === size ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFormData({ ...formData, partySize: size })}
                      >
                        {size}
                      </Button>
                    ))}
                  </div>
                  <Input
                    id="add-party"
                    type="number"
                    min="1"
                    value={formData.partySize}
                    onChange={(e) =>
                      setFormData({ ...formData, partySize: parseInt(e.target.value) })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add-source">预约来源 *</Label>
                  <Select
                    value={formData.source}
                    onValueChange={(value) =>
                      setFormData({ ...formData, source: value as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">电话</SelectItem>
                      <SelectItem value="wechat">微信</SelectItem>
                      <SelectItem value="walk-in">现场</SelectItem>
                      <SelectItem value="platform">平台</SelectItem>
                      <SelectItem value="other">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-remarks">备注</Label>
                <Input
                  id="add-remarks"
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                  placeholder="例如: 生日、忌口、儿童椅等"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-tags">标签</Label>
                <Input
                  id="add-tags"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  placeholder="例如: 生日,忌口,儿童椅（逗号分隔）"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                创建预约
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 编辑预约对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑预约</DialogTitle>
            <DialogDescription>修改预约信息</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-date">预约日期 *</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={formData.reservationDate}
                    onChange={(e) =>
                      setFormData({ ...formData, reservationDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-time">预约时间 *</Label>
                  <Input
                    id="edit-time"
                    type="time"
                    value={formData.reservationTime}
                    onChange={(e) =>
                      setFormData({ ...formData, reservationTime: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">客人姓名 *</Label>
                  <Input
                    id="edit-name"
                    value={formData.guestName}
                    onChange={(e) =>
                      setFormData({ ...formData, guestName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">客人电话 *</Label>
                  <Input
                    id="edit-phone"
                    value={formData.guestPhone}
                    onChange={(e) =>
                      setFormData({ ...formData, guestPhone: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-party">预约人数 *</Label>
                  <Input
                    id="edit-party"
                    type="number"
                    min="1"
                    value={formData.partySize}
                    onChange={(e) =>
                      setFormData({ ...formData, partySize: parseInt(e.target.value) })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-source">预约来源 *</Label>
                  <Select
                    value={formData.source}
                    onValueChange={(value) =>
                      setFormData({ ...formData, source: value as any })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">电话</SelectItem>
                      <SelectItem value="wechat">微信</SelectItem>
                      <SelectItem value="walk-in">现场</SelectItem>
                      <SelectItem value="platform">平台</SelectItem>
                      <SelectItem value="other">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-remarks">备注</Label>
                <Input
                  id="edit-remarks"
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-tags">标签</Label>
                <Input
                  id="edit-tags"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                保存修改
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
