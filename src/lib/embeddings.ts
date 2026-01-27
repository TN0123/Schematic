import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Generate embeddings for texts using Gemini's text-embedding-004 model
 * This is an expensive operation - use sparingly
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  try {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

    const embeddings: number[][] = [];

    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (text) => {
          const result = await model.embedContent(text);
          return result.embedding.values;
        }),
      );

      embeddings.push(...batchResults);

      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < texts.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return embeddings;
  } catch (error) {
    console.error("Error generating embeddings:", error);
    throw error;
  }
}

/**
 * Generate a single embedding for a text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const embeddings = await generateEmbeddings([text]);
  return embeddings[0];
}

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1, where 1 means identical
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Common English stop words to filter out
const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "as",
  "is",
  "was",
  "are",
  "were",
  "been",
  "be",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "must",
  "shall",
  "can",
  "need",
  "dare",
  "ought",
  "used",
  "it",
  "its",
  "this",
  "that",
  "these",
  "those",
  "i",
  "me",
  "my",
  "myself",
  "we",
  "our",
  "ours",
  "ourselves",
  "you",
  "your",
  "yours",
  "yourself",
  "yourselves",
  "he",
  "him",
  "his",
  "himself",
  "she",
  "her",
  "hers",
  "herself",
  "they",
  "them",
  "their",
  "theirs",
  "themselves",
  "what",
  "which",
  "who",
  "whom",
  "when",
  "where",
  "why",
  "how",
  "all",
  "each",
  "every",
  "both",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "no",
  "nor",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "just",
  "also",
  "now",
  "here",
  "there",
  "then",
  "once",
  "if",
  "because",
  "until",
  "while",
  "about",
  "into",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "between",
  "under",
  "again",
  "further",
  "any",
  "am",
  "being",
  "got",
  "get",
  "gets",
  "getting",
  "go",
  "goes",
  "going",
  "went",
  "gone",
  "come",
  "comes",
  "coming",
  "came",
  "make",
  "makes",
  "making",
  "made",
  "take",
  "takes",
  "taking",
  "took",
  "taken",
  "know",
  "knows",
  "knowing",
  "knew",
  "known",
  "think",
  "thinks",
  "thinking",
  "thought",
  "see",
  "sees",
  "seeing",
  "saw",
  "seen",
  "want",
  "wants",
  "wanting",
  "wanted",
  "look",
  "looks",
  "looking",
  "looked",
  "use",
  "uses",
  "using",
  "give",
  "gives",
  "giving",
  "gave",
  "given",
  "find",
  "finds",
  "finding",
  "found",
  "tell",
  "tells",
  "telling",
  "told",
  "ask",
  "asks",
  "asking",
  "asked",
  "work",
  "works",
  "working",
  "worked",
  "seem",
  "seems",
  "seeming",
  "seemed",
  "feel",
  "feels",
  "feeling",
  "felt",
  "try",
  "tries",
  "trying",
  "tried",
  "leave",
  "leaves",
  "leaving",
  "left",
  "call",
  "calls",
  "calling",
  "called",
  "keep",
  "keeps",
  "keeping",
  "kept",
  "let",
  "lets",
  "letting",
  "begin",
  "begins",
  "beginning",
  "began",
  "begun",
  "show",
  "shows",
  "showing",
  "showed",
  "shown",
  "hear",
  "hears",
  "hearing",
  "heard",
  "play",
  "plays",
  "playing",
  "played",
  "run",
  "runs",
  "running",
  "ran",
  "move",
  "moves",
  "moving",
  "moved",
  "live",
  "lives",
  "living",
  "lived",
  "believe",
  "believes",
  "believing",
  "believed",
  "hold",
  "holds",
  "holding",
  "held",
  "bring",
  "brings",
  "bringing",
  "brought",
  "happen",
  "happens",
  "happening",
  "happened",
  "write",
  "writes",
  "writing",
  "wrote",
  "written",
  "provide",
  "provides",
  "providing",
  "provided",
  "sit",
  "sits",
  "sitting",
  "sat",
  "stand",
  "stands",
  "standing",
  "stood",
  "lose",
  "loses",
  "losing",
  "lost",
  "pay",
  "pays",
  "paying",
  "paid",
  "meet",
  "meets",
  "meeting",
  "met",
  "include",
  "includes",
  "including",
  "included",
  "continue",
  "continues",
  "continuing",
  "continued",
  "set",
  "sets",
  "setting",
  "learn",
  "learns",
  "learning",
  "learned",
  "change",
  "changes",
  "changing",
  "changed",
  "lead",
  "leads",
  "leading",
  "led",
  "understand",
  "understands",
  "understanding",
  "understood",
  "watch",
  "watches",
  "watching",
  "watched",
  "follow",
  "follows",
  "following",
  "followed",
  "stop",
  "stops",
  "stopping",
  "stopped",
  "create",
  "creates",
  "creating",
  "created",
  "speak",
  "speaks",
  "speaking",
  "spoke",
  "spoken",
  "read",
  "reads",
  "reading",
  "allow",
  "allows",
  "allowing",
  "allowed",
  "add",
  "adds",
  "adding",
  "added",
  "spend",
  "spends",
  "spending",
  "spent",
  "grow",
  "grows",
  "growing",
  "grew",
  "grown",
  "open",
  "opens",
  "opening",
  "opened",
  "walk",
  "walks",
  "walking",
  "walked",
  "win",
  "wins",
  "winning",
  "won",
  "offer",
  "offers",
  "offering",
  "offered",
  "remember",
  "remembers",
  "remembering",
  "remembered",
  "love",
  "loves",
  "loving",
  "loved",
  "consider",
  "considers",
  "considering",
  "considered",
  "appear",
  "appears",
  "appearing",
  "appeared",
  "buy",
  "buys",
  "buying",
  "bought",
  "wait",
  "waits",
  "waiting",
  "waited",
  "serve",
  "serves",
  "serving",
  "served",
  "die",
  "dies",
  "dying",
  "died",
  "send",
  "sends",
  "sending",
  "sent",
  "expect",
  "expects",
  "expecting",
  "expected",
  "build",
  "builds",
  "building",
  "built",
  "stay",
  "stays",
  "staying",
  "stayed",
  "fall",
  "falls",
  "falling",
  "fell",
  "fallen",
  "cut",
  "cuts",
  "cutting",
  "reach",
  "reaches",
  "reaching",
  "reached",
  "kill",
  "kills",
  "killing",
  "killed",
  "remain",
  "remains",
  "remaining",
  "remained",
  "today",
  "tomorrow",
  "yesterday",
  "morning",
  "afternoon",
  "evening",
  "night",
  "day",
  "week",
  "month",
  "year",
  "time",
  "thing",
  "things",
  "way",
  "ways",
  "people",
  "person",
  "man",
  "woman",
  "child",
  "world",
  "life",
  "hand",
  "part",
  "place",
  "case",
  "point",
  "government",
  "company",
  "number",
  "group",
  "problem",
  "fact",
]);

/**
 * Extract keywords from text using simple NLP techniques
 * This is a local operation - no API calls, very fast and free
 */
export function extractKeywords(text: string, maxKeywords: number = 10): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Normalize text: lowercase, remove special characters
  const normalized = text
    .toLowerCase()
    .replace(/[^\w\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Split into words
  const words = normalized.split(" ");

  // Count word frequencies, excluding stop words
  const wordCounts = new Map<string, number>();
  for (const word of words) {
    // Skip short words, stop words, and numbers
    if (word.length < 3 || STOP_WORDS.has(word) || /^\d+$/.test(word)) {
      continue;
    }

    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  }

  // Sort by frequency and get top keywords
  const sortedWords = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);

  return sortedWords;
}

/**
 * Check if a text contains any of the given keywords
 */
export function containsKeywords(
  text: string,
  keywords: string[],
): { matches: boolean; matchedKeywords: string[] } {
  if (!text || keywords.length === 0) {
    return { matches: false, matchedKeywords: [] };
  }

  const normalizedText = text.toLowerCase();
  const matchedKeywords = keywords.filter((keyword) =>
    normalizedText.includes(keyword.toLowerCase()),
  );

  return {
    matches: matchedKeywords.length > 0,
    matchedKeywords,
  };
}

/**
 * Score how relevant a text is to a set of keywords
 * Returns a score between 0 and 1
 */
export function keywordRelevanceScore(
  text: string,
  keywords: string[],
): number {
  if (!text || keywords.length === 0) {
    return 0;
  }

  const { matchedKeywords } = containsKeywords(text, keywords);
  return matchedKeywords.length / keywords.length;
}
