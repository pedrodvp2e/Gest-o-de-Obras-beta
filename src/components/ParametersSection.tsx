import React, { useState, useEffect } from 'react';
import { ConstructionParameter, User, WorkerRegistry } from '../types';
import { Clock, Play, Pause, RotateCcw, Calendar, UserCheck, Plus, Trash2, CheckCircle2, AlertCircle, Sparkles, MessageSquare, Send, Check, X, ShieldAlert } from 'lucide-react';
import HoldToDelete from './HoldToDelete';

interface ParametersSectionProps {
  siteId: string;
  parameters: ConstructionParameter[];
  currentUser: User;
  onAddParameter: (paramData: { name: string; deadline: string; assignedToName: string }) => Promise<void>;
  onUpdateParameter: (id: string, update: Partial<ConstructionParameter> & { action?: 'start_timer' | 'stop_timer' | 'reset_timer' }) => Promise<void>;
  onDeleteParameter: (id: string) => Promise<void>;
  onSendMessage?: (message: string) => Promise<void>;
  workers?: WorkerRegistry[];
}

export default function ParametersSection({ siteId, parameters, currentUser, onAddParameter, onUpdateParameter, onDeleteParameter, onSendMessage, workers }: ParametersSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Direct report modal states
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedParamForReport, setSelectedParamForReport] = useState<ConstructionParameter | null>(null);
  const [reportText, setReportText] = useState('');
  const [reportIsUrgent, setReportIsUrgent] = useState(false);
  const [reportSuccess, setReportSuccess] = useState('');
  const [reportError, setReportError] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedMestreName, setSelectedMestreName] = useState('');

  // Manual add stage state
  const [name, setName] = useState('Reboco de Parede');
  const [deadline, setDeadline] = useState('');
  const [assignedToName, setAssignedToName] = useState('');

  // Local state to store live updated durations of running timers
  const [liveDurations, setLiveDurations] = useState<{ [id: string]: number }>({});

  // Sync parameters list with live ticking stopwatches
  useEffect(() => {
    // Initial load
    const initialDurations: { [id: string]: number } = {};
    parameters.forEach(p => {
      if (p.timerRunning && p.timerStartedAt) {
        const elapsed = Math.floor((Date.now() - p.timerStartedAt) / 1000);
        initialDurations[p.id] = p.timerDuration + elapsed;
      } else {
        initialDurations[p.id] = p.timerDuration;
      }
    });
    setLiveDurations(initialDurations);

    // Set interval to increment running timers every second
    const interval = setInterval(() => {
      setLiveDurations(prev => {
        const next = { ...prev };
        parameters.forEach(p => {
          if (p.timerRunning && p.timerStartedAt) {
            const elapsed = Math.floor((Date.now() - p.timerStartedAt) / 1000);
            next[p.id] = p.timerDuration + elapsed;
          } else {
            next[p.id] = p.timerDuration;
          }
        });
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [parameters]);

  const handleSirenAlert = async (type: string, label: string) => {
    if (!onSendMessage) return;
    try {
      const message = `🚨 [SIRENE_TURNO] O Mestre de Obras tocou a sirene do canteiro para o intervalo de: **${label.toUpperCase()}**! Favor alinhar as frentes de serviço e zelar pela organização do canteiro.`;
      await onSendMessage(message);
    } catch (err) {
      console.error('Falha ao tocar sirene:', err);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !deadline) return;

    try {
      await onAddParameter({
        name,
        deadline,
        assignedToName: assignedToName || 'Não Atribuído'
      });
      setName('Reboco de Parede');
      setDeadline('');
      setAssignedToName('');
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Format seconds to HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 text-xs px-2 py-0.5 rounded-full font-medium">Aguardando</span>;
      case 'ongoing':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2 py-0.5 rounded-full font-medium animate-pulse">Ativo</span>;
      case 'completed':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2 py-0.5 rounded-full font-medium">Concluído</span>;
      default:
        return null;
    }
  };

  return (
    <div id="parameters-container" className="space-y-6 text-slate-100">
      {/* Parameters Header Actions */}
      <div id="parameters-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-900">
        <div>
          <h2 className="text-base font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <span className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
            Cronogramas & Etapas Físicas
          </h2>
          <p className="text-[11px] text-slate-400 mt-1">Monitore o andamento real, prazos de entrega e tempos acumulados de serviço de cada setor.</p>
        </div>

        {currentUser.role === 'engineer' ? (
          <button
            id="toggle-add-param-form"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all cursor-pointer font-mono shadow-md shadow-amber-500/15"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            Nova Etapa
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-900 rounded-xl text-[10px] text-slate-500 font-mono">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
            <span>CRONOGRAMA EDITÁVEL APENAS POR ENGENHEIRO</span>
          </div>
        )}
      </div>

      {/* Manual Add Stage Form */}
      {showAddForm && (
        <form onSubmit={handleManualSubmit} id="add-parameter-form" className="bg-[#090f1d]/90 p-5 rounded-2xl border border-slate-800 shadow-xl grid grid-cols-1 sm:grid-cols-3 gap-4 items-end animate-in slide-in-from-top-4 duration-150 text-slate-200">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Nome Identificador da Etapa *</label>
            <select
              id="param-name-select"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans cursor-pointer"
            >
              <option value="Fundação & Estrutura">Fundação & Estrutura</option>
              <option value="Alvenaria de Vedação">Alvenaria de Vedação</option>
              <option value="Reboco de Parede">Reboco de Parede (Emboço)</option>
              <option value="Instalações Hidráulicas">Instalações Hidráulicas</option>
              <option value="Instalações Elétricas">Instalações Elétricas</option>
              <option value="Piso & Contra-piso">Piso & Contra-piso</option>
              <option value="Revestimento Cerâmico">Revestimento Cerâmico</option>
              <option value="Pintura & Acabamentos">Pintura & Acabamentos</option>
              <option value="Instalação de Esquadrias">Instalação de Esquadrias</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Prazo Limite (Deadline) *</label>
            <input
              id="param-deadline-input"
              type="date"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Frente / Equipe Responsável</label>
            <input
              id="param-assigned-input"
              type="text"
              value={assignedToName}
              onChange={(e) => setAssignedToName(e.target.value)}
              placeholder="Ex: Equipe de Alvenaria - Líder Marcos"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans"
            />
          </div>

          <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
            <button
              id="cancel-add-param"
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer font-mono"
            >
              Cancelar
            </button>
            <button
              id="submit-add-param"
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer font-mono shadow-md shadow-amber-500/10"
            >
              Criar Planejamento
            </button>
          </div>
        </form>
      )}

      {/* Quadro de Jornada de Trabalho & Sirenes Sonoras do Canteiro */}
      <div id="shift-schedule-board" className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-xl relative overflow-hidden">
        {/* Decorative background stripes */}
        <div className="absolute -top-10 -right-10 h-32 w-32 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">📢</span>
              <h3 className="font-extrabold text-sm text-amber-400 uppercase tracking-wider">Cronograma & Jornada Diária</h3>
            </div>
            <p className="text-[10.5px] text-slate-400 mt-1">Horários regulamentares de frentes de serviço e pausas da obra em tempo real.</p>
          </div>

          <div className="flex flex-wrap gap-1.5 bg-slate-800/65 p-1 rounded-2xl border border-slate-700/50">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider px-2 py-1 flex items-center gap-1">
              🚨 SIRENES:
            </span>
            <button
              type="button"
              onClick={() => handleSirenAlert('pegar', 'Pegar no Serviço (07:00)')}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-[9px] transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              🔨 Início
            </button>
            <button
              type="button"
              onClick={() => handleSirenAlert('cafe', 'Café da Manhã (09:00 - 09:15)')}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-[9px] transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              ☕ Café
            </button>
            <button
              type="button"
              onClick={() => handleSirenAlert('almoco', 'Intervalo de Almoço (12:00 - 13:00)')}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-[9px] transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              🍽️ Almoço
            </button>
            <button
              type="button"
              onClick={() => handleSirenAlert('retorno', 'Retorno ao Serviço (13:00)')}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-[9px] transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              🛠️ Retorno
            </button>
            <button
              type="button"
              onClick={() => handleSirenAlert('parar', 'Fim do Expediente / Parar (17:00)')}
              className="px-2.5 py-1 bg-rose-500 hover:bg-rose-600 text-white font-black rounded-lg text-[9px] transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              🛑 Parar
            </button>
          </div>
        </div>

        {/* Journey Timeline Steps */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Pegar Serviço', time: '07:00', icon: '🔨', desc: 'Início do expediente' },
            { label: 'Café da Manhã', time: '09:00', icon: '☕', desc: 'Pausa de 15 min' },
            { label: 'Almoço', time: '12:00', icon: '🍽️', desc: 'Pausa de 1 hora' },
            { label: 'Retorno', time: '13:00', icon: '🛠️', desc: 'Foco na produção' },
            { label: 'Parar Serviço', time: '17:00', icon: '🛑', desc: 'Final de turno' }
          ].map((milestone, idx) => (
            <div key={idx} className="bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800 rounded-2xl p-3 flex flex-col justify-between transition-all">
              <div className="flex items-center justify-between">
                <span className="text-base">{milestone.icon}</span>
                <span className="text-[11px] font-black text-amber-400 font-mono bg-slate-900/80 px-2 py-0.5 rounded-md border border-slate-700/30">
                  {milestone.time}
                </span>
              </div>
              <div className="mt-3">
                <h4 className="font-bold text-xs text-slate-200 leading-tight">{milestone.label}</h4>
                <p className="text-[9px] text-slate-500 mt-0.5">{milestone.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid of Stages/Stopwatches */}
      {parameters.length === 0 ? (
        <div id="no-params-view" className="text-center py-12 bg-slate-900/40 rounded-3xl border border-slate-850 p-6">
          <Clock className="h-10 w-10 text-slate-600 mx-auto mb-2" />
          <h4 className="font-bold text-white text-sm font-mono uppercase tracking-wider">Nenhum cronograma de serviço cadastrado</h4>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto">
            {currentUser.role === 'engineer'
              ? 'Clique em "Nova Etapa" acima para definir as fases da obra e habilitar os cronômetros.'
              : 'Nenhum cronômetro ativo foi configurado para este canteiro de obras.'}
          </p>
        </div>
      ) : (
        <div id="parameters-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {parameters.map((param) => {
            const isCompleted = param.status === 'completed' || param.percentage === 100;
            const liveSecs = liveDurations[param.id] || 0;
            const isOverdue = new Date(param.deadline).getTime() < Date.now() && !isCompleted;

            if (isCompleted) {
              return (
                <div
                  key={param.id}
                  id={`param-card-completed-${param.id}`}
                  className="bg-emerald-950/20 rounded-3xl border-2 border-emerald-500/20 p-5 shadow-lg flex flex-col justify-between relative overflow-hidden animate-in fade-in"
                >
                  {/* Decorative background checker icon */}
                  <span className="absolute -bottom-2 -right-2 text-4xl opacity-10 select-none">🏁</span>
                  
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-black text-white leading-tight uppercase tracking-tight">{param.name}</h4>
                          <span className="bg-emerald-500 text-slate-950 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full font-mono">100%</span>
                        </div>
                        <p className="text-[10px] text-emerald-400 font-bold mt-2 flex items-center gap-1 bg-emerald-950/50 border border-emerald-800/30 px-2 py-1 rounded-md self-start font-mono">
                          ✨ ETAPA CONCLUÍDA & AUDITADA
                        </p>
                      </div>

                      {/* Locked stopwatch visual display */}
                      <div className="bg-emerald-950/80 text-white px-3 py-1.5 rounded-xl text-center shadow-md font-mono shrink-0 border border-emerald-500/30">
                        <div className="text-[8px] text-emerald-400 uppercase tracking-widest leading-none mb-1">TEMPO TOTAL</div>
                        <div className="text-xs font-black tracking-wider leading-none text-emerald-300">
                          {formatTime(liveSecs)}
                        </div>
                      </div>
                    </div>

                    {/* Metadata Board */}
                    <div className="space-y-2 text-xs text-slate-300 my-4 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-900/50">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">👷</span>
                        <span>Equipe: <strong className="text-white font-bold">{param.assignedToName}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">📅</span>
                        <span>Prazo original: <strong className="text-white font-mono">{new Date(param.deadline).toLocaleDateString('pt-BR')}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Complete status note */}
                  <div className="mt-2 flex items-center justify-between text-[10px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-2.5">
                    <div className="flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Todas as medições de campo aprovadas pela engenharia.</span>
                    </div>
                  </div>

                  {/* Actions for managers */}
                  {currentUser.role === 'engineer' && (
                    <div className="flex justify-between items-center pt-3 mt-3 border-t border-dashed border-emerald-800/40 text-[10px]">
                      <span className="text-emerald-500/60 font-mono">// ARQUIVO CONSOLIDADO</span>
                      <HoldToDelete
                        onDelete={() => onDeleteParameter(param.id)}
                        disabled={currentUser.role !== 'engineer'}
                        itemName={param.name}
                      >
                        <div className="text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors font-mono py-1 px-2.5 bg-slate-950/40 border border-slate-900 rounded-lg">
                          <Trash2 className="h-3.5 w-3.5 text-rose-500/80 shrink-0" />
                          <span>Segurar 1s para Excluir</span>
                        </div>
                      </HoldToDelete>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <div
                key={param.id}
                id={`param-card-${param.id}`}
                className={`bg-[#090f1d]/85 rounded-3xl border p-5 shadow-lg transition-all flex flex-col justify-between ${
                  param.timerRunning ? 'border-amber-500/60 shadow-amber-500/5 bg-[#0e172a]/70' : 'border-slate-800/80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h4 className="font-extrabold text-white uppercase tracking-tight">{param.name}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        {getStatusBadge(param.status)}
                        {isOverdue && (
                          <span className="bg-red-950/40 text-red-400 border border-red-800/60 text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5 font-mono uppercase tracking-wider">
                            <AlertCircle className="h-3 w-3" /> ATRASADO
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Stopwatch visual display */}
                    <div className="bg-slate-950 text-slate-50 px-3.5 py-1.5 rounded-xl text-center shadow-inner font-mono shrink-0 border border-slate-850">
                      <div className="text-[8px] text-slate-500 uppercase tracking-widest leading-none mb-1">TEMPO GASTO</div>
                      <div className="text-sm font-black tracking-wider leading-none text-amber-500">
                        {formatTime(liveSecs)}
                      </div>
                    </div>
                  </div>

                  {/* Stopwatch controls - Guarded to Engineers Only */}
                  {currentUser.role === 'engineer' ? (
                    <div className="flex items-center gap-2 mb-4 bg-slate-950/80 p-2 rounded-xl border border-slate-900">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider ml-1 font-mono">CRONÔMETRO:</span>
                      
                      <div className="flex items-center gap-1.5">
                        <button
                          id={`start-timer-${param.id}`}
                          disabled={param.timerRunning}
                          onClick={() => onUpdateParameter(param.id, { action: 'start_timer' })}
                          className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                            param.timerRunning
                              ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black shadow-sm'
                          }`}
                        >
                          <Play className="h-3 w-3 stroke-[3]" /> Iniciar
                        </button>

                        <button
                          id={`pause-timer-${param.id}`}
                          disabled={!param.timerRunning}
                          onClick={() => onUpdateParameter(param.id, { action: 'stop_timer' })}
                          className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                            !param.timerRunning
                              ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'
                              : 'bg-red-600 hover:bg-red-500 text-white shadow-sm animate-pulse'
                          }`}
                        >
                          <Pause className="h-3 w-3 stroke-[3]" /> Pausar
                        </button>
                      </div>

                      <button
                        id={`reset-timer-${param.id}`}
                        onClick={() => {
                          if (confirm('Deseja zerar as horas acumuladas neste cronômetro?')) {
                            onUpdateParameter(param.id, { action: 'reset_timer' });
                          }
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer ml-auto border border-transparent hover:border-slate-800"
                        title="Zerar Tempo"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="mb-4 text-[9px] text-slate-500 font-mono flex items-center gap-1.5 py-2 px-3 bg-slate-950/40 rounded-xl border border-slate-900/60">
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span>CRONÔMETRO RESTRITO AO ENGENHEIRO CIVIL</span>
                    </div>
                  )}

                  {/* Assigned and Deadline metadata */}
                  <div className="space-y-2 text-xs text-slate-300 my-4 bg-slate-950/40 p-3.5 rounded-2xl border border-slate-900/50">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-slate-500 shrink-0" />
                      <span>Frente / Responsável: <strong className="text-white font-bold">{param.assignedToName}</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-500 shrink-0" />
                      <span>Data de Conclusão Alvo: <strong className="text-amber-500 font-mono font-bold">{new Date(param.deadline).toLocaleDateString('pt-BR')}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Progress bar / slider */}
                <div className="space-y-2 pt-3.5 border-t border-slate-900 mt-2">
                  <div className="flex justify-between text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">
                    <span>MEDIL_DE_CAMPO</span>
                    <span className="text-amber-500 font-bold">{param.percentage}%</span>
                  </div>

                  {currentUser.role === 'engineer' ? (
                    <div className="flex items-center gap-3">
                      <input
                        id={`progress-slider-${param.id}`}
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        value={param.percentage}
                        onChange={(e) => onUpdateParameter(param.id, { percentage: Number(e.target.value) })}
                        className="flex-1 h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500 border border-slate-850"
                      />
                      <div className="flex gap-1">
                        <button
                          id={`progress-complete-${param.id}`}
                          onClick={() => onUpdateParameter(param.id, { percentage: 100, status: 'completed' })}
                          className="bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-lg border border-emerald-800/50 transition-colors cursor-pointer font-mono"
                          title="Marcar como Concluído"
                        >
                          PROMOVER (100%)
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-900">
                        <div
                          className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${param.percentage}%` }}
                        />
                      </div>
                      <span className="text-[8.5px] text-slate-500 font-mono uppercase tracking-wider block">
                        🔒 MEDIÇÃO EXCLUSIVA DA ENGENHARIA CIVIL
                      </span>
                    </div>
                  )}
                </div>

                {/* Direct Communication to Master Builder button */}
                <div className="mt-3.5 pt-2.5 border-t border-slate-900 flex">
                  <button
                    id={`btn-report-to-master-${param.id}`}
                    onClick={() => {
                      setSelectedParamForReport(param);
                      setReportText('');
                      setReportIsUrgent(false);
                      setReportSuccess('');
                      setReportError('');
                      setSelectedMestreName('');
                      setShowReportModal(true);
                    }}
                    className="flex-1 py-2 bg-slate-950 hover:bg-[#0f172a] border border-slate-850 text-slate-300 hover:text-white text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-98 font-mono"
                    title="Enviar relatório de andamento direto para o Mestre de Obras"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-amber-500" />
                    <span>Relatar ao Mestre</span>
                  </button>
                </div>

                {/* Remove button for Admins */}
                {currentUser.role === 'engineer' && (
                  <div className="flex justify-end pt-3 mt-3 border-t border-dashed border-slate-900">
                    <HoldToDelete
                      onDelete={() => onDeleteParameter(param.id)}
                      disabled={currentUser.role !== 'engineer'}
                      itemName={param.name}
                    >
                      <div className="text-xs text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors font-mono py-1 px-2.5 bg-slate-950/40 border border-slate-900 rounded-lg">
                        <Trash2 className="h-3.5 w-3.5 text-rose-500/80 shrink-0" />
                        <span>Segurar 1s para Excluir Etapa</span>
                      </div>
                    </HoldToDelete>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: RELATÓRIO DIRETO DE ANDAMENTO AO MESTRE DE OBRAS */}
      {showReportModal && selectedParamForReport && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl relative my-8">
            <button
              onClick={() => {
                setShowReportModal(false);
                setSelectedParamForReport(null);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 text-slate-900 border-b border-slate-100 pb-3">
              <MessageSquare className="h-6 w-6 text-amber-500" />
              <div>
                <h4 className="font-extrabold text-base leading-none">Relatar Andamento ao Mestre</h4>
                <p className="text-[10px] text-slate-500 mt-1">Envie notas de campo e status operacionais em tempo real para os supervisores.</p>
              </div>
            </div>

            {reportError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-750 text-xs p-3.5 rounded-2xl mb-4 font-semibold">
                {reportError}
              </div>
            )}

            {reportSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-2xl mb-4 font-semibold text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                <p>{reportSuccess}</p>
                <p className="text-[10px] text-slate-500 font-medium">Os mestres e engenheiros receberão este alerta de imediato no celular!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-150">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Foco do Relatório:</span>
                  <strong className="text-slate-800 text-sm block">{selectedParamForReport.name}</strong>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold">Progresso: {selectedParamForReport.percentage}%</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium">Responsável: {selectedParamForReport.assignedToName}</span>
                  </div>
                </div>

                {/* QUICK MESSAGES TEMPLATES */}
                <div>
                  <span className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Mensagens Rápidas de Campo:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReportText('Serviços ocorrendo em ritmo acelerado e equipe produtiva.')}
                      className="text-left p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[10.5px] font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      🟢 Ritmo acelerado
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReportText('Atenção: Estamos identificando um risco de falta de insumos básicos na foca de serviço.');
                        setReportIsUrgent(true);
                      }}
                      className="text-left p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[10.5px] font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      ⚠️ Risco de falta de materiais
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReportText('Chuvas ou condições desfavoráveis afetaram a execução hoje.');
                        setReportIsUrgent(true);
                      }}
                      className="text-left p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[10.5px] font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      🌧️ Impacto climático
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportText('Etapa correndo estritamente dentro da normalidade e cronograma planejado.')}
                      className="text-left p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-[10.5px] font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      ✅ Dentro do previsto
                    </button>
                  </div>
                </div>

                {/* TEXTAREA FEEDBACK */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Mensagem ou Observação do Relatório *</label>
                  <textarea
                    rows={3}
                    required
                    value={reportText}
                    onChange={(e) => setReportText(e.target.value)}
                    placeholder="Descreva as atualizações operacionais ou gargalos identificados para que o Mestre e o Engenheiro analisem..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* SELECT TARGET MESTRE DE OBRAS */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Mestre de Obras Responsável *</label>
                  {workers && workers.filter(w => w.role.toLowerCase() === 'master_builder' || w.role === 'Mestre de Obras').length > 0 ? (
                    <select
                      value={selectedMestreName}
                      onChange={(e) => setSelectedMestreName(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-sans cursor-pointer"
                    >
                      <option value="">-- Selecione o Mestre Destinatário --</option>
                      {workers
                        .filter(w => w.role.toLowerCase() === 'master_builder' || w.role === 'Mestre de Obras' || w.role.toLowerCase().includes('mestre'))
                        .map(w => (
                          <option key={w.id} value={w.name}>{w.name}</option>
                        ))
                      }
                    </select>
                  ) : (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        required
                        value={selectedMestreName}
                        onChange={(e) => setSelectedMestreName(e.target.value)}
                        placeholder="Nome do Mestre de Obras..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                      />
                      <span className="text-[9px] text-slate-400 block">// REGISTRE O MESTRE DE OBRAS NA ABA INFERIOR PARA AUTOPREENCHER</span>
                    </div>
                  )}
                </div>

                {/* HIGH PRIORITY SWITCH */}
                <div className="flex items-center justify-between p-3 bg-rose-50 border border-rose-100 rounded-2xl">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0" />
                    <div>
                      <span className="font-bold text-xs text-rose-950 block">Marcar como Alta Prioridade / Urgência</span>
                      <span className="text-[9px] text-rose-700">Notificar com toque especial e fixar destaque no mural</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={reportIsUrgent}
                    onChange={(e) => setReportIsUrgent(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-rose-300 text-rose-600 focus:ring-rose-500 accent-rose-600 cursor-pointer"
                  />
                </div>

                {/* ACTIONS */}
                <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReportModal(false);
                      setSelectedParamForReport(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={reportLoading || !reportText.trim() || !selectedMestreName}
                    onClick={async () => {
                      if (!onSendMessage) {
                        setReportError('Erro interno: Função de envio indisponível.');
                        return;
                      }

                      setReportLoading(true);
                      setReportError('');
                      try {
                        // structured string format that can be parsed by TeamChat
                        const structuredMsg = `📢 [RELATO_ANDAMENTO | ETAPA: ${selectedParamForReport.name} | PROGRESSO: ${selectedParamForReport.percentage}% | URGENTE: ${reportIsUrgent ? 'SIM' : 'NÃO'}${selectedMestreName ? ` | MESTRE: ${selectedMestreName}` : ''}] ${reportText}`;
                        await onSendMessage(structuredMsg);
                        
                        setReportSuccess(`Relatório enviado exclusivamente para o Mestre ${selectedMestreName}!`);
                        setTimeout(() => {
                          setShowReportModal(false);
                          setSelectedParamForReport(null);
                        }, 2000);
                      } catch (err: any) {
                        setReportError(err.message || 'Falha ao transmitir o relatório.');
                      } finally {
                        setReportLoading(false);
                      }
                    }}
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl cursor-pointer transition-all flex items-center gap-1 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {reportLoading ? 'Transmitindo...' : 'Transmitir Relato'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
