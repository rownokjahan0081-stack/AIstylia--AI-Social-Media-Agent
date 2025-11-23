import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Post, UserSettings, Connection } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { analyzeOwnPosts } from '../services/geminiService';
import { SparklesIcon, LinkIcon } from './Icons';

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
    user: any;
    connections: Connection[];
}

export const Analytics: React.FC<AnalyticsProps> = ({ settings, user, connections }) => {
  const [postData, setPostData] = useState<Post[]>([]);
  const [analysis, setAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const isConnected = connections.length > 0;
  const isGuest = user?.uid === 'guest-user';

  useEffect(() => {
      if (isConnected && postData.length === 0) {
          // Automatically load data if connected
          setPostData(generateMockData());
      }
  }, [isConnected, postData.length]);
  
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

  if (!isConnected) {
      return (
        <div className="animate-fade-in flex flex-col items-center justify-center h-full text-center py-20">
             <div className="bg-indigo-50 p-6 rounded-full mb-6">
                 <LinkIcon className="w-12 h-12 text-indigo-600" />
             </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Connect Your Accounts</h2>
            <p className="text-slate-600 max-w-md mb-8">
                Connect your social media profiles to view engagement metrics, track performance, and get AI-powered insights.
            </p>
        </div>
      );
  }

  return (
    <div className="animate-fade-in">
      <header className="mb-8 flex justify-between items-end">
        <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Performance Analytics</h1>
            <p className="text-slate-600 mt-2 text-sm md:text-base">Track your engagement and understand what's working.</p>
        </div>
        {isGuest && (
            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">
                Viewing Mock Data
            </span>
        )}
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <Card.Header><Card.Title>Total Engagement</Card.Title></Card.Header>
          <Card.Content>
            <p className="text-3xl md:text-4xl font-bold text-indigo-600">{totalEngagement.toLocaleString()}</p>
          </Card.Content>
        </Card>
        <Card>
          <Card.Header><Card.Title>Average Engagement</Card.Title></Card.Header>
          <Card.Content>
            <p className="text-3xl md:text-4xl font-bold text-indigo-600">{averageEngagement.toLocaleString()}</p>
          </Card.Content>
        </Card>
        <Card>
          <Card.Header><Card.Title>Top Platform</Card.Title></Card.Header>
          <Card.Content>
            <p className="text-3xl md:text-4xl font-bold text-indigo-600">{topPlatform}</p>
          </Card.Content>
        </Card>
      </div>

      <Card>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b' }} />
                    <YAxis tick={{ fill: '#64748b' }} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '0.5rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: 'rgba(79, 70, 229, 0.1)' }}
                    />
                    <Legend wrapperStyle={{ color: '#64748b' }}/>
                    <Bar dataKey="engagement" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                    <p className="mb-4 text-center">No performance data found.</p>
                </div>
            )}
        </Card.Content>
      </Card>
      
      <div className="mt-8">
        <Card>
          <Card.Header>
            <Card.Title className="flex items-center gap-2">
                AI-Powered Insights
            </Card.Title>
            <p className="text-sm text-slate-500 mt-1">Let the agent analyze your post performance and provide actionable feedback.</p>
          </Card.Header>
          <Card.Content>
            {postData.length > 0 ? (
              <>
                <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full md:w-auto">
                  {isAnalyzing ? 'Agent is analyzing...' : <><SparklesIcon className="w-4 h-4 mr-2" />Analyze Performance</>}
                </Button>
                
                {analysis && !isAnalyzing && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-slate-800 whitespace-pre-wrap">{analysis}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-slate-500 text-sm">Post some content to enable analysis.</p>
            )}
          </Card.Content>
        </Card>
      </div>

    </div>
  );
};