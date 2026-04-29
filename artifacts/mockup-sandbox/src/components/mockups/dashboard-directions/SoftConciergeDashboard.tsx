import React, { useEffect, useState } from "react";
import {
  Calendar,
  Car,
  Users,
  Wallet,
  FileText,
  Shield,
  Settings,
  Plus,
  CheckCircle2,
  Bell,
  Clock,
  Wrench,
  FileBadge,
  LayoutDashboard
} from "lucide-react";

// --- Sample Data ---
const TODAY = new Date(2026, 3, 29); // April 29, 2026

const cars = [
  { id: "c1", name: "Toyota Vios", plate: "ABC 1234", color: "mint" },
  { id: "c2", name: "Honda City", plate: "DEF 5678", color: "peach" },
  { id: "c3", name: "Mitsubishi Mirage", plate: "GHI 9012", color: "lavender" },
  { id: "c4", name: "Suzuki Ertiga", plate: "JKL 3456", color: "mint" },
  { id: "c5", name: "Nissan Almera", plate: "MNO 7890", color: "peach" },
];

const rentals = [
  { carId: "c1", customer: "Mark Reyes", start: 0, days: 3, amount: 8400, status: "confirmed" },
  { carId: "c2", customer: "Anna Cruz", start: 1, days: 5, amount: 14000, status: "confirmed" },
  { carId: "c3", customer: "Jose Santos", start: 4, days: 2, amount: 5600, status: "pending" },
  { carId: "c4", customer: "Liza Tan", start: 6, days: 4, amount: 12800, status: "confirmed" },
  { carId: "c1", customer: "Ramon Dela Cruz", start: 8, days: 3, amount: 8400, status: "confirmed" },
  { carId: "c5", customer: "Maria Lim", start: 10, days: 4, amount: 11200, status: "pending" },
];

const activity = [
  { id: 1, icon: CheckCircle2, title: "Rental finalized", subtitle: "Mark Reyes / Toyota Vios", time: "10:42 AM", color: "text-emerald-600", bg: "bg-emerald-50" },
  { id: 2, icon: Wallet, title: "Payment confirmed", subtitle: "Anna Cruz / ₱8,400", time: "09:15 AM", color: "text-blue-600", bg: "bg-blue-50" },
  { id: 3, icon: Wrench, title: "Oil change due", subtitle: "Honda City (5,300 km)", time: "08:30 AM", color: "text-amber-600", bg: "bg-amber-50" },
  { id: 4, icon: FileBadge, title: "Registration due in 7 days", subtitle: "Mitsubishi Mirage", time: "Yesterday", color: "text-rose-600", bg: "bg-rose-50" },
];

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Calendar, label: "Calendar", active: false },
  { icon: Car, label: "Cars", active: false },
  { icon: Wallet, label: "Rentals", active: false },
  { icon: Users, label: "Customers", active: false },
  { icon: FileText, label: "Finances", active: false },
  { icon: Clock, label: "Logs", active: false },
  { icon: Shield, label: "Admin", active: false },
  { icon: Settings, label: "Settings", active: false },
];

// --- Helpers ---
const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date);

function AnimatedCounter({ end, prefix = "", suffix = "" }: { end: number, prefix?: string, suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 500;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // easeOutCubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeProgress * end));

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };

    window.requestAnimationFrame(step);
  }, [end]);

  return (
    <span>
      {prefix}
      {prefix === "₱" ? new Intl.NumberFormat("en-PH").format(count) : count}
      {suffix}
    </span>
  );
}

export default function SoftConciergeDashboard() {
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    // Trigger celebration toast shortly after mount
    const timer = setTimeout(() => {
      setShowCelebration(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="soft-concierge-wrapper flex h-screen w-full overflow-hidden bg-[#F8F6F4] text-[#4A443E] font-sans">
      {/* Scope styles specifically for this variant */}
      <style>{`
        .soft-concierge-wrapper {
          --color-bg: #F8F6F4;
          --color-text-main: #4A443E;
          --color-text-muted: #8B837A;
          --color-surface-white: #FFFFFF;
          --color-surface-mint: #EEF5F0;
          --color-surface-peach: #FDF5F1;
          --color-surface-lavender: #F3EEF5;
          --color-border: #E8E3DF;
          --color-accent: #C38B70;
          --color-accent-hover: #A8765E;
          
          --shadow-soft: 0 4px 20px -2px rgba(139, 131, 122, 0.08), 0 0 3px rgba(139, 131, 122, 0.04);
          --radius-card: 16px;
        }

        .font-serif-fraunces {
          font-family: 'Fraunces', serif;
        }

        .soft-shadow {
          box-shadow: var(--shadow-soft);
        }

        @keyframes soft-pulse {
          0% { transform: scale(0.95); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        .animate-soft-pulse {
          animation: soft-pulse 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }

        /* Gantt chart scrollbar */
        .gantt-scroll::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }
        .gantt-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .gantt-scroll::-webkit-scrollbar-thumb {
          background-color: var(--color-border);
          border-radius: 4px;
        }
      `}</style>
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* Sidebar */}
      <aside className="w-20 lg:w-64 flex-shrink-0 border-r border-[#E8E3DF] bg-[#FDFBF9] flex flex-col items-center lg:items-stretch py-6 px-4">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-8 h-8 rounded-full bg-[#C38B70] text-white flex items-center justify-center flex-shrink-0">
            <span className="font-serif-fraunces font-semibold text-sm">EC</span>
          </div>
          <span className="font-serif-fraunces font-medium text-lg hidden lg:block tracking-wide">ECPro Rentals</span>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-200 ${
                item.active 
                  ? "bg-[#FDF5F1] text-[#A8765E] font-medium" 
                  : "text-[#8B837A] hover:bg-[#F8F6F4] hover:text-[#4A443E]"
              }`}
              title={item.label}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="hidden lg:block text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Topbar */}
        <header className="h-20 flex-shrink-0 px-8 flex items-center justify-between border-b border-[#E8E3DF]/50 bg-[#F8F6F4]/80 backdrop-blur-sm z-10">
          <div>
            <h1 className="font-serif-fraunces text-2xl font-medium text-[#4A443E]">Dashboard</h1>
            <p className="text-sm text-[#8B837A] mt-0.5">{formatDate(TODAY)}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-[#8B837A] hover:text-[#4A443E] transition-colors rounded-full hover:bg-white">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#C38B70] rounded-full border border-[#F8F6F4]"></span>
            </button>
            <button className="flex items-center gap-2 bg-[#C38B70] hover:bg-[#A8765E] text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-sm">
              <Plus className="w-4 h-4" />
              New Rental
            </button>
          </div>
        </header>

        {/* Scrollable Dashboard Content */}
        <div className="flex-1 overflow-auto p-8 flex flex-col gap-8">
          
          {/* Hero Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-6 soft-shadow flex flex-col gap-4">
              <div className="flex items-center gap-3 text-[#8B837A]">
                <div className="w-10 h-10 rounded-xl bg-[#F3EEF5] flex items-center justify-center text-[#9B7FAD]">
                  <Car className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">Active Rentals</span>
              </div>
              <div className="font-serif-fraunces text-4xl font-medium text-[#4A443E]">
                <AnimatedCounter end={7} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 soft-shadow flex flex-col gap-4">
              <div className="flex items-center gap-3 text-[#8B837A]">
                <div className="w-10 h-10 rounded-xl bg-[#EEF5F0] flex items-center justify-center text-[#6B9E7D]">
                  <Wallet className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">Today's Income</span>
              </div>
              <div className="font-serif-fraunces text-4xl font-medium text-[#4A443E]">
                <AnimatedCounter prefix="₱" end={18450} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 soft-shadow flex flex-col gap-4">
              <div className="flex items-center gap-3 text-[#8B837A]">
                <div className="w-10 h-10 rounded-xl bg-[#FDF5F1] flex items-center justify-center text-[#C38B70]">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">This Month</span>
              </div>
              <div className="font-serif-fraunces text-4xl font-medium text-[#4A443E]">
                <AnimatedCounter prefix="₱" end={312800} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 soft-shadow flex flex-col gap-4">
              <div className="flex items-center gap-3 text-[#8B837A]">
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">Available Cars</span>
              </div>
              <div className="font-serif-fraunces text-4xl font-medium text-[#4A443E]">
                <AnimatedCounter end={4} suffix=" of 11" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-8">
            {/* Calendar / Fleet Timeline */}
            <div className="xl:col-span-2 bg-[#EEF5F0]/60 rounded-[20px] p-6 soft-shadow border border-[#E8E3DF]/30 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif-fraunces text-xl font-medium text-[#4A443E]">Fleet Schedule</h2>
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#B2D8C1]"></div>
                    <span className="text-[#8B837A]">Confirmed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full border border-dashed border-[#B2D8C1]"></div>
                    <span className="text-[#8B837A]">Pending</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto gantt-scroll flex-1 -mx-2 px-2">
                <div className="min-w-[700px]">
                  {/* Timeline Header */}
                  <div className="flex mb-4 relative pl-32">
                    {Array.from({ length: 14 }).map((_, i) => {
                      const d = new Date(TODAY);
                      d.setDate(d.getDate() + i);
                      const isToday = i === 0;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-center border-l border-[#E8E3DF]/50 py-1">
                          <span className="text-xs font-medium text-[#8B837A] uppercase tracking-wider">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                          <span className={`text-sm mt-1 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-[#C38B70] text-white font-medium' : 'text-[#4A443E]'}`}>
                            {d.getDate()}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Cars Rows */}
                  <div className="flex flex-col gap-3 relative">
                    {/* Vertical grid lines overlay */}
                    <div className="absolute inset-0 pl-32 flex pointer-events-none">
                       {Array.from({ length: 14 }).map((_, i) => (
                         <div key={i} className="flex-1 border-l border-[#E8E3DF]/50"></div>
                       ))}
                    </div>

                    {cars.map((car, rowIndex) => (
                      <div key={car.id} className="flex items-center group relative z-10 h-14">
                        <div className="w-32 flex-shrink-0 pr-4 flex flex-col justify-center">
                          <span className="text-sm font-medium text-[#4A443E] truncate">{car.name}</span>
                          <span className="text-xs text-[#8B837A] mt-0.5">{car.plate}</span>
                        </div>
                        <div className="flex-1 relative h-10 bg-white/40 rounded-xl overflow-hidden backdrop-blur-sm border border-white/60">
                          {rentals
                            .filter(r => r.carId === car.id)
                            .map((rental, i) => {
                              const leftPercent = (rental.start / 14) * 100;
                              const widthPercent = (rental.days / 14) * 100;
                              const isConfirmed = rental.status === "confirmed";
                              
                              let bgClass = "";
                              let borderClass = "";
                              
                              // Determine colors based on car color mapping
                              if (car.color === "mint") {
                                bgClass = isConfirmed ? "bg-gradient-to-r from-[#B2D8C1] to-[#9BCBAE]" : "bg-[#B2D8C1]/30";
                                borderClass = isConfirmed ? "border-transparent" : "border-dashed border-[#8EBFA1]";
                              } else if (car.color === "peach") {
                                bgClass = isConfirmed ? "bg-gradient-to-r from-[#F5D8C9] to-[#EAC4B1]" : "bg-[#F5D8C9]/30";
                                borderClass = isConfirmed ? "border-transparent" : "border-dashed border-[#E3BCA6]";
                              } else {
                                bgClass = isConfirmed ? "bg-gradient-to-r from-[#DCD0E6] to-[#CDC0D9]" : "bg-[#DCD0E6]/30";
                                borderClass = isConfirmed ? "border-transparent" : "border-dashed border-[#C5B5D4]";
                              }

                              return (
                                <div
                                  key={i}
                                  className={`absolute top-1 bottom-1 rounded-lg border flex items-center px-3 shadow-sm overflow-hidden transition-opacity hover:opacity-90 cursor-pointer ${bgClass} ${borderClass}`}
                                  style={{
                                    left: `${leftPercent}%`,
                                    width: `calc(${widthPercent}% - 4px)`, // slight gap
                                  }}
                                >
                                  <span className="text-xs font-medium text-[#4A443E] truncate mix-blend-color-burn">{rental.customer}</span>
                                  <div className="ml-auto flex-shrink-0 text-[10px] font-semibold bg-white/40 px-1.5 py-0.5 rounded text-[#4A443E] mix-blend-color-burn">
                                    {rental.days}d
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Side Panel: Today's Activity */}
            <div className="bg-[#FDF5F1]/80 rounded-[20px] p-6 soft-shadow border border-[#E8E3DF]/30 relative flex flex-col">
              
              {/* Celebration Moment */}
              {showCelebration && (
                <div className="absolute -top-4 -right-4 bg-white px-4 py-2 rounded-full shadow-lg border border-[#E8E3DF] flex items-center gap-2 animate-soft-pulse z-20">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-[#4A443E]">Just finalized</span>
                </div>
              )}

              <h2 className="font-serif-fraunces text-xl font-medium text-[#4A443E] mb-6">Today's Activity</h2>
              
              <div className="flex flex-col gap-4 flex-1">
                {activity.map((item) => (
                  <div key={item.id} className="bg-white rounded-xl p-4 soft-shadow flex gap-4 items-start group transition-colors hover:bg-[#FDFBF9]">
                    <div className={`w-10 h-10 rounded-xl ${item.bg} ${item.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-sm font-medium text-[#4A443E] truncate">{item.title}</h3>
                        <span className="text-xs text-[#8B837A] whitespace-nowrap ml-2 mt-0.5">{item.time}</span>
                      </div>
                      <p className="text-sm text-[#8B837A] truncate">{item.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full mt-6 py-3 text-sm font-medium text-[#A8765E] hover:text-[#C38B70] transition-colors flex items-center justify-center gap-2">
                View all logs
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
