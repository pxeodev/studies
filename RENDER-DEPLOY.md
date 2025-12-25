# Render Static Site Deployment Guide

## Current Issue: "Not Found" Error

The site is showing "not found" because either:
1. Files aren't in the connected repository
2. Publish Directory is incorrect
3. Root Directory is wrong

## Required Render Configuration

### In Render Dashboard:

1. **Branch:** `main`

2. **Root Directory:** 
   - Leave **EMPTY** (blank)
   - OR if files are in a subdirectory, enter that path (e.g., `ai-comparison-cards-1`)

3. **Build Command:**
   - Leave **EMPTY** (blank)
   - OR: `echo "No build needed"`

4. **Publish Directory:**
   - Must be exactly: `.` (single dot, no quotes)
   - This tells Render to publish from the root where `index.html` is located

## File Structure Required

Your repository must have this structure at the root (or in Root Directory if specified):

```
repository-root/
├── index.html          ← Must exist here
├── app.js
├── styles.css
├── shumi-avatar.png
├── assets/
│   └── Symbol.png
└── [all other HTML files]
```

## Troubleshooting Steps

1. **Verify files are in the repository:**
   - Check that `index.html` exists in the root of your `studies` repository
   - All files should be committed and pushed to GitHub

2. **Check Render logs:**
   - Go to Render Dashboard → Your Static Site → Logs
   - Look for deployment errors

3. **Verify Publish Directory:**
   - Must be exactly `.` (not `./` or `./build` or anything else)
   - This is the most common issue

4. **If files are in a subdirectory:**
   - Set Root Directory to that subdirectory name
   - Keep Publish Directory as `.`

## Quick Fix

If you're deploying from the `studies` repository:

1. Make sure all files (index.html, app.js, styles.css, etc.) are in the root of the `studies` repo
2. Set Publish Directory to: `.`
3. Leave Build Command empty
4. Leave Root Directory empty (unless files are in a subfolder)
5. Redeploy

