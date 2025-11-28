# AGENT LEARNING SYSTEM - QUICK START GUIDE

## 🚀 Get Started in 5 Minutes

This guide will help you start using the Agent Learning System immediately.

---

## 📋 Prerequisites

- ✅ Database migration applied
- ✅ Backend server running
- ✅ Frontend deployed
- ✅ Admin access to Prisma Glow

---

## 1️⃣ COLLECT FEEDBACK (For End Users)

### Quick Feedback (Thumbs Up/Down)

When you receive an agent response, you'll see feedback buttons:

```tsx
// Automatically appears on agent responses
👍 Yes  |  👎 No  |  💬 Give detailed feedback
```

**Best Practice:** Click thumbs down if something is wrong, then provide details.

### Detailed Feedback

Click "Give detailed feedback" to provide:
- ⭐ Overall rating (1-5 stars)
- 📊 Dimension ratings (accuracy, helpfulness, clarity, completeness)
- 🐛 Issue categories (incorrect, incomplete, unclear, hallucination, etc.)
- 📝 Comments
- ✏️ Corrections (edit the response to show what it should be)

**Example:**
```
Rating: 2/5 stars
Issues: ✓ Incorrect ✓ Incomplete
Comment: "The tax calculation is wrong. It should use 2024 rates, not 2023."
Correction: "The correct tax amount is $X based on 2024 rates..."
```

---

## 2️⃣ REVIEW & ANNOTATE (For Experts)

### Access the Annotation Queue

1. Navigate to **Admin → Learning → Annotation**
2. You'll see a queue of examples needing review

### Annotation Workflow

For each example:

1. **Read the input** - Understand what the user asked
2. **Review original output** - See what the agent produced (if it exists)
3. **Edit expected output** - Correct it if needed
4. **Rate quality dimensions** (0-100%):
   - Technical Accuracy
   - Professional Quality
   - Completeness
   - Clarity
5. **Add notes** - Observations about this example
6. **Add suggestions** - How could the agent improve?
7. **Approve or Reject**

**Best Practice:** Aim to annotate 10-20 examples per session.

### Quality Score Guidelines

- **90-100%:** Excellent, production-ready
- **75-89%:** Good, minor improvements needed
- **60-74%:** Acceptable, several improvements needed
- **Below 60%:** Not suitable for training

---

## 3️⃣ CREATE TRAINING RUNS (For Admins)

### Navigate to Training Dashboard

**Admin → Learning → Training → Training Runs**

### Create a New Training Run

1. Click **"New Training Run"**
2. Fill in details:
   ```
   Name: "Prompt optimization v1"
   Agent: Select target agent
   Training Type: Choose strategy
     - Prompt Optimization (recommended to start)
     - RAG Tuning
     - Fine-Tuning
     - RLHF
   Dataset: Select approved examples
   ```
3. Click **"Create Run"**

### Monitor Progress

The training run card will show:
- ⏱️ Status (pending, running, completed, failed)
- 📊 Progress percentage
- 📈 Metrics (accuracy, completeness, etc.)
- ⏰ Started/completed timestamps

**Wait for completion** - Training runs typically take 10-60 minutes.

---

## 4️⃣ RUN A/B EXPERIMENTS (For Admins)

### Why Run Experiments?

Never deploy untested improvements! A/B experiments let you:
- ✅ Validate improvements with real users
- ✅ Measure statistical significance
- ✅ Avoid deploying regressions
- ✅ Make data-driven decisions

### Create an Experiment

1. Navigate to **Admin → Learning → Training → Experiments**
2. Click **"New Experiment"**
3. Fill in details:
   ```
   Name: "New prompt vs current"
   Description: "Testing improved prompt structure for tax agents"
   Hypothesis: "New prompt will increase accuracy by 5%"
   
   Agent: Tax Calculation Agent
   
   Control (A): Current prompt
   Treatment (B): Improved prompt
   
   Traffic Split: 50% / 50%
   Min Samples: 1000
   Min Duration: 1 week
   ```
4. Click **"Create Experiment"**
5. Click **"Start Experiment"** when ready

### Monitor Experiment

The experiment card shows:
- 📊 Sample counts (control vs treatment)
- 📈 Metrics comparison
- 🎯 Statistical significance
- 🏆 Winner (if determined)

**Wait for enough data** - Experiments need time to reach significance.

### Review Results

When complete, you'll see:
```
Control (A):    avg_accuracy: 0.87
Treatment (B):  avg_accuracy: 0.92  ← 5% improvement!

Statistical significance: p = 0.003 ✅
Winner: Treatment (B)
```

**Decision:**
- If treatment wins with p < 0.05: **Deploy it!**
- If inconclusive: **Run longer or with more samples**
- If control wins: **Keep current version**

---

## 5️⃣ DEPLOY IMPROVEMENTS (For Admins)

### Safe Deployment Workflow

1. ✅ Training run completed successfully
2. ✅ A/B experiment shows positive results
3. ✅ Statistical significance achieved (p < 0.05)
4. ✅ No safety concerns
5. 🚀 **Ready to deploy!**

### Deployment Steps

1. **Create canary release:**
   ```
   Start with 5% traffic
   Monitor for 24 hours
   Gradually increase to 25%, 50%, 100%
   ```

2. **Monitor metrics:**
   - User satisfaction
   - Error rates
   - Latency
   - Correctness

3. **Rollback if needed:**
   ```
   If any metric degrades:
   - Instant rollback to previous version
   - Investigate issue
   - Fix and re-test
   ```

---

## 📊 MONITORING & ANALYTICS

### Key Metrics to Watch

**Learning System Health:**
- Feedback collection rate (target: >10%)
- Annotation queue length (target: <100)
- Training run success rate (target: >80%)

**Quality Improvement:**
- Average quality score trend
- User satisfaction rate
- Correction rate

**Experiment Success:**
- Experiments with positive results
- Average improvement percentage
- Deployment frequency

### Access Dashboards

- **Main Dashboard:** Admin → Learning
- **Feedback Stats:** Admin → Learning → Feedback
- **Training Runs:** Admin → Learning → Training
- **Experiments:** Admin → Learning → Training → Experiments

---

## 🎯 BEST PRACTICES

### For End Users

1. **Provide feedback frequently** - Every bit helps!
2. **Be specific** - Explain what's wrong and why
3. **Correct when wrong** - Edit the response to show the right answer
4. **Use issue categories** - Help us categorize problems

### For Experts

1. **Be consistent** - Use the same quality standards
2. **Add context** - Notes help future reviewers
3. **Focus on high-value examples** - Prioritize corrections and edge cases
4. **Batch annotations** - 10-20 examples per session

### For Admins

1. **Start with prompt optimization** - Fastest, lowest risk
2. **Run experiments for everything** - Never deploy untested
3. **Monitor closely after deployment** - Watch for issues
4. **Iterate frequently** - Weekly training runs build momentum

---

## 🐛 TROUBLESHOOTING

### "Feedback widget not appearing"

**Check:**
- User is authenticated
- Agent execution completed successfully
- Widget component is included in the UI

**Fix:**
```tsx
import { FeedbackCollector } from '@/components/learning/FeedbackCollector';
```

### "Annotation queue is empty"

**Possible causes:**
- No feedback collected yet
- All examples already reviewed
- Filters too restrictive

**Fix:**
- Adjust filters (domain, agent, status)
- Wait for more feedback
- Check database: `SELECT COUNT(*) FROM learning_examples WHERE review_status = 'pending'`

### "Training run failed"

**Common causes:**
- Insufficient training examples (need at least 20)
- Invalid configuration
- API rate limits exceeded

**Fix:**
- Check training run logs
- Verify dataset has enough examples
- Adjust configuration

### "Experiment shows no winner"

**Possible causes:**
- Not enough samples yet
- No real difference between variants
- Too much variance in metrics

**Fix:**
- Run longer to collect more samples
- Increase sample size requirement
- Check if variants are actually different

---

## 📞 GET HELP

### Resources

- **Full Documentation:** `/AGENT_LEARNING_SYSTEM_IMPLEMENTATION_COMPLETE.md`
- **API Reference:** See "API REFERENCE" section in full docs
- **Video Tutorial:** Coming soon

### Support

- **Slack:** #agent-learning channel
- **Email:** support@prismaglow.com
- **GitHub:** Report bugs via issues

---

## ✅ SUCCESS CHECKLIST

- [ ] Collected first user feedback
- [ ] Reviewed and annotated 10+ examples
- [ ] Created first training run
- [ ] Run first A/B experiment
- [ ] Deployed first improvement
- [ ] Set up monitoring dashboards
- [ ] Trained team on workflows

---

## 🎓 LEARNING PATH

### Week 1: Basics
- ✅ Enable feedback collection
- ✅ Review annotation queue
- ✅ Understand quality dimensions

### Week 2: Training
- ✅ Create first training run (prompt optimization)
- ✅ Monitor training progress
- ✅ Review training results

### Week 3: Experimentation
- ✅ Set up first A/B experiment
- ✅ Monitor experiment progress
- ✅ Interpret results

### Week 4: Deployment
- ✅ Deploy first improvement
- ✅ Monitor post-deployment metrics
- ✅ Iterate based on results

---

## 🚀 WHAT'S NEXT?

Once you're comfortable with the basics:

1. **Advanced Training Strategies**
   - RAG tuning for better retrieval
   - Fine-tuning for specialized tasks
   - RLHF for complex behaviors

2. **Automation**
   - Automated annotation for high-quality examples
   - Scheduled training runs
   - Auto-deployment of safe improvements

3. **Cross-Agent Learning**
   - Share learnings across similar agents
   - Build organization-wide knowledge base
   - Transfer learning from high-performing agents

---

**Ready to start?** 

👉 Go to **Admin → Learning** and begin collecting feedback!

---

*Last Updated: January 28, 2026*
