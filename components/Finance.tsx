
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AppState } from '../types';
import { Plus, ArrowDownCircle, ArrowUpCircle, X, Wallet, Trash2, Edit2, Loader2, DollarSign, Calendar, Tag, Search, Filter, CheckSquare, Square, ChevronDown } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { dbSave, dbDelete, fetchCompleteCompanyData } from '../lib/supabase';

interface FinanceProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

const Finance: React.FC<FinanceProps> = ({ state, setState, notify }) => {
  const [activeTab, setActiveTab] = useState<'in' | 'out'>('in');
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ isOpen: boolean; id: string } | null>(null);
  
  // Estados para Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    type: 'in' as 'in' | 'out',
    value: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
    category: 'Geral'
  });

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatMoney = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const refreshData = async () => {
    if (state.currentUser?.companyId) {
      const data = await fetchCompleteCompanyData(state.currentUser.companyId);
      if (data) setState(prev => ({ ...prev, ...data }));
    }
  };

  const handleOpenForm = () => {
    setEditingId(null);
    setFormData({
      type: activeTab,
      value: '',
      date: new Date().toISOString().split('T')[0],
      reference: '',
      category: state.financeCategories[0] || 'Geral'
    });
    setShowForm(true);
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({
      type: item.type as 'in' | 'out',
      value: String(item.value).replace('.', ','),
      date: item.date,
      reference: item.reference,
      category: item.category
    });
    setShowForm(true);
  };

  const handleSaveMove = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(formData.value.replace(',', '.'));
    if (isNaN(val) || val <= 0) return notify("Valor inválido", "error");

    setIsLoading(true);
    try {
      await dbSave('cash_flow', {
        id: editingId || undefined,
        companyId: state.currentUser?.companyId,
        type: formData.type,
        value: val,
        date: formData.date,
        reference: formData.reference || (formData.type === 'in' ? 'Receita Diversa' : 'Despesa Diversa'),
        category: formData.category
      });
      await refreshData();
      setShowForm(false);
      setEditingId(null);
      notify(editingId ? "Lançamento atualizado" : "Lançamento efetivado");
    } catch (e: any) {
      console.error(e);
      notify("Erro na gravação.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (category: string) => {
    setCategoryFilter(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };

  // Lógica de Filtragem Universal (Aplicada tanto para a tabela quanto para os cards de resumo)
  const filterList = (list: any[]) => {
    return list.filter(item => {
      const matchesSearch = item.reference.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter.length === 0 || categoryFilter.includes(item.category);
      const matchesDate = (!startDate || item.date >= startDate) && (!endDate || item.date <= endDate);
      return matchesSearch && matchesCategory && matchesDate;
    });
  };

  const filteredIn = useMemo(() => filterList(state.cashIn), [state.cashIn, searchQuery, categoryFilter, startDate, endDate]);
  const filteredOut = useMemo(() => filterList(state.cashOut), [state.cashOut, searchQuery, categoryFilter, startDate, endDate]);

  const totalIn = useMemo(() => filteredIn.reduce((acc, c) => acc + c.value, 0), [filteredIn]);
  const totalOut = useMemo(() => filteredOut.reduce((acc, c) => acc + c.value, 0), [filteredOut]);
  const totalBalance = totalIn - totalOut;

  const filteredData = activeTab === 'in' ? filteredIn : filteredOut;

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0c2a1c] uppercase tracking-tight">Fluxo de Caixa</h2>
          <p className="text-[10px] text-[#4b6f34] font-bold uppercase tracking-widest mt-1">Saldos Unificados Cloud Forttiva</p>
        </div>
        <button onClick={handleOpenForm} className="bg-[#0c2a1c] text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider hover:bg-[#16462d] transition-all flex items-center justify-center gap-2 shadow-xl active:scale-95 shrink-0">
          <Plus size={18} /> Novo Registro
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-6 rounded-[32px] border border-slate-200/80 shadow-sm flex items-center gap-4 min-w-0">
           <div className="w-12 h-12 bg-[#eaf0e3] text-[#16462d] rounded-xl flex items-center justify-center shrink-0"><ArrowUpCircle size={24} /></div>
           <div className="min-w-0">
             <p className="text-[8px] font-black text-[#4b6f34] uppercase tracking-wider truncate">
               Receitas {(startDate || endDate || categoryFilter.length > 0 || searchQuery) ? 'Filtradas' : 'Totais'}
             </p>
             <p className="text-lg font-black text-[#16462d] truncate">{formatMoney(totalIn)}</p>
           </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-200/80 shadow-sm flex items-center gap-4 min-w-0">
           <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0"><ArrowDownCircle size={24} /></div>
           <div className="min-w-0">
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider truncate">
               Despesas {(startDate || endDate || categoryFilter.length > 0 || searchQuery) ? 'Filtradas' : 'Totais'}
             </p>
             <p className="text-lg font-black text-rose-600 truncate">{formatMoney(totalOut)}</p>
           </div>
        </div>
        <div className="bg-[#0c2a1c] text-white p-6 rounded-[32px] shadow-2xl flex items-center gap-4 border border-[#7ea24e]/20 min-w-0">
           <div className="w-12 h-12 bg-white/10 text-[#7ea24e] rounded-xl flex items-center justify-center shrink-0"><Wallet size={24} /></div>
           <div className="min-w-0">
             <p className="text-[8px] font-black text-[#9bb779] uppercase tracking-wider truncate">Saldo no Período</p>
             <p className={`text-lg font-black truncate ${totalBalance >= 0 ? 'text-[#7ea24e]' : 'text-rose-400'}`}>{formatMoney(totalBalance)}</p>
           </div>
        </div>
      </div>

      {/* Barra de Filtros Atualizada com Multi-Checkbox */}
      <div className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
          <Filter size={14}/> Filtragem e Busca Avançada
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              className="w-full bg-slate-50 border border-slate-100 pl-11 pr-4 py-3 rounded-2xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-slate-900 transition-all" 
              placeholder="BUSCAR REFERÊNCIA..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Multi-Select Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              className="w-full bg-slate-50 border border-slate-100 p-3 rounded-2xl text-[10px] font-black uppercase flex items-center justify-between hover:bg-white hover:border-slate-900 transition-all text-left"
            >
              <span className="truncate">
                {categoryFilter.length === 0 ? 'TODAS AS CATEGORIAS' : `${categoryFilter.length} SELECIONADAS`}
              </span>
              <ChevronDown size={14} className={`transition-transform ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCategoryDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-3 space-y-1 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                <button 
                  onClick={() => setCategoryFilter([])}
                  className="w-full text-left p-2 rounded-xl text-[9px] font-black uppercase text-rose-500 hover:bg-rose-50 transition-colors mb-1"
                >
                  LIMPAR SELEÇÃO
                </button>
                {state.financeCategories.map(cat => (
                  <label 
                    key={cat} 
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group"
                  >
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={categoryFilter.includes(cat)} 
                      onChange={() => toggleCategory(cat)} 
                    />
                    <div className={`transition-all ${categoryFilter.includes(cat) ? 'text-emerald-600 scale-110' : 'text-slate-300 group-hover:text-slate-400'}`}>
                      {categoryFilter.includes(cat) ? <CheckSquare size={18} /> : <Square size={18} />}
                    </div>
                    <span className={`text-[10px] font-black uppercase transition-colors ${categoryFilter.includes(cat) ? 'text-slate-900' : 'text-slate-500'}`}>
                      {cat}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
             <Calendar size={14} className="text-slate-400" />
             <div className="flex flex-col">
               <label className="text-[7px] font-black text-slate-400 uppercase">DE:</label>
               <input type="date" className="bg-transparent text-[10px] font-black outline-none" value={startDate} onChange={e => setStartDate(e.target.value)} />
             </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
             <Calendar size={14} className="text-slate-400" />
             <div className="flex flex-col">
               <label className="text-[7px] font-black text-slate-400 uppercase">ATÉ:</label>
               <input type="date" className="bg-transparent text-[10px] font-black outline-none" value={endDate} onChange={e => setEndDate(e.target.value)} />
             </div>
          </div>
        </div>
        {(searchQuery || categoryFilter.length > 0 || startDate || endDate) && (
          <button 
            onClick={() => { setSearchQuery(''); setCategoryFilter([]); setStartDate(''); setEndDate(''); }}
            className="text-[9px] font-black text-rose-500 uppercase flex items-center gap-2 hover:opacity-70"
          >
            <X size={14}/> Limpar filtros selecionados
          </button>
        )}
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex bg-slate-50 p-2 border-b border-slate-100">
           <button onClick={() => setActiveTab('in')} className={`flex-1 py-4 text-[10px] font-black uppercase rounded-2xl transition-all ${activeTab === 'in' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Entradas</button>
           <button onClick={() => setActiveTab('out')} className={`flex-1 py-4 text-[10px] font-black uppercase rounded-2xl transition-all ${activeTab === 'out' ? 'bg-white text-rose-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Saídas</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
                <tr className="text-[9px] font-black uppercase text-slate-400 bg-slate-50/50 border-b border-slate-100">
                  <th className="px-8 py-5">Data</th>
                  <th className="px-8 py-5">Referência</th>
                  <th className="px-8 py-5">Categoria</th>
                  <th className="px-8 py-5 text-right">Valor</th>
                  <th className="px-8 py-5 text-center">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {filteredData.length === 0 ? (
                  <tr><td colSpan={5} className="px-8 py-20 text-center italic text-slate-300 uppercase text-[10px] font-black">Nenhum lançamento encontrado para os critérios de busca</td></tr>
                ) : (
                  filteredData.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                      <td className="px-8 py-4 text-[10px] font-bold text-slate-500">{item.date.split('-').reverse().join('/')}</td>
                      <td className="px-8 py-4 text-[10px] font-black uppercase text-slate-800">{item.reference}</td>
                      <td className="px-8 py-4"><span className="text-[8px] font-black uppercase bg-slate-100 px-3 py-1 rounded-lg text-slate-500">{item.category}</span></td>
                      <td className={`px-8 py-4 text-right font-black text-sm ${activeTab === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>{formatMoney(item.value)}</td>
                      <td className="px-8 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleEdit(item)} className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => setConfirmDelete({ isOpen: true, id: item.id })} className="p-2 text-slate-300 hover:text-rose-600 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
            </tbody>
            {filteredData.length > 0 && (
              <tfoot className="bg-slate-50/80 border-t border-slate-100">
                <tr>
                  <td colSpan={3} className="px-8 py-4 text-[9px] font-black uppercase text-slate-400">Total na Lista ({activeTab === 'in' ? 'Receitas' : 'Despesas'})</td>
                  <td className={`px-8 py-4 text-right font-black text-sm ${activeTab === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>{formatMoney(activeTab === 'in' ? totalIn : totalOut)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
           <form onSubmit={handleSaveMove} className="bg-white rounded-[40px] w-full max-w-sm p-10 space-y-6 shadow-2xl animate-in zoom-in-95 border border-slate-100">
              <div className="flex justify-between items-center border-b border-slate-50 pb-5">
                <div>
                   <h3 className="font-black uppercase text-xs text-slate-900">{editingId ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
                   <p className={`text-[9px] font-bold uppercase mt-1 ${formData.type === 'in' ? 'text-emerald-500' : 'text-rose-500'}`}>
                     {formData.type === 'in' ? 'Entrada de Receita' : 'Saída de Despesa'}
                   </p>
                </div>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="p-2 hover:bg-slate-50 rounded-full transition-all"><X size={20}/></button>
              </div>

              <div className="flex bg-slate-100 p-1.5 rounded-2xl">
                 <button 
                  type="button" 
                  onClick={() => setFormData({...formData, type: 'in'})}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${formData.type === 'in' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                 >
                   <ArrowUpCircle size={14}/> Entrada
                 </button>
                 <button 
                  type="button" 
                  onClick={() => setFormData({...formData, type: 'out'})}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${formData.type === 'out' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}
                 >
                   <ArrowDownCircle size={14}/> Saída
                 </button>
              </div>

              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">VALOR DO LANÇAMENTO</label>
                    <input 
                      type="text"
                      required 
                      className={`w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-black text-xs outline-none focus:bg-white transition-all ${formData.type === 'in' ? 'focus:border-emerald-500' : 'focus:border-rose-500'}`} 
                      placeholder="0,00" 
                      value={formData.value} 
                      onChange={e => setFormData({...formData, value: e.target.value})} 
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">DATA DE COMPETÊNCIA</label>
                    <input type="date" required className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-black text-xs outline-none focus:bg-white" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">REFERÊNCIA DO TÍTULO</label>
                    <input className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-black text-xs uppercase outline-none focus:bg-white" placeholder="EX: PAGAMENTO DE COMBUSTÍVEL" value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value.toUpperCase()})} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">CATEGORIA</label>
                    <select className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-black text-xs outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                       {state.financeCategories.map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
                    </select>
                 </div>
                 <button 
                  disabled={isLoading} 
                  className={`w-full text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl ${formData.type === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                 >
                   {isLoading ? <Loader2 className="animate-spin" size={16} /> : (editingId ? 'SALVAR ALTERAÇÕES' : `EFETIVAR ${formData.type === 'in' ? 'RECEITA' : 'DESPESA'}`)}
                 </button>
              </div>
           </form>
        </div>
      )}
      <ConfirmationModal isOpen={!!confirmDelete?.isOpen} onClose={() => setConfirmDelete(null)} onConfirm={async () => { await dbDelete('cash_flow', confirmDelete!.id); await refreshData(); notify("Lançamento removido"); }} title="Excluir" message="Remover permanentemente do banco?" />
    </div>
  );
};

export default Finance;
