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
  sessionCookieName: "__session",
  sessionDurationDays: 5,
  firebaseRegion: "asia-southeast1",
});

export const APP_METADATA = Object.freeze({
  title: {
    default: APP_CONFIG.name,
    template: `%s | ${APP_CONFIG.name}`,
  },
  description: APP_CONFIG.description,
  applicationName: APP_CONFIG.name,
});
