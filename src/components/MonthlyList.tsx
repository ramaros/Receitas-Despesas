import React, { useState } from 'react';
import { CheckCircle2, Circle, AlertCircle, Search, Filter, Edit3, Trash2, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/financeUtils';

interface MonthlyListProps {
  transactions: Transaction[];
  onTogglePaid: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
}

export default function MonthlyList({
  transactions,
  onTogglePaid,
  onEdit,
  onDelete,
}: MonthlyListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'receita' | 'despesa'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  const todayStr = new Date().toISOString().substring(0, 10); // "2026-07-20"

  // Filter logic
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' ? true : t.type === typeFilter;
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'paid'
        ? t.isPaid
        : !t.isPaid;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Check if unpaid and past due date
  const isPastDue = (t: Transaction) => {
    if (t.isPaid || !t.dueDate) return false;
    return t.dueDate < todayStr;
  };

  return (
    <div className="space-y-4">
      {/* Filtering and search controls */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar despesa ou receita..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all font-sans"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Type Filter */}
          <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-0.5">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-display transition-all ${
                typeFilter === 'all'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setTypeFilter('receita')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-display transition-all ${
                typeFilter === 'receita'
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Receitas
            </button>
            <button
              onClick={() => setTypeFilter('despesa')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-display transition-all ${
                typeFilter === 'despesa'
                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-100/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Despesas Fixas
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex bg-slate-100 border border-slate-200 rounded-xl p-0.5">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-display transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Status
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-display transition-all ${
                statusFilter === 'paid'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Pagas
            </button>
            <button
              onClick={() => setStatusFilter('unpaid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-display transition-all ${
                statusFilter === 'unpaid'
                  ? 'bg-amber-50 text-amber-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Pendentes
            </button>
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <Filter className="w-10 h-10 text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-700">Nenhum registro encontrado</p>
            <p className="text-xs text-slate-400 mt-1">
              Tente redefinir seus filtros ou cadastrar um novo gasto/receita.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTransactions.map((t) => {
              const overdue = isPastDue(t);
              return (
                <div
                  key={t.id}
                  id={`transaction-item-${t.id}`}
                  className={`flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors group ${
                    t.isPaid ? 'opacity-70' : ''
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Status Checkbox Button - Action Area */}
                    <button
                      onClick={() => onTogglePaid(t.id)}
                      id={`toggle-paid-btn-${t.id}`}
                      className="p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                      title={t.isPaid ? 'Marcar como pendente' : 'Marcar como pago'}
                    >
                      {t.isPaid ? (
                        <CheckCircle2 className="w-5.5 h-5.5 text-emerald-600 fill-emerald-100/30" />
                      ) : overdue ? (
                        <AlertCircle className="w-5.5 h-5.5 text-red-500 animate-pulse-subtle" />
                      ) : (
                        <Circle className="w-5.5 h-5.5 text-slate-300 hover:text-slate-400" />
                      )}
                    </button>

                    {/* Left Icon (Up / Down indicators) */}
                    <span className={`p-2 rounded-xl shrink-0 hidden sm:inline-flex ${
                      t.type === 'receita' 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                        : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                    }`}>
                      {t.type === 'receita' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </span>

                    {/* Transaction Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold truncate ${t.isPaid ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                          {t.name}
                        </p>
                        {t.isRecurring && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            FIXO
                          </span>
                        )}
                      </div>
                      
                      {/* Subtitle (Due Date / Status) */}
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 font-sans">
                        {t.dueDate ? (
                          <span className={`flex items-center gap-1 font-mono ${overdue ? 'text-red-500 font-semibold' : ''}`}>
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(t.dueDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </span>
                        ) : (
                          <span>Sem vencimento</span>
                        )}
                        
                        <span>•</span>
                        
                        <span className={`font-medium ${t.isPaid ? 'text-emerald-600' : overdue ? 'text-red-500' : 'text-amber-500'}`}>
                          {t.isPaid ? 'Pago' : overdue ? 'Atrasado' : 'Pendente'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side (Amount and quick actions) */}
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    <span className={`font-mono text-sm font-bold ${
                      t.type === 'receita' 
                        ? 'text-emerald-600' 
                        : overdue 
                        ? 'text-red-600 font-extrabold bg-red-50 px-2 py-0.5 rounded border border-red-100' 
                        : 'text-slate-800'
                    }`}>
                      {t.type === 'receita' ? '+' : '-'} {formatCurrency(t.amount)}
                    </span>

                    {/* Edit button */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEdit(t)}
                        id={`edit-btn-${t.id}`}
                        className="p-1.5 rounded-lg hover:bg-slate-100 hover:text-indigo-600 text-slate-400 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Editar registro"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Tem certeza de que deseja excluir este gasto?')) {
                            onDelete(t.id);
                          }
                        }}
                        id={`delete-btn-${t.id}`}
                        className="p-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Deletar registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
