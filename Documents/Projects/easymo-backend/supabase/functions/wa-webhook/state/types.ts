export interface ChatState<T = unknown> {
  key: string;
  data?: T;
}

export interface ConversationContext {
  requestId: string;
  startedAt: number;
  userId: string;
  phone: string;
  state: ChatState;
  message: any;
}
