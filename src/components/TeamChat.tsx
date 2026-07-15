import React, { useState, useEffect, useRef } from 'react';
import { TeamMessage, User, WorkerRegistry } from '../types';
import { Send, MessageSquare, ShieldAlert, Users, Info, ThumbsUp, CheckCircle, Clock, AlertTriangle, MessageSquareHeart, UserCheck, Eye, EyeOff } from 'lucide-react';
import { getRoleStyle, getInitials } from './FooterUtilities';

interface TeamChatProps {
  siteId: string;
  messages: TeamMessage[];
  currentUser: User;
  onSendMessage: (message: string) => Promise<void>;
  workers: WorkerRegistry[];
}

export default function TeamChat({ siteId, messages, currentUser, onSendMessage, workers }: TeamChatProps) {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<WorkerRegistry | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const userJustSent = useRef(false);

  // Parse structured report, direct, or directive messages
  const parseSpecialMessage = (messageText: string) => {
    // 1. Check if operational report
    if (messageText.startsWith('📢')) {
      const bracketMatch = messageText.match(/^📢\s*\[(.*?)\]\s*(.*)$/s);
      if (bracketMatch) {
        const headerContent = bracketMatch[1];
        const bodyContent = bracketMatch[2];
        
        if (headerContent.includes('RELATO_ANDAMENTO')) {
          const segments = headerContent.split('|').map(s => s.trim());
          let etapa = '';
          let progresso = '';
          let urgente = false;
          let mestre = '';
          
          segments.forEach(seg => {
            if (seg.startsWith('ETAPA:')) {
              etapa = seg.replace('ETAPA:', '').trim();
            } else if (seg.startsWith('PROGRESSO:')) {
              progresso = seg.replace('PROGRESSO:', '').trim();
            } else if (seg.startsWith('URGENTE:')) {
              urgente = seg.replace('URGENTE:', '').trim() === 'SIM';
            } else if (seg.startsWith('MESTRE:')) {
              mestre = seg.replace('MESTRE:', '').trim();
            }
          });
          
          return {
            type: 'report' as const,
            etapa,
            progresso,
            urgente,
            mestre,
            body: bodyContent
          };
        }
      }
    }

    // 2. Check if master directive from FooterUtilities
    const directiveMatch = messageText.match(/^✉️\s*\[DIRETIVA_MESTRE\]\s*Para:\s*(.*?)\s*\((.*?)\)\s*➔\s*"(.*?)"$/s);
    if (directiveMatch) {
      return {
        type: 'directive' as const,
        recipient: directiveMatch[1],
        role: directiveMatch[2],
        body: directiveMatch[3]
      };
    }

    // 3. Check if standard direct message targeted from Chat
    const dmMatch = messageText.match(/^✉️\s*\[MENSAGEM_DIRETA\s*\|\s*PARA:\s*(.*?)\s*\]\s*(.*)$/s);
    if (dmMatch) {
      return {
        type: 'dm' as const,
        recipient: dmMatch[1],
        body: dmMatch[2]
      };
    }

    return { type: 'plain' as const, body: messageText };
  };

  // Smart scroll to bottom (only when near bottom or when user just submitted a message)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (isNearBottom || userJustSent.current) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      userJustSent.current = false;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      let finalMsg = newMessage;
      if (selectedRecipient) {
        finalMsg = `✉️ [MENSAGEM_DIRETA | PARA: ${selectedRecipient.name}] ${newMessage}`;
      }
      userJustSent.current = true;
      await onSendMessage(finalMsg);
      setNewMessage('');
      setSelectedRecipient(null);
    } catch (err) {
      console.error('Falha ao enviar mensagem:', err);
    } finally {
      setSending(false);
    }
  };

  const handleAcknowledgeReport = async (etapa: string, workerName: string) => {
    if (sending) return;
    setSending(true);
    try {
      const ackMessage = `👍 Ciente do relato sobre "${etapa}". Excelente trabalho, equipe do ${workerName}! Continuem firmes no cronograma.`;
      userJustSent.current = true;
      await onSendMessage(ackMessage);
    } catch (err) {
      console.error('Erro ao enviar ciente:', err);
    } finally {
      setSending(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'engineer':
        return <span className="bg-slate-900 text-slate-100 text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Engenheiro</span>;
      case 'master_builder':
        return <span className="bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Mestre</span>;
      case 'supervisor':
        return <span className="bg-orange-500 text-white text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Encarregado</span>;
      default:
        return <span className="bg-slate-200 text-slate-700 text-[9px] px-2 py-0.5 rounded-md font-medium uppercase tracking-wider">Operário</span>;
    }
  };

  return (
    <div id="team-chat-root" className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[520px] overflow-hidden">
      {/* Chat Header */}
      <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-slate-900 text-white rounded-lg flex items-center justify-center shadow-sm">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900">Mural de Comunicação da Equipe</h3>
            <p className="text-[10px] text-slate-500 font-medium">Avisos, alinhamentos diários e comunicados gerais da obra.</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-xl text-xs font-semibold">
          <Users className="h-3.5 w-3.5" />
          <span>Equipe</span>
        </div>
      </div>

      {/* Worker Icons Selector for Directed Messaging */}
      {workers && workers.length > 0 && (
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider shrink-0 mr-1">Mensagem Direta:</span>
          
          <button
            type="button"
            onClick={() => setSelectedRecipient(null)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer shrink-0 ${
              !selectedRecipient
                ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <Users className="h-3 w-3" />
            <span>Todos (Mural)</span>
          </button>

          {workers.map((worker) => {
            const roleStyle = getRoleStyle(worker.role);
            const isSelected = selectedRecipient?.id === worker.id;

            return (
              <button
                key={worker.id}
                type="button"
                onClick={() => setSelectedRecipient(isSelected ? null : worker)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-sm ring-2 ring-amber-500/20'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 shadow-sm'
                }`}
              >
                <span>{roleStyle.char}</span>
                <span>{worker.name.split(' ')[0]}</span>
                <span className="text-[8px] opacity-75 font-mono px-1 py-0.2 bg-slate-100 rounded">
                  {worker.role.substring(0, 4)}...
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Messages List Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <MessageSquare className="h-8 w-8 text-slate-300 mb-2" />
            <h4 className="font-bold text-slate-700 text-xs">Mural limpo</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs leading-relaxed">
              Sem comunicados postados. Envie instruções de trabalho ou avisos de segurança no campo de entrada abaixo.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderName === currentUser.name;
            const special = parseSpecialMessage(msg.message);

            // RENDER OPERATIONAL REPORT
            if (special.type === 'report') {
              // Enforce privacy: "cada mensagem relatando informações da obra devem ser enviada unicamente pro mestre encarregado a ela"
              if (special.mestre) {
                const isTargetMestre = currentUser.name.toLowerCase() === special.mestre.toLowerCase();
                const isEngineer = currentUser.role === 'engineer';
                const canView = isTargetMestre || isEngineer || isMe;
                
                if (!canView) return null; // Filter out this private report for other users
              }

              return (
                <div
                  key={msg.id}
                  id={`chat-report-${msg.id}`}
                  className="w-full max-w-xl mx-auto my-3 bg-white border rounded-2xl shadow-sm overflow-hidden border-slate-200"
                >
                  {/* Report Card Header */}
                  <div className={`px-4 py-2.5 flex items-center justify-between text-[11px] font-bold ${
                    special.urgente 
                      ? 'bg-rose-50 text-rose-700 border-b border-rose-100' 
                      : 'bg-amber-50/70 text-amber-800 border-b border-amber-100'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      {special.urgente ? (
                        <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 animate-bounce" />
                      ) : (
                        <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                      )}
                      <span className="uppercase tracking-wider">📢 Relatório Operacional de Campo</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Report Details Board */}
                  <div className="p-4 space-y-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Etapa Informada</span>
                        <strong className="text-xs text-slate-800">{special.etapa}</strong>
                      </div>
                      <div className="flex items-center gap-1.5 self-start sm:self-auto">
                        <span className="text-[10px] font-black bg-amber-500/10 text-amber-700 border border-amber-500/20 px-2 py-0.5 rounded-md">
                          Progresso: {special.progresso}
                        </span>
                        {special.urgente && (
                          <span className="text-[9px] font-black bg-rose-500 text-white px-2 py-0.5 rounded-md animate-pulse">
                            ALTA PRIORIDADE
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-slate-700 leading-relaxed bg-white border border-slate-100 p-3 rounded-xl font-medium">
                      <span className="text-[9px] font-bold text-slate-400 block mb-1">Informe enviado por {msg.senderName} ({getRoleBadge(msg.senderRole)}):</span>
                      <p className="whitespace-pre-line text-slate-800">{special.body}</p>
                    </div>

                    {/* Supervisor Quick Acknowledgement Action */}
                    {(currentUser.role === 'engineer' || currentUser.role === 'master_builder') && (
                      <div className="pt-2 border-t border-slate-100 flex justify-end">
                        <button
                          type="button"
                          disabled={sending}
                          onClick={() => handleAcknowledgeReport(special.etapa || '', msg.senderName)}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-900 text-white text-[10px] font-extrabold rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          <ThumbsUp className="h-3 w-3" />
                          <span>Marcar como Visto & Responder</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // RENDER MASTER DIRECTIVE BULLETIN (Gold Cards)
            if (special.type === 'directive') {
              return (
                <div
                  key={msg.id}
                  id={`chat-directive-${msg.id}`}
                  className="w-full max-w-xl mx-auto my-2 bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/30 rounded-2xl shadow-sm overflow-hidden animate-in fade-in"
                >
                  <div className="px-4 py-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/20 flex items-center justify-between text-[10px] font-black text-amber-900">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">⚡</span>
                      <span className="uppercase tracking-wider">DIRETIVA IMEDIATA DO MESTRE DE OBRAS</span>
                    </div>
                    <span className="text-[9px] text-amber-700/60 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="p-3">
                    <div className="text-xs text-slate-700 leading-relaxed bg-white border border-amber-500/10 p-3 rounded-xl font-medium relative overflow-hidden">
                      <span className="text-3xl absolute -bottom-1.5 -right-1 text-slate-100 select-none">👷</span>
                      
                      <div className="mb-2 text-[9px] text-slate-500">
                        Emitido por <strong className="text-slate-800">{msg.senderName}</strong> para o colaborador: 
                        <span className="ml-1.5 font-black bg-amber-500/15 text-amber-800 px-2 py-0.5 rounded-full uppercase text-[8px]">
                          👤 {special.recipient} ({special.role})
                        </span>
                      </div>
                      <p className="whitespace-pre-line text-slate-800 border-l-2 border-amber-500 pl-2.5 font-bold italic">
                        "{special.body}"
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            // RENDER DIRECT WORKER MESSAGE (Indigo Card)
            if (special.type === 'dm') {
              return (
                <div
                  key={msg.id}
                  id={`chat-dm-${msg.id}`}
                  className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'} animate-in fade-in`}
                >
                  {/* Sender metadata */}
                  <div className="flex items-center gap-1.5 mb-1 text-xs">
                    <span className="font-bold text-slate-800">{msg.senderName}</span>
                    {getRoleBadge(msg.senderRole)}
                    <span className="text-[9px] text-slate-400 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Bubble wrapper with high-contrast directed badge */}
                  <div
                    className={`rounded-2xl p-3 text-xs shadow-sm leading-relaxed border ${
                      isMe 
                        ? 'bg-slate-900 border-slate-700 text-white rounded-tr-none font-medium' 
                        : 'bg-indigo-50 border-indigo-200 text-slate-950 rounded-tl-none'
                    }`}
                  >
                    <div className="text-[9px] text-indigo-600 mb-1 flex items-center gap-1 uppercase tracking-wider font-extrabold border-b border-indigo-100/50 pb-1">
                      <UserCheck className="h-3 w-3 shrink-0" />
                      <span>Mensagem Direcionada para: {special.recipient}</span>
                    </div>
                    <p className="whitespace-pre-line">{special.body}</p>
                  </div>
                </div>
              );
            }

            // RENDER GENERAL MESSAGE
            return (
              <div
                key={msg.id}
                id={`chat-msg-${msg.id}`}
                className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                {/* Sender name and role metadata */}
                <div className="flex items-center gap-1.5 mb-1 text-xs">
                  <span className="font-bold text-slate-800">{msg.senderName}</span>
                  {getRoleBadge(msg.senderRole)}
                  <span className="text-[9px] text-slate-400 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Message bubble */}
                <div
                  className={`rounded-2xl p-3.5 text-xs shadow-sm leading-relaxed ${
                    isMe 
                      ? 'bg-slate-900 text-white rounded-tr-none font-medium' 
                      : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{special.body}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Bottom Input Area */}
      <div className="p-3 border-t border-slate-200 bg-white shrink-0">
        {selectedRecipient && (
          <div className="mb-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-[10px] text-amber-800 font-bold flex items-center justify-between animate-in slide-in-from-bottom-1 duration-100">
            <div className="flex items-center gap-1.5">
              <span className="text-xs">✉️</span>
              <span>Mensagem Privada para: <strong className="text-slate-900">{selectedRecipient.name} ({selectedRecipient.role})</strong></span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedRecipient(null)}
              className="px-1 text-slate-500 hover:text-slate-850 font-black cursor-pointer uppercase"
            >
              [Desfazer]
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            id="chat-message-input"
            type="text"
            required
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={
              selectedRecipient
                ? `Enviar mensagem direta para ${selectedRecipient.name.split(' ')[0]}...`
                : "Digite um comunicado para a equipe técnica..."
            }
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all placeholder:text-slate-400"
          />
          <button
            id="chat-send-btn"
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer shadow-sm shrink-0"
            title="Enviar mensagem"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
