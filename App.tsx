
import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { Inbox } from './components/Inbox';
import { ContentPlanner } from './components/ContentPlanner';
import { Analytics } from './components/Analytics';
import { Settings } from './components/Settings';
import { ContentLibrary } from './components/ContentLibrary';
import { Auth } from './components/Auth';
import { Onboarding } from './components/Onboarding';
import { Connections } from './components/Connections';
import { Trends } from './components/Trends';
import { DashboardIcon, InboxIcon, Edit3Icon, BarChartIcon, BotIcon, SettingsIcon, LibraryIcon, LogOutIcon, LinkIcon, TrendingUpIcon, MenuIcon, XIcon } from './components/Icons';
import { UserSettings, Connection, Page } from './types';
import { subscribeToAuthChanges, logoutUser } from './services/authService';

const App: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    // Initialize Local Data if available
    const userSettings = localStorage.getItem('social-agent-settings');
    const userConnections = localStorage.getItem('social-agent-connections');

    if (userConnections) {
      setConnections(JSON.parse(userConnections));
    }
    if (userSettings) {
      setSettings(JSON.parse(userSettings));
    }

    // Real Auth Listener
    const unsubscribe = subscribeToAuthChanges((firebaseUser) => {
      if (firebaseUser) {
        setUser({
            email: firebaseUser.email,
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL
        });
        
        // Check if we have settings for this user, if not -> onboarding
        // Note: we re-read from localStorage here to ensure we have the latest if it was set during login
        const currentSettings = localStorage.getItem('social-agent-settings');
        if (!currentSettings) {
             setIsOnboarding(true);
        } else {
             setIsOnboarding(false);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (userData: any) => {
    setUser(userData);
    
    // Special handling for Guest User to inject mock data
    if (userData.uid === 'guest-user') {
        const mockSettings: UserSettings = {
            businessName: "Coffee Haven",
            businessDescription: "Artisanal coffee shop serving locally sourced blends and homemade pastries.",
            targetAudience: "Coffee enthusiasts, remote workers, and local community members.",
            brandVoice: "Warm, Inviting, Passionate, Community-focused",
            contentPillars: ["Daily Brews", "Barista Spotlight", "Community Events", "Coffee Education", "Behind the Scenes"],
            autoPost: false,
            autoReply: false
        };
        
        const mockConnections: Connection[] = [
             { platform: 'Facebook', id: 'mock-fb-1', name: 'Coffee Haven FB', status: 'connected', accessToken: 'mock-token' },
             { platform: 'Instagram', id: 'mock-ig-1', name: 'coffee_haven_official', status: 'connected', accessToken: 'mock-token' }
        ];
        
        setSettings(mockSettings);
        setConnections(mockConnections);
        
        // Persist mock data so it survives a refresh
        localStorage.setItem('social-agent-settings', JSON.stringify(mockSettings));
        localStorage.setItem('social-agent-connections', JSON.stringify(mockConnections));
        
        setIsOnboarding(false);
        return;
    }

    // Normal user flow
    const userSettings = localStorage.getItem('social-agent-settings');
    if (!userSettings) {
      setIsOnboarding(true);
    } else {
      setSettings(JSON.parse(userSettings));
      setIsOnboarding(false);
    }
  };

  const handleOnboardingComplete = (settingsData: UserSettings) => {
    localStorage.setItem('social-agent-settings', JSON.stringify(settingsData));
    setSettings(settingsData);
    setIsOnboarding(false);
    setActivePage('connections'); // Guide user to connect accounts after onboarding
  };
  
  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
  };

  const handlePageChange = (page: Page) => {
    setActivePage(page);
    setIsMobileMenuOpen(false);
  };

  const renderPage = () => {
    if (!settings) return <div className="text-center p-10">Loading settings...</div>;
    
    switch (activePage) {
      case 'dashboard':
        return <Dashboard setActivePage={handlePageChange} settings={settings} />;
      case 'inbox':
        return <Inbox settings={settings} connections={connections} setActivePage={handlePageChange} />;
      case 'content':
        return <ContentPlanner settings={settings} connections={connections} />;
      case 'analytics':
        return <Analytics settings={settings} />;
      case 'library':
        return <ContentLibrary />;
      case 'trends':
        return <Trends settings={settings} />;
      case 'settings':
        return <Settings settings={settings} setSettings={setSettings} />;
      case 'connections':
        return <Connections connections={connections} setConnections={setConnections} />;
      default:
        return <Dashboard setActivePage={handlePageChange} settings={settings} />;
    }
  };

  const NavItem = ({ page, icon, label }: { page: Page; icon: React.ReactElement; label: string }) => (
    <button
      onClick={() => handlePageChange(page)}
      className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
        activePage === page
          ? 'bg-sky-500 text-white'
          : 'text-slate-400 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {icon}
      <span className="ml-3">{label}</span>
    </button>
  );
  
  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center bg-slate-900 text-white">Loading Agent...</div>;
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  if (isOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="flex h-screen bg-slate-800 overflow-hidden">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar - responsive drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 flex-shrink-0 bg-slate-900 p-4 border-r border-slate-700 flex flex-col transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
              <BotIcon className="w-8 h-8 text-sky-400"/>
              <h1 className="text-xl font-bold ml-2 text-white">AI Agent</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="mb-6 px-2 flex items-center gap-3 pb-6 border-b border-slate-800">
           {user.photoURL ? (
               <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full border border-slate-700" />
           ) : (
               <div className="w-10 h-10 rounded-full bg-sky-600 flex items-center justify-center text-white font-bold">
                   {user.email?.charAt(0).toUpperCase()}
               </div>
           )}
           <div className="overflow-hidden">
               <p className="text-sm font-medium text-white truncate">{user.displayName || 'User'}</p>
               <p className="text-xs text-slate-500 truncate">{user.email}</p>
           </div>
        </div>

        <nav className="space-y-2 flex-1 overflow-y-auto">
          <NavItem page="dashboard" icon={<DashboardIcon className="w-5 h-5" />} label="Dashboard" />
          <NavItem page="inbox" icon={<InboxIcon className="w-5 h-5" />} label="Inbox" />
          <NavItem page="content" icon={<Edit3Icon className="w-5 h-5" />} label="Content Planner" />
          <NavItem page="library" icon={<LibraryIcon className="w-5 h-5" />} label="Content Library" />
          <NavItem page="analytics" icon={<BarChartIcon className="w-5 h-5" />} label="Analytics" />
          <NavItem page="trends" icon={<TrendingUpIcon className="w-5 h-5" />} label="Trends" />
          <NavItem page="connections" icon={<LinkIcon className="w-5 h-5" />} label="Connections" />
          <NavItem page="settings" icon={<SettingsIcon className="w-5 h-5" />} label="Settings" />
        </nav>
        <div className="mt-auto pt-4">
          <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
            >
              <LogOutIcon className="w-5 h-5" />
              <span className="ml-3">Log Out</span>
            </button>
          <div className="mt-4 text-center text-slate-500 text-xs">
            <p>&copy; 2024 Social AI Inc.</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-slate-900 border-b border-slate-700 p-4 flex items-center gap-4 z-30">
           <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-400 hover:text-white">
             <MenuIcon className="w-6 h-6" />
           </button>
           <h1 className="text-lg font-bold text-white">AI Agent</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default App;
