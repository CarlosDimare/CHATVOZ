import React, { useState } from 'react';
import { useLiveApi } from './hooks/use-live-api';
import Visualizer from './components/Visualizer';
import SettingsPanel from './components/SettingsPanel';
import Transcript from './components/Transcript';
import { Config, PRESET_PERSONALITIES, Conversation } from './types';

type Mode = 'voice' | 'text';

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
  const [mode, setMode] = useState<Mode>('voice');
  const [textInput, setTextInput] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('conversations');
    return saved ? JSON.parse(saved) : [];
  });
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  const currentConversation = conversations.find(c => c.id === currentConversationId);
  const messages = currentConversation ? currentConversation.messages : [];

  const updateCurrentConversationMessages = (updater: (prev: any[]) => any[]) => {
    if (!currentConversationId) return;
    setConversations(prev => prev.map(conv =>
      conv.id === currentConversationId
        ? { ...conv, messages: updater(conv.messages) }
        : conv
    ));
  };

  const createNewConversation = () => {
    const id = Date.now().toString();
    const newConv: Conversation = {
      id,
      title: `Conversación ${conversations.length + 1}`,
      messages: [],
      createdAt: new Date().toISOString(),
    };
    setConversations(prev => [...prev, newConv]);
    setCurrentConversationId(id);
  };

  React.useEffect(() => {
    localStorage.setItem('conversations', JSON.stringify(conversations));
  }, [conversations]);

  const { connect, disconnect, connectionState, volume, error, sendText } = useLiveApi(config, updateCurrentConversationMessages);
  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  const toggleConnection = () => {
    if (isConnected || isConnecting) {
      disconnect();
    } else {
      if (!currentConversationId) {
        createNewConversation();
      }
      connect();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex relative overflow-hidden">
      {/* Background Ambient Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px]"></div>
      </div>

      {/* Desktop Sidebar / Mobile Modal for Transcript */}
      <div className={`fixed lg:static inset-y-0 left-0 z-30 transform ${isTranscriptOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 lg:w-80 xl:w-96 shrink-0`}>
        <Transcript
            conversations={conversations}
            currentId={currentConversationId}
            onSelectConversation={setCurrentConversationId}
            onNewConversation={createNewConversation}
            isOpen={true} // Always render content, visibility handled by parent container on mobile
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
            className="lg:hidden p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"
            >
            <i className="ph ph-chat-text text-2xl"></i>
            </button>

            <div className="flex items-center gap-2 mx-auto lg:mx-0">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/30">
                    <i className="ph ph-sparkle text-white text-lg"></i>
                </div>
                <h1 className="text-xl font-bold text-slate-100 tracking-tight">Vot</h1>
            </div>

            <button
            onClick={() => setMode(mode === 'voice' ? 'text' : 'voice')}
            className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"
            >
            <i className={`ph ${mode === 'voice' ? 'ph-chat-text' : 'ph-microphone'} text-2xl`}></i>
            </button>

            <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"
            >
            <i className="ph ph-gear text-2xl"></i>
            </button>
        </nav>

        <main className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl mx-auto px-6 pb-12">
            
            {/* Status Indicator */}
            <div className={`mb-8 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase transition-colors ${
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
                {error ? 'Error de Conexión' : 
                 connectionState === 'connected' ? 'Conectado' :
                 connectionState === 'connecting' ? 'Conectando' : 
                 connectionState === 'disconnected' ? 'Desconectado' : connectionState}
            </div>
            </div>

            {error && (
            <div className="mb-8 text-center max-w-md">
                <p className="text-red-400 text-sm bg-red-950/30 p-3 rounded-lg border border-red-900/50">
                {error}
                </p>
            </div>
            )}

            {/* Visualizer */}
            <div className="relative w-full flex items-center justify-center mb-12">
            <div className={`absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent rounded-full blur-3xl transition-opacity duration-1000 ${isConnected ? 'opacity-100' : 'opacity-0'}`} />
            <Visualizer volume={volume} isActive={isConnected} />
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center gap-6">
            <button
                onClick={toggleConnection}
                className={`relative group w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
                isConnected 
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-900/40' 
                    : 'bg-white hover:bg-slate-200 shadow-blue-900/20'
                }`}
            >
                {/* Ripple Effect when connecting */}
                {isConnecting && (
                <span className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping"></span>
                )}
                
                <i className={`ph ${isConnected ? 'ph-phone-slash' : (mode === 'voice' ? 'ph-microphone' : 'ph-chat-text')} text-3xl ${isConnected ? 'text-white' : 'text-slate-900'}`}></i>
            </button>

            <p className="text-slate-500 text-sm font-medium">
                {isConnected ? "Toca para desconectar" : (mode === 'voice' ? "Toca para conversar" : "Escribe para conversar")}
            </p>
            </div>

            {mode === 'text' && (
            <div className="flex gap-2 mt-6 max-w-md mx-auto">
                <input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendText(textInput) && setTextInput('')}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Escribe tu mensaje..."
                />
                <button
                onClick={() => { sendText(textInput); setTextInput(''); }}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-lg font-medium transition-colors"
                >
                Enviar
                </button>
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