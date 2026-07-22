import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ThemeProvider } from "@/hooks/useTheme";
import { Skeleton } from "@/components/ui/skeleton";

import Auth from "@/pages/Auth";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Cars from "@/pages/Cars";
import Rentals from "@/pages/Rentals";
import Customers from "@/pages/Customers";
import Finances from "@/pages/Finances";
import Logs from "@/pages/Logs";
import Admin from "@/pages/Admin";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="glass-panel flex items-center justify-between gap-4 px-4 h-14 border-x-0 border-t-0 shrink-0 z-10">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Visitors (e.g. from the Facebook page) get the marketing site; the
    // staff app lives behind /login. Any other path still lands on the login
    // form so old staff bookmarks like /rentals keep working.
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/login" component={Auth} />
        <Route component={Auth} />
      </Switch>
    );
  }

  if (user?.mustChangePassword) {
    return (
      <AuthenticatedLayout>
        <Settings />
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        {/* Already signed in — /login just goes home. */}
        <Route path="/login" component={Dashboard} />
        <Route path="/cars" component={Cars} />
        <Route path="/rentals" component={Rentals} />
        <Route path="/customers" component={Customers} />
        <Route path="/finances" component={Finances} />
        <Route path="/logs" component={Logs} />
        <Route path="/admin" component={Admin} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AuthenticatedLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
