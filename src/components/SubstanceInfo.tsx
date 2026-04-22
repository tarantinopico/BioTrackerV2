import React, { useMemo } from 'react';
import { Substance, Dose, UserSettings } from '../types';
import { formatTime, formatAmount, cn } from '../lib/utils';
import { getIconComponent } from './Substances';
import { ChevronLeft, Edit2, Activity, Database, DollarSign, PieChart, Star, Leaf, Clock, Hash, Percent, FileText } from 'lucide-react';
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
      <div className="bg-theme-subtle p-4 rounded-2xl border border-theme-border">
        <h3 className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-4 flex items-center gap-2">
          <Activity size={14} /> Specifikace účinných látek
        </h3>
        <div className="space-y-3">
          {defaultActives.length > 0 ? (
            defaultActives.map((ai, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="font-bold text-theme-text">{ai.name}</span>
                <span className="font-mono text-md3-primary">{ai.percentage.toFixed(2)} %</span>
              </div>
            ))
          ) : (
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-theme-text">{substance.activeIngredientName}</span>
              <span className="font-mono text-md3-primary">{substance.activeIngredientPercentage?.toFixed(2)} %</span>
            </div>
          )}
        </div>
      </div>
    );
  }, [substance]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 relative z-10 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-md3-gray hover:text-theme-text transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="font-bold">Zpět</span>
        </button>
        <button 
          onClick={onEdit}
          className="bg-md3-primary/10 text-md3-primary px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-md3-primary/20 transition-all active:scale-95"
        >
          <Edit2 size={16} /> Upravit
        </button>
      </div>

      {/* Main Info Card */}
      <div className="p-6 rounded-[2rem] bg-theme-subtle backdrop-blur-md border border-theme-border flex flex-col items-center relative overflow-hidden shadow-lg">
        <div className="absolute top-0 w-full h-1" style={{ backgroundColor: substance.color || '#00d1ff' }} />
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[50%] bg-white/5 blur-[80px] rounded-full pointer-events-none" style={{ backgroundColor: substance.color ? `${substance.color}22` : undefined }} />
        
        <div className="w-20 h-20 bg-theme-bg rounded-2xl flex items-center justify-center border border-theme-border mb-4 shadow-inner relative">
          <IconComponent size={36} style={{ color: substance.color || '#00d1ff' }} />
          {substance.isFavorite && (
             <div className="absolute -top-2 -right-2 bg-amber-400 text-amber-900 p-1 rounded-full shadow-lg">
               <Star size={12} fill="currentColor" />
             </div>
          )}
        </div>
        
        <h1 className="text-3xl font-black text-theme-text tracking-tight mb-1">{substance.name}</h1>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded bg-theme-bg border border-theme-border text-md3-gray">
            {substance.category}
          </span>
          {substance.isIllegal && (
             <span className="text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-500">
               Nelegální
             </span>
          )}
          {substance.isPrescription && (
             <span className="text-[10px] uppercase font-black tracking-widest px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
               Na předpis
             </span>
          )}
        </div>
        
        {substance.description && (
          <p className="text-sm text-md3-gray text-center max-w-sm italic mb-6">
            "{substance.description}"
          </p>
        )}

        <div className="w-full grid grid-cols-2 gap-3 mt-4">
          <div className="bg-theme-bg p-3 rounded-xl border border-theme-border flex flex-col items-center">
            <span className="text-[10px] font-bold text-md3-gray uppercase tracking-widest">Poločas (T½)</span>
            <span className="text-lg font-black text-theme-text">{substance.halfLife}h</span>
          </div>
          <div className="bg-theme-bg p-3 rounded-xl border border-theme-border flex flex-col items-center">
            <span className="text-[10px] font-bold text-md3-gray uppercase tracking-widest">Nástup (Tmax)</span>
            <span className="text-lg font-black text-theme-text">{substance.tmax}h</span>
          </div>
        </div>
      </div>

      {/* Consumption Chart */}
      {substanceDoses.length > 0 && (
        <div className="bg-theme-subtle p-5 rounded-[2rem] border border-theme-border space-y-4">
          <h3 className="text-xs font-bold text-md3-gray uppercase tracking-widest flex items-center gap-2">
            <PieChart size={14} /> Spotřeba v čase
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
        <div className="bg-theme-subtle p-5 rounded-[2rem] border border-theme-border space-y-4">
          <h3 className="text-xs font-bold text-md3-gray uppercase tracking-widest flex items-center gap-2">
            <PieChart size={14} /> Statistiky
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-md3-gray font-bold uppercase">Celkem užito</div>
              <div className="text-lg font-black text-theme-text">{formatAmount(stats.totalAmount, substance.unit, 1)}</div>
            </div>
            <div>
              <div className="text-[10px] text-md3-gray font-bold uppercase">Celková cena</div>
              <div className="text-lg font-black text-theme-text">{settings.privacyMode ? '***' : stats.totalCost.toFixed(0)} <span className="text-sm text-md3-gray">{settings.currency}</span></div>
            </div>
            <div>
              <div className="text-[10px] text-md3-gray font-bold uppercase">Průměrná dávka</div>
              <div className="text-lg font-black text-theme-text">{formatAmount(stats.avgDose, substance.unit, 1)}</div>
            </div>
            <div>
              <div className="text-[10px] text-md3-gray font-bold uppercase">Počet záznamů</div>
              <div className="text-lg font-black text-theme-text">{stats.totalDoses}x</div>
            </div>
          </div>
          <div className="border-t border-theme-border pt-3 mt-3">
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-md3-gray font-bold">Zásoba</span>
              <span className="font-bold text-theme-text">{substance.stash !== undefined ? formatAmount(substance.stash, substance.unit, 1) : '–'}</span>
            </div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="text-md3-gray font-bold">Poprvé</span>
              <span className="font-bold text-theme-text">{stats.firstUse ? formatTime(stats.firstUse, settings) + ` (${new Date(stats.firstUse).toLocaleDateString('cs-CZ')})` : '–'}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-md3-gray font-bold">Naposledy</span>
              <span className="font-bold text-theme-text">{stats.lastUse ? formatTime(stats.lastUse, settings) + ` (${new Date(stats.lastUse).toLocaleDateString('cs-CZ')})` : '–'}</span>
            </div>
          </div>
        </div>

        {/* Pricing / Units Block */}
        <div className="bg-theme-subtle p-5 rounded-[2rem] border border-theme-border space-y-4">
          <h3 className="text-xs font-bold text-md3-gray uppercase tracking-widest flex items-center gap-2">
            <DollarSign size={14} /> Hodnocení & Ceny
          </h3>
          <div className="space-y-3">
             <div className="flex justify-between items-center text-sm border-b border-theme-border pb-2">
               <span className="text-md3-gray font-bold">Cena za {substance.unit}</span>
               <span className="font-bold text-theme-text">{substance.price} {settings.currency}</span>
             </div>
             
             {/* If it has active ingredients, show price per 1g/mg of active ingredient */}
             {substance.activeIngredients && substance.activeIngredients.length > 0 && (
                substance.activeIngredients.map((ai, i) => {
                   const costPerActive = ai.percentage > 0 ? (substance.price / (ai.percentage / 100)) : 0;
                   return (
                     <div key={i} className="flex justify-between items-center text-sm border-b border-theme-border pb-2">
                       <span className="text-md3-gray font-bold">Cena za {substance.unit} {ai.name}</span>
                       <span className="font-bold text-theme-text">{costPerActive.toFixed(2)} {settings.currency}</span>
                     </div>
                   );
                })
             )}
             {(!substance.activeIngredients || substance.activeIngredients.length === 0) && substance.activeIngredientName && substance.activeIngredientPercentage && (
                (() => {
                  const costPerActive = (substance.price / (substance.activeIngredientPercentage / 100));
                  return (
                     <div className="flex justify-between items-center text-sm border-b border-theme-border pb-2">
                       <span className="text-md3-gray font-bold">Cena za {substance.unit} {substance.activeIngredientName}</span>
                       <span className="font-bold text-theme-text">{costPerActive.toFixed(2)} {settings.currency}</span>
                     </div>
                  );
                })()
             )}

             <div className="flex justify-between items-center text-sm">
               <span className="text-md3-gray font-bold">Tolerance Rate</span>
               <span className="font-bold text-theme-text">{substance.toleranceRate}%</span>
             </div>
          </div>
        </div>
      </div>
      
      {/* Active Ingredients & Tags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeIngredientsContent}
        
        {substance.tags && substance.tags.length > 0 && (
          <div className="bg-theme-subtle p-4 rounded-2xl border border-theme-border">
            <h3 className="text-xs font-bold text-md3-gray uppercase tracking-widest mb-4 flex items-center gap-2">
              <Hash size={14} /> Tagy
            </h3>
            <div className="flex flex-wrap gap-2">
              {substance.tags.map((tag, i) => (
                <span key={i} className="px-3 py-1 bg-theme-bg border border-theme-border rounded-lg text-sm text-theme-text font-bold uppercase">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Strains */}
      {substance.strains && substance.strains.length > 0 && (
        <div className="bg-theme-subtle p-5 rounded-[2rem] border border-theme-border space-y-4">
          <h3 className="text-xs font-bold text-md3-gray uppercase tracking-widest flex items-center gap-2">
            <Leaf size={14} /> Druhy ({substance.strains.length})
          </h3>
          <div className="space-y-3">
            {substance.strains.map((strain, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-theme-bg rounded-xl border border-theme-border gap-2">
                <div className="flex items-center gap-3">
                   <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: strain.color || substance.color || '#00d1ff' }} />
                   <div>
                     <div className="font-bold text-theme-text text-sm">{strain.name}</div>
                     <div className="text-xs text-md3-gray font-mono">{strain.price} {settings.currency} / {substance.unit}</div>
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
                           <div key={j} className="text-[10px] font-bold text-theme-text bg-theme-subtle px-2 py-1 rounded border border-theme-border">
                             {ai.name}: <span className="text-md3-primary">{ai.percentage.toFixed(1)}%</span>
                           </div>
                        ));
                      }
                      
                      const singleActivePct = strain.activeIngredientPercentage ?? substance.activeIngredientPercentage;
                      if (substance.activeIngredientName && singleActivePct) {
                         return (
                           <div className="text-[10px] font-bold text-theme-text bg-theme-subtle px-2 py-1 rounded border border-theme-border">
                             {substance.activeIngredientName}: <span className="text-md3-primary">{singleActivePct.toFixed(1)}%</span>
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
        <div className="bg-theme-subtle p-5 rounded-[2rem] border border-theme-border space-y-4">
          <h3 className="text-xs font-bold text-md3-gray uppercase tracking-widest flex items-center gap-2">
            <Percent size={14} /> Typické Účinky
          </h3>
          <div className="space-y-3">
             {substance.effects.map((effect, i) => (
                <div key={i} className="flex justify-between items-center bg-theme-bg p-3 rounded-xl border border-theme-border">
                  <div className="flex items-center gap-2">
                     <span className={cn(
                       "w-2 h-2 rounded-full",
                       effect.valence === 'positive' ? 'bg-emerald-500' : effect.valence === 'negative' ? 'bg-red-500' : 'bg-gray-400'
                     )} />
                     <span className="font-bold text-theme-text text-sm">{effect.type}</span>
                  </div>
                  <div className="flex gap-4 text-xs">
                     <span className="text-md3-gray">Síla: <span className="font-bold text-theme-text">{effect.intensity}/10</span></span>
                     <span className="text-md3-gray">Délka: <span className="font-bold text-theme-text">{effect.duration}h</span></span>
                  </div>
                </div>
             ))}
          </div>
        </div>
      )}

    </div>
  );
}
