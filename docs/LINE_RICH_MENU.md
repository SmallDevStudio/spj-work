# LINE OA Rich Menu entry points

Configure HTTPS links on the deployed SPJ Work domain. Do not include a Firebase UID or employee ID in LINE's URL.

| Rich Menu action | Path | After SPJ Work login |
| --- | --- | --- |
| เขียนใบลา | `/line/leave-new` | The linked employee's leave form |
| การลาของฉัน | `/line/leave` | The linked employee's calendar |
| บริการ | `/line/services` | The portal |
| ข้อมูลของฉัน | `/line/profile` | The linked employee's profile |
| แจ้งเตือน | `/line/notifications` | The linked employee's notifications |

An unauthenticated visitor is sent to `/login` with a safe `returnTo` path. After Google Workspace authentication, the server checks the current membership, required permission and employee link before redirecting to a user-specific service. Unlinked users go to `/profile` with an explanation. These links do **not** yet identify or bind a LINE account; adding LINE Login/LIFF, account linking, and webhook signatures is separate work. Do not trust a LINE user ID sent in a URL as an SPJ Work identity.
