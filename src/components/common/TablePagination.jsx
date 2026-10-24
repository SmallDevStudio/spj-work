"use client";

const PAGE_SIZES = [10, 20, 50, 100];

export default function TablePagination({ pagination, id, hasMore = false, onLoadMore, loadingMore = false }) {
  const { page, pageSize, total, totalPages, setPage, setPageSize } = pagination;
  const first = total ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, total);

  return (
    <nav aria-label="แบ่งหน้าตาราง" className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-4 text-sm dark:border-slate-800">
      <p className="text-slate-500 dark:text-slate-400">
        แสดง {first}–{last} จาก {total} รายการ{hasMore ? "ที่โหลดแล้ว" : ""}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`${id}-page-size`} className="text-slate-600 dark:text-slate-300">ต่อหน้า</label>
        <select id={`${id}-page-size`} value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}
          className="min-h-10 rounded-lg border border-slate-300 bg-white px-2 text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
          {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
        <button type="button" onClick={() => setPage(1)} disabled={page === 1} aria-label="หน้าแรก" className="min-h-10 rounded-lg border px-3 disabled:opacity-40">«</button>
        <button type="button" onClick={() => setPage(page - 1)} disabled={page === 1} aria-label="หน้าก่อนหน้า" className="min-h-10 rounded-lg border px-3 disabled:opacity-40">‹</button>
        <span aria-live="polite" className="px-2 text-slate-600 dark:text-slate-300">หน้า {page} / {totalPages}</span>
        <button type="button" onClick={() => setPage(page + 1)} disabled={page >= totalPages} aria-label="หน้าถัดไป" className="min-h-10 rounded-lg border px-3 disabled:opacity-40">›</button>
        <button type="button" onClick={() => setPage(totalPages)} disabled={page >= totalPages} aria-label="หน้าสุดท้าย" className="min-h-10 rounded-lg border px-3 disabled:opacity-40">»</button>
        {hasMore && onLoadMore ? (
          <button type="button" disabled={loadingMore} onClick={onLoadMore} className="min-h-10 rounded-lg border border-amber-400 px-3 font-semibold text-amber-800 disabled:opacity-40 dark:text-amber-300">
            {loadingMore ? "กำลังโหลด" : "โหลดเพิ่มจากระบบ"}
          </button>
        ) : null}
      </div>
    </nav>
  );
}
