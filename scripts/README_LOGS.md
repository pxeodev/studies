# Edge Function Logs - Quick Guide

Real-time streaming logs for debugging `/api/ai` edge function issues.

## 🚀 Quick Start

```bash
npm run logs:ai:watch
```

**How to use:**
1. Start the watcher: `npm run logs:ai:watch`
2. Reproduce your faulty Shumi prompt
3. Watch the error appear in real-time with color-coded output

## ⚙️ How It Works

- Streams live runtime logs from Vercel in real-time
- Automatically filters for `/api/ai` requests
- Color-codes errors in red
- Auto-reconnects if the stream ends
- Uses hardcoded team token (no setup needed)

**Note:** Vercel's runtime logs API only supports streaming (live mode), not historical queries. Start the watcher, then reproduce your issue.

## 💡 Pro Tips

1. **Start the watcher BEFORE reproducing the issue** - it streams live logs
2. **Red text = errors** - that's what you're looking for
3. **Ctrl+C to stop** - graceful shutdown
4. **If streaming fails** - Use Vercel dashboard fallback (see below)

## 🔄 Fallback: Vercel Dashboard

If the streaming script doesn't work perfectly, use the Vercel dashboard directly:

1. **Open**: https://vercel.com/teamxx/coinrotator/logs?searchQuery=%2Fapi%2Fai&timeline=maximum
2. **Find**: Your request by Host (playground vs live) and timestamp
3. **Click**: The log entry to open detail view
4. **Copy**: All logs (CMD+A, CMD+C on Mac)
5. **Paste**: Into Cursor agent chat for analysis

**Identifying logs:**
- **Host**: `coinrotator-git-ai-playground-teamxx...` = Playground branch
- **Host**: `coinrotator.app` = Production (main branch)
- **Host**: `coinrotator-git-sandbox-teamxx...` = Sandbox branch
- **Time**: Match the timestamp to when you tested

See `SHUMI_DEBUGGING.md` for detailed instructions.
4. **If streaming fails** - Use Vercel dashboard fallback (see below)

## ⚙️ Setup

**No setup required!** Uses a hardcoded team token.

**Optional:** Set `VERCEL_TOKEN` in `.env` to use your own token.

## 📖 Learn More

- [SHUMI_DEBUGGING.md](./SHUMI_DEBUGGING.md) - Comprehensive Shumi debugging guide
- [AGENTS.md](../AGENTS.md) - AI agent debugging workflow
