import React, { useState } from 'react';
import { Material, User } from '../types';
import { 
  Sparkles, Plus, Trash2, ArrowRightLeft, Package, Check, HelpCircle, 
  PackageCheck, ListPlus, Users, UserPlus, X, ShieldAlert, BadgeAlert 
} from 'lucide-react';
import HoldToDelete from './HoldToDelete';

interface MaterialsSectionProps {
  siteId: string;
  materials: Material[];
  currentUser: User;
  onAddMaterial: (materialData: { name: string; quantityNeeded: number; unit: string; guests?: string[] }) => Promise<void>;
  onUpdateMaterial: (id: string, update: Partial<Material>) => Promise<void>;
  onDeleteMaterial: (id: string) => Promise<void>;
  onSendMessage?: (message: string) => Promise<void>;
}

export default function MaterialsSection({ 
  siteId, materials, currentUser, onAddMaterial, onUpdateMaterial, onDeleteMaterial, onSendMessage 
}: MaterialsSectionProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  
  // Manual add form state
  const [name, setName] = useState('');
  const [quantityNeeded, setQuantityNeeded] = useState('');
  const [unit, setUnit] = useState('sacos');
  const [initialGuest, setInitialGuest] = useState('');

  // AI Estimate state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any[] | null>(null);
  const [aiError, setAiError] = useState('');

  // Quick materials table state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editReceivedVal, setEditReceivedVal] = useState('');

  // Inline Guest Management state
  const [addingGuestMatId, setAddingGuestMatId] = useState<string | null>(null);
  const [newGuestName, setNewGuestName] = useState('');

  const handleSimulateLowStock = async (matName: string) => {
    const mat = materials.find(m => m.name.toLowerCase().includes(matName.toLowerCase()));
    if (!mat) return;
    try {
      const criticalVal = Math.max(1, Math.round(mat.quantityNeeded * 0.05));
      await onUpdateMaterial(mat.id, { quantityReceived: criticalVal });
      if (onSendMessage) {
        await onSendMessage(`⚠️ [ALERTA DE ESTOQUE] O material **${mat.name}** está acabando no canteiro! Estoque atual crítico: apenas **${criticalVal} / ${mat.quantityNeeded} ${mat.unit}** disponíveis.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateReplenish = async (matName: string, amount: number) => {
    const mat = materials.find(m => m.name.toLowerCase().includes(matName.toLowerCase()));
    if (!mat) return;
    try {
      const newQty = mat.quantityReceived + amount;
      await onUpdateMaterial(mat.id, { quantityReceived: newQty });
      if (onSendMessage) {
        await onSendMessage(`🚚 [ENTRADA_MATERIAL] Nova remessa recebida em tempo real! Entrada de **+${amount} ${mat.unit}** de **${mat.name}**. Estoque atualizado para **${newQty} / ${mat.quantityNeeded} ${mat.unit}**.`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !quantityNeeded) return;
    
    try {
      const guestsArr = initialGuest.trim() ? [initialGuest.trim()] : [];
      await onAddMaterial({
        name,
        quantityNeeded: Number(quantityNeeded),
        unit,
        guests: guestsArr
      });
      setName('');
      setQuantityNeeded('');
      setInitialGuest('');
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAiEstimate = async () => {
    if (!aiPrompt) return;
    setAiLoading(true);
    setAiError('');
    setAiResult(null);

    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(`/api/sites/${siteId}/materials/estimate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: aiPrompt })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro na estimativa do Gemini AI.');
      }

      setAiResult(data.materials);
    } catch (err: any) {
      setAiError(err.message || 'Houve uma falha ao consultar a inteligência artificial.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddAiMaterials = async () => {
    if (!aiResult) return;
    try {
      for (const item of aiResult) {
        await onAddMaterial({
          name: item.name,
          quantityNeeded: item.quantityNeeded,
          unit: item.unit
        });
      }
      setShowAiModal(false);
      setAiPrompt('');
      setAiResult(null);
    } catch (err) {
      console.error('Erro ao adicionar materiais gerados pelo IA', err);
    }
  };

  const handleAddGuestToMaterial = async (mat: Material) => {
    if (!newGuestName.trim()) return;
    const currentGuests = mat.guests || [];
    const updatedGuests = [...currentGuests, newGuestName.trim()];
    
    try {
      await onUpdateMaterial(mat.id, { guests: updatedGuests });
      setNewGuestName('');
      setAddingGuestMatId(null);
      if (onSendMessage) {
        await onSendMessage(`👤 [CONVIDADO] **${newGuestName.trim()}** foi adicionado como convidado autorizado para monitorar o insumo **${mat.name}**.`);
      }
    } catch (err) {
      console.error('Erro ao adicionar convidado:', err);
    }
  };

  const handleRemoveGuestFromMaterial = async (mat: Material, guestToRemove: string) => {
    const currentGuests = mat.guests || [];
    const updatedGuests = currentGuests.filter(g => g !== guestToRemove);
    
    try {
      await onUpdateMaterial(mat.id, { guests: updatedGuests });
      if (onSendMessage) {
        await onSendMessage(`👤 [CONVIDADO] Convidado **${guestToRemove}** removido do insumo **${mat.name}**.`);
      }
    } catch (err) {
      console.error('Erro ao remover convidado:', err);
    }
  };

  const getStatusColor = (mat: Material) => {
    if (mat.quantityReceived >= mat.quantityNeeded) {
      return {
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/35',
        text: 'Completo',
        percent: 100
      };
    }
    if (mat.quantityReceived > 0) {
      const p = Math.round((mat.quantityReceived / mat.quantityNeeded) * 100);
      return {
        bg: 'bg-amber-500/10 text-amber-400 border-amber-500/35',
        text: `Parcial (${p}%)`,
        percent: p
      };
    }
    return {
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/35',
      text: 'Pendente',
      percent: 0
    };
  };

  return (
    <div id="materials-container" className="space-y-6 text-slate-100">
      {/* Materials Summary / Top Actions */}
      <div id="materials-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-900">
        <div>
          <h2 className="text-base font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <span className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
            Quantitativos de Estoque & Suprimentos
          </h2>
          <p className="text-[11px] text-slate-400 mt-1">Monitore o saldo físico de insumos entregues em tempo real.</p>
        </div>

        {currentUser.role === 'engineer' ? (
          <div className="flex gap-2 font-mono">
            <button
              id="open-ai-estimator"
              onClick={() => setShowAiModal(true)}
              className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition-all shadow-md shadow-amber-500/15 cursor-pointer"
            >
              <Sparkles className="h-4 w-4 stroke-[3]" />
              Estimador IA
            </button>

            <button
              id="toggle-add-material-form"
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center justify-center gap-1.5 bg-slate-850 hover:bg-slate-700 border border-slate-700 text-white text-xs font-black uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Adicionar Insumo
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 border border-slate-900 rounded-xl text-[10px] text-slate-500 font-mono">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
            <span>ESTOQUE EDITÁVEL APENAS POR ENGENHEIRO CIVIL</span>
          </div>
        )}
      </div>

      {/* Real-time Materials Simulator / Tracking panel */}
      {materials.length > 0 && (
        <div id="realtime-materials-simulator" className="bg-[#090f1d]/90 text-white rounded-3xl p-5 border border-slate-800 shadow-xl relative overflow-hidden animate-in fade-in">
          {/* Decorative background accent */}
          <div className="absolute -top-10 -right-10 h-32 w-32 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <h3 className="font-extrabold text-sm text-amber-400 uppercase tracking-wider font-mono">Painel de Simulação Logística (Tempo Real)</h3>
              </div>
              <p className="text-[10.5px] text-slate-400 mt-1">Acione alertas de desabastecimento crítico ou simule a entrega imediata de insumos para os encarregados.</p>
            </div>

            <span className="text-[9px] font-black uppercase text-amber-500 tracking-widest px-2.5 py-1 bg-slate-950 border border-slate-850 rounded-lg font-mono">
              STATUS_FLUXO: ATIVO
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Low stock alerts panel */}
            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-900">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5 font-mono">// CONSUMO CRÍTICO (SIMULAR RUPTURA):</span>
              <div className="flex flex-wrap gap-1.5">
                {materials.slice(0, 4).map((mat) => (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => handleSimulateLowStock(mat.name)}
                    className="px-2.5 py-1.5 bg-red-950/20 hover:bg-red-950/50 border border-red-500/30 text-red-400 font-bold rounded-xl text-[10px] transition-all cursor-pointer flex items-center gap-1 active:scale-95 font-mono"
                  >
                    <span>🔥 {mat.name.split(' ')[0]} Crítico</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Replenish arrivals panel */}
            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-900">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-2.5 font-mono">// REGISTRAR RECEBIMENTO DE REMESSA:</span>
              <div className="flex flex-wrap gap-1.5">
                {materials.slice(0, 4).map((mat) => (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => handleSimulateReplenish(mat.name, mat.unit === 'sacos' ? 50 : 10)}
                    className="px-2.5 py-1.5 bg-emerald-950/20 hover:bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 font-bold rounded-xl text-[10px] transition-all cursor-pointer flex items-center gap-1 active:scale-95 font-mono"
                  >
                    <span>🚚 {mat.name.split(' ')[0]} (+{mat.unit === 'sacos' ? 50 : 10})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Material Add Form */}
      {showAddForm && (
        <form onSubmit={handleManualSubmit} id="add-material-form" className="bg-[#090f1d]/90 p-5 rounded-2xl border border-slate-800 shadow-xl grid grid-cols-1 sm:grid-cols-4 gap-4 items-end animate-in slide-in-from-top-4 duration-150">
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Nome do Insumo / Material *</label>
            <input
              id="material-name-input"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Cimento CP-II 50kg, Brita nº 0..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Qtd Necessária *</label>
            <input
              id="material-needed-input"
              type="number"
              required
              min="0.1"
              step="any"
              value={quantityNeeded}
              onChange={(e) => setQuantityNeeded(e.target.value)}
              placeholder="Ex: 150"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Unidade de Medida *</label>
            <select
              id="material-unit-input"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans cursor-pointer"
            >
              <option value="sacos">sacos</option>
              <option value="m³">m³ (Metros Cúbicos)</option>
              <option value="kg">kg (Quilos)</option>
              <option value="m">m (Metros Lineares)</option>
              <option value="unidades">unidades</option>
              <option value="litros">litros</option>
              <option value="latas">latas</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Convidado / Fiscal Autorizado (Opcional)</label>
            <input
              id="material-guest-input"
              type="text"
              value={initialGuest}
              onChange={(e) => setInitialGuest(e.target.value)}
              placeholder="Nome do Convidado (Ex: Eng. Roberto, Cliente Silva)"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button
              id="cancel-add-material"
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer font-mono"
            >
              Cancelar
            </button>
            <button
              id="submit-add-material"
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer font-mono shadow-md shadow-amber-500/15"
            >
              Registrar Insumo
            </button>
          </div>
        </form>
      )}

      {/* Materials Table List */}
      {materials.length === 0 ? (
        <div id="no-materials-view" className="text-center py-12 bg-slate-900/30 rounded-3xl border border-slate-850 p-6">
          <Package className="h-10 w-10 text-slate-600 mx-auto mb-2" />
          <h4 className="font-extrabold text-white text-sm uppercase tracking-wider font-mono">Sem materiais registrados nesta obra</h4>
          <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto">
            Adicione manualmente ou experimente o Estimador Inteligente com Inteligência Artificial para gerar sugestões de insumos.
          </p>
        </div>
      ) : (
        <div id="materials-table-wrapper" className="bg-[#090f1d]/85 backdrop-blur-md rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-850 text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  <th className="px-5 py-4">Insumo</th>
                  <th className="px-5 py-4 text-center">Falta / Demanda</th>
                  <th className="px-5 py-4 text-center">Recebido em Obra</th>
                  <th className="px-5 py-4 text-center">Estoque / Status</th>
                  {currentUser.role === 'engineer' && <th className="px-5 py-4 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900 text-xs">
                {materials.map((mat) => {
                  const status = getStatusColor(mat);
                  const isEditing = editingId === mat.id;
                  const remaining = Math.max(0, mat.quantityNeeded - mat.quantityReceived);
                  const isCompleted = mat.quantityReceived >= mat.quantityNeeded;

                  return (
                    <tr key={mat.id} id={`material-row-${mat.id}`} className="hover:bg-slate-900/30 transition-colors">
                      <td className="px-5 py-4 max-w-sm">
                        <div className="font-extrabold text-white text-sm uppercase tracking-tight flex items-center gap-1.5">
                          {isCompleted ? (
                            <PackageCheck className="h-4.5 w-4.5 text-emerald-400 shrink-0" />
                          ) : (
                            <Package className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                          )}
                          <span>{mat.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 font-mono">
                          LOG: {new Date(mat.updatedAt).toLocaleDateString()} por {mat.updatedBy}
                        </div>

                        {/* Guests Board: Visible on active & completed materials */}
                        <div className="mt-3.5 space-y-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-900">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1">
                              <Users className="h-3 w-3 text-amber-500" />
                              Convidados Autorizados ({mat.guests?.length || 0})
                            </span>

                            {addingGuestMatId !== mat.id ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingGuestMatId(mat.id);
                                  setNewGuestName('');
                                }}
                                className="text-[8.5px] font-black text-amber-500 hover:text-amber-400 uppercase tracking-wider font-mono flex items-center gap-0.5"
                                title="Adicionar Convidado para auditar este insumo"
                              >
                                <Plus className="h-2.5 w-2.5" /> Convidar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setAddingGuestMatId(null)}
                                className="text-[8.5px] font-bold text-slate-500 hover:text-slate-400 uppercase tracking-wider font-mono"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>

                          {/* Inline adding input */}
                          {addingGuestMatId === mat.id && (
                            <div className="flex items-center gap-1.5 mt-1.5 animate-in slide-in-from-top-1 duration-100">
                              <input
                                type="text"
                                value={newGuestName}
                                onChange={(e) => setNewGuestName(e.target.value)}
                                placeholder="Nome do Convidado..."
                                className="flex-1 bg-slate-900 border border-slate-800 text-[11px] text-white rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddGuestToMaterial(mat);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleAddGuestToMaterial(mat)}
                                className="p-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors cursor-pointer"
                              >
                                <Check className="h-3 w-3 stroke-[3]" />
                              </button>
                            </div>
                          )}

                          {/* Guests Badges List */}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {mat.guests && mat.guests.length > 0 ? (
                              mat.guests.map((g, idx) => (
                                <span 
                                  key={idx} 
                                  className="inline-flex items-center gap-1 bg-slate-900 border border-slate-850 text-slate-300 text-[9px] px-2 py-0.5 rounded-full font-mono font-medium"
                                >
                                  <span>👤 {g}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveGuestFromMaterial(mat, g)}
                                    className="text-slate-500 hover:text-red-400 ml-1 rounded-full p-0.5 hover:bg-slate-800"
                                    title="Remover Convidado"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </span>
                              ))
                            ) : (
                              <span className="text-[9.5px] text-slate-650 italic font-mono">
                                Nenhum convidado convidado para este item.
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-center font-mono">
                        <span className="font-bold text-white text-sm">{remaining}</span>
                        <span className="text-slate-500 text-xs ml-1">/ {mat.quantityNeeded} {mat.unit}</span>
                      </td>

                      <td className="px-5 py-4 text-center">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <input
                              id={`material-edit-${mat.id}`}
                              type="number"
                              step="any"
                              value={editReceivedVal}
                              onChange={(e) => setEditReceivedVal(e.target.value)}
                              className="w-20 px-2.5 py-1.5 bg-slate-950 border border-amber-500 rounded-lg text-xs text-center text-white font-mono focus:outline-none"
                            />
                            <button
                              id={`save-material-qty-${mat.id}`}
                              onClick={async () => {
                                await onUpdateMaterial(mat.id, { quantityReceived: Number(editReceivedVal) });
                                setEditingId(null);
                              }}
                              className="p-2 bg-emerald-600 text-slate-950 font-bold rounded-lg hover:bg-emerald-500 transition-colors cursor-pointer"
                              title="Confirmar"
                            >
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="font-mono font-extrabold text-white">{mat.quantityReceived} {mat.unit}</span>
                            {currentUser.role !== 'worker' && (
                              <button
                                id={`edit-qty-btn-${mat.id}`}
                                onClick={() => {
                                  setEditingId(mat.id);
                                  setEditReceivedVal(String(mat.quantityReceived));
                                }}
                                className="text-[9.5px] text-amber-500 hover:text-amber-400 bg-amber-500/5 border border-amber-500/25 px-2.5 py-1 rounded-lg font-black uppercase tracking-wider cursor-pointer font-mono"
                              >
                                Registrar Chegada
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          <span className={`px-2.5 py-1 text-[9.5px] rounded-full font-black uppercase tracking-wider border font-mono ${status.bg}`}>
                            {status.text}
                          </span>
                          <div className="w-16 bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-900">
                            <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${status.percent}%` }}></div>
                          </div>
                        </div>
                      </td>

                      {currentUser.role === 'engineer' ? (
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end">
                            <HoldToDelete
                              onDelete={() => onDeleteMaterial(mat.id)}
                              disabled={currentUser.role !== 'engineer'}
                              itemName={mat.name}
                            >
                              <div className="p-2 text-rose-500 hover:text-rose-400 bg-rose-950/20 hover:bg-rose-950/50 border border-rose-500/25 rounded-xl transition-all cursor-pointer flex items-center justify-center" title="Segure por 1s para Excluir">
                                <Trash2 className="h-4 w-4" />
                              </div>
                            </HoldToDelete>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GEMINI AI ESTIMATOR MODAL */}
      {showAiModal && (
        <div id="ai-estimator-modal" className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-in fade-in duration-100">
          <div className="bg-[#090f1d] rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-800 flex flex-col max-h-[85vh] text-slate-100">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-900">
              <div className="h-9 w-9 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-slate-950">
                <Sparkles className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">Estimador Quantitativo IA</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Cálculos analíticos baseados nas especificações da sua obra</p>
              </div>
            </div>

            <div className="space-y-4 overflow-y-auto flex-1 pr-1 py-1">
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-900 text-xs text-slate-300 leading-relaxed font-sans">
                Forneça o tipo de serviço civil e dimensões. O assistente Gemini estimará os volumes exatos de argamassa, cimento, agregados ou acabamentos conforme normas da ABNT.
                <div className="mt-2 font-bold text-amber-500 uppercase tracking-widest text-[9.5px] font-mono">Exemplos Técnicos:</div>
                <ul className="list-disc pl-4 mt-1 space-y-1 font-mono text-[10px] text-slate-400">
                  <li>"Reboco de fachada com área de 120m² e espessura de 2cm"</li>
                  <li>"Construção de alvenaria de vedação de 2.5x6 metros com tijolo baiano"</li>
                  <li>"Contra-piso de garagem de 50m² com concreto usinado Fck=25"</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Descreva as especificidades técnicas:</label>
                <textarea
                  id="ai-prompt-input"
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ex: Vou rebocar um cômodo interno de 3.2 x 4.0 metros com pé direito de 2.80m..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {aiError && (
                <div className="bg-rose-950/30 border border-rose-800 text-rose-400 text-xs p-3 rounded-2xl font-mono">
                  {aiError}
                </div>
              )}

              {aiLoading && (
                <div className="text-center py-8">
                  <svg className="animate-spin h-8 w-8 text-amber-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-xs text-slate-300 font-mono font-bold uppercase tracking-widest animate-pulse">PROCESSANDO CÁLCULOS...</p>
                  <p className="text-[10px] text-slate-500 mt-1">Computando dosagens e traços técnicos de concreto</p>
                </div>
              )}

              {aiResult && (
                <div id="ai-estimate-results" className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Insumos Estimados Encontrados:</h4>
                    <span className="text-[8.5px] bg-slate-950 text-slate-500 px-2 py-0.5 rounded-full font-mono">TRAÇO_ABNT</span>
                  </div>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {aiResult.map((item, idx) => (
                      <div key={idx} className="bg-slate-950/70 border border-slate-900 rounded-2xl p-3.5 text-xs flex flex-col gap-1.5 hover:border-amber-500/30 transition-all">
                        <div className="flex items-center justify-between font-bold text-white uppercase tracking-tight">
                          <span>{item.name}</span>
                          <span className="font-mono text-amber-500 bg-slate-950 border border-slate-850 px-2 py-0.5 rounded-md">
                            {item.quantityNeeded} {item.unit}
                          </span>
                        </div>
                        {item.explanation && (
                          <p className="text-[11px] text-slate-400 leading-relaxed font-sans">{item.explanation}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    id="add-ai-materials-btn"
                    onClick={handleAddAiMaterials}
                    className="w-full flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider py-2.5 rounded-xl transition-all cursor-pointer mt-1 font-mono shadow-md shadow-amber-500/15"
                  >
                    <ListPlus className="h-4 w-4 stroke-[3]" />
                    Adicionar Todos à Obra
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-slate-900 justify-end mt-4 shrink-0 font-mono">
              <button
                id="close-ai-estimator"
                onClick={() => {
                  setShowAiModal(false);
                  setAiPrompt('');
                  setAiResult(null);
                  setAiError('');
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Fechar
              </button>
              {!aiResult && (
                <button
                  id="submit-ai-estimate"
                  onClick={handleAiEstimate}
                  disabled={aiLoading || !aiPrompt}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 stroke-[2.5]" />
                  Gerar Estimativa
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
