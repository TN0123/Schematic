import { Event } from "../page";
import { Check, X } from "lucide-react";

function formatTime(time: string): string {
  const date = new Date(time);

  let hours: number = date.getHours();
  let minutes: number = date.getMinutes();
  let amPm: string = hours >= 12 ? "pm" : "am";

  hours = hours % 12 || 12;
  let minutesStr: string = minutes === 0 ? "" : `:${minutes}`;

  return `${hours}${minutesStr} ${amPm}`;
}

export default function EventSuggestion({
  suggestedEvent,
  onAccept,
  onReject,
}: {
  suggestedEvent: Event;
  onAccept: (event: Event) => void;
  onReject: (eventId: string) => void;
}) {
  return (
    <div className="flex w-full h-full border rounded-md items-center justify-between p-2 mb-2 hover:shadow-md hover:border-gray-300 hover:translate-y-[-1px] transition-all duration-200">
      <div
        className="flex justify-center items-center rounded-xl hover:bg-red-300 p-2 transition cursor-pointer"
        onClick={() => onReject(suggestedEvent.id)}
      >
        <X />
      </div>
      <div className="flex flex-col px-4 justify-center items-center text-center">
        <span className="font-bold text-sm">{suggestedEvent.title}</span>
        <span className="text-sm">
          {formatTime(suggestedEvent.start.toString())} to{" "}
          {formatTime(suggestedEvent.end.toString())}
        </span>
      </div>
      <div
        className="flex justify-center items-center rounded-xl hover:bg-green-300 p-2 transition cursor-pointer"
        onClick={() => onAccept(suggestedEvent)}
      >
        <Check />
      </div>
    </div>
  );
}
