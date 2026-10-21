
import { GoogleGenAI } from "@google/genai";
import { AppState } from "../types";

export const askAssistant = async (history: { role: 'user' | 'bot'; text: string }[], state: AppState) => {
  // Inicialização usando a API KEY do ambiente conforme as diretrizes
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Obter meta do mês atual para o contexto (Formato YYYY-MM)
  const currentMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const currentGoal = state.monthlyGoals[currentMonthKey] || { production: 0, revenue: 0 };

  // Compilação do contexto operacional para a IA "enxergar" o sistema
  const context = {
    totalAreas: state.areas.length,
    productionM2: state.areas.reduce((acc, area) => acc + area.services.reduce((sAcc, s) => sAcc + s.areaM2, 0), 0),
    totalRevenue: state.areas.reduce((acc, area) => acc + area.services.reduce((sAcc, s) => sAcc + s.totalValue, 0), 0),
    cashBalance: state.cashIn.reduce((acc, c) => acc + c.value, 0) - state.cashOut.reduce((acc, c) => acc + c.value, 0),
    lowStockItems: state.inventory.filter(i => i.currentQty <= i.minQty).map(i => i.name),
    goalM2: currentGoal.production,
    activeEmployees: state.employees.filter(e => e.status === 'active').length
  };

  const contents = history.map(msg => ({
    role: msg.role === 'bot' ? 'model' : 'user',
    parts: [{ text: msg.text }]
  }));

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: contents,
      config: {
        systemInstruction: `Você é o Diretor de Operações da Fera Service. 
        Você tem acesso aos seguintes dados em tempo real: ${JSON.stringify(context)}.
        Sua missão é ajudar o gestor a tomar decisões sobre faturamento, produtividade e estoque.
        Utilize a ferramenta de busca do Google para obter regulamentações urbanas, preços de mercado de insumos ou notícias do setor se necessário.
        Seja conciso, profissional e use R$ para valores monetários.`,
        temperature: 0.7,
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });

    // Acessa a propriedade .text diretamente da resposta
    return response.text;
  } catch (error) {
    console.error("Erro no Fera Bot:", error);
    return "Desculpe, tive um problema ao processar sua solicitação. Verifique sua conexão ou tente novamente.";
  }
};
