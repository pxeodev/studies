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
