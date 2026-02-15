import React from 'react';
import { LiveMetrics } from '../types';

interface DebugPanelProps {
  metrics: LiveMetrics;
  phase: string;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ metrics, phase }) => {
  const items = [
    ['Fase', phase],
    ['Sesiones', metrics.sessionStarts],
    ['Errores', metrics.sessionErrors],
    ['Reconexiones', metrics.reconnects],
    ['Chunks enviados', metrics.chunksSent],
    ['Chunks descartados', metrics.chunksDropped],
    ['RMS promedio', metrics.avgInputRms.toFixed(4)],
    ['1er audio (ms)', metrics.firstAudioLatencyMs ?? '-'],
    ['1er texto (ms)', metrics.firstTextLatencyMs ?? '-'],
    ['RTT (ms)', metrics.lastRoundTripMs ?? '-'],
  ];

  return (
    <div className="w-full max-w-3xl border border-slate-800 rounded-xl bg-slate-950/70 p-3 text-xs text-slate-300">
      <p className="text-slate-500 uppercase mb-2 tracking-wider">Debug / observabilidad</p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {items.map(([label, value]) => (
          <div key={label} className="bg-slate-900/70 border border-slate-800 rounded p-2">
            <p className="text-slate-500">{label}</p>
            <p className="text-slate-100 font-semibold">{String(value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DebugPanel;
