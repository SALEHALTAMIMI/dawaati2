import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useRoute, Link } from "wouter";
import { useState, useRef } from "react";
import {
  Calendar,
  Users,
  UserPlus,
  Upload,
  Download,
  ArrowRight,
  Loader2,
  FileSpreadsheet,
  Clock,
  MapPin,
  BarChart3,
  RefreshCw,
  Copy,
  Check,
  Pencil,
  Trash2,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Event, Guest, User } from "@shared/schema";

export default function EventDetailPage() {
  const [, params] = useRoute("/events/:id");
  const eventId = params?.id;
  const [isUploading, setIsUploading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast({
        title: "تم النسخ",
        description: "تم نسخ كود الدخول",
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      toast({
        title: "خطأ",
        description: "فشل نسخ الكود",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/export-guests`, {
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "فشل التصدير");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `مدعوين-${event?.name || "event"}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({
        title: "تم التصدير",
        description: "تم تحميل ملف Excel بنجاح",
      });
    } catch (error: any) {
      toast({
        title: "فشل التصدير",
        description: error.message || "حدث خطأ أثناء تصدير البيانات",
        variant: "destructive",
      });
    }
  };

  const handleDownloadReport = async (reportType: "attendance" | "absence" | "audit") => {
    try {
      const res = await fetch(`/api/events/${eventId}/reports/${reportType}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "فشل التحميل");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const reportNames = {
        attendance: "تقرير-الحضور",
        absence: "تقرير-الغياب",
        audit: "سجل-العمليات",
      };
      a.download = `${reportNames[reportType]}-${event?.name || "event"}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({
        title: "تم التحميل",
        description: "تم تحميل التقرير بنجاح",
      });
    } catch (error: any) {
      toast({
        title: "فشل التحميل",
        description: error.message || "حدث خطأ أثناء تحميل التقرير",
        variant: "destructive",
      });
    }
  };

  const { data: event, isLoading: isLoadingEvent } = useQuery<Event>({
    queryKey: ["/api/events", eventId],
    enabled: !!eventId,
  });

  const { data: guests = [], isLoading: isLoadingGuests } = useQuery<Guest[]>({
    queryKey: ["/api/events", eventId, "guests"],
    enabled: !!eventId,
  });

  const { data: organizers = [] } = useQuery<User[]>({
    queryKey: ["/api/events", eventId, "organizers"],
    enabled: !!eventId,
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/events/${eventId}/upload-guests`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "تم الرفع بنجاح",
        description: `تم إضافة ${data.count} ضيف`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "guests"] });
    },
    onError: () => {
      toast({
        title: "فشل الرفع",
        description: "تأكد من صيغة الملف الصحيحة",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      uploadMutation.mutate(file);
      setIsUploading(false);
    }
  };

  const removeOrganizerMutation = useMutation({
    mutationFn: async (organizerId: string) => {
      await apiRequest("DELETE", `/api/events/${eventId}/organizers/${organizerId}`);
    },
    onSuccess: () => {
      toast({
        title: "تم الإزالة",
        description: "تم إزالة المنظم بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "organizers"] });
    },
    onError: () => {
      toast({
        title: "فشلت الإزالة",
        description: "حدث خطأ أثناء إزالة المنظم",
        variant: "destructive",
      });
    },
  });

  const categoryLabels: Record<string, string> = {
    vip: "VIP",
    regular: "عادي",
    media: "إعلام",
    sponsor: "راعي",
  };

  const guestColumns = [
    { key: "name", header: "الاسم" },
    { key: "phone", header: "الجوال" },
    {
      key: "category",
      header: "الفئة",
      render: (guest: Guest) => (
        <Badge
          variant="secondary"
          className={`${
            guest.category === "vip"
              ? "bg-yellow-500/20 text-yellow-400"
              : "bg-white/10 text-white/70"
          }`}
        >
          {categoryLabels[guest.category || "regular"]}
        </Badge>
      ),
    },
    { key: "companions", header: "المرافقين" },
    {
      key: "isCheckedIn",
      header: "الحالة",
      render: (guest: Guest) => (
        <Badge
          variant="secondary"
          className={`${
            guest.isCheckedIn
              ? "bg-green-500/20 text-green-400"
              : "bg-gray-500/20 text-gray-400"
          }`}
        >
          {guest.isCheckedIn ? "حاضر" : "لم يحضر"}
        </Badge>
      ),
    },
    {
      key: "qrCode",
      header: "كود الدخول",
      render: (guest: Guest) => (
        <div className="flex items-center gap-2">
          <code className="bg-white/10 px-2 py-1 rounded text-xs font-mono text-primary">
            {guest.qrCode}
          </code>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => handleCopyCode(guest.qrCode)}
            className="h-7 w-7 text-muted-foreground hover:text-white"
            data-testid={`button-copy-code-${guest.id}`}
          >
            {copiedCode === guest.qrCode ? (
              <Check className="w-3 h-3 text-green-500" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
        </div>
      ),
    },
    {
      key: "actions",
      header: "الإجراءات",
      render: (guest: Guest) => (
        <Link href={`/events/${eventId}/guests/${guest.id}/edit`}>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-white"
            data-testid={`button-edit-guest-${guest.id}`}
          >
            <Pencil className="w-4 h-4" />
          </Button>
        </Link>
      ),
    },
  ];

  const checkedInCount = guests.filter((g) => g.isCheckedIn).length;

  if (isLoadingEvent) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="glass-card rounded-2xl p-12 text-center">
        <p className="text-muted-foreground text-lg">المناسبة غير موجودة</p>
        <Link href="/events">
          <Button variant="outline" className="mt-4">
            <ArrowRight className="w-4 h-4 ml-2" />
            العودة للمناسبات
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/events">
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">{event.name}</h1>
            <div className="flex items-center gap-4 text-muted-foreground mt-1">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{new Date(event.date).toLocaleDateString("ar-SA")}</span>
              </div>
              {event.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{event.location}</span>
                </div>
              )}
              {event.startTime && (
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>
                    {event.startTime} - {event.endTime}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <Link href={`/events/${eventId}/edit`}>
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
            data-testid="button-edit-event"
          >
            <Settings className="w-4 h-4 ml-2" />
            تعديل المناسبة
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-primary" />
            <span className="text-muted-foreground">إجمالي الضيوف</span>
          </div>
          <p className="text-3xl font-bold text-white">{guests.length}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <RefreshCw className="w-5 h-5 text-green-500" />
            <span className="text-muted-foreground">الحاضرون</span>
          </div>
          <p className="text-3xl font-bold text-white">{checkedInCount}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-5 h-5 text-yellow-500" />
            <span className="text-muted-foreground">نسبة الحضور</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {guests.length > 0
              ? Math.round((checkedInCount / guests.length) * 100)
              : 0}
            %
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <UserPlus className="w-5 h-5 text-blue-500" />
            <span className="text-muted-foreground">فريق العمل</span>
          </div>
          <p className="text-3xl font-bold text-white">{organizers.length}</p>
        </motion.div>
      </div>

      <Tabs defaultValue="guests" className="w-full">
        <TabsList className="glass-card p-1 rounded-xl mb-6">
          <TabsTrigger
            value="guests"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <Users className="w-4 h-4 ml-2" />
            المدعوين
          </TabsTrigger>
          <TabsTrigger
            value="team"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <UserPlus className="w-4 h-4 ml-2" />
            فريق العمل
          </TabsTrigger>
          <TabsTrigger
            value="reports"
            className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            <BarChart3 className="w-4 h-4 ml-2" />
            التقارير
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guests" className="space-y-6">
          <div className="flex flex-wrap gap-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || uploadMutation.isPending}
              className="gradient-primary"
              data-testid="button-upload-excel"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="w-5 h-5 ml-2 animate-spin" />
              ) : (
                <Upload className="w-5 h-5 ml-2" />
              )}
              رفع ملف إكسل
            </Button>
            <Button
              onClick={handleExportExcel}
              variant="outline"
              className="border-primary/50 text-primary hover:bg-primary/10"
              disabled={guests.length === 0}
              data-testid="button-export-excel"
            >
              <Download className="w-5 h-5 ml-2" />
              تصدير Excel مع الأكواد
            </Button>
            <Link href={`/events/${eventId}/add-guest`}>
              <Button
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <UserPlus className="w-5 h-5 ml-2" />
                إضافة ضيف
              </Button>
            </Link>
          </div>

          <DataTable
            columns={guestColumns}
            data={guests}
            isLoading={isLoadingGuests}
            emptyMessage="لا يوجد مدعوين حتى الآن"
          />
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <div className="flex gap-4">
            <Link href={`/events/${eventId}/assign-organizers`}>
              <Button className="gradient-primary" data-testid="button-assign-organizers">
                <UserPlus className="w-5 h-5 ml-2" />
                تعيين منظمين
              </Button>
            </Link>
          </div>

          {organizers.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg">لم يتم تعيين منظمين بعد</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {organizers.map((org) => (
                <div key={org.id} className="glass-card rounded-2xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          {org.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{org.name}</h3>
                        <p className="text-muted-foreground text-sm">@{org.username}</p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeOrganizerMutation.mutate(org.id)}
                      disabled={removeOrganizerMutation.isPending}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      data-testid={`button-remove-organizer-${org.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">البث المباشر</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <p className="text-5xl font-bold text-green-500">{checkedInCount}</p>
                <p className="text-muted-foreground mt-2">حاضر</p>
              </div>
              <div className="text-center">
                <p className="text-5xl font-bold text-gray-400">
                  {guests.length - checkedInCount}
                </p>
                <p className="text-muted-foreground mt-2">لم يحضر</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <Button
              variant="outline"
              className="border-white/20 text-white"
              onClick={() => handleDownloadReport("attendance")}
              data-testid="button-report-attendance"
            >
              <Download className="w-5 h-5 ml-2" />
              تقرير الحضور
            </Button>
            <Button
              variant="outline"
              className="border-white/20 text-white"
              onClick={() => handleDownloadReport("absence")}
              data-testid="button-report-absence"
            >
              <Download className="w-5 h-5 ml-2" />
              تقرير الغياب
            </Button>
            <Button
              variant="outline"
              className="border-white/20 text-white"
              onClick={() => handleDownloadReport("audit")}
              data-testid="button-report-audit"
            >
              <Download className="w-5 h-5 ml-2" />
              سجل العمليات
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
