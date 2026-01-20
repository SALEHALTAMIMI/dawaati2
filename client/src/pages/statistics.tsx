import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart3,
  Users,
  Calendar,
  UserCheck,
  Building,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Eye,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";

interface OverviewStats {
  totalAdmins: number;
  activeAdmins: number;
  totalEventManagers: number;
  activeEventManagers: number;
  totalOrganizers: number;
  activeOrganizers: number;
  totalEvents: number;
  activeEvents: number;
  totalGuests: number;
  totalCheckedIn: number;
  todayCheckIns: number;
  checkInRate: number;
}

interface AdminStat {
  id: string;
  name: string;
  username: string;
  isActive: boolean;
  createdAt: string;
  eventManagersCount: number;
  organizersCount: number;
}

interface EventManagerStat {
  id: string;
  name: string;
  username: string;
  isActive: boolean;
  createdAt: string;
  eventsCount: number;
  activeEventsCount: number;
  totalGuests: number;
  checkedInGuests: number;
  organizersCount: number;
  events: {
    id: string;
    name: string;
    date: string;
    location: string;
    isActive: boolean;
    totalGuests: number;
    checkedIn: number;
    organizersCount: number;
  }[];
}

interface EventStat {
  id: string;
  name: string;
  date: string;
  location: string;
  isActive: boolean;
  createdAt: string;
  managerName: string;
  managerId: string;
  totalGuests: number;
  checkedIn: number;
  pending: number;
  checkInRate: number;
  organizersCount: number;
  categoryBreakdown: {
    vip: number;
    regular: number;
    media: number;
    sponsor: number;
  };
}

interface OrganizerStat {
  id: string;
  name: string;
  username: string;
  isActive: boolean;
  createdAt: string;
  assignedEventsCount: number;
  events: { id: string; name: string; date: string }[];
}

interface ComprehensiveStats {
  overview: OverviewStats;
  admins: AdminStat[];
  eventManagers: EventManagerStat[];
  events: EventStat[];
  organizers: OrganizerStat[];
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "purple",
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: any;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    purple: "from-purple-500 to-violet-600",
    blue: "from-blue-500 to-cyan-600",
    green: "from-green-500 to-emerald-600",
    orange: "from-orange-500 to-amber-600",
  };

  return (
    <Card className="glass border-white/10 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-muted-foreground text-sm mb-1">{title}</p>
            <p className="text-3xl font-bold text-white">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div
            className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg`}
          >
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AdminCard({ admin }: { admin: AdminStat }) {
  return (
    <Card className="glass border-white/10">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-semibold text-white">{admin.name}</h4>
            <p className="text-sm text-muted-foreground">@{admin.username}</p>
          </div>
          <Badge
            variant="secondary"
            className={
              admin.isActive
                ? "bg-green-500/20 text-green-400"
                : "bg-gray-500/20 text-gray-400"
            }
          >
            {admin.isActive ? "نشط" : "غير نشط"}
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="glass-card p-3 rounded-xl text-center">
            <p className="text-2xl font-bold text-purple-400">
              {admin.eventManagersCount}
            </p>
            <p className="text-muted-foreground text-xs">مديري مناسبات</p>
          </div>
          <div className="glass-card p-3 rounded-xl text-center">
            <p className="text-2xl font-bold text-blue-400">
              {admin.organizersCount}
            </p>
            <p className="text-muted-foreground text-xs">منظمين</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EventManagerCard({ manager }: { manager: EventManagerStat }) {
  const [isOpen, setIsOpen] = useState(false);
  const checkInRate =
    manager.totalGuests > 0
      ? Math.round((manager.checkedInGuests / manager.totalGuests) * 100)
      : 0;

  return (
    <Card className="glass border-white/10">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-semibold text-white">{manager.name}</h4>
              <p className="text-sm text-muted-foreground">@{manager.username}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={
                  manager.isActive
                    ? "bg-green-500/20 text-green-400"
                    : "bg-gray-500/20 text-gray-400"
                }
              >
                {manager.isActive ? "نشط" : "غير نشط"}
              </Badge>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" data-testid={`button-expand-manager-${manager.id}`}>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-sm mb-3">
            <div className="glass-card p-2 rounded-lg text-center">
              <p className="text-xl font-bold text-purple-400">
                {manager.eventsCount}
              </p>
              <p className="text-muted-foreground text-xs">مناسبات</p>
            </div>
            <div className="glass-card p-2 rounded-lg text-center">
              <p className="text-xl font-bold text-blue-400">
                {manager.totalGuests}
              </p>
              <p className="text-muted-foreground text-xs">ضيوف</p>
            </div>
            <div className="glass-card p-2 rounded-lg text-center">
              <p className="text-xl font-bold text-green-400">
                {manager.checkedInGuests}
              </p>
              <p className="text-muted-foreground text-xs">حاضرين</p>
            </div>
            <div className="glass-card p-2 rounded-lg text-center">
              <p className="text-xl font-bold text-orange-400">
                {manager.organizersCount}
              </p>
              <p className="text-muted-foreground text-xs">منظمين</p>
            </div>
          </div>

          <div className="mb-2">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">نسبة الحضور</span>
              <span className="text-white font-semibold">{checkInRate}%</span>
            </div>
            <Progress value={checkInRate} className="h-2" />
          </div>

          <CollapsibleContent>
            <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
              <h5 className="text-sm font-semibold text-white mb-2">
                المناسبات ({manager.events.length})
              </h5>
              {manager.events.length === 0 ? (
                <p className="text-muted-foreground text-sm">لا توجد مناسبات</p>
              ) : (
                manager.events.map((event) => (
                  <div
                    key={event.id}
                    className="glass-card p-3 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <p className="text-white font-medium">{event.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.date).toLocaleDateString("ar-SA")} -{" "}
                        {event.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        {event.checkedIn}/{event.totalGuests} ضيف
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={
                          event.isActive
                            ? "bg-green-500/20 text-green-400"
                            : "bg-gray-500/20 text-gray-400"
                        }
                      >
                        {event.isActive ? "نشط" : "غير نشط"}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}

function EventCard({ event }: { event: EventStat }) {
  const [isOpen, setIsOpen] = useState(false);

  const categoryLabels: Record<string, string> = {
    vip: "VIP",
    regular: "عادي",
    media: "إعلام",
    sponsor: "راعي",
  };

  return (
    <Card className="glass border-white/10">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-semibold text-white">{event.name}</h4>
              <p className="text-sm text-muted-foreground">
                {event.location} -{" "}
                {new Date(event.date).toLocaleDateString("ar-SA")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={
                  event.isActive
                    ? "bg-green-500/20 text-green-400"
                    : "bg-gray-500/20 text-gray-400"
                }
              >
                {event.isActive ? "نشط" : "منتهي"}
              </Badge>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" data-testid={`button-expand-event-${event.id}`}>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-sm mb-3">
            <div className="glass-card p-2 rounded-lg text-center">
              <p className="text-xl font-bold text-blue-400">
                {event.totalGuests}
              </p>
              <p className="text-muted-foreground text-xs">إجمالي</p>
            </div>
            <div className="glass-card p-2 rounded-lg text-center">
              <p className="text-xl font-bold text-green-400">
                {event.checkedIn}
              </p>
              <p className="text-muted-foreground text-xs">حاضرين</p>
            </div>
            <div className="glass-card p-2 rounded-lg text-center">
              <p className="text-xl font-bold text-orange-400">
                {event.pending}
              </p>
              <p className="text-muted-foreground text-xs">متبقي</p>
            </div>
            <div className="glass-card p-2 rounded-lg text-center">
              <p className="text-xl font-bold text-purple-400">
                {event.checkInRate}%
              </p>
              <p className="text-muted-foreground text-xs">نسبة الحضور</p>
            </div>
          </div>

          <div className="mb-2">
            <Progress value={event.checkInRate} className="h-2" />
          </div>

          <CollapsibleContent>
            <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">مدير المناسبة</span>
                <span className="text-white font-medium">{event.managerName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">عدد المنظمين</span>
                <span className="text-white font-medium">{event.organizersCount}</span>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">توزيع الفئات:</p>
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(event.categoryBreakdown).map(([key, value]) => (
                    <div
                      key={key}
                      className="glass-card p-2 rounded-lg text-center"
                    >
                      <p className="text-lg font-bold text-white">{value}</p>
                      <p className="text-xs text-muted-foreground">
                        {categoryLabels[key]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}

function OrganizerCard({ organizer }: { organizer: OrganizerStat }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Card className="glass border-white/10">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-white">{organizer.name}</h4>
              <p className="text-sm text-muted-foreground">
                @{organizer.username}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={
                  organizer.isActive
                    ? "bg-green-500/20 text-green-400"
                    : "bg-gray-500/20 text-gray-400"
                }
              >
                {organizer.isActive ? "نشط" : "غير نشط"}
              </Badge>
              <Badge variant="outline">{organizer.assignedEventsCount} مناسبة</Badge>
              {organizer.events.length > 0 && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" data-testid={`button-expand-organizer-${organizer.id}`}>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>
          </div>

          <CollapsibleContent>
            <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
              {organizer.events.map((event) => (
                <div
                  key={event.id}
                  className="glass-card p-3 rounded-lg flex items-center justify-between"
                >
                  <p className="text-white">{event.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(event.date).toLocaleDateString("ar-SA")}
                  </p>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}

export default function StatisticsPage() {
  const { data: stats, isLoading } = useQuery<ComprehensiveStats>({
    queryKey: ["/api/stats/comprehensive"],
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            الإحصائيات التفصيلية
          </h1>
          <p className="text-muted-foreground">نظرة شاملة على جميع بيانات النظام</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">لا توجد بيانات</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-white mb-2">
          الإحصائيات التفصيلية
        </h1>
        <p className="text-muted-foreground">نظرة شاملة على جميع بيانات النظام</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard
          title="إجمالي المديرين"
          value={stats.overview.totalAdmins}
          subtitle={`${stats.overview.activeAdmins} نشط`}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="مديري المناسبات"
          value={stats.overview.totalEventManagers}
          subtitle={`${stats.overview.activeEventManagers} نشط`}
          icon={Building}
          color="blue"
        />
        <StatCard
          title="المناسبات"
          value={stats.overview.totalEvents}
          subtitle={`${stats.overview.activeEvents} نشط`}
          icon={Calendar}
          color="green"
        />
        <StatCard
          title="الضيوف"
          value={stats.overview.totalGuests}
          subtitle={`${stats.overview.totalCheckedIn} حاضر (${stats.overview.checkInRate}%)`}
          icon={UserCheck}
          color="orange"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <StatCard
          title="المنظمين"
          value={stats.overview.totalOrganizers}
          subtitle={`${stats.overview.activeOrganizers} نشط`}
          icon={Users}
          color="purple"
        />
        <StatCard
          title="تسجيلات اليوم"
          value={stats.overview.todayCheckIns}
          icon={Activity}
          color="green"
        />
        <StatCard
          title="نسبة الحضور الكلية"
          value={`${stats.overview.checkInRate}%`}
          icon={TrendingUp}
          color="blue"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="glass border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              المديرون ({stats.admins.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.admins.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                لا يوجد مديرون
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.admins.map((admin) => (
                  <AdminCard key={admin.id} admin={admin} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="glass border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Building className="w-5 h-5" />
              مديري المناسبات ({stats.eventManagers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.eventManagers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                لا يوجد مديري مناسبات
              </p>
            ) : (
              <div className="space-y-4">
                {stats.eventManagers.map((manager) => (
                  <EventManagerCard key={manager.id} manager={manager} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card className="glass border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              المناسبات ({stats.events.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.events.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                لا توجد مناسبات
              </p>
            ) : (
              <div className="space-y-4">
                {stats.events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card className="glass border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              المنظمون ({stats.organizers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.organizers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                لا يوجد منظمون
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.organizers.map((organizer) => (
                  <OrganizerCard key={organizer.id} organizer={organizer} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
