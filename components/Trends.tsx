import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { UserSettings, TrendTopic, TrendContentIdea } from '../types';
import { analyzeTrends } from '../services/geminiService';
import { SparklesIcon, TrendingUpIcon } from './Icons';

interface TrendsProps {
    settings: UserSettings;
}

export const Trends: React.FC<TrendsProps> = ({ settings }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [trends, setTrends] = useState<TrendTopic[] | null>(null);
    const [ideas, setIdeas] = useState<TrendContentIdea[] | null>(null);
    
    const handleAnalyze = async () => {
        setIsLoading(true);
        setError(null);
        setTrends(null);
        setIdeas(null);

        try {
            const result = await analyzeTrends(settings);
            setTrends(result.trends);
            setIdeas(result.ideas);
        } catch (e: any) {
            setError(e.message || "Failed to analyze trends. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="animate-fade-in">
            <header className="mb-8">
                <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Trend Analysis</h1>
                <p className="text-slate-600 mt-2">Discover current trends and generate relevant content ideas with AI.</p>
            </header>

            <Card className="mb-8">
                <Card.Header>
                    <Card.Title className="flex items-center gap-2">
                        Trend Engine
                    </Card.Title>
                </Card.Header>
                <Card.Content>
                    <Button onClick={handleAnalyze} disabled={isLoading}>
                        {isLoading ? 'Agent is searching...' : <><TrendingUpIcon className="w-5 h-5 mr-2" /> Analyze Current Trends</>}
                    </Button>
                    {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
                </Card.Content>
            </Card>

            {isLoading && (
                <div className="text-center py-10">
                    <SparklesIcon className="w-10 h-10 text-indigo-600 mx-auto animate-pulse" />
                    <p className="text-slate-500 mt-4">Analyzing real-time web trends for {settings.businessName}...</p>
                </div>
            )}
            
            {trends && ideas && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">Discovered Trends</h2>
                        <div className="space-y-4">
                            {trends.map((trend, index) => (
                                <Card key={index}>
                                    <Card.Content className="pt-6">
                                        <h3 className="font-semibold text-indigo-600">{trend.topic}</h3>
                                        <p className="text-sm text-slate-600 mt-1">{trend.summary}</p>
                                        {trend.source && (
                                             <a href={trend.source} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-indigo-600 transition-colors mt-2 block">
                                                Source
                                            </a>
                                        )}
                                    </Card.Content>
                                </Card>
                            ))}
                        </div>
                    </div>
                     <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">AI Content Ideas</h2>
                        <div className="space-y-4">
                            {ideas.map((idea, index) => (
                                <Card key={index}>
                                    <Card.Content className="pt-6">
                                        <h3 className="font-semibold text-emerald-600">{idea.title}</h3>
                                        <p className="text-sm text-slate-600 mt-2"><span className="font-semibold text-slate-800">Concept:</span> {idea.concept}</p>
                                        <p className="text-sm text-slate-500 mt-2"><span className="font-semibold text-slate-800">Rationale:</span> {idea.rationale}</p>
                                         <p className="text-indigo-600 text-xs font-mono mt-3">{idea.hashtags.join(' ')}</p>
                                    </Card.Content>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {!isLoading && !trends && !ideas && (
                <Card className="text-center py-16">
                    <p className="text-slate-500">Ready to find out what's trending?</p>
                    <p className="text-slate-400 text-sm">Click the button above to have the AI analyze the web for you.</p>
                </Card>
            )}
        </div>
    );
};