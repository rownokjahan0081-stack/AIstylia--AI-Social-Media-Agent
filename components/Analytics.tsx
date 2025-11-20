
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Post, UserSettings } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { analyzeOwnPosts } from '../services/geminiService';
import { SparklesIcon } from './Icons';

// In a real app, this data would come from props or a state management solution.
// For this simulation, we'll keep it in local state to be "generated".
const generateMockData = (): Post[] => {
    return [
        { id: 1, platform: 'Instagram', connectionId: 'mock-ig-1', content: 'Loving the summer vibes! ☀️ Our new collection is perfect for sunny days.', engagement: 580, hashtags: [], scheduledTime: new Date(), status: 'posted' },
        { id: 2, platform: 'Facebook', connectionId: 'mock-fb-1', content: 'Huge news! Our biggest sale of the year is now LIVE. Get up to 50% off!', engagement: 1200, hashtags: [], scheduledTime: new Date(), status: 'posted' },
        { id: 3, platform: 'Facebook', connectionId: 'mock-fb-1', content: 'A behind-the-scenes look at how our products are made. Quality first!', engagement: 350, hashtags: [], scheduledTime: new Date(), status: 'posted' },
        { id: 4, platform: 'Instagram', connectionId: 'mock-ig-1', content: 'Giveaway time! ✨ Win a prize pack by tagging a friend and following us.', engagement: 950, hashtags: [], scheduledTime: new Date(), status: 'posted' },
        { id: 5, platform: 'Facebook', connectionId: 'mock-fb-1', content: 'Happy Friday! What are your weekend plans?', engagement: 820, hashtags: [], scheduledTime: new Date(), status: 'posted' },
        { id: 6, platform: 'Facebook', connectionId: 'mock-fb-1', content: 'Customer spotlight! We love seeing you enjoy our products.', engagement: 450, hashtags: [], scheduledTime: new Date(), status: 'posted' },
        { id: 7, platform: 'Instagram', connectionId: 'mock-ig-1', content: 'Our founder shares their story. #inspiration', engagement: 1500, hashtags: [], scheduledTime: new Date(), status: 'posted' },
    ];
};

interface AnalyticsProps {
    settings: UserSettings;
}

export const Analytics: React.FC<AnalyticsProps> = ({ settings }) => {
  const [postData, setPostData] = useState<Post[]>([]);
  const [analysis, setAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const chartData = useMemo(() => {
    return postData.map((post, index) => ({
      name: `Post ${index + 1}`,
      engagement: post.engagement,
      platform: post.platform,
    }));
  }, [postData]);
  
  const totalEngagement = useMemo(() => chartData.reduce((acc, curr) => acc + (curr.engagement || 0), 0), [chartData]);
  const averageEngagement = useMemo(() => postData.length > 0 ? Math.round(totalEngagement / postData.length) : 0, [totalEngagement, postData]);

  const topPlatform = useMemo(() => {
    if (postData.length === 0) return 'N/A';
    const platformEngagement: { [key: string]: number } = {};
    postData.forEach(post => {
        platformEngagement[post.platform] = (platformEngagement[post.platform] || 0) + (post.engagement || 0);
    });
    return Object.keys(platformEngagement).reduce((a, b) => platformEngagement[a] > platformEngagement[b] ? a : b);
  }, [postData]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setAnalysis('');
    try {
        const result = await analyzeOwnPosts(postData, settings);
        setAnalysis(result);
    } catch (error) {
        setAnalysis('Sorry, an error occurred while analyzing the posts. Please try again.');
    } finally {
        setIsAnalyzing(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Performance Analytics</h1>
        <p className="text-slate-400 mt-2 text-sm md:text-base">Track your engagement and understand what's working.</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-slate-800/50">
          <Card.Header><Card.Title>Total Engagement</Card.Title></Card.Header>
          <Card.Content>
            <p className="text-3xl md:text-4xl font-bold text-white">{totalEngagement.toLocaleString()}</p>
          </Card.Content>
        </Card>
        <Card className="bg-slate-800/50">
          <Card.Header><Card.Title>Average Engagement</Card.Title></Card.Header>
          <Card.Content>
            <p className="text-3xl md:text-4xl font-bold text-white">{averageEngagement.toLocaleString()}</p>
          </Card.Content>
        </Card>
        <Card className="bg-slate-800/50">
          <Card.Header><Card.Title>Top Platform</Card.Title></Card.Header>
          <Card.Content>
            <p className="text-3xl md:text-4xl font-bold text-white">{topPlatform}</p>
          </Card.Content>
        </Card>
      </div>

      <Card className="bg-slate-800/50">
        <Card.Header>
          <Card.Title>Engagement by Post</Card.Title>
        </Card.Header>
        <Card.Content className="h-64 md:h-96">
            {postData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                    data={chartData}
                    margin={{ top: 5, right: 20, left: -10, bottom: 5, }}
                    >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8' }} />
                    <YAxis tick={{ fill: '#94a3b8' }} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#e2e8f0' }}
                        cursor={{ fill: 'rgba(14, 165, 233, 0.1)' }}
                    />
                    <Legend wrapperStyle={{ color: '#94a3b8' }}/>
                    <Bar dataKey="engagement" fill="#38bdf8" />
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <p className="mb-4 text-center">No performance data yet. Post some content to see your analytics.</p>
                    <Button onClick={() => setPostData(generateMockData())}>Generate Sample Data</Button>
                </div>
            )}
        </Card.Content>
      </Card>
      
      <div className="mt-8">
        <Card className="bg-slate-800/50">
          <Card.Header>
            <Card.Title className="flex items-center gap-2">
                AI-Powered Insights
            </Card.Title>
            <p className="text-sm text-slate-400 mt-1">Let the agent analyze your post performance and provide actionable feedback.</p>
          </Card.Header>
          <Card.Content>
            {postData.length > 0 ? (
              <>
                <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full md:w-auto">
                  {isAnalyzing ? 'Agent is analyzing...' : <><SparklesIcon className="w-4 h-4 mr-2" />Analyze Performance</>}
                </Button>
                
                {analysis && !isAnalyzing && (
                  <div className="mt-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                    <p className="text-slate-200 whitespace-pre-wrap">{analysis}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-slate-500 text-sm">Generate sample data or post some content to enable analysis.</p>
            )}
          </Card.Content>
        </Card>
      </div>

    </div>
  );
};
