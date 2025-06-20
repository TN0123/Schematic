"use client";

import { forwardRef } from "react";
import FullCalendar from "@fullcalendar/react";
import {
  EventClickArg,
  DateSelectArg,
  EventContentArg,
  EventChangeArg,
} from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Check, X } from "lucide-react";
import { Event } from "../types";

interface CalendarComponentProps {
  events: Event[];
  onEventClick: (clickInfo: EventClickArg) => void;
  onEventUpdate: (info: EventChangeArg) => Promise<void>;
  onSelect: (selectInfo: DateSelectArg) => void;
  onUnselect: () => void;
  onDateClick: (clickInfo: any) => void;
  onDatesSet: (dateInfo: any) => void;
  onRefresh: () => void;
  onToggleReminders: () => void;
  selectedEventIds: Set<string>;
  copiedEvents: Event[];
  unreadNonAIReminders: any[];
  onAcceptSuggestion: (suggestionId: string) => void;
  onRejectSuggestion: (suggestionId: string) => void;
  isMobile?: boolean;
}

const CalendarComponent = forwardRef<FullCalendar, CalendarComponentProps>(
  (
    {
      events,
      onEventClick,
      onEventUpdate,
      onSelect,
      onUnselect,
      onDateClick,
      onDatesSet,
      onRefresh,
      onToggleReminders,
      selectedEventIds,
      copiedEvents,
      unreadNonAIReminders,
      onAcceptSuggestion,
      onRejectSuggestion,
      isMobile = false,
    },
    ref
  ) => {
    function renderEventContent(eventInfo: EventContentArg) {
      const isSuggestion = eventInfo.event.extendedProps.isSuggestion;
      const eventTitle = eventInfo.event.title;

      const tooltip = (
        <div className="absolute bottom-full left-1/2 z-50 mb-2 w-max -translate-x-1/2 rounded-md bg-gray-900 px-2 py-1 text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none dark:bg-gray-700">
          {eventTitle}
          <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-4 border-t-4 border-b-0 border-solid border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
        </div>
      );

      const baseContainerClasses = "group relative h-full w-full p-1";
      const titleClasses = "font-normal truncate";

      if (isSuggestion) {
        return (
          <div
            className={`${baseContainerClasses} flex items-center justify-between`}
          >
            <div className={`${titleClasses} text-xs pr-1`}>{eventTitle}</div>
            {tooltip}
            <div className="flex shrink-0 items-center space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAcceptSuggestion(eventInfo.event.id);
                }}
                className="bg-green-500 hover:bg-green-600 text-white p-0.5 rounded-full flex items-center justify-center"
                style={{ width: "16px", height: "16px" }}
                aria-label="Accept suggestion"
              >
                <Check size={10} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRejectSuggestion(eventInfo.event.id);
                }}
                className="bg-red-500 hover:bg-red-600 text-white p-0.5 rounded-full flex items-center justify-center"
                style={{ width: "16px", height: "16px" }}
                aria-label="Reject suggestion"
              >
                <X size={10} />
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className={`${baseContainerClasses} flex flex-col justify-start`}>
          <div className={titleClasses}>{eventTitle}</div>
          {tooltip}
        </div>
      );
    }

    const getEventClassNames = (eventInfo: any) => {
      const isSuggestion = eventInfo.event.extendedProps.isSuggestion;
      const isCopied = copiedEvents.some((e) => e.id === eventInfo.event.id);
      const isSelected = selectedEventIds.has(eventInfo.event.id);

      if (!isSuggestion && isCopied) {
        const copiedClasses = [
          "opacity-60",
          "border-2",
          "border-dashed",
          "border-blue-400",
          "rounded-md",
          ...(isMobile ? ["text-xs"] : []),
        ];
        if (isSelected) {
          copiedClasses.push("ring-2", "ring-blue-500");
        }
        return copiedClasses;
      }

      const classes = [
        "dark:bg-blue-900/80",
        "dark:border-blue-500",
        "border-l-4",
        "text-white dark:text-blue-200",
        "rounded-md",
        "border-transparent",
        "overflow-visible",
        ...(isMobile ? ["text-xs"] : []),
      ];

      if (isSuggestion) {
        classes.push("opacity-70");
      }

      if (isSelected) {
        classes.push("ring-2", "ring-blue-500");
      }
      return classes.filter(Boolean);
    };

    const desktopToolbar = {
      start: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay,refresh,reminders",
    };

    const mobileToolbar = {
      header: {
        start: "title",
        center: "",
        end: "prev,next,reminders",
      },
      footer: {
        start: "today",
        center: "dayGridMonth,timeGridWeek,timeGridDay",
        end: "refresh",
      },
    };

    return (
      <FullCalendar
        ref={ref}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
        events={events}
        eventClick={onEventClick}
        eventContent={renderEventContent}
        height="100%"
        customButtons={{
          refresh: {
            text: "",
            click: onRefresh,
            hint: "Refresh Suggestions",
          },
          reminders: {
            text: "",
            click: onToggleReminders,
            hint: `${
              unreadNonAIReminders.length > 0
                ? `${unreadNonAIReminders.length} `
                : ""
            }Reminders`,
          },
        }}
        eventClassNames={getEventClassNames}
        headerToolbar={isMobile ? mobileToolbar.header : desktopToolbar}
        footerToolbar={isMobile ? mobileToolbar.footer : undefined}
        buttonText={{
          today: "Today",
          month: isMobile ? "M" : "Month",
          week: isMobile ? "W" : "Week",
          day: isMobile ? "D" : "Day",
        }}
        dayMaxEventRows={isMobile ? 2 : 3}
        views={{
          dayGridMonth: {
            titleFormat: { year: "numeric", month: "long" },
            dayHeaderFormat: { weekday: isMobile ? "narrow" : "short" },
          },
        }}
        themeSystem="standard"
        dayCellClassNames="hover:bg-gray-100 transition-all duration-200 dark:hover:bg-dark-actionHover"
        dayHeaderClassNames={`${
          isMobile
            ? "text-gray-600 font-medium py-2 border-b dark:text-dark-textSecondary dark:border-dark-divider text-xs"
            : "text-gray-700 font-semibold py-3 border-b dark:text-dark-textSecondary dark:border-dark-divider"
        }`}
        nowIndicator={true}
        nowIndicatorClassNames="border-red-500 dark:border-red-900"
        scrollTimeReset={false}
        allDaySlot={false}
        scrollTime={`${new Date().getHours()}:00:00`}
        editable={true}
        select={onSelect}
        unselect={onUnselect}
        unselectAuto={true}
        selectable={true}
        dateClick={onDateClick}
        eventResize={onEventUpdate}
        eventDrop={onEventUpdate}
        datesSet={onDatesSet}
      />
    );
  }
);

CalendarComponent.displayName = "CalendarComponent";

export default CalendarComponent;
