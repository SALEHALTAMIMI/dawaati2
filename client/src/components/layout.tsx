import { motion } from "framer-motion";
import { useLocation, Link } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  Settings, 
  LogOut, 
  UserCog,
  QrCode,
  ClipboardList,
  BarChart3,
  FileText,
  Menu,
  X,
  Package,
  CreditCard
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

interface LayoutProps {
  children: React.ReactNode;
}

const menuItems = {
  super_admin: [
    { icon: LayoutDashboard, label: "لوحة التحكم", path: "/" },
    { icon: BarChart3, label: "الإحصائيات التفصيلية", path: "/statistics" },
    { icon: FileText, label: "التقارير", path: "/reports" },
    { icon: UserCog, label: "إدارة المديرين", path: "/admins" },
    { icon: Users, label: "مديرو المناسبات", path: "/event-managers" },
    { icon: CreditCard, label: "إدارة الاشتراكات", path: "/subscriptions" },
    { icon: Calendar, label: "المناسبات", path: "/events" },
    { icon: Package, label: "باقات السعة", path: "/capacity-tiers" },
    { icon: Settings, label: "إعدادات الموقع", path: "/settings" },
  ],
  admin: [
    { icon: LayoutDashboard, label: "لوحة التحكم", path: "/" },
    { icon: Users, label: "مديرو المناسبات", path: "/event-managers" },
    { icon: Calendar, label: "المناسبات", path: "/events" },
  ],
  event_manager: [
    { icon: LayoutDashboard, label: "لوحة التحكم", path: "/" },
    { icon: Calendar, label: "المناسبات", path: "/events" },
    { icon: Users, label: "فريق العمل", path: "/organizers" },
  ],
  organizer: [
    { icon: QrCode, label: "المسح الضوئي", path: "/" },
  ],
};

const roleLabels = {
  super_admin: "مالك النظام",
  admin: "مدير النظام",
  event_manager: "مدير المناسبة",
  organizer: "المنظم",
};

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) return null;

  const items = menuItems[user.role as keyof typeof menuItems] || [];

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen gradient-bg">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative flex min-h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-72 glass border-l border-white/10 p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">نظام المناسبات</h1>
            <p className="text-muted-foreground text-sm">{roleLabels[user.role as keyof typeof roleLabels]}</p>
          </div>

          <nav className="flex-1 space-y-2">
            {items.map((item) => {
              const isActive = location === item.path;
              return (
                <Link key={item.path} href={item.path}>
                  <motion.div
                    whileHover={{ x: -4 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${
                      isActive
                        ? "glass-card bg-primary/20 text-white glow-primary"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                    data-testid={`nav-${item.path.replace("/", "") || "home"}`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-white/10">
            <div className="flex items-center gap-3 mb-4 p-3 glass-card rounded-xl">
              <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                <span className="text-white font-bold">{user.name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{user.name}</p>
                <p className="text-muted-foreground text-xs truncate">@{user.username}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
              data-testid="button-logout"
            >
              <LogOut className="w-5 h-5 ml-2" />
              تسجيل الخروج
            </Button>
          </div>
        </aside>

        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
          <div className="flex items-center justify-between p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-white"
              data-testid="button-mobile-menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
            <h1 className="text-lg font-bold text-white">نظام المناسبات</h1>
            <div className="w-10" />
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="md:hidden fixed inset-0 z-40 pt-16"
          >
            <div className="glass h-full p-6">
              <nav className="space-y-2">
                {items.map((item) => {
                  const isActive = location === item.path;
                  return (
                    <Link key={item.path} href={item.path}>
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-4 rounded-xl cursor-pointer transition-all ${
                          isActive
                            ? "glass-card bg-primary/20 text-white"
                            : "text-white/70 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </motion.div>
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-8 pt-6 border-t border-white/10">
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <LogOut className="w-5 h-5 ml-2" />
                  تسجيل الخروج
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Content */}
        <main className="flex-1 md:p-8 p-4 pt-20 md:pt-8 overflow-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
