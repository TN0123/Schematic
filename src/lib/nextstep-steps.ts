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
          "You can also add events manually or through uploading a file containing your events.",
        selector: "#event-menu-bar",
        side: "bottom-left",
        pointerRadius: 10,
        pointerPadding: 20,
        showSkip: true,
      },
      {
        icon: "",
        title: "Add Goals",
        content: "Keep track of what's really important.",
        selector: "#goals-panel",
        side: "right",
        pointerRadius: 0,
        pointerPadding: 0,
        showSkip: true,
      },
      {
        icon: "",
        title: "Suggested Events",
        content:
          "AI Powered suggestions connected to your bulletin and goals to help you best ulilize your time. You can modify these in settings.",
        selector: "#suggested-events",
        side: "left",
        pointerRadius: 10,
        pointerPadding: 20,
      },
    ],
  },
  {
    tour: "bulletinTour",
    steps: [
      {
        icon: "",
        title: "Bulletin Board",
        content:
          "Easily access and manage all your bulletins in one convenient place.",
        selector: "#bulletin-title",
        side: "bottom",
        showControls: true,
        showSkip: true,
      },
    ],
  },
  {
    tour: "writeTour",
    steps: [
      {
        icon: "",
        title: "Write Mode",
        content:
          "Seamlessly focus on writing notes or articles in a distraction-free environment.",
        selector: "#write-editor",
        side: "bottom",
        showControls: true,
        showSkip: true,
      },
    ],
  },
];
