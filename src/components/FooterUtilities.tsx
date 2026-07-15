import React, { useState } from 'react';
import { User, WorkerRegistry } from '../types';
import { ShieldAlert, PhoneCall, Clock, HardHat, UserPlus, X, Check, Trash2, ShieldCheck, HelpCircle, MessageSquare, Award, Sparkles, UserCheck } from 'lucide-react';
import HoldToDelete from './HoldToDelete';

interface FooterUtilitiesProps {
  siteId: string;
  currentUser: User;
  token: string | null;
  workers: WorkerRegistry[];
  onWorkersChanged: () => void;
  onSendMessage?: (message: string) => Promise<void>;
}

export const getRoleStyle = (role: string) => {
  switch (role) {
    case 'Pedreiro':
      return { bg: 'bg-amber-100 text-amber-800 border-amber-300', iconColor: 'text-amber-600', char: '🧱' };
    case 'Servente de Obras':
      return { bg: 'bg-slate-100 text-slate-800 border-slate-300', iconColor: 'text-slate-600', char: '🧹' };
    case 'Carpinteiro':
      return { bg: 'bg-orange-100 text-orange-800 border-orange-300', iconColor: 'text-orange-600', char: '🪚' };
    case 'Armador de Ferragem':
      return { bg: 'bg-red-100 text-red-800 border-red-300', iconColor: 'text-red-600', char: '🏗️' };
    case 'Eletricista':
      return { bg: 'bg-yellow-100 text-yellow-800 border-yellow-300', iconColor: 'text-yellow-600', char: '⚡' };
    case 'Encanador':
      return { bg: 'bg-blue-100 text-blue-800 border-blue-300', iconColor: 'text-blue-600', char: '🚿' };
    case 'Pintor':
      return { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', iconColor: 'text-emerald-600', char: '🎨' };
    case 'Azulejista':
      return { bg: 'bg-indigo-100 text-indigo-800 border-indigo-300', iconColor: 'text-indigo-600', char: '📐' };
    default:
      return { bg: 'bg-sky-100 text-sky-800 border-sky-300', iconColor: 'text-sky-600', char: '👷' };
  }
};

export const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function FooterUtilities({ siteId, currentUser, token, workers, onWorkersChanged, onSendMessage }: FooterUtilitiesProps) {
  const [activeModal, setActiveModal] = useState<'nr18' | 'emergency' | 'shifts' | 'epis' | 'register' | null>(null);
  
  // Workers registry states
  const [workerName, setWorkerName] = useState('');
  const [workerRole, setWorkerRole] = useState('Pedreiro');
  const [workerPhone, setWorkerPhone] = useState('');
  const [workerCpf, setWorkerCpf] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Master directive states
  const [selectedWorkerForMsg, setSelectedWorkerForMsg] = useState<WorkerRegistry | null>(null);
  const [masterDirectMsgText, setMasterDirectMsgText] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [msgSuccess, setMsgSuccess] = useState('');

  // Interactive team scheduling states
  const [activeShiftTab, setActiveShiftTab] = useState<'hours' | 'scale'>('hours');
  const [selectedShiftType, setSelectedShiftType] = useState('Turno Diurno (07:00 - 17:00)');
  const [selectedWorkerIdsForShift, setSelectedWorkerIdsForShift] = useState<string[]>([]);
  const [shiftTaskDescription, setShiftTaskDescription] = useState('Alvenaria de Fachada');
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [shiftSuccessMsg, setShiftSuccessMsg] = useState('');

  // Check permissions - only engineer can add/delete workers (pessoas) as requested by the user
  const hasPermission = currentUser.role === 'engineer' || currentUser.role === 'master_builder' || currentUser.role === 'supervisor';
  const canManageWorkers = currentUser.role === 'engineer';

  const handleConfirmScale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedWorkerIdsForShift.length === 0) {
      alert('Selecione pelo menos um colaborador para a escala.');
      return;
    }

    const assignedNames = workers
      .filter(w => selectedWorkerIdsForShift.includes(w.id))
      .map(w => w.name)
      .join(', ');

    try {
      // Send scale log to Team mural
      if (onSendMessage) {
        const message = `⚙️ [ESCALA_EQUIPE] O ${currentUser.role === 'engineer' ? 'Engenheiro' : currentUser.role === 'master_builder' ? 'Mestre de Obras' : 'Encarregado'} **${currentUser.name}** realizou uma escala de funcionários para o **${selectedShiftType}** (Tarefa: *${shiftTaskDescription}*):\n👥 Integrantes Escalados: **${assignedNames}**`;
        await onSendMessage(message);
      }

      // If user is a master builder, trigger leadership reward!
      if (currentUser.role === 'master_builder') {
        setShowAwardModal(true);
        if (onSendMessage) {
          const awardMsg = `🏆 [PREMIAÇÃO DE LIDERANÇA] O Mestre de Obras **${currentUser.name}** concluiu a escala da equipe técnica com sucesso e ativou seu prêmio de produtividade da semana!`;
          setTimeout(() => onSendMessage(awardMsg), 1500);
        }
      } else {
        setShiftSuccessMsg('Escala de equipe oficializada e publicada no mural!');
        setTimeout(() => setShiftSuccessMsg(''), 3500);
      }

      // Reset selection
      setSelectedWorkerIdsForShift([]);
    } catch (err) {
      console.error('Erro ao registrar escala:', err);
    }
  };

  const handleRegisterWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageWorkers) {
      setErrorMsg('Acesso Negado: Apenas engenheiros civis têm autorização para admitir trabalhadores.');
      return;
    }

    if (!workerName || !workerPhone || !workerCpf) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/sites/${siteId}/workers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: workerName,
          role: workerRole,
          phone: workerPhone,
          cpf: workerCpf
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar trabalhador.');
      }

      setSuccessMsg(`Trabalhador "${workerName}" inscrito com sucesso!`);
      setWorkerName('');
      setWorkerPhone('');
      setWorkerCpf('');
      onWorkersChanged();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorker = async (id: string) => {
    if (!canManageWorkers) {
      alert('Acesso Negado: Apenas o perfil de Engenheiro Civil pode excluir ou desligar pessoas.');
      return;
    }
    if (!confirm('Deseja realmente desligar ou remover este trabalhador da lista desta obra?')) return;
    try {
      const res = await fetch(`/api/sites/${siteId}/workers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        onWorkersChanged();
      }
    } catch (err) {
      console.error('Falha ao remover trabalhador:', err);
    }
  };

  const handleSendMasterDirective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkerForMsg || !masterDirectMsgText.trim() || !onSendMessage) return;
    setMsgSending(true);
    try {
      const formatted = `✉️ [DIRETIVA_MESTRE] Para: ${selectedWorkerForMsg.name} (${selectedWorkerForMsg.role}) ➔ "${masterDirectMsgText.trim()}"`;
      await onSendMessage(formatted);
      setMsgSuccess(`Diretiva enviada com sucesso para ${selectedWorkerForMsg.name}!`);
      setMasterDirectMsgText('');
      setTimeout(() => {
        setMsgSuccess('');
        setSelectedWorkerForMsg(null);
      }, 1500);
    } catch (err) {
      console.error('Erro ao enviar diretiva:', err);
    } finally {
      setMsgSending(false);
    }
  };

  return (
    <div id="footer-utilities-wrapper" className="mt-8 border-t border-slate-200 pt-6">
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800">
        <div className="mb-4 text-center sm:text-left">
          <h3 className="text-base font-bold text-amber-400">Suporte Operacional & Gestão do Canteiro</h3>
          <p className="text-xs text-slate-400">Consulte manuais, contatos de emergência e faça a admissão de novos trabalhadores diretamente no campo.</p>
        </div>

        {/* 5 BOTTOM BUTTONS PANEL */}
        <div id="footer-utility-buttons" className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            id="btn-nr18-info"
            onClick={() => setActiveModal('nr18')}
            className="flex flex-col items-center justify-center p-3.5 bg-slate-800 hover:bg-slate-700/80 active:bg-slate-800 text-center rounded-2xl border border-slate-750 transition-all cursor-pointer group"
          >
            <ShieldAlert className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform mb-1.5" />
            <span className="text-xs font-bold block text-slate-200">Normas NR-18</span>
            <span className="text-[9px] text-slate-400 mt-0.5">Segurança do Trabalho</span>
          </button>

          <button
            id="btn-emergency-contacts"
            onClick={() => setActiveModal('emergency')}
            className="flex flex-col items-center justify-center p-3.5 bg-slate-800 hover:bg-slate-700/80 active:bg-slate-800 text-center rounded-2xl border border-slate-750 transition-all cursor-pointer group"
          >
            <PhoneCall className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform mb-1.5" />
            <span className="text-xs font-bold block text-slate-200">Contatos Úteis</span>
            <span className="text-[9px] text-slate-400 mt-0.5">Canais de Emergência</span>
          </button>

          <button
            id="btn-shifts-schedule"
            onClick={() => setActiveModal('shifts')}
            className="flex flex-col items-center justify-center p-3.5 bg-slate-800 hover:bg-slate-700/80 active:bg-slate-800 text-center rounded-2xl border border-slate-750 transition-all cursor-pointer group"
          >
            <Clock className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform mb-1.5" />
            <span className="text-xs font-bold block text-slate-200">Turnos & Horários</span>
            <span className="text-[9px] text-slate-400 mt-0.5">Escalas de Trabalho</span>
          </button>

          <button
            id="btn-epis-recommendations"
            onClick={() => setActiveModal('epis')}
            className="flex flex-col items-center justify-center p-3.5 bg-slate-800 hover:bg-slate-700/80 active:bg-slate-800 text-center rounded-2xl border border-slate-750 transition-all cursor-pointer group"
          >
            <HardHat className="h-5 w-5 text-amber-400 group-hover:scale-110 transition-transform mb-1.5" />
            <span className="text-xs font-bold block text-slate-200">EPIs por Setor</span>
            <span className="text-[9px] text-slate-400 mt-0.5">Equipamentos Obrigatórios</span>
          </button>

          <button
            id="btn-subscribe-worker"
            onClick={() => {
              setActiveModal('register');
              onWorkersChanged();
            }}
            className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-3.5 bg-amber-500 hover:bg-amber-450 active:bg-amber-500 text-center rounded-2xl border border-amber-600 transition-all cursor-pointer group shadow-lg shadow-amber-500/10 text-slate-950"
          >
            <UserPlus className="h-5 w-5 text-slate-950 group-hover:scale-110 transition-transform mb-1.5" />
            <span className="text-xs font-black block">Se Inscrever / Equipe</span>
            <span className="text-[9px] text-slate-900/80 mt-0.5 font-bold">Ficha de Contratação</span>
          </button>
        </div>
      </div>

      {/* MODAL 1: NORMAS DE SEGURANÇA (NR-18) */}
      {activeModal === 'nr18' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 text-slate-900 border-b border-slate-100 pb-3">
              <ShieldAlert className="h-6 w-6 text-amber-500" />
              <h4 className="font-extrabold text-base">Diretrizes da Norma NR-18 (Segurança do Trabalho)</h4>
            </div>

            <div className="space-y-4 text-xs text-slate-650 leading-relaxed overflow-y-auto max-h-[350px] pr-1.5">
              <p>A <strong>NR-18 (Segurança e Saúde no Trabalho na Indústria da Construção)</strong> estabelece diretrizes de ordem administrativa, de planejamento e de organização, que visam à implementação de medidas de controle e sistemas preventivos de segurança.</p>
              
              <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 space-y-2">
                <span className="font-bold text-slate-900 uppercase tracking-wider block text-[10px]">⚠️ Regras de Ouro no Canteiro:</span>
                <ul className="list-disc list-inside space-y-1.5">
                  <li><strong>Uso obrigatório de EPI completo</strong> durante toda a permanência na obra (Capacete com jugular, bota de biqueira de aço, óculos de proteção).</li>
                  <li><strong>Trabalho em Altura (acima de 2m)</strong> exige treinamento NR-35 específico e uso indispensável de cinturão tipo paraquedista ancorado em linha de vida.</li>
                  <li><strong>Proteções Coletivas (EPCs)</strong> como guarda-corpos em vãos de laje e poços de elevador jamais devem ser removidos sem autorização.</li>
                  <li><strong>Ferramentas Elétricas</strong> devem estar com cabos em perfeitas condições, sem emendas expostas e ligadas a quadros com proteção DR.</li>
                </ul>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <span className="font-bold text-slate-800 block mb-1">Capacitação Diária (DDS):</span>
                <p>O Diálogo Diário de Segurança deve ser realizado todas as manhãs antes do início do expediente pelo Mestre de Obras ou Encarregado para debater os riscos do serviço do dia.</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-150 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Entendi as Normas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONTATOS ÚTEIS / EMERGÊNCIA */}
      {activeModal === 'emergency' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 text-slate-900 border-b border-slate-100 pb-3">
              <PhoneCall className="h-6 w-6 text-rose-500" />
              <h4 className="font-extrabold text-base">Contatos de Emergência & Apoio</h4>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-rose-50 border border-rose-100 p-3 rounded-2xl text-center">
                  <span className="text-[9px] text-rose-700 font-bold uppercase tracking-wider block">SAMU</span>
                  <strong className="text-rose-800 font-mono text-lg block mt-0.5">192</strong>
                  <span className="text-[9px] text-slate-500 block">Atendimento Móvel</span>
                </div>

                <div className="bg-red-50 border border-red-100 p-3 rounded-2xl text-center">
                  <span className="text-[9px] text-red-700 font-bold uppercase tracking-wider block">BOMBEIROS</span>
                  <strong className="text-red-800 font-mono text-lg block mt-0.5">193</strong>
                  <span className="text-[9px] text-slate-500 block">Incêndios & Resgates</span>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5 text-xs text-slate-700">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <div>
                    <span className="font-bold text-slate-900 block">Segurança do Trabalho (CIPA)</span>
                    <span className="text-[10px] text-slate-500">Eng. Roberto / Técnico João</span>
                  </div>
                  <strong className="font-mono text-slate-800">(11) 98765-4321</strong>
                </div>

                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <div>
                    <span className="font-bold text-slate-900 block">Mestre de Obras Geral</span>
                    <span className="text-[10px] text-slate-500">Mestre Sebastião</span>
                  </div>
                  <strong className="font-mono text-slate-800">(11) 91234-5678</strong>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900 block">Ambulatório / Almoxarifado</span>
                    <span className="text-[10px] text-slate-500">Setor Administrativo Local</span>
                  </div>
                  <strong className="font-mono text-slate-800">Ramal: #2204</strong>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-150 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Fechar Contatos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: TURNOS & HORÁRIOS */}
      {activeModal === 'shifts' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl relative my-8">
            <button
              onClick={() => {
                setActiveModal(null);
                setShowAwardModal(false);
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 text-slate-900 border-b border-slate-100 pb-3">
              <Clock className="h-6 w-6 text-sky-500" />
              <div>
                <h4 className="font-extrabold text-base leading-none">Grade de Turnos & Escala de Trabalho</h4>
                <p className="text-[10px] text-slate-500 mt-1">Gerencie os horários operacionais ou escale a equipe ativa do canteiro.</p>
              </div>
            </div>

            {/* TAB SELECTOR INSIDE THE MODAL */}
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-4 border border-slate-200/50">
              <button
                type="button"
                onClick={() => setActiveShiftTab('hours')}
                className={`flex-1 py-2 text-center rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeShiftTab === 'hours'
                    ? 'bg-white text-slate-950 shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🕒 Grade de Horários
              </button>
              <button
                type="button"
                onClick={() => setActiveShiftTab('scale')}
                className={`flex-1 py-2 text-center rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeShiftTab === 'scale'
                    ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                👥 Escalar Equipe
              </button>
            </div>

            {activeShiftTab === 'hours' ? (
              <div className="space-y-3.5 text-xs text-slate-700 animate-in fade-in duration-100">
                <p className="leading-relaxed text-slate-500">Expediente oficial e intervalos obrigatórios regulamentados para os funcionários do canteiro de obras.</p>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] uppercase text-slate-500 tracking-wider border-b border-slate-150">
                        <th className="p-3 font-bold">Atividade</th>
                        <th className="p-3 font-bold text-right">Horário</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      <tr>
                        <td className="p-3 text-slate-900 font-bold">Entrada & DDS (Diálogo de Segurança)</td>
                        <td className="p-3 text-right text-slate-600 font-mono">07:00</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-slate-900 font-bold">Intervalo de Café (Lanche)</td>
                        <td className="p-3 text-right text-slate-600 font-mono">09:00 - 09:15</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-emerald-700 font-bold">Almoço & Descanso Diário</td>
                        <td className="p-3 text-right text-emerald-600 font-mono font-bold">12:00 - 13:00</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-slate-900 font-bold">Retorno às Atividades de Campo</td>
                        <td className="p-3 text-right text-slate-600 font-mono">13:00</td>
                      </tr>
                      <tr>
                        <td className="p-3 text-slate-900 font-bold">Encerramento & Limpeza do Posto</td>
                        <td className="p-3 text-right text-slate-600 font-mono">16:45 - 17:00</td>
                      </tr>
                      <tr className="bg-amber-50/40 text-amber-900 font-bold">
                        <td className="p-3">Saída Geral (Segunda a Sexta)</td>
                        <td className="p-3 text-right font-mono">17:00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-150 text-[10px] text-slate-500 flex items-start gap-2 leading-relaxed">
                  <span className="font-extrabold text-amber-500">Aviso:</span>
                  <span>Horas extras necessitam de aprovação formal prévia da equipe de engenharia e devem ser registradas na folha de ponto biométrica do canteiro.</span>
                </div>
              </div>
            ) : (
              /* INTERACTIVE TEAM SCHEDULER (Escala de equipe) */
              <div className="space-y-4 animate-in fade-in duration-100">
                {shiftSuccessMsg && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-2xl font-bold text-center">
                    {shiftSuccessMsg}
                  </div>
                )}

                <form onSubmit={handleConfirmScale} className="space-y-3">
                  <div>
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 font-mono">1. Selecionar Turno Operacional</label>
                    <select
                      value={selectedShiftType}
                      onChange={(e) => setSelectedShiftType(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-55 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="Turno Diurno (07:00 - 17:00)">Turno Diurno (07:00 - 17:00)</option>
                      <option value="Turno Noturno / Extra (17:00 - 22:00)">Turno Noturno / Extra (17:00 - 22:00)</option>
                      <option value="Turno Especial de Sábado (07:00 - 12:00)">Turno Especial de Sábado (07:00 - 12:00)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 font-mono">2. Descrição da Atividade / Frente de Serviço</label>
                    <input
                      type="text"
                      required
                      value={shiftTaskDescription}
                      onChange={(e) => setShiftTaskDescription(e.target.value)}
                      placeholder="Ex: Armação de ferragens pilares bloco B"
                      className="w-full px-3 py-2 bg-slate-55 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 font-mono">3. Marcar Colaboradores para a Escala ({selectedWorkerIdsForShift.length})</label>
                    {workers.length === 0 ? (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-[10px] text-slate-450">
                        Nenhum funcionário disponível no canteiro para escalar.
                      </div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2.5 space-y-1.5 bg-slate-50/50">
                        {workers.map((worker) => {
                          const isChecked = selectedWorkerIdsForShift.includes(worker.id);
                          return (
                            <label
                              key={worker.id}
                              className="flex items-center gap-2.5 p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer text-xs select-none"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedWorkerIdsForShift(prev => prev.filter(id => id !== worker.id));
                                  } else {
                                    setSelectedWorkerIdsForShift(prev => [...prev, worker.id]);
                                  }
                                }}
                                className="h-4 w-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500 cursor-pointer"
                              />
                              <div className="flex-1 flex justify-between items-center">
                                <span className="font-bold text-slate-800">{worker.name}</span>
                                <span className="text-[9px] font-bold bg-slate-200/80 px-1.5 py-0.2 rounded text-slate-600">{worker.role}</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={selectedWorkerIdsForShift.length === 0}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 font-mono"
                  >
                    <Check className="h-4 w-4 stroke-[3]" />
                    Oficializar Escala de Trabalho
                  </button>
                </form>

                {/* SPECIAL AWARD MODAL OVERLAY FOR MASTER BUILDERS */}
                {showAwardModal && currentUser.role === 'master_builder' && (
                  <div className="p-4 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl text-slate-950 space-y-3 shadow-xl relative overflow-hidden animate-in zoom-in-95 duration-200">
                    {/* Glowing background circles */}
                    <div className="absolute -top-10 -right-10 h-24 w-24 bg-white/20 rounded-full blur-lg" />
                    
                    <div className="flex items-center gap-2.5 border-b border-white/20 pb-2">
                      <Award className="h-7 w-7 text-white animate-bounce shrink-0" />
                      <div>
                        <h5 className="font-extrabold text-sm text-white uppercase tracking-wider">Premiação de Liderança Desbloqueada!</h5>
                        <p className="text-[9px] text-white/90">Certificado Operacional emitido pela Engenharia Civil</p>
                      </div>
                    </div>

                    <div className="bg-slate-950/90 text-white rounded-xl p-3 border border-amber-400/30 text-center font-mono relative">
                      <Sparkles className="absolute top-2 right-2 text-amber-400 h-4.5 w-4.5 animate-pulse" />
                      <span className="text-[9px] text-amber-400 font-bold block tracking-widest uppercase">// CERTIFICADO DE EXCELÊNCIA NR-18</span>
                      <strong className="text-sm text-white block mt-2 font-sans font-black uppercase tracking-tight">🏆 Mestre {currentUser.name}</strong>
                      <p className="text-[10px] text-slate-400 mt-2 font-sans leading-relaxed">
                        Parabéns! Pela montagem correta das frentes de serviço e segurança operacional da obra, você ativou o bônus semanal de liderança!
                      </p>
                      <div className="mt-3.5 pt-2 border-t border-slate-800 flex justify-between items-center text-[8.5px] text-slate-500">
                        <span>DATA: {new Date().toLocaleDateString('pt-BR')}</span>
                        <span className="text-emerald-400 font-bold">STATUS: PREMIAÇÃO_PAGA</span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-1.5 pt-1 text-[10px]">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAwardModal(false);
                          setActiveModal(null);
                        }}
                        className="px-4 py-1.5 bg-slate-950 text-amber-400 font-black rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
                      >
                        COLETAR PRÊMIO 🏆
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-150 flex justify-end">
              <button
                onClick={() => {
                  setActiveModal(null);
                  setShowAwardModal(false);
                }}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: EPIS RECOMENDADOS */}
      {activeModal === 'epis' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 text-slate-900 border-b border-slate-100 pb-3">
              <HardHat className="h-6 w-6 text-amber-500" />
              <h4 className="font-extrabold text-base">EPIs de Uso Obrigatório por Setor</h4>
            </div>

            <div className="space-y-4 text-xs overflow-y-auto max-h-[380px] pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
                  <strong className="text-slate-900 font-bold text-xs border-b border-slate-105 pb-1 block">🧱 Alvenaria / Estruturas</strong>
                  <p className="text-slate-500 leading-relaxed text-[11px]">Pedreiros, carpinteiros e armadores de ferragem.</p>
                  <ul className="list-disc list-inside text-slate-700 text-[10px] space-y-1">
                    <li>Capacete de proteção</li>
                    <li>Óculos de segurança ampla visão</li>
                    <li>Luva de raspa ou látex</li>
                    <li>Protetor auricular tipo concha</li>
                    <li>Cinto de segurança tipo paraquedista</li>
                  </ul>
                </div>

                <div className="border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
                  <strong className="text-slate-900 font-bold text-xs border-b border-slate-105 pb-1 block">⚡ Instalações Elétricas</strong>
                  <p className="text-slate-500 leading-relaxed text-[11px]">Eletricistas e auxiliares de elétrica.</p>
                  <ul className="list-disc list-inside text-slate-700 text-[10px] space-y-1">
                    <li>Capacete de proteção (Classe B)</li>
                    <li>Calçados dielétricos (sem biqueira metálica)</li>
                    <li>Luva de borracha isolante (alta tensão)</li>
                    <li>Viseira de proteção facial contra arco</li>
                    <li>Uniforme retardante de chama (NR-10)</li>
                  </ul>
                </div>

                <div className="border border-slate-200 rounded-2xl p-3.5 space-y-1.5">
                  <strong className="text-slate-900 font-bold text-xs border-b border-slate-105 pb-1 block">🚿 Acabamentos & Hidráulica</strong>
                  <p className="text-slate-500 leading-relaxed text-[11px]">Encanadores, azulejistas e pintores.</p>
                  <ul className="list-disc list-inside text-slate-700 text-[10px] space-y-1">
                    <li>Máscara semi-facial para vapores/poeira</li>
                    <li>Óculos de proteção transparente</li>
                    <li>Luva de borracha nitrílica ou PVC</li>
                    <li>Avental impermeável de PVC</li>
                    <li>Joelheiras anatômicas para revestimentos</li>
                  </ul>
                </div>

                <div className="border border-slate-200 rounded-2xl p-3.5 space-y-1.5 bg-slate-50 border-dashed">
                  <strong className="text-slate-900 font-bold text-xs border-b border-slate-105 pb-1 block">📦 Como solicitar troca?</strong>
                  <p className="text-slate-600 leading-relaxed text-[10px]">
                    Em caso de desgaste natural de suas luvas, óculos ou máscaras de proteção, procure o almoxarifado munido de sua ficha individual de recebimento de EPI para efetuar a substituição imediata sem qualquer custo.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-150 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Voltar ao Painel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: SE INSCREVER / CADASTRO DE NOVO TRABALHADOR */}
      {activeModal === 'register' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 border border-slate-200 shadow-2xl relative my-8">
            <button
              onClick={() => {
                setActiveModal(null);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 text-slate-900 border-b border-slate-100 pb-3">
              <UserPlus className="h-6 w-6 text-amber-500" />
              <div>
                <h4 className="font-extrabold text-base leading-none">Inscrição & Admissão de Trabalhador</h4>
                <p className="text-[10px] text-slate-500 mt-1">Registre operários ativos no canteiro para montagem das escalas e folha de ponto.</p>
              </div>
            </div>

            {/* ERROR AND SUCCESS ALERT MESSAGES */}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-750 text-xs p-3.5 rounded-2xl mb-4 font-semibold">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3.5 rounded-2xl mb-4 font-semibold flex items-center gap-1.5">
                <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
                {successMsg}
              </div>
            )}

            {/* PERMISSION CHECK MESSAGE FOR WORKERS & SUPERVISORS */}
            {!canManageWorkers && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 mb-6 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-black">
                  <ShieldAlert className="h-4.5 w-4.5 text-amber-600 shrink-0" />
                  <span>Acesso Restrito: Apenas Engenheiro Civil</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed pl-6">
                  Sua conta atual ({currentUser.name} - <strong>{currentUser.role}</strong>) não possui nível de autorização para admitir trabalhadores. Apenas o Engenheiro Civil responsável pode oficializar novas contratações.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form Column */}
              <form onSubmit={handleRegisterWorker} className="lg:col-span-7 space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Nome Completo do Empregado *</label>
                  <input
                    id="worker-name-input"
                    type="text"
                    required
                    disabled={!canManageWorkers || loading}
                    value={workerName}
                    onChange={(e) => setWorkerName(e.target.value)}
                    placeholder="Ex: Carlos Eduardo de Oliveira"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Telefone / Contato *</label>
                    <input
                      id="worker-phone-input"
                      type="text"
                      required
                      disabled={!canManageWorkers || loading}
                      value={workerPhone}
                      onChange={(e) => setWorkerPhone(e.target.value)}
                      placeholder="(11) 98888-7777"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">CPF do Trabalhador *</label>
                    <input
                      id="worker-cpf-input"
                      type="text"
                      required
                      disabled={!canManageWorkers || loading}
                      value={workerCpf}
                      onChange={(e) => setWorkerCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1">Cargo / Especialidade de Serviço *</label>
                  <select
                    id="worker-role-select"
                    disabled={!canManageWorkers || loading}
                    value={workerRole}
                    onChange={(e) => setWorkerRole(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-60 transition-all"
                  >
                    <option value="Pedreiro">Pedreiro de Alvenaria</option>
                    <option value="Servente de Obras">Servente / Ajudante Geral</option>
                    <option value="Carpinteiro">Carpinteiro de Fôrmas</option>
                    <option value="Armador de Ferragem">Armador de Ferragem</option>
                    <option value="Eletricista">Eletricista Instalador</option>
                    <option value="Encanador">Encanador / Instalador Hidráulico</option>
                    <option value="Pintor">Pintor de Acabamentos</option>
                    <option value="Azulejista">Azulejista / Pastilheiro</option>
                  </select>
                </div>

                {canManageWorkers && (
                  <button
                    id="submit-worker-btn"
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Cadastrando no banco...' : 'Confirmar Inscrição'}
                  </button>
                )}
              </form>

              {/* Workers list Column */}
              <div className="lg:col-span-5 flex flex-col h-[320px] bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-3 bg-slate-100/80 border-b border-slate-200 font-bold text-[10px] uppercase text-slate-600 flex items-center justify-between">
                  <span>Trabalhadores Ativos ({workers.length})</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 relative">
                  {workers.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <span className="text-[10px] text-slate-450 font-semibold block">Nenhum trabalhador cadastrado nesta obra</span>
                    </div>
                  ) : (
                    workers.map((worker) => {
                      const roleStyle = getRoleStyle(worker.role);
                      const initials = getInitials(worker.name);

                      return (
                        <div key={worker.id}>
                          <HoldToDelete
                            onDelete={() => handleDeleteWorker(worker.id)}
                            disabled={!canManageWorkers}
                            itemName={worker.name}
                          >
                            <div
                              id={`worker-row-${worker.id}`}
                              className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm text-xs flex gap-3 items-center justify-between hover:border-slate-300 transition-all h-full"
                            >
                              <div className="flex items-center gap-2.5">
                                {/* Worker Custom Icon/Avatar with Role Badge */}
                                <div className="relative shrink-0">
                                  <div className={`h-9 w-9 rounded-full flex items-center justify-center text-[10px] font-black border-2 ${roleStyle.bg} shadow-sm`}>
                                    {initials}
                                  </div>
                                  <span className="absolute -bottom-1 -right-1 text-xs bg-white rounded-full p-0.5 shadow-sm border border-slate-100 leading-none">
                                    {roleStyle.char}
                                  </span>
                                </div>

                                <div>
                                  <strong className="text-slate-850 font-bold block leading-tight">{worker.name}</strong>
                                <span className="text-[9px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded-md mt-1 inline-block uppercase">{worker.role}</span>
                                <span className="text-[8px] text-slate-400 block mt-1">Contato: {worker.phone}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Send Master Directive button - Available for Mestre and Engineers */}
                              {hasPermission && onSendMessage && (
                                <button
                                  id={`btn-directive-worker-${worker.id}`}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedWorkerForMsg(worker);
                                    setMasterDirectMsgText('');
                                  }}
                                  className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-amber-600 rounded-lg transition-all cursor-pointer"
                                  title="Enviar Diretiva do Mestre"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                </button>
                              )}

                              {canManageWorkers && (
                                <button
                                  id={`btn-delete-worker-${worker.id}`}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteWorker(worker.id);
                                  }}
                                  className="p-1.5 text-slate-450 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Segure o card por 1s ou clique para excluir"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </HoldToDelete>
                      </div>
                      );
                    })
                  )}

                  {/* MASTER DIRECTIVE POPUP MODAL OVERLAY */}
                  {selectedWorkerForMsg && (
                    <div className="absolute inset-0 bg-slate-900/90 rounded-2xl flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
                      <div className="bg-white rounded-2xl max-w-sm w-full p-4 border border-slate-200 shadow-xl relative text-slate-950">
                        <button
                          onClick={() => setSelectedWorkerForMsg(null)}
                          className="absolute top-2.5 right-2.5 p-1 text-slate-400 hover:text-slate-650 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>

                        <div className="flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-2.5">
                          <div className="h-8 w-8 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center text-sm font-black">
                            ✉️
                          </div>
                          <div>
                            <h5 className="font-extrabold text-xs text-slate-900 leading-none">Diretiva do Mestre</h5>
                            <p className="text-[9px] text-slate-500 mt-0.5">Para: <strong className="text-slate-700">{selectedWorkerForMsg.name}</strong></p>
                          </div>
                        </div>

                        {msgSuccess ? (
                          <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs p-3 rounded-xl font-bold text-center">
                            {msgSuccess}
                          </div>
                        ) : (
                          <form onSubmit={handleSendMasterDirective} className="space-y-2.5">
                            <div>
                              <label className="block text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">Escreva a instrução para o trabalhador:</label>
                              <textarea
                                rows={3}
                                required
                                value={masterDirectMsgText}
                                onChange={(e) => setMasterDirectMsgText(e.target.value)}
                                placeholder="Ex: Favor conferir o nível do assentamento dos blocos antes de iniciar o reboco da parede..."
                                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-slate-400"
                              />
                            </div>

                            <div className="flex gap-2 justify-end text-[10px]">
                              <button
                                type="button"
                                onClick={() => setSelectedWorkerForMsg(null)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-slate-650 cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                type="submit"
                                disabled={msgSending || !masterDirectMsgText.trim()}
                                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                              >
                                {msgSending ? 'Enviando...' : 'Enviar Diretiva'}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-150 flex justify-end">
              <button
                onClick={() => {
                  setActiveModal(null);
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
              >
                Concluir Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
