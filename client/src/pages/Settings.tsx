import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Lock, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { AppearancePicker } from "@/components/AppearancePicker";

const passwordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const mustChangePassword = user?.mustChangePassword ?? false;

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      const response = await apiRequest("POST", "/api/user/change-password", {
        currentPassword: mustChangePassword ? undefined : data.currentPassword,
        newPassword: data.newPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PasswordFormData) => {
    changePasswordMutation.mutate(data);
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <div className="flex items-center justify-between gap-4 px-4 md:px-6 h-14 border-b border-border bg-background/60 backdrop-blur shrink-0">
        <h1
          className="font-mono text-base md:text-lg font-bold uppercase tracking-widest text-foreground"
          data-testid="text-settings-title"
        >
          Settings
        </h1>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6 neon-scrollbar">
        <div className="max-w-2xl mx-auto">
          {mustChangePassword && (
            <div className="glass-panel rounded-md mb-6 border-chart-4/40 p-4 bg-chart-4/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-chart-4/15 border border-chart-4/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-chart-4" />
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-chart-4 font-bold">
                    Password Change Required
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your password has been reset. You must set a new password to continue.
                  </p>
                </div>
              </div>
            </div>
          )}

          <AppearancePicker />

          <div className="glass-panel rounded-md">
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-neon-cyan" />
                <h2 className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Change Password</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {mustChangePassword
                  ? "Set a new password for your account"
                  : "Update your password to keep your account secure"
                }
              </p>
            </div>
            <div className="p-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {!mustChangePassword && (
                    <FormField
                      control={form.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                            Current Password
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                {...field}
                                type={showCurrentPassword ? "text" : "password"}
                                placeholder="Enter current password"
                                className="font-mono"
                                data-testid="input-current-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              >
                                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                          New Password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showNewPassword ? "text" : "password"}
                              placeholder="Enter new password"
                              className="font-mono"
                              data-testid="input-new-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                            >
                              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                          Confirm New Password
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              {...field}
                              type={showConfirmPassword ? "text" : "password"}
                              placeholder="Confirm new password"
                              className="font-mono"
                              data-testid="input-confirm-password"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full font-mono text-xs uppercase tracking-wider shadow-cyan-glow"
                    disabled={changePasswordMutation.isPending}
                    data-testid="button-change-password"
                  >
                    {changePasswordMutation.isPending ? "Changing Password..." : "Change Password"}
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
