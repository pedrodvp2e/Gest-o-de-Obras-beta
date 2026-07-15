import React, { useState, useEffect, useRef } from 'react';
import { User, ConstructionSite, Material, ConstructionParameter, TeamMessage, Blueprint, WorkerRegistry } from './types';
import Login from './components/Login';
import SiteDashboard from './components/SiteDashboard';
import MaterialsSection from './components/MaterialsSection';
import ParametersSection from './components/ParametersSection';
import BlueprintsSection from './components/BlueprintsSection';
import TeamChat from './components/TeamChat';
import FooterUtilities from './components/FooterUtilities';
import PhoneNotificationSimulator, { MobileNotification } from './components/PhoneNotificationSimulator';
import { HardHat, LogOut, LayoutGrid, ChevronLeft, Calendar, MapPin, Layers, Package, BookOpen, MessageSquare, Briefcase } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Core navigation state
  const [sites, setSites] = useState<ConstructionSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<ConstructionSite | null>(null);
  const [activeTab, setActiveTab] = useState<'parameters' | 'materials' | 'blueprints' | 'chat'>('parameters');

  // Selected site data states
  const [materials, setMaterials] = useState<Material[]>([]);
  const [parameters, setParameters] = useState<ConstructionParameter[]>([]);
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [workers, setWorkers] = useState<WorkerRegistry[]>([]);

  // Mobile push notifications simulated state
  const [mobileNotifications, setMobileNotifications] = useState<MobileNotification[]>([
    {
      id: 'init-1',
      title: '🏗️ Bem-vindo ao ConstruFácil',
      body: 'Sua central de monitoramento em tempo real de obras civis está conectada com sucesso.',
      type: 'system',
      timestamp: new Date(Date.now() - 3600000), // 1 hour ago
      read: true
    },
    {
      id: 'init-2',
      title: '📊 Gestão de Etapas',
      body: 'Você pode usar o botão "Relatar ao Mestre" nas etapas para reportar atualizações operacionais imediatas.',
      type: 'report',
      timestamp: new Date(Date.now() - 1800000), // 30 mins ago
      read: true
    }
  ]);

  const triggerMobileNotification = (title: string, body: string, type: 'timer' | 'report' | 'system' | 'completion') => {
    const newNotif: MobileNotification = {
      id: 'notif-' + Math.random().toString(36).substr(2, 9),
      title,
      body,
      type,
      timestamp: new Date(),
      read: false
    };
    setMobileNotifications(prev => [...prev, newNotif]);
  };

  const messagesRef = useRef<TeamMessage[]>([]);
  const parametersRef = useRef<ConstructionParameter[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    parametersRef.current = parameters;
  }, [parameters]);

  // Check login on startup
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setCurrentUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Fetch all sites when authenticated
  useEffect(() => {
    if (token) {
      fetchSites();
    }
  }, [token]);

  // Dynamic poll timer when a construction site is actively open
  // This syncs timer stopwatches, progress updates, chat board in real-time
  useEffect(() => {
    if (!token || !selectedSite) return;

    fetchSiteDetailData();

    const interval = setInterval(() => {
      fetchSiteDetailData();
    }, 5000); // sync every 5 seconds

    return () => clearInterval(interval);
  }, [token, selectedSite]);

  const fetchSites = async () => {
    try {
      const response = await fetch('/api/sites', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setSites(data);
      }
    } catch (err) {
      console.error('Erro ao buscar obras:', err);
    }
  };

  const fetchSiteDetailData = async () => {
    if (!token || !selectedSite) return;
    try {
      // Run parallel fetches for speed and low latency
      const [matRes, paramRes, bpRes, msgRes, workerRes] = await Promise.all([
        fetch(`/api/sites/${selectedSite.id}/materials`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/sites/${selectedSite.id}/parameters`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/sites/${selectedSite.id}/blueprints`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/sites/${selectedSite.id}/messages`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`/api/sites/${selectedSite.id}/workers`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (matRes.ok) setMaterials(await matRes.json());
      if (workerRes && workerRes.ok) setWorkers(await workerRes.json());
      
      if (paramRes.ok) {
        const nextParams: ConstructionParameter[] = await paramRes.json();
        const currentParams = parametersRef.current;
        
        if (currentParams.length > 0) {
          nextParams.forEach(next => {
            const prev = currentParams.find(p => p.id === next.id);
            if (prev && prev.percentage < 100 && next.percentage === 100) {
              triggerMobileNotification(
                '⏰ Cronômetro Finalizado!',
                `A etapa "${next.name}" acaba de atingir 100% de conclusão do serviço!`,
                'completion'
              );
            }
          });
        }
        setParameters(nextParams);
      }
      
      if (bpRes.ok) setBlueprints(await bpRes.json());
      
      if (msgRes.ok) {
        const nextMessages: TeamMessage[] = await msgRes.json();
        const currentMessages = messagesRef.current;
        
        if (nextMessages.length > currentMessages.length && currentMessages.length > 0) {
          const newMsgs = nextMessages.slice(currentMessages.length);
          newMsgs.forEach(m => {
            if (currentUser && m.senderName !== currentUser.name) {
              if (m.message.startsWith('📢 [RELATO_ANDAMENTO')) {
                let targetMestre = '';
                const mestreMatch = m.message.match(/MESTRE:\s*([^\]|]*)/);
                if (mestreMatch) {
                  targetMestre = mestreMatch[1].trim();
                }

                const isEngineer = currentUser.role === 'engineer';
                const isTargetMestre = targetMestre && currentUser.name.toLowerCase() === targetMestre.toLowerCase();

                if (!targetMestre || isEngineer || isTargetMestre) {
                  triggerMobileNotification(
                    '📢 Relato de Campo Recebido',
                    `${m.senderName} enviou um novo relatório direto sobre o andamento das obras.`,
                    'report'
                  );
                }
              } else {
                triggerMobileNotification(
                  '💬 Mensagem da Equipe',
                  `${m.senderName}: "${m.message.length > 50 ? m.message.slice(0, 47) + '...' : m.message}"`,
                  'system'
                );
              }
            }
          });
        }
        setMessages(nextMessages);
      }
    } catch (err) {
      console.error('Erro ao sincronizar dados da obra:', err);
    }
  };

  const handleLoginSuccess = (user: User, userToken: string) => {
    setToken(userToken);
    setCurrentUser(user);
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    setSelectedSite(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // --- API OPERATIONS ---

  // Site Dashboard logic
  const handleCreateSite = async (siteData: { name: string; location: string; clientName: string; clientPhone: string; startDate: string; endDate: string }) => {
    const response = await fetch('/api/sites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(siteData)
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Erro ao cadastrar obra.');
    }

    setSites(prev => [data, ...prev]);
  };

  const handleDeleteSite = async (siteId: string) => {
    try {
      const response = await fetch(`/api/sites/${siteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setSites(prev => prev.filter(s => s.id !== siteId));
        if (selectedSite?.id === siteId) {
          setSelectedSite(null);
        }
      }
    } catch (err) {
      console.error('Falha ao excluir obra:', err);
    }
  };

  // Material Logic
  const handleAddMaterial = async (materialData: { name: string; quantityNeeded: number; unit: string }) => {
    if (!selectedSite) return;
    const response = await fetch(`/api/sites/${selectedSite.id}/materials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(materialData)
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Falha ao incluir material.');
    }

    setMaterials(prev => [...prev, data]);
  };

  const handleUpdateMaterial = async (id: string, update: Partial<Material>) => {
    if (!selectedSite) return;
    try {
      const response = await fetch(`/api/sites/${selectedSite.id}/materials/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(update)
      });
      const data = await response.json();
      if (response.ok) {
        setMaterials(prev => prev.map(m => m.id === id ? data : m));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!selectedSite) return;
    try {
      const response = await fetch(`/api/sites/${selectedSite.id}/materials/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setMaterials(prev => prev.filter(m => m.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Work Stages / Parameters Logic
  const handleAddParameter = async (paramData: { name: string; deadline: string; assignedToName: string }) => {
    if (!selectedSite) return;
    const response = await fetch(`/api/sites/${selectedSite.id}/parameters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(paramData)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Falha ao planejar etapa.');
    }

    setParameters(prev => [...prev, data]);
  };

  const handleUpdateParameter = async (id: string, update: Partial<ConstructionParameter> & { action?: 'start_timer' | 'stop_timer' | 'reset_timer' }) => {
    if (!selectedSite) return;
    try {
      const response = await fetch(`/api/sites/${selectedSite.id}/parameters/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(update)
      });
      const data = await response.json();
      if (response.ok) {
        // Trigger local notification if action occurred
        if (update.action === 'start_timer') {
          triggerMobileNotification(
            '⏱️ Cronômetro Ativado',
            `O cronômetro para a etapa "${data.name}" foi iniciado com sucesso.`,
            'timer'
          );
        } else if (update.action === 'stop_timer') {
          triggerMobileNotification(
            '⏱️ Cronômetro Pausado',
            `Tempo pausado na etapa "${data.name}". Durabilidade registrada no banco.`,
            'timer'
          );
        } else if (update.percentage === 100) {
          const prevParam = parametersRef.current.find(p => p.id === id);
          if (!prevParam || prevParam.percentage < 100) {
            triggerMobileNotification(
              '⏰ Cronômetro Finalizado!',
              `A etapa "${data.name}" acaba de atingir 100% de conclusão do serviço!`,
              'completion'
            );
          }
        }

        setParameters(prev => prev.map(p => p.id === id ? data : p));
        // Refresh site progress representation in dashboard lists
        fetchSites();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteParameter = async (id: string) => {
    if (!selectedSite) return;
    try {
      const response = await fetch(`/api/sites/${selectedSite.id}/parameters/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setParameters(prev => prev.filter(p => p.id !== id));
        fetchSites();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Drawing Blueprint logic
  const handleUploadBlueprint = async (blueprintData: { title: string; description: string; fileData: string }) => {
    if (!selectedSite) return;
    const response = await fetch(`/api/sites/${selectedSite.id}/blueprints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(blueprintData)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Falha ao armazenar desenho técnico.');
    }

    setBlueprints(prev => [data, ...prev]);
  };

  const handleDeleteBlueprint = async (id: string) => {
    if (!selectedSite) return;
    try {
      const response = await fetch(`/api/sites/${selectedSite.id}/blueprints/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setBlueprints(prev => prev.filter(b => b.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Team Message chat logic
  const handleSendMessage = async (message: string) => {
    if (!selectedSite) return;
    const response = await fetch(`/api/sites/${selectedSite.id}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ message })
    });

    const data = await response.json();
    if (response.ok) {
      setMessages(prev => [...prev, data]);
    }
  };

  const getRoleLabelInPortuguese = (role: string) => {
    switch (role) {
      case 'engineer': return 'Engenheiro Civil';
      case 'master_builder': return 'Mestre de Obras';
      case 'supervisor': return 'Encarregado de Setor';
      case 'worker': return 'Funcionário Comum';
      default: return 'Usuário';
    }
  };

  if (loading) {
    return (
      <div id="loading-spinner-wrapper" className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-amber-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm font-semibold text-slate-700">Conectando ao banco de dados seguro...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || !token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div id="app-shell" className="min-h-screen bg-[#030712] text-slate-100 cyber-grid-pattern flex flex-col pb-12">
      {/* GLOBAL NAVBAR HEADER */}
      <header id="global-header" className="bg-[#070b13]/85 text-slate-50 border-b border-slate-800/80 shadow-xl sticky top-0 z-40 shrink-0 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedSite(null)}>
              <div className="h-10 w-10 bg-gradient-to-tr from-amber-600 to-amber-400 rounded-xl flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/25">
                <HardHat className="h-6 w-6 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-white leading-none uppercase">Constru<span className="text-amber-500 font-black">Fácil</span></h1>
                <span className="text-[9px] text-slate-500 font-mono tracking-widest uppercase mt-0.5 block">// CCO_CONSTRUTOR_V4</span>
              </div>
            </div>

            {/* Futuristic HOME button tab in Header (Visible when a site is actively selected) */}
            {selectedSite && (
              <button
                id="header-home-navigation"
                onClick={() => setSelectedSite(null)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-900/80 hover:bg-amber-500 hover:text-slate-950 border border-slate-800 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer font-mono"
                title="Voltar ao Painel Geral de Obras"
              >
                <span>🏠</span> Painel Geral
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* User credentials panel */}
            <div className="hidden sm:flex items-center gap-3 bg-slate-950/80 border border-slate-800/80 p-1.5 pr-3.5 rounded-xl shadow-inner">
              <div className="h-8 w-8 bg-gradient-to-tr from-slate-800 to-slate-700 text-amber-500 font-mono font-black rounded-lg flex items-center justify-center text-xs border border-slate-750">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white leading-tight">{currentUser.name}</div>
                <div className="text-[9px] font-bold text-amber-500 flex items-center gap-1 leading-none mt-0.5 uppercase tracking-wider font-mono">
                  <Briefcase className="h-2.5 w-2.5" />
                  {getRoleLabelInPortuguese(currentUser.role)}
                </div>
              </div>
            </div>

            <button
              id="global-logout-btn"
              onClick={handleLogout}
              className="p-2.5 text-slate-400 hover:text-white bg-slate-900 hover:bg-red-950/20 rounded-xl transition-all cursor-pointer border border-slate-800/80 hover:border-red-900/40"
              title="Fazer Logout"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main id="app-main-content" className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col min-h-0">
        {!selectedSite ? (
          // VIEW 1: CONSTRUCTION SITES LISTING DASHBOARD
          <div id="sites-dashboard-wrapper" className="space-y-6">
            <div className="mb-6 p-4 bg-slate-900/20 rounded-2xl border border-slate-900/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight uppercase">// PAINEL OPERACIONAL DE OBRAS</h2>
                <p className="text-xs text-slate-500 mt-1">CCO Civil de monitoramento em tempo real de equipes, cronogramas de etapas e quantitativos de materiais.</p>
              </div>
              {/* Info badge */}
              <div className="px-3.5 py-1.5 bg-slate-900/50 border border-slate-850 rounded-xl flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
                <span>TERMINAL_ONLINE_UTC_OK</span>
              </div>
            </div>
            <SiteDashboard
              sites={sites}
              currentUser={currentUser}
              onSelectSite={(site) => {
                setSelectedSite(site);
                setActiveTab('parameters'); // default to timers section
              }}
              onCreateSite={handleCreateSite}
              onDeleteSite={handleDeleteSite}
            />
          </div>
        ) : (
          // VIEW 2: ACTIVE CONSTRUCTION SITE DETAILED VIEWS
          <div id="selected-site-manager" className="flex flex-col gap-6 flex-1 min-h-0">
            {/* Site Detail Subheader */}
            <div className="bg-[#090f1d]/80 backdrop-blur-md p-5 rounded-3xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <button
                  id="go-back-to-dashboard"
                  onClick={() => setSelectedSite(null)}
                  className="p-2.5 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-slate-400 rounded-xl transition-all cursor-pointer border border-slate-850 hover:border-amber-500 shadow-inner mt-1"
                  title="Voltar ao Painel Geral de Obras (Home)"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-black text-white uppercase tracking-tight">{selectedSite.name}</h2>
                    <span className="bg-amber-950/50 text-amber-500 border border-amber-900/40 text-[9px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider font-mono">
                      TERMINAL ATIVO
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 flex-wrap">
                    <span className="flex items-center gap-1.5 font-sans">
                      <MapPin className="h-3.5 w-3.5 text-slate-500" />
                      {selectedSite.location}
                    </span>
                    {selectedSite.clientName && (
                      <span className="flex items-center gap-1.5 border-l border-slate-800 pl-4">
                        Cliente: <strong className="text-white font-bold">{selectedSite.clientName}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress visual in subheader */}
              <div className="w-full md:w-56 space-y-2 bg-slate-950/80 p-3 rounded-2xl border border-slate-900 shadow-inner">
                <div className="flex justify-between text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">
                  <span>DESENVOLVIMENTO GLOBAL</span>
                  <span className="text-amber-500 font-bold">{selectedSite.percentage}%</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-850">
                  <div
                    className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${selectedSite.percentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* TAB SELECTION RAIL */}
            <div id="tab-navigation-rail" className="flex border-b border-slate-850 overflow-x-auto gap-1">
              <button
                id="tab-parameters-trigger"
                onClick={() => setActiveTab('parameters')}
                className={`py-3 px-4.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer font-mono ${
                  activeTab === 'parameters'
                    ? 'border-amber-500 text-amber-500 bg-amber-500/5'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <Layers className="h-4 w-4" />
                Cronogramas & Etapas
              </button>

              <button
                id="tab-materials-trigger"
                onClick={() => setActiveTab('materials')}
                className={`py-3 px-4.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer font-mono ${
                  activeTab === 'materials'
                    ? 'border-amber-500 text-amber-500 bg-amber-500/5'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                <Package className="h-4 w-4" />
                Insumos & Estoque
              </button>

              <button
                id="tab-blueprints-trigger"
                onClick={() => setActiveTab('blueprints')}
                className={`py-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'blueprints'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                Projetos & Desenhos
              </button>

              <button
                id="tab-chat-trigger"
                onClick={() => setActiveTab('chat')}
                className={`py-3 px-4 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                  activeTab === 'chat'
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                Mural da Equipe
                {messages.length > 0 && (
                  <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black font-mono">
                    {messages.length}
                  </span>
                )}
              </button>
            </div>

            {/* TAB CORRESPONDING VIEW MODULES */}
            <div id="tab-viewport" className="flex-1 min-h-0">
              {activeTab === 'parameters' && (
                <ParametersSection
                  siteId={selectedSite.id}
                  parameters={parameters}
                  currentUser={currentUser}
                  onAddParameter={handleAddParameter}
                  onUpdateParameter={handleUpdateParameter}
                  onDeleteParameter={handleDeleteParameter}
                  onSendMessage={handleSendMessage}
                  workers={workers}
                />
              )}

              {activeTab === 'materials' && (
                <MaterialsSection
                  siteId={selectedSite.id}
                  materials={materials}
                  currentUser={currentUser}
                  onAddMaterial={handleAddMaterial}
                  onUpdateMaterial={handleUpdateMaterial}
                  onDeleteMaterial={handleDeleteMaterial}
                  onSendMessage={handleSendMessage}
                />
              )}

              {activeTab === 'blueprints' && (
                <BlueprintsSection
                  siteId={selectedSite.id}
                  blueprints={blueprints}
                  currentUser={currentUser}
                  onUploadBlueprint={handleUploadBlueprint}
                  onDeleteBlueprint={handleDeleteBlueprint}
                />
              )}

              {activeTab === 'chat' && (
                <TeamChat
                  siteId={selectedSite.id}
                  messages={messages}
                  currentUser={currentUser}
                  onSendMessage={handleSendMessage}
                  workers={workers}
                />
              )}
            </div>

            {/* Quick Support & Worker Registry Footer */}
            <FooterUtilities
              siteId={selectedSite.id}
              currentUser={currentUser}
              token={token}
              workers={workers}
              onWorkersChanged={fetchSiteDetailData}
              onSendMessage={handleSendMessage}
            />

            {/* Mobile Push Notification Simulator System */}
            <PhoneNotificationSimulator
              notifications={mobileNotifications}
              onClearNotifications={() => setMobileNotifications([])}
              onMarkAllAsRead={() => setMobileNotifications(prev => prev.map(n => ({ ...n, read: true })))}
            />
          </div>
        )}
      </main>
    </div>
  );
}
