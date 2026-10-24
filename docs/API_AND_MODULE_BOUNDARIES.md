# SPJ Work module and API boundaries

The owning domain determines the directory and public API path. A module may
publish an event consumed by another module, but must not implement the other
module's storage or UI.

| Domain | API root | Source directories |
| --- | --- | --- |
| Auth/session | `/api/v1/auth` | `modules/auth`, `services/auth`, `repositories/auth` |
| Access/delegation | `/api/v1/access` | `modules/access`, `services/access`, `repositories/access` |
| Notifications | `/api/v1/notifications` | `modules/notifications`, `services/notifications`, `repositories/notifications` |
| Company | `/api/v1/company` | `modules/company`, `services/company`, `repositories/company` |
| Employee | `/api/v1/employee` | `modules/employee`, `services/employee`, `repositories/employee` |
| Department | `/api/v1/department` | `modules/department`, `services/department`, `repositories/department` |
| Leave | `/api/v1/leave` | `modules/leave`, `services/leave`, `repositories/leave` |

Shared permissions, roles, and route names stay in `src/constants`. Framework
integration stays in `src/lib`; Next.js pages and route handlers stay in
`src/app`. Components belong to `src/components/<domain>`.

## Resource URLs

- Collections use plural resource names after the existing domain root:
  `/api/v1/leave/requests`, `/api/v1/notifications`.
- A specific resource is addressed by its ID: `/api/v1/notifications/[id]`.
  `PATCH` changes read status; the signed-in user's collection is read with
  `GET /api/v1/notifications`.
- Capability-specific access grants live at
  `/api/v1/access/delegations/leave-approval`. This path describes the actual
  permission being granted; a general delegation endpoint must not imply that
  other capabilities are supported before they are implemented.
- Company visibility assignments live at
  `/api/v1/access/company-assignments/[uid]`; employee account roles live at
  `/api/v1/access/employee-roles/[employeeId]`. Employee profile edits remain
  at `/api/v1/employee/[employeeId]`.
- A pending leave request's assigned approver is Leave data. Moving pending
  work remains under `/api/v1/leave/approver-transfers` (bulk) or
  `/api/v1/leave/requests/[requestId]/hr-approver` (single), even when the new
  approver has an Access delegation.
- In-app notifications are owned by Notifications, regardless of whether the
  originating event came from Leave, Assets, or Helpdesk. Notification
  responses must omit leave reasons and financial decisions.
- Scoped Bearer tokens and API keys for external clients are planned, but
  issuance and verification endpoints are not implemented yet. When added,
  API keys must not grant implicit access to every company's employee data.

Existing Firestore collection `leaveHrDelegations` is retained by this route
refactor so previously assigned grants continue to work. A later migration to
generalized grant storage must have an explicit data migration and dual-read
plan; moving source files alone does not rename stored records.

The `notificationOutbox` query is a compatibility reader for existing Leave
events. It is not a general delivery queue API. Before introducing high volume
or external delivery, materialize per-recipient notifications and paginate them
by creation time; migrate old events without exposing the internal outbox.

## Leave verification endpoints

Manage history uses `GET /api/v1/leave/requests` and
`GET /api/v1/leave/requests/[requestId]`. A SUPERADMIN or ADMIN can soft delete
with `DELETE /api/v1/leave/requests/[requestId]` and a JSON `reason`.
The deleted request stays available to authorized managers for audit, while
balance calculations exclude it. The development-only SUPERADMIN simulator
uses `/api/v1/leave/dev-tests` and isolated `leaveDevTestRuns` documents; it
does not modify real employee leave balances. See [leave testing](LEAVE_TESTING.md).
