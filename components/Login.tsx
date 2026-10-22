import React, { useState } from 'react';
import { User } from '../types';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Loader2, 
  ArrowRight, 
  Smartphone, 
  Download, 
  X,
  ShieldCheck,
  Zap,
  Users2,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import ForttivaLogo from './ForttivaLogo';

interface LoginProps {
  onLogin: (user: any) => void;
  users: User[];
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showInstallModal, setShowInstallModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    setIsLoading(true);
    setError('');

    try {
      const cleanEmail = email.toLowerCase().trim();
      const cleanPassword = password.trim();

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword
      });

      if (authError) {
        if (authError.message === 'Invalid login credentials' || (authError as any).code === 'invalid_credentials') {
          throw new Error('E-mail ou senha incorretos.');
        } else if (authError.message === 'Email not confirmed') {
          throw new Error('E-mail pendente de confirmação no Supabase.');
        } else {
          throw new Error(authError.message || 'Erro ao realizar login.');
        }
      }
    } catch (err: any) {
      console.warn('Falha no login:', err);
      const msg = err.message || '';
      if (msg.includes('Failed to fetch') || err.name === 'TypeError') {
        setError('Falha de conexão com o servidor. Verifique sua conexão à internet.');
      } else {
        setError(msg || 'Falha na autenticação.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#061810] flex flex-col items-center justify-center p-4 sm:p-6 font-sans antialiased relative overflow-x-hidden selection:bg-[#7ea24e] selection:text-white">
      {/* Background with Ambient Radial Glows */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#17482e]/40 via-[#0a2318]/90 to-[#04120c] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#2d7d49]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#7ea24e]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Botão de Instalação PWA */}
      <button 
        type="button"
        onClick={() => setShowInstallModal(true)}
        className="fixed top-5 right-5 sm:top-6 sm:right-6 flex items-center gap-2 bg-white/10 hover:bg-white/15 backdrop-blur-md border border-white/15 px-4 py-2.5 rounded-2xl shadow-lg text-white transition-all active:scale-95 z-20 cursor-pointer"
      >
        <Download size={15} className="text-[#9bb779]" />
        <span className="text-[10px] font-black uppercase tracking-widest">Instalar App</span>
      </button>

      <div className="w-full max-w-[460px] relative z-10 py-6 flex flex-col items-center">
        {/* Brand Header com a Logo Oficial Forttiva Serviços */}
        <div className="flex flex-col items-center mb-6 w-full animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="hover:scale-[1.02] transition-transform duration-300">
            <ForttivaLogo variant="card" size="lg" />
          </div>

          {/* Pilares da Marca */}
          <div className="grid grid-cols-4 gap-2 w-full max-w-[420px] mt-5 px-1">
            <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-2.5 text-center flex flex-col items-center shadow-sm">
              <ShieldCheck size={16} className="text-[#9bb779] mb-1" />
              <span className="text-[8.5px] font-bold text-white/80 uppercase tracking-wider">Segurança</span>
            </div>
            <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-2.5 text-center flex flex-col items-center shadow-sm">
              <Zap size={16} className="text-[#9bb779] mb-1" />
              <span className="text-[8.5px] font-bold text-white/80 uppercase tracking-wider">Eficiência</span>
            </div>
            <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-2.5 text-center flex flex-col items-center shadow-sm">
              <Users2 size={16} className="text-[#9bb779] mb-1" />
              <span className="text-[8.5px] font-bold text-white/80 uppercase tracking-wider">Equipe</span>
            </div>
            <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-2.5 text-center flex flex-col items-center shadow-sm">
              <TrendingUp size={16} className="text-[#9bb779] mb-1" />
              <span className="text-[8.5px] font-bold text-white/80 uppercase tracking-wider">Resultado</span>
            </div>
          </div>
        </div>

        {/* Card de Login */}
        <div className="w-full bg-[#0a2318]/90 backdrop-blur-2xl rounded-[36px] shadow-[0_25px_60px_rgba(0,0,0,0.6)] overflow-hidden border border-white/15 animate-in zoom-in-95 duration-500">
          <form onSubmit={handleSubmit} className="p-7 sm:p-9 space-y-6">
            <div className="text-center">
              <h2 className="text-xs font-black text-white uppercase tracking-[0.25em]">
                Terminal Seguro de Operações
              </h2>
              <p className="text-[10px] text-[#9bb779] font-medium mt-1.5 uppercase tracking-wider">
                Acesse com suas credenciais corporativas
              </p>
            </div>

            {error && (
              <div className="bg-rose-500/15 border border-rose-500/30 text-rose-200 p-4 rounded-2xl text-[11px] font-bold text-center leading-relaxed animate-in fade-in">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Campo E-mail */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block ml-3">
                  E-mail Operacional
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4.5 text-[#9bb779] pointer-events-none flex items-center justify-center">
                    <Mail size={18} />
                  </div>
                  <input 
                    type="email" 
                    required
                    autoComplete="email"
                    className="w-full bg-[#061810]/80 border border-white/15 focus:border-[#7ea24e] focus:bg-[#082216] focus:ring-2 focus:ring-[#7ea24e]/25 text-white placeholder:text-white/30 text-[13px] font-semibold rounded-2xl py-3.5 pl-14 pr-4 outline-none transition-all duration-200 shadow-inner"
                    placeholder="usuario@forttivaservicos.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-white/70 uppercase tracking-wider block ml-3">
                  Chave de Segurança
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4.5 text-[#9bb779] pointer-events-none flex items-center justify-center">
                    <Lock size={18} />
                  </div>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required
                    autoComplete="current-password"
                    className="w-full bg-[#061810]/80 border border-white/15 focus:border-[#7ea24e] focus:bg-[#082216] focus:ring-2 focus:ring-[#7ea24e]/25 text-white placeholder:text-white/30 text-[13px] font-semibold rounded-2xl py-3.5 pl-14 pr-12 outline-none transition-all duration-200 shadow-inner"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-4.5 text-white/40 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                    aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Botão de Entrar */}
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#216138] via-[#2c7844] to-[#408e31] hover:from-[#297845] hover:to-[#4ca73b] text-white disabled:opacity-50 py-4 rounded-2xl font-black uppercase text-[11px] tracking-[0.22em] transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] shadow-[0_10px_25px_rgba(33,97,56,0.5)] border border-white/20 cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={18} />
                  <span>AUTENTICANDO...</span>
                </div>
              ) : (
                <>
                  <span>ENTRAR NO SISTEMA</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Rodapé do Card */}
          <div className="bg-[#04120b]/80 py-4 px-6 flex items-center justify-between border-t border-white/10">
            <div className="flex items-center gap-2 text-white/50">
              <Smartphone size={14} className="text-[#9bb779]" />
              <span className="text-[9px] font-black uppercase tracking-[0.18em]">
                Forttiva Cloud Terminal v4.2
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400/70 text-[9px] font-bold">
              <CheckCircle2 size={12} />
              <span>Conexão Segura</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Instalação PWA */}
      {showInstallModal && (
        <div className="fixed inset-0 z-[100] bg-[#061810]/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[36px] w-full max-w-sm p-7 text-center relative overflow-hidden shadow-2xl animate-in zoom-in-95">
            <button 
              onClick={() => setShowInstallModal(false)} 
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-900 p-1 rounded-full cursor-pointer transition-colors"
              aria-label="Fechar"
            >
              <X size={20}/>
            </button>
            
            <div className="flex flex-col items-center gap-3 mt-1">
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm">
                <img 
                  src="/assets/aistudio/image_d343a7bb.png" 
                  alt="Forttiva App Icon" 
                  className="h-10 w-auto object-contain" 
                />
              </div>
              <h3 className="text-sm font-black uppercase text-[#0c2a1c] tracking-widest">
                Forttiva Service App
              </h3>
              <p className="text-[11px] text-[#4b6f34] font-semibold italic">
                Força e eficiência em campo.
              </p>
            </div>

            <div className="my-5 space-y-3 text-left">
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100/80">
                <span className="text-[#16462d] block mb-1 font-black text-[10px] uppercase tracking-wider">
                  Android / Chrome:
                </span>
                <p className="text-[11px] font-medium text-slate-700 leading-relaxed">
                  Abra o menu do navegador (três pontinhos) e toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                </p>
              </div>

              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100/80">
                <span className="text-[#16462d] block mb-1 font-black text-[10px] uppercase tracking-wider">
                  iPhone / iOS (Safari):
                </span>
                <p className="text-[11px] font-medium text-slate-700 leading-relaxed">
                  Toque no botão de <strong>Compartilhar</strong> (ícone com quadrado e seta) e selecione <strong>"Adicionar à Tela de Início"</strong>.
                </p>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => setShowInstallModal(false)} 
              className="w-full bg-[#16462d] hover:bg-[#0c2a1c] text-white py-3.5 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-md active:scale-95 transition-all cursor-pointer"
            >
              ENTENDI
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
