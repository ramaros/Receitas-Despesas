import React, { useState, useEffect } from 'react';
import { Calendar, Wallet, ListFilter, ShieldAlert, Sparkles, Plus, ChevronLeft, ChevronRight, CheckCircle2, Lock, Key, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types & Helpers
import { Transaction, FixedTemplate, AppSettings, TransactionType } from './types';
import {
  formatCurrency,
  formatMonthYear,
  getMonthOptions,
  calculateStats,
  getInitialData,
  checkAndAutoCloneFixedItems,
} from './utils/financeUtils';

// Subcomponents
import Dashboard from './components/Dashboard';
import MonthlyList from './components/MonthlyList';
import BackupSync from './components/BackupSync';
import TransactionForm from './components/TransactionForm';
import PinLock from './components/PinLock';
import AlertsManager from './components/AlertsManager';

export default function App() {
  // Database States
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [templates, setTemplates] = useState<FixedTemplate[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    pin: null,
    isPinEnabled: false,
    isLocked: false,
    lastActiveMonth: new Date().toISOString().substring(0, 7),
    autoCloneFixed: true,
  });

  // UI/Navigation States
  const [currentMonth, setCurrentMonth] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'painel' | 'lancamentos' | 'backup' | 'alertas'>('painel');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  // Custom Toast Message
  const [toast, setToast] = useState<string | null>(null);

  // Month options for dropdown selector (6 months back, 6 months forward)
  const monthOptions = getMonthOptions();

  // Load Initial Data once on mount
  useEffect(() => {
    const { transactions: loadedT, templates: loadedTpl, settings: loadedSet } = getInitialData();
    setTransactions(loadedT);
    setTemplates(loadedTpl);
    
    // Default current viewed month to the last active month
    const defaultMonth = loadedSet.lastActiveMonth || new Date().toISOString().substring(0, 7);
    setCurrentMonth(defaultMonth);
    setSettings(loadedSet);
  }, []);

  // Check and trigger auto-cloning whenever the viewed month changes
  useEffect(() => {
    if (!currentMonth || transactions.length === 0 || templates.length === 0) return;

    if (settings.autoCloneFixed) {
      const { clonedTransactions, message } = checkAndAutoCloneFixedItems(
        currentMonth,
        transactions,
        templates
      );

      if (clonedTransactions.length !== transactions.length) {
        setTransactions(clonedTransactions);
        localStorage.setItem('fin_transactions', JSON.stringify(clonedTransactions));
        
        if (message) {
          triggerToast(message);
        }
      }
    }

    // Save viewed month as last active
    const updatedSettings = { ...settings, lastActiveMonth: currentMonth };
    setSettings(updatedSettings);
    localStorage.setItem('fin_settings', JSON.stringify(updatedSettings));
  }, [currentMonth, templates]);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  };

  // State Persistence Helpers
  const saveTransactions = (updated: Transaction[]) => {
    setTransactions(updated);
    localStorage.setItem('fin_transactions', JSON.stringify(updated));
  };

  const saveTemplates = (updated: FixedTemplate[]) => {
    setTemplates(updated);
    localStorage.setItem('fin_templates', JSON.stringify(updated));
  };

  const saveSettings = (updated: AppSettings) => {
    setSettings(updated);
    localStorage.setItem('fin_settings', JSON.stringify(updated));
  };

  // Navigation handlers
  const handlePrevMonth = () => {
    const currentIndex = monthOptions.findIndex(o => o.value === currentMonth);
    if (currentIndex > 0) {
      setCurrentMonth(monthOptions[currentIndex - 1].value);
    }
  };

  const handleNextMonth = () => {
    const currentIndex = monthOptions.findIndex(o => o.value === currentMonth);
    if (currentIndex < monthOptions.length - 1) {
      setCurrentMonth(monthOptions[currentIndex + 1].value);
    }
  };

  // Transaction Operations
  const handleAddOrEditTransaction = (formData: Omit<Transaction, 'id' | 'createdAt'> & { id?: string }) => {
    if (formData.id) {
      // Editing
      const updated = transactions.map((t) =>
        t.id === formData.id
          ? { ...t, ...formData, amount: formData.amount }
          : t
      );
      saveTransactions(updated);
      triggerToast('Lançamento atualizado com sucesso!');
    } else {
      // Adding new
      const newTransaction: Transaction = {
        ...formData,
        id: `t-${Date.now()}`,
        createdAt: Date.now(),
      };
      const updated = [newTransaction, ...transactions];
      saveTransactions(updated);

      // If marked as recurring and not already in templates, optionally add to templates!
      if (formData.isRecurring) {
        const templateExists = templates.some(
          tpl => tpl.name.toLowerCase() === formData.name.toLowerCase() && tpl.type === formData.type
        );
        if (!templateExists) {
          const newTemplate: FixedTemplate = {
            id: `tpl-${Date.now()}`,
            name: formData.name,
            amount: formData.amount,
            type: formData.type,
            isActive: true,
            createdAt: Date.now(),
          };
          saveTemplates([...templates, newTemplate]);
        }
      }
      triggerToast('Novo lançamento registrado!');
    }
  };

  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    saveTransactions(updated);
    triggerToast('Lançamento excluído.');
  };

  const handleTogglePaid = (id: string) => {
    const updated = transactions.map((t) =>
      t.id === id ? { ...t, isPaid: !t.isPaid } : t
    );
    saveTransactions(updated);
  };

  // Fixed Templates Operations
  const handleAddTemplate = (name: string, amount: number, type: 'receita' | 'despesa') => {
    const newTemplate: FixedTemplate = {
      id: `tpl-${Date.now()}`,
      name,
      amount,
      type,
      isActive: true,
      createdAt: Date.now(),
    };
    saveTemplates([...templates, newTemplate]);
    triggerToast('Novo modelo fixo cadastrado para automação!');
  };

  const handleToggleTemplate = (id: string) => {
    const updated = templates.map((tpl) =>
      tpl.id === id ? { ...tpl, isActive: !tpl.isActive } : tpl
    );
    saveTemplates(updated);
    triggerToast('Configuração de automação atualizada.');
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = templates.filter(tpl => tpl.id !== id);
    saveTemplates(updated);
    triggerToast('Modelo fixo removido.');
  };

  // PIN Operations
  const handleSetupPin = (newPin: string) => {
    const updated = {
      ...settings,
      pin: newPin,
      isPinEnabled: true,
      isLocked: false,
    };
    saveSettings(updated);
  };

  const handleDisablePin = () => {
    const updated = {
      ...settings,
      pin: null,
      isPinEnabled: false,
      isLocked: false,
    };
    saveSettings(updated);
    triggerToast('Bloqueio por PIN desativado.');
  };

  const handleLockApp = () => {
    setSettings((prev) => {
      if (prev.isPinEnabled && prev.pin) {
        const updated = { ...prev, isLocked: true };
        localStorage.setItem('fin_settings', JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
  };

  const handleUnlockApp = () => {
    setSettings((prev) => {
      const updated = { ...prev, isLocked: false };
      localStorage.setItem('fin_settings', JSON.stringify(updated));
      return updated;
    });
    triggerToast('Acesso liberado.');
  };

  // Backup Import Action
  const handleImportData = (importedTransactions: Transaction[], importedTemplates: FixedTemplate[]) => {
    // Merge or overwrite? Let's overwrite local for safety of restoring exact backups
    saveTransactions(importedTransactions);
    saveTemplates(importedTemplates);
    triggerToast('Dados importados com sucesso!');
  };

  // Refresh data action
  const handleRefreshLocalData = () => {
    const { transactions: loadedT, templates: loadedTpl, settings: loadedSet } = getInitialData();
    setTransactions(loadedT);
    setTemplates(loadedTpl);
    setSettings(loadedSet);
  };

  // Inactivity Lock Timer: Locks app after 2 minutes of user inactivity
  const lastActivityTime = React.useRef<number>(Date.now());

  useEffect(() => {
    if (!settings.isPinEnabled || !settings.pin || settings.isLocked) return;

    const handleActivity = () => {
      lastActivityTime.current = Date.now();
    };

    // Track user active states
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Check every 5 seconds if elapsed time > 2 minutes (120000 ms)
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityTime.current;
      if (elapsed >= 120000) {
        handleLockApp();
      }
    }, 5000);

    // Lock also when returning from background/tab switch after inactivity
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const elapsed = Date.now() - lastActivityTime.current;
        if (elapsed >= 120000) {
          handleLockApp();
        } else {
          lastActivityTime.current = Date.now();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [settings.isPinEnabled, settings.pin, settings.isLocked]);

  // Stats calculation
  const currentMonthTransactions = transactions.filter(t => t.monthYear === currentMonth);
  const stats = calculateStats(currentMonthTransactions);

  // Alert count for tab notification badge
  const todayStr = new Date().toISOString().substring(0, 10);
  const todayDate = new Date(todayStr + 'T12:00:00');
  const alertCount = transactions.filter((t) => {
    if (t.type !== 'despesa' || t.isPaid || !t.dueDate || t.monthYear !== currentMonth) return false;
    const due = new Date(t.dueDate + 'T12:00:00');
    const diffTime = due.getTime() - todayDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 3; // within 3 days or already overdue
  }).length;

  // If application is locked with PIN, only show Lock screen
  if (settings.isPinEnabled && settings.isLocked && settings.pin) {
    return (
      <PinLock
        storedPin={settings.pin}
        isPinEnabled={settings.isPinEnabled}
        isLocked={settings.isLocked}
        onUnlock={handleUnlockApp}
        onSetupPin={handleSetupPin}
        onDisablePin={handleDisablePin}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16 flex flex-col">
      {/* Decorative subtle ambient lights */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-10 right-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Header / Top navigation bar */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Wallet className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-sm sm:text-base font-bold font-display tracking-tight text-slate-900 leading-tight">
                Controle de Gastos Fixos
              </h1>
              <p className="text-[10px] text-slate-500 font-medium">
                Planejamento e Receitas Mensais
              </p>
            </div>
          </div>

          {/* Center month selector with Prev/Next buttons */}
          <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 shrink-0">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-950 transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              className="bg-transparent border-none text-slate-800 text-xs sm:text-sm font-semibold font-display px-2 py-1 focus:outline-none cursor-pointer"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-white text-slate-800 text-xs">
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 hover:text-slate-950 transition-colors"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick lock or Action */}
          <div className="flex items-center gap-2">
            {settings.isPinEnabled && (
              <button
                onClick={handleLockApp}
                className="p-2 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-all active:scale-95 shrink-0 shadow-xs"
                title="Bloquear aplicativo"
              >
                <Lock className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => {
                setSelectedTransaction(null);
                setIsFormOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-display text-xs transition-all shadow-md shadow-indigo-600/10 active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Registro</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Body */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* Quick info banner if month is initialized */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 text-xs text-indigo-700 flex items-center gap-2.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-indigo-600" />
              <p className="font-semibold leading-relaxed">{toast}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab navigation selector */}
        <div className="flex border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('painel')}
            className={`py-3 px-5 font-semibold text-xs sm:text-sm font-display tracking-wide border-b-2 transition-all shrink-0 ${
              activeTab === 'painel'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Resumo & Fluxo
          </button>
          
          <button
            onClick={() => setActiveTab('lancamentos')}
            className={`py-3 px-5 font-semibold text-xs sm:text-sm font-display tracking-wide border-b-2 transition-all shrink-0 ${
              activeTab === 'lancamentos'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Lançamentos ({currentMonthTransactions.length})
          </button>
          
          <button
            onClick={() => setActiveTab('backup')}
            className={`py-3 px-5 font-semibold text-xs sm:text-sm font-display tracking-wide border-b-2 transition-all shrink-0 ${
              activeTab === 'backup'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Backup & Segurança
          </button>

          <button
            onClick={() => setActiveTab('alertas')}
            className={`py-3 px-5 font-semibold text-xs sm:text-sm font-display tracking-wide border-b-2 transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === 'alertas'
                ? 'border-indigo-600 text-indigo-600 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Alertas & Contatos
            {alertCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold flex items-center justify-center animate-pulse">
                {alertCount}
              </span>
            )}
          </button>
        </div>

        {/* Dynamic content rendering based on active tab */}
        <div className="pt-2">
          {activeTab === 'painel' && (
            <Dashboard
              transactions={transactions}
              templates={templates}
              stats={stats}
              onAddTransaction={() => {
                setSelectedTransaction(null);
                setIsFormOpen(true);
              }}
              onAddTemplate={handleAddTemplate}
              onToggleTemplate={handleToggleTemplate}
              onDeleteTemplate={handleDeleteTemplate}
            />
          )}

          {activeTab === 'lancamentos' && (
            <MonthlyList
              transactions={currentMonthTransactions}
              onTogglePaid={handleTogglePaid}
              onEdit={(t) => {
                setSelectedTransaction(t);
                setIsFormOpen(true);
              }}
              onDelete={handleDeleteTransaction}
            />
          )}

          {activeTab === 'backup' && (
            <div className="space-y-6">
              {/* Sync and JSON backup controls */}
              <BackupSync
                transactions={transactions}
                templates={templates}
                onImportData={handleImportData}
                onRefreshLocalData={handleRefreshLocalData}
              />

              {/* PIN Settings card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold font-display text-slate-900 mb-3 flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-600" />
                  Segurança por PIN
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  Adicione uma camada extra de proteção. Com o bloqueio ativado, seus dados financeiros só poderão ser visualizados após digitar o PIN de 4 dígitos.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Lock info */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Status Atual
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${settings.isPinEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className="text-sm font-bold text-slate-850">
                        {settings.isPinEnabled ? 'Bloqueio de PIN Ativado' : 'Sem Bloqueio'}
                      </span>
                    </div>
                    {settings.isPinEnabled && (
                      <p className="text-xs text-slate-500">
                        O aplicativo solicitará seu código de acesso em todas as novas sessões ou ao clicar no cadeado do cabeçalho.
                      </p>
                    )}
                  </div>

                  {/* PIN setup pad */}
                  <div>
                    <PinLock
                      storedPin={settings.pin}
                      isPinEnabled={settings.isPinEnabled}
                      isLocked={settings.isLocked}
                      onUnlock={() => {}}
                      onSetupPin={handleSetupPin}
                      onDisablePin={handleDisablePin}
                      isSetupMode={true}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'alertas' && (
            <AlertsManager
              transactions={transactions}
              currentMonth={currentMonth}
              triggerToast={triggerToast}
            />
          )}
        </div>
      </main>

      {/* Transaction Entry Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <TransactionForm
            isOpen={isFormOpen}
            onClose={() => {
              setIsFormOpen(false);
              setSelectedTransaction(null);
            }}
            onSubmit={handleAddOrEditTransaction}
            onDelete={handleDeleteTransaction}
            currentMonthYear={currentMonth}
            editTransaction={selectedTransaction}
          />
        )}
      </AnimatePresence>

      {/* Safe bottom margin */}
      <footer className="mt-auto py-6 border-t border-slate-200 text-center text-xs text-slate-500 font-mono">
        © 2026 Controle de Despesas Fixas e Receitas • Versão 1.0.0
      </footer>
    </div>
  );
}
