
// api/facebook-webhook.js

/**
 * CONFIGURATION
 * In a real production app, use process.env.VERIFY_TOKEN and process.env.PAGE_ACCESS_TOKEN
 */
const VERIFY_TOKEN = "social-agent-secret-123";
const PAGE_ACCESS_TOKEN = "EAAT4OKUX8ioBQBN2emnOMdngMWS5j1KwPUfEbsUZBUMPWjqzx0WGyhQcimlKXZBZC8Nrm1hcXKefZAMSC8QZCr7GR16KHppTZANX5jVNhdYhZBCIOkS2IZAM0DbcVJZCB9pacTDf6dWL5sYsJBe4F6ZA572Jeia6TlX71TZCSan0tVKZArjlAWxTBZAnk0WlwoZBVloZAko9vfXNCkTNCPQF0gRrRjrBZBHwyKeQoDhZAe995h0J25J4wfG5zHlvARZCh6qlBjYHCyQvBi475zomOZB7K9N04iiopUe";

export default async function handler(req, res) {
  // 1. Handle GET requests (Webhook Verification)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('WEBHOOK_VERIFIED');
        return res.status(200).send(challenge);
      } else {
        console.error('Verification failed: Tokens do not match');
        return res.status(403).send('Forbidden');
      }
    }
    return res.status(400).send('Bad Request');
  }

  // 2. Handle POST requests (Incoming Events)
  if (req.method === 'POST') {
    const body = req.body;

    // Check if this is an event from a Page subscription
    if (body.object === 'page') {
      try {
        // Iterate over each entry - there may be multiple if batched
        for (const entry of body.entry) {
          const pageID = entry.id;
          const timeOfEvent = entry.time;

          // A. Handle Messenger Messages (Direct Messages)
          if (entry.messaging) {
            for (const event of entry.messaging) {
              await processMessengerEvent(event);
            }
          }

          // B. Handle Feed Changes (Comments, Posts)
          if (entry.changes) {
            for (const change of entry.changes) {
              await processFeedEvent(change);
            }
          }
        }

        // Return a '200 OK' response to all events
        return res.status(200).send('EVENT_RECEIVED');

      } catch (error) {
        console.error('Error processing event:', error);
        // Still return 200 to prevent FB from retrying indefinitely
        return res.status(200).send('EVENT_PROCESSED_WITH_ERRORS');
      }
    } else {
      // Return a '404 Not Found' if event is not from a page subscription
      return res.status(404).send('Not Found');
    }
  }

  // Handle unsupported methods
  return res.status(405).send('Method Not Allowed');
}

// ==========================================
// EVENT PROCESSORS
// ==========================================

async function processMessengerEvent(event) {
  const senderId = event.sender.id;
  
  // 1. Handle Text Message
  if (event.message && event.message.text && !event.message.is_echo) {
    console.log(`Received message from ${senderId}: ${event.message.text}`);
    
    // TODO: Connect your AI/Gemini logic here to generate the response text
    const responseText = `You said: "${event.message.text}". (AI Backend Auto-Reply)`;
    
    await sendMessengerReply(senderId, responseText);
  }
  
  // 2. Handle Postback (Button clicks)
  else if (event.postback) {
    console.log(`Received postback from ${senderId}: ${event.postback.payload}`);
    await sendMessengerReply(senderId, "Button clicked!");
  }
  
  // 3. Handle Echo (Messages sent BY the page) - usually ignore
  else if (event.message && event.message.is_echo) {
    console.log(`Received echo for message to ${event.recipient.id}`);
  }
}

async function processFeedEvent(change) {
  const value = change.value;
  const field = change.field; // 'feed' or 'comments'

  if (field === 'feed' || field === 'comments') {
    const item = value.item; // 'comment' or 'post'
    const verb = value.verb; // 'add', 'edited', 'remove'

    // Handle New Comments
    if (item === 'comment' && verb === 'add') {
      const commentId = value.comment_id;
      const message = value.message;
      const senderName = value.from.name;
      const senderId = value.from.id;
      
      // Prevent infinite loops: check if sender is the Page itself
      // Note: In production, compare senderId with your Page ID
      if (senderId === "YOUR_PAGE_ID") return;

      console.log(`New comment from ${senderName}: ${message}`);

      // Example: Moderation Logic
      if (message.toLowerCase().includes('scam') || message.toLowerCase().includes('hate')) {
        await hideComment(commentId);
        // await deleteComment(commentId); // Optional: Delete instead of hide
        console.log(`Hidden comment ${commentId} due to flagged keywords.`);
      } else {
        // Example: Auto Reply to Comment
        const replyText = `Thanks for your comment, ${senderName}! We'll get back to you shortly.`;
        await replyToComment(commentId, replyText);
      }
    }
  }
}

// ==========================================
// GRAPH API HELPERS (Send API)
// ==========================================

const FB_API_URL = "https://graph.facebook.com/v19.0";

/**
 * Send a text message via Messenger
 */
async function sendMessengerReply(recipientId, text) {
  const url = `${FB_API_URL}/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;
  const body = {
    recipient: { id: recipientId },
    message: { text: text }
  };

  return callFacebookAPI(url, 'POST', body);
}

/**
 * Reply to a specific comment (Nested Comment)
 */
async function replyToComment(commentId, text) {
  const url = `${FB_API_URL}/${commentId}/comments?access_token=${PAGE_ACCESS_TOKEN}`;
  const body = {
    message: text
  };

  return callFacebookAPI(url, 'POST', body);
}

/**
 * Hide a specific comment
 */
async function hideComment(commentId) {
  const url = `${FB_API_URL}/${commentId}?access_token=${PAGE_ACCESS_TOKEN}`;
  const body = {
    is_hidden: true
  };

  return callFacebookAPI(url, 'POST', body);
}

/**
 * Delete a specific comment
 */
async function deleteComment(commentId) {
  const url = `${FB_API_URL}/${commentId}?access_token=${PAGE_ACCESS_TOKEN}`;
  return callFacebookAPI(url, 'DELETE');
}

/**
 * Generic Fetch Wrapper
 */
async function callFacebookAPI(url, method, body = null) {
  try {
    const options = {
      method: method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (data.error) {
      console.error('Facebook API Error:', data.error);
      throw new Error(data.error.message);
    }

    return data;
  } catch (error) {
    console.error('Network/Fetch Error:', error);
  }
}
