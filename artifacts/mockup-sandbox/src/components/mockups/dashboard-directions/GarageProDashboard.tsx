import React, { useEffect, useState } from "react";
import { 
  Calendar, Car, Users, DollarSign, FileText, 
  Settings, Shield, Plus, CheckCircle2, AlertCircle, 
  Wrench, FileClock, Clock
} from "lucide-react";

// --- Data ---
const TODAY = new Date(2026, 3, 29); // April 29, 2026

const cars = [
  { id: "c1", name: "Toyota Vios", plate: "ABC 1234", color: "primary" },
  { id: "c2", name: "Honda City", plate: "DEF 5678", color: "secondary" },
  { id: "c3", name: "Mitsubishi Mirage", plate: "GHI 9012", color: "tertiary" },
  { id: "c4", name: "Suzuki Ertiga", plate: "JKL 3456", color: "primary" },
  { id: "c5", name: "Nissan Almera", plate: "MNO 7890", color: "secondary" },
];

const rentals = [
  { carId: "c1", customer: "Mark Reyes",   start: 0,  days: 3, amount: 8400,  status: "confirmed" },
  { carId: "c2", customer: "Anna Cruz",    start: 1,  days: 5, amount: 14000, status: "confirmed" },
  { carId: "c3", customer: "Jose Santos",  start: 4,  days: 2, amount: 5600,  status: "pending"   },
  { carId: "c4", customer: "Liza Tan",     start: 6,  days: 4, amount: 12800, status: "confirmed" },
  { carId: "c1", customer: "Ramon Dela Cruz", start: 8, days: 3, amount: 8400, status: "confirmed" },
  { carId: "c5", customer: "Maria Lim",    start: 10, days: 4, amount: 11200, status: "pending"   },
];

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(amount);
};

// --- Animations & Effects ---
function AnimatedCounter({ value, prefix = "", suffix = "" }: { value: number, prefix?: string, suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    const duration = 500;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      
      // ease-out cubic
      const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
      const currentProgress = Math.min(progress / duration, 1);
      
      setCount(Math.floor(value * easeOut(currentProgress)));
      
      if (progress < duration) {
        requestAnimationFrame(animate);
      } else {
        setCount(value);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);

  return <>{prefix}{count.toLocaleString('en-US')}{suffix}</>;
}

export default function GarageProDashboard() {
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="garage-pro-theme flex h-screen w-full bg-zinc-950 text-zinc-300 font-sans overflow-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');
        
        .garage-pro-theme {
          --gp-amber: 38 92% 50%; /* hsl(38, 92%, 50%) */
          --gp-dark: 240 10% 4%; /* zinc-950ish */
          --gp-surface: 240 5% 10%; /* zinc-900 */
          --gp-surface-hover: 240 5% 15%;
          --gp-border: 240 5% 20%;
          --gp-green: 142 71% 45%;
          
          font-family: 'Inter', sans-serif;
        }

        .font-mono-num {
          font-family: 'JetBrains Mono', monospace;
          font-variant-numeric: tabular-nums;
        }
        
        .chamfered {
          clip-path: polygon(
            8px 0, 100% 0, 
            100% calc(100% - 8px), calc(100% - 8px) 100%, 
            0 100%, 0 8px
          );
        }

        .chamfered-btn {
          clip-path: polygon(
            6px 0, 100% 0, 
            100% calc(100% - 6px), calc(100% - 6px) 100%, 
            0 100%, 0 6px
          );
        }

        .nav-item.active {
          color: hsl(var(--gp-amber));
          background: linear-gradient(90deg, hsla(var(--gp-amber), 0.15) 0%, transparent 100%);
          border-left: 2px solid hsl(var(--gp-amber));
        }

        @keyframes pulse-toast {
          0% { transform: scale(0.95); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        .celebration-toast {
          animation: pulse-toast 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        
        /* Scrollbar styles for the timeline */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: hsl(var(--gp-surface));
        }
        ::-webkit-scrollbar-thumb {
          background: hsl(var(--gp-border));
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--gp-amber));
        }
      `}} />

      {/* Sidebar */}
      <aside className="w-16 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-4 z-20">
        <div className="w-10 h-10 bg-zinc-800 rounded flex items-center justify-center mb-8 border border-zinc-700">
          <Car className="text-zinc-100" size={20} />
        </div>
        
        <nav className="flex flex-col gap-2 w-full">
          <NavItem icon={<Calendar />} label="Calendar" active />
          <NavItem icon={<Car />} label="Cars" />
          <NavItem icon={<FileClock />} label="Rentals" />
          <NavItem icon={<Users />} label="Customers" />
          <NavItem icon={<DollarSign />} label="Finances" />
          <NavItem icon={<FileText />} label="Logs" />
        </nav>
        
        <div className="mt-auto flex flex-col gap-2 w-full">
          <NavItem icon={<Shield />} label="Admin" />
          <NavItem icon={<Settings />} label="Settings" />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative">
        {/* Topbar */}
        <header className="h-16 flex-shrink-0 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-900/50">
          <div>
            <h1 className="text-xl font-bold text-zinc-100 uppercase tracking-wider">Dashboard</h1>
            <p className="text-xs text-zinc-500 font-mono-num mt-0.5 uppercase tracking-widest">April 29, 2026</p>
          </div>
          <button className="chamfered-btn bg-[hsl(38,92%,50%)] hover:bg-[hsl(38,100%,45%)] text-zinc-950 font-bold px-4 py-2 flex items-center gap-2 text-sm transition-colors uppercase tracking-wider">
            <Plus size={16} strokeWidth={3} />
            New Rental
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-6 flex flex-col gap-6">
          
          {/* KPI Row */}
          <div className="grid grid-cols-4 gap-4 flex-shrink-0">
            <KpiCard title="Active Rentals" value={7} />
            <KpiCard title="Today's Income" value={18450} prefix="₱" highlight />
            <KpiCard title="This Month" value={312800} prefix="₱" />
            <KpiCard title="Available Cars" value={4} suffix=" / 11" />
          </div>

          <div className="flex gap-6 min-h-0 flex-1">
            {/* Timeline */}
            <div className="flex-1 bg-zinc-900 border border-zinc-800 chamfered flex flex-col overflow-hidden">
              <div className="p-4 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Fleet Timeline</h2>
                <div className="flex gap-3 text-xs">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-zinc-400"></span> Confirmed</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full border border-zinc-500"></span> Pending</span>
                </div>
              </div>
              
              <div className="flex-1 overflow-auto relative">
                {/* Timeline Header */}
                <div className="flex sticky top-0 z-10 bg-zinc-900/90 backdrop-blur-sm border-b border-zinc-800 font-mono-num text-[10px] text-zinc-500 uppercase">
                  <div className="w-40 flex-shrink-0 p-3 border-r border-zinc-800">Vehicle</div>
                  {Array.from({ length: 14 }).map((_, i) => (
                    <div key={i} className="flex-1 min-w-[60px] p-2 text-center border-r border-zinc-800/50">
                      Apr {29 + i > 30 ? (29 + i - 30) : (29 + i)}
                    </div>
                  ))}
                </div>

                {/* Timeline Rows */}
                <div className="relative">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex pointer-events-none z-0">
                    <div className="w-40 flex-shrink-0 border-r border-zinc-800"></div>
                    {Array.from({ length: 14 }).map((_, i) => (
                      <div key={i} className="flex-1 min-w-[60px] border-r border-zinc-800/30"></div>
                    ))}
                  </div>

                  {cars.map((car, idx) => (
                    <div key={car.id} className="flex relative z-1 border-b border-zinc-800/50 group hover:bg-zinc-800/30 transition-colors">
                      <div className="w-40 flex-shrink-0 p-3 border-r border-zinc-800 flex flex-col justify-center bg-zinc-900">
                        <span className="text-sm font-semibold text-zinc-200">{car.name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono-num">{car.plate}</span>
                      </div>
                      
                      <div className="flex-1 relative min-w-[840px] h-[60px]">
                        {rentals.filter(r => r.carId === car.id).map((rental, rIdx) => {
                          const isPending = rental.status === 'pending';
                          // Gradient for the first confirmed item
                          const useGradient = rental.status === 'confirmed' && idx === 0 && rIdx === 0;
                          
                          return (
                            <div 
                              key={rIdx}
                              className={`absolute top-2 bottom-2 rounded-sm flex items-center px-2 overflow-hidden ${
                                isPending 
                                  ? 'border border-dashed border-[hsl(38,92%,50%)] bg-[hsla(38,92%,50%,0.1)] text-[hsl(38,92%,50%)]' 
                                  : useGradient
                                    ? 'bg-gradient-to-r from-zinc-700 to-zinc-600 text-zinc-100 border border-zinc-500 shadow-[0_0_10px_rgba(255,255,255,0.05)]'
                                    : 'bg-zinc-700 text-zinc-200 border border-zinc-600'
                              }`}
                              style={{ 
                                left: `calc(${(rental.start / 14) * 100}% + 4px)`, 
                                width: `calc(${(rental.days / 14) * 100}% - 8px)` 
                              }}
                            >
                              <div className="truncate text-xs font-semibold">{rental.customer}</div>
                              {rental.days > 1 && (
                                <div className="ml-auto bg-black/20 px-1.5 py-0.5 rounded text-[9px] font-mono-num font-bold">
                                  {rental.days}D
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Side Panel */}
            <div className="w-80 flex-shrink-0 bg-zinc-900 border border-zinc-800 chamfered flex flex-col relative">
              <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Today's Activity</h2>
                
                {showCelebration && (
                  <div className="celebration-toast absolute top-3 right-3 bg-[hsl(142,71%,20%)] border border-[hsl(142,71%,40%)] text-[hsl(142,71%,60%)] px-2 py-1 flex items-center gap-1.5 chamfered-btn z-10 shadow-lg">
                    <CheckCircle2 size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Just Finalized</span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 overflow-auto p-2">
                <ActivityItem 
                  icon={<CheckCircle2 size={16} className="text-[hsl(142,71%,50%)]" />}
                  title="Rental finalized"
                  subtitle="Mark Reyes / Toyota Vios"
                  time="10:42 AM"
                />
                <ActivityItem 
                  icon={<DollarSign size={16} className="text-[hsl(38,92%,50%)]" />}
                  title="Payment confirmed"
                  subtitle="Anna Cruz / ₱8,400"
                  time="09:15 AM"
                />
                <ActivityItem 
                  icon={<Wrench size={16} className="text-zinc-400" />}
                  title="Oil change due"
                  subtitle="Honda City (5,300 km)"
                  time="08:30 AM"
                />
                <ActivityItem 
                  icon={<AlertCircle size={16} className="text-zinc-400" />}
                  title="OR/CR registration due"
                  subtitle="Mitsubishi Mirage (7 days)"
                  time="Yesterday"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Subcomponents ---

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button aria-label={label} title={label} className={`nav-item w-full h-12 flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors border-l-2 border-transparent ${active ? 'active' : ''}`}>
      {React.cloneElement(icon as React.ReactElement, { size: 20 })}
    </button>
  );
}

function KpiCard({ title, value, prefix, suffix, highlight = false }: { title: string, value: number, prefix?: string, suffix?: string, highlight?: boolean }) {
  return (
    <div className={`bg-zinc-900 border chamfered p-5 relative overflow-hidden ${highlight ? 'border-[hsl(38,92%,50%)] shadow-[inset_0_0_20px_hsla(38,92%,50%,0.05)]' : 'border-zinc-800'}`}>
      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">{title}</h3>
      <div className={`text-3xl font-mono-num font-bold ${highlight ? 'text-[hsl(38,92%,50%)]' : 'text-zinc-100'}`}>
        <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
      </div>
      
      {/* Decorative corner accent */}
      <div className={`absolute top-0 right-0 w-8 h-8 opacity-20 ${highlight ? 'bg-[hsl(38,92%,50%)]' : 'bg-zinc-700'}`} style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }}></div>
    </div>
  );
}

function ActivityItem({ icon, title, subtitle, time }: { icon: React.ReactNode, title: string, subtitle: string, time: string }) {
  return (
    <div className="flex gap-3 p-3 hover:bg-zinc-800/50 rounded-sm transition-colors group cursor-default">
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-zinc-200">{title}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{subtitle}</div>
      </div>
      <div className="text-[10px] text-zinc-600 font-mono-num uppercase whitespace-nowrap">{time}</div>
    </div>
  );
}
