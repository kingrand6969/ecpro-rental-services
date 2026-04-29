import React, { useState, useEffect } from "react";
import {
  Calendar,
  Car,
  Users,
  Wallet,
  FileText,
  Settings,
  Shield,
  Plus,
  CheckCircle2,
  Clock,
  Wrench,
  AlertCircle
} from "lucide-react";

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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const AnimatedCounter = ({ end, prefix = "", suffix = "", duration = 500, isCurrency = false }: { end: number, prefix?: string, suffix?: string, duration?: number, isCurrency?: boolean }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      
      const percent = Math.min(progress / duration, 1);
      // easeOutQuart
      const easeOut = 1 - Math.pow(1 - percent, 4);
      
      setCount(end * easeOut);

      if (progress < duration) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  const displayValue = isCurrency 
    ? formatCurrency(count).replace("₱", "") 
    : Math.floor(count).toString();

  return <span>{prefix}{displayValue}{suffix}</span>;
};

export default function EditorialFinanceDashboard() {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setPulse(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="editorial-theme min-h-screen flex text-[#2A2B2A] font-inter selection:bg-[#047857] selection:text-white">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
      
      <style dangerouslySetInnerHTML={{__html: `
        .editorial-theme {
          background-color: #F8F7F3;
          --color-cream: #F8F7F3;
          --color-ink: #2A2B2A;
          --color-ink-light: #5A5A5A;
          --color-emerald: #047857;
          --color-border: #D1D1C7;
          
          font-family: 'Inter', sans-serif;
        }
        
        .font-serif {
          font-family: 'Playfair Display', serif;
        }

        .hairline {
          border-color: var(--color-border);
        }
        
        .gradient-bar {
          background: linear-gradient(135deg, #047857 0%, #064E3B 100%);
        }
        
        .pulse-toast {
          animation: pulseFade 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform: scale(0.95);
          opacity: 0;
        }
        
        @keyframes pulseFade {
          0% { transform: scale(0.9); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        /* Custom scrollbar for timeline */
        .timeline-scroll::-webkit-scrollbar {
          height: 6px;
        }
        .timeline-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .timeline-scroll::-webkit-scrollbar-thumb {
          background-color: #D1D1C7;
          border-radius: 10px;
        }
      `}} />

      {/* Sidebar */}
      <aside className="w-16 border-r hairline flex flex-col items-center py-6 bg-white/50 backdrop-blur">
        <div className="w-8 h-8 bg-[#2A2B2A] text-[#F8F7F3] rounded font-serif italic font-bold flex items-center justify-center text-lg mb-10">
          E
        </div>
        <nav className="flex flex-col gap-6 flex-1 text-[#5A5A5A]">
          <button aria-label="Calendar" className="p-2 hover:text-[#2A2B2A] transition-colors"><Calendar size={20} /></button>
          <button aria-label="Cars" className="p-2 hover:text-[#2A2B2A] transition-colors text-[#2A2B2A]"><Car size={20} /></button>
          <button aria-label="Rentals" className="p-2 hover:text-[#2A2B2A] transition-colors"><FileText size={20} /></button>
          <button aria-label="Customers" className="p-2 hover:text-[#2A2B2A] transition-colors"><Users size={20} /></button>
          <button aria-label="Finances" className="p-2 hover:text-[#2A2B2A] transition-colors"><Wallet size={20} /></button>
          <button aria-label="Admin" className="p-2 hover:text-[#2A2B2A] transition-colors"><Shield size={20} /></button>
        </nav>
        <button aria-label="Settings" className="p-2 hover:text-[#2A2B2A] transition-colors text-[#5A5A5A] mt-auto"><Settings size={20} /></button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="px-10 py-8 border-b hairline flex justify-between items-end shrink-0">
          <div>
            <div className="uppercase tracking-widest text-[10px] font-semibold text-[#5A5A5A] mb-2">Wednesday, April 29, 2026</div>
            <h1 className="font-serif text-5xl font-bold tracking-tight text-[#2A2B2A]">The Dashboard</h1>
          </div>
          <button className="bg-[#047857] hover:bg-[#064E3B] text-white px-5 py-2.5 flex items-center gap-2 text-sm font-medium transition-colors">
            <Plus size={16} />
            <span>New Rental</span>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col lg:flex-row h-full">
            {/* Left Column: Editorial Content */}
            <div className="flex-[3] p-10 flex flex-col gap-12 border-r hairline">
              
              {/* Lead Story: Big KPI */}
              <div className="flex flex-col items-center text-center">
                <span className="uppercase tracking-widest text-xs font-semibold text-[#5A5A5A] mb-4">Market Summary &mdash; This Month</span>
                <div className="font-serif text-8xl font-normal text-[#2A2B2A] tracking-tighter mb-4">
                  <AnimatedCounter end={312800} prefix="₱" isCurrency={true} duration={800} />
                </div>
                <p className="text-[#5A5A5A] max-w-md text-sm leading-relaxed">
                  Gross income has seen steady growth this April, driven by increased weekend bookings and extended corporate leases.
                </p>
              </div>

              {/* Grid of smaller stories */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t hairline relative">
                
                <div className="flex flex-col gap-3">
                  <span className="font-serif italic text-lg text-[#047857]">Active Rentals</span>
                  <div className="text-5xl font-serif">
                    <AnimatedCounter end={7} duration={600} />
                  </div>
                  <p className="text-xs text-[#5A5A5A] uppercase tracking-wide border-t hairline pt-3 mt-1">Vehicles on the road</p>
                </div>

                <div className="flex flex-col gap-3">
                  <span className="font-serif italic text-lg text-[#2A2B2A]">Today's Income</span>
                  <div className="text-5xl font-serif">
                    <AnimatedCounter end={18450} prefix="₱" isCurrency={true} duration={700} />
                  </div>
                  <p className="text-xs text-[#5A5A5A] uppercase tracking-wide border-t hairline pt-3 mt-1">Daily revenue settled</p>
                </div>
                
                {/* Decorative rule between cols */}
                <div className="absolute left-1/2 top-8 bottom-0 w-px bg-[var(--color-border)] transform -translate-x-1/2"></div>
              </div>

              {/* Timeline Section */}
              <div className="mt-8 border-t hairline pt-8 flex-1 flex flex-col min-h-[300px]">
                <h2 className="font-serif text-2xl font-bold mb-6">Fleet Schedule</h2>
                
                <div className="border hairline bg-white/30 timeline-scroll overflow-x-auto pb-4">
                  <div className="min-w-[800px]">
                    <div className="flex border-b hairline">
                      <div className="w-48 p-3 border-r hairline text-xs font-semibold uppercase tracking-wider text-[#5A5A5A] bg-white/50">Vehicle</div>
                      <div className="flex-1 flex">
                        {Array.from({length: 14}).map((_, i) => (
                          <div key={i} className="flex-1 text-center p-3 text-xs text-[#5A5A5A] border-r hairline last:border-0 bg-white/50">
                            Apr {29 + i > 30 ? (29 + i - 30) : 29 + i}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex flex-col">
                      {cars.map((car, idx) => (
                        <div key={car.id} className="flex border-b hairline last:border-0 relative h-14 bg-white/10 hover:bg-white/40 transition-colors">
                          <div className="w-48 p-3 border-r hairline flex flex-col justify-center bg-white/30 z-10">
                            <span className="text-sm font-medium text-[#2A2B2A]">{car.name}</span>
                            <span className="text-[10px] text-[#5A5A5A] uppercase tracking-wider">{car.plate}</span>
                          </div>
                          <div className="flex-1 relative">
                            {/* Grid lines */}
                            <div className="absolute inset-0 flex pointer-events-none">
                              {Array.from({length: 14}).map((_, i) => (
                                <div key={i} className="flex-1 border-r hairline last:border-0 opacity-40"></div>
                              ))}
                            </div>
                            
                            {/* Rental Bars */}
                            {rentals.filter(r => r.carId === car.id).map((rental, i) => {
                              const isConfirmed = rental.status === 'confirmed';
                              const useGradient = isConfirmed && (idx === 0 || idx === 3);
                              
                              return (
                                <div 
                                  key={i}
                                  className={`absolute top-2 bottom-2 rounded-sm flex items-center px-3 text-xs shadow-sm transition-opacity ${
                                    useGradient ? 'gradient-bar text-white shadow-md' :
                                    isConfirmed ? 'bg-[#2A2B2A] text-white' : 
                                    'bg-transparent border border-dashed border-[#5A5A5A] text-[#2A2B2A]'
                                  }`}
                                  style={{
                                    left: `${(rental.start / 14) * 100}%`,
                                    width: `${(rental.days / 14) * 100}%`
                                  }}
                                >
                                  <span className="truncate font-medium">{rental.customer}</span>
                                  <span className="ml-auto opacity-70 text-[10px] ml-2">{rental.days}d</span>
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
            </div>

            {/* Right Column: Activity / Sidebar */}
            <div className="flex-[1.2] p-8 bg-[#F0EFE9] flex flex-col relative">
              
              {pulse && (
                <div className="absolute top-6 right-6 bg-[#047857] text-white px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-lg pulse-toast">
                  <CheckCircle2 size={12} />
                  <span>Just finalized</span>
                </div>
              )}
              
              <div className="flex items-end justify-between mb-8 pb-4 border-b border-[#D1D1C7]">
                <h3 className="font-serif text-xl font-bold">Today's Dispatch</h3>
                <span className="text-xs uppercase tracking-widest text-[#5A5A5A] font-semibold">Live Updates</span>
              </div>

              <div className="flex flex-col gap-6">
                
                <div className="flex gap-4 group">
                  <div className="mt-1 w-6 h-6 rounded-full bg-white border border-[#D1D1C7] flex items-center justify-center shrink-0">
                    <CheckCircle2 size={12} className="text-[#047857]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#2A2B2A] mb-1 group-hover:text-[#047857] transition-colors">Rental finalized &mdash; Mark Reyes</h4>
                    <p className="text-xs text-[#5A5A5A] font-serif italic mb-1.5">Toyota Vios, 3 days</p>
                    <span className="text-[10px] uppercase tracking-wider text-[#5A5A5A] flex items-center gap-1"><Clock size={10} /> 9:42 AM</span>
                  </div>
                </div>

                <div className="flex gap-4 group">
                  <div className="mt-1 w-6 h-6 rounded-full bg-white border border-[#D1D1C7] flex items-center justify-center shrink-0">
                    <Wallet size={12} className="text-[#2A2B2A]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#2A2B2A] mb-1">Payment confirmed &mdash; Anna Cruz</h4>
                    <p className="text-xs text-[#5A5A5A] font-serif italic mb-1.5">₱8,400 received via GCash</p>
                    <span className="text-[10px] uppercase tracking-wider text-[#5A5A5A] flex items-center gap-1"><Clock size={10} /> 11:15 AM</span>
                  </div>
                </div>

                <div className="flex gap-4 group">
                  <div className="mt-1 w-6 h-6 rounded-full bg-white border border-[#D1D1C7] flex items-center justify-center shrink-0">
                    <Wrench size={12} className="text-[#5A5A5A]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#2A2B2A] mb-1">Oil change due &mdash; Honda City</h4>
                    <p className="text-xs text-[#5A5A5A] font-serif italic mb-1.5">Mileage at 5,300 km</p>
                    <span className="text-[10px] uppercase tracking-wider text-[#5A5A5A] flex items-center gap-1"><Clock size={10} /> Pending scheduling</span>
                  </div>
                </div>

                <div className="flex gap-4 group">
                  <div className="mt-1 w-6 h-6 rounded-full bg-white border border-[#D1D1C7] flex items-center justify-center shrink-0">
                    <AlertCircle size={12} className="text-[#5A5A5A]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[#2A2B2A] mb-1">OR/CR Registration Due</h4>
                    <p className="text-xs text-[#5A5A5A] font-serif italic mb-1.5">Mitsubishi Mirage in 7 days</p>
                    <span className="text-[10px] uppercase tracking-wider text-[#5A5A5A] flex items-center gap-1"><Clock size={10} /> Action required</span>
                  </div>
                </div>

              </div>

              {/* Mini stats at bottom of sidebar */}
              <div className="mt-auto pt-8 border-t border-[#D1D1C7]">
                 <div className="flex justify-between items-center text-sm mb-3">
                    <span className="text-[#5A5A5A]">Available Fleet</span>
                    <span className="font-serif font-bold">4 of 11</span>
                 </div>
                 <div className="w-full h-1 bg-[#D1D1C7] overflow-hidden">
                   <div className="h-full bg-[#2A2B2A] w-[36%]"></div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
