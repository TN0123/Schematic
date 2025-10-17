import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import DocumentList from "@/app/notebook/_components/DocumentList";
import { redirect } from "next/navigation";

export default async function DocumentsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    // Redirect to login or show an unauthorized message
    redirect("/auth/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    // Handle case where user is not found in the database
    // This might be an error condition you want to log or show a message for
    redirect("/auth/login");
  }

  const documents = await prisma.document.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  // The data is fetched on the server and passed as a prop to the client component
  return <DocumentList initialDocuments={documents} />;
}
