import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import { Loader2 } from "lucide-react";

import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import EventsPage from "@/pages/events";
import EventDetailPage from "@/pages/event-detail";
import NewEventPage from "@/pages/new-event";
import EditEventPage from "@/pages/edit-event";
import AssignOrganizersPage from "@/pages/assign-organizers";
import AddGuestPage from "@/pages/add-guest";
import EditGuestPage from "@/pages/edit-guest";
import AdminsPage from "@/pages/admins";
import EventManagersPage from "@/pages/event-managers";
import OrganizersPage from "@/pages/organizers";
import StatisticsPage from "@/pages/statistics";
import ReportsPage from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import CapacityTiersPage from "@/pages/capacity-tiers";
import SubscriptionsPage from "@/pages/subscriptions";
import NotFound from "@/pages/not-found";

function ProtectedRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={DashboardPage} />
        <Route path="/events" component={EventsPage} />
        <Route path="/events/new" component={NewEventPage} />
        <Route path="/events/:id/edit" component={EditEventPage} />
        <Route path="/events/:id/assign-organizers" component={AssignOrganizersPage} />
        <Route path="/events/:id/add-guest" component={AddGuestPage} />
        <Route path="/events/:eventId/guests/:guestId/edit" component={EditGuestPage} />
        <Route path="/events/:id" component={EventDetailPage} />
        <Route path="/admins" component={AdminsPage} />
        <Route path="/event-managers" component={EventManagersPage} />
        <Route path="/organizers" component={OrganizersPage} />
        <Route path="/statistics" component={StatisticsPage} />
        <Route path="/reports" component={ReportsPage} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/capacity-tiers" component={CapacityTiersPage} />
        <Route path="/subscriptions" component={SubscriptionsPage} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route component={ProtectedRoutes} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
