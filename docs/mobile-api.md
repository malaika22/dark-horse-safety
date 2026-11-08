# Dark Horse Safety — Mobile API

Base URL (local): `http://localhost:3002`

All paths below are under `/mobile/v1`. Interactive schema: `http://localhost:3002/docs` (tags `mobile-*`).

This document is the contract the mobile app should code against. Every authenticated call is scoped to the signed-in employee. The app never passes an employee id.

---

## 1. Conventions

### Headers

| Header | When |
|---|---|
| `Content-Type: application/json` | Every request with a body |
| `Authorization: Bearer <accessToken>` | Every route except the four public auth routes in section 2 |

There is no refresh-token cookie. The access token is a JWT. Default lifetime is **7 days**. `expiresAt` is an ISO timestamp. Call `POST /auth/refresh` with the current token before it expires to get a new one.

### Success envelope

Every success body is:

```json
{ "data": { } }
```

### Error envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": { "fieldName": "Human readable message" }
  }
}
```

`details` is omitted when there is nothing field-specific. Unknown JSON fields are rejected (`400`).

| HTTP | `error.code` | Meaning for the app |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Fix the field in `details` and resubmit |
| 400 | `INVALID_CODE` | OTP wrong or expired |
| 400 | `INVALID_TOKEN` | Password-reset token expired. Start OTP again |
| 400 | `INVALID_STATE` | Action does not match the current record state |
| 401 | `UNAUTHORIZED` | Missing/expired token, or current password is wrong |
| 401 | `FORBIDDEN` | Account is invited, disabled, or has no password yet |
| 403 | `EMPLOYEE_NOT_LINKED` | User has no employee record. Do not retry |
| 403 | `MOBILE_ACCESS_DISABLED` | HR turned mobile access off |
| 404 | `NOT_FOUND` | Id is unknown or belongs to another employee |
| 409 | `CONFLICT`, `ALREADY_CLOCKED_IN`, `NOT_CLOCKED_IN`, `ALREADY_PAUSED`, `NOT_PAUSED`, `ALREADY_EXISTS`, `HOME_LOCATION_EXISTS`, `EDIT_ALREADY_PENDING`, `INVALID_STATE` | Show the `message`. Do not blindly retry |
| 422 | `CLOSEOUT_INCOMPLETE` | `details.items` lists blockers |
| 422 | `INSUFFICIENT_BALANCE` | Time-off request exceeds the balance |
| 423 | `ENTRY_LOCKED` | Pay period is closed. Time cannot be edited |
| 429 | `RATE_LIMITED` | OTP cooldown (90s) or 5 bad codes. Request a new code |
| 500 | `INTERNAL_ERROR` | Retry later |

### Idempotency

Writes that accept `clientRequestId` (string, max 100) store the **successful** response. Sending the same id again returns that same body and does not run the action twice. Generate one id per user action (UUID). A failed request is not stored, so the same id can be retried after an error.

### Pagination

`page` starts at 1. `pageSize` defaults to 25 and maxes at 100. List responses include `page`, `pageSize`, and `total`.

### Dates and times

| Shape | Example | Use |
|---|---|---|
| Calendar date | `"2026-11-07"` | `workDate`, `startDate`, `endDate`, home `date` |
| Clock time | `"07:05"` | `clockIn` / `clockOut`. 24-hour `HH:mm`. This is **server local time**, not UTC |
| Instant | `"2026-11-07T14:22:00.000Z"` | `createdAt`, `expiresAt`, `capturedAt`, pause start/end |

Send `capturedAt` as ISO-8601 when replaying an action that happened offline. If you omit it, the server uses “now”.

### Password rules

7–128 characters, at least one letter and one number. Special characters are allowed.

### Login identifier

Email or phone. Email is lowercased. Phone is stored as digits only (`+1 (555) 010-1234` and `15550101234` match). OTP is emailed. The request endpoint always returns `sent: true` even when the account does not exist.

---

## 2. Auth

Public. No bearer token.

### `POST /auth/otp/request` — send a 5-digit code

```json
{ "identifier": "tech@example.com", "purpose": "LOGIN" }
```

`purpose`: `LOGIN` | `RESET_PASSWORD`.

```json
{
  "data": {
    "sent": true,
    "codeLength": 5,
    "expiresInSeconds": 600,
    "resendAfterSeconds": 90
  }
}
```

Code expires in 10 minutes. A second request inside 90 seconds returns `429 RATE_LIMITED`.

### `POST /auth/otp/resend`

Same body and response as request. Same 90-second cooldown.

### `POST /auth/otp/verify`

```json
{ "identifier": "tech@example.com", "purpose": "LOGIN", "code": "04821" }
```

`code` is exactly 5 characters. Five wrong attempts returns `429`.

**`purpose: "LOGIN"`** returns a session:

```json
{
  "data": {
    "accessToken": "<jwt>",
    "expiresAt": "2026-11-14T16:00:00.000Z",
    "user": {
      "id": "uuid",
      "email": "tech@example.com",
      "phone": "15550101234",
      "role": "technician",
      "status": "active",
      "displayName": "Ada Lovelace",
      "firstName": "Ada",
      "lastName": "Lovelace"
    }
  }
}
```

`role` is lowercase: `admin` | `supervisor` | `technician` | `operator`. `status` is lowercase: `active` | `invited` | `locked` | `disabled` | `pending_password`. Login is rejected unless the account can sign in (`401 FORBIDDEN` for invited, disabled, or pending password).

**`purpose: "RESET_PASSWORD"`** does not return a session:

```json
{ "data": { "resetToken": "<hex>", "expiresInSeconds": 900 } }
```

Use `resetToken` within 15 minutes. It is single use.

### `POST /auth/reset-password`

```json
{ "resetToken": "<hex from verify>", "newPassword": "Newpass1" }
```

```json
{ "data": { "reset": true } }
```

The user must log in again with OTP. This does not return a token.

### `POST /auth/refresh` — bearer required

No body. Returns the same session shape as login verify. Rejected if the account is no longer active.

### `POST /auth/logout` — bearer required

```json
{ "deviceId": "optional-install-id" }
```

`deviceId` is optional. When present, that device’s push registration is deleted.

```json
{ "data": { "loggedOut": true } }
```

The JWT itself is not revoked. Delete it on the device.

---

## 3. Profile, home, devices, on-call

Bearer required. These routes also require a linked employee with mobile access enabled.

### `GET /me`

```json
{
  "data": {
    "id": "user-uuid",
    "employeeId": "employee-uuid",
    "employeeCode": "E-1042",
    "name": "Ada Lovelace",
    "firstName": "Ada",
    "lastName": "Lovelace",
    "roleTitle": "Technician",
    "email": "tech@example.com",
    "phone": "15550101234",
    "crew": "Crew A",
    "assignedTruck": "Truck 12",
    "emergencyContact": { "name": "Sam", "phone": "15550109999" },
    "supervisor": { "id": "uuid", "name": "Grace Hopper", "phone": "15550108888" },
    "homeLocation": { "address": "1 Main St", "lat": 32.78, "lng": -96.8, "setAt": "2026-11-01T12:00:00.000Z" },
    "settings": { "defaultTimeCategory": "REGULAR", "notificationsEnabled": true }
  }
}
```

`homeLocation` and `supervisor` are `null` when unset. `defaultTimeCategory`: `REGULAR` | `ON_JOB_TRAINING` | `NON_BILLABLE`.

### `PATCH /me`

All fields optional. At least send the ones that changed.

```json
{
  "phone": "15550101234",
  "emergencyContactName": "Sam",
  "emergencyContactPhone": "15550109999"
}
```

Returns the full `GET /me` body. `409 CONFLICT` if the phone belongs to another user.

### `PUT /me/home-location` — first time only

```json
{ "address": "1 Main St, Dallas, TX", "lat": 32.78, "lng": -96.8 }
```

`lat` −90..90, `lng` −180..180, `address` required, max 300.

```json
{ "data": { "homeLocation": { "address": "1 Main St, Dallas, TX", "lat": 32.78, "lng": -96.8 }, "status": "ACTIVE" } }
```

`409 HOME_LOCATION_EXISTS` if a home location is already saved. Use the change-request route instead.

### `POST /me/home-location/change-requests`

Same body as set-home, plus optional `reason` (max 500). Does **not** change the active home location. HR approves it.

```json
{ "data": { "id": "uuid", "status": "PENDING" } }
```

### `POST /me/change-password`

```json
{ "currentPassword": "Oldpass1", "newPassword": "Newpass1" }
```

```json
{ "data": { "changed": true } }
```

`401 UNAUTHORIZED` when the current password is wrong. `newPassword` follows the password rules.

### `GET /me/certifications`

```json
{
  "data": {
    "items": [
      { "id": "uuid", "label": "H2S", "issuingBody": "SafeLand", "expiresOn": "2027-01-15", "status": "VALID" }
    ]
  }
}
```

`status`: `VALID` | `EXPIRING` | `EXPIRED`. `expiresOn` is `null` when the cert has no expiry (treated as `VALID`).

### `GET /me/equipment`

```json
{
  "data": {
    "assignedTruck": "Truck 12",
    "ppeIssued": ["Hard hat", "FR coveralls"],
    "assignedEquipment": ["4-gas monitor"]
  }
}
```

### `PATCH /me/settings`

```json
{ "defaultTimeCategory": "REGULAR", "notificationsEnabled": true }
```

Both optional. Returns the saved settings object only:

```json
{ "data": { "defaultTimeCategory": "REGULAR", "notificationsEnabled": true } }
```

### `POST /me/location-access-requests`

Ask the supervisor to turn location permission guidance on. Idempotent.

```json
{ "note": "optional, max 500", "clientRequestId": "uuid" }
```

```json
{ "data": { "id": "uuid", "status": "PENDING" } }
```

### `POST /supervisor/messages`

Idempotent.

```json
{
  "subject": "optional, max 150",
  "body": "required, max 1000",
  "workOrderId": "optional uuid",
  "clientRequestId": "uuid"
}
```

```json
{ "data": { "id": "uuid", "sentAt": "2026-11-07T14:22:00.000Z" } }
```

### `POST /devices`

Register or update this install. `deviceId` is your stable install id, not the server id.

```json
{
  "deviceId": "install-uuid",
  "platform": "ios",
  "pushToken": "optional, max 500",
  "appVersion": "1.4.0",
  "locationPermission": "WHILE_USING",
  "pushEnabled": true
}
```

`platform`: `ios` | `android`. `locationPermission`: `ALWAYS` | `WHILE_USING` | `DENIED`.

```json
{ "data": { "deviceId": "install-uuid", "registered": true } }
```

Call this after login and whenever the push token or permission changes.

### `DELETE /devices/:deviceId`

```json
{ "data": { "removed": true } }
```

Always `removed: true`, including when the device was not registered.

### `GET /home?date=2026-11-07`

`date` is optional. Omit it for today. Invalid date → `400`.

```json
{
  "data": {
    "date": "2026-11-07",
    "mode": "WORKING",
    "blockedReason": null,
    "clock": {
      "status": "CLOCKED_IN",
      "timeEntryId": "uuid-or-null",
      "clockIn": "07:05",
      "workOrderCode": "WO-100"
    },
    "attentionCount": 1,
    "unreadNotifications": 3,
    "pendingEditsCount": 0,
    "unsyncedCount": 0,
    "nextJob": {
      "assignmentId": "uuid",
      "workOrderId": "uuid",
      "workOrderCode": "WO-100",
      "customer": "Acme",
      "location": "Well 4",
      "startTime": "08:00",
      "endTime": "16:00",
      "status": "ACCEPTED"
    },
    "schedule": [],
    "onCall": { "zone": "North", "status": "PUBLISHED", "role": "PRIMARY" }
  }
}
```

`mode`: `WORKING` (open time entry) | `ON_CALL` (primary today) | `STANDBY` (backup today) | `OFF_DUTY`.

`clock.status`: `CLOCKED_IN` | `PAUSED` | `CLOCKED_OUT`. When clocked out, `clockIn` and `workOrderCode` are null.

`nextJob` is the first item of `schedule`, or `null`. Schedule status is `ASSIGNED` (server status `POSTED`, waiting for accept/decline) or `ACCEPTED`. `onCall` is `null` when the employee is not on the day’s roster.

`unsyncedCount` is always `0`. The device owns the offline queue. Use `GET /sync/status` for failures the server already knows about.

### `GET /on-call?from=2026-11-01&to=2026-11-30`

Both query params optional. Default window is today through 30 days ahead. Only published shifts where this employee is primary or backup.

```json
{
  "data": {
    "items": [
      { "id": "uuid", "date": "2026-11-08", "zone": "North", "status": "PUBLISHED", "role": "PRIMARY", "notes": "Call Grace first" }
    ]
  }
}
```

`role`: `PRIMARY` | `BACKUP`.

### `GET /on-call/shifts/:id`

```json
{
  "data": {
    "id": "uuid",
    "date": "2026-11-08",
    "zone": "North",
    "status": "PUBLISHED",
    "role": "PRIMARY",
    "instructions": "Call Grace first",
    "supervisor": { "name": "Grace Hopper", "phone": "15550108888" }
  }
}
```

### `POST /on-call/shifts/:id/check-in`

Idempotent. Records a check-in message. It does not clock the employee in.

```json
{ "lat": 32.78, "lng": -96.8, "clientRequestId": "uuid" }
```

```json
{ "data": { "checkedInAt": "2026-11-07T14:22:00.000Z", "withinArea": null } }
```

`withinArea` is always `null` today. Do not block the UI on it.

---

## 4. Clock, GPS, offline sync

Bearer required.

### `GET /clock/status`

```json
{
  "data": {
    "status": "PAUSED",
    "timeEntryId": "uuid",
    "clockIn": "07:05",
    "workDate": "2026-11-07",
    "workOrderCode": "WO-100",
    "customerName": "Acme",
    "category": "REGULAR",
    "pause": { "id": "uuid", "reason": "BREAK", "startedAt": "2026-11-07T16:00:00.000Z" }
  }
}
```

When clocked out the body is only `{ "status": "CLOCKED_OUT", "timeEntryId": null }`. `pause` is `null` unless status is `PAUSED`.

`category`: `REGULAR` | `OVERTIME` | `NON_BILLABLE` | `ON_JOB_TRAINING`. The clock-in request only accepts `REGULAR`, `ON_JOB_TRAINING`, and `NON_BILLABLE`. Overtime is assigned by payroll, not by the app.

### `GET /clock/geofence-check?workOrderId=&lat=&lng=`

Call this before clock-in if you want to warn the user. Clock-in itself is not blocked by the fence. It raises a GPS flag instead.

```json
{
  "data": {
    "withinGeofence": true,
    "radiusFeet": 500,
    "distanceMeters": 42,
    "gpsRequired": true
  }
}
```

`withinGeofence` and `distanceMeters` are `null` when the job site has no coordinates. Default radius is 500 feet when the location has none.

### `POST /clock/in`

Idempotent. `409 ALREADY_CLOCKED_IN` if a shift is already open.

```json
{
  "workOrderId": "optional uuid",
  "assignmentId": "optional, accepted but not stored separately",
  "category": "REGULAR",
  "nonBillableReason": "required when category is NON_BILLABLE, max 200",
  "note": "optional, max 500",
  "lat": 32.78,
  "lng": -96.8,
  "accuracyM": 8,
  "capturedAt": "2026-11-07T12:05:00.000Z",
  "clientRequestId": "uuid"
}
```

All of those fields are optional except: `nonBillableReason` is required when `category` is `NON_BILLABLE`. If `category` is omitted, the employee’s `defaultTimeCategory` is used (`REGULAR` if they have none).

```json
{
  "data": {
    "status": "CLOCKED_IN",
    "timeEntryId": "uuid",
    "clockIn": "07:05",
    "workDate": "2026-11-07",
    "workOrderCode": "WO-100",
    "customerName": "Acme",
    "category": "REGULAR",
    "pause": null,
    "gpsFlag": { "raised": false }
  }
}
```

When a flag is raised:

```json
"gpsFlag": {
  "raised": true,
  "id": "gps-flag-uuid",
  "type": "OUTSIDE_GEOFENCE",
  "explanationRequired": true
}
```

`gpsFlag.type`: `OUTSIDE_GEOFENCE` | `GPS_UNAVAILABLE` | `CLOCK_IN_FROM_HOME`.

`GPS_UNAVAILABLE` means lat/lng were missing. `CLOCK_IN_FROM_HOME` means the point is inside the home fence and outside the job fence. A flag also creates a notification of type `GPS_FLAG_NEEDS_EXPLANATION`. The clock-in still succeeds. Send the user to the explanation screen with `gpsFlag.id`.

### `POST /clock/out`

Idempotent. Closes any open pause first. `409 NOT_CLOCKED_IN` if nothing is open.

```json
{
  "lat": 32.78,
  "lng": -96.8,
  "accuracyM": 8,
  "capturedAt": "2026-11-07T22:00:00.000Z",
  "clientRequestId": "uuid"
}
```

```json
{
  "data": {
    "status": "CLOCKED_OUT",
    "timeEntryId": "uuid",
    "clockOut": "17:00",
    "summary": {
      "workMinutes": 540,
      "breakMinutes": 30,
      "pauseMinutes": 45,
      "totalMinutes": 585
    },
    "formsMissing": []
  }
}
```

`workMinutes` is total minus all pause minutes. `breakMinutes` counts only pauses whose reason is `BREAK`. `pauseMinutes` counts every pause. `formsMissing` is always an empty array on this route. Use the closeout summary for real missing forms.

### `POST /clock/pause`

Idempotent. `409 NOT_CLOCKED_IN` or `409 ALREADY_PAUSED`.

```json
{
  "reason": "BREAK",
  "note": "required when reason is OTHER, max 500",
  "photoUrl": "optional url, max 500",
  "capturedAt": "2026-11-07T16:00:00.000Z",
  "clientRequestId": "uuid"
}
```

`reason` (required), one of:

`BREAK` · `WAITING_ON_CUSTOMER` · `EQUIPMENT_ISSUE` · `TRAVEL_STANDBY` · `ADMIN_TASK` · `NON_BILLABLE_CUSTOMER_DELAY` · `OTHER`

```json
{ "data": { "pauseId": "uuid", "startedAt": "2026-11-07T16:00:00.000Z" } }
```

### `POST /clock/resume`

Idempotent. `409 NOT_PAUSED` if nothing is paused.

```json
{ "capturedAt": "2026-11-07T16:30:00.000Z", "clientRequestId": "uuid" }
```

```json
{ "data": { "pauseId": "uuid", "endedAt": "2026-11-07T16:30:00.000Z", "pauseMinutes": 30 } }
```

### `POST /clock/sync` — replay offline events

Send events in the order they happened. Each event is applied with its own `clientRequestId`, so a replay of an event that already succeeded is a no-op. The batch itself always returns **200**. Per-event failures are inside `results`, not as an HTTP error.

```json
{
  "events": [
    {
      "clientRequestId": "uuid-1",
      "type": "CLOCK_IN",
      "payload": { "workOrderId": "uuid", "lat": 32.78, "lng": -96.8, "capturedAt": "2026-11-07T12:05:00.000Z" }
    },
    {
      "clientRequestId": "uuid-2",
      "type": "PAUSE",
      "payload": { "reason": "BREAK", "capturedAt": "2026-11-07T16:00:00.000Z" }
    }
  ]
}
```

`type`: `CLOCK_IN` | `CLOCK_OUT` | `PAUSE` | `RESUME`. Max 100 events. `payload` is the same body as the matching live route, without `clientRequestId` (the server copies it from the event).

```json
{
  "data": {
    "results": [
      { "clientRequestId": "uuid-1", "ok": true },
      { "clientRequestId": "uuid-2", "ok": false, "error": { "code": "ALREADY_PAUSED", "message": "Already paused." } }
    ]
  }
}
```

Drop `ok: true` events from the local queue. Keep `ok: false` events and surface `error.message`.

### `GET /sync/status`

```json
{ "data": { "pendingCount": 0, "failedCount": 0, "lastSyncedAt": "2026-11-07T14:22:00.000Z" } }
```

`pendingCount` is always 0 (the device owns the queue). `failedCount` counts unresolved `OFFLINE_SYNC_FAILED` notifications. `lastSyncedAt` is the time of this request, not the last successful replay.

### `POST /clock/gps-explanation`

Idempotent. Resolves the GPS-flag notification.

```json
{
  "gpsFlagId": "uuid",
  "text": "required, max 500",
  "attachmentUrl": "optional, max 500",
  "clientRequestId": "uuid"
}
```

```json
{ "data": { "id": "uuid", "status": "EXPLAINED" } }
```

### `GET /gps-flags`

Newest first, max 100.

```json
{
  "data": {
    "items": [
      { "id": "uuid", "type": "OUTSIDE_GEOFENCE", "status": "OPEN", "eventAt": "2026-11-07T12:05:00.000Z", "workOrder": "WO-100" }
    ]
  }
}
```

`status`: `OPEN` (needs an explanation) | `EXPLAINED` (waiting on HR) | `RESOLVED` (HR accepted or rejected).

### `GET /gps-flags/:id`

```json
{
  "data": {
    "id": "uuid",
    "type": "CLOCK_IN_FROM_HOME",
    "status": "OPEN",
    "timeEntryId": "uuid-or-null",
    "eventAt": "2026-11-07T12:05:00.000Z",
    "homeLocation": { "lat": 32.7, "lng": -96.7, "address": "1 Main St" },
    "jobLocation": { "lat": 32.9, "lng": -96.9 },
    "clockLocation": { "lat": 32.7, "lng": -96.7 },
    "distanceFromJobMeters": 1200,
    "explanation": null,
    "decisionNotes": null,
    "timeline": [
      { "at": "2026-11-07T12:05:00.000Z", "event": "FLAG_RAISED", "actor": "SYSTEM" }
    ]
  }
}
```

Any location object is `null` when that point was not captured. Timeline `event` after a decision is the HR decision string (`ACCEPTED` or `REJECTED`). `actor` is `SYSTEM`, `EMPLOYEE`, or `HR`.

---

## 5. Jobs, closeout, sales ticket

Bearer required. `:id` on these routes is the **assignment id** (`assignmentId`), not the work order id.

### `GET /jobs?tab=ASSIGNED&page=1&pageSize=25`

`tab`:

| Tab | What it returns |
|---|---|
| `ASSIGNED` (default) | Posted jobs waiting for accept or decline. Status on the card is `POSTED` |
| `ACCEPTED` | Accepted jobs scheduled today or later |
| `RECENT` | Last 7 days, status `ACCEPTED`, `DECLINED`, `REASSIGNED`, or `CANCELLED` |
| `COMPLETED` | Accepted jobs that have a closeout review |

```json
{
  "data": {
    "items": [
      {
        "assignmentId": "uuid",
        "workOrderId": "uuid",
        "workOrderCode": "WO-100",
        "title": "Tubing inspection",
        "customer": "Acme",
        "location": "Well 4",
        "scheduledDate": "2026-11-08",
        "startTime": "08:00",
        "endTime": "16:00",
        "status": "POSTED",
        "jobType": "VISIT"
      }
    ],
    "page": 1,
    "pageSize": 25,
    "total": 1
  }
}
```

`jobType`: `VISIT` | `CALL` | `TASK`. `location` may be `null`.

### `GET /jobs/:id`

Card fields above, plus:

```json
{
  "data": {
    "assignmentId": "uuid",
    "workOrderId": "uuid",
    "workOrderCode": "WO-100",
    "title": "Tubing inspection",
    "customer": "Acme",
    "location": "Well 4",
    "scheduledDate": "2026-11-08",
    "startTime": "08:00",
    "endTime": "16:00",
    "status": "POSTED",
    "jobType": "VISIT",
    "outcome": null,
    "notes": "Gate code 1234",
    "site": {
      "name": "Well 4",
      "county": "Midland",
      "state": "TX",
      "lat": 31.99,
      "lng": -102.07,
      "accessNotes": "North gate",
      "musterPoint": "Parking pad",
      "siteContact": "Pat 555-0100"
    },
    "h2sRequired": false,
    "certificationWarning": null,
    "distanceFromHomeMeters": 84000,
    "supervisor": { "name": "Grace Hopper", "phone": "15550108888" },
    "respondBy": "2026-11-08"
  }
}
```

`outcome`: `null` while the job is still open and not past its date. Otherwise `EXPIRED` (still `POSTED` but the scheduled date is before today), `ACCEPTED`, `DECLINED`, or `REASSIGNED`.

`h2sRequired` is true when the title or notes contain “h2s”. `certificationWarning` is a string when dispatch flagged a cert conflict, otherwise `null`. `respondBy` is the scheduled date while status is `POSTED`, otherwise `null`. `site` and `supervisor` may be `null`.

### `POST /jobs/:id/accept`

Idempotent. Only when status is `POSTED`. Otherwise `409 INVALID_STATE`.

```json
{ "clientRequestId": "uuid" }
```

```json
{ "data": { "assignmentId": "uuid", "status": "ACCEPTED", "acceptedAt": "2026-11-07T14:22:00.000Z" } }
```

### `POST /jobs/:id/decline`

Idempotent. Only when status is `POSTED`.

```json
{
  "reason": "SCHEDULE_CONFLICT",
  "notes": "required when reason is OTHER, max 500",
  "clientRequestId": "uuid"
}
```

`reason`: `NOT_AVAILABLE` | `WRONG_ASSIGNMENT` | `CERTIFICATION_ISSUE` | `EQUIPMENT_ISSUE` | `SCHEDULE_CONFLICT` | `OTHER`.

```json
{ "data": { "assignmentId": "uuid", "status": "DECLINED", "declinedAt": "2026-11-07T14:22:00.000Z" } }
```

### `POST /jobs/:id/request-help`

Idempotent. Sends a message to the supervisor about this job.

```json
{ "note": "optional, max 500", "clientRequestId": "uuid" }
```

```json
{ "data": { "id": "uuid", "sentAt": "2026-11-07T14:22:00.000Z" } }
```

### `GET /jobs/:id/closeout`

```json
{
  "data": {
    "workOrderCode": "WO-100",
    "status": "NOT_SUBMITTED",
    "hoursWorked": 8.5,
    "salesTicket": { "id": "uuid", "code": "ST-100", "status": "SUBMITTED", "amount": 850 },
    "formsMissing": ["JSA"],
    "flaggedItems": [
      { "code": "FORM_MISSING", "message": "JSA not submitted" },
      { "code": "SALES_TICKET_MISSING", "message": "Sales ticket not created" }
    ],
    "canSubmit": false
  }
}
```

`salesTicket` is `null` until one exists. Submit is allowed only when `canSubmit` is true (no missing required forms and a sales ticket exists). `status` before submit is `NOT_SUBMITTED`, or the review’s current status if one was already saved.

### `POST /jobs/:id/closeout`

Idempotent. `422 CLOSEOUT_INCOMPLETE` with `details.items` equal to `flaggedItems` when `canSubmit` is false.

```json
{
  "notes": "optional, max 1000",
  "signatureUrl": "optional url, max 500",
  "clientRequestId": "uuid"
}
```

```json
{ "data": { "id": "review-uuid", "status": "SUBMITTED" } }
```

### `GET /jobs/:id/closeout/status`

```json
{
  "data": {
    "status": "SUBMITTED",
    "decisionNote": null,
    "flaggedItems": []
  }
}
```

Mapped status: no review → `NOT_SUBMITTED`. Review `ACCEPTED` → `APPROVED`. Review `RETURNED` → `NEEDS_REVIEW`. Anything else → `SUBMITTED`. When nothing has been submitted, `decisionNote` is omitted and `flaggedItems` is `[]`.

### `POST /jobs/:id/sales-ticket`

Idempotent. `409 ALREADY_EXISTS` if a ticket already exists. Correct it with PUT.

```json
{
  "lineItems": [{ "item": "Technician labor", "hours": 8, "rate": 95 }],
  "notes": "optional, max 1000",
  "clientRequestId": "uuid"
}
```

1–50 lines. `hours` and `rate` are numbers ≥ 0. `item` is required.

```json
{ "data": { "id": "uuid", "code": "ST-M-…", "status": "SUBMITTED", "amount": 760 } }
```

`amount` is the sum of `hours * rate`.

### `PUT /jobs/:id/sales-ticket`

Same body. `409` with code `NOT_FOUND` and message “No sales ticket to correct.” when none exists. Replaces the lines and sets status back to `SUBMITTED`. Same response shape as create. Also clears a `SALES_TICKET_NEEDS_CORRECTION` notification for that ticket.

---

## 6. Forms and scope-change requests

Bearer required.

### `GET /forms?tab=REQUIRED&workOrderId=`

`workOrderId` is optional. Without it, nothing is marked required (the required set comes from that work order’s customer rules).

| Tab | Items |
|---|---|
| `REQUIRED` (default) | Active forms that match a required rule and have no draft or submission for this employee |
| `OPTIONAL` | Active forms that are not required and have no draft or submission |
| `DRAFT` | This employee’s drafts |
| `SUBMITTED` | This employee’s non-draft submissions |

`REQUIRED` / `OPTIONAL` item:

```json
{ "formId": "uuid", "code": "JSA", "title": "Job Safety Analysis", "version": 3, "required": true }
```

`DRAFT` / `SUBMITTED` item:

```json
{
  "submissionId": "uuid",
  "code": "SFS-M-…",
  "formId": "uuid",
  "status": "SUBMITTED",
  "workOrderCode": "WO-100",
  "submittedAt": "2026-11-07T18:00:00.000Z",
  "updatedAt": "2026-11-07T18:00:00.000Z"
}
```

`submittedAt` is `null` on a draft.

### `GET /forms/:formId/template`

`:formId` may be the form id **or** the form code (`JSA`).

```json
{
  "data": {
    "formId": "uuid",
    "code": "JSA",
    "title": "Job Safety Analysis",
    "version": 3,
    "definition": {}
  }
}
```

`definition` is the form builder JSON stored by admin. Render fields from that object. The app posts answers back as a free-form `values` object keyed however `definition` describes them.

### `PUT /forms/:formId/draft`

Idempotent. Creates a draft or updates the existing draft for this employee + form + work order.

```json
{
  "workOrderId": "optional uuid",
  "values": { "hazard": "H2S", "controls": "Monitor" },
  "signatureUrl": "optional",
  "capturedAt": "2026-11-07T18:00:00.000Z",
  "lat": 32.78,
  "lng": -96.8,
  "clientRequestId": "uuid"
}
```

`values` is required (use `{}` if the form is still empty).

```json
{ "data": { "submissionId": "uuid", "code": "SFS-M-…", "status": "DRAFT" } }
```

### `POST /forms/:formId/submissions`

Same body as save-draft. Same response, with `status: "SUBMITTED"`. If a draft exists for the same employee, form, and work order, that draft is promoted. It does not create a second row.

### `GET /forms/submissions/:id`

`:id` is `submissionId`.

```json
{
  "data": {
    "submissionId": "uuid",
    "code": "SFS-M-…",
    "status": "SUBMITTED",
    "form": { "id": "uuid", "title": "Job Safety Analysis", "definition": {} },
    "values": {},
    "meta": {
      "employee": "Ada Lovelace",
      "signatureUrl": null,
      "capturedAt": "2026-11-07T18:00:00.000Z",
      "gps": { "lat": 32.78, "lng": -96.8 },
      "source": "MOBILE"
    },
    "submittedAt": "2026-11-07T18:00:00.000Z"
  }
}
```

### `GET /forms/corrections`

Open correction requests addressed to this employee (`OPEN` or `NEEDS_INFO`).

```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "code": "FCR-100",
        "formTitle": "JSA",
        "workOrderId": "uuid",
        "customerName": "Acme",
        "issueFlagged": "Missing signature",
        "instruction": "Sign and resubmit",
        "status": "OPEN",
        "createdAt": "2026-11-07T18:00:00.000Z"
      }
    ]
  }
}
```

### `POST /forms/corrections/:id/resubmit`

Idempotent. Allowed while status is `OPEN` or `NEEDS_INFO`. Otherwise `409 INVALID_STATE`.

```json
{
  "values": { "hazard": "H2S" },
  "note": "optional, max 500",
  "clientRequestId": "uuid"
}
```

```json
{ "data": { "id": "uuid", "status": "RESUBMITTED" } }
```

### `POST /additional-form-requests`

Scope change: ask admin to add a form that was not on the job. Idempotent.

```json
{
  "workOrderId": "required uuid",
  "formType": "required, max 150",
  "reason": "required, max 300",
  "scopeChangeDescription": "required, max 500",
  "urgency": "HIGH",
  "photoUrl": "optional",
  "clientRequestId": "uuid"
}
```

`urgency`: `LOW` | `MEDIUM` | `HIGH` | `HIGH_WORK_STOPPED`. `HIGH_WORK_STOPPED` is stored as `HIGH` and the timeline is marked work-stopped. Read it back as `HIGH`.

```json
{ "data": { "id": "uuid", "code": "AFR-M-…", "status": "PENDING" } }
```

### `GET /additional-form-requests`

```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "code": "AFR-M-…",
        "workOrderId": "uuid",
        "formRequested": "Confined space",
        "urgency": "HIGH",
        "status": "PENDING",
        "createdAt": "2026-11-07T18:00:00.000Z"
      }
    ]
  }
}
```

### `GET /additional-form-requests/:id`

```json
{
  "data": {
    "id": "uuid",
    "code": "AFR-M-…",
    "formRequested": "Confined space",
    "reason": "Customer added a vessel",
    "urgency": "HIGH",
    "status": "NEEDS_INFO",
    "reviewer": "Grace Hopper",
    "timeline": [{ "when": "2026-11-07T18:00:00.000Z", "text": "Requested by Ada Lovelace" }],
    "newFormAvailable": false
  }
}
```

`newFormAvailable` is true when status is `FORM_ADDED` or `APPROVED`. Then the new form shows up on `GET /forms?tab=REQUIRED&workOrderId=`.

### `POST /additional-form-requests/:id/respond`

Idempotent. Only when status is `NEEDS_INFO`. Otherwise `400 INVALID_STATE`.

```json
{
  "message": "required, max 500",
  "attachmentUrl": "optional",
  "clientRequestId": "uuid"
}
```

```json
{ "data": { "id": "uuid", "status": "PENDING" } }
```

---

## 7. Timesheet, edits, time off

Bearer required.

### `GET /pay-cycles`

Up to 12 most recent cycles, newest first.

```json
{
  "data": {
    "items": [
      { "id": "uuid", "label": "Nov 1–14", "code": "2026-22", "startDate": "2026-11-01", "endDate": "2026-11-14", "status": "OPEN" }
    ]
  }
}
```

### `GET /timesheet`

Query, all optional:

| Param | Effect |
|---|---|
| `range=CURRENT_WEEK` | Monday–Sunday containing today. This is the default |
| `range=PREVIOUS_DAY` | Yesterday only |
| `range=LAST_WEEK` | The Monday–Sunday before the current week |
| `from` + `to` | Explicit calendar dates. Used when both are set. Wins over `range` |

```json
{
  "data": {
    "from": "2026-11-02",
    "to": "2026-11-08",
    "totals": {
      "regularHours": 40,
      "overtimeHours": 2,
      "nonBillableHours": 1,
      "sickHours": 0,
      "totalHours": 43
    },
    "items": [
      {
        "id": "uuid",
        "workDate": "2026-11-07",
        "clockIn": "07:05",
        "clockOut": "17:00",
        "hours": 8.5,
        "category": "REGULAR",
        "workOrderCode": "WO-100",
        "customerName": "Acme",
        "status": "PENDING",
        "locked": false,
        "gpsFlagged": false,
        "editRequestStatus": null
      }
    ]
  }
}
```

`regularHours` includes `REGULAR` and `ON_JOB_TRAINING`. `sickHours` is approved sick time that overlaps the range, not a timesheet row. `editRequestStatus` is `PENDING` or `NEEDS_CLARIFICATION` when an edit is open, otherwise `null`. `clockOut` is `null` while the shift is open.

Entry `status` values you will see: `PENDING`, `APPROVED`, `REJECTED`, `MISSING_CO`, `LOCKED`.

### `GET /timesheet/entries/:id`

```json
{
  "data": {
    "id": "uuid",
    "workDate": "2026-11-07",
    "clockIn": "07:05",
    "clockOut": "17:00",
    "category": "REGULAR",
    "status": "PENDING",
    "locked": false,
    "workOrderCode": "WO-100",
    "customerName": "Acme",
    "jobLocation": "Well 4",
    "hours": 8.5,
    "billableMinutes": 510,
    "nonBillableMinutes": 0,
    "nonBillableReason": null,
    "gpsRecord": {
      "flagged": false,
      "label": "CLEAR",
      "clockIn": { "lat": 32.78, "lng": -96.8, "distanceMi": 0.2 },
      "clockOut": { "lat": 32.78, "lng": -96.8, "distanceMi": 0.2 },
      "job": { "lat": 32.79, "lng": -96.81 },
      "travelHours": null
    },
    "pauses": [
      { "id": "uuid", "reason": "BREAK", "startedAt": "2026-11-07T16:00:00.000Z", "endedAt": "2026-11-07T16:30:00.000Z" }
    ],
    "activity": [{ "at": "2026-11-07T12:05:00.000Z", "what": "Clocked in (mobile)" }],
    "notes": [{ "id": "n-1", "text": "Waited on crane", "at": "2026-11-07T18:00:00.000Z", "by": "EMPLOYEE" }]
  }
}
```

GPS points are `null` when they were not captured. Employee notes only. Admin notes are not in this list.

### `PUT /timesheet/entries/:id/notes`

Replaces the employee note. Send `""` to clear it.

```json
{ "notes": "Waited on crane" }
```

```json
{ "data": { "saved": true } }
```

Max 500 characters.

### `GET /timesheet/edit-reasons`

Load this for the correction picker. Send `code` back, not the label.

```json
{
  "data": {
    "items": [
      { "code": "FORGOT_CLOCK_IN", "label": "Forgot to clock in" },
      { "code": "FORGOT_CLOCK_OUT", "label": "Forgot to clock out" },
      { "code": "WRONG_JOB", "label": "Clocked in to wrong job" },
      { "code": "GPS_ISSUE", "label": "GPS or connectivity issue" },
      { "code": "DEVICE_ISSUE", "label": "Device problem" },
      { "code": "OTHER", "label": "Other" }
    ]
  }
}
```

### `POST /time-edit-requests`

Idempotent. Does not change the timesheet. HR approves it.

```json
{
  "timeEntryId": "uuid",
  "requestedClockIn": "07:00",
  "requestedClockOut": "17:30",
  "reasonCode": "FORGOT_CLOCK_OUT",
  "notes": "optional, max 500",
  "clientRequestId": "uuid"
}
```

Times are `HH:mm`, max 5 characters. At least one of `requestedClockIn` or `requestedClockOut` is required. Omit a field to keep the original.

`423 ENTRY_LOCKED` when the entry is locked or its status is `LOCKED`. `409 EDIT_ALREADY_PENDING` when a `PENDING` or `NEEDS_CLARIFICATION` request already exists.

```json
{ "data": { "id": "uuid", "status": "PENDING" } }
```

### `GET /time-edit-requests`

```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "timeEntryId": "uuid",
        "workDate": "2026-11-07",
        "status": "NEEDS_CLARIFICATION",
        "originalClockIn": "07:05",
        "originalClockOut": "17:00",
        "requestedClockIn": "07:00",
        "requestedClockOut": null,
        "deltaLabel": "+0.1h",
        "reason": "Forgot to clock in: radio was dead",
        "adminNote": "What time did you arrive?",
        "needsClarification": true,
        "createdAt": "2026-11-07T19:00:00.000Z"
      }
    ]
  }
}
```

`status`: `PENDING` | `NEEDS_CLARIFICATION` | `APPROVED` | `REJECTED`. `needsClarification` is true only for `NEEDS_CLARIFICATION`. Show the reply action in that state.

### `POST /time-edit-requests/:id/respond`

Idempotent. Only when status is `NEEDS_CLARIFICATION`. Otherwise `409 INVALID_STATE`. Moves the request back to `PENDING`.

```json
{
  "message": "required, max 500",
  "attachmentUrl": "optional",
  "clientRequestId": "uuid"
}
```

```json
{ "data": { "id": "uuid", "status": "PENDING" } }
```

### `GET /time-off/balances`

```json
{
  "data": {
    "PTO": { "balance": 40, "annual": 80, "used": 24, "scheduled": 16 },
    "SICK": { "balance": 16, "annual": 40, "used": 8 },
    "HOLIDAY": { "balance": 8, "observed": 8, "taken": 0 }
  }
}
```

Hours. `UNPAID` has no balance.

### `GET /time-off`

```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "type": "PTO",
        "status": "PENDING",
        "startDate": "2026-11-20",
        "endDate": "2026-11-21",
        "dayCount": 2,
        "hoursRequested": 16,
        "reason": "Family",
        "adminNote": null,
        "requestedAt": "2026-11-07T19:00:00.000Z"
      }
    ]
  }
}
```

`type`: `PTO` | `SICK` | `HOLIDAY` | `UNPAID` | `BEREAVEMENT`. The create route only accepts `PTO`, `SICK`, `HOLIDAY`, `UNPAID`.

`status`: `PENDING` | `APPROVED` | `DENIED`.

### `POST /time-off/preview`

Does not create a request. Use it to drive the confirm screen.

```json
{
  "type": "PTO",
  "startAt": "2026-11-20",
  "endAt": "2026-11-21",
  "partialDay": false,
  "partialHours": 4
}
```

`startAt` / `endAt` are ISO dates (or full timestamps; only the calendar date is used). End before start → `400`. A full day is 8 hours. A partial day uses `partialHours` (0.5–24), defaulting to 4 if omitted. `UNPAID` has no balance, so `balanceBefore` and `balanceAfter` are `null` and `sufficient` is true.

```json
{
  "data": {
    "dayCount": 2,
    "hoursRequested": 16,
    "balanceBefore": 40,
    "balanceAfter": 24,
    "sufficient": true
  }
}
```

### `POST /time-off`

Idempotent. Same body as preview, plus:

```json
{
  "type": "PTO",
  "startAt": "2026-11-20",
  "endAt": "2026-11-21",
  "partialDay": false,
  "reason": "optional, max 500",
  "signatureUrl": "optional",
  "clientRequestId": "uuid"
}
```

`422 INSUFFICIENT_BALANCE` when `balanceAfter` would be negative. Unpaid time skips that check.

```json
{ "data": { "id": "uuid", "status": "PENDING" } }
```

### `POST /time-off/:id/cancel`

No body. Only `PENDING` requests. Otherwise `409 INVALID_STATE`.

```json
{ "data": { "id": "uuid", "cancelled": true } }
```

The row is archived and drops off `GET /time-off`.

---

## 8. Notifications

Bearer required. There is no push payload contract yet. Register the device (section 3), then poll.

`GET /notifications` and `GET /notifications/unread-count` also materialize notifications from jobs, time edits, form corrections, sales tickets, closeouts, and additional-form decisions. Call one of them when the app foregrounds.

### Types

| `type` | User should |
|---|---|
| `NEW_JOB_ASSIGNED` | Open the job (`reference.id` is the assignment id) and accept or decline |
| `JOB_REASSIGNED` | Informational |
| `GPS_FLAG_NEEDS_EXPLANATION` | Open the GPS flag and submit an explanation |
| `TIME_CORRECTION_NEEDS_INFO` | Reply on the edit request |
| `TIME_CORRECTION_APPROVED` | Informational |
| `TIME_CORRECTION_REJECTED` | Informational. `body` may contain the admin note |
| `FORM_CORRECTION_REQUESTED` | Resubmit the form |
| `ADDITIONAL_FORM_NEEDS_INFO` | Reply on the scope-change request |
| `ADDITIONAL_FORM_APPROVED` | The form is available on the job |
| `ADDITIONAL_FORM_DENIED` | Informational |
| `SALES_TICKET_NEEDS_CORRECTION` | `PUT` the sales ticket. `reference.id` is the ticket id. The jobs route still needs the assignment id |
| `CLOSEOUT_NEEDS_REVIEW` | Open closeout. `reference.id` is the **work order id** |
| `OFFLINE_SYNC_FAILED` | Something the server recorded as a failed sync |

`reference` is `{ "type": "JOB" | "GPS_FLAG" | "EDIT_REQUEST" | "FORM_CORRECTION" | "ADDITIONAL_FORM_REQUEST" | "SALES_TICKET" | "CLOSEOUT", "id": "uuid" }`, or `null`.

### `GET /notifications?tab=ALL&page=1&pageSize=25`

`tab`: `ALL` (default) | `UNREAD` | `ACTION_REQUIRED` | `RESOLVED`.

```json
{
  "data": {
    "items": [
      {
        "id": "uuid",
        "type": "NEW_JOB_ASSIGNED",
        "title": "New job assigned",
        "body": "WO-100 needs your response.",
        "actionLabel": "Respond",
        "reference": { "type": "JOB", "id": "assignment-uuid" },
        "requiresAction": true,
        "resolved": false,
        "read": false,
        "createdAt": "2026-11-07T14:00:00.000Z"
      }
    ],
    "page": 1,
    "pageSize": 25,
    "total": 1,
    "unreadCount": 1
  }
}
```

`actionLabel` is `null` on informational items. `resolved` is true when the underlying action is done, or when an informational item has been marked read.

### `GET /notifications/unread-count`

```json
{ "data": { "unreadCount": 3, "actionRequiredCount": 1 } }
```

Use `actionRequiredCount` for the home-screen attention badge. `GET /home` also returns `attentionCount` and `unreadNotifications`.

### `POST /notifications/:id/read`

No body.

```json
{ "data": { "id": "uuid", "read": true } }
```

### `POST /notifications/read-all`

No body.

```json
{ "data": { "updated": 3 } }
```

`updated` is how many rows changed from unread to read.

---

## 9. Suggested call order

1. `POST /auth/otp/request` → user enters the code → `POST /auth/otp/verify` with `purpose: "LOGIN"`.
2. Store `accessToken`. Send it on every later call.
3. `POST /devices` with the install id and push token.
4. `GET /me` and `GET /home` to paint the shell.
5. Poll `GET /notifications/unread-count` on foreground.
6. Before the token’s `expiresAt`, `POST /auth/refresh` and replace the stored token.
7. On logout, `POST /auth/logout` with `deviceId`, then delete the token locally.

Offline clock actions go into a local queue and flush with `POST /clock/sync` in chronological order. Do not also call the live clock route for an event you have queued.

---

## 10. Fleet — same records as the admin portal

These routes call the admin fleet services. A row created or changed here is the row Fleet → Assets, Inspections, Calibration, Repair Requests, Trucks, and Unaccounted already list. Paths are under `/mobile/v1/fleet`. The signed-in employee is the inspector and the checkout holder. Inspection `source` is always `MOBILE_APP`.

| Method | Path | What the admin portal shows |
|---|---|---|
| `GET` | `/fleet/truck` | The truck assigned on the employee record |
| `GET` | `/fleet/assets` | Assets on that truck, plus assets checked out to this employee |
| `GET` | `/fleet/assets/:code` | Asset detail |
| `POST` | `/fleet/assets/:code/checkout` | Asset status becomes Checked Out |
| `POST` | `/fleet/assets/:code/check-in` | Holder is cleared |
| `POST` | `/fleet/assets/:code/missing` | A locating row on Unaccounted Equipment |
| `GET` | `/fleet/inspections` | Inspections for the assigned truck |
| `GET` | `/fleet/inspections/form-options` | Assets, checklists, and types for a new record |
| `POST` | `/fleet/inspections` | A new inspection. Body matches the admin create-record fields (`assetCode`, `inspectedAt`, `type`, `checklistItems`). `inspectorName` and `source` are set by the server |
| `GET` | `/fleet/inspections/:id` | Inspection detail |
| `GET` | `/fleet/calibration` | Calibration rows for the assigned truck |
| `POST` | `/fleet/calibration` | A new calibration row. Body: `assetCode`, optional `result` (`PASS`, `PASS_WITH_ADJUSTMENT`, `FAILED`, `NOT_DONE`), `lastCalAt`, `frequencyDays`, `calType`, `lot`, `notes`. Technician and parent truck are taken from the signed-in employee |
| `GET` | `/fleet/calibration/:id` | Calibration detail |
| `GET` | `/fleet/repairs` | Repair requests for the assigned truck |
| `POST` | `/fleet/repairs` | A new repair request. Body: `assetCode`, `issue`, optional `priority` (`URGENT`, `HIGH`, `MEDIUM`, `LOW`) and `notes`. Reported by the signed-in employee, filed on the assigned truck |
| `GET` | `/fleet/repairs/:id` | Repair detail |
| `POST` | `/fleet/assets/:code/move` | Moves the asset. Body: `to` (a truck or location name the portal already has) and `reason`. The movement log and truck readiness update |
| `POST` | `/fleet/assets/:code/notes` | Adds a note. Body: `text`. It shows on the asset Notes tab |

`POST /time-off` and time-off preview use the HR time-off service, so the request appears on the admin time-off list with the same balance. A time-edit request sets the employee open-edit flag the HR list reads. Clock-in, job accept/decline, and safety-form submissions already write the tables those admin screens list.
