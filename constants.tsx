import { AppState, ServiceType, UserRole } from './types';

export const INITIAL_STATE: AppState = {
  areas: [],
  employees: [
    { id: 'e1', companyId: 'forttiva-main', name: 'João Silva', role: 'Operador de Roçadeira', status: 'active', defaultValue: 85.00, paymentModality: 'DIARIA' },
    { id: 'e2', companyId: 'forttiva-main', name: 'Maria Santos', role: 'Ajudante Geral', status: 'active', defaultValue: 75.00, paymentModality: 'DIARIA' }
  ],
  attendanceRecords: [],
  employeeTransactions: [],
  inventory: [
    { id: 'i1', companyId: 'forttiva-main', name: 'Fio de Nylon 3.0mm', category: 'Insumos', currentQty: 15, minQty: 5, idealQty: 25, unitValue: 45.0 },
    { id: 'i2', companyId: 'forttiva-main', name: 'Óleo 2T Lubrificante', category: 'Insumos', currentQty: 10, minQty: 4, idealQty: 15, unitValue: 38.0 }
  ],
  inventoryExits: [],
  supportRequests: [],
  cashIn: [],
  cashOut: [],
  dreStatements: [],
  dreRecurringEntries: [],
  accountsPayable: [],
  monthlyGoals: {
    [`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`]: {
      production: 50000,
      revenue: 100000,
      inventory: 1000,
      finance: 20000
    }
  },
  serviceRates: {
    [ServiceType.VARRICAO_KM]: 150.00,
    [ServiceType.CAPINA_MANUAL_M2]: 2.50,
    [ServiceType.ROCADA_MECANIZADA_M2]: 1.80,
    [ServiceType.ROCADA_TRATOR_M2]: 0.90,
    [ServiceType.BOCA_DE_LOBO]: 45.00,
    [ServiceType.PINTURA_MEIO_FIO]: 1.20,
  },
  serviceGoals: {
    [ServiceType.VARRICAO_KM]: 500,
    [ServiceType.CAPINA_MANUAL_M2]: 10000,
    [ServiceType.ROCADA_MECANIZADA_M2]: 20000,
    [ServiceType.ROCADA_TRATOR_M2]: 30000,
    [ServiceType.BOCA_DE_LOBO]: 100,
    [ServiceType.PINTURA_MEIO_FIO]: 5000,
  },
  financeCategories: ['Salários', 'Insumos', 'Manutenção', 'Impostos', 'Aluguel', 'Combustível'],
  inventoryCategories: ['Insumos', 'Equipamentos', 'Manutenção', 'EPIS'],
  employeeRoles: ['Operador de Roçadeira', 'Ajudante Geral', 'Motorista', 'Encarregado'],
  accountsPayableCategories: ['Fornecedores', 'Aluguel', 'Energia Elétrica', 'Água', 'Internet / Telefonia', 'Impostos', 'Manutenção', 'Serviços Terceirizados', 'Outros'],
  currentUser: null,
  users: [
    {
      id: 'master-1',
      companyId: 'forttiva-main',
      email: 'admin@forttivaservicos.com',
      name: 'Diretoria Master',
      role: UserRole.MASTER,
      status: 'ativo',
      permissions: {
        production: true,
        finance: true,
        inventory: true,
        employees: true,
        analytics: true,
        dre: true,
        accountsPayable: true
      }
    }
  ],
  company: {
    id: 'forttiva-main',
    name: 'FORTTIVA SERVICE',
    plan: 'PRO',
    financeCategories: ['Salários', 'Insumos', 'Manutenção', 'Impostos', 'Aluguel', 'Combustível'],
    inventoryCategories: ['Insumos', 'Equipamentos', 'Manutenção', 'EPIS'],
    employeeRoles: ['Operador de Roçadeira', 'Ajudante Geral', 'Motorista', 'Encarregado'],
    accountsPayableCategories: ['Fornecedores', 'Aluguel', 'Energia Elétrica', 'Água', 'Internet / Telefonia', 'Impostos', 'Manutenção', 'Serviços Terceirizados', 'Outros']
  }
};

export const SERVICE_OPTIONS = Object.values(ServiceType);
