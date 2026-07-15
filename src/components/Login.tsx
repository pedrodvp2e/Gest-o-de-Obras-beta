import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { HardHat, Lock, User as UserIcon, Briefcase, Plus, Check } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('worker');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegistering 
      ? { username, password, name, role }
      : { username, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Algo deu errado.');
      }

      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="login-container" className="min-h-screen flex items-center justify-center bg-[#030712] cyber-grid-pattern px-4 py-12 sm:px-6 lg:px-8 text-slate-100">
      <div id="login-card" className="max-w-md w-full space-y-8 bg-[#0a0f1d]/90 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-slate-800/80">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-to-tr from-amber-600 to-amber-400 rounded-2xl flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 animate-pulse">
            <HardHat className="h-10 w-10" />
          </div>
          <h2 className="mt-6 text-3xl font-black text-white tracking-tight uppercase">
            Constru<span className="text-amber-500">Fácil</span>
          </h2>
          <p className="mt-2 text-xs text-slate-450 font-mono tracking-widest uppercase">
            // CCO - Central de Controle Operacional
          </p>
        </div>

        {error && (
          <div id="auth-error-msg" className="bg-red-950/50 border border-red-800 text-red-400 rounded-xl p-3 text-xs text-center font-mono">
            ⚠️ ERROR_LOG: {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {isRegistering && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  [01] Nome Completo do Operador
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <UserIcon className="h-4 w-4" />
                  </span>
                  <input
                    id="register-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-3 bg-slate-900/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all sm:text-sm font-sans"
                    placeholder="Eng. João Santos ou Mestre Carlos"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                {isRegistering ? '[02] Nome de Usuário (Login)' : 'Nome de Usuário (Login)'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <UserIcon className="h-4 w-4" />
                </span>
                <input
                  id="login-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-3 bg-slate-900/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all sm:text-sm font-sans"
                  placeholder="Ex: jonas.engenheiro"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                {isRegistering ? '[03] Senha de Acesso' : 'Senha de Acesso'}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-3 bg-slate-900/80 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all sm:text-sm font-sans"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {isRegistering && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
                  [04] Nível de Credencial
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <Briefcase className="h-4 w-4" />
                  </span>
                  <select
                    id="register-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full pl-10 pr-3.5 py-3 bg-slate-900/80 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all sm:text-sm appearance-none cursor-pointer"
                  >
                    <option value="worker">Funcionário Comum (Operário)</option>
                    <option value="supervisor">Encarregado de Setor</option>
                    <option value="master_builder">Mestre de Obras</option>
                    <option value="engineer">Engenheiro Civil (Administrador)</option>
                  </select>
                </div>
                <p className="mt-1.5 text-[10px] text-slate-500 font-mono pl-1 leading-relaxed">
                  * Engenheiro Civil detém controle total (cronograma, materiais, projetos, obras). Mestres e Encarregados gerenciam equipes e cronômetros de campo.
                </p>
              </div>
            )}
          </div>

          <div>
            <button
              id="auth-submit-btn"
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-xs font-bold uppercase tracking-widest rounded-xl text-slate-950 bg-amber-500 hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-amber-500/10 font-mono"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  AUTENTICANDO...
                </span>
              ) : isRegistering ? 'REGISTRAR OPERADOR' : 'CONECTAR TERMINAL'}
            </button>
          </div>
        </form>

        <div className="flex items-center justify-center text-xs">
          <button
            id="toggle-auth-mode"
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setError('');
            }}
            className="font-mono text-amber-500 hover:text-amber-400 transition-colors tracking-wider"
          >
            {isRegistering 
              ? '<< JÁ POSSUI CADASTRO? CONECTAR' 
              : '>> ADMITIR NOVO OPERADOR NO SISTEMA'}
          </button>
        </div>

        {/* Demo Accounts Tip Card for Quick Evaluator Access */}
        <div id="demo-credentials-box" className="pt-4 border-t border-slate-800 mt-4 bg-slate-900/50 rounded-2xl p-4 space-y-2">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">// ACESSO DE DEMONSTRAÇÃO (Senha: 123)</p>
          <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
            <div className="p-2 bg-slate-950 border border-slate-850 rounded-xl">
              <span className="font-semibold text-slate-400 block">Engenheiro:</span>
              <span className="text-amber-500">engenheiro</span>
            </div>
            <div className="p-2 bg-slate-950 border border-slate-850 rounded-xl">
              <span className="font-semibold text-slate-400 block">Mestre de Obra:</span>
              <span className="text-amber-500">mestre</span>
            </div>
            <div className="p-2 bg-slate-950 border border-slate-850 rounded-xl col-span-2">
              <span className="font-semibold text-slate-400 block">Encarregado / Supervisor:</span>
              <span className="text-amber-500">encarregado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
