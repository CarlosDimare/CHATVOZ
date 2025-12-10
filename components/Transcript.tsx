import React, { useEffect, useRef } from 'react';
import { Conversation } from '../types';

interface TranscriptProps {
  conversations: Conversation[];
  currentId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const Transcript: React.FC<TranscriptProps> = ({ conversations, currentId, onSelectConversation, onNewConversation, isOpen, onClose }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversations, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-start bg-black bg-opacity-50 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none lg:pointer-events-none" onClick={onClose}>
      <div className="w-full max-w-md bg-slate-900/90 lg:bg-slate-900 lg:border-r border-slate-800 h-full shadow-2xl p-4 overflow-y-auto pointer-events-auto pt-20 lg:pt-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="ph ph-chat-text"></i> Conversaciones
          </h2>
          <div className="flex gap-2">
            <button onClick={onNewConversation} className="text-slate-400 hover:text-white transition-colors">
              <i className="ph ph-plus text-2xl"></i>
            </button>
            <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white transition-colors">
              <i className="ph ph-x text-2xl"></i>
            </button>
          </div>
        </div>

        <div className="space-y-2 pb-20">
          {conversations.length === 0 && (
             <div className="text-center text-slate-500 mt-10">
               <i className="ph ph-chats text-4xl mb-2 block"></i>
               <p>No hay conversaciones aún.</p>
             </div>
          )}
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                conv.id === currentId
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <div className="font-medium truncate">{conv.title}</div>
              <div className="text-xs opacity-70">
                {conv.messages.length} mensajes • {new Date(conv.createdAt).toLocaleDateString()}
              </div>
            </button>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
};

export default Transcript;