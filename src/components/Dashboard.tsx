import React, { useState } from 'react';
import { DollarSign, ArrowUpRight, ArrowDownRight, CreditCard, ClipboardList, Percent, Plus, HelpCircle, CheckCircle2, AlertCircle, Edit, Trash, Power, TrendingUp, Calendar, Tag, Filter, Clock, AlertTriangle, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { Transaction, FixedTemplate, MonthlyStats } from '../types';
import { formatCurrency, formatMonthYear, calculateStats } from '../utils/financeUtils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
  templates: FixedTemplate[];
  stats: MonthlyStats;
  currentMonth?: string;
  onAddTransaction: () => void;
  onTogglePaid?: (id: string) => void;
  // Templates actions
  onAddTemplate: (name: string, amount: number, type: 'receita' | 'despesa') => void;
  onToggleTemplate: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
  onApplyTemplatesToCurrentMonth?: () => void;
}

export default function Dashboard({
  transactions,
  templates,
  stats,
  currentMonth = '',
  onAddTransaction,
  onTogglePaid,
  onAddTemplate,
  onToggleTemplate,
  onDeleteTemplate,
  onApplyTemplatesToCurrentMonth,
}: DashboardProps) {
  // Local state for adding a template directly
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateAmount, setTemplateAmount] = useState('');
  const [templateType, setTemplateType] = useState<'receita' | 'despesa'>('despesa');

  // Find templates that are active but don't have a transaction with the same name in the current month
  const activeTemplates = templates.filter(t => t.isActive);
  const currentMonthTransactionsForSync = transactions.filter(t => t.monthYear === currentMonth);
  const missingTemplates = activeTemplates.filter(
    tpl => !currentMonthTransactionsForSync.some(t => t.name.toLowerCase() === tpl.name.toLowerCase())
  );

  const handleTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim() || !templateAmount) return;
    const parsed = parseFloat(templateAmount.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0) return;

    onAddTemplate(templateName.trim(), parsed, templateType);
    setTemplateName('');
    setTemplateAmount('');
    setShowAddTemplate(false);
  };

  // Prepare chart data for Income vs Expenses
  const cashFlowData = [
    {
      name: 'Fluxo',
      'Receitas (+)': stats.totalIncome,
      'Despesas (-)': stats.totalExpenses,
    },
  ];

  // Prepare chart data for payment status
  const expenseStatusData = [
    { name: 'Pagas', value: stats.paidExpenses, color: '#4f46e5' }, // indigo-600
    { name: 'Pendentes', value: stats.unpaidExpenses, color: '#f59e0b' }, // amber-500
  ];

  const hasExpenses = stats.totalExpenses > 0;

  // Sub-tabs state for deep evaluation
  const [subTab, setSubTab] = useState<'geral' | 'categorias' | 'agenda'>('geral');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [agendaFilter, setAgendaFilter] = useState<'todas' | 'pendentes' | 'atrasadas' | 'pagas'>('todas');

  // Smart Categories configuration
  interface CategoryMeta {
    key: string;
    label: string;
    color: string;
    keywords: string[];
  }

  const CATEGORIES: CategoryMeta[] = [
    {
      key: 'habitacao',
      label: 'Habitação',
      color: '#6366f1', // Indigo
      keywords: ['aluguel', 'condominio', 'condomínio', 'luz', 'energia', 'agua', 'água', 'gás', 'gas', 'internet', 'iptu', 'provedor', 'faxina', 'casa', 'enel', 'sabesp', 'copasa', 'neoenergia']
    },
    {
      key: 'alimentacao',
      label: 'Alimentação',
      color: '#f59e0b', // Amber
      keywords: ['mercado', 'supermercado', 'feira', 'restaurante', 'ifood', 'padaria', 'lanche', 'comida', 'jantar', 'almoço', 'almoco', 'pão', 'carrefour', 'pao de acucar', 'extra', 'mcdonald', 'burger']
    },
    {
      key: 'transporte',
      label: 'Transporte',
      color: '#3b82f6', // Blue
      keywords: ['gasolina', 'combustivel', 'combustível', 'uber', '99taxi', 'metrô', 'metro', 'ônibus', 'onibus', 'pedágio', 'pedagio', 'mecanico', 'oficina', 'ipva', 'estacionamento', 'licenciamento', 'carro', 'moto']
    },
    {
      key: 'saude',
      label: 'Saúde & Cuidados',
      color: '#ec4899', // Pink
      keywords: ['farmacia', 'farmácia', 'remedio', 'remédio', 'medico', 'médico', 'dentista', 'consulta', 'exame', 'unimed', 'convenio', 'convênio', 'psicologo', 'terapia', 'hospital', 'drogasil', 'pague menos']
    },
    {
      key: 'lazer',
      label: 'Lazer & Assinaturas',
      color: '#10b981', // Emerald
      keywords: ['netflix', 'spotify', 'disney', 'prime', 'cinema', 'viagem', 'hotel', 'cerveja', 'bar', 'clube', 'assinatura', 'jogo', 'steam', 'playstation', 'xbox', 'nintendo', 'academia', 'gym', 'hbo']
    },
    {
      key: 'financas',
      label: 'Finanças & Serviços',
      color: '#8b5cf6', // Purple
      keywords: ['cartao', 'cartão', 'fatura', 'emprestimo', 'empréstimo', 'juros', 'tarifa', 'banco', 'nubank', 'itau', 'bradesco', 'parcela', 'seguro', 'iof', 'ted', 'pix', 'anuidade']
    },
    {
      key: 'outros',
      label: 'Outros',
      color: '#64748b', // Slate
      keywords: []
    }
  ];

  const getCategoryForTransaction = (name: string): CategoryMeta => {
    const normalized = name.toLowerCase();
    for (const cat of CATEGORIES) {
      if (cat.key === 'outros') continue;
      if (cat.keywords.some(keyword => normalized.includes(keyword))) {
        return cat;
      }
    }
    return CATEGORIES[CATEGORIES.length - 1]; // Return Outros
  };

  // Group current viewed month's expenses by category
  const currentMonthTransactions = transactions.filter(t => t.monthYear === currentMonth);
  const currentExpenses = currentMonthTransactions.filter(t => t.type === 'despesa');
  
  const categoryTotals: { [key: string]: number } = {};
  CATEGORIES.forEach(cat => {
    categoryTotals[cat.key] = 0;
  });

  currentExpenses.forEach(t => {
    const cat = getCategoryForTransaction(t.name);
    categoryTotals[cat.key] = (categoryTotals[cat.key] || 0) + t.amount;
  });

  const categoryChartData = CATEGORIES.map(cat => ({
    key: cat.key,
    name: cat.label,
    value: categoryTotals[cat.key] || 0,
    color: cat.color
  })).filter(d => d.value > 0);

  const totalCategoryExpenses = categoryChartData.reduce((acc, curr) => acc + curr.value, 0);

  // Setup Due Dates (Agenda) calculations
  const expensesWithDueDate = currentExpenses.filter(t => t.dueDate);
  const todayStr = new Date().toISOString().substring(0, 10);

  const unpaidOverdue = expensesWithDueDate.filter(t => !t.isPaid && t.dueDate && t.dueDate < todayStr);
  const unpaidDueToday = expensesWithDueDate.filter(t => !t.isPaid && t.dueDate === todayStr);
  const unpaidFuture = expensesWithDueDate.filter(t => !t.isPaid && t.dueDate && t.dueDate > todayStr);
  const paidBills = expensesWithDueDate.filter(t => t.isPaid);

  const groupedByDay: { [day: number]: Transaction[] } = {};
  expensesWithDueDate.forEach(t => {
    if (t.dueDate) {
      const dayNum = parseInt(t.dueDate.split('-')[2]);
      if (!isNaN(dayNum)) {
        if (!groupedByDay[dayNum]) {
          groupedByDay[dayNum] = [];
        }
        groupedByDay[dayNum].push(t);
      }
    }
  });

  const sortedDays = Object.keys(groupedByDay).map(Number).sort((a, b) => a - b);

  const getFilteredGroupedDays = () => {
    const result: { [day: number]: Transaction[] } = {};
    sortedDays.forEach(day => {
      const txs = groupedByDay[day];
      const filteredTxs = txs.filter(t => {
        if (agendaFilter === 'pendentes') return !t.isPaid;
        if (agendaFilter === 'atrasadas') return !t.isPaid && t.dueDate && t.dueDate < todayStr;
        if (agendaFilter === 'pagas') return t.isPaid;
        return true;
      });
      if (filteredTxs.length > 0) {
        result[day] = filteredTxs;
      }
    });
    return result;
  };

  const filteredGroupedDays = getFilteredGroupedDays();
  const filteredSortedDays = Object.keys(filteredGroupedDays).map(Number).sort((a, b) => a - b);

  // Generate monthly historical data for the line chart
  const getMonthlyHistoryData = () => {
    const monthsSet = new Set<string>();
    transactions.forEach((t) => {
      if (t.monthYear) {
        monthsSet.add(t.monthYear);
      }
    });

    const sortedMonths = Array.from(monthsSet).sort();

    return sortedMonths.map((month) => {
      const monthTx = transactions.filter((t) => t.monthYear === month);
      let totalIncome = 0;
      let totalExpenses = 0;

      monthTx.forEach((t) => {
        if (t.type === 'receita') {
          totalIncome += t.amount;
        } else {
          totalExpenses += t.amount;
        }
      });

      const balance = totalIncome - totalExpenses;

      // Format month label (e.g. "Julho de 2026" -> "Jul/26" or "Jul")
      let label = month;
      try {
        const formatted = formatMonthYear(month);
        const parts = formatted.split(' de ');
        if (parts.length === 2) {
          const m = parts[0].substring(0, 3); // "Jul"
          const y = parts[1].substring(2, 4); // "26"
          label = `${m.charAt(0).toUpperCase() + m.slice(1)}/${y}`;
        } else {
          label = formatted;
        }
      } catch (e) {
        // Fallback
      }

      return {
        month,
        name: label, // For chart x-axis
        'Receitas': totalIncome,
        'Despesas': totalExpenses,
        'Saldo': balance,
      };
    });
  };

  const monthlyHistoryData = getMonthlyHistoryData();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Income */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1 z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Receitas</span>
            <p className="text-2xl font-bold font-mono text-emerald-600">{formatCurrency(stats.totalIncome)}</p>
            <p className="text-[10px] text-slate-500 flex items-center gap-1">
              <span className="text-emerald-600 font-bold">R$ {stats.paidIncome.toFixed(2)}</span> recebidos
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <ArrowUpRight className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1 z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Despesas Fixas</span>
            <p className="text-2xl font-bold font-mono text-slate-900">{formatCurrency(stats.totalExpenses)}</p>
            <p className="text-[10px] text-slate-500 flex items-center gap-1">
              <span className="text-amber-600 font-bold">R$ {stats.unpaidExpenses.toFixed(2)}</span> pendentes
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <ArrowDownRight className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Month Balance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1 z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Saldo Mensal</span>
            <p className={`text-2xl font-bold font-mono ${stats.balance >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
              {formatCurrency(stats.balance)}
            </p>
            <p className="text-[10px] text-slate-500">
              Fluxo líquido projetado
            </p>
          </div>
          <div className={`p-3.5 rounded-2xl border ${
            stats.balance >= 0 
              ? 'bg-indigo-50 text-indigo-600 border-indigo-100' 
              : 'bg-red-50 text-red-600 border-red-100'
          }`}>
            <DollarSign className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Quitado Progress */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between relative overflow-hidden">
          <div className="space-y-1.5 z-10 flex-1 pr-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Progresso Despesas</span>
            <div className="flex items-baseline gap-1.5">
              <p className="text-2xl font-bold font-mono text-slate-900">{stats.percentPaid}%</p>
              <span className="text-[10px] text-slate-500 font-medium">pagas</span>
            </div>
            
            {/* ProgressBar */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${stats.percentPaid}%` }}
              />
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
            <Percent className="w-5.5 h-5.5" />
          </div>
        </div>
      </div>

      {/* Sub-navigation Controls inside Dashboard */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-1">
        <button
          onClick={() => setSubTab('geral')}
          className={`py-2.5 px-4 font-semibold text-xs font-display tracking-wide border-b-2 transition-all shrink-0 flex items-center gap-2 ${
            subTab === 'geral'
              ? 'border-indigo-600 text-indigo-600 font-bold bg-indigo-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="w-4 h-4 text-indigo-600" />
          Fluxos Gerais
        </button>
        
        <button
          onClick={() => setSubTab('categorias')}
          className={`py-2.5 px-4 font-semibold text-xs font-display tracking-wide border-b-2 transition-all shrink-0 flex items-center gap-2 ${
            subTab === 'categorias'
              ? 'border-indigo-600 text-indigo-600 font-bold bg-indigo-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tag className="w-4 h-4 text-indigo-600" />
          Despesas por Categoria (Smart)
        </button>
        
        <button
          onClick={() => setSubTab('agenda')}
          className={`py-2.5 px-4 font-semibold text-xs font-display tracking-wide border-b-2 transition-all shrink-0 flex items-center gap-2 ${
            subTab === 'agenda'
              ? 'border-indigo-600 text-indigo-600 font-bold bg-indigo-50/50 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4 text-indigo-600" />
          Agenda de Vencimentos
        </button>
      </div>

      {/* Tab content switcher */}
      {subTab === 'geral' && (
        <div className="space-y-6">
          {/* Charts Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Bar Chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-2">
              <h3 className="text-sm font-bold font-display text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2">
                <ClipboardList className="w-4.5 h-4.5 text-indigo-600" />
                Fluxo de Caixa Mensal (Receitas vs Despesas)
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={cashFlowData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                  >
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }}
                      labelStyle={{ color: '#4f46e5', fontWeight: 'bold' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="Receitas (+)" fill="#10b981" radius={[8, 8, 0, 0]} barSize={50} />
                    <Bar dataKey="Despesas (-)" fill="#4f46e5" radius={[8, 8, 0, 0]} barSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payments Donut Chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold font-display text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Percent className="w-4.5 h-4.5 text-indigo-600" />
                  Status das Despesas
                </h3>
                
                {hasExpenses ? (
                  <div className="h-44 w-full flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseStatusData.filter(d => d.value > 0)}
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {expenseStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold font-mono text-slate-800">{stats.percentPaid}%</span>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pagas</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-44 w-full flex flex-col items-center justify-center text-center">
                    <HelpCircle className="w-8 h-8 text-slate-300 mb-2" />
                    <span className="text-xs text-slate-400">Sem despesas registradas</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 mt-2">
                <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    Total Pago
                  </span>
                  <span className="font-mono font-bold text-indigo-600">{formatCurrency(stats.paidExpenses)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    Pendente
                  </span>
                  <span className="font-mono font-bold text-amber-500">{formatCurrency(stats.unpaidExpenses)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Historical Line Chart */}
          {monthlyHistoryData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-sm font-bold font-display text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4.5 h-4.5 text-indigo-600" />
                    Evolução Mensal (Receitas vs Despesas vs Saldo)
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Acompanhe o histórico financeiro e o saldo líquido gerado mês a mês.
                  </p>
                </div>
                
                {/* Accrued overall balance across all months */}
                <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-1.5 self-start sm:self-center">
                  <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">Saldo Acumulado Geral:</span>
                  <span className={`font-mono text-xs font-bold ${
                    monthlyHistoryData.reduce((acc, curr) => acc + curr['Saldo'], 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(monthlyHistoryData.reduce((acc, curr) => acc + curr['Saldo'], 0))}
                  </span>
                </div>
              </div>

              <div className="h-64 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyHistoryData}
                    margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#64748b" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(val) => `R$ ${val}`}
                    />
                    <Tooltip
                      formatter={(value: any) => [formatCurrency(Number(value)), '']}
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                      labelStyle={{ color: '#4f46e5', fontWeight: 'bold', fontSize: '11px', marginBottom: '4px' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }} />
                    
                    <Line 
                      type="monotone" 
                      dataKey="Receitas" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 1.5, fill: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Despesas" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={{ r: 4, strokeWidth: 1.5, fill: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Saldo" 
                      stroke="#4f46e5" 
                      strokeWidth={3}
                      dot={{ r: 5, strokeWidth: 2, fill: '#fff' }}
                      activeDot={{ r: 7, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {monthlyHistoryData.length === 1 && (
                <p className="text-[10px] text-center text-slate-500 mt-4 italic font-medium">
                  💡 Dica: Adicione lançamentos em outros meses (utilizando o seletor de meses no topo) para visualizar a curva de evolução ao longo do tempo!
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {subTab === 'categorias' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pie/Donut Chart */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-1 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold font-display text-slate-800 mb-1 uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-4.5 h-4.5 text-indigo-600" />
                  Divisão de Gastos
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Classificação automática baseada na descrição dos lançamentos.
                </p>

                {totalCategoryExpenses > 0 ? (
                  <div className="h-56 w-full flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                          onClick={(data) => {
                            // Toggle category selection
                            const activeKey = (data as any).key || (data as any).payload?.key;
                            if (activeKey) {
                              setSelectedCategory(selectedCategory === activeKey ? null : activeKey);
                            }
                          }}
                          className="cursor-pointer"
                        >
                          {categoryChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color} 
                              stroke={selectedCategory === entry.key ? '#000' : 'none'}
                              strokeWidth={selectedCategory === entry.key ? 2 : 0}
                              opacity={selectedCategory && selectedCategory !== entry.key ? 0.4 : 1}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [formatCurrency(Number(value)), '']}
                          contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
                      <span className="text-xl font-bold font-mono text-slate-850">
                        {formatCurrency(
                          selectedCategory 
                            ? (categoryTotals[selectedCategory] || 0) 
                            : totalCategoryExpenses
                        )}
                      </span>
                      <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider mt-0.5 truncate max-w-full">
                        {selectedCategory 
                          ? CATEGORIES.find(c => c.key === selectedCategory)?.label 
                          : 'Total Despesas'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-56 w-full flex flex-col items-center justify-center text-center">
                    <HelpCircle className="w-10 h-10 text-slate-300 mb-2" />
                    <span className="text-xs text-slate-400">Sem despesas cadastradas neste mês</span>
                  </div>
                )}
              </div>

              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="mt-4 text-center text-xs text-indigo-600 hover:text-indigo-700 font-bold bg-indigo-50 hover:bg-indigo-100 py-1.5 rounded-lg transition-colors"
                >
                  Limpar Filtro de Categoria
                </button>
              )}
            </div>

            {/* Category details progress bars list */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm lg:col-span-2">
              <h3 className="text-sm font-bold font-display text-slate-800 mb-4 uppercase tracking-wider">
                Resumo por Categoria
              </h3>
              
              {totalCategoryExpenses > 0 ? (
                <div className="space-y-4">
                  {categoryChartData.map((cat) => {
                    const percentage = totalCategoryExpenses > 0 ? Math.round((cat.value / totalCategoryExpenses) * 100) : 0;
                    const isSelected = selectedCategory === cat.key;
                    return (
                      <div 
                        key={cat.key}
                        onClick={() => setSelectedCategory(selectedCategory === cat.key ? null : cat.key)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-indigo-50 border-indigo-200 shadow-2xs' 
                            : selectedCategory 
                              ? 'bg-slate-50/30 border-slate-100 opacity-60'
                              : 'bg-slate-50 border-slate-150 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                          <span className="text-slate-800 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                            {cat.name}
                          </span>
                          <span className="text-slate-500 font-medium">
                            <strong className="text-slate-900 font-mono">{formatCurrency(cat.value)}</strong>
                            {` (${percentage}%)`}
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: cat.color
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center border border-dashed border-slate-200 rounded-2xl">
                  <HelpCircle className="w-8 h-8 text-slate-300 mb-2" />
                  <span className="text-xs text-slate-500 font-medium font-display">Adicione despesas na aba "Lançamentos" para ver a análise por categorias!</span>
                </div>
              )}
            </div>
          </div>

          {/* List of items matching category */}
          {totalCategoryExpenses > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold font-display text-slate-800 mb-4 uppercase tracking-wider flex items-center justify-between">
                <span>
                  {selectedCategory 
                    ? `Lançamentos em: ${CATEGORIES.find(c => c.key === selectedCategory)?.label}` 
                    : 'Todos os Lançamentos de Despesas'}
                </span>
                <span className="text-xs font-mono font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {currentExpenses.filter(t => selectedCategory ? getCategoryForTransaction(t.name).key === selectedCategory : true).length} itens
                </span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                      <th className="pb-2">Descrição</th>
                      <th className="pb-2">Vencimento</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentExpenses
                      .filter(t => selectedCategory ? getCategoryForTransaction(t.name).key === selectedCategory : true)
                      .map((t) => {
                        const cat = getCategoryForTransaction(t.name);
                        return (
                          <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/50 text-xs">
                            <td className="py-2.5 font-semibold text-slate-800">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                {t.name}
                              </div>
                            </td>
                            <td className="py-2.5 font-mono text-slate-500">
                              {t.dueDate ? t.dueDate.split('-').reverse().join('/') : '-'}
                            </td>
                            <td className="py-2.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                t.isPaid 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                {t.isPaid ? 'Pago' : 'Pendente'}
                              </span>
                            </td>
                            <td className="py-2.5 font-mono font-bold text-slate-900 text-right">
                              {formatCurrency(t.amount)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {subTab === 'agenda' && (
        <div className="space-y-6">
          {/* Agenda Summary Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Overdue badge */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contas Atrasadas</span>
                <p className="text-base font-bold font-mono text-rose-600">
                  {unpaidOverdue.length} {unpaidOverdue.length === 1 ? 'fatura' : 'faturas'}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  Total: <strong className="font-mono text-rose-600">{formatCurrency(unpaidOverdue.reduce((acc, curr) => acc + curr.amount, 0))}</strong>
                </p>
              </div>
            </div>

            {/* Today due badge */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                <Clock className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vencem Hoje</span>
                <p className="text-base font-bold font-mono text-amber-600">
                  {unpaidDueToday.length} {unpaidDueToday.length === 1 ? 'fatura' : 'faturas'}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  Total: <strong className="font-mono text-amber-600">{formatCurrency(unpaidDueToday.reduce((acc, curr) => acc + curr.amount, 0))}</strong>
                </p>
              </div>
            </div>

            {/* Future due badge */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">A Vencer (Futuras)</span>
                <p className="text-base font-bold font-mono text-indigo-600">
                  {unpaidFuture.length} {unpaidFuture.length === 1 ? 'fatura' : 'faturas'}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  Total: <strong className="font-mono text-indigo-600">{formatCurrency(unpaidFuture.reduce((acc, curr) => acc + curr.amount, 0))}</strong>
                </p>
              </div>
            </div>

            {/* Paid badge */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Contas Pagas</span>
                <p className="text-base font-bold font-mono text-emerald-600">
                  {paidBills.length} {paidBills.length === 1 ? 'fatura' : 'faturas'}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  Total: <strong className="font-mono text-emerald-600">{formatCurrency(paidBills.reduce((acc, curr) => acc + curr.amount, 0))}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Filtering buttons */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-slate-50 border border-slate-150 p-3 rounded-2xl">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
                <Filter className="w-3.5 h-3.5" />
                Filtrar:
              </span>
              {[
                { key: 'todas', label: 'Todas as Contas' },
                { key: 'pendentes', label: 'Apenas Pendentes' },
                { key: 'atrasadas', label: 'Apenas Atrasadas' },
                { key: 'pagas', label: 'Apenas Pagas' }
              ].map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => setAgendaFilter(btn.key as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    agendaFilter === btn.key 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            <span className="text-[10px] text-slate-400 font-medium">
              Data de Referência (Hoje): <strong className="text-slate-700 font-mono font-bold">{todayStr.split('-').reverse().join('/')}</strong>
            </span>
          </div>

          {/* Calendar/Due Date Agenda Timeline */}
          {filteredSortedDays.length > 0 ? (
            <div className="space-y-4">
              {filteredSortedDays.map((day) => {
                const dayTxs = filteredGroupedDays[day];
                // Determine general state of the day (has overdue unpaid bills -> red, all paid -> green, upcoming unpaid -> amber)
                const hasDayOverdue = dayTxs.some(t => !t.isPaid && t.dueDate && t.dueDate < todayStr);
                const allDayPaid = dayTxs.every(t => t.isPaid);
                const dayColorClass = allDayPaid 
                  ? 'border-emerald-500 bg-emerald-50/10' 
                  : hasDayOverdue 
                    ? 'border-rose-500 bg-rose-50/10' 
                    : 'border-amber-500 bg-amber-50/10';

                return (
                  <div 
                    key={day} 
                    className={`border-l-4 rounded-r-2xl border-y border-r border-slate-200 bg-white p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all shadow-2xs ${dayColorClass}`}
                  >
                    {/* Day Badge */}
                    <div className={`w-14 h-14 shrink-0 rounded-2xl flex flex-col items-center justify-center border font-display ${
                      allDayPaid 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                        : hasDayOverdue 
                          ? 'bg-rose-50 border-rose-200 text-rose-700' 
                          : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}>
                      <span className="text-xs uppercase font-extrabold tracking-wider leading-none">Dia</span>
                      <span className="text-2xl font-black font-mono leading-none mt-1">{day}</span>
                    </div>

                    {/* Due Items inside the day */}
                    <div className="flex-1 space-y-3 w-full">
                      {dayTxs.map((t) => {
                        const isOverdue = !t.isPaid && t.dueDate && t.dueDate < todayStr;
                        return (
                          <div 
                            key={t.id} 
                            className="flex items-center justify-between gap-3 text-xs border-b border-slate-50 last:border-none pb-2 last:pb-0"
                          >
                            <div className="flex items-center gap-2.5">
                              {onTogglePaid ? (
                                <button
                                  type="button"
                                  onClick={() => onTogglePaid(t.id)}
                                  className={`w-5.5 h-5.5 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
                                    t.isPaid 
                                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs' 
                                      : isOverdue
                                        ? 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-600'
                                        : 'bg-slate-50 hover:bg-slate-100 border-slate-250 text-slate-500'
                                  }`}
                                  title={t.isPaid ? "Marcar como pendente" : "Marcar como pago"}
                                >
                                  {t.isPaid && <CheckCircle2 className="w-4.5 h-4.5" />}
                                </button>
                              ) : (
                                <span className={`w-2.5 h-2.5 rounded-full ${t.isPaid ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                              )}
                              
                              <div className="space-y-0.5">
                                <span className={`font-semibold text-slate-800 ${t.isPaid ? 'line-through text-slate-400 font-medium' : ''}`}>
                                  {t.name}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-400 font-medium font-mono">
                                    Vencimento: {t.dueDate?.split('-').reverse().join('/')}
                                  </span>
                                  {isOverdue && (
                                    <span className="text-[9px] uppercase font-bold text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-100 animate-pulse">
                                      Atrasado
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <span className={`font-mono font-bold text-slate-900 ${t.isPaid ? 'text-slate-400 font-medium line-through' : ''}`}>
                              {formatCurrency(t.amount)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-center bg-white border border-slate-200 rounded-2xl p-6">
              <Calendar className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-800">Nenhum lançamento de despesa encontrado</p>
              <p className="text-xs text-slate-500 mt-1">Nenhuma fatura com data de vencimento neste mês atende ao filtro ativo.</p>
            </div>
          )}
        </div>
      )}

      {/* Master Templates Management Section (Automatic copy templates) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold font-display text-slate-800 flex items-center gap-2">
              <Power className="w-5 h-5 text-indigo-600" />
              Gastos Fixos Mensais (Modelos Recorrentes)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Estes itens serão cadastrados <strong>automaticamente</strong> toda vez que você iniciar um novo mês no planejador financeiro.
            </p>
          </div>
          
          <button
            onClick={() => setShowAddTemplate(!showAddTemplate)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-display text-xs transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Item Fixo
          </button>
        </div>

        {/* Banner with sync action if there are active templates not in this month */}
        {missingTemplates.length > 0 && onApplyTemplatesToCurrentMonth && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-800"
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Modelos recorrentes não aplicados ao mês atual</p>
                <p className="text-amber-700 mt-0.5 leading-relaxed">
                  Existem <strong>{missingTemplates.length} modelo(s) fixo(s) ativo(s)</strong> que ainda não constam como lançamentos em {formatMonthYear(currentMonth)} (pois este mês já possuía lançamentos quando esses modelos foram criados ou ativados).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onApplyTemplatesToCurrentMonth}
              className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold transition-all active:scale-95 shrink-0 whitespace-nowrap shadow-sm shadow-amber-600/10 cursor-pointer"
            >
              Lançar no mês atual
            </button>
          </motion.div>
        )}

        {/* Add Template Inline Form */}
        {showAddTemplate && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleTemplateSubmit}
            className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3 mb-6"
          >
            {/* Name */}
            <div className="md:col-span-2">
              <input
                type="text"
                required
                placeholder="Descrição (Ex: Internet, Luz, Aluguel)"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            {/* Amount */}
            <div>
              <input
                type="text"
                required
                placeholder="Valor (R$)"
                value={templateAmount}
                onChange={(e) => setTemplateAmount(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-850 font-mono focus:outline-none focus:border-indigo-500/50"
              />
            </div>
            {/* Actions / Select Type */}
            <div className="flex gap-2">
              <select
                value={templateType}
                onChange={(e: any) => setTemplateType(e.target.value)}
                className="bg-white border border-slate-200 text-slate-700 text-xs rounded-lg p-2 focus:outline-none w-full"
              >
                <option value="despesa">Despesa</option>
                <option value="receita">Receita</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Salvar
              </button>
            </div>
          </motion.form>
        )}

        {/* Templates list table */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
          {templates.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Nenhum modelo fixo cadastrado. Clique em "Cadastrar Item Fixo" acima para começar!
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-bold font-display">
                  <th className="p-3.5 pl-4">Nome / Descrição</th>
                  <th className="p-3.5">Tipo</th>
                  <th className="p-3.5">Valor Padrão</th>
                  <th className="p-3.5">Status Automatização</th>
                  <th className="p-3.5 text-right pr-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {templates.map((template) => (
                  <tr key={template.id} className="hover:bg-slate-50/50">
                    <td className="p-3.5 pl-4 font-semibold text-slate-800">{template.name}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        template.type === 'receita' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        {template.type === 'receita' ? 'Receita' : 'Despesa'}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono font-medium text-slate-800">{formatCurrency(template.amount)}</td>
                    <td className="p-3.5">
                      <button
                        onClick={() => onToggleTemplate(template.id)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                          template.isActive 
                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' 
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                        title={template.isActive ? 'Desativar preenchimento automático' : 'Ativar preenchimento automático'}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${template.isActive ? 'bg-emerald-500' : 'bg-slate-450'}`} />
                        {template.isActive ? 'Ativo todo mês' : 'Pausado'}
                      </button>
                    </td>
                    <td className="p-3.5 text-right pr-4">
                      <button
                        onClick={() => {
                          if (confirm(`Tem certeza que deseja excluir o modelo de "${template.name}"? Isso não afetará os lançamentos dos meses já criados.`)) {
                            onDeleteTemplate(template.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all inline-flex"
                        title="Remover modelo"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
