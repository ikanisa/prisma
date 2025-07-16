export class SmartEventsAgent {
  constructor(private supabase: any, private vectorMemory: any, private openAI: any) {}

  async process(
    message: string, 
    user: any, 
    whatsappNumber: string, 
    context: string[], 
    intentAnalysis?: any
  ): Promise<string> {
    try {
      console.log('🎉 Processing with Smart Events Agent');

      const msg = message.toLowerCase().trim();

      if (msg === 'events' || msg.includes('upcoming') || msg.includes('what events')) {
        return await this.handleListEvents(context);
      }

      if (msg === 'add event' || msg.includes('create event') || msg.includes('organize event')) {
        return await this.handleEventCreationRequest(context);
      }

      // Check if message looks like event creation format
      if (this.isEventFormat(message)) {
        return await this.handleCreateEvent(message, user, context);
      }

      // AI-powered events assistance
      const systemMessage = `You are an events assistant for easyMO. Help users with:
      - Viewing events: "events"
      - Creating events: "add event" or provide format [title] - [date] - [price] - [location]
      
      The user said: "${message}"
      
      Be enthusiastic about events and guide them appropriately. Keep response under 200 characters. Use emojis.`;

      return await this.openAI.generateResponse(message, systemMessage, context);

    } catch (error) {
      console.error('❌ Smart Events Agent error:', error);
      return "I'm here to help with events! 🎉 Send 'events' to see upcoming ones or 'add event' to create!";
    }
  }

  private async handleListEvents(context: string[]): Promise<string> {
    const { data: events, error } = await this.supabase
      .from('events')
      .select('title, event_date, price, location, description')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(8);

    if (error || !events || events.length === 0) {
      const systemMessage = `No upcoming events are found. Create an encouraging message telling users they can:
      1. Create their own event with "add event"
      2. Check back later for new events
      
      Be enthusiastic and helpful. Use emojis. Keep under 200 characters.`;
      
      return await this.openAI.generateResponse(
        "No events available", 
        systemMessage, 
        context
      );
    }

    let response = "🎉 Upcoming Events:\n\n";
    events.forEach((event: any, index: number) => {
      const date = new Date(event.event_date).toLocaleDateString();
      response += `${index + 1}. ${event.title}\n`;
      response += `📅 ${date} | 💰 ${event.price || 'Free'} RWF\n`;
      response += `📍 ${event.location}\n\n`;
    });

    return response.length > 1600 ? response.substring(0, 1597) + '...' : response;
  }

  private async handleEventCreationRequest(context: string[]): Promise<string> {
    const systemMessage = `A user wants to create an event. Explain the format clearly:
    
    Format: [title] - [date] - [price] - [location] - [description]
    Example: "Concert Night - 2024-12-31 - 10000 - Kigali - Live music event"
    
    Be encouraging and clear about the format. Use emojis. Keep under 200 characters.`;

    return await this.openAI.generateResponse(
      "User wants to create an event", 
      systemMessage, 
      context
    );
  }

  private async handleCreateEvent(message: string, user: any, context: string[]): Promise<string> {
    try {
      const eventData = this.parseEventMessage(message);
      
      if (!eventData) {
        return "Please check the format: [title] - [date] - [price] - [location]\nExample: 'New Year Party - 2024-01-01 - 5000 - Kigali'";
      }

      const { data: newEvent, error } = await this.supabase
        .from('events')
        .insert({
          organizer_user_id: user.id,
          title: eventData.title,
          event_date: eventData.date,
          price: eventData.price,
          location: eventData.location,
          description: eventData.description
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating event:', error);
        return "Sorry, I couldn't create your event right now. Please try again! 🎉";
      }

      const systemMessage = `An event was successfully created:
      - Title: ${eventData.title}
      - Date: ${new Date(eventData.date).toLocaleDateString()}
      - Price: ${eventData.price} RWF
      - Location: ${eventData.location}
      
      Create an enthusiastic confirmation message. Mention that people can now see and attend the event. Use emojis. Keep under 200 characters.`;

      return await this.openAI.generateResponse(
        `Event created: ${eventData.title}`, 
        systemMessage, 
        context
      );

    } catch (error) {
      console.error('❌ Error in handleCreateEvent:', error);
      return "Error creating event. Please check the format: [title] - [date] - [price] - [location] 🎉";
    }
  }

  private isEventFormat(message: string): boolean {
    return message.includes(' - ') && message.split(' - ').length >= 4;
  }

  private parseEventMessage(message: string): any {
    try {
      const parts = message.split(' - ').map(part => part.trim());
      
      if (parts.length < 4) {
        return null;
      }

      const [title, dateStr, priceStr, location, ...descriptionParts] = parts;
      
      // Parse date (flexible format)
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return null;
      }

      // Parse price (handle "Free" or numbers)
      let price = 0;
      if (priceStr.toLowerCase() !== 'free') {
        price = parseInt(priceStr.replace(/[^\d]/g, ''));
        if (isNaN(price)) {
          return null;
        }
      }

      return {
        title,
        date: date.toISOString(),
        price,
        location,
        description: descriptionParts.join(' - ') || null
      };
    } catch (error) {
      return null;
    }
  }
}