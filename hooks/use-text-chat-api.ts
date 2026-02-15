import { useCallback, useEffect, useMemo, useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Config, Conversation, TranscriptItem } from '../types';

const STORAGE_KEY = 'chat_history_v2';
const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash';

function safeReadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function titleFromMessage(text: string) {
  return text.trim().slice(0, 48) || 'Nuevo chat';
}

function isModelNotFoundError(err: unknown) {
  if (!(err instanceof Error)) return false;
  return err.message.includes('NOT_FOUND') || err.message.includes('not found for API version');
}

function resolveTextModel(model: string) {
  return model.includes('native-audio') ? DEFAULT_TEXT_MODEL : model;
}

export function useTextChatApi(config: Config) {
  const [conversations, setConversations] = useState<Conversation[]>(safeReadConversations);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    if (!activeConversationId && conversations.length > 0) {
      setActiveConversationId(conversations[0].id);
    }
  }, [activeConversationId, conversations]);

  const activeConversation = useMemo(
    () => conversations.find(c => c.id === activeConversationId) || null,
    [activeConversationId, conversations],
  );

  const createConversation = useCallback(() => {
    const conversation: Conversation = {
      id: crypto.randomUUID(),
      title: 'Nuevo chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setConversations(prev => [conversation, ...prev]);
    setActiveConversationId(conversation.id);
  }, []);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    setActiveConversationId(prev => (prev === id ? null : prev));
  }, []);

  const updateConversationMessages = useCallback((id: string, updater: (messages: TranscriptItem[]) => TranscriptItem[]) => {
    setConversations(prev => prev.map(conv => {
      if (conv.id !== id) return conv;
      const messages = updater(conv.messages);
      const firstUser = messages.find(m => m.role === 'user');
      return {
        ...conv,
        messages,
        title: firstUser ? titleFromMessage(firstUser.text) : conv.title,
        updatedAt: new Date().toISOString(),
      };
    }));
  }, []);

  const streamModelResponse = useCallback(async (
    ai: GoogleGenAI,
    model: string,
    text: string,
    history: { role: 'user' | 'model'; parts: { text: string }[] }[],
    conversationId: string,
  ) => {
    const stream = await ai.models.generateContentStream({
      model,
      config: {
        systemInstruction: config.systemInstruction,
      },
      contents: [
        ...history,
        { role: 'user', parts: [{ text }] },
      ],
    });

    for await (const chunk of stream) {
      const token = chunk.text || '';
      if (!token) continue;
      updateConversationMessages(conversationId, messages => {
        const copy = [...messages];
        const last = copy[copy.length - 1];
        if (last?.role === 'model') {
          copy[copy.length - 1] = { ...last, text: `${last.text}${token}`, status: 'streaming' };
        }
        return copy;
      });
    }

    updateConversationMessages(conversationId, messages => {
      const copy = [...messages];
      const last = copy[copy.length - 1];
      if (last?.role === 'model') copy[copy.length - 1] = { ...last, status: 'complete' };
      return copy;
    });
  }, [config.systemInstruction, updateConversationMessages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Falta GEMINI_API_KEY.');
    }

    let conversationId = activeConversationId;
    if (!conversationId) {
      conversationId = crypto.randomUUID();
      const conversation: Conversation = {
        id: conversationId,
        title: titleFromMessage(text),
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setConversations(prev => [conversation, ...prev]);
      setActiveConversationId(conversationId);
    }

    const userMessage: TranscriptItem = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'complete',
    };

    const modelMessage: TranscriptItem = {
      id: crypto.randomUUID(),
      role: 'model',
      text: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'streaming',
    };

    updateConversationMessages(conversationId, messages => [...messages, userMessage, modelMessage]);

    setIsStreaming(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const history = (activeConversation?.messages || []).map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.text }],
      }));

      const preferredModel = resolveTextModel(config.model);

      try {
        await streamModelResponse(ai, preferredModel, text, history, conversationId);
      } catch (err) {
        if (!isModelNotFoundError(err) || preferredModel === DEFAULT_TEXT_MODEL) {
          throw err;
        }
        await streamModelResponse(ai, DEFAULT_TEXT_MODEL, text, history, conversationId);
      }
    } catch (err) {
      updateConversationMessages(conversationId, messages => {
        const copy = [...messages];
        const last = copy[copy.length - 1];
        if (last?.role === 'model') {
          copy[copy.length - 1] = {
            ...last,
            status: 'error',
            error: err instanceof Error ? err.message : 'Error desconocido',
          };
        }
        return copy;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [activeConversation?.messages, activeConversationId, config.model, streamModelResponse, updateConversationMessages]);

  return {
    conversations,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    createConversation,
    deleteConversation,
    sendMessage,
    isStreaming,
  };
}
