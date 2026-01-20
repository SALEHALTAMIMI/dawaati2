import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { 
  FileText, 
  Download, 
  Filter, 
  Calendar, 
  Users, 
  Building2, 
  ClipboardList,
  History,
  ChevronDown,
  Loader2,
  UserCog,
  CalendarDays,
  ShieldAlert
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type ReportType = "admin" | "eventManager" | "events" | "guests" | "audit";

interface FilterState {
  startDate: string;
  endDate: string;
  adminId: string;
  eventManagerId: string;
  eventId: string;
  checkedInOnly: boolean;
}

export default function ReportsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeReport, setActiveReport] = useState<ReportType>("events");
  const [filters, setFilters] = useState<FilterState>({
    startDate: "",
    endDate: "",
    adminId: "",
    eventManagerId: "",
    eventId: "",
    checkedInOnly: false,
  });
  const [reportData, setReportData] = useState<any>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  if (user?.role !== "super_admin") {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <ShieldAlert className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">غير مصرح</h2>
            <p className="text-white/70 mb-4">هذه الصفحة متاحة فقط لمالك النظام</p>
            <Button
              onClick={() => setLocation("/")}
              className="bg-purple-600 hover:bg-purple-700"
            >
              العودة للرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: adminsList } = useQuery<{ id: string; name: string; username: string }[]>({
    queryKey: ["/api/reports/admins-list"],
  });

  const { data: eventManagersList } = useQuery<{ id: string; name: string; username: string }[]>({
    queryKey: ["/api/reports/event-managers-list"],
  });

  const { data: eventsList } = useQuery<{ id: string; name: string; date: string }[]>({
    queryKey: ["/api/reports/events-list"],
  });

  const generateReport = async () => {
    setIsLoadingReport(true);
    setReportData(null);
    
    try {
      let url = "";
      const params = new URLSearchParams();
      
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      
      switch (activeReport) {
        case "admin":
          if (!filters.adminId) {
            toast({ title: "يرجى اختيار مدير", variant: "destructive" });
            setIsLoadingReport(false);
            return;
          }
          url = `/api/reports/admin/${filters.adminId}?${params.toString()}`;
          break;
        case "eventManager":
          if (!filters.eventManagerId) {
            toast({ title: "يرجى اختيار مدير مناسبة", variant: "destructive" });
            setIsLoadingReport(false);
            return;
          }
          url = `/api/reports/event-manager/${filters.eventManagerId}?${params.toString()}`;
          break;
        case "events":
          if (filters.eventId) params.append("eventId", filters.eventId);
          url = `/api/reports/events?${params.toString()}`;
          break;
        case "guests":
          if (!filters.eventId) {
            toast({ title: "يرجى اختيار مناسبة", variant: "destructive" });
            setIsLoadingReport(false);
            return;
          }
          if (filters.checkedInOnly) params.append("checkedInOnly", "true");
          url = `/api/reports/guests/${filters.eventId}?${params.toString()}`;
          break;
        case "audit":
          if (filters.eventId) params.append("eventId", filters.eventId);
          url = `/api/reports/audit?${params.toString()}`;
          break;
      }

      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("فشل في تحميل التقرير");
      const data = await response.json();
      setReportData(data);
      toast({ title: "تم إنشاء التقرير بنجاح" });
    } catch (error) {
      toast({ title: "خطأ في إنشاء التقرير", variant: "destructive" });
    } finally {
      setIsLoadingReport(false);
    }
  };

  const exportToExcel = async () => {
    if (!reportData) {
      toast({ title: "يرجى إنشاء التقرير أولاً", variant: "destructive" });
      return;
    }

    try {
      const reportNames: Record<ReportType, string> = {
        admin: "تقرير_المدير",
        eventManager: "تقرير_مدير_المناسبة",
        events: "تقرير_المناسبات",
        guests: "تقرير_الضيوف",
        audit: "تقرير_العمليات",
      };

      // Send params instead of reportData for secure server-side regeneration
      const response = await fetch("/api/reports/export", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: activeReport,
          params: {
            startDate: filters.startDate || undefined,
            endDate: filters.endDate || undefined,
            adminId: filters.adminId || undefined,
            eventManagerId: filters.eventManagerId || undefined,
            eventId: filters.eventId || undefined,
            checkedInOnly: filters.checkedInOnly,
          },
          fileName: `${reportNames[activeReport]}_${new Date().toISOString().split("T")[0]}`,
        }),
      });

      if (!response.ok) throw new Error("فشل في تصدير التقرير");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportNames[activeReport]}_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast({ title: "تم تصدير التقرير بنجاح" });
    } catch (error) {
      toast({ title: "خطأ في تصدير التقرير", variant: "destructive" });
    }
  };

  const renderReportContent = () => {
    if (!reportData) return null;

    switch (activeReport) {
      case "admin":
        return (
          <div className="space-y-6">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">معلومات المدير</CardTitle>
              </CardHeader>
              <CardContent className="text-white/90">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-white/60">الاسم:</span> {reportData.admin.name}</div>
                  <div><span className="text-white/60">اسم المستخدم:</span> {reportData.admin.username}</div>
                  <div><span className="text-white/60">الحالة:</span> 
                    <Badge className={reportData.admin.isActive ? "bg-green-500/20 text-green-300 mr-2" : "bg-red-500/20 text-red-300 mr-2"}>
                      {reportData.admin.isActive ? "نشط" : "غير نشط"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-white">{reportData.summary.eventManagersCount}</div>
                  <div className="text-white/60">مديرو المناسبات</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-white">{reportData.summary.organizersCount}</div>
                  <div className="text-white/60">المنظمون</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-white">{reportData.summary.eventsCount}</div>
                  <div className="text-white/60">المناسبات</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-white">{reportData.summary.totalGuests}</div>
                  <div className="text-white/60">الضيوف</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-white">{reportData.summary.checkedInGuests}</div>
                  <div className="text-white/60">الحاضرون</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-white">{reportData.summary.checkInRate}%</div>
                  <div className="text-white/60">نسبة الحضور</div>
                </CardContent>
              </Card>
            </div>

            {reportData.eventManagers?.length > 0 && (
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">مديرو المناسبات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-white">
                      <thead className="text-white/60 border-b border-white/20">
                        <tr>
                          <th className="text-right py-2 px-4">الاسم</th>
                          <th className="text-right py-2 px-4">الحالة</th>
                          <th className="text-right py-2 px-4">المناسبات</th>
                          <th className="text-right py-2 px-4">الضيوف</th>
                          <th className="text-right py-2 px-4">الحاضرون</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.eventManagers.map((m: any) => (
                          <tr key={m.id} className="border-b border-white/10">
                            <td className="py-2 px-4">{m.name}</td>
                            <td className="py-2 px-4">
                              <Badge className={m.isActive ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}>
                                {m.isActive ? "نشط" : "غير نشط"}
                              </Badge>
                            </td>
                            <td className="py-2 px-4">{m.eventsCount}</td>
                            <td className="py-2 px-4">{m.totalGuests}</td>
                            <td className="py-2 px-4">{m.checkedIn}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "eventManager":
        return (
          <div className="space-y-6">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">معلومات مدير المناسبة</CardTitle>
              </CardHeader>
              <CardContent className="text-white/90">
                <div className="grid grid-cols-2 gap-4">
                  <div><span className="text-white/60">الاسم:</span> {reportData.manager.name}</div>
                  <div><span className="text-white/60">اسم المستخدم:</span> {reportData.manager.username}</div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-white">{reportData.summary.eventsCount}</div>
                  <div className="text-white/60">المناسبات</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-white">{reportData.summary.totalGuests}</div>
                  <div className="text-white/60">الضيوف</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-white">{reportData.summary.checkedInGuests}</div>
                  <div className="text-white/60">الحاضرون</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-white">{reportData.summary.checkInRate}%</div>
                  <div className="text-white/60">نسبة الحضور</div>
                </CardContent>
              </Card>
            </div>

            {reportData.events?.length > 0 && (
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="text-white">المناسبات</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-white">
                      <thead className="text-white/60 border-b border-white/20">
                        <tr>
                          <th className="text-right py-2 px-4">الاسم</th>
                          <th className="text-right py-2 px-4">التاريخ</th>
                          <th className="text-right py-2 px-4">الضيوف</th>
                          <th className="text-right py-2 px-4">الحاضرون</th>
                          <th className="text-right py-2 px-4">VIP</th>
                          <th className="text-right py-2 px-4">عادي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.events.map((e: any) => (
                          <tr key={e.id} className="border-b border-white/10">
                            <td className="py-2 px-4">{e.name}</td>
                            <td className="py-2 px-4">{new Date(e.date).toLocaleDateString("ar-SA")}</td>
                            <td className="py-2 px-4">{e.totalGuests}</td>
                            <td className="py-2 px-4">{e.checkedIn}</td>
                            <td className="py-2 px-4">{e.categoryBreakdown?.vip || 0}</td>
                            <td className="py-2 px-4">{e.categoryBreakdown?.regular || 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case "events":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-white">{reportData.summary.eventsCount}</div>
                  <div className="text-white/60">المناسبات</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-white">{reportData.summary.activeEventsCount}</div>
                  <div className="text-white/60">النشطة</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-white">{reportData.summary.totalGuests}</div>
                  <div className="text-white/60">الضيوف</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-white">{reportData.summary.checkedInGuests}</div>
                  <div className="text-white/60">الحاضرون</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-white">{reportData.summary.checkInRate}%</div>
                  <div className="text-white/60">نسبة الحضور</div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">قائمة المناسبات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-white">
                    <thead className="text-white/60 border-b border-white/20">
                      <tr>
                        <th className="text-right py-2 px-4">الاسم</th>
                        <th className="text-right py-2 px-4">التاريخ</th>
                        <th className="text-right py-2 px-4">الموقع</th>
                        <th className="text-right py-2 px-4">مدير المناسبة</th>
                        <th className="text-right py-2 px-4">الضيوف</th>
                        <th className="text-right py-2 px-4">الحاضرون</th>
                        <th className="text-right py-2 px-4">النسبة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.events?.map((e: any) => (
                        <tr key={e.id} className="border-b border-white/10">
                          <td className="py-2 px-4">{e.name}</td>
                          <td className="py-2 px-4">{new Date(e.date).toLocaleDateString("ar-SA")}</td>
                          <td className="py-2 px-4">{e.location}</td>
                          <td className="py-2 px-4">{e.managerName}</td>
                          <td className="py-2 px-4">{e.totalGuests}</td>
                          <td className="py-2 px-4">{e.checkedIn}</td>
                          <td className="py-2 px-4">{e.checkInRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "guests":
        return (
          <div className="space-y-6">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">معلومات المناسبة</CardTitle>
              </CardHeader>
              <CardContent className="text-white/90">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><span className="text-white/60">الاسم:</span> {reportData.event.name}</div>
                  <div><span className="text-white/60">التاريخ:</span> {new Date(reportData.event.date).toLocaleDateString("ar-SA")}</div>
                  <div><span className="text-white/60">الموقع:</span> {reportData.event.location}</div>
                  <div><span className="text-white/60">مدير المناسبة:</span> {reportData.event.managerName}</div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-white">{reportData.summary.totalGuests}</div>
                  <div className="text-white/60">الضيوف</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-white">{reportData.summary.checkedIn}</div>
                  <div className="text-white/60">الحاضرون</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-white">{reportData.summary.pending}</div>
                  <div className="text-white/60">المتبقون</div>
                </CardContent>
              </Card>
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-white">{reportData.summary.totalCompanions}</div>
                  <div className="text-white/60">المرافقون</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-yellow-500/10 backdrop-blur-sm border-yellow-500/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-yellow-300">{reportData.summary.categoryBreakdown?.vip || 0}</div>
                  <div className="text-yellow-200/60">VIP</div>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/10 backdrop-blur-sm border-blue-500/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-blue-300">{reportData.summary.categoryBreakdown?.regular || 0}</div>
                  <div className="text-blue-200/60">عادي</div>
                </CardContent>
              </Card>
              <Card className="bg-purple-500/10 backdrop-blur-sm border-purple-500/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-purple-300">{reportData.summary.categoryBreakdown?.media || 0}</div>
                  <div className="text-purple-200/60">إعلام</div>
                </CardContent>
              </Card>
              <Card className="bg-green-500/10 backdrop-blur-sm border-green-500/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-green-300">{reportData.summary.categoryBreakdown?.sponsor || 0}</div>
                  <div className="text-green-200/60">راعي</div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">قائمة الضيوف ({reportData.guests?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-white">
                    <thead className="text-white/60 border-b border-white/20 sticky top-0 bg-purple-900/80">
                      <tr>
                        <th className="text-right py-2 px-4">الاسم</th>
                        <th className="text-right py-2 px-4">الهاتف</th>
                        <th className="text-right py-2 px-4">الفئة</th>
                        <th className="text-right py-2 px-4">المرافقين</th>
                        <th className="text-right py-2 px-4">الحالة</th>
                        <th className="text-right py-2 px-4">وقت الحضور</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.guests?.map((g: any) => (
                        <tr key={g.id} className="border-b border-white/10">
                          <td className="py-2 px-4">{g.name}</td>
                          <td className="py-2 px-4" dir="ltr">{g.phone || "-"}</td>
                          <td className="py-2 px-4">
                            <Badge className={
                              g.category === "vip" ? "bg-yellow-500/20 text-yellow-300" :
                              g.category === "media" ? "bg-purple-500/20 text-purple-300" :
                              g.category === "sponsor" ? "bg-green-500/20 text-green-300" :
                              "bg-blue-500/20 text-blue-300"
                            }>
                              {g.category === "vip" ? "VIP" : 
                               g.category === "media" ? "إعلام" :
                               g.category === "sponsor" ? "راعي" : "عادي"}
                            </Badge>
                          </td>
                          <td className="py-2 px-4">{g.companions || 0}</td>
                          <td className="py-2 px-4">
                            <Badge className={g.isCheckedIn ? "bg-green-500/20 text-green-300" : "bg-gray-500/20 text-gray-300"}>
                              {g.isCheckedIn ? "حاضر" : "غير حاضر"}
                            </Badge>
                          </td>
                          <td className="py-2 px-4">
                            {g.checkedInAt ? new Date(g.checkedInAt).toLocaleString("ar-SA") : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "audit":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-white">{reportData.summary.totalActions}</div>
                  <div className="text-white/60">إجمالي العمليات</div>
                </CardContent>
              </Card>
              <Card className="bg-green-500/10 backdrop-blur-sm border-green-500/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-green-300">{reportData.summary.actionTypes?.check_in || 0}</div>
                  <div className="text-green-200/60">تسجيل حضور</div>
                </CardContent>
              </Card>
              <Card className="bg-blue-500/10 backdrop-blur-sm border-blue-500/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-blue-300">{reportData.summary.actionTypes?.create_event || 0}</div>
                  <div className="text-blue-200/60">إنشاء مناسبة</div>
                </CardContent>
              </Card>
              <Card className="bg-purple-500/10 backdrop-blur-sm border-purple-500/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-purple-300">{reportData.summary.actionTypes?.create_guest || 0}</div>
                  <div className="text-purple-200/60">إضافة ضيف</div>
                </CardContent>
              </Card>
              <Card className="bg-yellow-500/10 backdrop-blur-sm border-yellow-500/20">
                <CardContent className="pt-6 text-center">
                  <div className="text-2xl font-bold text-yellow-300">{reportData.summary.actionTypes?.upload_guests || 0}</div>
                  <div className="text-yellow-200/60">رفع ضيوف</div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <CardTitle className="text-white">سجل العمليات ({reportData.logs?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full text-white">
                    <thead className="text-white/60 border-b border-white/20 sticky top-0 bg-purple-900/80">
                      <tr>
                        <th className="text-right py-2 px-4">التاريخ</th>
                        <th className="text-right py-2 px-4">المستخدم</th>
                        <th className="text-right py-2 px-4">العملية</th>
                        <th className="text-right py-2 px-4">المناسبة</th>
                        <th className="text-right py-2 px-4">التفاصيل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.logs?.map((l: any) => (
                        <tr key={l.id} className="border-b border-white/10">
                          <td className="py-2 px-4">
                            {l.timestamp ? new Date(l.timestamp).toLocaleString("ar-SA") : "-"}
                          </td>
                          <td className="py-2 px-4">{l.userName}</td>
                          <td className="py-2 px-4">
                            <Badge className={
                              l.action === "check_in" ? "bg-green-500/20 text-green-300" :
                              l.action === "create_event" ? "bg-blue-500/20 text-blue-300" :
                              "bg-purple-500/20 text-purple-300"
                            }>
                              {l.action === "check_in" ? "تسجيل حضور" :
                               l.action === "create_event" ? "إنشاء مناسبة" :
                               l.action === "update_event" ? "تحديث مناسبة" :
                               l.action === "create_guest" ? "إضافة ضيف" :
                               l.action === "upload_guests" ? "رفع ضيوف" : l.action}
                            </Badge>
                          </td>
                          <td className="py-2 px-4">{l.eventName}</td>
                          <td className="py-2 px-4 text-white/70">{l.details || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto space-y-6"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <FileText className="h-8 w-8" />
            التقارير
          </h1>
          {reportData && (
            <Button
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-export-excel"
            >
              <Download className="h-4 w-4 ml-2" />
              تصدير Excel
            </Button>
          )}
        </div>

        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Filter className="h-5 w-5" />
              خيارات التقرير
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={activeReport} onValueChange={(v) => {
              setActiveReport(v as ReportType);
              setReportData(null);
            }}>
              <TabsList className="grid grid-cols-5 w-full bg-white/10">
                <TabsTrigger 
                  value="events" 
                  className="data-[state=active]:bg-purple-600"
                  data-testid="tab-events"
                >
                  <Building2 className="h-4 w-4 ml-2" />
                  المناسبات
                </TabsTrigger>
                <TabsTrigger 
                  value="admin" 
                  className="data-[state=active]:bg-purple-600"
                  data-testid="tab-admin"
                >
                  <UserCog className="h-4 w-4 ml-2" />
                  المديرون
                </TabsTrigger>
                <TabsTrigger 
                  value="eventManager" 
                  className="data-[state=active]:bg-purple-600"
                  data-testid="tab-event-manager"
                >
                  <Users className="h-4 w-4 ml-2" />
                  مديرو المناسبات
                </TabsTrigger>
                <TabsTrigger 
                  value="guests" 
                  className="data-[state=active]:bg-purple-600"
                  data-testid="tab-guests"
                >
                  <ClipboardList className="h-4 w-4 ml-2" />
                  الضيوف
                </TabsTrigger>
                <TabsTrigger 
                  value="audit" 
                  className="data-[state=active]:bg-purple-600"
                  data-testid="tab-audit"
                >
                  <History className="h-4 w-4 ml-2" />
                  سجل العمليات
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Separator className="bg-white/20" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-white">من تاريخ</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  data-testid="input-start-date"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">إلى تاريخ</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                  data-testid="input-end-date"
                />
              </div>

              {activeReport === "admin" && (
                <div className="space-y-2">
                  <Label className="text-white">اختر المدير</Label>
                  <Select
                    value={filters.adminId}
                    onValueChange={(v) => setFilters({ ...filters, adminId: v })}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-admin">
                      <SelectValue placeholder="اختر مدير" />
                    </SelectTrigger>
                    <SelectContent>
                      {adminsList?.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} ({a.username})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {activeReport === "eventManager" && (
                <div className="space-y-2">
                  <Label className="text-white">اختر مدير المناسبة</Label>
                  <Select
                    value={filters.eventManagerId}
                    onValueChange={(v) => setFilters({ ...filters, eventManagerId: v })}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-event-manager">
                      <SelectValue placeholder="اختر مدير مناسبة" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventManagersList?.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} ({m.username})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(activeReport === "events" || activeReport === "guests" || activeReport === "audit") && (
                <div className="space-y-2">
                  <Label className="text-white">
                    {activeReport === "guests" ? "اختر المناسبة (مطلوب)" : "اختر مناسبة (اختياري)"}
                  </Label>
                  <Select
                    value={filters.eventId}
                    onValueChange={(v) => setFilters({ ...filters, eventId: v })}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white" data-testid="select-event">
                      <SelectValue placeholder="اختر مناسبة" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventsList?.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name} - {new Date(e.date).toLocaleDateString("ar-SA")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {activeReport === "guests" && (
                <div className="flex items-center space-x-2 space-x-reverse pt-8">
                  <Switch
                    checked={filters.checkedInOnly}
                    onCheckedChange={(v) => setFilters({ ...filters, checkedInOnly: v })}
                    data-testid="switch-checked-in-only"
                  />
                  <Label className="text-white">الحاضرون فقط</Label>
                </div>
              )}
            </div>

            <Button
              onClick={generateReport}
              disabled={isLoadingReport}
              className="w-full bg-purple-600 hover:bg-purple-700"
              data-testid="button-generate-report"
            >
              {isLoadingReport ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري إنشاء التقرير...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 ml-2" />
                  إنشاء التقرير
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {reportData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {renderReportContent()}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
