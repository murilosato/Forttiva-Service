
import { createClient } from '@supabase/supabase-js';
import { ServiceType } from '../types';

// Adequação ao Vercel e variáveis de ambiente Vite
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Chaves padrão fornecidas pelo projeto
const DEFAULT_URL = 'https://hdlhdalpltywftawzrcx.supabase.co';
const DEFAULT_KEY = 'sb_publishable_y4ECjE2jI-Qluh5W-zQ1kA_XHPruZKE';

const resolvedAnonKey = (SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.trim() !== '') ? SUPABASE_ANON_KEY : DEFAULT_KEY;
const rawUrl = ((SUPABASE_URL && SUPABASE_URL.trim() !== '') ? SUPABASE_URL : DEFAULT_URL).replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');

// Detecção de ambiente para contornar restrições de CORS e AdBlockers no iframe de preview do AI Studio
const isAiStudioPreview = typeof window !== 'undefined' && (
  window.location.hostname.includes('run.app') ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  Boolean(import.meta.env.DEV)
);

// Em ambiente de iframe de preview, utiliza o proxy same-origin /supabase-proxy para garantir 100% de estabilidade
const clientUrl = (isAiStudioPreview && typeof window !== 'undefined')
  ? `${window.location.origin}/supabase-proxy`
  : rawUrl;

// Fetch resiliente com fallback automático caso o navegador ou firewall bloqueie conexões diretas
const resilientFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init);
  } catch (err: any) {
    if (typeof input === 'string' && input.includes('supabase.co') && typeof window !== 'undefined') {
      const fallbackUrl = input.replace(/https:\/\/[^/]+\.supabase\.co/, `${window.location.origin}/supabase-proxy`);
      try {
        return await fetch(fallbackUrl, init);
      } catch (proxyErr) {
        throw err;
      }
    }
    throw err;
  }
};

export const supabase = createClient(clientUrl, resolvedAnonKey, {
  auth: { 
    persistSession: true, 
    autoRefreshToken: true,
    detectSessionInUrl: true 
  },
  global: {
    fetch: resilientFetch
  }
});

const camelToSnake = (obj: any) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const n: any = {};
  Object.keys(obj).forEach(k => {
    let newKey = k;
    if (k === 'companyId') newKey = 'company_id';
    else if (k === 'itemId') newKey = 'item_id';
    else if (k === 'areaId') newKey = 'area_id';
    else if (k === 'employeeId') newKey = 'employee_id';
    else if (k === 'responsibleEmployeeId') newKey = 'responsible_employee_id';
    else if (k === 'monthKey') newKey = 'month_key';
    else if (k === 'startDate') newKey = 'start_date';
    else if (k === 'endDate') newKey = 'end_date';
    else if (k === 'startReference') newKey = 'start_reference';
    else if (k === 'endReference') newKey = 'end_reference';
    else if (k === 'unitValue') newKey = 'unit_value';
    else if (k === 'totalValue') newKey = 'total_value';
    else if (k === 'areaM2') newKey = 'area_m2';
    else if (k === 'currentQty') newKey = 'current_qty';
    else if (k === 'minQty') newKey = 'min_qty';
    else if (k === 'idealQty') newKey = 'ideal_qty';
    else if (k === 'paymentStatus') newKey = 'payment_status';
    else if (k === 'paymentModality') newKey = 'payment_modality';
    else if (k === 'defaultValue') newKey = 'default_value'; 
    else if (k === 'startTime') newKey = 'start_time';
    else if (k === 'breakStart') newKey = 'break_start';
    else if (k === 'breakEnd') newKey = 'break_end';
    else if (k === 'endTime') newKey = 'end_time';
    else if (k === 'clockIn') newKey = 'clock_in';
    else if (k === 'clockOut') newKey = 'clock_out';
    else if (k === 'pixKey') newKey = 'pix_key';
    else if (k === 'financeCategories') newKey = 'finance_categories';
    else if (k === 'inventoryCategories') newKey = 'inventory_categories';
    else if (k === 'employeeRoles') newKey = 'employee_roles';
    else if (k === 'serviceRates') newKey = 'service_rates';
    else if (k === 'serviceGoals') newKey = 'service_goals';
    else if (k === 'serviceDate') newKey = 'service_date';
    else if (k === 'sentToFinance') newKey = 'sent_to_finance';
    else if (k === 'financeId') newKey = 'finance_id';
    else if (k === 'productionGoal') newKey = 'production_goal';
    else if (k === 'revenueGoal') newKey = 'revenue_goal';
    else if (k === 'inventoryGoal') newKey = 'inventory_goal';
    else if (k === 'balanceGoal') newKey = 'balance_goal';
    else if (k === 'discountValue') newKey = 'discount_value';
    else if (k === 'bonusValue') newKey = 'bonus_value';
    else if (k === 'discountObservation') newKey = 'discount_observation';
    else if (k === 'createdAt') newKey = 'created_at';
    else if (k === 'isPercentage') newKey = 'is_percentage';
    else if (k === 'percentageValue') newKey = 'percentage_value';
    else if (k === 'isManualOverride') newKey = 'is_manual_override';
    else if (k === 'accountsPayableCategories') newKey = 'accounts_payable_categories';
    else if (k === 'controlNumber') newKey = 'control_number';
    else if (k === 'dueDate') newKey = 'due_date';
    else if (k === 'paymentDate') newKey = 'payment_date';
    else if (k === 'installmentGroupId') newKey = 'installment_group_id';
    else if (k === 'installmentNumber') newKey = 'installment_number';
    else if (k === 'totalInstallments') newKey = 'total_installments';
    else if (k === 'originalValue') newKey = 'original_value';
    else if (k === 'paymentMethod') newKey = 'payment_method';
    else if (k === 'dreRecurringEntries') newKey = 'dre_recurring_entries';
    else if (k === 'isRecurring') newKey = 'is_recurring';
    else {
      newKey = k.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
    
    let val = obj[k];
    
    // Pular propriedades computadas ou exclusivas da interface do usuário
    if (k === 'dynamicStatus' || k === 'dynamic_status') {
      return;
    }

    // Se for a chave primária 'id' e estiver vazia, indefinida ou nula,
    // não inserimos 'id' no payload para permitir que o PostgreSQL use gen_random_uuid() DEFAULT
    if (k === 'id' && (val === '' || val === undefined || val === null)) {
      return;
    }

    // Tratamento rigoroso: strings vazias em campos de ID ou Data devem ser NULL no PostgreSQL
    if ((k.toLowerCase().includes('id') || k.toLowerCase().includes('date')) && (val === '' || val === undefined)) {
      val = null;
    } else if (val === undefined) {
      val = null;
    }

    n[newKey] = val;
  });
  return n;
};

export const fetchUserProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, companies(*)')
      .eq('id', userId)
      .maybeSingle();
      
    if (error) return null;
    return data;
  } catch (e) {
    return null;
  }
};

export const fetchCompleteCompanyData = async (companyId: string | null, isMaster: boolean = false) => {
  if (!companyId && !isMaster) return null;

  const safeQuery = async (table: string, query: any) => {
    try {
      const { data, error } = await query;
      if (error) return [];
      return data || [];
    } catch (e) {
      return [];
    }
  };

  const baseFilter = (q: any) => (!isMaster && companyId) ? q.eq('company_id', companyId) : q;

  const [areas, emps, inv, exits, flow, att, trans, goals, support, dre, bills, recurring, companyInfo, candList] = await Promise.all([
    safeQuery('areas', baseFilter(supabase.from('areas').select('*, services(*)').order('created_at', { ascending: false }))),
    safeQuery('employees', baseFilter(supabase.from('employees').select('*').order('name'))),
    safeQuery('inventory', baseFilter(supabase.from('inventory').select('*').order('name'))),
    safeQuery('inventory_exits', baseFilter(supabase.from('inventory_exits').select('*').order('date', { ascending: false }))),
    safeQuery('cash_flow', baseFilter(supabase.from('cash_flow').select('*').order('date', { ascending: false }))),
    safeQuery('attendance_records', baseFilter(supabase.from('attendance_records').select('*').limit(5000).order('date', { ascending: false }))),
    safeQuery('employee_transactions', baseFilter(supabase.from('employee_transactions').select('*').order('date', { ascending: false }))),
    safeQuery('monthly_goals', baseFilter(supabase.from('monthly_goals').select('*'))),
    safeQuery('support_requests', baseFilter(supabase.from('support_requests').select('*').order('created_at', { ascending: false }))),
    safeQuery('dre_statements', baseFilter(supabase.from('dre_statements').select('*'))),
    safeQuery('accounts_payable', baseFilter(supabase.from('accounts_payable').select('*').order('due_date', { ascending: true }))),
    safeQuery('dre_recurring_entries', baseFilter(supabase.from('dre_recurring_entries').select('*').order('created_at', { ascending: false }))),
    companyId ? supabase.from('companies').select('*').eq('id', companyId).maybeSingle() : Promise.resolve({ data: null }),
    safeQuery('candidates', baseFilter(supabase.from('candidates').select('*').order('created_at', { ascending: false })))
  ]);

  const goalsMap: Record<string, any> = {};
  (goals || []).forEach((g: any) => {
    goalsMap[g.month_key] = { 
      production: Number(g.production_goal || 0), 
      revenue: Number(g.revenue_goal || 0),
      inventory: Number(g.inventory_goal || 0),
      finance: Number(g.balance_goal || 0)
    };
  });

  const company = companyInfo?.data;

  return {
    company: company ? {
      id: company.id,
      name: company.name,
      cnpj: company.cnpj,
      phone: company.phone,
      address: company.address,
      email: company.email,
      website: company.website,
      plan: company.plan,
      accountsPayableCategories: company.accounts_payable_categories
    } : null,
    areas: areas.map((a: any) => ({
      id: a.id, companyId: a.company_id, name: a.name, responsibleEmployeeId: a.responsible_employee_id, startDate: a.start_date, endDate: a.end_date,
      startReference: a.start_reference, endReference: a.end_reference, observations: a.observations,
      status: a.status || 'executing',
      services: (a.services || []).map((s: any) => ({
        id: s.id, companyId: s.company_id, areaId: s.area_id, type: s.type,
        areaM2: Number(s.area_m2), unitValue: Number(s.unit_value), totalValue: Number(s.total_value), serviceDate: s.service_date
      }))
    })),
    employees: emps.map((e: any) => ({
      id: e.id, companyId: e.company_id, name: e.name, role: e.role, status: e.status || 'active',
      defaultValue: Number(e.default_value), paymentModality: e.payment_modality || 'DIARIA',
      cpf: e.cpf, phone: e.phone, pixKey: e.pix_key, address: e.address, admissionDate: e.admission_date, workload: e.workload,
      startTime: e.start_time, breakStart: e.break_start, breakEnd: e.break_end, endTime: e.end_time
    })),
    inventory: inv.map((i: any) => ({
      id: i.id, companyId: i.company_id, name: i.name, category: i.category,
      currentQty: Number(i.current_qty), minQty: Number(i.min_qty), idealQty: Number(i.ideal_qty || 0), unitValue: Number(i.unit_value || 0)
    })),
    inventoryExits: exits.map((ex: any) => ({
      id: ex.id, companyId: ex.company_id, itemId: ex.item_id, quantity: Number(ex.quantity), date: ex.date, destination: ex.destination, observation: ex.observation
    })),
    cashIn: flow.filter((f: any) => f.type === 'in').map((f: any) => ({ id: f.id, companyId: f.company_id, date: f.date, value: Number(f.value), reference: f.reference, type: f.type, category: f.category })),
    cashOut: flow.filter((f: any) => f.type === 'out').map((f: any) => ({ id: f.id, companyId: f.company_id, date: f.date, value: Number(f.value), type: f.type, category: f.category, reference: f.reference })),
    attendanceRecords: att.map((r: any) => ({
      id: r.id, companyId: r.company_id, employeeId: r.employee_id, date: r.date, status: r.status, value: Number(r.value), paymentStatus: r.payment_status,
      discountValue: Number(r.discount_value || 0), bonusValue: Number(r.bonus_value || 0), discountObservation: r.discount_observation, clockIn: r.clock_in, breakStart: r.break_start, breakEnd: r.break_end, clockOut: r.clock_out
    })),
    employeeTransactions: trans.map((t: any) => ({
      id: t.id, companyId: t.company_id, employeeId: t.employee_id, date: t.date, description: t.description, type: t.type, value: Number(t.value), sentToFinance: t.sent_to_finance, financeId: t.finance_id
    })),
    supportRequests: support.map((s: any) => ({
        id: s.id, companyId: s.company_id, description: s.description, status: s.status, createdAt: s.created_at
    })),
    dreStatements: (dre || []).map((s: any) => ({
      id: s.id,
      companyId: s.company_id,
      month: s.month,
      entries: (s.entries || []).map((e: any) => ({
        id: e.id,
        description: e.description,
        value: Number(e.value || 0),
        type: e.type,
        isPercentage: e.is_percentage || e.isPercentage || false,
        percentageValue: Number(e.percentage_value || e.percentageValue || 0),
        isManualOverride: e.is_manual_override || e.isManualOverride || false,
        originalValue: e.original_value !== undefined ? Number(e.original_value) : (e.originalValue !== undefined ? Number(e.originalValue) : undefined),
        paymentMethod: e.payment_method || e.paymentMethod || '',
        comment: e.comment || '',
        category: e.category || '',
        isRecurring: e.is_recurring || e.isRecurring || false
      }))
    })),
    dreRecurringEntries: (() => {
      const dbEntries = (recurring || []).map((r: any) => ({
        id: r.id,
        companyId: r.company_id,
        description: r.description,
        value: Number(r.value || 0),
        type: r.type || 'expense',
        isPercentage: r.is_percentage || false,
        percentageValue: Number(r.percentage_value || 0),
        paymentMethod: r.payment_method || '',
        comment: r.comment || '',
        category: r.category || 'Custo Fixo',
        active: r.active !== false,
        createdAt: r.created_at
      }));
      if (dbEntries.length > 0) return dbEntries;
      // Fallback to local storage if table is not yet migrated
      try {
        const local = localStorage.getItem(`dre_recurring_${companyId}`);
        if (local) return JSON.parse(local);
      } catch (err) {}
      return [];
    })(),
    monthlyGoals: goalsMap,
    serviceRates: company?.service_rates || {},
    serviceGoals: company?.service_goals || {},
    financeCategories: company?.finance_categories || [],
    inventoryCategories: company?.inventory_categories || [],
    employeeRoles: company?.employee_roles || [],
    accountsPayableCategories: company?.accounts_payable_categories && company.accounts_payable_categories.length > 0 
      ? company.accounts_payable_categories 
      : ['Fornecedores', 'Aluguel', 'Energia Elétrica', 'Água', 'Internet / Telefonia', 'Impostos', 'Manutenção', 'Serviços Terceirizados', 'Outros'],
    accountsPayable: (bills || []).map((b: any) => ({
      id: b.id,
      companyId: b.company_id,
      title: b.title,
      controlNumber: b.control_number || '',
      dueDate: b.due_date,
      value: Number(b.value || 0),
      status: b.status || 'pendente',
      paymentDate: b.payment_date || undefined,
      category: b.category || 'Outros',
      observation: b.observation || '',
      installmentGroupId: b.installment_group_id || undefined,
      installmentNumber: b.installment_number ? Number(b.installment_number) : undefined,
      totalInstallments: b.total_installments ? Number(b.total_installments) : undefined,
      createdAt: b.created_at
    })),
    candidates: (candList || []).map((c: any) => ({
      id: c.id,
      companyId: c.company_id,
      name: c.name,
      birthDate: c.birth_date,
      phone: c.phone || '',
      address: c.address || '',
      experience: c.experience || '',
      observations: c.observations || '',
      desiredRole: c.desired_role || '',
      status: c.status || 'banco_talentos',
      createdAt: c.created_at
    }))
  };
};

export const dbSave = async (table: string, data: any) => {
  const fullPayload = camelToSnake(data);
  const { id, ...payloadWithoutId } = fullPayload;
  const hasValidId = Boolean(id && typeof id === 'string' && id.trim() !== '' && id !== 'null' && id !== 'undefined');

  let query;
  if (table === 'dre_statements') {
    // Para dre_statements, a chave de unicidade é (company_id, month).
    // Nunca enviamos id nulo para não violar a restrição NOT NULL (código 23502) no PostgreSQL.
    const payloadToSave = hasValidId ? fullPayload : payloadWithoutId;
    query = supabase.from(table).upsert(payloadToSave, { onConflict: 'company_id, month' });
  } else if (table === 'monthly_goals') {
    const payloadToSave = hasValidId ? fullPayload : payloadWithoutId;
    query = supabase.from(table).upsert(payloadToSave, { onConflict: 'company_id, month_key' });
  } else if (table === 'dre_recurring_entries' || table === 'accounts_payable') {
    if (hasValidId) {
      query = supabase.from(table).upsert(fullPayload, { onConflict: 'id' });
    } else {
      query = supabase.from(table).insert(payloadWithoutId);
    }
  } else if (hasValidId) {
    query = supabase.from(table).update(payloadWithoutId).eq('id', id);
  } else {
    // Na inserção de registros novos, garantimos payload limpo sem id nulo
    query = supabase.from(table).insert(payloadWithoutId);
  }

  const { data: saved, error } = await query.select();
  if (error) {
    console.error(`Erro crítico no banco [${table}]:`, error);
    throw error;
  }
  return saved;
};

export const dbDelete = async (table: string, id: string) => {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
};

export const signOut = async () => {
  try {
    await supabase.auth.signOut();
  } catch (e) {
  } finally {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  }
};
