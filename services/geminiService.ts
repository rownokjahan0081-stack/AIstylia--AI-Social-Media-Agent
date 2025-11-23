
import { GoogleGenAI, Type } from "@google/genai";
import { Post, UserSettings, Connection, Platform, ContentAsset, TrendTopic, TrendContentIdea } from '../types';

// Safe check for environment variable with fallback for development
const getApiKey = () => {
    // 1. Check process.env (Standard Node/Webpack/Preview)
    try {
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
            return process.env.API_KEY;
        }
    } catch (e) {
        // Ignore ReferenceError if process is not defined
    }
    
    // 2. Check import.meta.env (Vite Production)
    try {
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
            // @ts-ignore
            return import.meta.env.VITE_API_KEY;
        }
    } catch (e) {
        // Ignore
    }
    
    // 3. Fallback Key (Note: May have domain restrictions)
    return "AIzaSyBTPhYMDd3drH535s4keuQXtTH6zEVcbZo";
};

const API_KEY = getApiKey();

const getAIClient = () => new GoogleGenAI({ apiKey: API_KEY });

// Helper to safely parse JSON that might be wrapped in markdown code blocks or contain surrounding text
const safeParseJSON = (text: string) => {
  if (!text) return {};
  
  try {
    // 1. Try parsing as is
    return JSON.parse(text);
  } catch (e) {
    // 2. Try extracting from Markdown code blocks
    const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch && markdownMatch[1]) {
      try {
        return JSON.parse(markdownMatch[1]);
      } catch (e2) {
         // Continue to next method
      }
    }
    
    // 3. Try finding the first '{' and last '}' to extract the JSON object
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonCandidate = text.substring(firstBrace, lastBrace + 1);
        try {
            return JSON.parse(jsonCandidate);
        } catch (e3) {
             // Continue
        }
    }

    console.error("Failed to parse JSON:", text);
    return {};
  }
};

export const getOnboardingSuggestions = async (businessDescription: string): Promise<{ pillars: string[], voice: string }> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Based on the following business description, suggest 5 content pillars (key themes for posts) and a 3-adjective brand voice (e.g., "friendly, witty, informative").\n\nBusiness: "${businessDescription}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pillars: {
              type: Type.ARRAY,
              description: "5 distinct content pillars or themes.",
              items: { type: Type.STRING }
            },
            voice: {
              type: Type.STRING,
              description: "A brand voice described in three adjectives."
            }
          }
        }
      }
    });
    const parsed = safeParseJSON(response.text || "");
    return {
        pillars: parsed.pillars || [],
        voice: parsed.voice || ""
    };
  } catch (error) {
    console.error("Error getting onboarding suggestions:", error);
    return { pillars: [], voice: '' };
  }
};

export interface ReplyResponse {
    replyText: string | null; // Null if we shouldn't reply (e.g. disabled order)
    category: 'INQUIRY' | 'ORDER' | 'COMPLIMENT';
    action: 'NONE' | 'EMAIL_OWNER' | 'ASK_ADDRESS';
    internalNote?: string; // For the UI toast
    orderCode?: string;
}

export const generateReply = async (messageContent: string, type: string, settings: UserSettings): Promise<ReplyResponse> => {
  const ai = getAIClient();
  
  // Prepare catalog string if auto-confirm is on
  let catalogString = "";
  if (settings.productCatalog && settings.productCatalog.length > 0) {
       catalogString = `Active Product Catalog (Name | Price | Stock): 
       ${settings.productCatalog.map(p => `- ${p.name}: $${p.price} (Qty: ${p.quantity})`).join('\n')}
       
       Shipping Cost: $5.00 Flat Rate.`;
  } else {
       catalogString = "No product catalog available. Assume items are out of stock unless generic.";
  }

  const systemPrompt = `You are an expert social media manager for ${settings.businessName}, a ${settings.businessDescription}. 
            Target Audience: ${settings.targetAudience}. 
            Brand Voice: ${settings.brandVoice}. 
            
            Context: This is a ${type} (Direct Message or Public Comment).
            
            ${catalogString}
            Auto-Confirm Orders Enabled: ${settings.autoConfirmOrders}

            TASK: Analyze the message and categorize it into one of three sectors: INQUIRY, ORDER, or COMPLIMENT.

            SECTOR 1: INQUIRY
            - Answer relevant questions about the business, products, or hours.
            - If the question is irrelevant (e.g., "Who is the president?", "Math homework"), politely say sorry and decline to answer.
            - CRITICAL: If the user asks a relevant question but you do NOT have the information (e.g., "Is your coffee gluten-free?" and you don't know), say sorry for not having the information and state that you will email the owner to find out. Set 'action' to 'EMAIL_OWNER'.

            SECTOR 2: ORDER
            - If 'Auto-Confirm Orders' is FALSE: Do NOT generate a reply text. Set 'replyText' to null. Set 'action' to 'EMAIL_OWNER'. Set 'internalNote' to 'Order forwarding to email (Auto-confirm disabled)'.
            - If 'Auto-Confirm Orders' is TRUE:
                1. Check Stock: Is the item in the catalog? If no/out of stock, apologize.
                2. Check Address: Did they provide a delivery address? If NO, ask for it. Set 'action' to 'ASK_ADDRESS'.
                3. If Stock OK and Address OK:
                   - Calculate Total: (Price * Qty) + 5.
                   - Generate a random 6-digit Order Code (e.g., ORD-8392).
                   - Confirm the order, state the total, provide the Order Code, and mention it has been emailed.
                   - Set 'action' to 'EMAIL_OWNER' (to notify business).

            SECTOR 3: COMPLIMENT
            - Positive: Thank them warmly according to brand voice.
            - Negative/Hateful: Respond politely and apologetically. Do not get defensive.

            Output must be a JSON object.`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Customer Message: "${messageContent}"`,
        config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    category: { type: Type.STRING, enum: ['INQUIRY', 'ORDER', 'COMPLIMENT'] },
                    replyText: { type: Type.STRING, description: "The text to send to the customer. Null if auto-confirm is disabled for orders." },
                    action: { type: Type.STRING, enum: ['NONE', 'EMAIL_OWNER', 'ASK_ADDRESS'] },
                    internalNote: { type: Type.STRING, description: "A short summary of the action for the dashboard toast notification." },
                    orderCode: { type: Type.STRING, description: "The generated order code if applicable." }
                }
            }
        }
    });
    
    const parsed = safeParseJSON(response.text || "");
    return {
        category: parsed.category || 'INQUIRY',
        replyText: parsed.replyText || null,
        action: parsed.action || 'NONE',
        internalNote: parsed.internalNote || '',
        orderCode: parsed.orderCode
    };
  } catch (error) {
    console.error("Error generating reply:", error);
    return {
        category: 'INQUIRY',
        replyText: "I'm sorry, I'm having trouble processing your request right now.",
        action: 'NONE'
    };
  }
};

export const generateWeeklyContentPlan = async (
    settings: UserSettings, 
    connections: Connection[], 
    assets: ContentAsset[]
): Promise<any[]> => {
    const ai = getAIClient();
    const availablePlatforms = [...new Set(connections.map(c => c.platform))];
    if (availablePlatforms.length === 0) {
        throw new Error("No connected platforms available for post generation.");
    }

    const availableAssetsString = assets.length > 0
        ? `Here is a list of available visual assets from the content library. Select the most relevant one for each post.
        Available Assets:
        ${assets.map(a => `- { id: "${a.id}", context: "${a.context}" }`).join('\n')}`
        : 'There are no visual assets available in the content library.';

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are an expert social media strategist for ${settings.businessName}, a ${settings.businessDescription}. The target audience is ${settings.targetAudience} and the brand voice is ${settings.brandVoice}. The key content pillars are: ${settings.contentPillars.join(', ')}.

      Generate a 7-day social media content plan.
      
      For each day, provide a post idea including engaging text and relevant hashtags.
      
      ${availableAssetsString}

      For each post, you MUST choose the ID of the most relevant asset from the list above to be the visual. If and ONLY IF no asset is a good fit, return an empty string "" for the assetId and provide a concise 'visualSuggestion' for a new image.
      
      Assign each post to one of the following available platforms: ${availablePlatforms.join(', ')}. Ensure a good mix of content across the week. The response should be a JSON object with a single key "weeklyPlan" containing an array of 7 post objects.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        weeklyPlan: {
                            type: Type.ARRAY,
                            description: "A 7-day content plan. MUST contain exactly 7 items.",
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    day: { type: Type.STRING, description: "Day of the week for the post (e.g., Monday, Tuesday)." },
                                    postText: { type: Type.STRING, description: "The main, engaging text for the social media post." },
                                    assetId: { type: Type.STRING, description: "The ID of the MOST relevant asset from the provided list. An empty string if no asset is a good fit." },
                                    visualSuggestion: { type: Type.STRING, description: "A concise suggestion for a visual ONLY if assetId is an empty string." },
                                    hashtags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of 3-5 relevant hashtags, including the # symbol." },
                                    platform: { type: Type.STRING, description: `The social media platform for the post. MUST be one of: ${availablePlatforms.join(', ')}` }
                                },
                                required: ["day", "postText", "hashtags", "platform"]
                            }
                        }
                    }
                }
            }
        });
        const parsed = safeParseJSON(response.text || "");
        return parsed.weeklyPlan || [];
    } catch (error) {
        console.error("Error generating weekly content plan:", error);
        throw new Error("Failed to generate weekly plan.");
    }
};

export const regenerateSinglePost = async (post: Post, settings: UserSettings, assets: ContentAsset[]): Promise<any> => {
    const ai = getAIClient();
    
    const availableAssetsString = assets.length > 0
        ? `Here is a list of available visual assets from the content library. Select the most relevant one if applicable.
        Available Assets:
        ${assets.map(a => `- { id: "${a.id}", context: "${a.context}" }`).join('\n')}`
        : 'There are no visual assets available in the content library.';

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are an expert social media strategist for ${settings.businessName}. 
            The user wants to REGENERATE a specific post for their content plan.
            
            Context:
            - Platform: ${post.platform}
            - Previous (Rejected) Content: "${post.content}"
            - Target Audience: ${settings.targetAudience}
            - Brand Voice: ${settings.brandVoice}
            
            ${availableAssetsString}

            Generate a NEW, engaging post idea that is different from the rejected one.
            Return a JSON object with the new details.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        postText: { type: Type.STRING, description: "The new main text for the post." },
                        assetId: { type: Type.STRING, description: "The ID of the MOST relevant asset from the provided list. Empty string if none fit." },
                        visualSuggestion: { type: Type.STRING, description: "A concise visual suggestion if no asset is used." },
                        hashtags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 relevant hashtags." }
                    },
                    required: ["postText", "hashtags"]
                }
            }
        });
        
        return safeParseJSON(response.text || "");
    } catch (error) {
        console.error("Error regenerating single post:", error);
        throw new Error("Failed to regenerate post.");
    }
};

export const improvePost = async (postText: string, settings: UserSettings): Promise<string[]> => {
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Given the following social media post, generate 3 alternative, improved versions. Make them more engaging, creative, and aligned with the brand voice. Return ONLY a JSON object with a key "suggestions" containing an array of the 3 new post strings.\n\nOriginal Post: "${postText}"`,
      config: {
        systemInstruction: `You are an expert social media copywriter for ${settings.businessName}. The brand voice is ${settings.brandVoice}.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              description: "An array of exactly 3 improved post variations.",
              items: { type: Type.STRING }
            }
          }
        }
      }
    });
    const parsed = safeParseJSON(response.text || "");
    return parsed.suggestions || [];
  } catch (error) {
    console.error("Error improving post:", error);
    return [];
  }
};


export const analyzeOwnPosts = async (posts: Post[], settings: UserSettings): Promise<string> => {
    const ai = getAIClient();
    if (posts.length === 0) return "Not enough post data to analyze. Once the agent has posted a few times, analysis will be available here.";
    try {
        const postData = posts.map(p => `Post: "${p.content}" (Engagement: ${p.engagement})`).join('\n');
        const prompt = `I am the social media manager for ${settings.businessName}. Here are my recent social media posts with their engagement scores:\n${postData}\n\nAnalyze my most successful posts (those with the highest engagement). What patterns do you see? What topics, formats, or tones are working best? Based on this, suggest a concise, actionable strategy for my next few posts to maximize engagement. Present it as a short paragraph.`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "Analysis unavailable.";
    } catch (error) {
        console.error("Error analyzing own posts:", error);
        return "Sorry, I couldn't analyze the posts at the moment.";
    }
};

export const analyzeTrends = async (settings: UserSettings): Promise<{ trends: TrendTopic[], ideas: TrendContentIdea[], rawSummary: string }> => {
  const ai = getAIClient();
  try {
    // Step 1: Find trends using Google Search grounding
    const trendFindingPrompt = `Using Google Search, identify 3 current trending topics, news, or conversations on the web relevant to this business:
    - Business: ${settings.businessName}
    - Description: ${settings.businessDescription}
    - Key Content Pillars: ${settings.contentPillars.join(', ')}
    
    Format your response as a numbered list. For each trend, provide a topic title followed by a colon and then a one-sentence summary. For example:
    1. Trend Title: A short summary of the trend.`;

    const trendResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: trendFindingPrompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const trendsText = trendResponse.text || "";
    const groundingChunks = trendResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // Step 2: Generate content ideas from the trends
    const ideaGenerationPrompt = `You are a creative social media strategist for ${settings.businessName}. Your brand voice is ${settings.brandVoice}.
    
    Based on the following current trends, generate 3 distinct and actionable social media post ideas.
    
    Current Trends:
    ${trendsText}
    
    For each idea, provide a catchy title, a post concept, a brief rationale for why it connects to the trend, and 3-5 relevant hashtags.
    The response must be a JSON object with a single key "ideas".`;
    
    const ideaResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: ideaGenerationPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    ideas: {
                        type: Type.ARRAY,
                        description: "An array of 3 content ideas based on the trends.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING, description: "A catchy title for the content idea." },
                                concept: { type: Type.STRING, description: "The core concept for the social media post." },
                                rationale: { type: Type.STRING, description: "A brief explanation of how this idea connects to the trend and brand." },
                                hashtags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of 3-5 relevant hashtags, including the # symbol." }
                            },
                             required: ["title", "concept", "rationale", "hashtags"]
                        }
                    }
                }
            }
        }
    });

    const parsedIdeas = safeParseJSON(ideaResponse.text || "");
    const ideas: TrendContentIdea[] = parsedIdeas.ideas || [];

    // Improved parsing of trendsText
    const trendTopics: TrendTopic[] = [];
    const trendLines = trendsText.split('\n').filter(line => line.trim().length > 0 && line.includes(':'));
    
    trendLines.forEach((line, index) => {
        const parts = line.split(':');
        const topic = (parts[0] || '').replace(/^\d+\.\s*/, '').trim();
        const summary = (parts.slice(1).join(':') || '').trim();
        
        // Safe check for grounding chunks existence
        const sourceChunk = (groundingChunks && groundingChunks.length > index) ? groundingChunks[index] as any : null;
        const sourceUri = sourceChunk?.web?.uri;
        
        if (topic && summary) {
             trendTopics.push({
                topic: topic,
                summary: summary,
                source: sourceUri,
            });
        }
    });

    if (trendTopics.length === 0 && trendsText.length > 0) {
        trendTopics.push({ topic: "General Trends", summary: trendsText, source: (groundingChunks?.[0] as any)?.web?.uri });
    }


    return { trends: trendTopics, ideas, rawSummary: trendsText };

  } catch (error) {
    console.error("Error analyzing trends:", error);
    throw new Error("The AI failed to analyze trends. It might be a temporary issue. Please try again.");
  }
};

export const generateImageFromPrompt = async (prompt: string, settings: UserSettings, referenceImageBase64?: string | null): Promise<string | null> => {
  const ai = getAIClient();
  try {
      const parts: any[] = [];
      
      // If a reference image exists, add it first
      if (referenceImageBase64) {
        // Extract raw base64 if prefix exists
        const base64Data = referenceImageBase64.includes(',') 
            ? referenceImageBase64.split(',')[1] 
            : referenceImageBase64;

        parts.push({
            inlineData: {
                mimeType: 'image/png', // Default to png for safety, or parse actual mime if needed
                data: base64Data
            }
        });
        
        // Add text prompt instructing to use the image
        parts.push({ 
            text: `Use the provided image as a reference. ${prompt}. Context: Business is ${settings.businessName}, ${settings.businessDescription}.` 
        });
      } else {
          // Text only prompt
          parts.push({ 
              text: `Generate an image based on this description: ${prompt}. Context: Business is ${settings.businessName}, ${settings.businessDescription}.` 
          });
      }

      // Use flash-image for generation/editing
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: {
             parts: parts
          }
      });
      
      // Iterate through parts to find the image output
      const responseParts = response.candidates?.[0]?.content?.parts;
      if (responseParts) {
          for (const part of responseParts) {
              if (part.inlineData) {
                   return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              }
          }
      }
      return null;
  } catch (error) {
      console.error("Image generation error:", error);
      throw error;
  }
}

export const generateSupportChatReply = async (message: string): Promise<string> => {
    const ai = getAIClient();
    const systemPrompt = `You are the AI Support Assistant for "Ai Social Media Agent", a web application for business owners.
    
    APP FEATURES:
    1. Dashboard: Overview of auto-reply status, engagement rates.
    2. Inbox: AI auto-replies to inquiries, orders, and compliments. User can configure "Order Automation" in settings (product catalog).
    3. Content Planner: AI generates weekly post schedules based on content pillars.
    4. Content Library: Users upload assets or generate AI images using Gemini.
    5. Analytics: Engagement metrics and AI insights.
    6. Settings: Configure business info, voice, pillars, and product catalog.

    Your goal is to help the user navigate and understand how to use this application. Keep answers concise, friendly, and helpful.
    If the user asks about the business defined in the settings (e.g. "Do you sell coffee?"), politely explain that you are the App Support Bot, not the Business's Customer Service Agent, but the 'Inbox' tab is where their customers would ask such questions.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: message,
            config: { systemInstruction: systemPrompt }
        });
        return response.text || "I'm sorry, I couldn't process that request.";
    } catch (error) {
        console.error("Support chat error:", error);
        return "I'm currently experiencing technical difficulties. Please try again later.";
    }
}
