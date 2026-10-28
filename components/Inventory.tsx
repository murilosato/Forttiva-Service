import React, { useState, useMemo, useEffect } from 'react';
import { AppState, InventoryItem, Employee } from '../types';
import { 
  Package, Plus, Search, X, Loader2, History, Trash2, Filter, 
  AlertTriangle, CheckCircle2, List, ArrowRightLeft, Edit2, 
  Save, Calendar, UserCheck, ArrowDownRight, Tag, Layers,
  ChevronDown, ShieldAlert, Check, Warehouse
} from 'lucide-react';
import { dbSave, dbDelete, fetchCompleteCompanyData } from '../lib/supabase';
import ConfirmationModal from './ConfirmationModal';

interface InventoryProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  notify: (msg: string, type?: 'success' | 'error') => void;
}

const Inventory: React.FC<InventoryProps> = ({ state, setState, notify }) => {
  // Controle de abas principais: 'stock' (saldos), 'withdrawal' (aba ampla de retiradas), 'history' (histórico)
  const [activeTab, setActiveTab] = useState<'stock' | 'withdrawal' | 'history'>('stock');
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Estados do formulário de criação de novo material
  const [newItem, setNewItem] = useState({ 
    name: '', 
    category: '', 
    currentQty: '0', 
    minQty: '0', 
    idealQty: '0', 
    unitValue: '0' 
  });

  // Estados do formulário de edição de material
  const [editFormData, setEditFormData] = useState({
    name: '',
    category: '',
    currentQty: '0',
    minQty: '0',
    idealQty: '0',
    unitValue: '0'
  });

  // Estados do Terminal de Lançamento / Retirada rápida
  const [selectedItemId, setSelectedItemId] = useState('');
  const [itemSearchText, setItemSearchText] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Data e Responsável automáticos (Data de hoje + Usuário logado)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [movementDate, setMovementDate] = useState(todayStr);
  const [withdrawnBy, setWithdrawnBy] = useState(state.currentUser?.name || '');
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [employeeSearchText, setEmployeeSearchText] = useState('');

  const [movementQty, setMovementQty] = useState('1');
  const [movementPrice, setMovementPrice] = useState('0');
  const [movementDest, setMovementDest] = useState('');

  // Modal amplo de movimentação rápida disparado pela tabela
  const [activeMovement, setActiveMovement] = useState<{ item: InventoryItem; type: 'in' | 'out' } | null>(null);
  const [modalWithdrawnBy, setModalWithdrawnBy] = useState(state.currentUser?.name || '');
  const [modalDate, setModalDate] = useState(todayStr);
  const [isModalEmployeeDropdownOpen, setIsModalEmployeeDropdownOpen] = useState(false);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'ok'>('all');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [tableSearchText, setTableSearchText] = useState('');
  const [confirmDeleteExit, setConfirmDeleteExit] = useState<{ isOpen: boolean; id: string } | null>(null);

  // Edição rápida de preço na tabela
  const [editingPrice, setEditingPrice] = useState<{ id: string; value: string } | null>(null);

  // Sincroniza usuário atual caso mude
  useEffect(() => {
    if (state.currentUser?.name && !withdrawnBy) {
      setWithdrawnBy(state.currentUser.name);
    }
  }, [state.currentUser?.name, withdrawnBy]);

  const formatMoney = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const refreshData = async () => {
    if (state.currentUser?.companyId || state.currentUser?.role === 'DIRETORIA_MASTER') {
      const data = await fetchCompleteCompanyData(
        state.currentUser?.companyId || null, 
        state.currentUser?.role === 'DIRETORIA_MASTER'
      );
      if (data) setState(prev => ({ ...prev, ...data }));
    }
  };

  // Prepara formulário de edição do item
  const handleStartEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    setEditFormData({
      name: item.name || '',
      category: item.category || '',
      currentQty: String(item.currentQty ?? 0),
      minQty: String(item.minQty ?? 0),
      idealQty: String(item.idealQty ?? 0),
      unitValue: String(item.unitValue ?? 0).replace('.', ',')
    });
  };

  // Salva alterações do item editado
  const handleSaveEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editFormData.name.trim() || !editFormData.category.trim()) {
      return notify("Nome e categoria são obrigatórios", "error");
    }

    const currentQtyNum = parseFloat(editFormData.currentQty.replace(',', '.'));
    const minQtyNum = parseFloat(editFormData.minQty.replace(',', '.'));
    const idealQtyNum = parseFloat(editFormData.idealQty.replace(',', '.'));
    const unitValueNum = parseFloat(editFormData.unitValue.replace(',', '.'));

    if (isNaN(currentQtyNum) || isNaN(minQtyNum) || isNaN(idealQtyNum) || isNaN(unitValueNum)) {
      return notify("Valores numéricos inválidos", "error");
    }

    setIsLoading(true);
    try {
      await dbSave('inventory', {
        id: editingItem.id,
        name: editFormData.name.trim().toUpperCase(),
        category: editFormData.category.trim().toUpperCase(),
        currentQty: currentQtyNum,
        minQty: minQtyNum,
        idealQty: idealQtyNum,
        unitValue: unitValueNum
      });
      await refreshData();
      setEditingItem(null);
      notify("Material atualizado com sucesso!");
    } catch (e) {
      notify("Erro ao atualizar material", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Excluir item de estoque
  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsLoading(true);
    try {
      await dbDelete('inventory', itemToDelete.id);
      await refreshData();
      notify("Material removido do almoxarifado!");
    } catch (e) {
      notify("Erro ao excluir material", "error");
    } finally {
      setIsLoading(false);
      setItemToDelete(null);
    }
  };

  // Salvar novo item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || !newItem.category) return notify("Nome e categoria obrigatórios", "error");
    setIsLoading(true);
    try {
      await dbSave('inventory', {
        companyId: state.currentUser?.companyId,
        name: newItem.name.trim().toUpperCase(),
        category: newItem.category.trim().toUpperCase(),
        currentQty: parseFloat(newItem.currentQty.replace(',', '.')) || 0,
        minQty: parseFloat(newItem.minQty.replace(',', '.')) || 0,
        idealQty: parseFloat(newItem.idealQty.replace(',', '.')) || 0,
        unitValue: parseFloat(newItem.unitValue.replace(',', '.')) || 0
      });
      await refreshData();
      setShowAddForm(false);
      setNewItem({ name: '', category: '', currentQty: '0', minQty: '0', idealQty: '0', unitValue: '0' });
      notify("Material cadastrado com sucesso!");
    } catch (e) { 
      notify("Erro ao salvar material", "error"); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleUpdatePrice = async (itemId: string) => {
    if (!editingPrice) return;
    const newVal = parseFloat(editingPrice.value.replace(',', '.'));
    if (isNaN(newVal)) return notify("Valor inválido", "error");

    setIsLoading(true);
    try {
      await dbSave('inventory', { id: itemId, unitValue: newVal });
      await refreshData();
      setEditingPrice(null);
      notify("Preço atualizado!");
    } catch (e) { 
      notify("Erro ao atualizar preço", "error"); 
    } finally { 
      setIsLoading(false); 
    }
  };

  // Executa movimentação (Entrada ou Retirada)
  const executeMovement = async (
    type: 'in' | 'out', 
    itemId: string, 
    qtyStr: string, 
    priceStr: string, 
    dest: string,
    personResponsible: string,
    operationDate: string
  ) => {
    const qty = parseFloat(qtyStr.replace(',', '.'));
    const price = parseFloat(priceStr.replace(',', '.'));
    
    if (isNaN(qty) || qty <= 0) return notify("Quantidade inválida", "error");
    if (type === 'in' && (isNaN(price) || price < 0)) return notify("Informe o valor unitário da entrada", "error");
    if (!dest.trim()) return notify("Informe o Destino / Local da aplicação", "error");

    const effectiveResponsible = (personResponsible || state.currentUser?.name || 'NÃO INFORMADO').trim().toUpperCase();
    const effectiveDate = operationDate || todayStr;

    setIsLoading(true);
    try {
      const item = state.inventory.find(i => i.id === itemId);
      if (!item) throw new Error("Item não encontrado");

      const currentBalance = Number(item.currentQty) || 0;
      const newQty = type === 'in' ? currentBalance + qty : currentBalance - qty;
      
      if (type === 'out' && newQty < 0) {
        setIsLoading(false);
        return notify(`Saldo insuficiente! Saldo atual: ${currentBalance}`, "error");
      }

      await dbSave('inventory', { 
        id: item.id, 
        currentQty: newQty,
        unitValue: type === 'in' ? price : item.unitValue
      });

      const observationText = type === 'in' 
        ? `ENTRADA (+) - Resp: ${effectiveResponsible} | V. Unit: ${formatMoney(price)}`
        : `RETIRADA (-) - Retirado por: ${effectiveResponsible} | ${item.name}`;

      await dbSave('inventory_exits', {
        companyId: state.currentUser?.companyId,
        itemId: itemId,
        quantity: type === 'in' ? qty : -qty,
        date: effectiveDate,
        destination: dest.trim().toUpperCase(),
        observation: observationText
      });

      await refreshData();
      notify(type === 'in' ? "Entrada de material registrada!" : `Retirada registrada por ${effectiveResponsible}!`);
      return true;
    } catch (e) { 
      notify("Erro na sincronização", "error"); 
      return false;
    } finally { 
      setIsLoading(false); 
    }
  };

  // Execução a partir da aba dedicada ou terminal
  const handleRegisterWithdrawal = async () => {
    if (!selectedItemId) return notify("Selecione o produto a ser retirado", "error");
    if (!withdrawnBy.trim()) return notify("Informe o nome de quem retirou o item", "error");

    const success = await executeMovement(
      'out', 
      selectedItemId, 
      movementQty, 
      '0', 
      movementDest, 
      withdrawnBy, 
      movementDate
    );

    if (success) {
      setMovementQty('1');
      setMovementDest('');
      setItemSearchText('');
      setSelectedItemId('');
      // Mantém a data de hoje e o usuário padrão
    }
  };

  // Execução de Entrada a partir do Terminal
  const handleRegisterEntry = async () => {
    if (!selectedItemId) return notify("Selecione o produto para dar entrada", "error");
    const success = await executeMovement(
      'in', 
      selectedItemId, 
      movementQty, 
      movementPrice, 
      movementDest || 'COMPRA / ENTRADA FORNECEDOR', 
      withdrawnBy, 
      movementDate
    );

    if (success) {
      setMovementQty('1');
      setMovementPrice('0');
      setMovementDest('');
      setItemSearchText('');
      setSelectedItemId('');
    }
  };

  // Execução a partir do Modal da tabela
  const handleModalMovement = async () => {
    if (!activeMovement) return;
    const success = await executeMovement(
      activeMovement.type,
      activeMovement.item.id,
      movementQty,
      movementPrice,
      movementDest,
      modalWithdrawnBy,
      modalDate
    );

    if (success) {
      setActiveMovement(null);
      setMovementQty('1');
      setMovementPrice('0');
      setMovementDest('');
    }
  };

  const openMovementModal = (item: InventoryItem, type: 'in' | 'out') => {
    setActiveMovement({ item, type });
    setMovementQty('1');
    setMovementPrice(String(item.unitValue || 0).replace('.', ','));
    setMovementDest(type === 'out' ? '' : 'ENTRADA / REPOSIÇÃO');
    setModalWithdrawnBy(state.currentUser?.name || '');
    setModalDate(todayStr);
  };

  const handleDeleteHistory = async () => {
    if (!confirmDeleteExit) return;
    setIsLoading(true);
    try {
      await dbDelete('inventory_exits', confirmDeleteExit.id);
      await refreshData();
      notify("Registro de movimentação excluído!");
    } catch (e) { 
      notify("Erro ao excluir", "error"); 
    } finally { 
      setIsLoading(false); 
      setConfirmDeleteExit(null);
    }
  };

  // Lista de itens filtrados para a tabela
  const filteredItems = useMemo(() => {
    return state.inventory.filter(item => {
      const nameMatch = item.name.toLowerCase().includes(tableSearchText.toLowerCase());
      const categoryMatch = categoryFilter === 'ALL' || item.category === categoryFilter;
      
      let statusMatch = true;
      if (statusFilter === 'critical') statusMatch = item.currentQty <= item.minQty;
      else if (statusFilter === 'ok') statusMatch = item.currentQty > item.minQty;
      
      return nameMatch && categoryMatch && statusMatch;
    });
  }, [state.inventory, tableSearchText, categoryFilter, statusFilter]);

  // Itens para o campo amplo de pesquisa de produtos
  const searchedProducts = useMemo(() => {
    if (!itemSearchText.trim()) return state.inventory;
    const query = itemSearchText.toLowerCase();
    return state.inventory.filter(i => 
      i.name.toLowerCase().includes(query) || 
      i.category.toLowerCase().includes(query)
    );
  }, [state.inventory, itemSearchText]);

  // Lista de funcionários sugeridos para quem retirou
  const filteredEmployees = useMemo(() => {
    const list = state.employees || [];
    const query = (employeeSearchText || withdrawnBy).toLowerCase().trim();
    if (!query) return list;
    return list.filter(e => 
      e.name.toLowerCase().includes(query) || 
      (e.role && e.role.toLowerCase().includes(query))
    );
  }, [state.employees, employeeSearchText, withdrawnBy]);

  const selectedItemObject = useMemo(() => {
    return state.inventory.find(i => i.id === selectedItemId) || null;
  }, [state.inventory, selectedItemId]);

  const totalInventoryValue = useMemo(() => {
    return state.inventory.reduce((acc, item) => acc + ((item.currentQty || 0) * (item.unitValue || 0)), 0);
  }, [state.inventory]);

  const criticalCount = useMemo(() => {
    return state.inventory.filter(item => item.currentQty <= item.minQty).length;
  }, [state.inventory]);

  return (
    <div className="space-y-6 pb-20">
      {/* Cabeçalho do Almoxarifado */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0c2a1c] flex items-center justify-center text-[#7ea24e] shadow-md">
              <Warehouse size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#0c2a1c] uppercase tracking-tight">Almoxarifado Central</h2>
              <p className="text-[10px] text-[#4b6f34] font-bold uppercase tracking-widest">
                Gestão de Insumos, Ferramental e Controle de Retiradas Forttiva
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Navegação entre Abas: Saldos, Retiradas, Histórico */}
          <div className="flex bg-slate-200/80 p-1 rounded-2xl w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab('stock')} 
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all ${
                activeTab === 'stock' 
                  ? 'bg-[#0c2a1c] text-white shadow-md' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package size={15}/>
              <span>Saldos & Estoque</span>
            </button>
            <button 
              onClick={() => setActiveTab('withdrawal')} 
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all ${
                activeTab === 'withdrawal' 
                  ? 'bg-rose-700 text-white shadow-md' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownRight size={15}/>
              <span>Registrar Retirada</span>
            </button>
            <button 
              onClick={() => setActiveTab('history')} 
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all ${
                activeTab === 'history' 
                  ? 'bg-[#0c2a1c] text-white shadow-md' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History size={15}/>
              <span>Histórico</span>
            </button>
          </div>

          <button 
            onClick={() => setShowAddForm(true)} 
            className="w-full sm:w-auto bg-[#16462d] text-white px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase shadow-lg flex items-center justify-center gap-2 hover:bg-[#23633c] transition-all active:scale-95 shrink-0"
          >
            <Plus size={16} /> CADASTRAR ITEM
          </button>
        </div>
      </header>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-[28px] border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Itens Cadastrados</span>
            <p className="text-2xl font-black text-[#0c2a1c] mt-1">{state.inventory.length}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Layers size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-[28px] border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Estoque Crítico / Alerta</span>
            <p className={`text-2xl font-black mt-1 ${criticalCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {criticalCount} {criticalCount === 1 ? 'item' : 'itens'}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${criticalCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <AlertTriangle size={22} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-[28px] border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Patrimônio em Estoque</span>
            <p className="text-2xl font-black text-[#16462d] mt-1">{formatMoney(totalInventoryValue)}</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#0c2a1c]/5 flex items-center justify-center text-[#16462d]">
            <Package size={22} />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 2: REGISTRAR RETIRADA (ABA DEDICADA, TOTALMENTE AMPLA E ESPAÇOSA)      */}
      {/* ========================================================================= */}
      {activeTab === 'withdrawal' && (
        <div className="bg-white p-6 sm:p-10 rounded-[36px] border border-slate-200/80 shadow-xl space-y-8 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-600 inline-block animate-pulse"></span>
                <h3 className="text-base font-black text-[#0c2a1c] uppercase tracking-tight">
                  Formulário Amplo de Registro de Retirada
                </h3>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 mt-1">
                A data e o responsável são preenchidos automaticamente. Utilize a pesquisa ampla para localizar qualquer material ou colaborador.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-rose-50 text-rose-700 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider self-start sm:self-auto border border-rose-100">
              <ArrowDownRight size={16}/> Baixa Automática em Estoque
            </div>
          </div>

          <div className="space-y-6">
            {/* Campo Amplo de Pesquisa do Produto */}
            <div className="relative">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <Package size={15} className="text-[#16462d]"/> 
                  <span>1. Selecionar Produto do Almoxarifado *</span>
                </label>
                {selectedItemObject && (
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                    ITEM SELECIONADO: {selectedItemObject.name} (SALDO ATUAL: {selectedItemObject.currentQty})
                  </span>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
                <input 
                  type="text"
                  className="w-full bg-slate-50 border-2 border-slate-200 pl-14 pr-12 py-5 rounded-[22px] text-sm font-black text-slate-800 outline-none focus:bg-white focus:border-[#16462d] transition-all uppercase shadow-inner placeholder:text-slate-400" 
                  placeholder="DIGITE O NOME DO ITEM (EX: FIO DE NYLON, ÓLEO 2T, ROÇADEIRA, BOTINA, LÂMINA...)" 
                  value={itemSearchText} 
                  onFocus={() => setIsDropdownOpen(true)} 
                  onChange={e => {
                    setItemSearchText(e.target.value);
                    setIsDropdownOpen(true);
                  }} 
                />
                {itemSearchText && (
                  <button 
                    onClick={() => {
                      setItemSearchText('');
                      setSelectedItemId('');
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-2"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {/* Menu suspenso amplo e legível para escolha de produtos */}
              {isDropdownOpen && (
                <div className="absolute top-full left-0 right-0 bg-white border-2 border-slate-200 rounded-[24px] shadow-2xl z-[120] mt-2 p-3 max-h-80 overflow-y-auto divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2">
                  <div className="p-2 text-[10px] font-black uppercase text-slate-400 tracking-wider flex justify-between">
                    <span>Resultados da Pesquisa ({searchedProducts.length} itens encontrados)</span>
                    <button 
                      onClick={() => setIsDropdownOpen(false)}
                      className="text-rose-600 hover:underline"
                    >
                      Fechar
                    </button>
                  </div>

                  {searchedProducts.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase">
                      Nenhum produto encontrado com o termo informado.
                    </div>
                  ) : (
                    searchedProducts.map(item => {
                      const isCritical = item.currentQty <= item.minQty;
                      const isSelected = item.id === selectedItemId;
                      return (
                        <button 
                          key={item.id} 
                          type="button"
                          className={`w-full text-left p-4 hover:bg-slate-50 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isSelected ? 'bg-emerald-50/80 border border-emerald-200' : ''
                          }`}
                          onClick={() => { 
                            setSelectedItemId(item.id); 
                            setItemSearchText(item.name); 
                            setIsDropdownOpen(false); 
                            setMovementPrice(String(item.unitValue || 0).replace('.', ',')); 
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black uppercase text-slate-900 tracking-tight">
                                {item.name}
                              </span>
                              <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-lg uppercase">
                                {item.category}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                              Valor unitário de referência: {formatMoney(item.unitValue || 0)}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="text-right">
                              <span className="text-[9px] uppercase font-bold text-slate-400 block">Saldo em Estoque</span>
                              <span className={`text-sm font-black ${isCritical ? 'text-rose-600' : 'text-slate-900'}`}>
                                {item.currentQty} unidades
                              </span>
                            </div>
                            {isSelected && (
                              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                                <Check size={16} />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Grid com Campos Automáticos e Detalhes da Retirada */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Data da Retirada (AUTOMÁTICA) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={13} className="text-[#16462d]"/> Data da Retirada *
                  </label>
                  <span className="text-[8px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md uppercase">
                    Automática
                  </span>
                </div>
                <input 
                  type="date"
                  className="w-full bg-slate-50 border-2 border-slate-200 px-4 py-4 rounded-2xl font-black text-xs text-slate-800 outline-none focus:bg-white focus:border-[#16462d] transition-all shadow-sm"
                  value={movementDate}
                  onChange={e => setMovementDate(e.target.value)}
                />
              </div>

              {/* Nome de Quem Retirou (AUTOMÁTICO COM CAMPO AMPLO E BUSCA DE COLABORADORES) */}
              <div className="space-y-1.5 relative md:col-span-1 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck size={13} className="text-[#16462d]"/> Quem Retirou o Item (Responsável) *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (state.currentUser?.name) {
                        setWithdrawnBy(state.currentUser.name);
                        setEmployeeSearchText('');
                      }
                    }}
                    className="text-[8px] font-black text-[#16462d] hover:underline uppercase bg-slate-100 px-2 py-0.5 rounded-md"
                  >
                    Usar Meu Nome ({state.currentUser?.name?.split(' ')[0] || 'Usuário'})
                  </button>
                </div>

                <div className="relative">
                  <input 
                    type="text"
                    className="w-full bg-slate-50 border-2 border-slate-200 px-4 py-4 pr-10 rounded-2xl font-black text-xs text-slate-800 outline-none focus:bg-white focus:border-[#16462d] transition-all uppercase shadow-sm placeholder:text-slate-400"
                    placeholder="DIGITE OU SELECIONE O COLABORADOR..."
                    value={withdrawnBy}
                    onFocus={() => setIsEmployeeDropdownOpen(true)}
                    onChange={e => {
                      setWithdrawnBy(e.target.value);
                      setEmployeeSearchText(e.target.value);
                      setIsEmployeeDropdownOpen(true);
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1 hover:text-slate-700"
                  >
                    <ChevronDown size={18} />
                  </button>
                </div>

                {/* Dropdown Amplo para Seleção do Colaborador */}
                {isEmployeeDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 bg-white border-2 border-slate-200 rounded-2xl shadow-2xl z-[110] mt-1 p-2 max-h-60 overflow-y-auto animate-in fade-in">
                    <div className="p-2 border-b flex justify-between items-center text-[9px] font-black text-slate-400 uppercase">
                      <span>Equipe / Colaboradores ({filteredEmployees.length})</span>
                      <button 
                        type="button" 
                        onClick={() => setIsEmployeeDropdownOpen(false)}
                        className="text-rose-600 hover:underline"
                      >
                        Fechar
                      </button>
                    </div>
                    {filteredEmployees.map(emp => (
                      <button
                        key={emp.id}
                        type="button"
                        className="w-full text-left p-3 hover:bg-slate-50 rounded-xl transition-all flex items-center justify-between text-xs"
                        onClick={() => {
                          setWithdrawnBy(emp.name);
                          setIsEmployeeDropdownOpen(false);
                        }}
                      >
                        <span className="font-black uppercase text-slate-800">{emp.name}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{emp.role}</span>
                      </button>
                    ))}
                    {filteredEmployees.length === 0 && (
                      <div className="p-3 text-center text-[10px] font-bold text-slate-400 uppercase">
                        Nenhum colaborador encontrado com este nome. O nome digitado será salvo.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Quantidade a Retirar */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                  Quantidade a Retirar *
                </label>
                <input 
                  type="text"
                  className="w-full bg-slate-50 border-2 border-slate-200 px-4 py-4 rounded-2xl font-black text-xs text-slate-800 outline-none focus:bg-white focus:border-rose-600 transition-all shadow-sm"
                  placeholder="Ex: 5"
                  value={movementQty}
                  onChange={e => setMovementQty(e.target.value)}
                />
              </div>
            </div>

            {/* Destino / Obra / Frente de Serviço */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-700 uppercase tracking-wider block">
                Destino / Local / Obra / Finalidade *
              </label>
              <input 
                type="text"
                className="w-full bg-slate-50 border-2 border-slate-200 px-5 py-4 rounded-2xl font-black text-xs text-slate-800 outline-none focus:bg-white focus:border-[#16462d] transition-all uppercase shadow-sm placeholder:text-slate-400"
                placeholder="EX: OBRA CENTRO / EQUIPE DE ROÇADA MEQ / MANUTENÇÃO PREDIAL / SERVIÇO ZONA NORTE"
                value={movementDest}
                onChange={e => setMovementDest(e.target.value)}
              />
            </div>

            {/* Card com Detalhes e Botão de Ação */}
            {selectedItemObject && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#16462d]">
                    <Package size={20} />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Produto Selecionado</span>
                    <h4 className="text-xs font-black uppercase text-slate-900">{selectedItemObject.name}</h4>
                    <p className="text-[10px] font-semibold text-slate-500">
                      Saldo Atual: <strong className="text-slate-800">{selectedItemObject.currentQty}</strong> | 
                      Saldo Estimado após Retirada: <strong className={((selectedItemObject.currentQty || 0) - (parseFloat(movementQty) || 0)) < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                        {((selectedItemObject.currentQty || 0) - (parseFloat(movementQty) || 0))}
                      </strong>
                    </p>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={handleRegisterWithdrawal}
                  disabled={isLoading}
                  className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={18}/> : <ArrowDownRight size={18}/>}
                  CONFIRMAR RETIRADA DE MATERIAL
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 1: SALDOS DE ESTOQUE (TABELA COM EDIÇÃO DE ITENS E TERMINAL RÁPIDO)   */}
      {/* ========================================================================= */}
      {activeTab === 'stock' && (
        <>
          {/* Terminal de Lançamento Rápido no topo */}
          <div className="bg-white p-6 sm:p-8 rounded-[36px] border border-slate-200/80 shadow-lg relative z-30 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-black text-[#4b6f34] uppercase tracking-[0.2em] flex items-center gap-2 border-l-4 border-[#7ea24e] pl-3">
                <ArrowRightLeft size={16}/> Terminal Rápido de Movimentação e Precificação
              </h3>
              <span className="text-[9px] font-bold text-slate-400 uppercase">
                Retirada & Entrada Direta
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              {/* Campo Amplo de Seleção do Produto */}
              <div className="md:col-span-4 relative">
                <label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 ml-1 block">
                  Produto / Material
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    className="w-full bg-slate-50 border-2 border-slate-200 pl-11 pr-4 py-3.5 rounded-2xl text-xs font-black outline-none focus:bg-white focus:border-[#0c2a1c] transition-all uppercase shadow-sm" 
                    placeholder="DIGITE PARA BUSCAR..." 
                    value={itemSearchText} 
                    onFocus={() => setIsDropdownOpen(true)} 
                    onChange={e => {
                      setItemSearchText(e.target.value);
                      setIsDropdownOpen(true);
                    }} 
                  />
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 w-full sm:min-w-[420px] bg-white border-2 border-slate-200 rounded-2xl shadow-2xl z-[100] mt-2 p-2 max-h-72 overflow-y-auto divide-y divide-slate-100">
                      <div className="p-2 text-[9px] font-black uppercase text-slate-400 flex justify-between">
                        <span>Produtos ({searchedProducts.length})</span>
                        <button onClick={() => setIsDropdownOpen(false)} className="text-rose-600 hover:underline">Fechar</button>
                      </div>
                      {searchedProducts.map(item => (
                        <button 
                          key={item.id} 
                          type="button"
                          className="w-full text-left p-3 hover:bg-slate-50 rounded-xl transition-colors flex justify-between items-center gap-2" 
                          onClick={() => { 
                            setSelectedItemId(item.id); 
                            setItemSearchText(item.name); 
                            setIsDropdownOpen(false); 
                            setMovementPrice(String(item.unitValue || 0).replace('.', ',')); 
                          }}
                        >
                          <div>
                            <span className="text-[11px] font-black uppercase block text-slate-900">{item.name}</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase">{item.category}</span>
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${item.currentQty <= item.minQty ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                            SALDO: {item.currentQty}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quantidade */}
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 ml-1 block">Qtd</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border-2 border-slate-200 p-3.5 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-[#0c2a1c] shadow-sm text-center" 
                  value={movementQty} 
                  onChange={e => setMovementQty(e.target.value)} 
                />
              </div>

              {/* Valor Unitário */}
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 ml-1 block">V. Unitário (R$)</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border-2 border-slate-200 p-3.5 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-[#0c2a1c] shadow-sm" 
                  placeholder="0,00" 
                  value={movementPrice} 
                  onChange={e => setMovementPrice(e.target.value)} 
                />
              </div>

              {/* Destino */}
              <div className="md:col-span-4">
                <label className="text-[10px] font-black text-slate-500 uppercase mb-1.5 ml-1 block">Destino / Aplicação</label>
                <input 
                  className="w-full bg-slate-50 border-2 border-slate-200 p-3.5 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-[#0c2a1c] shadow-sm uppercase placeholder:text-slate-400" 
                  placeholder="EX: OBRA CENTRO / EQUIPE 1" 
                  value={movementDest} 
                  onChange={e => setMovementDest(e.target.value)} 
                />
              </div>
            </div>

            {/* Linha com Responsável Automático e Botões */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 w-full md:w-auto">
                <UserCheck size={14} className="text-[#16462d]"/>
                <span>Responsável Automático:</span>
                <span className="font-black text-[#0c2a1c] bg-slate-100 px-2 py-0.5 rounded-md uppercase">
                  {withdrawnBy || state.currentUser?.name || 'Administrador'}
                </span>
                <span className="text-slate-300">|</span>
                <Calendar size={14} className="text-[#16462d]"/>
                <span>Data:</span>
                <span className="font-black text-[#0c2a1c] bg-slate-100 px-2 py-0.5 rounded-md">
                  {movementDate.split('-').reverse().join('/')}
                </span>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <button 
                  type="button"
                  onClick={handleRegisterWithdrawal} 
                  className="flex-1 md:flex-none bg-rose-600 hover:bg-rose-700 text-white px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <ArrowDownRight size={14}/> RETIRADA (-)
                </button>
                <button 
                  type="button"
                  onClick={handleRegisterEntry} 
                  className="flex-1 md:flex-none bg-[#0c2a1c] hover:bg-[#16462d] text-white px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-wider shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Plus size={14}/> ENTRADA (+)
                </button>
              </div>
            </div>
          </div>

          {/* Tabela de Saldos com Filtros e Edição de Itens */}
          <div className="bg-white rounded-[32px] border border-slate-200/80 shadow-sm overflow-hidden">
            {/* Barra de Filtros e Busca */}
            <div className="p-6 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-start lg:items-center bg-slate-50/50 gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text"
                    placeholder="Filtrar nesta tabela..."
                    value={tableSearchText}
                    onChange={e => setTableSearchText(e.target.value)}
                    className="w-full bg-white border border-slate-200 pl-10 pr-4 py-2 rounded-xl text-[10px] font-black uppercase outline-none focus:border-[#0c2a1c]"
                  />
                </div>
                <div className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase tracking-wider">
                  <Filter size={14}/> {filteredItems.length} {filteredItems.length === 1 ? 'material listado' : 'materiais listados'}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                <select 
                  className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-[9px] font-black uppercase outline-none focus:border-[#0c2a1c]"
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                >
                  <option value="ALL">CATEGORIAS: TODAS</option>
                  {state.inventoryCategories.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
                </select>

                <div className="flex bg-slate-200 p-1 rounded-xl">
                  <button 
                    onClick={() => setStatusFilter('all')} 
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                  >
                    Tudo
                  </button>
                  <button 
                    onClick={() => setStatusFilter('critical')} 
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${statusFilter === 'critical' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    Crítico
                  </button>
                  <button 
                    onClick={() => setStatusFilter('ok')} 
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${statusFilter === 'ok' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>

            {/* Tabela de Itens do Almoxarifado */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[9px] uppercase text-slate-400 font-black border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Material / Nomenclatura</th>
                    <th className="px-6 py-4 text-center">Saldo Atual</th>
                    <th className="px-6 py-4 text-center">Estoque Mínimo</th>
                    <th className="px-6 py-4 text-right">Valor Unitário</th>
                    <th className="px-6 py-4 text-right">Total em Estoque</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-center">Ações & Edição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] font-black uppercase text-slate-700">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-8 py-16 text-center italic text-slate-300 uppercase text-[10px] font-black">
                        Nenhum item cadastrado ou encontrado com os filtros aplicados
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(item => {
                      const isCritical = item.currentQty <= item.minQty;
                      const totalValue = (item.currentQty || 0) * (item.unitValue || 0);
                      const isEditing = editingPrice?.id === item.id;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors group">
                          {/* Nome e Categoria */}
                          <td className="px-6 py-4 font-black">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-900">{item.name}</span>
                              <button 
                                onClick={() => handleStartEditItem(item)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-[#16462d] transition-all rounded hover:bg-slate-100"
                                title="Editar nome e dados deste item"
                              >
                                <Edit2 size={13} />
                              </button>
                            </div>
                            <p className="text-[8px] text-[#4b6f34] font-bold uppercase tracking-wider mt-0.5">{item.category}</p>
                          </td>

                          {/* Saldo Atual */}
                          <td className={`px-6 py-4 text-center font-black ${isCritical ? 'text-rose-600' : 'text-slate-900'}`}>
                            <span className={`px-2.5 py-1 rounded-xl text-xs ${isCritical ? 'bg-rose-50' : 'bg-slate-100'}`}>
                              {item.currentQty}
                            </span>
                          </td>

                          {/* Mínimo Crítico */}
                          <td className="px-6 py-4 text-center text-slate-400 text-xs font-semibold">
                            {item.minQty} un
                          </td>

                          {/* Valor Unitário */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2 group/price">
                              {isEditing ? (
                                <>
                                  <input 
                                    autoFocus
                                    className="w-20 bg-white border border-slate-300 rounded px-2 py-1 text-right text-[10px] font-black outline-none focus:border-[#0c2a1c]"
                                    value={editingPrice.value}
                                    onChange={e => setEditingPrice({...editingPrice, value: e.target.value})}
                                  />
                                  <button onClick={() => handleUpdatePrice(item.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Save size={13}/></button>
                                  <button onClick={() => setEditingPrice(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X size={13}/></button>
                                </>
                              ) : (
                                <>
                                  <span className="text-slate-600 font-bold">{formatMoney(item.unitValue || 0)}</span>
                                  <button 
                                    onClick={() => setEditingPrice({ id: item.id, value: String(item.unitValue || 0).replace('.', ',') })}
                                    className="p-1 text-slate-300 group-hover/price:text-[#16462d] transition-colors"
                                    title="Editar preço rápido"
                                  >
                                    <Edit2 size={11}/>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>

                          {/* Valor em Estoque */}
                          <td className="px-6 py-4 text-right text-emerald-700 font-black">
                            {formatMoney(totalValue)}
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4 text-center">
                            {isCritical ? (
                              <span className="text-rose-600 bg-rose-50 px-2.5 py-1 rounded-xl inline-flex items-center gap-1 text-[8px] font-black">
                                <AlertTriangle size={11}/> CRÍTICO
                              </span>
                            ) : (
                              <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl inline-flex items-center gap-1 text-[8px] font-black">
                                <CheckCircle2 size={11}/> OK
                              </span>
                            )}
                          </td>

                          {/* Ações (Editar, Entrada, Retirada, Excluir) */}
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Botão de Edição Completa do Item */}
                              <button 
                                onClick={() => handleStartEditItem(item)} 
                                className="px-2.5 py-1.5 text-[#0c2a1c] bg-[#ded5c4]/40 hover:bg-[#ded5c4] rounded-xl text-[9px] font-black uppercase transition-all flex items-center gap-1"
                                title="Editar Material (Nome, Categoria, Estoque, Preço)"
                              >
                                <Edit2 size={12}/>
                                <span className="hidden sm:inline">EDITAR</span>
                              </button>

                              {/* Entrada rápida */}
                              <button 
                                onClick={() => openMovementModal(item, 'in')} 
                                className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm" 
                                title="Dar Entrada (+)"
                              >
                                <Plus size={15}/>
                              </button>

                              {/* Retirada rápida */}
                              <button 
                                onClick={() => openMovementModal(item, 'out')} 
                                className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl transition-all shadow-sm" 
                                title="Registrar Retirada (-)"
                              >
                                <ArrowDownRight size={15}/>
                              </button>

                              {/* Excluir material */}
                              <button
                                onClick={() => setItemToDelete(item)}
                                className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title="Excluir Material"
                              >
                                <Trash2 size={14}/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: HISTÓRICO DE MOVIMENTAÇÕES                                         */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-[32px] border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in duration-200">
          <div className="p-6 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="text-xs font-black uppercase text-[#0c2a1c] tracking-wider flex items-center gap-2">
                <History size={16} className="text-[#16462d]"/> Histórico Detalhado de Movimentações
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                Registro de todas as entradas, retiradas, responsáveis e datas
              </p>
            </div>
            <span className="text-[10px] font-black text-slate-500 bg-slate-200/70 px-3 py-1 rounded-xl uppercase">
              Total de registros: {state.inventoryExits.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[9px] uppercase text-slate-400 font-black border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Material / Item</th>
                  <th className="px-6 py-4">Destino / Aplicação</th>
                  <th className="px-6 py-4 text-center">Quantidade</th>
                  <th className="px-6 py-4">Detalhes / Quem Retirou</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[10px] font-black uppercase text-slate-600">
                {state.inventoryExits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-8 py-16 text-center text-slate-300 uppercase font-black italic">
                      Nenhuma movimentação registrada até o momento
                    </td>
                  </tr>
                ) : (
                  state.inventoryExits.map(exit => {
                    const item = state.inventory.find(i => i.id === exit.itemId);
                    const isEntry = exit.quantity > 0;
                    return (
                      <tr key={exit.id} className="hover:bg-slate-50/50 transition-colors group">
                        {/* Data */}
                        <td className="px-6 py-4 text-slate-700">
                          {exit.date ? exit.date.split('-').reverse().join('/') : '---'}
                        </td>

                        {/* Tipo */}
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-xl text-[9px] font-black inline-flex items-center gap-1 ${
                            isEntry ? 'text-emerald-700 bg-emerald-50' : 'text-rose-600 bg-rose-50'
                          }`}>
                            {isEntry ? <Plus size={12}/> : <ArrowDownRight size={12}/>}
                            {isEntry ? 'ENTRADA' : 'RETIRADA'}
                          </span>
                        </td>

                        {/* Item */}
                        <td className="px-6 py-4 text-slate-900 font-black">
                          {item?.name || 'Item Removido ou Desconhecido'}
                        </td>

                        {/* Destino */}
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-lg text-[9px] font-black text-slate-700 bg-slate-100">
                            {exit.destination || 'NÃO ESPECIFICADO'}
                          </span>
                        </td>

                        {/* Quantidade */}
                        <td className={`px-6 py-4 text-center font-black text-xs ${isEntry ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isEntry ? '+' : ''}{exit.quantity}
                        </td>

                        {/* Observações / Quem Retirou */}
                        <td className="px-6 py-4 text-slate-500 font-semibold normal-case">
                          {exit.observation}
                        </td>

                        {/* Ações */}
                        <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => setConfirmDeleteExit({ isOpen: true, id: exit.id })} 
                            className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Remover este registro do histórico"
                          >
                            <Trash2 size={15}/>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL AMPLO: EDITAR MATERIAL DO ESTOQUE (CASO O NOME ESTEJA INCORRETO)   */}
      {/* ========================================================================= */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <form 
            onSubmit={handleSaveEditItem} 
            className="bg-white rounded-[36px] w-full max-w-xl p-8 sm:p-10 space-y-6 shadow-2xl animate-in zoom-in-95 border border-slate-100"
          >
            <div className="flex justify-between items-center border-b pb-5">
              <div>
                <h3 className="text-base font-black uppercase text-[#0c2a1c] tracking-tight flex items-center gap-2">
                  <Edit2 size={18} className="text-[#16462d]"/> Editar Material do Almoxarifado
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                  Corrija o nome, categoria, saldo ou valores do item selecionado
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setEditingItem(null)} 
                className="text-slate-400 hover:text-slate-900 p-2"
              >
                <X size={20}/>
              </button>
            </div>

            <div className="space-y-4">
              {/* Nomenclatura / Nome do Produto */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block">
                  Nomenclatura / Nome do Material *
                </label>
                <input 
                  required 
                  className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl text-xs font-black uppercase outline-none focus:bg-white focus:border-[#0c2a1c] shadow-sm" 
                  placeholder="EX: FIO DE NYLON 3.0MM QUADRADO" 
                  value={editFormData.name} 
                  onChange={e => setEditFormData({...editFormData, name: e.target.value})} 
                />
              </div>

              {/* Categoria */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block">
                  Categoria *
                </label>
                <select 
                  required 
                  className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl text-xs font-black uppercase outline-none focus:bg-white focus:border-[#0c2a1c] shadow-sm" 
                  value={editFormData.category} 
                  onChange={e => setEditFormData({...editFormData, category: e.target.value})}
                >
                  <option value="">SELECIONE A CATEGORIA...</option>
                  {state.inventoryCategories.map(cat => (
                    <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* Saldo Atual e Valor Unitário */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block">
                    Saldo Atual em Estoque
                  </label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-[#0c2a1c] shadow-sm" 
                    value={editFormData.currentQty} 
                    onChange={e => setEditFormData({...editFormData, currentQty: e.target.value})} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block">
                    Valor Unitário (R$)
                  </label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-[#0c2a1c] shadow-sm" 
                    value={editFormData.unitValue} 
                    onChange={e => setEditFormData({...editFormData, unitValue: e.target.value})} 
                  />
                </div>
              </div>

              {/* Mínimo Crítico e Ideal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block">
                    Estoque Mínimo (Alerta Crítico)
                  </label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-[#0c2a1c] shadow-sm" 
                    value={editFormData.minQty} 
                    onChange={e => setEditFormData({...editFormData, minQty: e.target.value})} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block">
                    Quantidade Ideal Recomendada
                  </label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-[#0c2a1c] shadow-sm" 
                    value={editFormData.idealQty} 
                    onChange={e => setEditFormData({...editFormData, idealQty: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button 
                type="button" 
                onClick={() => setEditingItem(null)} 
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-4 rounded-2xl font-black uppercase text-[10px] tracking-wider transition-all"
              >
                Cancelar
              </button>
              <button 
                disabled={isLoading} 
                type="submit" 
                className="flex-1 bg-[#16462d] hover:bg-[#23633c] text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-wider shadow-xl transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>}
                SALVAR ALTERAÇÕES
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL AMPLO DE MOVIMENTAÇÃO (DISPARADO PELOS BOTÕES DA TABELA)           */}
      {/* ========================================================================= */}
      {activeMovement && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[36px] w-full max-w-2xl p-8 sm:p-10 space-y-6 shadow-2xl animate-in zoom-in-95 border border-slate-100">
            <div className="flex justify-between items-center border-b pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${activeMovement.type === 'in' ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
                  <h3 className="text-base font-black uppercase text-slate-900">
                    {activeMovement.type === 'in' ? 'Registrar Entrada de Material' : 'Registrar Retirada de Material'}
                  </h3>
                </div>
                <p className="text-xs font-black text-[#16462d] uppercase mt-1">
                  Item: {activeMovement.item.name} (Saldo atual: {activeMovement.item.currentQty})
                </p>
              </div>
              <button onClick={() => setActiveMovement(null)} className="text-slate-400 hover:text-slate-900 p-2"><X size={20}/></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Data Automática */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1 flex items-center gap-1">
                    <Calendar size={13} className="text-[#16462d]"/> Data da Movimentação (Automática)
                  </label>
                  <input 
                    type="date"
                    className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-[#0c2a1c]" 
                    value={modalDate} 
                    onChange={e => setModalDate(e.target.value)} 
                  />
                </div>

                {/* Quem Retirou / Responsável Automático */}
                <div className="space-y-1 relative">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 flex items-center gap-1">
                      <UserCheck size={13} className="text-[#16462d]"/> {activeMovement.type === 'out' ? 'Quem Retirou o Item' : 'Responsável pela Entrada'}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (state.currentUser?.name) setModalWithdrawnBy(state.currentUser.name);
                      }}
                      className="text-[8px] font-bold text-[#16462d] hover:underline uppercase"
                    >
                      Meu Nome
                    </button>
                  </div>
                  <input 
                    type="text"
                    className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-[#0c2a1c] uppercase" 
                    value={modalWithdrawnBy} 
                    onFocus={() => setIsModalEmployeeDropdownOpen(true)}
                    onChange={e => {
                      setModalWithdrawnBy(e.target.value);
                      setIsModalEmployeeDropdownOpen(true);
                    }} 
                  />
                  {isModalEmployeeDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 bg-white border-2 border-slate-200 rounded-2xl shadow-xl z-[120] mt-1 p-2 max-h-48 overflow-y-auto">
                      <div className="p-1 border-b flex justify-between text-[9px] font-black text-slate-400 uppercase">
                        <span>Equipe</span>
                        <button type="button" onClick={() => setIsModalEmployeeDropdownOpen(false)} className="text-rose-600">Fechar</button>
                      </div>
                      {state.employees.map(emp => (
                        <button
                          key={emp.id}
                          type="button"
                          className="w-full text-left p-2 hover:bg-slate-50 rounded-xl text-xs font-black uppercase text-slate-700 flex justify-between"
                          onClick={() => {
                            setModalWithdrawnBy(emp.name);
                            setIsModalEmployeeDropdownOpen(false);
                          }}
                        >
                          <span>{emp.name}</span>
                          <span className="text-[9px] text-slate-400">{emp.role}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Quantidade a Movimentar</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-[#0c2a1c]" 
                    value={movementQty} 
                    onChange={e => setMovementQty(e.target.value)} 
                  />
                </div>
                
                {activeMovement.type === 'in' ? (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Valor Unitário da Entrada (R$)</label>
                    <input 
                      type="text" 
                      className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-[#0c2a1c]" 
                      placeholder="0,00" 
                      value={movementPrice} 
                      onChange={e => setMovementPrice(e.target.value)} 
                    />
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Saldo Resultante</label>
                    <div className="w-full bg-slate-100 p-4 rounded-2xl font-black text-xs text-slate-700">
                      {Number(activeMovement.item.currentQty || 0) - (parseFloat(movementQty) || 0)} unidades
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1">
                  {activeMovement.type === 'in' ? 'Origem / Fornecedor / NF' : 'Destino / Obra / Local da Aplicação'}
                </label>
                <input 
                  className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-[#0c2a1c] uppercase" 
                  placeholder={activeMovement.type === 'in' ? "EX: COMPRA NF 123 - DISTRIBUIDORA" : "EX: OBRA CENTRO / EQUIPE ROÇADA"} 
                  value={movementDest} 
                  onChange={e => setMovementDest(e.target.value)} 
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setActiveMovement(null)} 
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-4 rounded-2xl font-black uppercase text-[10px] tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleModalMovement} 
                  disabled={isLoading} 
                  className={`flex-1 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl transition-all flex items-center justify-center gap-2 ${
                    activeMovement.type === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isLoading ? <Loader2 className="animate-spin" size={16}/> : (activeMovement.type === 'in' ? <Plus size={16}/> : <ArrowDownRight size={16}/>)}
                  CONFIRMAR {activeMovement.type === 'in' ? 'ENTRADA' : 'RETIRADA'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CADASTRAR NOVO MATERIAL                                           */}
      {/* ========================================================================= */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[120] flex items-center justify-center p-4">
          <form 
            onSubmit={handleAddItem} 
            className="bg-white rounded-[36px] w-full max-w-lg p-8 sm:p-10 space-y-6 shadow-2xl animate-in zoom-in-95 border border-slate-100"
          >
            <div className="flex justify-between items-center border-b pb-5">
              <div>
                <h3 className="text-base font-black uppercase text-[#0c2a1c] tracking-tight">Cadastrar Novo Material</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Almoxarifado Central Forttiva</p>
              </div>
              <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-900 p-2"><X size={20}/></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block">Nomenclatura do Material *</label>
                <input 
                  required 
                  className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl text-xs font-black uppercase outline-none focus:bg-white focus:border-[#0c2a1c]" 
                  placeholder="EX: FIO DE NYLON 3.0MM" 
                  value={newItem.name} 
                  onChange={e => setNewItem({...newItem, name: e.target.value})} 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block">Categoria *</label>
                <select 
                  required 
                  className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl text-xs font-black uppercase outline-none focus:bg-white focus:border-[#0c2a1c]" 
                  value={newItem.category} 
                  onChange={e => setNewItem({...newItem, category: e.target.value})}
                >
                  <option value="">SELECIONE UMA CATEGORIA...</option>
                  {state.inventoryCategories.map(cat => <option key={cat} value={cat}>{cat.toUpperCase()}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block">Saldo Inicial</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-[#0c2a1c]" 
                    value={newItem.currentQty} 
                    onChange={e => setNewItem({...newItem, currentQty: e.target.value})} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block">Valor Unit. (R$)</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-[#0c2a1c]" 
                    value={newItem.unitValue} 
                    onChange={e => setNewItem({...newItem, unitValue: e.target.value})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block">Mínimo Crítico</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-[#0c2a1c]" 
                    value={newItem.minQty} 
                    onChange={e => setNewItem({...newItem, minQty: e.target.value})} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block">Quantidade Ideal</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border-2 border-slate-200 p-4 rounded-2xl font-black text-xs outline-none focus:bg-white focus:border-[#0c2a1c]" 
                    value={newItem.idealQty} 
                    onChange={e => setNewItem({...newItem, idealQty: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)} 
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-4 rounded-2xl font-black uppercase text-[10px] tracking-wider transition-all"
              >
                Cancelar
              </button>
              <button 
                disabled={isLoading} 
                type="submit" 
                className="flex-1 bg-[#16462d] hover:bg-[#23633c] text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-wider shadow-xl transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="animate-spin" size={16}/> : <Plus size={16}/>}
                CADASTRAR MATERIAL
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirmação de exclusão de material */}
      <ConfirmationModal 
        isOpen={!!itemToDelete} 
        onClose={() => setItemToDelete(null)} 
        onConfirm={handleDeleteItem} 
        title="Remover Material do Estoque" 
        message={`Deseja excluir permanentemente o item "${itemToDelete?.name}"? Esta ação removerá o material do catálogo.`}
      />

      {/* Confirmação de exclusão do histórico */}
      <ConfirmationModal 
        isOpen={!!confirmDeleteExit?.isOpen} 
        onClose={() => setConfirmDeleteExit(null)} 
        onConfirm={handleDeleteHistory} 
        title="Remover Registro do Histórico" 
        message="Deseja excluir este registro de movimentação do histórico? O saldo de estoque não será alterado automaticamente."
      />
    </div>
  );
};

export default Inventory;
