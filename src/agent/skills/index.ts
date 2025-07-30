// Skills Registry - Central hub for all agent skills
export { PaymentsSkill } from './payments';
export { MotoSkill } from './moto';
export { CommerceSkill } from './commerce';
export { AdminSupportSkill } from './admin_support';

// Skill registry for easy access
export const SkillRegistry = {
  payments: async () => (await import('./payments')).PaymentsSkill,
  moto: async () => (await import('./moto')).MotoSkill,
  commerce: async () => (await import('./commerce')).CommerceSkill,
  admin_support: async () => (await import('./admin_support')).AdminSupportSkill,
};

// Skill metadata for routing and configuration
export const SkillMetadata = {
  payments: {
    name: 'payments',
    description: 'Payment operations, QR generation, money transfers',
    domains: ['payment', 'money', 'transfer', 'balance'],
    priority: 1
  },
  moto: {
    name: 'moto',
    description: 'Transport booking and ride management',
    domains: ['transport', 'ride', 'moto', 'driver'],
    priority: 2
  },
  commerce: {
    name: 'commerce',
    description: 'Shopping and marketplace operations',
    domains: ['shop', 'buy', 'order', 'product'],
    priority: 3
  },
  admin_support: {
    name: 'admin_support',
    description: 'Customer support and administrative operations',
    domains: ['help', 'support', 'ticket', 'issue'],
    priority: 4
  }
};

// Intent router for skill selection
export class IntentRouter {
  static routeToSkill(message: string, confidence_threshold: number = 0.6): string | null {
    const normalizedMessage = message.toLowerCase();
    
    // Check each skill's intent patterns
    for (const [skillName, metadata] of Object.entries(SkillMetadata)) {
      for (const domain of metadata.domains) {
        if (normalizedMessage.includes(domain)) {
          return skillName;
        }
      }
    }
    
    // Fallback to admin support for unmatched intents
    return 'admin_support';
  }
  
  static async executeSkillTool(
    skillName: string, 
    toolName: string, 
    parameters: any, 
    context: any
  ): Promise<any> {
    try {
      const skill = await SkillRegistry[skillName]();
      const tool = skill.tools[toolName];
      
      if (!tool) {
        throw new Error(`Tool ${toolName} not found in skill ${skillName}`);
      }
      
      // Validate parameters
      const validatedParams = tool.parameters.parse(parameters);
      
      // Execute tool
      return await tool.execute(validatedParams, context);
    } catch (error) {
      console.error(`Error executing ${skillName}.${toolName}:`, error);
      throw error;
    }
  }
  
  static async getSkillTemplate(
    skillName: string, 
    templateName: string, 
    data: any = {}
  ): Promise<any> {
    try {
      const skill = await SkillRegistry[skillName]();
      const template = skill.templates[templateName];
      
      if (!template) {
        return {
          text: "I apologize, but I couldn't find the appropriate response template.",
          buttons: []
        };
      }
      
      // Replace template variables
      let text = template.text;
      Object.entries(data).forEach(([key, value]) => {
        text = text.replace(new RegExp(`{${key}}`, 'g'), String(value));
      });
      
      return {
        ...template,
        text
      };
    } catch (error) {
      console.error(`Error getting template ${skillName}.${templateName}:`, error);
      return {
        text: "I apologize, but I encountered an error processing your request.",
        buttons: []
      };
    }
  }
}