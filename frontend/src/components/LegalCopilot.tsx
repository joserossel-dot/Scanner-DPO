import React, { useState, useRef, useEffect } from 'react';
import { Briefcase, Send, X, Bot, User, RefreshCw } from 'lucide-react';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

interface LegalCopilotProps {
  token: string | null;
}

const API_BASE = (import.meta as any).env.VITE_API_URL || '';

export default function LegalCopilot({ token }: LegalCopilotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: '¡Hola! Soy el DPO Copilot, su asistente legal virtual sobre la Ley N° 21.719. ¿Tiene alguna consulta sobre multas, plazos, derechos ARCO+ o medidas de ciberseguridad?',
      timestamp: new Date()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userQuery = inputText.trim();
    setInputText('');
    
    // Add user message to state
    setMessages(prev => [...prev, {
      sender: 'user',
      text: userQuery,
      timestamp: new Date()
    }]);

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/ai/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ prompt: userQuery })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, {
          sender: 'ai',
          text: data.response,
          timestamp: new Date()
        }]);
      } else {
        setMessages(prev => [...prev, {
          sender: 'ai',
          text: 'Disculpe, he experimentado dificultades técnicas para conectar con mi motor legal. Inténtelo en un momento.',
          timestamp: new Date()
        }]);
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: 'Error de red. Asegúrese de contar con conexión al servidor de ciberseguridad.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      
      {/* Floating Action Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-2xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 border border-indigo-500/20"
          title="Consultar al Asistente DPO Copilot"
        >
          <Briefcase size={22} className="animate-pulse" />
        </button>
      )}

      {/* Floating Chat Window Panel */}
      {isOpen && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl w-[350px] sm:w-[380px] h-[480px] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="bg-slate-950 p-4 border-b border-slate-850 flex justify-between items-center text-left">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-900/30 flex items-center justify-center">
                <Bot size={18} />
              </div>
              <div>
                <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">DPO Copilot</h4>
                <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  Asistente Ley 21.719 Activo
                </span>
              </div>
            </div>
            
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 bg-slate-850 hover:bg-slate-850 text-slate-400 hover:text-white rounded"
            >
              <X size={15} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/20">
            {messages.map((msg, index) => {
              const isAi = msg.sender === 'ai';
              return (
                <div 
                  key={index}
                  className={`flex gap-2.5 max-w-[85%] ${isAi ? 'mr-auto text-left' : 'ml-auto flex-row-reverse text-right'}`}
                >
                  <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs mt-1 ${isAi ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/30' : 'bg-slate-800 text-slate-200'}`}>
                    {isAi ? <Bot size={12} /> : <User size={12} />}
                  </div>
                  
                  <div className="space-y-1">
                    <div className={`p-3 rounded-2xl text-xs leading-relaxed text-justify ${isAi ? 'bg-slate-900 text-slate-300 rounded-tl-none border border-slate-850' : 'bg-indigo-650 text-white rounded-tr-none'}`}>
                      {msg.text}
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono px-1">
                      {msg.timestamp.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {isLoading && (
              <div className="flex gap-2.5 max-w-[80%] mr-auto text-left">
                <div className="w-6 h-6 rounded-full flex-shrink-0 bg-indigo-950 text-indigo-400 border border-indigo-900/30 flex items-center justify-center animate-spin">
                  <RefreshCw size={12} />
                </div>
                <div className="p-3 bg-slate-900 text-slate-400 rounded-2xl rounded-tl-none border border-slate-850 text-xs italic">
                  Analizando jurisprudencia...
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Form Input Submit Footer */}
          <form 
            onSubmit={handleSendMessage}
            className="p-3 bg-slate-950 border-t border-slate-850 flex gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Escriba su consulta legal..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-650 focus:outline-none focus:border-indigo-500/50"
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="p-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl transition-all shadow-md disabled:bg-slate-800"
            >
              <Send size={14} />
            </button>
          </form>

        </div>
      )}
    </div>
  );
}
