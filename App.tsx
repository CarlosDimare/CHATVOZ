import React, { useState } from 'react';
import { useLiveApi } from './hooks/use-live-api';
import { useTextChatApi } from './hooks/use-text-chat-api';
import Visualizer from './components/Visualizer';
import SettingsPanel from './components/SettingsPanel';
import Transcript from './components/Transcript';
import DebugPanel from './components/DebugPanel';
import TextChatPanel from './components/TextChatPanel';
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
  const [mode, setMode] = useState<'voice' | 'text'>('voice');

  const { connect, disconnect, reconnect, connectionState, phase, volume, error, messages, metrics } = useLiveApi(config);
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    createConversation,
    deleteConversation,
    sendMessage,
    isStreaming,
  } = useTextChatApi(config);

  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  if (mode === 'text') {
    return (
      <div className="relative">
        <div className="absolute top-3 right-3 z-20 flex gap-2">
          <button onClick={() => setMode('voice')} className="px-3 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs">Modo voz</button>
          <button onClick={() => setIsSettingsOpen(true)} className="px-3 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs">Config</button>
        </div>
        <TextChatPanel
          conversations={conversations}
          activeConversationId={activeConversationId}
          setActiveConversationId={setActiveConversationId}
          createConversation={createConversation}
          deleteConversation={deleteConversation}
          sendMessage={sendMessage}
          isStreaming={isStreaming}
        />
        <SettingsPanel
          config={config}
          setConfig={setConfig}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          disabled={isStreaming}
        />
      </div>
    );
  }

  const toggleConnection = () => {
    if (isConnected || isConnecting) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]"></div>
      </div>

      <div className="flex-1 flex flex-col h-screen relative z-10">
        <nav className="p-6 flex justify-end items-center gap-3">
          <button onClick={() => setMode('text')} className="px-3 py-2 text-xs text-slate-300 border border-slate-700 rounded-lg">Modo texto</button>
          <button onClick={() => setIsTranscriptOpen(true)} className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all">
            <i className="ph ph-chat-text text-2xl"></i>
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all">
            <i className="ph ph-gear text-2xl"></i>
          </button>
        </nav>

        <main className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl mx-auto px-6 pb-8 gap-6">
          <div className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-colors ${
            isConnected ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
            isConnecting ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
            error ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
            'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' :
                isConnecting ? 'bg-yellow-500 animate-bounce' :
                error ? 'bg-red-500' : 'bg-slate-500'
              }`} />
              {error ? 'Error de Conexión' : connectionState}
              <span className="text-[10px] opacity-80">• {phase}</span>
            </div>
          </div>

          {error && (
            <div className="text-center max-w-md">
              <p className="text-red-400 text-sm bg-red-950/30 p-3 rounded-lg border border-red-900/50">{error}</p>
              <button onClick={reconnect} className="mt-2 text-xs px-3 py-1 rounded border border-red-700 text-red-300">Reintentar</button>
            </div>
          )}

          <div className="relative w-full flex items-center justify-center">
            <div className={`absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent rounded-full blur-3xl transition-opacity duration-1000 ${isConnected ? 'opacity-100' : 'opacity-0'}`} />
            <Visualizer volume={volume} isActive={isConnected} />
          </div>

          <div className="flex flex-col items-center gap-6">
            <button
              onClick={toggleConnection}
              className={`relative group w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
                isConnected ? 'bg-red-500 hover:bg-red-600 shadow-red-900/40' : 'bg-white hover:bg-slate-200 shadow-blue-900/20'
              }`}
            >
              {isConnecting && <span className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping"></span>}
              <i className={`ph ${isConnected ? 'ph-phone-slash' : 'ph-microphone'} text-3xl ${isConnected ? 'text-white' : 'text-slate-900'}`}></i>
            </button>

            <p className="text-slate-500 text-sm font-medium">{isConnected ? 'Toca para desconectar' : 'Toca para conversar'}</p>
          </div>

          <DebugPanel metrics={metrics} phase={phase} />
        </main>
      </div>

      <Transcript messages={messages} isOpen={isTranscriptOpen} onClose={() => setIsTranscriptOpen(false)} />
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
