
import React, { useState } from 'react';
import { AppState, SupportRequest } from '../types';
import { LifeBuoy, Plus, Loader2, CheckCircle2, Clock, Trash2, X } from 'lucide-react';
import { dbSave, dbDelete, fetchCompleteCompanyData } from '../lib/supabase';

interface SupportProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

const Support: React.FC<SupportProps> = ({ state, setState, notify }) => {
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const refreshData = async () => {
    if (state.currentUser?.companyId) {
      const data = await fetchCompleteCompanyData(state.currentUser.companyId);
      if (data) setState(prev => ({ ...prev, ...data }));
    }
  };

  const handleAddRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return notify("Descreva sua solicitação", "error");

    setIsLoading(true);
    try {
      await dbSave('support_requests', {
        companyId: state.currentUser?.companyId,
        description: description.toUpperCase(),
        status: 'pendente'
      });
      await refreshData();
      setDescription('');
      setShowForm(false);
      notify("Solicitação enviada com sucesso!");
    } catch (e) {
      notify("Erro ao enviar solicitação", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleStatus = async (request: SupportRequest) => {
    setIsLoading(true);
    try {
      const newStatus = request.status === 'pendente' ? 'concluido' : 'pendente';
      await dbSave('support_requests', { ...request, status: newStatus });
      await refreshData();
      notify(`Status atualizado para ${newStatus.toUpperCase()}`);
    } catch (e) {
      notify("Erro ao atualizar status", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este ticket?")) return;
    setIsLoading(true);
    try {
      await dbDelete('support_requests', id);
      await refreshData();
      notify("Ticket removido");
    } catch (e) {
      notify("Erro ao excluir", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-[#0c2a1c] uppercase tracking-tight">Central de Suporte</h2>
          <p className="text-[10px] text-[#4b6f34] font-bold uppercase tracking-widest mt-1">Gestão de Tickets e Melhorias Forttiva</p>
        </div>
        <button 
          onClick={() => setShowForm(true)} 
          className="bg-[#0c2a1c] text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-wider hover:bg-[#16462d] transition-all flex items-center gap-2 shadow-xl active:scale-95 shrink-0"
        >
          <Plus size={18} /> Novo Ticket
        </button>
      </header>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
           <form onSubmit={handleAddRequest} className="bg-white rounded-[32px] w-full max-w-lg p-8 space-y-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
              <div className="flex justify-between items-center border-b pb-4">
                 <h3 className="text-sm font-black uppercase text-slate-900">Descreva sua Solicitação</h3>
                 <button type="button" onClick={() => setShowForm(false)} className="text-slate-300 hover:text-slate-900"><X size={20}/></button>
              </div>
              <textarea 
                required
                className="w-full bg-slate-50 border border-slate-200 p-5 rounded-2xl text-[11px] font-black uppercase outline-none focus:bg-white focus:border-slate-900 h-40 resize-none"
                placeholder="EXPLIQUE O QUE PRECISA (DÚVIDA, BUG OU SUGESTÃO)..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
              <button 
                disabled={isLoading}
                type="submit"
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18}/> : 'ABRIR CHAMADO'}
              </button>
           </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {state.supportRequests.length === 0 ? (
          <div className="bg-white p-20 rounded-[32px] border-2 border-dashed border-slate-200 text-center text-slate-400 font-black uppercase text-xs italic opacity-40">
            Nenhum ticket de suporte aberto no momento
          </div>
        ) : (
          state.supportRequests.map(req => (
            <div key={req.id} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between gap-6 hover:border-slate-200 transition-all">
               <div className="flex items-center gap-5 flex-1">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${req.status === 'concluido' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                     {req.status === 'concluido' ? <CheckCircle2 size={24}/> : <Clock size={24}/>}
                  </div>
                  <div>
                     <p className="text-[11px] font-black uppercase text-slate-800 leading-tight">{req.description}</p>
                     <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Aberto em: {new Date(req.createdAt).toLocaleString('pt-BR')}</p>
                  </div>
               </div>
               
               <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleStatus(req)}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all shadow-sm ${req.status === 'concluido' ? 'bg-slate-100 text-slate-500' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                  >
                    {req.status === 'concluido' ? 'REABRIR' : 'CONCLUIR'}
                  </button>
                  <button 
                    onClick={() => handleDelete(req.id)}
                    className="p-2 text-slate-200 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 size={18}/>
                  </button>
               </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Support;
