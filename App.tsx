import React, { useState } from 'react';
import { useLiveApi } from './hooks/use-live-api';
import { useTextChatApi } from './hooks/use-text-chat-api';
import Visualizer from './components/Visualizer';
import SettingsPanel from './components/SettingsPanel';
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
  const [mode, setMode] = useState<'voice' | 'text'>('voice');

  const { connect, disconnect, reconnect, connectionState, phase, volume, error, messages } = useLiveApi(config);
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
        <div className="absolute top-3 right-3 z-30 flex gap-2">
          <button onClick={() => setMode('voice')} className="px-3 py-1.5 rounded-lg bg-[#2f2f2f] border border-[#444] text-gray-200 text-xs">Modo voz</button>
          <button onClick={() => setIsSettingsOpen(true)} className="px-3 py-1.5 rounded-lg bg-[#2f2f2f] border border-[#444] text-gray-200 text-xs">Config</button>
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
        <SettingsPanel config={config} setConfig={setConfig} isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} disabled={isStreaming} />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#212121] text-white flex flex-col">
      <header className="h-14 border-b border-[#2f2f2f] px-4 flex items-center justify-between">
        <div className="text-sm text-gray-300">Voice mode</div>
        <div className="flex gap-2">
          <button onClick={() => setMode('text')} className="px-3 py-1.5 rounded-lg bg-[#2f2f2f] border border-[#444] text-xs">Modo texto</button>
          <button onClick={() => setIsSettingsOpen(true)} className="px-3 py-1.5 rounded-lg bg-[#2f2f2f] border border-[#444] text-xs">Config</button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
          <div className="rounded-xl border border-[#3a3a3a] bg-[#262626] p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-200">Estado: {connectionState}</div>
              <div className="text-xs text-gray-400">{phase}</div>
            </div>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            <div className="mt-4 flex items-center justify-center">
              <Visualizer volume={volume} isActive={isConnected} />
            </div>
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => (isConnected || isConnecting ? disconnect() : connect())}
                className={`px-4 py-2 rounded-lg text-sm ${isConnected ? 'bg-red-500 text-white' : 'bg-white text-black'}`}
              >
                {isConnected ? 'Desconectar' : isConnecting ? 'Conectando…' : 'Conectar'}
              </button>
              <button onClick={reconnect} className="px-4 py-2 rounded-lg text-sm bg-[#2f2f2f] border border-[#444]">Reintentar</button>
            </div>
          </div>

          <div className="rounded-xl border border-[#3a3a3a] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#2f2f2f] bg-[#262626] text-sm text-gray-300">Transcripción</div>
            {messages.length === 0 ? (
              <div className="p-4 text-sm text-gray-400">Habla para ver mensajes aquí.</div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`${msg.role === 'model' ? 'bg-[#2a2a2a]' : ''} border-b border-[#2a2a2a]/70`}>
                  <div className="max-w-3xl mx-auto px-4 py-4 text-sm leading-relaxed">
                    <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">{msg.role === 'user' ? 'Tú' : 'Assistant'}</p>
                    <p>{msg.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <SettingsPanel config={config} setConfig={setConfig} isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} disabled={isConnected || isConnecting} />
    </div>
  );
};

export default App;
