import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { LogIn, User, Lock, Loader2 } from "lucide-react";
import { SiWhatsapp, SiInstagram, SiFacebook, SiX, SiLinkedin } from "react-icons/si";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/lib/auth";
import { loginSchema, type LoginInput } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface SiteSettings {
  whatsapp?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  linkedin?: string | null;
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>({});
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/settings/public")
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch(() => {});
  }, []);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const hasSocialLinks = settings.whatsapp || settings.instagram || settings.facebook || settings.twitter || settings.linkedin;

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    try {
      const success = await login(data.username, data.password);
      if (success) {
        toast({
          title: "تم تسجيل الدخول بنجاح",
          description: "مرحباً بك في نظام إدارة المناسبات",
        });
        setLocation("/");
      } else {
        toast({
          title: "فشل تسجيل الدخول",
          description: "اسم المستخدم أو كلمة المرور غير صحيحة",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "حدث خطأ",
        description: "يرجى المحاولة مرة أخرى",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-400/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        <div className="glass-card rounded-3xl p-8 shadow-2xl">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-primary mb-6 glow-primary">
              <LogIn className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">نظام إدارة المناسبات</h1>
            <p className="text-muted-foreground">قم بتسجيل الدخول للمتابعة</p>
          </motion.div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/90 font-medium">اسم المستخدم</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            {...field}
                            placeholder="أدخل اسم المستخدم"
                            className="glass-input pr-10 h-12 rounded-xl text-white placeholder:text-muted-foreground border-white/10 focus:border-primary/50 focus:ring-primary/30"
                            data-testid="input-username"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/90 font-medium">كلمة المرور</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                          <Input
                            {...field}
                            type="password"
                            placeholder="أدخل كلمة المرور"
                            className="glass-input pr-10 h-12 rounded-xl text-white placeholder:text-muted-foreground border-white/10 focus:border-primary/50 focus:ring-primary/30"
                            data-testid="input-password"
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl gradient-primary text-white font-semibold text-lg glow-primary transition-all hover:scale-[1.02] active:scale-[0.98]"
                  data-testid="button-login"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin ml-2" />
                  ) : (
                    <LogIn className="w-5 h-5 ml-2" />
                  )}
                  تسجيل الدخول
                </Button>
              </motion.div>
            </form>
          </Form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center mt-6"
          >
            <p className="text-muted-foreground text-sm mb-3">
              لا يوجد لديك حساب؟ تواصل معنا
            </p>
            {hasSocialLinks && (
              <div className="flex items-center justify-center gap-3">
                {settings.whatsapp && (
                  <a
                    href={settings.whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full glass-card hover:bg-white/10 transition-colors"
                    data-testid="link-whatsapp"
                  >
                    <SiWhatsapp className="w-5 h-5 text-green-500" />
                  </a>
                )}
                {settings.instagram && (
                  <a
                    href={settings.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full glass-card hover:bg-white/10 transition-colors"
                    data-testid="link-instagram"
                  >
                    <SiInstagram className="w-5 h-5 text-pink-500" />
                  </a>
                )}
                {settings.facebook && (
                  <a
                    href={settings.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full glass-card hover:bg-white/10 transition-colors"
                    data-testid="link-facebook"
                  >
                    <SiFacebook className="w-5 h-5 text-blue-500" />
                  </a>
                )}
                {settings.twitter && (
                  <a
                    href={settings.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full glass-card hover:bg-white/10 transition-colors"
                    data-testid="link-twitter"
                  >
                    <SiX className="w-5 h-5 text-white" />
                  </a>
                )}
                {settings.linkedin && (
                  <a
                    href={settings.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full glass-card hover:bg-white/10 transition-colors"
                    data-testid="link-linkedin"
                  >
                    <SiLinkedin className="w-5 h-5 text-blue-600" />
                  </a>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
