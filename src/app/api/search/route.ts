import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }, // Only select what we need
  });

  if (!user) {
    return new NextResponse("User not found", { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 20); // Max 20 results

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ documents: [], bulletins: [] });
  }

  const searchQuery = query.trim();

  // Split query into words for better matching
  const searchWords = searchQuery
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 0);

  try {
    // Parallel database queries for better performance
    const [documents, bulletins] = await Promise.all([
      // Search documents with relevance scoring
      prisma.document.findMany({
        where: {
          userId: user.id,
          OR: [
            // Exact title match (highest priority)
            {
              title: {
                contains: searchQuery,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            // Title word matches
            ...searchWords.map((word) => ({
              title: {
                contains: word,
                mode: Prisma.QueryMode.insensitive,
              },
            })),
            // Content matches (lower priority)
            {
              content: {
                contains: searchQuery,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            // Content word matches
            ...searchWords.map((word) => ({
              content: {
                contains: word,
                mode: Prisma.QueryMode.insensitive,
              },
            })),
          ],
        },
        select: {
          id: true,
          title: true,
          content: true, // Include for snippet generation
          updatedAt: true,
        },
        orderBy: [
          // Prioritize recent updates
          { updatedAt: "desc" },
        ],
        take: limit,
      }),

      // Search bulletins with relevance scoring
      prisma.bulletin.findMany({
        where: {
          userId: user.id,
          OR: [
            // Exact title match (highest priority)
            {
              title: {
                contains: searchQuery,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            // Title word matches
            ...searchWords.map((word) => ({
              title: {
                contains: word,
                mode: Prisma.QueryMode.insensitive,
              },
            })),
            // Content matches (lower priority)
            {
              content: {
                contains: searchQuery,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            // Content word matches
            ...searchWords.map((word) => ({
              content: {
                contains: word,
                mode: Prisma.QueryMode.insensitive,
              },
            })),
          ],
        },
        select: {
          id: true,
          title: true,
          content: true, // Include for snippet generation
          type: true,
          updatedAt: true,
        },
        orderBy: [
          // Prioritize recent updates
          { updatedAt: "desc" },
        ],
        take: limit,
      }),
    ]);

    // Helper function to calculate relevance score
    const calculateRelevance = (title: string, content: string | null) => {
      const titleLower = title.toLowerCase();
      const contentLower = (content || "").toLowerCase();
      const queryLower = searchQuery.toLowerCase();

      let score = 0;

      // Exact title match gets highest score
      if (titleLower === queryLower) score += 100;
      // Title starts with query
      else if (titleLower.startsWith(queryLower)) score += 80;
      // Title contains exact query
      else if (titleLower.includes(queryLower)) score += 60;

      // Word matches in title
      searchWords.forEach((word) => {
        if (titleLower.includes(word)) score += 20;
      });

      // Content matches (lower weight)
      if (contentLower.includes(queryLower)) score += 10;
      searchWords.forEach((word) => {
        if (contentLower.includes(word)) score += 2;
      });

      return score;
    };

    // Helper function to generate content snippet
    const generateSnippet = (
      content: string | null,
      title: string
    ): string | undefined => {
      if (!content) return undefined;

      const queryLower = searchQuery.toLowerCase();
      const contentLower = content.toLowerCase();

      // If query is in title, don't show snippet
      if (title.toLowerCase().includes(queryLower)) return undefined;

      // Find the position of the query in content
      const index = contentLower.indexOf(queryLower);
      if (index === -1) {
        // Look for individual words
        for (const word of searchWords) {
          const wordIndex = contentLower.indexOf(word);
          if (wordIndex !== -1) {
            const start = Math.max(0, wordIndex - 50);
            const end = Math.min(content.length, wordIndex + word.length + 50);
            const snippet = content.slice(start, end).trim();
            return (
              (start > 0 ? "..." : "") +
              snippet +
              (end < content.length ? "..." : "")
            );
          }
        }
        return "Content match...";
      }

      // Extract snippet around the query
      const start = Math.max(0, index - 50);
      const end = Math.min(content.length, index + searchQuery.length + 50);
      const snippet = content.slice(start, end).trim();

      return (
        (start > 0 ? "..." : "") + snippet + (end < content.length ? "..." : "")
      );
    };

    // Process and score documents
    const processedDocuments = documents
      .map((doc) => ({
        id: doc.id,
        title: doc.title,
        updatedAt: doc.updatedAt.toISOString(),
        relevance: calculateRelevance(doc.title, doc.content),
        snippet: generateSnippet(doc.content, doc.title),
      }))
      .sort((a, b) => {
        // Sort by relevance first, then by date
        if (a.relevance !== b.relevance) return b.relevance - a.relevance;
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      })
      .slice(0, Math.ceil(limit / 2)) // Reserve half the results for each type
      .map(({ relevance, snippet, ...doc }) => ({ ...doc, snippet })); // Remove relevance from response

    // Process and score bulletins
    const processedBulletins = bulletins
      .map((bulletin) => ({
        id: bulletin.id,
        title: bulletin.title,
        type: bulletin.type,
        updatedAt: bulletin.updatedAt.toISOString(),
        relevance: calculateRelevance(bulletin.title, bulletin.content),
        snippet: generateSnippet(bulletin.content, bulletin.title),
      }))
      .sort((a, b) => {
        // Sort by relevance first, then by date
        if (a.relevance !== b.relevance) return b.relevance - a.relevance;
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      })
      .slice(0, Math.ceil(limit / 2)) // Reserve half the results for each type
      .map(({ relevance, snippet, ...bulletin }) => ({ ...bulletin, snippet })); // Remove relevance from response

    return NextResponse.json({
      documents: processedDocuments,
      bulletins: processedBulletins,
    });
  } catch (error) {
    console.error("Search error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
