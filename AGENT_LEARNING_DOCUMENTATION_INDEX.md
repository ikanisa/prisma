# AGENT LEARNING SYSTEM - DOCUMENTATION INDEX

## 📚 Complete Documentation Guide

This index helps you find the right documentation for your needs.

---

## 🎯 START HERE

### New to the Learning System?
👉 **[Quick Start Guide](./AGENT_LEARNING_QUICK_START_GUIDE.md)**
- Get started in 5 minutes
- Step-by-step tutorials
- Common workflows
- Best practices

### Want Full Details?
👉 **[Complete Implementation Guide](./AGENT_LEARNING_SYSTEM_IMPLEMENTATION_COMPLETE.md)**
- System architecture
- All features explained
- API reference
- Configuration guide
- Deployment instructions

---

## 📖 DOCUMENTATION BY ROLE

### 👥 End Users
**Goal:** Provide feedback to improve agents

**Recommended Reading:**
1. Quick Start Guide - Section 1: "Collect Feedback"
2. Implementation Guide - "User Interface" section
3. FAQ: Common feedback questions

**Key Topics:**
- How to give quick feedback (thumbs up/down)
- How to provide detailed feedback
- How to correct agent responses
- Understanding issue categories

---

### 👨‍🏫 Experts & Annotators
**Goal:** Review and annotate learning examples

**Recommended Reading:**
1. Quick Start Guide - Section 2: "Review & Annotate"
2. Implementation Guide - "Expert Annotation Interface"
3. Quality scoring guidelines

**Key Topics:**
- Annotation workflow
- Quality dimension scoring
- Approval/rejection criteria
- Batch annotation tips

---

### 🔧 Administrators
**Goal:** Manage training runs and experiments

**Recommended Reading:**
1. Quick Start Guide - Sections 3-5
2. Implementation Guide - Full document
3. Deployment guide
4. Monitoring & metrics

**Key Topics:**
- Creating training runs
- Running A/B experiments
- Safe deployment procedures
- Monitoring dashboards
- Troubleshooting

---

### 💻 Developers
**Goal:** Integrate learning into agents and extend functionality

**Recommended Reading:**
1. Implementation Guide - "API Reference" section
2. Database schema documentation
3. Code examples
4. Extension guide

**Key Topics:**
- API endpoints
- React hooks
- Database schema
- Adding new learning strategies
- Custom integrations

---

## 🗂️ DOCUMENTATION FILES

### Core Documentation

| File | Size | Description | Audience |
|------|------|-------------|----------|
| **AGENT_LEARNING_QUICK_START_GUIDE.md** | 9KB | Quick start for all users | Everyone |
| **AGENT_LEARNING_SYSTEM_IMPLEMENTATION_COMPLETE.md** | 24KB | Complete technical guide | Admins, Developers |
| **This File (Index)** | 5KB | Documentation navigation | Everyone |

### Supporting Documentation

| Location | Description |
|----------|-------------|
| `supabase/migrations/20260128100000_*.sql` | Database schema with inline comments |
| `server/learning/*.py` | Python modules with docstrings |
| `server/api/learning.py` | API endpoints with docstrings |
| `src/components/learning/*.tsx` | React components with JSDoc |
| `src/hooks/learning/*.ts` | React hooks with TypeScript types |

---

## 📋 QUICK REFERENCE

### Common Tasks

#### Collect User Feedback
```tsx
import { FeedbackCollector } from '@/components/learning/FeedbackCollector';

<FeedbackCollector
  executionId={execution.id}
  agentId={agent.id}
  agentOutput={response.text}
  onFeedbackSubmitted={() => console.log('Thanks!')}
/>
```

#### Submit Expert Annotation
```tsx
const submitAnnotation = useSubmitAnnotation();

submitAnnotation.mutate({
  exampleId: example.id,
  annotation: {
    technicalAccuracy: 0.95,
    professionalQuality: 0.90,
    completeness: 0.85,
    clarity: 0.92,
    correctedOutput: "...",
    notes: "...",
    approved: true
  }
});
```

#### Create Training Run
```tsx
const createRun = useCreateTrainingRun();

createRun.mutate({
  name: "Prompt optimization v2",
  agentId: agent.id,
  datasetId: dataset.id,
  trainingType: "prompt_optimization",
  config: { max_variants: 5 }
});
```

#### Run A/B Experiment
```tsx
const createExperiment = useCreateExperiment();

createExperiment.mutate({
  name: "New prompt vs current",
  hypothesis: "New prompt increases accuracy",
  agentId: agent.id,
  controlConfig: { prompt: currentPrompt },
  treatmentConfig: { prompt: newPrompt }
});
```

---

## 🎯 LEARNING PATHS

### Path 1: Basic User (1 hour)
1. ✅ Read Quick Start Section 1
2. ✅ Give feedback on 5 agent responses
3. ✅ Understand issue categories
4. ✅ Try correction editor

### Path 2: Expert Annotator (4 hours)
1. ✅ Complete Path 1
2. ✅ Read Quick Start Section 2
3. ✅ Annotate 20 examples
4. ✅ Understand quality dimensions
5. ✅ Learn batch workflow

### Path 3: Administrator (1 day)
1. ✅ Complete Paths 1 & 2
2. ✅ Read Quick Start Sections 3-5
3. ✅ Create first training run
4. ✅ Set up A/B experiment
5. ✅ Deploy improvement
6. ✅ Configure monitoring

### Path 4: Developer (2-3 days)
1. ✅ Read Complete Implementation Guide
2. ✅ Understand database schema
3. ✅ Review API endpoints
4. ✅ Study code examples
5. ✅ Build custom integration
6. ✅ Add new learning strategy

---

## 🔍 FIND INFORMATION BY TOPIC

### Architecture & Design
- **Implementation Guide** - "System Architecture" section
- **Implementation Guide** - "Learning Strategies" section
- **Database Migration** - Schema comments

### API Reference
- **Implementation Guide** - "API Reference" section
- **Backend Code** - `server/api/learning.py` docstrings

### Database Schema
- **Migration File** - `supabase/migrations/20260128100000_*.sql`
- **Implementation Guide** - "Data Schema" section

### User Interface
- **Quick Start Guide** - Sections 1-2
- **Implementation Guide** - "User Interface" section
- **Frontend Code** - Component files with JSDoc

### Workflows
- **Quick Start Guide** - All sections
- **Implementation Guide** - "Workflows" section

### Configuration
- **Implementation Guide** - "Configuration" section
- **Implementation Guide** - "Deployment Guide" section

### Monitoring
- **Implementation Guide** - "Metrics & KPIs" section
- **Implementation Guide** - "Monitoring" section

### Troubleshooting
- **Quick Start Guide** - "Troubleshooting" section
- **Implementation Guide** - FAQ (if issues arise)

### Security
- **Implementation Guide** - "Security & Privacy" section
- **Database Migration** - RLS policies

---

## 🎬 TUTORIALS

### Video Guides (Planned)
- [ ] Overview: Introduction to Agent Learning (5 min)
- [ ] Tutorial: Giving Effective Feedback (3 min)
- [ ] Tutorial: Expert Annotation Workflow (10 min)
- [ ] Tutorial: Creating Your First Training Run (8 min)
- [ ] Tutorial: Running A/B Experiments (12 min)
- [ ] Tutorial: Safe Deployment Procedures (10 min)

### Written Tutorials (Available)
- ✅ Quick Start Guide - All workflows
- ✅ Implementation Guide - All features
- ✅ Code examples in documentation

---

## 📞 GETTING HELP

### Self-Service
1. **Check Quick Start Guide** - Common tasks covered
2. **Search Implementation Guide** - Comprehensive reference
3. **Review code examples** - See real implementations
4. **Check troubleshooting** - Common issues solved

### Community
- **Slack:** #agent-learning channel
- **GitHub Discussions:** Ask questions
- **Team Wiki:** Internal knowledge base

### Direct Support
- **Email:** support@prismaglow.com
- **GitHub Issues:** Report bugs
- **Office Hours:** Weekly Q&A sessions (TBD)

---

## 🔄 DOCUMENTATION UPDATES

### How to Contribute
1. Submit improvements via GitHub PR
2. Suggest changes in Slack
3. Report errors via GitHub Issues
4. Share tips in team wiki

### Update Schedule
- **Quick Start:** Updated with new features
- **Implementation Guide:** Updated monthly
- **Code Examples:** Updated as needed
- **Video Tutorials:** Quarterly updates

### Version History
- **v1.0.0** (Jan 28, 2026) - Initial release
- Future versions tracked in CHANGELOG.md

---

## ✅ DOCUMENTATION CHECKLIST

Before starting, ensure you have:

- [ ] Read the Quick Start Guide
- [ ] Identified your role (User/Expert/Admin/Developer)
- [ ] Bookmarked relevant documentation
- [ ] Joined #agent-learning Slack channel
- [ ] Accessed the application (staging or production)
- [ ] Verified your permissions/role

---

## 📊 DOCUMENTATION METRICS

**Coverage:**
- ✅ All features documented
- ✅ All API endpoints documented
- ✅ All workflows documented
- ✅ All common issues covered

**Quality:**
- ✅ Clear examples provided
- ✅ Step-by-step instructions
- ✅ Visual aids (ASCII diagrams)
- ✅ Code snippets included

**Accessibility:**
- ✅ Multiple formats (Quick Start, Full Guide)
- ✅ Role-based organization
- ✅ Searchable index
- ✅ Clear navigation

---

## 🎯 RECOMMENDED READING ORDER

### For Quick Implementation
1. Quick Start Guide (30 min)
2. Implementation Guide - "Deployment" section (15 min)
3. Start using the system!

### For Complete Understanding
1. Quick Start Guide (30 min)
2. Implementation Guide - All sections (2-3 hours)
3. Code review (1-2 hours)
4. Hands-on practice (ongoing)

### For Integration Development
1. Implementation Guide - "API Reference" (30 min)
2. Code examples (30 min)
3. Database schema (30 min)
4. Backend code review (1 hour)
5. Frontend code review (1 hour)
6. Build integration (variable)

---

## 📝 GLOSSARY

**Learning Example:** A training data point with input/output pairs  
**Annotation:** Expert review and quality assessment  
**Training Run:** Execution of a learning algorithm  
**Experiment:** A/B test comparing two variants  
**Prompt Optimization:** Improving system prompts  
**RAG Training:** Improving retrieval quality  
**Fine-Tuning:** Adjusting model weights  
**Canary Release:** Gradual deployment to subset of users  
**Quality Score:** 0-1 metric of response quality  
**Correction:** User-edited version of agent response

---

## 🚀 NEXT STEPS

1. **Read** the Quick Start Guide
2. **Try** the system with test data
3. **Implement** in your workflow
4. **Monitor** results and metrics
5. **Iterate** based on learnings

---

**Last Updated:** January 28, 2026  
**Version:** 1.0.0  
**Maintainer:** AI Development Team

---

*For the latest documentation, always refer to the main branch of the repository.*
