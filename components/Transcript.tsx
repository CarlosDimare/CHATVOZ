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
    <div className="fixed inset-0 z-40 flex justify-start bg-black bg-opacity-80 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none lg:pointer-events-none">
      <div className="w-full max-w-md bg-black lg:bg-black lg:border-r border-zinc-900 h-full shadow-2xl p-4 overflow-y-auto pointer-events-auto pt-20 lg:pt-4">
        <div className="flex justify-between items-center mb-6 lg:hidden">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 uppercase tracking-widest">
            <i className="ph ph-chat-text text-red-600"></i> Historial
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-red-500 transition-colors">
            <i className="ph ph-x text-2xl"></i>
          </button>
        </div>

        <div className="space-y-6 pb-20">
          {messages.length === 0 && (
            <div className="text-center text-zinc-700 mt-20">
              <i className="ph ph-chats text-4xl mb-4 block opacity-50"></i>
              <p className="text-xs font-bold uppercase tracking-widest">Sin mensajes</p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 text-sm font-mono ${msg.role === 'user'
                    ? 'bg-zinc-900 text-white border border-zinc-800'
                    : 'bg-black text-zinc-300 border border-zinc-900'
                  }`}
              >
                {msg.text}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-zinc-800 flex flex-col gap-2">
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest flex items-center gap-1">
                      <i className="ph ph-link-simple"></i> Fuentes
                    </span>
                    {msg.sources.map((source, idx) => (
                      <a
                        key={idx}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-zinc-500 hover:text-red-500 hover:underline truncate block"
                      >
                        {source.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-zinc-600 mt-2 px-1 font-bold uppercase tracking-wider">
                {msg.role === 'user' ? 'Tú' : 'IA'} • {msg.timestamp}
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