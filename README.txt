AI COMPARISON REPORT CARDS - CONSOLIDATED EDITION
==================================================

Interactive HTML presentation for comparing Shumi AI against multiple competitors.
All logic and data consolidated into a SINGLE app.js file.

Current Status: 5 AI comparisons (BingX, Nansen, Sentient, Intellectia, ChainGPT)
Total Questions: 44 across all comparisons


HOW TO USE
----------

1. Open "index.html" in your browser
2. Select which AI comparison to view
3. Navigate with arrow keys (← →) or click buttons
4. Press ESC to return to main menu


FILE STRUCTURE
--------------

ESSENTIAL FILES:
- index.html                    Main competitor selection page
- index-bingx.html              BingX comparison menu
- index-nansen.html             Nansen comparison menu
- index-sentient.html           Sentient comparison menu
- index-intellectia.html        Intellectia comparison menu
- index-chaingpt.html           ChainGPT comparison menu
- app.js                        ⭐ ALL CODE AND DATA (5,738 lines)
- styles.css                    Visual styling

QUESTION SLIDES:
- [competitor]-q1.html through [competitor]-q10.html
- [competitor]-overview.html
- [competitor]-summary.html

Old BingX slides still use "slide-" prefix (slide-q1.html, etc.)


THE APP.JS STRUCTURE (IMPORTANT!)
==================================

app.js contains EVERYTHING in this order:

1. NAVIGATION & UTILITIES (lines 1-55)
   - Keyboard navigation
   - Data binding helpers
   - Score utilities

2. DATA OBJECTS (lines 56-5600)
   Each competitor has its own const:
   - const CARD_DATA = { ... }               // BingX
   - const CARD_DATA_NANSEN = { ... }
   - const CARD_DATA_SENTIENT = { ... }
   - const CARD_DATA_INTELLECTIA = { ... }
   - const CARD_DATA_CHAINGPT = { ... }

3. UNIVERSAL TEMPLATE SYSTEM (lines 5601-5738)
   - Auto-detects which comparison from filename
   - Renders question slides dynamically
   - Handles verdict slides (BingX only)


HOW TO ADD A NEW AI COMPARISON
===============================

STEP 1: ADD DATA TO APP.JS
---------------------------

Open app.js in a text editor (VS Code recommended)

Scroll to around line 5600 (after CARD_DATA_CHAINGPT)

Add your new data object BEFORE the "UNIVERSAL TEMPLATE SYSTEM" comment:

const CARD_DATA_YOURNAME = {
  _meta: {
    version: "1.0.0",
    generated: "2025-12-23T12:00:00Z",
    comparisonType: "AI Performance Benchmarking - Shumi vs YourName",
    lastUpdate: "Initial comparison"
  },

  reportTitle: "AI COMPARISON REPORT",
  reportSubtitle: "SHUMI AI VS YOURNAME AI",
  comparisonDate: "December 2025",

  primaryAI: {
    name: "Shumi AI",
    tagline: "CoinRotator's Trend Intelligence",
    color: "#00ff88"
  },

  competitorAI: {
    name: "YourName AI",
    tagline: "Your AI's Tagline",
    color: "#ff0000"  // Pick a color
  },

  overallScores: {
    shumi: 85.0,
    yourname: 75.0,  // Use lowercase key
    gap: 10.0
  },

  questions: [
    {
      id: 1,
      title: "Question Title",
      prompt: "The full question text",

      scores: {
        shumi: 87,
        yourname: 75  // Use lowercase key matching competitorAI
      },

      shumi: {
        strengths: [
          "Strength 1",
          "Strength 2"
        ],
        weaknesses: [
          "Weakness 1"
        ],
        verdict: "Brief verdict",
        rawResponse: `Optional: full raw response text`
      },

      yourname: {  // Use lowercase key
        strengths: ["..."],
        weaknesses: ["..."],
        verdict: "...",
        rawResponse: `...`
      }
    },
    // Add more questions...
  ],

  keyInsights: [
    {
      title: "Insight Title",
      insight: "The insight text",
      importance: "critical"  // or "high", "medium"
    }
  ],

  winner: {
    name: "Shumi AI",
    scoreGap: "+10.0 points",
    tagline: "Why Shumi won",
    confidence: "high"
  },

  taglines: {
    index: "Main tagline",
    overview: "Overview tagline",
    q1: "Question 1 tagline",
    q2: "Question 2 tagline",
    // ... add for each question
    summary: "Summary tagline"
  }
};


STEP 2: UPDATE UNIVERSAL TEMPLATE
----------------------------------

Find function getCompetitorFromPath() (around line 5610)

Add your competitor detection:

function getCompetitorFromPath() {
  const path = window.location.pathname;
  const filename = path.substring(path.lastIndexOf('/') + 1);

  if (filename.includes('nansen')) return 'nansen';
  if (filename.includes('sentient')) return 'sentient';
  if (filename.includes('intellectia')) return 'intellectia';
  if (filename.includes('chaingpt')) return 'chaingpt';
  if (filename.includes('yourname')) return 'yourname';  // ADD THIS
  return 'bingx';
}


Find function getDataObject(competitor) (around line 5620)

Add your data mapping:

function getDataObject(competitor) {
  switch(competitor) {
    case 'nansen': return CARD_DATA_NANSEN;
    case 'sentient': return CARD_DATA_SENTIENT;
    case 'intellectia': return CARD_DATA_INTELLECTIA;
    case 'chaingpt': return CARD_DATA_CHAINGPT;
    case 'yourname': return CARD_DATA_YOURNAME;  // ADD THIS
    default: return CARD_DATA;
  }
}


Find function getCompetitorKey(competitor) (around line 5630)

Add your key mapping:

function getCompetitorKey(competitor) {
  switch(competitor) {
    case 'nansen': return 'nansen';
    case 'sentient': return 'sentient';
    case 'intellectia': return 'intellectia';
    case 'chaingpt': return 'chaingpt';
    case 'yourname': return 'yourname';  // ADD THIS
    default: return 'bingx';
  }
}


STEP 3: ADD CSS COLOR
----------------------

Open styles.css

Add color variables:

:root {
  --shumi-color: #00ff88;
  --bingx-color: #ff6b35;
  --nansen-color: #4169e1;
  --sentient-color: #9d4edd;
  --intellectia-color: #ff1493;
  --chaingpt-color: #00d4ff;
  --yourname-color: #ff0000;  /* ADD THIS */
  --yourname-glow: rgba(255, 0, 0, 0.3);  /* ADD THIS */
}

Add color classes:

.yourname-color { color: var(--yourname-color) !important; }
.winner-yourname {
  color: var(--yourname-color) !important;
  box-shadow: 0 0 20px var(--yourname-glow);
}
.score-bar-yourname { background: var(--yourname-color); }


STEP 4: CREATE HTML FILES
--------------------------

You need to create these files (copy from existing competitor):

1. index-yourname.html           (menu page - copy from index-nansen.html)
2. yourname-overview.html        (overview slide)
3. yourname-q1.html              (question 1)
4. yourname-q2.html              (question 2)
   ... etc for each question
5. yourname-summary.html         (summary slide)

IMPORTANT: Each HTML file must:
- Include: <script src="app.js"></script>
- Have filename containing "yourname" so auto-detection works
- Use class="question-card" with data-question-index="0" (0-indexed!)

Example yourname-q1.html:

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Q1: Question Title - Shumi vs YourName</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700;700i&family=Orbitron:wght@700;900&display=swap" rel="stylesheet" />
    <link rel="stylesheet" href="styles.css" />
    <script src="app.js"></script>
  </head>
  <body>
    <div class="question-card" data-question-index="0"></div>
  </body>
</html>

NOTE: data-question-index="0" for Q1, "1" for Q2, etc. (0-indexed!)


STEP 5: UPDATE MAIN INDEX
--------------------------

Edit index.html to add your competitor card:

<a href="index-yourname.html" class="competitor-card">
  <div class="competitor-header">
    <h3 class="competitor-name">Shumi vs YourName AI</h3>
    <span class="competitor-badge">7 questions</span>
  </div>
  <p class="competitor-desc">Description • Shumi wins X/Y questions • YourName strengths/weaknesses</p>
  <div class="competitor-stats">
    <span class="stat-item">Shumi: 85.0</span>
    <span class="stat-item gap">YourName: 75.0</span>
    <span class="stat-item winner">+10.0 gap</span>
  </div>
</a>

Update the footer counts:

<span class="tagline">AI performance benchmarking • 6 competitors tested • 51 questions analyzed</span>


EDITING EXISTING COMPARISONS
=============================

To edit an existing AI comparison:

1. Open app.js
2. Find the relevant CARD_DATA_[NAME] object
3. Edit the questions array, scores, strengths, weaknesses, etc.
4. Save the file
5. Refresh browser - changes appear immediately

Common edits:
- Change scores: questions[0].scores.shumi = 90
- Add strengths: questions[0].shumi.strengths.push("New strength")
- Update overall score: overallScores.shumi = 86.5


TROUBLESHOOTING
===============

Problem: Page shows blank or "Question data not found"
Fix: Check that data-question-index matches array index (0-indexed!)

Problem: Wrong competitor data shown
Fix: Ensure filename contains competitor name (e.g., "nansen-q1.html")

Problem: Colors not showing
Fix: Add CSS color variables and classes in styles.css

Problem: Navigation broken
Fix: Verify getPrevSlideUniversal/getNextSlideUniversal use correct prefix

Problem: Changes not appearing
Fix: Hard refresh browser (Ctrl+F5 or Cmd+Shift+R)


IMPORTANT NOTES
===============

- All data lives in app.js - NEVER create separate .js files
- Competitor keys must be lowercase in data objects
- Filename must contain competitor name for auto-detection
- Question index is 0-based (Q1 = index 0, Q2 = index 1, etc.)
- app.js is 5,738 lines - use a good text editor (VS Code, Sublime)
- Always test in browser after changes


TECHNICAL DETAILS
=================

The universal template system works by:
1. Reading the HTML filename (e.g., "nansen-q1.html")
2. Extracting competitor name ("nansen")
3. Loading correct data object (CARD_DATA_NANSEN)
4. Rendering question using data-question-index
5. Dynamically building HTML with correct colors/scores

This means:
- One template serves all competitors
- No duplicate code
- Easy to add new comparisons
- All data loads upfront (slower initial load, faster navigation)


KEYBOARD SHORTCUTS
==================

← / → : Navigate slides
ESC   : Return to menu
h     : Home


FOR FUTURE CLAUDE SESSIONS
===========================

Quick context:
- This is a multi-AI comparison presentation
- Everything is in ONE app.js file (5,738 lines)
- Currently has 5 competitors: BingX, Nansen, Sentient, Intellectia, ChainGPT
- Uses universal template system (auto-detects from filename)
- To add new AI: Add CARD_DATA_YOURNAME to app.js + update 3 functions + create HTML files


---
Created: December 2025
Consolidated: December 23, 2025
Powered by CoinRotator • Shumi AI
