import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Calendar, Users, UserCheck, Clock, Plus, ArrowLeft, Package, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { StatsCard } from "@/components/stats-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Event } from "@shared/schema";

interface TierQuotaInfo {
  tierId: string;
  tierName: string;
  quota: number;
  used: number;
  remaining: number;
}

interface QuotaInfo {
  hasQuota: boolean;
  totalQuota: number;
  usedQuota: number;
  remainingQuota: number;
  tierQuotas?: TierQuotaInfo[];
}

export function EventManagerDashboard() {
  const { data: stats } = useQuery<{
    totalEvents: number;
    activeEvents: number;
    totalGuests: number;
    checkedInToday: number;
  }>({
    queryKey: ["/api/stats/event-manager"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: quotaInfo } = useQuery<QuotaInfo>({
    queryKey: ["/api/quota/info"],
  });

  const quotaPercentage = quotaInfo?.hasQuota 
    ? Math.round((quotaInfo.usedQuota / quotaInfo.totalQuota) * 100) 
    : 0;
  const isLowQuota = quotaInfo?.hasQuota && quotaInfo.remainingQuota <= 2;
  const isExhausted = quotaInfo?.hasQuota && quotaInfo.remainingQuota === 0;

  const upcomingEvents = events.filter(e => new Date(e.date) >= new Date()).slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">غرفة القيادة</h1>
          <p className="text-muted-foreground">إدارة مناسباتك وفريق العمل</p>
        </div>
        <Link href="/events/new">
          <Button 
            className="gradient-primary glow-primary" 
            data-testid="button-new-event"
            disabled={isExhausted}
          >
            <Plus className="w-5 h-5 ml-2" />
            مناسبة جديدة
          </Button>
        </Link>
      </div>

      {/* Quota Info Card with Tier Details */}
      {quotaInfo?.hasQuota && (
        <Card className={`glass-card border-white/10 ${isExhausted ? "border-red-500/50" : isLowQuota ? "border-yellow-500/50" : ""}`} data-testid="card-quota-info">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${isExhausted ? "bg-red-500/20" : isLowQuota ? "bg-yellow-500/20" : "gradient-primary"}`}>
                {isExhausted ? (
                  <AlertCircle className="w-6 h-6 text-red-400" />
                ) : (
                  <Package className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium" data-testid="text-quota-title">رصيد المناسبات</span>
                  <span className={`font-bold ${isExhausted ? "text-red-400" : isLowQuota ? "text-yellow-400" : "text-primary"}`} data-testid="text-quota-remaining">
                    {quotaInfo.remainingQuota} متبقي من {quotaInfo.totalQuota}
                  </span>
                </div>
                <Progress 
                  value={quotaPercentage} 
                  className={`h-2 ${isExhausted ? "[&>div]:bg-red-500" : isLowQuota ? "[&>div]:bg-yellow-500" : ""}`}
                  data-testid="progress-quota"
                />
                <p className="text-sm text-muted-foreground mt-2" data-testid="text-quota-used">
                  {isExhausted 
                    ? "لقد استنفذت حصتك. تواصل مع مالك النظام لزيادة الحصة."
                    : isLowQuota 
                      ? "حصتك على وشك النفاد. تواصل مع مالك النظام لزيادتها."
                      : `المستخدم: ${quotaInfo.usedQuota} مناسبة`}
                </p>
              </div>
            </div>

            {/* Tier-specific quotas */}
            {quotaInfo.tierQuotas && quotaInfo.tierQuotas.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-3 border-t border-white/10">
                {quotaInfo.tierQuotas.filter(t => t.quota > 0).map((tier) => {
                  const tierPercent = tier.quota > 0 ? Math.round((tier.used / tier.quota) * 100) : 0;
                  const tierExhausted = tier.remaining === 0;
                  const tierLow = tier.remaining > 0 && tier.remaining <= 1;
                  
                  return (
                    <div 
                      key={tier.tierId}
                      className={`glass rounded-lg p-3 ${tierExhausted ? "border border-red-500/30" : tierLow ? "border border-yellow-500/30" : ""}`}
                      data-testid={`tier-quota-${tier.tierId}`}
                    >
                      <p className="text-xs text-muted-foreground mb-1 truncate">{tier.tierName}</p>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-lg font-bold ${tierExhausted ? "text-red-400" : tierLow ? "text-yellow-400" : "text-white"}`}>
                          {tier.remaining}
                        </span>
                        <span className="text-xs text-muted-foreground">/{tier.quota}</span>
                      </div>
                      <Progress 
                        value={tierPercent} 
                        className={`h-1 mt-2 ${tierExhausted ? "[&>div]:bg-red-500" : tierLow ? "[&>div]:bg-yellow-500" : ""}`}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="المناسبات"
          value={stats?.totalEvents ?? 0}
          icon={Calendar}
          description="إجمالي مناسباتك"
          delay={0}
        />
        <StatsCard
          title="المناسبات النشطة"
          value={stats?.activeEvents ?? 0}
          icon={Clock}
          description="تجري الآن"
          delay={0.1}
        />
        <StatsCard
          title="الضيوف"
          value={stats?.totalGuests ?? 0}
          icon={Users}
          description="إجمالي المدعوين"
          delay={0.2}
        />
        <StatsCard
          title="تسجيل اليوم"
          value={stats?.checkedInToday ?? 0}
          icon={UserCheck}
          description="حضروا اليوم"
          delay={0.3}
        />
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">المناسبات القادمة</h2>
          <Link href="/events">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
              عرض الكل
              <ArrowLeft className="w-4 h-4 mr-2" />
            </Button>
          </Link>
        </div>

        {upcomingEvents.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">لا توجد مناسبات قادمة</p>
            <Link href="/events/new">
              <Button variant="outline" className="mt-4">
                <Plus className="w-4 h-4 ml-2" />
                أنشئ مناسبة جديدة
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/events/${event.id}`}>
                  <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{event.name}</h3>
                        <p className="text-muted-foreground text-sm">
                          {new Date(event.date).toLocaleDateString("ar-SA")}
                          {event.location && ` • ${event.location}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-primary/20 text-primary border-none">
                      {event.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
