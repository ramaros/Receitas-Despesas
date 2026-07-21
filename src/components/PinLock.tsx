import React, { useState, useEffect } from 'react';
import { Lock, Unlock, ShieldAlert, Delete, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PinLockProps {
  storedPin: string | null;
  isPinEnabled: boolean;
  isLocked: boolean;
  onUnlock: () => void;
  onSetupPin: (newPin: string) => void;
  onDisablePin: () => void;
  isSetupMode?: boolean; // if true, is used to configure PIN inside settings
}

export default function PinLock({
  storedPin,
  isPinEnabled,
  isLocked,
  onUnlock,
  onSetupPin,
  onDisablePin,
  isSetupMode = false,
}: PinLockProps) {
  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [setupStep, setSetupStep] = useState<1 | 2>(1); // 1 = enter first, 2 = confirm
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState<boolean>(false);

  // Reset PIN state when storedPin or mode changes
  useEffect(() => {
    setPin('');
    setConfirmPin('');
    setSetupStep(1);
    setError(null);
  }, [storedPin, isSetupMode, isLocked]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleNumberClick = (num: number) => {
    setError(null);
    if (isSetupMode) {
      if (setupStep === 1) {
        if (pin.length < 4) {
          const nextPin = pin + num;
          setPin(nextPin);
          if (nextPin.length === 4) {
            // Wait 200ms then go to confirmation step
            setTimeout(() => {
              setSetupStep(2);
            }, 250);
          }
        }
      } else {
        if (confirmPin.length < 4) {
          const nextConfirm = confirmPin + num;
          setConfirmPin(nextConfirm);
          if (nextConfirm.length === 4) {
            setTimeout(() => {
              if (pin === nextConfirm) {
                onSetupPin(pin);
                setPin('');
                setConfirmPin('');
                setSetupStep(1);
                setError('PIN cadastrado com sucesso!');
              } else {
                triggerShake();
                setError('Os PINs não coincidem. Tente novamente.');
                setConfirmPin('');
                setSetupStep(1);
                setPin('');
              }
            }, 250);
          }
        }
      }
    } else {
      // Normal unlocking mode
      if (pin.length < 4) {
        const nextPin = pin + num;
        setPin(nextPin);
        if (nextPin.length === 4) {
          setTimeout(() => {
            if (nextPin === storedPin) {
              onUnlock();
              setPin('');
            } else {
              triggerShake();
              setError('PIN incorreto! Tente novamente.');
              setPin('');
            }
          }, 250);
        }
      }
    }
  };

  const handleBackspace = () => {
    setError(null);
    if (isSetupMode) {
      if (setupStep === 1) {
        setPin(pin.slice(0, -1));
      } else {
        setConfirmPin(confirmPin.slice(0, -1));
      }
    } else {
      setPin(pin.slice(0, -1));
    }
  };

  const handleClear = () => {
    setError(null);
    setPin('');
    setConfirmPin('');
    setSetupStep(1);
  };

  const currentLength = isSetupMode 
    ? (setupStep === 1 ? pin.length : confirmPin.length) 
    : pin.length;

  return (
    <div 
      id="pin-lock-container"
      className={`${
        isSetupMode 
          ? 'bg-white p-6 rounded-2xl border border-slate-200 shadow-sm' 
          : 'fixed inset-0 z-50 bg-slate-50 flex flex-col items-center justify-center p-4'
      }`}
    >
      <div className="max-w-md w-full flex flex-col items-center space-y-6">
        {/* Header Icon */}
        <div className="flex flex-col items-center space-y-3">
          <div className={`p-4 rounded-full bg-slate-100 border border-slate-200 shadow-inner ${shake ? 'animate-bounce' : ''}`}>
            {isSetupMode ? (
              <RotateCcw className="w-8 h-8 text-indigo-600" />
            ) : isLocked ? (
              <Lock className="w-8 h-8 text-indigo-600" />
            ) : (
              <Unlock className="w-8 h-8 text-indigo-600" />
            )}
          </div>
          <h2 className="text-xl md:text-2xl font-bold font-display text-slate-900 text-center">
            {isSetupMode 
              ? (setupStep === 1 ? 'Cadastrar Novo PIN' : 'Confirme seu PIN')
              : 'Controle de Despesas & Receitas'}
          </h2>
          <p className="text-sm text-slate-500 text-center px-4 font-medium">
            {isSetupMode
              ? (setupStep === 1 
                  ? 'Digite um PIN de 4 dígitos para proteger seus dados financeiros.' 
                  : 'Digite o PIN novamente para confirmar.')
              : 'Digite seu PIN de segurança de 4 dígitos para acessar.'}
          </p>
        </div>

        {/* Indicators */}
        <motion.div 
          animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex justify-center items-center space-x-4 py-4"
        >
          {[0, 1, 2, 3].map((index) => {
            const isActive = index < currentLength;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 border-indigo-600 scale-110 shadow-[0_0_8px_rgba(79,70,229,0.3)]'
                    : 'bg-transparent border-slate-300'
                }`}
              />
            );
          })}
        </motion.div>

        {/* Status / Errors */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className={`text-xs text-center font-bold ${
                error.includes('sucesso') ? 'text-emerald-600' : 'text-red-500 flex items-center justify-center gap-1'
              }`}
            >
              {!error.includes('sucesso') && <ShieldAlert className="w-4 h-4 shrink-0" />}
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 max-w-[280px] w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              id={`pin-btn-${num}`}
              onClick={() => handleNumberClick(num)}
              className="h-14 w-full rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 active:scale-95 flex items-center justify-center text-xl font-bold font-mono text-slate-800 transition-all shadow-xs cursor-pointer"
            >
              {num}
            </button>
          ))}
          
          {/* Action Left (Clear / Disable inside setup) */}
          {isSetupMode && isPinEnabled ? (
            <button
              type="button"
              id="pin-btn-disable"
              onClick={onDisablePin}
              className="h-14 w-full rounded-xl hover:bg-rose-50 text-rose-600 border border-transparent active:scale-95 flex flex-col items-center justify-center text-xs font-bold transition-all cursor-pointer"
            >
              <span>Desativar</span>
              <span>PIN</span>
            </button>
          ) : (
            <button
              type="button"
              id="pin-btn-clear"
              onClick={handleClear}
              className="h-14 w-full rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 active:scale-95 flex items-center justify-center text-sm font-bold transition-all cursor-pointer"
            >
              Limpar
            </button>
          )}

          <button
            type="button"
            id="pin-btn-0"
            onClick={() => handleNumberClick(0)}
            className="h-14 w-full rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 active:scale-95 flex items-center justify-center text-xl font-bold font-mono text-slate-800 transition-all shadow-xs cursor-pointer"
          >
            0
          </button>

          <button
            type="button"
            id="pin-btn-back"
            onClick={handleBackspace}
            className="h-14 w-full rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 active:scale-95 flex items-center justify-center transition-all cursor-pointer"
            aria-label="Apagar dígito"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Footer info for unlock screen */}
        {!isSetupMode && (
          <div className="text-center text-xs text-slate-400 mt-4 font-mono select-none font-medium">
            Ambiente Seguro • Dados Encriptados Localmente
          </div>
        )}
      </div>
    </div>
  );
}
