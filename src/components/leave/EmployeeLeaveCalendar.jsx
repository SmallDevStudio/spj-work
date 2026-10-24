"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  HiOutlineArrowLeft,
  HiOutlineCalendarDays,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlinePlus,
} from "react-icons/hi2";
import { getUserRoutes } from "@/constants/user-routes";

const thaiDate = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const thaiMonth = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  month: "long",
  year: "numeric",
});

const thaiDay = new Intl.DateTimeFormat("th-TH", {
  timeZone: "Asia/Bangkok",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const weekdayNames = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

const statusLabels = {
  DRAFT: "ฉบับร่าง",
  PENDING_APPROVAL: "รออนุมัติ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ไม่อนุมัติ",
  CANCELLED: "ยกเลิก",
};

const leaveTypeLabels = {
  ANNUAL: "ลาพักร้อน",
  SICK: "ลาป่วย",
  PERSONAL: "ลากิจ",
  MATERNITY: "ลาคลอด",
  ORDINATION: "ลาบวช",
  UNPAID: "ลาโดยไม่รับเงินตอบแทน",
  OTHER: "ลาอื่น ๆ",
};

function bangkokToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const get = (type) => parts.find((part) => part.type === type)?.value;

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function dateFromISO(isoDate) {
  return new Date(`${isoDate}T12:00:00.000Z`);
}

function isoFromDate(date) {
  return date.toISOString().slice(0, 10);
}

function shiftDate(isoDate, days) {
  const date = dateFromISO(isoDate);
  date.setUTCDate(date.getUTCDate() + days);

  return isoFromDate(date);
}

function shiftMonth(isoDate, months) {
  const date = dateFromISO(isoDate);

  return isoFromDate(
    new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 12),
    ),
  );
}

function formatDate(isoDate, formatter = thaiDate) {
  return formatter.format(dateFromISO(isoDate));
}

function statusClass(status) {
  switch (status) {
    case "APPROVED":
      return "bg-sky-100 text-sky-800";
    case "REJECTED":
      return "bg-rose-100 text-rose-700";
    case "DRAFT":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-amber-100 text-amber-800";
  }
}

function calendarClass(status) {
  return status === "APPROVED"
    ? "bg-sky-500 text-white"
    : "bg-slate-100 text-slate-600";
}

function LeaveBalanceCard({ onDate, onTypesLoaded }) {
  const [leaveTypeCode, setLeaveTypeCode] = useState("SICK");
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [availableTypes, setAvailableTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTypes() {
      try {
        const response = await fetch("/api/v1/leave/available-types", {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });

        const body = await response.json();

        if (!response.ok || body.success !== true) {
          throw new Error(body.error?.message ?? "โหลดประเภทการลาไม่สำเร็จ");
        }

        const items = body.data?.items ?? [];

        if (!Array.isArray(items)) {
          throw new Error("ข้อมูลประเภทการลาไม่ถูกต้อง");
        }

        setAvailableTypes(items);
        onTypesLoaded(
          Object.fromEntries(items.map((item) => [item.code, item.nameTh])),
        );
        setLeaveTypeCode((current) =>
          items.some((item) => item.code === current)
            ? current
            : (items[0]?.code ?? ""),
        );
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "โหลดประเภทการลาไม่สำเร็จ",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setTypesLoading(false);
        }
      }
    }

    loadTypes();
    return () => controller.abort();
  }, [onTypesLoaded]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadBalance() {
      if (!leaveTypeCode || typesLoading) {
        return;
      }

      setLoading(true);
      setError("");
      setBalance(null);

      try {
        const params = new URLSearchParams({
          leaveTypeCode,
          onDate,
        });

        const response = await fetch(
          `/api/v1/leave/balance?${params.toString()}`,
          {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        const body = await response.json();

        if (!response.ok || body.success !== true || !body.data?.item) {
          throw new Error(
            body.error?.message ?? "ไม่สามารถโหลดวันลาคงเหลือได้",
          );
        }

        setBalance(body.data.item);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "ไม่สามารถโหลดวันลาคงเหลือได้",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadBalance();

    return () => controller.abort();
  }, [leaveTypeCode, onDate, typesLoading]);

  const notConfigured = balance?.source === "NOT_CONFIGURED";

  const remainingLabel =
    balance?.remainingDays === null
      ? "ไม่จำกัด"
      : `${balance?.remainingDays ?? 0} วัน`;

  return (
    <section
      aria-labelledby="leave-balance-heading"
      className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2
            id="leave-balance-heading"
            className="text-base font-bold text-slate-950 sm:text-lg"
          >
            วันลาคงเหลือ
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            ตรวจยอดตามรอบปีของวันที่เลือกในปฏิทิน
          </p>
        </div>

        <label className="text-sm font-semibold text-slate-700">
          <span className="sr-only">ประเภทการลา</span>
          <select
            value={leaveTypeCode}
            onChange={(event) => setLeaveTypeCode(event.target.value)}
            disabled={typesLoading || availableTypes.length === 0}
            className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm disabled:opacity-60 sm:w-56"
          >
            {availableTypes.length === 0 ? (
              <option value="">
                {typesLoading ? "กำลังโหลดประเภทการลา" : "ไม่มีประเภทการลา"}
              </option>
            ) : (
              availableTypes.map((type) => (
                <option key={type.code} value={type.code}>
                  {type.nameTh}
                </option>
              ))
            )}
          </select>
        </label>
      </div>

      {loading ? (
        <p role="status" className="mt-5 text-sm text-slate-500">
          กำลังตรวจสอบยอดวันลา...
        </p>
      ) : error ? (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
        >
          {error}
        </p>
      ) : notConfigured ? (
        <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          ยังไม่ได้กำหนดสิทธิการลาประเภทนี้ กรุณาติดต่อ HR
        </p>
      ) : balance ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-sky-50 p-4">
              <p className="text-xs font-semibold text-sky-700">คงเหลือ</p>
              <p className="mt-1 text-3xl font-black text-sky-900">
                {remainingLabel}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-600">
                ใช้แล้ว (อนุมัติ)
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {balance.approvedDays} วัน
              </p>
            </div>

            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-xs font-semibold text-amber-700">รออนุมัติ</p>
              <p className="mt-1 text-xl font-bold text-amber-900">
                {balance.pendingDays} วัน
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            รอบปี {balance.periodStart} ถึง {balance.periodEnd}
            {balance.pendingDays > 0 &&
            balance.remainingAfterPendingDays !== null
              ? ` · หากอนุมัติรายการที่รอทั้งหมด จะเหลือ ${balance.remainingAfterPendingDays} วัน`
              : ""}
          </p>
        </>
      ) : null}
    </section>
  );
}

function MonthView({
  selectedDate,
  onSelectDate,
  requests,
  coworkers,
  teamLoading,
}) {
  const monthStart = new Date(
    Date.UTC(
      Number(selectedDate.slice(0, 4)),
      Number(selectedDate.slice(5, 7)) - 1,
      1,
      12,
    ),
  );

  const gridStart = new Date(monthStart);
  gridStart.setUTCDate(1 - monthStart.getUTCDay());

  const dates = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + index);

    return isoFromDate(date);
  });

  return (
    <section
      aria-label={`ปฏิทินเดือน ${formatDate(selectedDate, thaiMonth)}`}
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-500">
        {weekdayNames.map((name) => (
          <div key={name} className="py-3">
            {name}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {dates.map((date) => {
          const inMonth = date.slice(0, 7) === selectedDate.slice(0, 7);

          const isSelected = date === selectedDate;

          const ownEvents = inMonth
            ? requests.filter(
                (item) =>
                  !["REJECTED", "CANCELLED"].includes(item.status) &&
                  item.startDate <= date &&
                  item.endDate >= date,
              )
            : [];

          // API ส่งเฉพาะ id, name, startDate, endDate, days
          const colleagueEvents = inMonth
            ? coworkers.filter(
                (item) => item.startDate <= date && item.endDate >= date,
              )
            : [];

          const totalEvents = ownEvents.length + colleagueEvents.length;

          const visibleOwn = ownEvents.slice(0, 2);

          const visibleColleagues = colleagueEvents.slice(
            0,
            Math.max(0, 3 - visibleOwn.length),
          );

          const hiddenCount =
            totalEvents - visibleOwn.length - visibleColleagues.length;

          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDate(date)}
              onDoubleClick={() => {
                if (inMonth) {
                  onDoubleClickDate(date);
                }
              }}
              aria-label={`${formatDate(date)}${
                totalEvents ? ` มีรายการลา ${totalEvents} รายการ` : ""
              }`}
              aria-pressed={isSelected}
              className={`min-h-20 min-w-0 border-r border-b border-slate-100 p-1 text-left transition hover:bg-amber-50 sm:min-h-28 sm:p-2 lg:min-h-32 ${
                inMonth ? "bg-white" : "bg-slate-50 text-slate-400"
              } ${isSelected ? "ring-2 ring-inset ring-amber-400" : ""}`}
            >
              <span className="text-xs font-semibold sm:text-sm">
                {Number(date.slice(8, 10))}
              </span>

              <span className="mt-1 block space-y-1">
                {visibleOwn.map((item) => (
                  <span
                    key={`own-${item.id}`}
                    className={`block truncate rounded px-1 py-0.5 text-[10px] sm:text-xs ${calendarClass(
                      item.status,
                    )}`}
                  >
                    ของฉัน · {statusLabels[item.status] ?? item.status}
                  </span>
                ))}

                {visibleColleagues.map((item) => (
                  <span
                    key={`team-${item.id}`}
                    className="block truncate rounded bg-amber-50 px-1 py-0.5 text-[10px] text-slate-700 sm:text-xs"
                    title={`${item.name} · ${item.days} วัน`}
                  >
                    {item.name} · {item.days} วัน
                  </span>
                ))}

                {hiddenCount > 0 ? (
                  <span className="block px-1 text-[10px] font-semibold text-slate-500 sm:text-xs">
                    +{hiddenCount} รายการ
                  </span>
                ) : null}

                {teamLoading && inMonth ? (
                  <span className="block px-1 text-[10px] text-slate-400">
                    กำลังโหลดทีม
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DayView({
  selectedDate,
  requests,
  coworkers,
  teamLoading,
  teamError,
  leaveTypeNames,
}) {
  const ownItems = requests.filter(
    (item) =>
      !["REJECTED", "CANCELLED"].includes(item.status) &&
      item.startDate <= selectedDate &&
      item.endDate >= selectedDate,
  );

  const teamItems = coworkers.filter(
    (item) => item.startDate <= selectedDate && item.endDate >= selectedDate,
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold text-slate-950">
        {formatDate(selectedDate, thaiDay)}
      </h2>

      <h3 className="mt-6 text-sm font-bold text-slate-700">ใบลาของฉัน</h3>

      {ownItems.length ? (
        <div className="mt-3 space-y-2">
          {ownItems.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl p-4 text-sm ${calendarClass(
                item.status,
              )}`}
            >
              <span className="font-semibold">
                {leaveTypeNames[item.leaveTypeCode] ??
                  leaveTypeLabels[item.leaveTypeCode] ??
                  item.leaveTypeCode ??
                  "ใบลา"}
              </span>
              <span className="ml-2">
                {statusLabels[item.status] ?? item.status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
          ไม่มีใบลาของคุณในวันนี้
        </p>
      )}

      <h3 className="mt-8 text-sm font-bold text-slate-700">
        เพื่อนร่วมงานที่ลา
      </h3>

      {teamLoading ? (
        <p
          role="status"
          className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500"
        >
          กำลังโหลดข้อมูลเพื่อนร่วมงาน
        </p>
      ) : teamError ? (
        <p className="mt-3 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">
          ไม่สามารถแสดงรายการเพื่อนร่วมงานในวันนี้
        </p>
      ) : teamItems.length ? (
        <div className="mt-3 space-y-2">
          {teamItems.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700"
            >
              {item.name} · {formatDate(item.startDate)}
              {item.startDate !== item.endDate
                ? ` – ${formatDate(item.endDate)}`
                : ""}
              {" · "}
              {item.days} วัน
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
          ไม่มีเพื่อนร่วมงานที่ลาในวันนี้
        </p>
      )}
    </section>
  );
}

function ListView({
  requests,
  year,
  onYearChange,
  currentYear,
  leaveTypeNames,
}) {
  const years = [
    ...new Set([
      currentYear,
      ...requests.map((item) => item.startDate.slice(0, 4)),
    ]),
  ].sort((a, b) => Number(b) - Number(a));

  const items = requests.filter((item) =>
    item.startDate.startsWith(`${year}-`),
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-950 sm:text-lg">
          รายการใบลาทั้งหมด
        </h2>

        <label className="text-sm text-slate-600">
          <span className="sr-only">เลือกปีของรายการใบลา</span>
          <select
            value={year}
            onChange={(event) => onYearChange(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2"
          >
            {years.map((item) => (
              <option key={item} value={item}>
                ปี {Number(item) + 543}
              </option>
            ))}
          </select>
        </label>
      </div>

      {items.length ? (
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`${getUserRoutes(userId).LEAVE}/${encodeURIComponent(item.id)}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-amber-300 hover:bg-amber-50/40"
            >
              <div>
                <h3 className="font-semibold text-slate-950">
                  {leaveTypeNames[item.leaveTypeCode] ??
                    leaveTypeLabels[item.leaveTypeCode] ??
                    item.leaveTypeCode ??
                    "ใบลา"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {formatDate(item.startDate)}
                  {item.startDate !== item.endDate
                    ? ` – ${formatDate(item.endDate)}`
                    : ""}
                  {item.requestedDays != null
                    ? ` · ${item.requestedDays} วัน`
                    : ""}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                  item.status,
                )}`}
              >
                {statusLabels[item.status] ?? item.status}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl bg-slate-50 p-6 text-sm text-slate-500">
          ไม่มีใบลาในปีที่เลือก
        </p>
      )}
    </section>
  );
}

export default function EmployeeLeaveCalendar({
  userId,
  requests,
  coworkers = [],
}) {
  const router = useRouter();
  const leaveNewHref = getUserRoutes(userId).LEAVE_NEW;
  const today = useMemo(() => bangkokToday(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [view, setView] = useState("month");
  const [year, setYear] = useState(today.slice(0, 4));

  const [teamItems, setTeamItems] = useState(coworkers);
  const [teamError, setTeamError] = useState("");
  const [teamLoading, setTeamLoading] = useState(true);
  const [configuredLeaveTypeNames, setConfiguredLeaveTypeNames] = useState({});

  const selectedMonth = selectedDate.slice(0, 7);

  useEffect(() => {
    const controller = new AbortController();

    async function loadTeam() {
      try {
        setTeamLoading(true);
        setTeamError("");
        setTeamItems([]);

        const response = await fetch(
          `/api/v1/leave/team-calendar?month=${encodeURIComponent(
            selectedMonth,
          )}`,
          {
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error("โหลดปฏิทินเพื่อนร่วมงานไม่สำเร็จ");
        }

        const body = await response.json();

        if (!body.success || !Array.isArray(body.data?.items)) {
          throw new Error("รูปแบบข้อมูลปฏิทินไม่ถูกต้อง");
        }

        setTeamItems(body.data.items);
        setTeamLoading(false);
      } catch (error) {
        if (error.name !== "AbortError") {
          setTeamItems([]);
          setTeamError(
            error instanceof Error ? error.message : "โหลดข้อมูลไม่สำเร็จ",
          );
          setTeamLoading(false);
        }
      }
    }

    loadTeam();

    return () => controller.abort();
  }, [selectedMonth]);

  const title =
    view === "day"
      ? formatDate(selectedDate, thaiDay)
      : formatDate(selectedDate, thaiMonth);

  function navigate(direction) {
    setSelectedDate((current) =>
      view === "day"
        ? shiftDate(current, direction)
        : shiftMonth(current, direction),
    );
  }

  function startDraftOnDate(date) {
    router.push(`${leaveNewHref}?date=${encodeURIComponent(date)}`);
  }

  return (
    <main className="mx-auto max-w-[1536px] px-4 py-6 sm:px-7 sm:py-8 xl:px-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:underline"
      >
        <HiOutlineArrowLeft className="size-4" aria-hidden="true" />
        กลับหน้าหลัก
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">
            การลาของฉัน
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            ตรวจสอบวันลาและประวัติการลาของคุณ
          </p>
        </div>

        <Link
          href={leaveNewHref}
          className="hidden shrink-0 items-center gap-2 rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950 hover:bg-amber-300 sm:inline-flex"
        >
          <HiOutlinePlus className="size-5" aria-hidden="true" />
          เขียนใบลา
        </Link>
      </div>

      <div className="mt-5">
        <LeaveBalanceCard
          onDate={selectedDate}
          onTypesLoaded={setConfiguredLeaveTypeNames}
        />
      </div>

      <div
        role="tablist"
        aria-label="มุมมองการลา"
        className="mt-5 grid grid-cols-3 rounded-2xl bg-slate-100 p-1 sm:max-w-lg"
      >
        {[
          ["month", "เดือน"],
          ["day", "วัน"],
          ["list", "รายการ"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={view === value}
            onClick={() => setView(value)}
            className={`min-h-11 rounded-xl text-sm font-semibold transition ${
              view === value
                ? "bg-sky-500 text-white shadow-sm"
                : "text-slate-600 hover:bg-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view !== "list" ? (
        <div className="my-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label={view === "month" ? "เดือนก่อน" : "วันก่อน"}
              className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white"
            >
              <HiOutlineChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => navigate(1)}
              aria-label={view === "month" ? "เดือนถัดไป" : "วันถัดไป"}
              className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white"
            >
              <HiOutlineChevronRight className="size-5" />
            </button>
          </div>

          <h2 className="text-right text-sm font-bold text-slate-950 sm:text-lg">
            {title}
          </h2>

          <button
            type="button"
            onClick={() => setSelectedDate(today)}
            className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold sm:block"
          >
            วันนี้
          </button>
        </div>
      ) : null}

      {teamError && view !== "list" ? (
        <p
          role="alert"
          className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700"
        >
          {teamError}
        </p>
      ) : null}

      {view === "month" ? (
        <MonthView
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          onDoubleClickDate={startDraftOnDate}
          requests={requests}
          coworkers={teamItems}
          teamLoading={teamLoading}
        />
      ) : view === "day" ? (
        <DayView
          selectedDate={selectedDate}
          requests={requests}
          coworkers={teamItems}
          teamLoading={teamLoading}
          teamError={teamError}
          leaveTypeNames={configuredLeaveTypeNames}
        />
      ) : (
        <div className="mt-4">
          <ListView
            requests={requests}
            year={year}
            onYearChange={setYear}
            currentYear={today.slice(0, 4)}
            leaveTypeNames={configuredLeaveTypeNames}
          />
        </div>
      )}

      {view !== "list" ? (
        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <HiOutlineCalendarDays className="size-4" aria-hidden="true" />
          แตะวันที่เพื่อเลือกวันและดูรายการรายวัน
        </div>
      ) : null}

      <Link
        href={leaveNewHref}
        aria-label="เขียนใบลา"
        className="fixed right-5 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 flex size-14 items-center justify-center rounded-full bg-amber-400 text-slate-950 shadow-lg hover:bg-amber-300 sm:hidden"
      >
        <HiOutlinePlus className="size-7" aria-hidden="true" />
      </Link>
    </main>
  );
}
