
import React from 'react';
import { Card } from './ui/Card';
import { InboxIcon, Edit3Icon, BarChartIcon, ZapIcon } from './Icons';
import { UserSettings, Page } from '../types';

interface DashboardProps {
  setActivePage: (page: Page) => void;
  settings: UserSettings;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActivePage, settings }) => {

  const quickActions = [
    {
      title: 'Review Inbox',
      description: 'Check new messages and approve replies.',
      icon: <InboxIcon className="w-8 h-8 text-sky-400" />,
      action: () => setActivePage('inbox'),
      color: 'sky'
    },
    {
      title: 'Manage Schedule',
      description: 'View and approve upcoming posts.',
      icon: <Edit3Icon className="w-8 h-8 text-emerald-400" />,
      action: () => setActivePage('content'),
      color: 'emerald'
    },
    {
      title: 'View Analytics',
      description: 'Analyze your social media performance.',
      icon: <BarChartIcon className="w-8 h-8 text-amber-400" />,
      action: () => setActivePage('analytics'),
      color: 'amber'
    },
  ];

  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">AI Agent Dashboard</h1>
        <p className="text-slate-400 mt-2 text-sm md:text-base">Your autonomous social media manager for <span className="text-sky-400 font-semibold">{settings.businessName}</span> is online.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="bg-slate-800/50">
          <Card.Header>
            <Card.Title>Auto-Reply Status</Card.Title>
          </Card.Header>
          <Card.Content>
            <p className={`text-4xl md:text-5xl font-bold ${settings.autoReply ? 'text-emerald-400' : 'text-amber-400'}`}>{settings.autoReply ? 'Active' : 'Paused'}</p>
            <p className="text-sm text-slate-400">{settings.autoReply ? 'Replies are being sent automatically.' : 'Requires manual approval.'}</p>
          </Card.Content>
        </Card>
        <Card className="bg-slate-800/50">
          <Card.Header>
            <Card.Title>Auto-Post Status</Card.Title>
          </Card.Header>
          <Card.Content>
             <p className={`text-4xl md:text-5xl font-bold ${settings.autoPost ? 'text-emerald-400' : 'text-amber-400'}`}>{settings.autoPost ? 'Active' : 'Paused'}</p>
            <p className="text-sm text-slate-400">{settings.autoPost ? 'Posts are published automatically.' : 'Requires manual approval.'}</p>
          </Card.Content>
        </Card>
        <Card className="bg-slate-800/50">
          <Card.Header>
            <Card.Title>Engagement Rate</Card.Title>
          </Card.Header>
          <Card.Content>
            <p className="text-4xl md:text-5xl font-bold text-emerald-400">4.7%</p>
            <p className="text-sm text-slate-400">Up 0.5% from last week</p>
          </Card.Content>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((item) => (
            <button key={item.title} onClick={item.action} className={`group text-left p-6 rounded-xl bg-slate-800/50 hover:bg-slate-800/80 border border-slate-700 hover:border-${item.color}-500 transition-all duration-300`}>
              <div className="flex items-center justify-between">
                {item.icon}
                <ZapIcon className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-white mt-4">{item.title}</h3>
              <p className="text-sm text-slate-400 mt-1">{item.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
