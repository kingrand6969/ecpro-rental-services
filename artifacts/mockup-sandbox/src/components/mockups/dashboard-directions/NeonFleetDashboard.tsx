import React, { useEffect, useState, useRef } from "react";
import {
  Calendar,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Settings,
  Users,
  Wrench,
  AlertTriangle,
  FileCheck,
} from "lucide-react";

// --- Sample Data ---
const TODAY = new Date(2026, 3, 29); // April 29, 2026
const cars = [
  { id: "c1", name: "Toyota Vios", plate: "ABC 1234", color: "primary" },
  { id: "c2", name: "Honda City", plate: "DEF 5678", color: "secondary" },
  { id: "c3", name: "Mitsubishi Mirage", plate: "GHI 9012", color: "tertiary" },
  { id: "c4", name: "Suzuki Ertiga", plate: "JKL 3456", color: "primary" },
  { id: "c5", name: "Nissan Almera", plate: "MNO 7890", color: "secondary" },
];
const rentals = [
  { carId: "c1", customer: "Mark Reyes", start: 0, days: 3, amount: 8400, status: "confirmed" },
  { carId: "c2", customer: "Anna Cruz", start: 1, days: 5, amount: 14000, status: "confirmed" },
  { carId: "c3", customer: "Jose Santos", start: 4, days: 2, amount: 5600, status: "pending" },
  { carId: "c4", customer: "Liza Tan", start: 6, days: 4, amount: 12800, status: "confirmed" },
  { carId: "c1", customer: "Ramon Dela Cruz", start: 8, days: 3, amount: 8400, status: "confirmed" },
  { carId: "c5", customer: "Maria Lim", start: 10, days: 4, amount: 11200, status: "pending" },
];

const activities = [
  { id: 1, type: "finalized", title: "Rental finalized", subtitle: "Mark Reyes / Toyota Vios", time: "10 min ago", icon: FileCheck },
  { id: 2, type: "payment", title: "Payment confirmed", subtitle: "Anna Cruz / ₱8,400", time: "1 hr ago", icon: CreditCard },
  { id: 3, type: "maintenance", title: "Oil change due", subtitle: "Honda City (5,300 km)", time: "3 hrs ago", icon: Wrench },
  { id: 4, type: "warning", title: "OR/CR registration due in 7 days", subtitle: "Mitsubishi Mirage", time: "5 hrs ago", icon: AlertTriangle },
];

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", minimumFractionDigits: 0 }).format(val);

// --- Hooks ---
function useAnimatedCounter(endValue: number, duration = 500) {
  const [value, setValue] = useState(0);
  
  useEffect(() => {
    let startTimestamp: number;
    let animationFrame: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // ease-out cubic
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(easeOut * endValue));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(step);
      } else {
        setValue(endValue);
      }
    };

    animationFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrame);
  }, [endValue, duration]);

  return value;
}

// --- Components ---

export default function NeonFleetDashboard() {
  const activeRentals = useAnimatedCounter(7);
  const todayIncome = useAnimatedCounter(18450);
  const monthIncome = useAnimatedCounter(312800);
  const availableCars = useAnimatedCounter(4);

  const [toastVisible, setToastVisible] = useState(true);

  // 14 days header
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(TODAY);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="neon-fleet-theme min-h-screen bg-app-bg text-app-text font-inter flex flex-col md:flex-row overflow-hidden relative selection:bg-app-cyan/30">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
      <style>{`
        .neon-fleet-theme {
          --bg-dark: 220 30% 8%; /* Deep navy/black */
          --panel-bg: 220 30% 12%; /* Slightly lighter for panels */
          --panel-border: 220 30% 20%;
          
          --cyan: 190 95% 60%;
          --magenta: 320 90% 65%;
          
          --text-primary: 220 10% 95%;
          --text-secondary: 220 10% 65%;
        }

        .bg-app-bg { background-color: hsl(var(--bg-dark)); }
        .bg-panel { background-color: hsl(var(--panel-bg) / 0.7); }
        .border-panel { border-color: hsl(var(--panel-border)); }
        
        .text-app-text { color: hsl(var(--text-primary)); }
        .text-app-muted { color: hsl(var(--text-secondary)); }

        .text-cyan { color: hsl(var(--cyan)); }
        .text-magenta { color: hsl(var(--magenta)); }

        .bg-cyan { background-color: hsl(var(--cyan)); }
        .bg-cyan-soft { background-color: hsl(var(--cyan) / 0.15); }
        .bg-magenta-soft { background-color: hsl(var(--magenta) / 0.15); }
        
        .border-cyan { border-color: hsl(var(--cyan)); }
        .border-magenta { border-color: hsl(var(--magenta)); }
        
        .shadow-cyan-glow { box-shadow: 0 0 15px hsl(var(--cyan) / 0.2); }
        .shadow-magenta-glow { box-shadow: 0 0 15px hsl(var(--magenta) / 0.2); }

        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .font-inter { font-family: 'Inter', sans-serif; }

        .glass-panel {
          background: linear-gradient(135deg, hsl(var(--panel-bg) / 0.8), hsl(var(--panel-bg) / 0.4));
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid hsl(var(--panel-border) / 0.5);
        }

        .glass-panel:hover {
          border-color: hsl(var(--cyan) / 0.4);
          box-shadow: 0 0 20px hsl(var(--cyan) / 0.05);
          transition: all 0.3s ease;
        }

        /* Gradient bars */
        .bar-confirmed {
          background: linear-gradient(90deg, hsl(var(--cyan)), hsl(var(--cyan) / 0.7));
          box-shadow: 0 0 10px hsl(var(--cyan) / 0.3);
          color: #000;
        }
        
        .bar-pending {
          background: linear-gradient(90deg, hsl(var(--magenta) / 0.2), hsl(var(--magenta) / 0.05));
          border: 1px dashed hsl(var(--magenta));
          color: hsl(var(--magenta));
        }

        /* Animations */
        @keyframes pulse-toast {
          0% { transform: scale(0.95); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-toast {
          animation: pulse-toast 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Custom Scrollbar for timeline */
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: hsl(var(--panel-bg));
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--panel-border));
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--cyan) / 0.5);
        }
      `}</style>

      {/* Sidebar */}
      <aside className="w-20 md:w-64 flex-shrink-0 border-r border-panel flex flex-col bg-app-bg z-20">
        <div className="h-16 flex items-center justify-center md:justify-start md:px-6 border-b border-panel">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-cyan flex items-center justify-center shadow-cyan-glow">
              <Car size={18} className="text-black" />
            </div>
            <span className="hidden md:inline font-mono font-bold tracking-wider text-sm uppercase">ECPro Fleet</span>
          </div>
        </div>
        <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
          {[
            { icon: LayoutDashboard, label: "Dashboard", active: true },
            { icon: Calendar, label: "Calendar" },
            { icon: Car, label: "Cars" },
            { icon: FileText, label: "Rentals" },
            { icon: Users, label: "Customers" },
            { icon: CreditCard, label: "Finances" },
            { icon: Clock, label: "Logs" },
          ].map((item, i) => (
            <a
              key={i}
              href="#"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                item.active 
                  ? "bg-cyan-soft text-cyan border border-cyan/20 shadow-[inset_2px_0_0_hsl(var(--cyan))]" 
                  : "text-app-muted hover:text-app-text hover:bg-white/5"
              }`}
            >
              <item.icon size={18} />
              <span className="hidden md:inline text-sm font-medium">{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="p-3 border-t border-panel">
          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-app-muted hover:text-app-text hover:bg-white/5 transition-colors">
            <Settings size={18} />
            <span className="hidden md:inline text-sm font-medium">Settings</span>
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top bar */}
        <header className="h-16 flex-shrink-0 border-b border-panel flex items-center justify-between px-6 z-10 glass-panel border-0 border-b">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-mono font-bold uppercase tracking-wide">Dashboard</h1>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-app-muted">
              <Calendar size={14} className="text-cyan" />
              <span>APR 29, 2026</span>
            </div>
          </div>
          <button className="flex items-center gap-2 bg-cyan hover:bg-cyan/90 text-black px-4 py-2 rounded-md font-mono text-sm font-bold shadow-cyan-glow transition-all active:scale-95">
            <Plus size={16} />
            <span className="hidden sm:inline">NEW RENTAL</span>
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-6 lg:flex lg:gap-6 custom-scrollbar">
          
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Active Rentals", value: activeRentals, suffix: "", color: "cyan" },
                { label: "Today's Income", value: todayIncome, prefix: "₱", color: "cyan" },
                { label: "This Month", value: monthIncome, prefix: "₱", color: "cyan" },
                { label: "Available Cars", value: availableCars, suffix: " / 11", color: "cyan" },
              ].map((kpi, i) => (
                <div key={i} className="glass-panel rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden group">
                  <div className={`absolute -right-4 -top-4 w-24 h-24 bg-${kpi.color} opacity-5 blur-2xl group-hover:opacity-10 transition-opacity`} />
                  <span className="text-xs font-mono text-app-muted uppercase tracking-wider">{kpi.label}</span>
                  <div className="flex items-baseline gap-1 mt-auto">
                    {kpi.prefix && <span className={`text-lg font-mono text-${kpi.color}`}>{kpi.prefix}</span>}
                    <span className={`text-3xl md:text-4xl font-mono font-bold text-${kpi.color} drop-shadow-[0_0_8px_hsl(var(--${kpi.color})/0.5)]`}>
                      {kpi.prefix ? kpi.value.toLocaleString() : kpi.value}
                    </span>
                    {kpi.suffix && <span className="text-sm font-mono text-app-muted ml-1">{kpi.suffix}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Timeline */}
            <div className="glass-panel rounded-xl flex-1 flex flex-col min-h-[400px] border border-panel overflow-hidden relative">
              <div className="p-4 border-b border-panel flex items-center justify-between">
                <h2 className="font-mono text-sm uppercase tracking-widest text-app-muted">Fleet Timeline</h2>
                <div className="flex gap-2">
                  <button className="p-1.5 rounded hover:bg-white/10 text-app-muted transition-colors"><ChevronLeft size={16} /></button>
                  <button className="p-1.5 rounded hover:bg-white/10 text-app-muted transition-colors"><ChevronRight size={16} /></button>
                </div>
              </div>
              
              <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar relative">
                <div className="min-w-[800px]">
                  {/* Timeline Header */}
                  <div className="flex border-b border-panel sticky top-0 bg-app-bg/95 backdrop-blur z-10">
                    <div className="w-48 flex-shrink-0 border-r border-panel p-3">
                      <span className="text-xs font-mono text-app-muted">VEHICLE</span>
                    </div>
                    <div className="flex-1 flex">
                      {days.map((d, i) => (
                        <div key={i} className={`flex-1 min-w-[60px] border-r border-panel/50 p-2 text-center flex flex-col items-center justify-center ${i === 0 ? 'bg-cyan/10' : ''}`}>
                          <span className="text-[10px] font-mono text-app-muted uppercase">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                          <span className={`text-sm font-mono ${i === 0 ? 'text-cyan font-bold' : 'text-app-text'}`}>{d.getDate()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Timeline Rows */}
                  <div className="relative">
                    {/* Vertical grid lines */}
                    <div className="absolute inset-0 flex ml-48 pointer-events-none">
                       {days.map((_, i) => (
                        <div key={i} className={`flex-1 border-r border-panel/30 ${i === 0 ? 'bg-cyan/5' : ''}`} />
                      ))}
                    </div>

                    {cars.map((car) => {
                      const carRentals = rentals.filter(r => r.carId === car.id);
                      return (
                        <div key={car.id} className="flex border-b border-panel/50 hover:bg-white/[0.02] transition-colors relative z-0">
                          <div className="w-48 flex-shrink-0 border-r border-panel p-3 flex flex-col justify-center bg-app-bg/50 backdrop-blur">
                            <span className="text-sm font-medium truncate">{car.name}</span>
                            <span className="text-xs font-mono text-app-muted">{car.plate}</span>
                          </div>
                          <div className="flex-1 relative h-16">
                            {carRentals.map((r, i) => {
                              const left = `${(r.start / 14) * 100}%`;
                              const width = `${(r.days / 14) * 100}%`;
                              const isConfirmed = r.status === 'confirmed';
                              return (
                                <div 
                                  key={i}
                                  className={`absolute top-2 bottom-2 rounded flex items-center px-2 overflow-hidden ${isConfirmed ? 'bar-confirmed' : 'bar-pending'}`}
                                  style={{ left, width, zIndex: 1 }}
                                >
                                  <div className="min-w-0 flex-1 flex items-center gap-2">
                                    <span className={`text-xs font-mono font-bold truncate ${isConfirmed ? 'text-black' : 'text-magenta'}`}>
                                      {r.customer}
                                    </span>
                                  </div>
                                  <div className={`flex-shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded ml-2 ${isConfirmed ? 'bg-black/20 text-black' : 'bg-magenta/20 text-magenta'}`}>
                                    {r.days}d
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel: Today's Activity */}
          <div className="w-full lg:w-80 mt-6 lg:mt-0 flex-shrink-0 flex flex-col gap-4">
            <div className="glass-panel rounded-xl flex-1 p-5 flex flex-col relative overflow-hidden">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-mono text-sm uppercase tracking-widest text-cyan flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan shadow-cyan-glow" />
                  Live Feed
                </h3>
              </div>

              {/* Toast Celebration */}
              {toastVisible && (
                <div className="absolute top-4 right-4 bg-cyan/20 border border-cyan text-cyan text-xs font-mono px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-cyan-glow z-10 animate-toast backdrop-blur-md">
                  <Check size={12} />
                  <span>JUST FINALIZED</span>
                </div>
              )}

              <div className="flex flex-col gap-4 relative">
                {/* Connecting line */}
                <div className="absolute left-4 top-4 bottom-4 w-px bg-panel" />

                {activities.map((act, i) => (
                  <div key={act.id} className="flex gap-4 relative z-10 group">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${
                      act.type === 'finalized' || act.type === 'payment' 
                        ? 'bg-cyan/10 border-cyan text-cyan group-hover:shadow-cyan-glow' 
                        : act.type === 'warning'
                          ? 'bg-magenta/10 border-magenta text-magenta group-hover:shadow-magenta-glow'
                          : 'bg-white/5 border-white/20 text-app-muted group-hover:border-white/40'
                    } transition-all`}>
                      <act.icon size={14} />
                    </div>
                    <div className="flex flex-col min-w-0 pt-1">
                      <span className="text-sm font-medium text-app-text truncate">{act.title}</span>
                      <span className="text-xs text-app-muted truncate mt-0.5">{act.subtitle}</span>
                      <span className="text-[10px] font-mono text-app-muted/70 mt-1">{act.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
        </div>
      </main>
    </div>
  );
}
