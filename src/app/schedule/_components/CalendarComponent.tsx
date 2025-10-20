"use client";

import { forwardRef, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
import { Check, X, Link as LinkIcon } from "lucide-react";
import { Event } from "../types";
import { useRouter } from "next/navigation";

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
  isShiftPressed?: boolean;
  shiftSelectionActive?: boolean;
  setLastSelectWasShift?: (wasShift: boolean) => void;
  todosByDate?: Record<
    string,
    Array<{ text: string; bulletinTitle: string; checked: boolean }>
  >;
}

// Smart Tooltip Component
interface SmartTooltipProps {
  isVisible: boolean;
  targetRect: DOMRect | null;
  content: string;
}

const SmartTooltip = ({
  isVisible,
  targetRect,
  content,
}: SmartTooltipProps) => {
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    placement: "top",
  });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible || !targetRect || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    let top = targetRect.top - tooltipRect.height - 8; // 8px gap
    let left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
    let placement = "top";

    // Check if tooltip goes above viewport
    if (top < 0) {
      top = targetRect.bottom + 8;
      placement = "bottom";
    }

    // Check if tooltip goes beyond right edge
    if (left + tooltipRect.width > viewport.width - 16) {
      left = viewport.width - tooltipRect.width - 16;
    }

    // Check if tooltip goes beyond left edge
    if (left < 16) {
      left = 16;
    }

    setPosition({ top, left, placement });
  }, [isVisible, targetRect]);

  if (!isVisible || !targetRect) return null;

  return createPortal(
    <div
      ref={tooltipRef}
      className={`fixed z-[10000] max-w-sm rounded-md px-3 py-2 text-xs font-semibold shadow-lg transition-opacity duration-200 ${
        isVisible ? "opacity-100" : "opacity-0"
      } bg-white text-gray-900 dark:bg-dark-paper dark:text-dark-textPrimary border border-gray-200 dark:border-dark-divider`}
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="relative">
        <span className="block break-words whitespace-normal">{content}</span>
        {/* Arrow */}
        <div
          className={`absolute h-0 w-0 border-4 border-transparent ${
            position.placement === "top"
              ? "top-full left-1/2 -translate-x-1/2 border-t-white dark:border-t-dark-paper"
              : "bottom-full left-1/2 -translate-x-1/2 border-b-white dark:border-b-dark-paper"
          }`}
        />
      </div>
    </div>,
    document.body
  );
};

// Todo Tooltip Component
interface TodoTooltipProps {
  isVisible: boolean;
  targetRect: DOMRect | null;
  todos: Array<{ text: string; bulletinTitle: string }>;
}

const TodoTooltip = ({ isVisible, targetRect, todos }: TodoTooltipProps) => {
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    placement: "top",
  });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isVisible || !targetRect || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    let top = targetRect.top - tooltipRect.height - 8;
    let left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
    let placement = "top";

    if (top < 0) {
      top = targetRect.bottom + 8;
      placement = "bottom";
    }

    if (left + tooltipRect.width > viewport.width - 16) {
      left = viewport.width - tooltipRect.width - 16;
    }

    if (left < 16) {
      left = 16;
    }

    setPosition({ top, left, placement });
  }, [isVisible, targetRect]);

  if (!isVisible || !targetRect || todos.length === 0) return null;

  return createPortal(
    <div
      ref={tooltipRef}
      className={`fixed z-[10000] max-w-xs rounded-lg px-3 py-2 shadow-xl transition-opacity duration-200 ${
        isVisible ? "opacity-100" : "opacity-0"
      } bg-white dark:bg-dark-paper border border-gray-200 dark:border-dark-divider`}
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="relative">
        <div className="text-xs font-semibold text-gray-700 dark:text-dark-textPrimary mb-2">
          Tasks Due ({todos.length})
        </div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {todos.map((todo, idx) => (
            <div key={idx} className="text-xs">
              <div className="text-gray-900 dark:text-dark-textPrimary font-medium">
                {todo.text}
              </div>
              <div className="text-gray-500 dark:text-dark-textSecondary text-[10px]">
                from: {todo.bulletinTitle}
              </div>
            </div>
          ))}
        </div>
        {/* Arrow */}
        <div
          className={`absolute h-0 w-0 border-4 border-transparent ${
            position.placement === "top"
              ? "top-full left-1/2 -translate-x-1/2 border-t-white dark:border-t-dark-paper"
              : "bottom-full left-1/2 -translate-x-1/2 border-b-white dark:border-b-dark-paper"
          }`}
        />
      </div>
    </div>,
    document.body
  );
};

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
      isShiftPressed = false,
      shiftSelectionActive = false,
      setLastSelectWasShift,
      todosByDate = {},
    },
    ref
  ) => {
    const router = useRouter();
    function sleep(ms: number) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }
    const [tooltip, setTooltip] = useState<{
      isVisible: boolean;
      targetRect: DOMRect | null;
      content: string;
    }>({
      isVisible: false,
      targetRect: null,
      content: "",
    });

    const [currentView, setCurrentView] = useState<string>("timeGridDay");
    const [todoTooltip, setTodoTooltip] = useState<{
      isVisible: boolean;
      targetRect: DOMRect | null;
      todos: Array<{ text: string; bulletinTitle: string }>;
    }>({
      isVisible: false,
      targetRect: null,
      todos: [],
    });

    const showTooltip = (element: HTMLElement, content: string) => {
      const rect = element.getBoundingClientRect();
      setTooltip({
        isVisible: true,
        targetRect: rect,
        content,
      });
    };

    const hideTooltip = () => {
      setTooltip((prev) => ({ ...prev, isVisible: false }));
    };

    const hideTodoTooltip = () => {
      setTodoTooltip((prev) => ({ ...prev, isVisible: false }));
    };

    // Function to render day cell content with todo indicators (for month view only)
    const renderDayCellContent = (args: any) => {
      // Only show indicators in month view
      if (currentView !== "dayGridMonth") {
        return args.dayNumberText;
      }

      const dateStr = args.date.toISOString().split("T")[0];
      const todosForDate = todosByDate[dateStr] || [];

      if (todosForDate.length === 0) {
        return args.dayNumberText;
      }

      return (
        <div className="flex items-center justify-between w-full">
          <span>{args.dayNumberText}</span>
          <div
            className="bg-green-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center cursor-pointer hover:bg-green-600 transition-colors flex-shrink-0"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTodoTooltip({
                isVisible: true,
                targetRect: rect,
                todos: todosForDate,
              });
            }}
            onMouseLeave={hideTodoTooltip}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {todosForDate.length}
          </div>
        </div>
      );
    };

    // Function to render day header content with todo indicators (for week/day views only)
    const renderDayHeaderContent = (args: any) => {
      // Only show indicators in week and day views, not month view
      if (currentView === "dayGridMonth") {
        return args.text;
      }

      const dateStr = args.date.toISOString().split("T")[0];
      const todosForDate = todosByDate[dateStr] || [];

      if (todosForDate.length === 0) {
        return args.text;
      }

      return (
        <div className="flex items-center justify-center w-full h-full relative gap-1">
          <span>{args.text}</span>
          <div
            className="bg-green-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center cursor-pointer hover:bg-green-600 transition-colors"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setTodoTooltip({
                isVisible: true,
                targetRect: rect,
                todos: todosForDate,
              });
            }}
            onMouseLeave={hideTodoTooltip}
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {todosForDate.length}
          </div>
        </div>
      );
    };

    function renderEventContent(eventInfo: EventContentArg) {
      const isSuggestion = eventInfo.event.extendedProps.isSuggestion;
      const eventTitle = eventInfo.event.title;
      const shouldShowButtons = !isMobile || currentView === "timeGridDay";

      const startDate = eventInfo.event.start as Date | null;
      const endDate = eventInfo.event.end as Date | null;
      const isShortEvent =
        !!startDate && !!endDate
          ? (endDate.getTime() - startDate.getTime()) / 60000 <= 30
          : false;

      const hasLinks = Array.isArray(eventInfo.event.extendedProps.links)
        ? (eventInfo.event.extendedProps.links as string[]).length > 0
        : false;

      const baseContainerClasses = `group relative h-full w-full overflow-visible ${
        isShortEvent ? "py-0 px-1" : "p-1"
      }`;
      const titleClasses = `${
        isShortEvent ? "text-xs leading-tight" : ""
      } font-normal truncate`;

      const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
        if (eventTitle) {
          // Find the text element within the event container
          const textElement = e.currentTarget.querySelector(".event-title");
          if (
            textElement &&
            (textElement.scrollWidth > textElement.clientWidth ||
              textElement.scrollHeight > textElement.clientHeight)
          ) {
            // Text is overflowing, show tooltip
            showTooltip(e.currentTarget, eventTitle);
          }
        }
      };

      const handleMouseLeave = () => {
        hideTooltip();
      };

      if (isSuggestion) {
        return (
          <div
            className={`${baseContainerClasses} flex items-center justify-between`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className={`${titleClasses} text-xs pr-1 event-title`}>
              {eventTitle}
            </div>
            {shouldShowButtons && (
              <div className="flex shrink-0 items-center space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    hideTooltip();
                    onAcceptSuggestion(eventInfo.event.id);
                  }}
                  className="bg-green-500 hover:bg-green-600 text-white p-0.5 rounded-full flex items-center justify-center z-[10000] relative"
                  style={{ width: "16px", height: "16px" }}
                  aria-label="Accept suggestion"
                >
                  <Check size={10} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    hideTooltip();
                    onRejectSuggestion(eventInfo.event.id);
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white p-0.5 rounded-full flex items-center justify-center z-[10000] relative"
                  style={{ width: "16px", height: "16px" }}
                  aria-label="Reject suggestion"
                >
                  <X size={10} />
                </button>
              </div>
            )}
          </div>
        );
      }

      return (
        <div
          className={`${baseContainerClasses} flex flex-col justify-start`}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {!isShortEvent && hasLinks && (
            <div className="absolute top-0.5 right-0.5">
              <LinkIcon
                size={12}
                className="text-white dark:text-blue-200/90"
              />
            </div>
          )}
          <div className={`${titleClasses} event-title`}>{eventTitle}</div>
        </div>
      );
    }

    const getEventClassNames = (eventInfo: any) => {
      const isSuggestion = eventInfo.event.extendedProps.isSuggestion;
      const isCopied = copiedEvents.some((e) => e.id === eventInfo.event.id);
      const isSelected = selectedEventIds.has(eventInfo.event.id);
      const startTs = eventInfo.event.start
        ? (eventInfo.event.start as Date).getTime()
        : null;
      const endTs = eventInfo.event.end
        ? (eventInfo.event.end as Date).getTime()
        : null;
      const isShortDuration =
        startTs !== null && endTs !== null
          ? endTs - startTs < 60 * 60 * 1000
          : false;

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

      if (isShortDuration) {
        classes.push("short-event");
      }

      if (isSelected) {
        classes.push("ring-2", "ring-blue-500");
      }
      return classes.filter(Boolean);
    };

    const desktopToolbar = {
      start: "prev,next today",
      center: "title",
      right:
        "dayGridMonth,timeGridWeek,timeGridDay,refresh,reminders,statistics",
    };

    const mobileToolbar = {
      header: {
        start: "prev,next",
        center: "title",
        end: "reminders",
      },
      footer: {
        start: "today",
        center: "dayGridMonth,timeGridWeek,timeGridDay",
        end: "refresh",
      },
    };

    return (
      <>
        <FullCalendar
          ref={ref}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
          events={events}
          eventAllow={(dropInfo, draggedEvent) => {
            // Only allow dragging non-suggestion events
            return !draggedEvent?.extendedProps?.isSuggestion;
          }}
          eventClick={onEventClick}
          eventContent={renderEventContent}
          dayCellContent={renderDayCellContent}
          dayHeaderContent={renderDayHeaderContent}
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
            statistics: {
              text: "",
              click: async () => {
                const mainContent = document.querySelector("main");
                document.documentElement.style.overflow = "hidden";
                document.body.style.overflow = "hidden";
                mainContent?.classList.add("page-transition");
                await sleep(150);
                router.push("/statistics");
              },
              hint: "Statistics",
            },
          }}
          eventClassNames={getEventClassNames}
          headerToolbar={isMobile ? mobileToolbar.header : desktopToolbar}
          footerToolbar={isMobile ? mobileToolbar.footer : undefined}
          buttonText={{
            today: isMobile ? "Today" : "Today",
            month: isMobile ? "Month" : "Month",
            week: isMobile ? "Week" : "Week",
            day: isMobile ? "Day" : "Day",
          }}
          dayMaxEventRows={isMobile ? 3 : 3}
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
          eventStartEditable={true}
          eventDurationEditable={true}
          select={onSelect}
          unselect={onUnselect}
          unselectAuto={true}
          selectable={true}
          selectMirror={!isShiftPressed && !shiftSelectionActive}
          selectAllow={(selectInfo) => {
            const wasShift = !!(selectInfo as any)?.jsEvent?.shiftKey;
            setLastSelectWasShift?.(wasShift);
            return true;
          }}
          dateClick={onDateClick}
          eventResize={onEventUpdate}
          eventDrop={onEventUpdate}
          datesSet={(dateInfo: any) => {
            setCurrentView(dateInfo.view.type);
            onDatesSet(dateInfo);
          }}
        />
        <SmartTooltip
          isVisible={tooltip.isVisible}
          targetRect={tooltip.targetRect}
          content={tooltip.content}
        />
        <TodoTooltip
          isVisible={todoTooltip.isVisible}
          targetRect={todoTooltip.targetRect}
          todos={todoTooltip.todos}
        />
      </>
    );
  }
);

CalendarComponent.displayName = "CalendarComponent";

export default CalendarComponent;
