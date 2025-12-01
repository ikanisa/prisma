/**
 * Tests for PersonaCard Component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PersonaCard } from '@/components/agents/PersonaCard';

const mockPersona = {
  id: '123',
  agent_id: '456',
  name: 'Test Persona',
  role: 'Tax Advisor',
  system_prompt: 'You are a helpful tax advisor',
  personality_traits: ['professional', 'analytical'],
  communication_style: 'professional' as const,
  temperature: 0.7,
  pii_handling: 'redact' as const,
  is_active: true,
  version: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('PersonaCard', () => {
  it('renders persona information', () => {
    render(<PersonaCard persona={mockPersona} />);
    
    expect(screen.getByText('Test Persona')).toBeInTheDocument();
    expect(screen.getByText('Tax Advisor')).toBeInTheDocument();
    expect(screen.getByText(/You are a helpful tax advisor/)).toBeInTheDocument();
  });

  it('shows active badge when persona is active', () => {
    render(<PersonaCard persona={mockPersona} />);
    
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('does not show active badge when persona is inactive', () => {
    const inactivePersona = { ...mockPersona, is_active: false };
    render(<PersonaCard persona={inactivePersona} />);
    
    expect(screen.queryByText('Active')).not.toBeInTheDocument();
  });

  it('displays personality traits', () => {
    render(<PersonaCard persona={mockPersona} />);
    
    expect(screen.getByText('professional')).toBeInTheDocument();
    expect(screen.getByText('analytical')).toBeInTheDocument();
  });

  it('displays temperature value', () => {
    render(<PersonaCard persona={mockPersona} />);
    
    expect(screen.getByText('Temp: 0.7')).toBeInTheDocument();
  });

  it('calls onTest when test button is clicked', () => {
    const onTest = vi.fn();
    render(<PersonaCard persona={mockPersona} onTest={onTest} />);
    
    const testButton = screen.getAllByText('Test')[0];
    fireEvent.click(testButton);
    
    expect(onTest).toHaveBeenCalledWith(mockPersona);
  });

  it('calls onDuplicate when duplicate is clicked', () => {
    const onDuplicate = vi.fn();
    render(<PersonaCard persona={mockPersona} onDuplicate={onDuplicate} />);
    
    // Open dropdown menu
    const menuButton = screen.getByRole('button', { name: '' });
    fireEvent.click(menuButton);
    
    // Click duplicate
    const duplicateButton = screen.getByText('Duplicate');
    fireEvent.click(duplicateButton);
    
    expect(onDuplicate).toHaveBeenCalledWith(mockPersona);
  });

  it('displays version and updated date', () => {
    render(<PersonaCard persona={mockPersona} />);
    
    expect(screen.getByText(/Version: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Updated:/)).toBeInTheDocument();
  });
});
