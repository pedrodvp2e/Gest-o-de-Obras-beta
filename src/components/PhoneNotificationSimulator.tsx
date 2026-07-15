import React, { useState, useEffect } from 'react';
import { Smartphone, Bell, Volume2, VolumeX, Trash2, Check, X, ShieldAlert, Clock, MessageSquare, HardHat } from 'lucide-react';

export interface MobileNotification {
  id: string;
  title: string;
  body: string;
  type: 'timer' | 'report' | 'system' | 'completion';
  timestamp: Date;
  read: boolean;
}

interface PhoneNotificationSimulatorProps {
  notifications: MobileNotification[];
  onClearNotifications: () => void;
  onMarkAllAsRead: () => void;
}

// Simple synthesizer chime for realistic phone ding sound
function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // First note
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
    gain1.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start();
    osc1.stop(audioCtx.currentTime + 0.3);

    // Second note, slightly delayed
    setTimeout(() => {
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      gain2.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start();
      osc2.stop(audioCtx.currentTime + 0.4);
    }, 120);

    // Attempt simple vibration
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  } catch (e) {
    console.warn('Audio Context block or unsupported:', e);
  }
}

export default function PhoneNotificationSimulator({
  notifications,
  onClearNotifications,
  onMarkAllAsRead
}: PhoneNotificationSimulatorProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showDrawer, setShowDrawer] = useState(false);
  const [activeToast, setActiveToast] = useState<MobileNotification | null>(null);

  // Monitor new notifications to play sound and trigger the sliding mobile alert
  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[notifications.length - 1];
      // Only show toast for notifications created in the last 3 seconds
      const elapsedMs = Date.now() - latest.timestamp.getTime();
      if (elapsedMs < 3000) {
        setActiveToast(latest);
        if (soundEnabled) {
          playNotificationSound();
        }
        
        // Auto dismiss toast after 5 seconds
        const timer = setTimeout(() => {
          setActiveToast(null);
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [notifications, soundEnabled]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'timer':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'report':
        return <MessageSquare className="h-4 w-4 text-indigo-500" />;
      case 'completion':
        return <HardHat className="h-4 w-4 text-emerald-500" />;
      default:
        return <Bell className="h-4 w-4 text-slate-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      {/* 1. SLIDING PHONE NOTIFICATION TOAST (Simulates top lock-screen/heads-up banner) */}
      {activeToast && (
        <div 
          id="mobile-phone-toast" 
          className="fixed top-4 right-4 left-4 sm:left-auto sm:w-[380px] bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700/60 p-4 z-51 transition-all duration-300 animate-in slide-in-from-top-12"
        >
          {/* Top smartphone styling bar */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2 border-b border-slate-800 pb-1.5 font-sans font-semibold">
            <div className="flex items-center gap-1.5">
              <Smartphone className="h-3 w-3 text-amber-400" />
              <span className="font-extrabold uppercase tracking-wide">CONSTRUFÁCIL PUSH</span>
            </div>
            <div className="flex items-center gap-2">
              <span>agora</span>
              <button 
                onClick={() => setActiveToast(null)}
                className="p-0.5 hover:bg-slate-800 rounded-full cursor-pointer"
              >
                <X className="h-3.5 w-3.5 text-slate-400 hover:text-slate-100" />
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="h-9 w-9 shrink-0 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center shadow-inner">
              {getNotificationIcon(activeToast.type)}
            </div>
            <div className="flex-1">
              <h5 className="text-xs font-black text-amber-300 leading-tight">{activeToast.title}</h5>
              <p className="text-[11px] text-slate-200 mt-1 leading-normal font-medium">{activeToast.body}</p>
            </div>
          </div>

          {/* Quick interactive action bar */}
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex justify-between items-center">
            <span className="text-[9px] text-slate-450 font-bold">📲 Notificação simulada com vibração & bipe</span>
            <button
              onClick={() => {
                setShowDrawer(true);
                setActiveToast(null);
              }}
              className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              Ver Central de Alertas →
            </button>
          </div>
        </div>
      )}

      {/* 2. FLOATING FLOATING PHONE UTILITY BUTTON IN THE BOTTOM OF SCREEN */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          id="btn-phone-notification-drawer"
          onClick={() => setShowDrawer(!showDrawer)}
          className="relative group p-4 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer border border-slate-800 flex items-center justify-center"
          title="Central de Notificações de Celular"
        >
          <Smartphone className="h-6 w-6" />
          
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[10px] h-5 w-5 rounded-full flex items-center justify-center border-2 border-slate-900 animate-bounce">
              {unreadCount}
            </span>
          )}

          {/* Tooltip hint */}
          <span className="absolute right-14 bg-slate-900 text-slate-100 text-[10px] font-bold px-2.5 py-1.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-slate-800">
            📱 Notificações de Celular {unreadCount > 0 ? `(${unreadCount} novas)` : ''}
          </span>
        </button>
      </div>

      {/* 3. SIMULATED SMARTPHONE SCREEN DRAWER (Locks to the right) */}
      {showDrawer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end animate-in fade-in duration-150">
          {/* Backdrop click dismiss */}
          <div className="absolute inset-0 cursor-pointer" onClick={() => setShowDrawer(false)} />
          
          {/* Smartphone Frame Wrapper */}
          <div className="relative w-full max-w-sm bg-slate-950 text-white h-full flex flex-col shadow-2xl border-l border-slate-800 animate-in slide-in-from-right duration-200">
            {/* Top Phone notch speaker and camera mimic */}
            <div className="bg-slate-950 pt-2 pb-1 shrink-0 flex justify-center items-center gap-2">
              <div className="h-4 w-28 bg-slate-900 rounded-full flex items-center justify-center border border-slate-850">
                <span className="text-[7px] text-slate-600 font-extrabold uppercase">ConstruFácil OS</span>
              </div>
            </div>

            {/* Simulated Phone Bar (Battery, WiFi, Carrier) */}
            <div className="px-5 py-1.5 bg-slate-950 text-slate-400 text-[9px] font-black flex justify-between items-center font-mono border-b border-slate-900 shrink-0">
              <span className="tracking-wide">ConstruFone 5G</span>
              <div className="flex items-center gap-2">
                <span>100% 🔋</span>
                <span>📶 🛜</span>
              </div>
            </div>

            {/* Smartphone App Header */}
            <div className="p-4 bg-slate-900 border-b border-slate-850 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-amber-500 rounded-lg flex items-center justify-center text-slate-950 shadow-md">
                  <Smartphone className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-100 leading-tight">Central de Alertas</h4>
                  <p className="text-[9px] text-slate-400 mt-0.5">Notificações móveis simuladas</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    soundEnabled 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20' 
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                  }`}
                  title={soundEnabled ? 'Silenciar Áudio' : 'Ativar Áudio'}
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setShowDrawer(false)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-100 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Active notifications list inside smartphone screen */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/40">
              {notifications.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="h-12 w-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs text-slate-400">Nenhum alerta recente</h5>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      Sua tela de bloqueio está limpa. Quando iniciantes derem play ou finalizarem etapas, os pushs aparecerão aqui!
                    </p>
                  </div>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-xl border transition-all duration-150 ${
                      notif.read 
                        ? 'bg-slate-900/60 border-slate-800/80 text-slate-300' 
                        : 'bg-slate-900 border-slate-700/75 text-white shadow-md'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="h-7 w-7 shrink-0 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-center">
                        {getNotificationIcon(notif.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <strong className="font-extrabold text-[11px] text-amber-400 leading-tight">
                            {notif.title}
                          </strong>
                          <span className="text-[8px] text-slate-500 font-mono">
                            {notif.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-300 mt-1 leading-normal font-medium">{notif.body}</p>
                      </div>
                    </div>
                  </div>
                )).reverse()
              )}
            </div>

            {/* Smartphone Bottom Actions Panel */}
            <div className="p-4 bg-slate-900 border-t border-slate-850 space-y-2 shrink-0">
              {notifications.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onMarkAllAsRead}
                    className="py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-extrabold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Check className="h-3.5 w-3.5" /> Lidas
                  </button>
                  <button
                    onClick={onClearNotifications}
                    className="py-1.5 bg-rose-950/50 hover:bg-rose-950 border border-rose-900/50 text-rose-300 text-[10px] font-extrabold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Limpar Tudo
                  </button>
                </div>
              )}

              <div className="bg-slate-950 rounded-xl p-3 border border-slate-850 space-y-1.5">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">💡 Como Funciona:</span>
                <p className="text-[9px] text-slate-400 leading-relaxed font-medium">
                  Este simulador utiliza as APIs de áudio nativas do navegador para reproduzir os bipe-bipes de SMS de celular. Ele sincroniza com o andamento real e as conclusões de cronômetros da obra atual.
                </p>
              </div>

              {/* Simulated Home Indicator Bar */}
              <div className="flex justify-center pt-2">
                <div className="h-1 w-24 bg-slate-700 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
