import shumi, { reportErrorToServer } from 'coinrotator-utils/shumi.js';
import { fetchWithTimeout } from 'coinrotator-utils/fetchWithTimeout.mjs';

// Function to track events in Mixpanel using fetch (Edge runtime compatible)
const trackMixpanelEvent = async (event, properties) => {
  try {
    const token = '743aa6797630eaf251e029aaed46382f';
    const data = {
      event,
      properties: {
        token,
        ...properties
      }
    };
    const encodedData = Buffer.from(JSON.stringify(data)).toString('base64');
    const response = await fetchWithTimeout('https://api.mixpanel.com/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/plain'
      },
      body: `data=${encodedData}`
    });
    if (!response.ok) {
      console.error('Failed to track event in Mixpanel:', await response.text());
    } else {
      console.log(`Successfully tracked "${event}" event in Mixpanel`);
    }
  } catch (error) {
    console.error('Error tracking event in Mixpanel:', error);
  }
};

export async function POST(req) {
  const { messages, walletAddress, data } = await req.json();
  const userMessages = messages.filter(message => message.role === 'user');
  console.log('Received POST request with user messages:', JSON.stringify(userMessages, null, 2));
  console.log('Request data:', data);

  // AUTHENTICATION GATING: Require wallet address for Shumi AI access
  if (!walletAddress || !walletAddress.startsWith('0x')) {
    console.log('Shumi AI access denied: No valid wallet address provided');
    return new Response(JSON.stringify({
      error: 'Authentication required',
      message: 'Wallet connection required to access Shumi AI'
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }

  // Get the user message (last message in the array)
  const userMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  if (!userMessage || userMessage.role !== 'user') {
    return new Response(JSON.stringify({
      error: 'Invalid request',
      message: 'No user message found in the request'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }

  // Extract session ID from request data
  const sessionId = data?.sessionId;
  console.log('Session ID:', sessionId);

  // Track the AI prompt in Mixpanel
  if (userMessage) {
    trackMixpanelEvent('AI Prompt', {
      distinct_id: walletAddress || 'anonymous',
      prompt: userMessage.content,
      messageCount: messages.length,
      time: Math.floor(Date.now() / 1000)
    }).catch(err => console.error('Mixpanel tracking error:', err));
  }

  try {
    const response = await shumi({ messages, walletAddress, data, promptVersion: 'playground' });
    const streamResponse = response.toDataStreamResponse({
      getErrorMessage: (error) => {
        reportErrorToServer(error, {
          errorType: 'StreamResponseError',
          walletAddress,
          userMessage: userMessage?.content,
          messageCount: messages.length,
          sessionId,
          timestamp: new Date().toISOString()
        }).catch(reportError => {
          console.error('Failed to report stream response error:', reportError);
        });
        return "An error occurred while processing your request. Please try again later.";
      }
    });
    return streamResponse;
  } catch(e) {
    console.error('API Error:', {
      name: e.name,
      message: e.message,
      stack: e.stack,
      cause: e.cause
    });

    // Return a more detailed error response
    return new Response(JSON.stringify({
      error: 'Server error',
      message: e.message,
      type: e.name,
      details: process.env.NODE_ENV === 'development' ? {
        stack: e.stack,
        cause: e.cause
      } : undefined
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }
}