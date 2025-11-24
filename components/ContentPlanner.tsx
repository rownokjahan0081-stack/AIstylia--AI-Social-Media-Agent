
import React, { useState, useEffect, useRef } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input, TextArea } from './ui/Form';
import { Post, UserSettings, Connection, Platform, ContentAsset } from '../types';
import { generateWeeklyContentPlan, improvePost, regenerateSinglePost } from '../services/geminiService';
import { SparklesIcon, CheckCircleIcon, ClockIcon, AlertTriangleIcon, CameraIcon, FacebookIcon, InstagramIcon, WhatsAppIcon, TrashIcon, RefreshCwIcon } from './Icons';

const PostStatusIndicator = ({ status }: { status: Post['status']}) => {
    switch (status) {
        case 'pending_approval':
            return <div className="flex items-center text-xs font-semibold text-amber-500"><AlertTriangleIcon className="w-3 h-3 mr-1.5"/> Needs Approval</div>
        case 'scheduled':
            return <div className="flex items-center text-xs font-semibold text-indigo-500"><ClockIcon className="w-3 h-3 mr-1.5"/> Scheduled</div>
        case 'posted':
             return <div className="flex items-center text-xs font-semibold text-emerald-500"><CheckCircleIcon className="w-3 h-3 mr-1.5"/> Posted</div>
    }
}

const PlatformIcon = ({ platform }: { platform: Platform }) => {
  switch (platform) {
    case 'Facebook': return <FacebookIcon className="w-4 h-4 text-blue-600" />;
    case 'Instagram': return <InstagramIcon className="w-4 h-4 text-pink-600" />;
    case 'WhatsApp': return <WhatsAppIcon className="w-4 h-4 text-emerald-500" />;
    default: return null;
  }
};

export const ContentPlanner: React.FC<{ settings: UserSettings, connections: Connection[] }> = ({ settings, connections }) => {
  const [weeklyPlan, setWeeklyPlan] = useState<Post[]>([]);
  const [libraryAssets, setLibraryAssets] = useState<ContentAsset[]>([]);
  const [planStatus, setPlanStatus] = useState<'none' | 'pending' | 'approved'>('none');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Prevent overwriting local storage on initial mount
  const isFirstRender = useRef(true);

  // State for the "Improve Post" modal
  const [isImproveModalOpen, setIsImproveModalOpen] = useState(false);
  const [postToImprove, setPostToImprove] = useState<Post | null>(null);
  const [improvedSuggestions, setImprovedSuggestions] = useState<string[]>([]);
  const [isImproving, setIsImproving] = useState(false);
  
  // State for single post regeneration
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);

  useEffect(() => {
    const storedAssets = localStorage.getItem('social-agent-library');
    if (storedAssets) {
        setLibraryAssets(JSON.parse(storedAssets));
    }

    // Load plan from storage
    const storedPlan = localStorage.getItem('social-agent-weekly-plan');
    if (storedPlan) {
        const parsedPlan = JSON.parse(storedPlan);
        // Convert scheduledTime strings back to Date objects
        const hydratedPlan = parsedPlan.map((p: any) => ({
            ...p,
            scheduledTime: new Date(p.scheduledTime)
        }));
        setWeeklyPlan(hydratedPlan);
        
        // Determine status based on plan
        if (hydratedPlan.length > 0) {
            const isApproved = hydratedPlan.every((p: Post) => p.status === 'scheduled' || p.status === 'posted');
            setPlanStatus(isApproved ? 'approved' : 'pending');
        }
    }
  }, []);

  // Persist plan whenever it changes
  useEffect(() => {
      // Skip the first render to avoid clearing storage before data loads
      if (isFirstRender.current) {
          isFirstRender.current = false;
          return;
      }

      if (weeklyPlan.length > 0) {
          localStorage.setItem('social-agent-weekly-plan', JSON.stringify(weeklyPlan));
      } else {
          // If strictly empty (after deletion), clear it, but only if initialized
          if (localStorage.getItem('social-agent-weekly-plan')) {
             localStorage.removeItem('social-agent-weekly-plan');
             setPlanStatus('none');
          }
      }
  }, [weeklyPlan]);

  const handleGeneratePlan = async () => {
      if (connections.length === 0) {
          setError("No social media accounts connected. Please connect an account in the 'Connections' tab.");
          return;
      }
      
      setIsLoading(true);
      setError(null);
      setWeeklyPlan([]);
      setPlanStatus('none');

      try {
        const planIdeas = await generateWeeklyContentPlan(settings, connections, libraryAssets);
        
        if (planIdeas.length === 0) {
            throw new Error("The AI didn't return a plan. Please try again.");
        }

        const newPosts: Post[] = planIdeas.map((idea: any, index: number) => {
            const platform = connections.some(c => c.platform === idea.platform) ? idea.platform as Platform : (connections[0]?.platform || 'Facebook');
            const availableConnections = connections.filter(c => c.platform === platform);
            const connection = availableConnections.length > 0 ? availableConnections[Math.floor(Math.random() * availableConnections.length)] : { id: 'mock', platform };
            
            const selectedAsset = idea.assetId ? libraryAssets.find(a => a.id === idea.assetId) : undefined;
            
            return {
            id: Date.now() + index,
            platform: platform as Platform,
            connectionId: connection.id || 'mock-id',
            content: idea.postText,
            hashtags: idea.hashtags,
            asset: selectedAsset,
            visualSuggestion: selectedAsset ? undefined : idea.visualSuggestion,
            scheduledTime: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000),
            status: 'pending_approval',
            };
        });

        setWeeklyPlan(newPosts);
        setPlanStatus('pending');
      } catch (e: any) {
        setError(e.message || "The AI failed to generate a content plan. Please try again.");
      } finally {
        setIsLoading(false);
      }
  };
  
  const handleApprovePlan = () => {
    setWeeklyPlan(plan => plan.map(post => ({ ...post, status: 'scheduled' })));
    setPlanStatus('approved');
  }

  const handleDeletePost = (postId: number) => {
      setWeeklyPlan(prev => prev.filter(p => p.id !== postId));
  };

  const handleRegenerateSingle = async (post: Post) => {
      setRegeneratingId(post.id);
      try {
          const result = await regenerateSinglePost(post, settings, libraryAssets);
          
          const selectedAsset = result.assetId ? libraryAssets.find(a => a.id === result.assetId) : undefined;

          setWeeklyPlan(prev => prev.map(p => {
              if (p.id === post.id) {
                  return {
                      ...p,
                      content: result.postText,
                      hashtags: result.hashtags,
                      asset: selectedAsset,
                      visualSuggestion: selectedAsset ? undefined : result.visualSuggestion,
                      status: 'pending_approval' // Reset status to pending if it was scheduled
                  };
              }
              return p;
          }));
          
          // If we regenerated a post, the overall plan might need re-approval
          if (planStatus === 'approved') {
              setPlanStatus('pending');
          }

      } catch (e) {
          console.error("Failed to regenerate post", e);
          setError("Failed to regenerate the selected post.");
      } finally {
          setRegeneratingId(null);
      }
  };

  const getConnectionName = (id: string) => connections.find(c => c.id === id)?.name || 'Unknown Account';
  
  const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const getDayForPost = (post: Post) => {
    return daysOfWeek[post.scheduledTime.getDay()];
  }

  const handleOpenImproveModal = async (post: Post) => {
    setPostToImprove(post);
    setIsImproveModalOpen(true);
    setIsImproving(true);
    setImprovedSuggestions([]);
    try {
      const suggestions = await improvePost(post.content, settings);
      setImprovedSuggestions(suggestions);
    } catch (e) {
      console.error(e);
    } finally {
      setIsImproving(false);
    }
  };

  const handleCloseImproveModal = () => {
    setIsImproveModalOpen(false);
    setPostToImprove(null);
    setImprovedSuggestions([]);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    if (!postToImprove) return;
    setWeeklyPlan(plan => plan.map(p => 
      p.id === postToImprove.id ? { ...p, content: suggestion } : p
    ));
    handleCloseImproveModal();
  };


  return (
    <div className="animate-fade-in">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Content Planner</h1>
        <p className="text-slate-600 mt-2">Generate a library-aware 7-day content plan with AI and approve it with one click.</p>
      </header>
      
      <Card className="mb-8">
        <Card.Header>
          <Card.Title className="flex items-center gap-2">
              Plan Generation
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <Button onClick={handleGeneratePlan} disabled={connections.length === 0 || isLoading}>
            {isLoading ? (
                <><RefreshCwIcon className="w-5 h-5 mr-2 animate-spin"/> Generating Plan...</>
            ) : (
                <><SparklesIcon className="w-5 h-5 mr-2"/> Generate 1-Week Content Plan</>
            )}
          </Button>
          {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
           {connections.length === 0 && <p className="text-amber-500 mt-4 text-sm">Please connect a social account to enable plan generation.</p>}
        </Card.Content>
      </Card>

      {weeklyPlan.length > 0 && (
        <div className="mb-8 p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between sticky top-0 z-20 shadow-lg">
            <div>
                <h2 className="text-xl font-bold text-slate-900">Weekly Content Plan</h2>
                <p className="text-slate-500 text-sm">Review the generated posts for the upcoming week.</p>
            </div>
            {planStatus === 'pending' && (
                <Button onClick={handleApprovePlan} className="bg-emerald-600 hover:bg-emerald-700">
                    <CheckCircleIcon className="w-5 h-5 mr-2" />
                    Approve Week's Plan
                </Button>
            )}
             {planStatus === 'approved' && (
                <div className="flex items-center text-emerald-600 font-semibold px-4 py-2 rounded-md bg-emerald-50">
                    <CheckCircleIcon className="w-5 h-5 mr-2" />
                    Plan Approved & Scheduled
                </div>
            )}
        </div>
      )}

      {weeklyPlan.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
          {weeklyPlan.map(post => (
            <Card key={post.id} className="flex flex-col overflow-hidden relative group">
               <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button 
                    onClick={() => handleRegenerateSingle(post)} 
                    disabled={regeneratingId === post.id}
                    className="bg-white/90 hover:bg-indigo-100 text-indigo-600 p-2 rounded-full backdrop-blur-sm transition-colors shadow-sm"
                    title="Regenerate this post"
                  >
                     <RefreshCwIcon className={`w-4 h-4 ${regeneratingId === post.id ? 'animate-spin' : ''}`} />
                  </button>
                  <button 
                    onClick={() => handleDeletePost(post.id)} 
                    className="bg-white/90 hover:bg-red-100 text-red-600 p-2 rounded-full backdrop-blur-sm transition-colors shadow-sm"
                    title="Remove post"
                  >
                     <TrashIcon className="w-4 h-4" />
                  </button>
               </div>

               {post.asset && (
                 <img src={post.asset.url} alt={post.asset.name} className="w-full h-48 object-cover" />
               )}
               {regeneratingId === post.id && (
                   <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-20">
                       <div className="text-center">
                            <RefreshCwIcon className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                            <p className="text-slate-900 font-semibold">Regenerating...</p>
                       </div>
                   </div>
               )}
              <div className="flex flex-col flex-1 p-6">
                  <div className="flex justify-between items-start mb-3">
                      <div>
                        <Card.Title>{getDayForPost(post)}</Card.Title>
                        <p className="text-xs text-slate-500">{post.scheduledTime.toLocaleDateString()}</p>
                      </div>
                      <PostStatusIndicator status={post.status} />
                  </div>
                  <p className="text-slate-700 mb-3 text-sm flex-1 whitespace-pre-wrap">{post.content}</p>
                  <p className="text-indigo-600 text-xs font-mono mb-4">{post.hashtags.join(' ')}</p>
                  
                  {!post.asset && post.visualSuggestion && (
                    <div className="p-3 rounded-md bg-slate-50 border border-slate-200 mb-4">
                      <div className="flex items-center text-sm font-semibold text-slate-700 mb-1">
                        <CameraIcon className="w-4 h-4 mr-2" />
                        Visual Suggestion
                      </div>
                      <p className="text-xs text-slate-500">{post.visualSuggestion}</p>
                    </div>
                  )}

                  <div className="mt-auto border-t border-slate-100 pt-3 flex justify-between items-center text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <PlatformIcon platform={post.platform} />
                        <span>{getConnectionName(post.connectionId)}</span>
                      </div>
                      <Button onClick={() => handleOpenImproveModal(post)} className="bg-white border border-slate-200 !text-black hover:bg-slate-50 h-8 px-2 text-xs shadow-sm">
                        <SparklesIcon className="w-3 h-3 mr-1.5" />
                        Improve
                      </Button>
                  </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-16">
            <p className="text-slate-500">No content plan generated yet.</p>
            <p className="text-slate-400 text-sm">Click the button above to have the AI create a plan for you.</p>
        </Card>
      )}
      
      {isImproveModalOpen && postToImprove && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in-fast">
              <Card className="w-full max-w-2xl">
                  <Card.Header>
                      <Card.Title>Improve Post with AI</Card.Title>
                      <p className="text-sm text-slate-500">Select a variation to update your post.</p>
                  </Card.Header>
                  <Card.Content>
                      <div className="mb-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                          <h4 className="text-sm font-semibold text-slate-600 mb-2">Original Post</h4>
                          <p className="text-slate-800">{postToImprove.content}</p>
                      </div>
                      
                      {isImproving && (
                          <div className="text-center py-8">
                              <SparklesIcon className="w-8 h-8 text-indigo-600 mx-auto animate-pulse" />
                              <p className="text-slate-500 mt-2">Generating improved versions...</p>
                          </div>
                      )}

                      {!isImproving && improvedSuggestions.length > 0 && (
                          <div className="space-y-3">
                              <h4 className="text-sm font-semibold text-slate-600">AI Suggestions</h4>
                              {improvedSuggestions.map((suggestion, index) => (
                                  <div key={index} className="p-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 group shadow-sm transition-all">
                                      <p className="text-slate-800">{suggestion}</p>
                                      <div className="text-right mt-2">
                                        <Button onClick={() => handleSelectSuggestion(suggestion)} className="bg-emerald-600 hover:bg-emerald-700 h-8 px-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                                          Use This Version
                                        </Button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                      {!isImproving && improvedSuggestions.length === 0 && (
                          <p className="text-center text-amber-500 text-sm py-4">The AI couldn't generate suggestions. Please try again.</p>
                      )}
                  </Card.Content>
                  <div className="p-6 pt-0 flex justify-end">
                      <Button onClick={handleCloseImproveModal} className="bg-slate-200 text-slate-800 hover:bg-slate-300">Close</Button>
                  </div>
              </Card>
          </div>
      )}
    </div>
  );
};