
import React, { useState, useEffect } from 'react';
import { Connection, Platform, Page } from '../types';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { FacebookIcon, InstagramIcon, WhatsAppIcon, CheckCircleIcon, LinkIcon, BotIcon, AlertTriangleIcon, RefreshCwIcon, ZapIcon } from './Icons';
import { loginToFacebook, getFacebookAccounts, getWhatsAppBusinessAccounts, revokePermissions } from '../services/facebookService';

interface ConnectionsProps {
    connections: Connection[];
    setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
    setActivePage: (page: Page) => void;
}

export const Connections: React.FC<ConnectionsProps> = ({ connections, setConnections, setActivePage }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [connectionType, setConnectionType] = useState<'meta' | 'whatsapp'>('meta');
    const [modalStep, setModalStep] = useState<'grantPermission' | 'connecting' | 'selectAccounts' | 'noAccountsFound'>('grantPermission');
    const [fetchedAccounts, setFetchedAccounts] = useState<{id: string, name: string, type: Platform, accessToken: string}[]>([]);
    const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
    const [isDevEnvironment, setIsDevEnvironment] = useState(false);
    const [useSimulation, setUseSimulation] = useState(false);
    
    useEffect(() => {
        // Facebook Login requires HTTPS. If on HTTP, we flag as Dev/HTTP environment.
        if (window.location.protocol !== 'https:') {
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

    const handleConnectMeta = () => {
        setConnectionType('meta');
        setModalStep('grantPermission');
        setFetchedAccounts([]);
        setSelectedAccounts([]);
        setIsModalOpen(true);
    };

    const handleConnectWhatsApp = () => {
        setConnectionType('whatsapp');
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
            if (connectionType === 'meta') {
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
                    console.error('Error fetching Meta accounts:', response.error);
                    setModalStep('noAccountsFound'); 
                }
            } else {
                // WhatsApp Flow
                const response = await getWhatsAppBusinessAccounts();
                if (response && !response.error) {
                    if (response.data && response.data.length > 0) {
                         const accounts: {id: string, name: string, type: Platform, accessToken: string}[] = [];
                         response.data.forEach((waba: any) => {
                             accounts.push({
                                 id: waba.id,
                                 name: waba.name || `WhatsApp Business (${waba.id})`,
                                 type: 'WhatsApp',
                                 accessToken: 'auth-via-fb-login' // Token is handled implicitly via user session for this demo
                             });
                         });
                         setFetchedAccounts(accounts);
                         setModalStep('selectAccounts');
                    } else {
                        setModalStep('noAccountsFound');
                    }
                } else {
                    console.error('Error fetching WhatsApp accounts:', response?.error);
                    setModalStep('noAccountsFound');
                }
            }
        } catch (error) {
            console.error('API Error:', error);
            setModalStep('noAccountsFound');
        }
    };

    const runSimulation = () => {
         setTimeout(() => {
            let mockAccounts = [];
            
            if (connectionType === 'meta') {
                mockAccounts = [
                    { id: `mock-fb-${Date.now()}`, name: 'Demo Coffee Shop', type: 'Facebook' as Platform, accessToken: 'mock-token-fb' },
                    { id: `mock-ig-${Date.now()}`, name: 'demo_coffee_official (Instagram)', type: 'Instagram' as Platform, accessToken: 'mock-token-ig' }
                ];
            } else {
                mockAccounts = [
                    { id: `mock-wa-${Date.now()}`, name: 'Demo WhatsApp Business', type: 'WhatsApp' as Platform, accessToken: 'mock-token-wa' }
                ];
            }

            setFetchedAccounts(mockAccounts);
            setModalStep('selectAccounts');
         }, 1000);
    };

    const handleGrantPermission = async (rerequest = false) => {
        setModalStep('connecting');

        // Force simulation if Dev Environment (HTTP) or User Selected
        if (useSimulation || isDevEnvironment) {
             console.log("Using Simulation Mode");
             runSimulation();
             return;
        }

        try {
            const isWhatsApp = connectionType === 'whatsapp';
            const response = await loginToFacebook(rerequest, isWhatsApp);
            
            if (response.authResponse) {
                fetchUserAccounts();
            } else {
                console.log('User cancelled login or did not fully authorize.', response);
                setModalStep('noAccountsFound');
            }
        } catch (error: any) {
            console.error("Login Failed:", error);
            if (error.message === "App ID not configured") {
                alert("The application is missing the Facebook App ID configuration. Please contact the administrator.");
                closeModal();
            } else {
                setModalStep('noAccountsFound');
            }
        }
    };

    const handleResetAndReconnect = async () => {
        setModalStep('connecting');
        
        if (useSimulation || isDevEnvironment) {
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

    const handleConfirmConnection = () => {
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
    const waConnections = connections.filter(c => c.platform === 'WhatsApp');

    const renderModalContent = () => {
        const isMeta = connectionType === 'meta';
        
        switch(modalStep) {
            case 'grantPermission':
                return (
                    <div className="text-center p-8">
                        <div className="flex justify-center items-center mb-4 space-x-2">
                            <BotIcon className="w-12 h-12 text-slate-400" />
                            <LinkIcon className="w-6 h-6 text-slate-400" />
                            {isMeta ? (
                                <FacebookIcon className="w-12 h-12 text-blue-600"/>
                            ) : (
                                <WhatsAppIcon className="w-12 h-12 text-emerald-500"/>
                            )}
                        </div>
                        <Card.Title className="text-xl">
                            AI Agent wants to connect to {isMeta ? 'Facebook & Instagram' : 'WhatsApp'}
                        </Card.Title>
                        
                        {isDevEnvironment && (
                             <div className="bg-amber-50 border border-amber-200 p-3 rounded-md my-4 text-left">
                                <p className="text-amber-600 text-sm font-semibold flex items-center">
                                    <AlertTriangleIcon className="w-4 h-4 mr-2" />
                                    HTTPS Required
                                </p>
                                <p className="text-slate-500 text-xs mt-1">
                                    Facebook Login requires HTTPS. The app has switched to <strong>Demo Mode</strong>.
                                </p>
                            </div>
                        )}

                        <div className="text-left bg-slate-50 p-4 rounded-lg my-6 text-sm space-y-2 border border-slate-200">
                           {isMeta ? (
                               <>
                                <p className="flex items-start"><CheckCircleIcon className="w-4 h-4 mr-2 mt-1 text-emerald-500 flex-shrink-0"/> Read comments and messages.</p>
                                <p className="flex items-start"><CheckCircleIcon className="w-4 h-4 mr-2 mt-1 text-emerald-500 flex-shrink-0"/> Post content on your behalf.</p>
                               </>
                           ) : (
                               <>
                                <p className="flex items-start"><CheckCircleIcon className="w-4 h-4 mr-2 mt-1 text-emerald-500 flex-shrink-0"/> Access WhatsApp Business Account.</p>
                                <p className="flex items-start"><CheckCircleIcon className="w-4 h-4 mr-2 mt-1 text-emerald-500 flex-shrink-0"/> Send and receive messages.</p>
                               </>
                           )}
                        </div>

                        <div className="flex flex-col gap-3">
                            <Button onClick={() => handleGrantPermission(false)}>
                                {(useSimulation || isDevEnvironment) ? 'Start Simulation' : 'Continue with Facebook'}
                            </Button>
                            <Button onClick={closeModal} className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50">Cancel</Button>
                        </div>
                        
                         <div className="mt-6 flex justify-center">
                             <label className={`flex items-center cursor-pointer text-xs text-slate-500 hover:text-slate-700 transition-colors p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-200 ${isDevEnvironment ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                <input 
                                    type="checkbox" 
                                    checked={useSimulation || isDevEnvironment} 
                                    onChange={e => !isDevEnvironment && toggleSimulation(e.target.checked)} 
                                    disabled={isDevEnvironment}
                                    className="h-4 w-4 rounded bg-white border-slate-300 text-indigo-600 focus:ring-0 mr-2 disabled:opacity-50"
                                />
                                {isDevEnvironment ? 'Demo Mode Enforced' : 'Enable Demo Mode'}
                            </label>
                        </div>
                    </div>
                );
            case 'connecting':
                 return (
                    <div className="p-10 flex flex-col items-center justify-center text-center h-80">
                        <BotIcon className="w-12 h-12 text-indigo-600 animate-pulse" />
                        <h3 className="text-lg font-semibold mt-4 text-slate-900">Connecting to {isMeta ? 'Meta' : 'WhatsApp'}...</h3>
                        <p className="text-slate-500">Authenticating and fetching your accounts.</p>
                    </div>
                );
            case 'selectAccounts':
                 return (
                    <>
                       <Card.Header>
                            <Card.Title>Select Your Accounts</Card.Title>
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
                                        {account.type === 'Facebook' ? <FacebookIcon className="w-3 h-3 mr-1.5" /> : 
                                         account.type === 'Instagram' ? <InstagramIcon className="w-3 h-3 mr-1.5" /> :
                                         <WhatsAppIcon className="w-3 h-3 mr-1.5" />}
                                        {account.type}
                                      </div>
                                    </div>
                                </label>
                            ))}
                        </Card.Content>
                        <div className="p-6 pt-0 flex justify-end gap-3">
                            <Button onClick={closeModal} className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50">Cancel</Button>
                            <Button onClick={handleConfirmConnection} disabled={selectedAccounts.length === 0}>Connect {selectedAccounts.length} Account(s)</Button>
                        </div>
                    </>
                );
            case 'noAccountsFound':
                return (
                    <div className="text-center p-8 max-h-[80vh] overflow-y-auto">
                        <AlertTriangleIcon className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                        <Card.Title className="text-xl">Connection Issue</Card.Title>
                        <p className="text-sm text-slate-500 mt-2 mb-4">We couldn't find any {isMeta ? 'Facebook/Instagram' : 'WhatsApp'} accounts linked to your profile. You may need to create one or use Demo Mode.</p>
                        
                        <div className="flex flex-col gap-3 mt-4">
                             <Button onClick={() => { toggleSimulation(true); runSimulation(); }} className="bg-violet-600 hover:bg-violet-700">
                                <ZapIcon className="w-4 h-4 mr-2" />
                                Try Demo Mode
                            </Button>
                            <Button onClick={handleResetAndReconnect} className="bg-amber-500 hover:bg-amber-600 text-white">
                                <RefreshCwIcon className="w-4 h-4 mr-2" />
                                Reconnect
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
        <div className="animate-fade-in space-y-8">
            <div className="mb-6 bg-indigo-50 border border-indigo-200 p-6 rounded-xl text-center shadow-sm">
                <h2 className="text-2xl font-extrabold text-slate-900 mb-2">This is a Kaggle Capstone Project</h2>
                <p className="text-indigo-700 font-medium text-lg">Try this simulation because meta dont allow any non-organaization to get its user data</p>
            </div>

            <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Connections</h1>
                    <p className="text-slate-600 mt-2">Integrate your social media accounts to activate the AI agent.</p>
                </div>
            </header>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Meta Card */}
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
                        </div>
                    </Card.Header>
                    <Card.Content className="flex-1 flex flex-col">
                        <p className="text-slate-500 mb-6">Connect your Facebook Pages and Instagram Profiles to manage comments, messages, and posts.</p>
                        
                        {(useSimulation || isDevEnvironment) && (
                                <div className="mb-6 bg-violet-50 border border-violet-200 p-3 rounded-md flex items-start gap-3">
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

                        <div className="flex-1 flex flex-col justify-end">
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
                                <Button onClick={handleConnectMeta} className="w-full">
                                    {metaConnections.length > 0 ? 'Connect Another Meta Account' : <><LinkIcon className="w-4 h-4 mr-2" /> Connect with Meta</>}
                                </Button>
                                {!isDevEnvironment && (
                                    <div className="mt-4 flex justify-center items-center gap-2">
                                        <label className="flex items-center cursor-pointer text-xs text-slate-500 hover:text-slate-700 transition-colors p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-200">
                                            <input 
                                                type="checkbox" 
                                                checked={useSimulation} 
                                                onChange={e => toggleSimulation(e.target.checked)} 
                                                className="h-3 w-3 rounded bg-white border-slate-300 text-indigo-600 focus:ring-0 mr-2"
                                            />
                                            Force Demo Mode
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card.Content>
                </Card>

                {/* WhatsApp Card */}
                <Card>
                    <Card.Header>
                        <div className="flex items-center justify-between">
                             <div className="flex items-center gap-4">
                                <WhatsAppIcon className="w-8 h-8 text-emerald-500" />
                                <Card.Title className="text-2xl">WhatsApp</Card.Title>
                            </div>
                        </div>
                    </Card.Header>
                    <Card.Content className="flex-1 flex flex-col">
                        <p className="text-slate-500 mb-6">Connect your WhatsApp Business Account using Facebook Login to reply to customer chats automatically.</p>
                        
                        <div className="flex-1 flex flex-col justify-end">
                             {waConnections.length > 0 && (
                                <div className="space-y-2 mb-4">
                                    {waConnections.map(connection => (
                                        <div key={connection.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <WhatsAppIcon className="w-5 h-5 text-emerald-500" />
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
                                <Button onClick={handleConnectWhatsApp} className="w-full bg-emerald-600 hover:bg-emerald-700">
                                    {waConnections.length > 0 ? 'Connect Another Number' : <><LinkIcon className="w-4 h-4 mr-2" /> Connect WhatsApp</>}
                                </Button>
                            </div>
                        </div>
                    </Card.Content>
                </Card>
            </div>

            {/* Unified Connect Modal */}
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
