"use client";

import { useState, useEffect } from "react";
import { fetchEventTypes } from "@/components/ingest/graphql";
import styles from "@/components/ingest/ingest-terminal.module.css";

interface FilterBarProps {
  contracts: Array<{ contractId: string; name: string }>;
  filters: {
    contractId: string;
    eventType: string;
    since: string;
    until: string;
    searchQuery: string;
  };
  onFilterChange: (filters: Partial<FilterBarProps["filters"]>) => void;
  onExport: (format: "csv" | "json") => void;
}

export function FilterBar({ contracts, filters, onFilterChange, onExport }: FilterBarProps) {
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    if (!filters.contractId) {
      setEventTypes([]);
      return;
    }

    const loadEventTypes = async () => {
      try {
        const types = await fetchEventTypes(filters.contractId);
        setEventTypes(types);
      } catch (err) {
        console.error("Failed to load event types:", err);
        setEventTypes([]);
      }
    };

    loadEventTypes();
  }, [filters.contractId]);

  const handleApply = () => {
    onFilterChange(localFilters);
  };

  const handleClear = () => {
    const cleared = {
      contractId: "",
      eventType: "",
      since: "",
      until: "",
      searchQuery: "",
    };
    setLocalFilters(cleared);
    onFilterChange(cleared);
  };

  return (
    <section className={styles.controls} aria-label="Event filters">
      <div className={styles.controlCard}>
        <h2 className={styles.sectionTitle}>Filters</h2>
        
        <div className={styles.controlGrid}>
          <label className={styles.fieldRow} htmlFor="contract-select">
            <span>Contract</span>
            <select
              id="contract-select"
              className={styles.fieldInput}
              value={localFilters.contractId}
              onChange={(e) =>
                setLocalFilters((prev) => ({ ...prev, contractId: e.target.value, eventType: "" }))
              }
            >
              <option value="">All Contracts</option>
              {contracts.map((contract) => (
                <option key={contract.contractId} value={contract.contractId}>
                  {contract.name || contract.contractId}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.fieldRow} htmlFor="event-type-select">
            <span>Event Type</span>
            <select
              id="event-type-select"
              className={styles.fieldInput}
              value={localFilters.eventType}
              onChange={(e) =>
                setLocalFilters((prev) => ({ ...prev, eventType: e.target.value }))
              }
              disabled={!localFilters.contractId}
            >
              <option value="">All Types</option>
              {eventTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.fieldRow} htmlFor="date-since">
            <span>From</span>
            <input
              id="date-since"
              className={styles.fieldInput}
              type="datetime-local"
              value={localFilters.since}
              onChange={(e) =>
                setLocalFilters((prev) => ({ ...prev, since: e.target.value }))
              }
            />
          </label>

          <label className={styles.fieldRow} htmlFor="date-until">
            <span>To</span>
            <input
              id="date-until"
              className={styles.fieldInput}
              type="datetime-local"
              value={localFilters.until}
              onChange={(e) =>
                setLocalFilters((prev) => ({ ...prev, until: e.target.value }))
              }
            />
          </label>
        </div>


        <div className={styles.row}>
          <button type="button" className={styles.btn} onClick={handleApply}>
            Apply Filters
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.secondaryBtn}`}
            onClick={handleClear}
          >
            Clear
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.secondaryBtn}`}
            onClick={() => onExport("csv")}
          >
            Export CSV
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.secondaryBtn}`}
            onClick={() => onExport("json")}
          >
            Export JSON
          </button>
        </div>
      </div>
    </section>
  );
}
