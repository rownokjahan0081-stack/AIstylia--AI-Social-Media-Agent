import React, { useState, useEffect, ChangeEvent } from 'react';
import { InboxItem, InboxItemType, UserSettings, Connection, Platform, Page, Product } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { generateReply, ReplyResponse } from '../services/geminiService';
import { MessageSquareIcon, StarIcon, ThumbsUpIcon, FacebookIcon, InstagramIcon, WhatsAppIcon, LinkIcon, CheckCircleIcon, BotIcon, ArrowLeftIcon, SettingsIcon, XIcon, AlertTriangleIcon, BookOpenIcon } from './Icons';
import { Input, Checkbox } from './ui/Form';

const createMockItem = (id: number, connections: Connection[], settings: UserSettings): InboxItem | null => {
    if (connections.length === 0) return null;
    
    const randomConnection = connections[id % connections.length];
    
    let type = InboxItemType.Message;
    let content = "";
    let sender = `User ${id}`;
    
    const product = settings.productCatalog && settings.productCatalog.length > 0 
        ? settings.productCatalog[0].name 
        : "Signature Blend";
    
    const scenario = id % 19;
    
    switch(scenario) {
        case 0: sender = "Alice"; content = "Hi there! Hope you're having a great day."; type = InboxItemType.Message; break;
        case 1: sender = "Bob"; content = "Thanks for the quick delivery! Really appreciate it."; type = InboxItemType.Comment; break;
        case 2: sender = "Charlie"; content = `How much is the ${product}? I couldn't find it on the site.`; type = InboxItemType.Message; break;
        case 3: sender = "David"; content = "Is your coffee ethically sourced and fair trade?"; type = InboxItemType.Message; break;
        case 4: sender = "Eve"; content = "I haven't received my tracking number yet. Order #9921."; type = InboxItemType.Message; break;
        case 5: sender = "Frank"; content = "Can I cancel my order #1234? I ordered the wrong size."; type = InboxItemType.Message; break;
        case 6: sender = "Grace"; content = "The item arrived broken. I'd like a refund please."; type = InboxItemType.Message; break;
        case 7: sender = "Karen"; content = "The service was incredibly slow yesterday. Not happy."; type = InboxItemType.Review; break;
        case 8: sender = "Liam"; content = `I want to buy 2 ${product}s. Sending to 123 Main St, New York.`; type = InboxItemType.Message; break;
        case 9: sender = "Mona"; content = "Do you have any promo codes available right now?"; type = InboxItemType.Message; break;
        case 10: sender = "Noah"; content = "Do you guys have a physical location or just online?"; type = InboxItemType.Comment; break;
        case 11: sender = "Olivia"; content = `Omg the ${product} is LITERALLY the best thing I've ever tasted! 💜`; type = InboxItemType.Review; break;
        case 12: sender = "Peter"; content = "The packaging was a bit excessive. Maybe use less plastic?"; type = InboxItemType.Comment; break;
        case 13: sender = "Quinn"; content = "Are you hiring baristas at the moment?"; type = InboxItemType.Message; break;
        case 14: sender = "Crypto King"; content = "Invest in DogeCoin now! 🚀 100x returns guaranteed! Link in bio."; type = InboxItemType.Comment; break;
        case 15: sender = "Rachel"; content = "@Monica look at this! We need to go here."; type = InboxItemType.Comment; break;
        case 16: sender = "Ivy"; content = "Hey! I love your brand. Interested in a collab? DM me!"; type = InboxItemType.Message; break;
        case 17: sender = "Tom"; content = "Someone in the comments is posting phishing links. Just letting you know."; type = InboxItemType.Message; break;
        case 18: sender = "Zendaya Fan"; content = "This vibe is impeccable no cap fr fr 🔥"; type = InboxItemType.Comment; break;
        default: sender = "User"; content = "Hello"; break;
    }

    return { id, type, sender, avatar: `https://i.pravatar.cc/150?img=${(id * 5) + 1}`, content, platform: randomConnection.platform, connectionId: randomConnection.id, timestamp: `${Math.floor(Math.random() * 50) + 5}m ago`, replied: false };
};

const PlatformIcon = ({ platform }: { platform: Platform }) => {
  switch (platform) {
    case 'Facebook': return <FacebookIcon className="w-4 h-4 text-blue-600" />;
    case 'Instagram': return <InstagramIcon className="w-4 h-4 text-pink-600" />;
    case 'WhatsApp': return <WhatsAppIcon className="w-4 h-4 text-emerald-500" />;
    default: return null;
  }
};

interface InboxProps {
    settings: UserSettings;
    setSettings: React.Dispatch<React.SetStateAction<UserSettings | null>>;
    connections: Connection[];
    setActivePage: (page: Page) => void;
    isGuest: boolean;
}

export const Inbox: React.FC<InboxProps> = ({ settings, setSettings, connections, setActivePage, isGuest }) => {
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const [generatedReply, setGeneratedReply] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ReplyResponse | null>(null);
  const [showOrderConfig, setShowOrderConfig] = useState(false);
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, quantity: 100 });
  const [emailToast, setEmailToast] = useState<{visible: boolean, message: string, subtext: string}>({ visible: false, message: '', subtext: '' });

  const getConnectionName = (id: string) => connections.find(c => c.id === id)?.name || 'Unknown Account';

  useEffect(() => {
    if (connections.length > 0 && inboxItems.length === 0) {
        const newItems = Array.from({ length: 19 }, (_, i) => createMockItem(i, connections, settings)).filter(Boolean) as InboxItem[];
        setInboxItems(newItems);
        // For guests, automatically select the first item to kick off the single-item demo
        if (isGuest && !selectedItem && newItems.length > 0) {
            setSelectedItem(newItems[0]);
        }
    }
  }, [isGuest, connections, inboxItems.length, settings]);
  
  const handleTeachAI = () => {
    if (!selectedItem || !generatedReply) return;

    const newGuideline = `When a user's message is similar to "${selectedItem.content}", reply with: "${generatedReply}"`;
    
    const newSettings: UserSettings = { 
        ...settings, 
        replyGuidelines: [...(settings.replyGuidelines || []), newGuideline] 
    };

    setSettings(newSettings);
    localStorage.setItem('social-agent-settings', JSON.stringify(newSettings));
    setLocalSettings(newSettings);
    
    setEmailToast({ visible: true, message: 'Guideline Saved', subtext: 'The AI will remember this for future replies.' });
    setTimeout(() => setEmailToast({ visible: false, message: '', subtext: '' }), 4000);
  };
  
  const handleGenerateReply = async () => {
    if (!selectedItem || selectedItem.replied) return;
    setIsLoading(true);
    setGeneratedReply('');
    setAnalysisResult(null);
    const result = await generateReply(selectedItem.content, selectedItem.type, settings);
    setAnalysisResult(result);
    if (result.replyText) setGeneratedReply(result.replyText);
    setIsLoading(false);
  };
  
  useEffect(() => {
    if (selectedItem) {
      handleGenerateReply();
    }
  }, [selectedItem]);

  useEffect(() => {
    // This effect handles auto-sending if enabled
    if (generatedReply && settings.autoReply && !isSent && !isLoading && analysisResult?.replyText) {
      const timer = setTimeout(() => {
        handleSendReply(analysisResult);
      }, 2000); // 2 second delay for user to see the reply
      return () => clearTimeout(timer);
    }
  }, [generatedReply, settings.autoReply, isSent, isLoading, analysisResult]);

  const handleSendReply = (currentAnalysis: ReplyResponse | null = analysisResult) => {
    setIsSent(true);
    
    if (currentAnalysis?.action === 'EMAIL_OWNER') {
        const emailTarget = settings.orderConfirmationEmail || "your registered email";
        let title = "Email Notification Sent";
        let desc = currentAnalysis.internalNote || `Details sent to ${emailTarget}.`;
        if(currentAnalysis.orderCode) title = "Order Confirmed";
        setEmailToast({ visible: true, message: title, subtext: desc });
        setTimeout(() => setEmailToast({ visible: false, message: '', subtext: '' }), 4000);
    }

    if (currentAnalysis?.soldItems?.length) {
        const updatedCatalog = settings.productCatalog.map(p => {
            const soldItem = currentAnalysis.soldItems?.find(i => i.productId === p.id || i.productId.toLowerCase() === p.name.toLowerCase());
            return soldItem ? { ...p, quantity: Math.max(0, p.quantity - soldItem.quantity) } : p;
        });
        const newSettings = { ...settings, productCatalog: updatedCatalog };
        setSettings(newSettings);
        localStorage.setItem('social-agent-settings', JSON.stringify(newSettings));
        setLocalSettings(newSettings);
    }

    const replyTextToSave = currentAnalysis?.replyText || 'Action: Emailed Business Owner';

    setTimeout(() => {
        const updatedItems = inboxItems.map(item => item.id === selectedItem?.id ? { ...item, replied: true, lastReply: replyTextToSave } : item);
        setInboxItems(updatedItems);
        if (selectedItem) setSelectedItem({ ...selectedItem, replied: true, lastReply: replyTextToSave });
        setGeneratedReply('');
        setAnalysisResult(null);
        setIsSent(false);
    }, 1500);
  }

  const getCategoryBadgeStyle = (category: string) => {
    const cat = category.toLowerCase();
    if (['interested_in_buying', 'ask_price', 'discount_offer_query'].includes(cat)) return 'bg-blue-100 border-blue-200 text-blue-700';
    if (['product_query', 'track_order', 'cancel_order', 'refund_request', 'complaint', 'ask_question', 'request_collab', 'report_abuse'].includes(cat)) return 'bg-purple-100 border-purple-200 text-purple-700';
    if (['greeting', 'thanks', 'praise', 'tag_friend', 'marketing_gen_z_engage'].includes(cat)) return 'bg-emerald-100 border-emerald-200 text-emerald-700';
    if (['spam_promo'].includes(cat)) return 'bg-red-100 border-red-200 text-red-700';
    return 'bg-amber-100 border-amber-200 text-amber-700';
  };

  const handleAddProduct = () => {
    if(newProduct.name && newProduct.price) {
        const product: Product = { id: Date.now().toString(), name: newProduct.name, price: Number(newProduct.price), quantity: Number(newProduct.quantity) };
        const updatedCatalog = [...(localSettings.productCatalog || []), product];
        setLocalSettings({...localSettings, productCatalog: updatedCatalog});
        setNewProduct({ name: '', price: 0, quantity: 100 });
    }
}

  const handleRemoveProduct = (id: string) => {
      const updatedCatalog = localSettings.productCatalog.filter(p => p.id !== id);
      setLocalSettings({...localSettings, productCatalog: updatedCatalog});
  }

  const saveOrderSettings = () => {
      setSettings(localSettings);
      localStorage.setItem('social-agent-settings', JSON.stringify(localSettings));
      setShowOrderConfig(false);
  }
  
  if (connections.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 animate-fade-in">
            <LinkIcon className="w-16 h-16 text-slate-300 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">No Accounts Connected</h2>
            <p className="mb-6 max-w-md text-slate-500">Connect your Facebook, Instagram, or WhatsApp account to start managing messages from one place.</p>
            <Button onClick={() => setActivePage('connections')}>
                <LinkIcon className="w-4 h-4 mr-2" />
                Connect Account
            </Button>
        </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)] md:h-full gap-6 animate-fade-in relative">
        
      {emailToast.visible && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center animate-fade-in w-max max-w-[90vw]">
              <CheckCircleIcon className="w-5 h-5 mr-3 flex-shrink-0" />
              <div>
                  <p className="font-bold">{emailToast.message}</p>
                  <p className="text-xs opacity-90">{emailToast.subtext}</p>
              </div>
          </div>
      )}

      <div className={`w-full md:w-1/3 flex-shrink-0 flex flex-col h-full ${selectedItem ? 'hidden md:flex' : 'flex'}`}>
        <Card className="h-full flex flex-col">
          <Card.Header className="flex-shrink-0 flex justify-between items-center border-b border-slate-100">
            <Card.Title>Inbox</Card.Title>
            <button onClick={() => { setLocalSettings(settings); setShowOrderConfig(true); }} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500" title="Configure Order Automation"><SettingsIcon className="w-4 h-4" /></button>
          </Card.Header>
          <Card.Content className="p-0 flex-1 overflow-y-auto">
            {inboxItems.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                {inboxItems.map(item => (
                    <li key={item.id}>
                    <button onClick={() => setSelectedItem(item)} className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${selectedItem?.id === item.id ? 'bg-indigo-50' : ''}`}>
                        <div className="flex items-center gap-3">
                        <div className="relative">
                            <img src={item.avatar} alt={item.sender} className="w-10 h-10 rounded-full flex-shrink-0" />
                            {item.replied && (<div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm"><CheckCircleIcon className="w-4 h-4 text-emerald-500" /></div>)}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <div className="flex justify-between items-start">
                            <span className={`font-semibold ${item.replied ? 'text-slate-500' : 'text-slate-900'}`}>{item.sender}</span>
                            <span className="text-xs text-slate-400 flex-shrink-0 ml-2">{item.timestamp}</span>
                            </div>
                            <p className={`text-sm truncate ${item.replied ? 'text-slate-500' : 'text-slate-600'}`}>{item.content}</p>
                            <div className="flex items-center gap-2 mt-1">
                            <PlatformIcon platform={item.platform} />
                            <span className="text-xs text-slate-400 font-medium truncate">{getConnectionName(item.connectionId)}</span>
                            </div>
                        </div>
                        </div>
                    </button>
                    </li>
                ))}
                </ul>
            ) : (<div className="p-6 text-center text-slate-400"><p>Your inbox is empty.</p></div>)}
          </Card.Content>
        </Card>
      </div>

      <div className={`w-full md:w-2/3 h-full ${!selectedItem ? 'hidden md:block' : 'block'}`}>
        {selectedItem ? (
          <Card className="h-full flex flex-col">
            <Card.Header className="flex flex-row items-center gap-2 border-b border-slate-100 pb-4">
              <button onClick={() => setSelectedItem(null)} className="md:hidden p-1 -ml-2 text-slate-400 hover:text-slate-600"><ArrowLeftIcon className="w-6 h-6" /></button>
              <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Card.Title>Conversation with {selectedItem.sender}</Card.Title>
                    {analysisResult && (<span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border truncate max-w-[200px] inline-block ${getCategoryBadgeStyle(analysisResult.category)}`}>{analysisResult.category.replace(/_/g, ' ')}</span>)}
                  </div>
                  <p className="text-sm text-slate-500">on {getConnectionName(selectedItem.connectionId)} ({selectedItem.platform})</p>
              </div>
            </Card.Header>
            <Card.Content className="flex-1 flex flex-col gap-4 overflow-y-auto pt-4">
              <div className="p-4 rounded-lg bg-slate-100"><p className="text-slate-800">{selectedItem.content}</p><div className="text-xs text-slate-500 mt-2">from {selectedItem.platform} - {selectedItem.timestamp}</div></div>
              {selectedItem.replied && selectedItem.lastReply && (<div className="ml-8 p-4 rounded-lg bg-emerald-50 border border-emerald-100"><div className="flex items-center gap-2 mb-2"><BotIcon className="w-4 h-4 text-emerald-600" /><span className="text-xs font-bold text-emerald-700">AI Agent Log</span></div><p className="text-slate-700">{selectedItem.lastReply}</p></div>)}
              {!selectedItem.replied && (
                  <div className="mt-auto pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-slate-900">AI Agent Reply</h3>
                        {analysisResult?.action === 'EMAIL_OWNER' && (<span className="flex items-center text-xs font-bold text-amber-600"><AlertTriangleIcon className="w-3 h-3 mr-1" />Email Notification Triggered</span>)}
                    </div>
                    {isLoading && <p className="text-slate-500 animate-pulse">Analyzing...</p>}
                    {!isLoading && (
                      <div className="p-4 rounded-lg bg-white border border-indigo-200 shadow-sm relative group">
                        {analysisResult?.orderCode && (<div className="absolute top-2 right-2 bg-slate-100 text-xs text-slate-600 px-2 py-1 rounded font-mono">Code: {analysisResult.orderCode}</div>)}
                        {generatedReply ? (
                            <>
                                <div className="flex justify-between items-center mb-2"><h4 className="font-semibold text-indigo-600 text-xs uppercase tracking-wider">Proposed Reply:</h4><button onClick={handleTeachAI} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors" title="Save as guideline"><BookOpenIcon className="w-3 h-3" />Teach AI</button></div>
                                <textarea rows={5} value={generatedReply} onChange={(e) => setGeneratedReply(e.target.value)} className="w-full bg-transparent text-slate-700 resize-none focus:outline-none" readOnly={settings.autoReply || isSent} />
                            </>
                        ) : (<div className="text-center py-4 text-slate-400 italic"><p>No chat reply generated.</p><p className="text-sm text-emerald-600 mt-1">Action: {analysisResult?.internalNote || "Emailing Business Owner"}</p></div>)}
                      </div>
                    )}
                    <div className="mt-4">
                        {!settings.autoReply && (<Button onClick={() => handleSendReply()} disabled={isLoading || isSent || (!generatedReply && analysisResult?.action === 'NONE')} className="w-full md:w-auto">{isSent ? 'Processed!' : (generatedReply ? 'Send Reply' : 'Confirm Action')}</Button>)}
                        {settings.autoReply && !isLoading && (<div className="flex items-center justify-center md:justify-start text-sm text-emerald-600 h-10 px-4 rounded-md bg-emerald-50">{isSent ? <><CheckCircleIcon className="w-4 h-4 mr-2" /><span>Processed</span></> : <><BotIcon className="w-4 h-4 mr-2 animate-pulse" /><span>Processing...</span></>}</div>)}
                    </div>
                  </div>
              )}
              {selectedItem.replied && (<div className="mt-auto pt-4 text-center text-slate-500 text-sm"><p>This conversation has been marked as processed.</p></div>)}
            </Card.Content>
          </Card>
        ) : (<div className="flex items-center justify-center h-full text-slate-400"><p>Select an item to view details.</p></div>)}
      </div>

      {showOrderConfig && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast">
              <Card className="w-full max-w-lg flex flex-col max-h-[90vh]">
                  <div className="p-6 flex justify-between items-start border-b border-slate-100">
                      <div><h2 className="text-xl font-bold text-slate-900">Order Automation Settings</h2><p className="text-sm text-slate-500">Configure how the AI handles sales.</p></div>
                      <button onClick={() => setShowOrderConfig(false)} className="text-slate-400 hover:text-slate-600"><XIcon className="w-6 h-6" /></button>
                  </div>
                  <div className="p-6 overflow-y-auto custom-scrollbar">
                      <div className="mb-6"><Checkbox label="Enable Auto-Confirm Orders" description="If enabled, the AI will calculate totals and confirm orders based on your catalog." checked={localSettings.autoConfirmOrders || false} onChange={(e) => setLocalSettings({...localSettings, autoConfirmOrders: e.target.checked})} /><p className="text-xs text-slate-500 mt-2 italic">If disabled, order requests are forwarded to your email.</p></div>
                      {localSettings.autoConfirmOrders && (
                          <div className="animate-fade-in">
                              <div className="mb-6"><Input label="Order Confirmation Email" type="email" placeholder="orders@yourbusiness.com" value={localSettings.orderConfirmationEmail || ''} onChange={(e: ChangeEvent<HTMLInputElement>) => setLocalSettings({...localSettings, orderConfirmationEmail: e.target.value})} description="The AI will send order details to this address." /></div>
                              <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">Product Catalog</h3>
                              <div className="space-y-3 mb-4">{localSettings.productCatalog?.map(p => (<div key={p.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-md border border-slate-200"><div><p className="font-medium text-slate-900">{p.name}</p><p className="text-xs text-slate-500">${p.price} • Qty: {p.quantity}</p></div><button onClick={() => handleRemoveProduct(p.id)} className="text-red-500 hover:text-red-600 text-xs">Remove</button></div>))}{!localSettings.productCatalog?.length && (<p className="text-center text-slate-500 text-sm py-2">No products added.</p>)}</div>
                              <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                                  <h4 className="text-xs font-bold text-slate-500 mb-3">Add New Product</h4>
                                  <div className="space-y-3"><Input label="Product Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="e.g. House Blend Coffee" /><div className="flex gap-3"><Input label="Price ($)" type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} /><Input label="Stock Qty" type="number" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: Number(e.target.value)})} /></div><Button onClick={handleAddProduct} disabled={!newProduct.name || !newProduct.price} className="w-full bg-white !text-black border border-slate-300 hover:bg-slate-50 h-9" style={{ color: 'black' }}>Add to Catalog</Button></div>
                              </div>
                          </div>
                      )}
                  </div>
                  <div className="p-6 pt-0 flex justify-end"><Button onClick={saveOrderSettings} className="bg-emerald-600 hover:bg-emerald-700 w-full">Save Configuration</Button></div>
              </Card>
          </div>
      )}

    </div>
  );
};