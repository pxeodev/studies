/**
 * Test endpoint for classification validation
 * Returns just the query plan without executing tools
 */

import { NextResponse } from 'next/server';
import { classifyQueryOnly } from 'coinrotator-utils/shumi.js';
import { Langfuse } from 'langfuse';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY || process.env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASEURL || process.env.LANGFUSE_HOST || process.env.NEXT_PUBLIC_LANGFUSE_HOST
});

// Cache for classification prompt
let cachedPrompt = null;
let cachedPromptTime = 0;
const CACHE_TTL = 60000; // 1 minute

async function getClassificationPrompt() {
  const now = Date.now();
  if (cachedPrompt && (now - cachedPromptTime) < CACHE_TTL) {
    return cachedPrompt;
  }

  const prompt = await langfuse.getPrompt('base/Classification Prompt', undefined, { label: 'sandbox' });

  // Also fetch tool definitions
  const toolDefs = await langfuse.getPrompt('base/Tool Definitions', undefined, { label: 'sandbox' });

  // Replace {{Tool Definitions}} placeholder
  const fullPrompt = prompt.prompt.replace('{{Tool Definitions}}', toolDefs.prompt);

  cachedPrompt = fullPrompt;
  cachedPromptTime = now;

  return fullPrompt;
}

export async function POST(request) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }

    const classificationPrompt = await getClassificationPrompt();

    // Get classification plan without executing
    const result = await classifyQueryOnly(
      query,
      classificationPrompt,
      [], // no session history
      'openai/gpt-4.1-mini'
    );

    return NextResponse.json({
      queryType: result.queryType,
      description: result.description,
      plan: result.plan,
      additionalContext: result.additionalContext
    });

  } catch (error) {
    console.error('Classification test error:', error);
    return NextResponse.json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
