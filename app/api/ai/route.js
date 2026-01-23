import shumi, { reportErrorToServer } from 'coinrotator-utils/shumi.js';
import { fetchWithTimeout } from 'coinrotator-utils/fetchWithTimeout.mjs';
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { cookies } from 'next/headers';

// Cookie name for tracking free query usage (per-device, cross-tab)
const FREE_QUERY_COOKIE = 'shumi_free_used';

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
  const { messages, walletAddress, data, archetype } = await req.json();

  // AUTHENTICATION GATING: Require wallet address for Shumi AI access
  // One free query per device (tracked via HTTP-only cookie), subsequent queries require authentication
  const cookieStore = await cookies();
  const hasUsedFreeQuery = cookieStore.get(FREE_QUERY_COOKIE)?.value === 'true';
  const isAuthenticated = walletAddress && walletAddress.startsWith('0x');

  // Determine if this should be allowed as a free query
  const allowFreeQuery = !hasUsedFreeQuery && !isAuthenticated;

  if (!allowFreeQuery && !isAuthenticated) {
    console.log('Shumi AI access denied: Free query already used and no valid wallet address provided');
    return new Response(JSON.stringify({
      error: 'Authentication required',
      message: 'Wallet connection required to continue the conversation'
    }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }

  if (allowFreeQuery) {
    console.log('Shumi AI: Allowing free query without authentication (first query for this device)');
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
            // Only set message if there's specific progress info (like level/totalLevels)
            // Otherwise let the component handle rotating messages based on phase
            let message = null;
            if (progress.phase === 'executing' && progress.level && progress.totalLevels) {
              message = `Pulling market data (${progress.level}/${progress.totalLevels})...`;
            }

            const progressData = {
              ...progress,
              ...(message ? { message } : {})
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
        const response = await shumi({ messages, walletAddress, data, archetype, onProgress, promptVersion: 'production', enableSuggestions: true });

        // Check if shumi returned an error Response directly
        if (response instanceof Response && !response.toUIMessageStreamResponse && !response.toDataStreamResponse) {
          // Extract the original error from shumi's error Response
          // shumi returns: new Response(JSON.stringify({ error, message, type, details }), { status: 500 })
          try {
            const errorData = await response.json();
            const originalError = new Error(errorData.message || 'An error occurred while processing your request.');
            originalError.name = errorData.type || 'Error';
            // Preserve stack trace if available (only in development)
            if (errorData.details?.stack) {
              originalError.stack = errorData.details.stack;
            }
            // Preserve cause if available
            if (errorData.details?.cause) {
              originalError.cause = errorData.details.cause;
            }
            // Throw the original error to trigger onError handler
            // This preserves the original error message and context
            throw originalError;
          } catch (parseError) {
            // If we can't parse the error response (e.g., body already consumed),
            // at least preserve the parse error information
            console.error('Failed to parse error response from shumi:', parseError);
            const fallbackError = new Error('An error occurred while processing your request.');
            if (parseError instanceof Error) {
              fallbackError.cause = parseError;
            }
            throw fallbackError;
          }
        }

        // Parse suggestions from full text after stream completes
        // Use response.text which is a promise that resolves to the full text
        response.text.then((fullText) => {
          if (fullText) {
            try {
              console.log('[API] Parsing suggestions from response text, length:', fullText.length);
              // Try multiple regex patterns to catch different JSON block formats
              const patterns = [
                /```json\s*(\{[\s\S]*?"suggestions"[\s\S]*?\})\s*```/,
                /```\s*json\s*(\{[\s\S]*?"suggestions"[\s\S]*?\})\s*```/,
                /\{[\s\S]*?"suggestions"[\s\S]*?\}/
              ];

              let jsonMatch = null;
              for (const pattern of patterns) {
                jsonMatch = fullText.match(pattern);
                if (jsonMatch) break;
              }

              if (jsonMatch) {
                try {
                  const parsed = JSON.parse(jsonMatch[1]);
                  if (parsed.suggestions && Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
                    // Send suggestions as metadata
                    writer.write({
                      type: 'data-suggestions',
                      id: 'suggestions-1',
                      data: { suggestions: parsed.suggestions },
                      transient: false
                    });
                    console.log('[API] ✓ Sent suggestions:', parsed.suggestions);
                  } else {
                    console.log('[API] Parsed JSON but no valid suggestions array:', parsed);
                  }
                } catch (parseError) {
                  console.error('[API] Failed to parse suggestions JSON:', parseError, 'JSON string:', jsonMatch[1].substring(0, 200));
                }
              } else {
                // Log last 500 chars to see what the response ends with
                const lastChars = fullText.slice(-500);
                console.log('[API] No suggestions JSON block found. Response ends with:', lastChars);
              }
            } catch (error) {
              console.error('[API] Error processing suggestions:', error);
            }
          } else {
            console.log('[API] No full text available from response');
          }
        }).catch((error) => {
          console.error('[API] Error getting full text from response:', error);
        });

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

    // Set the free query cookie if this was a free query (marks device as having used free query)
    if (allowFreeQuery) {
      cookieStore.set(FREE_QUERY_COOKIE, 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365 // 1 year
      });
      console.log('Shumi AI: Set free query cookie for this device');
    }

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