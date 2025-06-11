import { Suspense } from "react";
import BulletinClient from "./_components/BulletinClient";
import { Loader2 } from "lucide-react";

function Loading() {
  return (
    <div className="w-full h-screen flex flex-col justify-center items-center bg-white dark:bg-dark-background">
      <Loader2
        className="animate-spin text-gray-400 dark:text-gray-500"
        size={48}
      />
      <p className="mt-4 text-gray-500 dark:text-gray-400">Loading notes...</p>
    </div>
  );
}

export default function BulletinPage() {
  return (
    <Suspense fallback={<Loading />}>
      <BulletinClient />
    </Suspense>
  );
}
