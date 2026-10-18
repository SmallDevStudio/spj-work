import { z } from "zod";

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

const holidaySchema = z
  .object({
    date: z.string().refine(validDate, "วันที่ไม่ถูกต้อง"),
    nameTh: z.string().trim().min(1).max(200),
    kind: z.enum(["THAI_PUBLIC", "COMPANY"]),
  })
  .strict();

export const leaveCalendarDraftSchema = z
  .object({
    year: z.number().int().min(2000).max(2100),
    holidays: z.array(holidaySchema).max(366),

    // รองรับหน้าจอรุ่นก่อนระหว่างเปลี่ยนผ่านเท่านั้น
    // service/repository จะไม่บันทึกค่านี้
    workingWeekdays: z.array(z.number().int().min(0).max(6)).optional(),
  })
  .strict()
  .superRefine((data, context) => {
    const dates = new Set();

    data.holidays.forEach((holiday, index) => {
      if (
        validDate(holiday.date) &&
        Number(holiday.date.slice(0, 4)) !== data.year
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["holidays", index, "date"],
          message: "วันหยุดต้องอยู่ในปีที่เลือก",
        });
      }

      if (dates.has(holiday.date)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["holidays", index, "date"],
          message: "วันที่หยุดซ้ำกัน",
        });
      }

      dates.add(holiday.date);
    });
  });

export const leaveCalendarPublishSchema = z
  .object({
    year: z.number().int().min(2000).max(2100),
    expectedRevision: z.number().int().min(1),
    confirmedComplete: z.literal(true),
  })
  .strict();
