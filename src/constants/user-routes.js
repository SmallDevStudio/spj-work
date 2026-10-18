function getUserBasePath(userId) {
  if (typeof userId !== "string" || userId.trim() === "") {
    throw new Error("A valid userId is required.");
  }

  return `/${encodeURIComponent(userId.trim())}`;
}

export function getUserRoutes(userId) {
  const base = getUserBasePath(userId);

  return Object.freeze({
    HOME: base,
    PROFILE: `${base}/profile`,
    LEAVE: `${base}/leave`,
    LEAVE_NEW: `${base}/leave/new`,
    CALENDAR: `${base}/calendar`,
    ASSETS: `${base}/assets`,
  });
}
