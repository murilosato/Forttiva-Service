
export enum ServiceType {
  VARRICAO_KM = 'Varrição (KM)',
  CAPINA_MANUAL_M2 = 'C. Manual (m²)',
  ROCADA_MECANIZADA_M2 = 'Roçada Meq (m²)',
  ROCADA_TRATOR_M2 = 'Roç. c/ Trator (m²)',
  BOCA_DE_LOBO = 'Boca de Lobo',
  PINTURA_MEIO_FIO = 'Pint. Meio Fio'
}

export enum UserRole {
  MASTER = 'DIRETORIA_MASTER',
  ADMIN = 'GERENTE_UNIDADE',
  OPERATIONAL = 'OPERACIONAL'
}

export interface UserPermissions {
  production: boolean;
  finance: boolean;
  inventory: boolean;
  employees: boolean;
  analytics: boolean;
  dre: boolean;
  accountsPayable?: boolean;
}

export interface Company {
  id: string;
  name: string;
  plan: string;
  financeCategories?: string[];
  inventoryCategories?: string[];
  employeeRoles?: string[];
  accountsPayableCategories?: string[];
  cnpj?: string;
  phone?: string;
  address?: string;
  email?: string;
  website?: string;
  dreRecurringEntries?: DRERecurringEntry[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  companyId: string | null;
  status: 'ativo' | 'suspenso';
  permissions: UserPermissions;
  company?: Company;
}

export interface Area {
  id: string;
  companyId: string;
  name: string;
  responsibleEmployeeId?: string;
  startDate: string;
  endDate?: string;
  startReference: string;
  endReference: string;
  observations: string;
  status: 'executing' | 'finished';
  services: Service[];
}

export interface Service {
  id: string;
  companyId: string;
  areaId: string;
  type: ServiceType;
  areaM2: number;
  unitValue: number;
  totalValue: number;
  serviceDate: string;
}

export interface Employee {
  id: string;
  companyId: string;
  name: string;
  role: string;
  status: 'active' | 'inactive';
  defaultValue: number;
  paymentModality: 'DIARIA' | 'CLT';
  cpf?: string;
  phone?: string;
  pixKey?: string;
  address?: string;
  admissionDate?: string;
  workload?: string;
  startTime?: string;
  breakStart?: string;
  breakEnd?: string;
  endTime?: string;
}

export interface AttendanceRecord {
  id: string;
  companyId: string;
  employeeId: string;
  date: string;
  status: 'present' | 'absent' | 'partial' | 'atestado' | 'justified' | 'vacation';
  value: number;
  paymentStatus: string;
  discountValue?: number;
  bonusValue?: number;
  discountObservation?: string;
  clockIn?: string;
  clockOut?: string;
  breakStart?: string;
  breakEnd?: string;
}

export interface SupportRequest {
  id: string;
  companyId: string;
  description: string;
  status: 'pendente' | 'concluido';
  createdAt: string;
}

export interface CashIn {
  id: string;
  companyId: string;
  date: string;
  value: number;
  reference: string;
  type: string;
  category: string;
}

export interface CashOut {
  id: string;
  companyId: string;
  date: string;
  value: number;
  type: string;
  reference: string;
  category: string;
}

export interface InventoryItem {
  id: string;
  companyId: string;
  name: string;
  category: string;
  currentQty: number;
  minQty: number;
  idealQty: number;
  unitValue?: number;
}

export interface InventoryExit {
  id: string;
  companyId: string;
  itemId: string;
  quantity: number;
  date: string;
  destination: string;
  observation: string;
}

export interface MonthlyGoal {
  production: number;
  revenue: number;
  inventory: number;
  finance: number;
}

export interface EmployeeTransaction {
  id: string;
  companyId: string;
  employeeId: string;
  date: string;
  description: string;
  type: 'in' | 'out'; // 'in' is extra/earnings for employee, 'out' is advance/deduction
  value: number;
  sentToFinance: boolean;
  financeId?: string;
}

export interface DREEntry {
  id: string;
  description: string;
  value: number;
  type: 'revenue' | 'expense';
  isPercentage: boolean;
  percentageValue?: number;
  isManualOverride: boolean;
  originalValue?: number;
  paymentMethod?: string;
  comment?: string;
  category?: string;
  isRecurring?: boolean;
}

export interface DRERecurringEntry {
  id: string;
  companyId: string;
  description: string;
  value: number;
  type: 'revenue' | 'expense';
  isPercentage: boolean;
  percentageValue?: number;
  paymentMethod?: string;
  comment?: string;
  category?: string;
  active: boolean;
  createdAt?: string;
}

export interface DREStatement {
  id: string;
  companyId: string;
  month: string; // YYYY-MM
  entries: DREEntry[];
}

export interface AccountPayable {
  id: string;
  companyId: string;
  title: string;
  controlNumber?: string;
  dueDate: string; // YYYY-MM-DD
  value: number;
  status: 'pendente' | 'pago' | 'vencido';
  paymentDate?: string;
  category?: string;
  observation?: string;
  installmentGroupId?: string;
  installmentNumber?: number;
  totalInstallments?: number;
  createdAt?: string;
}

export interface AppState {
  areas: Area[];
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  employeeTransactions: EmployeeTransaction[];
  inventory: InventoryItem[];
  inventoryExits: InventoryExit[];
  supportRequests: SupportRequest[];
  cashIn: CashIn[];
  cashOut: CashOut[];
  dreStatements: DREStatement[];
  dreRecurringEntries: DRERecurringEntry[];
  accountsPayable: AccountPayable[];
  monthlyGoals: Record<string, MonthlyGoal>;
  serviceRates: Record<ServiceType, number>;
  serviceGoals: Record<ServiceType, number>;
  financeCategories: string[];
  inventoryCategories: string[];
  employeeRoles: string[];
  accountsPayableCategories: string[];
  currentUser: User | null;
  users: User[];
  company: Company | null;
  isSyncing?: boolean;
}
