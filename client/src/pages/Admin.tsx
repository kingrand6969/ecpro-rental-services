import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, Users, Car, ClipboardList, Activity, Trash2, KeyRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

interface KpiTileProps {
  label: string;
  value: string | number;
  Icon: React.ComponentType<{ className?: string }>;
  accent: "cyan" | "magenta" | "amber" | "neutral";
  testid?: string;
}

function KpiTile({ label, value, Icon, accent, testid }: KpiTileProps) {
  const accentMap = {
    cyan: { text: "text-neon-cyan text-glow-cyan", iconBg: "bg-neon-cyan/10 text-neon-cyan", blur: "bg-neon-cyan" },
    magenta: { text: "text-neon-magenta", iconBg: "bg-neon-magenta/10 text-neon-magenta", blur: "bg-neon-magenta" },
    amber: { text: "text-chart-4", iconBg: "bg-chart-4/10 text-chart-4", blur: "bg-chart-4" },
    neutral: { text: "text-foreground", iconBg: "bg-muted text-foreground", blur: "bg-muted-foreground" },
  };
  const a = accentMap[accent];
  return (
    <div className="glass-panel rounded-md p-5 relative overflow-hidden group" data-testid={testid}>
      <div className={`absolute -right-4 -top-4 w-24 h-24 ${a.blur} opacity-5 blur-2xl group-hover:opacity-10 transition-opacity pointer-events-none`} />
      <div className="flex items-center gap-3 relative">
        <div className={`w-10 h-10 rounded-md ${a.iconBg} flex items-center justify-center shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className={`text-xl font-mono font-bold tabular-nums truncate ${a.text}`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const { user: currentUser, isAdmin } = useAuth();
  const { toast } = useToast();
  const [userToToggle, setUserToToggle] = useState<User | null>(null);
  const [userToApprove, setUserToApprove] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<User | null>(null);

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAdmin,
  });

  const { data: pendingUsers, isLoading: pendingLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/pending-users"],
    enabled: isAdmin,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<{
    totalUsers: number;
    totalCars: number;
    totalRentals: number;
    activeRentals: number;
  }>({
    queryKey: ["/api/admin/stats"],
    enabled: isAdmin,
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/toggle-admin`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User admin status updated successfully",
      });
      setUserToToggle(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "Success",
        description: "User has been approved",
      });
      setUserToApprove(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Success",
        description: "User has been deleted",
      });
      setUserToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("POST", `/api/admin/users/${userId}/reset-password`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password has been reset to default (12345678). User will be required to change it on next login.",
      });
      setUserToResetPassword(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  if (!isAdmin) {
    return (
      <div className="flex flex-col h-full bg-background text-foreground">
        <div className="flex items-center justify-between gap-4 px-4 md:px-6 h-14 border-b border-border bg-background/60 backdrop-blur shrink-0">
          <h1 className="font-mono text-base md:text-lg font-bold uppercase tracking-widest text-foreground">
            Admin
          </h1>
        </div>
        <div className="flex-1 overflow-auto p-4 md:p-6 neon-scrollbar">
          <div className="glass-panel rounded-md p-12 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-neon-magenta/10 border border-neon-magenta/30 flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-neon-magenta" />
            </div>
            <h2 className="font-mono text-base uppercase tracking-widest mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You need admin privileges to access this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const headTh = "font-mono text-[11px] uppercase tracking-widest text-muted-foreground";
  const sectionTitle = "font-mono text-xs uppercase tracking-widest text-muted-foreground";

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="flex items-center justify-between gap-4 px-4 md:px-6 h-14 border-b border-border flex-wrap shrink-0 bg-background/60 backdrop-blur">
        <h1
          className="font-mono text-base md:text-lg font-bold uppercase tracking-widest text-foreground flex items-center gap-2"
          data-testid="text-admin-title"
        >
          <Shield className="h-5 w-5 text-neon-cyan" />
          Admin Settings
        </h1>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 neon-scrollbar">
        {statsLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-panel rounded-md p-5">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KpiTile label="Total Users" value={stats.totalUsers} Icon={Users} accent="cyan" testid="kpi-total-users" />
            <KpiTile label="Total Cars" value={stats.totalCars} Icon={Car} accent="cyan" testid="kpi-total-cars" />
            <KpiTile label="Total Rentals" value={stats.totalRentals} Icon={ClipboardList} accent="magenta" testid="kpi-total-rentals" />
            <KpiTile label="Active Rentals" value={stats.activeRentals} Icon={Activity} accent="amber" testid="kpi-active-rentals" />
          </div>
        )}

        <div className="glass-panel rounded-md mb-6">
          <div className="p-4 border-b border-border">
            <h2 className={sectionTitle}>Pending User Approvals</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Review and approve new user registrations
            </p>
          </div>
          <div>
            {pendingLoading ? (
              <div className="space-y-3 p-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : pendingUsers && pendingUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className={headTh}>User</TableHead>
                    <TableHead className={headTh}>Email</TableHead>
                    <TableHead className={headTh}>Joined</TableHead>
                    <TableHead className={`${headTh} text-right`}>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map((user) => (
                    <TableRow key={user.id} className="border-border">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={user.profileImageUrl ?? undefined}
                              className="object-cover"
                            />
                            <AvatarFallback className="text-xs bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30">
                              {user.firstName?.[0] ?? user.email?.[0] ?? "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {user.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : user.email ?? "Unknown"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email ?? "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => setUserToApprove(user)}
                          className="font-mono text-xs uppercase tracking-wider shadow-cyan-glow"
                          data-testid={`button-approve-${user.id}`}
                        >
                          Approve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                No pending approvals
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel rounded-md">
          <div className="p-4 border-b border-border">
            <h2 className={sectionTitle}>User Management</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage user permissions and admin access
            </p>
          </div>
          <div>
            {usersLoading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : users && users.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className={headTh}>User</TableHead>
                    <TableHead className={headTh}>Email</TableHead>
                    <TableHead className={headTh}>Role</TableHead>
                    <TableHead className={headTh}>Joined</TableHead>
                    <TableHead className={`${headTh} text-center`}>Admin</TableHead>
                    <TableHead className={`${headTh} text-right`}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const isCurrentUser = user.id === currentUser?.id;
                    return (
                      <TableRow key={user.id} className="border-border" data-testid={`user-row-${user.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage
                                src={user.profileImageUrl ?? undefined}
                                className="object-cover"
                              />
                              <AvatarFallback className="text-xs bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30">
                                {user.firstName?.[0] ?? user.email?.[0] ?? "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : user.email ?? "Unknown"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email ?? "-"}
                        </TableCell>
                        <TableCell>
                          {user.isAdmin ? (
                            <Badge className="bg-neon-cyan/15 border border-neon-cyan/40 text-neon-cyan font-mono text-[10px] uppercase tracking-widest hover:bg-neon-cyan/15">
                              Admin
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-widest">
                              User
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString()
                            : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={user.isAdmin}
                            disabled={isCurrentUser}
                            onCheckedChange={() => setUserToToggle(user)}
                            data-testid={`switch-admin-${user.id}`}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setUserToResetPassword(user)}
                              disabled={isCurrentUser}
                              data-testid={`button-reset-password-${user.id}`}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setUserToDelete(user)}
                              disabled={isCurrentUser}
                              data-testid={`button-delete-user-${user.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                No users found
              </div>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={!!userToToggle} onOpenChange={() => setUserToToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {userToToggle?.isAdmin ? "Remove Admin Access" : "Grant Admin Access"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {userToToggle?.isAdmin
                ? `Are you sure you want to remove admin privileges from ${userToToggle?.email ?? "this user"}?`
                : `Are you sure you want to grant admin privileges to ${userToToggle?.email ?? "this user"}? They will be able to edit rentals and manage cars.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToToggle && toggleAdminMutation.mutate(userToToggle.id)}
              disabled={toggleAdminMutation.isPending}
            >
              {toggleAdminMutation.isPending ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!userToApprove} onOpenChange={() => setUserToApprove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve {userToApprove?.email ?? "this user"}? They will be able to login to the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToApprove && approveMutation.mutate(userToApprove.id)}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {userToDelete?.username ?? userToDelete?.email ?? "this user"}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteUserMutation.mutate(userToDelete.id)}
              disabled={deleteUserMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!userToResetPassword} onOpenChange={() => setUserToResetPassword(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset the password for {userToResetPassword?.username ?? userToResetPassword?.email ?? "this user"}? Their password will be set to "12345678" and they will be required to change it on next login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToResetPassword && resetPasswordMutation.mutate(userToResetPassword.id)}
              disabled={resetPasswordMutation.isPending}
            >
              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
