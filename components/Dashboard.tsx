
import React, { useState, useMemo } from 'react';
import { AppState, ServiceType } from '../types';
import { SERVICE_OPTIONS } from '../constants';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  AlertTriangle, 
  Wallet, 
  Map, 
  Calendar, 
  Filter, 
  X, 
  Package,
  Layers,
  Target,
  Activity,
  UserCheck,
  ArrowUpRight
} from 'lucide-react';

interface DashboardProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  setActiveTab: (tab: string) => void;
}

type MetricType = 'production' | 'revenue' | 'balance';

const Dashboard: React.FC<DashboardProps> = ({ state, setActiveTab }) => {
  const [activeMetric, setActiveMetric] = useState<MetricType>('production');
  const [selectedService, setSelectedService] = useState<string>('TOTAL');
  const [showFilter, setShowFilter] = useState(false);
  
  const [rangeMonths, setRangeMonths] = useState(6);
  const [endPeriod, setEndPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const COLORS = {
    realized: '#092318',
    goal: '#76994e',
    goalOpacity: 'rgba(118, 153, 78, 0.25)',
    danger: '#ef4444'
  };

  const currentUnit = useMemo(() => {
    if (selectedService === 'TOTAL') return 'm²';
    return selectedService.includes('KM') ? 'KM' : 'm²';
  }, [selectedService]);

  const displayTitle = useMemo(() => {
    if (selectedService === 'TOTAL') return 'PRODUÇÃO GERAL ACUMULADA (m²)';
    const hasUnit = selectedService.includes('(m²)') || selectedService.includes('(KM)') || selectedService.includes('m²') || selectedService.includes('KM');
    return `PRODUÇÃO REALIZADA: ${selectedService}${hasUnit ? '' : ` (${currentUnit})`}`;
  }, [selectedService, currentUnit]);

  const formatNumber = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatMoney = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const monthlySeries = useMemo(() => {
    const months = [];
    const [year, month] = endPeriod.split('-').map(Number);
    
    for (let i = rangeMonths - 1; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const yKey = d.getFullYear();
      const mKey = String(d.getMonth() + 1).padStart(2, '0');
      
      months.push({
        label: d.toLocaleString('pt-BR', { month: 'short' }).toUpperCase(),
        fullName: d.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase(),
        key: `${yKey}-${mKey}` 
      });
    }
    return months;
  }, [endPeriod, rangeMonths]);

  const chartData = useMemo(() => {
    return monthlySeries.map(m => {
      let prod = 0;
      let rev = 0;
      
      state.areas.forEach(area => {
        const finishedInThisMonth = area.status === 'finished' && area.endDate?.startsWith(m.key);
        
        if (finishedInThisMonth) {
          (area.services || []).forEach(s => {
            if (selectedService === 'TOTAL' || s.type === selectedService) {
              prod += s.areaM2;
              rev += s.totalValue;
            }
          });
        }
      });

      const inc = state.cashIn.filter(c => c.date?.startsWith(m.key)).reduce((acc, c) => acc + c.value, 0);
      const out = state.cashOut.filter(c => c.date?.startsWith(m.key)).reduce((acc, c) => acc + c.value, 0);
      
      const monthlyGoal = state.monthlyGoals[m.key] || { production: 0, revenue: 0 };
      const productionGoal = selectedService === 'TOTAL' 
        ? monthlyGoal.production 
        : (state.serviceGoals[selectedService as ServiceType] || 0);

      return {
        name: m.label,
        fullName: m.fullName,
        production: prod,
        productionGoal: productionGoal,
        revenue: rev,
        revenueGoal: monthlyGoal.revenue,
        balance: inc - out,
        income: inc,
        expense: out
      };
    });
  }, [state.areas, state.cashIn, state.cashOut, monthlySeries, state.monthlyGoals, state.serviceGoals, selectedService]);

  // Ranking de Produtividade por Responsável
  const responsibleRanking = useMemo(() => {
    const rankingMap: Record<string, { id: string, name: string, production: number, revenue: number }> = {};
    
    state.areas.forEach(area => {
      // Consideramos apenas O.S. finalizadas no mês de referência atual (endPeriod)
      const isFinishedInPeriod = area.status === 'finished' && area.endDate?.startsWith(endPeriod);
      
      if (isFinishedInPeriod) {
        const respId = area.responsibleEmployeeId || 'unassigned';
        const respName = respId === 'unassigned' 
          ? 'SEM RESPONSÁVEL' 
          : (state.employees.find(e => e.id === respId)?.name || 'EX-COLABORADOR');

        if (!rankingMap[respId]) {
          rankingMap[respId] = { id: respId, name: respName, production: 0, revenue: 0 };
        }

        (area.services || []).forEach(s => {
          if (selectedService === 'TOTAL' || s.type === selectedService) {
            rankingMap[respId].production += Number(s.areaM2) || 0;
            rankingMap[respId].revenue += Number(s.totalValue) || 0;
          }
        });
      }
    });

    return Object.values(rankingMap).sort((a, b) => b.revenue - a.revenue);
  }, [state.areas, state.employees, endPeriod, selectedService]);

  const periodTotals = useMemo(() => {
    const filterKey = endPeriod; 
    const currentMonthGoal = state.monthlyGoals[filterKey] || { production: 0, revenue: 0 };
    
    let prodMonth = 0;
    let revMonth = 0;
    
    state.areas.forEach(area => {
      const isFinishedInPeriod = area.status === 'finished' && area.endDate?.startsWith(filterKey);
      
      if (isFinishedInPeriod) {
        (area.services || []).forEach(s => {
          if (selectedService === 'TOTAL' || s.type === selectedService) {
            prodMonth += s.areaM2;
            revMonth += s.totalValue;
          }
        });
      }
    });

    const activeDays = new Set();
    state.attendanceRecords.forEach(record => {
      if (record.date.startsWith(filterKey) && (record.status === 'present' || record.status === 'partial')) {
        activeDays.add(record.date);
      }
    });
    
    const workedDaysCount = activeDays.size || 0;
    const avgDailyProduction = workedDaysCount > 0 ? prodMonth / workedDaysCount : 0;

    const goalProd = selectedService === 'TOTAL' 
      ? currentMonthGoal.production 
      : (state.serviceGoals[selectedService as ServiceType] || 0);

    return {
      production: prodMonth,
      revenue: revMonth,
      avgDailyProduction,
      workedDaysCount,
      balance: state.cashIn.filter(c => c.date?.startsWith(filterKey)).reduce((acc, c) => acc + c.value, 0) - state.cashOut.filter(c => c.date?.startsWith(filterKey)).reduce((acc, c) => acc + c.value, 0),
      inventoryValue: state.inventory.reduce((acc, item) => acc + ((item.currentQty || 0) * (item.unitValue || 0)), 0),
      goalProd: goalProd,
      goalRev: currentMonthGoal.revenue,
      prodPercentage: goalProd > 0 ? (prodMonth / goalProd) * 100 : 0,
      revPercentage: currentMonthGoal.revenue > 0 ? (revMonth / currentMonthGoal.revenue) * 100 : 0
    };
  }, [state.areas, state.cashIn, state.cashOut, state.attendanceRecords, state.monthlyGoals, state.serviceGoals, state.inventory, endPeriod, selectedService]);

  const stats = [
    { 
      id: 'production', 
      label: selectedService === 'TOTAL' ? `PRODUÇÃO MENSAL (${currentUnit})` : `PRODUÇÃO: ${selectedService.split(' (')[0]}`, 
      value: `${formatNumber(periodTotals.production)} ${currentUnit}`, 
      progress: periodTotals.prodPercentage, 
      icon: Map, 
      color: 'text-[#0c2a1c]', 
      bg: 'bg-[#eaf0e3]' 
    },
    { 
      id: 'daily_avg', 
      label: 'MÉDIA PROD. DIÁRIA', 
      value: `${formatNumber(periodTotals.avgDailyProduction)} ${currentUnit}`, 
      subValue: `Base: ${periodTotals.workedDaysCount} dias úteis`,
      icon: Activity, 
      color: 'text-[#4b6f34]', 
      bg: 'bg-[#f0f4ea]' 
    },
    { id: 'revenue', label: 'FATURAMENTO MÊS', value: formatMoney(periodTotals.revenue), progress: periodTotals.revPercentage, icon: TrendingUp, color: 'text-[#16462d]', bg: 'bg-[#e7f3ec]' },
    { id: 'stock', label: 'ESTOQUE CRÍTICO', value: `${state.inventory.filter(i => i.currentQty <= i.minQty).length} itens`, icon: AlertTriangle, color: 'text-amber-700', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0c2a1c] tracking-tight uppercase">Monitoramento Estratégico</h2>
          <p className="text-[10px] text-[#4b6f34] font-bold uppercase tracking-widest">Cálculo baseado em O.S. Finalizadas e Frequência</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
             <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Layers size={14} />
             </div>
             <select 
              className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider outline-none focus:border-[#7ea24e] shadow-sm appearance-none cursor-pointer truncate"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
             >
                <option value="TOTAL">Produção Geral (m²)</option>
                {SERVICE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
             </select>
          </div>

          <div className="relative w-full sm:w-auto">
            <button 
              onClick={() => setShowFilter(!showFilter)}
              className="w-full flex items-center justify-between md:justify-start gap-3 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm hover:border-[#7ea24e] transition-all group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Calendar size={16} className="text-[#4b6f34] shrink-0" />
                <span className="text-[10px] font-black text-[#0c2a1c] uppercase tracking-wider truncate max-w-[200px]">
                  MÊS: {monthlySeries[monthlySeries.length-1].fullName}
                </span>
              </div>
              <Filter size={14} className="text-slate-400 shrink-0" />
            </button>

            {showFilter && (
              <div className="absolute right-0 top-full mt-2 w-full md:w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] p-6 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[10px] font-black text-[#010a1b] uppercase tracking-[0.2em]">Configurar Período</h4>
                  <button onClick={() => setShowFilter(false)} className="text-slate-300 hover:text-[#010a1b]"><X size={16} /></button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-[#2e3545] uppercase tracking-widest">Mês Referência</label>
                    <input type="month" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold outline-none focus:border-[#010a1b]" value={endPeriod} onChange={(e) => setEndPeriod(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-[#2e3545] uppercase tracking-widest">Janela do Gráfico</label>
                    <select className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold outline-none focus:border-[#010a1b]" value={rangeMonths} onChange={(e) => setRangeMonths(Number(e.target.value))}>
                      <option value={3}>3 Meses</option>
                      <option value={6}>6 Meses</option>
                      <option value={12}>12 Meses</option>
                    </select>
                  </div>
                  <button onClick={() => setShowFilter(false)} className="w-full bg-[#010a1b] text-white py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest">Aplicar Filtros</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <button 
            key={stat.id} 
            onClick={() => {
              if (stat.id === 'stock') setActiveTab('inventory');
              else if (stat.id === 'revenue') setActiveMetric('revenue');
              else setActiveMetric('production');
            }}
            className={`bg-white p-6 border text-left transition-all relative overflow-hidden group rounded-[32px] ${activeMetric === stat.id ? 'border-[#7ea24e] ring-4 ring-[#7ea24e]/10 shadow-lg' : 'border-slate-200 hover:border-[#7ea24e]'}`}
          >
            <div className="flex justify-between items-start mb-4">
              <span className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}><stat.icon size={20} /></span>
              {stat.progress !== undefined && (
                <span className={`text-[10px] font-black ${stat.progress >= 100 ? 'text-[#16462d]' : 'text-[#4b6f34]'}`}>
                   {stat.progress.toFixed(0)}%
                </span>
              )}
            </div>
            <p className="text-[9px] font-black text-[#4b6f34] uppercase tracking-wider mb-1 truncate">{stat.label}</p>
            <p className="text-xl font-black text-[#0c2a1c] truncate">{stat.value}</p>
            {(stat as any).subValue && (
              <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 truncate">{(stat as any).subValue}</p>
            )}
            {stat.progress !== undefined && (
              <div className="mt-4 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${stat.progress >= 100 ? 'bg-[#16462d]' : 'bg-[#7ea24e]'}`} style={{ width: `${Math.min(stat.progress, 100)}%` }} />
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm min-h-[400px] w-full">
            <h3 className="font-black text-[10px] text-[#2e3545] uppercase tracking-[0.2em] mb-8">
              {displayTitle}
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={10} fontWeights="900" stroke="#94a3b8" axisLine={false} tickLine={false} />
                  <YAxis 
                    fontSize={10} 
                    fontWeight="900" 
                    stroke="#94a3b8" 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(value) => value.toLocaleString('pt-BR')}
                  />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}} 
                    formatter={(value: number) => [formatNumber(value), ""]}
                    contentStyle={{ border: 'none', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: '900', color: '#010a1b', textTransform: 'uppercase' }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
                  
                  <Bar 
                    name="Realizado" 
                    dataKey={activeMetric} 
                    fill={COLORS.realized}
                    radius={[4, 4, 0, 0]} 
                    barSize={20}
                  >
                    {chartData.map((entry, index) => {
                      let color = COLORS.realized;
                      if(activeMetric === 'balance') color = entry.balance >= 0 ? COLORS.goal : COLORS.danger;
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Bar>

                  {(activeMetric === 'production' || activeMetric === 'revenue') && (
                    <Bar 
                      name="Meta" 
                      dataKey={activeMetric === 'production' ? 'productionGoal' : 'revenueGoal'} 
                      fill={COLORS.goal} 
                      fillOpacity={0.4} 
                      radius={[4, 4, 0, 0]} 
                      barSize={20} 
                    />
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* NOVO: Produtividade por Responsável (Substituto das Equipes) */}
          <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
             <div className="flex items-center justify-between mb-8">
               <div>
                  <h3 className="font-black text-[10px] text-[#2e3545] uppercase tracking-[0.2em] flex items-center gap-2">
                    <UserCheck size={16} className="text-emerald-500" /> Desempenho por Colaborador Responsável
                  </h3>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Somas baseadas em O.S. finalizadas no período</p>
               </div>
               <span className="text-[9px] font-black text-slate-500 uppercase bg-slate-100 px-3 py-1 rounded-lg">Mês: {monthlySeries[monthlySeries.length-1].label}</span>
             </div>

             <div className="space-y-6">
                {responsibleRanking.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase italic">Nenhuma produção vinculada e finalizada neste mês</p>
                  </div>
                ) : (
                  responsibleRanking.map((resp, idx) => {
                    const maxRevenue = Math.max(...responsibleRanking.map(r => r.revenue));
                    const percentage = maxRevenue > 0 ? (resp.revenue / maxRevenue) * 100 : 0;
                    
                    return (
                      <div key={resp.id} className="group">
                        <div className="flex justify-between items-end mb-2">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shadow-lg">
                                {idx + 1}
                              </div>
                              <div>
                                 <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{resp.name}</p>
                                 <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Responsável Técnico</p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className="text-[11px] font-black text-emerald-600">{formatMoney(resp.revenue)}</p>
                              <p className="text-[9px] font-black text-slate-500">{formatNumber(resp.production)} {currentUnit}</p>
                           </div>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                           <div 
                            className={`h-full transition-all duration-1000 ${resp.id === 'unassigned' ? 'bg-slate-400' : 'bg-emerald-500'}`} 
                            style={{ width: `${percentage}%` }} 
                           />
                        </div>
                      </div>
                    );
                  })
                )}
             </div>
          </div>
        </div>

        <div className="bg-[#071a11] text-white rounded-[40px] p-8 sm:p-10 shadow-2xl space-y-8 sm:space-y-10 flex flex-col border border-[#7ea24e]/20">
          <div className="flex items-center gap-3">
            <TrendingUp size={24} className="text-[#7ea24e] shrink-0" />
            <h3 className="font-black text-xs uppercase tracking-[0.2em] truncate">Desempenho da Produção</h3>
          </div>
          
          <div className="space-y-6 sm:space-y-8 flex-1">
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-[10px] font-black">
                <span className="text-[#9bb779] uppercase tracking-wider truncate">Produção Realizada</span>
                <span className="shrink-0">{periodTotals.prodPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#7ea24e] transition-all duration-700 shadow-[0_0_12px_rgba(126,162,78,0.6)]" style={{ width: `${Math.min(periodTotals.prodPercentage, 100)}%` }} />
              </div>
              <div className="flex flex-wrap justify-between gap-1 text-[8px] font-black text-slate-400 uppercase">
                <span>Realizado: {formatNumber(periodTotals.production)} {currentUnit}</span>
                <span>Meta: {formatNumber(periodTotals.goalProd)} {currentUnit}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-[10px] font-black">
                <span className="text-[#9bb779] uppercase tracking-wider truncate">Faturamento Auditado</span>
                <span className="shrink-0">{periodTotals.revPercentage.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#4b6f34] transition-all duration-700 shadow-[0_0_12px_rgba(75,111,52,0.6)]" style={{ width: `${Math.min(periodTotals.revPercentage, 100)}%` }} />
              </div>
              <p className="text-[8px] font-black text-slate-400 text-right uppercase truncate">Meta: {formatMoney(periodTotals.goalRev)}</p>
            </div>

            <div className="pt-6 border-t border-white/10">
               <p className="text-[9px] font-black text-[#9bb779] uppercase mb-1 tracking-widest truncate">Valor Imobilizado (Estoque)</p>
               <p className="text-2xl font-black text-white tracking-tighter truncate">{formatMoney(state.inventory.reduce((acc, item) => acc + ((item.currentQty || 0) * (item.unitValue || 0)), 0))}</p>
            </div>
          </div>

          <button 
            onClick={() => setActiveTab('production')}
            className="w-full py-4.5 bg-[#7ea24e] hover:bg-[#6c8e38] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 truncate"
          >
             Acessar Gestão de Produção
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
