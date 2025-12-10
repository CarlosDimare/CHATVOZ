import React, { useEffect, useRef } from 'react';
import { TranscriptItem } from '../types';

interface TranscriptProps {
  messages: TranscriptItem[];
  isOpen: boolean;
  onClose: () => void;
}

const Transcript: React.FC<TranscriptProps> = ({ messages, isOpen, onClose }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-start bg-black bg-opacity-50 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none" onClick={onClose}>
      <div className="w-full max-w-md bg-slate-900/90 lg:bg-slate-900 lg:border-r border-slate-800 h-full shadow-2xl p-4 overflow-y-auto pointer-events-auto pt-20 lg:pt-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 lg:hidden">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <i className="ph ph-chat-text"></i> Historial
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <i className="ph ph-x text-2xl"></i>
          </button>
        </div>

        <div className="space-y-4 pb-20">
          {messages.length === 0 && (
             <div className="text-center text-slate-500 mt-10">
               <i className="ph ph-chats text-4xl mb-2 block"></i>
               <p>El historial de la conversación aparecerá aquí.</p>
             </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                }`}
              >
                {msg.text}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold opacity-50 uppercase tracking-wider flex items-center gap-1">
                      <i className="ph ph-link-simple"></i> Fuentes
                    </span>
                    {msg.sources.map((source, idx) => (
                      <a
                        key={idx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-300 hover:text-blue-200 hover:underline truncate block bg-black/20 px-2 py-1 rounded"
                      >
                        {source.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 px-1">
                {msg.role === 'user' ? 'Tú' : 'Gemini'} • {msg.timestamp}
              </span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
};

export default Transcript;