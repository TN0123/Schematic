import { Tour } from "nextstepjs";

export const steps: Tour[] = [
  {
    tour: "scheduleTour",
    steps: [
      {
        icon: "",
        title: "Welcome to Schedule!",
        content: "Here's a quick overview of the features.",
        showControls: true,
        showSkip: true,
      },
      {
        icon: "",
        title: "AI-Powered Event Creation",
        content:
          "Simply type your schedule or tasks and let AI do the rest. Try '9-10 breakfast, 11-12 meeting' or 'I need to study, grocery shop, and exercise today - find me times that work!' Use the dropdown to switch between Generate mode (for creating events) and Chat mode (for asking questions about your schedule).",
        selector: "#event-adder",
        side: "bottom-left",
        pointerRadius: 10,
        pointerPadding: 20,
        showSkip: true,
      },
      {
        icon: "",
        title: "Add Events",
        content:
          "You can also add events by hand, through a pdf/image upload that mentions some events, or through a .ics file from another calendar app.",
        selector: "#event-menu-bar",
        side: "bottom-left",
        pointerRadius: 10,
        pointerPadding: 20,
        showSkip: true,
      },
      {
        icon: "",
        title: "AI Context",
        content:
          "You can edit the context that the AI has to work with to help it better understand your intentions and get better results.",
        selector: "#event-menu-bar-context-button",
        side: "bottom-right",
        pointerRadius: 10,
        pointerPadding: 20,
        showSkip: true,
      },
      {
        icon: "",
        title: "AI Chat Mode",
        content:
          "Switch to Chat mode using the dropdown above the input area to talk with an AI assistant that can help you manage your schedule, get recommendations, and answer questions about your calendar.",
        selector: "#event-adder",
        side: "bottom-left",
        pointerRadius: 10,
        pointerPadding: 20,
        showSkip: true,
      },
      {
        icon: "",
        title: "Statistics",
        content:
          "View insights about your schedule. Click the clock icon to open the statistics page and see where your time is being spent.",
        selector: ".fc-statistics-button",
        side: "bottom-right",
        pointerRadius: 10,
        pointerPadding: 20,
        showSkip: true,
      },
      {
        icon: "",
        title: "Add Goals",
        content:
          "A simple way for you to keep track of your goals and priorities. It is also used by the AI to help it understand your intentions and get better results.",
        selector: "#goals-panel",
        side: "right",
        pointerRadius: 0,
        pointerPadding: 0,
        showSkip: true,
      },
    ],
  },
  {
    tour: "writeTour",
    steps: [
      {
        icon: "",
        title: "Welcome to Write!",
        content: "Here's a quick overview of the features.",
        showControls: true,
        showSkip: true,
      },
      {
        icon: "",
        title: "Editor",
        content:
          "An AI-powered editor built for writing. Ctrl+Enter at any time when writing to continue where you left off.",
        selector: "#write-editor",
        side: "right",
        pointerRadius: 0,
        pointerPadding: 0,
        showControls: true,
        showSkip: true,
      },
      {
        icon: "",
        title: "Chat",
        content:
          "Chat with an AI assistant to help you write. Highlighted text can be selected and improved with the AI.",
        selector: "#write-panel",
        side: "left",
        pointerRadius: 0,
        pointerPadding: 0,
        showControls: true,
        showSkip: true,
      },
      {
        icon: "",
        title: "Context",
        content:
          "Each document has a context that the AI uses to help it write. You can edit it to help the AI better understand your intentions and get better results.",
        selector: "#write-panel-context-button",
        side: "left",
        pointerRadius: 0,
        pointerPadding: 0,
        showControls: true,
        showSkip: true,
      },
      {
        icon: "",
        title: "Write Settings",
        content: "Modify the settings for the write editor here.",
        selector: "#write-settings-button",
        side: "bottom-right",
        pointerRadius: 0,
        pointerPadding: 0,
        showControls: true,
        showSkip: true,
      },
    ],
  },
];
