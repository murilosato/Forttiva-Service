import React, { useState } from 'react';
import { User, UserRole } from '../types';
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
  Cog,
  Users,
  Leaf
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

  const brandImage = "/assets/aistudio/WhatsApp_Image_2026-10-12_at_20.36.31_50e3bb67.jpeg";

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
        setError('Falha de conexão com o Supabase. Verifique sua conexão com a internet ou se extensões de bloqueio estão ativas.');
      } else {
        setError(msg || 'Falha na autenticação.');
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#092318] flex items-center justify-center p-4 font-sans antialiased relative overflow-hidden">
      {/* Background with Brand Radial Gradients */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-10 blur-sm scale-105"
        style={{ backgroundImage: `url("${brandImage}")` }} 
      />
      <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#14432a]/40 via-[#092318]/90 to-[#04120c]" />
      
      {/* Botão de Instalação PWA */}
      <button 
        onClick={() => setShowInstallModal(true)}
        className="fixed top-6 right-6 flex items-center gap-2.5 bg-white/5 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-2xl shadow-sm hover:bg-white/10 text-white transition-all active:scale-95 z-20"
      >
        <Download size={16} className="text-[#a2b882]" />
        <span className="text-[10px] font-black uppercase tracking-widest">Instalar App</span>
      </button>

      <div className="w-full max-w-[440px] relative z-10 py-6">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
           <div className="bg-[#071c13] p-4 rounded-3xl border border-white/10 shadow-2xl mb-4">
             <ForttivaLogo variant="light" size="lg" showSlogan={true} />
           </div>

           {/* Brand Pillars / Ícones da Marca */}
           <div className="grid grid-cols-4 gap-2 w-full max-w-[360px] mt-2">
             <div className="bg-white/5 border border-white/5 rounded-xl p-2 text-center flex flex-col items-center">
               <ShieldCheck size={14} className="text-[#a2b882] mb-0.5" />
               <span className="text-[7.5px] font-bold text-white/70 uppercase tracking-wider">Segurança</span>
             </div>
             <div className="bg-white/5 border border-white/5 rounded-xl p-2 text-center flex flex-col items-center">
               <Cog size={14} className="text-[#a2b882] mb-0.5" />
               <span className="text-[7.5px] font-bold text-white/70 uppercase tracking-wider">Eficiência</span>
             </div>
             <div className="bg-white/5 border border-white/5 rounded-xl p-2 text-center flex flex-col items-center">
               <Users size={14} className="text-[#a2b882] mb-0.5" />
               <span className="text-[7.5px] font-bold text-white/70 uppercase tracking-wider">Equipe</span>
             </div>
             <div className="bg-white/5 border border-white/5 rounded-xl p-2 text-center flex flex-col items-center">
               <Leaf size={14} className="text-[#a2b882] mb-0.5" />
               <span className="text-[7.5px] font-bold text-white/70 uppercase tracking-wider">Resultado</span>
             </div>
           </div>
        </div>

        {/* Card de Login */}
        <div className="bg-white/[0.08] backdrop-blur-2xl rounded-[40px] shadow-2xl overflow-hidden border border-white/15 animate-in zoom-in-95 duration-500">
          <form onSubmit={handleSubmit} className="p-8 sm:p-10 space-y-6">
            <div className="text-center">
               <h2 className="text-[11px] font-black text-white/70 uppercase tracking-[0.25em]">
                  Terminal Seguro de Operações
               </h2>
               <p className="text-[9px] text-[#a2b882] font-semibold mt-1 uppercase tracking-wider">
                  Acesse com suas credenciais Forttiva
               </p>
            </div>

            {error && (
              <div className="bg-rose-500/20 border border-rose-500/30 text-rose-100 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-center">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-3">E-mail Operacional</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30" size={17} />
                  <input 
                    type="email" 
                    required
                    className="w-full bg-white/5 border border-white/10 pl-13 pr-4 py-4 rounded-[22px] text-[13px] text-white font-black outline-none focus:border-[#76994e] focus:bg-white/10 transition-all placeholder:text-white/20"
                    placeholder="usuario@forttivaservicos.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black text-white/40 uppercase tracking-widest ml-3">Chave de Segurança</label>
                <div className="relative">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-white/30" size={17} />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required
                    className="w-full bg-white/5 border border-white/10 pl-13 pr-12 py-4 rounded-[22px] text-[13px] text-white font-black outline-none focus:border-[#76994e] focus:bg-white/10 transition-all placeholder:text-white/20"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white">
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#1b4d2e] hover:bg-[#23633c] text-white disabled:opacity-50 py-4.5 rounded-[22px] font-black uppercase text-[11px] tracking-[0.25em] transition-all flex items-center justify-center gap-2.5 active:scale-95 shadow-[0_0_25px_rgba(27,77,46,0.6)] border border-[#76994e]/40"
            >
              {isLoading ? <Loader2 className="animate-spin" size={19} /> : <>ENTRAR NO SISTEMA <ArrowRight size={18} /></>}
            </button>
          </form>

          <div className="bg-[#05150e]/60 p-5 flex items-center justify-center gap-2.5 border-t border-white/10">
             <Smartphone size={15} className="text-[#a2b882]/60" />
             <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.15em]">
               Forttiva Cloud Terminal v4.0
             </span>
          </div>
        </div>
      </div>

      {/* Modal de Instalação do App */}
      {showInstallModal && (
        <div className="fixed inset-0 z-[100] bg-[#092318]/90 backdrop-blur-md flex items-center justify-center p-4">
           <div className="bg-white rounded-[40px] w-full max-w-sm p-8 text-center relative overflow-hidden shadow-2xl animate-in zoom-in-95">
              <button onClick={() => setShowInstallModal(false)} className="absolute top-5 right-5 text-slate-300 hover:text-slate-900"><X size={22}/></button>
              
              <div className="flex flex-col items-center gap-3 mt-2">
                <img src={brandImage} alt="Forttiva App Icon" className="w-20 h-20 rounded-2xl shadow-xl border border-slate-100 object-cover" />
                <h3 className="text-sm font-black uppercase text-[#092318] tracking-widest">Forttiva Service App</h3>
                <p className="text-[10px] text-[#52793b] font-bold italic">Força e eficiência em campo.</p>
              </div>

              <div className="my-6 space-y-3">
                <p className="text-[11px] font-bold text-slate-600 uppercase leading-relaxed text-left bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                  <span className="text-[#1b4d2e] block mb-1 font-black">Para Android:</span>
                  No menu do navegador (três pontos), selecione "Instalar aplicativo" ou "Adicionar à tela inicial".
                </p>
                <p className="text-[11px] font-bold text-slate-600 uppercase leading-relaxed text-left bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                  <span className="text-[#1b4d2e] block mb-1 font-black">Para iOS / iPhone:</span>
                  No botão de compartilhar (ícone quadrado com seta), selecione "Adicionar à Tela de Início".
                </p>
              </div>

              <button onClick={() => setShowInstallModal(false)} className="w-full bg-[#092318] hover:bg-[#14432a] text-white py-4 rounded-[18px] font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">ENTENDI</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Login;
