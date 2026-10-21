import React, { useState, useMemo } from 'react';
import { AppState, DREStatement, DREEntry, DRERecurringEntry } from '../types';
import { 
  TrendingUp, 
  Calendar, 
  Plus, 
  Trash2, 
  Save, 
  RefreshCw, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Calculator, 
  Edit2, 
  Check, 
  X,
  Copy,
  CheckCheck,
  Repeat,
  FileSpreadsheet,
  CreditCard,
  Building2,
  HelpCircle,
  Clock,
  Sparkles,
  ChevronRight,
  Send,
  AlertCircle,
  Layers,
  ArrowRight
} from 'lucide-react';
import { dbSave, dbDelete } from '../lib/supabase';
import { formatCurrencyBRL, parseCurrencyBRL, maskCurrencyInput, parsePastedCurrency } from '../lib/currencyFormat';
import ConfirmationModal from './ConfirmationModal';

interface DREProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  notify: (message: string, type?: 'success' | 'error') => void;
}

const PAYMENT_METHODS = [
  'PIX',
  'Boleto Bancário',
  'Transferência (TED/DOC)',
  'Débito Automático',
  'Cartão de Crédito',
  'Cartão de Débito',
  'Dinheiro',
  'Cheque',
  'Outro'
];

const DRE_CATEGORIES = [
  'Custo Fixo',
  'Custo Operacional',
  'Despesa Administrativa',
  'Pessoal & Folha',
  'Serviços Terceirizados',
  'Impostos & Tributos',
  'Aluguel & Instalações',
  'Energia & Utilidades',
  'Manutenção',
  'Outros'
];

const DRE: React.FC<DREProps> = ({ state, setState, notify }) => {
  // Navigation tabs: 'monthly' | 'recurring'
  const [activeView, setActiveView] = useState<'monthly' | 'recurring'>('monthly');

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal states for DRE Month Entries
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DREEntry | null>(null);
  const [entryDescription, setEntryDescription] = useState('');
  const [entryValue, setEntryValue] = useState('');
  const [entryType, setEntryType] = useState<'revenue' | 'expense'>('expense');
  const [entryIsPercentage, setEntryIsPercentage] = useState(false);
  const [entryPaymentMethod, setEntryPaymentMethod] = useState('');
  const [entryComment, setEntryComment] = useState('');
  const [entryCategory, setEntryCategory] = useState('Custo Fixo');
  const [entrySaveAsRecurring, setEntrySaveAsRecurring] = useState(false);

  // Modal states for Recurring Cost/Expense
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<DRERecurringEntry | null>(null);
  const [recDescription, setRecDescription] = useState('');
  const [recValue, setRecValue] = useState('');
  const [recType, setRecType] = useState<'revenue' | 'expense'>('expense');
  const [recIsPercentage, setRecIsPercentage] = useState(false);
  const [recPaymentMethod, setRecPaymentMethod] = useState('PIX');
  const [recComment, setRecComment] = useState('');
  const [recCategory, setRecCategory] = useState('Custo Fixo');

  // Multi-month replication modal
  const [isReplicateModalOpen, setIsReplicateModalOpen] = useState(false);
  const [replicateMonthsCount, setReplicateMonthsCount] = useState<number>(3);
  const [isReplicating, setIsReplicating] = useState(false);

  // Delete confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    id: string;
    title: string;
    isRecurringItem: boolean;
  }>({
    isOpen: false,
    id: '',
    title: '',
    isRecurringItem: false
  });

  // Find existing statement for selected month
  const currentStatement = useMemo(() => {
    return state.dreStatements.find(s => s.month === selectedMonth);
  }, [state.dreStatements, selectedMonth]);

  // Calculate automatic values
  const autoRevenue = useMemo(() => {
    return state.areas
      .filter(area => area.startDate.startsWith(selectedMonth))
      .reduce((acc, area) => {
        const areaTotal = area.services.reduce((sAcc, s) => sAcc + s.totalValue, 0);
        return acc + areaTotal;
      }, 0);
  }, [state.areas, selectedMonth]);

  const autoExpenses = useMemo(() => {
    return state.cashOut
      .filter(co => co.date.startsWith(selectedMonth))
      .reduce((acc, co) => acc + co.value, 0);
  }, [state.cashOut, selectedMonth]);

  // Recurring entries for the active company
  const recurringEntries = useMemo(() => {
    return state.dreRecurringEntries || [];
  }, [state.dreRecurringEntries]);

  // Initialize or update entries for the current month
  const entries = useMemo(() => {
    let baseEntries: DREEntry[] = [];
    
    if (currentStatement) {
      baseEntries = currentStatement.entries.map(e => {
        if (e.id === 'revenue-os' && !e.isManualOverride) {
          return { ...e, value: autoRevenue, originalValue: autoRevenue };
        }
        if (e.id === 'expense-finance' && !e.isManualOverride) {
          return { ...e, value: autoExpenses, originalValue: autoExpenses };
        }
        return e;
      });
    } else {
      baseEntries = [
        {
          id: 'revenue-os',
          description: 'Faturamento Bruto (O.S)',
          value: autoRevenue,
          type: 'revenue',
          isPercentage: false,
          isManualOverride: false,
          originalValue: autoRevenue,
          category: 'Receita Operacional'
        },
        {
          id: 'expense-finance',
          description: 'Despesas Financeiras (Módulo Financeiro)',
          value: autoExpenses,
          type: 'expense',
          isPercentage: false,
          isManualOverride: false,
          originalValue: autoExpenses,
          category: 'Custo Operacional'
        }
      ];
    }

    // Calculate total revenue from non-percentage lines to use as base for percentage lines
    const baseRevenue = baseEntries
      .filter(e => e.type === 'revenue' && !e.isPercentage)
      .reduce((acc, e) => acc + e.value, 0);

    return baseEntries.map(e => {
      if (e.isPercentage) {
        return {
          ...e,
          value: (baseRevenue * (e.percentageValue || 0)) / 100
        };
      }
      return e;
    });
  }, [currentStatement, autoRevenue, autoExpenses]);

  const totalRevenue = entries
    .filter(e => e.type === 'revenue')
    .reduce((acc, e) => acc + e.value, 0);

  const totalExpenses = entries
    .filter(e => e.type === 'expense')
    .reduce((acc, e) => acc + e.value, 0);

  const netResult = totalRevenue - totalExpenses;

  // Breakdown of expenses by payment method
  const expensesByPaymentMethod = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    entries
      .filter(e => e.type === 'expense')
      .forEach(e => {
        const method = e.paymentMethod?.trim() || 'Não Informado';
        if (!map[method]) {
          map[method] = { count: 0, total: 0 };
        }
        map[method].count += 1;
        map[method].total += e.value;
      });
    return map;
  }, [entries]);

  // Total recurring estimated monthly costs
  const totalRecurringEstimated = useMemo(() => {
    return recurringEntries
      .filter(r => r.active && r.type === 'expense' && !r.isPercentage)
      .reduce((acc, r) => acc + r.value, 0);
  }, [recurringEntries]);

  // Save statement to Supabase
  const handleSave = async (updatedEntries: DREEntry[], silent = false) => {
    const companyId = state.currentUser?.companyId;
    if (!companyId) {
      notify('Usuário sem empresa vinculada', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        companyId,
        month: selectedMonth,
        entries: updatedEntries
      };
      if (currentStatement?.id) {
        payload.id = currentStatement.id;
      }

      const saved = await dbSave('dre_statements', payload);
      const savedId = (saved && saved[0]?.id) || currentStatement?.id || crypto.randomUUID();

      const savedStatement: DREStatement = {
        id: savedId,
        companyId,
        month: selectedMonth,
        entries: updatedEntries
      };

      const newStatements = [
        ...state.dreStatements.filter(s => s.month !== selectedMonth),
        savedStatement
      ];

      setState(prev => ({ ...prev, dreStatements: newStatements }));
      if (!silent) {
        notify('DRE salvo com sucesso!');
      }
    } catch (e) {
      console.error('Erro ao salvar DRE:', e);
      notify('Erro ao salvar DRE no banco de dados', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Copy text helper
  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    notify('Dados de pagamento / chave PIX copiados!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Open modal to add or edit DRE month entry
  const handleOpenEntryModal = (entry?: DREEntry, defaultType: 'revenue' | 'expense' = 'expense', isPercentage = false) => {
    if (entry) {
      setEditingEntry(entry);
      setEntryDescription(entry.description);
      setEntryValue(entry.isPercentage ? (entry.percentageValue?.toString() || '0') : formatCurrencyBRL(entry.value, true));
      setEntryType(entry.type);
      setEntryIsPercentage(entry.isPercentage);
      setEntryPaymentMethod(entry.paymentMethod || 'PIX');
      setEntryComment(entry.comment || '');
      setEntryCategory(entry.category || (entry.type === 'revenue' ? 'Receita Operacional' : 'Custo Fixo'));
      setEntrySaveAsRecurring(false);
    } else {
      setEditingEntry(null);
      setEntryDescription('');
      setEntryValue('');
      setEntryType(defaultType);
      setEntryIsPercentage(isPercentage);
      setEntryPaymentMethod('PIX');
      setEntryComment('');
      setEntryCategory(defaultType === 'revenue' ? 'Receita Operacional' : 'Custo Fixo');
      setEntrySaveAsRecurring(false);
    }
    setIsEntryModalOpen(true);
  };

  // Save entry inside active month DRE
  const handleSaveEntryModal = async () => {
    if (!entryDescription.trim()) {
      notify('Informe a descrição do lançamento', 'error');
      return;
    }

    const val = entryIsPercentage 
      ? (parseFloat(entryValue.replace(',', '.')) || 0)
      : parseCurrencyBRL(entryValue);
    const companyId = state.currentUser?.companyId;

    let updatedEntries: DREEntry[] = [];

    if (editingEntry) {
      updatedEntries = entries.map(e => {
        if (e.id === editingEntry.id) {
          return {
            ...e,
            description: entryDescription.trim(),
            value: entryIsPercentage ? (totalRevenue * val) / 100 : val,
            percentageValue: entryIsPercentage ? val : undefined,
            isPercentage: entryIsPercentage,
            type: entryType,
            paymentMethod: entryPaymentMethod,
            comment: entryComment.trim(),
            category: entryCategory,
            isManualOverride: true
          };
        }
        return e;
      });
    } else {
      const newEntry: DREEntry = {
        id: crypto.randomUUID(),
        description: entryDescription.trim(),
        value: entryIsPercentage ? (totalRevenue * val) / 100 : val,
        percentageValue: entryIsPercentage ? val : undefined,
        isPercentage: entryIsPercentage,
        type: entryType,
        paymentMethod: entryPaymentMethod,
        comment: entryComment.trim(),
        category: entryCategory,
        isManualOverride: true,
        isRecurring: entrySaveAsRecurring
      };
      updatedEntries = [...entries, newEntry];
    }

    // Recalculate percentage lines if revenue changed
    const baseRev = updatedEntries
      .filter(re => re.type === 'revenue' && !re.isPercentage)
      .reduce((acc, re) => acc + re.value, 0);

    const finalEntries = updatedEntries.map(e => {
      if (e.isPercentage) {
        return {
          ...e,
          value: (baseRev * (e.percentageValue || 0)) / 100
        };
      }
      return e;
    });

    await handleSave(finalEntries);

    // Save as recurring template if requested
    if (entrySaveAsRecurring && companyId) {
      try {
        const recPayload: DRERecurringEntry = {
          id: crypto.randomUUID(),
          companyId,
          description: entryDescription.trim(),
          value: val,
          type: entryType,
          isPercentage: entryIsPercentage,
          percentageValue: entryIsPercentage ? val : 0,
          paymentMethod: entryPaymentMethod,
          comment: entryComment.trim(),
          category: entryCategory,
          active: true,
          createdAt: new Date().toISOString()
        };

        await dbSave('dre_recurring_entries', recPayload);

        const updatedRec = [...recurringEntries, recPayload];
        setState(prev => ({ ...prev, dreRecurringEntries: updatedRec }));
        try {
          localStorage.setItem(`dre_recurring_${companyId}`, JSON.stringify(updatedRec));
        } catch (e) {}

        notify('Lançamento salvo e adicionado aos Custos Recorrentes com sucesso!');
      } catch (e) {
        console.error('Erro ao salvar custo recorrente:', e);
      }
    }

    setIsEntryModalOpen(false);
  };

  // Save an existing manual entry directly into the recurring catalog
  const handlePromoteToRecurring = async (entry: DREEntry) => {
    const companyId = state.currentUser?.companyId;
    if (!companyId) return;

    // Check if already in recurring list
    const existing = recurringEntries.find(r => r.description.toLowerCase() === entry.description.toLowerCase());
    if (existing) {
      notify(`"${entry.description}" já está cadastrado nos Custos Recorrentes.`, 'error');
      return;
    }

    try {
      const recPayload: DRERecurringEntry = {
        id: crypto.randomUUID(),
        companyId,
        description: entry.description,
        value: entry.isPercentage ? (entry.percentageValue || 0) : entry.value,
        type: entry.type,
        isPercentage: entry.isPercentage,
        percentageValue: entry.isPercentage ? (entry.percentageValue || 0) : 0,
        paymentMethod: entry.paymentMethod || 'PIX',
        comment: entry.comment || '',
        category: entry.category || 'Custo Fixo',
        active: true,
        createdAt: new Date().toISOString()
      };

      await dbSave('dre_recurring_entries', recPayload);

      const updatedRec = [...recurringEntries, recPayload];
      setState(prev => ({ ...prev, dreRecurringEntries: updatedRec }));
      try {
        localStorage.setItem(`dre_recurring_${companyId}`, JSON.stringify(updatedRec));
      } catch (e) {}

      // Mark line as recurring in current month
      const updatedEntries = entries.map(e => e.id === entry.id ? { ...e, isRecurring: true } : e);
      handleSave(updatedEntries, true);

      notify(`"${entry.description}" salvo com sucesso nos Custos Recorrentes!`);
    } catch (e) {
      console.error('Erro ao promover para recorrente:', e);
      notify('Erro ao salvar nos Custos Recorrentes', 'error');
    }
  };

  // Replicate all active recurring costs into current month
  const handleApplyRecurringToCurrentMonth = async () => {
    const activeRecurring = recurringEntries.filter(r => r.active);
    if (activeRecurring.length === 0) {
      notify('Nenhum custo ou despesa recorrente ativa encontrada. Cadastre na aba "Custos e Despesas Recorrentes".', 'error');
      return;
    }

    const currentDescriptions = new Set(entries.map(e => e.description.toLowerCase().trim()));
    const newItems: DREEntry[] = [];
    let alreadyExistsCount = 0;

    const baseRevenue = entries
      .filter(e => e.type === 'revenue' && !e.isPercentage)
      .reduce((acc, e) => acc + e.value, 0);

    activeRecurring.forEach(r => {
      if (currentDescriptions.has(r.description.toLowerCase().trim())) {
        alreadyExistsCount++;
        return;
      }

      newItems.push({
        id: crypto.randomUUID(),
        description: r.description,
        value: r.isPercentage ? (baseRevenue * (r.percentageValue || 0)) / 100 : r.value,
        percentageValue: r.isPercentage ? r.percentageValue : undefined,
        isPercentage: r.isPercentage,
        type: r.type,
        paymentMethod: r.paymentMethod || 'PIX',
        comment: r.comment || '',
        category: r.category || 'Custo Fixo',
        isManualOverride: true,
        isRecurring: true
      });
    });

    if (newItems.length === 0) {
      notify(`Todos os ${activeRecurring.length} custos recorrentes já estão presentes no DRE deste mês.`);
      return;
    }

    const finalEntries = [...entries, newItems];
    await handleSave([...entries, ...newItems]);
    notify(`${newItems.length} custos e despesas recorrentes aplicados com sucesso no DRE deste mês!`);
  };

  // Copy structure from previous month
  const handleCopyFromPreviousMonth = async () => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    let year = parseInt(yearStr);
    let month = parseInt(monthStr) - 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
    const prevMonthKey = `${year}-${String(month).padStart(2, '0')}`;
    const prevStatement = state.dreStatements.find(s => s.month === prevMonthKey);

    if (!prevStatement || prevStatement.entries.length === 0) {
      notify(`Nenhum lançamento encontrado no mês anterior (${prevMonthKey}).`, 'error');
      return;
    }

    const currentDescriptions = new Set(entries.map(e => e.description.toLowerCase().trim()));
    const importedEntries: DREEntry[] = [];

    prevStatement.entries.forEach(pe => {
      // Don't duplicate automatic lines or existing descriptions
      if (pe.id === 'revenue-os' || pe.id === 'expense-finance') return;
      if (currentDescriptions.has(pe.description.toLowerCase().trim())) return;

      importedEntries.push({
        ...pe,
        id: crypto.randomUUID(),
        isManualOverride: true
      });
    });

    if (importedEntries.length === 0) {
      notify(`Os lançamentos do mês anterior (${prevMonthKey}) já constam no mês atual.`);
      return;
    }

    await handleSave([...entries, ...importedEntries]);
    notify(`${importedEntries.length} lançamentos replicados do mês anterior (${prevMonthKey}) com sucesso!`);
  };

  // Replicate to multiple future months
  const handleReplicateToFutureMonths = async () => {
    const companyId = state.currentUser?.companyId;
    if (!companyId) return;

    const activeRecurring = recurringEntries.filter(r => r.active);
    if (activeRecurring.length === 0) {
      notify('Nenhum custo ou despesa recorrente ativa para replicar.', 'error');
      return;
    }

    setIsReplicating(true);
    try {
      const [currYear, currMonth] = selectedMonth.split('-').map(Number);
      let targetStatements = [...state.dreStatements];
      let affectedMonthsCount = 0;

      for (let i = 1; i <= replicateMonthsCount; i++) {
        let m = currMonth + i;
        let y = currYear;
        while (m > 12) {
          m -= 12;
          y += 1;
        }
        const targetMonthKey = `${y}-${String(m).padStart(2, '0')}`;

        // Find or create statement
        let existingStmt = targetStatements.find(s => s.month === targetMonthKey);
        let currentMonthEntries: DREEntry[] = existingStmt ? [...existingStmt.entries] : [
          {
            id: 'revenue-os',
            description: 'Faturamento Bruto (O.S)',
            value: 0,
            type: 'revenue',
            isPercentage: false,
            isManualOverride: false,
            originalValue: 0,
            category: 'Receita Operacional'
          },
          {
            id: 'expense-finance',
            description: 'Despesas Financeiras (Módulo Financeiro)',
            value: 0,
            type: 'expense',
            isPercentage: false,
            isManualOverride: false,
            originalValue: 0,
            category: 'Custo Operacional'
          }
        ];

        const existingNames = new Set(currentMonthEntries.map(e => e.description.toLowerCase().trim()));
        let addedInMonth = 0;

        activeRecurring.forEach(r => {
          if (!existingNames.has(r.description.toLowerCase().trim())) {
            currentMonthEntries.push({
              id: crypto.randomUUID(),
              description: r.description,
              value: r.value,
              type: r.type,
              isPercentage: r.isPercentage,
              percentageValue: r.percentageValue,
              paymentMethod: r.paymentMethod || 'PIX',
              comment: r.comment || '',
              category: r.category || 'Custo Fixo',
              isManualOverride: true,
              isRecurring: true
            });
            addedInMonth++;
          }
        });

        if (addedInMonth > 0 || !existingStmt) {
          const payload: any = {
            companyId,
            month: targetMonthKey,
            entries: currentMonthEntries
          };
          if (existingStmt?.id) {
            payload.id = existingStmt.id;
          }

          const saved = await dbSave('dre_statements', payload);
          const savedId = (saved && saved[0]?.id) || existingStmt?.id || crypto.randomUUID();

          const newStmt: DREStatement = {
            id: savedId,
            companyId,
            month: targetMonthKey,
            entries: currentMonthEntries
          };

          targetStatements = targetStatements.filter(s => s.month !== targetMonthKey);
          targetStatements.push(newStmt);
          affectedMonthsCount++;
        }
      }

      setState(prev => ({ ...prev, dreStatements: targetStatements }));
      notify(`Custos e despesas recorrentes replicados para os próximos ${affectedMonthsCount} meses com sucesso!`);
      setIsReplicateModalOpen(false);
    } catch (e) {
      console.error('Erro ao replicar para meses futuros:', e);
      notify('Erro ao replicar para meses futuros', 'error');
    } finally {
      setIsReplicating(false);
    }
  };

  // Reset automatic lines
  const resetToAuto = (id: string) => {
    const updatedEntries = entries.map(e => {
      if (e.id === id) {
        const autoVal = id === 'revenue-os' ? autoRevenue : autoExpenses;
        return {
          ...e,
          value: autoVal,
          originalValue: autoVal,
          isManualOverride: false
        };
      }
      return e;
    });
    handleSave(updatedEntries);
  };

  // Delete line from month
  const handleDeleteEntry = (id: string, title: string) => {
    if (id === 'revenue-os' || id === 'expense-finance') {
      notify('Esta linha automática não pode ser removida.', 'error');
      return;
    }
    setDeleteConfirm({
      isOpen: true,
      id,
      title,
      isRecurringItem: false
    });
  };

  // Confirm delete
  const executeDelete = async () => {
    const { id, isRecurringItem } = deleteConfirm;
    setDeleteConfirm(prev => ({ ...prev, isOpen: false }));

    if (isRecurringItem) {
      const companyId = state.currentUser?.companyId;
      try {
        await dbDelete('dre_recurring_entries', id);
        const updatedRec = recurringEntries.filter(r => r.id !== id);
        setState(prev => ({ ...prev, dreRecurringEntries: updatedRec }));
        if (companyId) {
          try {
            localStorage.setItem(`dre_recurring_${companyId}`, JSON.stringify(updatedRec));
          } catch (e) {}
        }
        notify('Custo recorrente removido com sucesso!');
      } catch (e) {
        console.error('Erro ao remover custo recorrente:', e);
        notify('Erro ao excluir no banco de dados', 'error');
      }
    } else {
      const updatedEntries = entries.filter(e => e.id !== id);
      await handleSave(updatedEntries);
      notify('Lançamento removido do DRE deste mês.');
    }
  };

  // --- RECURRING MANAGER FUNCTIONS ---

  // Open modal for new/editing recurring entry
  const handleOpenRecurringModal = (rec?: DRERecurringEntry) => {
    if (rec) {
      setEditingRecurring(rec);
      setRecDescription(rec.description);
      setRecValue(rec.isPercentage ? (rec.percentageValue?.toString() || '0') : formatCurrencyBRL(rec.value, true));
      setRecType(rec.type);
      setRecIsPercentage(rec.isPercentage);
      setRecPaymentMethod(rec.paymentMethod || 'PIX');
      setRecComment(rec.comment || '');
      setRecCategory(rec.category || 'Custo Fixo');
    } else {
      setEditingRecurring(null);
      setRecDescription('');
      setRecValue('');
      setRecType('expense');
      setRecIsPercentage(false);
      setRecPaymentMethod('PIX');
      setRecComment('');
      setRecCategory('Custo Fixo');
    }
    setIsRecurringModalOpen(true);
  };

  // Save recurring entry
  const handleSaveRecurringModal = async () => {
    const companyId = state.currentUser?.companyId;
    if (!companyId) {
      notify('Usuário sem empresa vinculada', 'error');
      return;
    }

    if (!recDescription.trim()) {
      notify('Informe a descrição do custo/despesa recorrente', 'error');
      return;
    }

    const val = recIsPercentage 
      ? (parseFloat(recValue.replace(',', '.')) || 0)
      : parseCurrencyBRL(recValue);

    try {
      const recPayload: DRERecurringEntry = {
        id: editingRecurring?.id || crypto.randomUUID(),
        companyId,
        description: recDescription.trim(),
        value: recIsPercentage ? 0 : val,
        type: recType,
        isPercentage: recIsPercentage,
        percentageValue: recIsPercentage ? val : 0,
        paymentMethod: recPaymentMethod,
        comment: recComment.trim(),
        category: recCategory,
        active: editingRecurring ? editingRecurring.active : true,
        createdAt: editingRecurring?.createdAt || new Date().toISOString()
      };

      await dbSave('dre_recurring_entries', recPayload);

      const updatedRec = editingRecurring
        ? recurringEntries.map(r => r.id === editingRecurring.id ? recPayload : r)
        : [recPayload, ...recurringEntries];

      setState(prev => ({ ...prev, dreRecurringEntries: updatedRec }));
      try {
        localStorage.setItem(`dre_recurring_${companyId}`, JSON.stringify(updatedRec));
      } catch (e) {}

      notify(editingRecurring ? 'Custo recorrente atualizado!' : 'Custo recorrente cadastrado com sucesso!');
      setIsRecurringModalOpen(false);
    } catch (e) {
      console.error('Erro ao salvar custo recorrente:', e);
      notify('Erro ao salvar custo recorrente', 'error');
    }
  };

  // Toggle active status of recurring entry
  const handleToggleRecurringActive = async (rec: DRERecurringEntry) => {
    const companyId = state.currentUser?.companyId;
    if (!companyId) return;

    try {
      const updatedItem = { ...rec, active: !rec.active };
      await dbSave('dre_recurring_entries', updatedItem);

      const updatedRec = recurringEntries.map(r => r.id === rec.id ? updatedItem : r);
      setState(prev => ({ ...prev, dreRecurringEntries: updatedRec }));
      try {
        localStorage.setItem(`dre_recurring_${companyId}`, JSON.stringify(updatedRec));
      } catch (e) {}

      notify(`"${rec.description}" ${updatedItem.active ? 'ativado' : 'pausado'}!`);
    } catch (e) {
      notify('Erro ao atualizar status do custo recorrente', 'error');
    }
  };

  // Delete recurring entry
  const handleDeleteRecurring = (rec: DRERecurringEntry) => {
    setDeleteConfirm({
      isOpen: true,
      id: rec.id,
      title: rec.description,
      isRecurringItem: true
    });
  };

  // Payment method badge styling helper
  const getPaymentBadge = (method?: string) => {
    const m = (method || '').toLowerCase();
    if (m.includes('pix')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (m.includes('boleto')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (m.includes('transferência') || m.includes('ted') || m.includes('doc')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (m.includes('débito automático')) {
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    }
    if (m.includes('cartão')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (m.includes('dinheiro')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    }
    return 'bg-slate-50 text-slate-600 border-slate-200';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Header with Navigation Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-[#eaf0e3] border border-[#7ea24e]/30 flex items-center justify-center text-[#16462d]">
              <TrendingUp size={20} />
            </div>
            <h2 className="text-xl font-black text-[#0c2a1c] uppercase tracking-tight">
              DRE Gerencial & Custos Recorrentes
            </h2>
          </div>
          <p className="text-[10px] text-[#4b6f34] font-bold uppercase tracking-widest mt-0.5">
            Demonstração de Resultado do Exercício e Custos Forttiva
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 bg-[#e8e7e1] p-1.5 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveView('monthly')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all truncate ${
              activeView === 'monthly'
                ? 'bg-white text-[#0c2a1c] shadow-sm'
                : 'text-slate-600 hover:text-[#0c2a1c]'
            }`}
          >
            <FileSpreadsheet size={14} className="shrink-0" />
            <span className="truncate">DRE Mensal</span>
          </button>
          <button
            onClick={() => setActiveView('recurring')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all truncate ${
              activeView === 'recurring'
                ? 'bg-white text-[#0c2a1c] shadow-sm'
                : 'text-slate-600 hover:text-[#0c2a1c]'
            }`}
          >
            <Repeat size={14} className="shrink-0" />
            <span className="truncate">Custos Recorrentes</span>
            {recurringEntries.length > 0 && (
              <span className="bg-[#7ea24e] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shrink-0">
                {recurringEntries.filter(r => r.active).length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: DRE MENSAL                                                        */}
      {/* ========================================================================= */}
      {activeView === 'monthly' && (
        <div className="space-y-6">
          {/* Action Bar & Month Selector */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
            {/* Month Picker */}
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-200/80">
              <Calendar size={16} className="text-slate-500" />
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mês de Referência</span>
                <input 
                  type="month" 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent border-none text-[11px] font-black text-slate-900 uppercase tracking-widest focus:ring-0 cursor-pointer p-0"
                />
              </div>
            </div>

            {/* Quick Actions for Recurring / Copy */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleApplyRecurringToCurrentMonth}
                title="Aplica todos os custos e despesas recorrentes ativas neste mês"
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors shadow-sm"
              >
                <Repeat size={14} />
                Aplicar Recorrentes no Mês
                {recurringEntries.filter(r => r.active).length > 0 && (
                  <span className="bg-emerald-600 text-white text-[8px] px-1.5 py-0.5 rounded-full">
                    {recurringEntries.filter(r => r.active).length}
                  </span>
                )}
              </button>

              <button
                onClick={handleCopyFromPreviousMonth}
                title="Puxa os custos e despesas cadastrados no mês anterior"
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors"
              >
                <Layers size={14} />
                Copiar do Mês Anterior
              </button>

              <button
                onClick={() => handleOpenEntryModal(undefined, 'expense')}
                className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-sm"
              >
                <Plus size={14} />
                Nova Despesa / Custo
              </button>

              <button
                onClick={() => handleOpenEntryModal(undefined, 'revenue')}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm"
              >
                <Plus size={14} />
                Nova Receita
              </button>
            </div>
          </div>

          {/* Main DRE Table */}
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Descrição & Categoria
                    </th>
                    <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Método de Pagamento
                    </th>
                    <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Comentário / Chave PIX / Conta Bancária
                    </th>
                    <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Valor / Custo
                    </th>
                    <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest w-28">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {/* Revenue Section */}
                  <tr className="bg-emerald-50/40">
                    <td colSpan={5} className="px-6 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                          <ArrowUpCircle size={14} />
                          Receitas Operacionais e Faturamento
                        </span>
                        <span className="text-[10px] font-black text-emerald-700">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {entries.filter(e => e.type === 'revenue').map(entry => (
                    <tr key={entry.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <ArrowUpCircle size={14} className="text-emerald-500 shrink-0" />
                          <span className="text-[10px] font-bold text-slate-800 uppercase">
                            {entry.description}
                          </span>
                          {entry.category && (
                            <span className="text-[8px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                              {entry.category}
                            </span>
                          )}
                          {entry.isRecurring && (
                            <span className="text-[8px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black uppercase flex items-center gap-1">
                              <Repeat size={10} /> Recorrente
                            </span>
                          )}
                          {entry.isManualOverride && (
                            <span className="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black uppercase">
                              Manual
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {entry.paymentMethod ? (
                          <span className={`inline-block px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${getPaymentBadge(entry.paymentMethod)}`}>
                            {entry.paymentMethod}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-300 font-bold">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {entry.comment ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-700 font-medium max-w-xs truncate" title={entry.comment}>
                              {entry.comment}
                            </span>
                            <button
                              onClick={() => handleCopy(entry.comment || '', entry.id)}
                              title="Copiar dados / chave"
                              className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"
                            >
                              {copiedId === entry.id ? <CheckCheck size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 font-bold">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-[10px] font-black text-slate-900">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.value)}
                          {entry.isPercentage && (
                            <span className="ml-2 text-slate-400 text-[8px]">({entry.percentageValue}%)</span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEntryModal(entry)}
                            title="Editar lançamento"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={13} />
                          </button>
                          {entry.originalValue !== undefined && entry.isManualOverride && (
                            <button
                              onClick={() => resetToAuto(entry.id)}
                              title="Resetar para valor automático da O.S"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <RefreshCw size={13} />
                            </button>
                          )}
                          {entry.id !== 'revenue-os' && (
                            <button
                              onClick={() => handleDeleteEntry(entry.id, entry.description)}
                              title="Excluir"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {/* Expense Section */}
                  <tr className="bg-rose-50/40">
                    <td colSpan={5} className="px-6 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-rose-700 uppercase tracking-widest flex items-center gap-2">
                          <ArrowDownCircle size={14} />
                          Custos e Despesas Operacionais / Fixas
                        </span>
                        <span className="text-[10px] font-black text-rose-700">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExpenses)}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {entries.filter(e => e.type === 'expense').map(entry => (
                    <tr key={entry.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <ArrowDownCircle size={14} className="text-rose-500 shrink-0" />
                          <span className="text-[10px] font-bold text-slate-800 uppercase">
                            {entry.description}
                          </span>
                          {entry.category && (
                            <span className="text-[8px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                              {entry.category}
                            </span>
                          )}
                          {entry.isRecurring && (
                            <span className="text-[8px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black uppercase flex items-center gap-1">
                              <Repeat size={10} /> Recorrente
                            </span>
                          )}
                          {entry.isManualOverride && (
                            <span className="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black uppercase">
                              Manual
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {entry.paymentMethod ? (
                          <span className={`inline-block px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${getPaymentBadge(entry.paymentMethod)}`}>
                            {entry.paymentMethod}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-300 font-bold">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {entry.comment ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-700 font-medium max-w-xs truncate" title={entry.comment}>
                              {entry.comment}
                            </span>
                            <button
                              onClick={() => handleCopy(entry.comment || '', entry.id)}
                              title="Copiar dados / chave"
                              className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"
                            >
                              {copiedId === entry.id ? <CheckCheck size={13} className="text-emerald-600" /> : <Copy size={13} />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 font-bold">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-[10px] font-black text-slate-900">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.value)}
                          {entry.isPercentage && (
                            <span className="ml-2 text-slate-400 text-[8px]">({entry.percentageValue}%)</span>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEntryModal(entry)}
                            title="Editar lançamento"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={13} />
                          </button>
                          {!entry.isRecurring && entry.id !== 'expense-finance' && (
                            <button
                              onClick={() => handlePromoteToRecurring(entry)}
                              title="Salvar como Custo Recorrente para todos os meses"
                              className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            >
                              <Repeat size={13} />
                            </button>
                          )}
                          {entry.originalValue !== undefined && entry.isManualOverride && (
                            <button
                              onClick={() => resetToAuto(entry.id)}
                              title="Resetar para valor automático do Financeiro"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <RefreshCw size={13} />
                            </button>
                          )}
                          {entry.id !== 'expense-finance' && (
                            <button
                              onClick={() => handleDeleteEntry(entry.id, entry.description)}
                              title="Excluir lançamento"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Table Bottom Action Bar */}
            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <button 
                  onClick={() => handleOpenEntryModal(undefined, 'expense')}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50 transition-colors shadow-sm"
                >
                  <Plus size={13} /> Adicionar Custo/Despesa
                </button>
                <button 
                  onClick={() => handleOpenEntryModal(undefined, 'revenue')}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 transition-colors shadow-sm"
                >
                  <Plus size={13} /> Adicionar Receita
                </button>
                <button 
                  onClick={() => handleOpenEntryModal(undefined, 'expense', true)}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
                >
                  <Calculator size={13} /> Adicionar Linha (%)
                </button>
              </div>

              <button 
                onClick={() => handleSave(entries)}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-[0.2em] shadow-lg hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
                Salvar Fechamento DRE
              </button>
            </div>
          </div>

          {/* Metrics & Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[28px] shadow-sm border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Receita Total</p>
              <p className="text-2xl font-black text-emerald-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
              </p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Faturamento consolidado</p>
            </div>

            <div className="bg-white p-6 rounded-[28px] shadow-sm border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Custos & Despesas</p>
              <p className="text-2xl font-black text-rose-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExpenses)}
              </p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Total de saídas e provisões</p>
            </div>

            <div className={`p-6 rounded-[28px] shadow-lg border-2 ${netResult >= 0 ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-rose-600 border-rose-500 text-white'}`}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-1 opacity-80">Resultado Operacional</p>
              <p className="text-2xl font-black">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(netResult)}
              </p>
              <p className="text-[9px] font-black uppercase tracking-widest mt-1">
                {netResult >= 0 ? 'Lucro Líquido do Período' : 'Prejuízo no Período'}
              </p>
            </div>
          </div>

          {/* Payment Methods Breakdown Panel */}
          {Object.keys(expensesByPaymentMethod).length > 0 && (
            <div className="bg-white p-6 rounded-[28px] shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard size={16} className="text-slate-600" />
                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">
                  Previsão de Despesas por Método de Pagamento ({selectedMonth})
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(expensesByPaymentMethod).map(([method, info]: [string, { count: number; total: number }]) => (
                  <div key={method} className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
                    <span className={`inline-block px-2 py-0.5 text-[8px] font-black uppercase rounded ${getPaymentBadge(method)} mb-1`}>
                      {method}
                    </span>
                    <p className="text-sm font-black text-slate-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(info.total)}
                    </p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">
                      {info.count} {info.count === 1 ? 'lançamento' : 'lançamentos'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: CUSTOS E DESPESAS RECORRENTES (TEMPLATE MESTRE)                   */}
      {/* ========================================================================= */}
      {activeView === 'recurring' && (
        <div className="space-y-6">
          {/* Hero Banner for Recurring Costs */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-[32px] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Repeat className="text-emerald-400" size={20} />
                <h3 className="text-base font-black uppercase tracking-wider">
                  Cadastro de Custos & Despesas Recorrentes
                </h3>
              </div>
              <p className="text-xs text-slate-300 font-medium max-w-2xl">
                Cadastre aqui os custos fixos, despesas mensais, fornecedores recorrentes, método de pagamento e dados bancários (Chave PIX, conta, agência). Ao clicar em replicar, todos são aplicados automaticamente no DRE do mês desejado.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleOpenRecurringModal()}
                className="flex items-center gap-2 px-5 py-3 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-md active:scale-95"
              >
                <Plus size={16} />
                Novo Custo Recorrente
              </button>
              <button
                onClick={() => setIsReplicateModalOpen(true)}
                className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
              >
                <Send size={16} />
                Replicar para Outros Meses
              </button>
            </div>
          </div>

          {/* Quick Stats on Recurring Costs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[28px] shadow-sm border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Custos Fixos Cadastrados</p>
              <p className="text-2xl font-black text-rose-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRecurringEstimated)}
              </p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Previsão de saída mensal fixa</p>
            </div>

            <div className="bg-white p-6 rounded-[28px] shadow-sm border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Itens Ativos</p>
              <p className="text-2xl font-black text-slate-900">
                {recurringEntries.filter(r => r.active).length}
                <span className="text-slate-400 text-sm font-normal ml-2">de {recurringEntries.length} itens</span>
              </p>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Prontos para replicação</p>
            </div>

            <div className="bg-white p-6 rounded-[28px] shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Aplicar no Mês Atual</p>
                <p className="text-sm font-black text-emerald-600 uppercase">
                  Mês: {selectedMonth}
                </p>
              </div>
              <button
                onClick={handleApplyRecurringToCurrentMonth}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all shadow-sm"
              >
                <Repeat size={14} />
                Aplicar Agora
              </button>
            </div>
          </div>

          {/* Table of Recurring Entries */}
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
            {recurringEntries.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Repeat size={28} />
                </div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-2">
                  Nenhum Custo Recorrente Cadastrado
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
                  Cadastre aluguéis, contabilidade, internet, folha fixa e demais despesas que se repetem todos os meses para não precisar digitar novamente.
                </p>
                <button
                  onClick={() => handleOpenRecurringModal()}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm"
                >
                  Cadastrar Primeiro Custo Recorrente
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100">
                      <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Descrição & Categoria
                      </th>
                      <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Método de Pagamento
                      </th>
                      <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Comentário / Chave PIX / Conta Bancária
                      </th>
                      <th className="px-6 py-4 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Valor Padrão
                      </th>
                      <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Status
                      </th>
                      <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest w-28">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recurringEntries.map(rec => (
                      <tr key={rec.id} className={`hover:bg-slate-50/50 transition-colors ${!rec.active ? 'opacity-50' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-bold text-slate-800 uppercase">
                              {rec.description}
                            </span>
                            <span className="text-[8px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                              {rec.category || 'Custo Fixo'}
                            </span>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${rec.type === 'revenue' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {rec.type === 'revenue' ? 'Receita' : 'Despesa'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {rec.paymentMethod ? (
                            <span className={`inline-block px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${getPaymentBadge(rec.paymentMethod)}`}>
                              {rec.paymentMethod}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-300 font-bold">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {rec.comment ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-700 font-medium max-w-xs truncate" title={rec.comment}>
                                {rec.comment}
                              </span>
                              <button
                                onClick={() => handleCopy(rec.comment || '', rec.id)}
                                title="Copiar chave / dados"
                                className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-700 transition-colors"
                              >
                                {copiedId === rec.id ? <CheckCheck size={13} className="text-emerald-600" /> : <Copy size={13} />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-300 font-bold">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-[10px] font-black text-slate-900">
                            {rec.isPercentage 
                              ? `${rec.percentageValue}% da Receita`
                              : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rec.value)
                            }
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleToggleRecurringActive(rec)}
                            title={rec.active ? 'Clique para pausar este custo' : 'Clique para ativar este custo'}
                            className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider transition-colors ${
                              rec.active
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {rec.active ? 'Ativo' : 'Pausado'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenRecurringModal(rec)}
                              title="Editar"
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteRecurring(rec)}
                              title="Excluir custo recorrente"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: LANÇAMENTO NO DRE MENSAL                                         */}
      {/* ========================================================================= */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-6 md:p-8 max-w-xl w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${entryType === 'revenue' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {entryType === 'revenue' ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                    {editingEntry ? 'Editar Lançamento do DRE' : 'Novo Lançamento no DRE'}
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                    Mês de Referência: {selectedMonth}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsEntryModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Tipo de Lançamento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setEntryType('expense'); setEntryCategory('Custo Fixo'); }}
                    className={`py-2 text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all ${
                      entryType === 'expense'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Custo / Despesa
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEntryType('revenue'); setEntryCategory('Receita Operacional'); }}
                    className={`py-2 text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all ${
                      entryType === 'revenue'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Receita
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Descrição da Conta / Fornecedor *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aluguel Galpão, Escritório de Contabilidade, Internet Fibra..."
                  value={entryDescription}
                  onChange={(e) => setEntryDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[11px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Category & Calculation Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Categoria
                  </label>
                  <select
                    value={entryCategory}
                    onChange={(e) => setEntryCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[10px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {DRE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    {entryIsPercentage ? 'Percentual (%) sobre Receita' : 'Valor (R$) *'}
                  </label>
                  <div className="relative">
                    {!entryIsPercentage && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                        R$
                      </span>
                    )}
                    <input
                      type={entryIsPercentage ? "number" : "text"}
                      inputMode={entryIsPercentage ? "decimal" : "numeric"}
                      step={entryIsPercentage ? "0.01" : undefined}
                      placeholder={entryIsPercentage ? "0.00" : "0,00"}
                      value={entryValue}
                      onChange={(e) => {
                        if (entryIsPercentage) {
                          setEntryValue(e.target.value);
                        } else {
                          setEntryValue(maskCurrencyInput(e.target.value));
                        }
                      }}
                      onPaste={(e) => {
                        if (!entryIsPercentage) {
                          e.preventDefault();
                          setEntryValue(parsePastedCurrency(e.clipboardData.getData('text')));
                        }
                      }}
                      className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 text-[11px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white ${
                        entryIsPercentage ? 'px-4' : 'pl-9 pr-4'
                      }`}
                    />
                    {entryIsPercentage && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 pointer-events-none">
                        %
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Método de Pagamento
                </label>
                <select
                  value={entryPaymentMethod}
                  onChange={(e) => setEntryPaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[10px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="">Selecione o método...</option>
                  {PAYMENT_METHODS.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>

              {/* Comment / PIX Key / Bank Account */}
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Comentário / Chave PIX / Dados Bancários
                </label>
                <input
                  type="text"
                  placeholder="Ex: Chave PIX: 12.345.678/0001-90 | Banco Itaú Ag 1234 CC 56789-0 Fav: João..."
                  value={entryComment}
                  onChange={(e) => setEntryComment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[10px] font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">
                  Essas informações ficarão salvas e podem ser copiadas com 1 clique na tabela do DRE.
                </p>
              </div>

              {/* Checkbox: Save also as recurring template */}
              {!editingEntry && (
                <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="saveAsRecurring"
                    checked={entrySaveAsRecurring}
                    onChange={(e) => setEntrySaveAsRecurring(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="saveAsRecurring" className="text-[9px] font-black text-emerald-900 uppercase tracking-wider cursor-pointer">
                    Salvar também como Custo Recorrente (para replicar automaticamente nos próximos meses)
                  </label>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEntryModalOpen(false)}
                className="px-5 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEntryModal}
                className="px-6 py-2.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-md active:scale-95"
              >
                Salvar Lançamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: NOVO/EDITAR CUSTO RECORRENTE (TEMPLATE MESTRE)                   */}
      {/* ========================================================================= */}
      {isRecurringModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-6 md:p-8 max-w-xl w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl">
                  <Repeat size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                    {editingRecurring ? 'Editar Custo / Despesa Recorrente' : 'Cadastrar Custo Recorrente'}
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                    Será salvo como modelo base para replicação em todos os meses
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsRecurringModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Tipo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setRecType('expense'); setRecCategory('Custo Fixo'); }}
                    className={`py-2 text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all ${
                      recType === 'expense'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Custo / Despesa Fixa
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRecType('revenue'); setRecCategory('Receita Operacional'); }}
                    className={`py-2 text-[9px] font-black uppercase tracking-widest rounded-xl border transition-all ${
                      recType === 'revenue'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    Receita Recorrente
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Descrição da Despesa / Fornecedor *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aluguel Galpão, Contabilidade, Internet Link Dedicado..."
                  value={recDescription}
                  onChange={(e) => setRecDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[11px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Category & Value */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Categoria
                  </label>
                  <select
                    value={recCategory}
                    onChange={(e) => setRecCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[10px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {DRE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                    Valor Padrão Mensal (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0,00"
                      value={recValue}
                      onChange={(e) => setRecValue(maskCurrencyInput(e.target.value))}
                      onPaste={(e) => {
                        e.preventDefault();
                        setRecValue(parsePastedCurrency(e.clipboardData.getData('text')));
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 text-[11px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Método de Pagamento
                </label>
                <select
                  value={recPaymentMethod}
                  onChange={(e) => setRecPaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-[10px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {PAYMENT_METHODS.map(method => (
                    <option key={method} value={method}>{method}</option>
                  ))}
                </select>
              </div>

              {/* Comment / PIX Key / Bank Account */}
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                  Comentário / Chave PIX / Conta Bancária
                </label>
                <input
                  type="text"
                  placeholder="Ex: Chave PIX CNPJ: 11.222.333/0001-44 (Banco Santander) Fav: Imobiliária..."
                  value={recComment}
                  onChange={(e) => setRecComment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-[10px] font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">
                  Ficará salvo no cadastro mestre e será replicado automaticamente para os meses do DRE.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsRecurringModalOpen(false)}
                className="px-5 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveRecurringModal}
                className="px-6 py-2.5 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition-all shadow-md active:scale-95"
              >
                Salvar Custo Recorrente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REPLICAR EM MÚLTIPLOS MESES                                     */}
      {/* ========================================================================= */}
      {isReplicateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                  <Send size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                    Replicar para Próximos Meses
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                    A partir de {selectedMonth}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsReplicateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-600 font-medium">
                Escolha por quantos meses futuros você deseja aplicar todos os <strong className="text-slate-900">{recurringEntries.filter(r => r.active).length} custos e despesas recorrentes ativas</strong> com seus respectivos métodos de pagamento e chaves PIX/contas:
              </p>

              <div className="grid grid-cols-3 gap-2 pt-2">
                {[3, 6, 12].map(months => (
                  <button
                    key={months}
                    type="button"
                    onClick={() => setReplicateMonthsCount(months)}
                    className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                      replicateMonthsCount === months
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    +{months} Meses
                  </button>
                ))}
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] text-slate-500 font-medium flex items-start gap-2">
                <AlertCircle size={15} className="text-blue-500 shrink-0 mt-0.5" />
                <span>
                  O sistema criará ou atualizará o DRE desses meses sem duplicar itens já existentes com a mesma descrição.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsReplicateModalOpen(false)}
                className="px-5 py-2.5 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isReplicating}
                onClick={handleReplicateToFutureMonths}
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {isReplicating ? <RefreshCw className="animate-spin" size={14} /> : <Send size={14} />}
                Confirmar Replicação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm(prev => ({ ...prev, isOpen: false }))}
        onConfirm={executeDelete}
        title={deleteConfirm.isRecurringItem ? 'Excluir Custo Recorrente' : 'Excluir Lançamento do DRE'}
        message={`Deseja realmente remover "${deleteConfirm.title}"? Esta operação não poderá ser desfeita.`}
        confirmText="Excluir Definitivamente"
        type="danger"
      />
    </div>
  );
};

export default DRE;
