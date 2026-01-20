import { motion } from "framer-motion";
import { Package, Plus, Edit2, Trash2, Loader2, Check, X, Infinity } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface CapacityTier {
  id: string;
  name: string;
  minGuests: number;
  maxGuests: number | null;
  isUnlimited: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export default function CapacityTiersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<CapacityTier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    minGuests: 0,
    maxGuests: 50,
    isUnlimited: false,
    isActive: true,
    sortOrder: 0,
  });

  const { data: tiers = [], isLoading } = useQuery<CapacityTier[]>({
    queryKey: ["/api/capacity-tiers/all"],
    enabled: user?.role === "super_admin",
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        maxGuests: data.isUnlimited ? null : data.maxGuests,
      };
      const res = await apiRequest("POST", "/api/capacity-tiers", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capacity-tiers/all"] });
      setDialogOpen(false);
      resetForm();
      toast({
        title: "تم الإنشاء",
        description: "تم إنشاء باقة السعة بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في إنشاء الباقة",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const payload = {
        ...data,
        maxGuests: data.isUnlimited ? null : data.maxGuests,
      };
      const res = await apiRequest("PATCH", `/api/capacity-tiers/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capacity-tiers/all"] });
      setDialogOpen(false);
      setEditingTier(null);
      resetForm();
      toast({
        title: "تم التحديث",
        description: "تم تحديث باقة السعة بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في تحديث الباقة",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/capacity-tiers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/capacity-tiers/all"] });
      setDeleteId(null);
      toast({
        title: "تم الحذف",
        description: "تم حذف باقة السعة",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في حذف الباقة",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      minGuests: 0,
      maxGuests: 50,
      isUnlimited: false,
      isActive: true,
      sortOrder: 0,
    });
  };

  const openEditDialog = (tier: CapacityTier) => {
    setEditingTier(tier);
    setFormData({
      name: tier.name,
      minGuests: tier.minGuests,
      maxGuests: tier.maxGuests || 50,
      isUnlimited: tier.isUnlimited,
      isActive: tier.isActive,
      sortOrder: tier.sortOrder,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingTier) {
      updateMutation.mutate({ id: editingTier.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  if (user?.role !== "super_admin") {
    return (
      <div className="flex items-center justify-center h-full" data-testid="tiers-unauthorized">
        <Card className="glass-card border-white/10 text-center p-8">
          <CardContent>
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2" data-testid="text-unauthorized-title">غير مصرح</h2>
            <p className="text-muted-foreground" data-testid="text-unauthorized-message">هذه الصفحة متاحة لمالك النظام فقط</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl gradient-primary glow-primary">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white" data-testid="text-tiers-title">باقات سعة المناسبات</h1>
              <p className="text-muted-foreground" data-testid="text-tiers-subtitle">إدارة أنواع وحدود سعة المناسبات</p>
            </div>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingTier(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-white glow-primary" data-testid="button-add-tier">
                <Plus className="w-5 h-5 ml-2" />
                إضافة باقة
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white" data-testid="text-dialog-title">
                  {editingTier ? "تعديل باقة السعة" : "إضافة باقة سعة جديدة"}
                </DialogTitle>
                <DialogDescription data-testid="text-dialog-description">
                  حدد اسم الباقة والحد الأقصى للضيوف
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label className="text-white/90" data-testid="label-tier-name">اسم الباقة</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: باقة صغيرة (0-50)"
                    className="glass-input text-white placeholder:text-muted-foreground border-white/10"
                    data-testid="input-tier-name"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1 space-y-2">
                    <Label className="text-white/90" data-testid="label-min-guests">الحد الأدنى</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.minGuests}
                      onChange={(e) => setFormData({ ...formData, minGuests: parseInt(e.target.value) || 0 })}
                      className="glass-input text-white border-white/10"
                      disabled={formData.isUnlimited}
                      data-testid="input-min-guests"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label className="text-white/90" data-testid="label-max-guests">الحد الأقصى</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.maxGuests}
                      onChange={(e) => setFormData({ ...formData, maxGuests: parseInt(e.target.value) || 50 })}
                      className="glass-input text-white border-white/10"
                      disabled={formData.isUnlimited}
                      data-testid="input-max-guests"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <div className="flex items-center gap-2">
                    <Infinity className="w-5 h-5 text-primary" />
                    <Label className="text-white/90" data-testid="label-unlimited">غير محدود</Label>
                  </div>
                  <Switch
                    checked={formData.isUnlimited}
                    onCheckedChange={(checked) => setFormData({ ...formData, isUnlimited: checked })}
                    data-testid="switch-unlimited"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
                  <Label className="text-white/90" data-testid="label-active">مفعّل</Label>
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    data-testid="switch-active"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white/90" data-testid="label-sort-order">ترتيب العرض</Label>
                  <Input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                    className="glass-input text-white border-white/10"
                    data-testid="input-sort-order"
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending || !formData.name}
                  className="w-full gradient-primary text-white glow-primary"
                  data-testid="button-submit-tier"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <Loader2 className="w-5 h-5 animate-spin ml-2" />
                  ) : (
                    <Check className="w-5 h-5 ml-2" />
                  )}
                  {editingTier ? "تحديث" : "إضافة"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12" data-testid="tiers-loading">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : tiers.length === 0 ? (
          <Card className="glass-card border-white/10 text-center py-12" data-testid="tiers-empty">
            <CardContent>
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">لا توجد باقات</h3>
              <p className="text-muted-foreground">أضف باقات سعة لتحديد حدود الضيوف في المناسبات</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="tiers-grid">
            {tiers.map((tier) => (
              <Card
                key={tier.id}
                className={`glass-card border-white/10 ${!tier.isActive ? "opacity-50" : ""}`}
                data-testid={`tier-card-${tier.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white text-lg" data-testid={`tier-name-${tier.id}`}>
                      {tier.name}
                    </CardTitle>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(tier)}
                        className="text-white/70 hover:text-white"
                        data-testid={`button-edit-tier-${tier.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setDeleteId(tier.id)}
                        className="text-red-400 hover:text-red-300"
                        data-testid={`button-delete-tier-${tier.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">السعة:</span>
                      <span className="text-white font-bold" data-testid={`tier-capacity-${tier.id}`}>
                        {tier.isUnlimited ? (
                          <span className="flex items-center gap-1">
                            <Infinity className="w-4 h-4" />
                            غير محدود
                          </span>
                        ) : (
                          `${tier.minGuests} - ${tier.maxGuests} ضيف`
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">الحالة:</span>
                      <span className={tier.isActive ? "text-green-400" : "text-red-400"} data-testid={`tier-status-${tier.id}`}>
                        {tier.isActive ? (
                          <span className="flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            مفعّل
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <X className="w-4 h-4" />
                            معطّل
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="glass-card border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white" data-testid="text-delete-title">تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription data-testid="text-delete-description">
              هل أنت متأكد من حذف هذه الباقة؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-white/10 text-white border-white/20" data-testid="button-cancel-delete">
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-red-500 hover:bg-red-600 text-white"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
