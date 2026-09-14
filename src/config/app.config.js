export const APP_CONFIG = Object.freeze({
  name: "SPJ Work",
  shortName: "SPJ",
  description:
    "ระบบบริหารทรัพยากรบุคคลและการจัดการโครงการสำหรับ Superjeew Co., Ltd.",
  organizationName: "Superjeew Co., Ltd.",
  organizationCode: "SPJ",
  organizationId: "superjeew",
  emailDomain: "superjeew.com",
  defaultLocale: "th",
  supportedLocales: ["th", "en"],
  timezone: "Asia/Bangkok",
  firebaseRegion: "asia-southeast1",

  session: Object.freeze({
    developmentCookieName: "spj_session",
    productionCookieName: "__Host-spj_session",
    durationDays: 5,
    maximumAgeSeconds: 5 * 24 * 60 * 60,
    recentSignInSeconds: 5 * 60,
  }),

  csrf: Object.freeze({
    developmentCookieName: "spj_csrf",
    productionCookieName: "__Host-spj_csrf",
    headerName: "x-csrf-token",
    maximumAgeSeconds: 10 * 60,
  }),
});

export const APP_METADATA = Object.freeze({
  title: {
    default: APP_CONFIG.name,
    template: `%s | ${APP_CONFIG.name}`,
  },
  description: APP_CONFIG.description,
  applicationName: APP_CONFIG.name,
});
