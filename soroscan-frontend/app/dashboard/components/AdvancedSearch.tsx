"use client";

import { useState, useRef } from "react";
import styles from "./AdvancedSearch.module.css";

interface AdvancedSearchProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
}

const SUGGESTIONS_KEYS = ["type:", "contract:", "amount:"];
const SUGGESTION_TYPES = ["transfer", "mint", "burn", "swap", "init", "incr_allowance"];

export function AdvancedSearch({ onSearch, initialQuery = "" }: AdvancedSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("search_history");
    return saved ? JSON.parse(saved) : [];
  });
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("search_bookmarks");
    return saved ? JSON.parse(saved) : [];
  });
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const saveToHistory = (q: string) => {
    if (!q.trim()) return;
    const newHistory = [q, ...history.filter((h) => h !== q)].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem("search_history", JSON.stringify(newHistory));
  };

  const handleSearch = (q: string) => {
    setQuery(q);
    onSearch(q);
    saveToHistory(q);
    setShowSuggestions(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    const lastWord = val.split(" ").pop() || "";
    if (lastWord === "") {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    let nextSuggestions: string[] = [];
    if (lastWord.includes(":")) {
      const [key, search] = lastWord.split(":");
      if (key === "type") {
        nextSuggestions = SUGGESTION_TYPES.filter((t) => t.startsWith(search)).map((t) => `type:${t}`);
      }
    } else {
      nextSuggestions = SUGGESTIONS_KEYS.filter((k) => k.startsWith(lastWord));
    }

    setSuggestions(nextSuggestions);
    setShowSuggestions(nextSuggestions.length > 0);
  };

  const applySuggestion = (suggestion: string) => {
    const parts = query.split(" ");
    parts.pop();
    const newQuery = [...parts, suggestion].join(" ") + " ";
    setQuery(newQuery);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const toggleBookmark = () => {
    if (!query.trim()) return;
    let newBookmarks;
    if (bookmarks.includes(query)) {
      newBookmarks = bookmarks.filter((b) => b !== query);
    } else {
      newBookmarks = [query, ...bookmarks];
    }
    setBookmarks(newBookmarks);
    localStorage.setItem("search_bookmarks", JSON.stringify(newBookmarks));
  };

  const quickFilters = [
    { label: "Last Hour", query: "since:1h" },
    { label: "Failed", query: "status:failed" },
    { label: "Success", query: "status:success" },
    { label: "Pending", query: "status:pending" },
  ];

  return (
    <div className={styles.advancedSearch}>
      <div className={styles.searchContainer}>
        <input
          ref={inputRef}
          type="text"
          className={styles.searchInput}
          placeholder="Search with syntax (e.g. type:transfer amount:>1000)..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
          onFocus={() => query.split(" ").pop() && suggestions.length > 0 && setShowSuggestions(true)}
        />
        <button className={styles.saveBtn} onClick={toggleBookmark} title="Save Search">
          {bookmarks.includes(query) ? "★" : "☆"}
        </button>
        <button className={styles.helpToggle} onClick={() => setShowHelp(!showHelp)}>
          ?
        </button>
        
        {showSuggestions && (
          <div className={styles.suggestions}>
            {suggestions.map((s) => (
              <div key={s} className={styles.suggestionItem} onClick={() => applySuggestion(s)}>
                {s}
              </div>
            ))}
          </div>
        )}
      </div>

      {showHelp && (
        <div className={styles.helpContent}>
          <span className={styles.helpTitle}>Search Syntax Guide:</span>
          <ul>
            <li><code className={styles.helpCode}>type:transfer</code> - Filter by event type</li>
            <li><code className={styles.helpCode}>contract:C...</code> - Filter by contract ID</li>
            <li><code className={styles.helpCode}>amount:&gt;100</code> - Comparison operators ( &gt;, &lt;, &gt;=, &lt;= )</li>
            <li><code className={styles.helpCode}>word1 word2</code> - Full-text search across all fields</li>
          </ul>
        </div>
      )}

      <div className={styles.quickFilters}>
        {quickFilters.map((f) => (
          <button key={f.label} className={styles.filterBtn} onClick={() => handleSearch(f.query)}>
            {f.label}
          </button>
        ))}
      </div>

      {bookmarks.length > 0 && (
        <div className={styles.savedSearches}>
          <span className={styles.label}>Saved Searches</span>
          <ul className={styles.list}>
            {bookmarks.map((b) => (
              <li key={b} className={styles.listItem} onClick={() => handleSearch(b)}>
                <span>{b}</span>
                <span 
                  className={styles.deleteBtn} 
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = bookmarks.filter(item => item !== b);
                    setBookmarks(next);
                    localStorage.setItem("search_bookmarks", JSON.stringify(next));
                  }}
                >
                  ×
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {history.length > 0 && (
        <div className={styles.history}>
          <span className={styles.label}>Recent History</span>
          <ul className={styles.list}>
            {history.map((h) => (
              <li key={h} className={styles.listItem} onClick={() => handleSearch(h)}>
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
