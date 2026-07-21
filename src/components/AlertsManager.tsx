import React, { useState, useEffect } from 'react';
import { Bell, BellRing, Phone, Mail, Plus, Trash2, Calendar, DollarSign, Send, History, Check, AlertCircle, ShieldAlert, Sparkles, ExternalLink, MessageSquareCode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, Contact, NotificationLog } from '../types';
import { formatCurrency } from '../utils/financeUtils';

interface AlertsManagerProps {
  transactions: Transaction[];
  currentMonth: string;
  triggerToast: (msg: string) => void;
}

export default function AlertsManager({
  transactions,
  currentMonth,
  triggerToast,
}: AlertsManagerProps) {
  // State for contacts
  const [contacts, setContacts] = useState<Contact[]>([]);
  // State for sent notifications logs
  const [logs, setLogs] = useState<NotificationLog[]>([]);

  // Local inputs
  const [contactName, setContactName] = useState('');
  const [contactType, setContactType] = useState<'whatsapp' | 'email'>('whatsapp');
  const [contactValue, setContactValue] = useState('');

  // Active Alert selection for sending
  const [selectedTxForAlert, setSelectedTxForAlert] = useState<Transaction | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [customMessage, setCustomMessage] = useState('');
  
  // Custom Browser Notification support state
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  // Load from localStorage
  useEffect(() => {
    const storedContacts = localStorage.getItem('fin_contacts');
    if (storedContacts) {
      try {
        setContacts(JSON.parse(storedContacts));
      } catch (e) {
        console.error('Error loading contacts', e);
      }
    }

    const storedLogs = localStorage.getItem('fin_notification_logs');
    if (storedLogs) {
      try {
        setLogs(JSON.parse(storedLogs));
      } catch (e) {
        console.error('Error loading notification logs', e);
      }
    }

    // Check browser notification permission status
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  // Save contacts
  const saveContacts = (updated: Contact[]) => {
    setContacts(updated);
    localStorage.setItem('fin_contacts', JSON.stringify(updated));
  };

  // Save logs
  const saveLogs = (updated: NotificationLog[]) => {
    setLogs(updated);
    localStorage.setItem('fin_notification_logs', JSON.stringify(updated));
  };

  // Ask for browser notification permission
  const requestBrowserNotificationPermission = async () => {
    if (!('Notification' in window)) {
      triggerToast('Notificações no navegador não são suportadas neste dispositivo.');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setBrowserPermission(permission);
      if (permission === 'granted') {
        triggerToast('Permissão de notificações concedida com sucesso!');
        new Notification('FluxoFix Alertas', {
          body: 'Notificações ativadas! Você será avisado sobre vencimentos.',
          icon: 'https://cdn-icons-png.flaticon.com/512/179/179374.png'
        });
      } else {
        triggerToast('Permissão de notificações negada.');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Não foi possível solicitar permissão dentro do sandbox.');
    }
  };

  // Add a new contact
  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactValue.trim()) {
      triggerToast('Preencha o nome e o valor do contato!');
      return;
    }

    // Basic validation
    if (contactType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactValue.trim())) {
        triggerToast('Por favor, insira um e-mail válido.');
        return;
      }
    } else {
      // WhatsApp phone number cleanup (keep only numbers, optional + prefix)
      const phoneClean = contactValue.replace(/[^0-9+]/g, '');
      if (phoneClean.length < 8) {
        triggerToast('Por favor, insira um número de telefone/WhatsApp válido (DDD + número).');
        return;
      }
    }

    const newContact: Contact = {
      id: 'contact_' + Date.now(),
      name: contactName.trim(),
      type: contactType,
      value: contactValue.trim(),
      createdAt: Date.now(),
    };

    const updated = [...contacts, newContact];
    saveContacts(updated);
    
    // Clear form
    setContactName('');
    setContactValue('');
    triggerToast(`Contato "${newContact.name}" adicionado com sucesso!`);
  };

  // Delete contact
  const handleDeleteContact = (id: string, name: string) => {
    if (confirm(`Deseja remover o contato "${name}"?`)) {
      const updated = contacts.filter((c) => c.id !== id);
      saveContacts(updated);
      triggerToast('Contato removido.');
    }
  };

  // Clear log history
  const handleClearLogs = () => {
    if (confirm('Deseja limpar todo o histórico de envios?')) {
      saveLogs([]);
      triggerToast('Histórico limpo.');
    }
  };

  // Find upcoming/overdue unpaid expenses
  const todayStr = new Date().toISOString().substring(0, 10);
  const today = new Date(todayStr + 'T12:00:00');

  const alertExpenses = transactions.filter((t) => {
    if (t.type !== 'despesa' || t.isPaid || !t.dueDate) return false;
    // Keep only transactions in the current viewed month
    return t.monthYear === currentMonth;
  }).map((t) => {
    const due = new Date(t.dueDate + 'T12:00:00');
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let status: 'overdue' | 'today' | 'upcoming' = 'upcoming';
    if (diffDays < 0) {
      status = 'overdue';
    } else if (diffDays === 0) {
      status = 'today';
    } else if (diffDays <= 3) {
      status = 'upcoming';
    } else {
      // Return null and we'll filter out far away ones
      return null;
    }

    return {
      transaction: t,
      daysRemaining: diffDays,
      status,
    };
  }).filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  // Initialize custom message when selection changes
  useEffect(() => {
    if (selectedTxForAlert) {
      const defaultContact = contacts[0]?.id || '';
      setSelectedContactId(defaultContact);

      const statusMsg = selectedTxForAlert.dueDate 
        ? `vence em ${new Date(selectedTxForAlert.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}`
        : 'está pendente de pagamento';

      setCustomMessage(
        `Olá! Lembrete do FluxoFix: A despesa "${selectedTxForAlert.name}" no valor de ${formatCurrency(selectedTxForAlert.amount)} ${statusMsg}. Favor providenciar o pagamento. Obrigado!`
      );
    }
  }, [selectedTxForAlert, contacts]);

  // Handle Dispatch Alert
  const handleDispatchAlert = () => {
    if (!selectedTxForAlert) return;
    const targetContact = contacts.find((c) => c.id === selectedContactId);
    if (!targetContact) {
      triggerToast('Por favor, selecione ou cadastre um contato antes de enviar.');
      return;
    }

    const encodedMsg = encodeURIComponent(customMessage);

    if (targetContact.type === 'whatsapp') {
      // Clean phone number (leave only digits for wa.me API)
      let phoneOnly = targetContact.value.replace(/\D/g, '');
      // Add Brazil country code 55 if not present and length is typical (10 or 11 digits)
      if (phoneOnly.length === 10 || phoneOnly.length === 11) {
        phoneOnly = '55' + phoneOnly;
      }
      
      const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneOnly}&text=${encodedMsg}`;
      window.open(whatsappUrl, '_blank');
    } else {
      // E-mail mailto
      const subject = encodeURIComponent(`Lembrete de Vencimento: ${selectedTxForAlert.name}`);
      const mailtoUrl = `mailto:${targetContact.value}?subject=${subject}&body=${encodedMsg}`;
      window.open(mailtoUrl, '_blank');
    }

    // Add to logs
    const newLog: NotificationLog = {
      id: 'log_' + Date.now(),
      transactionId: selectedTxForAlert.id,
      transactionName: selectedTxForAlert.name,
      amount: selectedTxForAlert.amount,
      contactName: targetContact.name,
      contactValue: targetContact.value,
      type: targetContact.type,
      sentAt: Date.now(),
    };

    const updatedLogs = [newLog, ...logs];
    saveLogs(updatedLogs);

    triggerToast(`Alerta gerado com sucesso para ${targetContact.name}!`);
    setSelectedTxForAlert(null);
  };

  // Simulate pushing a browser notification immediately for all upcoming/overdue
  const triggerBrowserSimulation = () => {
    if (alertExpenses.length === 0) {
      triggerToast('Tudo em dia! Nenhuma despesa pendente vencendo hoje ou atrasada.');
      return;
    }

    // Browser Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const topExpense = alertExpenses[0];
      const title = topExpense.status === 'overdue' 
        ? `⚠️ Alerta de Atraso: ${topExpense.transaction.name}` 
        : `📅 Vencimento Próximo: ${topExpense.transaction.name}`;
      
      new Notification(title, {
        body: `Valor: ${formatCurrency(topExpense.transaction.amount)}. Vencimento: ${new Date(topExpense.transaction.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}`,
        icon: 'https://cdn-icons-png.flaticon.com/512/179/179374.png'
      });
    }

    // Toast/In-app warning
    const message = `Lembrete: Existem ${alertExpenses.length} despesas pendentes vencendo em breve ou já atrasadas neste mês!`;
    triggerToast(message);
  };

  // Generate a customized general month summary alert
  const handleSendMonthlySummary = (contact: Contact) => {
    // Calculate total unpaid expenses
    const unpaidList = transactions.filter(t => t.monthYear === currentMonth && t.type === 'despesa' && !t.isPaid);
    const unpaidSum = unpaidList.reduce((acc, t) => acc + t.amount, 0);
    const totalInc = transactions.filter(t => t.monthYear === currentMonth && t.type === 'receita').reduce((acc, t) => acc + t.amount, 0);

    const message = `Olá ${contact.name}! Aqui está o resumo de ${currentMonth} do FluxoFix: Receitas Totais: ${formatCurrency(totalInc)}. Despesas Pendentes de pagamento: ${unpaidSum > 0 ? formatCurrency(unpaidSum) : 'Nenhuma! 🎉'}. Acesse o painel para verificar todos os lançamentos.`;
    const encodedMsg = encodeURIComponent(message);

    if (contact.type === 'whatsapp') {
      let phoneOnly = contact.value.replace(/\D/g, '');
      if (phoneOnly.length === 10 || phoneOnly.length === 11) phoneOnly = '55' + phoneOnly;
      window.open(`https://api.whatsapp.com/send?phone=${phoneOnly}&text=${encodedMsg}`, '_blank');
    } else {
      const subject = encodeURIComponent(`Resumo Financeiro de ${currentMonth}`);
      window.open(`mailto:${contact.value}?subject=${subject}&body=${encodedMsg}`, '_blank');
    }

    // Create Log
    const newLog: NotificationLog = {
      id: 'log_' + Date.now(),
      transactionId: 'summary_' + currentMonth,
      transactionName: `Resumo Mensal - ${currentMonth}`,
      amount: unpaidSum,
      contactName: contact.name,
      contactValue: contact.value,
      type: contact.type,
      sentAt: Date.now(),
    };

    saveLogs([newLog, ...logs]);
    triggerToast(`Resumo enviado para ${contact.name}!`);
  };

  return (
    <div className="space-y-6">
      {/* Overview Dashboard & Browser Alert Settings */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold font-display text-slate-900 flex items-center gap-2">
              <BellRing className="w-5 h-5 text-indigo-600 animate-pulse-subtle" />
              Notificações e Alertas Ativos
            </h3>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              O FluxoFix monitora seus prazos em tempo real. Teste alertas no navegador ou configure contatos para disparo rápido.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {/* Enable browser permission */}
            {browserPermission !== 'granted' ? (
              <button
                onClick={requestBrowserNotificationPermission}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold font-display text-xs transition-all active:scale-95"
              >
                Permitir Notificações no Navegador
              </button>
            ) : (
              <span className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold font-display text-xs flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Notificações Ativas
              </span>
            )}

            <button
              onClick={triggerBrowserSimulation}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-display text-xs transition-all active:scale-95 shadow-xs"
            >
              Simular Disparo de Alerta
            </button>
          </div>
        </div>

        {/* Dynamic warning banner if any item is overdue */}
        {alertExpenses.length > 0 ? (
          <div className="mt-5 p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-red-500 animate-pulse-subtle" />
            <div>
              <p className="font-extrabold text-sm">Atenção: Vencimentos Pendentes!</p>
              <p className="mt-1 font-medium text-red-600">
                Você possui <strong className="font-extrabold">{alertExpenses.length} despesa(s)</strong> vencendo hoje ou atrasada(s). Utilize o painel abaixo para alertar os responsáveis cadastrados.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-5 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs flex items-start gap-2.5">
            <Check className="w-4.5 h-4.5 shrink-0 mt-0.5 text-emerald-600" />
            <div>
              <p className="font-extrabold text-sm">Tudo em dia!</p>
              <p className="mt-1 font-medium text-emerald-600">
                Nenhuma despesa pendente está próxima do vencimento nos próximos 3 dias neste mês. Excelente organização!
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Pending items on left, Contact list on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Col: Pending items that need alerts */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold font-display text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-indigo-600" />
              Lançamentos que precisam de atenção
            </h3>

            {alertExpenses.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Nenhum lançamento exige envio de lembrete imediato.
              </div>
            ) : (
              <div className="space-y-3">
                {alertExpenses.map(({ transaction, daysRemaining, status }) => (
                  <div
                    key={transaction.id}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 hover:border-slate-300 transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          status === 'overdue' 
                            ? 'bg-rose-100 text-rose-700 border border-rose-200' 
                            : status === 'today'
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                        }`}>
                          {status === 'overdue' ? `Atrasada (${Math.abs(daysRemaining)} dias)` : status === 'today' ? 'Vence Hoje' : 'Vence em breve'}
                        </span>
                        <p className="text-xs font-bold text-slate-800 truncate">{transaction.name}</p>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 font-mono font-medium">
                        Vencimento: {new Date(transaction.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')} • {formatCurrency(transaction.amount)}
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedTxForAlert(transaction)}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-500 text-indigo-600 hover:text-white hover:bg-indigo-600 font-bold font-display text-xs rounded-lg transition-all flex items-center gap-1 active:scale-95 cursor-pointer shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Notificar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Setup Modal/Form overlay to Customize & Send */}
          <AnimatePresence>
            {selectedTxForAlert && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-white border-2 border-indigo-500 rounded-2xl p-5 shadow-xl space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4.5 h-4.5 text-indigo-600 animate-spin-slow" />
                    Enviar Notificação de Cobrança
                  </h4>
                  <button
                    onClick={() => setSelectedTxForAlert(null)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold font-display"
                  >
                    Cancelar
                  </button>
                </div>

                {contacts.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                    Nenhum contato cadastrado. Cadastre um e-mail ou WhatsApp no painel ao lado primeiro!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Choose recipient */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Destinatário cadastrado</label>
                      <select
                        value={selectedContactId}
                        onChange={(e) => setSelectedContactId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl p-2.5 focus:outline-none focus:border-indigo-500"
                      >
                        {contacts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.type === 'whatsapp' ? 'WhatsApp' : 'E-mail'}: {c.value})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Customize text */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mensagem Personalizada</label>
                      <textarea
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed resize-none"
                      />
                    </div>

                    {/* Submit Dispatch */}
                    <button
                      onClick={handleDispatchAlert}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-display text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <Send className="w-4 h-4 text-white" />
                      Disparar Notificação Real
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dispatch Log history */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold font-display text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4.5 h-4.5 text-indigo-600" />
                Histórico de Notificações Enviadas
              </h3>
              {logs.length > 0 && (
                <button
                  onClick={handleClearLogs}
                  className="text-[10px] font-bold text-rose-500 hover:text-rose-700"
                >
                  Limpar Logs
                </button>
              )}
            </div>

            {logs.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Nenhum alerta foi disparado nesta sessão ainda.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">
                        {log.transactionName} • <span className="font-mono text-slate-600">{formatCurrency(log.amount)}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Enviado para <strong className="text-slate-600">{log.contactName}</strong> via {log.type === 'whatsapp' ? 'WhatsApp' : 'E-mail'} ({log.contactValue})
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[9px] text-slate-400 font-mono">
                        {new Date(log.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="flex items-center justify-end text-emerald-600 text-[10px] font-bold gap-0.5">
                        <Check className="w-3.5 h-3.5" /> Enviado
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Contacts manager */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Create contact card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold font-display text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4.5 h-4.5 text-indigo-600" />
              Cadastrar Novo Contato
            </h3>

            <form onSubmit={handleAddContact} className="space-y-4">
              {/* Type Select */}
              <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 border border-slate-200 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setContactType('whatsapp');
                    setContactValue('');
                  }}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold font-display transition-all cursor-pointer ${
                    contactType === 'whatsapp'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Phone className="w-3 h-3 inline mr-1" /> WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setContactType('email');
                    setContactValue('');
                  }}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold font-display transition-all cursor-pointer ${
                    contactType === 'email'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Mail className="w-3 h-3 inline mr-1" /> E-mail
                </button>
              </div>

              {/* Name input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome do Contato</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Rodrigo Amaro, Sócio, Esposa"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Contact value input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {contactType === 'whatsapp' ? 'Número do WhatsApp (DDD + Número)' : 'E-mail'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={contactType === 'whatsapp' ? 'Ex: 11999999999' : 'Ex: rodrigo@exemplo.com'}
                  value={contactValue}
                  onChange={(e) => setContactValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-850 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold font-display text-xs rounded-xl transition-all shadow-xs"
              >
                Salvar Contato
              </button>
            </form>
          </div>

          {/* Contact list card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold font-display text-slate-800 mb-4 uppercase tracking-wider">
              Contatos Cadastrados ({contacts.length})
            </h3>

            {contacts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Nenhum contato cadastrado para envio automático de e-mail ou WhatsApp.
              </div>
            ) : (
              <div className="space-y-3">
                {contacts.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800">{c.name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                        {c.type === 'whatsapp' ? (
                          <span className="text-indigo-600 flex items-center gap-0.5">
                            <Phone className="w-3 h-3" /> WhatsApp
                          </span>
                        ) : (
                          <span className="text-emerald-600 flex items-center gap-0.5">
                            <Mail className="w-3 h-3" /> E-mail
                          </span>
                        )}
                        <span>•</span>
                        <span className="truncate">{c.value}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Send Monthly summary */}
                      <button
                        onClick={() => handleSendMonthlySummary(c)}
                        className="p-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors"
                        title="Enviar resumo mensal completo"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                      
                      {/* Remove contact */}
                      <button
                        onClick={() => handleDeleteContact(c.id, c.name)}
                        className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Excluir contato"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
