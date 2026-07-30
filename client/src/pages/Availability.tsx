import { FormEvent, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CalendarSearch,
  CarFront,
  CheckCircle2,
  ChevronDown,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateRentalDialog } from "@/components/CreateRentalDialog";
import { useAuth } from "@/hooks/useAuth";
import type { AvailabilityCar, AvailabilityResponse } from "@shared/schema";

function getErrorMessage(error: Error) {
  try {
    const body = error.message.includes(":")
      ? error.message.slice(error.message.indexOf(":") + 1).trim()
      : error.message;
    const parsed = JSON.parse(body) as { message?: string };
    return parsed.message || "We couldn't check availability. Please try again.";
  } catch {
    return error.message || "We couldn't check availability. Please try again.";
  }
}

function VehicleImage({ car }: { car: AvailabilityCar }) {
  const [failed, setFailed] = useState(false);

  if (!car.imageUrl || failed) {
    return (
      <div className="flex aspect-video items-center justify-center bg-muted" aria-hidden="true">
        <CarFront className="h-10 w-10 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="aspect-video overflow-hidden bg-muted">
      <img
        src={car.imageUrl}
        alt={`${car.name} vehicle`}
        loading="lazy"
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function ResultCard({
  car,
  action,
}: {
  car: AvailabilityCar;
  action?: React.ReactNode;
}) {
  return (
    <Card className="min-w-0 overflow-hidden">
      <VehicleImage car={car} />
      <CardContent className="space-y-4 p-4">
        <div className="min-w-0">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-mono text-sm font-semibold uppercase tracking-wider">
                {car.name}
              </h3>
              <p className="mt-1 truncate text-sm text-muted-foreground">{car.model}</p>
            </div>
            <Badge variant="outline" className="shrink-0 capitalize">
              {car.availability === "booked" ? "Already booked" : car.availability}
            </Badge>
          </div>
          <p className="mt-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Plate {car.plateNumber}
          </p>
        </div>

        {car.availability === "booked" && car.conflictingRental && (
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Conflicting rental</p>
            <p className="mt-1 text-muted-foreground">
              {car.conflictingRental.startDate} to {car.conflictingRental.endDate}
            </p>
          </div>
        )}

        {car.availability === "maintenance" && (
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
            <p className="font-medium">Maintenance reason</p>
            <p className="mt-1 break-words text-muted-foreground">
              {car.maintenanceReason || "No reason provided"}
            </p>
          </div>
        )}

        {action}
      </CardContent>
    </Card>
  );
}

function ResultSkeletons() {
  return (
    <div
      className="grid grid-cols-1 gap-4 lg:grid-cols-3"
      aria-label="Loading availability"
      aria-busy="true"
    >
      {[1, 2, 3].map((item) => (
        <div key={item} className="overflow-hidden rounded-md border border-border">
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-11 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function GroupedResults({
  title,
  cars,
  icon,
}: {
  title: string;
  cars: AvailabilityCar[];
  icon: React.ReactNode;
}) {
  if (cars.length === 0) return null;

  return (
    <Collapsible className="rounded-md border border-border bg-card">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="group h-11 w-full justify-between rounded-md px-4"
        >
          <span className="flex items-center gap-2">
            {icon}
            {title}
            <Badge variant="secondary">{cars.length}</Badge>
          </span>
          <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="grid grid-cols-1 gap-4 border-t border-border p-4 lg:grid-cols-3">
          {cars.map((car) => (
            <ResultCard key={car.id} car={car} />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function Availability() {
  const { canManage } = useAuth();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submittedRange, setSubmittedRange] = useState<{
    startDate: string;
    endDate: string;
  } | null>(null);
  const [validationError, setValidationError] = useState("");
  const [selectedCarId, setSelectedCarId] = useState<number>();
  const [rentalDialogOpen, setRentalDialogOpen] = useState(false);

  const { data, isFetching, error, refetch } = useQuery<AvailabilityResponse>({
    queryKey: [
      "/api/availability",
      `?startDate=${submittedRange?.startDate ?? ""}&endDate=${submittedRange?.endDate ?? ""}`,
    ],
    enabled: false,
    queryFn: async () => {
      if (!submittedRange) throw new Error("Choose a start and end date first.");
      const response = await fetch(
        `/api/availability?startDate=${encodeURIComponent(submittedRange.startDate)}&endDate=${encodeURIComponent(submittedRange.endDate)}`,
        { credentials: "include" },
      );
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
  });

  useEffect(() => {
    if (submittedRange) void refetch();
  }, [refetch, submittedRange]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!startDate || !endDate) {
      setValidationError("Choose both a start date and an end date.");
      return;
    }
    if (endDate < startDate) {
      setValidationError("End date cannot be before the start date.");
      return;
    }

    setValidationError("");
    const nextRange = { startDate, endDate };
    setSubmittedRange(nextRange);
  };

  const changeDates = () => {
    setSubmittedRange(null);
    setValidationError("");
    document.getElementById("availability-start-date")?.focus();
  };

  const selectCar = (carId: number) => {
    setSelectedCarId(carId);
    setRentalDialogOpen(true);
  };

  const handleRentalCreated = async () => {
    if (!submittedRange) return;
    await refetch();
  };

  return (
    <div className="min-h-full min-w-0 bg-background text-foreground">
      <header className="border-b border-border bg-background/60 px-4 py-4 backdrop-blur md:px-6">
        <h1 className="font-mono text-base font-bold uppercase tracking-widest md:text-lg">
          Availability
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find vehicles ready for a rental date range.
        </p>
      </header>

      <main className="mx-auto w-full min-w-0 max-w-7xl space-y-6 overflow-x-hidden p-4 md:p-6">
        <form
          onSubmit={handleSubmit}
          className="grid min-w-0 grid-cols-1 gap-4 rounded-md border border-border bg-card p-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
        >
          <div className="min-w-0 space-y-2">
            <Label htmlFor="availability-start-date">Start date</Label>
            <Input
              id="availability-start-date"
              type="date"
              required
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="h-11 min-w-0"
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label htmlFor="availability-end-date">End date</Label>
            <Input
              id="availability-end-date"
              type="date"
              required
              value={endDate}
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
              className="h-11 min-w-0"
            />
          </div>
          <Button type="submit" className="h-11 w-full md:w-auto" disabled={isFetching}>
            <CalendarSearch className="mr-2 h-4 w-4" />
            {isFetching ? "Checking…" : "Check Availability"}
          </Button>
          {validationError && (
            <p className="text-sm text-destructive md:col-span-3" role="alert">
              {validationError}
            </p>
          )}
        </form>

        {isFetching && <ResultSkeletons />}

        {!isFetching && submittedRange && error && (
          <section
            className="rounded-md border border-destructive/40 bg-destructive/5 p-6 text-center"
            role="alert"
          >
            <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
            <h2 className="mt-3 font-mono text-sm font-semibold uppercase tracking-wider">
              Availability check failed
            </h2>
            <p className="mx-auto mt-2 max-w-xl break-words text-sm text-muted-foreground">
              {getErrorMessage(error)}
            </p>
            <Button className="mt-4 h-11" variant="outline" onClick={() => void refetch()}>
              Try again
            </Button>
          </section>
        )}

        {!isFetching && submittedRange && !error && data && (
          <div className="space-y-6" aria-live="polite">
            <section aria-labelledby="available-cars-heading">
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-neon-cyan" />
                <h2
                  id="available-cars-heading"
                  className="font-mono text-sm font-semibold uppercase tracking-widest"
                >
                  Available cars
                </h2>
                <Badge variant="secondary">{data.available.length}</Badge>
              </div>

              {data.available.length > 0 ? (
                <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
                  {data.available.map((car) => (
                    <ResultCard
                      key={car.id}
                      car={car}
                      action={canManage ? (
                        <Button
                          className="h-11 w-full"
                          onClick={() => selectCar(car.id)}
                        >
                          Select &amp; Create Rental
                        </Button>
                      ) : undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-border bg-card p-8 text-center">
                  <CarFront className="mx-auto h-9 w-9 text-muted-foreground" />
                  <h3 className="mt-3 font-medium">No cars are available for these dates</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try another date range to see more vehicles.
                  </p>
                  <Button className="mt-4 h-11" variant="outline" onClick={changeDates}>
                    Change dates
                  </Button>
                </div>
              )}
            </section>

            <div className="space-y-3">
              <GroupedResults
                title="Already Booked"
                cars={data.booked}
                icon={<CalendarSearch className="h-4 w-4" />}
              />
              <GroupedResults
                title="Under Maintenance"
                cars={data.maintenance}
                icon={<Wrench className="h-4 w-4" />}
              />
            </div>
          </div>
        )}
      </main>

      {canManage && (
        <CreateRentalDialog
          open={rentalDialogOpen}
          onOpenChange={setRentalDialogOpen}
          initialCarId={selectedCarId}
          initialStartDate={submittedRange?.startDate}
          initialEndDate={submittedRange?.endDate}
          onCreated={handleRentalCreated}
        />
      )}
    </div>
  );
}
