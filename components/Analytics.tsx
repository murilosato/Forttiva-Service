
import React, { useState, useMemo, useEffect } from 'react';
import { AppState, AttendanceRecord, Employee } from '../types';
import { 
  Printer, Search, Calendar, FileText, User, Hash, Smartphone, Database, TableProperties,
  Users, DollarSign, Edit2, Save, Loader2, Clock, CheckCircle2, MapPin, X, BarChart3, Layers, Gift, Wallet
} from 'lucide-react';
import { dbSave, fetchCompleteCompanyData } from '../lib/supabase';

interface AnalyticsProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

const Analytics: React.FC<AnalyticsProps> = ({ state, setState, notify }) => {
  const [viewMode, setViewMode] = useState<'employees' | 'production'>('employees');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyActive, setOnlyActive] = useState(true);
  const [showPrintView, setShowPrintView] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [editingValue, setEditingValue] = useState('');
  const [editingDiscount, setEditingDiscount] = useState('');
  const [editingBonus, setEditingBonus] = useState('');
  const [editingObservation, setEditingObservation] = useState('');

  const [showFinanceModal, setShowFinanceModal] = useState(false);
  const [financeTitle, setFinanceTitle] = useState('');
  const [financeCategory, setFinanceCategory] = useState('');

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const formatMoney = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (dateStr: string) => dateStr.split('-').reverse().join('/');
  const isWithinRange = (dateStr: string) => dateStr >= startDate && dateStr <= endDate;

  // Função para formatar números para o CSV (Sem milhar, vírgula decimal)
  const formatNumberForCSV = (value: number, decimals: number = 2) => {
    return value.toLocaleString('pt-BR', {
      useGrouping: false,
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals
    });
  };

  const getVirtualStatus = (record: AttendanceRecord): AttendanceRecord['status'] => {
    if (record.status !== 'absent') return record.status;
    const obs = record.discountObservation || '';
    if (obs.startsWith('[AT]')) return 'atestado';
    if (obs.startsWith('[FJ]')) return 'justified';
    if (obs.startsWith('[FE]')) return 'vacation';
    return 'absent';
  };

  const getStatusShorthand = (virtualStatus: AttendanceRecord['status'], emp: Employee, record: AttendanceRecord) => {
    switch(virtualStatus) {
      case 'present': return 'P';
      case 'partial': return 'H';
      case 'absent': return 'F';
      case 'atestado': return 'AT';
      case 'justified': return 'FJ';
      case 'vacation': return 'FE';
      default: return '-';
    }
  };

  const getStatusColorClass = (virtualStatus: AttendanceRecord['status']) => {
    switch(virtualStatus) {
      case 'present': return 'bg-emerald-50 text-emerald-600';
      case 'partial': return 'bg-amber-50 text-amber-600';
      case 'absent': return 'bg-rose-50 text-rose-600';
      case 'atestado': return 'bg-purple-50 text-purple-600';
      case 'justified': return 'bg-sky-50 text-sky-600';
      case 'vacation': return 'bg-amber-400/10 text-amber-600';
      default: return 'bg-slate-50 text-slate-400';
    }
  };

  const downloadCSV = (filename: string, content: string) => {
    const blob = new Blob(["\ufeff" + content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportInventory = () => {
    const headers = ["ID", "ITEM", "CATEGORIA", "QTD ATUAL", "VALOR UN", "TOTAL EM ESTOQUE"];
    const rows = state.inventory.map(i => [
      i.id, 
      i.name, 
      i.category, 
      formatNumberForCSV(i.currentQty, 2), 
      formatNumberForCSV(i.unitValue || 0, 2), 
      formatNumberForCSV((i.currentQty * (i.unitValue || 0)), 2)
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
    downloadCSV("Relatorio_Estoque", csvContent);
  };

  const exportEmployees = () => {
    const headers = ["ID", "NOME", "CARGO", "STATUS", "DIARIA PADRAO", "CPF", "MODALIDADE", "CARGA HORARIA"];
    const rows = state.employees.map(e => [
      e.id, 
      e.name, 
      e.role, 
      e.status, 
      formatNumberForCSV(e.defaultValue || 0, 2), 
      e.cpf || "", 
      e.paymentModality, 
      e.workload || ""
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
    downloadCSV("Relatorio_Equipe", csvContent);
  };

  const exportFinance = () => {
    const headers = ["DATA", "TIPO", "REFERENCIA", "CATEGORIA", "VALOR"];
    const rowsIn = state.cashIn.map(i => [i.date, "ENTRADA", i.reference, i.category, formatNumberForCSV(i.value, 2)]);
    const rowsOut = state.cashOut.map(o => [o.date, "SAIDA", o.reference, o.category, formatNumberForCSV(o.value, 2)]);
    const allRows = [...rowsIn, ...rowsOut].sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    const csvContent = [headers, ...allRows].map(e => e.join(";")).join("\n");
    downloadCSV("Relatorio_Financeiro", csvContent);
  };

  const exportProduction = () => {
    const headers = ["DATA", "O.S.", "TIPO SERVICO", "QUANTIDADE", "VALOR UN", "VALOR TOTAL"];
    const rows: any[] = [];
    state.areas.forEach(area => {
      (area.services || []).forEach(s => {
        rows.push([
          s.serviceDate, 
          area.name, 
          s.type, 
          formatNumberForCSV(s.areaM2, 2), 
          formatNumberForCSV(s.unitValue || 0, 2), 
          formatNumberForCSV(s.totalValue || 0, 2)
        ]);
      });
    });
    const csvContent = [headers, ...rows].sort((a, b) => String(a[0]).localeCompare(String(b[0]))).map(e => e.join(";")).join("\n");
    downloadCSV("Relatorio_Producao", csvContent);
  };

  const refreshData = async () => {
    if (state.currentUser?.companyId) {
      const data = await fetchCompleteCompanyData(state.currentUser.companyId);
      if (data) setState(prev => ({ ...prev, ...data }));
    }
  };

  const filteredEmployees = state.employees.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = onlyActive ? e.status === 'active' : true;
    return matchesSearch && matchesStatus;
  });
  const selectedEmployee = state.employees.find(e => e.id === selectedEmployeeId);
  
  const attendanceHistory = useMemo(() => {
    return state.attendanceRecords
      .filter(r => r.employeeId === selectedEmployeeId && isWithinRange(r.date))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [state.attendanceRecords, selectedEmployeeId, startDate, endDate]);

  const productionSummary = useMemo(() => {
    const data: any[] = [];
    state.areas.forEach(area => {
        (area.services || []).forEach(s => {
            if (s.serviceDate >= startDate && s.serviceDate <= endDate) {
                data.push({
                    date: s.serviceDate,
                    area: area.name,
                    type: s.type,
                    qty: Number(s.areaM2),
                    val: Number(s.unitValue),
                    total: Number(s.totalValue)
                });
            }
        });
    });
    return data.sort((a, b) => a.date.localeCompare(b.date));
  }, [state.areas, startDate, endDate]);

  // Cálculos de Totais - Ajustado para incluir Bônus
  const { totalBaseValue, totalDiscounts, totalBonuses, totalToPay } = useMemo(() => {
    const pendingRecords = attendanceHistory.filter(r => r.paymentStatus !== 'pago');
    const base = pendingRecords.reduce((acc, r) => acc + r.value, 0);
    const discounts = pendingRecords.reduce((acc, r) => acc + (r.discountValue || 0), 0);
    const bonuses = pendingRecords.reduce((acc, r) => acc + (r.bonusValue || 0), 0);
    return {
      totalBaseValue: base,
      totalDiscounts: discounts,
      totalBonuses: bonuses,
      totalToPay: base + bonuses - discounts
    };
  }, [attendanceHistory]);

  const handlePrint = () => {
    setShowPrintView(true);
    setTimeout(() => {
      window.print();
      if (selectedEmployee?.paymentModality !== 'CLT' && totalToPay > 0) {
        setFinanceTitle(`ACERTO: ${selectedEmployee?.name} - ${formatDate(startDate)} a ${formatDate(endDate)}`);
        setFinanceCategory('Salários');
        setShowFinanceModal(true);
      }
    }, 1000);
  };

  const handleSaveValue = async (record: AttendanceRecord) => {
    const newVal = parseFloat(editingValue.replace(',', '.'));
    const newDiscount = parseFloat(editingDiscount.replace(',', '.'));
    const newBonus = parseFloat(editingBonus.replace(',', '.'));
    setIsLoading(true);
    try {
      await dbSave('attendance_records', { 
        ...record, 
        value: isNaN(newVal) ? record.value : newVal,
        discountValue: isNaN(newDiscount) ? 0 : newDiscount,
        bonusValue: isNaN(newBonus) ? 0 : newBonus,
        discountObservation: editingObservation
      });
      await refreshData();
      setEditingRecordId(null);
      notify("Alterações salvas!");
    } catch (e) { notify("Erro ao salvar", "error"); } finally { setIsLoading(false); }
  };

  const togglePaymentStatus = async (record: AttendanceRecord) => {
    setIsLoading(true);
    try {
      const newStatus = record.paymentStatus === 'pago' ? 'pendente' : 'pago';
      await dbSave('attendance_records', { ...record, paymentStatus: newStatus });
      await refreshData();
      notify(`Status alterado para ${newStatus.toUpperCase()}`);
    } catch (e) { notify("Erro ao alterar status", "error"); } finally { setIsLoading(false); }
  };

  const handleCreateFinanceExit = async () => {
    if (!selectedEmployee) return;
    setIsLoading(true);
    try {
      await dbSave('cash_flow', {
        companyId: state.currentUser?.companyId,
        type: 'out',
        value: totalToPay,
        date: new Date().toISOString().split('T')[0],
        reference: financeTitle || `ACERTO: ${selectedEmployee.name}`,
        category: financeCategory || 'Salários'
      });
      
      // Marca como pago apenas os que estavam pendentes
      const updates = attendanceHistory
        .filter(r => r.paymentStatus !== 'pago')
        .map(record => dbSave('attendance_records', { ...record, paymentStatus: 'pago' }));
      
      await Promise.all(updates);
      await refreshData();
      setShowFinanceModal(false);
      notify("Saída financeira registrada!");
    } catch (e: any) { notify("Falha ao registrar acerto.", "error"); } finally { setIsLoading(false); }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div className="min-w-0">
          <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase truncate">Auditoria & Relatórios</h2>
          <p className="text-[10px] text-[#4b6f34] font-black uppercase tracking-widest truncate">Sincronização Cloud Forttiva Service</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-200 p-1 rounded-xl">
             <button onClick={() => setViewMode('employees')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${viewMode === 'employees' ? 'bg-[#0c2a1c] text-[#7ea24e] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Acertos de Equipe</button>
             <button onClick={() => setViewMode('production')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${viewMode === 'production' ? 'bg-[#0c2a1c] text-[#7ea24e] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Relatório Produção</button>
          </div>
          <div className="flex items-center gap-2 bg-white border border-slate-200 p-2 rounded-xl shadow-sm">
            <Calendar size={14} className="text-[#4b6f34] shrink-0" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="text-[10px] font-black uppercase bg-transparent outline-none" />
            <span className="text-slate-300">|</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="text-[10px] font-black uppercase bg-transparent outline-none" />
          </div>
        </div>
      </header>

      <section className="bg-[#0c2a1c] text-white rounded-[32px] p-6 shadow-2xl relative overflow-hidden print:hidden border border-[#16462d]">
         <div className="relative z-10">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 mb-5 text-[#9bb779]">
              <Database size={16} className="text-[#7ea24e]"/> Central de Dados e Exportação (CSV)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
               <button onClick={exportInventory} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-4 transition-all hover:bg-[#16462d] hover:border-[#7ea24e]/40 group">
                  <TableProperties size={18} className="text-[#7ea24e] shrink-0"/><div className="text-left min-w-0"><span className="text-[10px] font-black uppercase block truncate">Estoque</span><span className="text-[8px] font-bold opacity-40 uppercase truncate">Materiais</span></div>
               </button>
               <button onClick={exportEmployees} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-4 transition-all hover:bg-[#16462d] hover:border-[#7ea24e]/40 group">
                  <Users size={18} className="text-[#7ea24e] shrink-0"/><div className="text-left min-w-0"><span className="text-[10px] font-black uppercase block truncate">Equipe</span><span className="text-[8px] font-bold opacity-40 uppercase truncate">Colaboradores</span></div>
               </button>
               <button onClick={exportFinance} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-4 transition-all hover:bg-[#16462d] hover:border-[#7ea24e]/40 group">
                  <DollarSign size={18} className="text-[#7ea24e] shrink-0"/><div className="text-left min-w-0"><span className="text-[10px] font-black uppercase block truncate">Financeiro</span><span className="text-[8px] font-bold opacity-40 uppercase truncate">Fluxo Caixa</span></div>
               </button>
               <button onClick={exportProduction} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-4 transition-all hover:bg-[#16462d] hover:border-[#7ea24e]/40 group">
                  <MapPin size={18} className="text-[#7ea24e] shrink-0"/><div className="text-left min-w-0"><span className="text-[10px] font-black uppercase block truncate">Produção</span><span className="text-[8px] font-bold opacity-40 uppercase truncate">Metragens Campo</span></div>
               </button>
            </div>
         </div>
      </section>

      {viewMode === 'employees' ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 print:hidden">
          <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm lg:col-span-1 h-[calc(100vh-320px)] min-h-[500px] flex flex-col transition-all">
            <div className="p-5 border-b border-slate-100 bg-slate-50/30">
               <div className="relative">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input className="w-full bg-white border-2 border-slate-100 pl-14 pr-4 py-5 rounded-[24px] text-[13px] font-black uppercase outline-none focus:border-slate-900 focus:bg-white transition-all shadow-sm" placeholder="BUSCAR NOME..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
               </div>
               <div className="mt-4 flex items-center justify-between px-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-all border-2 ${onlyActive ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-200'}`}>
                      <input 
                        type="checkbox" 
                        checked={onlyActive} 
                        onChange={e => setOnlyActive(e.target.checked)}
                        className="hidden"
                      />
                      {onlyActive && <CheckCircle2 size={14} className="text-white" />}
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-600 transition-colors">Apenas Ativos</span>
                  </label>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">{filteredEmployees.length} Resultados</span>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
               {filteredEmployees.map(emp => (
                 <button key={emp.id} onClick={() => setSelectedEmployeeId(emp.id)} className={`w-full flex items-center p-5 rounded-[22px] text-left transition-all border-l-[4px] ${selectedEmployeeId === emp.id ? 'bg-slate-900 text-white shadow-xl border-emerald-500 translate-x-1' : 'hover:bg-slate-50 text-slate-600 border-transparent'}`}>
                    <div className="min-w-0">
                       <p className="text-[11px] font-black uppercase truncate tracking-tight flex items-center gap-2">{emp.paymentModality === 'CLT' && <Clock size={10} className="text-blue-500" />}{emp.name}</p>
                       <p className={`text-[9px] font-bold uppercase tracking-[0.1em] mt-0.5 ${selectedEmployeeId === emp.id ? 'text-emerald-400' : 'text-slate-400'}`}>{emp.role} • {emp.paymentModality}</p>
                    </div>
                 </button>
               ))}
            </div>
          </div>

          <div className="lg:col-span-3">
             {selectedEmployee ? (
               <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden animate-in slide-in-from-right-4 duration-300 h-full flex flex-col">
                  <div className="p-8 bg-slate-900 text-white space-y-6">
                     <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex-1 space-y-4">
                           <div className="flex items-center gap-3">
                              <div className="p-3 bg-white/10 rounded-2xl border border-white/5"><User size={20} className="text-emerald-400" /></div>
                              <div><h4 className="text-xl font-black uppercase leading-tight tracking-tight">{selectedEmployee.name}</h4><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedEmployee.role} • {selectedEmployee.paymentModality}</p></div>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest"><Hash size={12}/> CPF: <span className="text-white ml-2">{selectedEmployee.cpf || '--'}</span></div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest"><Smartphone size={12}/> CONTATO: <span className="text-white ml-2">{selectedEmployee.phone || '--'}</span></div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2"><Wallet size={12}/> CHAVE PIX: <span className="text-white">{selectedEmployee.pixKey || '--'}</span></div>
                              {selectedEmployee.paymentModality === 'CLT' && (<div className="text-[10px] text-blue-400 font-black uppercase col-span-2 flex items-center gap-2"><Clock size={12}/> JORNADA: {selectedEmployee.workload} ({selectedEmployee.startTime} às {selectedEmployee.endTime})</div>)}
                           </div>
                        </div>
                        <div className="md:w-64 bg-white/5 p-6 rounded-[32px] border border-white/10 flex flex-col justify-center text-center">
                           {selectedEmployee.paymentModality !== 'CLT' ? (
                             <>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Total Líquido Pendente</p>
                                <h2 className="text-3xl font-black text-emerald-400 tracking-tighter">{formatMoney(totalToPay)}</h2>
                             </>
                           ) : (
                             <>
                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Ponto Mensalista</p>
                                <h2 className="text-xl font-black text-white uppercase tracking-tighter">Ficha CLT</h2>
                             </>
                           )}
                           <button onClick={handlePrint} className="mt-4 w-full bg-white text-slate-900 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all shadow-xl active:scale-95"><Printer size={16} /> GERAR PDF / IMPRIMIR</button>
                        </div>
                     </div>
                  </div>
                  <div className="flex-1 overflow-y-auto scrollbar-hide">
                     <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[9px] uppercase text-slate-400 font-black border-b border-slate-100 sticky top-0 z-10">
                           <tr>
                             <th className="px-8 py-4">Data</th>
                             <th className="px-8 py-4 text-center">Freq.</th>
                             {selectedEmployee.paymentModality === 'CLT' ? (
                               <th className="px-8 py-4 text-center">Horários (E-S.INT-R.INT-SF)</th>
                             ) : (
                               <>
                                 <th className="px-8 py-4 text-right">Base</th>
                                 <th className="px-8 py-4 text-right">Bônus</th>
                                 <th className="px-8 py-4 text-right">Desc.</th>
                               </>
                             )}
                             <th className="px-8 py-4 text-left">Observação</th>
                             {selectedEmployee.paymentModality !== 'CLT' && (<th className="px-8 py-4 text-center">Pagamento</th>)}
                             <th className="px-8 py-4 text-right">Ação</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-[11px] font-black uppercase text-slate-700">
                           {attendanceHistory.map(h => {
                               const isEditing = editingRecordId === h.id;
                               const virtualStatus = getVirtualStatus(h);
                               const shorthand = getStatusShorthand(virtualStatus, selectedEmployee, h);
                               const colorClass = getStatusColorClass(virtualStatus);
                               return (
                                 <tr key={h.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-8 py-3 text-slate-500">{formatDate(h.date)}</td>
                                    <td className="px-8 py-3 text-center">
                                       <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black shadow-sm ${colorClass}`}>
                                          {shorthand}
                                       </span>
                                    </td>
                                    {selectedEmployee.paymentModality === 'CLT' ? (
                                      <td className="px-8 py-3 text-center font-bold text-slate-400 text-[9px]">
                                        {h.clockIn ? `${h.clockIn} | ${h.breakStart || '--'} | ${h.breakEnd || '--'} | ${h.clockOut || '--'}` : '--'}
                                      </td>
                                    ) : (
                                      <>
                                        <td className="px-8 py-3 text-right">
                                          {isEditing ? (
                                            <input className="w-20 bg-white border border-slate-200 p-2 rounded-lg text-[10px] font-black text-right" value={editingValue} onChange={e => setEditingValue(e.target.value)} />
                                          ) : (
                                            <span className="font-bold">{formatMoney(h.value)}</span>
                                          )}
                                        </td>
                                        <td className="px-8 py-3 text-right text-emerald-600">
                                          {isEditing ? (
                                            <input className="w-20 bg-white border border-slate-200 p-2 rounded-lg text-[10px] font-black text-right" value={editingBonus} onChange={e => setEditingBonus(e.target.value)} />
                                          ) : (
                                            `+ ${formatMoney(h.bonusValue || 0)}`
                                          )}
                                        </td>
                                        <td className="px-8 py-3 text-right text-rose-500">
                                          {isEditing ? (
                                            <input className="w-20 bg-white border border-slate-200 p-2 rounded-lg text-[10px] font-black text-right" value={editingDiscount} onChange={e => setEditingDiscount(e.target.value)} />
                                          ) : (
                                            `- ${formatMoney(h.discountValue || 0)}`
                                          )}
                                        </td>
                                      </>
                                    )}
                                    <td className="px-8 py-3 text-left">{isEditing ? (<input className="w-full min-w-[150px] bg-white border border-slate-200 p-2 rounded-lg text-[10px] font-black uppercase" placeholder="OBS..." value={editingObservation} onChange={e => setEditingObservation(e.target.value)} />) : (<span className="text-[9px] text-slate-400 italic lowercase">{h.discountObservation || '--'}</span>)}</td>
                                    {selectedEmployee.paymentModality !== 'CLT' && (<td className="px-8 py-3 text-center"><button onClick={() => togglePaymentStatus(h)} className={`px-3 py-1.5 rounded-xl text-[8px] font-black transition-all ${h.paymentStatus === 'pago' ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-600'}`}>{h.paymentStatus === 'pago' ? 'PAGO' : 'PENDENTE'}</button></td>)}
                                    <td className="px-8 py-3 text-right">{isEditing ? (<button onClick={() => handleSaveValue(h)} className="p-1.5 text-emerald-600 bg-emerald-50 rounded-lg"><Save size={14}/></button>) : (<button onClick={() => { setEditingRecordId(h.id); setEditingValue(String(h.value)); setEditingDiscount(String(h.discountValue || 0)); setEditingBonus(String(h.bonusValue || 0)); setEditingObservation(h.discountObservation || ''); }} className="p-1.5 text-slate-300 hover:text-blue-500 transition-colors"><Edit2 size={12}/></button>)}</td>
                                 </tr>
                               );
                             })
                           }
                        </tbody>
                     </table>
                  </div>
               </div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[40px] p-20 text-center opacity-40"><FileText size={48} className="text-slate-300 mb-6" /><h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Auditoria de Equipe</h3><p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Selecione um colaborador para ver o acerto detalhado.</p></div>
             )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
           <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase text-slate-900 tracking-widest flex items-center gap-2"><BarChart3 size={16} className="text-indigo-500"/> Visão de Produção Consolidada</h3>
              <span className="text-[9px] font-black uppercase text-slate-400">{productionSummary.length} Lançamentos no período</span>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full text-left">
                 <thead className="bg-slate-50 text-[9px] uppercase text-slate-400 font-black border-b">
                    <tr>
                       <th className="px-8 py-5">Data do Serviço</th>
                       <th className="px-8 py-5">Área / O.S.</th>
                       <th className="px-8 py-5">Serviço</th>
                       <th className="px-8 py-5 text-right">Quantidade</th>
                       <th className="px-8 py-5 text-right">V. Unitário</th>
                       <th className="px-8 py-5 text-right">V. Bruto</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y text-[11px] font-black uppercase text-slate-700">
                    {productionSummary.length === 0 ? (
                        <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-300 italic">Nenhum dado de produção para este intervalo de datas</td></tr>
                    ) : (
                        productionSummary.map((s, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-8 py-4 text-slate-500">{formatDate(s.date)}</td>
                                <td className="px-8 py-4 text-slate-900">{s.area}</td>
                                <td className="px-8 py-4"><span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[9px]">{s.type}</span></td>
                                <td className="px-8 py-4 text-right">{s.qty.toLocaleString('pt-BR')} {s.type.includes('KM') ? 'KM' : 'm²'}</td>
                                <td className="px-8 py-4 text-right text-slate-400">{formatMoney(s.val)}</td>
                                <td className="px-8 py-4 text-right text-indigo-600 font-black">{formatMoney(s.total)}</td>
                            </tr>
                        ))
                    )}
                 </tbody>
                 {productionSummary.length > 0 && (
                     <tfoot className="bg-slate-900 text-white font-black text-sm">
                        <tr>
                           <td colSpan={5} className="px-8 py-5 text-right uppercase text-[9px] tracking-widest">Faturamento Consolidado do Período:</td>
                           <td className="px-8 py-5 text-right text-emerald-400">{formatMoney(productionSummary.reduce((acc, s) => acc + s.total, 0))}</td>
                        </tr>
                     </tfoot>
                 )}
              </table>
           </div>
        </div>
      )}

      {showPrintView && selectedEmployee && (
        <div className="fixed inset-0 z-[1000] bg-white text-slate-900 font-sans print-view-container overflow-y-auto">
           <style>{`
             @media print { 
               @page { margin: 1.5cm; size: A4 portrait; }
               html, body { background: white !important; color: black !important; }
               body * { visibility: hidden; }
               .print-view-container, .print-view-container * { visibility: visible; }
               .print-view-container { 
                 position: static !important; 
                 display: block !important;
                 width: 100% !important; 
                 margin: 0 !important; 
                 padding: 0 !important; 
                 background: white !important;
                 overflow: visible !important;
               }
               .no-print { display: none !important; }
               .sheet { 
                 background: white !important;
                 box-shadow: none !important; 
                 margin: 0 !important; 
                 width: 100% !important; 
                 padding: 0 !important; 
                 border: none !important; 
                 min-height: auto !important;
               }
               * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
               table { width: 100%; border-collapse: collapse; page-break-inside: auto; background: white !important; }
               tr { page-break-inside: avoid; page-break-after: auto; }
               th, td { border: 1px solid #cbd5e1; padding: 6px 4px; font-size: 8px; background: white !important; }
               thead { display: table-header-group; background-color: #f1f5f9 !important; }
               .avoid-break { break-inside: avoid; page-break-inside: avoid; }
             }
             @media screen {
                .print-view-container { display: flex; align-items: flex-start; justify-content: center; padding: 40px; background: rgba(0,0,0,0.85); backdrop-blur: 10px; }
                .sheet { background: white; margin: 0 auto; padding: 1.5cm; width: 210mm; min-height: 297mm; box-shadow: 0 0 50px rgba(0,0,0,0.5); border-radius: 4px; }
             }
           `}</style>
           <div className="sheet">
              <button onClick={() => setShowPrintView(false)} className="no-print absolute top-8 right-8 bg-rose-600 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl hover:bg-slate-900 transition-all z-[1100] flex items-center gap-2"><X size={18}/> FECHAR</button>
              
              {/* Header Empresa */}
              <div className="border-b-4 border-slate-900 pb-6 mb-6 flex justify-between items-start avoid-break">
                <div className="space-y-1">
                  <h1 className="text-2xl font-black uppercase tracking-tighter text-[#092318]">{state.company?.name || "FORTTIVA SERVIÇOS"}</h1>
                  <p className="text-[9px] font-bold text-[#52793b] italic">Força e eficiência em campo.</p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase leading-relaxed max-w-xs">{state.company?.address}</p>
                </div>
                <div className="text-right uppercase">
                  <div className="bg-slate-900 text-white px-4 py-2 mb-2 inline-block"><h2 className="text-[11px] font-black tracking-widest">Ficha de Acerto de Jornada</h2></div>
                  <p className="text-[9px] font-bold text-slate-600">Referência: {formatDate(startDate)} a {formatDate(endDate)}</p>
                </div>
              </div>

              {/* Dados do Colaborador - Cabeçalho Detalhado */}
              <div className="grid grid-cols-3 gap-4 mb-6 avoid-break">
                <div className="col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Dados Profissionais</p>
                  <div className="grid grid-cols-2 gap-y-2">
                    <div>
                      <p className="text-[10px] font-black uppercase text-slate-900 leading-none">{selectedEmployee.name}</p>
                      <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">{selectedEmployee.role}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-slate-500 uppercase"><span className="font-black text-slate-900">CPF:</span> {selectedEmployee.cpf || '--'}</p>
                      <p className="text-[8px] font-bold text-slate-500 uppercase mt-1"><span className="font-black text-slate-900">TEL:</span> {selectedEmployee.phone || '--'}</p>
                      <p className="text-[8px] font-bold text-slate-500 uppercase mt-1"><span className="font-black text-slate-900">PIX:</span> {selectedEmployee.pixKey || '--'}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-[8px] font-bold text-slate-500 uppercase"><span className="font-black text-slate-900">Endereço:</span> {selectedEmployee.address || 'Não informado'}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-center">
                  <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Regime de : </p>
                  <p className="text-[10px] font-black uppercase text-blue-600 leading-none">{selectedEmployee.paymentModality}</p>
                  {selectedEmployee.paymentModality === 'CLT' && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[7px] font-bold text-slate-500 uppercase">Jornada: {selectedEmployee.workload}</p>
                      <p className="text-[7px] font-bold text-slate-500 uppercase">Turno: {selectedEmployee.startTime} às {selectedEmployee.endTime}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabela de Lançamentos Detalhada */}
              <table className="w-full text-left uppercase">
                <thead>
                  <tr className="bg-slate-100 text-[8px] font-black text-slate-900">
                    <th className="p-2 border-slate-300">Data</th>
                    <th className="p-2 border-slate-300 text-center">FREQUÊNCIA</th>
                    {selectedEmployee.paymentModality === 'CLT' ? (
                      <>
                        <th className="p-2 border-slate-300 text-center">Entrada</th>
                        <th className="p-2 border-slate-300 text-center">S. Intervalo</th>
                        <th className="p-2 border-slate-300 text-center">R. Intervalo</th>
                        <th className="p-2 border-slate-300 text-center">Saída Final</th>
                      </>
                    ) : (
                      <>
                        <th className="p-2 border-slate-300 text-right">V. Base</th>
                        <th className="p-2 border-slate-300 text-right">Bônus</th>
                        <th className="p-2 border-slate-300 text-right">Desconto</th>
                        <th className="p-2 border-slate-300 text-right">Líquido</th>
                      </>
                    )}
                    <th className="p-2 border-slate-300">Observação</th>
                  </tr>
                </thead>
                <tbody className="text-[8px] font-bold text-slate-700">
                  {attendanceHistory.map(h => {
                    const virtualStatus = getVirtualStatus(h);
                    const shorthand = getStatusShorthand(virtualStatus, selectedEmployee, h);
                    const isPaid = h.paymentStatus === 'pago';
                    return (
                      <tr key={h.id} className={isPaid ? 'opacity-50 grayscale' : ''}>
                        <td className="p-2 border-slate-200 bg-slate-50/30">{formatDate(h.date)} {isPaid && '(PAGO)'}</td>
                        <td className="p-2 text-center font-black">{shorthand}</td>
                        {selectedEmployee.paymentModality === 'CLT' ? (
                          <>
                            <td className="p-2 border-slate-200 text-center">{h.clockIn || '--'}</td>
                            <td className="p-2 border-slate-200 text-center">{h.breakStart || '--'}</td>
                            <td className="p-2 border-slate-200 text-center">{h.breakEnd || '--'}</td>
                            <td className="p-2 border-slate-200 text-center">{h.clockOut || '--'}</td>
                          </>
                        ) : (
                          <>
                            <td className="p-2 border-slate-200 text-right">{formatMoney(h.value)}</td>
                            <td className="p-2 border-slate-200 text-right text-emerald-600">{formatMoney(h.bonusValue || 0)}</td>
                            <td className="p-2 border-slate-200 text-right text-rose-600">{formatMoney(h.discountValue || 0)}</td>
                            <td className="p-2 border-slate-200 text-right font-black">{formatMoney(h.value + (h.bonusValue || 0) - (h.discountValue || 0))}</td>
                          </>
                        )}
                        <td className="p-2 italic lowercase text-[7px] text-slate-500 truncate max-w-[150px]">{h.discountObservation || '--'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="avoid-break">
                {/* Resumo Financeiro no Rodapé - Apenas Pendentes */}
                {selectedEmployee.paymentModality !== 'CLT' && (
                  <div className="mt-2 flex justify-end">
                    <div className="w-full max-w-[240px]">
                      <div className="bg-[#0f172a] p-3 rounded-2xl text-white shadow-xl grid grid-cols-2 gap-3 items-center border border-white/5 print:bg-white print:text-black print:border-slate-900 print:border-2">
                          <div className="space-y-2">
                            <div>
                                <p className="text-[6px] font-black uppercase text-slate-400 tracking-widest mb-0.5 print:text-slate-600">Base + Bônus (+)</p>
                                <p className="text-[10px] font-black tracking-tight">{formatMoney(totalBaseValue + totalBonuses)}</p>
                            </div>
                            <div className="pt-2 border-t border-white/10 print:border-slate-200">
                                <p className="text-[6px] font-black uppercase text-rose-400 tracking-widest mb-0.5 print:text-rose-600">Descontos (-) </p>
                                <p className="text-[10px] font-black text-rose-400 tracking-tight print:text-rose-600">{formatMoney(totalDiscounts)}</p>
                            </div>
                          </div>
                          <div className="bg-white/5 p-2 rounded-xl flex flex-col justify-center text-center border border-white/5 print:bg-slate-50 print:border-slate-200">
                            <p className="text-[6px] font-black uppercase text-emerald-400 tracking-widest mb-1 print:text-emerald-600">Líquido a Pagar</p>
                            <h2 className="text-lg font-black text-emerald-400 tracking-tighter leading-none print:text-emerald-600">{formatMoney(totalToPay)}</h2>
                          </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Assinaturas */}
                <div className="mt-20 pt-12 grid grid-cols-2 gap-24 text-center">
                  <div className="space-y-2">
                    <div className="border-t-2 border-slate-900 pt-3 text-[10px] font-black uppercase">{selectedEmployee.name}</div>
                    <p className="text-[6px] font-bold text-slate-400">Assinatura do Colaborador</p>
                  </div>
                  <div className="space-y-2">
                    <div className="border-t-2 border-slate-900 pt-3 text-[10px] font-black uppercase">Administração Operacional</div>
                    <p className="text-[6px] font-bold text-[#52793b]">Forttiva Serviços • Força e eficiência em campo</p>
                  </div>
                </div>

                {/* Rodapé Administrativo */}
                <div className="mt-12 text-center text-[6px] text-slate-400 font-bold uppercase tracking-widest border-t pt-4">
                  Documento emitido via Sistema Central Forttiva Service Cloud v3.5 • {new Date().toLocaleString('pt-BR')}
                </div>
              </div>
           </div>
        </div>
      )}

      {showFinanceModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-sm p-10 space-y-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-sm font-black uppercase text-slate-900 text-center">Gerar Saída Financeira?</h3>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
              <p className="text-xl font-black text-emerald-600">{formatMoney(totalToPay)}</p>
              <p className="text-[8px] font-black text-emerald-400 uppercase mt-1">Valor Total Líquido Pendente</p>
            </div>
            <button onClick={handleCreateFinanceExit} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-emerald-600">CONFIRMAR E QUITAR</button>
            <button onClick={() => setShowFinanceModal(false)} className="w-full bg-slate-100 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase">CANCELAR</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
