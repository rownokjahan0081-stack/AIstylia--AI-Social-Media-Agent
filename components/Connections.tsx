
import React, { useState, useEffect } from 'react';
import { Connection, Platform } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { FacebookIcon, InstagramIcon, CheckCircleIcon, LinkIcon, BotIcon, AlertTriangleIcon, RefreshCwIcon, ZapIcon, HelpCircleIcon, ArrowLeftIcon, SettingsIcon, CopyIcon } from './Icons';

// Let TypeScript know that the FB object will be available on the window
declare const FB: any;

interface ConnectionsProps {
    connections: Connection[];
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
}

export const Connections: React.FC<ConnectionsProps> = ({ connections, setConnections }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalStep, setModalStep] = useState<'grantPermission' | 'connecting' | 'selectAccounts' | 'noAccountsFound'>('grantPermission');
    const [fetchedAccounts, setFetchedAccounts] = useState<{id: string, name: string, type: Platform, accessToken: string}[]>([]);
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [isDevEnvironment, setIsDevEnvironment] = useState(false);
    const [useSimulation, setUseSimulation] = useState(false);
    const [view, setView] = useState<'list' | 'guide'>('list');
    
    // Copy states
    const [copiedUrl, setCopiedUrl] = useState(false);
    const [copiedToken, setCopiedToken] = useState(false);
    const [copiedCallback, setCopiedCallback] = useState(false);

    const currentUrl = typeof window !== 'undefined' ? window.location.origin + '/' : '';
    const productionUrl = 'https://www.aistylia.com/';
    const webhookUrl = `${productionUrl}api/webhook`;
    const verifyToken = 'social-agent-secret-123';

    useEffect(() => {
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

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(productionUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
    }

    const handleConnectClick = () => {
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

    const fetchUserAccounts = () => {
        if (typeof FB === 'undefined') {
            setModalStep('noAccountsFound');
            return;
        }

        FB.api(
            '/me/accounts',
            'GET',
            { fields: 'name,id,access_token,instagram_business_account{name,id}' },
            (response: any) => {
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
            }
        );
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

    const handleGrantPermission = (rerequest = false) => {
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

        if (typeof FB === 'undefined') {
             console.error("Facebook SDK not loaded");
             setTimeout(() => {
                setModalStep('noAccountsFound');
             }, 1000);
             return;
        }

        const params: any = {
            scope: 'public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish'
        };

        if (rerequest) {
            params.auth_type = 'rerequest';
        }

        FB.login(
            (response: any) => {
                if (response.authResponse) {
                    fetchUserAccounts();
                } else {
                    console.log('User cancelled login or did not fully authorize.', response);
                    setModalStep('noAccountsFound');
                }
            },
            params
        );
    };

    const handleResetAndReconnect = () => {
        setModalStep('connecting');
        
        // CRITICAL: FB.getAccessToken also fails on HTTP.
        if (useSimulation || isDevEnvironment || window.location.protocol !== 'https:') {
            runSimulation();
            return;
        }
        
        const performLogin = () => handleGrantPermission(true);

        if (typeof FB !== 'undefined' && FB.getAccessToken()) {
            // Try to revoke, but if it fails (token invalid), proceed to login anyway
            FB.api('/me/permissions', 'DELETE', (response: any) => {
                console.log('Permissions revoked response:', response);
                performLogin();
            });
        } else {
            performLogin();
        }
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
    };
    
    const metaConnections = connections.filter(c => c.platform === 'Facebook' || c.platform === 'Instagram');

    const renderModalContent = () => {
        switch(modalStep) {
            case 'grantPermission':
                return (
                    <div className="text-center p-8">
                        <div className="flex justify-center items-center mb-4 space-x-2">
                            <BotIcon className="w-12 h-12 text-slate-400" />
                            <LinkIcon className="w-6 h-6 text-slate-500" />
                            <FacebookIcon className="w-12 h-12 text-blue-500"/>
                        </div>
                        <Card.Title className="text-xl">AI Agent wants to connect to Facebook</Card.Title>
                        <p className="text-xs text-slate-500 mt-1">App ID: 1398822078509610</p>
                        
                        {isDevEnvironment && (
                             <div className="bg-amber-500/10 border border-amber-500/50 p-3 rounded-md my-4 text-left">
                                <p className="text-amber-400 text-sm font-semibold flex items-center">
                                    <AlertTriangleIcon className="w-4 h-4 mr-2" />
                                    HTTPS Required
                                </p>
                                <p className="text-slate-400 text-xs mt-1">
                                    Facebook Login is not supported on HTTP. The app has automatically switched to <strong>Demo Mode</strong>.
                                </p>
                            </div>
                        )}

                        <div className="text-left bg-slate-700/50 p-4 rounded-lg my-6 text-sm space-y-2">
                           <p className="flex items-start"><CheckCircleIcon className="w-4 h-4 mr-2 mt-1 text-emerald-400 flex-shrink-0"/> AI Agent will be able to read comments and messages.</p>
                           <p className="flex items-start"><CheckCircleIcon className="w-4 h-4 mr-2 mt-1 text-emerald-400 flex-shrink-0"/> AI Agent will be able to post content on your behalf.</p>
                        </div>

                        <div className="mb-6 flex justify-center">
                             <label className={`flex items-center cursor-pointer text-xs text-slate-400 hover:text-white transition-colors p-2 rounded hover:bg-slate-700/50 border border-transparent hover:border-slate-600 ${isDevEnvironment ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                <input 
                                    type="checkbox" 
                                    checked={useSimulation || isDevEnvironment} 
                                    onChange={e => !isDevEnvironment && toggleSimulation(e.target.checked)} 
                                    disabled={isDevEnvironment}
                                    className="h-4 w-4 rounded bg-slate-700 border-slate-600 text-sky-500 focus:ring-0 mr-2 disabled:opacity-50"
                                />
                                {isDevEnvironment ? 'Demo Mode Enforced (HTTPS Required)' : 'Enable Demo Mode (Simulate Connection)'}
                            </label>
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button onClick={() => handleGrantPermission(false)}>
                                {(useSimulation || isDevEnvironment) ? 'Start Simulation' : 'Continue with Facebook'}
                            </Button>
                            <Button onClick={closeModal} className="bg-slate-600 hover:bg-slate-700">Cancel</Button>
                        </div>
                    </div>
                );
            case 'connecting':
                 return (
                    <div className="p-10 flex flex-col items-center justify-center text-center h-80">
                        <BotIcon className="w-12 h-12 text-sky-400 animate-pulse" />
                        <h3 className="text-lg font-semibold mt-4">Connecting to Meta...</h3>
                        <p className="text-slate-400">Authenticating and fetching your accounts.</p>
                    </div>
                );
            case 'selectAccounts':
                 return (
                    <>
                       <Card.Header>
                            <Card.Title>Select Your Facebook & Instagram Accounts</Card.Title>
                            <p className="text-sm text-slate-400">Choose which accounts you want the AI agent to manage.</p>
                        </Card.Header>
                        <Card.Content className="space-y-2 max-h-60 overflow-y-auto">
                            {fetchedAccounts.map(account => (
                                <label key={account.id} className="flex items-center p-3 rounded-md bg-slate-700/50 hover:bg-slate-700 cursor-pointer">
                                    <input type="checkbox"
                                        checked={selectedAccounts.includes(account.id)}
                                        onChange={() => handleAccountSelection(account.id)}
                                        className="h-5 w-5 rounded text-sky-500 bg-slate-600 border-slate-500 focus:ring-sky-500"
                                    />
                                    <div className="ml-3">
                                      <span className="text-white font-medium">{account.name}</span>
                                      <div className="flex items-center text-xs text-slate-400">
                                        {account.type === 'Facebook' ? <FacebookIcon className="w-3 h-3 mr-1.5" /> : <InstagramIcon className="w-3 h-3 mr-1.5" />}
                                        {account.type}
                                      </div>
                                    </div>
                                </label>
                            ))}
                        </Card.Content>
                        <div className="p-6 pt-0 flex justify-end gap-3">
                            <Button onClick={closeModal} className="bg-slate-600 hover:bg-slate-700">Cancel</Button>
                            <Button onClick={handleConfirmMetaConnection} disabled={selectedAccounts.length === 0}>Connect {selectedAccounts.length} Account(s)</Button>
                        </div>
                    </>
                );
            case 'noAccountsFound':
                return (
                    <div className="text-center p-8 max-h-[80vh] overflow-y-auto">
                        <AlertTriangleIcon className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                        <Card.Title className="text-xl">Connection Issue Detected</Card.Title>
                        
                        <div className="text-left bg-slate-700/50 p-4 rounded-lg my-4 text-sm space-y-3">
                           <p className="text-slate-300 font-medium">Why is this happening?</p>
                           <ul className="list-disc list-inside text-slate-400 space-y-2 text-xs">
                                <li>
                                    <strong className="text-slate-200">HTTPS Required:</strong><br/> 
                                    Facebook Login is disabled on HTTP pages.
                                </li>
                                <li>
                                    <strong className="text-slate-200">"Feature Unavailable" Error:</strong><br/> 
                                    If you are an admin, ensure you are listed as a Tester in the Meta App Dashboard.
                                </li>
                                <li>
                                    <strong className="text-slate-200">No Pages Selected:</strong><br/>
                                    You might have clicked "Continue" without selecting pages. Try resetting below.
                                </li>
                           </ul>
                        </div>
                        
                        <div className="flex flex-col gap-3 mt-4">
                             <Button onClick={() => { toggleSimulation(true); runSimulation(); }} className="bg-purple-600 hover:bg-purple-700">
                                <ZapIcon className="w-4 h-4 mr-2" />
                                Enable Demo Mode & Retry
                            </Button>
                            <Button onClick={() => {
                                closeModal();
                                setView('guide');
                            }} className="bg-slate-600 hover:bg-slate-700 border border-slate-500">
                                <SettingsIcon className="w-4 h-4 mr-2" />
                                Open Setup Guide
                            </Button>
                            <Button onClick={handleResetAndReconnect} className="bg-amber-600 hover:bg-amber-700">
                                <RefreshCwIcon className="w-4 h-4 mr-2" />
                                Reset Permissions & Reconnect
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
                    <h1 className="text-4xl font-extrabold text-white tracking-tight">Connections</h1>
                    <p className="text-slate-400 mt-2">Integrate your social media accounts to activate the AI agent.</p>
                </div>
                <Button 
                    onClick={() => setView(view === 'list' ? 'guide' : 'list')}
                    className="bg-slate-700 hover:bg-slate-600 border border-slate-600"
                >
                    {view === 'list' ? <><HelpCircleIcon className="w-4 h-4 mr-2"/> Setup Guide</> : <><ArrowLeftIcon className="w-4 h-4 mr-2"/> Back to Connections</>}
                </Button>
            </header>
            
            {view === 'list' ? (
                <Card className="bg-slate-800/50">
                    <Card.Header>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center">
                                <FacebookIcon className="w-8 h-8 text-blue-500 -mr-2 z-10" />
                                <InstagramIcon className="w-8 h-8 text-pink-500" />
                            </div>
                            <Card.Title className="text-2xl">Meta</Card.Title>
                        </div>
                    </Card.Header>
                    <Card.Content className="flex-1 flex flex-col">
                        <p className="text-slate-400">Connect your Facebook Pages and Instagram Profiles to manage comments, messages, and posts.</p>
                        
                        {(useSimulation || isDevEnvironment) && (
                             <div className="mt-4 bg-purple-500/10 border border-purple-500/30 p-3 rounded-md flex items-start gap-3">
                                <ZapIcon className="w-5 h-5 text-purple-400 mt-0.5" />
                                <div>
                                    <p className="text-purple-300 text-sm font-semibold">Demo Mode Active</p>
                                    <p className="text-purple-400/70 text-xs">
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
                                        <div key={connection.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                {connection.platform === 'Facebook' ? <FacebookIcon className="w-5 h-5 text-blue-500" /> : <InstagramIcon className="w-5 h-5 text-pink-500" />}
                                                <div>
                                                    <p className="text-sm text-slate-200 font-medium">{connection.name}</p>
                                                    <p className="flex items-center text-emerald-400 text-xs"><CheckCircleIcon className="w-3 h-3 mr-1.5"/> Connected</p>
                                                </div>
                                            </div>
                                            <Button onClick={() => handleDisconnect(connection.id)} className="bg-red-500/80 hover:bg-red-500 h-8 px-3 text-xs">Disconnect</Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                            
                            <div className="text-center">
                                <Button onClick={handleConnectClick} className="w-full">
                                    {metaConnections.length > 0 ? 'Connect Another Meta Account' : <><LinkIcon className="w-4 h-4 mr-2" /> Connect with Meta</>}
                                </Button>
                                <div className="mt-4 flex justify-center items-center gap-2">
                                     <label className={`flex items-center cursor-pointer text-xs text-slate-500 hover:text-slate-300 transition-colors ${isDevEnvironment ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={useSimulation || isDevEnvironment} 
                                            onChange={e => !isDevEnvironment && toggleSimulation(e.target.checked)} 
                                            disabled={isDevEnvironment}
                                            className="h-3 w-3 rounded bg-slate-700 border-slate-600 text-sky-500 focus:ring-0 mr-2 disabled:opacity-50"
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
                    <Card className="bg-slate-800/50">
                        <Card.Header>
                            <Card.Title className="flex items-center gap-2">
                                <SettingsIcon className="w-6 h-6 text-sky-400" />
                                App Configuration Guide
                            </Card.Title>
                            <p className="text-slate-400">Configure your Meta App Dashboard correctly to enable connections.</p>
                        </Card.Header>
                        <Card.Content className="space-y-8">
                            
                            {/* Section 1: Webhooks */}
                            <section className="border-b border-slate-700 pb-6">
                                <h3 className="text-white font-semibold flex items-center gap-2 mb-2">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">1</span>
                                    Webhooks & Verify Token
                                </h3>
                                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                                    <p className="text-sm text-slate-300 mb-4">
                                        Go to the Meta Dashboard, select <strong>Webhooks</strong>, and subscribe to the <strong>Page</strong> object. Use the following settings:
                                    </p>
                                    
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Callback URL</label>
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 bg-slate-950 p-3 rounded border border-slate-700 text-sky-400 font-mono text-sm overflow-x-auto whitespace-nowrap">
                                                    {webhookUrl}
                                                </code>
                                                <Button onClick={() => {
                                                    navigator.clipboard.writeText(webhookUrl);
                                                    setCopiedCallback(true);
                                                    setTimeout(() => setCopiedCallback(false), 2000);
                                                }} className="bg-slate-700 hover:bg-slate-600 shrink-0 h-[46px]" title="Copy Callback URL">
                                                    {copiedCallback ? <CheckCircleIcon className="w-4 h-4 text-emerald-400" /> : <CopyIcon className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-semibold text-slate-500 uppercase mb-1 block">Verify Token</label>
                                            <div className="flex items-center gap-2">
                                                <code className="flex-1 bg-slate-950 p-3 rounded border border-slate-700 text-emerald-400 font-mono text-sm overflow-x-auto whitespace-nowrap">
                                                    {verifyToken}
                                                </code>
                                                <Button onClick={() => {
                                                    navigator.clipboard.writeText(verifyToken);
                                                    setCopiedToken(true);
                                                    setTimeout(() => setCopiedToken(false), 2000);
                                                }} className="bg-slate-700 hover:bg-slate-600 shrink-0 h-[46px]" title="Copy Verify Token">
                                                    {copiedToken ? <CheckCircleIcon className="w-4 h-4 text-emerald-400" /> : <CopyIcon className="w-4 h-4" />}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-xs text-slate-400 mt-3">
                                        <strong>Note:</strong> Ensure your app is deployed to <code>{productionUrl}</code> so Meta can reach the Callback URL.
                                    </p>
                                </div>
                            </section>

                            {/* Section 2: Facebook Login */}
                            <section className="border-b border-slate-700 pb-6">
                                <h3 className="text-white font-semibold flex items-center gap-2 mb-2">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold">2</span>
                                    Facebook Login Settings
                                </h3>
                                <p className="text-sm text-slate-400 mb-3">
                                    In the Meta Dashboard, go to <strong>Facebook Login &gt; Settings</strong>. Add the following URL to "Valid OAuth Redirect URIs":
                                </p>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 bg-slate-950 p-3 rounded border border-slate-700 text-slate-300 font-mono text-sm overflow-x-auto whitespace-nowrap">
                                        {productionUrl}
                                    </code>
                                    <Button onClick={handleCopyUrl} className="bg-slate-700 hover:bg-slate-600 shrink-0" title="Copy URL">
                                        {copiedUrl ? <CheckCircleIcon className="w-4 h-4 text-emerald-400" /> : <CopyIcon className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </section>

                            {/* Section 3: Testers */}
                            <section>
                                <h3 className="text-white font-semibold flex items-center gap-2 mb-2">
                                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold">3</span>
                                    Development Mode & Testers
                                </h3>
                                <p className="text-sm text-slate-400 mb-4">
                                    While in Development Mode, you must add users as <strong>Testers</strong> to allow them to log in.
                                </p>
                                <div className="space-y-3 bg-slate-700/30 p-4 rounded-lg">
                                    <div className="flex gap-3 items-start">
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-600 text-slate-300 flex items-center justify-center text-xs font-bold">A</div>
                                        <p className="text-sm text-slate-300">Go to <strong>App Roles &gt; Roles</strong> in the dashboard.</p>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-600 text-slate-300 flex items-center justify-center text-xs font-bold">B</div>
                                        <p className="text-sm text-slate-300">Scroll to <strong>Testers</strong> and click "Add People".</p>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-600 text-slate-300 flex items-center justify-center text-xs font-bold">C</div>
                                        <p className="text-sm text-slate-300">Enter your Facebook ID/Name.</p>
                                    </div>
                                    <div className="flex gap-3 items-start">
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">!</div>
                                        <p className="text-sm text-slate-300">You MUST accept the invite at <a href="https://developers.facebook.com/requests" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">developers.facebook.com/requests</a>.</p>
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
                    <Card className="w-full max-w-lg bg-slate-800">
                       {renderModalContent()}
                    </Card>
                </div>
            )}
        </div>
    );
};
