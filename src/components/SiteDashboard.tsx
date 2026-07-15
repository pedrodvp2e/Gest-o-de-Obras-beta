import React, { useState } from 'react';
import { ConstructionSite, User } from '../types';
import { MapPin, Calendar, Phone, User as UserIcon, Plus, Trash2, LayoutGrid, Search, TrendingUp, Building2, Clock, CheckCircle, ShieldAlert, FileText } from 'lucide-react';

interface SiteDashboardProps {
  sites: ConstructionSite[];
  currentUser: User;
  onSelectSite: (site: ConstructionSite) => void;
  onCreateSite: (siteData: { name: string; location: string; clientName: string; clientPhone: string; startDate: string; endDate: string }) => Promise<void>;
  onDeleteSite: (id: string) => Promise<void>;
}

export default function SiteDashboard({ sites, currentUser, onSelectSite, onCreateSite, onDeleteSite }: SiteDashboardProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Form state
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Statistics
  const activeCount = sites.filter(s => s.status === 'ongoing').length;
  const planningCount = sites.filter(s => s.status === 'planning').length;
  const completedCount = sites.filter(s => s.status === 'completed').length;

  const filteredSites = sites.filter(site => {
    const matchesSearch = site.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          site.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (site.clientName && site.clientName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = statusFilter === 'all' || site.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== 'engineer') {
      setError('Acesso Negado: Apenas o perfil Engenheiro Civil pode adicionar novas obras.');
      return;
    }
    if (!name || !location) {
      setError('Nome da obra e Localização são obrigatórios.');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      await onCreateSite({ name, location, clientName, clientPhone, startDate, endDate });
      setName('');
      setLocation('');
      setClientName('');
      setClientPhone('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      setShowCreateModal(false);
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar obra.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planning':
        return <span className="bg-cyan-950/40 text-cyan-400 border border-cyan-800/80 text-[10px] px-2.5 py-1 rounded-md font-mono uppercase tracking-wider">PLANEJAMENTO</span>;
      case 'ongoing':
        return <span className="bg-amber-950/40 text-amber-400 border border-amber-800/80 text-[10px] px-2.5 py-1 rounded-md font-mono uppercase tracking-wider animate-pulse">EM ANDAMENTO</span>;
      case 'paused':
        return <span className="bg-red-950/40 text-red-400 border border-red-800/80 text-[10px] px-2.5 py-1 rounded-md font-mono uppercase tracking-wider">PAUSADO</span>;
      case 'completed':
        return <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-800/80 text-[10px] px-2.5 py-1 rounded-md font-mono uppercase tracking-wider">CONCLUÍDO</span>;
      default:
        return null;
    }
  };

  return (
    <div id="sites-dashboard-root" className="space-y-8 text-slate-100">
      
      {/* Overview Stat Widgets */}
      <div id="stats-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#090f1d]/70 backdrop-blur-md p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg shadow-black/40">
          <div>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block font-mono">// TOTAL DE OBRAS</span>
            <span className="text-3xl font-black text-white block mt-1 font-mono tracking-tight">{sites.length}</span>
          </div>
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 shadow-inner">
            <Building2 className="h-6 w-6 text-slate-400" />
          </div>
        </div>

        <div className="bg-[#090f1d]/70 backdrop-blur-md p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg shadow-black/40">
          <div>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block font-mono">// EM ATIVIDADE</span>
            <span className="text-3xl font-black text-amber-500 block mt-1 font-mono tracking-tight">{activeCount}</span>
          </div>
          <div className="p-3 bg-amber-950/30 border border-amber-900/40 rounded-xl text-amber-500 shadow-inner">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-[#090f1d]/70 backdrop-blur-md p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg shadow-black/40">
          <div>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block font-mono">// PLANEJAMENTOS</span>
            <span className="text-3xl font-black text-cyan-400 block mt-1 font-mono tracking-tight">{planningCount}</span>
          </div>
          <div className="p-3 bg-cyan-950/30 border border-cyan-900/40 rounded-xl text-cyan-400 shadow-inner">
            <Calendar className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-[#090f1d]/70 backdrop-blur-md p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg shadow-black/40">
          <div>
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest block font-mono">// ENTREGUES</span>
            <span className="text-3xl font-black text-emerald-400 block mt-1 font-mono tracking-tight">{completedCount}</span>
          </div>
          <div className="p-3 bg-emerald-950/30 border border-emerald-900/40 rounded-xl text-emerald-400 shadow-inner">
            <CheckCircle className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Control Actions & Filtering */}
      <div id="controls-panel" className="bg-[#090f1d]/85 backdrop-blur-md p-4 rounded-2xl border border-slate-800/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-2 flex-1 w-full">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              id="search-sites"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar obra, endereço, cliente..."
              className="w-full pl-10 pr-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all font-sans"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Filtro:</span>
            <select
              id="filter-sites-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-sans cursor-pointer"
            >
              <option value="all">Todas as Obras</option>
              <option value="planning">Em Planejamento</option>
              <option value="ongoing">Em Andamento</option>
              <option value="completed">Concluídas</option>
            </select>
          </div>
        </div>

        {currentUser.role === 'engineer' ? (
          <button
            id="open-create-site-modal"
            onClick={() => {
              setError('');
              setShowCreateModal(true);
            }}
            className="w-full md:w-auto flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-widest px-4 py-3 rounded-xl transition-all shadow-md shadow-amber-500/10 cursor-pointer font-mono"
          >
            <Plus className="h-4.5 w-4.5 stroke-[3]" />
            CADASTRAR OBRA
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-[10px] text-slate-500 font-mono">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <span>APENAS ENGENHEIROS PODEM CADASTRAR OBRAS</span>
          </div>
        )}
      </div>

      {/* Grid of Obras */}
      {filteredSites.length === 0 ? (
        <div id="no-sites-view" className="text-center py-16 bg-[#090f1d]/40 rounded-3xl border border-slate-850 p-8 shadow-inner">
          <Building2 className="h-12 w-12 text-slate-700 mx-auto mb-3 animate-cyber-pulse" />
          <h3 className="text-base font-bold text-slate-400 uppercase tracking-wider font-mono">Nenhuma obra localizada</h3>
          <p className="text-slate-600 mt-2 max-w-sm mx-auto text-xs font-sans leading-relaxed">
            {currentUser.role === 'engineer' 
              ? 'Nenhuma obra coincide com sua pesquisa. Use o botão "Cadastrar Obra" acima para configurar uma nova central civil.' 
              : 'Não existem obras ativas registradas neste terminal que correspondam ao filtro.'}
          </p>
        </div>
      ) : (
        <div id="sites-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSites.map((site) => (
            <div
              key={site.id}
              id={`site-card-${site.id}`}
              className="bg-[#090f1d]/75 rounded-3xl border border-slate-800 hover:border-amber-500/50 shadow-lg hover:shadow-amber-500/5 transition-all overflow-hidden flex flex-col h-full group"
            >
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start gap-2.5 mb-3">
                  <h3 className="text-base font-extrabold text-white group-hover:text-amber-400 transition-colors line-clamp-1 flex-1 uppercase tracking-tight">{site.name}</h3>
                  {getStatusBadge(site.status)}
                </div>

                <div className="space-y-3 text-xs text-slate-400 flex-1 my-4">
                  <div className="flex items-start gap-2.5 bg-slate-950/40 p-2.5 rounded-xl border border-slate-900">
                    <MapPin className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                    <span className="leading-relaxed font-sans">{site.location}</span>
                  </div>

                  <div className="flex items-center gap-2.5 pl-2">
                    <Calendar className="h-4 w-4 text-slate-500 shrink-0" />
                    <span className="font-mono text-[11px]">
                      INÍCIO: {new Date(site.startDate).toLocaleDateString('pt-BR')} 
                      {site.endDate && ` ➔ FIM: ${new Date(site.endDate).toLocaleDateString('pt-BR')}`}
                    </span>
                  </div>

                  {site.clientName && (
                    <div className="bg-[#040811]/60 p-3 rounded-2xl space-y-1.5 border border-slate-900">
                      <div className="flex items-center gap-2 font-medium text-slate-300">
                        <UserIcon className="h-3.5 w-3.5 text-slate-500" />
                        <span className="text-[11px] font-sans">Proprietário: <strong className="text-white font-bold">{site.clientName}</strong></span>
                      </div>
                      {site.clientPhone && (
                        <div className="flex items-center gap-2 text-slate-500 pl-5 text-[10px] font-mono">
                          <Phone className="h-3.5 w-3.5 text-slate-650" />
                          <span>{site.clientPhone}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="space-y-2 pt-2 border-t border-slate-900">
                  <div className="flex justify-between text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">
                    <span>PROGRESSO GLOBAL</span>
                    <span className="text-amber-500 font-bold font-mono">{site.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
                    <div
                      className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${site.percentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="bg-[#050811] px-6 py-4 border-t border-slate-900 flex items-center justify-between gap-2">
                <button
                  id={`open-site-${site.id}`}
                  onClick={() => onSelectSite(site)}
                  className="flex-1 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-slate-200 text-[11px] font-bold uppercase tracking-widest py-2.5 px-4 rounded-xl transition-all cursor-pointer text-center font-mono border border-slate-800 hover:border-amber-500 shadow-inner"
                >
                  ABRIR TERMINAL DE GESTÃO
                </button>
                
                {currentUser.role === 'engineer' && (
                  <button
                    id={`delete-site-${site.id}`}
                    onClick={() => {
                      if (confirm(`⚠️ EXCLUSÃO PERMANENTE:\nTem certeza de que deseja deletar a obra "${site.name}"?\nEsta ação apagará de forma irreversível:\n- Todo o cronograma e etapas\n- Todo o estoque de materiais\n- Todos os projetos e desenhos\n- Todas as escalas de funcionários\n\nEssa operação NÃO pode ser desfeita.`)) {
                        onDeleteSite(site.id);
                      }
                    }}
                    className="p-2.5 text-slate-600 hover:text-red-400 hover:bg-red-950/20 rounded-xl border border-transparent hover:border-red-900/50 transition-all cursor-pointer"
                    title="Remover Obra do Sistema"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE NEW SITE MODAL */}
      {showCreateModal && (
        <div id="create-site-modal" className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#0b1120] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 animate-in zoom-in-95 duration-150 text-slate-200">
            <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
              <Building2 className="h-5 w-5 text-amber-500" />
              <h3 className="text-base font-extrabold text-white uppercase tracking-wider font-mono">[REGISTRO_DE_OBRA_NOVA]</h3>
            </div>
            
            {error && (
              <div className="bg-red-950/40 border border-red-800 text-red-400 text-xs p-3 rounded-xl mb-4 font-mono">
                ⚠️ CCO_ERROR: {error}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Nome Identificador da Obra *</label>
                <input
                  id="site-name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Residencial Bella Vista - Bloco C"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Localização / Endereço Completo *</label>
                <input
                  id="site-location-input"
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Rua, Número, Bairro, Cidade - UF"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Data de Início</label>
                  <input
                    id="site-start-input"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Prazo Estimado</label>
                  <input
                    id="site-end-input"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="border-t border-slate-850 pt-4 mt-2 space-y-3">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">// DADOS DO CLIENTE (OPCIONAL)</p>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Nome do Proprietário / Construtora</label>
                  <input
                    id="site-client-input"
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Nome do cliente ou empresa parceira"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Telefone para Contato Urgente</label>
                  <input
                    id="site-phone-input"
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="Ex: (11) 99999-8888"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-850 justify-end">
                <button
                  id="cancel-create-site"
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer font-mono"
                >
                  Voltar
                </button>
                <button
                  id="submit-create-site"
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer font-mono shadow-md shadow-amber-500/10"
                >
                  {loading ? 'REGISTRANDO...' : 'SALVAR CADASTRO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
