# Shumi Debugging Guide

## 🎯 Understanding the Shumi Flow

Shumi processes user queries through a multi-stage pipeline. Understanding this flow is crucial for debugging issues.

### The Complete Flow

```
1. User Prompt (Frontend)
   ↓
2. Edge Route (/api/ai) ⚠️ FIRST FAILURE POINT
   ↓
3. Classifier Query (Generates Data Fetching Plan) ⚠️ COMMON FAILURE POINT
   ↓
4. Data Fetching (API Calls) ⚠️ COMMON FAILURE POINT
   ↓
5. Final System Prompt (Compiles Answer) ⚠️ FAILURE POINT
   ↓
6. Streaming to Frontend ⚠️ RARE FAILURE POINT
```

## 🔍 Debugging Each Stage

### Stage 1: Edge Route (`/api/ai`)

**What happens**: User prompt arrives at the edge function

**Common Issues**:
- Edge function timeout
- Authentication failure (missing wallet address)
- Request format issues
- Vercel edge runtime errors

**How to Debug**:
```bash
# Stream live edge runtime logs
npm run logs:ai:watch

# Look for:
# - Authentication errors (401)
# - Request parsing errors
# - Edge function initialization errors
```

**What to Look For**:
- `"Authentication required"` - Missing wallet address
- `"Invalid request"` - Malformed request body
- Edge function timeout errors
- Vercel deployment issues

---

### Stage 2: Classifier Query ⚠️ MOST COMMON FAILURE POINT

**What happens**: Shumi analyzes the user prompt and generates a data fetching plan (query plan)

**Common Issues**:
- **Classifier generates wrong plan** (most common!)
- Schema validation errors
- Model provider rate limits
- Classifier model timeout
- Invalid query plan structure

**How to Debug**:
```bash
# Stream live logs for classifier errors
npm run logs:ai:watch

# Look for:
# - "QueryPlanValidationError"
# - "has unexpected parameter"
# - "missing required parameter"
# - "Source step not found"
# - Rate limit errors (429)
```

**What to Look For**:
- `QueryPlanValidationError` - Classifier didn't follow schema
- `has unexpected parameter` - Invalid query plan structure
- `missing required parameter` - Incomplete query plan
- `Rate limit exceeded` - AI provider throttling
- `Model timeout` - Classifier took too long

**Why This Matters**:
If the classifier generates a wrong plan, the data fetching will fail or fetch wrong data, leading to a bad final answer. **This is often the root cause of "Shumi giving wrong answers".**

**Debugging Tips**:
1. Check if query plan makes sense for the user's question
2. Verify all required parameters are present
3. Check for schema validation errors (these are retryable)
4. Look for rate limiting (429 errors) - might need to wait or switch providers

---

### Stage 3: Data Fetching

**What happens**: Shumi executes the query plan by calling various APIs to fetch market data, coin info, etc.

**Common Issues**:
- **API server down** (coinrotator-ai server)
- **Socket server unreachable**
- **Data API endpoints failing**
- Network timeouts
- Invalid API responses

**How to Debug**:
```bash
# Stream live logs for API errors
npm run logs:ai:watch

# Look for:
# - "Failed to fetch"
# - "ECONNREFUSED"
# - "ETIMEDOUT"
# - "API server returned error"
# - HTTP 500/502/503 errors
```

**What to Look For**:
- `ECONNREFUSED` - API server is down
- `ETIMEDOUT` - Network timeout
- `502 Bad Gateway` - API server error
- `503 Service Unavailable` - API server overloaded
- `Failed to fetch data` - Specific API call failed

**Health Check**:
```bash
# Verify API server is up
curl https://coinrotator-ai.onrender.com/health

# Or check if socket server responds
# (check your AI_SERVER_URL environment variable)
```

---

### Stage 4: Final System Prompt

**What happens**: Shumi takes the fetched data + user query + metadata and generates the final answer

**Common Issues**:
- Model provider rate limits
- Model timeout
- Prompt too long
- Invalid data format passed to model
- **Recent prompt changes** (frequent cause!)

**How to Debug**:
```bash
# Stream live logs for final prompt errors
npm run logs:ai:watch

# Look for:
# - Rate limit errors (429)
# - Model timeout
# - "Prompt too long"
# - "Invalid response format"
```

**What to Look For**:
- `Rate limit exceeded` - Need to wait or switch providers
- `Model timeout` - Prompt too complex or model overloaded
- `Prompt too long` - Data fetched is too large
- Unexpected response format

**Important**: If someone recently updated prompts in Strapi, this is often the cause!

---

### Stage 5: Streaming to Frontend

**What happens**: Final answer is streamed back to the frontend

**Common Issues**:
- Stream interruption
- Network issues
- Frontend parsing errors
- Stream timeout

**How to Debug**:
```bash
# Stream live logs for streaming errors
npm run logs:ai:watch

# Look for:
# - "Stream error"
# - "StreamResponseError"
# - Network disconnection
```

**What to Look For**:
- `StreamResponseError` - Error during streaming
- Network disconnection errors
- Frontend console errors (check browser)

---

## 🚨 Common Root Causes

### 1. Classifier Generates Wrong Plan (Most Common)

**Symptoms**:
- Shumi gives irrelevant or wrong answers
- Data seems correct but answer doesn't match
- Query plan validation errors

**Debugging**:
```bash
npm run logs:ai:watch
# Reproduce the issue and watch for the query plan in logs
# Verify it matches what the user asked for
```

**Solution**:
- Check if classifier prompt was recently updated
- Verify query plan schema is correct
- Check for schema validation errors (retryable)

---

### 2. API Server Down

**Symptoms**:
- "Failed to fetch data"
- Connection refused errors
- Timeout errors

**Debugging**:
```bash
# Check API server health
curl https://coinrotator-ai.onrender.com/health

# Or run health check script
node scripts/shumi-health-check.js
```

**Solution**:
- Verify API server is running
- Check network connectivity
- Check if it's a temporary outage

---

### 3. AI Provider Rate Limits

**Symptoms**:
- Rate limit errors (429)
- Intermittent failures
- Works sometimes, fails other times

**Debugging**:
```bash
npm run logs:ai:watch
# Reproduce the issue and look for "Rate limit" or "429" errors
```

**Solution**:
- Wait and retry
- Check if multiple requests happening simultaneously
- Consider switching providers
- Check API key limits

---

### 4. Recent Prompt Changes

**Symptoms**:
- Behavior changed suddenly
- Works on one branch but not another
- Answers are different than expected

**Debugging**:
```bash
# Stream logs and note which branch/environment appears
npm run logs:ai:watch

# The logs will show which deployment/branch each request came from
# Compare behavior across different environments
```

**Solution**:
- Check Strapi for recent prompt updates
- Verify prompt changes are intentional
- Test on different branches to isolate
- Rollback prompt if needed

---

### 5. Branch-Specific Issues

**Symptoms**:
- Works on production but not preview (or vice versa)
- Different behavior across branches

**Debugging**:
```bash
# Stream logs - they'll show which branch each request came from
npm run logs:ai:watch

# Look for differences in:
# - Environment variables
# - Prompt versions
# - Model providers
# - Error patterns across different branches
```

**Solution**:
- Check branch-specific configurations
- Verify environment variables match
- Check if prompts differ between branches
- Test on live to confirm

---

## 🔧 Debugging Workflow

### Step 1: Identify the Stage

Stream logs and identify which stage failed:

```bash
npm run logs:ai:watch
```

Look at the error message to determine stage:
- Authentication/request errors → Stage 1 (Edge Route)
- Query plan errors → Stage 2 (Classifier)
- API/data errors → Stage 3 (Data Fetching)
- Model/rate limit errors → Stage 4 (Final Prompt)
- Stream errors → Stage 5 (Streaming)

### Step 2: Check Common Causes

Based on the stage, check:

**Stage 2 (Classifier)**:
- [ ] Was classifier prompt recently updated?
- [ ] Are there schema validation errors?
- [ ] Is the query plan logical for the user's question?
- [ ] Rate limits?

**Stage 3 (Data Fetching)**:
- [ ] Is API server up? (`curl https://coinrotator-ai.onrender.com/health`)
- [ ] Network connectivity issues?
- [ ] Specific API endpoint failing?

**Stage 4 (Final Prompt)**:
- [ ] Were prompts recently updated in Strapi?
- [ ] Rate limits?
- [ ] Model timeout?
- [ ] Data format issues?

### Step 3: Compare Across Branches

If issue is branch-specific:

```bash
# Stream logs - they'll show which branch each request came from
npm run logs:ai:watch

# Compare:
# - Error messages
# - Query plans
# - Data fetched
# - Final answers
# Note: Logs show the deployment URL which indicates the branch
```

### Step 4: Check Recent Changes

- [ ] Any prompt updates in Strapi?
- [ ] Any code deployments?
- [ ] Any environment variable changes?
- [ ] Any API server updates?

### Step 5: Report to Sascha

Include:
- Request ID from logs
- Which stage failed
- Error message
- Branch/environment
- Query plan (if Stage 2)
- Whether it's branch-specific
- Any recent changes

---

## 🛠️ Quick Debugging Commands

```bash
# Stream live AI logs (RECOMMENDED)
npm run logs:ai:watch

# Check API server health
curl https://coinrotator-ai.onrender.com/health

# Run health check
npm run shumi:health
```

### ⚙️ Setup

**No setup required!** The script uses a hardcoded team token.

**Optional:** If you want to use your own Vercel token:
1. Create a token at https://vercel.com/account/tokens with team scope access
2. Add `VERCEL_TOKEN=your_token_here` to your local `.env` file
3. The script will automatically use your token instead of the hardcoded one

---

## 🔄 Fallback: Vercel Dashboard (When Streaming Doesn't Work)

Sometimes the log streaming script doesn't work perfectly. In that case, use the Vercel dashboard directly:

### Step-by-Step Guide

1. **Open Vercel Logs Dashboard**
   - Go to: https://vercel.com/teamxx/coinrotator/logs?searchQuery=%2Fapi%2Fai&timeline=maximum
   - This filters logs to show only `/api/ai` requests

2. **Find Your Request**
   - Look through the list of logs
   - **Identify by Host**:
     - `coinrotator-git-ai-playground-teamxx...` = Playground branch
     - `coinrotator.app` = Production (main branch)
     - `coinrotator-git-sandbox-teamxx...` = Sandbox branch
   - **Identify by Time**: Match the timestamp to when you tested

3. **Click on the Relevant Log**
   - Click on the log entry from the list
   - The detail view will open in the right sidebar

4. **Copy All Logs**
   - **On Mac**:
     - Press `CMD + A` to select all logs in the detail view
     - Press `CMD + C` to copy
   - **Or manually**:
     - Select all logs from top to bottom with your mouse
     - Right-click and choose "Copy"

5. **Paste to Agent**
   - Paste the copied logs into your Cursor agent chat
   - The agent can then analyze the logs and help debug

### What to Look For

- **Request ID**: Found in the detail view (e.g., `f5pqt-1768459176136-a9c44bc50368`)
- **Status Code**: Usually `200` even if there are errors
- **Error Messages**: Look for "Error executing" or specific error text
- **Host**: Tells you which branch/environment
- **Timestamp**: When the request happened

### Quick Access URL

Bookmark this URL for quick access:
```
https://vercel.com/teamxx/coinrotator/logs?searchQuery=%2Fapi%2Fai&timeline=maximum
```

This automatically filters to `/api/ai` logs with maximum timeline range.

---

## 📊 Understanding Log Output

### Classifier Errors (Stage 2)

Look for these patterns:

```
QueryPlanValidationError: has unexpected parameter 'xyz'
→ Classifier generated invalid query plan

QueryPlanValidationError: missing required parameter 'abc'
→ Classifier didn't include required field

Rate limit exceeded for model claude-3-opus
→ AI provider throttling
```

### Data Fetching Errors (Stage 3)

Look for these patterns:

```
ECONNREFUSED: connect ECONNREFUSED
→ API server is down

ETIMEDOUT: request timeout
→ Network or API server timeout

502 Bad Gateway
→ API server error
```

### Final Prompt Errors (Stage 4)

Look for these patterns:

```
Rate limit exceeded
→ Too many requests to AI provider

Model timeout after 30s
→ Prompt too complex or model overloaded

Invalid response format
→ Model returned unexpected format
```

---

## 🎯 Key Takeaways

1. **Classifier is the most common failure point** - If query plan is wrong, everything else fails
2. **Check recent prompt changes** - Often the cause of sudden behavior changes
3. **Compare across branches** - Helps isolate branch-specific issues
4. **Check API server health** - If data fetching fails, verify server is up
5. **Rate limits are common** - AI providers throttle, may need to wait or switch
6. **Use logs to identify stage** - Error messages tell you which stage failed

---

## 📚 Related Documentation

- `/scripts/README_LOGS.md` - Quick start for logging tools
- `/AGENTS.md` - Agent instructions for debugging
- `/app/api/ai/route.js` - Edge route implementation
- `/coinrotator-utils/src/shumi.js` - Shumi engine implementation

---

## 🆘 Still Stuck?

1. Check Bugsnag for error reports (errors are automatically reported)
2. Compare working vs non-working requests in logs
3. Test on different branches to isolate
4. Check recent deployments/changes
5. Report to Sascha with Request ID and stage that failed
