
import React, { useState, useEffect } from 'react';
import { UserSettings, Product } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { SparklesIcon } from './Icons';
import { getOnboardingSuggestions } from '../services/geminiService';
import { Input, TextArea, Checkbox } from './ui/Form';

interface OnboardingProps {
  onComplete: (settings: UserSettings) => void;
  initialSettings?: UserSettings | null;
}

const steps = [
  'Business Info',
  'Audience & Voice',
  'Content Strategy',
  'Automation Rules',
  'Connect Accounts',
];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, initialSettings }) => {
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    businessName: '',
    businessDescription: '',
    targetAudience: '',
    brandVoice: '',
    contentPillars: [],
    autoPost: false,
    autoReply: false,
    autoConfirmOrders: false,
    productCatalog: [],
    replyGuidelines: []
  });

  const [newProduct, setNewProduct] = useState<Partial<Product>>({ name: '', price: 0, quantity: 100 });

  // Populate with mock data if provided
  useEffect(() => {
      if (initialSettings) {
          setSettings(initialSettings);
      }
  }, [initialSettings]);

  const handleInputChange = (field: keyof UserSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };
  
  const handlePillarChange = (index: number, value: string) => {
    const newPillars = [...settings.contentPillars];
    newPillars[index] = value;
    handleInputChange('contentPillars', newPillars);
  };
  
  const addPillar = () => {
    if (settings.contentPillars.length < 5) {
        handleInputChange('contentPillars', [...settings.contentPillars, '']);
    }
  }

  const handleGenerateSuggestions = async () => {
    if (!settings.businessDescription) return;
    setIsLoading(true);
    const suggestions = await getOnboardingSuggestions(settings.businessDescription);
    if(suggestions) {
        setSettings(prev => ({
            ...prev,
            contentPillars: suggestions.pillars.slice(0, 5), // Ensure max 5
            brandVoice: suggestions.voice,
        }));
    }
    setIsLoading(false);
  }

  const handleAddProduct = () => {
      if(newProduct.name && newProduct.price) {
          const product: Product = {
              id: Date.now().toString(),
              name: newProduct.name || '',
              price: Number(newProduct.price),
              quantity: Number(newProduct.quantity)
          };
          const updatedCatalog = [...(settings.productCatalog || []), product];
          handleInputChange('productCatalog', updatedCatalog);
          setNewProduct({ name: '', price: 0, quantity: 100 });
      }
  }

  const handleRemoveProduct = (id: string) => {
      const updatedCatalog = (settings.productCatalog || []).filter(p => p.id !== id);
      handleInputChange('productCatalog', updatedCatalog);
  }

  const nextStep = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const prevStep = () => setStep(s => Math.max(s - 1, 0));
  
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <h2 className="text-xl font-bold mb-4 text-slate-900">Tell us about your business</h2>
            <div className="space-y-4">
              <Input label="Business Name" value={settings.businessName} onChange={e => handleInputChange('businessName', e.target.value)} />
              <TextArea label="Business Description" value={settings.businessDescription} onChange={e => handleInputChange('businessDescription', e.target.value)} placeholder="e.g., We sell handmade eco-friendly candles." />
            </div>
          </>
        );
      case 1:
        return (
          <>
            <h2 className="text-xl font-bold mb-4 text-slate-900">Define your Audience and Voice</h2>
            <div className="space-y-4">
              <TextArea label="Target Audience" value={settings.targetAudience} onChange={e => handleInputChange('targetAudience', e.target.value)} placeholder="e.g., Young professionals aged 25-40 who are environmentally conscious." />
              <Input label="Brand Voice" value={settings.brandVoice} onChange={e => handleInputChange('brandVoice', e.target.value)} placeholder="e.g., Friendly, witty, informative" />
            </div>
          </>
        );
      case 2:
        return (
          <>
            <h2 className="text-xl font-bold mb-1 text-slate-900">What are your content pillars?</h2>
            <p className="text-slate-500 text-sm mb-4">These are the key themes your agent will post about.</p>
            <Button onClick={handleGenerateSuggestions} disabled={isLoading || !settings.businessDescription} className="mb-4 bg-white !text-black border border-indigo-200 hover:bg-indigo-50">
                <SparklesIcon className="w-4 h-4 mr-2" />
                {isLoading ? 'Generating...' : 'Suggest with AI'}
            </Button>
            <div className="space-y-2">
                {settings.contentPillars.map((pillar, index) => (
                    <input key={index} type="text" value={pillar} onChange={e => handlePillarChange(index, e.target.value)} className="w-full bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900" />
                ))}
                {settings.contentPillars.length < 5 && <button onClick={addPillar} className="text-indigo-600 text-sm hover:underline">+ Add Pillar</button>}
            </div>
          </>
        );
      case 3:
        return (
          <>
            <h2 className="text-xl font-bold mb-4 text-slate-900">Set your automation rules</h2>
            <div className="space-y-4">
                <Checkbox label="Enable Auto-Reply" description="Allow the AI to reply to messages and comments without approval." checked={settings.autoReply} onChange={e => handleInputChange('autoReply', e.target.checked)} />
                <Checkbox label="Enable Auto-Post" description="Allow the AI to publish new posts to your schedule without approval." checked={settings.autoPost} onChange={e => handleInputChange('autoPost', e.target.checked)} />
                
                <div className="border-t border-slate-200 pt-4 mt-2">
                     <Checkbox 
                        label="Enable Auto-Confirm Orders" 
                        description="Allow AI to calculate totals and confirm orders based on your catalog." 
                        checked={settings.autoConfirmOrders || false} 
                        onChange={e => handleInputChange('autoConfirmOrders', e.target.checked)} 
                     />
                     
                     {(settings.autoConfirmOrders) && (
                        <div className="mt-4 pl-4 border-l-2 border-slate-200">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">Product Catalog</h3>
                            
                            <div className="space-y-3 mb-4">
                                {settings.productCatalog && settings.productCatalog.map(p => (
                                    <div key={p.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-md border border-slate-200">
                                        <div>
                                            <p className="font-medium text-slate-900">{p.name}</p>
                                            <p className="text-xs text-slate-500">${p.price} • Qty: {p.quantity}</p>
                                        </div>
                                        <button onClick={() => handleRemoveProduct(p.id)} className="text-red-500 hover:text-red-600 text-xs font-medium">Remove</button>
                                    </div>
                                ))}
                                {(!settings.productCatalog || settings.productCatalog.length === 0) && (
                                    <p className="text-slate-500 text-sm italic">No products added yet.</p>
                                )}
                            </div>

                            <div className="bg-slate-100/50 p-4 rounded-md">
                                <h4 className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wide">Add New Product</h4>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                    <div className="md:col-span-5">
                                        <input type="text" placeholder="Product Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-900" />
                                    </div>
                                    <div className="md:col-span-3">
                                        <input type="number" placeholder="Price" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})} className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-900" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <input type="number" placeholder="Qty" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: Number(e.target.value)})} className="w-full bg-white border border-slate-300 rounded px-3 py-2 text-sm text-slate-900" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <Button onClick={handleAddProduct} disabled={!newProduct.name || !newProduct.price} className="w-full h-full text-xs">Add</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                     )}
                </div>
            </div>
          </>
        );
      case 4:
        return (
            <>
              <h2 className="text-xl font-bold mb-4 text-slate-900">Connect Your Accounts</h2>
              <p className="text-slate-600">The final step is to connect your social media accounts. You'll be taken to the Connections page to securely link your Facebook, Instagram, and other profiles.</p>
              <p className="text-slate-500 mt-2 text-sm">This will allow the AI agent to fetch messages and post on your behalf.</p>
            </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl border-slate-200">
        <Card.Header>
          <Card.Title>Agent Setup ({step + 1}/{steps.length})</Card.Title>
          <p className="text-slate-500">{steps[step]}</p>
        </Card.Header>
        <Card.Content className="min-h-[250px]">
          {renderStep()}
        </Card.Content>
        <div className="p-6 pt-0 flex justify-between items-center">
            <Button onClick={prevStep} disabled={step === 0} className="bg-slate-800 text-white hover:bg-slate-700">Back</Button>
            {step < steps.length - 1 ? (
                <Button onClick={nextStep}>Next</Button>
            ) : (
                <Button onClick={() => onComplete(settings)} className="bg-emerald-600 hover:bg-emerald-700 text-white">Finish Setup</Button>
            )}
        </div>
      </Card>
    </div>
  );
};
