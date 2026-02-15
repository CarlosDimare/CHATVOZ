import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audio-utils';
import { Config, ConnectionState, LiveMetrics, TranscriptItem } from '../types';

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const CONNECT_TIMEOUT_MS = 12000;
const CHUNK_SEND_INTERVAL_MS = 40;
const MAX_PENDING_CHUNKS = 6;

const AUDIO_WORKLET_PROCESSOR = `
class MicProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    this.port.postMessage(input[0]);
    return true;
  }
}
registerProcessor('mic-processor', MicProcessor);
`;

function now() {
  return Date.now();
}

function loadSavedMessages(): TranscriptItem[] {
  try {
    const saved = localStorage.getItem('chat_history');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem('chat_history');
    return [];
  }
}

const defaultMetrics: LiveMetrics = {
  sessionStarts: 0,
  sessionErrors: 0,
  reconnects: 0,
  avgInputRms: 0,
  chunksSent: 0,
  chunksDropped: 0,
  firstAudioLatencyMs: null,
  firstTextLatencyMs: null,
  lastRoundTripMs: null,
};

function loadSavedMessages(): TranscriptItem[] {
  try {
    const saved = localStorage.getItem('chat_history');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem('chat_history');
    return [];
  }
}

function loadSavedMessages(): TranscriptItem[] {
  try {
    const saved = localStorage.getItem('chat_history');
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem('chat_history');
    return [];
  }
}

export function useLiveApi(config: Config) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [phase, setPhase] = useState('idle');
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<TranscriptItem[]>(loadSavedMessages);
  const [metrics, setMetrics] = useState<LiveMetrics>(defaultMetrics);

  useEffect(() => {
    localStorage.setItem('chat_history', JSON.stringify(messages));
  }, [messages]);

  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const currentConfigRef = useRef<Config>(config);

  const pendingChunksRef = useRef<Float32Array[]>([]);
  const sendTimerRef = useRef<number | null>(null);
  const connectTimeoutRef = useRef<number | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const userTurnStartedAtRef = useRef<number | null>(null);
  const firstAudioLatencyRef = useRef<number | null>(null);
  const firstTextLatencyRef = useRef<number | null>(null);

  useEffect(() => {
    currentConfigRef.current = config;
  }, [config]);

  const clearTimers = () => {
    if (sendTimerRef.current) {
      window.clearInterval(sendTimerRef.current);
      sendTimerRef.current = null;
    }
    if (connectTimeoutRef.current) {
      window.clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
  };

  const disconnect = useCallback(async () => {
    clearTimers();
    setPhase('disconnected');

    if (inputContextRef.current) {
      await inputContextRef.current.close();
      inputContextRef.current = null;
    }

    if (outputContextRef.current) {
      await outputContextRef.current.close();
      outputContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    audioSourcesRef.current.forEach(source => {
      try { source.stop(); } catch { /* noop */ }
    });
    audioSourcesRef.current.clear();

    pendingChunksRef.current = [];

    inputSourceRef.current = null;
    processorRef.current = null;
    workletRef.current = null;

    setConnectionState('disconnected');
    setPhase('idle');
    setVolume(0);
    sessionPromiseRef.current = null;
  }, []);

  const startChunkSender = useCallback(() => {
    if (sendTimerRef.current) return;
    sendTimerRef.current = window.setInterval(() => {
      const chunk = pendingChunksRef.current.shift();
      if (!chunk) return;
      const pcmBlob = createPcmBlob(chunk, INPUT_SAMPLE_RATE);
      sessionPromiseRef.current?.then(session => {
        session.sendRealtimeInput({ media: pcmBlob });
        setMetrics(prev => ({ ...prev, chunksSent: prev.chunksSent + 1 }));
      });
    }, CHUNK_SEND_INTERVAL_MS);
  }, []);

  const handleInputChunk = useCallback((inputData: Float32Array) => {
    let sum = 0;
    for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
    const rms = Math.sqrt(sum / inputData.length);

    setVolume(Math.min(1, rms * 5));
    setMetrics(prev => {
      const nextCount = prev.chunksSent + pendingChunksRef.current.length + 1;
      return {
        ...prev,
        avgInputRms: prev.avgInputRms === 0 ? rms : ((prev.avgInputRms * (nextCount - 1)) + rms) / nextCount,
      };
    });

    if (!userTurnStartedAtRef.current && rms > 0.02) {
      userTurnStartedAtRef.current = now();
      setPhase('capturing-audio');
    }

    if (pendingChunksRef.current.length >= MAX_PENDING_CHUNKS) {
      pendingChunksRef.current.shift();
      setMetrics(prev => ({ ...prev, chunksDropped: prev.chunksDropped + 1 }));
    }
    pendingChunksRef.current.push(new Float32Array(inputData));
  }, []);

  const setupInputPipeline = useCallback(async () => {
    if (!inputContextRef.current || !streamRef.current) return;
    const source = inputContextRef.current.createMediaStreamSource(streamRef.current);
    inputSourceRef.current = source;

    if (inputContextRef.current.audioWorklet) {
      const workletBlob = new Blob([AUDIO_WORKLET_PROCESSOR], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(workletBlob);
      await inputContextRef.current.audioWorklet.addModule(workletUrl);
      URL.revokeObjectURL(workletUrl);

      const node = new AudioWorkletNode(inputContextRef.current, 'mic-processor');
      node.port.onmessage = event => {
        handleInputChunk(event.data as Float32Array);
      };
      source.connect(node);
      node.connect(inputContextRef.current.destination);
      workletRef.current = node;
    } else {
      const processor = inputContextRef.current.createScriptProcessor(2048, 1, 1);
      processor.onaudioprocess = e => handleInputChunk(e.inputBuffer.getChannelData(0));
      source.connect(processor);
      processor.connect(inputContextRef.current.destination);
      processorRef.current = processor;
    }

    startChunkSender();
  }, [handleInputChunk, startChunkSender]);

  const connect = useCallback(async () => {
    if (!process.env.GEMINI_API_KEY) {
      setError('Clave API no encontrada en las variables de entorno.');
      return;
    }

    try {
      setConnectionState('connecting');
      setPhase('initializing-audio');
      setError(null);
      setMessages([]);
      userTurnStartedAtRef.current = null;
      sessionStartedAtRef.current = now();

      setMetrics(prev => ({
        ...prev,
        sessionStarts: prev.sessionStarts + 1,
        firstAudioLatencyMs: null,
        firstTextLatencyMs: null,
      }));
      firstAudioLatencyRef.current = null;
      firstTextLatencyRef.current = null;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputContextRef.current = new AudioContextClass({ sampleRate: INPUT_SAMPLE_RATE });
      outputContextRef.current = new AudioContextClass({ sampleRate: OUTPUT_SAMPLE_RATE });

      setPhase('requesting-mic');
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const tools = currentConfigRef.current.useSearch ? [{ googleSearch: {} }] : [];

      connectTimeoutRef.current = window.setTimeout(() => {
        setError('Timeout al conectar con Gemini Live. Intenta reconectar.');
        setConnectionState('error');
        setPhase('timeout');
        setMetrics(prev => ({ ...prev, sessionErrors: prev.sessionErrors + 1 }));
        disconnect();
      }, CONNECT_TIMEOUT_MS);

      setPhase('waiting-live-session');
      sessionPromiseRef.current = ai.live.connect({
        model: currentConfigRef.current.model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: currentConfigRef.current.systemInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: currentConfigRef.current.voiceName } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools,
        },
        callbacks: {
          onopen: () => {
            if (connectTimeoutRef.current) {
              window.clearTimeout(connectTimeoutRef.current);
              connectTimeoutRef.current = null;
            }
            setConnectionState('connected');
            setPhase('connected-idle');
            setupInputPipeline().catch(err => {
              setError(err instanceof Error ? err.message : 'Fallo configurando entrada de audio');
              setConnectionState('error');
              setMetrics(prev => ({ ...prev, sessionErrors: prev.sessionErrors + 1 }));
              disconnect();
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;

            if (base64Audio && outputContextRef.current) {
              if (firstAudioLatencyRef.current === null && userTurnStartedAtRef.current) {
                const latency = now() - userTurnStartedAtRef.current;
                firstAudioLatencyRef.current = latency;
                setMetrics(prev => ({ ...prev, firstAudioLatencyMs: latency }));
              }
              setPhase('playing-audio');
              const ctx = outputContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

              const audioBuffer = await decodeAudioData(base64ToUint8Array(base64Audio), ctx, OUTPUT_SAMPLE_RATE);

              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.onended = () => {
                audioSourcesRef.current.delete(source);
                setPhase('connected-idle');
              };

              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              audioSourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              audioSourcesRef.current.forEach(source => {
                try { source.stop(); } catch { /* noop */ }
              });
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setPhase('interrupted');
            }

            const inputTx = message.serverContent?.inputTranscription?.text;
            const outputTx = message.serverContent?.outputTranscription?.text;
            const groundingMetadata = (message.serverContent as any)?.groundingMetadata;

            if (outputTx && firstTextLatencyRef.current === null && userTurnStartedAtRef.current) {
              const latency = now() - userTurnStartedAtRef.current;
              firstTextLatencyRef.current = latency;
              setMetrics(prev => ({
                ...prev,
                firstTextLatencyMs: latency,
                lastRoundTripMs: latency,
              }));
            }

            if (inputTx) {
              setPhase('waiting-model');
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'user') {
                  return [...prev.slice(0, -1), { ...last, text: `${last.text}${inputTx}` }];
                }
                return [...prev, {
                  id: Date.now().toString(),
                  role: 'user',
                  text: inputTx,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  status: 'complete',
                }];
              });
            }

            if (outputTx || groundingMetadata) {
              setMessages(prev => {
                const last = prev[prev.length - 1];
                let sources = last?.sources || [];
                if (groundingMetadata?.groundingChunks) {
                  const newSources = groundingMetadata.groundingChunks
                    .map((chunk: any) => chunk.web ? { title: chunk.web.title || 'Fuente', url: chunk.web.uri } : null)
                    .filter(Boolean);
                  if (newSources.length > 0) sources = [...sources, ...newSources];
                }

                if (last?.role === 'model') {
                  return [...prev.slice(0, -1), {
                    ...last,
                    text: `${last.text}${outputTx || ''}`,
                    sources: sources.length > 0 ? sources : undefined,
                    status: 'streaming',
                  }];
                }

                if (outputTx || sources.length > 0) {
                  return [...prev, {
                    id: Date.now().toString(),
                    role: 'model',
                    text: outputTx || '',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    sources: sources.length > 0 ? sources : undefined,
                    status: 'streaming',
                  }];
                }
                return prev;
              });
            }
          },
          onclose: () => {
            setConnectionState('disconnected');
            setPhase('closed');
            setMessages(prev => prev.map(m => m.role === 'model' ? { ...m, status: 'complete' } : m));
          },
          onerror: (err) => {
            setConnectionState('error');
            setError(err instanceof Error ? err.message : 'Error de conexión desconocido');
            setPhase('error');
            setMetrics(prev => ({ ...prev, sessionErrors: prev.sessionErrors + 1 }));
            disconnect();
          },
        },
      });
    } catch (err) {
      setConnectionState('error');
      setPhase('setup-error');
      setError(err instanceof Error ? err.message : 'Fallo al configurar la conexión');
      setMetrics(prev => ({ ...prev, sessionErrors: prev.sessionErrors + 1 }));
      disconnect();
    }
  }, [disconnect, setupInputPipeline]);

  const reconnect = useCallback(async () => {
    setMetrics(prev => ({ ...prev, reconnects: prev.reconnects + 1 }));
    await disconnect();
    await connect();
  }, [connect, disconnect]);

  return {
    connect,
    disconnect,
    reconnect,
    connectionState,
    phase,
    volume,
    error,
    messages,
    metrics,
  };
}
