import React, { useState } from 'react';
import { UserSettings } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input, TextArea, Checkbox } from './ui/Form';

interface SettingsProps {
    settings: UserSettings;
    setSettings: React.Dispatch<React.SetStateAction<UserSettings | null>>;
}

export const Settings: React.FC<SettingsProps> = ({ settings, setSettings }) => {
    const [localSettings, setLocalSettings] = useState<UserSettings>(settings);
    const [isSaved, setIsSaved] = useState(false);

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
                    <Card.Header><Card.Title>Content Pillars</Card.Title></Card.Header>
                    <Card.Content className="space-y-2">
                        {localSettings.contentPillars.map((pillar, index) => (
                             <input key={index} type="text" value={pillar} onChange={e => {
                                const newPillars = [...localSettings.contentPillars];
                                newPillars[index] = e.target.value;
                                handleInputChange('contentPillars', newPillars);
                            }} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white" />
                        ))}
                    </Card.Content>
                </Card>

                <Card className="bg-slate-800/50">
                    <Card.Header><Card.Title>Automation Rules</Card.Title></Card.Header>
                    <Card.Content className="space-y-4">
                        <Checkbox label="Enable Auto-Reply" description="Allow AI to reply without approval." checked={localSettings.autoReply} onChange={e => handleInputChange('autoReply', e.target.checked)} />
                        <Checkbox label="Enable Auto-Post" description="Allow AI to publish posts without approval." checked={localSettings.autoPost} onChange={e => handleInputChange('autoPost', e.target.checked)} />
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