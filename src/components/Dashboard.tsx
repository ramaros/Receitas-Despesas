import React, { useState } from 'react';
import { DollarSign, ArrowUpRight, ArrowDownRight, CreditCard, ClipboardList, Percent, Plus, HelpCircle, CheckCircle2, AlertCircle, Edit, Trash, Power } from 'lucide-react';
import { motion } from 'motion/react';
import { Transaction, FixedTemplate, MonthlyStats } from '../types';
import { formatCurrency, calculateStats } from '../utils/financeUtils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

interface DashboardProps {
  transactions: Transaction[];
  templates: FixedTemplate[];
  stats: MonthlyStats;
  onAddTransaction: () => void;
  // Templates actions
  onAddTemplate: (name: string, amount: number, type: 'receita' | 'despesa') => void;
  onToggleTemplate: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
}

export default function Dashboard({
  transactions,
  templates,
  stats,
  onAddTransaction,
  onAddTemplate,
  onToggleTemplate,
  onDeleteTemplate,
}: DashboardProps) {
  // Local state for adding a template directly
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateAmount, setTemplateAmount] = useState('');
  const [templateType, setTemplateType] = useState<'receita' | 'despesa'>('despesa');

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
                {/* Centered Stats percentage */}
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

          {/* Mini Legend/Details list */}
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
