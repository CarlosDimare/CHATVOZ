import React, { useState, useEffect } from 'react';
import { Config, PRESET_PERSONALITIES, VOICE_NAMES, Personality } from '../types';

interface SettingsPanelProps {
  config: Config;
  setConfig: (config: Config) => void;
  isOpen: boolean;
  onClose: () => void;
  disabled: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, setConfig, isOpen, onClose, disabled }) => {
  const [customPersonalities, setCustomPersonalities] = useState<Personality[]>([]);
  const [newCharacterName, setNewCharacterName] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('custom_personalities');
    if (saved) {
      try {
        setCustomPersonalities(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load custom personalities", e);
      }
    }
  }, []);

  const saveCustomPersonalities = (personalities: Personality[]) => {
    setCustomPersonalities(personalities);
    localStorage.setItem('custom_personalities', JSON.stringify(personalities));
  };

  const handleAddCharacter = () => {
    if (!newCharacterName.trim()) return;

    const newPersonality: Personality = {
      name: newCharacterName,
      instruction: `Eres ${newCharacterName}. Actúa, piensa y habla exactamente como este personaje histórico. Adopta su tono, vocabulario y visión del mundo. Tus respuestas son siempre en español.`
    };

    const updated = [...customPersonalities, newPersonality];
    saveCustomPersonalities(updated);
    setNewCharacterName('');

    // Auto-select the new character
    setConfig({ ...config, systemInstruction: newPersonality.instruction });
  };

  if (!isOpen) return null;

  const allPersonalities = [...PRESET_PERSONALITIES, ...customPersonalities];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black bg-opacity-80 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md bg-black h-full shadow-2xl p-6 overflow-y-auto border-l border-zinc-800">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 tracking-tighter">
            <i className="ph ph-faders text-red-600"></i> CONFIGURACIÓN
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-red-500 transition-colors">
            <i className="ph ph-x text-2xl"></i>
          </button>
        </div>

        {/* Tools */}
        <div className="mb-8">
          <label className="block text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3">Herramientas</label>
          <div className="flex items-center justify-between bg-zinc-900 p-4 rounded-none border border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-zinc-800 flex items-center justify-center">
                <i className="ph ph-globe text-white"></i>
              </div>
              <span className="text-zinc-300 text-sm font-medium">Búsqueda en Google</span>
            </div>
            <button
              onClick={() => setConfig({ ...config, useSearch: !config.useSearch })}
              disabled={disabled}
              className={`relative inline-flex h-6 w-11 items-center transition-colors ${config.useSearch ? 'bg-red-600' : 'bg-zinc-700'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform bg-white transition-transform ${config.useSearch ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>
        </div>

        {/* Voice Selection */}
        <div className="mb-8">
          <label className="block text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3">Voz</label>
          <div className="grid grid-cols-3 gap-2">
            {VOICE_NAMES.map(voice => (
              <button
                key={voice}
                onClick={() => setConfig({ ...config, voiceName: voice })}
                disabled={disabled}
                className={`px-4 py-2 text-sm font-bold uppercase transition-all border ${config.voiceName === voice
                    ? 'bg-red-600 text-black border-red-600'
                    : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-white'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {voice}
              </button>
            ))}
          </div>
        </div>

        {/* Personality Presets */}
        <div className="mb-8">
          <label className="block text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3">Personajes</label>

          {/* Add New Character Input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newCharacterName}
              onChange={(e) => setNewCharacterName(e.target.value)}
              placeholder="Nuevo personaje (ej. Einstein)"
              className="flex-1 bg-zinc-900 border border-zinc-800 p-3 text-white text-sm focus:border-red-600 outline-none placeholder-zinc-600"
            />
            <button
              onClick={handleAddCharacter}
              disabled={!newCharacterName.trim()}
              className="bg-zinc-800 hover:bg-red-600 text-white px-4 transition-colors disabled:opacity-50 disabled:hover:bg-zinc-800"
            >
              <i className="ph ph-plus"></i>
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
            {allPersonalities.map((p, idx) => (
              <button
                key={idx}
                onClick={() => setConfig({ ...config, systemInstruction: p.instruction })}
                disabled={disabled}
                className={`w-full text-left px-4 py-4 text-sm transition-all border-l-2 ${config.systemInstruction === p.instruction
                    ? 'bg-zinc-900 border-red-600 text-white'
                    : 'bg-black border-zinc-800 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="font-bold uppercase tracking-wider">{p.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom System Instruction */}
        <div>
          <label className="block text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3">Prompt del Sistema</label>
          <textarea
            value={config.systemInstruction}
            onChange={(e) => setConfig({ ...config, systemInstruction: e.target.value })}
            disabled={disabled}
            rows={6}
            className={`w-full bg-zinc-900 border border-zinc-800 p-4 text-zinc-300 text-sm focus:border-red-600 outline-none resize-none font-mono ${disabled ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            placeholder="Instrucciones del sistema..."
          />
        </div>

        {disabled && (
          <p className="text-red-500 text-xs mt-6 text-center uppercase tracking-widest border border-red-900/30 p-2 bg-red-900/10">
            Desconecta para editar
          </p>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;