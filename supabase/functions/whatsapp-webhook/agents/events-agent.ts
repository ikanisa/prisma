import { MessageProcessor } from '../utils/message-processor.ts';

export class EventsAgent {
  private supabase: any;
  private processor: MessageProcessor;

  constructor(supabase: any) {
    this.supabase = supabase;
    this.processor = new MessageProcessor(supabase);
  }

  async process(message: string, user: any, whatsappNumber: string): Promise<string> {
    try {
      const msg = message.toLowerCase().trim();

      if (msg === 'events') {
        return await this.listUpcomingEvents();
      }

      if (msg === 'add event') {
        return "To add an event, send details like:\n'New Year Party - 2024-01-01 - 5000 - Kigali'\n\nFormat: [title] - [date] - [price] - [location]";
      }

      // Parse event creation format
      if (this.isEventFormat(message)) {
        return await this.createEvent(message, user);
      }

      return "Send 'events' to see upcoming events or 'add event' to create one!";

    } catch (error) {
      console.error('EventsAgent error:', error);
      return "Sorry, I'm having trouble with events right now. Please try again.";
    }
  }

  private async listUpcomingEvents(): Promise<string> {
    const { data: events, error } = await this.supabase
      .from('events')
      .select('title, event_date, price, location, description')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(10);

    if (error || !events || events.length === 0) {
      return "🎉 No upcoming events found. Send 'add event' to create one!";
    }

    let response = "🎉 Upcoming Events:\n\n";
    events.forEach((event: any, index: number) => {
      const date = new Date(event.event_date).toLocaleDateString();
      response += `${index + 1}. ${event.title}\n`;
      response += `📅 ${date}\n`;
      response += `💰 ${event.price} RWF\n`;
      response += `📍 ${event.location}\n`;
      if (event.description) {
        response += `📝 ${event.description}\n`;
      }
      response += "\n";
    });

    return this.processor.truncateMessage(response);
  }

  private async createEvent(message: string, user: any): Promise<string> {
    try {
      const eventData = this.parseEventMessage(message);
      
      if (!eventData) {
        return "Please use format: [title] - [date] - [price] - [location]\nExample: 'Concert Night - 2024-12-31 - 10000 - Kigali'";
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
        console.error('Error creating event:', error);
        return "Sorry, I couldn't create your event. Please try again.";
      }

      return `🎉 Event "${eventData.title}" created successfully!\n📅 ${new Date(eventData.date).toLocaleDateString()}\n💰 ${eventData.price} RWF\n📍 ${eventData.location}`;

    } catch (error) {
      console.error('Error in createEvent:', error);
      return "Error creating event. Please check the format and try again.";
    }
  }

  private isEventFormat(message: string): boolean {
    // Check if message contains dashes separating parts (title - date - price - location)
    return message.includes(' - ') && message.split(' - ').length >= 4;
  }

  private parseEventMessage(message: string): any {
    try {
      const parts = message.split(' - ').map(part => part.trim());
      
      if (parts.length < 4) {
        return null;
      }

      const [title, dateStr, priceStr, location, ...descriptionParts] = parts;
      
      // Parse date (YYYY-MM-DD format)
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return null;
      }

      // Parse price
      const price = parseInt(priceStr);
      if (isNaN(price)) {
        return null;
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