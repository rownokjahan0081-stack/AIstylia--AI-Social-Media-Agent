
import React, { useState, useEffect } from 'react';
import { InboxItem, InboxItemType, UserSettings, Connection, Platform, Page, Product } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { generateReply, ReplyResponse } from '../services/geminiService';
import { MessageSquareIcon, StarIcon, ThumbsUpIcon, FacebookIcon, InstagramIcon, LinkIcon, CheckCircleIcon, BotIcon, ArrowLeftIcon, SettingsIcon, XIcon, AlertTriangleIcon, BookOpenIcon } from './Icons';
import { Input, Checkbox } from './ui/Form';

const createMockItem = (id: number, connections: Connection[], settings: UserSettings): InboxItem | null => {
    if (connections.length === 0) return null;
    
    const randomConnection = connections[id % connections.length];
    
    let type = InboxItemType.Message;
    let content = "";
    let sender = `User ${id}`;
    
    // Determine a product to reference if available, otherwise generic
    const product = settings.productCatalog && settings.productCatalog.length > 0 
        ? settings.productCatalog[0].name 
        : "coffee";
    
    const businessName = settings.businessName || "the shop";
    
    // Use modulo to cycle through specific scenarios based on ID
    // We want to cover: 
    // 1. Inquiry (Relevant)
    // 2. Inquiry (Irrelevant/Missing Info)
    // 3. Order (Complete with address)
    // 4. Order (Incomplete - Missing address)
    // 5. Compliment (Positive)
    // 6. Compliment (Negative/Hate)
    // 7. General Inquiry
    
    const scenario = id % 7;
    
    switch(scenario) {
        case 0: // Order (Complete)
            type = InboxItemType.Message;
            sender = "Sarah Connor";
            content = `Hi! I'd like to order 2 ${product}. My address is 123 Skynet Ave, LA. Can you confirm?`;
            break;
        case 1: // Order (Incomplete)
            type = InboxItemType.Message;
            sender = "John Wick";
            content = `I need a ${product} ASAP.`;
            break;
        case 2: // Compliment (Positive)
            type = InboxItemType.Comment;
            sender = "Mike Ross";
            content = `This ${product} is amazing! 😍 Best in town.`;
            break;
        case 3: // Compliment (Negative)
            type = InboxItemType.Review;
            sender = "Gordon Ramsay";
            content = `The service was terrible and the ${product} was raw. 1 star.`;
            break;
        case 4: // Inquiry (Relevant)
            type = InboxItemType.Message;
            sender = "Jessica Pearson";
            content = `What are your opening hours for ${businessName}?`;
            break;
        case 5: // Inquiry (Irrelevant / Missing Info)
            type = InboxItemType.Message;
            sender = "Peter Parker";
            content = "Do you sell spider-web fluid?";
            break;
        default: // General
            type = InboxItemType.Comment;
            sender = "Tony Stark";
            content = `Love the vibe at ${businessName}!`;
            break;
    }

    return {
      id,
      type,
      sender,
      avatar: `https://i.pravatar.cc/150?img=${(id * 5) + 10}`,
      content,
      platform: randomConnection.platform,
      connectionId: randomConnection.id,
      timestamp: `${Math.floor(Math.random() * 50) + 5}m ago`,
      replied: false,
    };
};

const PlatformIcon = ({ platform }: { platform: Platform }) => {
  switch (platform) {
    case 'Facebook': return <FacebookIcon className="w-4 h-4 text-blue-600" />;
    case 'Instagram': return <InstagramIcon className="w-4 h-4 text-pink-600" />;
  }
};

const ItemTypeIcon = ({ type }: { type: InboxItemType }) => {
    switch (type) {
        case InboxItemType.Message: return <MessageSquareIcon className="w-4 h-4 text-slate-500" />;
        case InboxItemType.Comment: return <ThumbsUpIcon className="w-4 h-4 text-slate-500" />;
        case InboxItemType.Review: return <StarIcon className="w-4 h-4 text-slate-500" />;
    }
};

interface InboxProps {
    settings: UserSettings;
    setSettings: React.Dispatch<React.SetStateAction<UserSettings | null>>;
    connections: Connection[];
    setActivePage: (page: Page) => void;
}

export const Inbox: React.FC<InboxProps> = ({ settings, setSettings, connections, setActivePage }) => {
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const [generatedReply, setGeneratedReply] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ReplyResponse | null>(null);
  
  // Order Config Modal State
  const [showOrderConfig, setShowOrderConfig] = useState(false);
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, quantity: 100 });
  
  // Toast State
  const [emailToast, setEmailToast] = useState<{visible: boolean, message: string, subtext: string}>({
      visible: false, message: '', subtext: ''
  });

  const getConnectionName = (id: string) => connections.find(c => c.id === id)?.name || 'Unknown Account';

  const handleGenerateReply = async () => {
    if (!selectedItem) return;
    if (selectedItem.replied) return; // Don't regenerate if already replied
    
    setIsLoading(true);
    setGeneratedReply('');
    setAnalysisResult(null);
    
    // Use updated settings from local storage if available, otherwise props
    const currentSettings = JSON.parse(localStorage.getItem('social-agent-settings') || JSON.stringify(settings));
    
    const result = await generateReply(selectedItem.content, selectedItem.type, currentSettings);
    
    setAnalysisResult(result);
    
    if (result.replyText) {
        setGeneratedReply(result.replyText);
    }
    
    // If the action is EMAIL_OWNER and there is NO reply text (e.g. auto-confirm disabled),
    // we simulate the "Reply" action immediately as an internal process
    if (result.action === 'EMAIL_OWNER' && !result.replyText && settings.autoReply) {
        setTimeout(() => {
             handleSendReply(result);
        }, 1000);
    }

    setIsLoading(false);
  };
  
  useEffect(() => {
    if (selectedItem) {
      handleGenerateReply();
    }
  }, [selectedItem]);

  useEffect(() => {
    // Auto-send only if there IS a reply text generated
    if (generatedReply && settings.autoReply && !isSent && !isLoading && analysisResult?.replyText) {
      const timer = setTimeout(() => {
        handleSendReply(analysisResult);
      }, 2000); // 2 second delay for user to see the reply
      return () => clearTimeout(timer);
    }
  }, [generatedReply, settings.autoReply, isSent, isLoading, analysisResult]);

  // Automatically load messages when connections are available
  useEffect(() => {
      if (connections.length > 0 && inboxItems.length === 0) {
          // Generate 7 items to cover all scenarios
          const newItems = Array.from({ length: 7 }, (_, i) => createMockItem(i, connections, settings)).filter(Boolean) as InboxItem[];
          setInboxItems(newItems);
          if (!selectedItem && newItems.length > 0 && window.innerWidth >= 768) {
            setSelectedItem(newItems[0]);
          }
      }
  }, [connections, inboxItems.length, settings]);

  const handleSelectItem = (item: InboxItem) => {
    setSelectedItem(item);
    setGeneratedReply('');
    setAnalysisResult(null);
    setIsSent(false);
  }

  const handleTeachAI = () => {
      if (!selectedItem || !generatedReply) return;
      
      const newGuideline = `When user asks about "${selectedItem.content.substring(0, 50)}${selectedItem.content.length > 50 ? '...' : ''}", prefer replying with this style: "${generatedReply}"`;
      
      const updatedGuidelines = [...(settings.replyGuidelines || []), newGuideline];
      
      const updatedSettings = { ...settings, replyGuidelines: updatedGuidelines };
      setSettings(updatedSettings);
      localStorage.setItem('social-agent-settings', JSON.stringify(updatedSettings));

      setEmailToast({ 
          visible: true, 
          message: "Agent Learned!", 
          subtext: "This reply style will be used for future messages." 
      });
      setTimeout(() => setEmailToast({ visible: false, message: '', subtext: '' }), 3000);
  };

  const handleSendReply = (currentAnalysis: ReplyResponse | null = analysisResult) => {
    // Simulate sending
    setIsSent(true);
    
    const actionType = currentAnalysis?.action;
    const orderCode = currentAnalysis?.orderCode;
    const internalNote = currentAnalysis?.internalNote;
    
    if (actionType === 'EMAIL_OWNER') {
        let title = "Email Notification Sent";
        let desc = internalNote || "Details forwarded to business owner.";
        
        if (orderCode) {
            title = "Order Processed & Emailed";
            desc = `Order ${orderCode} confirmed and emailed to owner.`;
        } else if (currentAnalysis?.category === 'INQUIRY' && !currentAnalysis.replyText) {
             // Case: Missing information
             title = "Inquiry Forwarded";
             desc = "Missing information request emailed to owner.";
        } else if (currentAnalysis?.category === 'ORDER' && !currentAnalysis.replyText) {
            // Case: Auto-confirm disabled
            title = "Order Request Forwarded";
            desc = "Auto-confirm is off. Request emailed to owner.";
        }

        setEmailToast({ visible: true, message: title, subtext: desc });
        setTimeout(() => setEmailToast({ visible: false, message: '', subtext: '' }), 4000);
    }

    const replyTextToSave = currentAnalysis?.replyText || (actionType === 'EMAIL_OWNER' ? 'Action: Emailed Business Owner' : 'Replied');

    setTimeout(() => {
        // Mark item as replied instead of removing it
        const updatedItems = inboxItems.map(item => 
            item.id === selectedItem?.id 
            ? { ...item, replied: true, lastReply: replyTextToSave } 
            : item
        );
        
        setInboxItems(updatedItems);
        
        // Update current selected item state immediately
        if (selectedItem) {
            setSelectedItem({ ...selectedItem, replied: true, lastReply: replyTextToSave });
        }

        setGeneratedReply('');
        setAnalysisResult(null);
        setIsSent(false);
        
        // If auto-reply is active, move to the next unreplied item
        if (settings.autoReply) {
            const currentIndex = inboxItems.findIndex(i => i.id === selectedItem?.id);
            // Find the next unreplied item in the list
            const nextUnrepliedItem = updatedItems.find((item, index) => index > currentIndex && !item.replied) || 
                                      updatedItems.find(item => !item.replied); // Wrap around if needed

            if (nextUnrepliedItem && window.innerWidth >= 768) {
                setSelectedItem(nextUnrepliedItem);
            } else if (window.innerWidth < 768) {
                setSelectedItem(null);
            }
        }

    }, 1500);
  }

  // Order Configuration Handlers
  const handleAddProduct = () => {
      if(newProduct.name && newProduct.price) {
          const product: Product = {
              id: Date.now().toString(),
              name: newProduct.name,
              price: Number(newProduct.price),
              quantity: Number(newProduct.quantity)
          };
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
            <p className="mb-6 max-w-md text-slate-500">Connect your Facebook or Instagram account to start managing messages, comments, and reviews from one place.</p>
            <Button onClick={() => setActivePage('connections')}>
                <LinkIcon className="w-4 h-4 mr-2" />
                Connect Meta Account
            </Button>
        </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)] md:h-full gap-6 animate-fade-in relative">
        
      {/* Email Sent Toast */}
      {emailToast.visible && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center animate-fade-in w-max max-w-[90vw]">
              <CheckCircleIcon className="w-5 h-5 mr-3 flex-shrink-0" />
              <div>
                  <p className="font-bold">{emailToast.message}</p>
                  <p className="text-xs opacity-90">{emailToast.subtext}</p>
              </div>
          </div>
      )}

      {/* List View */}
      <div className={`w-full md:w-1/3 flex-shrink-0 flex flex-col h-full ${selectedItem ? 'hidden md:flex' : 'flex'}`}>
        <Card className="h-full flex flex-col">
          <Card.Header className="flex-shrink-0 flex justify-between items-center border-b border-slate-100">
            <Card.Title className="flex items-center gap-2">
                Order Automation Settings
            </Card.Title>
            <button 
                onClick={() => {
                    setLocalSettings(JSON.parse(localStorage.getItem('social-agent-settings') || JSON.stringify(settings)));
                    setShowOrderConfig(true);
                }} 
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                title="Configure Order Automation"
            >
                <SettingsIcon className="w-4 h-4" />
            </button>
          </Card.Header>
          <Card.Content className="p-0 flex-1 overflow-y-auto">
            {inboxItems.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                {inboxItems.map(item => (
                    <li key={item.id}>
                    <button onClick={() => handleSelectItem(item)} className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${selectedItem?.id === item.id ? 'bg-indigo-50' : ''}`}>
                        <div className="flex items-center gap-3">
                        <div className="relative">
                            <img src={item.avatar} alt={item.sender} className="w-10 h-10 rounded-full flex-shrink-0" />
                            {item.replied && (
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                    <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                                </div>
                            )}
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
            ) : (
                <div className="p-6 text-center text-slate-400">
                    <p>Your inbox is empty. New interactions will appear here automatically.</p>
                </div>
            )}
          </Card.Content>
        </Card>
      </div>

      {/* Detail View */}
      <div className={`w-full md:w-2/3 h-full ${!selectedItem ? 'hidden md:block' : 'block'}`}>
        {selectedItem ? (
          <Card className="h-full flex flex-col">
            <Card.Header className="flex flex-row items-center gap-2 border-b border-slate-100 pb-4">
              <button onClick={() => setSelectedItem(null)} className="md:hidden p-1 -ml-2 text-slate-400 hover:text-slate-600">
                <ArrowLeftIcon className="w-6 h-6" />
              </button>
              <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Card.Title>Conversation with {selectedItem.sender}</Card.Title>
                    {analysisResult && (
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                            analysisResult.category === 'ORDER' ? 'bg-blue-100 border-blue-200 text-blue-700' :
                            analysisResult.category === 'INQUIRY' ? 'bg-purple-100 border-purple-200 text-purple-700' :
                            'bg-amber-100 border-amber-200 text-amber-700'
                        }`}>
                            {analysisResult.category}
                        </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500">on {getConnectionName(selectedItem.connectionId)} ({selectedItem.platform})</p>
              </div>
            </Card.Header>
            <Card.Content className="flex-1 flex flex-col gap-4 overflow-y-auto pt-4">
              {/* Original Message */}
              <div className="p-4 rounded-lg bg-slate-100">
                <p className="text-slate-800">{selectedItem.content}</p>
                <div className="text-xs text-slate-500 mt-2">from {selectedItem.platform} - {selectedItem.timestamp}</div>
              </div>

              {/* Previous Reply (Persisted) */}
              {selectedItem.replied && selectedItem.lastReply && (
                  <div className="ml-8 p-4 rounded-lg bg-emerald-50 border border-emerald-100">
                    <div className="flex items-center gap-2 mb-2">
                        <BotIcon className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-700">AI Agent Log</span>
                    </div>
                    <p className="text-slate-700">{selectedItem.lastReply}</p>
                  </div>
              )}
              
              {/* Generation Area */}
              {!selectedItem.replied && (
                  <div className="mt-auto pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-slate-900">AI Agent Reply</h3>
                        {analysisResult?.action === 'EMAIL_OWNER' && (
                            <span className="flex items-center text-xs font-bold text-amber-600">
                                <AlertTriangleIcon className="w-3 h-3 mr-1" />
                                Email Notification Triggered
                            </span>
                        )}
                    </div>
                    
                    {isLoading && <p className="text-slate-500 animate-pulse">Analyzing content and generating response...</p>}
                    
                    {!isLoading && (
                      <div className="p-4 rounded-lg bg-white border border-indigo-200 shadow-sm relative group">
                        {analysisResult?.orderCode && (
                            <div className="absolute top-2 right-2 bg-slate-100 text-xs text-slate-600 px-2 py-1 rounded font-mono">
                                Code: {analysisResult.orderCode}
                            </div>
                        )}

                        {generatedReply ? (
                            <>
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold text-indigo-600 text-xs uppercase tracking-wider">Proposed Reply:</h4>
                                    {/* Teach AI Button */}
                                    <button 
                                        onClick={handleTeachAI}
                                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
                                        title="Save the current reply as a guideline for future responses"
                                    >
                                        <BookOpenIcon className="w-3 h-3" />
                                        Teach AI
                                    </button>
                                </div>
                                <textarea 
                                    rows={5} 
                                    value={generatedReply} 
                                    onChange={(e) => setGeneratedReply(e.target.value)} 
                                    className="w-full bg-transparent text-slate-700 resize-none focus:outline-none"
                                    readOnly={settings.autoReply || isSent}
                                />
                            </>
                        ) : (
                            <div className="text-center py-4 text-slate-400 italic">
                                <p>No chat reply generated.</p>
                                <p className="text-sm text-emerald-600 mt-1">Action: {analysisResult?.internalNote || "Emailing Business Owner"}</p>
                            </div>
                        )}
                      </div>
                    )}

                    <div className="mt-4">
                        {!settings.autoReply && (
                            <Button 
                                onClick={() => handleSendReply()} 
                                disabled={isLoading || isSent || (!generatedReply && analysisResult?.action === 'NONE')}
                                className="w-full md:w-auto"
                            >
                                {isSent ? 'Processed!' : (generatedReply ? 'Send Reply' : 'Confirm Action')}
                            </Button>
                        )}
                        {settings.autoReply && !isLoading && (
                             <div className="flex items-center justify-center md:justify-start text-sm text-emerald-600 h-10 px-4 rounded-md bg-emerald-50">
                                {isSent ? (
                                    <>
                                        <CheckCircleIcon className="w-4 h-4 mr-2" />
                                        <span>Processed Automatically</span>
                                    </>
                                ) : (
                                    <>
                                        <BotIcon className="w-4 h-4 mr-2 animate-pulse" />
                                        <span>Processing...</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                  </div>
              )}
              
              {selectedItem.replied && (
                  <div className="mt-auto pt-4 text-center text-slate-500 text-sm">
                      <p>This conversation has been marked as processed.</p>
                  </div>
              )}

            </Card.Content>
          </Card>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            <p>Select an item from the inbox to view details.</p>
          </div>
        )}
      </div>

      {/* Order Config Modal */}
      {showOrderConfig && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast">
              <Card className="w-full max-w-lg flex flex-col max-h-[90vh]">
                  <div className="p-6 flex justify-between items-start border-b border-slate-100">
                      <div>
                          <h2 className="text-xl font-bold text-slate-900">Order Automation Settings</h2>
                          <p className="text-sm text-slate-500">Configure how the AI handles sales.</p>
                      </div>
                      <button onClick={() => setShowOrderConfig(false)} className="text-slate-400 hover:text-slate-600">
                          <XIcon className="w-6 h-6" />
                      </button>
                  </div>
                  <div className="p-6 overflow-y-auto custom-scrollbar">
                      <div className="mb-6">
                        <Checkbox 
                            label="Enable Auto-Confirm Orders" 
                            description="If enabled, the AI will calculate totals and confirm orders based on your catalog."
                            checked={localSettings.autoConfirmOrders || false}
                            onChange={(e) => setLocalSettings({...localSettings, autoConfirmOrders: e.target.checked})}
                        />
                        <p className="text-xs text-slate-500 mt-2 italic">
                            Note: If disabled, order requests will be forwarded to your email and the AI will not reply to the chat.
                        </p>
                      </div>

                      {localSettings.autoConfirmOrders && (
                          <div className="animate-fade-in">
                              <h3 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wider">Product Catalog</h3>
                              
                              <div className="space-y-3 mb-4">
                                  {localSettings.productCatalog && localSettings.productCatalog.map(p => (
                                      <div key={p.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-md border border-slate-200">
                                          <div>
                                              <p className="font-medium text-slate-900">{p.name}</p>
                                              <p className="text-xs text-slate-500">${p.price} • Qty: {p.quantity}</p>
                                          </div>
                                          <button onClick={() => handleRemoveProduct(p.id)} className="text-red-500 hover:text-red-600 text-xs">Remove</button>
                                      </div>
                                  ))}
                                  {(!localSettings.productCatalog || localSettings.productCatalog.length === 0) && (
                                      <p className="text-center text-slate-500 text-sm py-2">No products added yet.</p>
                                  )}
                              </div>

                              <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                                  <h4 className="text-xs font-bold text-slate-500 mb-3">Add New Product</h4>
                                  <div className="space-y-3">
                                      <Input label="Product Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="e.g. House Blend Coffee" />
                                      <div className="flex gap-3">
                                          <Input label="Price ($)" type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} />
                                          <Input label="Stock Qty" type="number" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: Number(e.target.value)})} />
                                      </div>
                                      <Button onClick={handleAddProduct} disabled={!newProduct.name || !newProduct.price} className="w-full bg-white !text-black border border-slate-300 hover:bg-slate-50 h-9" style={{ color: 'black' }}>Add to Catalog</Button>
                                  </div>
                              </div>
                          </div>
                      )}
                  </div>
                  <div className="p-6 pt-0 flex justify-end">
                      <Button onClick={saveOrderSettings} className="bg-emerald-600 hover:bg-emerald-700 w-full">Save Configuration</Button>
                  </div>
              </Card>
          </div>
      )}

    </div>
  );
};
