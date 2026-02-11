import { formatDueDate } from "@/app/bulletin/_components/utils/dateHelpers";
import prisma from "@/lib/prisma";

function extractSearchableTextFromData(data: unknown, type: string): string {
  if (!data) return "";

  const searchableTexts: string[] = [];

  try {
    switch (type) {
      case "todo": {
        if (
          typeof data === "object" &&
          data !== null &&
          "items" in data &&
          Array.isArray((data as { items?: unknown[] }).items)
        ) {
          (data as { items: Array<Record<string, unknown>> }).items.forEach(
            (item) => {
              if (typeof item.text !== "string") return;
              let itemText = item.text;

              if (typeof item.dueDate === "string") {
                if (typeof item.dueTime === "string") {
                  const [hours, minutes] = item.dueTime.split(":").map(Number);
                  const date = new Date(item.dueDate);
                  date.setHours(hours, minutes, 0, 0);

                  const dateStr = formatDueDate(item.dueDate);
                  const timeStr = date.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  });

                  itemText += ` (due: ${dateStr} at ${timeStr})`;
                } else {
                  const dateStr = formatDueDate(item.dueDate);
                  itemText += ` (due: ${dateStr})`;
                }
              }

              searchableTexts.push(itemText);
            },
          );
        }
        break;
      }
      case "kanban": {
        if (
          typeof data === "object" &&
          data !== null &&
          "cards" in data &&
          Array.isArray((data as { cards?: unknown[] }).cards)
        ) {
          (data as { cards: Array<Record<string, unknown>> }).cards.forEach(
            (card) => {
              if (typeof card.text === "string") searchableTexts.push(card.text);
              if (typeof card.description === "string") {
                searchableTexts.push(card.description);
              }
              if (Array.isArray(card.tags)) {
                searchableTexts.push(
                  ...card.tags.filter((tag): tag is string => typeof tag === "string"),
                );
              }
            },
          );
        }
        break;
      }
      case "dynamic": {
        const extractStrings = (obj: unknown): string[] => {
          const strings: string[] = [];
          if (typeof obj === "string") {
            strings.push(obj);
          } else if (Array.isArray(obj)) {
            obj.forEach((item) => strings.push(...extractStrings(item)));
          } else if (obj && typeof obj === "object") {
            Object.values(obj).forEach((value) =>
              strings.push(...extractStrings(value)),
            );
          }
          return strings;
        };
        searchableTexts.push(...extractStrings(data));
        break;
      }
      default:
        break;
    }
  } catch (error) {
    console.error("Error extracting searchable text from data:", error);
  }

  return searchableTexts.join(" ");
}

export async function searchBulletinNotes(
  userId: string,
  query: string,
  limit = 5,
) {
  try {
    if (!query || query.trim().length === 0) {
      return { error: "Search query cannot be empty." };
    }

    const searchQuery = query.trim();
    const searchWords = searchQuery
      .toLowerCase()
      .split(/\s+/)
      .filter((word) => word.length > 0);

    const bulletins = await prisma.bulletin.findMany({
      where: {
        userId,
        type: {
          not: "whiteboard",
        },
      },
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        data: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const matchingBulletins = bulletins.filter((bulletin) => {
      const titleLower = bulletin.title.toLowerCase();
      const contentLower = bulletin.content.toLowerCase();

      const titleMatch =
        titleLower.includes(searchQuery.toLowerCase()) ||
        searchWords.some((word) => titleLower.includes(word));

      const contentMatch =
        contentLower.includes(searchQuery.toLowerCase()) ||
        searchWords.some((word) => contentLower.includes(word));

      const dataSearchableText = extractSearchableTextFromData(
        bulletin.data,
        bulletin.type,
      );
      const dataSearchableTextLower = dataSearchableText.toLowerCase();
      const dataMatch =
        dataSearchableTextLower.includes(searchQuery.toLowerCase()) ||
        searchWords.some((word) => dataSearchableTextLower.includes(word));

      return titleMatch || contentMatch || dataMatch;
    });

    const limitedResults = matchingBulletins.slice(0, Math.min(limit, 10));

    return limitedResults.map((bulletin) => {
      let contentPreview = bulletin.content
        ? bulletin.content.substring(0, 200) +
          (bulletin.content.length > 200 ? "..." : "")
        : "";

      if (bulletin.type !== "text" && bulletin.data) {
        const dataText = extractSearchableTextFromData(
          bulletin.data,
          bulletin.type,
        );
        if (dataText) {
          const dataPreview =
            dataText.substring(0, 100) + (dataText.length > 100 ? "..." : "");
          contentPreview = contentPreview
            ? `${contentPreview} | Data: ${dataPreview}`
            : `Data: ${dataPreview}`;
        }
      }

      return {
        id: bulletin.id,
        title: bulletin.title,
        content: contentPreview,
        type: bulletin.type,
        updatedAt: bulletin.updatedAt.toISOString(),
      };
    });
  } catch (error) {
    console.error("Error searching bulletin notes:", error);
    return { error: "Failed to search bulletin notes." };
  }
}
