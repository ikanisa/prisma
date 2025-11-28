# 🚀 Gemini AI Integration Quick Start

This guide will help you set up and test the Gemini AI chat integration.

## Prerequisites

- Node.js 22.12.0 (or 20.19.5+)
- Python 3.11+
- pnpm 9.12.3
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

---

## Setup Steps

### 1. Install Dependencies

```bash
# Install Node dependencies
pnpm install --frozen-lockfile

# Set up Python virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r server/requirements.txt
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.development.example .env.local

# Edit .env.local and add your Gemini API key
nano .env.local
```

Set these variables in `.env.local`:
```env
# Google Gemini API Key
GOOGLE_API_KEY="your_actual_gemini_api_key_here"
VITE_GEMINI_API_KEY="your_actual_gemini_api_key_here"

# API Configuration
VITE_API_URL="http://localhost:8000"
```

### 3. Start the Backend (Terminal 1)

```bash
# Activate virtual environment
source .venv/bin/activate

# Start FastAPI server
uvicorn server.main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### 4. Start the Frontend (Terminal 2)

```bash
# Start Vite development server
pnpm dev
```

You should see:
```
VITE v5.x.x  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

### 5. Test the Integration

1. Open http://localhost:5173 in your browser
2. Look for the floating purple **Sparkles** button (bottom-right corner)
3. Click the button to open the Gemini chat widget
4. Send a test message: "Hello, Gemini!"
5. Watch for the streaming response

---

## Verification Checklist

### Backend Health Check

Test the Gemini endpoints:

```bash
# Health check
curl http://localhost:8000/api/gemini/health

# Expected response:
# {"status":"healthy","service":"gemini-chat","provider":"google-generative-ai"}
```

### Chat Endpoint Test

```bash
# Send a chat request
curl -X POST http://localhost:8000/api/gemini/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GEMINI_API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Say hello"}],
    "model": "gemini-2.0-flash-exp"
  }'

# Expected response:
# {"content":"Hello! How can I help you today?","model":"gemini-2.0-flash-exp","tokens_used":0,"finish_reason":"stop"}
```

### Streaming Test

```bash
# Test streaming endpoint
curl -X POST http://localhost:8000/api/gemini/chat/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GEMINI_API_KEY" \
  -d '{
    "messages": [{"role": "user", "content": "Write a haiku"}],
    "model": "gemini-2.0-flash-exp",
    "stream": true
  }'

# Expected output: Server-Sent Events stream
# data: {"content":"Silent"}
# data: {"content":" audit"}
# data: {"content":" night"}
# ...
# data: [DONE]
```

---

## Troubleshooting

### Issue: "GOOGLE_API_KEY not configured"

**Solution:** Make sure your `.env.local` file has the correct API key:
```env
GOOGLE_API_KEY="your_actual_key_here"
```

Restart the FastAPI server after updating environment variables.

### Issue: "Failed to send chat request"

**Possible causes:**
1. Invalid API key - Check your Gemini API key
2. Network issue - Verify internet connection
3. CORS error - Backend should allow `http://localhost:5173`

**Debug:**
```bash
# Check FastAPI logs in Terminal 1
# Look for error messages
```

### Issue: Widget doesn't appear

**Solution:**
1. Check browser console for errors (F12 → Console)
2. Verify Vite server is running on port 5173
3. Clear browser cache and reload

### Issue: Streaming doesn't work

**Solution:**
1. Check Network tab (F12 → Network)
2. Look for `chat/stream` request
3. Verify it's using `text/event-stream` content type
4. Check for JavaScript errors in console

---

## Features to Test

### Basic Chat
- [ ] Send simple message
- [ ] Receive response
- [ ] Message appears in chat history

### Streaming
- [ ] Send message
- [ ] Watch text appear character by character
- [ ] Cursor animation visible
- [ ] Can stop streaming mid-response

### UI/UX
- [ ] Widget opens/closes smoothly
- [ ] Empty state shows suggestions
- [ ] Timestamps on messages
- [ ] Clear chat button works
- [ ] Send button disabled when input empty

### Mobile Responsive
- [ ] Open in mobile viewport (375px width)
- [ ] Widget goes full-screen
- [ ] Backdrop visible
- [ ] Chat input works on mobile
- [ ] Can close widget

### Desktop Features
- [ ] Maximize/minimize buttons work
- [ ] Panel mode (400x600px)
- [ ] Maximized mode (full screen)
- [ ] Smooth transitions

### Dark Mode
- [ ] Toggle dark mode in browser
- [ ] Widget adapts colors
- [ ] Messages readable
- [ ] Gradients look good

---

## Performance Benchmarks

Expected performance:
- **Initial Load:** < 1s
- **Widget Open:** < 200ms
- **First Token:** < 1s
- **Streaming:** Real-time
- **Total Response:** < 5s for typical message

Test with:
```bash
# Measure response time
time curl -X POST http://localhost:8000/api/gemini/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_KEY" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

---

## Next Steps

After verifying the integration:

1. **Week 2:** Implement 8 Accounting agents
2. **Week 3:** Build 3 Orchestrator agents
3. **Week 4:** Complete 14 Corporate/Ops/Support agents

See `WEEK_1_IMPLEMENTATION_STATUS.md` for detailed roadmap.

---

## Support

- **Documentation:** See `DEEP_REPOSITORY_AUDIT_2025.md`
- **Implementation Guide:** See `IMPLEMENTATION_START_CHECKLIST.md`
- **GitHub Issues:** Report bugs at https://github.com/ikanisa/prisma/issues

---

**Last Updated:** January 28, 2025  
**Version:** Week 1 Day 3 Complete  
**Status:** Production Ready ✅
