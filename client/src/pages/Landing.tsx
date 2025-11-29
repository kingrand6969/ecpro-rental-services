import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Calendar, DollarSign, Shield } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center">
              <Car className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold">CarRent Pro</span>
          </div>
          <Button asChild data-testid="button-login">
            <a href="/api/login">Sign In</a>
          </Button>
        </div>
      </header>

      <main>
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
              Manage Your Car Rental Business with Ease
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Track rentals, manage expenses, monitor payments, and keep your fleet organized - all in one powerful dashboard.
            </p>
            <Button size="lg" asChild data-testid="button-get-started">
              <a href="/api/login">Get Started</a>
            </Button>
          </div>
        </section>

        <section className="py-16 px-6 bg-card">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-semibold text-center mb-12">Everything You Need to Run Your Fleet</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="border-card-border">
                <CardHeader className="pb-3">
                  <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-3">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Calendar View</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Color-coded calendar showing all reservations at a glance. Never double-book again.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="border-card-border">
                <CardHeader className="pb-3">
                  <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-3">
                    <Car className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Fleet Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Track maintenance, mileage, and oil changes for each vehicle in your fleet.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="border-card-border">
                <CardHeader className="pb-3">
                  <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-3">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Financial Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Monitor income, expenses, and net profit. Track monthly car payment progress.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="border-card-border">
                <CardHeader className="pb-3">
                  <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-3">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Secure Records</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Finalized rentals are locked. Only admins can edit, ensuring data integrity.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl font-semibold mb-6">Ready to streamline your rental business?</h2>
            <Button size="lg" asChild data-testid="button-sign-up">
              <a href="/api/login">Create Your Account</a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 px-6">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>Car Rental Booking System - Manage your fleet efficiently</p>
        </div>
      </footer>
    </div>
  );
}
