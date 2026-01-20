import { motion } from "framer-motion";
import { Settings, Save, Loader2, MessageCircle } from "lucide-react";
import { SiWhatsapp, SiInstagram, SiFacebook, SiX, SiLinkedin } from "react-icons/si";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";

interface SiteSettings {
  whatsapp?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  linkedin?: string | null;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState<SiteSettings>({
    whatsapp: "",
    instagram: "",
    facebook: "",
    twitter: "",
    linkedin: "",
  });

  const { data: settings, isLoading } = useQuery<SiteSettings>({
    queryKey: ["/api/settings"],
    enabled: user?.role === "super_admin",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        whatsapp: settings.whatsapp || "",
        instagram: settings.instagram || "",
        facebook: settings.facebook || "",
        twitter: settings.twitter || "",
        linkedin: settings.linkedin || "",
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: SiteSettings) => {
      const res = await apiRequest("PUT", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "تم الحفظ",
        description: "تم حفظ إعدادات الموقع بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في حفظ الإعدادات",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  if (user?.role !== "super_admin") {
    return (
      <div className="flex items-center justify-center h-full" data-testid="settings-unauthorized">
        <Card className="glass-card border-white/10 text-center p-8">
          <CardContent>
            <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
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
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl gradient-primary glow-primary">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white" data-testid="text-settings-title">إعدادات الموقع</h1>
              <p className="text-muted-foreground" data-testid="text-settings-subtitle">إدارة روابط التواصل الاجتماعي</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12" data-testid="settings-loading">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Card className="glass-card border-white/10" data-testid="card-social-settings">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  <span data-testid="text-social-title">روابط التواصل الاجتماعي</span>
                </CardTitle>
                <CardDescription data-testid="text-social-description">
                  أضف روابط التواصل الاجتماعي لعرضها في صفحة تسجيل الدخول
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-white/90 flex items-center gap-2">
                    <SiWhatsapp className="w-5 h-5 text-green-500" />
                    <span data-testid="label-whatsapp">واتساب</span>
                  </Label>
                  <Input
                    value={formData.whatsapp || ""}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    placeholder="مثال: https://wa.me/966500000000"
                    className="glass-input text-white placeholder:text-muted-foreground border-white/10"
                    dir="ltr"
                    data-testid="input-whatsapp"
                  />
                  <p className="text-xs text-muted-foreground" data-testid="text-whatsapp-hint">أدخل رابط واتساب أو رقم الهاتف بصيغة wa.me</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-white/90 flex items-center gap-2">
                    <SiInstagram className="w-5 h-5 text-pink-500" />
                    <span data-testid="label-instagram">انستغرام</span>
                  </Label>
                  <Input
                    value={formData.instagram || ""}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    placeholder="مثال: https://instagram.com/username"
                    className="glass-input text-white placeholder:text-muted-foreground border-white/10"
                    dir="ltr"
                    data-testid="input-instagram"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white/90 flex items-center gap-2">
                    <SiFacebook className="w-5 h-5 text-blue-500" />
                    <span data-testid="label-facebook">فيسبوك</span>
                  </Label>
                  <Input
                    value={formData.facebook || ""}
                    onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                    placeholder="مثال: https://facebook.com/pagename"
                    className="glass-input text-white placeholder:text-muted-foreground border-white/10"
                    dir="ltr"
                    data-testid="input-facebook"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white/90 flex items-center gap-2">
                    <SiX className="w-5 h-5 text-white" />
                    <span data-testid="label-twitter">إكس (تويتر سابقاً)</span>
                  </Label>
                  <Input
                    value={formData.twitter || ""}
                    onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                    placeholder="مثال: https://x.com/username"
                    className="glass-input text-white placeholder:text-muted-foreground border-white/10"
                    dir="ltr"
                    data-testid="input-twitter"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-white/90 flex items-center gap-2">
                    <SiLinkedin className="w-5 h-5 text-blue-600" />
                    <span data-testid="label-linkedin">لينكدإن</span>
                  </Label>
                  <Input
                    value={formData.linkedin || ""}
                    onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                    placeholder="مثال: https://linkedin.com/in/username"
                    className="glass-input text-white placeholder:text-muted-foreground border-white/10"
                    dir="ltr"
                    data-testid="input-linkedin"
                  />
                </div>

                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="w-full gradient-primary text-white glow-primary"
                  data-testid="button-save-settings"
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin ml-2" />
                  ) : (
                    <Save className="w-5 h-5 ml-2" />
                  )}
                  حفظ الإعدادات
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>
    </div>
  );
}
