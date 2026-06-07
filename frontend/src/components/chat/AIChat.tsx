import React, { useState, useEffect, useRef } from 'react';
import { Bot, X, Send, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { translations } from '../../utils/translations';

const AI_URL = import.meta.env.VITE_AI_URL || 'http://localhost:8001';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', yo: 'Yoruba', ha: 'Hausa', ig: 'Igbo',
  fr: 'French', pt: 'Portuguese', sw: 'Swahili', am: 'Amharic',
};

interface AIChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: string;
}

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  error?: boolean;
  streaming?: boolean;
}

const AIChat: React.FC<AIChatProps> = ({ isOpen, onClose, currentLanguage }) => {
  const t = translations[currentLanguage as keyof typeof translations] || translations.en;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        id: 1,
        text: t.chatWelcome || "Hello! I'm SmartEd AI. I can help with WAEC, JAMB, NECO, GCE, and NCE questions. How can I help you today?",
        sender: 'ai',
      }]);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // Cleanup on unmount or close
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const handleClearHistory = async () => {
    if (sessionId) {
      try {
        await fetch(`${AI_URL}/session/${sessionId}`, { method: 'DELETE' });
      } catch { /* ignore */ }
    }
    setSessionId(null);
    setMessages([{
      id: Date.now(),
      text: "Conversation cleared. How can I help you?",
      sender: 'ai',
    }]);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg: Message = { id: Date.now(), text, sender: 'user' };
    const aiMsgId = Date.now() + 1;
    setMessages((prev) => [...prev, userMsg, { id: aiMsgId, text: '', sender: 'ai', streaming: true }]);
    setInput('');
    setIsTyping(true);

    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${AI_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          session_id: sessionId,
          language: currentLanguage,
          stream: true,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error('AI service unavailable');

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let aiText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) throw new Error(data.error);
            if (data.token) {
              aiText += data.token;
              setMessages((prev) =>
                prev.map((m) => m.id === aiMsgId ? { ...m, text: aiText } : m)
              );
            }
            if (data.session_id && !sessionId) {
              setSessionId(data.session_id);
            }
            if (data.done) {
              setMessages((prev) =>
                prev.map((m) => m.id === aiMsgId ? { ...m, streaming: false } : m)
              );
            }
          } catch (parseErr) {
            if ((parseErr as Error).message !== 'Unexpected end of JSON input') throw parseErr;
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, text: 'Sorry, the AI tutor is temporarily unavailable. Please try again shortly.', error: true, streaming: false }
            : m
        )
      );
    } finally {
      setIsTyping(false);
      abortRef.current = null;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-24 right-4 z-50 w-full max-w-md"
      role="dialog"
      aria-label="AI Tutor Chat"
      aria-modal="false"
    >
      <div className="bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" aria-hidden="true" />
            <div>
              <span className="font-semibold">{t.chatTitle || 'SmartEd AI Tutor'}</span>
              <span className="ml-2 text-xs text-green-200">{LANGUAGE_NAMES[currentLanguage] || 'English'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 1 && (
              <button
                onClick={handleClearHistory}
                aria-label="Clear conversation"
                title="Clear conversation history"
                className="text-white hover:text-red-200 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => { abortRef.current?.abort(); onClose(); }}
              aria-label="Close chat"
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="h-80 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-3" role="log" aria-live="polite">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] p-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.sender === 'user'
                    ? 'bg-green-600 text-white rounded-br-none'
                    : msg.error
                    ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-none'
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                }`}
              >
                {msg.error && <AlertCircle className="w-4 h-4 inline mr-1" aria-hidden="true" />}
                {msg.text}
                {msg.streaming && (
                  <span className="inline-block w-1.5 h-4 bg-green-500 ml-0.5 animate-pulse align-middle" />
                )}
              </div>
            </div>
          ))}
          {isTyping && messages[messages.length - 1]?.streaming === false && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-xl rounded-bl-none p-3 shadow-sm">
                <div className="flex gap-1 items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce [animation-delay:0.1s]" />
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-3 border-t border-gray-200 flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.chatPlaceholder || 'Ask about WAEC, JAMB, NECO...'}
            aria-label="Message input"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            disabled={isTyping}
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            aria-label="Send message"
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIChat;
