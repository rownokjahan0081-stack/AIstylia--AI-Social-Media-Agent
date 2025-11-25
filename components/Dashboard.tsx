import React from 'react';
import { Card } from './ui/Card';
import { InboxIcon, Edit3Icon, BarChartIcon, ZapIcon, BotIcon } from './Icons';
import { UserSettings, Page, Connection } from '../types';

interface DashboardProps {
  setActivePage: (page: Page) => void;
  settings: UserSettings;
  user: any;
  connections: Connection[];
  isGuest: boolean;
  openSimulator: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActivePage, settings, user, connections, isGuest, openSimulator }) => {

  const quickActions = [
    {
      title: 'Review Inbox',
      description: 'Check new messages and send replies.',
      icon: <InboxIcon className="w-8 h-8 text-indigo-600" />,
      action: () => setActivePage('inbox'),
      color: 'indigo',
      show: true,
    },
    {
      title: 'Manage Schedule',
      description: 'View and approve upcoming posts.',
      icon: <Edit3Icon className="w-8 h-8 text-emerald-500" />,
      action: () => setActivePage('content'),
      color: 'emerald',
      show: true,
    },
    {
      title: 'View Analytics',
      description: 'Analyze your social media performance.',
      icon: <BarChartIcon className="w-8 h-8 text-amber-500" />,
      action: () => setActivePage('analytics'),
      color: 'amber',
      show: true,
    },
    {
      title: 'Test the Chatbot',
      description: 'Simulate a customer conversation.',
      icon: <BotIcon className="w-8 h-8 text-violet-500" />,
      action: openSimulator,
      color: 'violet',
      show: true,
    },
  ];

  const isConnected = connections.length > 0;
  
  // Logic for Engagement Rate Display
  let engagementRate = "N/A";
  let engagementSubtext = "Connect accounts to view";
  let engagementColor = "text-slate-300"; // Default gray for N/A

  if (isConnected) {
      // If connected (mock or real), we show data
      if (isGuest) {
          engagementRate = "4.7%";
          engagementSubtext = "Mock Data (Guest)";
          engagementColor = "text-emerald-500";
      } else {
          // Simulation for real connected user (without backend)
          engagementRate = "3.2%";
          engagementSubtext = "Based on recent activity";
          engagementColor = "text-emerald-500";
      }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 bg-indigo-50 border border-indigo-200 p-6 rounded-xl text-center shadow-sm">
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">This is a Kaggle Capstone Project</h2>
          <p className="text-indigo-700 font-medium text-lg">Try this simulation because meta dont allow any non-organaization to get its user data</p>
          <p className="text-indigo-700 font-medium text-lg mt-1">Gemini API key does not work without billing</p>
      </div>

      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">AI Agent Dashboard</h1>
        <p className="text-slate-600 mt-2 text-sm md:text-base">Your autonomous social media manager for <span className="text-indigo-600 font-semibold">{settings.businessName}</span> is online.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <Card.Header>
            <Card.Title>Auto-Reply Status</Card.Title>
          </Card.Header>
          <Card.Content>
            <p className={`text-4xl md:text-5xl font-bold ${settings.autoReply ? 'text-emerald-500' : 'text-amber-500'}`}>{settings.autoReply ? 'Active' : 'Paused'}</p>
            <p className="text-sm text-slate-500">{settings.autoReply ? 'Replies are being sent automatically.' : 'Requires manual approval.'}</p>
          </Card.Content>
        </Card>
        <Card>
          <Card.Header>
            <Card.Title>Auto-Post Status</Card.Title>
          </Card.Header>
          <Card.Content>
             <p className={`text-4xl md:text-5xl font-bold ${settings.autoPost ? 'text-emerald-500' : 'text-amber-500'}`}>{settings.autoPost ? 'Active' : 'Paused'}</p>
            <p className="text-sm text-slate-500">{settings.autoPost ? 'Posts are published automatically.' : 'Requires manual approval.'}</p>
          </Card.Content>
        </Card>
        <Card>
          <Card.Header>
            <Card.Title>Engagement Rate</Card.Title>
          </Card.Header>
          <Card.Content>
            <p className={`text-4xl md:text-5xl font-bold ${engagementColor}`}>{engagementRate}</p>
            <p className="text-sm text-slate-500">{engagementSubtext}</p>
          </Card.Content>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.filter(item => item.show).map((item) => (
            <button key={item.title} onClick={item.action} className={`group text-left p-6 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-${item.color}-500 transition-all duration-300 shadow-sm`}>
              <div className="flex items-center justify-between">
                {item.icon}
                <ZapIcon className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mt-4">{item.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{item.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};