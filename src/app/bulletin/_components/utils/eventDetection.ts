// Note: We use the API endpoint instead of direct import to avoid client-side server function calls

export interface DetectedEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  originalText: string;
  confidence: number;
}

/**
 * Creates a basic event from simple regex patterns as fallback
 */
function createFallbackEvent(text: string): DetectedEvent | null {
  console.log("Creating fallback event for:", text);
  
  // Multiple patterns to try
  const patterns = [
    // Pattern 1: Time ranges with dash "meeting 6pm-7pm" or "dinner 2:30pm-4pm"
    /\b(\w+(?:\s+\w+)*)\s+(?:at\s+|from\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\b/i,
    // Pattern 2: Time ranges with "to" "meeting 6pm to 7pm"
    /\b(\w+(?:\s+\w+)*)\s+(?:at\s+|from\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\s+to\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\b/i,
    // Pattern 3: "meeting at 3pm" or "dinner at 7pm"
    /\b(\w+(?:\s+\w+)*)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\b/i,
    // Pattern 4: "3pm meeting" 
    /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\s+(\w+(?:\s+\w+)*)\b/i,
    // Pattern 5: Known event types with times
    /\b(meeting|appointment|call|dinner|lunch|breakfast|workout|gym|exam|conference|presentation)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\b/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let eventTitle: string;
      let startTimeStr: string;
      let endTimeStr: string | null = null;
      
      // Handle different match groups based on pattern
      if (pattern.source.includes('-\\s*')) {
        // Pattern 1: Time range with dash
        eventTitle = match[1];
        startTimeStr = match[2];
        endTimeStr = match[3];
      } else if (pattern.source.includes('to\\s+')) {
        // Pattern 2: Time range with "to"
        eventTitle = match[1];
        startTimeStr = match[2];
        endTimeStr = match[3];
      } else if (pattern.source.includes('meeting|appointment')) {
        // Pattern 5: Known event types
        eventTitle = match[1];
        startTimeStr = match[2];
      } else if (pattern.source.startsWith('\\b(\\d')) {
        // Pattern 4: time first
        startTimeStr = match[1];
        eventTitle = match[2];
      } else {
        // Pattern 3: event first
        eventTitle = match[1].trim();
        startTimeStr = match[2];
      }
      
      console.log("Fallback match found:", { eventTitle, startTimeStr, endTimeStr });
      
      // Create a date for today with the specified time
      const today = new Date();
      
      // Parse start time
      const startTimeMatch = startTimeStr.toLowerCase().match(/(\d{1,2}(?::\d{2})?)\s*(am|pm)/);
      if (startTimeMatch) {
        const [, startTime, startPeriod] = startTimeMatch;
        const [startHours, startMinutes = "0"] = startTime.split(":");
        
        let startHour = parseInt(startHours);
        if (startPeriod === "pm" && startHour !== 12) startHour += 12;
        if (startPeriod === "am" && startHour === 12) startHour = 0;
        
        const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour, parseInt(startMinutes));
        let endDate: Date;
        
        // Parse end time if available
        if (endTimeStr) {
          const endTimeMatch = endTimeStr.toLowerCase().match(/(\d{1,2}(?::\d{2})?)\s*(am|pm)/);
          if (endTimeMatch) {
            const [, endTime, endPeriod] = endTimeMatch;
            const [endHours, endMinutes = "0"] = endTime.split(":");
            
            let endHour = parseInt(endHours);
            if (endPeriod === "pm" && endHour !== 12) endHour += 12;
            if (endPeriod === "am" && endHour === 12) endHour = 0;
            
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endHour, parseInt(endMinutes));
          } else {
            // Fallback to 1 hour if end time parsing fails
            endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
          }
        } else {
          // No end time specified, default to 1 hour
          endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
        }
        
        const fallbackEvent = {
          id: `fallback-${Date.now()}`,
          title: eventTitle.charAt(0).toUpperCase() + eventTitle.slice(1), // Capitalize first letter
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          originalText: text,
          confidence: 0.6
        };
        
        console.log("Fallback event created:", fallbackEvent);
        return fallbackEvent;
      }
    }
  }
  
  console.log("No fallback pattern matched for:", text);
  return null;
}

/**
 * Detects potential event mentions in text and returns structured event data
 */
export async function detectEventMentions(
  text: string,
  userId: string,
  timezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
): Promise<DetectedEvent[]> {
  console.log("Detecting event mentions for text:", text);
  
  try {
    // Call the API endpoint for event detection
    console.log("Calling detect-events API with:", { text, timezone });
    const response = await fetch("/api/detect-events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, timezone }),
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log("API result:", result);
    
    const detectedEvents = result.events || [];
    console.log("Extracted events:", detectedEvents);
    
    // If AI didn't detect anything, try fallback
    if (detectedEvents.length === 0) {
      console.log("AI detected no events, trying fallback...");
      const fallbackEvent = createFallbackEvent(text);
      if (fallbackEvent) {
        console.log("Fallback event created:", fallbackEvent);
        return [fallbackEvent];
      }
    }
    
    console.log("Final detected events:", detectedEvents);
    return detectedEvents;
  } catch (error) {
    console.error("Error detecting event mentions:", error);
    
    // Try fallback on error
    console.log("Trying fallback due to error...");
    const fallbackEvent = createFallbackEvent(text);
    if (fallbackEvent) {
      console.log("Fallback event created after error:", fallbackEvent);
      return [fallbackEvent];
    }
    
    return [];
  }
}

/**
 * Simple regex-based event detection for real-time highlighting
 * This is used for immediate feedback while the user types
 */
export function detectSimpleEventPatterns(text: string): Array<{
  start: number;
  end: number;
  text: string;
}> {
  const patterns = [
    // Time range patterns with dash (e.g., "6pm-7pm", "2:30pm-4pm")
    /\b(?:meeting|appointment|call|dinner|lunch|breakfast|workout|gym|exam|conference|presentation|\w+(?:\s+\w+)*)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\b/gi,
    // Time range patterns with "to" (e.g., "6pm to 7pm", "2:30pm to 4pm")
    /\b(?:meeting|appointment|call|dinner|lunch|breakfast|workout|gym|exam|conference|presentation|\w+(?:\s+\w+)*)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\s+to\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\b/gi,
    // Time-based patterns
    /\b(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\b/g,
    // Date + time patterns
    /\b(?:today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\b/gi,
    // Event + time patterns
    /\b(\w+(?:\s+\w+)*)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\b/gi,
    // Meeting/appointment keywords
    /\b(?:meeting|appointment|call|dinner|lunch|breakfast|workout|gym|exam|conference|presentation)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\b/gi,
  ];
  
  const matches: Array<{ start: number; end: number; text: string }> = [];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      // Avoid infinite loops with global regex
      if (match.index === pattern.lastIndex) {
        pattern.lastIndex++;
      }
      
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[0]
      });
    }
  });
  
  // Remove duplicates and overlapping matches
  return matches
    .sort((a, b) => a.start - b.start)
    .filter((match, index, arr) => {
      // Remove if this match overlaps with the previous one
      if (index === 0) return true;
      const prev = arr[index - 1];
      return match.start >= prev.end;
    });
}
