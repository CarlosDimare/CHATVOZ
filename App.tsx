import React, { useState, useEffect } from 'react';
import { useLiveApi } from './hooks/use-live-api';
import Visualizer from './components/Visualizer';
import SettingsPanel from './components/SettingsPanel';
import Transcript from './components/Transcript';
import { Config, PRESET_PERSONALITIES } from './types';

const DEFAULT_CONFIG: Config = {
  model: 'gemini-2.5-flash-native-audio-preview-09-2025',
  systemInstruction: PRESET_PERSONALITIES[0].instruction,
  voiceName: 'Kore',
  useSearch: true,
};

type Mode = 'voice' | 'text';

const App: React.FC = () => {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('voice');
  const [textInput, setTextInput] = useState('');

  const { connect, disconnect, connectionState, volume, error, messages, sendText } = useLiveApi(config);
  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  const toggleConnection = () => {
    if (isConnected || isConnecting) {
      disconnect();
    } else {
      connect();
    }
  };

  // Fix for mobile viewport height
  useEffect(() => {
    const setVh = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVh();
    window.addEventListener('resize', setVh);
    return () => window.removeEventListener('resize', setVh);
  }, []);

  // Auto-hide sidebar when switching to text mode
  useEffect(() => {
    if (mode === 'text') {
      setIsTranscriptOpen(false);
    }
  }, [mode]);

  return (
    <div className="h-screen w-full bg-black flex relative overflow-hidden font-mono selection:bg-red-900 selection:text-white" style={{ height: 'calc(var(--vh, 1vh) * 100)' }}>
      {/* Background Ambient Effects - Minimalist Red Glow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-red-900/5 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-zinc-900/10 rounded-full blur-[150px]"></div>
      </div>

      {/* Sidebar / Transcript Drawer */}
      {/* Removed lg:static and lg:translate-x-0 to make it collapsible on desktop too */}
      <div className={`fixed inset-y-0 left-0 z-30 transform ${isTranscriptOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 w-full lg:w-96 shrink-0 border-r border-zinc-900 bg-black/95 backdrop-blur-sm`}>
        <Transcript
          messages={messages}
          isOpen={true}
          onClose={() => setIsTranscriptOpen(false)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative z-10 transition-all duration-300">

        {/* Top Navigation */}
        <nav className="p-4 lg:p-6 flex justify-between items-center border-b border-zinc-900 lg:border-none">

          {/* Left Controls Group */}
          <div className="flex items-center gap-4">
            {/* Transcript Toggle - Visible on all screens now */}
            <button
              onClick={() => setIsTranscriptOpen(!isTranscriptOpen)}
              className={`p-3 transition-all border border-zinc-800 ${isTranscriptOpen ? 'bg-red-900/20 text-red-500 border-red-900' : 'text-zinc-500 hover:text-red-500 hover:bg-zinc-900'}`}
            >
              <i className="ph ph-chat-text text-2xl"></i>
            </button>

            {/* Mode Toggle */}
            <div className="flex bg-zinc-900/50 p-1 border border-zinc-800">
              <button
                onClick={() => setMode('voice')}
                className={`px-4 py-1 text-xs font-bold uppercase transition-colors ${mode === 'voice' ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
              >
                Voz
              </button>
              <button
                onClick={() => setMode('text')}
                className={`px-4 py-1 text-xs font-bold uppercase transition-colors ${mode === 'text' ? 'bg-red-600 text-white' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
              >
                Texto
              </button>
            </div>
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 text-zinc-500 hover:text-red-500 hover:bg-zinc-900 transition-all border border-zinc-800"
          >
            <i className="ph ph-gear text-2xl"></i>
          </button>
        </nav>

        <main className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl mx-auto px-6 pb-12">

          {/* Status Indicator */}
          <div className={`mb-8 lg:mb-12 px-6 py-2 text-xs font-bold tracking-[0.2em] uppercase transition-colors border ${isConnected ? 'bg-red-900/10 text-red-500 border-red-900/30' :
            isConnecting ? 'bg-zinc-900 text-zinc-400 border-zinc-800' :
              error ? 'bg-red-900/20 text-red-500 border-red-900' :
                'bg-black text-zinc-600 border-zinc-900'
            }`}>
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 ${isConnected ? 'bg-red-600 animate-pulse' :
                isConnecting ? 'bg-zinc-400 animate-bounce' :
                  error ? 'bg-red-600' : 'bg-zinc-700'
                }`} />
              {error ? 'ERROR DE CONEXIÓN' :
                connectionState === 'connected' ? 'EN LÍNEA' :
                  connectionState === 'connecting' ? 'CONECTANDO...' :
                    connectionState === 'disconnected' ? 'OFFLINE' : connectionState}
            </div>
          </div>

          {error && (
            <div className="mb-8 text-center max-w-md">
              <p className="text-red-500 text-sm bg-black border border-red-900 p-4 font-mono">
                {error}
              </p>
            </div>
          )}

          {/* VOICE MODE UI */}
          {mode === 'voice' && (
            <>
              <div className="relative w-full flex items-center justify-center mb-12 lg:mb-16">
                <div className={`absolute inset-0 bg-gradient-to-b from-red-900/10 to-transparent rounded-full blur-3xl transition-opacity duration-1000 ${isConnected ? 'opacity-100' : 'opacity-0'}`} />
                <Visualizer volume={volume} isActive={isConnected} />
              </div>

              <div className="flex flex-col items-center gap-8">
                <button
                  onClick={toggleConnection}
                  className={`relative group w-24 h-24 flex items-center justify-center transition-all duration-500 rounded-full border-2 ${isConnected
                    ? 'bg-red-600 border-red-600 hover:bg-red-700 shadow-[0_0_40px_rgba(220,38,38,0.3)]'
                    : 'bg-black border-red-600 hover:bg-red-900/20 shadow-[0_0_20px_rgba(220,38,38,0.1)]'
                    }`}
                >
                  {/* Ripple Effect when connecting */}
                  {isConnecting && (
                    <span className="absolute inset-0 border border-red-600/30 rounded-full animate-ping"></span>
                  )}

                  <i className={`ph ${isConnected ? 'ph-phone-slash' : 'ph-microphone'} text-3xl ${isConnected ? 'text-black' : 'text-red-500'}`}></i>
                </button>

                <p className="text-zinc-600 text-xs font-bold tracking-[0.2em] uppercase">
                  {isConnected ? "FINALIZAR" : "INICIAR"}
                </p>
              </div>
            </>
          )}

          {/* TEXT MODE UI */}
          {mode === 'text' && (
            <div className="w-full flex flex-col h-[60vh]">
              <div className="flex-1 overflow-hidden border border-zinc-800 bg-black/50 mb-4 relative">
                <Transcript messages={messages} isOpen={true} onClose={() => { }} />
              </div>

              <div className="flex gap-2 items-center">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && textInput.trim() && isConnected) {
                        sendText(textInput);
                        setTextInput('');
                      }
                    }}
                    placeholder={isConnected ? "Escribe un mensaje..." : "Conecta para chatear..."}
                    disabled={!isConnected}
                    className="w-full bg-zinc-900/50 border border-zinc-800 p-4 text-white text-sm outline-none focus:border-red-600 placeholder-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Unified Connect/Send Button for Text Mode */}
                {isConnected ? (
                  <button
                    onClick={() => {
                      if (textInput.trim()) {
                        sendText(textInput);
                        setTextInput('');
                      }
                    }}
                    disabled={!textInput.trim()}
                    className="w-14 h-14 flex items-center justify-center bg-zinc-900 hover:bg-red-600 text-white transition-colors border border-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-900 rounded-full"
                  >
                    <i className="ph ph-paper-plane-right text-xl"></i>
                  </button>
                ) : (
                  <button
                    onClick={toggleConnection}
                    className="w-14 h-14 flex items-center justify-center bg-black border-2 border-red-600 hover:bg-red-900/20 text-red-500 transition-colors rounded-full"
                  >
                    <i className="ph ph-plugs text-xl"></i>
                  </button>
                )}
              </div>
              {!isConnected && (
                <p className="text-center text-zinc-600 text-[10px] mt-2 uppercase tracking-widest">
                  * Pulsa el botón rojo para conectar
                </p>
              )}
            </div>
          )}

        </main>
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        config={config}
        setConfig={setConfig}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        disabled={isConnected || isConnecting}
      />

    </div>
  );
};

export default App;