# Agent Instructions

## Context Loading

At the start of every session, the **Shumi Kanban board** from Notion should be loaded into context. This is the master Kanban board for all tasks related to Shumi and makes it a north star for the entire project.

### Shumi Kanban Board Details

- **Workspace:** Pxeo's Notion
- **Database ID:** `64d8ab4b-cd71-4256-b642-a64519ca6bef`
- **Page URL:** https://www.notion.so/e1485705a11547aab50a4137d16024ae
- **Parent Page:** Shumi Test Roadmap

This Kanban board tracks tasks across multiple columns:
- **Ideas** - Initial ideas and concepts
- **Plan** - Planned tasks ready for execution
- **Shaping / Refinement** - Tasks being refined and shaped
- **Currently Doing** - Active work in progress
- **Review** - Tasks under review

### Loading the Board

**CRITICAL**: At the very start of every session, immediately load the entire Kanban board using this exact query:

```javascript
mcp_notion_API-query-data-source(
  data_source_id: "64d8ab4b-cd71-4256-b642-a64519ca6bef"
  // No filters - load ALL tasks across all columns
)
```

This single query will return all tasks with their:
- **Task** (title)
- **List** (column: Ideas, Plan, Shaping/Refinement, Currently Doing, Review)
- **Status** (Not started, In progress, Done)
- **Due Date** (if set)
- **Place** (if set)

After loading, organize the tasks by their `List` property to understand the current state of the project. This board serves as the north star for all Shumi-related work.

**Note**: If a task needs more detail, fetch its page content using `mcp_notion_API-retrieve-a-page` and `mcp_notion_API-get-block-children` to see any additional notes or requirements.

### Relationship between coinrotator repositoies

The git repositories `coinrotator` and `coinrotator-ai` are closely related. The `coinrotator` repository is the main repository for the coinrotator frontend and the `coinrotator-ai` repository is the main repository for the backend.

Both import the `coinrotator-utils` repository for shared utilities, including the Shumi Engine.

Whenever you change something in the `coinrotator-utils` repository, you should also update the package.json version of `coinrotator-utils`, then git push it and then update the package.json version of `coinrotator-utils` in the `coinrotator` and `coinrotator-ai` repositories to use the new version. Do the update by using `yarn upgrade coinrotator-utils --latest`.

## Debugging AI Endpoint Issues

### When a User Reports Prompt/AI Issues

When a developer reports that "the latest prompt is not working" or has issues with the `/api/ai` endpoint, follow this workflow:

#### Quick Reference

**Primary Command:**
```bash
npm run logs:ai:watch
```

This streams **live runtime logs** in real-time. Perfect for debugging:
1. Start the watcher: `npm run logs:ai:watch`
2. Reproduce your faulty Shumi prompt
3. Watch the error appear in real-time with color-coded output
4. Agent can analyze the error immediately

**Note:** Vercel's runtime logs API only supports streaming (live mode), not historical queries. The dashboard shows historical logs, but for programmatic access, use `logs:ai:watch` to stream logs in real-time.

#### Workflow Summary

**Method 1: Live Streaming (Recommended)**
1. **Start watcher**: Run `npm run logs:ai:watch` in terminal
2. **Reproduce issue**: User triggers the faulty Shumi prompt
3. **Watch stream**: Agent sees error appear in real-time with color-coded output
4. **Analyze immediately**: Agent can debug the error as it happens
5. **No manual selection needed**: Stream shows only /api/ai logs automatically

**Method 2: Vercel Dashboard (Fallback)**
If streaming doesn't work perfectly, use the Vercel dashboard:
1. **Open dashboard**: https://vercel.com/teamxx/coinrotator/logs?searchQuery=%2Fapi%2Fai&timeline=maximum
2. **Find request**: Look for the log by Host (playground vs live) and timestamp
3. **Click log**: Click on the relevant log entry to open detail view
4. **Copy logs**: Select all logs (CMD+A on Mac) and copy (CMD+C)
5. **Paste to agent**: User pastes logs into chat, agent analyzes them

**Note**: The dashboard method is useful when:
- Streaming script isn't working
- Need to check historical logs
- Want to see logs in Vercel's UI format

**When User Pastes Logs from Dashboard:**
- Extract the Request ID from the logs
- Identify which Shumi stage failed (see SHUMI_DEBUGGING.md)
- Look for error patterns (red text, ERROR messages)
- Identify branch/environment from Host field
- Provide analysis and next steps

#### Complete Documentation

For detailed instructions, examples, and troubleshooting, refer to:

- **`/scripts/SHUMI_DEBUGGING.md`** - Complete guide for debugging Shumi issues, understanding the flow, and identifying failure stages

#### Prerequisites

**No setup required!** The script uses Vercel SDK with a hardcoded team token. Just run:

```bash
npm run logs:ai:watch
```

The script will automatically connect to Vercel and stream logs.

**For team members:** If you want to use your own Vercel token instead of the shared team token:
1. Create a token at https://vercel.com/account/tokens with team scope access
2. Add `VERCEL_TOKEN=your_token_here` to your local `.env` file
3. The script will automatically use your token instead of the hardcoded one

**Note:** The hardcoded token has team access and never expires, so most team members won't need to set up their own.

#### Key Files

- **Live Watcher**: `/scripts/watch-ai-logs.js` - Real-time streaming logs using Vercel SDK
- **Route**: `/app/api/ai/route.js` - The actual API implementation

**Important:** Vercel's runtime logs API only supports **streaming (live mode)**, not historical queries. The dashboard shows historical logs, but for programmatic access, use `logs:ai:watch` to stream logs in real-time.
