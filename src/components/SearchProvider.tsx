"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface SearchContextType {
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  searchStats: SearchStats;
}

interface SearchStats {
  totalSearches: number;
  averageResponseTime: number;
  popularQueries: string[];
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

// Search analytics helper
const getSearchStats = (): SearchStats => {
  if (typeof window === "undefined")
    return { totalSearches: 0, averageResponseTime: 0, popularQueries: [] };

  try {
    const stats = localStorage.getItem("searchStats");
    return stats
      ? JSON.parse(stats)
      : { totalSearches: 0, averageResponseTime: 0, popularQueries: [] };
  } catch {
    return { totalSearches: 0, averageResponseTime: 0, popularQueries: [] };
  }
};

const updateSearchStats = (query: string, responseTime: number) => {
  if (typeof window === "undefined") return;

  try {
    const stats = getSearchStats();

    // Update total searches and average response time
    const newTotal = stats.totalSearches + 1;
    const newAverage =
      (stats.averageResponseTime * stats.totalSearches + responseTime) /
      newTotal;

    // Update popular queries
    const queryIndex = stats.popularQueries.indexOf(query);
    let newPopularQueries = [...stats.popularQueries];

    if (queryIndex > -1) {
      // Move existing query to front
      newPopularQueries.splice(queryIndex, 1);
      newPopularQueries.unshift(query);
    } else {
      // Add new query to front
      newPopularQueries.unshift(query);
    }

    // Keep only top 10 popular queries
    newPopularQueries = newPopularQueries.slice(0, 10);

    const newStats: SearchStats = {
      totalSearches: newTotal,
      averageResponseTime: Math.round(newAverage),
      popularQueries: newPopularQueries,
    };

    localStorage.setItem("searchStats", JSON.stringify(newStats));
  } catch {
    // Fail silently
  }
};

export function SearchProvider({ children }: { children: ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchStats, setSearchStats] = useState<SearchStats>({
    totalSearches: 0,
    averageResponseTime: 0,
    popularQueries: [],
  });

  // Load search stats on mount
  useEffect(() => {
    setSearchStats(getSearchStats());
  }, []);

  const openSearch = () => {
    setIsSearchOpen(true);

    // Track search modal opens
    if (typeof window !== "undefined") {
      try {
        const opens =
          parseInt(localStorage.getItem("searchModalOpens") || "0") + 1;
        localStorage.setItem("searchModalOpens", opens.toString());
      } catch {
        // Fail silently
      }
    }
  };

  const closeSearch = () => setIsSearchOpen(false);

  // Make updateSearchStats available globally for the search component
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__updateSearchStats = (
        query: string,
        responseTime: number
      ) => {
        updateSearchStats(query, responseTime);
        setSearchStats(getSearchStats());
      };
    }
  }, []);

  return (
    <SearchContext.Provider
      value={{ isSearchOpen, openSearch, closeSearch, searchStats }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}
