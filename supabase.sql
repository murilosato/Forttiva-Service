-- ==============================================================================
-- SISTEMA FERA SERVICE - ESQUEMA COMPLETO DO BANCO DE DADOS SUPABASE
-- ==============================================================================
-- Execute todo este script no SQL Editor do seu projeto Supabase (Dashboard -> SQL Editor -> New Query -> Run)
-- Este script é idempotente (pode ser executado mais de uma vez com segurança).
-- ==============================================================================

-- 0. HABILITAR EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABELA: COMPANIES (Empresas / Unidades Operacionais)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    plan TEXT DEFAULT 'PRO',
    cnpj TEXT,
    phone TEXT,
    address TEXT,
    email TEXT,
    website TEXT,
    service_rates JSONB DEFAULT '{
        "Varrição (KM)": 150.00,
        "C. Manual (m²)": 2.50,
        "Roçada Meq (m²)": 1.80,
        "Roç. c/ Trator (m²)": 0.90,
        "Boca de Lobo": 45.00,
        "Pint. Meio Fio": 1.20
    }'::jsonb,
    service_goals JSONB DEFAULT '{
        "Varrição (KM)": 500,
        "C. Manual (m²)": 10000,
        "Roçada Meq (m²)": 20000,
        "Roç. c/ Trator (m²)": 30000,
        "Boca de Lobo": 100,
        "Pint. Meio Fio": 5000
    }'::jsonb,
    finance_categories TEXT[] DEFAULT ARRAY['Salários', 'Insumos', 'Manutenção', 'Impostos', 'Aluguel', 'Combustível'],
    inventory_categories TEXT[] DEFAULT ARRAY['Insumos', 'Equipamentos', 'Manutenção', 'EPIS'],
    employee_roles TEXT[] DEFAULT ARRAY['Operador de Roçadeira', 'Ajudante Geral', 'Motorista', 'Encarregado'],
    accounts_payable_categories JSONB DEFAULT '["Fornecedores", "Aluguel", "Energia Elétrica", "Água", "Internet / Telefonia", "Impostos", "Manutenção", "Serviços Terceirizados", "Outros"]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir empresa padrão inicial se não houver nenhuma
INSERT INTO public.companies (id, name, cnpj, email, plan)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'FORTTIVA SERVICE - UNIDADE MATRIZ',
    '00.000.000/0001-00',
    'contato@forttivaservicos.com',
    'PRO'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email;

-- ==============================================================================
-- 2. TABELA: PROFILES (Perfis de Usuários vinculados ao Supabase Auth)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'OPERACIONAL', -- 'DIRETORIA_MASTER', 'GERENTE_UNIDADE', 'OPERACIONAL'
    status TEXT DEFAULT 'ativo',    -- 'ativo', 'suspenso'
    permissions JSONB DEFAULT '{
        "production": true,
        "finance": false,
        "inventory": true,
        "employees": false,
        "analytics": false,
        "dre": false,
        "accountsPayable": false
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 3. TABELA: EMPLOYEES (Colaboradores / Funcionários)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive'
    default_value NUMERIC(12,2) DEFAULT 0.00,
    payment_modality TEXT DEFAULT 'DIARIA', -- 'DIARIA', 'CLT'
    cpf TEXT,
    phone TEXT,
    pix_key TEXT,
    address TEXT,
    admission_date DATE DEFAULT CURRENT_DATE,
    workload TEXT DEFAULT '44H SEMANAIS',
    start_time TEXT DEFAULT '08:00',
    break_start TEXT DEFAULT '12:00',
    break_end TEXT DEFAULT '13:00',
    end_time TEXT DEFAULT '17:00',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 4. TABELA: AREAS (Ordens de Serviço / Áreas de Produção)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    responsible_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    start_reference TEXT,
    end_reference TEXT,
    observations TEXT,
    status TEXT DEFAULT 'executing', -- 'executing', 'finished'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 5. TABELA: SERVICES (Serviços Executados nas Áreas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    area_m2 NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    unit_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    service_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 6. TABELA: INVENTORY (Estoque de Materiais e Insumos)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    current_qty NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    min_qty NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    ideal_qty NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    unit_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 7. TABELA: INVENTORY_EXITS (Histórico de Movimentações de Estoque)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inventory_exits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
    quantity NUMERIC(12,2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    destination TEXT,
    observation TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 8. TABELA: CASH_FLOW (Fluxo de Caixa / Livro Caixa)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cash_flow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    type TEXT NOT NULL CHECK (type IN ('in', 'out')),
    category TEXT DEFAULT 'Geral',
    reference TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 9. TABELA: ATTENDANCE_RECORDS (Controle de Ponto e Frequência)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'present', -- 'present', 'absent', 'partial', 'atestado', 'justified', 'vacation'
    value NUMERIC(12,2) DEFAULT 0.00,
    payment_status TEXT DEFAULT 'pendente',
    discount_value NUMERIC(12,2) DEFAULT 0.00,
    bonus_value NUMERIC(12,2) DEFAULT 0.00,
    discount_observation TEXT,
    clock_in TEXT,
    clock_out TEXT,
    break_start TEXT,
    break_end TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 10. TABELA: EMPLOYEE_TRANSACTIONS (Vales, Adiantamentos e Bonificações)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.employee_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('in', 'out')), -- 'in' (bônus), 'out' (vale/desconto)
    value NUMERIC(12,2) NOT NULL,
    sent_to_finance BOOLEAN DEFAULT false,
    finance_id UUID REFERENCES public.cash_flow(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 11. TABELA: MONTHLY_GOALS (Metas Mensais da Unidade)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.monthly_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    month_key TEXT NOT NULL, -- Formato: 'YYYY-MM'
    production_goal NUMERIC(12,2) DEFAULT 0.00,
    revenue_goal NUMERIC(12,2) DEFAULT 0.00,
    inventory_goal NUMERIC(12,2) DEFAULT 0.00,
    balance_goal NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, month_key)
);

-- ==============================================================================
-- 12. TABELA: SUPPORT_REQUESTS (Chamados de Suporte Interno)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.support_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluido')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 13. TABELA: DRE_STATEMENTS (Demonstrativo do Resultado do Exercício por Mês)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.dre_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    month TEXT NOT NULL, -- Formato: 'YYYY-MM'
    entries JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, month)
);

-- ==============================================================================
-- 14. TABELA: DRE_RECURRING_ENTRIES (Custos e Despesas Recorrentes Fixas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.dre_recurring_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    type TEXT NOT NULL DEFAULT 'expense', -- 'expense' ou 'revenue'
    is_percentage BOOLEAN DEFAULT false,
    percentage_value NUMERIC(5,2) DEFAULT 0.00,
    payment_method TEXT,
    comment TEXT,
    category TEXT DEFAULT 'Custo Fixo',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 15. TABELA: ACCOUNTS_PAYABLE (Contas a Pagar / Parcelamentos)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.accounts_payable (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    control_number TEXT,
    due_date DATE NOT NULL,
    value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'pago', 'vencido'
    payment_date DATE,
    category TEXT DEFAULT 'Outros',
    observation TEXT,
    installment_group_id UUID,
    installment_number INTEGER,
    total_installments INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 16. ÍNDICES DE PERFORMANCE (Otimização para consultas em tempo real)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_company ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_company ON public.employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(company_id, status);
CREATE INDEX IF NOT EXISTS idx_areas_company ON public.areas(company_id);
CREATE INDEX IF NOT EXISTS idx_areas_status ON public.areas(company_id, status);
CREATE INDEX IF NOT EXISTS idx_services_area ON public.services(area_id);
CREATE INDEX IF NOT EXISTS idx_services_company ON public.services(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_company ON public.inventory(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_exits_company ON public.inventory_exits(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_exits_item ON public.inventory_exits(item_id);
CREATE INDEX IF NOT EXISTS idx_cash_flow_company_date ON public.cash_flow(company_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_lookup ON public.attendance_records(company_id, employee_id, date);
CREATE INDEX IF NOT EXISTS idx_employee_trans_emp ON public.employee_transactions(employee_id);
CREATE INDEX IF NOT EXISTS idx_monthly_goals_lookup ON public.monthly_goals(company_id, month_key);
CREATE INDEX IF NOT EXISTS idx_dre_company_month ON public.dre_statements(company_id, month);
CREATE INDEX IF NOT EXISTS idx_dre_recurring_company ON public.dre_recurring_entries(company_id, active);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_company_due_date ON public.accounts_payable(company_id, due_date);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_status ON public.accounts_payable(company_id, status);

-- ==============================================================================
-- 17. TRIGGER: SINCRONIZAÇÃO AUTOMÁTICA DE AUTH.USERS COM PUBLIC.PROFILES
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    default_comp_id UUID;
BEGIN
    -- Busca a empresa padrão caso não tenha sido informada no cadastro
    SELECT id INTO default_comp_id FROM public.companies LIMIT 1;
    
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        role, 
        company_id, 
        permissions
    )
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'role', 'DIRETORIA_MASTER'),
        COALESCE(
            NULLIF(new.raw_user_meta_data->>'company_id', '')::UUID, 
            default_comp_id
        ),
        jsonb_build_object(
            'production', true,
            'finance', true,
            'inventory', true,
            'employees', true,
            'analytics', true,
            'dre', true,
            'accountsPayable', true
        )
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        company_id = COALESCE(EXCLUDED.company_id, public.profiles.company_id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove trigger antigo se existir e cria o novo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 18. CONFIGURAÇÃO DE SEGURANÇA ROW LEVEL SECURITY (RLS)
-- ==============================================================================
-- Habilitar RLS em todas as tabelas
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_exits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_flow ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dre_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dre_recurring_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;

-- Macro de políticas permissivas para operação do app via cliente autenticado / anon com chave
DO $$ 
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'companies', 'profiles', 'employees', 'areas', 'services', 
        'inventory', 'inventory_exits', 'cash_flow', 'attendance_records', 
        'employee_transactions', 'monthly_goals', 'support_requests', 
        'dre_statements', 'dre_recurring_entries', 'accounts_payable'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        -- Remove políticas anteriores para evitar duplicações
        EXECUTE format('DROP POLICY IF EXISTS "%s_all_policy" ON public.%I;', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I;', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I;', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I;', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I;', tbl, tbl);

        -- Cria política completa de acesso para operações do sistema
        EXECUTE format('CREATE POLICY "%s_all_policy" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
    END LOOP;
END $$;

-- ==============================================================================
-- 19. DADOS DE SEED INICIAL (Para teste e primeiro uso)
-- ==============================================================================
-- Inserir alguns insumos padrão se o estoque estiver vazio
INSERT INTO public.inventory (company_id, name, category, current_qty, min_qty, ideal_qty, unit_value)
SELECT 
    '00000000-0000-0000-0000-000000000001',
    item.name,
    item.category,
    item.current_qty,
    item.min_qty,
    item.ideal_qty,
    item.unit_value
FROM (VALUES 
    ('Fio de Nylon 3.0mm (Carretel)', 'Insumos', 15.00, 5.00, 20.00, 45.00),
    ('Óleo 2T Lubrificante (Litro)', 'Insumos', 10.00, 4.00, 15.00, 38.00),
    ('Lâmina de Roçadeira 2 Pontas', 'Equipamentos', 8.00, 3.00, 12.00, 28.50),
    ('Óculos de Proteção UV / EPI', 'EPIS', 25.00, 10.00, 30.00, 12.00),
    ('Protetor Auricular Tipo Concha', 'EPIS', 14.00, 5.00, 20.00, 22.00)
) AS item(name, category, current_qty, min_qty, ideal_qty, unit_value)
WHERE NOT EXISTS (SELECT 1 FROM public.inventory LIMIT 1);
