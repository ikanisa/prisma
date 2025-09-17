export interface ChatState<T = unknown> {
  key: string;
  data?: T;
}

export interface ConversationContext {
  userId: string;
  phone: string;
  state: ChatState;
  message: any;
}
