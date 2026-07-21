import React, { useState, useEffect } from 'react';
import { X, Calendar, Plus, Save, Trash, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';
import { Transaction, TransactionType } from '../types';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Transaction, 'id' | 'createdAt'> & { id?: string }) => void;
  onDelete?: (id: string) => void;
  currentMonthYear: string;
  editTransaction?: Transaction | null;
}

export default function TransactionForm({
  isOpen,
  onClose,
  onSubmit,
  onDelete,
  currentMonthYear,
  editTransaction = null,
}: TransactionFormProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<TransactionType>('despesa');
  const [isPaid, setIsPaid] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(true); // Default to fixed recurring item since user emphasizes it

  // Initialize form when editing or adding
  useEffect(() => {
    if (editTransaction) {
      setName(editTransaction.name);
      setAmount(editTransaction.amount.toString());
      setType(editTransaction.type);
      setIsPaid(editTransaction.isPaid);
      setDueDate(editTransaction.dueDate || '');
      setIsRecurring(editTransaction.isRecurring);
    } else {
      setName('');
      setAmount('');
      setType('despesa');
      setIsPaid(false);
      
      // Set default due date to 10th of current viewed month or today if in current month
      const today = new Date();
      const currentYearMonthToday = today.toISOString().substring(0, 7);
      if (currentMonthYear === currentYearMonthToday) {
        setDueDate(today.toISOString().substring(0, 10));
      } else {
        setDueDate(`${currentMonthYear}-10`);
      }
      setIsRecurring(true); // Default to fixed as requested
    }
  }, [editTransaction, isOpen, currentMonthYear]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !amount) return;

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    onSubmit({
      id: editTransaction?.id,
      name: name.trim(),
      amount: parsedAmount,
      type,
      isPaid,
      dueDate: dueDate || undefined,
      monthYear: currentMonthYear,
      isRecurring,
    });
    onClose();
  };

  return (
    <div id="transaction-form-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-lg font-bold font-display text-slate-900 flex items-center gap-2">
            <span className={`p-1.5 rounded-lg ${type === 'receita' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
              <DollarSign className="w-5 h-5" />
            </span>
            {editTransaction ? 'Editar Registro' : 'Cadastrar Registro'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type Selector (Receita vs Despesa) */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/50">
            <button
              type="button"
              onClick={() => setType('receita')}
              className={`py-2 px-3 rounded-lg text-sm font-bold font-display transition-all cursor-pointer ${
                type === 'receita'
                  ? 'bg-white text-emerald-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Receita (+)
            </button>
            <button
              type="button"
              onClick={() => setType('despesa')}
              className={`py-2 px-3 rounded-lg text-sm font-bold font-display transition-all cursor-pointer ${
                type === 'despesa'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Despesa Fixa (-)
            </button>
          </div>

          {/* Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Descrição / Nome do Gasto
            </label>
            <input
              type="text"
              required
              placeholder={type === 'receita' ? 'Ex: Salário, Freelance, Investimentos' : 'Ex: Aluguel, Energia, Internet'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all font-sans text-sm"
            />
          </div>

          {/* Amount Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Valor (R$)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-medium text-sm">R$</span>
              <input
                type="text"
                required
                placeholder="0,00"
                value={amount}
                onChange={(e) => {
                  // Allow numbers, commas, and dots
                  const val = e.target.value.replace(/[^0-9.,]/g, '');
                  setAmount(val);
                }}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-850 font-mono placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm"
              />
            </div>
          </div>

          {/* Due Date Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Data de Vencimento / Recebimento
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all text-sm font-sans"
              />
            </div>
          </div>

          {/* Switches/Toggles */}
          <div className="pt-2 space-y-3">
            {/* Payment status */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {type === 'receita' ? 'Já recebido?' : 'Já está pago?'}
                </p>
                <p className="text-xs text-slate-450 font-medium">
                  {isPaid ? (type === 'receita' ? 'Marcado como recebido' : 'Marcado como quitado') : 'Pendente de pagamento'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPaid(!isPaid)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-all cursor-pointer ${
                  isPaid ? 'bg-indigo-600 justify-end' : 'bg-slate-200 justify-start'
                }`}
              >
                <motion.div
                  layout
                  className="bg-white w-4 h-4 rounded-full shadow-xs"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            {/* Fixed Recurring item */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-sm font-bold text-slate-800">Gasto Fixo Mensal?</p>
                <p className="text-xs text-slate-450 font-medium">Cadastrar automaticamente todo mês</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRecurring(!isRecurring)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-all cursor-pointer ${
                  isRecurring ? 'bg-indigo-600 justify-end' : 'bg-slate-200 justify-start'
                }`}
              >
                <motion.div
                  layout
                  className="bg-white w-4 h-4 rounded-full shadow-xs"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-slate-100">
            {editTransaction && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Tem certeza de que deseja deletar este registro?')) {
                    onDelete(editTransaction.id);
                    onClose();
                  }
                }}
                className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:text-rose-700 hover:bg-rose-50 active:scale-95 transition-all text-sm font-semibold font-display flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Trash className="w-4 h-4" />
                Excluir
              </button>
            )}
            
            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-display shadow-xs active:scale-95 transition-all text-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              {editTransaction ? 'Atualizar' : 'Salvar Registro'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
