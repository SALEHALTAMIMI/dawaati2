import { useAuth } from "@/lib/auth";
import { SuperAdminDashboard } from "@/components/dashboards/super-admin";
import { AdminDashboard } from "@/components/dashboards/admin";
import { EventManagerDashboard } from "@/components/dashboards/event-manager";
import { OrganizerDashboard } from "@/components/dashboards/organizer";

export default function DashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case "super_admin":
      return <SuperAdminDashboard />;
    case "admin":
      return <AdminDashboard />;
    case "event_manager":
      return <EventManagerDashboard />;
    case "organizer":
      return <OrganizerDashboard />;
    default:
      return <div>Unknown role</div>;
  }
}
