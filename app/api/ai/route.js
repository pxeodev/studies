import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';
import auth from '../../../utils/auth.js'

export const config = {
  runtime: 'edge'
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const systemPrompt = await readFile(path.join(__dirname, 'systemprompt.txt'), 'utf-8');
const openrouter = createOpenRouter({
  apiKey: process.env.OPEN_ROUTER_API_KEY,
});

export async function POST(req) {
  const { messages, walletAddress } = await req.json();
  let hasKeyPass = false;

  try {
    hasKeyPass = await auth(walletAddress);
    if (!hasKeyPass) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
  } catch(e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Server error' }), { status: 500 });
  }

  const result = streamText({
    model: openrouter('qwen/qwen-max:online'),
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      ...messages
    ],
  });

  return result.toDataStreamResponse();
}