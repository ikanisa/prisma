import { toolRegistry } from '../tools/registry';
import { templateRegistry } from '../templates/whatsapp_templates';

export interface AdminSupportSkillResult {
  success: boolean;
  response_type: 'template' | 'text' | 'media';
  template_id?: string;
  message?: string;
  template_params?: Record<string, string>;
}

export class AdminSupportSkill {
  async handle(intent: string, message: string, userId: string, slots: Record<string, any>): Promise<AdminSupportSkillResult> {
    console.log(`AdminSupportSkill handling intent: ${intent} for user: ${userId}`);
    
    switch (intent) {
      case 'handoff_request':
        return this.handleHandoffRequest(message, userId, slots);
      case 'help':
        return this.handleHelp(message, userId, slots);
      case 'feedback_submit':
        return this.handleFeedbackSubmit(message, userId, slots);
      case 'report_issue':
        return this.handleReportIssue(message, userId, slots);
      case 'feature_request':
        return this.handleFeatureRequest(message, userId, slots);
      default:
        return this.handleSupportMenu(userId);
    }
  }
  
  private async handleHandoffRequest(message: string, userId: string, slots: Record<string, any>): Promise<AdminSupportSkillResult> {
    try {
      const reason = this.extractHandoffReason(message) || slots.reason;
      const urgency = this.extractUrgency(message) || slots.urgency || 'normal';
      
      const handoffResult = await toolRegistry.executeTool('handoff_create', {
        user_id: userId,
        reason: reason || 'User requested human assistance',
        urgency: urgency,
        context: message,
        source_channel: 'whatsapp'
      });
      
      if (handoffResult.success) {
        return {
          success: true,
          response_type: 'template',
          template_id: 'handoff_created_v1',
          template_params: {
            ticket_id: handoffResult.data?.ticket_id || '',
            urgency: urgency,
            eta: this.getEtaByUrgency(urgency)
          }
        };
      } else {
        return {
          success: false,
          response_type: 'text',
          message: '❌ Failed to create support ticket. Please try again or contact support directly.'
        };
      }
      
    } catch (error) {
      console.error('Handoff request error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Error creating support request. Please try again.'
      };
    }
  }
  
  private async handleHelp(message: string, userId: string, slots: Record<string, any>): Promise<AdminSupportSkillResult> {
    try {
      const topic = this.extractHelpTopic(message) || slots.topic;
      
      if (!topic) {
        return {
          success: true,
          response_type: 'template',
          template_id: 'help_menu_v1',
          template_params: {
            user_id: userId
          }
        };
      }
      
      // Get help content for the topic
      const helpResult = await toolRegistry.executeTool('help_content', {
        topic: topic,
        language: 'en' // Could extract from user preferences
      });
      
      if (helpResult.success && helpResult.data?.content) {
        return {
          success: true,
          response_type: 'text',
          message: `ℹ️ Help: ${topic}\n\n${helpResult.data.content}\n\nNeed more help? Type "support" to talk to a human.`
        };
      } else {
        return {
          success: true,
          response_type: 'text',
          message: `❓ I don't have specific help for "${topic}".\n\nPopular topics:\n💰 Payments & QR codes\n🏍️ Moto rides\n🏠 Property listings\n💊 Pharmacy orders\n\nOr type "support" for human help.`
        };
      }
      
    } catch (error) {
      console.error('Help request error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Error getting help content. Please try again.'
      };
    }
  }
  
  private async handleFeedbackSubmit(message: string, userId: string, slots: Record<string, any>): Promise<AdminSupportSkillResult> {
    try {
      const feedback = this.extractFeedback(message) || slots.feedback;
      const rating = this.extractRating(message) || slots.rating;
      
      if (!feedback && !rating) {
        return {
          success: true,
          response_type: 'text',
          message: '📝 Share your feedback:\n\n• Rate your experience (1-5 stars)\n• Tell us what went well\n• Suggest improvements\n• Report any issues\n\nYour feedback helps us improve easyMO!'
        };
      }
      
      const feedbackResult = await toolRegistry.executeTool('feedback_log', {
        user_id: userId,
        feedback_text: feedback,
        rating: rating,
        source: 'whatsapp_chat',
        category: this.categorizeFeedback(feedback)
      });
      
      if (feedbackResult.success) {
        return {
          success: true,
          response_type: 'template',
          template_id: 'feedback_thanks_v1',
          template_params: {
            rating: rating?.toString() || '',
            feedback_id: feedbackResult.data?.feedback_id || ''
          }
        };
      } else {
        return {
          success: false,
          response_type: 'text',
          message: '❌ Failed to submit feedback. Please try again.'
        };
      }
      
    } catch (error) {
      console.error('Feedback submit error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Error submitting feedback. Please try again.'
      };
    }
  }
  
  private async handleReportIssue(message: string, userId: string, slots: Record<string, any>): Promise<AdminSupportSkillResult> {
    try {
      const issue = this.extractIssueDescription(message) || slots.issue;
      const severity = this.extractSeverity(message) || 'medium';
      
      if (!issue) {
        return {
          success: true,
          response_type: 'text',
          message: '🐛 Report an issue:\n\nDescribe what happened:\n• What were you trying to do?\n• What went wrong?\n• When did it happen?\n• Any error messages?\n\nThe more details, the better we can help!'
        };
      }
      
      const issueResult = await toolRegistry.executeTool('issue_report', {
        user_id: userId,
        description: issue,
        severity: severity,
        source: 'whatsapp_chat',
        context: message
      });
      
      if (issueResult.success) {
        return {
          success: true,
          response_type: 'template',
          template_id: 'issue_reported_v1',
          template_params: {
            issue_id: issueResult.data?.issue_id || '',
            severity: severity,
            eta: this.getEtaBySeverity(severity)
          }
        };
      } else {
        return {
          success: false,
          response_type: 'text',
          message: '❌ Failed to report issue. Please try contacting support directly.'
        };
      }
      
    } catch (error) {
      console.error('Issue report error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Error reporting issue. Please try again.'
      };
    }
  }
  
  private async handleFeatureRequest(message: string, userId: string, slots: Record<string, any>): Promise<AdminSupportSkillResult> {
    try {
      const featureDescription = this.extractFeatureDescription(message) || slots.feature;
      
      if (!featureDescription) {
        return {
          success: true,
          response_type: 'text',
          message: '💡 Request a feature:\n\nTell us what you\'d like to see:\n• New functionality\n• Improvements to existing features\n• Integrations with other services\n• Better user experience\n\nDescribe your idea!'
        };
      }
      
      const featureResult = await toolRegistry.executeTool('feature_request', {
        user_id: userId,
        description: featureDescription,
        source: 'whatsapp_chat',
        priority: 'normal'
      });
      
      if (featureResult.success) {
        return {
          success: true,
          response_type: 'template',
          template_id: 'feature_request_thanks_v1',
          template_params: {
            request_id: featureResult.data?.request_id || '',
            feature: featureDescription.substring(0, 50) + '...'
          }
        };
      } else {
        return {
          success: false,
          response_type: 'text',
          message: '❌ Failed to submit feature request. Please try again.'
        };
      }
      
    } catch (error) {
      console.error('Feature request error:', error);
      return {
        success: false,
        response_type: 'text',
        message: '❌ Error submitting feature request. Please try again.'
      };
    }
  }
  
  private handleSupportMenu(userId: string): AdminSupportSkillResult {
    return {
      success: true,
      response_type: 'template',
      template_id: 'support_menu_v1',
      template_params: {
        user_id: userId
      }
    };
  }
  
  // Helper methods
  private extractHandoffReason(message: string): string | null {
    const msg = message.toLowerCase();
    if (msg.includes('payment') && msg.includes('problem')) return 'payment_issue';
    if (msg.includes('cant') || msg.includes('cannot') || msg.includes('not working')) return 'technical_issue';
    if (msg.includes('refund')) return 'refund_request';
    if (msg.includes('account')) return 'account_issue';
    if (msg.includes('billing')) return 'billing_question';
    return null;
  }
  
  private extractUrgency(message: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('urgent') || msg.includes('emergency') || msg.includes('asap')) return 'high';
    if (msg.includes('soon') || msg.includes('important')) return 'medium';
    return 'normal';
  }
  
  private extractHelpTopic(message: string): string | null {
    const msg = message.toLowerCase();
    if (msg.includes('payment') || msg.includes('qr')) return 'payments';
    if (msg.includes('ride') || msg.includes('moto') || msg.includes('transport')) return 'transport';
    if (msg.includes('property') || msg.includes('listing') || msg.includes('house')) return 'listings';
    if (msg.includes('pharmacy') || msg.includes('medicine')) return 'pharmacy';
    if (msg.includes('account') || msg.includes('profile')) return 'account';
    return null;
  }
  
  private extractFeedback(message: string): string | null {
    // If message is longer than a simple rating, consider it feedback
    if (message.length > 20 && !message.match(/^\d+\s*(star|stars?)?\s*$/i)) {
      return message;
    }
    return null;
  }
  
  private extractRating(message: string): number | null {
    const ratingMatch = message.match(/(\d+)\s*(star|stars?|\/5)?/i);
    if (ratingMatch) {
      const rating = parseInt(ratingMatch[1]);
      return rating >= 1 && rating <= 5 ? rating : null;
    }
    return null;
  }
  
  private extractIssueDescription(message: string): string | null {
    // Consider anything longer than 30 chars as issue description
    return message.length > 30 ? message : null;
  }
  
  private extractSeverity(message: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('critical') || msg.includes('broken') || msg.includes('cant use')) return 'high';
    if (msg.includes('slow') || msg.includes('sometimes')) return 'low';
    return 'medium';
  }
  
  private extractFeatureDescription(message: string): string | null {
    return message.length > 20 ? message : null;
  }
  
  private categorizeFeedback(feedback: string | null): string {
    if (!feedback) return 'general';
    
    const msg = feedback.toLowerCase();
    if (msg.includes('slow') || msg.includes('fast') || msg.includes('performance')) return 'performance';
    if (msg.includes('easy') || msg.includes('difficult') || msg.includes('confusing')) return 'usability';
    if (msg.includes('bug') || msg.includes('error') || msg.includes('broken')) return 'bug_report';
    if (msg.includes('love') || msg.includes('great') || msg.includes('awesome')) return 'positive';
    if (msg.includes('hate') || msg.includes('terrible') || msg.includes('awful')) return 'negative';
    return 'general';
  }
  
  private getEtaByUrgency(urgency: string): string {
    switch (urgency) {
      case 'high': return '1-2 hours';
      case 'medium': return '4-8 hours';
      default: return '24 hours';
    }
  }
  
  private getEtaBySeverity(severity: string): string {
    switch (severity) {
      case 'high': return '2-4 hours';
      case 'medium': return '24-48 hours';
      default: return '3-5 business days';
    }
  }
}

export const adminSupportSkill = new AdminSupportSkill();