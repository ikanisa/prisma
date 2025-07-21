import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { WhatsAppButton } from '@/components/ui/whatsapp-button';

describe('WhatsAppButton', () => {
  it('renders correctly with phone number', () => {
    render(
      <WhatsAppButton 
        phoneNumber="+250123456789" 
        message="Hello from test" 
      />
    );

    const button = render(
      <WhatsAppButton 
        phoneNumber="+250123456789" 
        message="Hello from test" 
      />
    ).container.querySelector('a');
    expect(button).toBeDefined();
    expect(button?.href).toContain('wa.me');
    expect(button?.href).toContain('+250123456789');
  });

  it('formats message correctly in URL', () => {
    const message = "Hello, I'm interested in your listing";
    render(
      <WhatsAppButton 
        phoneNumber="+250123456789" 
        message={message}
      />
    );

    const button = render(
      <WhatsAppButton 
        phoneNumber="+250123456789" 
        message={message}
      />
    ).container.querySelector('a');
    const href = button?.getAttribute('href');
    expect(href).toContain(encodeURIComponent(message));
  });

  it('handles empty message gracefully', () => {
    render(
      <WhatsAppButton 
        phoneNumber="+250123456789"
      />
    );

    const button = render(
      <WhatsAppButton 
        phoneNumber="+250123456789"
      />
    ).container.querySelector('a');
    expect(button).toBeDefined();
  });

  it('displays correct button text', () => {
    const { container } = render(
      <WhatsAppButton 
        phoneNumber="+250123456789" 
        message="Test message"
      >
        Custom Text
      </WhatsAppButton>
    );

    expect(container.textContent).toContain('Custom Text');
  });
});