import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Car,
  DollarSign,
  LogOut,
  BarChart3,
  Settings,
  Wrench,
} from "lucide-react";

const mainNavItems = [
  {
    title: "Calendar",
    url: "/",
    icon: Calendar,
  },
  {
    title: "Cars",
    url: "/cars",
    icon: Car,
  },
  {
    title: "Rentals",
    url: "/rentals",
    icon: BarChart3,
  },
  {
    title: "Finances",
    url: "/finances",
    icon: DollarSign,
  },
];

const adminNavItems = [
  {
    title: "Admin Settings",
    url: "/admin",
    icon: Settings,
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, isAdmin } = useAuth();

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
            <Car className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">CarRent Pro</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase()}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.url}
                        data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}
                      >
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center gap-3 px-2 py-2 rounded-md bg-sidebar-accent/50">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user?.profileImageUrl ?? undefined}
              alt={user?.firstName ?? "User"}
              className="object-cover"
            />
            <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.firstName && user?.lastName
                ? `${user.firstName} ${user.lastName}`
                : user?.email ?? "User"}
            </p>
            {isAdmin && (
              <p className="text-xs text-muted-foreground">Admin</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="shrink-0"
            data-testid="button-logout"
          >
            <a href="/api/logout">
              <LogOut className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
