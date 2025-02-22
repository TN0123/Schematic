import { Event } from "../page";
import { Check, X } from "lucide-react";

export default function EventSuggestion({
  suggestedEvent,
}: {
  suggestedEvent: Event;
}) {
  return (
    <div className="flex w-full h-full border rounded-md items-center justify-between p-4">
      <div className="flex justify-center items-center rounded-xl hover:bg-red-300 p-2 transition">
        <X />
      </div>
      <div className="flex flex-col px-4 justify-center items-center text-center">
        <span className="font-bold text-sm">{suggestedEvent.title}</span>
        <span className="text-sm">
          {suggestedEvent.start.toString().substring(0, 10)} to{" "}
          {suggestedEvent.end.toString().substring(0, 10)}
        </span>
      </div>
      <div className="flex justify-center items-center rounded-xl hover:bg-green-300 p-2 transition">
        <Check />
      </div>
    </div>
  );
}
