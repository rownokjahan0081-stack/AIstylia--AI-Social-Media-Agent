
import React, { useState, useEffect } from 'react';
import { InboxItem, InboxItemType, UserSettings, Connection, Platform, Page, Product } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { generateReply } from '../services/geminiService';
import { MessageSquareIcon, StarIcon, ThumbsUpIcon, FacebookIcon, InstagramIcon, LinkIcon, CheckCircleIcon, BotIcon, ArrowLeftIcon, SettingsIcon, XIcon } from './Icons';
import { Input, Checkbox } from './ui/Form';

const createMockItem = (id: number, connections: Connection[]): InboxItem | null => {
    if (connections.length === 0) return null;
    
    const randomConnection = connections[id % connections.length];
    
    // Specific scenarios to demonstrate Agent capabilities
    // 1. Order Request (Tests "Do not confirm orders" rule)
    // 2. Comment (Tests "Comment reply")
    // 3. Order Status/Refund (Tests "Support redirection")
    // 4. Review (Tests "Gratitude")
    // 5. General Query
    
    let type = InboxItemType.Message;
    let content = "";
    let sender = `User ${id}`;
    
    // Use modulo to cycle through specific scenarios based on ID
    const scenario = id % 5;
    
    switch(scenario) {
        case 0: // Order Request
            type = InboxItemType.Message;
            sender = "Sarah Connor";
            content = "Hi! I'd like to order 1 Bag of House Blend and 2 Chocolate Croissants. My address is 123 Skynet Ave, LA. Can you confirm?";
            break;
        case 1: // Comment
            type = InboxItemType.Comment;
            sender = "Mike Ross";
            content = "This latte art is amazing! 😍 Do you offer classes?";
            break;
        case 2: // Support / Refund
            type = InboxItemType.Message;
            sender = "Jessica Pearson";
            content = "My order #12345 hasn't arrived yet and it's been an hour. Please refund me.";
            break;
        case 3: // Review
            type = InboxItemType.Review;
            sender = "Gordon Ramsay";
            content = "Finally, some good coffee. 5 stars.";
            break;
        default: // General
            type = InboxItemType.Message;
            sender = "Peter Parker";
            content = "Do you have any gluten-free options available today?";
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
    case 'Facebook': return <FacebookIcon className="w-4 h-4 text-blue-500" />;
    case 'Instagram': return <InstagramIcon className="w-4 h-4 text-pink-500" />;
  }
};

const ItemTypeIcon = ({ type }: { type: InboxItemType }) => {
    switch (type) {
        case InboxItemType.Message: return <MessageSquareIcon className="w-4 h-4 text-slate-400" />;
        case InboxItemType.Comment: return <ThumbsUpIcon className="w-4 h-4 text-slate-400" />;
        case InboxItemType.Review: return <StarIcon className="w-4 h-4 text-slate-400" />;
    }
};

interface InboxProps {
    settings: UserSettings;
    connections: Connection[];
    setActivePage: (page: Page) => void;
}

export const Inbox: React.FC<InboxProps> = ({ settings, connections, setActivePage }) => {
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const [generatedReply, setGeneratedReply] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  
  // Order Config Modal State
  const [showOrderConfig, setShowOrderConfig] = useState(false);
  const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, quantity: 100 });
  const [emailSentToast, setEmailSentToast] = useState(false);

  const getConnectionName = (id: string) => connections.find(c => c.id === id)?.name || 'Unknown Account';

  const handleGenerateReply = async () => {
    if (!selectedItem) return;
    if (selectedItem.replied) return; // Don't regenerate if already replied
    
    setIsLoading(true);
    setGeneratedReply('');
    
    // Use updated settings from local storage if available, otherwise props
    const currentSettings = JSON.parse(localStorage.getItem('social-agent-settings') || JSON.stringify(settings));
    
    const reply = await generateReply(selectedItem.content, selectedItem.type, currentSettings);
    
    setGeneratedReply(reply);
    setIsLoading(false);
  };
  
  useEffect(() => {
    if (selectedItem) {
      handleGenerateReply();
    }
  }, [selectedItem]);

  useEffect(() => {
    if (generatedReply && settings.autoReply && !isSent && !isLoading) {
      const timer = setTimeout(() => {
        handleSendReply();
      }, 1500); // 1.5 second delay for user to see the reply
      return () => clearTimeout(timer);
    }
  }, [generatedReply, settings.autoReply, isSent, isLoading]);

  // Automatically load messages when connections are available
  useEffect(() => {
      if (connections.length > 0 && inboxItems.length === 0) {
          const newItems = Array.from({ length: 5 }, (_, i) => createMockItem(i + 1, connections)).filter(Boolean) as InboxItem[];
          setInboxItems(newItems);
          if (!selectedItem && newItems.length > 0 && window.innerWidth >= 768) {
            setSelectedItem(newItems[0]);
          }
      }
  }, [connections, inboxItems.length]);

  const handleSelectItem = (item: InboxItem) => {
    setSelectedItem(item);
    setGeneratedReply('');
    setIsSent(false);
  }

  const handleSendReply = () => {
    // Simulate sending
    setIsSent(true);
    
    // Check if the reply was an order confirmation to simulate email
    if (generatedReply.toLowerCase().includes("confirmed") || generatedReply.toLowerCase().includes("total is")) {
        setEmailSentToast(true);
        setTimeout(() => setEmailSentToast(false), 4000);
    }

    setTimeout(() => {
        // Mark item as replied instead of removing it
        const updatedItems = inboxItems.map(item => 
            item.id === selectedItem?.id 
            ? { ...item, replied: true, lastReply: generatedReply } 
            : item
        );
        
        setInboxItems(updatedItems);
        
        // Update current selected item state immediately
        if (selectedItem) {
            setSelectedItem({ ...selectedItem, replied: true, lastReply: generatedReply });
        }

        setGeneratedReply('');
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

    }, 1000);
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
      localStorage.setItem('social-agent-settings', JSON.stringify(localSettings));
      // Need to reload window or use a global context to propagate change perfectly, 
      // but for this mock, we'll just close and rely on reading localStorage in handleGenerateReply
      setShowOrderConfig(false);
  }
  
  if (connections.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 animate-fade-in">
            <LinkIcon className="w-16 h-16 text-slate-600 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Accounts Connected</h2>
            <p className="mb-6 max-w-md">Connect your Facebook or Instagram account to start managing messages, comments, and reviews from one place.</p>
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
      {emailSentToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center animate-fade-in">
              <CheckCircleIcon className="w-5 h-5 mr-2" />
              <div>
                  <p className="font-bold">Order Processed</p>
                  <p className="text-xs opacity-90">Confirmation email sent to owner.</p>
              </div>
          </div>
      )}

      {/* List View */}
      <div className={`w-full md:w-1/3 flex-shrink-0 flex flex-col h-full ${selectedItem ? 'hidden md:flex' : 'flex'}`}>
        <Card className="h-full bg-slate-800/50 flex flex-col">
          <Card.Header className="flex-shrink-0 flex justify-between items-center">
            <Card.Title className="flex items-center gap-2">
                Interactions
            </Card.Title>
            <button 
                onClick={() => {
                    setLocalSettings(JSON.parse(localStorage.getItem('social-agent-settings') || JSON.stringify(settings)));
                    setShowOrderConfig(true);
                }} 
                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full transition-colors text-slate-300"
                title="Configure Order Automation"
            >
                <SettingsIcon className="w-4 h-4" />
            </button>
          </Card.Header>
          <Card.Content className="p-0 flex-1 overflow-y-auto">
            {inboxItems.length > 0 ? (
                <ul className="divide-y divide-slate-700">
                {inboxItems.map(item => (
                    <li key={item.id}>
                    <button onClick={() => handleSelectItem(item)} className={`w-full text-left p-4 hover:bg-slate-700/50 transition-colors ${selectedItem?.id === item.id ? 'bg-slate-700' : ''}`}>
                        <div className="flex items-center gap-3">
                        <div className="relative">
                            <img src={item.avatar} alt={item.sender} className="w-10 h-10 rounded-full flex-shrink-0" />
                            {item.replied && (
                                <div className="absolute -bottom-1 -right-1 bg-slate-800 rounded-full p-0.5">
                                    <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <div className="flex justify-between items-start">
                            <span className={`font-semibold ${item.replied ? 'text-slate-400' : 'text-white'}`}>{item.sender}</span>
                            <span className="text-xs text-slate-400 flex-shrink-0 ml-2">{item.timestamp}</span>
                            </div>
                            <p className={`text-sm truncate ${item.replied ? 'text-slate-500' : 'text-slate-300'}`}>{item.content}</p>
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
          <Card className="h-full flex flex-col bg-slate-800/50">
            <Card.Header className="flex flex-row items-center gap-2">
              <button onClick={() => setSelectedItem(null)} className="md:hidden p-1 -ml-2 text-slate-400 hover:text-white">
                <ArrowLeftIcon className="w-6 h-6" />
              </button>
              <div className="flex-1">
                  <Card.Title>Conversation with {selectedItem.sender}</Card.Title>
                  <p className="text-sm text-slate-400">on {getConnectionName(selectedItem.connectionId)} ({selectedItem.platform})</p>
              </div>
            </Card.Header>
            <Card.Content className="flex-1 flex flex-col gap-4 overflow-y-auto">
              {/* Original Message */}
              <div className="p-4 rounded-lg bg-slate-700/50">
                <p className="text-slate-300">{selectedItem.content}</p>
                <div className="text-xs text-slate-500 mt-2">from {selectedItem.platform} - {selectedItem.timestamp}</div>
              </div>

              {/* Previous Reply (Persisted) */}
              {selectedItem.replied && selectedItem.lastReply && (
                  <div className="ml-8 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-2">
                        <BotIcon className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-400">AI Agent Replied</span>
                    </div>
                    <p className="text-slate-300">{selectedItem.lastReply}</p>
                  </div>
              )}
              
              {/* Generation Area */}
              {!selectedItem.replied && (
                  <div className="mt-auto pt-4 border-t border-slate-700">
                    <h3 className="text-lg font-semibold text-white mb-3">AI Agent Reply</h3>
                    {isLoading && <p className="text-slate-400 animate-pulse">Agent is typing...</p>}
                    
                    {!isLoading && generatedReply && (
                      <div className="p-4 rounded-lg bg-slate-700 border border-emerald-500/30">
                        <h4 className="font-semibold text-emerald-300 mb-2">Generated Reply:</h4>
                        <textarea 
                            rows={5} 
                            value={generatedReply} 
                            onChange={(e) => setGeneratedReply(e.target.value)} 
                            className="w-full bg-transparent text-slate-200 resize-none focus:outline-none"
                            readOnly={settings.autoReply || isSent}
                        />
                      </div>
                    )}

                    <div className="mt-4">
                        {!settings.autoReply && (
                            <Button 
                                onClick={handleSendReply} 
                                disabled={isLoading || isSent || !generatedReply}
                                className="w-full md:w-auto"
                            >
                                {isSent ? 'Sent!' : 'Send Reply'}
                            </Button>
                        )}
                        {settings.autoReply && generatedReply && !isLoading && (
                             <div className="flex items-center justify-center md:justify-start text-sm text-emerald-400 h-10 px-4 rounded-md bg-emerald-500/10">
                                {isSent ? (
                                    <>
                                        <CheckCircleIcon className="w-4 h-4 mr-2" />
                                        <span>Reply Sent!</span>
                                    </>
                                ) : (
                                    <>
                                        <BotIcon className="w-4 h-4 mr-2 animate-pulse" />
                                        <span>Sending automatically...</span>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                  </div>
              )}
              
              {selectedItem.replied && (
                  <div className="mt-auto pt-4 text-center text-slate-500 text-sm">
                      <p>This conversation has been marked as replied.</p>
                  </div>
              )}

            </Card.Content>
          </Card>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            <p>Select an item from the inbox to view details.</p>
          </div>
        )}
      </div>

      {/* Order Config Modal */}
      {showOrderConfig && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast">
              <Card className="w-full max-w-lg bg-slate-800 max-h-[90vh] flex flex-col">
                  <div className="p-6 flex justify-between items-start border-b border-slate-700">
                      <div>
                          <h2 className="text-xl font-bold text-white">Order Automation Settings</h2>
                          <p className="text-sm text-slate-400">Configure how the AI handles sales.</p>
                      </div>
                      <button onClick={() => setShowOrderConfig(false)} className="text-slate-400 hover:text-white">
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
                      </div>

                      {localSettings.autoConfirmOrders && (
                          <div className="animate-fade-in">
                              <h3 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Product Catalog</h3>
                              
                              <div className="space-y-3 mb-4">
                                  {localSettings.productCatalog && localSettings.productCatalog.map(p => (
                                      <div key={p.id} className="flex items-center justify-between bg-slate-700/50 p-3 rounded-md">
                                          <div>
                                              <p className="font-medium text-white">{p.name}</p>
                                              <p className="text-xs text-slate-400">${p.price} • Qty: {p.quantity}</p>
                                          </div>
                                          <button onClick={() => handleRemoveProduct(p.id)} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                                      </div>
                                  ))}
                                  {(!localSettings.productCatalog || localSettings.productCatalog.length === 0) && (
                                      <p className="text-center text-slate-500 text-sm py-2">No products added yet.</p>
                                  )}
                              </div>

                              <div className="bg-slate-900/50 p-4 rounded-md border border-slate-700">
                                  <h4 className="text-xs font-bold text-slate-400 mb-3">Add New Product</h4>
                                  <div className="space-y-3">
                                      <Input label="Product Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} placeholder="e.g. House Blend Coffee" />
                                      <div className="flex gap-3">
                                          <Input label="Price ($)" type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} />
                                          <Input label="Stock Qty" type="number" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: Number(e.target.value)})} />
                                      </div>
                                      <Button onClick={handleAddProduct} disabled={!newProduct.name || !newProduct.price} className="w-full bg-slate-700 hover:bg-slate-600 h-9">Add to Catalog</Button>
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
