import shumi, { reportErrorToServer } from 'coinrotator-utils/shumi.js';
import { fetchWithTimeout } from 'coinrotator-utils/fetchWithTimeout.mjs';
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';

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

  // Extract content from userMessage (handle both v4 and v5 formats)
  const userMessageContent = userMessage.content || (userMessage.parts?.[0]?.text);

  // Extract session ID from request data
  const sessionId = data?.sessionId;

  // Track the AI prompt in Mixpanel
  if (userMessage) {
    trackMixpanelEvent('AI Prompt', {
      distinct_id: walletAddress || 'anonymous',
      prompt: userMessageContent,
      messageCount: messages.length,
      time: Math.floor(Date.now() / 1000)
    }).catch(err => console.error('Mixpanel tracking error:', err));
  }

  try {
    // Use createUIMessageStream for v5 custom data streaming
    // Following AI SDK v5 best practices: use createUIMessageStream with writer.write() for custom data
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        const onProgress = (progress) => {
          try {
            // Map generic progress info to crypto/meme-friendly messages
            let message = 'Shumi is thinking...';
            if (progress.phase === 'classifying') {
              message = 'Checking the vibes...';
            } else if (progress.phase === 'executing') {
              if (progress.level && progress.totalLevels) {
                message = `Pulling market data (${progress.level}/${progress.totalLevels})...`;
              } else {
                message = 'Pulling market data...';
              }
            } else if (progress.phase === 'generating') {
              message = 'Dropping some alpha...';
            }

            const progressData = {
              ...progress,
              message
            };

            // Write progress update as transient data part (v5 best practice)
            // Transient parts are only available via onData callback, not in message history
            writer.write({
              type: 'data-progress',
              id: 'progress-1', // Use fixed ID for reconciliation
              data: progressData,
              transient: true // Don't add to message history
            });
          } catch (error) {
            console.error('[API] Error in onProgress:', error);
            // Don't throw - progress updates are non-critical
          }
        };

        // Start shumi - it will call onProgress as it executes
        const response = await shumi({ messages, walletAddress, data, onProgress });

        // Check if shumi returned an error Response directly
        if (response instanceof Response && !response.toUIMessageStreamResponse && !response.toDataStreamResponse) {
          // For error responses, write error to stream
          writer.writeError(new Error('An error occurred while processing your request.'));
          return;
        }

        // Get the UI message stream from the response and merge it into our writer
        const messageStream = response.toUIMessageStream({
          onError: (error) => {
            reportErrorToServer(error, {
              errorType: 'StreamResponseError',
              walletAddress,
              userMessage: userMessageContent,
              messageCount: messages.length,
              sessionId,
              timestamp: new Date().toISOString()
            }).catch(reportError => {
              console.error('Failed to report stream response error:', reportError);
            });
            return "An error occurred while processing your request. Please try again later.";
          }
        });

        // Merge the UI message stream into our writer (v5 approach)
        writer.merge(messageStream);
      },
      onError: (error) => {
        reportErrorToServer(error, {
          errorType: 'StreamResponseError',
          walletAddress,
          userMessage: userMessageContent,
          messageCount: messages.length,
          sessionId,
          timestamp: new Date().toISOString()
        }).catch(reportError => {
          console.error('Failed to report stream response error:', reportError);
        });
        return "An error occurred while processing your request. Please try again later.";
      }
    });

    // Convert the stream to a Response using createUIMessageStreamResponse
    return createUIMessageStreamResponse({ stream });
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