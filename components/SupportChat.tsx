import React, { useState, useRef, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Form';
import { generateSupportChatReply } from '../services/geminiService';
import { BotIcon, XIcon, MessageSquareIcon, SparklesIcon } from './Icons';

export const SupportChat: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{role: 'user' | 'bot', text: string}[]>([
        { role: 'bot', text: "Hi! I'm your Social Media Agent guide. Ask me anything about how to use this app!" }
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

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim()) return;

        const userMsg = inputValue;
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setInputValue('');
        setIsLoading(true);

        try {
            const reply = await generateSupportChatReply(userMsg);
            setMessages(prev => [...prev, { role: 'bot', text: reply }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I'm having trouble connecting right now." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {isOpen && (
                <Card className="w-80 md:w-96 h-[500px] bg-white shadow-2xl border border-slate-200 flex flex-col mb-4 animate-fade-in-up">
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
                        <div className="flex items-center gap-2">
                            <div className="bg-indigo-100 p-1.5 rounded-lg">
                                <BotIcon className="w-5 h-5 text-indigo-600" />
                            </div>
                            <h3 className="font-bold text-slate-900">App Support</h3>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50 relative">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                                    msg.role === 'user' 
                                    ? 'bg-indigo-600 text-white' 
                                    : 'bg-white text-slate-800 shadow-sm border border-slate-100'
                                }`}>
                                    {msg.text}
                                </div>
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
                        
                        {/* "Ask Anything" Prompt when idle/empty or after some messages */}
                        {!isLoading && messages.length > 0 && (
                            <div className="flex justify-center mt-4 mb-2">
                                <span className="text-xs text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 animate-pulse shadow-sm">
                                    Ask Anything...
                                </span>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-slate-50 rounded-b-xl flex gap-2">
                        <input 
                            type="text" 
                            value={inputValue} 
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="How do I add products?"
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
            )}

            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-4 rounded-full shadow-lg transition-all hover:scale-105 flex items-center justify-center"
            >
                {isOpen ? <XIcon className="w-6 h-6" /> : <MessageSquareIcon className="w-6 h-6" />}
            </button>
        </div>
    );
};
