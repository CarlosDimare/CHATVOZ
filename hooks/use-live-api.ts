import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audio-utils';
import { performHybridSearch } from '../utils/search-utils';
import { Config, ConnectionState, TranscriptItem } from '../types';

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

export function useLiveApi(config: Config) {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<TranscriptItem[]>([]);

  // Audio Context Refs (Gemini)
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Playback State (Gemini)
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // API Session (Gemini)
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  // Pollinations / Web Speech Refs
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis>(window.speechSynthesis);
  const isPollinationsActiveRef = useRef(false);

  const currentConfigRef = useRef<Config>(config);

  // Update config ref when prop changes
  useEffect(() => {
    currentConfigRef.current = config;
  }, [config]);

  const disconnect = useCallback(async () => {
    console.log('Disconnecting...');

    // Common Cleanup
    setConnectionState('disconnected');
    setVolume(0);
    setError(null);

    // Gemini Cleanup
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
      try { source.stop(); } catch (e) { /* ignore */ }
    });
    audioSourcesRef.current.clear();
    sessionPromiseRef.current = null;

    // Pollinations Cleanup
    isPollinationsActiveRef.current = false;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    synthesisRef.current.cancel();

  }, []);

  const connectGemini = async () => {
    if (!process.env.API_KEY) {
      setError("Clave API no encontrada en las variables de entorno.");
      return;
    }

    try {
      setConnectionState('connecting');
      setError(null);
      setMessages([]);

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputContextRef.current = new AudioContextClass({ sampleRate: INPUT_SAMPLE_RATE });
      outputContextRef.current = new AudioContextClass({ sampleRate: OUTPUT_SAMPLE_RATE });

      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
              setVolume(Math.min(1, rms * 5));

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

            if (message.serverContent?.interrupted) {
              console.log('Model interrupted');
              audioSourcesRef.current.forEach(source => {
                try { source.stop(); } catch (e) { /* ignore */ }
              });
              audioSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }

            const inputTx = message.serverContent?.inputTranscription?.text;
            const outputTx = message.serverContent?.outputTranscription?.text;
            const groundingMetadata = (message.serverContent as any)?.groundingMetadata;

            if (inputTx) {
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'user') {
                  return [...prev.slice(0, -1), { ...last, text: last.text + inputTx }];
                } else {
                  return [...prev, {
                    id: Date.now().toString(),
                    role: 'user',
                    text: inputTx,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }];
                }
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
                  if (outputTx || sources.length > 0) {
                    return [...prev, {
                      id: Date.now().toString(),
                      role: 'model',
                      text: outputTx || '',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
  };

  const connectPollinations = async () => {
    try {
      setConnectionState('connecting');
      setError(null);
      setMessages([]);
      isPollinationsActiveRef.current = true;

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error("Tu navegador no soporta reconocimiento de voz.");
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-ES';

      recognition.onstart = () => {
        console.log('Recognition started');
        setConnectionState('connected');
      };

      recognition.onspeechstart = () => {
        if (synthesisRef.current.speaking) {
          synthesisRef.current.cancel();
        }
      };

      recognition.onresult = async (event: any) => {
        // Interruption Logic: If user speaks, cancel synthesis (backup)
        if (synthesisRef.current.speaking) {
          synthesisRef.current.cancel();
        }

        // Fake volume visualization
        setVolume(Math.random() * 0.5 + 0.2);

        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          // Add user message
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'user',
            text: finalTranscript,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);

          // Call Pollinations
          try {
            let searchContext = "";
            if (currentConfigRef.current.useSearch) {
              searchContext = await performHybridSearch(finalTranscript);
            }

            const prompt = encodeURIComponent(`${currentConfigRef.current.systemInstruction}\n${searchContext}\nUsuario: ${finalTranscript}\nAsistente:`);
            // Use default model (openai/gpt-4o-mini equivalent) which is faster and more reliable than searchgpt
            const response = await fetch(`https://text.pollinations.ai/${prompt}`);
            const text = await response.text();

            // Add model message
            setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'model',
              text: text,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);

            // Speak response
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'es-ES';
            // Try to match voice roughly if possible, or use default
            synthesisRef.current.speak(utterance);

            // Visualize while speaking
            const speakInterval = setInterval(() => {
              if (synthesisRef.current.speaking) {
                setVolume(Math.random() * 0.5 + 0.2);
              } else {
                setVolume(0);
                clearInterval(speakInterval);
              }
            }, 100);

          } catch (e) {
            console.error("Pollinations error", e);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Recognition error", event.error);
        if (event.error === 'not-allowed') {
          setError("Permiso de micrófono denegado.");
          disconnect();
        }
      };

      recognition.onend = () => {
        if (isPollinationsActiveRef.current) {
          recognition.start(); // Restart if it stops unexpectedly
        } else {
          setConnectionState('disconnected');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

    } catch (err) {
      console.error("Pollinations setup failed", err);
      setConnectionState('error');
      setError(err instanceof Error ? err.message : "Fallo al configurar Pollinations");
      disconnect();
    }
  };

  const connect = useCallback(() => {
    if (currentConfigRef.current.service === 'pollinations') {
      connectPollinations();
    } else {
      connectGemini();
    }
  }, []);

  return {
    connect,
    disconnect,
    connectionState,
    volume,
    error,
    messages
  };
}