
import React, { useState } from 'react';
import { UserSettings } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { SparklesIcon } from './Icons';
import { getOnboardingSuggestions } from '../services/geminiService';
import { Input, TextArea, Checkbox } from './ui/Form';

interface OnboardingProps {
  onComplete: (settings: UserSettings) => void;
}

const steps = [
  'Business Info',
  'Audience & Voice',
  'Content Strategy',
  'Automation Rules',
  'Connect Accounts',
];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
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
  });

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

  const nextStep = () => setStep(s => Math.min(s + 1, steps.length - 1));
  const prevStep = () => setStep(s => Math.max(s - 1, 0));
  
  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <>
            <h2 className="text-xl font-bold mb-4">Tell us about your business</h2>
            <div className="space-y-4">
              <Input label="Business Name" value={settings.businessName} onChange={e => handleInputChange('businessName', e.target.value)} />
              <TextArea label="Business Description" value={settings.businessDescription} onChange={e => handleInputChange('businessDescription', e.target.value)} placeholder="e.g., We sell handmade eco-friendly candles." />
            </div>
          </>
        );
      case 1:
        return (
          <>
            <h2 className="text-xl font-bold mb-4">Define your Audience and Voice</h2>
            <div className="space-y-4">
              <TextArea label="Target Audience" value={settings.targetAudience} onChange={e => handleInputChange('targetAudience', e.target.value)} placeholder="e.g., Young professionals aged 25-40 who are environmentally conscious." />
              <Input label="Brand Voice" value={settings.brandVoice} onChange={e => handleInputChange('brandVoice', e.target.value)} placeholder="e.g., Friendly, witty, informative" />
            </div>
          </>
        );
      case 2:
        return (
          <>
            <h2 className="text-xl font-bold mb-1">What are your content pillars?</h2>
            <p className="text-slate-400 text-sm mb-4">These are the key themes your agent will post about.</p>
            <Button onClick={handleGenerateSuggestions} disabled={isLoading || !settings.businessDescription} className="mb-4">
                <SparklesIcon className="w-4 h-4 mr-2" />
                {isLoading ? 'Generating...' : 'Suggest with AI'}
            </Button>
            <div className="space-y-2">
                {settings.contentPillars.map((pillar, index) => (
                    <input key={index} type="text" value={pillar} onChange={e => handlePillarChange(index, e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white" />
                ))}
                {settings.contentPillars.length < 5 && <button onClick={addPillar} className="text-sky-400 text-sm">+ Add Pillar</button>}
            </div>
          </>
        );
      case 3:
        return (
          <>
            <h2 className="text-xl font-bold mb-4">Set your automation rules</h2>
            <div className="space-y-4">
                <Checkbox label="Enable Auto-Reply" description="Allow the AI to reply to messages and comments without approval." checked={settings.autoReply} onChange={e => handleInputChange('autoReply', e.target.checked)} />
                <Checkbox label="Enable Auto-Post" description="Allow the AI to publish new posts to your schedule without approval." checked={settings.autoPost} onChange={e => handleInputChange('autoPost', e.target.checked)} />
            </div>
          </>
        );
      case 4:
        return (
            <>
              <h2 className="text-xl font-bold mb-4">Connect Your Accounts</h2>
              <p className="text-slate-300">The final step is to connect your social media accounts. You'll be taken to the Connections page to securely link your Facebook, Instagram, and other profiles.</p>
              <p className="text-slate-400 mt-2 text-sm">This will allow the AI agent to fetch messages and post on your behalf.</p>
            </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl bg-slate-800/50">
        <Card.Header>
          <Card.Title>Agent Setup ({step + 1}/{steps.length})</Card.Title>
          <p className="text-slate-400">{steps[step]}</p>
        </Card.Header>
        <Card.Content className="min-h-[250px]">
          {renderStep()}
        </Card.Content>
        <div className="p-6 pt-0 flex justify-between items-center">
            <Button onClick={prevStep} disabled={step === 0} className="bg-slate-600 hover:bg-slate-700">Back</Button>
            {step < steps.length - 1 ? (
                <Button onClick={nextStep}>Next</Button>
            ) : (
                <Button onClick={() => onComplete(settings)} className="bg-emerald-600 hover:bg-emerald-700">Finish Setup</Button>
            )}
        </div>
      </Card>
    </div>
  );
};
