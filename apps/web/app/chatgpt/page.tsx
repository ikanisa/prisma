/**
 * ChatGPT App Page
 * 
 * Entry point for ChatGPT App Store integration
 * Renders the app component in an iframe-compatible layout
 */

import { ChatGPTAppComponent } from '@/components/chatgpt/AppComponent';

export default function ChatGPTAppPage() {
  return (
    <div className="h-screen w-screen">
      <ChatGPTAppComponent />
    </div>
  );
}

