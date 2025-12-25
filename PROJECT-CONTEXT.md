# AI Comparison Report Cards - Project Context

## 🎯 Project Overview

Interactive HTML presentation cards for comparing **Shumi AI** (CoinRotator's crypto trend intelligence) against competitor AIs. Built in the style of CoinRotator's trend excursion cards.

**Current Status:** Fully functional, ready to present
**Location:** `C:\Users\lakas\Downloads\ai-comparison-cards\`

---

## 📊 Current Comparison Data

### Competitors Being Tested
- **Primary AI:** Shumi AI (CoinRotator)
- **Competitor:** BingX AI (Exchange-native analysis)

### Test Structure

**Core Analysis Questions (3 deep questions displayed in cards):**
1. AAVE -30% Outlook (87 vs 81) - Focus on positioning, liquidations, invalidation
2. Macro vs On-Chain Priority (84 vs 78) - Which to ignore for next 7 days
3. Mispositioned Traders (86 vs 75) - Who's positioned incorrectly and why

**Qualitative Assessment Metrics (2 questions):**
4. Compression & Signal Discipline (79 vs 88) - *BingX wins on density*
5. Originality & Replaceability (90 vs 76) - Could AI be replaced by generic alternative

**Note:** The card system currently displays 5 questions total (3 core + 2 qualitative). Additional test questions exist (HYPE Outlook, BTC Next 7 Days, Hidden Risks, Weekly Narrative, Next 48h Trading) but are not included in the current card data to maintain focus on the deeper analysis.

### Overall Scores
- **Shumi AI:** 85.2 average
- **BingX AI:** 79.6 average
- **Gap:** +5.6 points (consistent Shumi advantage)

---

## 🏗️ Technical Architecture

### File Structure
```
ai-comparison-cards/
├── index.html                  # Navigation hub
├── slide-overview.html         # Overall comparison
├── slide-q1.html - q5.html    # Question details
├── slide-summary.html          # Key insights
├── data.js                     # ALL COMPARISON DATA ⭐
├── styles.css                  # Visual styling
├── shared.js                   # Utilities
├── navigation.js               # Keyboard shortcuts
├── question-template.js        # Dynamic rendering
├── README.txt                  # Full docs
├── QUICK-START.txt            # Quick guide
└── assets/                     # Images/logos
```

### Key Design Principles

**Data-Driven:**
- Single source of truth: `data.js`
- Edit once, updates everywhere
- Automatic data binding with `data-bind` attributes
- Built-in validation (check console)

**Visual Style:**
- Dark tech aesthetic (gradient backgrounds)
- Neon glows (Shumi = green `#00ff88`, BingX = orange `#ff6b35`)
- Orbitron font (headers) + JetBrains Mono (data)
- Animated score bars
- Responsive grid layouts

**No Build Step:**
- Pure HTML/CSS/JavaScript
- Runs locally in browser
- Works offline
- Just open `index.html`

---

## 🎨 Visual Components

### Color Scheme
```css
--shumi-color: #00ff88      (winner, primary AI)
--bingx-color: #ff6b35      (competitor)
--winner-color: #ffd700     (gold badges)
--gap-color: #00d4ff        (highlights, metrics)
```

### Key UI Elements
- **Score Pill:** Top-right winner badge
- **Meta Strip:** 4-column context bar (date, questions, gap, confidence)
- **Score Bars:** Animated horizontal bars (width = score percentage)
- **Breakdown Table:** Question-by-question grid
- **AI Analysis Cards:** Side-by-side comparison (strengths/weaknesses/verdict)
- **Insight Cards:** Color-coded by importance (critical/high/medium)
- **Winner Card:** Gold-bordered summary with trophy badge

---

## 📝 How to Update Data

### Adding New Competitors

Edit `data.js`:
```javascript
competitor2AI: {
  name: "ChatGPT",
  tagline: "OpenAI Analysis",
  color: "#10a37f"
}
```

Add scores to each question:
```javascript
scores: {
  shumi: 87,
  bingx: 81,
  chatgpt: 84  // New
}
```

Add analysis:
```javascript
chatgpt: {
  strengths: ["...", "..."],
  weaknesses: ["...", "..."],
  verdict: "..."
}
```

### Changing Questions

Edit the `questions` array in `data.js`:
```javascript
{
  id: 1,
  title: "Your Question Title",
  prompt: "Full question text...",
  scores: { shumi: 87, bingx: 81 },
  shumi: { strengths: [...], weaknesses: [...], verdict: "..." },
  bingx: { strengths: [...], weaknesses: [...], verdict: "..." }
}
```

---

## 🔑 Key Insights from Current Data

### Shumi AI Strengths
- **Depth & Reflexivity:** Trader psychology, positioning literacy, edge awareness
- **Originality:** Distinct worldview, "scar-tissue thinking" (90/100 vs 76/100)
- **Risk Management:** Multi-layered invalidation logic, explains what NOT to do
- **Live Market Analysis:** Treats markets as live stress tests, not products
- **Positioning Literacy:** Forced sellers vs optional actors, liquidation sequencing

### Shumi AI Weaknesses
- **Verbosity:** Dense, sometimes repetitive across sections
- **Compression:** Lower signal density than BingX (79/100 vs 88/100)
- **Tone:** Emotionally charged language ("panic", "live wire") - not for all audiences
- **Over-explanation:** Same thesis repeated multiple times

### BingX AI Strengths
- **Structure & Clarity:** Clean bullets, excellent density (88/100 compression)
- **Compression:** Tight summaries, minimal redundancy
- **Execution Focus:** Clear triggers, measurable thresholds
- **Beginner-Friendly:** Accessible, institutional-flavored
- **Concrete Stats:** Volume growth, dominance, specific numbers

### BingX AI Weaknesses
- **Platform Bias:** Tied to BingX-native tools, unavoidable exchange CTAs
- **Generic Analysis:** Template-compatible, higher replaceability (76/100)
- **Neutrality:** Exchange incentives subtly shape output
- **Surface-Level:** Reads like "CoinGecko + Messari summary stitched together"
- **Order Book Dependency:** Over-reliance on spoofable, conditional data

---

## 🎯 Brutally Honest Verdict

**Shumi wins on:**
- Depth, reflexivity, trader psychology
- Originality and replaceability resistance (+14 points)
- Risk management and invalidation logic
- **"Trader intelligence, not research copy"**

**BingX wins on:**
- Structure, compression, execution clarity (+9 points on compression)
- Beginner accessibility
- Signal density (fewer words, faster read)
- Institutional-flavored presentation

**The Pattern:**
- Gap is consistent (+5.6 average) **but not massive**
- Not a fluke — repeats across all question types
- BingX is competent, **better than most exchange AIs**
- Shumi has distinct edge for active traders
- **Both are legit, serve different trader types**

**Final Take:**
- **BingX AI** = competent, institutional-flavored, slightly sanitized
- **Shumi AI** = messier, sharper, more trader-brained
- Choose based on your trader profile, not absolute "better"

---

## 🚀 Usage Instructions

### For Presentations
1. Open `index.html`
2. Press F11 for fullscreen
3. Use arrow keys to navigate
4. Screen record with OBS/QuickTime

### For Colleagues
1. Send them the folder
2. Tell them to open `index.html`
3. Keyboard shortcuts: `← →` navigate, `ESC` menu

### For Updates
1. Edit `data.js` only
2. Save file
3. Refresh browser (Ctrl+F5)

---

## 🔄 Next Steps & Future Tests

### Potential Extensions
1. **Normalize Compression:** Give both AIs same word limits
2. **Invalidation-Only Showdown:** Pure edge case thinking
3. **Different Asset Stress Test:** Apply same questions to new coin
4. **Add More Competitors:** ChatGPT, Claude, Sentient, etc.
5. **Blind Test:** Hide AI names, just show outputs

### TODO for Multi-Competitor Support
- [ ] Update `question-template.js` to handle 3+ AIs
- [ ] Add dynamic column generation in CSS
- [ ] Update breakdown table to show all competitors
- [ ] Create multi-AI score bar component

---

## 🐛 Troubleshooting

**Cards not updating?**
- Save `data.js`
- Hard refresh browser (Ctrl+F5)

**Validation errors in console?**
- Check `data.js` for missing fields
- Verify scores are 0-100
- Ensure all required properties exist

**Fonts look wrong?**
- Check internet connection (Google Fonts)
- Fallback fonts will load if offline

**Navigation broken?**
- Verify all HTML files in same folder
- Check browser console for errors

---

## 📦 Dependencies

### External (CDN)
- Google Fonts: Inter, JetBrains Mono, Orbitron
- Requires internet on first load, cached after

### Internal (All Included)
- No npm packages
- No build tools
- No server required

---

## 🎨 Customization Guide

### Change Colors
Edit CSS variables in `styles.css`:
```css
:root {
  --shumi-color: #00ff88;
  --bingx-color: #ff6b35;
  --winner-color: #ffd700;
  --gap-color: #00d4ff;
}
```

### Change Layout
Grid columns in `styles.css`:
```css
.cr-ai-comparison {
  grid-template-columns: 1fr 1fr; /* 2 columns */
}
```

### Add New Slide Types
1. Copy existing slide HTML
2. Update navigation links
3. Add tagline to `data.js`
4. Update nav buttons

---

## 💡 Design Inspiration

**Inspired by:** CoinRotator Trend Excursion Cards
**Style:** Cyberpunk/tech aesthetic
**Fonts:** Orbitron (futuristic), JetBrains Mono (code)
**Colors:** Neon on dark (green/orange/cyan/gold)
**Layout:** Card-based, grid systems, clean hierarchy

---

## 📊 Data Validation

Built-in validation runs on page load (check console):
- Required fields check
- Score range validation (0-100)
- Percentage totals
- Missing properties warnings

---

## 🔐 Project Metadata

**Created:** December 2025
**Version:** 1.0.0
**Purpose:** Shumi AI performance benchmarking
**Status:** Production-ready
**Platform:** Browser-based, no server
**License:** Internal use (CoinRotator/Shumi AI)

---

## 📞 Contact & Support

**For Next Session:**
- Read this file first
- All data in `data.js`
- Current comparison: Shumi vs BingX
- 10 total questions (5 surface + 3 deep + 2 qualitative)
- Overall: Shumi 85.2, BingX 79.6

**Key Files to Remember:**
- `data.js` - Edit this for content changes
- `styles.css` - Edit this for visual changes
- `PROJECT-CONTEXT.md` - This file (orientation)

---

*Powered by CoinRotator • Shumi AI • Vibecoded in one session*
