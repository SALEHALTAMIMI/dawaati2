import { useQuery } from "@tanstack/react-query";
import { Users, Calendar, Activity, TrendingUp } from "lucide-react";
import { StatsCard } from "@/components/stats-card";

export function AdminDashboard() {
  const { data: stats } = useQuery<{
    totalEventManagers: number;
    totalEvents: number;
    activeEvents: number;
    totalGuests: number;
  }>({
    queryKey: ["/api/stats/admin"],
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">لوحة تحكم المدير</h1>
        <p className="text-muted-foreground">إدارة مديري المناسبات والعملاء</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="مديرو المناسبات"
          value={stats?.totalEventManagers ?? 0}
          icon={Users}
          description="إجمالي العملاء"
          delay={0}
        />
        <StatsCard
          title="المناسبات"
          value={stats?.totalEvents ?? 0}
          icon={Calendar}
          description="إجمالي المناسبات"
          delay={0.1}
        />
        <StatsCard
          title="المناسبات النشطة"
          value={stats?.activeEvents ?? 0}
          icon={Activity}
          description="تجري الآن"
          delay={0.2}
        />
        <StatsCard
          title="إجمالي الضيوف"
          value={stats?.totalGuests ?? 0}
          icon={TrendingUp}
          description="عبر جميع المناسبات"
          delay={0.3}
        />
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">العملاء النشطون</h2>
        <p className="text-muted-foreground">لا توجد بيانات</p>
      </div>
    </div>
  );
}
