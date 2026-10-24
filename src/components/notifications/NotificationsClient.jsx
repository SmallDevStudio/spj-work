"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function NotificationsClient({ userId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/v1/notifications", {
          cache: "no-store",
        });
        const body = await response.json();

        if (!response.ok || !body.success) {
          throw new Error(body.error?.message ?? "โหลดการแจ้งเตือนไม่สำเร็จ");
        }

        if (active) {
          setItems(body.data.items);
        }
      } catch (cause) {
        if (active) {
          setError(cause.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  async function markRead(eventId) {
    try {
      const csrfResponse = await fetch("/api/v1/auth/csrf", {
        cache: "no-store",
      });
      const csrf = await csrfResponse.json();

      if (!csrfResponse.ok || !csrf.success) {
        throw new Error("เตรียมการยืนยันรายการไม่สำเร็จ");
      }

      const response = await fetch(
        `/api/v1/notifications/${encodeURIComponent(eventId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            [csrf.data.headerName]: csrf.data.csrfToken,
          },
          body: JSON.stringify({ read: true }),
        },
      );
      const body = await response.json();

      if (!response.ok || !body.success) {
        throw new Error(body.error?.message ?? "เปลี่ยนสถานะการอ่านไม่สำเร็จ");
      }

      setItems((current) =>
        current.map((item) =>
          item.id === eventId ? { ...item, isRead: true } : item,
        ),
      );
    } catch (cause) {
      setError(cause.message);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-24 sm:px-7 sm:py-8">
      <Link
        href="/"
        className="text-sm font-semibold text-sky-700 hover:underline"
      >
        ← กลับหน้าหลัก
      </Link>

      <h1 className="mt-5 text-2xl font-black text-slate-950 sm:text-3xl">
        การแจ้งเตือน
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        ความคืบหน้าใบลาและรายการที่รอให้คุณพิจารณา
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-5 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">กำลังโหลดการแจ้งเตือน...</p>
      ) : items.length === 0 ? (
        <p className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          ยังไม่มีการแจ้งเตือน
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item) => {
            const href =
              item.destination === "dev-test" && item.testRunId
                ? `/manage/leave/dev-test?runId=${encodeURIComponent(item.testRunId)}`
                : item.destination === "request" && item.requestId
                ? `/${encodeURIComponent(userId)}/leave/${encodeURIComponent(item.requestId)}`
                : `/${encodeURIComponent(userId)}/leave/approvals`;

            return (
              <li
                key={item.id}
                className={`rounded-3xl border p-5 shadow-sm ${
                  item.isRead
                    ? "border-slate-200 bg-white"
                    : "border-sky-200 bg-sky-50"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-slate-950">
                      {item.title}
                      {!item.isRead ? (
                        <span className="ml-2 rounded-full bg-sky-600 px-2 py-0.5 text-xs text-white">
                          ใหม่
                        </span>
                      ) : null}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.description}
                    </p>
                    {item.createdAt ? (
                      <time className="mt-2 block text-xs text-slate-500">
                        {new Intl.DateTimeFormat("th-TH", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "Asia/Bangkok",
                        }).format(new Date(item.createdAt))}
                      </time>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-3 text-sm font-semibold">
                    {!item.isRead ? (
                      <button
                        type="button"
                        onClick={() => markRead(item.id)}
                        className="text-slate-600 hover:underline"
                      >
                        อ่านแล้ว
                      </button>
                    ) : null}
                    {item.destination ? (
                      <Link href={href} className="text-sky-700 hover:underline">
                        เปิดรายการ
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
