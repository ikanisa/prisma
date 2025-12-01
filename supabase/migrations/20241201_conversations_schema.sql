-- Conversations table for chat history persistence
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Messages table for individual messages in conversations
CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS conversations_user_id_idx ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS conversations_agent_id_idx ON public.conversations(agent_id);
CREATE INDEX IF NOT EXISTS conversations_updated_at_idx ON public.conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS conversation_messages_conversation_id_idx ON public.conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS conversation_messages_created_at_idx ON public.conversation_messages(created_at);

-- Updated_at trigger for conversations
DROP TRIGGER IF EXISTS conversations_updated_at_trigger ON public.conversations CASCADE;
CREATE TRIGGER conversations_updated_at_trigger
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Auto-update conversation updated_at when message is added
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversation_messages_update_conversation_trigger
  AFTER INSERT ON public.conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_on_message();

-- Auto-generate conversation title from first message
CREATE OR REPLACE FUNCTION public.auto_generate_conversation_title()
RETURNS TRIGGER AS $$
DECLARE
  first_message_content TEXT;
BEGIN
  -- Only generate title if it's null and this is first message
  IF (SELECT COUNT(*) FROM public.conversation_messages WHERE conversation_id = NEW.conversation_id) = 1 THEN
    SELECT content INTO first_message_content
    FROM public.conversation_messages
    WHERE conversation_id = NEW.conversation_id
      AND role = 'user'
    ORDER BY created_at
    LIMIT 1;

    IF first_message_content IS NOT NULL THEN
      UPDATE public.conversations
      SET title = LEFT(first_message_content, 100)
      WHERE id = NEW.conversation_id AND title IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conversation_auto_title_trigger
  AFTER INSERT ON public.conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_conversation_title();

-- RLS Policies
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view their own conversations"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON public.conversations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
  ON public.conversation_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = conversation_messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages in their conversations"
  ON public.conversation_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = conversation_messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON public.conversations TO authenticated;
GRANT ALL ON public.conversation_messages TO authenticated;

COMMENT ON TABLE public.conversations IS 'Chat conversations between users and AI agents';
COMMENT ON TABLE public.conversation_messages IS 'Individual messages within conversations';
