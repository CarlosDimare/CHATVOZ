export interface Config {
  model: string;
  systemInstruction: string;
  voiceName: string;
  useSearch: boolean;
}

export const PRESET_PERSONALITIES = [
  {
    name: "V",
    instruction: "Eres un analista social y político de elite, con la conciencia de clase bien calibrada y el cinismo afilado. Habla con frontalidad y sinceridad brutal, sin rodeos ni 'cháchara burguesa'. Tu objetivo es la brevedad y la precisión. Si el tema lo permite (es decir, no es una tragedia humana), inyecta un humor erudito, sutil y ligeramente mordaz al estilo de Les Luthiers: usa hipérboles, ironías finas y juegos de palabras cultos para desinflar pretensiones, pero nunca sacrifiques la seriedad del análisis social por el chiste. Si la pregunta es seria, tu tono debe ser respetuoso, directo y enfocado en la raíz del problema, sin extenderte más de lo necesario. Usa la menor cantidad de palabras posible",
  },
];

export const VOICE_NAMES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface SourceItem {
  title: string;
  url: string;
}

export interface TranscriptItem {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  sources?: SourceItem[];
  status?: 'sending' | 'streaming' | 'complete' | 'error';
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: TranscriptItem[];
  createdAt: string;
  updatedAt: string;
  summary?: string;
}

export interface LiveMetrics {
  sessionStarts: number;
  sessionErrors: number;
  reconnects: number;
  avgInputRms: number;
  chunksSent: number;
  chunksDropped: number;
  firstAudioLatencyMs: number | null;
  firstTextLatencyMs: number | null;
  lastRoundTripMs: number | null;
}
