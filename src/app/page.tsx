import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardClient from "./_components/DashboardClient";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  return (
    <DashboardClient
      userId={userId}
    />
  );
}
