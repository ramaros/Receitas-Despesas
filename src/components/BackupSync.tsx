import React, { useState, useRef, useEffect } from 'react';
import { Download, Upload, Cloud, RefreshCw, LogIn, LogOut, ShieldCheck, CheckCircle2, AlertTriangle, FileJson } from 'lucide-react';
import { motion } from 'motion/react';
import { Transaction, FixedTemplate } from '../types';
import { isFirebaseConfigured, signInWithGoogle, logoutUser, uploadToCloud, downloadFromCloud } from '../firebase';

interface BackupSyncProps {
  transactions: Transaction[];
  templates: FixedTemplate[];
  onImportData: (transactions: Transaction[], templates: FixedTemplate[]) => void;
  onRefreshLocalData: () => void;
}

export default function BackupSync({
  transactions,
  templates,
  onImportData,
  onRefreshLocalData,
}: BackupSyncProps) {
  const [user, setUser] = useState<any>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check current user state if Firebase is configured
  useEffect(() => {
    if (isFirebaseConfigured) {
      // Dynamic import to avoid issues if firebase isn't fully loaded
      import('../firebase').then(({ auth }) => {
        if (auth) {
          const unsubscribe = auth.onAuthStateChanged((fbUser: any) => {
            setUser(fbUser);
          });
          return () => unsubscribe();
        }
      });
    }
  }, []);

  // Export data as JSON
  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(
        {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          transactions,
          templates,
        },
        null,
        2
      );
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `gasto_fixo_backup_${new Date().toISOString().substring(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (e) {
      console.error(e);
      alert('Erro ao exportar backup');
    }
  };

  // Import JSON backup file
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportSuccess(false);
    
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        
        // Validate imported structure
        if (!parsed.transactions || !Array.isArray(parsed.transactions) || !parsed.templates || !Array.isArray(parsed.templates)) {
          setImportError('Estrutura inválida: certifique-se de que o arquivo de backup possui registros e modelos.');
          return;
        }

        // Run validation on each transaction
        const validatedTransactions: Transaction[] = parsed.transactions.filter((t: any) => {
          return t.id && t.name && typeof t.amount === 'number' && t.type && t.monthYear;
        });

        const validatedTemplates: FixedTemplate[] = parsed.templates.filter((t: any) => {
          return t.id && t.name && typeof t.amount === 'number' && t.type;
        });

        if (validatedTransactions.length === 0 && validatedTemplates.length === 0) {
          setImportError('Nenhum registro ou modelo válido foi encontrado no arquivo de backup.');
          return;
        }

        // Call parent to update state and localStorage
        onImportData(validatedTransactions, validatedTemplates);
        setImportSuccess(true);
        setTimeout(() => setImportSuccess(false), 5000);
      } catch (error) {
        setImportError('O arquivo selecionado não é um arquivo JSON de backup válido.');
      }
    };

    fileReader.readAsText(file);
    // Reset file input value so same file can be imported again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Login with Google
  const handleLogin = async () => {
    try {
      setSyncLoading(true);
      const loggedUser = await signInWithGoogle();
      setUser(loggedUser);
      setSyncSuccess('Conectado ao Firebase com sucesso!');
      setTimeout(() => setSyncSuccess(null), 3000);
    } catch (error: any) {
      alert(`Falha no login: ${error.message || error}`);
    } finally {
      setSyncLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await logoutUser();
      setUser(null);
      setSyncSuccess('Desconectado com sucesso.');
      setTimeout(() => setSyncSuccess(null), 3000);
    } catch (error) {
      alert('Falha ao deslogar.');
    }
  };

  // Sync to Cloud (Upload local data or download)
  const handleCloudSync = async (direction: 'upload' | 'download') => {
    if (!user) return;
    setSyncLoading(true);
    setSyncSuccess(null);

    try {
      if (direction === 'upload') {
        await uploadToCloud(user.uid, { transactions, templates });
        setSyncSuccess('Dados sincronizados e enviados para a nuvem com sucesso!');
      } else {
        const cloudData = await downloadFromCloud(user.uid);
        if (cloudData) {
          onImportData(cloudData.transactions, cloudData.templates);
          setSyncSuccess('Dados da nuvem baixados e sincronizados com sucesso!');
        } else {
          setSyncSuccess('Nenhum dado encontrado na nuvem para este usuário. Enviando dados locais...');
          await uploadToCloud(user.uid, { transactions, templates });
        }
      }
      setTimeout(() => setSyncSuccess(null), 4000);
    } catch (error: any) {
      alert(`Erro na sincronização: ${error.message || error}`);
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* JSON Backup & Restore section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold font-display text-slate-900 mb-3 flex items-center gap-2">
          <FileJson className="w-5 h-5 text-indigo-600" />
          Backup Local (Arquivo JSON)
        </h3>
        <p className="text-sm text-slate-500 mb-6 font-medium">
          Exporte seus lançamentos e gastos fixos em um arquivo seguro para seu computador ou celular.
          Você pode importar esse arquivo a qualquer momento para restaurar seus dados ou migrar de dispositivo.
        </p>

        <div className="flex flex-wrap gap-4">
          {/* Export Button */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-950 font-bold font-display text-sm transition-all active:scale-95 shadow-xs"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            Exportar Backup JSON
          </button>

          {/* Import Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-950 font-bold font-display text-sm transition-all active:scale-95 shadow-xs"
          >
            <Upload className="w-4 h-4 text-indigo-600" />
            Importar Backup JSON
          </button>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".json"
            className="hidden"
          />
        </div>

        {/* Feedback Messages */}
        {importError && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Erro na importação</p>
              <p>{importError}</p>
            </div>
          </div>
        )}

        {importSuccess && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Importação concluída!</p>
              <p>Os lançamentos e modelos de gastos fixos foram restaurados com sucesso.</p>
            </div>
          </div>
        )}
      </div>

      {/* Firebase Cloud Sync Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        {/* Dynamic decorative backdrop glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold font-display text-slate-900 flex items-center gap-2">
            <Cloud className="w-5 h-5 text-indigo-600" />
            Sincronização em Nuvem (Firebase)
          </h3>
          <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-extrabold font-mono rounded-full ${
            isFirebaseConfigured 
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
              : 'bg-amber-50 text-amber-600 border border-amber-100'
          }`}>
            {isFirebaseConfigured ? 'Disponível' : 'Local / Offline'}
          </span>
        </div>

        {!isFirebaseConfigured ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 font-medium">
              O aplicativo está operando no modo <strong>100% Offline Integrado</strong>. Todos os seus dados são salvos
              automaticamente no seu navegador usando cache seguro de alta velocidade.
            </p>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-amber-600 text-sm font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Como ativar a sincronização em nuvem?
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Para ativar a sincronização em nuvem com login do Google, conecte seu projeto Firebase no menu do 
                AI Studio. O código do aplicativo já está 100% programado e integrado para realizar o backup em nuvem 
                automaticamente no Firestore assim que a conexão for habilitada!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-slate-500 font-medium">
              Habilite a sincronização em nuvem para salvar seus dados com segurança usando sua Conta do Google,
              permitindo acessar de qualquer outro navegador ou dispositivo em tempo real.
            </p>

            {/* Sync connection bar */}
            {!user ? (
              <button
                onClick={handleLogin}
                disabled={syncLoading}
                className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold font-display text-sm transition-all shadow-sm active:scale-95"
              >
                {syncLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4 text-white" />
                )}
                Conectar com Conta do Google
              </button>
            ) : (
              <div className="space-y-4">
                {/* Connected User Badge */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-full border border-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold font-display text-indigo-600">
                        {user.displayName?.charAt(0) || user.email?.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-slate-800 leading-tight">{user.displayName || 'Usuário Conectado'}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 hover:text-rose-700 text-xs font-semibold transition-colors border border-transparent hover:border-rose-100"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sair
                  </button>
                </div>

                {/* Real-time synchronization banner */}
                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-800 text-xs flex items-start gap-3">
                  <RefreshCw className="w-4 h-4 shrink-0 text-indigo-600 mt-0.5 animate-spin" style={{ animationDuration: '3s' }} />
                  <div>
                    <p className="font-bold">Sincronização em Tempo Real Ativa!</p>
                    <p className="mt-0.5 leading-relaxed text-indigo-600 font-medium">
                      O aplicativo agora salva automaticamente! Qualquer alteração (adicionar, editar ou excluir) é enviada instantaneamente para a nuvem e atualizada em seus outros celulares ou computadores em tempo real.
                    </p>
                  </div>
                </div>

                {/* Cloud Sync Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Upload to Cloud */}
                  <button
                    onClick={() => handleCloudSync('upload')}
                    disabled={syncLoading}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white font-bold font-display text-xs transition-all shadow-xs active:scale-95"
                  >
                    <Upload className="w-4 h-4 text-white" />
                    Enviar Dados Locais p/ Nuvem
                  </button>

                  {/* Download from Cloud */}
                  <button
                    onClick={() => handleCloudSync('download')}
                    disabled={syncLoading}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-950 font-bold font-display text-xs transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4 text-indigo-600" />
                    Baixar Dados da Nuvem
                  </button>
                </div>
              </div>
            )}

            {/* Feedback Messages */}
            {syncSuccess && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                <p>{syncSuccess}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Deployment & Firebase Tutorial Center */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold font-display text-slate-900 mb-4 flex items-center gap-2">
          <FileJson className="w-5 h-5 text-indigo-600" />
          Guias de Configuração Integrados
        </h3>
        <p className="text-sm text-slate-500 mb-6 font-medium">
          Confira abaixo o passo a passo completo para habilitar seu banco de dados em nuvem próprio ou hospedar este aplicativo 100% grátis no GitHub Pages.
        </p>

        <div className="space-y-4">
          {/* Firebase Guide Details */}
          <details className="group border border-slate-150 rounded-xl bg-slate-50/50 overflow-hidden [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-all">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                1. Como configurar o Firebase Cloud Sync?
              </span>
              <span className="transition group-open:rotate-180">
                <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" className="w-4 h-4 text-slate-500"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </span>
            </summary>
            
            <div className="p-5 border-t border-slate-150 bg-white text-xs text-slate-650 space-y-3 leading-relaxed font-medium">
              <p>O FluxoFix já está 100% programado para sincronização. Para ativar seu próprio banco de dados:</p>
              <ol className="list-decimal pl-5 space-y-2 text-slate-600">
                <li>Acesse o <strong className="text-slate-950">Console do Firebase</strong> (console.firebase.google.com) e crie um projeto gratuito.</li>
                <li>No menu lateral, vá em <strong className="text-slate-950">Criação &gt; Authentication</strong> e ative o provedor de login do <strong className="text-slate-950">Google</strong>.</li>
                <li>Vá em <strong className="text-slate-950">Criação &gt; Firestore Database</strong> e clique em "Criar banco de dados". Escolha o modo de produção.</li>
                <li>Acesse a aba <strong className="text-slate-950">Regras (Rules)</strong> no Firestore e cole a seguinte regra de segurança para garantir a privacidade dos usuários:
                  <pre className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-lg text-[10px] font-mono overflow-x-auto">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}`}
                  </pre>
                </li>
                <li>No console, crie um aplicativo Web, copie as chaves de configuração (`firebaseConfig`) e configure suas variáveis de ambiente no arquivo `.env` para sincronizar automaticamente com este código!</li>
              </ol>
            </div>
          </details>

          {/* GitHub Pages Guide Details */}
          <details className="group border border-slate-150 rounded-xl bg-slate-50/50 overflow-hidden [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-all">
              <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                2. Como publicar este aplicativo no GitHub Pages?
              </span>
              <span className="transition group-open:rotate-180">
                <svg fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" className="w-4 h-4 text-slate-500"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </span>
            </summary>
            
            <div className="p-5 border-t border-slate-150 bg-white text-xs text-slate-650 space-y-3 leading-relaxed font-medium">
              <p>Como o FluxoFix usa Vite, publicá-lo de forma gratuita no GitHub Pages é simples e rápido:</p>
              <ol className="list-decimal pl-5 space-y-2 text-slate-600">
                <li>Crie um novo repositório público ou privado no seu <strong className="text-slate-950">GitHub</strong>.</li>
                <li>Se for publicar em um repositório de subpasta (ex: <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono">https://usuario.github.io/meu-repositorio/</code>), abra o arquivo <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono">vite.config.ts</code> e adicione a propriedade base:
                  <code className="block mt-1.5 p-2 bg-slate-900 text-slate-100 rounded-lg text-[10px] font-mono">
                    {`export default defineConfig({\n  base: '/meu-repositorio/',\n  plugins: [react()]\n});`}
                  </code>
                </li>
                <li>No terminal do projeto, instale o pacote de deploy automático:
                  <code className="block mt-1.5 p-2 bg-slate-900 text-slate-100 rounded-lg text-[10px] font-mono">
                    npm install gh-pages --save-dev
                  </code>
                </li>
                <li>No arquivo <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-600 font-mono">package.json</code>, adicione estes dois scripts dentro do bloco `"scripts"`:
                  <code className="block mt-1.5 p-2 bg-slate-900 text-slate-100 rounded-lg text-[10px] font-mono">
                    {`"predeploy": "npm run build",\n"deploy": "gh-pages -d dist"`}
                  </code>
                </li>
                <li>Inicialize o git e configure seu repositório remoto:
                  <code className="block mt-1.5 p-2 bg-slate-900 text-slate-100 rounded-lg text-[10px] font-mono">
                    {`git init\ngit remote add origin https://github.com/usuario/meu-repositorio.git`}
                  </code>
                </li>
                <li>Execute o deploy com o comando:
                  <code className="block mt-1.5 p-2 bg-slate-900 text-slate-100 rounded-lg text-[10px] font-mono">
                    npm run deploy
                  </code>
                </li>
                <li>Pronto! O GitHub criará um branch chamado <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">gh-pages</code> e seu site estará online em poucos minutos. Acesse as Configurações do Repositório &gt; Pages para ver o link gerado.</li>
              </ol>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
