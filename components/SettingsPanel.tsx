import React from 'react';
import { Config, PRESET_PERSONALITIES, VOICE_NAMES } from '../types';

interface SettingsPanelProps {
  config: Config;
  setConfig: (config: Config) => void;
  isOpen: boolean;
  onClose: () => void;
  disabled: boolean;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, setConfig, isOpen, onClose, disabled }) => {
  if (!isOpen) return null;

  const handlePersonalitySelect = (instruction: string) => {
    setConfig({ ...config, systemInstruction: instruction });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md bg-slate-900 h-full shadow-2xl p-6 overflow-y-auto border-l border-slate-800">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <i className="ph ph-faders"></i> Configuración
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <i className="ph ph-x text-2xl"></i>
          </button>
        </div>

        {/* Tools */}
        <div className="mb-8">
          <label className="block text-slate-300 text-sm font-medium mb-3">Herramientas</label>
          <div className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-900/30 flex items-center justify-center">
                <i className="ph ph-globe text-blue-400"></i>
              </div>
              <span className="text-slate-200 text-sm font-medium">Búsqueda en Google</span>
            </div>
            <button
              onClick={() => setConfig({ ...config, useSearch: !config.useSearch })}
              disabled={disabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.useSearch ? 'bg-blue-600' : 'bg-slate-600'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.useSearch ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Voice Selection */}
        <div className="mb-8">
          <label className="block text-slate-300 text-sm font-medium mb-3">Voz</label>
          <div className="grid grid-cols-3 gap-2">
            {VOICE_NAMES.map(voice => (
              <button
                key={voice}
                onClick={() => setConfig({ ...config, voiceName: voice })}
                disabled={disabled}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  config.voiceName === voice
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {voice}
              </button>
            ))}
          </div>
        </div>

        {/* Personality Presets */}
        <div className="mb-8">
          <label className="block text-slate-300 text-sm font-medium mb-3">Personalidades Predefinidas</label>
          <div className="space-y-2">
            {PRESET_PERSONALITIES.map(p => (
              <button
                key={p.name}
                onClick={() => handlePersonalitySelect(p.instruction)}
                disabled={disabled}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all border ${
                  config.systemInstruction === p.instruction
                    ? 'bg-slate-800 border-blue-500 text-blue-400'
                    : 'bg-slate-800/50 border-transparent text-slate-300 hover:bg-slate-800'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="font-medium">{p.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom System Instruction */}
        <div>
          <label className="block text-slate-300 text-sm font-medium mb-3">Instrucciones del Sistema</label>
          <textarea
            value={config.systemInstruction}
            onChange={(e) => setConfig({ ...config, systemInstruction: e.target.value })}
            disabled={disabled}
            rows={6}
            className={`w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none ${
              disabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            placeholder="Introduce instrucciones personalizadas para el comportamiento de la IA..."
          />
        </div>

        {disabled && (
          <p className="text-yellow-500 text-xs mt-4 text-center">
            La configuración no se puede cambiar mientras estás conectado.
          </p>
        )}
      </div>
    </div>
  );
};

export default SettingsPanel;