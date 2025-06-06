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
        title: "Add Events",
        content: "Type out your events and let the AI do the rest.",
        selector: "#event-adder",
        side: "left",
        pointerRadius: 10,
        pointerPadding: 20,
        showSkip: true,
      },
      {
        icon: "",
        title: "Add Events",
        content:
          "You can also add events manually, through uploading a file containing your events, or through importing your events from a .ics file from another calendar app.",
        selector: "#event-menu-bar",
        side: "bottom-left",
        pointerRadius: 10,
        pointerPadding: 20,
        showSkip: true,
      },
      {
        icon: "",
        title: "Add Goals",
        content: "Keep track of what's important.",
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
        content: "Chat with an AI assistant to help you write.",
        selector: "#write-panel",
        side: "left",
        pointerRadius: 0,
        pointerPadding: 0,
        showControls: true,
        showSkip: true,
      },
    ],
  },
];
