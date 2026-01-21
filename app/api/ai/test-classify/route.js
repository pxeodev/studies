/**
 * Test endpoint for classification validation
 * Returns the query plan with retry metadata for evaluation
 */

import { NextResponse } from 'next/server';
import { classifyQueryWithValidation } from 'coinrotator-utils/shumi.js';
import { Langfuse } from 'langfuse';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY || process.env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.LANGFUSE_BASEURL || process.env.LANGFUSE_HOST || process.env.NEXT_PUBLIC_LANGFUSE_HOST
});

// Cache for prompts
let cachedData = null;
let cachedDataTime = 0;
const CACHE_TTL = 60000; // 1 minute

async function getClassificationData() {
  const now = Date.now();
  if (cachedData && (now - cachedDataTime) < CACHE_TTL) {
    return cachedData;
  }

  const prompt = await langfuse.getPrompt('base/Classification Prompt', undefined, { label: 'sandbox' });
  const toolDefs = await langfuse.getPrompt('base/Tool Definitions', undefined, { label: 'sandbox' });

  // Replace {{Tool Definitions}} placeholder
  const fullPrompt = prompt.prompt.replace('{{Tool Definitions}}', toolDefs.prompt);

  // Parse tool definitions to extract required params and full definitions
  let toolDefinitions = {};
  let toolRequiredParams = {};
  try {
    toolDefinitions = JSON.parse(toolDefs.prompt);
    // Extract required params from each tool
    for (const [toolName, toolDef] of Object.entries(toolDefinitions)) {
      if (toolDef.parameters?.required) {
        toolRequiredParams[toolName] = toolDef.parameters.required;
      }
    }
  } catch (e) {
    console.warn('Failed to parse tool definitions for validation:', e.message);
  }

  cachedData = { fullPrompt, toolDefinitions, toolRequiredParams };
  cachedDataTime = now;

  return cachedData;
}

export async function POST(request) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }

    const { fullPrompt, toolDefinitions, toolRequiredParams } = await getClassificationData();

    // Get classification plan with validation and retry tracking
    const result = await classifyQueryWithValidation(
      query,
      fullPrompt,
      [], // no session history
      'openai/gpt-4.1-mini',
      null, // classifierProviders
      toolRequiredParams,
      toolDefinitions
    );

    // Extract metadata before returning
    const metadata = result._metadata;
    delete result._metadata;

    return NextResponse.json({
      queryType: result.queryType,
      description: result.description,
      plan: result.plan,
      additionalContext: result.additionalContext,
      _metadata: metadata
    });

  } catch (error) {
    console.error('Classification test error:', error);
    return NextResponse.json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
