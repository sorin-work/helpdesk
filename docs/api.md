# API overview

All endpoints live under `/api` and speak JSON. The session is a JWT in the
httpOnly `helpdesk_session` cookie, set by sign-up and login. Errors always look
like this:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Some fields are missing or invalid",
    "details": [{ "path": "email", "message": "Invalid email address" }],
    "requestId": "…"
  }
}
```

Roles: **customer** (portal), **agent** and **admin** (both called staff below).

## Auth and profile

| Method | Path             | Who    | Notes                                         |
| ------ | ---------------- | ------ | --------------------------------------------- |
| POST   | `/auth/signup`   | anyone | Creates a customer and signs them in          |
| POST   | `/auth/login`    | anyone | `{ email, password }`                         |
| POST   | `/auth/logout`   | anyone | Clears the cookie                             |
| GET    | `/auth/me`       | signed | The current user                              |
| PATCH  | `/auth/me`       | signed | `{ name?, available? }` (availability: staff) |
| POST   | `/auth/password` | signed | `{ currentPassword, newPassword }`            |

## Tickets

| Method | Path                    | Who    | Notes                                                                                                         |
| ------ | ----------------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| GET    | `/tickets`              | signed | Customers get their own; staff can pass `view`                                                                |
| GET    | `/tickets/counts`       | staff  | Counts for unassigned, mine, open and overdue                                                                 |
| POST   | `/tickets`              | signed | `{ subject, body, priority?, attachmentIds?, tags?, requesterEmail? }`                                        |
| GET    | `/tickets/:id`          | signed | Ticket with messages (customers never see notes)                                                              |
| PATCH  | `/tickets/:id`          | signed | Staff: `{ subject?, status?, priority?, assigneeId?, tags? }`; customers may only send `{ status: "solved" }` |
| POST   | `/tickets/:id/messages` | signed | `{ body, internal?, status?, attachmentIds? }`                                                                |
| GET    | `/tickets/:id/events`   | staff  | Timeline: status, priority, assignment and tag changes                                                        |

List parameters: `view` (`unassigned`, `mine`, `open`, `overdue`, `solved`,
`all`), `status` (comma-separated), `priority`, `assignee` (an id or `none`),
`tag`, `q` (full-text), `sort` (`updated`, `created`, `oldest`, `due`,
`priority`), `page` and `pageSize` (max 100).

Every ticket carries an `sla` object with a `firstResponse` and a `resolution`
clock, each `{ state, dueAt }` where `state` is one of `none`, `on_track`,
`due_soon`, `breached`, `met` or `paused`.

## Attachments

| Method | Path               | Who    | Notes                                                      |
| ------ | ------------------ | ------ | ---------------------------------------------------------- |
| POST   | `/attachments`     | signed | Multipart, one file in the `file` field; returns its id    |
| GET    | `/attachments/:id` | signed | Download, if you can see the ticket (and it is not a note) |

Upload first, then pass the ids as `attachmentIds` when creating a ticket or
posting a message.

## Team and settings

| Method   | Path                       | Who           | Notes                                          |
| -------- | -------------------------- | ------------- | ---------------------------------------------- |
| GET      | `/agents`                  | staff         | Active agents and admins                       |
| GET/POST | `/users`                   | admin         | List (`role`, `q`, `includeInactive`) / create |
| PATCH    | `/users/:id`               | admin         | `{ name?, role?, active? }`                    |
| GET/PUT  | `/settings/business-hours` | staff / admin | Time zone, hours per weekday, holidays         |
| GET/PUT  | `/settings/sla`            | staff / admin | Targets per priority, in minutes               |
| GET/PUT  | `/settings/assignment`     | staff / admin | `{ autoAssign }` for round-robin               |

## Canned responses, tags, search and reports

| Method       | Path                           | Who    | Notes                                       |
| ------------ | ------------------------------ | ------ | ------------------------------------------- |
| GET/POST     | `/canned-responses`            | staff  | List (with available placeholders) / create |
| PATCH/DELETE | `/canned-responses/:id`        | staff  |                                             |
| POST         | `/canned-responses/:id/render` | staff  | `{ ticketId }`, returns the filled-in text  |
| GET          | `/tags`                        | staff  | Tags in use with ticket counts              |
| GET          | `/search?q=`                   | signed | Ranked hits with a highlighted snippet      |
| GET          | `/reports/overview?from=&to=`  | staff  | Local dates, at most 366 days               |
| GET          | `/health`                      | anyone | `503` when the database is unreachable      |
