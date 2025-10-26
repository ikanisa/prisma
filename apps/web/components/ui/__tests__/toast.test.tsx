import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '../toast';

const noop = () => {};

describe('Toast', () => {
  it('renders the default variant using design token classes', () => {
    const { getByText } = render(
      <ToastProvider>
        <Toast open onOpenChange={noop}>
          <ToastTitle>Title</ToastTitle>
          <ToastDescription>Description</ToastDescription>
        </Toast>
        <ToastViewport />
      </ToastProvider>,
    );

    const toast = getByText('Title').closest('[data-state]');
    expect(toast).not.toBeNull();
    expect(toast).toHaveClass('bg-card');
    expect(toast).toHaveClass('text-foreground');
    expect(toast).toMatchInlineSnapshot(`
      <li
        class="group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-xl border border-border/60 p-6 pr-8 shadow-md transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full bg-card text-foreground"
        data-radix-collection-item=""
        data-state="open"
        data-swipe-direction="right"
        style="user-select: none;"
        tabindex="0"
      >
        <div
          class="text-sm font-semibold text-foreground"
        >
          Title
        </div>
        <div
          class="text-sm text-muted-foreground"
        >
          Description
        </div>
      </li>
    `);
  });

  it('renders the destructive variant using destructive token colors', () => {
    const { getByText } = render(
      <ToastProvider>
        <Toast open onOpenChange={noop} variant="destructive">
          <ToastTitle>Alert</ToastTitle>
        </Toast>
        <ToastViewport />
      </ToastProvider>,
    );

    const toast = getByText('Alert').closest('[data-state]');
    expect(toast).not.toBeNull();
    expect(toast).toHaveClass('bg-destructive');
    expect(toast).toHaveClass('text-destructive-foreground');
  });
});
