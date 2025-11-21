import React, { useState } from 'react';
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

const App: React.FC = () => {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTranscriptOpen, setIsTranscriptOpen] = useState(false);

  const { connect, disconnect, connectionState, volume, error, messages } = useLiveApi(config);
  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  const toggleConnection = () => {
    if (isConnected || isConnecting) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="min-h-screen bg-black flex relative overflow-hidden font-sans selection:bg-red-900 selection:text-white">
      {/* Background Ambient Effects - Minimalist Red Glow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-red-900/10 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[700px] h-[700px] bg-zinc-900/20 rounded-full blur-[150px]"></div>
      </div>

      {/* Desktop Sidebar / Mobile Modal for Transcript */}
      <div className={`fixed lg:static inset-y-0 left-0 z-30 transform ${isTranscriptOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 lg:w-80 xl:w-96 shrink-0 border-r border-zinc-900 bg-black`}>
        <Transcript
          messages={messages}
          isOpen={true}
          onClose={() => setIsTranscriptOpen(false)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen relative z-10">

        {/* Top Navigation */}
        <nav className="p-6 flex justify-between items-center">
          {/* Mobile Transcript Toggle */}
          <button
            onClick={() => setIsTranscriptOpen(true)}
            className="lg:hidden p-3 text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all"
          >
            <i className="ph ph-chat-text text-2xl"></i>
          </button>

          <div className="flex items-center gap-2 mx-auto lg:mx-0 opacity-0 lg:opacity-100 pointer-events-none lg:pointer-events-auto">
            {/* Hidden Title for layout balance */}
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all"
          >
            <i className="ph ph-gear text-2xl"></i>
          </button>
        </nav>

        <main className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl mx-auto px-6 pb-12">

          {/* Status Indicator */}
          <div className={`mb-12 px-6 py-2 text-xs font-bold tracking-[0.2em] uppercase transition-colors border ${isConnected ? 'bg-red-900/10 text-red-500 border-red-900/30' :
              isConnecting ? 'bg-zinc-900 text-zinc-400 border-zinc-800' :
                error ? 'bg-red-900/20 text-red-500 border-red-900' :
                  'bg-black text-zinc-600 border-zinc-900'
            }`}>
            <div className="flex items-center gap-3">
              <div className={`w-1.5 h-1.5 ${isConnected ? 'bg-red-600 animate-pulse' :
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

          {/* Visualizer */}
          <div className="relative w-full flex items-center justify-center mb-16">
            <div className={`absolute inset-0 bg-gradient-to-b from-red-900/10 to-transparent rounded-full blur-3xl transition-opacity duration-1000 ${isConnected ? 'opacity-100' : 'opacity-0'}`} />
            <Visualizer volume={volume} isActive={isConnected} />
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-8">
            <button
              onClick={toggleConnection}
              className={`relative group w-24 h-24 flex items-center justify-center transition-all duration-500 ${isConnected
                  ? 'bg-red-600 hover:bg-red-700 shadow-[0_0_40px_rgba(220,38,38,0.3)]'
                  : 'bg-white hover:bg-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                }`}
              style={{ borderRadius: '0' }} // Square button for brutalist/minimalist look
            >
              {/* Ripple Effect when connecting */}
              {isConnecting && (
                <span className="absolute inset-0 border border-white/30 animate-ping"></span>
              )}

              <i className={`ph ${isConnected ? 'ph-phone-slash' : 'ph-microphone'} text-3xl ${isConnected ? 'text-black' : 'text-black'}`}></i>
            </button>

            <p className="text-zinc-600 text-xs font-bold tracking-[0.2em] uppercase">
              {isConnected ? "FINALIZAR TRANSMISIÓN" : "INICIAR TRANSMISIÓN"}
            </p>
          </div>
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