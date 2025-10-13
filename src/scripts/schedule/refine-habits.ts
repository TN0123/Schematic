import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface EventAction {
  id: string;
  eventTitle: string;
  eventStart: Date;
  eventEnd: Date;
  actionType: string;
}

interface Cluster {
  id?: string;
  clusterLabel: string;
  exemplarTitle: string;
  embedding: number[];
  memberEventIds: string[];
}

/**
 * Generate embeddings for event titles using Gemini
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    
    const embeddings: number[][] = [];
    
    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async (text) => {
          const result = await model.embedContent(text);
          return result.embedding.values;
        })
      );
      
      embeddings.push(...batchResults);
      
      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return embeddings;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
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

/**
 * Cluster events by semantic similarity using embeddings
 */
export async function clusterEventsBySemantics(
  eventActions: EventAction[],
  similarityThreshold: number = 0.75
): Promise<Cluster[]> {
  if (eventActions.length === 0) {
    return [];
  }

  try {
    // Get unique event titles
    const uniqueTitles = Array.from(new Set(eventActions.map(e => e.eventTitle)));
    
    // Generate embeddings for all unique titles
    const embeddings = await generateEmbeddings(uniqueTitles);
    
    // Create a map of title to embedding
    const titleToEmbedding = new Map<string, number[]>();
    uniqueTitles.forEach((title, idx) => {
      titleToEmbedding.set(title, embeddings[idx]);
    });
    
    // Cluster events using greedy clustering
    const clusters: Cluster[] = [];
    const assigned = new Set<string>();
    
    for (const event of eventActions) {
      if (assigned.has(event.id)) {
        continue;
      }
      
      const eventEmbedding = titleToEmbedding.get(event.eventTitle);
      if (!eventEmbedding) {
        continue;
      }
      
      // Try to find an existing cluster that's similar
      let foundCluster = false;
      for (const cluster of clusters) {
        const similarity = cosineSimilarity(eventEmbedding, cluster.embedding);
        
        if (similarity >= similarityThreshold) {
          // Add to this cluster
          cluster.memberEventIds.push(event.id);
          assigned.add(event.id);
          foundCluster = true;
          break;
        }
      }
      
      // If no similar cluster found, create a new one
      if (!foundCluster) {
        clusters.push({
          clusterLabel: event.eventTitle,
          exemplarTitle: event.eventTitle,
          embedding: eventEmbedding,
          memberEventIds: [event.id],
        });
        assigned.add(event.id);
      }
    }
    
    return clusters;
  } catch (error) {
    console.error('Error clustering events:', error);
    return [];
  }
}

/**
 * Deduplicate habits by merging very similar clusters
 */
export function deduplicateHabits(
  clusters: Cluster[],
  mergeThreshold: number = 0.85
): Cluster[] {
  if (clusters.length <= 1) {
    return clusters;
  }
  
  const merged: Cluster[] = [];
  const processed = new Set<number>();
  
  for (let i = 0; i < clusters.length; i++) {
    if (processed.has(i)) {
      continue;
    }
    
    const currentCluster = clusters[i];
    const toMerge: Cluster[] = [currentCluster];
    
    // Find all clusters to merge with this one
    for (let j = i + 1; j < clusters.length; j++) {
      if (processed.has(j)) {
        continue;
      }
      
      const similarity = cosineSimilarity(
        currentCluster.embedding,
        clusters[j].embedding
      );
      
      if (similarity >= mergeThreshold) {
        toMerge.push(clusters[j]);
        processed.add(j);
      }
    }
    
    // Merge all similar clusters
    const mergedCluster: Cluster = {
      id: currentCluster.id,
      clusterLabel: currentCluster.clusterLabel,
      exemplarTitle: currentCluster.exemplarTitle,
      embedding: currentCluster.embedding,
      memberEventIds: toMerge.flatMap(c => c.memberEventIds),
    };
    
    merged.push(mergedCluster);
    processed.add(i);
  }
  
  return merged;
}

/**
 * Extract recurring patterns from event actions
 * This is a simple implementation that looks for events with similar timing patterns
 */
export function extractRecurringPatterns(eventActions: EventAction[]): Array<{
  title: string;
  pattern: {
    dayOfWeek: number[];
    hourOfDay: number[];
    frequency: number;
  };
}> {
  const patterns: Map<string, {
    title: string;
    days: Set<number>;
    hours: Set<number>;
    count: number;
  }> = new Map();
  
  for (const event of eventActions) {
    const dayOfWeek = new Date(event.eventStart).getDay();
    const hourOfDay = new Date(event.eventStart).getHours();
    
    const existing = patterns.get(event.eventTitle);
    if (existing) {
      existing.days.add(dayOfWeek);
      existing.hours.add(hourOfDay);
      existing.count++;
    } else {
      patterns.set(event.eventTitle, {
        title: event.eventTitle,
        days: new Set([dayOfWeek]),
        hours: new Set([hourOfDay]),
        count: 1,
      });
    }
  }
  
  // Convert to array format
  return Array.from(patterns.values())
    .filter(p => p.count >= 3) // Only include patterns that occur at least 3 times
    .map(p => ({
      title: p.title,
      pattern: {
        dayOfWeek: Array.from(p.days),
        hourOfDay: Array.from(p.hours),
        frequency: p.count,
      },
    }));
}


