
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import App from './App';

// Prevenir que erros transitórios de rede/AdBlock/iframe disparem alertas críticos
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason || '');
    if (
      reason?.name === 'AuthRetryableFetchError' ||
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError')
    ) {
      event.preventDefault();
      console.warn('[Supabase Auth Network Status]:', msg);
    }
  });
}

// Evitar recriação do root se o script for carregado múltiplas vezes
let root: Root | null = null;

const init = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  try {
    if (!root) {
      root = createRoot(rootElement);
    }
    
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Erro crítico ao montar o React:", error);
    rootElement.innerHTML = `
      <div style="padding: 40px; text-align: center; font-family: sans-serif;">
        <h1 style="color: #e11d48;">Erro de Inicialização</h1>
        <p>Não foi possível carregar o sistema. Por favor, recarregue a página.</p>
      </div>
    `;
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
