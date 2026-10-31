
import React, { useState, useEffect } from 'react';
import { AppState, UserRole, UserPermissions } from '../types';
import { ShieldCheck, UserPlus, Search, Building, Loader2, X, Edit2, CheckCircle2, Lock, Save, Globe, Eye, EyeOff } from 'lucide-react';
import { supabase, dbSave } from '../lib/supabase';

interface ManagementProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

const Management: React.FC<ManagementProps> = ({ state, notify }) => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: UserRole.OPERATIONAL as UserRole,
    companyId: state.currentUser?.companyId || '',
    permissions: { production: true, finance: false, inventory: true, employees: false, analytics: false } as UserPermissions
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const isMaster = state.currentUser?.role === UserRole.MASTER;
      const { data: pros } = isMaster 
        ? await supabase.from('profiles').select('*').order('full_name')
        : await supabase.from('profiles').select('*').eq('company_id', state.currentUser?.companyId).order('full_name');
      const { data: cos } = isMaster
        ? await supabase.from('companies').select('*').order('name')
        : await supabase.from('companies').select('*').eq('id', state.currentUser?.companyId);
      setProfiles(pros || []);
      setCompanies(cos || []);
      if (cos && cos.length > 0 && !selectedCompanyId) setSelectedCompanyId(cos[0].id);
    } catch (e) { notify("Erro de conexão", "error"); } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      name: p.full_name,
      email: p.email || '',
      password: '',
      role: p.role,
      companyId: p.company_id || '',
      permissions: p.permissions || form.permissions
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!editingId) {
        const { error: authError } = await supabase.auth.signUp({ 
          email: form.email.trim().toLowerCase(), 
          password: form.password,
          options: {
            data: { 
              full_name: form.name.toUpperCase(),
              company_id: form.companyId,
              role: form.role
            }
          }
        });
        if (authError) throw authError;
      } else {
        await dbSave('profiles', {
          id: editingId,
          full_name: form.name.toUpperCase(),
          role: form.role,
          company_id: form.companyId,
          permissions: form.permissions,
        });
      }
      setShowForm(false);
      fetchData();
      notify("Cadastro realizado com sucesso.");
    } catch (e: any) { notify(e.message, "error"); } finally { setIsLoading(false); }
  };

  const isMaster = state.currentUser?.role === UserRole.MASTER || (state.currentUser?.role as any) === 'DIRETORIA_MASTER' || (state.currentUser?.role as any) === 'ADMINISTRADOR';
  const filteredProfiles = profiles.filter(p => !selectedCompanyId || p.company_id === selectedCompanyId || p.role === UserRole.MASTER || p.role === 'DIRETORIA_MASTER' || p.role === 'ADMINISTRADOR');

  const roleBadgeLabel = (role: string) => {
    if (role === UserRole.MASTER || role === 'DIRETORIA_MASTER' || role === 'ADMINISTRADOR') return 'ADMINISTRADOR';
    if (role === UserRole.ADMIN || role === 'GERENTE_UNIDADE' || role === 'GERÊNCIA') return 'GERÊNCIA';
    if (role === UserRole.OPERATIONAL || role === 'OPERACIONAL') return 'OPERACIONAL';
    return role ? role.replace('_', ' ') : '';
  };

  const permissionLabels: Record<string, string> = {
    production: 'Produção',
    finance: 'Financeiro',
    inventory: 'Estoque',
    employees: 'Equipe & RH',
    analytics: 'Relatórios'
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black uppercase text-[#0c2a1c] tracking-tight">Gestão de Acessos</h2>
          <p className="text-[10px] text-[#4b6f34] font-bold uppercase tracking-widest mt-1">Permissões e Terminais Forttiva</p>
        </div>
        <button onClick={() => { setEditingId(null); setShowForm(true); }} className="bg-[#0c2a1c] text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 shadow-xl hover:bg-[#16462d] transition-all active:scale-95">
           <UserPlus size={16} /> NOVO ACESSO
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {isMaster && (
          <div className="bg-white border border-slate-200/80 rounded-[32px] overflow-hidden shadow-sm flex flex-col h-[calc(100vh-250px)]">
            <div className="p-5 bg-slate-50 border-b text-[10px] font-black uppercase text-[#4b6f34] tracking-wider">Unidades</div>
            <div className="flex-1 overflow-auto p-3 space-y-1 scrollbar-hide">
               {companies.map(c => (
                 <button key={c.id} onClick={() => setSelectedCompanyId(c.id)} className={`w-full text-left p-4 rounded-2xl transition-all ${selectedCompanyId === c.id ? 'bg-[#0c2a1c] text-white shadow-xl' : 'hover:bg-slate-50 text-slate-600'}`}>
                    <p className="text-[10px] font-black uppercase truncate">{c.name}</p>
                 </button>
               ))}
            </div>
          </div>
        )}

        <div className={`bg-white border border-slate-200/80 rounded-[32px] overflow-hidden shadow-sm flex flex-col ${isMaster ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
          <div className="p-6 border-b flex items-center justify-between bg-slate-50/40">
             <div className="flex items-center gap-3 text-[10px] font-black uppercase text-[#4b6f34]">
                <ShieldCheck size={18} className="text-[#7ea24e]"/> Matriz de Usuários
             </div>
          </div>
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 border-b">
                <tr><th className="px-8 py-5 whitespace-nowrap">Nome</th><th className="px-8 py-5 whitespace-nowrap">Nível</th><th className="px-8 py-5 text-center whitespace-nowrap">Editar</th></tr>
              </thead>
              <tbody className="divide-y text-[11px] font-black uppercase text-slate-700">
                {filteredProfiles.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-8 py-5 truncate max-w-[200px]">{p.full_name}</td>
                    <td className="px-8 py-5 whitespace-nowrap">
                       <span className={`px-4 py-1.5 rounded-xl text-[8px] text-white ${p.role === UserRole.MASTER || p.role === 'DIRETORIA_MASTER' || p.role === 'ADMINISTRADOR' ? 'bg-[#0c2a1c]' : p.role === UserRole.ADMIN || p.role === 'GERENTE_UNIDADE' ? 'bg-[#16462d]' : 'bg-[#4b6f34]'}`}>
                         {roleBadgeLabel(p.role)}
                       </span>
                    </td>
                    <td className="px-8 py-5 text-center whitespace-nowrap">
                       <button onClick={() => handleEdit(p)} className="text-slate-300 hover:text-[#7ea24e] transition-colors"><Edit2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
           <form onSubmit={handleSave} className="bg-white rounded-[40px] w-full max-w-lg p-10 space-y-8 shadow-2xl overflow-y-auto max-h-[95vh]">
              <div className="flex justify-between items-center border-b pb-6">
                <h3 className="font-black uppercase text-sm text-slate-900">{editingId ? 'Editar Credencial' : 'Gerar Novo Acesso'}</h3>
                <button type="button" onClick={() => setShowForm(false)} className="text-slate-300"><X size={20}/></button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block">Nome Completo</label>
                   <input required className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-[10px] font-black uppercase" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block">E-mail</label>
                   <input required className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-[10px] font-black outline-none" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                {!editingId && (
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block">Senha</label>
                     <input required type="password" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-[10px] font-black outline-none" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block">Nível</label>
                      <select className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-[10px] font-black uppercase" value={form.role} onChange={e => setForm({...form, role: e.target.value as any})}>
                        <option value={UserRole.OPERATIONAL}>OPERACIONAL</option>
                        <option value={UserRole.ADMIN}>GERENTE</option>
                        {isMaster && <option value={UserRole.MASTER}>ADMINISTRADOR</option>}
                      </select>
                   </div>
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block">Unidade</label>
                      <select className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-[10px] font-black uppercase" value={form.companyId} onChange={e => setForm({...form, companyId: e.target.value})}>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                   </div>
                </div>

                <div className="space-y-3 pt-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-l-4 border-blue-500 pl-3">Módulos Ativos</h4>
                   <div className="grid grid-cols-2 gap-2">
                      {Object.keys(form.permissions).map(k => (
                        <button key={k} type="button" onClick={() => setForm({...form, permissions: {...form.permissions, [k as keyof UserPermissions]: !form.permissions[k as keyof UserPermissions]}})} className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${form.permissions[k as keyof UserPermissions] ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-100 opacity-60 text-slate-400'}`}>
                           <span className="text-[9px] font-black uppercase">{permissionLabels[k] || k}</span>
                           {form.permissions[k as keyof UserPermissions] && <CheckCircle2 size={16} className="text-emerald-500"/>}
                        </button>
                      ))}
                   </div>
                </div>
              </div>

              <button disabled={isLoading} className="w-full bg-slate-900 text-white py-4 rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-3">
                {isLoading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} SALVAR CREDENCIAL
              </button>
           </form>
        </div>
      )}
    </div>
  );
};
export default Management;
