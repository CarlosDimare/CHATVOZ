import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audio-utils';
import { Config, ConnectionState, TranscriptItem } from '../types';

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

export function useLiveApi(config: Config, updateMessages: (updater: (prev: TranscriptItem[]) => TranscriptItem[]) => void) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Audio Context Refs
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Playback State
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // API Session
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const currentConfigRef = useRef<Config>(config);

  // Update config ref when prop changes
  useEffect(() => {
    currentConfigRef.current = config;
  }, [config]);

  const disconnect = useCallback(async () => {
    console.log('Disconnecting...');
    
    // Close audio contexts
    if (inputContextRef.current) {
      await inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (outputContextRef.current) {
      await outputContextRef.current.close();
      outputContextRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Cleanup audio sources
    audioSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { /* ignore */ }
    });
    audioSourcesRef.current.clear();

    // Reset state
    setConnectionState('disconnected');
    setVolume(0);
    sessionPromiseRef.current = null;
  }, []);

  const connect = useCallback(async () => {
    if (!process.env.GEMINI_API_KEY) {
      setError("Clave API no encontrada en las variables de entorno.");
      return;
    }

    try {
      setConnectionState('connecting');
      setError(null);
      updateMessages(() => []); // Clear history on new connection

      // 1. Setup Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputContextRef.current = new AudioContextClass({ sampleRate: INPUT_SAMPLE_RATE });
      outputContextRef.current = new AudioContextClass({ sampleRate: OUTPUT_SAMPLE_RATE });

      // 2. Get Microphone Stream
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 3. Initialize Gemini Client
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      // 4. Start Connection
      const tools = currentConfigRef.current.useSearch ? [{ googleSearch: {} }] : [];

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
          tools: tools,
        },
        callbacks: {
          onopen: () => {
            console.log('Live session opened');
            setConnectionState('connected');
            
            // Start processing audio input
            if (!inputContextRef.current || !streamRef.current) return;
            
            const source = inputContextRef.current.createMediaStreamSource(streamRef.current);
            const processor = inputContextRef.current.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Calculate volume for visualizer
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(Math.min(1, rms * 5)); // Boost visualizer sensitivity

              // Send to API
              const pcmBlob = createPcmBlob(inputData, INPUT_SAMPLE_RATE);
              sessionPromiseRef.current?.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputContextRef.current.destination);
            
            inputSourceRef.current = source;
            processorRef.current = processor;
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            
            if (base64Audio && outputContextRef.current) {
              const ctx = outputContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(
                base64ToUint8Array(base64Audio),
                ctx,
                OUTPUT_SAMPLE_RATE
              );

              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              
              source.onended = () => {
                audioSourcesRef.current.delete(source);
              };
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              audioSourcesRef.current.add(source);
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              console.log('Model interrupted');
              audioSourcesRef.current.forEach(source => {
                try { source.stop(); } catch (e) { /* ignore */ }
              });
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            // Handle Transcription & Grounding
            const inputTx = message.serverContent?.inputTranscription?.text;
            const outputTx = message.serverContent?.outputTranscription?.text;
            // Cast to any to access groundingMetadata which might be missing in some type definitions
            const groundingMetadata = (message.serverContent as any)?.groundingMetadata;

            if (inputTx) {
                updateMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last?.role === 'user') {
                        return [...prev.slice(0, -1), { ...last, text: last.text + inputTx }];
                    } else {
                        return [...prev, {
                            id: Date.now().toString(),
                            role: 'user',
                            text: inputTx,
                            timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                        }];
                    }
                });
            }

            if (outputTx || groundingMetadata) {
                updateMessages(prev => {
                    const last = prev[prev.length - 1];
                    let sources = last?.sources || [];

                    // Extract new sources if present
                    if (groundingMetadata?.groundingChunks) {
                        const newSources = groundingMetadata.groundingChunks
                            .map((chunk: any) => chunk.web ? { title: chunk.web.title || 'Fuente', url: chunk.web.uri } : null)
                            .filter((s: any) => s);
                         if (newSources.length > 0) {
                             sources = [...sources, ...newSources];
                         }
                    }

                    if (last?.role === 'model') {
                        return [...prev.slice(0, -1), {
                            ...last,
                            text: last.text + (outputTx || ''),
                            sources: sources.length > 0 ? sources : undefined
                        }];
                    } else {
                        // If we have grounding but no text yet, create the message
                        if (outputTx || sources.length > 0) {
                            return [...prev, {
                                id: Date.now().toString(),
                                role: 'model',
                                text: outputTx || '',
                                timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                                sources: sources.length > 0 ? sources : undefined
                            }];
                        }
                        return prev;
                    }
                });
            }
          },
          onclose: () => {
            console.log('Session closed');
            setConnectionState('disconnected');
          },
          onerror: (err) => {
            console.error('Session error:', err);
            setConnectionState('error');
            setError(err instanceof Error ? err.message : "Error de conexión desconocido");
            disconnect();
          }
        }
      });

    } catch (err) {
      console.error("Connection setup failed", err);
      setConnectionState('error');
      setError(err instanceof Error ? err.message : "Fallo al configurar la conexión");
      disconnect();
    }
  }, [config, disconnect]);

  const sendText = useCallback(async (text: string) => {
    updateMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
    // Simulate response
    setTimeout(() => {
      updateMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: 'Respuesta simulada: ' + text, timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
    }, 1000);
  }, [updateMessages]);

  return {
    connect,
    disconnect,
    connectionState,
    volume,
    error,
    sendText
  };
}