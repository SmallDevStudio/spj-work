# Holiday calendar workflow

- `/manage/leave/holidays` lists existing years in a paginated table. Add a year to choose Google holiday candidates or manually enter company holidays. The edit button opens that year's editor.
- Saving a year creates a draft and an audit entry. Publishing requires a deliberate confirmation and records a second audit entry.
- Editing a published year saves changes in `pendingDraft` while the published `holidays` and `holidayDates` remain active for leave calculations. Publishing the pending revision archives the previous published version under `leaveCalendarYears/{year}/versions/{revision}` and atomically replaces the active calendar.
- Printing is available for a published year. The row's print link opens `/manage/leave/holidays/print` in a new window. Select the company and executive employee there, preview the announcement, and press Print. `POST /api/v1/leave/calendar/print` validates the session, company, executive, and revision and records `LEAVE_CALENDAR_PRINT` before opening the browser's print dialog. The log records the print request, not a guarantee that paper was physically printed.
- The announcement follows the supplied sample's layout but omits “ครั้งที่” and includes the selected executive's name above “ผู้บริหารของบริษัท”. It is generated from the selected company's current name and logo and the published holiday list.

Test first-time draft/publish, edit of published year before and after republishing, calculation while pending, company scope, and print output with a real account and published calendar before rollout.
