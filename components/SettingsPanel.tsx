import React from 'react';
import { Config, VOICE_NAMES } from '../types';

interface SettingsPanelProps {
  config: Config;
  setConfig: (config: Config) => void;
  isOpen: boolean;
  onClose: () => void;
  disabled: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, setConfig, isOpen, onClose, disabled }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black bg-opacity-90 backdrop-blur-none transition-opacity font-mono">
      <div className="w-full max-w-md bg-black h-full shadow-none p-6 overflow-y-auto border-l border-zinc-800">
        <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 tracking-widest uppercase">
            <i className="ph ph-faders text-red-600"></i> Configuración
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-red-500 transition-colors">
            <i className="ph ph-x text-2xl"></i>
          </button>
        </div>

        {/* Tools */}
        <div className="mb-8">
          <label className="block text-red-600 text-xs font-bold uppercase tracking-widest mb-3">[ HERRAMIENTAS ]</label>
          <div className="flex items-center justify-between bg-black p-4 border border-zinc-800 hover:border-zinc-600 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 flex items-center justify-center">
                <i className="ph ph-globe text-zinc-400"></i>
              </div>
              <span className="text-zinc-300 text-sm font-bold uppercase">Búsqueda en Google</span>
            </div>
            <button
              onClick={() => setConfig({ ...config, useSearch: !config.useSearch })}
              disabled={disabled}
              className={`relative inline-flex h-5 w-10 items-center transition-colors rounded-none ${config.useSearch ? 'bg-red-600' : 'bg-zinc-800'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-3 w-3 transform bg-black transition-transform ${config.useSearch ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>
        </div>

        {/* Voice Selection */}
        <div className="mb-8">
          <label className="block text-red-600 text-xs font-bold uppercase tracking-widest mb-3">[ VOZ GEMINI ]</label>
          <div className="grid grid-cols-3 gap-2">
            {VOICE_NAMES.map(voice => (
              <button
                key={voice}
                onClick={() => setConfig({ ...config, voiceName: voice })}
                disabled={disabled}
                className={`px-2 py-2 text-xs font-bold uppercase transition-all border ${config.voiceName === voice
                    ? 'bg-red-600 text-black border-red-600'
                    : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-500 hover:text-white'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {voice}
              </button>
            ))}
          </div>
        </div>


        {/* Custom System Instruction */}
        <div>
          <label className="block text-red-600 text-xs font-bold uppercase tracking-widest mb-3">[ PROMPT DEL SISTEMA ]</label>
          <textarea
            value={config.systemInstruction}
            onChange={(e) => setConfig({ ...config, systemInstruction: e.target.value })}
            disabled={disabled}
            rows={8}
            className={`w-full bg-black border border-zinc-800 p-4 text-zinc-300 text-xs focus:border-red-600 outline-none resize-none font-mono leading-relaxed ${disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            placeholder="Instrucciones del sistema..."
          />
        </div>

        {disabled && (
          <p className="text-red-500 text-xs mt-6 text-center uppercase tracking-widest border border-red-900/30 p-2 bg-red-900/10 animate-pulse">
            // CONEXIÓN ACTIVA: EDICIÓN BLOQUEADA //
          </p>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;