import ChatWindow from "@/app/write/_components/ChatWindow";
import WriteOptions from "@/app/write/_components/WriteOptions";
export default function Writer() {
  return (
    <div className="flex w-full min-h-screen h-auto h-full p-2 bg-gray-200">
      <div className="w-1/5">
        <h1></h1>
      </div>
      <ChatWindow></ChatWindow>
      <div className="flex w-1/5 justify-center items-center">
        <WriteOptions />
      </div>
    </div>
  );
}
