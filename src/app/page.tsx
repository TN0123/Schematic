import Image from "next/image";
import ChatWindow from "./_components/ChatWindow";

export default function Home() {
  return (
    <div className="flex items-center justify-center h-screen w-full">
      <ChatWindow></ChatWindow>
    </div>
  );
}
