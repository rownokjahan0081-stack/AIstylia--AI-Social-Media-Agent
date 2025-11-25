import React, { useState, useRef, useEffect } from 'react';
import { Card } from './ui/Card';
import { generateReply } from '../services/geminiService';
import { BotIcon, XIcon, SparklesIcon } from './Icons';
import { UserSettings } from '../types';

interface ChatbotSimulatorProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    settings: UserSettings;
}

interface SimulatorMessage {
    role: 'user' | 'bot';
    text: string;
    category?: string;
}

export const ChatbotSimulator: React.FC<ChatbotSimulatorProps> = ({ isOpen, setIsOpen, settings }) => {
    const [messages, setMessages] = useState<SimulatorMessage[]>([
        { role: 'bot', text: `Hi! I'm a simulation of your AI Agent for ${settings.businessName}. Send a message as a customer to see how I'd reply.` }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);
    
    // Reset messages when opening
    useEffect(() => {
        if(isOpen) {
            setMessages([
                { role: 'bot', text: `Hi! I'm a simulation of your AI Agent for ${settings.businessName}. Send a message as a customer to see how I'd reply.` }
            ]);
        }
    }, [isOpen, settings.businessName]);


    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const userMsg = inputValue;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInputValue('');
        setIsLoading(true);

        try {
            const result = await generateReply(userMsg, 'Message', settings);
            const replyText = result.replyText || "Action: No reply generated (e.g., spam or auto-confirm is off for an order). Notifying owner.";
            
            setMessages(prev => [...prev, { role: 'bot', text: replyText, category: result.category }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I encountered an error trying to generate a reply." }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const getCategoryBadgeStyle = (category: string) => {
      const cat = category.toLowerCase();
      if (['interested_in_buying', 'ask_price', 'discount_offer_query'].includes(cat)) return 'bg-blue-100 border-blue-200 text-blue-700';
      if (['product_query', 'track_order', 'cancel_order', 'refund_request', 'complaint', 'ask_question', 'request_collab', 'report_abuse'].includes(cat)) return 'bg-purple-100 border-purple-200 text-purple-700';
      if (['greeting', 'thanks', 'praise', 'tag_friend', 'marketing_gen_z_engage'].includes(cat)) return 'bg-emerald-100 border-emerald-200 text-emerald-700';
      if (['spam_promo'].includes(cat)) return 'bg-red-100 border-red-200 text-red-700';
      return 'bg-amber-100 border-amber-200 text-amber-700';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast p-4">
            <Card className="w-full max-w-lg h-[70vh] bg-white shadow-2xl border border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <div className="flex items-center gap-2">
                        <div className="bg-violet-100 p-1.5 rounded-lg">
                            <BotIcon className="w-5 h-5 text-violet-600" />
                        </div>
                        <h3 className="font-bold text-slate-900">Inbox Chat Simulator</h3>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50 relative">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                                msg.role === 'user' 
                                ? 'bg-indigo-600 text-white' 
                                : 'bg-white text-slate-800 shadow-sm border border-slate-100'
                            }`}>
                                {msg.text}
                            </div>
                            {msg.role === 'bot' && msg.category && (
                                <div className={`mt-1.5 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getCategoryBadgeStyle(msg.category)}`}>
                                    {msg.category.replace(/_/g, ' ')}
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white shadow-sm border border-slate-100 rounded-lg p-3 flex gap-1">
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-slate-50 rounded-b-xl flex gap-2">
                    <input 
                        type="text" 
                        value={inputValue} 
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type a customer message..."
                        className="flex-1 bg-white border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none placeholder:text-slate-400"
                    />
                    <button 
                        type="submit"
                        disabled={isLoading || !inputValue.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-md transition-colors disabled:opacity-50"
                    >
                        <SparklesIcon className="w-4 h-4" />
                    </button>
                </form>
            </Card>
        </div>
    );
};
