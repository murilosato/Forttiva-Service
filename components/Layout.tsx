
import React from 'react';
import { 
  LayoutDashboard, 
  MapPin, 
  DollarSign, 
  Package, 
  Users, 
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
  ShieldCheck,
  LifeBuoy,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { User, UserRole } from '../types';
import ForttivaLogo from './ForttivaLogo';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole: UserRole;
  onLogout?: () => void;
  user?: User;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, userRole, onLogout, user }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Painel Inicial', icon: LayoutDashboard, permission: true },
    { id: 'production', label: 'Produção', icon: MapPin, permission: user?.permissions.production },
    { id: 'finance', label: 'Financeiro', icon: DollarSign, permission: user?.permissions.finance },
    { id: 'accounts-payable', label: 'Contas a Pagar', icon: Receipt, permission: user?.permissions.accountsPayable !== false && user?.permissions.finance },
    { id: 'inventory', label: 'Almoxarifado', icon: Package, permission: user?.permissions.inventory },
    { id: 'employees', label: 'Equipe & RH', icon: Users, permission: user?.permissions.employees },
    { id: 'analytics', label: 'Relatórios', icon: BarChart3, permission: user?.permissions.analytics },
    { id: 'dre', label: 'DRE', icon: TrendingUp, permission: user?.permissions.dre },
    { id: 'support', label: 'Suporte', icon: LifeBuoy, permission: true },
    { id: 'management', label: 'Gestão de Acessos', icon: ShieldCheck, permission: userRole === UserRole.MASTER || userRole === UserRole.ADMIN },
    { id: 'settings', label: 'Configurações', icon: Settings, permission: userRole === UserRole.MASTER || userRole === UserRole.ADMIN },
  ];

  const visibleItems = menuItems.filter(item => item.permission);

  const translateTab = (id: string) => {
    const item = menuItems.find(m => m.id === id);
    return item ? item.label : id;
  };

  const roleLabel = (role: UserRole) => {
    switch(role) {
      case UserRole.MASTER: return 'DIRETORIA MASTER';
      case UserRole.ADMIN: return 'GERÊNCIA';
      case UserRole.OPERATIONAL: return 'OPERACIONAL';
      default: return role;
    }
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full bg-[#071a11] text-slate-300 w-64 fixed left-0 top-0 z-50 border-r border-white/10 shadow-2xl">
      <div className="p-4 border-b border-white/10 bg-[#05140d] flex items-center justify-center">
        <ForttivaLogo variant="light" size="sm" />
      </div>
      
      <div className="p-5 border-b border-white/10 bg-[#0c2a1c]/70">
        <div className="px-1 flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black text-white truncate uppercase tracking-tight">{user?.name}</p>
            <p className="text-[9px] text-[#9bb779] font-black uppercase tracking-widest mt-0.5 truncate">{roleLabel(userRole)}</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-[#7ea24e] shrink-0 animate-pulse shadow-[0_0_8px_rgba(126,162,78,0.8)]"></div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all text-[10px] font-black uppercase tracking-wider text-left min-w-0 ${
              activeTab === item.id 
                ? 'bg-[#16462d] text-white shadow-lg border border-[#7ea24e]/40 shadow-[#16462d]/50' 
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`}
          >
            <item.icon size={18} className={`shrink-0 ${activeTab === item.id ? 'text-[#7ea24e]' : 'text-slate-400'}`} />
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-5 border-t border-white/10 bg-[#05140d]/60">
        <button 
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest min-w-0"
        >
          <LogOut size={17} className="shrink-0" />
          <span className="truncate">Encerrar Sessão</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f4f3ef] text-[#18221c] flex flex-col font-sans antialiased">
      <div className="lg:hidden flex items-center justify-between px-5 py-3.5 bg-[#071a11] border-b-2 border-[#7ea24e] text-white sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2 min-w-0">
           <ForttivaLogo variant="light" size="sm" showSlogan={false} />
           <span className="text-white/30 text-xs">|</span>
           <span className="font-black text-white text-xs uppercase tracking-tight truncate">
             {translateTab(activeTab)}
           </span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-white hover:bg-white/10 rounded-xl transition-all active:scale-90 shrink-0"
          aria-label="Abrir Menu"
        >
          <Menu size={22} />
        </button>
      </div>

      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-[#071a11]/85 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 shadow-2xl animate-in slide-in-from-left duration-200">
            <Sidebar />
          </div>
        </div>
      )}

      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-10 max-w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
