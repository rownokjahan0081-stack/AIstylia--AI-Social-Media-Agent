
import React, { useState, useEffect } from 'react';
import { InboxItem, InboxItemType, UserSettings, Connection, Platform } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { generateReply } from '../services/geminiService';
import { MessageSquareIcon, StarIcon, ThumbsUpIcon, FacebookIcon, InstagramIcon, DownloadCloudIcon, LinkIcon, CheckCircleIcon, BotIcon, ArrowLeftIcon } from './Icons';

const createMockItem = (id: number, connections: Connection[]): InboxItem | null => {
    if (connections.length === 0) return null;
    
    const randomConnection = connections[id % connections.length];
    const types: InboxItemType[] = [InboxItemType.Message, InboxItemType.Comment, InboxItemType.Review];
    const contents = [
        "My order hasn't arrived yet, what's the status?",
        "This product is a game-changer! 5 stars!",
        "How do I use the new feature you just released?",
        "Is this available in a different color?",
        "Just wanted to say I love your brand!"
    ];
    return {
      id,
      type: types[id % types.length],
      sender: `User #${Math.floor(Math.random() * 900) + 100}`,
      avatar: `https://i.pravatar.cc/150?img=${id}`,
      content: contents[id % contents.length],
      platform: randomConnection.platform,
      connectionId: randomConnection.id,
      timestamp: `${Math.floor(Math.random() * 58) + 2}m ago`,
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
}

export const Inbox: React.FC<InboxProps> = ({ settings, connections }) => {
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const [generatedReply, setGeneratedReply] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const getConnectionName = (id: string) => connections.find(c => c.id === id)?.name || 'Unknown Account';

  const handleGenerateReply = async () => {
    if (!selectedItem) return;
    setIsLoading(true);
    setGeneratedReply('');
    
    const reply = await generateReply(selectedItem.content, settings);
    
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


  const handleFetchNew = () => {
    const newItems = Array.from({ length: 5 }, (_, i) => createMockItem(inboxItems.length + i + 1, connections)).filter(Boolean) as InboxItem[];
    setInboxItems(prev => [...newItems, ...prev]);
    if (!selectedItem && newItems.length > 0 && window.innerWidth >= 768) {
        setSelectedItem(newItems[0]);
    }
  };

  const handleSelectItem = (item: InboxItem) => {
    setSelectedItem(item);
    setGeneratedReply('');
    setIsSent(false);
  }

  const handleSendReply = () => {
    // Simulate sending
    setIsSent(true);
    setTimeout(() => {
        // Remove from inbox and select next
        const currentIndex = inboxItems.findIndex(i => i.id === selectedItem?.id);
        const newItems = inboxItems.filter(i => i.id !== selectedItem?.id);
        setInboxItems(newItems);
        
        if (newItems.length > 0) {
            const nextIndex = Math.min(currentIndex, newItems.length - 1);
            // On desktop auto select next, on mobile go back to list
            if (window.innerWidth >= 768) {
                setSelectedItem(newItems[nextIndex]);
            } else {
                setSelectedItem(null);
            }
        } else {
            setSelectedItem(null);
        }
        // No need to set isSent to false, new item selection will handle it

    }, 1000);
  }
  
  if (connections.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 animate-fade-in">
            <LinkIcon className="w-16 h-16 text-slate-600 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No Accounts Connected</h2>
            <p>Please connect a social media account in the 'Connections' tab to start managing your inbox.</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-8rem)] md:h-full gap-6 animate-fade-in relative">
      {/* List View - Hidden on mobile if item selected */}
      <div className={`w-full md:w-1/3 flex-shrink-0 flex flex-col h-full ${selectedItem ? 'hidden md:flex' : 'flex'}`}>
        <Card className="h-full bg-slate-800/50 flex flex-col">
          <Card.Header className="flex-shrink-0">
            <Card.Title className="flex items-center gap-2">
                Interactions
            </Card.Title>
          </Card.Header>
          <div className="px-6 pb-4 flex-shrink-0">
            <Button onClick={handleFetchNew} className="w-full">
                <DownloadCloudIcon className="w-4 h-4 mr-2" />
                Fetch New
            </Button>
          </div>
          <Card.Content className="p-0 flex-1 overflow-y-auto">
            {inboxItems.length > 0 ? (
                <ul className="divide-y divide-slate-700">
                {inboxItems.map(item => (
                    <li key={item.id}>
                    <button onClick={() => handleSelectItem(item)} className={`w-full text-left p-4 hover:bg-slate-700/50 transition-colors ${selectedItem?.id === item.id ? 'bg-slate-700' : ''}`}>
                        <div className="flex items-center gap-3">
                        <img src={item.avatar} alt={item.sender} className="w-10 h-10 rounded-full flex-shrink-0" />
                        <div className="flex-1 overflow-hidden">
                            <div className="flex justify-between items-start">
                            <span className="font-semibold text-white">{item.sender}</span>
                            <span className="text-xs text-slate-400 flex-shrink-0 ml-2">{item.timestamp}</span>
                            </div>
                            <p className="text-sm text-slate-300 truncate">{item.content}</p>
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
                    <p>Your inbox is empty. Fetch new interactions to get started.</p>
                </div>
            )}
          </Card.Content>
        </Card>
      </div>

      {/* Detail View - Hidden on mobile if no item selected */}
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
              <div className="p-4 rounded-lg bg-slate-700/50">
                <p className="text-slate-300">{selectedItem.content}</p>
                <div className="text-xs text-slate-500 mt-2">from {selectedItem.platform} - {selectedItem.timestamp}</div>
              </div>
              
              <div className="mt-auto pt-4 border-t border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-3">AI Agent Reply</h3>
                {isLoading && <p className="text-slate-400">Agent is typing...</p>}
                
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
                            {isSent ? 'Sent!' : 'Approve & Send'}
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
            </Card.Content>
          </Card>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            <p>Select an item from the inbox or fetch new interactions.</p>
          </div>
        )}
      </div>
    </div>
  );
};
