-- Task-20: Extend agent_learning schema for intent confidence and template usage

-- 1. Add intent_confidence to record model prediction confidence
ALTER TABLE public.agent_learning
  ADD COLUMN IF NOT EXISTS intent_conf real;

-- 2. Record which template was used in replies
ALTER TABLE public.agent_learning
  ADD COLUMN IF NOT EXISTS template_used text;
