"use client";

import { useState } from "react";

export function useTablePagination(items, initialPageSize = 10) {
  const [requestedPage, setRequestedPage] = useState(1);
  const [pageSize, setPageSizeValue] = useState(initialPageSize);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);

  function setPageSize(nextSize) {
    setPageSizeValue(nextSize);
    setRequestedPage(1);
  }

  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    total,
    totalPages,
    setPage: setRequestedPage,
    setPageSize,
    resetPage: () => setRequestedPage(1),
  };
}
