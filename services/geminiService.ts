import { GoogleGenAI, Type } from "@google/genai";
import { Post, UserSettings, Connection, Platform, ContentAsset, TrendTopic, TrendContentIdea, ReplyResponse } from '../types';

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
    return "AIzaSyB2tXvgk_Y8BRkprwz9dDGSBwe5TRBC3XU";
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
    const markdownMatch = text.match(/```(?:json)?\s*([\sS]*?)\s*```/);
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

export const generateReply = async (messageContent: string, type: string, settings: UserSettings): Promise<ReplyResponse> => {
  const ai = getAIClient();
  
  // Prepare catalog string if auto-confirm is on
  let catalogString = "";
  if (settings.productCatalog && settings.productCatalog.length > 0) {
       catalogString = `Active Product Catalog (ID | Name | Price | Stock): 
       ${settings.productCatalog.map(p => `- ID: ${p.id} | Name: ${p.name} | Price: $${p.price} | Stock: ${p.quantity}`).join('\n')}
       
       Shipping Cost: $5.00 Flat Rate.`;
  } else {
       catalogString = "No product catalog available. Assume items are out of stock unless generic.";
  }

  // Include user-taught guidelines
  let guidelinesPrompt = "";
  if (settings.replyGuidelines && settings.replyGuidelines.length > 0) {
      guidelinesPrompt = `
      \nUSER GUIDELINES & SPECIFIC INSTRUCTIONS (STRICTLY FOLLOW THESE PATTERNS):
      The user has explicitly taught you how to reply in certain situations. Adhere to these rules above all else:
      ${settings.replyGuidelines.map((g, i) => `${i+1}. ${g}`).join('\n')}
      \n`;
  }

  const systemPrompt = `You are an expert social media manager for ${settings.businessName}, a ${settings.businessDescription}. 
            Target Audience: ${settings.targetAudience}. 
            Brand Voice: ${settings.brandVoice}. 
            
            Context: This is a ${type} (Direct Message or Public Comment).
            
            ${catalogString}
            Auto-Confirm Orders Enabled: ${settings.autoConfirmOrders}
            ${guidelinesPrompt}

            TASK: Analyze the message and classify it into EXACTLY ONE of the following sectors:
            [greeting, thanks, ask_price, product_query, track_order, cancel_order, refund_request, complaint, interested_in_buying, discount_offer_query, other, praise, criticism, ask_question, spam_promo, tag_friend, request_collab, report_abuse, marketing_gen_z_engage]

            RESPONSE RULES BY SECTOR:
            
            1. greeting: Respond warmly.
            2. thanks: You're welcome!
            3. ask_price: Provide price if in catalog, else ask user to check website.
            4. product_query: Answer relevant questions. If unknown, set action 'EMAIL_OWNER'.
            5. track_order: Ask for Order ID if not provided, or say you'll check.
            6. cancel_order: Ask for Order ID and reason.
            7. refund_request: Politely explain policy (contact support email).
            8. complaint: Apologize sincerely, ask for details to resolve via DM.
            9. interested_in_buying: Check catalog. If 'Auto-Confirm Orders' is TRUE, check stock/address, calculate total + $5 shipping, generate Order Code. If FALSE, email owner.
            10. discount_offer_query: State current offers or say no current discounts.
            11. other: General polite response.
            12. praise: Thank them enthusiastically!
            13. criticism: Respond professionally and apologize if valid.
            14. ask_question: Answer if business-related.
            15. spam_promo: Do NOT reply (replyText: null). Action: 'NONE'.
            16. tag_friend: "Thanks for tagging!" (if positive).
            17. request_collab: Ask them to email ${settings.orderConfirmationEmail || 'the business email'}.
            18. report_abuse: Thank them for reporting, state you will review.
            19. marketing_gen_z_engage: Reply using trendy Gen Z slang/emojis appropriate for the brand.

            SPECIAL ORDER LOGIC (for 'interested_in_buying' or explicit orders):
            - If 'Auto-Confirm Orders' is FALSE: Set 'replyText' to null. Set 'action' to 'EMAIL_OWNER'.
            - If 'Auto-Confirm Orders' is TRUE:
                1. Check Stock.
                2. Check Address (Set 'action' to 'ASK_ADDRESS' if missing).
                3. If Stock OK & Address OK: Confirm order, Total = (Price*Qty)+5. Generate Code. Set 'action' to 'EMAIL_OWNER'. Populate 'soldItems'.

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
                    category: { 
                        type: Type.STRING, 
                        description: "The classification of the message. Must be one of the 19 specified sectors."
                    },
                    replyText: { type: Type.STRING, description: "The text to send. Null if spam or auto-confirm disabled." },
                    action: { type: Type.STRING, enum: ['NONE', 'EMAIL_OWNER', 'ASK_ADDRESS'] },
                    internalNote: { type: Type.STRING, description: "A short summary for the dashboard toast." },
                    orderCode: { type: Type.STRING, description: "Generated order code." },
                    soldItems: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                productId: { type: Type.STRING },
                                quantity: { type: Type.NUMBER }
                            }
                        }
                    }
                }
            }
        }
    });
    
    const parsed = safeParseJSON(response.text || "");
    return {
        category: parsed.category || 'other',
        replyText: parsed.replyText || null,
        action: parsed.action || 'NONE',
        internalNote: parsed.internalNote || '',
        orderCode: parsed.orderCode,
        soldItems: parsed.soldItems || []
    };
  } catch (error: any) {
    console.error("Error generating reply:", error);
     let userFriendlyMessage = "I'm sorry, I'm having trouble processing your request right now.";
    if (error.message && (error.message.includes('API key not valid') || error.message.includes('permission denied'))) {
        userFriendlyMessage = "API Error: The configured API key is invalid or lacks permissions. Please check your key in Google AI Studio and ensure billing is enabled.";
    } else if (error.message && error.message.includes('500')) {
        userFriendlyMessage = "API Error: The server had a temporary issue. This can happen with complex requests. Please try again in a moment.";
    }

    return {
        category: 'other',
        replyText: userFriendlyMessage,
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
  
  // Strategy: Try Gemini 2.5 Flash Image first (multimodal generation/editing).
  // If it fails, and it's a pure text-to-image request, try Imagen (generation specialist).
  
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
          },
          config: {
              // Explicitly requesting a 1:1 aspect ratio can help prompt the model to generate an image
              imageConfig: { aspectRatio: '1:1' }
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
      
      // If we got a response but no image part, it might be a text refusal.
      if (!referenceImageBase64) throw new Error("No image generated by Gemini 2.5 Flash Image");
      
      return null;

  } catch (error) {
      console.warn("Gemini 2.5 Flash Image failed, attempting Imagen fallback:", error);

      // Fallback: If pure generation (no reference image), try Imagen
      if (!referenceImageBase64) {
          try {
             const response = await ai.models.generateImages({
                model: 'imagen-3.0-generate-001',
                prompt: `${prompt}. Context: ${settings.businessName}, ${settings.businessDescription}.`,
                config: {
                    numberOfImages: 1,
                    aspectRatio: '1:1',
                    outputMimeType: 'image/jpeg'
                }
             });
             
             if (response.generatedImages && response.generatedImages.length > 0) {
                 const img = response.generatedImages[0].image;
                 return `data:${img.mimeType || 'image/jpeg'};base64,${img.imageBytes}`;
             }
          } catch (imagenError) {
              console.error("Imagen fallback failed:", imagenError);
          }
      }
      
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