
import React, { useState, useEffect } from 'react';
import { Connection, Platform, Page } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Form';
import { FacebookIcon, InstagramIcon, CheckCircleIcon, LinkIcon, BotIcon, AlertTriangleIcon, RefreshCwIcon, ZapIcon, HelpCircleIcon, ArrowLeftIcon, SettingsIcon, CopyIcon } from './Icons';
import { loginToFacebook, getFacebookAccounts, revokePermissions, getStoredAppId, setStoredAppId } from '../services/facebookService';

interface ConnectionsProps {
    connections: Connection[];
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
    setActivePage: (page: Page) => void;
}

export const Connections: React.FC<ConnectionsProps> = ({ connections, setConnections, setActivePage }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalStep, setModalStep] = useState<'grantPermission' | 'connecting' | 'selectAccounts' | 'noAccountsFound'>('grantPermission');
    const [fetchedAccounts, setFetchedAccounts] = useState<{id: string, name: string, type: Platform, accessToken: string}[]>([]);
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [isDevEnvironment, setIsDevEnvironment] = useState(false);
    const [useSimulation, setUseSimulation] = useState(false);
    const [view, setView] = useState<'list' | 'guide'>('list');
    
    // Config State
    const [configAppId, setConfigAppId] = useState('');
    const [isAppIdSaved, setIsAppIdSaved] = useState(false);

    // Copy states
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [copiedToken, setCopiedToken] = useState(false);
    const [copiedCallback, setCopiedCallback] = useState(false);

    const currentUrl = typeof window !== 'undefined' ? window.location.origin + '/' : '';
    const productionUrl = 'https://www.aistylia.com/';
    const webhookUrl = `${productionUrl}api/webhook`;
    const verifyToken = 'social-agent-secret-123';

    useEffect(() => {
        // Load current App ID
        setConfigAppId(getStoredAppId());

        // Facebook Login requires HTTPS. If on HTTP, we flag as Dev/HTTP environment and FORCE simulation.
        if (window.location.protocol !== 'https:') {
            console.warn("App is running on HTTP. Facebook Login requires HTTPS. Enforcing Simulation Mode.");
            setIsDevEnvironment(true);
            setUseSimulation(true); 
        } else {
            const savedSim = localStorage.getItem('social-agent-simulation-mode');
            if (savedSim) {
                setUseSimulation(savedSim === 'true');
            }
        }
    }, []);

    const toggleSimulation = (checked: boolean) => {
        setUseSimulation(checked);
        localStorage.setItem('social-agent-simulation-mode', String(checked));
    }

    const handleSaveAppId = () => {
        setStoredAppId(configAppId);
        setIsAppIdSaved(true);
        // Force reload to re-init SDK
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(productionUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    }

    const handleConnectClick = () => {
        const storedId = getStoredAppId();
        if (!storedId && !useSimulation && !isDevEnvironment) {
            // If no ID and trying to use real connection, warn user
            alert("Please configure your Facebook App ID in the Configuration Guide tab first.");
            setView('guide');
            return;
        }

        setModalStep('grantPermission');
        setFetchedAccounts([]);
        setSelectedAccounts([]);
        setIsModalOpen(true);
    };
    
    const closeModal = () => {
        setIsModalOpen(false);
        setFetchedAccounts([]);
        setSelectedAccounts([]);
    }

    const handleDisconnect = (connectionId: string) => {
        const updatedConnections = connections.filter(c => c.id !== connectionId);
        setConnections(updatedConnections);
        localStorage.setItem('social-agent-connections', JSON.stringify(updatedConnections));
    };

    const fetchUserAccounts = async () => {
        try {
            const response = await getFacebookAccounts();
            if (response && !response.error) {
                if (response.data && response.data.length > 0) {
                    const accounts: {id: string, name: string, type: Platform, accessToken: string}[] = [];
                    
                    response.data.forEach((page: any) => {
                        accounts.push({
                            id: page.id,
                            name: page.name,
                            type: 'Facebook',
                            accessToken: page.access_token,
                        });

                        if (page.instagram_business_account) {
                            accounts.push({
                                id: page.instagram_business_account.id,
                                name: `${page.instagram_business_account.name} (Instagram)`,
                                type: 'Instagram',
                                accessToken: page.access_token, // Instagram API uses the Page's access token
                            });
                        }
                    });

                    setFetchedAccounts(accounts);
                    setModalStep('selectAccounts');
                } else {
                    setModalStep('noAccountsFound');
                }
            } else {
                console.error('Error fetching accounts:', response.error);
                setModalStep('noAccountsFound'); 
            }
        } catch (error) {
            console.error('API Error:', error);
            setModalStep('noAccountsFound');
        }
    };

    const runSimulation = () => {
         setTimeout(() => {
            const mockAccounts = [
                { id: `mock-fb-${Date.now()}`, name: 'Demo Coffee Shop', type: 'Facebook' as Platform, accessToken: 'mock-token-fb' },
                { id: `mock-ig-${Date.now()}`, name: 'demo_coffee_official (Instagram)', type: 'Instagram' as Platform, accessToken: 'mock-token-ig' }
            ];
            setFetchedAccounts(mockAccounts);
            setModalStep('selectAccounts');
         }, 1000);
    };

    const handleGrantPermission = async (rerequest = false) => {
        setModalStep('connecting');

        // CRITICAL: FB.login fails on HTTP. Guard against this by forcing simulation.
        if (useSimulation || isDevEnvironment || window.location.protocol !== 'https:') {
             if (window.location.protocol !== 'https:') {
                 console.warn("Facebook Login is not supported on HTTP. Forcing simulation mode.");
             }
             console.log("Using Simulation Mode");
             runSimulation();
             return;
        }

        try {
            const response = await loginToFacebook(rerequest);
            if (response.authResponse) {
                fetchUserAccounts();
            } else {
                console.log('User cancelled login or did not fully authorize.', response);
                setModalStep('noAccountsFound');
            }
        } catch (error: any) {
            console.error("Login Failed:", error);
            if (error.message === "App ID not configured") {
                alert("App ID is missing. Please configure it in the guide.");
                closeModal();
                setView('guide');
            } else {
                setModalStep('noAccountsFound');
            }
        }
    };

    const handleResetAndReconnect = async () => {
        setModalStep('connecting');
        
        if (useSimulation || isDevEnvironment || window.location.protocol !== 'https:') {
            runSimulation();
            return;
        }
        
        // Try to revoke permissions then re-login
        try {
            await revokePermissions();
        } catch (e) {
            console.warn("Revoke failed, proceeding to login", e);
        }
        handleGrantPermission(true);
    };

    const handleAccountSelection = (accountId: string) => {
        setSelectedAccounts(prev => 
            prev.includes(accountId) 
                ? prev.filter(id => id !== accountId)
                : [...prev, accountId]
        );
    };

    const handleConfirmMetaConnection = () => {
        if (selectedAccounts.length === 0) return;

        const newConnectionsToAdd = selectedAccounts.map((accountId): Connection | null => {
            const account = fetchedAccounts.find(p => p.id === accountId);
            if (!account) return null;
            return {
                platform: account.type,
                id: account.id,
                name: account.name,
                status: 'connected',
                accessToken: account.accessToken,
            };
        }).filter((c): c is Connection => c !== null && !connections.some(existing => existing.id === c.id));

        const updatedConnections = [...connections, ...newConnectionsToAdd];
        setConnections(updatedConnections);
        localStorage.setItem('social-agent-connections', JSON.stringify(updatedConnections));
        
        closeModal();
        setActivePage('dashboard');
    };
    
    const metaConnections = connections.filter(c => c.platform === 'Facebook' || c.platform === 'Instagram');

    const renderModalContent = () => {
        switch(modalStep) {
            case 'grantPermission':
                return (
                    <div className="text-center p-8">
                        <div className="flex justify-center items-center mb-4 space-x-2">
                            <BotIcon className="w-12 h-12 text-slate-400" />
                            <LinkIcon className="w-6 h-6 text-slate-400" />
                            <FacebookIcon className="w-12 h-12 text-blue-600"/>
                        </div>
                        <Card.Title className="text-xl">AI Agent wants to connect to Facebook</Card.Title>
                        <p className="text-xs text-slate-500 mt-1">App ID: {getStoredAppId() || 'Not Configured'}</p>
                        
                        {isDevEnvironment && (
                             <div className="bg-amber-50 border border-amber-200 p-3 rounded-md my-4 text-left">
                                <p className="text-amber-600 text-sm font-semibold flex items-center">
                                    <AlertTriangleIcon className="w-4 h-4 mr-2" />
                                    HTTPS Required
                                </p>
                                <p className="text-slate-500 text-xs mt-1">
                                    Facebook Login is not supported on HTTP. The app has automatically switched to <strong>Demo Mode</strong>.
                                </p>
                            </div>
                        )}

                        <div className="text-left bg-slate-50 p-4 rounded-lg my-6 text-sm space-y-2 border border-slate-200">
                           <p className="flex items-start"><CheckCircleIcon className="w-4 h-4 mr-2 mt-1 text-emerald-500 flex-shrink-0"/> AI Agent will be able to read comments and messages.</p>
                           <p className="flex items-start"><CheckCircleIcon className="w-4 h-4 mr-2 mt-1 text-emerald-500 flex-shrink-0"/> AI Agent will be able to post content on your behalf.</p>
                        </div>

                        <div className="mb-6 flex justify-center">
                             <label className={`flex items-center cursor-pointer text-xs text-slate-500 hover:text-slate-700 transition-colors p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-200 ${isDevEnvironment ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                <input 
                                    type="checkbox" 
                                    checked={useSimulation || isDevEnvironment} 
                                    onChange={e => !isDevEnvironment && toggleSimulation(e.target.checked)} 
                                    disabled={isDevEnvironment}
                                    className="h-4 w-4 rounded bg-white border-slate-300 text-indigo-600 focus:ring-0 mr-2 disabled:opacity-50"
                                />
                                {isDevEnvironment ? 'Demo Mode Enforced (HTTPS Required)' : 'Enable Demo Mode (Simulate Connection)'}
                            </label>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button onClick={() => handleGrantPermission(false)}>
                                {(useSimulation || isDevEnvironment) ? 'Start Simulation' : 'Continue with Facebook'}
                            </Button>
                            <Button onClick={closeModal} className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50">Cancel</Button>
                        </div>
                    </div>
                );
            case 'connecting':
                 return (
                    <div className="p-10 flex flex-col items-center justify-center text-center h-80">
                        <BotIcon className="w-12 h-12 text-indigo-600 animate-pulse" />
                        <h3 className="text-lg font-semibold mt-4 text-slate-900">Connecting to Meta...</h3>
                        <p className="text-slate-500">Authenticating and fetching your accounts.</p>
                    </div>
                );
            case 'selectAccounts':
                 return (
                    <>
                       <Card.Header>
                            <Card.Title>Select Your Facebook & Instagram Accounts</Card.Title>
                            <p className="text-sm text-slate-500">Choose which accounts you want the AI agent to manage.</p>
                        </Card.Header>
                        <Card.Content className="space-y-2 max-h-60 overflow-y-auto">
                            {fetchedAccounts.map(account => (
                                <label key={account.id} className="flex items-center p-3 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer">
                                    <input type="checkbox"
                                        checked={selectedAccounts.includes(account.id)}
                                        onChange={() => handleAccountSelection(account.id)}
                                        className="h-5 w-5 rounded text-indigo-600 bg-white border-slate-300 focus:ring-indigo-600"
                                    />
                                    <div className="ml-3">
                                      <span className="text-slate-900 font-medium">{account.name}</span>
                                      <div className="flex items-center text-xs text-slate-500">
                                        {account.type === 'Facebook' ? <FacebookIcon className="w-3 h-3 mr-1.5" /> : <InstagramIcon className="w-3 h-3 mr-1.5" />}
                                        {account.type}
                                      </div>
                                    </div>
                                </label>
                            ))}
                        </Card.Content>
                        <div className="p-6 pt-0 flex justify-end gap-3">
                            <Button onClick={closeModal} className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50">Cancel</Button>
                            <Button onClick={handleConfirmMetaConnection} disabled={selectedAccounts.length === 0}>Connect {selectedAccounts.length} Account(s)</Button>
                        </div>
                    </>
                );
            case 'noAccountsFound':
                return (
                    <div className="text-center p-8 max-h-[80vh] overflow-y-auto">
                        <AlertTriangleIcon className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                        <Card.Title className="text-xl">Connection Issue Detected</Card.Title>
                        
                        <div className="flex flex-col gap-3 mt-4">
                             <Button onClick={() => { toggleSimulation(true); runSimulation(); }} className="bg-violet-600 hover:bg-violet-700">
                                <ZapIcon className="w-4 h-4 mr-2" />
                                Enable Demo Mode & Retry
                            </Button>
                            <Button onClick={handleResetAndReconnect} className="bg-amber-500 hover:bg-amber-600 text-white">
                                <RefreshCwIcon className="w-4 h-4 mr-2" />
                                Reset Permissions & Reconnect
                            </Button>
                            <Button onClick={closeModal} className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50">
                                Cancel
                            </Button>
                        </div>
                    </div>
                );
        }
        return null;
    }

    return (
        <div className="animate-fade-in">
            <header className="mb-8 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Connections</h1>
                    <p className="text-slate-600 mt-2">Integrate your social media accounts to activate the AI agent.</p>
                </div>
            </header>
            
            {view === 'list' ? (
                <Card>
                    <Card.Header>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center">
                                    <FacebookIcon className="w-8 h-8 text-blue-600 -mr-2 z-10" />
                                    <InstagramIcon className="w-8 h-8 text-pink-600" />
                                </div>
                                <Card.Title className="text-2xl">Meta</Card.Title>
                            </div>
                            <button 
                                onClick={() => setView('guide')}
                                className="text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1"
                            >
                                <SettingsIcon className="w-4 h-4" />
                                Configuration Guide
                            </button>
                        </div>
                    </Card.Header>
                    <Card.Content className="flex-1 flex flex-col">
                        <p className="text-slate-500">Connect your Facebook Pages and Instagram Profiles to manage comments, messages, and posts.</p>
                        
                        {(useSimulation || isDevEnvironment) && (
                             <div className="mt-4 bg-violet-50 border border-violet-200 p-3 rounded-md flex items-start gap-3">
                                <ZapIcon className="w-5 h-5 text-violet-600 mt-0.5" />
                                <div>
                                    <p className="text-violet-700 text-sm font-semibold">Demo Mode Active</p>
                                    <p className="text-violet-600/70 text-xs">
                                        {isDevEnvironment 
                                            ? "Enforced because Facebook Login requires HTTPS."
                                            : "You are using simulated connections. Real Facebook data will not be loaded."
                                        }
                                    </p>
                                </div>
                             </div>
                        )}

                        <div className="mt-6 flex-1 flex flex-col justify-end">
                        {metaConnections.length > 0 && (
                                <div className="space-y-2 mb-4">
                                    {metaConnections.map(connection => (
                                        <div key={connection.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                {connection.platform === 'Facebook' ? <FacebookIcon className="w-5 h-5 text-blue-600" /> : <InstagramIcon className="w-5 h-5 text-pink-600" />}
                                                <div>
                                                    <p className="text-sm text-slate-900 font-medium">{connection.name}</p>
                                                    <p className="flex items-center text-emerald-600 text-xs"><CheckCircleIcon className="w-3 h-3 mr-1.5"/> Connected</p>
                                                </div>
                                            </div>
                                            <Button onClick={() => handleDisconnect(connection.id)} className="bg-white border border-red-200 text-red-600 hover:bg-red-50 h-8 px-3 text-xs">Disconnect</Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <div className="text-center">
                                <Button onClick={handleConnectClick} className="w-full">
                                    {metaConnections.length > 0 ? 'Connect Another Meta Account' : <><LinkIcon className="w-4 h-4 mr-2" /> Connect with Meta</>}
                                </Button>
                                <div className="mt-4 flex justify-center items-center gap-2">
                                     <label className={`flex items-center cursor-pointer text-xs text-slate-500 hover:text-slate-700 transition-colors ${isDevEnvironment ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={useSimulation || isDevEnvironment} 
                                            onChange={e => !isDevEnvironment && toggleSimulation(e.target.checked)} 
                                            disabled={isDevEnvironment}
                                            className="h-3 w-3 rounded bg-white border-slate-300 text-indigo-600 focus:ring-0 mr-2 disabled:opacity-50"
                                        />
                                        {isDevEnvironment ? 'Demo Mode Enforced' : 'Force Demo Mode'}
                                    </label>
                                </div>
                            </div>
                        </div>
                    </Card.Content>
                </Card>
            ) : (
                <div className="space-y-6">
                    <Card>
                        <Card.Header>
                            <Card.Title className="flex items-center gap-2">
                                <SettingsIcon className="w-6 h-6 text-indigo-600" />
                                App Configuration Guide
                            </Card.Title>
                            <p className="text-slate-500">Configure your Meta App Dashboard correctly to enable connections.</p>
                        </Card.Header>
                        <Card.Content className="space-y-8">
                            
                            {/* Section 0: App ID Input */}
                            <section className="border-b border-slate-200 pb-6">
                                <h3 className="text-slate-900 font-semibold flex items-center gap-2 mb-2">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold">1</span>
                                    Facebook App ID
                                </h3>
                                <p className="text-sm text-slate-500 mb-3">
                                    Enter the App ID from your Facebook Developers dashboard. This allows the login button to work on your specific domain.
                                </p>
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1">
                                        <Input 
                                            label="App ID" 
                                            value={configAppId} 
                                            onChange={e => setConfigAppId(e.target.value)} 
                                            placeholder="e.g. 1398822078509610" 
                                        />
                                    </div>
                                    <Button onClick={handleSaveAppId} className={isAppIdSaved ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                                        {isAppIdSaved ? "Saved & Reloading..." : "Save & Reload"}
                                    </Button>
                                </div>
                            </section>

                            {/* Section 1: Webhooks */}
                            <section className="border-b border-slate-200 pb-6">
                                <h3 className="text-slate-900 font-semibold flex items-center gap-2 mb-2">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold">2</span>
                                    Webhooks & Verify Token
                                </h3>
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <p className="text-sm text-slate-600 mb-4">
                                        Go to the Meta Dashboard, select <strong>Webhooks</strong>, and subscribe to the <strong>Page</strong> object. Use the following settings:
                                    </p>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Callback URL</label>
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 bg-slate-100 p-3 rounded border border-slate-200 text-indigo-600 font-mono text-sm overflow-x-auto whitespace-nowrap">
                                                    {webhookUrl}
                                                </code>
                                                <Button onClick={() => {
                                                    navigator.clipboard.writeText(webhookUrl);
                                                    setCopiedCallback(true);
                                                    setTimeout(() => setCopiedCallback(false), 2000);
                                                }} className="bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 shrink-0 h-[46px]" title="Copy Callback URL">
                                                    {copiedCallback ? <CheckCircleIcon className="w-4 h-4 text-emerald-500" /> : <CopyIcon className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Verify Token</label>
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 bg-slate-100 p-3 rounded border border-slate-200 text-emerald-600 font-mono text-sm overflow-x-auto whitespace-nowrap">
                                                    {verifyToken}
                                                </code>
                                                <Button onClick={() => {
                                                    navigator.clipboard.writeText(verifyToken);
                                                    setCopiedToken(true);
                                                    setTimeout(() => setCopiedToken(false), 2000);
                                                }} className="bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 shrink-0 h-[46px]" title="Copy Verify Token">
                                                    {copiedToken ? <CheckCircleIcon className="w-4 h-4 text-emerald-500" /> : <CopyIcon className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-xs text-slate-500 mt-3">
                                        <strong>Note:</strong> Ensure your app is deployed to <code>{productionUrl}</code> so Meta can reach the Callback URL.
                                    </p>
                                </div>
                            </section>

                            {/* Section 2: Facebook Login */}
                            <section className="border-b border-slate-200 pb-6">
                                <h3 className="text-slate-900 font-semibold flex items-center gap-2 mb-2">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold">3</span>
                                    Facebook Login Settings
                                </h3>
                                <p className="text-sm text-slate-500 mb-3">
                                    In the Meta Dashboard, go to <strong>Facebook Login &gt; Settings</strong>. Add the following URL to "Valid OAuth Redirect URIs":
                                </p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 bg-slate-100 p-3 rounded border border-slate-200 text-slate-700 font-mono text-sm overflow-x-auto whitespace-nowrap">
                                        {productionUrl}
                                    </code>
                                    <Button onClick={handleCopyUrl} className="bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 shrink-0" title="Copy URL">
                                        {copiedUrl ? <CheckCircleIcon className="w-4 h-4 text-emerald-500" /> : <CopyIcon className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </section>

                            {/* Section 3: Testers */}
                            <section>
                                <h3 className="text-slate-900 font-semibold flex items-center gap-2 mb-2">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold">4</span>
                                    Development Mode & Testers
                                </h3>
                                <p className="text-sm text-slate-500 mb-4">
                                    While in Development Mode, you must add users as <strong>Testers</strong> to allow them to log in.
                                </p>
                                <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                    <div className="flex gap-3 items-start">
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">A</div>
                                        <p className="text-sm text-slate-600">Go to <strong>App Roles &gt; Roles</strong> in the dashboard.</p>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">B</div>
                                        <p className="text-sm text-slate-600">Scroll to <strong>Testers</strong> and click "Add People".</p>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">C</div>
                                        <p className="text-sm text-slate-600">Enter your Facebook ID/Name.</p>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">!</div>
                                        <p className="text-sm text-slate-600">You MUST accept the invite at <a href="https://developers.facebook.com/requests" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">developers.facebook.com/requests</a>.</p>
                                    </div>
                                </div>
                            </section>
                        </Card.Content>
                        <div className="p-6 pt-0 flex justify-end">
                            <Button onClick={() => setView('list')}>I've configured this, let's connect</Button>
                        </div>
                    </Card>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast">
                    <Card className="w-full max-w-lg">
                       {renderModalContent()}
                    </Card>
                </div>
            )}
        </div>
    );
};
