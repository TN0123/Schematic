import { Event } from "../page";
import { Check, X } from "lucide-react";

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
    <div className="flex w-full h-full border rounded-md items-center justify-between p-4 mb-2">
      <div
        className="flex justify-center items-center rounded-xl hover:bg-red-300 p-2 transition cursor-pointer"
        onClick={() => onReject(suggestedEvent.id)}
      >
        <X />
      </div>
      <div className="flex flex-col px-4 justify-center items-center text-center">
        <span className="font-bold text-sm">{suggestedEvent.title}</span>
        <span className="text-sm">
          {suggestedEvent.start.toString().substring(0, 10)} to{" "}
          {suggestedEvent.end.toString().substring(0, 10)}
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
