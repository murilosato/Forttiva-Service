
import React, { useState, useMemo } from 'react';
import { Area, Service, AppState, ServiceType, Employee, UserRole } from '../types';
import { Plus, Trash2, CheckCircle2, MapPin, X, ChevronDown, ChevronUp, Loader2, Info, ArrowRight, Activity, Archive, Calendar, Edit3, Search, Filter, Clock, FileText, DollarSign, Layers, BarChart3, UserCheck } from 'lucide-react';
import { SERVICE_OPTIONS } from '../constants';
import ConfirmationModal from './ConfirmationModal';
import { dbSave, dbDelete, fetchCompleteCompanyData } from '../lib/supabase';

interface ProductionProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

const Production: React.FC<ProductionProps> = ({ state, setState }) => {
  const [isAddingArea, setIsAddingArea] = useState(false);
  const [expandedAreaId, setExpandedAreaId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewStatus, setViewStatus] = useState<'executing' | 'finished'>('executing');
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; areaId: string; serviceId?: string } | null>(null);
  const [confirmFinish, setConfirmFinish] = useState<{ isOpen: boolean; area: Area; date: string } | null>(null);
  const [editingResponsibleId, setEditingResponsibleId] = useState<string | null>(null);

  const [searchName, setSearchName] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterServiceType, setFilterServiceType] = useState<string>('ALL');

  const [newArea, setNewArea] = useState<Partial<Area>>({
    name: '',
    responsibleEmployeeId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    startReference: '',
    endReference: '',
    observations: ''
  });

  const [newService, setNewService] = useState({ type: ServiceType.VARRICAO_KM, quantity: '' });

  const activeEmployees = useMemo(() => state.employees.filter(e => e.status === 'active'), [state.employees]);

  const refreshData = async () => {
    const isMaster = state.currentUser?.role === UserRole.MASTER || (state.currentUser?.role as any) === 'DIRETORIA_MASTER' || (state.currentUser?.role as any) === 'ADMINISTRADOR';
    if (state.currentUser?.companyId || isMaster) {
      const data = await fetchCompleteCompanyData(state.currentUser?.companyId || null, isMaster);
      if (data) setState(prev => ({ ...prev, ...data }));
    }
  };

  const handleAddArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArea.name || !newArea.startDate || !newArea.startReference || !newArea.endReference) {
      return alert("Preencha todos os campos obrigatórios.");
    }
    setIsLoading(true);
    try {
      // Garantir que campos de ID vazios sejam enviados como NULL para o PostgreSQL
      const respId = (newArea.responsibleEmployeeId && newArea.responsibleEmployeeId !== '') 
        ? newArea.responsibleEmployeeId 
        : null;

      const payload = {
        companyId: state.currentUser?.companyId,
        name: newArea.name.toUpperCase(),
        responsibleEmployeeId: respId,
        startDate: newArea.startDate,
        startReference: newArea.startReference.toUpperCase(),
        endReference: newArea.endReference.toUpperCase(),
        observations: newArea.observations?.toUpperCase() || '',
        status: 'executing'
      };

      await dbSave('areas', payload);
      await refreshData();
      setIsAddingArea(false);
      setNewArea({ name: '', responsibleEmployeeId: '', startDate: new Date().toISOString().split('T')[0], endDate: '', startReference: '', endReference: '', observations: '' });
    } catch (e: any) { 
      console.error("Erro Supabase:", e);
      alert("Falha técnica ao abrir O.S. Detalhes: " + (e.message || "Erro no Schema do Banco.")); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleAddService = async (areaId: string) => {
    const qty = parseFloat(newService.quantity.replace(',', '.'));
    if (isNaN(qty) || qty <= 0) return alert("Quantidade inválida");
    setIsLoading(true);
    try {
      const unitValue = state.serviceRates[newService.type] || 0;
      await dbSave('services', {
        companyId: state.currentUser?.companyId,
        areaId: areaId,
        type: newService.type,
        areaM2: qty,
        unitValue: unitValue,
        totalValue: unitValue * qty,
        serviceDate: new Date().toISOString().split('T')[0]
      });
      await refreshData();
      setNewService({ ...newService, quantity: '' });
    } catch (e: any) { alert("Falha ao registrar serviço."); } finally { setIsLoading(false); }
  };

  const handleFinishArea = async () => {
    if (!confirmFinish?.date) return alert("Data de fim é obrigatória.");
    setIsLoading(true);
    try {
      await dbSave('areas', {
        id: confirmFinish.area.id,
        status: 'finished',
        endDate: confirmFinish.date
      });
      await refreshData();
      setConfirmFinish(null);
      setExpandedAreaId(null);
      setViewStatus('finished');
    } catch (e: any) { alert("Falha ao finalizar O.S."); } finally { setIsLoading(false); }
  };

  const handleUpdateResponsible = async (areaId: string, employeeId: string) => {
    setIsLoading(true);
    try {
      await dbSave('areas', {
        id: areaId,
        responsibleEmployeeId: employeeId || null
      });
      await refreshData();
      setEditingResponsibleId(null);
    } catch (e: any) {
      alert("Falha ao atualizar responsável.");
    } finally {
      setIsLoading(false);
    }
  };

  const performDelete = async () => {
    if (!confirmDelete) return;
    setIsLoading(true);
    try {
      if (confirmDelete.serviceId) {
        await dbDelete('services', confirmDelete.serviceId);
      } else {
        await dbDelete('areas', confirmDelete.areaId);
      }
      await refreshData();
      setConfirmDelete(null);
    } catch (e: any) { alert("Falha ao excluir."); } finally { setIsLoading(false); }
  };

  const filteredAreas = useMemo(() => {
    return state.areas.filter(area => {
      const matchStatus = area.status === viewStatus;
      
      const responsible = state.employees.find(e => e.id === area.responsibleEmployeeId);
      const matchName = area.name.toLowerCase().includes(searchName.toLowerCase()) || 
                       (responsible?.name || '').toLowerCase().includes(searchName.toLowerCase());
      
      const matchType = filterServiceType === 'ALL' || (area.services || []).some(s => s.type === filterServiceType);
      
      let matchDate = true;
      if (filterDateStart) matchDate = matchDate && (area.startDate >= filterDateStart);
      if (filterDateEnd) matchDate = matchDate && (area.startDate <= filterDateEnd);
      
      return matchStatus && matchName && matchType && matchDate;
    });
  }, [state.areas, viewStatus, searchName, filterDateStart, filterDateEnd, filterServiceType, state.employees]);

  const productionTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    filteredAreas.forEach(area => {
      (area.services || []).forEach(s => {
        if (filterServiceType === 'ALL' || s.type === filterServiceType) {
          const currentTotal = totals[s.type] || 0;
          totals[s.type] = currentTotal + (Number(s.areaM2) || 0);
        }
      });
    });
    return totals;
  }, [filteredAreas, filterServiceType]);

  const formatDate = (d?: string) => d ? d.split('-').reverse().join('/') : '--/--/----';
  const formatMoney = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatNumber = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6 pb-24">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0c2a1c] uppercase tracking-tight">Produção de Campo</h2>
          <p className="text-[10px] text-[#4b6f34] font-bold uppercase tracking-widest">Controle de O.S. e Metragem Forttiva</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex bg-[#e8e7e1] p-1 rounded-xl flex-1 md:flex-none">
            <button onClick={() => setViewStatus('executing')} className={`flex-1 md:px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all truncate ${viewStatus === 'executing' ? 'bg-white text-[#0c2a1c] shadow-sm' : 'text-slate-600'}`}>Em Execução</button>
            <button onClick={() => setViewStatus('finished')} className={`flex-1 md:px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all truncate ${viewStatus === 'finished' ? 'bg-white text-[#0c2a1c] shadow-sm' : 'text-slate-600'}`}>Finalizadas</button>
          </div>
          <button 
            onClick={() => setIsAddingArea(true)} 
            className="bg-[#0c2a1c] text-white px-5 py-3 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-xl hover:bg-[#16462d] transition-all active:scale-95 shrink-0"
          >
            <Plus size={18} /> Nova O.S.
          </button>
        </div>
      </header>

      <div className="bg-white p-6 rounded-[32px] border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              className="w-full bg-slate-50 border border-slate-100 pl-12 pr-4 py-4 rounded-2xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-[#7ea24e] transition-all" 
              placeholder="BUSCAR O.S. POR NOME OU RESPONSÁVEL..." 
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64 relative">
            <Layers className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <select 
              className="w-full bg-slate-50 border border-slate-100 pl-12 pr-4 py-4 rounded-2xl text-[10px] font-black uppercase outline-none appearance-none cursor-pointer focus:bg-white focus:border-[#7ea24e] truncate"
              value={filterServiceType}
              onChange={e => setFilterServiceType(e.target.value)}
            >
              <option value="ALL">TODOS OS SERVIÇOS</option>
              {SERVICE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
           <div className="flex-1 flex items-center gap-3 bg-slate-50 border border-slate-100 px-5 py-3 rounded-2xl">
              <Calendar size={16} className="text-slate-400" />
              <div className="flex-1 flex items-center gap-4">
                 <div className="flex flex-col">
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Início</span>
                    <input 
                      type="date" 
                      className="bg-transparent text-[10px] font-black uppercase outline-none"
                      value={filterDateStart}
                      onChange={e => setFilterDateStart(e.target.value)}
                    />
                 </div>
                 <div className="h-6 w-px bg-slate-200" />
                 <div className="flex flex-col">
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Fim</span>
                    <input 
                      type="date" 
                      className="bg-transparent text-[10px] font-black uppercase outline-none"
                      value={filterDateEnd}
                      onChange={e => setFilterDateEnd(e.target.value)}
                    />
                 </div>
              </div>
              {(filterDateStart || filterDateEnd) && (
                <button 
                  onClick={() => { setFilterDateStart(''); setFilterDateEnd(''); }}
                  className="text-slate-300 hover:text-rose-500 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
           </div>
           
           <div className="md:w-auto flex items-center gap-2 px-5 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl overflow-x-auto scrollbar-hide">
              <BarChart3 size={14} className="text-emerald-500 shrink-0" />
              <div className="flex gap-4 whitespace-nowrap">
                {Object.entries(productionTotals).length > 0 ? (
                  Object.entries(productionTotals).map(([type, total]) => (
                    <span key={type} className="text-[9px] font-black text-emerald-700 uppercase">
                      {type}: <span className="text-[#010a1b]">{formatNumber(total as number)}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-[9px] font-black text-emerald-400 uppercase italic">Nenhum acumulado no período</span>
                )}
              </div>
           </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredAreas.length === 0 ? (
          <div className="bg-white p-20 rounded-[32px] border-2 border-dashed border-slate-200 text-center text-[#2e3545] font-black uppercase text-xs italic opacity-40">
            Nenhuma O.S. encontrada para os critérios selecionados
          </div>
        ) : (
          filteredAreas.map(area => {
            const areaTotalM2 = (area.services || []).reduce((acc: number, s) => acc + (Number(s.areaM2) || 0), 0);
            const areaTotalValue = (area.services || []).reduce((acc: number, s) => acc + (Number(s.totalValue) || 0), 0);
            const isExpanded = expandedAreaId === area.id;
            const responsible = state.employees.find(e => e.id === area.responsibleEmployeeId);

            return (
              <div key={area.id} className={`bg-white rounded-[32px] border ${isExpanded ? 'border-[#7ea24e] shadow-xl' : 'border-slate-100 shadow-sm'} overflow-hidden transition-all duration-300`}>
                <div 
                  className="p-6 flex justify-between items-center bg-white cursor-pointer hover:bg-slate-50/50" 
                  onClick={() => setExpandedAreaId(isExpanded ? null : area.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white shrink-0 ${area.status === 'finished' ? 'bg-[#16462d]' : 'bg-[#0c2a1c]'}`}>
                      {area.status === 'finished' ? <CheckCircle2 size={24} className="text-[#7ea24e]"/> : <Clock size={24} className="text-[#a2b882]" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-black uppercase leading-tight truncate">{area.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider truncate">Iniciada em {formatDate(area.startDate)} • Ref: {area.startReference}</p>
                        <span className="w-1 h-1 bg-slate-300 rounded-full shrink-0"/>
                        {editingResponsibleId === area.id ? (
                          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                            <select 
                              className="bg-slate-50 border border-slate-200 rounded-lg text-[8px] font-black uppercase outline-none px-2 py-1"
                              value={area.responsibleEmployeeId || ''}
                              onChange={e => handleUpdateResponsible(area.id, e.target.value)}
                              autoFocus
                              onBlur={() => setEditingResponsibleId(null)}
                            >
                              <option value="">SEM RESPONSÁVEL</option>
                              {activeEmployees.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.name.toUpperCase()}</option>
                              ))}
                            </select>
                            <button onClick={() => setEditingResponsibleId(null)} className="text-slate-400 hover:text-rose-500">
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <p 
                            className="text-[8px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer group"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingResponsibleId(area.id);
                            }}
                          >
                            <UserCheck size={10}/> {responsible?.name || 'SEM RESPONSÁVEL'}
                            <Edit3 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-12">
                     <div className="hidden sm:block text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Produção Acumulada</p>
                        <p className="text-[12px] font-black text-[#010a1b]">{formatNumber(areaTotalM2)} Uni.</p>
                     </div>
                     <div className="hidden sm:block text-right">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Valor Bruto O.S.</p>
                        <p className="text-[12px] font-black text-emerald-600">{formatMoney(areaTotalValue)}</p>
                     </div>
                     {isExpanded ? <ChevronUp size={20} className="text-slate-300" /> : <ChevronDown size={20} className="text-slate-300" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-8 bg-slate-50/50 border-t border-slate-100 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Lançamento de Serviço */}
                      <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                          <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest mb-6 flex items-center gap-2">
                             <Activity size={16} className="text-blue-500"/> Registrar Medição
                          </h4>
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Tipo de Serviço</label>
                              <select 
                                className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-[10px] font-black uppercase outline-none"
                                value={newService.type}
                                onChange={e => setNewService({...newService, type: e.target.value as ServiceType})}
                              >
                                {SERVICE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Quantidade (m²/KM)</label>
                              <input 
                                className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-[10px] font-black outline-none focus:bg-white focus:border-[#010a1b]"
                                placeholder="0,00"
                                value={newService.quantity}
                                onChange={e => setNewService({...newService, quantity: e.target.value})}
                              />
                            </div>
                            <button 
                              onClick={() => handleAddService(area.id)}
                              disabled={isLoading}
                              className="w-full bg-[#010a1b] text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                               {isLoading ? <Loader2 className="animate-spin" size={16}/> : <><Plus size={16}/> LANÇAR NA O.S.</>}
                            </button>
                          </div>
                        </div>

                        {area.status === 'executing' && (
                          <button 
                            onClick={() => setConfirmFinish({ isOpen: true, area: area, date: new Date().toISOString().split('T')[0] })}
                            className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                          >
                            <CheckCircle2 size={16}/> FINALIZAR ORDEM DE SERVIÇO
                          </button>
                        )}
                        
                        <button 
                          onClick={() => setConfirmDelete({ isOpen: true, areaId: area.id })}
                          className="w-full bg-white text-rose-600 border border-rose-100 py-4 rounded-xl font-black text-[10px] uppercase hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                        >
                          <Trash2 size={16}/> EXCLUIR O.S. DO SISTEMA
                        </button>
                      </div>

                      {/* Histórico de Serviços da Área */}
                      <div className="lg:col-span-2 space-y-6">
                         <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-5 bg-slate-50 border-b flex justify-between items-center">
                               <h4 className="text-[10px] font-black uppercase text-slate-900 tracking-widest flex items-center gap-2">
                                  <FileText size={16} className="text-slate-400"/> Histórico de Lançamentos
                               </h4>
                               <span className="text-[9px] font-black uppercase text-slate-400">{area.services?.length || 0} Registros</span>
                            </div>
                            <div className="overflow-x-auto">
                               <table className="w-full text-left">
                                  <thead>
                                     <tr className="bg-slate-50/50 text-[8px] font-black text-slate-400 uppercase border-b">
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-6 py-4">Serviço</th>
                                        <th className="px-6 py-4 text-right">Qtd</th>
                                        <th className="px-6 py-4 text-right">V. Total</th>
                                        <th className="px-6 py-4 text-center">Ações</th>
                                     </tr>
                                  </thead>
                                  <tbody className="text-[10px] font-black uppercase text-slate-700 divide-y divide-slate-50">
                                     {(area.services || []).length === 0 ? (
                                       <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-300 italic">Nenhum serviço registrado nesta O.S.</td></tr>
                                     ) : (
                                       (area.services || []).map(s => (
                                         <tr key={s.id} className="hover:bg-slate-50/50">
                                            <td className="px-6 py-4 text-slate-500">{formatDate(s.serviceDate)}</td>
                                            <td className="px-6 py-4">{s.type}</td>
                                            <td className="px-6 py-4 text-right">{formatNumber(s.areaM2)} {s.type.includes('KM') ? 'KM' : 'm²'}</td>
                                            <td className="px-6 py-4 text-right text-emerald-600">{formatMoney(s.totalValue)}</td>
                                            <td className="px-6 py-4 text-center">
                                               <button onClick={() => setConfirmDelete({ isOpen: true, areaId: area.id, serviceId: s.id })} className="p-2 text-slate-200 hover:text-rose-600 transition-colors"><Trash2 size={14}/></button>
                                            </td>
                                         </tr>
                                       ))
                                     )}
                                  </tbody>
                               </table>
                            </div>
                         </div>

                         <div className="bg-slate-900 rounded-3xl p-6 text-white grid grid-cols-2 gap-4">
                            <div>
                               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Metragem O.S.</p>
                               <p className="text-xl font-black">{formatNumber(areaTotalM2)} <span className="text-[10px] text-slate-500 uppercase">Uni.</span></p>
                            </div>
                            <div className="text-right">
                               <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Faturado</p>
                               <p className="text-xl font-black text-emerald-400">{formatMoney(areaTotalValue)}</p>
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Nova O.S. - REDIMENSIONADO E OTIMIZADO */}
      {isAddingArea && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
           <form onSubmit={handleAddArea} className="bg-white rounded-[32px] w-full max-w-lg p-6 md:p-8 space-y-6 shadow-2xl animate-in zoom-in-95 border border-slate-100 max-h-[95vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                   <h3 className="text-sm font-black uppercase text-slate-900 leading-none">Abertura de Nova O.S.</h3>
                   <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Identificação e Responsabilidade</p>
                </div>
                <button type="button" onClick={() => setIsAddingArea(false)} className="text-slate-300 hover:text-slate-900 p-2"><X size={20}/></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="md:col-span-2 space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1 block">Identificação da O.S. (Nome/Área)</label>
                    <input 
                      required 
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-[#010a1b] transition-all" 
                      placeholder="EX: AVENIDA CENTRAL" 
                      value={newArea.name} 
                      onChange={e => setNewArea({...newArea, name: e.target.value})} 
                    />
                 </div>
                 
                 <div className="md:col-span-2 space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1 flex items-center gap-2"><UserCheck size={10}/> Colaborador Responsável</label>
                    <select 
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-[#010a1b] transition-all appearance-none" 
                      value={newArea.responsibleEmployeeId} 
                      onChange={e => setNewArea({...newArea, responsibleEmployeeId: e.target.value})}
                    >
                      <option value="">SELECIONE UM COLABORADOR...</option>
                      {activeEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name.toUpperCase()}</option>
                      ))}
                    </select>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1 block">Data de Início</label>
                    <input 
                      type="date" 
                      required 
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-[10px] font-black outline-none focus:bg-white focus:border-[#010a1b]" 
                      value={newArea.startDate} 
                      onChange={e => setNewArea({...newArea, startDate: e.target.value})} 
                    />
                 </div>
                 
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1 block">Ref. Inicial (Ponto A)</label>
                    <input 
                      required 
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-[#010a1b]" 
                      placeholder="EX: KM 01 OU RUA X" 
                      value={newArea.startReference} 
                      onChange={e => setNewArea({...newArea, startReference: e.target.value})} 
                    />
                 </div>
                 
                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1 block">Ref. Final (Ponto B)</label>
                    <input 
                      required 
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-[#010a1b]" 
                      placeholder="EX: KM 10 OU RUA Y" 
                      value={newArea.endReference} 
                      onChange={e => setNewArea({...newArea, endReference: e.target.value})} 
                    />
                 </div>
                 
                 <div className="md:col-span-2 space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1 block">Observações Técnicas</label>
                    <textarea 
                      className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-[10px] font-black uppercase h-20 outline-none resize-none focus:bg-white focus:border-[#010a1b] transition-all" 
                      placeholder="DETALHES DA EXECUÇÃO..." 
                      value={newArea.observations} 
                      onChange={e => setNewArea({...newArea, observations: e.target.value})} 
                    />
                 </div>
              </div>

              <button 
                disabled={isLoading} 
                type="submit" 
                className="w-full bg-[#010a1b] text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl transition-all hover:bg-emerald-600 active:scale-95 flex items-center justify-center gap-3"
              >
                 {isLoading ? <Loader2 className="animate-spin" size={16}/> : <><MapPin size={16}/> ABRIR ORDEM DE SERVIÇO</>}
              </button>
           </form>
        </div>
      )}

      {/* Modal Finalizar O.S. */}
      {confirmFinish && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
           <div className="bg-white rounded-[40px] w-full max-w-sm p-10 space-y-6 shadow-2xl animate-in zoom-in-95 border border-slate-100 text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto text-emerald-600 mb-2">
                 <CheckCircle2 size={32}/>
              </div>
              <div>
                 <h3 className="text-sm font-black uppercase text-slate-900">Finalizar Execução?</h3>
                 <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 tracking-tight">O.S.: {confirmFinish.area.name}</p>
              </div>
              <div className="space-y-1 text-left">
                 <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Data Real de Conclusão</label>
                 <input type="date" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-[11px] font-black" value={confirmFinish.date} onChange={e => setConfirmFinish({...confirmFinish, date: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => setConfirmFinish(null)} className="py-4 rounded-2xl font-black uppercase text-[10px] text-slate-400 bg-slate-50">CANCELAR</button>
                 <button onClick={handleFinishArea} className="py-4 rounded-2xl font-black uppercase text-[10px] text-white bg-emerald-600 shadow-lg hover:bg-emerald-700">CONFIRMAR</button>
              </div>
           </div>
        </div>
      )}

      {/* Modal Deletar */}
      <ConfirmationModal 
        isOpen={!!confirmDelete?.isOpen} 
        onClose={() => setConfirmDelete(null)} 
        onConfirm={performDelete} 
        title={confirmDelete?.serviceId ? "Excluir Medição" : "Excluir O.S."}
        message={confirmDelete?.serviceId ? "Deseja remover este lançamento de serviço? O valor será deduzido do total da O.S." : "Esta ação removerá permanentemente a Ordem de Serviço e todos os seus lançamentos vinculados."}
      />
    </div>
  );
};

export default Production;
