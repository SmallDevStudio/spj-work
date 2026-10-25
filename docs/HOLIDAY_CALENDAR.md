# Holiday calendar workflow

- `/manage/leave/holidays` lists existing years. Add a year to choose Google holiday candidates or manually enter company holidays.
- Saving a year creates a draft and an audit entry. Publishing requires a deliberate confirmation and records a second audit entry.
- Editing a published year saves changes in `pendingDraft` while the published `holidays` and `holidayDates` remain active for leave calculations. Publishing the pending revision archives the previous published version under `leaveCalendarYears/{year}/versions/{revision}` and atomically replaces the active calendar.
- Printing is available for a published year. The operator selects a company; `POST /api/v1/leave/calendar/print` checks the session and company permission, records `LEAVE_CALENDAR_PRINT`, and returns only the published year. This log records the request to prepare the print document, not a guarantee that paper was physically printed.
- The announcement follows the supplied sample's layout but omits “ครั้งที่” and labels the signature “ผู้บริหารของบริษัท”. It is generated from the selected company's current name and logo and the published holiday list.

Test first-time draft/publish, edit of published year before and after republishing, calculation while pending, company scope, and print output with a real account and published calendar before rollout.
