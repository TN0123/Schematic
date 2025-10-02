export interface GenerationResult {
  eventsCount: number;
  remindersCount: number;
  events: Array<{
    id?: string;
    title: string;
    date: string;
    time?: string;
  }>;
  reminders: Array<{
    title: string;
    date: string;
    time?: string;
  }>;
}

export interface Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  links?: string[];
  isSuggestion?: boolean;
}

export interface GeneratedEvent {
  title: string;
  start: string;
  end: string;
}

export interface NewEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  links?: string[];
}
