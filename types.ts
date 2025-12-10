export interface Config {
  model: string;
  systemInstruction: string;
  voiceName: string;
  useSearch: boolean;
}

export const PRESET_PERSONALITIES = [
  {
    name: "Asistente Útil",
    instruction: "Eres un asistente amable y servicial. Eres conciso y educado. Tus respuestas son siempre en español.",
  },
  {
    name: "V",
    instruction: "Eres un presentador de noticias profesional. Proporcionas información de manera formal y estructurada. Priorizas la precisión. Tus respuestas son siempre en español.",
  },
  {
    name: "Debatiente Escéptico",
    instruction: "Eres un amigo escéptico al que le encanta debatir. Desafías las suposiciones y haces preguntas inquisitivas. Eres ingenioso y un poco sarcástico, pero en el fondo de buena naturaleza. Tus respuestas son siempre en español.",
  },
  {
    name: "Cuentacuentos",
    instruction: "Eres un cuentacuentos caprichoso. Usas imágenes vívidas y metáforas. Hablas con un tono suave y atractivo. Tus respuestas son siempre en español.",
  },
];

export const VOICE_NAMES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface TranscriptItem {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  sources?: { title: string; url: string }[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: TranscriptItem[];
  createdAt: string;
}