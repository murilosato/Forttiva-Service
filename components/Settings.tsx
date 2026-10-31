
import React, { useState, useEffect } from 'react';
import { AppState } from '../types';
import { Building, DollarSign, Loader2, Save, Tag, Plus, Package, Trash2, Users, Receipt } from 'lucide-react';
import { dbSave, fetchCompleteCompanyData } from '../lib/supabase';

interface SettingsProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

const Settings: React.FC<SettingsProps> = ({ state, setState, notify }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [newEntries, setNewEntries] = useState({ finance: '', inventory: '', roles: '', accountsPayable: '' });
  
  const [companyForm, setCompanyForm] = useState({
    name: state.company?.name || '',
    cnpj: state.company?.cnpj || '',
    phone: state.company?.phone || '',
    address: state.company?.address || '',
    email: state.company?.email || '',
    website: state.company?.website || ''
  });

  const [localRates, setLocalRates] = useState<Record<string, number>>(state.serviceRates);
  const [localServiceGoals, setLocalServiceGoals] = useState<Record<string, number>>(state.serviceGoals);

  useEffect(() => {
    setLocalRates(state.serviceRates);
    setLocalServiceGoals(state.serviceGoals);
    if (state.company) {
      setCompanyForm({
        name: state.company.name || '',
        cnpj: state.company.cnpj || '',
        phone: state.company.phone || '',
        address: state.company.address || '',
        email: state.company.email || '',
        website: state.company.website || ''
      });
    }
  }, [state.serviceRates, state.serviceGoals, state.company]);

  const refreshData = async () => {
    const targetId = state.currentUser?.companyId;
    if (targetId) {
      const isMaster = state.currentUser?.role === 'DIRETORIA_MASTER' || (state.currentUser?.role as any) === 'ADMINISTRADOR' || (state.currentUser?.role as any) === 'MASTER';
      const data = await fetchCompleteCompanyData(targetId, isMaster);
      if (data) setState(prev => ({ ...prev, ...data }));
    }
  };

  const handleUpdateCompany = async () => {
    if (!state.currentUser?.companyId) return;
    setIsLoading(true);
    try {
      await dbSave('companies', { 
        id: state.currentUser.companyId, 
        ...companyForm 
      });
      await refreshData();
      notify("Dados da empresa atualizados!");
    } catch (e) {
      notify("Erro ao salvar dados da empresa", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRatesAndGoals = async () => {
    if (!state.currentUser?.companyId) return;
    setIsLoading(true);
    try {
      await dbSave('companies', {
        id: state.currentUser.companyId,
        serviceRates: localRates,
        serviceGoals: localServiceGoals
      });
      await refreshData();
      notify("Valores técnicos e metas atualizados!");
    } catch (e) {
      notify("Erro ao salvar configurações técnicas", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateList = async (listKey: 'finance' | 'inventory' | 'roles' | 'accountsPayable', action: 'add' | 'remove', value: string) => {
    const companyId = state.currentUser?.companyId;
    if (!companyId) return notify("Erro: Empresa não identificada", "error");

    const trimmedValue = value.trim().toUpperCase();
    if (action === 'add' && !trimmedValue) return;

    setIsLoading(true);

    try {
      let dbField = '';
      let stateKey: keyof AppState;

      if (listKey === 'finance') {
        dbField = 'financeCategories';
        stateKey = 'financeCategories';
      } else if (listKey === 'inventory') {
        dbField = 'inventoryCategories';
        stateKey = 'inventoryCategories';
      } else if (listKey === 'accountsPayable') {
        dbField = 'accountsPayableCategories';
        stateKey = 'accountsPayableCategories';
      } else {
        dbField = 'employeeRoles';
        stateKey = 'employeeRoles';
      }

      const currentList = (state[stateKey] as string[]) || [];
      let updatedList: string[] = [];

      if (action === 'add') {
        if (currentList.some(item => item.toUpperCase() === trimmedValue)) {
          setIsLoading(false);
          return notify("Item já cadastrado", "error");
        }
        updatedList = [...currentList, trimmedValue];
      } else {
        updatedList = currentList.filter(item => item.toUpperCase() !== trimmedValue);
      }

      await dbSave('companies', {
        id: companyId,
        [dbField]: updatedList
      });

      setState(prev => ({ ...prev, [stateKey]: updatedList }));

      if (action === 'add') {
        setNewEntries(prev => ({ ...prev, [listKey]: '' }));
      }

      notify(action === 'add' ? "Parâmetro adicionado" : "Parâmetro removido");
    } catch (e: any) {
      notify("Erro ao atualizar configurações", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <header>
        <h2 className="text-xl font-black text-[#0c2a1c] uppercase tracking-tight">Configurações Gerais</h2>
        <p className="text-[10px] text-[#4b6f34] font-bold uppercase tracking-widest mt-1">Definição de Parâmetros e Identidade Forttiva</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200/80 p-8 rounded-[40px] shadow-sm space-y-6">
          <h3 className="font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 text-[#0c2a1c]">
            <Building size={20} className="text-[#7ea24e]"/> Identidade da Unidade
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block">Razão Social</label>
                <input className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-[#7ea24e]" placeholder="FORTTIVA SERVIÇOS" value={companyForm.name} onChange={e => setCompanyForm({...companyForm, name: e.target.value})} />
             </div>
             <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block">CNPJ</label>
                <input className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-[10px] font-black outline-none focus:bg-white focus:border-[#7ea24e]" placeholder="00.000.000/0001-00" value={companyForm.cnpj} onChange={e => setCompanyForm({...companyForm, cnpj: e.target.value})} />
             </div>
             <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block">Telefone de Contato</label>
                <input className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-[10px] font-black outline-none focus:bg-white focus:border-[#7ea24e]" placeholder="(00) 00000-0000" value={companyForm.phone} onChange={e => setCompanyForm({...companyForm, phone: e.target.value})} />
             </div>
             <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block">Site / Website</label>
                <input className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-[10px] font-black outline-none focus:bg-white focus:border-[#7ea24e]" placeholder="WWW.FORTTIVASERVICOS.COM.BR" value={companyForm.website} onChange={e => setCompanyForm({...companyForm, website: e.target.value})} />
             </div>
             <div className="sm:col-span-2 space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block">Endereço Completo</label>
                <input className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-[10px] font-black uppercase outline-none focus:bg-white focus:border-[#7ea24e]" placeholder="RUA, NÚMERO, BAIRRO, CIDADE - UF" value={companyForm.address} onChange={e => setCompanyForm({...companyForm, address: e.target.value})} />
             </div>
          </div>
          <button onClick={handleUpdateCompany} disabled={isLoading} className="w-full bg-[#0c2a1c] text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-wider shadow-lg hover:bg-[#16462d] transition-all flex items-center justify-center gap-2 active:scale-95">
             {isLoading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} ATUALIZAR DADOS EMPRESARIAIS
          </button>
        </div>

        <div className="bg-white border border-slate-200 p-8 rounded-[40px] shadow-sm space-y-6">
          <h3 className="font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 text-slate-900">
            <DollarSign size={20} className="text-emerald-500"/> Configuração de Metas e Preços
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[9px] font-black uppercase text-slate-400 border-b">
                  <th className="py-2">Serviço</th>
                  <th className="py-2 text-right">V. Unitário (R$)</th>
                  <th className="py-2 text-right">Meta Técnica (m²/KM)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.keys(localRates).map((serviceType) => (
                  <tr key={serviceType}>
                    <td className="py-3 text-[9px] font-black uppercase text-slate-600 truncate max-w-[120px]" title={serviceType}>
                      {serviceType}
                    </td>
                    <td className="py-2 text-right">
                      <input type="number" step="0.01" className="w-20 bg-slate-50 border border-slate-100 p-2 rounded-xl text-[10px] font-black text-right outline-none focus:bg-white" value={localRates[serviceType]} onChange={e => setLocalRates({...localRates, [serviceType]: parseFloat(e.target.value) || 0})} />
                    </td>
                    <td className="py-2 text-right">
                      <input type="number" step="1" className="w-24 bg-slate-50 border border-slate-100 p-2 rounded-xl text-[10px] font-black text-right outline-none focus:bg-white" placeholder="Meta..." value={localServiceGoals[serviceType] || 0} onChange={e => setLocalServiceGoals({...localServiceGoals, [serviceType]: parseFloat(e.target.value) || 0})} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={handleUpdateRatesAndGoals} disabled={isLoading} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
             {isLoading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} SALVAR PARÂMETROS TÉCNICOS
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 p-6 rounded-[40px] space-y-4 shadow-sm">
          <h4 className="text-[10px] font-black uppercase text-emerald-600 flex gap-2 items-center tracking-widest"><Tag size={16}/> Categorias de Fluxo</h4>
          <div className="flex gap-2">
            <input className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-2xl text-[10px] font-black uppercase outline-none" placeholder="NOVO..." value={newEntries.finance} onChange={e => setNewEntries({...newEntries, finance: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleUpdateList('finance', 'add', newEntries.finance)} />
            <button onClick={() => handleUpdateList('finance', 'add', newEntries.finance)} disabled={isLoading} className="bg-slate-900 text-white p-3 rounded-2xl"><Plus size={16}/></button>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {state.financeCategories.map(c => (
              <div key={c} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-[8px] font-black flex items-center gap-2 uppercase text-slate-600">
                {c} <button onClick={() => handleUpdateList('finance', 'remove', c)}><Trash2 size={12} className="text-slate-300 hover:text-rose-600"/></button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-[40px] space-y-4 shadow-sm">
          <h4 className="text-[10px] font-black uppercase text-amber-600 flex gap-2 items-center tracking-widest"><Receipt size={16}/> Contas a Pagar</h4>
          <div className="flex gap-2">
            <input className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-2xl text-[10px] font-black uppercase outline-none" placeholder="NOVA CATEGORIA..." value={newEntries.accountsPayable} onChange={e => setNewEntries({...newEntries, accountsPayable: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleUpdateList('accountsPayable', 'add', newEntries.accountsPayable)} />
            <button onClick={() => handleUpdateList('accountsPayable', 'add', newEntries.accountsPayable)} disabled={isLoading} className="bg-slate-900 text-white p-3 rounded-2xl"><Plus size={16}/></button>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {(state.accountsPayableCategories || []).map(c => (
              <div key={c} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-[8px] font-black flex items-center gap-2 uppercase text-slate-600">
                {c} <button onClick={() => handleUpdateList('accountsPayable', 'remove', c)}><Trash2 size={12} className="text-slate-300 hover:text-rose-600"/></button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-[40px] space-y-4 shadow-sm">
          <h4 className="text-[10px] font-black uppercase text-blue-600 flex gap-2 items-center tracking-widest"><Package size={16}/> Categorias Estoque</h4>
          <div className="flex gap-2">
            <input className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-2xl text-[10px] font-black uppercase outline-none" placeholder="NOVA..." value={newEntries.inventory} onChange={e => setNewEntries({...newEntries, inventory: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleUpdateList('inventory', 'add', newEntries.inventory)} />
            <button onClick={() => handleUpdateList('inventory', 'add', newEntries.inventory)} disabled={isLoading} className="bg-slate-900 text-white p-3 rounded-2xl"><Plus size={16}/></button>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {state.inventoryCategories.map(c => (
              <div key={c} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-[8px] font-black flex items-center gap-2 uppercase text-slate-600">
                {c} <button onClick={() => handleUpdateList('inventory', 'remove', c)}><Trash2 size={12} className="text-slate-300 hover:text-rose-600"/></button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-[40px] space-y-4 shadow-sm">
          <h4 className="text-[10px] font-black uppercase text-indigo-600 flex gap-2 items-center tracking-widest"><Users size={16}/> Cargos Unidade</h4>
          <div className="flex gap-2">
            <input className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-2xl text-[10px] font-black uppercase outline-none" placeholder="NOVO..." value={newEntries.roles} onChange={e => setNewEntries({...newEntries, roles: e.target.value})} onKeyDown={e => e.key === 'Enter' && handleUpdateList('roles', 'add', newEntries.roles)} />
            <button onClick={() => handleUpdateList('roles', 'add', newEntries.roles)} disabled={isLoading} className="bg-slate-900 text-white p-3 rounded-2xl"><Plus size={16}/></button>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            {state.employeeRoles.map(r => (
              <div key={r} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-[8px] font-black flex items-center gap-2 uppercase text-slate-600">
                {r} <button onClick={() => handleUpdateList('roles', 'remove', r)}><Trash2 size={12} className="text-slate-300 hover:text-rose-600"/></button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
