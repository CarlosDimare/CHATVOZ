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
    <div className="h-screen bg-[#212121] text-white grid grid-cols-1 md:grid-cols-[260px_1fr]">
      <aside className="bg-[#171717] border-r border-[#2f2f2f] p-3 space-y-2">
        <button
          onClick={createConversation}
          className="w-full rounded-lg border border-[#3a3a3a] bg-[#2a2a2a] px-3 py-2 text-sm text-left hover:bg-[#343434]"
        >
          + Nuevo chat
        </button>
        <div className="space-y-1 max-h-[82vh] overflow-y-auto">
          {conversations.map(conv => (
            <div
              key={conv.id}
              className={`rounded-lg px-2 py-2 ${activeConversationId === conv.id ? 'bg-[#2f2f2f]' : 'hover:bg-[#242424]'}`}
            >
              <button onClick={() => setActiveConversationId(conv.id)} className="w-full text-left">
                <p className="text-sm truncate">{conv.title}</p>
                <p className="text-[10px] text-gray-400">{new Date(conv.updatedAt).toLocaleDateString()}</p>
              </button>
              <button onClick={() => deleteConversation(conv.id)} className="text-[10px] text-gray-400 hover:text-red-400 mt-1">Eliminar</button>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex flex-col h-screen">
        <header className="h-14 border-b border-[#2f2f2f] px-4 flex items-center text-sm text-gray-300">Chat</header>

        <div className="flex-1 overflow-y-auto">
          {!activeConversation && (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">Inicia una conversación.</div>
          )}

          {activeConversation?.messages.map(msg => (
            <div key={msg.id} className={`${msg.role === 'model' ? 'bg-[#2a2a2a]' : ''} border-b border-[#2a2a2a]/70`}>
              <div className="max-w-3xl mx-auto px-4 py-5 text-sm leading-relaxed">
                <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">{msg.role === 'user' ? 'Tú' : 'Assistant'}</p>
                <p className="whitespace-pre-wrap">{msg.text || (msg.status === 'streaming' ? '…' : '')}</p>
                {msg.error && <p className="text-red-400 text-xs mt-2">{msg.error}</p>}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[#2f2f2f] p-3">
          <div className="max-w-3xl mx-auto">
            <textarea
              className="w-full rounded-2xl bg-[#2f2f2f] border border-[#3a3a3a] p-3 text-sm resize-none focus:outline-none focus:border-[#4a4a4a]"
              rows={3}
              placeholder="Pregunta lo que quieras"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={async e => {
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
                className="rounded-lg bg-white text-black px-4 py-2 text-sm disabled:opacity-50"
              >
                {isStreaming ? 'Generando…' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TextChatPanel;
