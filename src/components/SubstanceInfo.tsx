import React, { useMemo } from 'react';
import { Substance, Dose, UserSettings } from '../types';
import { formatTime, formatAmount, cn } from '../lib/utils';
import { getIconComponent } from './Substances';
import { ChevronLeft, Edit2, Activity, Database, DollarSign, PieChart, Star, Leaf, Clock, Hash, Percent, FileText, Zap } from 'lucide-react';
import { calculateActiveIngredients } from './Analytics';
import { calculateTolerance } from '../services/pharmacology';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';

interface SubstanceInfoProps {
  substance: Substance;
  doses: Dose[];
  settings: UserSettings;
  onBack: () => void;
  onEdit: () => void;
}

export default function SubstanceInfo({ substance, doses, settings, onBack, onEdit }: SubstanceInfoProps) {
  const IconComponent = getIconComponent(substance.icon);

  const substanceDoses = useMemo(() => doses.filter(d => d.substanceId === substance.id), [doses, substance.id]);
  
  const stats = useMemo(() => {
    const totalAmount = substanceDoses.reduce((sum, d) => sum + d.amount, 0);
    const totalCost = substanceDoses.reduce((sum, d) => {
      const strainPrice = d.strainId ? substance.strains?.find(s => s.name === d.strainId)?.price : null;
      return sum + (d.amount * (strainPrice || substance.price || 0));
    }, 0);
    const avgDose = substanceDoses.length > 0 ? totalAmount / substanceDoses.length : 0;
    
    // Sort logic
    const sorted = [...substanceDoses].sort((a, b) => a.timestamp - b.timestamp);
    const firstUse = sorted[0]?.timestamp;
    const lastUse = sorted[sorted.length - 1]?.timestamp;
    
    return {
      totalDoses: substanceDoses.length,
      totalAmount,
      totalCost,
      avgDose,
      firstUse,
      lastUse
    };
  }, [substanceDoses, substance]);

  const activeIngredientsContent = useMemo(() => {
    const defaultActives = substance.activeIngredients || [];
    if (defaultActives.length === 0 && !substance.activeIngredientName) return null;

    return (
      <div className="bg-white/5 dark:bg-black/20 backdrop-blur-[40px] p-6 rounded-[2rem] border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.12)] space-y-6 group hover:bg-white/[0.08] transition-colors relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-purple-500/10 blur-[40px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <h3 className="text-[11px] font-bold text-white/60 uppercase tracking-[0.2em] flex items-center gap-2 relative z-10">
          <Activity size={16} /> Specifikace účinných látek
        </h3>
        <div className="space-y-3 relative z-10">
          {defaultActives.length > 0 ? (
            defaultActives.map((ai, i) => (
              <div key={i} className="flex justify-between items-center text-sm bg-white/5 px-4 py-3 rounded-xl border border-white/5 shadow-inner">
                <span className="font-bold text-theme-text flex items-center gap-2"><Leaf size={14} className="text-md3-primary/70" /> {ai.name}</span>
                <span className="font-bold text-md3-primary px-2 py-1 bg-md3-primary/10 rounded-lg">{ai.percentage.toFixed(2)} %</span>
              </div>
            ))
          ) : (
            <div className="flex justify-between items-center text-sm bg-white/5 px-4 py-3 rounded-xl border border-white/5 shadow-inner">
              <span className="font-bold text-theme-text flex items-center gap-2"><Leaf size={14} className="text-md3-primary/70" /> {substance.activeIngredientName}</span>
              <span className="font-bold text-md3-primary px-2 py-1 bg-md3-primary/10 rounded-lg">{substance.activeIngredientPercentage?.toFixed(2)} %</span>
            </div>
          )}
        </div>
      </div>
    );
  }, [substance]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 relative z-10 pb-8 px-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-md3-gray hover:text-theme-text transition-colors p-2 -ml-2"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
          <span className="font-black text-[13px] uppercase tracking-widest">Detail</span>
        </button>
        <button 
          onClick={onEdit}
          className="bg-md3-primary/20 text-md3-primary px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-md3-primary/30 transition-all active:scale-95 border border-md3-primary/30 backdrop-blur-md shadow-sm"
        >
          <Edit2 size={14} strokeWidth={2.5}/> Upravit
        </button>
      </div>

      {/* Main Info Card */}
      <div className="p-8 rounded-[2.5rem] bg-white/5 dark:bg-black/20 backdrop-blur-[40px] border border-white/10 flex flex-col items-center relative overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 w-full h-[6px]" style={{ backgroundColor: substance.color || '#00d1ff', boxShadow: `0 0 30px ${substance.color}aa` }} />
        <div className="absolute top-[10%] right-[-10%] w-[60%] h-[60%] blur-[100px] rounded-full pointer-events-none opacity-40 transition-all duration-1000" style={{ backgroundColor: substance.color || '#00d1ff' }} />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/5 blur-[80px] rounded-full pointer-events-none" />

        <div className="w-24 h-24 bg-white/10 dark:bg-black/30 rounded-[1.8rem] flex items-center justify-center border border-white/20 mb-6 shadow-inner relative backdrop-blur-xl group hover:scale-105 transition-transform duration-500">
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-[1.8rem] opacity-50" />
          <IconComponent size={42} style={{ color: substance.color || '#00d1ff' }} strokeWidth={2.5} className="drop-shadow-lg relative z-10 group-hover:rotate-12 transition-transform duration-500" />
          {substance.isFavorite && (
             <div className="absolute -top-3 -right-3 bg-amber-400/20 border border-amber-400/30 text-amber-400 p-2 rounded-xl shadow-[0_0_15px_rgba(251,191,36,0.3)] backdrop-blur-md">
               <Star size={16} fill="currentColor" strokeWidth={2.5} />
             </div>
          )}
        </div>
        
        <h1 className="text-4xl font-black text-theme-text tracking-tight mb-3 drop-shadow-sm leading-none text-center">{substance.name}</h1>
        <div className="flex items-center justify-center flex-wrap gap-2 mb-6">
          <span className="text-[10px] uppercase font-bold tracking-[0.2em] px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-md3-gray/90 shadow-sm backdrop-blur-sm">
            {substance.category}
          </span>
          {substance.isIllegal && (
             <span className="text-[10px] uppercase font-bold tracking-[0.2em] px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 shadow-sm backdrop-blur-sm">
               Nelegální
             </span>
          )}
          {substance.isPrescription && (
             <span className="text-[10px] uppercase font-bold tracking-[0.2em] px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 shadow-sm backdrop-blur-sm">
               Na předpis
             </span>
          )}
        </div>
        
        {substance.description && (
          <p className="text-sm text-md3-gray/90 text-center max-w-sm font-medium mb-8 leading-relaxed">
            "{substance.description}"
          </p>
        )}

        <div className="w-full grid grid-cols-2 gap-4 mt-2 relative z-10">
          <div className="bg-white/5 dark:bg-black/30 p-5 rounded-[1.5rem] border border-white/10 flex flex-col items-center backdrop-blur-md shadow-inner transition-all hover:bg-white/[0.08]">
            <div className="flex items-center gap-1.5 mb-2">
               <Clock size={14} className="text-md3-gray/60" />
               <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.15em]">Poločas (T½)</span>
            </div>
            <span className="text-2xl font-black text-theme-text drop-shadow-sm">{substance.halfLife || '—'}<span className="text-sm opacity-60 ml-0.5">h</span></span>
          </div>
          <div className="bg-white/5 dark:bg-black/30 p-5 rounded-[1.5rem] border border-white/10 flex flex-col items-center backdrop-blur-md shadow-inner transition-all hover:bg-white/[0.08]">
            <div className="flex items-center gap-1.5 mb-2">
               <Zap size={14} className="text-md3-gray/60" />
               <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.15em]">Nástup (Tmax)</span>
            </div>
            <span className="text-2xl font-black text-theme-text drop-shadow-sm">{substance.tmax || '—'}<span className="text-sm opacity-60 ml-0.5">h</span></span>
          </div>
        </div>
      </div>

      {/* Consumption Chart */}
      {substanceDoses.length > 0 && (
        <div className="bg-white/5 dark:bg-black/20 backdrop-blur-[40px] p-6 rounded-[2rem] border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.12)] space-y-6">
          <h3 className="text-[11px] font-bold text-white/60 uppercase tracking-[0.2em] flex items-center gap-2">
            <PieChart size={16} /> Spotřeba v čase
          </h3>
          <div className="h-48 w-full">
            {(() => {
              // Aggregate by day
              const dailyData: Record<string, number> = {};
              substanceDoses.forEach(d => {
                const date = new Date(d.timestamp).toLocaleDateString('cs-CZ');
                dailyData[date] = (dailyData[date] || 0) + d.amount;
              });
              const chartData = Object.entries(dailyData)
                .map(([date, amount]) => ({ date, amount: parseFloat(amount.toFixed(2)) }))
                .slice(-14); // Last 14 active days
              
              return (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    {settings.chartGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" vertical={false} />}
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                      dy={10}
                      tickFormatter={(val) => val.substring(0, 5)} // Shorten date
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#8e8e93', fontSize: 10, fontWeight: 600 }}
                      width={30}
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(150,150,150,0.05)' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-theme-bg/90 backdrop-blur-md border border-theme-border p-3 rounded-xl shadow-xl">
                              <div className="text-[10px] font-bold text-md3-gray uppercase tracking-widest mb-1">{payload[0].payload.date}</div>
                              <div className="text-sm font-bold text-theme-text">
                                {formatAmount(payload[0].value as number, substance.unit, 1)}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="amount" 
                      fill={substance.color || '#00d1ff'} 
                      radius={[4, 4, 0, 0]} 
                      isAnimationActive={settings.chartAnimation}
                    />
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
          </div>
        </div>
      )}

      {/* Grid of details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Statistics Block */}
        <div className="bg-white/5 dark:bg-black/20 backdrop-blur-[40px] p-6 rounded-[2rem] border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.12)] space-y-6 group hover:bg-white/[0.08] transition-colors relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-md3-primary/10 blur-[40px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <h3 className="text-[11px] font-bold text-white/60 uppercase tracking-[0.2em] flex items-center gap-2 relative z-10">
            <Activity size={16} /> Statistiky
          </h3>
          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="bg-white/5 rounded-[1.2rem] p-4 border border-white/5 shadow-inner">
              <div className="text-[10px] text-white/50 font-bold uppercase tracking-widest mb-1">Celkem užito</div>
              <div className="text-xl font-black text-theme-text drop-shadow-sm">{formatAmount(stats.totalAmount, substance.unit, 1)}</div>
            </div>
            <div className="bg-white/5 rounded-[1.2rem] p-4 border border-white/5 shadow-inner">
              <div className="text-[10px] text-white/50 font-bold uppercase tracking-widest mb-1">Celková cena</div>
              <div className="text-xl font-black text-md3-green drop-shadow-sm">{settings.privacyMode ? '***' : stats.totalCost.toFixed(0)} <span className="text-sm text-md3-green/60">{settings.currency}</span></div>
            </div>
            <div className="bg-white/5 rounded-[1.2rem] p-4 border border-white/5 shadow-inner">
              <div className="text-[10px] text-white/50 font-bold uppercase tracking-widest mb-1">Prům. dávka</div>
              <div className="text-xl font-black text-theme-text drop-shadow-sm">{formatAmount(stats.avgDose, substance.unit, 1)}</div>
            </div>
            <div className="bg-white/5 rounded-[1.2rem] p-4 border border-white/5 shadow-inner">
              <div className="text-[10px] text-white/50 font-bold uppercase tracking-widest mb-1">Záznamů</div>
              <div className="text-xl font-black text-theme-text drop-shadow-sm">{stats.totalDoses}x</div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-5 mt-2 space-y-3 relative z-10">
            <div className="flex justify-between items-center text-sm bg-white/5 px-4 py-2.5 rounded-xl border border-white/5 shadow-sm">
              <span className="text-white/60 font-semibold flex items-center gap-2"><Database size={14}/> Zásoba</span>
              <span className="font-black text-theme-text">{substance.stash !== undefined ? formatAmount(substance.stash, substance.unit, 1) : '–'}</span>
            </div>
            <div className="flex justify-between items-center text-sm bg-white/5 px-4 py-2.5 rounded-xl border border-white/5 shadow-sm">
              <span className="text-white/60 font-semibold flex items-center gap-2"><Clock size={14}/> Poprvé</span>
              <span className="font-black text-theme-text">{stats.firstUse ? new Date(stats.firstUse).toLocaleDateString('cs-CZ') : '–'}</span>
            </div>
            <div className="flex justify-between items-center text-sm bg-white/5 px-4 py-2.5 rounded-xl border border-white/5 shadow-sm">
              <span className="text-white/60 font-semibold flex items-center gap-2"><Clock size={14}/> Naposledy</span>
              <span className="font-black text-theme-text">{stats.lastUse ? new Date(stats.lastUse).toLocaleDateString('cs-CZ') : '–'}</span>
            </div>
          </div>
        </div>

        {/* Pricing / Units Block */}
        <div className="bg-white/5 dark:bg-black/20 backdrop-blur-[40px] p-6 rounded-[2rem] border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.12)] space-y-6 group hover:bg-white/[0.08] transition-colors relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <h3 className="text-[11px] font-bold text-white/60 uppercase tracking-[0.2em] flex items-center gap-2 relative z-10">
            <DollarSign size={16} /> Hodnocení & Ceny
          </h3>
          <div className="space-y-3 relative z-10">
             <div className="flex justify-between items-center text-sm bg-white/5 px-4 py-3 rounded-xl border border-white/5 shadow-sm">
               <span className="text-white/60 font-semibold">Cena za {substance.unit}</span>
               <span className="font-black text-theme-text">{substance.price} {settings.currency}</span>
             </div>
             
             {/* If it has active ingredients, show price per 1g/mg of active ingredient */}
             {substance.activeIngredients && substance.activeIngredients.length > 0 && (
                substance.activeIngredients.map((ai, i) => {
                   const costPerActive = ai.percentage > 0 ? (substance.price / (ai.percentage / 100)) : 0;
                   return (
                     <div key={i} className="flex justify-between items-center text-sm bg-white/5 px-4 py-3 rounded-xl border border-white/5 shadow-sm">
                       <span className="text-white/60 font-semibold">Cena za {substance.unit} {ai.name}</span>
                       <span className="font-black text-theme-text">{costPerActive.toFixed(2)} {settings.currency}</span>
                     </div>
                   );
                })
             )}
             {(!substance.activeIngredients || substance.activeIngredients.length === 0) && substance.activeIngredientName && substance.activeIngredientPercentage && (
                (() => {
                  const costPerActive = (substance.price / (substance.activeIngredientPercentage / 100));
                  return (
                     <div className="flex justify-between items-center text-sm bg-white/5 px-4 py-3 rounded-xl border border-white/5 shadow-sm">
                       <span className="text-white/60 font-semibold">Cena za {substance.unit} {substance.activeIngredientName}</span>
                       <span className="font-black text-theme-text">{costPerActive.toFixed(2)} {settings.currency}</span>
                     </div>
                  );
                })()
             )}

             <div className="flex justify-between items-center text-sm bg-white/5 px-4 py-3 rounded-xl border border-white/5 shadow-sm">
               <span className="text-white/60 font-semibold">Tolerance Rate</span>
               <span className="font-black text-md3-primary">{substance.toleranceRate}%</span>
             </div>
          </div>
        </div>
      </div>
      
      {/* Active Ingredients & Tags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeIngredientsContent}
        
        {substance.tags && substance.tags.length > 0 && (
          <div className="bg-white/5 dark:bg-black/20 backdrop-blur-[40px] p-6 rounded-[2rem] border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.12)] space-y-6 group hover:bg-white/[0.08] transition-colors relative overflow-hidden">
            <div className="absolute right-0 top-0 w-32 h-32 bg-pink-500/10 blur-[40px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <h3 className="text-[11px] font-bold text-white/60 uppercase tracking-[0.2em] flex items-center gap-2 relative z-10">
              <Hash size={16} /> Tagy
            </h3>
            <div className="flex flex-wrap gap-2 relative z-10">
              {substance.tags.map((tag, i) => (
                <span key={i} className="px-3 py-1.5 bg-white/10 border border-white/10 rounded-xl text-xs text-theme-text tracking-wider font-bold uppercase shadow-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Strains */}
      {substance.strains && substance.strains.length > 0 && (
        <div className="bg-white/5 dark:bg-black/20 backdrop-blur-[40px] p-6 rounded-[2rem] border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.12)] space-y-6 group hover:bg-white/[0.08] transition-colors relative overflow-hidden">
          <div className="absolute right-0 top-0 w-40 h-40 bg-[var(--md-sys-color-primary)]/10 blur-[50px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <h3 className="text-[11px] font-bold text-white/60 uppercase tracking-[0.2em] flex items-center gap-2 relative z-10">
            <Leaf size={16} /> Druhy ({substance.strains.length})
          </h3>
          <div className="space-y-3 relative z-10">
            {substance.strains.map((strain, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 shadow-sm gap-3">
                <div className="flex items-center gap-3">
                   <div className="w-4 h-4 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)] border border-white/10" style={{ backgroundColor: strain.color || substance.color || '#00d1ff' }} />
                   <div>
                     <div className="font-black text-theme-text tracking-tight">{strain.name}</div>
                     <div className="text-xs text-white/50 font-bold tracking-wider">{strain.price} {settings.currency} / {substance.unit}</div>
                   </div>
                </div>
                {/* Custom active ingredient breakdown for this strain */}
                <div className="flex flex-wrap gap-2 justify-end">
                   {(() => {
                      const actives = strain.activeIngredients && strain.activeIngredients.length > 0 
                                      ? strain.activeIngredients 
                                      : (substance.activeIngredients && substance.activeIngredients.length > 0 ? substance.activeIngredients : []);
                      if (actives.length > 0) {
                        return actives.map((ai, j) => (
                           <div key={j} className="text-[10px] font-black tracking-wider uppercase text-theme-text bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10 shadow-inner">
                             {ai.name} <span className="text-md3-primary ml-1">{ai.percentage.toFixed(1)}%</span>
                           </div>
                        ));
                      }
                      
                      const singleActivePct = strain.activeIngredientPercentage ?? substance.activeIngredientPercentage;
                      if (substance.activeIngredientName && singleActivePct) {
                         return (
                           <div className="text-[10px] font-black tracking-wider uppercase text-theme-text bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/10 shadow-inner">
                             {substance.activeIngredientName} <span className="text-md3-primary ml-1">{singleActivePct.toFixed(1)}%</span>
                           </div>
                         );
                      }
                      
                      return null;
                   })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Effects */}
      {substance.effects && substance.effects.length > 0 && (
        <div className="bg-white/5 dark:bg-black/20 backdrop-blur-[40px] p-6 rounded-[2rem] border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.12)] space-y-6 group hover:bg-white/[0.08] transition-colors relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-cyan-500/10 blur-[40px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          <h3 className="text-[11px] font-bold text-white/60 uppercase tracking-[0.2em] flex items-center gap-2 relative z-10">
            <Percent size={16} /> Typické Účinky
          </h3>
          <div className="space-y-3 relative z-10">
             {substance.effects.map((effect, i) => (
                <div key={i} className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5 shadow-sm">
                  <div className="flex items-center gap-3">
                     <div className={cn(
                       "w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]",
                       effect.valence === 'positive' ? 'bg-emerald-500 text-emerald-500' : effect.valence === 'negative' ? 'bg-red-500 text-red-500' : 'bg-gray-400 text-gray-400'
                     )} />
                     <span className="font-bold text-theme-text">{effect.type}</span>
                  </div>
                  <div className="flex gap-4 text-[11px] font-bold uppercase tracking-wider text-white/60">
                     <span>Síla <span className="text-theme-text bg-white/10 px-2 py-1 rounded ml-1">{effect.intensity}/10</span></span>
                     <span>Délka <span className="text-theme-text bg-white/10 px-2 py-1 rounded ml-1">{effect.duration}h</span></span>
                  </div>
                </div>
             ))}
          </div>
        </div>
      )}

    </div>
  );
}
