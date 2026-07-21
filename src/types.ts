export type TransactionType = 'receita' | 'despesa';

export interface Transaction {
  id: string;
  name: string;
  amount: number;
  type: TransactionType;
  isPaid: boolean;
  dueDate?: string; // Format: YYYY-MM-DD
  monthYear: string; // Format: YYYY-MM (e.g., '2026-07')
  isRecurring: boolean; // Marks if it is a recurring fixed item
  createdAt: number;
}

export interface FixedTemplate {
  id: string;
  name: string;
  amount: number;
  type: TransactionType;
  isActive: boolean;
  createdAt: number;
}

export interface AppSettings {
  pin: string | null;
  isPinEnabled: boolean;
  isLocked: boolean;
  lastActiveMonth: string; // Format: YYYY-MM
  autoCloneFixed: boolean; // Auto-clone fixed items on new month load
}

export interface MonthlyStats {
  totalIncome: number;
  totalExpenses: number;
  paidExpenses: number;
  unpaidExpenses: number;
  paidIncome: number;
  unpaidIncome: number;
  balance: number;
  percentPaid: number;
}

export interface Contact {
  id: string;
  name: string;
  type: 'email' | 'whatsapp';
  value: string; // email address or phone number (e.g. +5511999999999)
  createdAt: number;
}

export interface NotificationLog {
  id: string;
  transactionId: string;
  transactionName: string;
  amount: number;
  contactName: string;
  contactValue: string;
  type: 'email' | 'whatsapp';
  sentAt: number;
}

