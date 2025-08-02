import { supabaseClient } from "./client.ts";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { getOpenAI, generateIntelligentResponse } from '../_shared/openai-sdk.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FeedbackRequest {
  sessionId: string;
  rating: 1 | -1; // thumbs up (1) or thumbs down (-1)
  comment?: string;
  userPhone: string;
  agentId?: string;
  conversationId?: string;
  categories?: string[];
  metadata?: any;
}

interface FeedbackResponse {
  success: boolean;
  feedbackId: string;
  sentiment?: {
    score: number;
    label: string;
  };
  action_taken: string;
  data?: any;
  error?: string;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      sessionId, 
      rating, 
      comment, 
      userPhone, 
      agentId, 
      conversationId,
      categories,
      metadata 
    } = await req.json() as FeedbackRequest;

    console.log('📝 Logging user feedback:', { sessionId, rating, userPhone, hasComment: !!comment });

    // Validate input
    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    if (!userPhone) {
      throw new Error('User phone is required');
    }

    if (rating !== 1 && rating !== -1) {
      throw new Error('Rating must be 1 (positive) or -1 (negative)');
    }

      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    // Analyze sentiment if comment is provided
    let sentimentScore = rating > 0 ? 0.8 : 0.2;
    let sentimentLabel = rating > 0 ? 'positive' : 'negative';

    if (comment && openaiApiKey) {
      try {
        // Use OpenAI SDK with Rwanda-specific sentiment analysis
        const systemPrompt = 'Analyze the sentiment of this feedback comment about easyMO Rwanda service. Return a JSON object with "score" (0-1, where 0 is very negative and 1 is very positive) and "label" (positive, negative, or neutral).';
        
        const sentimentText = await generateIntelligentResponse(
          comment,
          systemPrompt,
          [],
          {
            model: 'gpt-4.1-2025-04-14',
            temperature: 0.1,
            max_tokens: 100,
            response_format: { type: 'json_object' }
          }
        );
        
        try {
          const parsed = JSON.parse(sentimentText);
          sentimentScore = parsed.score || sentimentScore;
          sentimentLabel = parsed.label || sentimentLabel;
        } catch (parseError) {
          console.warn('Failed to parse sentiment analysis:', parseError);
        }
      } catch (sentimentError) {
        console.warn('Sentiment analysis failed:', sentimentError);
      }
    }

    // Determine action based on feedback
    let actionTaken = 'logged';
    let followUpRequired = false;

    if (rating === -1) {
      actionTaken = 'flagged_for_review';
      followUpRequired = true;
    }

    if (sentimentScore < 0.3) {
      actionTaken = 'escalated';
      followUpRequired = true;
    }

    // Generate feedback ID
    const feedbackId = crypto.randomUUID();

    // Store feedback in enhanced feedback table
    const { error: feedbackError } = await supabase
      .from('feedback_enhanced')
      .insert({
        id: feedbackId,
        session_id: sessionId,
        conversation_id: conversationId,
        user_phone: userPhone,
        agent_id: agentId,
        rating: rating,
        comment: comment,
        sentiment_score: sentimentScore,
        sentiment_label: sentimentLabel,
        categories: categories || [],
        handled: false,
        follow_up_required: followUpRequired,
        metadata: {
          ...metadata,
          action_taken: actionTaken,
          created_via: 'api',
          auto_escalated: sentimentScore < 0.3
        }
      });

    if (feedbackError) {
      throw new Error(`Failed to store feedback: ${feedbackError.message}`);
    }

    // Update user memory with feedback pattern
    if (rating === -1 || sentimentScore < 0.5) {
      await supabase
        .from('user_memory_enhanced')
        .upsert({
          user_phone: userPhone,
          memory_type: 'feedback_pattern',
          memory_key: 'negative_feedback_count',
          memory_value: { 
            increment: 1, 
            last_negative_feedback: new Date().toISOString(),
            session_id: sessionId
          },
          confidence_score: 1.0,
          importance_weight: 0.8
        });
    }

    // Create automated task for negative feedback
    if (followUpRequired) {
      await supabase
        .from('automated_tasks')
        .insert({
          task_type: 'notification',
          task_name: 'negative_feedback_review',
          payload: {
            feedback_id: feedbackId,
            user_phone: userPhone,
            rating: rating,
            comment: comment,
            sentiment_score: sentimentScore,
            session_id: sessionId
          },
          priority: rating === -1 ? 2 : 4, // Higher priority for thumbs down
          scheduled_for: new Date().toISOString()
        });
    }

    // Log tool execution
    await supabase
      .from('tool_execution_logs')
      .insert({
        user_phone: userPhone,
        tool_name: 'logUserFeedback',
        tool_version: '1.0',
        input_params: { sessionId, rating, hasComment: !!comment },
        output_result: { 
          feedbackId, 
          sentimentScore, 
          sentimentLabel,
          actionTaken,
          followUpRequired
        },
        execution_time_ms: Date.now() % 1000,
        success: true,
        context_metadata: {
          comment_length: comment?.length || 0,
          categories_count: categories?.length || 0,
          auto_escalated: sentimentScore < 0.3
        }
      });

    const response: FeedbackResponse = {
      success: true,
      feedbackId,
      sentiment: {
        score: sentimentScore,
        label: sentimentLabel
      },
      action_taken: actionTaken,
      data: {
        follow_up_required: followUpRequired,
        session_id: sessionId,
        logged_at: new Date().toISOString(),
        will_be_reviewed: rating === -1 || sentimentScore < 0.5
      }
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Feedback logging error:', error);

    const errorResponse: FeedbackResponse = {
      success: false,
      feedbackId: '',
      action_taken: 'error',
      error: error.message
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});