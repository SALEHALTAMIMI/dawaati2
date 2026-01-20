import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CreditCard, 
  Users, 
  Calendar, 
  Package, 
  ChevronDown, 
  ChevronUp,
  Edit3,
  Check,
  X,
  UserCheck,
  TrendingUp,
  Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TierQuota {
  tierId: string;
  tierName: string;
  quota: number;
  eventCount: number;
  guestCount: number;
  remaining: number;
}

interface Subscription {
  id: string;
  name: string;
  username: string;
  isActive: boolean;
  totalQuota: number;
  eventsUsed: number;
  eventsRemaining: number;
  totalGuests: number;
  tierQuotas: TierQuota[];
  createdAt: string;
}

export default function SubscriptionsPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuotas, setEditQuotas] = useState<Record<string, number>>({});
  const { toast } = useToast();

  const { data: subscriptions = [], isLoading } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const updateTierQuotasMutation = useMutation({
    mutationFn: async ({ id, tierQuotas }: { id: string; tierQuotas: { tierId: string; quota: number }[] }) => {
      const res = await apiRequest("PATCH", `/api/subscriptions/${id}/tier-quotas`, { tierQuotas });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "تم التحديث",
        description: "تم تحديث حصص الباقات بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setEditingId(null);
      setEditQuotas({});
    },
    onError: () => {
      toast({
        title: "فشل التحديث",
        description: "حدث خطأ أثناء تحديث الحصص",
        variant: "destructive",
      });
    },
  });

  const handleStartEdit = (sub: Subscription) => {
    setEditingId(sub.id);
    const quotas: Record<string, number> = {};
    sub.tierQuotas.forEach(tq => {
      quotas[tq.tierId] = tq.quota;
    });
    setEditQuotas(quotas);
  };

  const handleSaveQuotas = (id: string) => {
    const tierQuotas = Object.entries(editQuotas).map(([tierId, quota]) => ({
      tierId,
      quota,
    }));
    updateTierQuotasMutation.mutate({ id, tierQuotas });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditQuotas({});
  };

  const toggleExpand = (id: string) => {
    if (editingId !== id) {
      setExpandedId(expandedId === id ? null : id);
    }
  };

  const totalManagers = subscriptions.length;
  const activeManagers = subscriptions.filter(s => s.isActive).length;
  const totalEvents = subscriptions.reduce((sum, s) => sum + s.eventsUsed, 0);
  const totalGuests = subscriptions.reduce((sum, s) => sum + s.totalGuests, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">إدارة الاشتراكات</h1>
        <p className="text-muted-foreground">تتبع حصص مديري المناسبات واستخدامهم لكل باقة</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl gradient-primary">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">مديرو المناسبات</p>
                <p className="text-2xl font-bold text-white" data-testid="text-total-managers">{totalManagers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/20">
                <UserCheck className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">نشطين</p>
                <p className="text-2xl font-bold text-white" data-testid="text-active-managers">{activeManagers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Calendar className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">إجمالي المناسبات</p>
                <p className="text-2xl font-bold text-white" data-testid="text-total-events">{totalEvents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">إجمالي الضيوف</p>
                <p className="text-2xl font-bold text-white" data-testid="text-total-guests">{totalGuests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {subscriptions.length === 0 ? (
          <Card className="glass-card border-white/10">
            <CardContent className="p-12 text-center">
              <CreditCard className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">لا يوجد مديرو مناسبات</h3>
              <p className="text-muted-foreground">قم بإضافة مديري مناسبات من صفحة "مديرو المناسبات"</p>
            </CardContent>
          </Card>
        ) : (
          subscriptions.map((sub, index) => {
            const usagePercentage = sub.totalQuota > 0 
              ? Math.round((sub.eventsUsed / sub.totalQuota) * 100) 
              : 0;
            const isExhausted = sub.eventsRemaining === 0 && sub.totalQuota > 0;
            const isLow = sub.eventsRemaining <= 2 && sub.eventsRemaining > 0;
            const isExpanded = expandedId === sub.id || editingId === sub.id;
            const isEditing = editingId === sub.id;

            return (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className={`glass-card border-white/10 overflow-hidden ${
                    isExhausted ? "border-red-500/30" : isLow ? "border-yellow-500/30" : ""
                  }`}
                  data-testid={`card-subscription-${sub.id}`}
                >
                  <CardContent className="p-0">
                    <div 
                      className="p-6 cursor-pointer hover:bg-white/5 transition-colors"
                      onClick={() => toggleExpand(sub.id)}
                    >
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                            sub.isActive ? "gradient-primary" : "bg-gray-500/20"
                          }`}>
                            <span className="text-white font-bold text-lg">{sub.name.charAt(0)}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-white font-bold text-lg" data-testid={`text-manager-name-${sub.id}`}>
                                {sub.name}
                              </h3>
                              {!sub.isActive && (
                                <Badge variant="secondary" className="bg-gray-500/20 text-gray-400">
                                  معلق
                                </Badge>
                              )}
                            </div>
                            <p className="text-muted-foreground text-sm">@{sub.username}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 flex-wrap">
                          <div className="text-center">
                            <p className="text-muted-foreground text-xs mb-1">المناسبات</p>
                            <div className="flex items-center gap-1">
                              <span className="text-white font-bold" data-testid={`text-events-used-${sub.id}`}>
                                {sub.eventsUsed}
                              </span>
                              <span className="text-muted-foreground">/</span>
                              <span className={`font-bold ${
                                isExhausted ? "text-red-400" : isLow ? "text-yellow-400" : "text-primary"
                              }`} data-testid={`text-quota-${sub.id}`}>
                                {sub.totalQuota}
                              </span>
                            </div>
                          </div>

                          <div className="text-center">
                            <p className="text-muted-foreground text-xs mb-1">الضيوف</p>
                            <p className="text-white font-bold" data-testid={`text-guests-${sub.id}`}>
                              {sub.totalGuests}
                            </p>
                          </div>

                          <div className="w-32">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">الاستخدام</span>
                              <span className={`font-medium ${
                                isExhausted ? "text-red-400" : isLow ? "text-yellow-400" : "text-primary"
                              }`}>
                                {usagePercentage}%
                              </span>
                            </div>
                            <Progress 
                              value={usagePercentage} 
                              className={`h-2 ${
                                isExhausted ? "[&>div]:bg-red-500" : isLow ? "[&>div]:bg-yellow-500" : ""
                              }`}
                            />
                          </div>

                          {!isEditing && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-primary hover:text-primary/80"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartEdit(sub);
                              }}
                              data-testid={`button-edit-quotas-${sub.id}`}
                            >
                              <Edit3 className="w-5 h-5" />
                            </Button>
                          )}

                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-muted-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(sub.id);
                            }}
                            data-testid={`button-expand-${sub.id}`}
                          >
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 pb-6 border-t border-white/10 pt-4">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-white font-medium flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                {isEditing ? "تعديل حصص الباقات" : "حصص الباقات"}
                              </h4>
                              {isEditing && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-red-400 hover:text-red-300"
                                    onClick={handleCancelEdit}
                                    data-testid={`button-cancel-edit-${sub.id}`}
                                  >
                                    <X className="w-4 h-4 ml-1" />
                                    إلغاء
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="gradient-primary"
                                    onClick={() => handleSaveQuotas(sub.id)}
                                    disabled={updateTierQuotasMutation.isPending}
                                    data-testid={`button-save-quotas-${sub.id}`}
                                  >
                                    <Save className="w-4 h-4 ml-1" />
                                    حفظ
                                  </Button>
                                </div>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {sub.tierQuotas.map((tier) => {
                                const tierUsagePercent = tier.quota > 0 
                                  ? Math.round((tier.eventCount / tier.quota) * 100) 
                                  : 0;
                                const tierExhausted = tier.remaining === 0 && tier.quota > 0;
                                const tierLow = tier.remaining > 0 && tier.remaining <= 1;

                                return (
                                  <div 
                                    key={tier.tierId}
                                    className={`glass rounded-xl p-4 ${
                                      tierExhausted ? "border border-red-500/30" : tierLow ? "border border-yellow-500/30" : ""
                                    }`}
                                    data-testid={`tier-quota-${sub.id}-${tier.tierId}`}
                                  >
                                    <div className="flex items-center justify-between mb-3">
                                      <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${
                                          tierExhausted ? "bg-red-500/20" : tierLow ? "bg-yellow-500/20" : "bg-primary/20"
                                        }`}>
                                          <Package className={`w-4 h-4 ${
                                            tierExhausted ? "text-red-400" : tierLow ? "text-yellow-400" : "text-primary"
                                          }`} />
                                        </div>
                                        <span className="text-white font-medium text-sm">{tier.tierName}</span>
                                      </div>
                                    </div>

                                    {isEditing ? (
                                      <div className="space-y-3">
                                        <div>
                                          <label className="text-muted-foreground text-xs block mb-1">الحصة</label>
                                          <Input
                                            type="number"
                                            value={editQuotas[tier.tierId] || 0}
                                            onChange={(e) => setEditQuotas({
                                              ...editQuotas,
                                              [tier.tierId]: parseInt(e.target.value) || 0
                                            })}
                                            className="h-9"
                                            min={0}
                                            max={100}
                                            data-testid={`input-tier-quota-${sub.id}-${tier.tierId}`}
                                          />
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          المستخدم حالياً: {tier.eventCount}
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="grid grid-cols-3 gap-2 text-sm mb-3">
                                          <div>
                                            <p className="text-muted-foreground text-xs">الحصة</p>
                                            <p className="text-white font-bold">{tier.quota}</p>
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground text-xs">المستخدم</p>
                                            <p className="text-white font-bold">{tier.eventCount}</p>
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground text-xs">المتبقي</p>
                                            <p className={`font-bold ${
                                              tierExhausted ? "text-red-400" : tierLow ? "text-yellow-400" : "text-green-400"
                                            }`}>{tier.remaining}</p>
                                          </div>
                                        </div>
                                        <Progress 
                                          value={tierUsagePercent} 
                                          className={`h-1.5 ${
                                            tierExhausted ? "[&>div]:bg-red-500" : tierLow ? "[&>div]:bg-yellow-500" : ""
                                          }`}
                                        />
                                        <p className="text-xs text-muted-foreground mt-2">
                                          {tier.guestCount} ضيف
                                        </p>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
