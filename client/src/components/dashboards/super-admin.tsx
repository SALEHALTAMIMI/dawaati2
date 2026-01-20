import { useQuery } from "@tanstack/react-query";
import { Users, UserCog, Calendar, Activity } from "lucide-react";
import { StatsCard } from "@/components/stats-card";

export function SuperAdminDashboard() {
  const { data: stats } = useQuery<{
    totalAdmins: number;
    totalEventManagers: number;
    totalEvents: number;
    activeEvents: number;
  }>({
    queryKey: ["/api/stats/super-admin"],
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">مرحباً بك في لوحة التحكم</h1>
        <p className="text-muted-foreground">إدارة النظام والمستخدمين</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="مديرو النظام"
          value={stats?.totalAdmins ?? 0}
          icon={UserCog}
          description="إجمالي المديرين"
          delay={0}
        />
        <StatsCard
          title="مديرو المناسبات"
          value={stats?.totalEventManagers ?? 0}
          icon={Users}
          description="إجمالي مديري المناسبات"
          delay={0.1}
        />
        <StatsCard
          title="المناسبات"
          value={stats?.totalEvents ?? 0}
          icon={Calendar}
          description="إجمالي المناسبات"
          delay={0.2}
        />
        <StatsCard
          title="المناسبات النشطة"
          value={stats?.activeEvents ?? 0}
          icon={Activity}
          description="المناسبات الجارية الآن"
          delay={0.3}
        />
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">آخر النشاطات</h2>
        <p className="text-muted-foreground">لا توجد نشاطات حديثة</p>
      </div>
    </div>
  );
}
