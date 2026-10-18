export const LEAVE_TYPE_CODES = Object.freeze({
  ANNUAL: "ANNUAL",
  SICK: "SICK",
  PERSONAL: "PERSONAL",
  MATERNITY: "MATERNITY",
  ORDINATION: "ORDINATION",
  UNPAID: "UNPAID",
  OTHER: "OTHER",
});

export const LEAVE_COUNTING_BASIS = Object.freeze({
  WORKING_DAYS: "WORKING_DAYS",
  CALENDAR_DAYS: "CALENDAR_DAYS",
});

export const LEAVE_PAY_TREATMENT = Object.freeze({
  PAID: "PAID",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  UNPAID: "UNPAID",
  PER_POLICY: "PER_POLICY",
});

export const LEAVE_TYPE_PRESETS = Object.freeze([
  {
    code: LEAVE_TYPE_CODES.ANNUAL,
    nameTh: "ลาพักร้อน",
    countingBasis: LEAVE_COUNTING_BASIS.WORKING_DAYS,
    payTreatment: LEAVE_PAY_TREATMENT.PAID,
    entitlementDays: null,
    paidDaysCap: null,
    reasonRequired: false,
  },
  {
    code: LEAVE_TYPE_CODES.SICK,
    nameTh: "ลาป่วย",
    countingBasis: LEAVE_COUNTING_BASIS.WORKING_DAYS,
    payTreatment: LEAVE_PAY_TREATMENT.PER_POLICY,
    entitlementDays: null,
    paidDaysCap: null,
    reasonRequired: true,
  },
  {
    code: LEAVE_TYPE_CODES.PERSONAL,
    nameTh: "ลากิจ",
    countingBasis: LEAVE_COUNTING_BASIS.WORKING_DAYS,
    payTreatment: LEAVE_PAY_TREATMENT.PER_POLICY,
    entitlementDays: null,
    paidDaysCap: null,
    reasonRequired: true,
  },
  {
    code: LEAVE_TYPE_CODES.MATERNITY,
    nameTh: "ลาคลอด",
    countingBasis: LEAVE_COUNTING_BASIS.CALENDAR_DAYS,
    payTreatment: LEAVE_PAY_TREATMENT.PARTIALLY_PAID,
    entitlementDays: 120,
    paidDaysCap: 60,
    reasonRequired: false,
  },
  {
    code: LEAVE_TYPE_CODES.ORDINATION,
    nameTh: "ลาบวช",
    countingBasis: LEAVE_COUNTING_BASIS.CALENDAR_DAYS,
    payTreatment: LEAVE_PAY_TREATMENT.PER_POLICY,
    entitlementDays: null,
    paidDaysCap: null,
    reasonRequired: false,
  },
  {
    code: LEAVE_TYPE_CODES.UNPAID,
    nameTh: "ลาโดยไม่รับเงินตอบแทน",
    countingBasis: LEAVE_COUNTING_BASIS.WORKING_DAYS,
    payTreatment: LEAVE_PAY_TREATMENT.UNPAID,
    entitlementDays: null,
    paidDaysCap: 0,
    reasonRequired: true,
  },
  {
    code: LEAVE_TYPE_CODES.OTHER,
    nameTh: "ลาอื่น ๆ",
    countingBasis: LEAVE_COUNTING_BASIS.WORKING_DAYS,
    payTreatment: LEAVE_PAY_TREATMENT.PER_POLICY,
    entitlementDays: null,
    paidDaysCap: null,
    reasonRequired: true,
  },
]);
