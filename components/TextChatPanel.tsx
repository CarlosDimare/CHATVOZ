import React, { useState } from 'react';
import { Conversation } from '../types';

interface TextChatPanelProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string) => void;
  createConversation: () => void;
  deleteConversation: (id: string) => void;
  sendMessage: (text: string) => Promise<void>;
  isStreaming: boolean;
}

const TextChatPanel: React.FC<TextChatPanelProps> = ({
  conversations,
  activeConversationId,
  setActiveConversationId,
  createConversation,
  deleteConversation,
  sendMessage,
  isStreaming,
}) => {
  const [input, setInput] = useState('');

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;

  const onSubmit = async () => {
    const value = input.trim();
    if (!value || isStreaming) return;
    setInput('');
    await sendMessage(value);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 grid grid-cols-1 md:grid-cols-[300px_1fr]">
      <aside className="border-r border-slate-800 p-3 space-y-2">
        <button
          onClick={createConversation}
          className="w-full bg-slate-100 text-slate-900 py-2 rounded-lg text-sm font-semibold"
        >
          + Nuevo chat
        </button>
        <div className="space-y-1 max-h-[80vh] overflow-y-auto">
          {conversations.map(conv => (
            <div key={conv.id} className={`p-2 rounded-lg border ${activeConversationId === conv.id ? 'border-blue-500 bg-blue-950/30' : 'border-slate-800 bg-slate-900/40'}`}>
              <button onClick={() => setActiveConversationId(conv.id)} className="w-full text-left">
                <p className="text-sm truncate">{conv.title}</p>
                <p className="text-[10px] text-slate-500">{new Date(conv.updatedAt).toLocaleString()}</p>
              </button>
              <button onClick={() => deleteConversation(conv.id)} className="text-[10px] text-red-400 mt-1">Eliminar</button>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex flex-col h-screen">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {!activeConversation && (
            <p className="text-slate-500 text-sm">Crea un chat para comenzar.</p>
          )}
          {activeConversation?.messages.map(msg => (
            <div key={msg.id} className={`max-w-3xl ${msg.role === 'user' ? 'ml-auto' : ''}`}>
              <div className={`rounded-xl px-4 py-3 text-sm border ${msg.role === 'user' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900 border-slate-700 text-slate-100'}`}>
                {msg.text || (msg.status === 'streaming' ? '…' : '')}
                {msg.error && <p className="text-red-400 text-xs mt-2">{msg.error}</p>}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">{msg.timestamp} {msg.status ? `• ${msg.status}` : ''}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-800 p-4">
          <textarea
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm resize-none"
            rows={3}
            placeholder="Escribe tu mensaje... (Enter para enviar, Shift+Enter para salto de línea)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                await onSubmit();
              }
            }}
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={onSubmit}
              disabled={isStreaming || !input.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm"
            >
              {isStreaming ? 'Generando…' : 'Enviar'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TextChatPanel;
