# Sascha Handoff — Narrator Script

## Production Notes
- Voice: Edge Andrew (internal), speed +10%
- Tone: co-founder brief. Cover everything in the handoff doc, not just one item.
- Arc: what shipped → what's blocked → what's new → what's next

---

## NARRATOR SCRIPT (v3 — full brief)

[WHAT SHIPPED]
Four things landed since last time. The regime signal API is merged and live. The signal data tool is in shumi.js... so the web app can actually pull signal history now. Cross-surface memory has five endpoints... meaning the bot's memory is no longer locked to Telegram. And the glass box intel endpoint shipped... so the landing page can show real data instead of hardcoded receipts.

[THE SURFACE PROBLEM]
But the bigger issue hasn't moved. We still have about forty commands that only exist in Telegram. Signals, regime, funding, holders, wallet tracking, sentiment... all of it stuck behind a bot with no HTTP layer. The glassbowl on the landing page promises four surfaces. Only Telegram actually works. Web and API still need endpoints. CLI is deferred.

That's still P1. Extract the query logic from the bot handlers, expose it as JSON. Until that happens, the web app is flying blind on everything the bot can do.

[WHAT'S NEW TODAY]
On the sim engine side... we ran a breadth study across sixty-three coins. The old out-of-sample test was failing on all five test coins... and the assumption was that the consensus filter was too strict. It's not. Unanimous consensus actually passes the most coins. Nineteen out of sixty-three.

The real blind spot was direction. Longs only in a multi-year alt bleed... only Ethereum survived the 2025 test. Adding shorts brought six coins through. But shorts break Bitcoin and Ethereum. So the answer is per-coin direction settings... which is a bigger research project.

We shipped what we have today. A confidence map with four tiers for all sixty-three coins. It's an endpoint on the backend now... and shumi.js automatically includes the tier when a user asks about a coin. Two PRs are open. No schema changes.

[WHAT'S WAITING]
Three things for you. Merge the two confidence map branches... that's the quickest win. The Langfuse tool definitions need updating... but that's unblocked and can happen whenever. And the heartbeat writes for the scanners haven't started yet.

The PAT token in package.json is still there. Fix branch got removed at some point... status is unclear. Both repos are private so exposure is contained. Your call on priority.

That's the brief.
