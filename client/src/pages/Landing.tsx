import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  MessageCircle,
  Facebook,
  ShieldCheck,
  CalendarCheck,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { messengerLink, facebookPageLink, carSlug } from "@/lib/marketing";

interface PublicCar {
  id: number;
  name: string;
  imageUrl: string | null;
}

// The public face of ecprorentals.com. Visitors arrive from the Facebook
// page; this page's job is to show the fleet and hand the conversation to
// Messenger. Staff sign-in lives at /login.
export default function Landing() {
  const { data: fleet, isLoading } = useQuery<PublicCar[]>({
    queryKey: ["/api/public/fleet"],
  });

  const withPhotos = fleet?.filter((car) => car.imageUrl) ?? [];

  return (
    <div className="min-h-screen bg-[#0e121b] text-[#f1f2f4]">
      <header className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="" className="h-10 w-auto" />
          <div className="leading-tight">
            <p className="font-semibold tracking-wide">ECPro Rental Services</p>
            <p className="text-xs text-[#9aa5b6]">Self-drive car rental</p>
          </div>
        </div>
        <Link
          href="/login"
          className="text-xs text-[#9aa5b6] hover:text-[#f1f2f4] transition-colors"
          data-testid="link-staff-login"
        >
          Staff sign in
        </Link>
      </header>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-12 sm:pt-16 sm:pb-16 text-center">
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight [text-wrap:balance]">
          The right car for your trip, ready when you are.
        </h1>
        <p className="mt-4 text-[#9aa5b6] max-w-xl mx-auto text-sm sm:text-base">
          Well-maintained SUVs, pickups and family vans for self-drive rental.
          Message us on Facebook for rates and availability — we reply fast.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
          <Button
            asChild
            size="lg"
            className="bg-[#0084ff] hover:bg-[#0073e0] text-white gap-2 px-6"
          >
            <a
              href={messengerLink("landing")}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="button-messenger-hero"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
              Message us on Messenger
            </a>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-[#38445c] text-[#f1f2f4] gap-2 bg-transparent hover:bg-white/5"
          >
            <a
              href={facebookPageLink()}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="button-facebook-page"
            >
              <Facebook className="h-5 w-5" aria-hidden="true" />
              Visit our Facebook page
            </a>
          </Button>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
        <h2 className="text-lg font-semibold mb-5">Our fleet</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="aspect-video rounded-lg bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {withPhotos.map((car) => (
              <div
                key={car.id}
                className="rounded-lg overflow-hidden border border-[#242e42] bg-[#141b26] flex flex-col"
                data-testid={`public-car-${car.id}`}
              >
                <div className="aspect-video bg-black/40">
                  <img
                    src={car.imageUrl!}
                    alt={car.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 flex items-center justify-between gap-3">
                  <p className="font-semibold">{car.name}</p>
                  <Button
                    asChild
                    size="sm"
                    className="bg-[#0084ff] hover:bg-[#0073e0] text-white gap-1.5"
                  >
                    <a
                      href={messengerLink(carSlug(car.name))}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-testid={`button-inquire-${car.id}`}
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                      Inquire
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-[#242e42] bg-[#10151f]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm">
          <div className="flex gap-3">
            <ShieldCheck className="h-6 w-6 text-[#4fc6e0] shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold mb-1">Maintained fleet</p>
              <p className="text-[#9aa5b6]">
                Every vehicle on a strict service schedule, cleaned and checked
                between rentals.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <CalendarCheck className="h-6 w-6 text-[#4fc6e0] shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold mb-1">Simple booking</p>
              <p className="text-[#9aa5b6]">
                Message us your dates, we confirm availability and reserve your
                unit — no forms, no waiting.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <KeyRound className="h-6 w-6 text-[#4fc6e0] shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold mb-1">Self-drive freedom</p>
              <p className="text-[#9aa5b6]">
                Pick up, drive, return. Flexible daily and long-term rates for
                trips of any length.
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#242e42]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between gap-4 flex-wrap text-xs text-[#9aa5b6]">
          <p>© {new Date().getFullYear()} ECPro Rental Services</p>
          <div className="flex items-center gap-4">
            <a
              href={facebookPageLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#f1f2f4] transition-colors"
            >
              Facebook
            </a>
            <Link href="/login" className="hover:text-[#f1f2f4] transition-colors">
              Staff sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
