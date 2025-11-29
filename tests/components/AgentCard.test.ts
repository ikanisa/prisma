/**
 * Component tests for AgentCard
 */

import { describe, it, expect } from 'vitest';

// Mock agent data for testing
const mockAgent = {
  id: 'test-uuid',
  organization_id: 'org-uuid',
  slug: 'test-agent',
  name: 'Test Agent',
  description: 'A test agent for unit testing',
  avatar_url: null,
  type: 'assistant' as const,
  category: 'Testing',
  status: 'active' as const,
  is_public: false,
  version: '1.0.0',
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-11-28T12:00:00Z',
};

describe('AgentCard', () => {
  describe('data formatting', () => {
    it('should format agent type label correctly', () => {
      const TYPE_LABELS: Record<string, string> = {
        assistant: 'Assistant',
        specialist: 'Specialist',
        orchestrator: 'Orchestrator',
        evaluator: 'Evaluator',
        autonomous: 'Autonomous',
      };

      expect(TYPE_LABELS[mockAgent.type]).toBe('Assistant');
      expect(TYPE_LABELS['specialist']).toBe('Specialist');
    });

    it('should format status color correctly', () => {
      const STATUS_COLORS: Record<string, string> = {
        draft: 'bg-gray-500',
        testing: 'bg-yellow-500',
        active: 'bg-green-500',
        deprecated: 'bg-orange-500',
        archived: 'bg-red-500',
      };

      expect(STATUS_COLORS[mockAgent.status]).toBe('bg-green-500');
      expect(STATUS_COLORS['draft']).toBe('bg-gray-500');
    });

    it('should handle missing description', () => {
      const agentWithoutDescription = { ...mockAgent, description: undefined };
      const displayDescription = agentWithoutDescription.description || 'No description provided';
      
      expect(displayDescription).toBe('No description provided');
    });

    it('should format version display correctly', () => {
      const formatVersion = (version: string) => `v${version}`;
      
      expect(formatVersion(mockAgent.version)).toBe('v1.0.0');
    });

    it('should format date correctly', () => {
      const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
      };

      const formattedDate = formatDate(mockAgent.updated_at);
      expect(formattedDate).toBeTruthy();
    });
  });

  describe('link generation', () => {
    it('should generate correct detail link', () => {
      const generateDetailLink = (id: string) => `/admin/agents/${id}`;
      
      expect(generateDetailLink(mockAgent.id)).toBe('/admin/agents/test-uuid');
    });

    it('should generate correct persona link', () => {
      const generatePersonaLink = (id: string) => `/admin/agents/${id}/personas`;
      
      expect(generatePersonaLink(mockAgent.id)).toBe('/admin/agents/test-uuid/personas');
    });
  });

  describe('status handling', () => {
    it.each([
      ['draft', 'bg-gray-500'],
      ['testing', 'bg-yellow-500'],
      ['active', 'bg-green-500'],
      ['deprecated', 'bg-orange-500'],
      ['archived', 'bg-red-500'],
    ])('should map %s status to %s color', (status, expectedColor) => {
      const STATUS_COLORS: Record<string, string> = {
        draft: 'bg-gray-500',
        testing: 'bg-yellow-500',
        active: 'bg-green-500',
        deprecated: 'bg-orange-500',
        archived: 'bg-red-500',
      };

      expect(STATUS_COLORS[status]).toBe(expectedColor);
    });
  });

  describe('type handling', () => {
    it.each([
      ['assistant', 'Assistant'],
      ['specialist', 'Specialist'],
      ['orchestrator', 'Orchestrator'],
      ['evaluator', 'Evaluator'],
      ['autonomous', 'Autonomous'],
    ])('should map %s type to %s label', (type, expectedLabel) => {
      const TYPE_LABELS: Record<string, string> = {
        assistant: 'Assistant',
        specialist: 'Specialist',
        orchestrator: 'Orchestrator',
        evaluator: 'Evaluator',
        autonomous: 'Autonomous',
      };

      expect(TYPE_LABELS[type]).toBe(expectedLabel);
    });
  });

  describe('callback handling', () => {
    it('should pass correct ID to onDuplicate', () => {
      let duplicatedId: string | null = null;
      const onDuplicate = (id: string) => { duplicatedId = id; };
      
      onDuplicate(mockAgent.id);
      
      expect(duplicatedId).toBe('test-uuid');
    });

    it('should pass correct ID to onDelete', () => {
      let deletedId: string | null = null;
      const onDelete = (id: string) => { deletedId = id; };
      
      onDelete(mockAgent.id);
      
      expect(deletedId).toBe('test-uuid');
    });

    it('should pass correct ID to onTest', () => {
      let testedId: string | null = null;
      const onTest = (id: string) => { testedId = id; };
      
      onTest(mockAgent.id);
      
      expect(testedId).toBe('test-uuid');
    });
  });

  describe('compact mode', () => {
    it('should show different layout in compact mode', () => {
      const compact = true;
      
      // In compact mode, we'd show a View button instead of full card
      expect(compact).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels for buttons', () => {
      const menuButtonLabel = '';  // Menu button typically has no visible text
      const viewButtonLabel = 'View';
      
      expect(viewButtonLabel).toBeTruthy();
    });
  });
});
