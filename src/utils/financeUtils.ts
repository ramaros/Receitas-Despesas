import { Transaction, FixedTemplate, MonthlyStats, AppSettings } from '../types';

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatMonthYear = (monthStr: string): string => {
  // Input: YYYY-MM (e.g. '2026-07') -> output: Julho de 2026
  if (!monthStr || !monthStr.includes('-')) return monthStr;
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 15);
  const formatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
  const formatted = formatter.format(date);
  // Capitalize first letter
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

export const getMonthOptions = (): { value: string; label: string }[] => {
  const options: { value: string; label: string }[] = [];
  const currentDate = new Date();
  
  // Go 6 months back and 6 months forward
  for (let i = -6; i <= 6; i++) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 15);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    options.push({
      value,
      label: formatMonthYear(value)
    });
  }
  return options;
};

export const calculateStats = (transactions: Transaction[]): MonthlyStats => {
  let totalIncome = 0;
  let totalExpenses = 0;
  let paidExpenses = 0;
  let unpaidExpenses = 0;
  let paidIncome = 0;
  let unpaidIncome = 0;

  transactions.forEach((t) => {
    if (t.type === 'receita') {
      totalIncome += t.amount;
      if (t.isPaid) {
        paidIncome += t.amount;
      } else {
        unpaidIncome += t.amount;
      }
    } else {
      totalExpenses += t.amount;
      if (t.isPaid) {
        paidExpenses += t.amount;
      } else {
        unpaidExpenses += t.amount;
      }
    }
  });

  const balance = totalIncome - totalExpenses;
  
  // Percent of fixed expenses that are paid
  const totalExpenseItems = transactions.filter(t => t.type === 'despesa').length;
  const paidExpenseItems = transactions.filter(t => t.type === 'despesa' && t.isPaid).length;
  const percentPaid = totalExpenseItems > 0 
    ? Math.round((paidExpenseItems / totalExpenseItems) * 100) 
    : 0;

  return {
    totalIncome,
    totalExpenses,
    paidExpenses,
    unpaidExpenses,
    paidIncome,
    unpaidIncome,
    balance,
    percentPaid
  };
};

// Seed data for first-time use
export const defaultFixedTemplates: FixedTemplate[] = [
  { id: 't1', name: 'Aluguel & Condomínio', amount: 1500.00, type: 'despesa', isActive: true, createdAt: Date.now() },
  { id: 't2', name: 'Conta de Energia (Light)', amount: 180.50, type: 'despesa', isActive: true, createdAt: Date.now() },
  { id: 't3', name: 'Internet Banda Larga', amount: 120.00, type: 'despesa', isActive: true, createdAt: Date.now() },
  { id: 't4', name: 'Academia', amount: 99.90, type: 'despesa', isActive: true, createdAt: Date.now() },
  { id: 't5', name: 'Netflix & Spotify', amount: 55.80, type: 'despesa', isActive: true, createdAt: Date.now() },
  { id: 't6', name: 'Salário Principal', amount: 4500.00, type: 'receita', isActive: true, createdAt: Date.now() },
  { id: 't7', name: 'Rendimento de Investimentos', amount: 350.00, type: 'receita', isActive: true, createdAt: Date.now() },
];

export const defaultTransactions = (monthYear: string): Transaction[] => {
  return [
    {
      id: `${monthYear}-1`,
      name: 'Salário Principal',
      amount: 4500.00,
      type: 'receita',
      isPaid: true,
      monthYear,
      isRecurring: true,
      createdAt: Date.now() - 5000
    },
    {
      id: `${monthYear}-2`,
      name: 'Rendimento de Investimentos',
      amount: 350.00,
      type: 'receita',
      isPaid: false,
      monthYear,
      isRecurring: true,
      createdAt: Date.now() - 4000
    },
    {
      id: `${monthYear}-3`,
      name: 'Aluguel & Condomínio',
      amount: 1500.00,
      type: 'despesa',
      isPaid: true,
      monthYear,
      isRecurring: true,
      createdAt: Date.now() - 3000
    },
    {
      id: `${monthYear}-4`,
      name: 'Conta de Energia (Light)',
      amount: 180.50,
      type: 'despesa',
      isPaid: false,
      monthYear,
      isRecurring: true,
      createdAt: Date.now() - 2000
    },
    {
      id: `${monthYear}-5`,
      name: 'Internet Banda Larga',
      amount: 120.00,
      type: 'despesa',
      isPaid: true,
      monthYear,
      isRecurring: true,
      createdAt: Date.now() - 1000
    },
    {
      id: `${monthYear}-6`,
      name: 'Academia',
      amount: 99.90,
      type: 'despesa',
      isPaid: false,
      monthYear,
      isRecurring: true,
      createdAt: Date.now()
    }
  ];
};

export const getInitialData = () => {
  const currentMonthYear = new Date().toISOString().substring(0, 7); // e.g. "2026-07"
  
  const localTransactions = localStorage.getItem('fin_transactions');
  const localTemplates = localStorage.getItem('fin_templates');
  const localSettings = localStorage.getItem('fin_settings');

  let transactions: Transaction[] = [];
  let templates: FixedTemplate[] = [];
  let settings: AppSettings = {
    pin: null,
    isPinEnabled: false,
    isLocked: false,
    lastActiveMonth: currentMonthYear,
    autoCloneFixed: true
  };

  if (localTransactions) {
    try {
      transactions = JSON.parse(localTransactions);
    } catch (e) {
      console.error(e);
    }
  }

  if (localTemplates) {
    try {
      templates = JSON.parse(localTemplates);
    } catch (e) {
      console.error(e);
    }
  } else {
    templates = defaultFixedTemplates;
    localStorage.setItem('fin_templates', JSON.stringify(templates));
  }

  if (localSettings) {
    try {
      settings = JSON.parse(localSettings);
      // In case the app is loaded fresh, keep isLocked if PIN is active
      if (settings.isPinEnabled && settings.pin) {
        settings.isLocked = true;
      }
    } catch (e) {
      console.error(e);
    }
  }

  // If transactions are empty and not initialized before, seed the current month
  const isInitialized = localStorage.getItem('fin_initialized') === 'true';
  if (transactions.length === 0 && !isInitialized) {
    transactions = defaultTransactions(currentMonthYear);
    localStorage.setItem('fin_transactions', JSON.stringify(transactions));
    localStorage.setItem('fin_initialized', 'true');
  }

  return { transactions, templates, settings };
};

// Check if a month is empty and automatically clone active fixed templates
export const checkAndAutoCloneFixedItems = (
  monthYear: string,
  allTransactions: Transaction[],
  templates: FixedTemplate[]
): { clonedTransactions: Transaction[]; message?: string } => {
  // Check if there are already transactions for this specific month
  const monthExists = allTransactions.some(t => t.monthYear === monthYear);
  
  if (monthExists) {
    return { clonedTransactions: allTransactions };
  }

  // If no transactions exist for this month, copy from active fixed templates list!
  const activeTemplates = templates.filter(t => t.isActive);
  
  if (activeTemplates.length === 0) {
    return { clonedTransactions: allTransactions };
  }

  const newClonedItems: Transaction[] = activeTemplates.map((template, idx) => ({
    id: `cloned-${monthYear}-${template.id}-${Date.now()}-${idx}`,
    name: template.name,
    amount: template.amount,
    type: template.type,
    isPaid: false, // Clone always starts as unpaid ("não pago")
    monthYear,
    isRecurring: true,
    createdAt: Date.now() + idx
  }));

  const updatedTransactions = [...allTransactions, ...newClonedItems];
  
  return {
    clonedTransactions: updatedTransactions,
    message: `Planejamento de ${formatMonthYear(monthYear)} inicializado! ${newClonedItems.length} itens fixos cadastrados automaticamente.`
  };
};
