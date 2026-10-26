
import React, { useState, useMemo, useRef } from 'react';
import { AppState, Employee, AttendanceRecord } from '../types';
import { Users, UserPlus, X, ChevronRight, ChevronLeft, Edit2, Trash2, Loader2, Save, Fingerprint, Smartphone, MapPin, CreditCard, Power, UserX, AlertCircle, Clock, Briefcase, HeartPulse, ShieldAlert, Palmtree, Mail, DollarSign, Calendar, Users2, CheckCircle2, Wallet, BarChart3, Send, Printer } from 'lucide-react';
import { dbSave, dbDelete, fetchCompleteCompanyData } from '../lib/supabase';
import ConfirmationModal from './ConfirmationModal';
import { EmployeeTransaction } from '../types';

interface EmployeesProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

const Employees: React.FC<EmployeesProps> = ({ state, setState, notify }) => {
  const savingKeys = useRef<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [showInactive, setShowInactive] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState<{ emp: Employee, date: string, record?: AttendanceRecord } | null>(null);
  const [confirmStatusToggle, setConfirmStatusToggle] = useState<Employee | null>(null);
  const [selectedEmployeeFinance, setSelectedEmployeeFinance] = useState<Employee | null>(null);
  const [financeSheetStartDate, setFinanceSheetStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [financeSheetEndDate, setFinanceSheetEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [newFinanceEntry, setNewFinanceEntry] = useState({
    description: '',
    value: '',
    type: 'out' as 'in' | 'out',
    date: new Date().toISOString().split('T')[0]
  });

  const initialFormState = { 
    name: '', 
    role: '', 
    defaultValue: '', 
    cpf: '', 
    phone: '', 
    pixKey: '', 
    address: '',
    admissionDate: new Date().toISOString().split('T')[0],
    paymentModality: 'DIARIA' as 'DIARIA' | 'CLT',
    workload: '44H SEMANAIS',
    startTime: '08:00',
    breakStart: '12:00',
    breakEnd: '13:00',
    endTime: '17:00'
  };
  
  const [employeeForm, setEmployeeForm] = useState(initialFormState);

  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const [pointForm, setPointForm] = useState({
    clockIn: '',
    breakStart: '',
    breakEnd: '',
    clockOut: '',
    status: 'present' as AttendanceRecord['status'],
    observation: ''
  });

  const refreshData = async () => {
    if (state.currentUser?.companyId) {
      const data = await fetchCompleteCompanyData(state.currentUser.companyId);
      if (data) setState(prev => ({ ...prev, ...data }));
    }
  };

  const getVirtualStatus = (record: AttendanceRecord): AttendanceRecord['status'] => {
    if (record.status !== 'absent') return record.status;
    const obs = record.discountObservation || '';
    if (obs.startsWith('[AT]')) return 'atestado';
    if (obs.startsWith('[FJ]')) return 'justified';
    if (obs.startsWith('[FE]')) return 'vacation';
    return 'absent';
  };

  const handleToggleAttendance = async (empId: string, date: string) => {
    const emp = state.employees.find(e => e.id === empId);
    if (!emp) return;
    if (emp.status === 'inactive') return notify("Não é possível lançar frequência para inativos", "error");

    const key = `${empId}_${date}`;
    if (savingKeys.current.has(key)) return;
    savingKeys.current.add(key);

    try {
      const allExisting = state.attendanceRecords.filter(r => r.employeeId === empId && r.date === date);
      let existing = allExisting[0];

      // Se houver registros duplicados no estado local, removemos os excedentes no Supabase para limpar sujeira
      if (allExisting.length > 1) {
        console.warn(`Duplicados encontrados para o colaborador ${empId} em ${date}. Limpando...`);
        try {
          const deletePromises = allExisting.slice(1).map(r => dbDelete('attendance_records', r.id));
          await Promise.all(deletePromises);
        } catch (err) {
          console.error("Erro ao deletar registros duplicados:", err);
        }
      }

      if (emp.paymentModality === 'CLT') {
        const virtualStatus = existing ? getVirtualStatus(existing) : 'present';
        const cleanObs = (existing?.discountObservation || '').replace(/^\[(AT|FJ|FE)\]\s*/, '');

        setPointForm({
          clockIn: existing?.clockIn || emp.startTime || '08:00',
          breakStart: existing?.breakStart || emp.breakStart || '12:00',
          breakEnd: existing?.breakEnd || emp.breakEnd || '13:00',
          clockOut: existing?.clockOut || emp.endTime || '17:00',
          status: virtualStatus,
          observation: cleanObs
        });
        setShowTimeModal({ emp, date, record: existing });
        // Liberar a chave pois o fluxo vai continuar no modal
        savingKeys.current.delete(key);
        return;
      }

      if (!existing) {
        await dbSave('attendance_records', {
          companyId: state.currentUser?.companyId,
          employeeId: empId,
          date,
          status: 'present',
          value: Number(emp.defaultValue) || 0,
          paymentStatus: 'pendente'
        });
      } else if (existing.status === 'present') {
        await dbSave('attendance_records', { ...existing, status: 'partial', value: (Number(emp.defaultValue) || 0) / 2 });
      } else if (existing.status === 'partial') {
        await dbSave('attendance_records', { ...existing, status: 'absent', value: 0 });
      } else {
        await dbDelete('attendance_records', existing.id);
      }
      await refreshData();
    } catch (e) { 
      notify("Erro ao sincronizar presença", "error"); 
    } finally {
      savingKeys.current.delete(key);
    }
  };

  const handleSavePoint = async () => {
    if (!showTimeModal) return;
    const { emp, date, record } = showTimeModal;

    const key = `${emp.id}_${date}`;
    if (savingKeys.current.has(key)) return;
    savingKeys.current.add(key);

    setIsLoading(true);
    try {
      let dbStatus: AttendanceRecord['status'] = 'absent';
      let prefix = '';

      if (pointForm.status === 'present' || pointForm.status === 'partial') {
        dbStatus = pointForm.status;
      } else if (pointForm.status === 'atestado') {
        dbStatus = 'absent';
        prefix = '[AT] ';
      } else if (pointForm.status === 'justified') {
        dbStatus = 'absent';
        prefix = '[FJ] ';
      } else if (pointForm.status === 'vacation') {
        dbStatus = 'absent';
        prefix = '[FE] ';
      }

      const finalObservation = prefix + (pointForm.observation || '');
      const isWorking = dbStatus === 'present' || dbStatus === 'partial';
      
      let finalValue = 0;
      if (emp.paymentModality === 'CLT') {
        if (['present', 'partial', 'atestado', 'justified', 'vacation'].includes(pointForm.status)) {
          finalValue = Number(emp.defaultValue) || 0;
        }
      }

      const allExisting = state.attendanceRecords.filter(r => r.employeeId === emp.id && r.date === date);
      const existingId = record?.id || allExisting[0]?.id || undefined;

      // Limpa possíveis duplicados excedentes no banco de dados para evitar bugs
      if (allExisting.length > 1) {
        const extraRecords = allExisting.filter(r => r.id !== existingId);
        if (extraRecords.length > 0) {
          try {
            await Promise.all(extraRecords.map(r => dbDelete('attendance_records', r.id)));
          } catch (err) {
            console.error("Erro ao limpar registros duplicados excedentes:", err);
          }
        }
      }

      await dbSave('attendance_records', {
        id: existingId,
        companyId: state.currentUser?.companyId,
        employeeId: emp.id,
        date,
        status: dbStatus,
        value: finalValue,
        paymentStatus: record?.paymentStatus || 'pendente',
        clockIn: isWorking ? (pointForm.clockIn || null) : null,
        breakStart: isWorking ? (pointForm.breakStart || null) : null,
        breakEnd: isWorking ? (pointForm.breakEnd || null) : null,
        clockOut: isWorking ? (pointForm.clockOut || null) : null,
        discountObservation: finalObservation || null
      });
      
      await refreshData();
      setShowTimeModal(null);
      notify("Registro salvo com sucesso");
    } catch (e) { 
      notify("Erro ao salvar registro de ponto", "error"); 
    } finally { 
      setIsLoading(false); 
      savingKeys.current.delete(key);
    }
  };

  const handleToggleStatus = async (emp: Employee) => {
    setIsLoading(true);
    try {
      const newStatus = emp.status === 'active' ? 'inactive' : 'active';
      await dbSave('employees', { id: emp.id, status: newStatus });
      await refreshData();
      notify(`Colaborador ${newStatus === 'active' ? 'Reativado' : 'Inativado'}`);
    } catch (e) { notify("Falha ao atualizar status", "error"); } finally { setIsLoading(false); }
  };

  const handleAddFinanceEntry = async () => {
    if (!selectedEmployeeFinance || !newFinanceEntry.description || !newFinanceEntry.value) return;
    setIsLoading(true);
    try {
      await dbSave('employee_transactions', {
        companyId: state.currentUser?.companyId,
        employeeId: selectedEmployeeFinance.id,
        date: newFinanceEntry.date,
        description: newFinanceEntry.description.toUpperCase(),
        type: newFinanceEntry.type,
        value: parseFloat(newFinanceEntry.value.replace(',', '.')),
        sentToFinance: false
      });
      await refreshData();
      setNewFinanceEntry({ ...newFinanceEntry, description: '', value: '' });
      notify("Lançamento realizado com sucesso!");
    } catch (e) {
      notify("Erro ao realizar lançamento", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteFinanceEntry = async (id: string, source: 'manual' | 'attendance') => {
    if (source === 'attendance') {
      notify("Registros de presença devem ser alterados no calendário", "error");
      return;
    }
    setIsLoading(true);
    try {
      await dbDelete('employee_transactions', id);
      await refreshData();
      notify("Lançamento excluído");
    } catch (e) {
      notify("Erro ao excluir lançamento", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEntryToFinance = async (entry: any) => {
    if (entry.sentToFinance) return;
    setIsLoading(true);
    try {
      // Sempre gera uma SAÍDA no financeiro geral
      const cashFlowEntry = await dbSave('cash_flow', {
        companyId: state.currentUser?.companyId,
        type: 'out',
        value: entry.value,
        date: new Date().toISOString().split('T')[0],
        reference: `PAGTO/VALE: ${selectedEmployeeFinance?.name} - ${entry.description}`,
        category: 'Salários'
      });

      if (entry.source === 'manual') {
        await dbSave('employee_transactions', {
          id: entry.id,
          sentToFinance: true,
          financeId: cashFlowEntry[0].id
        });
      } else {
        // Se for attendance, marcamos como pago
        const record = state.attendanceRecords.find(r => r.id === entry.id);
        if (record) {
          await dbSave('attendance_records', {
            ...record,
            paymentStatus: 'pago'
          });
        }
      }
      await refreshData();
      notify("Lançamento enviado ao financeiro!");
    } catch (e) {
      notify("Erro ao enviar ao financeiro", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendTotalBalanceToFinance = async () => {
    if (!selectedEmployeeFinance || ledgerEntries.length === 0) return;
    const pendingEntries = ledgerEntries.filter(e => !e.sentToFinance);
    if (pendingEntries.length === 0) return notify("Nenhum lançamento pendente", "info");

    const totalValue = pendingEntries.reduce((acc, e) => {
      // Na ficha do funcionário: IN aumenta saldo, OUT diminui saldo
      return acc + (e.type === 'in' ? e.value : -e.value);
    }, 0);

    if (totalValue <= 0) return notify("Balanço total deve ser positivo para envio", "error");

    setIsLoading(true);
    try {
      const cashFlowEntry = await dbSave('cash_flow', {
        companyId: state.currentUser?.companyId,
        type: 'out',
        value: totalValue,
        date: new Date().toISOString().split('T')[0],
        reference: `FECHAMENTO TOTAL: ${selectedEmployeeFinance.name}`,
        category: 'Salários'
      });

      const updates = pendingEntries.map(entry => {
        if (entry.source === 'manual') {
          return dbSave('employee_transactions', {
            id: entry.id,
            sentToFinance: true,
            financeId: cashFlowEntry[0].id
          });
        } else {
          const record = state.attendanceRecords.find(r => r.id === entry.id);
          return dbSave('attendance_records', {
            ...record,
            paymentStatus: 'pago'
          });
        }
      });

      await Promise.all(updates);
      await refreshData();
      notify("Balanço total enviado ao financeiro!");
    } catch (e) {
      notify("Erro ao processar balanço total", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeForm.name || !employeeForm.name.trim()) return notify("Nome completo é obrigatório", "error");
    if (!employeeForm.role) return notify("Selecione um Cargo / Função", "error");
    
    const rawValue = String(employeeForm.defaultValue || '').trim();
    const finalValue = parseFloat(rawValue.replace(',', '.'));

    // Validação obrigatória da diária
    if (employeeForm.paymentModality === 'DIARIA') {
      if (!rawValue) {
        return notify("O preenchimento do valor da diária é obrigatório", "error");
      }
      if (isNaN(finalValue) || finalValue <= 0) {
        return notify("Informe um valor válido e maior que zero para a diária (R$)", "error");
      }
    }

    setIsLoading(true);
    try {
      if (!state.currentUser?.companyId) {
        throw new Error("Sessão expirada ou empresa não identificada.");
      }

      const valToSave = isNaN(finalValue) || finalValue < 0 ? 0 : finalValue;

      await dbSave('employees', {
        id: editingId || undefined,
        companyId: state.currentUser.companyId,
        name: (employeeForm.name || '').trim().toUpperCase(),
        role: (employeeForm.role || '').toUpperCase(),
        defaultValue: valToSave,
        cpf: employeeForm.cpf || null,
        phone: employeeForm.phone || null,
        pixKey: employeeForm.pixKey || null,
        address: (employeeForm.address || '').toUpperCase() || null,
        admissionDate: employeeForm.admissionDate || null,
        status: editingId ? (state.employees.find(e => e.id === editingId)?.status || 'active') : 'active',
        paymentModality: employeeForm.paymentModality,
        workload: (employeeForm.workload || '').toUpperCase() || null,
        startTime: employeeForm.startTime || null,
        breakStart: employeeForm.breakStart || null,
        breakEnd: employeeForm.breakEnd || null,
        endTime: employeeForm.endTime || null
      });
      await refreshData();
      setShowForm(false);
      setEditingId(null);
      setEmployeeForm(initialFormState);
      notify(editingId ? "Cadastro atualizado" : "Novo colaborador integrado");
    } catch (e: any) { 
      notify("Falha na sincronização.", "error"); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleEdit = (emp: Employee) => {
    setEditingId(emp.id);
    setEmployeeForm({
      name: emp.name,
      role: emp.role,
      defaultValue: emp.defaultValue && emp.defaultValue > 0 ? String(emp.defaultValue) : '',
      cpf: formatCPF(emp.cpf || ''),
      phone: formatPhone(emp.phone || ''),
      pixKey: emp.pixKey || '',
      address: emp.address || '',
      admissionDate: emp.admissionDate || new Date().toISOString().split('T')[0],
      paymentModality: emp.paymentModality || 'DIARIA',
      workload: emp.workload || '44H SEMANAIS',
      startTime: emp.startTime || '08:00',
      breakStart: emp.breakStart || '12:00',
      breakEnd: emp.breakEnd || '13:00',
      endTime: emp.endTime || '17:00'
    });
    setShowForm(true);
  };

  const daysInMonth = useMemo(() => new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 0).getDate(), [currentCalendarDate]);
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const filteredEmployees = state.employees.filter(e => showInactive || e.status === 'active');

  const handlePrevMonth = () => {
    setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentCalendarDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleCurrentMonth = () => {
    setCurrentCalendarDate(new Date());
  };

  // Cálculos de Resumo Financeiro do Mês Visualizado - Fechamento do Mês
  const monthSummary = useMemo(() => {
    const yearMonth = `${currentCalendarDate.getFullYear()}-${String(currentCalendarDate.getMonth() + 1).padStart(2, '0')}`;
    const allEmpMap = new Map<string, Employee>(state.employees.map(e => [e.id, e]));
    
    let paid = 0;
    let pending = 0;

    state.attendanceRecords.forEach(record => {
      if (record.date.startsWith(yearMonth)) {
        const emp = allEmpMap.get(record.employeeId);
        if (!emp) return;
        if (!showInactive && emp.status === 'inactive') return;

        // Cálculo: (Valor do Dia + Bônus) - Descontos
        const netValue = Math.max(0, (record.value + (record.bonusValue || 0)) - (record.discountValue || 0));
        if (record.paymentStatus === 'pago') {
          paid += netValue;
        } else {
          pending += netValue;
        }
      }
    });

    return { paid, pending, total: paid + pending };
  }, [state.attendanceRecords, state.employees, currentCalendarDate, showInactive]);

  const formatMoney = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const ledgerEntries = useMemo(() => {
    if (!selectedEmployeeFinance) return [];
    
    const attRecords = state.attendanceRecords
      .filter(r => r.employeeId === selectedEmployeeFinance.id && r.value > 0 && r.date >= financeSheetStartDate && r.date <= financeSheetEndDate)
      .map(r => ({
        id: r.id,
        date: r.date,
        description: 'DIÁRIA',
        type: 'in' as const,
        value: r.value,
        source: 'attendance' as const,
        sentToFinance: r.paymentStatus === 'pago'
      }));

    const manualTrans = (state.employeeTransactions || [])
      .filter(t => t.employeeId === selectedEmployeeFinance.id && t.date >= financeSheetStartDate && t.date <= financeSheetEndDate)
      .map(t => ({
        id: t.id,
        date: t.date,
        description: t.description,
        type: t.type,
        value: t.value,
        source: 'manual' as const,
        sentToFinance: t.sentToFinance
      }));

    return [...attRecords, ...manualTrans].sort((a, b) => b.date.localeCompare(a.date));
  }, [state.attendanceRecords, state.employeeTransactions, selectedEmployeeFinance, financeSheetStartDate, financeSheetEndDate]);

  const ledgerBalance = useMemo(() => {
    return ledgerEntries.reduce((acc, e) => acc + (e.type === 'in' ? e.value : -e.value), 0);
  }, [ledgerEntries]);

  const getAttendanceLabel = (record: AttendanceRecord | undefined, emp: Employee) => {
    if (!record) return '-';
    const virtualStatus = getVirtualStatus(record);
    switch(virtualStatus) {
      case 'present': return 'P';
      case 'partial': return '½';
      case 'absent': return 'F';
      case 'atestado': return 'AT';
      case 'justified': return 'FJ';
      case 'vacation': return 'FE';
      default: return '-';
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-[#0c2a1c] uppercase tracking-tight">Equipe & Frequência</h2>
          <p className="text-[10px] text-[#4b6f34] font-bold uppercase tracking-widest mt-1">Gestão de Pessoal e Presença Forttiva</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button onClick={() => setShowInactive(!showInactive)} className="flex-1 md:flex-none px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-[9px] uppercase transition-all shadow-sm hover:border-[#7ea24e] truncate">
             {showInactive ? 'Filtrar Ativos' : 'Exibir Todos'}
          </button>
          <button onClick={() => { setEditingId(null); setEmployeeForm(initialFormState); setShowForm(true); }} className="flex-1 md:flex-none bg-[#0c2a1c] text-white px-5 py-3 rounded-xl font-black text-[9px] uppercase shadow-lg hover:bg-[#16462d] transition-all flex items-center justify-center gap-2 active:scale-95 shrink-0">
             <UserPlus size={16}/> Novo Cadastro
          </button>
        </div>
      </header>

      {/* Subtotais de Fechamento do Mês em Visualização */}
      <div className="bg-white p-5 md:p-6 rounded-[32px] border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0c2a1c] text-[#9bb779] flex items-center justify-center shadow-xs shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <span className="text-[9px] font-black text-[#4b6f34] uppercase tracking-widest block">
                Fechamento do Mês em Visualização
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                {currentCalendarDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button 
              type="button"
              onClick={handlePrevMonth}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-black text-[9px] uppercase transition-all flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
              title="Mês Anterior"
            >
              <ChevronLeft size={14} /> Mês Anterior
            </button>
            <button 
              type="button"
              onClick={handleCurrentMonth}
              className="px-3 py-1.5 bg-[#eaf0e3] hover:bg-[#d8e4cd] text-[#16462d] border border-[#7ea24e]/30 rounded-xl font-black text-[9px] uppercase transition-all shadow-xs cursor-pointer active:scale-95"
              title="Mês Atual"
            >
              Hoje
            </button>
            <button 
              type="button"
              onClick={handleNextMonth}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-black text-[9px] uppercase transition-all flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
              title="Próximo Mês"
            >
              Próximo <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Subtotais: Já Pago, Devendo (A Pagar) e Fechamento Total */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Subtotal Já Pago */}
          <div className="bg-gradient-to-br from-emerald-50/90 to-emerald-50/40 p-5 rounded-2xl border border-emerald-200/80 shadow-xs flex items-center gap-4 transition-all">
             <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
               <CheckCircle2 size={24} />
             </div>
             <div className="min-w-0">
                <p className="text-[9px] font-black text-emerald-800 uppercase tracking-wider mb-0.5 truncate">
                  Subtotal Já Pago
                </p>
                <h4 className="text-2xl font-black text-emerald-950 tracking-tight truncate">
                  {formatMoney(monthSummary.paid)}
                </h4>
                <p className="text-[8px] font-bold text-emerald-700/80 uppercase tracking-widest mt-0.5">
                  Quitado em {currentCalendarDate.toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}
                </p>
             </div>
          </div>

          {/* Subtotal Devendo (Pendente) */}
          <div className="bg-gradient-to-br from-amber-50/90 to-amber-50/40 p-5 rounded-2xl border border-amber-200/80 shadow-xs flex items-center gap-4 transition-all">
             <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-sm shrink-0">
               <Wallet size={24} />
             </div>
             <div className="min-w-0">
                <p className="text-[9px] font-black text-amber-800 uppercase tracking-wider mb-0.5 truncate">
                  Subtotal Devendo (A Pagar)
                </p>
                <h4 className="text-2xl font-black text-amber-950 tracking-tight truncate">
                  {formatMoney(monthSummary.pending)}
                </h4>
                <p className="text-[8px] font-bold text-amber-700/80 uppercase tracking-widest mt-0.5">
                  Em aberto em {currentCalendarDate.toLocaleString('pt-BR', { month: 'short' }).toUpperCase()}
                </p>
             </div>
          </div>

          {/* Fechamento Consolidado do Mês */}
          <div className="bg-[#0c2a1c] p-5 rounded-2xl border border-[#7ea24e]/30 shadow-md flex items-center gap-4 transition-all text-white">
             <div className="w-12 h-12 bg-white/10 text-[#9bb779] rounded-2xl flex items-center justify-center shadow-inner shrink-0">
               <DollarSign size={24} />
             </div>
             <div className="min-w-0">
                <p className="text-[9px] font-black text-[#9bb779] uppercase tracking-wider mb-0.5 truncate">
                  Fechamento do Mês ({currentCalendarDate.toLocaleString('pt-BR', { month: 'short' }).toUpperCase()})
                </p>
                <h4 className="text-2xl font-black text-white tracking-tight truncate">
                  {formatMoney(monthSummary.total)}
                </h4>
                <p className="text-[8px] font-bold text-white/60 uppercase tracking-widest mt-0.5">
                  Total consolidado do período
                </p>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
        <div className="p-4 md:p-6 border-b bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors" title="Mês Anterior"><ChevronLeft size={18} /></button>
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">{currentCalendarDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}</h3>
            <button onClick={handleNextMonth} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors" title="Próximo Mês"><ChevronRight size={18} /></button>
          </div>
          
          {/* Legenda Atualizada: Apenas Presença, Falta e Meia Diária com suas letras e cores */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
             <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Legenda:</span>
             <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-xl">
               <span className="w-5 h-5 rounded-md bg-emerald-500 text-white font-black flex items-center justify-center text-[10px] shadow-xs">P</span>
               <span className="text-[9px] font-black uppercase text-emerald-800 tracking-wider">Presença</span>
             </div>
             <div className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200/80 px-2.5 py-1 rounded-xl">
               <span className="w-5 h-5 rounded-md bg-rose-500 text-white font-black flex items-center justify-center text-[10px] shadow-xs">F</span>
               <span className="text-[9px] font-black uppercase text-rose-800 tracking-wider">Falta</span>
             </div>
             <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200/80 px-2.5 py-1 rounded-xl">
               <span className="w-5 h-5 rounded-md bg-amber-500 text-white font-black flex items-center justify-center text-[10px] shadow-xs">½</span>
               <span className="text-[9px] font-black uppercase text-amber-800 tracking-wider">Meia Diária</span>
             </div>
          </div>
        </div>
        
        <div className="overflow-x-auto scrollbar-hide">
          <table className="w-full min-w-[1000px] md:min-w-[800px] border-collapse">
            <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b">
              <tr>
                <th className="sticky left-0 z-20 bg-slate-50 p-3 md:p-4 text-left border-r shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] min-w-[140px] md:min-w-[220px]">Colaborador</th>
                {calendarDays.map(day => {
                   const dateStr = `${currentCalendarDate.getFullYear()}-${String(currentCalendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                   const isToday = dateStr === new Date().toISOString().split('T')[0];
                   return (
                     <th key={day} className="p-1 md:p-2 text-center border-r min-w-[44px] md:min-w-[34px]">
                       <span className={`inline-flex items-center justify-center w-8 h-8 md:w-7 md:h-7 rounded-lg transition-all ${isToday ? 'bg-blue-600 text-white shadow-md' : ''}`}>
                        {day}
                       </span>
                     </th>
                   );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map(emp => (
                <tr key={emp.id} className={`hover:bg-slate-50/50 transition-colors group ${emp.status === 'inactive' ? 'opacity-50' : ''}`}>
                  <td className="sticky left-0 z-10 bg-white p-3 md:p-4 border-r shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-1 md:gap-2">
                      <div className="min-w-0">
                        <p onClick={() => setSelectedEmployeeFinance(emp)} className={`text-[9px] md:text-[10px] font-black uppercase truncate flex items-center gap-1 cursor-pointer hover:text-blue-600 transition-colors ${emp.status === 'inactive' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                          {emp.paymentModality === 'CLT' && <Clock size={10} className="text-blue-500" />}
                          {emp.name}
                        </p>
                        <p className="text-[7px] md:text-[8px] text-slate-400 font-bold uppercase truncate">{emp.role}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(emp)} className="p-1 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={10}/></button>
                        <button onClick={() => setConfirmStatusToggle(emp)} className={`p-1 rounded-lg ${emp.status === 'active' ? 'text-rose-400 hover:bg-rose-50' : 'text-emerald-500 hover:bg-emerald-50'}`} title={emp.status === 'active' ? 'Desativar' : 'Ativar'}><Power size={10}/></button>
                      </div>
                    </div>
                  </td>
                  {calendarDays.map(day => {
                    const dateStr = `${currentCalendarDate.getFullYear()}-${String(currentCalendarDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const att = state.attendanceRecords.find(r => r.employeeId === emp.id && r.date === dateStr);
                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                    const virtualStatus = att ? getVirtualStatus(att) : null;
                    let bgColor = 'text-slate-200 hover:bg-slate-100';
                    if (att) {
                        switch(virtualStatus) {
                          case 'present': bgColor = 'bg-emerald-600 text-white shadow-inner font-black'; break;
                          case 'absent': bgColor = 'bg-rose-500 text-white shadow-inner font-black'; break;
                          case 'partial': bgColor = 'bg-amber-500 text-white shadow-inner font-black'; break;
                          case 'atestado': bgColor = 'bg-purple-600 text-white shadow-inner font-black'; break;
                          case 'justified': bgColor = 'bg-sky-500 text-white shadow-inner font-black'; break;
                          case 'vacation': bgColor = 'bg-amber-400 text-white shadow-inner font-black'; break;
                        }
                    } else if (isToday) {
                        bgColor = 'bg-blue-50/40 text-blue-500 font-bold';
                    }
                    return (
                      <td key={day} onClick={() => handleToggleAttendance(emp.id, dateStr)} className={`p-0 border-r h-12 md:h-10 text-center text-[10px] font-black transition-all cursor-pointer active:scale-95 ${bgColor}`}>
                        {getAttendanceLabel(att, emp)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
           <form onSubmit={handleSaveEmployee} className="bg-white rounded-[40px] w-full max-w-2xl p-8 md:p-10 space-y-6 shadow-2xl overflow-y-auto max-h-[95vh] border border-slate-100 animate-in zoom-in-95">
              <div className="flex justify-between items-center border-b pb-6">
                 <div>
                    <h3 className="text-sm font-black uppercase text-slate-900">{editingId ? 'Editar Perfil Operacional' : 'Novo Cadastro Operacional'}</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sincronização Cloud Fera Service</p>
                 </div>
                 <button type="button" onClick={() => setShowForm(false)} className="text-slate-300 hover:text-slate-900 p-2"><X size={24}/></button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 p-6 bg-slate-50 rounded-[32px] border border-slate-100 space-y-4">
                  <div className="flex gap-2 p-1 bg-slate-200 rounded-2xl">
                    <button type="button" onClick={() => setEmployeeForm({...employeeForm, paymentModality: 'DIARIA'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${employeeForm.paymentModality === 'DIARIA' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500'}`}>DIARISTA / AUTÔNOMO</button>
                    <button type="button" onClick={() => setEmployeeForm({...employeeForm, paymentModality: 'CLT'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${employeeForm.paymentModality === 'CLT' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}>REGIME CLT (MENSALISTA)</button>
                  </div>
                </div>

                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Nome Completo</label>
                   <input required className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-[11px] font-black uppercase outline-none focus:bg-white focus:border-slate-900" placeholder="EX: JOÃO DA SILVA" value={employeeForm.name} onChange={e => setEmployeeForm({...employeeForm, name: e.target.value})} />
                </div>

                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Cargo / Função</label>
                   <select required className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-[11px] font-black uppercase outline-none" value={employeeForm.role} onChange={e => setEmployeeForm({...employeeForm, role: e.target.value})}>
                     <option value="">SELECIONE UM CARGO...</option>
                     {state.employeeRoles.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                   </select>
                </div>

                {employeeForm.paymentModality === 'DIARIA' ? (
                  <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
                       Valor da Diária (R$) <span className="text-rose-500 font-bold">*</span>
                     </label>
                     <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0.01"
                          required
                          placeholder="Ex: 150.00 (Obrigatório)" 
                          className="w-full bg-slate-50 border border-slate-200 pl-11 pr-4 py-4 rounded-2xl text-[11px] font-black outline-none focus:bg-white focus:border-slate-900" 
                          value={employeeForm.defaultValue} 
                          onChange={e => setEmployeeForm({...employeeForm, defaultValue: e.target.value})} 
                        />
                     </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
                       Valor Base Diário (R$)
                     </label>
                     <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16}/>
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          placeholder="0.00" 
                          className="w-full bg-slate-50 border border-slate-200 pl-11 pr-4 py-4 rounded-2xl text-[11px] font-black outline-none focus:bg-white focus:border-slate-900" 
                          value={employeeForm.defaultValue} 
                          onChange={e => setEmployeeForm({...employeeForm, defaultValue: e.target.value})} 
                        />
                     </div>
                  </div>
                )}

                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase ml-1">CPF</label>
                   <input className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-[11px] font-black outline-none focus:bg-white" placeholder="000.000.000-00" value={employeeForm.cpf} onChange={e => setEmployeeForm({...employeeForm, cpf: formatCPF(e.target.value)})} />
                </div>

                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Telefone / WhatsApp</label>
                   <input className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-[11px] font-black outline-none focus:bg-white" placeholder="(00) 00000-0000" value={employeeForm.phone} onChange={e => setEmployeeForm({...employeeForm, phone: formatPhone(e.target.value)})} />
                </div>

                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Chave PIX (Acertos)</label>
                   <input className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-[11px] font-black outline-none focus:bg-white" placeholder="E-MAIL, CPF OU ALEATÓRIA" value={employeeForm.pixKey} onChange={e => setEmployeeForm({...employeeForm, pixKey: e.target.value})} />
                </div>

                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Data de Admissão</label>
                   <input type="date" className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-[11px] font-black outline-none focus:bg-white" value={employeeForm.admissionDate} onChange={e => setEmployeeForm({...employeeForm, admissionDate: e.target.value})} />
                </div>

                <div className="md:col-span-2 space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Endereço de Residência</label>
                   <input className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-[11px] font-black uppercase outline-none focus:bg-white focus:border-slate-900" placeholder="RUA, NÚMERO, BAIRRO, CIDADE" value={employeeForm.address} onChange={e => setEmployeeForm({...employeeForm, address: e.target.value})} />
                </div>

                {employeeForm.paymentModality === 'CLT' && (
                  <div className="md:col-span-2 p-6 bg-blue-50 rounded-[32px] border border-blue-100 space-y-4">
                     <h4 className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-2"><Clock size={16}/> Configuração de Jornada de Trabalho</h4>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                           <label className="text-[8px] font-black text-blue-400 uppercase">ENTRADA</label>
                           <input type="time" className="w-full bg-white border border-blue-200 p-3 rounded-xl text-[10px] font-black" value={employeeForm.startTime} onChange={e => setEmployeeForm({...employeeForm, startTime: e.target.value})}/>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[8px] font-black text-blue-400 uppercase">S. INTRA-JORNADA</label>
                           <input type="time" className="w-full bg-white border border-blue-200 p-3 rounded-xl text-[10px] font-black" value={employeeForm.breakStart} onChange={e => setEmployeeForm({...employeeForm, breakStart: e.target.value})}/>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[8px] font-black text-blue-400 uppercase">R. INTRA-JORNADA</label>
                           <input type="time" className="w-full bg-white border border-blue-200 p-3 rounded-xl text-[10px] font-black" value={employeeForm.breakEnd} onChange={e => setEmployeeForm({...employeeForm, breakEnd: e.target.value})}/>
                        </div>
                        <div className="space-y-1">
                           <label className="text-[8px] font-black text-blue-400 uppercase">SAÍDA FINAL</label>
                           <input type="time" className="w-full bg-white border border-blue-200 p-3 rounded-xl text-[10px] font-black" value={employeeForm.endTime} onChange={e => setEmployeeForm({...employeeForm, endTime: e.target.value})}/>
                        </div>
                     </div>
                     <div className="space-y-1">
                        <label className="text-[8px] font-black text-blue-400 uppercase">CARGA HORÁRIA TOTAL</label>
                        <input className="w-full bg-white border border-blue-200 p-3 rounded-xl text-[10px] font-black uppercase" placeholder="EX: 44H SEMANAIS" value={employeeForm.workload} onChange={e => setEmployeeForm({...employeeForm, workload: e.target.value})}/>
                     </div>
                  </div>
                )}
              </div>

              <div className="pt-4">
                <button disabled={isLoading} type="submit" className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase text-[11px] tracking-[0.2em] shadow-xl transition-all hover:bg-emerald-600 active:scale-95 flex items-center justify-center gap-3">
                   {isLoading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> SALVAR CADASTRO</>}
                </button>
              </div>
           </form>
        </div>
      )}

      {showTimeModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
           <div className="bg-white rounded-[40px] w-full max-md p-10 space-y-6 shadow-2xl border border-slate-100 animate-in zoom-in-95">
              <div className="flex justify-between items-center border-b pb-4">
                 <div>
                    <h3 className="text-sm font-black uppercase text-slate-900">Registro de Ponto: {showTimeModal.emp.name.split(' ')[0]}</h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{showTimeModal.date.split('-').reverse().join('/')}</p>
                 </div>
                 <button onClick={() => setShowTimeModal(null)} className="p-2"><X size={20}/></button>
              </div>
              
              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[8px] font-black text-slate-400 uppercase ml-1">ENTRADA</label>
                       <input type="time" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-black text-xs" value={pointForm.clockIn} onChange={e => setPointForm({...pointForm, clockIn: e.target.value})}/>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[8px] font-black text-slate-400 uppercase ml-1">S. INTRA-JORNADA</label>
                       <input type="time" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-black text-xs" value={pointForm.breakStart} onChange={e => setPointForm({...pointForm, breakStart: e.target.value})}/>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[8px] font-black text-slate-400 uppercase ml-1">R. INTRA-JORNADA</label>
                       <input type="time" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-black text-xs" value={pointForm.breakEnd} onChange={e => setPointForm({...pointForm, breakEnd: e.target.value})}/>
                    </div>
                    <div className="space-y-1">
                       <label className="text-[8px] font-black text-slate-400 uppercase ml-1">SAÍDA FINAL</label>
                       <input type="time" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-black text-xs" value={pointForm.clockOut} onChange={e => setPointForm({...pointForm, clockOut: e.target.value})}/>
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">STATUS DO DIA</label>
                    <select className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-black text-[10px] uppercase" value={pointForm.status} onChange={e => setPointForm({...pointForm, status: e.target.value as any})}>
                       <option value="present">PRESENÇA NORMAL (P)</option>
                       <option value="partial">HORÁRIO REDUZIDO (H)</option>
                       <option value="absent">FALTA INJUSTIFICADA (F)</option>
                       <option value="atestado">ATESTADO MÉDICO (AT)</option>
                       <option value="justified">FALTA JUSTIFICADA (FJ)</option>
                       <option value="vacation">FÉRIAS / FOLGA (FE)</option>
                    </select>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase ml-1">OBSERVAÇÕES / JUSTIFICATIVA</label>
                    <textarea className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl font-black text-[10px] uppercase h-20 outline-none focus:bg-white" placeholder="DESCREVA O MOTIVO DA AUSÊNCIA OU ALTERAÇÃO..." value={pointForm.observation} onChange={e => setPointForm({...pointForm, observation: e.target.value})}/>
                 </div>
              </div>

              <button onClick={handleSavePoint} disabled={isLoading} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-emerald-600 transition-all">
                 {isLoading ? <Loader2 className="animate-spin mx-auto" size={16}/> : 'CONFIRMAR REGISTRO'}
              </button>
           </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!confirmStatusToggle}
        onClose={() => setConfirmStatusToggle(null)}
        onConfirm={() => confirmStatusToggle && handleToggleStatus(confirmStatusToggle)}
        title={confirmStatusToggle?.status === 'active' ? 'Desativar Colaborador' : 'Reativar Colaborador'}
        message={confirmStatusToggle?.status === 'active' 
          ? `Deseja realmente desativar ${confirmStatusToggle?.name}? Ele não aparecerá mais na lista de frequência ativa.`
          : `Deseja reativar ${confirmStatusToggle?.name}?`
        }
        confirmText={confirmStatusToggle?.status === 'active' ? 'Desativar' : 'Reativar'}
        type={confirmStatusToggle?.status === 'active' ? 'danger' : 'success'}
      />

      {selectedEmployeeFinance && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[250] flex items-center justify-center p-0 md:p-4 overflow-hidden">
          <div className="bg-white rounded-none md:rounded-[40px] w-full max-w-5xl h-full md:h-[90vh] flex flex-col shadow-2xl border border-slate-100 animate-in zoom-in-95 overflow-hidden">
            {/* Header */}
            <div className="p-6 md:p-8 border-b flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-slate-900 text-white rounded-xl md:rounded-2xl flex items-center justify-center font-black text-base md:text-xl shadow-lg">
                  {selectedEmployeeFinance.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm md:text-lg font-black uppercase text-slate-900 tracking-tight">Ficha Financeira: {selectedEmployeeFinance.name}</h3>
                  <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedEmployeeFinance.role} • {selectedEmployeeFinance.paymentModality}</p>
                </div>
              </div>
              <button onClick={() => setSelectedEmployeeFinance(null)} className="p-2 text-slate-300 hover:text-slate-900 transition-colors"><X size={24}/></button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Left Panel: Form & Balance */}
              <div className="w-full md:w-80 border-b md:border-r p-6 md:p-8 space-y-6 md:space-y-8 overflow-y-auto bg-slate-50/30">
                <div className="p-4 md:p-6 bg-emerald-50 rounded-[24px] md:rounded-[32px] border border-emerald-100 text-center shadow-inner">
                  <p className="text-[8px] md:text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 md:mb-2">Saldo em Aberto</p>
                  <h2 className="text-2xl md:text-3xl font-black text-emerald-600 tracking-tighter">{formatMoney(ledgerBalance)}</h2>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest border-l-4 border-slate-900 pl-3">Filtrar Histórico</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-300 uppercase">Início</label>
                      <input type="date" className="w-full bg-white border border-slate-200 p-2 md:p-3 rounded-xl text-[9px] md:text-[10px] font-black" value={financeSheetStartDate} onChange={e => setFinanceSheetStartDate(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-300 uppercase">Fim</label>
                      <input type="date" className="w-full bg-white border border-slate-200 p-2 md:p-3 rounded-xl text-[9px] md:text-[10px] font-black" value={financeSheetEndDate} onChange={e => setFinanceSheetEndDate(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h4 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest border-l-4 border-slate-900 pl-3">Novo Lançamento</h4>
                  <div className="flex p-1 bg-slate-200 rounded-2xl">
                    <button onClick={() => setNewFinanceEntry({...newFinanceEntry, type: 'out'})} className={`flex-1 py-2 rounded-xl text-[8px] md:text-[9px] font-black uppercase transition-all ${newFinanceEntry.type === 'out' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Despesa/Vale</button>
                    <button onClick={() => setNewFinanceEntry({...newFinanceEntry, type: 'in'})} className={`flex-1 py-2 rounded-xl text-[8px] md:text-[9px] font-black uppercase transition-all ${newFinanceEntry.type === 'in' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500'}`}>Receita/Extra</button>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase">Valor (R$)</label>
                      <input type="text" className="w-full bg-white border border-slate-200 p-3 md:p-4 rounded-2xl text-[10px] md:text-[11px] font-black outline-none focus:border-slate-900" placeholder="0,00" value={newFinanceEntry.value} onChange={e => setNewFinanceEntry({...newFinanceEntry, value: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase">Referência</label>
                      <input className="w-full bg-white border border-slate-200 p-3 md:p-4 rounded-2xl text-[10px] md:text-[11px] font-black uppercase outline-none focus:border-slate-900" placeholder="EX: ADIANTAMENTO, BONIFICAÇÃO..." value={newFinanceEntry.description} onChange={e => setNewFinanceEntry({...newFinanceEntry, description: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase">Data</label>
                      <input type="date" className="w-full bg-white border border-slate-200 p-3 md:p-4 rounded-2xl text-[10px] md:text-[11px] font-black outline-none focus:border-slate-900" value={newFinanceEntry.date} onChange={e => setNewFinanceEntry({...newFinanceEntry, date: e.target.value})} />
                    </div>
                    <button onClick={handleAddFinanceEntry} disabled={isLoading} className="w-full bg-emerald-600 text-white py-3 md:py-4 rounded-2xl font-black uppercase text-[9px] md:text-[10px] tracking-widest shadow-lg hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                      {isLoading ? <Loader2 className="animate-spin" size={14}/> : 'Confirmar Lançamento'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Panel: Ledger List */}
              <div className="flex-1 p-6 md:p-8 flex flex-col overflow-hidden">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                  <h4 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest border-l-4 border-blue-600 pl-3">Extrato Detalhado</h4>
                  <div className="flex gap-2 md:gap-3">
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-slate-100 text-slate-600 rounded-xl font-black text-[8px] md:text-[9px] uppercase tracking-widest hover:bg-slate-200 transition-all">
                      <Printer size={12}/> <span className="hidden sm:inline">Imprimir Ficha</span><span className="sm:hidden">Imprimir</span>
                    </button>
                    <button onClick={handleSendTotalBalanceToFinance} disabled={isLoading || ledgerBalance <= 0} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2 md:py-2.5 bg-blue-600 text-white rounded-xl font-black text-[8px] md:text-[9px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95 disabled:opacity-50">
                      <Send size={12}/> <span className="hidden sm:inline">Enviar Balanço Total</span><span className="sm:hidden">Enviar Tudo</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 md:space-y-3 pr-1 md:pr-2 scrollbar-hide">
                  {ledgerEntries.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50">
                      <BarChart3 size={40} className="mb-4"/>
                      <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest">Nenhum lançamento no período</p>
                    </div>
                  ) : (
                    ledgerEntries.map((entry) => (
                      <div key={entry.id} className={`p-4 md:p-6 rounded-[20px] md:rounded-[24px] border transition-all flex items-center justify-between group ${entry.sentToFinance ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md'}`}>
                        <div className="flex items-center gap-3 md:gap-5">
                          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center ${entry.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {entry.type === 'in' ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] md:text-[11px] font-black uppercase text-slate-900 tracking-tight truncate">{entry.description}</p>
                            <p className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-widest">{entry.date.split('-').reverse().join('/')} • {entry.source === 'attendance' ? 'DIÁRIA' : 'MANUAL'}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 md:gap-6">
                          <p className={`text-xs md:text-sm font-black tracking-tighter ${entry.type === 'in' ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {entry.type === 'in' ? '+' : '-'} {formatMoney(entry.value)}
                          </p>
                          
                          <div className="flex items-center gap-1 md:gap-2">
                            {!entry.sentToFinance && (
                              <>
                                <button onClick={() => handleDeleteFinanceEntry(entry.id, entry.source)} className="p-1.5 md:p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Excluir">
                                  <Trash2 size={14}/>
                                </button>
                                <button onClick={() => handleSendEntryToFinance(entry)} className="p-1.5 md:p-2 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all" title="Enviar para Financeiro">
                                  <Send size={14}/>
                                </button>
                              </>
                            )}
                            {entry.sentToFinance && (
                              <div className="px-2 py-1 bg-emerald-100 text-emerald-600 rounded-lg text-[7px] md:text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                                <CheckCircle2 size={8}/> <span className="hidden sm:inline">Enviado</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Employees;
