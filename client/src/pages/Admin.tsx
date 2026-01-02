import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings, Plus, Edit, Trash2, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Table } from "../../../drizzle/schema";

type TableFormData = {
  tableNumber: string;
  maxCapacity: number;
  defaultDuration: number;
  bufferDuration: number;
};

export default function Admin() {
  const [, setLocation] = useLocation();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [formData, setFormData] = useState<TableFormData>({
    tableNumber: "",
    maxCapacity: 4,
    defaultDuration: 90,
    bufferDuration: 15,
  });

  // 查询所有桌台
  const { data: tables, refetch } = trpc.table.list.useQuery();

  // Mutations
  const createTable = trpc.table.create.useMutation({
    onSuccess: () => {
      toast.success("桌台创建成功");
      setAddDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateTable = trpc.table.update.useMutation({
    onSuccess: () => {
      toast.success("桌台更新成功");
      setEditDialogOpen(false);
      setSelectedTable(null);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteTable = trpc.table.delete.useMutation({
    onSuccess: () => {
      toast.success("桌台删除成功");
      setDeleteDialogOpen(false);
      setSelectedTable(null);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      tableNumber: "",
      maxCapacity: 4,
      defaultDuration: 90,
      bufferDuration: 15,
    });
  };

  const handleAdd = () => {
    resetForm();
    setAddDialogOpen(true);
  };

  const handleEdit = (table: Table) => {
    setSelectedTable(table);
    setFormData({
      tableNumber: table.tableNumber,
      maxCapacity: table.maxCapacity,
      defaultDuration: table.defaultDuration,
      bufferDuration: table.bufferDuration,
    });
    setEditDialogOpen(true);
  };

  const handleDelete = (table: Table) => {
    setSelectedTable(table);
    setDeleteDialogOpen(true);
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    createTable.mutate(formData);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTable) {
      updateTable.mutate({
        id: selectedTable.id,
        ...formData,
      });
    }
  };

  const handleConfirmDelete = () => {
    if (selectedTable) {
      deleteTable.mutate({ id: selectedTable.id });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 头部 */}
      <header className="bg-card shadow-elegant border-b sticky top-0 z-10">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">桌台管理后台</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setLocation("/")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回主页
              </Button>
              <Button onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" />
                添加桌台
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle>桌台列表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">桌号</th>
                    <th className="text-left py-3 px-4 font-semibold">最大人数</th>
                    <th className="text-left py-3 px-4 font-semibold">默认用餐时长</th>
                    <th className="text-left py-3 px-4 font-semibold">缓冲期时长</th>
                    <th className="text-left py-3 px-4 font-semibold">状态</th>
                    <th className="text-right py-3 px-4 font-semibold">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {tables?.map((table) => (
                    <tr key={table.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{table.tableNumber}</td>
                      <td className="py-3 px-4">{table.maxCapacity} 人</td>
                      <td className="py-3 px-4">{table.defaultDuration} 分钟</td>
                      <td className="py-3 px-4">{table.bufferDuration} 分钟</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-1 rounded text-sm ${
                            table.status === "idle"
                              ? "bg-green-100 text-green-700"
                              : table.status === "dining"
                              ? "bg-blue-100 text-blue-700"
                              : table.status === "warning"
                              ? "bg-yellow-100 text-yellow-700"
                              : table.status === "timeout"
                              ? "bg-red-100 text-red-700"
                              : table.status === "buffer"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {table.status === "idle"
                            ? "空闲"
                            : table.status === "dining"
                            ? "用餐中"
                            : table.status === "warning"
                            ? "即将超时"
                            : table.status === "timeout"
                            ? "已超时"
                            : table.status === "buffer"
                            ? "缓冲期"
                            : "停用"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(table)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(table)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* 添加桌台对话框 */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加桌台</DialogTitle>
            <DialogDescription>填写桌台信息以创建新的桌台</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitAdd}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-tableNumber">桌号 *</Label>
                <Input
                  id="add-tableNumber"
                  value={formData.tableNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, tableNumber: e.target.value })
                  }
                  placeholder="例如: A1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-maxCapacity">最大人数 *</Label>
                <Input
                  id="add-maxCapacity"
                  type="number"
                  min="1"
                  value={formData.maxCapacity}
                  onChange={(e) =>
                    setFormData({ ...formData, maxCapacity: parseInt(e.target.value) })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-defaultDuration">默认用餐时长（分钟）*</Label>
                <Input
                  id="add-defaultDuration"
                  type="number"
                  min="1"
                  value={formData.defaultDuration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      defaultDuration: parseInt(e.target.value),
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-bufferDuration">缓冲期时长（分钟）*</Label>
                <Input
                  id="add-bufferDuration"
                  type="number"
                  min="0"
                  value={formData.bufferDuration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bufferDuration: parseInt(e.target.value),
                    })
                  }
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={createTable.isPending}>
                {createTable.isPending ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 编辑桌台对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑桌台</DialogTitle>
            <DialogDescription>修改桌台信息</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEdit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-tableNumber">桌号 *</Label>
                <Input
                  id="edit-tableNumber"
                  value={formData.tableNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, tableNumber: e.target.value })
                  }
                  placeholder="例如: A1"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-maxCapacity">最大人数 *</Label>
                <Input
                  id="edit-maxCapacity"
                  type="number"
                  min="1"
                  value={formData.maxCapacity}
                  onChange={(e) =>
                    setFormData({ ...formData, maxCapacity: parseInt(e.target.value) })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-defaultDuration">默认用餐时长（分钟）*</Label>
                <Input
                  id="edit-defaultDuration"
                  type="number"
                  min="1"
                  value={formData.defaultDuration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      defaultDuration: parseInt(e.target.value),
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-bufferDuration">缓冲期时长（分钟）*</Label>
                <Input
                  id="edit-bufferDuration"
                  type="number"
                  min="0"
                  value={formData.bufferDuration}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bufferDuration: parseInt(e.target.value),
                    })
                  }
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                取消
              </Button>
              <Button type="submit" disabled={updateTable.isPending}>
                {updateTable.isPending ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除桌号 <strong>{selectedTable?.tableNumber}</strong> 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
