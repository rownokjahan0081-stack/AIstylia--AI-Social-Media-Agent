
import React, { useState } from 'react';
import { UserSettings, Product } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input, TextArea, Checkbox } from './ui/Form';
import { getOnboardingSuggestions } from '../services/geminiService';
import { SparklesIcon } from './Icons';

interface SettingsProps {
    settings: UserSettings;
    setSettings: React.Dispatch<React.SetStateAction<UserSettings | null>>;
}

export const Settings: React.FC<SettingsProps> = ({ settings, setSettings }) => {
    const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
    const [isSaved, setIsSaved] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Product Catalog State
    const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, quantity: 100 });

    const handleInputChange = (field: keyof UserSettings, value: any) => {
        setLocalSettings(prev => ({ ...prev, [field]: value }));
        setIsSaved(false);
    };

    const handleSave = () => {
        setSettings(localSettings);
        localStorage.setItem('social-agent-settings', JSON.stringify(localSettings));
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    }

    const handleGenerateSuggestions = async () => {
        if (!localSettings.businessDescription) return;
        setIsLoading(true);
        const suggestions = await getOnboardingSuggestions(localSettings.businessDescription);
        if(suggestions) {
            setLocalSettings(prev => ({
                ...prev,
                contentPillars: suggestions.pillars.slice(0, 5), // Ensure max 5
                brandVoice: suggestions.voice,
            }));
            setIsSaved(false);
        }
        setIsLoading(false);
    }

    const addPillar = () => {
        if (localSettings.contentPillars.length < 5) {
            handleInputChange('contentPillars', [...localSettings.contentPillars, '']);
        }
    }

    const handleAddProduct = () => {
        if(newProduct.name && newProduct.price) {
            const product: Product = {
                id: Date.now().toString(),
                name: newProduct.name,
                price: Number(newProduct.price),
                quantity: Number(newProduct.quantity)
            };
            const updatedCatalog = [...(localSettings.productCatalog || []), product];
            handleInputChange('productCatalog', updatedCatalog);
            setNewProduct({ name: '', price: 0, quantity: 100 });
        }
    }
  
    const handleRemoveProduct = (id: string) => {
        const updatedCatalog = (localSettings.productCatalog || []).filter(p => p.id !== id);
        handleInputChange('productCatalog', updatedCatalog);
    }

    return (
        <div className="animate-fade-in max-w-4xl mx-auto">
            <header className="mb-8">
                <h1 className="text-4xl font-extrabold text-white tracking-tight">Agent Settings</h1>
                <p className="text-slate-400 mt-2">Fine-tune the core instructions for your AI agent. Manage social media accounts in the <span className="text-sky-400">Connections</span> tab.</p>
            </header>

            <div className="space-y-6">
                <Card className="bg-slate-800/50">
                    <Card.Header><Card.Title>Business Information</Card.Title></Card.Header>
                    <Card.Content className="space-y-4">
                        <Input label="Business Name" value={localSettings.businessName} onChange={e => handleInputChange('businessName', e.target.value)} />
                        <TextArea label="Business Description" value={localSettings.businessDescription} onChange={e => handleInputChange('businessDescription', e.target.value)} />
                    </Card.Content>
                </Card>
                
                <Card className="bg-slate-800/50">
                    <Card.Header><Card.Title>Audience & Voice</Card.Title></Card.Header>
                    <Card.Content className="space-y-4">
                        <TextArea label="Target Audience" value={localSettings.targetAudience} onChange={e => handleInputChange('targetAudience', e.target.value)} />
                        <Input label="Brand Voice" value={localSettings.brandVoice} onChange={e => handleInputChange('brandVoice', e.target.value)} />
                    </Card.Content>
                </Card>

                <Card className="bg-slate-800/50">
                    <Card.Header>
                        <div className="flex justify-between items-center">
                            <Card.Title>Content Pillars</Card.Title>
                            <Button 
                                onClick={handleGenerateSuggestions} 
                                disabled={isLoading || !localSettings.businessDescription} 
                                className="bg-slate-700 hover:bg-slate-600 text-xs h-8 px-3"
                            >
                                <SparklesIcon className="w-3 h-3 mr-2" />
                                {isLoading ? 'Generating...' : 'Suggest with AI'}
                            </Button>
                        </div>
                    </Card.Header>
                    <Card.Content className="space-y-2">
                        {localSettings.contentPillars.map((pillar, index) => (
                             <input key={index} type="text" value={pillar} onChange={e => {
                                const newPillars = [...localSettings.contentPillars];
                                newPillars[index] = e.target.value;
                                handleInputChange('contentPillars', newPillars);
                            }} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white" />
                        ))}
                        {localSettings.contentPillars.length < 5 && (
                            <button onClick={addPillar} className="text-sky-400 text-sm hover:text-sky-300 transition-colors mt-2">
                                + Add Pillar
                            </button>
                        )}
                    </Card.Content>
                </Card>

                <Card className="bg-slate-800/50">
                    <Card.Header><Card.Title>Automation Rules</Card.Title></Card.Header>
                    <Card.Content className="space-y-4">
                        <Checkbox label="Enable Auto-Reply" description="Allow AI to reply without approval." checked={localSettings.autoReply} onChange={e => handleInputChange('autoReply', e.target.checked)} />
                        <Checkbox label="Enable Auto-Post" description="Allow AI to publish posts without approval." checked={localSettings.autoPost} onChange={e => handleInputChange('autoPost', e.target.checked)} />
                        
                        <div className="border-t border-slate-700 pt-4 mt-4">
                             <Checkbox 
                                label="Enable Auto-Confirm Orders" 
                                description="Allow AI to calculate totals and confirm orders based on your catalog." 
                                checked={localSettings.autoConfirmOrders || false} 
                                onChange={e => handleInputChange('autoConfirmOrders', e.target.checked)} 
                             />
                             
                             {(localSettings.autoConfirmOrders) && (
                                <div className="mt-4 pl-4 border-l-2 border-slate-700">
                                    <h3 className="text-sm font-semibold text-slate-300 mb-3">Product Catalog</h3>
                                    
                                    <div className="space-y-3 mb-4">
                                        {localSettings.productCatalog && localSettings.productCatalog.map(p => (
                                            <div key={p.id} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-md border border-slate-700">
                                                <div>
                                                    <p className="font-medium text-white">{p.name}</p>
                                                    <p className="text-xs text-slate-400">${p.price} • Qty: {p.quantity}</p>
                                                </div>
                                                <button onClick={() => handleRemoveProduct(p.id)} className="text-red-400 hover:text-red-300 text-xs font-medium">Remove</button>
                                            </div>
                                        ))}
                                        {(!localSettings.productCatalog || localSettings.productCatalog.length === 0) && (
                                            <p className="text-slate-500 text-sm italic">No products available for auto-confirmation.</p>
                                        )}
                                    </div>

                                    <div className="bg-slate-700/30 p-4 rounded-md">
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                            <div className="md:col-span-5">
                                                <input type="text" placeholder="Product Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white" />
                                            </div>
                                            <div className="md:col-span-3">
                                                <input type="number" placeholder="Price" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <input type="number" placeholder="Qty" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white" />
                                            </div>
                                            <div className="md:col-span-2">
                                                <Button onClick={handleAddProduct} disabled={!newProduct.name || !newProduct.price} className="w-full h-full text-xs">Add</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                             )}
                        </div>
                    </Card.Content>
                </Card>
            </div>

            <div className="mt-8 text-right">
                <Button onClick={handleSave} className={isSaved ? 'bg-emerald-600' : ''}>
                    {isSaved ? 'Saved!' : 'Save Changes'}
                </Button>
            </div>
        </div>
    );
};
