"use client";

import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Filter,
  Square,
  Trash2,
  X,
} from "lucide-react";
import type { RoomId } from "@/lib/constants";
import { HISTORY_PAGE_SIZE } from "@/lib/constants";
import { getTodayDateKey, formatTimeKey } from "@/lib/date";
import { filterHistory, paginate } from "@/lib/history";
import { recordKey } from "@/lib/recordKey";
import type { HistoryFilters, SensorReading } from "@/lib/types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useHistoryData } from "@/hooks/useHistoryData";
import { Card } from "@/components/ui/Card";
import { Collapsible } from "@/components/ui/Collapsible";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingState } from "@/components/ui/LoadingState";
import { HistoryFiltersPanel } from "@/components/history/HistoryFiltersPanel";
import { HistoryRecordCard } from "@/components/history/HistoryRecordCard";
import { TIME_PRESETS } from "@/lib/timePresets";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface HistorySectionProps {
  roomId: RoomId;
}

const defaultFilters = (date: string): HistoryFilters => ({
  date,
  timePreset: "all",
  timeFrom: "",
  timeTo: "",
  label: "",
  gasMin: "",
  gasMax: "",
  deltaGasMin: "",
  deltaGasMax: "",
  gasRelativeMin: "",
  gasRelativeMax: "",
  tempMin: "",
  tempMax: "",
  humidityMin: "",
  humidityMax: "",
  search: "",
});

const DELETE_PREVIEW_LIMIT = 50;

export const HistorySection = memo(function HistorySection({
  roomId,
}: HistorySectionProps) {
  const today = getTodayDateKey();
  const [filters, setFilters] = useState<HistoryFilters>(defaultFilters(today));
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<SensorReading[] | null>(
    null,
  );

  const { data, loading, deleting, error, loadedDate, loadDate, deleteRecords } =
    useHistoryData(roomId);

  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const filtersForQuery = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );

  useEffect(() => {
    void loadDate(filters.date);
  }, [filters.date, loadDate]);

  useEffect(() => {
    setSelectedKeys(new Set());
  }, [filters.date, loadedDate, roomId]);

  useEffect(() => {
    setPage(1);
  }, [filtersForQuery, loadedDate, roomId]);

  const deferredFilters = useDeferredValue(filtersForQuery);
  const isFiltering = deferredFilters !== filtersForQuery;
  const filtered = useMemo(
    () => filterHistory(data, deferredFilters),
    [data, deferredFilters],
  );

  useEffect(() => {
    setSelectedKeys((prev) => {
      if (prev.size === 0) return prev;
      const visibleKeys = new Set(filtered.map(recordKey));
      const next = new Set([...prev].filter((key) => visibleKeys.has(key)));
      return next.size === prev.size ? prev : next;
    });
  }, [filtered]);
  const pagination = useMemo(
    () => paginate(filtered, page, HISTORY_PAGE_SIZE),
    [filtered, page],
  );

  const pageKeys = useMemo(
    () => pagination.items.map(recordKey),
    [pagination.items],
  );
  const allPageSelected =
    pageKeys.length > 0 && pageKeys.every((key) => selectedKeys.has(key));

  const updateFilter = useCallback(
    <K extends keyof HistoryFilters>(key: K, value: HistoryFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const updateFilters = useCallback((patch: Partial<HistoryFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const toggleFiltersOpen = useCallback(
    () => setFiltersOpen((v) => !v),
    [],
  );

  const toggleRow = useCallback((reading: SensorReading) => {
    const key = recordKey(reading);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const requestDelete = useCallback((record: SensorReading) => {
    setPendingDelete([record]);
  }, []);

  const togglePageSelection = useCallback(() => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageKeys.forEach((key) => next.delete(key));
      } else {
        pageKeys.forEach((key) => next.add(key));
      }
      return next;
    });
  }, [allPageSelected, pageKeys]);

  const clearSelection = useCallback(() => setSelectedKeys(new Set()), []);

  const selectedRecords = useMemo(
    () => filtered.filter((item) => selectedKeys.has(recordKey(item))),
    [filtered, selectedKeys],
  );

  const handleConfirmDelete = async () => {
    if (!pendingDelete?.length) return;
    const deletingRecords = pendingDelete;
    try {
      const { deleted, failedCount } = await deleteRecords(deletingRecords);
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        deleted.forEach((item) => next.delete(recordKey(item)));
        return next;
      });
      setPendingDelete(null);
      if (failedCount > 0) {
        toast.error(
          `Deleted ${deleted.length} record${deleted.length === 1 ? "" : "s"}, but ${failedCount} failed.`,
        );
      } else {
        toast.success(buildDeleteToastMessage(deleted));
      }
    } catch {
      toast.error("Failed to delete records. Please try again.");
    }
  };

  const handleCancelDelete = useCallback(() => {
    if (!deleting) setPendingDelete(null);
  }, [deleting]);

  return (
    <div className="space-y-4">
      <Card className="p-5" hoverable={false}>
        <Collapsible
          open={filtersOpen}
          onToggle={toggleFiltersOpen}
          title={
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-amber-300" />
              <h3 className="text-lg font-semibold text-white">History Log</h3>
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200">
                {filtersOpen ? "Filters open" : "Filters collapsed"}
              </span>
            </div>
          }
        >
          <HistoryFiltersPanel
            filters={filters}
            onChange={updateFilter}
            onBatchChange={updateFilters}
          />
        </Collapsible>
      </Card>

      <Card className="overflow-hidden p-0" hoverable={false}>
        <div className="flex flex-col gap-3 border-b border-white/5 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={pagination.items.length === 0 || deleting}
              onClick={togglePageSelection}
              className={cn(
                toolbarBtn,
                allPageSelected && "border-amber-400/40 bg-amber-500/15 text-amber-100",
              )}
            >
              {allPageSelected ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              {allPageSelected ? "Deselect Page" : "Select All on Page"}
            </button>
            {selectedRecords.length > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                className={toolbarBtn}
              >
                <X className="h-4 w-4" />
                Clear ({selectedRecords.length})
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-stone-400">
              {selectedRecords.length > 0
                ? `${selectedRecords.length} selected`
                : "Tap a record card to select"}
            </p>
            <button
              type="button"
              disabled={selectedRecords.length === 0 || deleting}
              onClick={() => setPendingDelete(selectedRecords)}
              className={cn(
                dangerBtn,
                "inline-flex items-center gap-2",
                (selectedRecords.length === 0 || deleting) && "opacity-40",
              )}
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingState label="Loading history records..." rows={5} />
        ) : error ? (
          <div className="py-16 text-center text-red-400">{error}</div>
        ) : (
          <>
            <div
              className={cn(
                "space-y-1.5 p-3 transition-opacity duration-200",
                (deleting || isFiltering) && "pointer-events-none opacity-60",
              )}
            >
              {pagination.items.length === 0 ? (
                <div className="py-12 text-center text-stone-500">
                  No records match your filters.
                </div>
              ) : (
                pagination.items.map((row) => {
                  const key = recordKey(row);
                  return (
                    <HistoryRecordCard
                      key={key}
                      record={row}
                      selected={selectedKeys.has(key)}
                      deleting={deleting}
                      onToggle={toggleRow}
                      onDelete={requestDelete}
                    />
                  );
                })
              )}
            </div>

            <div className="flex flex-col gap-3 border-t border-white/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-stone-400">
                Showing {pagination.items.length} of {pagination.totalItems}{" "}
                records
                {loadedDate ? ` · ${loadedDate}` : ""}
                {filters.timePreset
                  ? ` · ${TIME_PRESETS.find((p) => p.id === filters.timePreset)?.label ?? ""}`
                  : ""}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.currentPage <= 1}
                  className={buttonClass}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[88px] text-center text-sm text-stone-300">
                  Page {pagination.currentPage} / {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((p) => Math.min(pagination.totalPages, p + 1))
                  }
                  disabled={pagination.currentPage >= pagination.totalPages}
                  className={buttonClass}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={
          pendingDelete?.length === 1
            ? "Delete this record?"
            : "Delete selected records?"
        }
        message={
          pendingDelete?.length === 1
            ? `This will permanently remove the log at ${formatTimeKey(pendingDelete[0].timeKey)} from Firebase. This action cannot be undone.`
            : "You are about to permanently delete multiple history logs from Firebase. Please confirm before proceeding."
        }
        count={pendingDelete?.length}
        previewRecords={pendingDelete?.slice(0, DELETE_PREVIEW_LIMIT) ?? []}
        confirmLabel={
          pendingDelete?.length === 1 ? "Yes, Delete" : "Yes, Delete All"
        }
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
});

const buttonClass =
  "inline-flex items-center justify-center rounded-xl border border-amber-500/25 bg-black/40 px-3 py-2 text-stone-200 transition-[transform,border-color,background-color] duration-200 hover:-translate-y-px hover:border-amber-400/40 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-40";

const dangerBtn =
  "rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition-[transform,border-color,background-color] duration-200 hover:-translate-y-px hover:border-red-400/40 hover:bg-red-500/20 disabled:cursor-not-allowed";

const toolbarBtn =
  "inline-flex items-center gap-2 rounded-xl border border-amber-500/25 bg-black/40 px-3 py-2 text-sm text-stone-300 transition-[transform,border-color,background-color,color] duration-200 hover:border-amber-400/40 hover:bg-amber-500/10 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-40";

function buildDeleteToastMessage(records: SensorReading[]) {
  if (records.length === 1) {
    return `Deleted record at ${formatTimeKey(records[0].timeKey)}`;
  }
  return `Deleted ${records.length} history records`;
}
