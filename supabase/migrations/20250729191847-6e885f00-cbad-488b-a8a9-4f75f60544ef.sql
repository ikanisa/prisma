-- Enhance user_profiles for Omni-Agent memory system
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS fav_businesses text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_payment_amount integer,
ADD COLUMN IF NOT EXISTS last_ride_destination text,
ADD COLUMN IF NOT EXISTS interaction_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_response_time_ms integer DEFAULT 0;

-- Create function to update user interaction stats
CREATE OR REPLACE FUNCTION update_user_interaction_stats(
  phone_number TEXT,
  interaction_type TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Update interaction count and preferences
  INSERT INTO user_profiles (phone_number, interaction_count, updated_at)
  VALUES (phone_number, 1, now())
  ON CONFLICT (phone_number) 
  DO UPDATE SET 
    interaction_count = user_profiles.interaction_count + 1,
    updated_at = now();

  -- Update preferred service based on interaction pattern
  IF interaction_type IS NOT NULL THEN
    UPDATE user_profiles 
    SET preferred_service = interaction_type,
        updated_at = now()
    WHERE phone_number = update_user_interaction_stats.phone_number
      AND (preferred_service IS NULL 
           OR (SELECT COUNT(*) 
               FROM agent_conversations 
               WHERE user_id = update_user_interaction_stats.phone_number
               AND metadata->>'intent' = interaction_type
               AND ts > now() - interval '7 days') >= 3);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function for nightly conversation summarization  
CREATE OR REPLACE FUNCTION summarize_daily_conversations()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  conversation_summary TEXT;
BEGIN
  -- Loop through active users from last 24 hours
  FOR user_record IN 
    SELECT DISTINCT user_id as phone_number
    FROM agent_conversations 
    WHERE ts > now() - interval '24 hours'
  LOOP
    -- Generate summary for this user's conversations
    SELECT string_agg(
      CASE 
        WHEN role = 'user' THEN 'User: ' || message
        ELSE 'Assistant: ' || message
      END, 
      E'\n' 
      ORDER BY ts
    ) INTO conversation_summary
    FROM agent_conversations
    WHERE user_id = user_record.phone_number
      AND ts > now() - interval '24 hours'
    LIMIT 50; -- Limit to last 50 messages
    
    -- Store summary in conversation_summaries table
    INSERT INTO conversation_summaries (
      user_id, 
      summary_date, 
      summary_text,
      message_count,
      created_at
    )
    VALUES (
      user_record.phone_number,
      CURRENT_DATE,
      conversation_summary,
      (SELECT COUNT(*) FROM agent_conversations 
       WHERE user_id = user_record.phone_number 
       AND ts > now() - interval '24 hours'),
      now()
    )
    ON CONFLICT (user_id, summary_date) 
    DO UPDATE SET 
      summary_text = EXCLUDED.summary_text,
      message_count = EXCLUDED.message_count,
      updated_at = now();
  END LOOP;
  
  RAISE NOTICE 'Daily conversation summarization completed for % users', 
    (SELECT COUNT(DISTINCT user_id) 
     FROM agent_conversations 
     WHERE ts > now() - interval '24 hours');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for better performance on conversation queries
CREATE INDEX IF NOT EXISTS idx_agent_conversations_omni_lookup 
ON agent_conversations(user_id, ts DESC);

-- Create index for user context lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone_lookup
ON user_profiles(phone_number, preferred_service, updated_at);

-- Add function to clean old conversation data
CREATE OR REPLACE FUNCTION cleanup_old_conversations()
RETURNS void AS $$
BEGIN
  -- Delete conversations older than 90 days
  DELETE FROM agent_conversations 
  WHERE ts < now() - interval '90 days';
    
  -- Delete old summaries older than 1 year  
  DELETE FROM conversation_summaries
  WHERE created_at < now() - interval '1 year';
  
  RAISE NOTICE 'Cleaned up old conversation data';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;