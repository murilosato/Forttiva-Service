
import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, UserRole } from './types';
import { INITIAL_STATE } from './constants';
import { supabase, fetchUserProfile, fetchCompleteCompanyData, signOut } from './lib/supabase';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Production from './components/Production';
import Finance from './components/Finance';
import AccountsPayable from './components/AccountsPayable';
import Inventory from './components/Inventory';
import Employees from './components/Employees';
import Settings from './components/Settings';
import Login from './components/Login';
import Analytics from './components/Analytics';
import DRE from './components/DRE';
import Management from './components/Management';
import Support from './components/Support';
import ConfirmationModal from './components/ConfirmationModal';
import { RefreshCw, LogOut, AlertCircle, X, CheckCircle2 } from 'lucide-react';

const App = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  
  const currentUserRef = useRef<string | null>(null);

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const syncData = useCallback(async (userId: string, retryCount = 0) => {
    try {
      const profile = await fetchUserProfile(userId);
      
      if (!profile) {
        if (retryCount < 2) { 
          setTimeout(() => syncData(userId, retryCount + 1), 1500);
          return;
        }
        setInitError("PERFIL OPERACIONAL NÃO ENCONTRADO.");
        setIsInitializing(false);
        return;
      }

      if (!profile.company_id) {
        setInitError("USUÁRIO SEM UNIDADE.");
        setIsInitializing(false);
        return;
      }

      const companyData = await fetchCompleteCompanyData(profile.company_id);
      
      setState(prev => ({
        ...prev,
        currentUser: {
          id: profile.id,
          email: profile.email || '',
          name: profile.full_name || 'Usuário',
          role: profile.role as UserRole || UserRole.OPERATIONAL,
          companyId: profile.company_id,
          status: profile.status as 'ativo' | 'suspenso' || 'ativo',
          permissions: profile.permissions || INITIAL_STATE.users[0].permissions
        },
        ...(companyData || {})
      }));
      
      currentUserRef.current = userId;
      setInitError(null);
      setIsInitializing(false);
    } catch (e: any) {
      setInitError("FALHA DE COMUNICAÇÃO.");
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Aviso na recuperação de sessão:', error);
          setIsInitializing(false);
          return;
        }
        const session = data?.session;
        if (session?.user) {
          currentUserRef.current = session.user.id;
          await syncData(session.user.id);
        } else {
          setIsInitializing(false);
        }
      } catch (e) {
        console.warn('Exceção ao recuperar sessão:', e);
        setIsInitializing(false);
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        if (currentUserRef.current !== session.user.id) {
          setIsInitializing(true);
          syncData(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        currentUserRef.current = null;
        setState({ ...INITIAL_STATE, currentUser: null });
        setIsInitializing(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [syncData]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#092318] text-center p-6">
        <div className="w-16 h-16 border-4 border-emerald-950 border-t-[#76994e] rounded-full animate-spin shadow-[0_0_25px_rgba(118,153,78,0.35)]" />
        <div className="mt-8 space-y-1">
          <h2 className="font-black text-white uppercase tracking-[0.3em] text-[12px]">FORTTIVA SERVICE</h2>
          <p className="text-[10px] text-[#a2b882] font-semibold italic tracking-wider">Força e eficiência em campo.</p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#092318] p-6">
        <div className="bg-[#0f3322] border border-white/10 p-10 rounded-[40px] max-w-sm w-full text-center shadow-2xl">
           <AlertCircle size={32} className="text-rose-400 mx-auto mb-6" />
           <p className="text-[11px] text-slate-300 font-bold uppercase mb-8">{initError}</p>
           <div className="space-y-3">
             <button onClick={() => window.location.reload()} className="w-full bg-white text-[#092318] py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-100 transition-all">Reconectar</button>
             <button onClick={async () => { await signOut(); setInitError(null); }} className="w-full bg-white/10 text-white/70 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all">Voltar ao Login</button>
           </div>
        </div>
      </div>
    );
  }

  if (!state.currentUser) return <Login onLogin={() => {}} users={[]} />;

  return (
    <>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab} userRole={state.currentUser.role} user={state.currentUser} onLogout={() => setShowLogoutConfirm(true)}>
        {(() => {
          const props = { state, setState, setActiveTab, notify };
          switch (activeTab) {
            case 'dashboard': return <Dashboard {...props} />;
            case 'production': return <Production {...props} />;
            case 'finance': return <Finance {...props} />;
            case 'accounts-payable': return <AccountsPayable {...props} />;
            case 'inventory': return <Inventory {...props} />;
            case 'employees': return <Employees {...props} />;
            case 'analytics': return <Analytics {...props} />;
            case 'dre': return <DRE {...props} />;
            case 'management': return <Management {...props} />;
            case 'settings': return <Settings {...props} />;
            case 'support': return <Support {...props} />;
            default: return <Dashboard {...props} />;
          }
        })()}
      </Layout>

      {notification && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[1000] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-4 border ${notification.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-rose-600 border-rose-500 text-white'}`}>
           <p className="text-[10px] font-black uppercase tracking-widest">{notification.message}</p>
        </div>
      )}

      <ConfirmationModal isOpen={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} onConfirm={async () => { await signOut(); setShowLogoutConfirm(false); }} title="Sair do Sistema" message="Deseja encerrar sua sessão segura?" confirmText="Sair" type="warning" />
    </>
  );
};

export default App;
