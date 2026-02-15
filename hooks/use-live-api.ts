import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audio-utils';
import { Config, ConnectionState, TranscriptItem } from '../types';

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

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

  useEffect(() => {
    localStorage.setItem('chat_history', JSON.stringify(messages));
  }, [messages]);

  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const currentConfigRef = useRef<Config>(config);

  useEffect(() => {
    currentConfigRef.current = config;
  }, [config]);

  const disconnect = useCallback(async () => {
    setPhase('disconnecting');

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }

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

    nextStartTimeRef.current = 0;
    setConnectionState('disconnected');
    setPhase('idle');
    setVolume(0);
    sessionPromiseRef.current = null;
  }, []);

  const connect = useCallback(async () => {
    if (!process.env.GEMINI_API_KEY) {
      setError('Clave API no encontrada en las variables de entorno.');
      return;
    }

    try {
      setConnectionState('connecting');
      setPhase('initializing');
      setError(null);
      setMessages([]);

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputContextRef.current = new AudioContextClass({ sampleRate: INPUT_SAMPLE_RATE });
      outputContextRef.current = new AudioContextClass({ sampleRate: OUTPUT_SAMPLE_RATE });

      setPhase('requesting-microphone');
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const tools = currentConfigRef.current.useSearch ? [{ googleSearch: {} }] : [];

      setPhase('opening-session');
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
            setConnectionState('connected');
            setPhase('listening');

            if (!inputContextRef.current || !streamRef.current) return;

            const source = inputContextRef.current.createMediaStreamSource(streamRef.current);
            const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);

            processor.onaudioprocess = e => {
              const inputData = e.inputBuffer.getChannelData(0);

              let sum = 0;
              for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(Math.min(1, rms * 5));

              const pcmBlob = createPcmBlob(inputData, INPUT_SAMPLE_RATE);
              sessionPromiseRef.current?.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputContextRef.current.destination);
            processorRef.current = processor;
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;

            if (base64Audio && outputContextRef.current) {
              setPhase('responding');
              const ctx = outputContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

              const audioBuffer = await decodeAudioData(
                base64ToUint8Array(base64Audio),
                ctx,
                OUTPUT_SAMPLE_RATE,
              );

              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);

              source.onended = () => {
                audioSourcesRef.current.delete(source);
                setPhase('listening');
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

            if (inputTx) {
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'user') {
                  return [...prev.slice(0, -1), { ...last, text: last.text + inputTx }];
                }
                return [...prev, {
                  id: Date.now().toString(),
                  role: 'user',
                  text: inputTx,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
                    .filter((s: any) => s);
                  if (newSources.length > 0) sources = [...sources, ...newSources];
                }

                if (last?.role === 'model') {
                  return [...prev.slice(0, -1), {
                    ...last,
                    text: last.text + (outputTx || ''),
                    sources: sources.length > 0 ? sources : undefined,
                  }];
                }

                if (outputTx || sources.length > 0) {
                  return [...prev, {
                    id: Date.now().toString(),
                    role: 'model',
                    text: outputTx || '',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    sources: sources.length > 0 ? sources : undefined,
                  }];
                }
                return prev;
              });
            }
          },
          onclose: () => {
            setConnectionState('disconnected');
            setPhase('closed');
          },
          onerror: (err) => {
            setConnectionState('error');
            setPhase('error');
            setError(err instanceof Error ? err.message : 'Error de conexión desconocido');
            disconnect();
          },
        },
      });
    } catch (err) {
      setConnectionState('error');
      setPhase('setup-error');
      setError(err instanceof Error ? err.message : 'Fallo al configurar la conexión');
      disconnect();
    }
  }, [disconnect]);

  const reconnect = useCallback(async () => {
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
  };
}
