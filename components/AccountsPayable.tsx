import React, { useState, useMemo } from 'react';
import { AppState, AccountPayable } from '../types';
import { 
  Receipt, 
  Calendar as CalendarIcon, 
  List, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Edit3, 
  DollarSign, 
  Tag, 
  FileText, 
  Layers, 
  X, 
  RotateCcw,
  CalendarDays,
  ArrowRight,
  HelpCircle,
  Eye
} from 'lucide-react';
import { dbSave, dbDelete } from '../lib/supabase';
import { formatCurrencyBRL, parseCurrencyBRL, maskCurrencyInput, parsePastedCurrency } from '../lib/currencyFormat';
import ConfirmationModal from './ConfirmationModal';

interface AccountsPayableProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

interface InstallmentItem {
  number: number;
  dueDate: string;
  value: number;
}

const AccountsPayable: React.FC<AccountsPayableProps> = ({ state, setState, notify }) => {
  // View mode: 'calendar' or 'list'
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Calendar month state
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pendente' | 'pago' | 'vencido'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<AccountPayable | null>(null);
  const [billToDelete, setBillToDelete] = useState<AccountPayable | null>(null);
  const [selectedDayBills, setSelectedDayBills] = useState<{ date: string; bills: AccountPayable[] } | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [controlNumber, setControlNumber] = useState('');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [value, setValue] = useState('');
  const [category, setCategory] = useState('Fornecedores');
  const [status, setStatus] = useState<'pendente' | 'pago' | 'vencido'>('pendente');
  const [paymentDate, setPaymentDate] = useState('');
  const [observation, setObservation] = useState('');

  // Installment State (only when creating new)
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(3);
  const [installmentInterval, setInstallmentInterval] = useState<'monthly' | 'biweekly' | 'weekly'>('monthly');
  const [installments, setInstallments] = useState<InstallmentItem[]>([]);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Compute actual dynamic status based on due date if still pendente
  const getDynamicStatus = (bill: AccountPayable): 'pendente' | 'pago' | 'vencido' => {
    if (bill.status === 'pago') return 'pago';
    if (bill.dueDate < todayStr) return 'vencido';
    return 'pendente';
  };

  // Categories available
  const categories = useMemo(() => {
    if (state.accountsPayableCategories && state.accountsPayableCategories.length > 0) {
      return state.accountsPayableCategories;
    }
    return ['Fornecedores', 'Aluguel', 'Energia Elétrica', 'Água', 'Internet / Telefonia', 'Impostos', 'Manutenção', 'Serviços Terceirizados', 'Outros'];
  }, [state.accountsPayableCategories]);

  // Generate installments list from form values
  const generateInstallments = (count: number, totalVal: number, firstDateStr: string, interval: 'monthly' | 'biweekly' | 'weekly') => {
    if (count <= 0) return;
    const baseVal = Math.floor((totalVal / count) * 100) / 100;
    const remainder = Math.round((totalVal - (baseVal * count)) * 100) / 100;

    const items: InstallmentItem[] = [];
    const [year, month, day] = firstDateStr.split('-').map(Number);

    for (let i = 1; i <= count; i++) {
      let instDate = new Date(year, month - 1, day);
      if (interval === 'monthly') {
        instDate.setMonth(instDate.getMonth() + (i - 1));
      } else if (interval === 'biweekly') {
        instDate.setDate(instDate.getDate() + (i - 1) * 14);
      } else if (interval === 'weekly') {
        instDate.setDate(instDate.getDate() + (i - 1) * 7);
      }

      const dateFormatted = `${instDate.getFullYear()}-${String(instDate.getMonth() + 1).padStart(2, '0')}-${String(instDate.getDate()).padStart(2, '0')}`;
      const instVal = i === count ? Number((baseVal + remainder).toFixed(2)) : baseVal;

      items.push({
        number: i,
        dueDate: dateFormatted,
        value: instVal
      });
    }
    setInstallments(items);
  };

  // Open modal to create
  const handleOpenCreate = (prefilledDate?: string) => {
    setEditingBill(null);
    setTitle('');
    setControlNumber('');
    const targetDate = prefilledDate || todayStr;
    setDueDate(targetDate);
    setValue('');
    setCategory(categories[0] || 'Fornecedores');
    setStatus('pendente');
    setPaymentDate('');
    setObservation('');
    setIsInstallment(false);
    setInstallmentCount(3);
    setInstallments([]);
    setIsModalOpen(true);
  };

  // Open modal to edit
  const handleOpenEdit = (bill: AccountPayable) => {
    setEditingBill(bill);
    setTitle(bill.title);
    setControlNumber(bill.controlNumber || '');
    setDueDate(bill.dueDate);
    setValue(formatCurrencyBRL(bill.value, true));
    setCategory(bill.category || categories[0] || 'Fornecedores');
    setStatus(bill.status);
    setPaymentDate(bill.paymentDate || '');
    setObservation(bill.observation || '');
    setIsInstallment(false);
    setInstallments([]);
    setIsModalOpen(true);
  };

  // Save bill (single or installments)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return notify('Informe o título da conta', 'error');
    const parsedVal = parseCurrencyBRL(value);
    if (isNaN(parsedVal) || parsedVal <= 0) return notify('Informe um valor válido maior que zero', 'error');
    if (!dueDate) return notify('Informe a data de vencimento', 'error');

    const companyId = state.currentUser?.companyId || 'company-main';

    try {
      if (editingBill) {
        // Updating existing bill
        const { dynamicStatus: _d, ...cleanEditingBill } = editingBill as any;
        const updatedBill: AccountPayable = {
          ...cleanEditingBill,
          title: title.trim(),
          controlNumber: controlNumber.trim() || undefined,
          dueDate,
          value: parsedVal,
          status,
          paymentDate: status === 'pago' ? (paymentDate || todayStr) : undefined,
          category,
          observation: observation.trim() || undefined
        };

        await dbSave('accounts_payable', updatedBill);

        setState(prev => ({
          ...prev,
          accountsPayable: prev.accountsPayable.map(b => b.id === updatedBill.id ? updatedBill : b)
        }));

        notify('Título atualizado com sucesso!');
      } else {
        // Creating new bill(s)
        if (isInstallment && installments.length > 0) {
          const groupId = crypto.randomUUID();
          const newBills: AccountPayable[] = [];

          for (const inst of installments) {
            const billItem: AccountPayable = {
              id: crypto.randomUUID(),
              companyId,
              title: `${title.trim()} (${inst.number}/${installments.length})`,
              controlNumber: controlNumber.trim() ? `${controlNumber.trim()}-${inst.number}` : undefined,
              dueDate: inst.dueDate,
              value: inst.value,
              status: 'pendente',
              category,
              observation: observation.trim() || undefined,
              installmentGroupId: groupId,
              installmentNumber: inst.number,
              totalInstallments: installments.length,
              createdAt: new Date().toISOString()
            };
            newBills.push(billItem);
          }

          // Save each installment in database
          for (const b of newBills) {
            await dbSave('accounts_payable', b);
          }

          setState(prev => ({
            ...prev,
            accountsPayable: [...prev.accountsPayable, ...newBills]
          }));

          notify(`${newBills.length} parcelas lançadas com sucesso!`);
        } else {
          // Single bill
          const newBill: AccountPayable = {
            id: crypto.randomUUID(),
            companyId,
            title: title.trim(),
            controlNumber: controlNumber.trim() || undefined,
            dueDate,
            value: parsedVal,
            status,
            paymentDate: status === 'pago' ? (paymentDate || todayStr) : undefined,
            category,
            observation: observation.trim() || undefined,
            createdAt: new Date().toISOString()
          };

          await dbSave('accounts_payable', newBill);

          setState(prev => ({
            ...prev,
            accountsPayable: [...prev.accountsPayable, newBill]
          }));

          notify('Título cadastrado com sucesso!');
        }
      }

      setIsModalOpen(false);
      // Refresh selected day bills if day modal is open
      if (selectedDayBills) {
        setSelectedDayBills(null);
      }
    } catch (err) {
      console.error(err);
      notify('Erro ao salvar no banco de dados', 'error');
    }
  };

  // Toggle status quick action (Paid / Pending)
  const handleToggleStatus = async (bill: AccountPayable) => {
    const newStatus: 'pendente' | 'pago' = bill.status === 'pago' ? 'pendente' : 'pago';
    const { dynamicStatus: _d, ...cleanBill } = bill as any;
    const updated: AccountPayable = {
      ...cleanBill,
      status: newStatus,
      paymentDate: newStatus === 'pago' ? todayStr : undefined
    };

    try {
      await dbSave('accounts_payable', updated);
      setState(prev => ({
        ...prev,
        accountsPayable: prev.accountsPayable.map(b => b.id === updated.id ? updated : b)
      }));

      // If selectedDayBills is open, update it
      if (selectedDayBills) {
        setSelectedDayBills(prev => prev ? {
          ...prev,
          bills: prev.bills.map(b => b.id === updated.id ? updated : b)
        } : null);
      }

      notify(newStatus === 'pago' ? 'Título marcado como PAGO!' : 'Título reaberto como PENDENTE');
    } catch (err) {
      console.error(err);
      notify('Erro ao atualizar status', 'error');
    }
  };

  // Delete bill
  const handleDeleteBill = async () => {
    if (!billToDelete) return;
    try {
      await dbDelete('accounts_payable', billToDelete.id);
      setState(prev => ({
        ...prev,
        accountsPayable: prev.accountsPayable.filter(b => b.id !== billToDelete.id)
      }));

      if (selectedDayBills) {
        setSelectedDayBills(prev => prev ? {
          ...prev,
          bills: prev.bills.filter(b => b.id !== billToDelete.id)
        } : null);
      }

      notify('Título excluído com sucesso');
      setBillToDelete(null);
    } catch (err) {
      console.error(err);
      notify('Erro ao excluir título', 'error');
    }
  };

  // All bills with dynamic status
  const allBillsWithStatus = useMemo(() => {
    return (state.accountsPayable || []).map(b => ({
      ...b,
      dynamicStatus: getDynamicStatus(b)
    }));
  }, [state.accountsPayable, todayStr]);

  // Metrics for alerts and cards
  const overdueBills = useMemo(() => {
    return allBillsWithStatus.filter(b => b.dynamicStatus === 'vencido');
  }, [allBillsWithStatus]);

  const dueTodayBills = useMemo(() => {
    return allBillsWithStatus.filter(b => b.dueDate === todayStr && b.status !== 'pago');
  }, [allBillsWithStatus, todayStr]);

  const pendingBills = useMemo(() => {
    return allBillsWithStatus.filter(b => b.dynamicStatus === 'pendente');
  }, [allBillsWithStatus]);

  const paidBills = useMemo(() => {
    return allBillsWithStatus.filter(b => b.dynamicStatus === 'pago');
  }, [allBillsWithStatus]);

  const overdueTotalValue = useMemo(() => {
    return overdueBills.reduce((acc, b) => acc + b.value, 0);
  }, [overdueBills]);

  const dueTodayTotalValue = useMemo(() => {
    return dueTodayBills.reduce((acc, b) => acc + b.value, 0);
  }, [dueTodayBills]);

  const pendingTotalValue = useMemo(() => {
    return pendingBills.reduce((acc, b) => acc + b.value, 0);
  }, [pendingBills]);

  const paidTotalValue = useMemo(() => {
    return paidBills.reduce((acc, b) => acc + b.value, 0);
  }, [paidBills]);

  // Filtered bills for display
  const filteredBills = useMemo(() => {
    return allBillsWithStatus.filter(bill => {
      // Search term (title or controlNumber)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchTitle = bill.title.toLowerCase().includes(term);
        const matchControl = bill.controlNumber ? bill.controlNumber.toLowerCase().includes(term) : false;
        if (!matchTitle && !matchControl) return false;
      }

      // Status filter
      if (filterStatus !== 'all') {
        if (bill.dynamicStatus !== filterStatus) return false;
      }

      // Category filter
      if (filterCategory !== 'all') {
        if (bill.category !== filterCategory) return false;
      }

      // Date range filter
      if (startDate && bill.dueDate < startDate) return false;
      if (endDate && bill.dueDate > endDate) return false;

      // Value range filter
      if (minValue) {
        const min = parseCurrencyBRL(minValue);
        if (!isNaN(min) && min > 0 && bill.value < min) return false;
      }
      if (maxValue) {
        const max = parseCurrencyBRL(maxValue);
        if (!isNaN(max) && max > 0 && bill.value > max) return false;
      }

      return true;
    });
  }, [allBillsWithStatus, searchTerm, filterStatus, filterCategory, startDate, endDate, minValue, maxValue]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, daysInPrevMonth - i);
      const dateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
      days.push({
        dayNumber: daysInPrevMonth - i,
        dateStr,
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dayNumber: i,
        dateStr,
        isCurrentMonth: true
      });
    }

    // Next month padding to complete 35 or 42 grid slots
    const remainingSlots = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remainingSlots; i++) {
      const nextDate = new Date(year, month + 1, i);
      const dateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
      days.push({
        dayNumber: i,
        dateStr,
        isCurrentMonth: false
      });
    }

    return days;
  }, [year, month]);

  // Map bills by dueDate for fast lookup in calendar
  const billsByDateMap = useMemo(() => {
    const map = new Map<string, AccountPayable[]>();
    for (const b of filteredBills) {
      if (!map.has(b.dueDate)) {
        map.set(b.dueDate, []);
      }
      map.get(b.dueDate)!.push(b);
    }
    return map;
  }, [filteredBills]);

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  const handleCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  // Helper for status badge presentation
  const renderStatusBadge = (dynamicStat: 'pendente' | 'pago' | 'vencido') => {
    if (dynamicStat === 'pago') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          PAGO
        </span>
      );
    }
    if (dynamicStat === 'vencido') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-300">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
          VENCIDO
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-300">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        PENDENTE
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header and Controls */}
      <div className="bg-white border border-slate-200/80 rounded-[32px] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-[#eaf0e3] border border-[#7ea24e]/30 flex items-center justify-center text-[#16462d] shrink-0">
            <Receipt size={24} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-[#0c2a1c] uppercase tracking-tight truncate">Contas a Pagar</h1>
            <p className="text-xs font-semibold text-[#4b6f34] uppercase tracking-wider truncate">
              Controle de Títulos, Vencimentos e Despesas Forttiva
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View switcher toggle */}
          <div className="bg-[#e8e7e1] p-1 rounded-2xl flex items-center border border-slate-200">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all truncate ${
                viewMode === 'calendar'
                  ? 'bg-white text-[#0c2a1c] shadow-sm'
                  : 'text-slate-600 hover:text-[#0c2a1c]'
              }`}
            >
              <CalendarIcon size={16} className="shrink-0" />
              <span>Calendário</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all truncate ${
                viewMode === 'list'
                  ? 'bg-white text-[#0c2a1c] shadow-sm'
                  : 'text-slate-600 hover:text-[#0c2a1c]'
              }`}
            >
              <List size={16} className="shrink-0" />
              <span>Lista / Tabela</span>
            </button>
          </div>

          {/* New bill button */}
          <button
            onClick={() => handleOpenCreate()}
            className="flex items-center gap-2 bg-[#0c2a1c] hover:bg-[#16462d] text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 shrink-0"
          >
            <Plus size={16} />
            Lançar Título
          </button>
        </div>
      </div>

      {/* AMBIENTE DE ALERTA EM DESTAQUE */}
      {(overdueBills.length > 0 || dueTodayBills.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overdueBills.length > 0 && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-[28px] p-5 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-md">
                  <AlertTriangle size={24} className="animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest">
                      Atenção Crítica
                    </span>
                    <h3 className="text-sm font-black text-rose-900 uppercase">
                      {overdueBills.length} {overdueBills.length === 1 ? 'Título Vencido' : 'Títulos Vencidos'}
                    </h3>
                  </div>
                  <p className="text-xs font-bold text-rose-700 mt-1">
                    Total em Atraso: <span className="text-base font-black text-rose-950">{formatBRL(overdueTotalValue)}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFilterStatus('vencido');
                  setViewMode('list');
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow transition-all active:scale-95"
              >
                Ver Vencidos
              </button>
            </div>
          )}

          {dueTodayBills.length > 0 && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-[28px] p-5 shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Clock size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-amber-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest">
                      Vence Hoje
                    </span>
                    <h3 className="text-sm font-black text-amber-900 uppercase">
                      {dueTodayBills.length} {dueTodayBills.length === 1 ? 'Título Vencendo Hoje' : 'Títulos Vencendo Hoje'}
                    </h3>
                  </div>
                  <p className="text-xs font-bold text-amber-800 mt-1">
                    Total a Pagar Hoje: <span className="text-base font-black text-amber-950">{formatBRL(dueTodayTotalValue)}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setStartDate(todayStr);
                  setEndDate(todayStr);
                  setFilterStatus('all');
                  setViewMode('list');
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow transition-all active:scale-95"
              >
                Ver de Hoje
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cards de Resumo Geral */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 p-5 rounded-[28px] shadow-sm min-w-0">
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span> <span className="truncate">Pendentes</span>
          </p>
          <h2 className="text-xl font-black text-[#0c2a1c] mt-2 truncate">{formatBRL(pendingTotalValue)}</h2>
          <p className="text-[11px] font-bold text-slate-500 mt-1 truncate">{pendingBills.length} títulos no prazo</p>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-[28px] shadow-sm min-w-0">
          <p className="text-[10px] font-black text-rose-600 uppercase tracking-wider flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span> <span className="truncate">Vencidos</span>
          </p>
          <h2 className="text-xl font-black text-rose-600 mt-2 truncate">{formatBRL(overdueTotalValue)}</h2>
          <p className="text-[11px] font-bold text-slate-500 mt-1 truncate">{overdueBills.length} títulos atrasados</p>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-[28px] shadow-sm min-w-0">
          <p className="text-[10px] font-black text-[#16462d] uppercase tracking-wider flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-[#7ea24e] shrink-0"></span> <span className="truncate">Pagos</span>
          </p>
          <h2 className="text-xl font-black text-[#16462d] mt-2 truncate">{formatBRL(paidTotalValue)}</h2>
          <p className="text-[11px] font-bold text-slate-500 mt-1 truncate">{paidBills.length} baixados</p>
        </div>

        <div className="bg-white border border-slate-200/80 p-5 rounded-[28px] shadow-sm min-w-0">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5 truncate">
            <Receipt size={12} className="shrink-0" /> <span className="truncate">Total Cadastrado</span>
          </p>
          <h2 className="text-xl font-black text-[#0c2a1c] mt-2 truncate">
            {formatBRL(allBillsWithStatus.reduce((acc, b) => acc + b.value, 0))}
          </h2>
          <p className="text-[11px] font-bold text-slate-500 mt-1 truncate">{allBillsWithStatus.length} lançamentos no total</p>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="bg-white border border-slate-200 rounded-[32px] p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Quick Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="BUSCAR POR TÍTULO OU N° CONTROLE..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 pl-11 pr-4 py-2.5 rounded-2xl text-xs font-black uppercase text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
            />
          </div>

          {/* Quick Status Pill Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                filterStatus === 'all'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Todos ({allBillsWithStatus.length})
            </button>
            <button
              onClick={() => setFilterStatus('pendente')}
              className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                filterStatus === 'pendente'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              }`}
            >
              Pendentes ({pendingBills.length})
            </button>
            <button
              onClick={() => setFilterStatus('vencido')}
              className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                filterStatus === 'vencido'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
            >
              Vencidos ({overdueBills.length})
            </button>
            <button
              onClick={() => setFilterStatus('pago')}
              className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                filterStatus === 'pago'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              Pagos ({paidBills.length})
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${
                showFilters || startDate || endDate || minValue || maxValue || filterCategory !== 'all'
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Filter size={12} />
              Filtros Avançados
            </button>
          </div>
        </div>

        {/* Collapsible Advanced Filters */}
        {showFilters && (
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                Categoria
              </label>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-black uppercase text-slate-800 focus:outline-none"
              >
                <option value="all">TODAS AS CATEGORIAS</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                Vencimento De
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-black text-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                Vencimento Até
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-black text-slate-800 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                Valor Mínimo (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                  R$
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0,00"
                  value={minValue}
                  onChange={e => setMinValue(maskCurrencyInput(e.target.value))}
                  onPaste={e => {
                    e.preventDefault();
                    setMinValue(parsePastedCurrency(e.clipboardData.getData('text')));
                  }}
                  className="w-full bg-slate-50 border border-slate-200 py-2.5 pl-9 pr-3 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:bg-white"
                />
              </div>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                  Valor Máximo (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 pointer-events-none">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    value={maxValue}
                    onChange={e => setMaxValue(maskCurrencyInput(e.target.value))}
                    onPaste={e => {
                      e.preventDefault();
                      setMaxValue(parsePastedCurrency(e.clipboardData.getData('text')));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 py-2.5 pl-9 pr-3 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setFilterCategory('all');
                  setStartDate('');
                  setEndDate('');
                  setMinValue('');
                  setMaxValue('');
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2.5 rounded-xl text-xs font-black uppercase flex items-center justify-center transition-all"
                title="Limpar todos os filtros"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VIEW: CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm space-y-6">
          {/* Calendar Header Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                {monthNames[month]} de {year}
              </h2>
              <button
                onClick={handleCurrentMonth}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
              >
                Mês Atual
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevMonth}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-1 font-black text-xs uppercase"
              >
                <ChevronLeft size={18} />
                Anterior
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-1 font-black text-xs uppercase"
              >
                Próximo
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Calendar Weekday Headers */}
          <div className="grid grid-cols-7 gap-2 text-center">
            {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(dayName => (
              <div key={dayName} className="py-2 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                {dayName}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((cell, idx) => {
              const dayBills = billsByDateMap.get(cell.dateStr) || [];
              const isToday = cell.dateStr === todayStr;
              const hasBills = dayBills.length > 0;
              const dayTotal = dayBills.reduce((acc, b) => acc + b.value, 0);

              const hasOverdue = dayBills.some(b => (b as any).dynamicStatus === 'vencido');
              const hasPending = dayBills.some(b => (b as any).dynamicStatus === 'pendente');
              const allPaid = hasBills && dayBills.every(b => (b as any).dynamicStatus === 'pago');

              return (
                <div
                  key={`${cell.dateStr}-${idx}`}
                  onClick={() => {
                    if (hasBills) {
                      setSelectedDayBills({ date: cell.dateStr, bills: dayBills });
                    } else {
                      handleOpenCreate(cell.dateStr);
                    }
                  }}
                  className={`min-h-[110px] sm:min-h-[125px] p-2 sm:p-2.5 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer group hover:shadow-md ${
                    !cell.isCurrentMonth
                      ? 'bg-slate-50/50 border-slate-100 text-slate-400'
                      : isToday
                      ? 'bg-amber-50/40 border-amber-300 ring-2 ring-amber-300/50'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-black rounded-lg px-2 py-0.5 ${
                        isToday
                          ? 'bg-amber-500 text-white'
                          : cell.isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {hasBills && (
                      <span className="text-[10px] font-black text-slate-700">
                        {formatBRL(dayTotal)}
                      </span>
                    )}
                  </div>

                  {/* Badges preview inside day cell */}
                  <div className="space-y-1 my-1 overflow-hidden">
                    {dayBills.slice(0, 2).map(bill => {
                      const dynamicStat = (bill as any).dynamicStatus;
                      return (
                        <div
                          key={bill.id}
                          className={`truncate text-[9px] font-black px-1.5 py-0.5 rounded-md border flex items-center justify-between ${
                            dynamicStat === 'pago'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : dynamicStat === 'vencido'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                          title={`${bill.title} - ${formatBRL(bill.value)} (${dynamicStat.toUpperCase()})`}
                        >
                          <span className="truncate">{bill.title}</span>
                          <span className="shrink-0 ml-1 opacity-90">{formatBRL(bill.value)}</span>
                        </div>
                      );
                    })}

                    {dayBills.length > 2 && (
                      <p className="text-[8px] font-black text-slate-500 text-center uppercase tracking-wider">
                        +{dayBills.length - 2} mais
                      </p>
                    )}
                  </div>

                  {/* Bottom Day Status Indicator */}
                  <div className="flex items-center justify-between text-[9px] pt-1">
                    {hasBills ? (
                      <div className="flex items-center gap-1">
                        {hasOverdue && <span className="w-2 h-2 rounded-full bg-rose-500" title="Possui vencidos"></span>}
                        {hasPending && <span className="w-2 h-2 rounded-full bg-amber-500" title="Possui pendentes"></span>}
                        {allPaid && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Tudo pago"></span>}
                        <span className="text-[9px] font-black text-slate-500 uppercase">
                          {dayBills.length} {dayBills.length === 1 ? 'conta' : 'contas'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[8px] font-bold text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                        + Adicionar
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Calendar Legend */}
          <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-slate-100 text-xs font-black uppercase text-slate-600">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span>Pendente (No prazo)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500"></span>
              <span>Vencido (Atrasado)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span>Pago (Baixado)</span>
            </div>
            <span className="text-slate-400 font-medium normal-case ml-auto text-[11px]">
              * Clique em qualquer dia para ver os títulos ou adicionar um novo vencimento
            </span>
          </div>
        </div>
      )}

      {/* VIEW: TABLE / LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Listagem de Títulos ({filteredBills.length})
            </h3>
            <span className="text-xs font-black text-slate-500 uppercase">
              Total Filtrado: {formatBRL(filteredBills.reduce((acc, b) => acc + b.value, 0))}
            </span>
          </div>

          {filteredBills.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mx-auto text-slate-400">
                <Receipt size={32} />
              </div>
              <h4 className="text-sm font-black text-slate-700 uppercase">Nenhum título encontrado</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Não há contas cadastradas com os filtros selecionados. Tente ajustar a busca ou lance um novo título.
              </p>
              <button
                onClick={() => handleOpenCreate()}
                className="mt-2 inline-flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider"
              >
                <Plus size={14} />
                Lançar Primeiro Título
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <th className="py-4 px-6">Controle / Doc</th>
                    <th className="py-4 px-6">Título da Conta</th>
                    <th className="py-4 px-6">Categoria</th>
                    <th className="py-4 px-6">Vencimento</th>
                    <th className="py-4 px-6 text-right">Valor (R$)</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredBills.map(bill => {
                    const dynamicStat = (bill as any).dynamicStatus;
                    const isDueToday = bill.dueDate === todayStr && bill.status !== 'pago';

                    return (
                      <tr key={bill.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Control Number */}
                        <td className="py-4 px-6 font-mono font-bold text-slate-600">
                          {bill.controlNumber || '-'}
                        </td>

                        {/* Title */}
                        <td className="py-4 px-6 font-black text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{bill.title}</span>
                            {bill.installmentNumber && bill.totalInstallments && (
                              <span className="bg-slate-100 text-slate-600 text-[9px] font-black px-2 py-0.5 rounded-md border border-slate-200">
                                Parcela {bill.installmentNumber}/{bill.totalInstallments}
                              </span>
                            )}
                          </div>
                          {bill.observation && (
                            <p className="text-[10px] font-normal text-slate-400 mt-0.5 line-clamp-1">
                              {bill.observation}
                            </p>
                          )}
                        </td>

                        {/* Category */}
                        <td className="py-4 px-6">
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg">
                            {bill.category || 'Outros'}
                          </span>
                        </td>

                        {/* Due Date */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-1.5 font-black text-slate-800">
                            <CalendarDays size={14} className="text-slate-400" />
                            {formatDateDisplay(bill.dueDate)}
                          </div>
                          {isDueToday && (
                            <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">
                              Vence Hoje!
                            </span>
                          )}
                        </td>

                        {/* Value */}
                        <td className="py-4 px-6 text-right font-black text-sm text-slate-900">
                          {formatBRL(bill.value)}
                        </td>

                        {/* Status with user requested visual: yellow for pendente, green for pago, red for vencido */}
                        <td className="py-4 px-6 text-center">
                          {renderStatusBadge(dynamicStat)}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right space-x-2">
                          <button
                            onClick={() => handleToggleStatus(bill)}
                            className={`p-2 rounded-xl border transition-all text-[10px] font-black uppercase ${
                              bill.status === 'pago'
                                ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                            }`}
                            title={bill.status === 'pago' ? 'Reabrir como Pendente' : 'Marcar como Pago'}
                          >
                            {bill.status === 'pago' ? 'Reabrir' : 'Dar Baixa'}
                          </button>

                          <button
                            onClick={() => handleOpenEdit(bill)}
                            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all"
                            title="Editar Título"
                          >
                            <Edit3 size={14} />
                          </button>

                          <button
                            onClick={() => setBillToDelete(bill)}
                            className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-all"
                            title="Excluir Título"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: TÍTULOS DO DIA SELECIONADO NO CALENDÁRIO */}
      {selectedDayBills && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[32px] w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase">
                    Vencimentos em {formatDateDisplay(selectedDayBills.date)}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 uppercase">
                    {selectedDayBills.bills.length} {selectedDayBills.bills.length === 1 ? 'título registrado' : 'títulos registrados'} • Total: {formatBRL(selectedDayBills.bills.reduce((acc, b) => acc + b.value, 0))}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDayBills(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content - List of bills */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {selectedDayBills.bills.map(bill => {
                const dynamicStat = (bill as any).dynamicStatus || getDynamicStatus(bill);
                return (
                  <div
                    key={bill.id}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900 uppercase">{bill.title}</h4>
                        {renderStatusBadge(dynamicStat)}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-500">
                        {bill.controlNumber && <span>Controle: {bill.controlNumber}</span>}
                        <span>Categoria: {bill.category || 'Outros'}</span>
                        <span className="text-slate-900 font-black">Valor: {formatBRL(bill.value)}</span>
                      </div>
                      {bill.observation && (
                        <p className="text-[10px] text-slate-400 italic">{bill.observation}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleStatus(bill)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all ${
                          bill.status === 'pago'
                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {bill.status === 'pago' ? 'Reabrir' : 'Dar Baixa'}
                      </button>

                      <button
                        onClick={() => {
                          setSelectedDayBills(null);
                          handleOpenEdit(bill);
                        }}
                        className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
                        title="Editar"
                      >
                        <Edit3 size={14} />
                      </button>

                      <button
                        onClick={() => {
                          setBillToDelete(bill);
                        }}
                        className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => {
                  const targetDate = selectedDayBills.date;
                  setSelectedDayBills(null);
                  handleOpenCreate(targetDate);
                }}
                className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
              >
                <Plus size={14} />
                Lançar Outro Título neste Dia
              </button>

              <button
                onClick={() => setSelectedDayBills(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-200 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LANÇAMENTO / EDIÇÃO DE TÍTULO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[36px] w-full max-w-xl max-h-[92vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <Receipt size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase">
                    {editingBill ? 'Editar Título a Pagar' : 'Novo Título a Pagar'}
                  </h3>
                  <p className="text-xs font-bold text-slate-500 uppercase">
                    {editingBill ? 'Atualize as informações do título' : 'Preencha os dados e vencimentos da conta'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Título */}
              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">
                  Título da Conta / Fornecedor <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="EX: ENERGIA ELÉTRICA, FORNECEDOR ABC, ALUGUEL..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-black uppercase text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
                />
              </div>

              {/* Número de Controle e Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">
                    Número de Controle / Documento
                  </label>
                  <input
                    type="text"
                    placeholder="EX: NF 1234, DOC 9876..."
                    value={controlNumber}
                    onChange={e => setControlNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-black uppercase text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">
                    Categoria <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-black uppercase text-slate-800 focus:outline-none"
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vencimento e Valor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">
                    Data de Vencimento <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={e => {
                      setDueDate(e.target.value);
                      if (isInstallment && installments.length > 0) {
                        generateInstallments(installmentCount, parseCurrencyBRL(value), e.target.value, installmentInterval);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-black text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">
                    Valor (R$) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 pointer-events-none">
                      R$
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      required
                      placeholder="0,00"
                      value={value}
                      onChange={e => {
                        const formatted = maskCurrencyInput(e.target.value);
                        setValue(formatted);
                        if (isInstallment && installments.length > 0) {
                          generateInstallments(installmentCount, parseCurrencyBRL(formatted), dueDate, installmentInterval);
                        }
                      }}
                      onPaste={e => {
                        e.preventDefault();
                        const formatted = parsePastedCurrency(e.clipboardData.getData('text'));
                        setValue(formatted);
                        if (isInstallment && installments.length > 0) {
                          generateInstallments(installmentCount, parseCurrencyBRL(formatted), dueDate, installmentInterval);
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 py-3 pl-10 pr-4 rounded-2xl text-xs font-black text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* STATUS DO TÍTULO COM O VISUAL PEDIDO PELO USUÁRIO */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block">
                  Status do Título:
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setStatus('pendente')}
                    className={`py-3 px-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1.5 ${
                      status === 'pendente'
                        ? 'bg-amber-50 text-amber-700 border-amber-400 ring-2 ring-amber-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${status === 'pendente' ? 'bg-amber-500' : 'bg-slate-300'}`}></span>
                    PENDENTE
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setStatus('pago');
                      if (!paymentDate) setPaymentDate(todayStr);
                    }}
                    className={`py-3 px-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1.5 ${
                      status === 'pago'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-400 ring-2 ring-emerald-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${status === 'pago' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                    PAGO
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus('vencido')}
                    className={`py-3 px-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1.5 ${
                      status === 'vencido'
                        ? 'bg-rose-50 text-rose-700 border-rose-400 ring-2 ring-rose-300'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${status === 'vencido' ? 'bg-rose-500' : 'bg-slate-300'}`}></span>
                    VENCIDO
                  </button>
                </div>
              </div>

              {/* Data de Pagamento se Pago */}
              {status === 'pago' && (
                <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-2xl space-y-2">
                  <label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block">
                    Data em que foi Pago
                  </label>
                  <input
                    type="date"
                    value={paymentDate || todayStr}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="w-full bg-white border border-emerald-300 p-2.5 rounded-xl text-xs font-black text-slate-800 focus:outline-none"
                  />
                </div>
              )}

              {/* RECURSO DE PARCELAMENTO (Quando criando novo título) */}
              {!editingBill && (
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-[24px] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers size={16} className="text-slate-700" />
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Título Parcelado?
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInstallment}
                        onChange={e => {
                          const checked = e.target.checked;
                          setIsInstallment(checked);
                          if (checked) {
                            const valNum = parseCurrencyBRL(value);
                            generateInstallments(installmentCount, valNum, dueDate, installmentInterval);
                          } else {
                            setInstallments([]);
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                    </label>
                  </div>

                  {isInstallment && (
                    <div className="space-y-4 pt-2 border-t border-slate-200">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                            Nº de Parcelas
                          </label>
                          <input
                            type="number"
                            min="2"
                            max="36"
                            value={installmentCount}
                            onChange={e => {
                              const count = parseInt(e.target.value) || 2;
                              setInstallmentCount(count);
                              generateInstallments(count, parseCurrencyBRL(value), dueDate, installmentInterval);
                            }}
                            className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-black text-slate-800 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                            Intervalo
                          </label>
                          <select
                            value={installmentInterval}
                            onChange={e => {
                              const intv = e.target.value as any;
                              setInstallmentInterval(intv);
                              generateInstallments(installmentCount, parseCurrencyBRL(value), dueDate, intv);
                            }}
                            className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-black uppercase text-slate-800 focus:outline-none"
                          >
                            <option value="monthly">Mensal (a cada 30 dias)</option>
                            <option value="biweekly">Quinzenal (a cada 14 dias)</option>
                            <option value="weekly">Semanal (a cada 7 dias)</option>
                          </select>
                        </div>
                      </div>

                      {/* Lista editável de parcelas */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                            Datas e Valores das Parcelas (Editáveis):
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const lastDate = installments.length > 0 ? installments[installments.length - 1].dueDate : dueDate;
                              const [y, m, d] = lastDate.split('-').map(Number);
                              const nextDate = new Date(y, m, d);
                              const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
                              const newItem: InstallmentItem = {
                                number: installments.length + 1,
                                dueDate: nextDateStr,
                                value: 0
                              };
                              setInstallments([...installments, newItem]);
                              setInstallmentCount(installments.length + 1);
                            }}
                            className="text-[10px] font-black text-slate-900 uppercase flex items-center gap-1 hover:underline"
                          >
                            <Plus size={12} /> Adicionar Parcela
                          </button>
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                          {installments.map((inst, index) => (
                            <div key={index} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                              <span className="text-[10px] font-black text-slate-600 uppercase w-20 shrink-0">
                                Parcela {inst.number}:
                              </span>

                              <input
                                type="date"
                                required
                                value={inst.dueDate}
                                onChange={e => {
                                  const updated = [...installments];
                                  updated[index].dueDate = e.target.value;
                                  setInstallments(updated);
                                }}
                                className="flex-1 bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-xs font-bold text-slate-800"
                              />

                              <div className="flex items-center gap-1">
                                <span className="text-xs font-bold text-slate-400">R$</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  required
                                  placeholder="0,00"
                                  value={inst.value === 0 ? '' : formatCurrencyBRL(inst.value, false)}
                                  onChange={e => {
                                    const updated = [...installments];
                                    const formatted = maskCurrencyInput(e.target.value);
                                    updated[index].value = parseCurrencyBRL(formatted);
                                    setInstallments(updated);
                                  }}
                                  onPaste={e => {
                                    e.preventDefault();
                                    const updated = [...installments];
                                    const formatted = parsePastedCurrency(e.clipboardData.getData('text'));
                                    updated[index].value = parseCurrencyBRL(formatted);
                                    setInstallments(updated);
                                  }}
                                  className="w-24 bg-slate-50 border border-slate-200 p-1.5 rounded-lg text-xs font-black text-slate-800 text-right focus:outline-none focus:bg-white"
                                />
                              </div>

                              {installments.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = installments.filter((_, i) => i !== index).map((it, idx) => ({ ...it, number: idx + 1 }));
                                    setInstallments(updated);
                                    setInstallmentCount(updated.length);
                                  }}
                                  className="text-slate-300 hover:text-rose-600 p-1"
                                  title="Remover parcela"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Totalizer check */}
                        <div className="flex items-center justify-between text-[11px] font-black pt-2 px-1">
                          <span className="text-slate-500 uppercase">Soma das Parcelas:</span>
                          <span className={`${
                            Math.abs(installments.reduce((acc, i) => acc + i.value, 0) - (parseFloat(value) || 0)) < 0.05
                              ? 'text-emerald-600'
                              : 'text-amber-600'
                          }`}>
                            {formatBRL(installments.reduce((acc, i) => acc + i.value, 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Observações */}
              <div>
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">
                  Observações
                </label>
                <textarea
                  rows={2}
                  placeholder="OBSERVAÇÕES ADICIONAIS OU INFORMAÇÕES DE PAGAMENTO..."
                  value={observation}
                  onChange={e => setObservation(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-xs font-bold uppercase text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 resize-none"
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md transition-all active:scale-95 flex items-center gap-2"
                >
                  <Receipt size={16} />
                  {editingBill ? 'Salvar Alterações' : isInstallment ? `Gerar ${installments.length} Parcelas` : 'Lançar Título'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <ConfirmationModal
        isOpen={!!billToDelete}
        onClose={() => setBillToDelete(null)}
        onConfirm={handleDeleteBill}
        title="Excluir Título"
        message={`Deseja realmente excluir o título "${billToDelete?.title}" no valor de ${billToDelete ? formatBRL(billToDelete.value) : ''}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir Título"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
};

export default AccountsPayable;
