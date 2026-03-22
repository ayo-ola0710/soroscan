"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ExportEventsModal } from "@/components/ingest/ExportEventsModal";
import {
  fetchContract,
  fetchEventTypes,
  fetchExplorerEvents,
} from "@/components/ingest/graphql";
import {
  formatDateTime,
  shortHash,
  toIsoOrNull,
  trimPayload,
  validateDateRange,
} from "@/components/ingest/formatters";
import styles from "@/components/ingest/ingest-terminal.module.css";
import type { EventRecord } from "@/components/ingest/types";

const PAGE_SIZE = 50;

interface StatusState {
  message: string;
  isError: boolean;
}

export function EventExplorerView({ contractId }: { contractId: string }) {
  const [contractName, setContractName] = useState(contractId);
  const [isContractMissing, setIsContractMissing] = useState(false);
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>("");
  const [pendingType, setPendingType] = useState<string>("");
  const [since, setSince] = useState<string>("");
  const [until, setUntil] = useState<string>("");
  const [pendingSince, setPendingSince] = useState<string>("");
  const [pendingUntil, setPendingUntil] = useState<string>("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<EventRecord[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [status, setStatus] = useState<StatusState>({
    message: "Loading events...",
    isError: false,
  });
  const [isExportOpen, setIsExportOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const loadContract = async () => {
      try {
        const contract = await fetchContract(contractId);
        if (!active) {
          return;
        }

        if (!contract) {
          setIsContractMissing(true);
          setContractName(contractId);
          return;
        }

        setIsContractMissing(false);
        setContractName(contract.name || contractId);
      } catch (caughtError) {
        if (!active) {
          return;
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load contract details.";
        setStatus({ message, isError: true });
      }
    };

    void loadContract();

    return () => {
      active = false;
    };
  }, [contractId]);

  useEffect(() => {
    let active = true;

    const loadTypes = async () => {
      setStatus({ message: "Loading event type options...", isError: false });

      try {
        const types = await fetchEventTypes(contractId);
        if (!active) {
          return;
        }

        setEventTypes(types);
        setStatus({ message: "Event type options loaded.", isError: false });
      } catch (caughtError) {
        if (!active) {
          return;
        }

        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "Unable to load event type options.";
        setStatus({ message, isError: true });
      }
    };

    void loadTypes();

    return () => {
      active = false;
    };
  }, [contractId]);

  useEffect(() => {
    let active = true;

    const loadEvents = async () => {
      if (isContractMissing) {
        setRows([]);
        setHasNext(false);
        return;
      }

      setStatus({ message: "Loading events...", isError: false });

      try {
        const offset = (page - 1) * PAGE_SIZE;
        const result = await fetchExplorerEvents({
          contractId,
          eventType: selectedType || null,
          limit: PAGE_SIZE + 1,
          offset,
          since: toIsoOrNull(since),
          until: toIsoOrNull(until),
        });

        if (!active) {
          return;
        }

        const nextExists = result.length > PAGE_SIZE;
        const visibleRows = nextExists ? result.slice(0, PAGE_SIZE) : result;
        setRows(visibleRows);
        setHasNext(nextExists);
        setStatus({ message: "Events loaded.", isError: false });
      } catch (caughtError) {
        if (!active) {
          return;
        }

        const message =
          caughtError instanceof Error ? caughtError.message : "Unable to load events.";
        setRows([]);
        setHasNext(false);
        setStatus({ message, isError: true });
      }
    };

    void loadEvents();

    return () => {
      active = false;
    };
  }, [contractId, page, selectedType, since, until, isContractMissing]);

  const applyFilters = () => {
    const validationError = validateDateRange(pendingSince, pendingUntil);
    if (validationError) {
      setStatus({ message: validationError, isError: true });
      return;
    }

    setPage(1);
    setSelectedType(pendingType);
    setSince(pendingSince);
    setUntil(pendingUntil);
  };

  const clearFilters = () => {
    setPage(1);
    setPendingType("");
    setPendingSince("");
    setPendingUntil("");
    setSelectedType("");
    setSince("");
    setUntil("");
  };

  return (
    <div className={styles.page}>
      <main className={`${styles.timelineApp} ${styles.explorerApp}`}>
        <header className={styles.hero}>
          <p className={styles.kicker}>SoroScan Event Explorer</p>
          <h1 className={styles.title}>{contractName}</h1>
          <p className={styles.contractId}>{contractId}</p>
          <div className={`${styles.row} ${styles.topActions}`}>
            <Link
              href={`/contracts/${encodeURIComponent(contractId)}/timeline`}
              className={`${styles.btn} ${styles.secondaryBtn} ${styles.linkBtn}`}
            >
              Open Timeline
            </Link>
            <button
              type="button"
              className={styles.btn}
              onClick={() => setIsExportOpen(true)}
              disabled={isContractMissing}
            >
              Export Events
            </button>
          </div>
        </header>

        <section className={styles.controls} aria-label="Event explorer filters">
          <div className={styles.controlCard}>
            <h2 className={styles.sectionTitle}>Filters</h2>
            <div className={styles.controlGrid}>
              <label className={styles.fieldRow} htmlFor="event-type-select">
                <span>Event Type</span>
                <select
                  id="event-type-select"
                  className={styles.fieldInput}
                  value={pendingType}
                  onChange={(event) => setPendingType(event.target.value)}
                >
                  <option value="">All event types</option>
                  {eventTypes.map((eventType) => (
                    <option key={eventType} value={eventType}>
                      {eventType}
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
                  value={pendingSince}
                  onChange={(event) => setPendingSince(event.target.value)}
                />
              </label>

              <label className={styles.fieldRow} htmlFor="date-until">
                <span>To</span>
                <input
                  id="date-until"
                  className={styles.fieldInput}
                  type="datetime-local"
                  value={pendingUntil}
                  onChange={(event) => setPendingUntil(event.target.value)}
                />
              </label>
            </div>

            <div className={styles.row}>
              <button type="button" className={styles.btn} onClick={applyFilters}>
                Apply Filters
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.secondaryBtn}`}
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </section>

        <section className={styles.timelinePanel} aria-label="Events table">
          <div className={styles.panelHead}>
            <h2 className={styles.sectionTitle}>Events</h2>
            <p className={styles.summary}>
              {isContractMissing
                ? "Contract not found."
                : `Showing ${rows.length} event(s) on page ${page}.`}
            </p>
          </div>
          <div className={`${styles.status} ${status.isError ? styles.error : ""}`} aria-live="polite">
            {status.message}
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.eventTable}>
              <caption className={styles.srOnly}>
                Contract events for {contractName}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Timestamp</th>
                  <th scope="col">Type</th>
                  <th scope="col">Ledger</th>
                  <th scope="col">Event Index</th>
                  <th scope="col">Transaction</th>
                  <th scope="col">Payload</th>
                </tr>
              </thead>
              <tbody>
                {!rows.length ? (
                  <tr>
                    <td colSpan={6} className={styles.emptyTable}>
                      {isContractMissing
                        ? "This contract does not exist in the indexed registry."
                        : "No events found for this filter selection."}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDateTime(row.timestamp)}</td>
                      <td>
                        <span className={styles.pill}>{row.eventType}</span>
                      </td>
                      <td>{row.ledger}</td>
                      <td>{row.eventIndex}</td>
                      <td>{shortHash(row.txHash)}</td>
                      <td>
                        <code>{trimPayload(row.payload, 96)}</code>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className={styles.paginationRow}>
            <button
              type="button"
              className={`${styles.btn} ${styles.secondaryBtn}`}
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </button>
            <span className={styles.pill}>Page {page}</span>
            <button
              type="button"
              className={`${styles.btn} ${styles.secondaryBtn}`}
              disabled={!hasNext}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </section>
      </main>

      <ExportEventsModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        contractId={contractId}
        initialFilters={{
          eventTypes: selectedType ? [selectedType] : [],
          since: since ? new Date(since).toISOString() : null,
          until: until ? new Date(until).toISOString() : null,
        }}
        onStatus={(message, isError = false) =>
          setStatus({
            message,
            isError,
          })
        }
      />
    </div>
  );
}
