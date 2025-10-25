import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import prisma from '@/lib/prisma';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  description?: string;
  location?: string;
  updated: string;
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
}

export class GoogleCalendarClient {
  private oauth2Client: OAuth2Client;
  private calendar: any;
  private retryCount = 0;
  private maxRetries = 3;

  constructor(oauth2Client: OAuth2Client) {
    this.oauth2Client = oauth2Client;
    this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  }

  private async withRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      if (error.code === 429 && this.retryCount < this.maxRetries) {
        // Rate limit exceeded, wait and retry
        this.retryCount++;
        const delay = Math.pow(2, this.retryCount) * 1000; // Exponential backoff
        console.log(`Rate limit hit for ${operationName}, retrying in ${delay}ms (attempt ${this.retryCount})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.withRetry(operation, operationName);
      }
      
      if (error.code === 401) {
        // Token expired, refresh and retry once
        if (this.retryCount === 0) {
          this.retryCount++;
          await this.refreshTokenIfNeeded();
          return this.withRetry(operation, operationName);
        }
      }
      
      throw error;
    }
  }

  static async createForUser(userId: string): Promise<GoogleCalendarClient> {
    const account = await prisma.account.findFirst({
      where: {
        userId,
        provider: 'google',
      },
    });

    if (!account) {
      throw new Error('No Google account found for user');
    }

    if (!account.refresh_token) {
      throw new Error('No refresh token available for Google account');
    }

    // Check if the account has calendar permissions
    const hasCalendarScope = account.scope?.includes('https://www.googleapis.com/auth/calendar');
    if (!hasCalendarScope) {
      throw new Error('Calendar permissions not granted. Please enable calendar sync in settings.');
    }

    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.NEXTAUTH_URL
    );

    oauth2Client.setCredentials({
      refresh_token: account.refresh_token,
      access_token: account.access_token,
    });

    return new GoogleCalendarClient(oauth2Client);
  }

  async refreshTokenIfNeeded(): Promise<void> {
    try {
      await this.oauth2Client.getAccessToken();
    } catch (error) {
      console.log('Token refresh needed, refreshing...');
      const { credentials } = await this.oauth2Client.refreshAccessToken();
      this.oauth2Client.setCredentials(credentials);

      // Update the stored refresh token if it changed
      if (credentials.refresh_token) {
        // Find the user's Google account and update the refresh token
        const account = await prisma.account.findFirst({
          where: {
            provider: 'google',
            refresh_token: this.oauth2Client.credentials.refresh_token,
          },
        });

        if (account) {
          await prisma.account.update({
            where: { id: account.id },
            data: { refresh_token: credentials.refresh_token },
          });
        }
      }
    }
  }

  async listCalendars(): Promise<GoogleCalendar[]> {
    await this.refreshTokenIfNeeded();

    return this.withRetry(async () => {
      const response = await this.calendar.calendarList.list();
      return response.data.items?.map((calendar: any) => ({
        id: calendar.id,
        summary: calendar.summary,
        primary: calendar.primary,
        backgroundColor: calendar.backgroundColor,
      })) || [];
    }, 'listCalendars');
  }

  async listEvents(
    calendarId: string,
    timeMin?: string,
    timeMax?: string,
    syncToken?: string
  ): Promise<{ events: GoogleCalendarEvent[]; nextSyncToken?: string }> {
    await this.refreshTokenIfNeeded();

    return this.withRetry(async () => {
      const params: any = {
        calendarId,
        singleEvents: true,
        orderBy: 'startTime',
      };

      if (timeMin) params.timeMin = timeMin;
      if (timeMax) params.timeMax = timeMax;
      if (syncToken) params.syncToken = syncToken;

      const response = await this.calendar.events.list(params);
      
      const events = response.data.items
        ?.filter((event: any) => {
          // Filter out recurring events since our calendar doesn't support them
          // Recurring events have a 'recurrence' property
          return !event.recurrence;
        })
        ?.map((event: any) => ({
          id: event.id,
          summary: event.summary || 'No Title',
          start: event.start,
          end: event.end,
          description: event.description,
          location: event.location,
          updated: event.updated,
        })) || [];

      return {
        events,
        nextSyncToken: response.data.nextSyncToken,
      };
    }, 'listEvents');
  }

  async createEvent(calendarId: string, event: Partial<GoogleCalendarEvent>): Promise<GoogleCalendarEvent> {
    await this.refreshTokenIfNeeded();

    return this.withRetry(async () => {
      const response = await this.calendar.events.insert({
        calendarId,
        resource: event,
      });

      return {
        id: response.data.id,
        summary: response.data.summary || 'No Title',
        start: response.data.start,
        end: response.data.end,
        description: response.data.description,
        location: response.data.location,
        updated: response.data.updated,
      };
    }, 'createEvent');
  }

  async updateEvent(
    calendarId: string,
    eventId: string,
    event: Partial<GoogleCalendarEvent>
  ): Promise<GoogleCalendarEvent> {
    await this.refreshTokenIfNeeded();

    return this.withRetry(async () => {
      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        resource: event,
      });

      return {
        id: response.data.id,
        summary: response.data.summary || 'No Title',
        start: response.data.start,
        end: response.data.end,
        description: response.data.description,
        location: response.data.location,
        updated: response.data.updated,
      };
    }, 'updateEvent');
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    await this.refreshTokenIfNeeded();

    return this.withRetry(async () => {
      await this.calendar.events.delete({
        calendarId,
        eventId,
      });
    }, 'deleteEvent');
  }

  async getEvent(calendarId: string, eventId: string): Promise<GoogleCalendarEvent> {
    await this.refreshTokenIfNeeded();

    return this.withRetry(async () => {
      const response = await this.calendar.events.get({
        calendarId,
        eventId,
      });

      return {
        id: response.data.id,
        summary: response.data.summary || 'No Title',
        start: response.data.start,
        end: response.data.end,
        description: response.data.description,
        location: response.data.location,
        updated: response.data.updated,
      };
    }, 'getEvent');
  }

  async watchCalendar(calendarId: string, watchRequest: {
    id: string;
    type: string;
    address: string;
    token: string;
    expiration: number;
  }): Promise<{ id: string; resourceId: string; expiration: string }> {
    await this.refreshTokenIfNeeded();

    return this.withRetry(async () => {
      const response = await this.calendar.events.watch({
        calendarId,
        resource: watchRequest,
      });

      return {
        id: response.data.id,
        resourceId: response.data.resourceId,
        expiration: response.data.expiration,
      };
    }, 'watchCalendar');
  }

  async stopWatchChannel(channelId: string, resourceId: string): Promise<void> {
    await this.refreshTokenIfNeeded();

    return this.withRetry(async () => {
      await this.calendar.channels.stop({
        resource: {
          id: channelId,
          resourceId: resourceId,
        },
      });
    }, 'stopWatchChannel');
  }
}

// Utility function to create a client for a user
export async function getGoogleCalendarClient(userId: string): Promise<GoogleCalendarClient> {
  return GoogleCalendarClient.createForUser(userId);
}
