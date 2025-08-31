import { Mark, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { detectSimpleEventPatterns } from '../utils/eventDetection';

export interface EventMentionOptions {
  HTMLAttributes: Record<string, any>;
  onEventDetected?: (eventText: string, range: { from: number; to: number }) => void;
  onEventHover?: (eventText: string, range: { from: number; to: number }, element: HTMLElement) => void;
  onEventLeave?: () => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    eventMention: {
      /**
       * Set an event mention mark
       */
      setEventMention: (attributes?: { eventText: string }) => ReturnType;
      /**
       * Toggle an event mention mark
       */
      toggleEventMention: (attributes?: { eventText: string }) => ReturnType;
      /**
       * Unset an event mention mark
       */
      unsetEventMention: () => ReturnType;
    };
  }
}

export const EventMention = Mark.create<EventMentionOptions>({
  name: 'eventMention',

  addOptions() {
    return {
      HTMLAttributes: {},
      onEventDetected: undefined,
      onEventHover: undefined,
      onEventLeave: undefined,
    };
  },

  addAttributes() {
    return {
      eventText: {
        default: null,
        parseHTML: element => element.getAttribute('data-event-text'),
        renderHTML: attributes => {
          if (!attributes.eventText) {
            return {};
          }
          return {
            'data-event-text': attributes.eventText,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-event-text]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'event-mention',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setEventMention:
        (attributes) =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      toggleEventMention:
        (attributes) =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes);
        },
      unsetEventMention:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  addProseMirrorPlugins() {
    const { onEventDetected, onEventHover, onEventLeave } = this.options;

    return [
      new Plugin({
        key: new PluginKey('eventMentionDetection'),
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, decorationSet) {
            // Only process if document changed
            if (!tr.docChanged) {
              return decorationSet.map(tr.mapping, tr.doc);
            }

            const decorations: Decoration[] = [];
            const doc = tr.doc;

            // Get the full text content
            const fullText = doc.textContent;
            
            // Detect event patterns
            const eventMatches = detectSimpleEventPatterns(fullText);

            // Convert text positions to document positions
            eventMatches.forEach(match => {
              let currentPos = 0;
              let found = false;

              doc.descendants((node, pos) => {
                if (found) return false;
                
                if (node.isText) {
                  const nodeStart = currentPos;
                  const nodeEnd = currentPos + node.text!.length;
                  
                  // Check if our match overlaps with this text node
                  if (match.start >= nodeStart && match.end <= nodeEnd) {
                    const from = pos + (match.start - nodeStart);
                    const to = pos + (match.end - nodeStart);
                    
                    const decoration = Decoration.inline(from, to, {
                      class: 'event-mention-suggestion',
                      'data-event-text': match.text,
                    });
                    
                    decorations.push(decoration);
                    
                    // Callback for event detection
                    if (onEventDetected) {
                      onEventDetected(match.text, { from, to });
                    }
                    
                    found = true;
                    return false;
                  }
                  
                  currentPos = nodeEnd;
                }
                return true;
              });
            });

            return DecorationSet.create(doc, decorations);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
          handleDOMEvents: {
            mouseover: (view, event) => {
              const target = event.target as HTMLElement;
              if (target.classList.contains('event-mention-suggestion') || 
                  target.classList.contains('event-mention')) {
                const eventText = target.getAttribute('data-event-text') || target.textContent || '';
                const pos = view.posAtDOM(target, 0);
                const endPos = pos + eventText.length;
                
                if (onEventHover) {
                  onEventHover(eventText, { from: pos, to: endPos }, target);
                }
              }
              return false;
            },
            mouseleave: (view, event) => {
              const target = event.target as HTMLElement;
              if (target.classList.contains('event-mention-suggestion') || 
                  target.classList.contains('event-mention')) {
                if (onEventLeave) {
                  onEventLeave();
                }
              }
              return false;
            },
          },
        },
      }),
    ];
  },
});
