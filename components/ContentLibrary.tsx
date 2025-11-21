import React, { useState, useEffect } from 'react';
import { ContentAsset, UserSettings } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input, TextArea } from './ui/Form';
import { CheckCircleIcon, RefreshCwIcon, SparklesIcon, DownloadCloudIcon, CameraIcon } from './Icons';
import { generateImageFromPrompt } from '../services/geminiService';

// We need access to settings to provide context for image generation
// Since ContentLibrary didn't have props before, we update it to accept settings if possible, 
// or retrieve from localStorage as a fallback since it's a top-level component in App.tsx now.
export const ContentLibrary: React.FC = () => {
    const [assets, setAssets] = useState<ContentAsset[]>([]);
    const [activeTab, setActiveTab] = useState<'upload' | 'generate'>('upload');
    
    // Upload State
    const [newAssetContext, setNewAssetContext] = useState('');
    const [file, setFile] = useState<File | null>(null);

    // AI Gen State
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);

    useEffect(() => {
        const storedAssets = localStorage.getItem('social-agent-library');
        if (storedAssets) {
            setAssets(JSON.parse(storedAssets));
        }
    }, []);

    const getSettings = (): UserSettings => {
        const s = localStorage.getItem('social-agent-settings');
        return s ? JSON.parse(s) : { businessName: '', businessDescription: '' };
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleAddAsset = () => {
        if (!file || !newAssetContext) {
            alert("Please select a file and provide context.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const newAsset: ContentAsset = {
                id: `asset-${Date.now()}`,
                name: file.name,
                type: 'image',
                url: e.target?.result as string,
                context: newAssetContext,
            };
            saveAsset(newAsset);
            
            // Reset form
            setFile(null);
            setNewAssetContext('');
            const fileInput = document.getElementById('assetFile') as HTMLInputElement;
            if(fileInput) fileInput.value = '';
        };
        reader.readAsDataURL(file);
    };

    const handleGenerateImage = async () => {
        if (!prompt) return;
        setIsGenerating(true);
        setGeneratedImage(null);
        try {
            const settings = getSettings();
            const result = await generateImageFromPrompt(prompt, settings);
            if (result) {
                setGeneratedImage(result);
            } else {
                alert("Could not generate image. Please try a different prompt.");
            }
        } catch (e) {
            console.error(e);
            alert("Image generation failed.");
        } finally {
            setIsGenerating(false);
        }
    }

    const handleSaveGenerated = () => {
        if (!generatedImage) return;
        const newAsset: ContentAsset = {
            id: `ai-asset-${Date.now()}`,
            name: `AI Generated - ${prompt.substring(0, 20)}...`,
            type: 'image',
            url: generatedImage,
            context: `AI Generated: ${prompt}`,
        };
        saveAsset(newAsset);
        setGeneratedImage(null);
        setPrompt('');
    }
    
    const saveAsset = (asset: ContentAsset) => {
        const updatedAssets = [asset, ...assets];
        setAssets(updatedAssets);
        localStorage.setItem('social-agent-library', JSON.stringify(updatedAssets));
    };

    const handleDeleteAsset = (id: string) => {
        const updatedAssets = assets.filter(asset => asset.id !== id);
        setAssets(updatedAssets);
        localStorage.setItem('social-agent-library', JSON.stringify(updatedAssets));
    }


    return (
        <div className="animate-fade-in">
            <header className="mb-8">
                <h1 className="text-4xl font-extrabold text-white tracking-tight">Content Library</h1>
                <p className="text-slate-400 mt-2">Upload assets or generate AI imagery for your content plan.</p>
            </header>

            <Card className="bg-slate-800/50 mb-8">
                <Card.Header>
                    <div className="flex items-center gap-4 border-b border-slate-700 pb-1">
                        <button 
                            onClick={() => setActiveTab('upload')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'upload' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-white'}`}
                        >
                            Upload File
                        </button>
                        <button 
                            onClick={() => setActiveTab('generate')}
                            className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'generate' ? 'text-sky-400 border-b-2 border-sky-400' : 'text-slate-400 hover:text-white'}`}
                        >
                            Generate with AI
                        </button>
                    </div>
                </Card.Header>
                <Card.Content className="pt-6">
                    {activeTab === 'upload' ? (
                        <div className="space-y-4 animate-fade-in">
                                <div>
                                <label htmlFor="assetFile" className="block text-sm font-medium text-slate-400 mb-1">Image File</label>
                                <input type="file" id="assetFile" accept="image/*" onChange={handleFileChange} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-sky-500 file:text-white hover:file:bg-sky-600"/>
                            </div>
                            <div>
                                <label htmlFor="assetContext" className="block text-sm font-medium text-slate-400 mb-1">Context / Description</label>
                                <textarea id="assetContext" value={newAssetContext} onChange={e => setNewAssetContext(e.target.value)} rows={3} placeholder="Describe the image and what it represents." className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 text-white focus:ring-2 focus:ring-sky-500 focus:outline-none resize-none"></textarea>
                            </div>
                            <Button onClick={handleAddAsset} disabled={!file || !newAssetContext}>Add to Library</Button>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1 space-y-4">
                                    <TextArea 
                                        label="Image Prompt" 
                                        placeholder="A cozy cup of coffee on a wooden table with morning sunlight..." 
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                    />
                                    <Button onClick={handleGenerateImage} disabled={isGenerating || !prompt} className="w-full bg-purple-600 hover:bg-purple-700">
                                        {isGenerating ? (
                                            <><RefreshCwIcon className="w-4 h-4 mr-2 animate-spin"/> Generating Image...</>
                                        ) : (
                                            <><SparklesIcon className="w-4 h-4 mr-2"/> Generate Image</>
                                        )}
                                    </Button>
                                </div>
                                <div className="flex-1 bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-center min-h-[200px] relative overflow-hidden">
                                    {generatedImage ? (
                                        <div className="relative w-full h-full group">
                                            <img src={generatedImage} alt="AI Generated" className="w-full h-full object-contain" />
                                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-black/60 backdrop-blur-sm flex justify-center">
                                                <Button onClick={handleSaveGenerated} className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs">
                                                    <DownloadCloudIcon className="w-3 h-3 mr-2"/> Save to Library
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-slate-500 text-center p-4">
                                            <CameraIcon className="w-12 h-12 mx-auto mb-2 opacity-20"/>
                                            <p className="text-sm">Preview will appear here</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </Card.Content>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {assets.map(asset => (
                    <Card key={asset.id} className="bg-slate-800/50 group relative">
                        <img src={asset.url} alt={asset.name} className="rounded-t-xl aspect-square object-cover w-full" />
                        <div className="p-4">
                            <p className="text-sm text-slate-300 line-clamp-3">{asset.context}</p>
                        </div>
                        <button onClick={() => handleDeleteAsset(asset.id)} className="absolute top-2 right-2 bg-red-500/80 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </Card>
                ))}
            </div>
             {assets.length === 0 && (
                <div className="text-center py-10 text-slate-500">
                    <p>Your library is empty. Add some assets for the agent to start creating posts.</p>
                </div>
            )}
        </div>
    );
};