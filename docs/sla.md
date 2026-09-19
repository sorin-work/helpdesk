# How SLAs and business hours work

## Targets

Each priority has two targets, set under **Settings**:

- **First response**: time until the first _public_ reply from the team.
  Internal notes do not count.
- **Resolution**: time until the ticket is solved.

A target either runs on **business hours** or **24/7**. The defaults are:

| Priority | First response | Resolution | Clock          |
| -------- | -------------- | ---------- | -------------- |
| Urgent   | 1 hour         | 8 hours    | 24/7           |
| High     | 4 hours        | 2 days     | business hours |
| Normal   | 1 day          | 5 days     | business hours |
| Low      | 2 days         | 10 days    | business hours |

"A day" in business hours is one working window, e.g. 8 hours for 09:00-17:00.

## Business hours

The schedule has a time zone, one working window per weekday (or none for days
off) and a list of holidays. Business time only passes inside a window:

- A ticket opened at 16:00 on a Friday with a 2-hour target is due at 10:00 on
  Monday.
- A ticket opened at night starts counting when the next window opens.
- A target that runs out exactly at closing time is due at closing time.
- Windows follow the local clock, so they shift with daylight saving. If a
  window starts at a time that does not exist on the day the clocks go forward,
  it starts at the first valid instant.

## Due dates and pauses

Due dates are worked out when a ticket is created and again when its priority
changes. While a ticket is **pending** (waiting on the customer) or **on hold**
(waiting on someone else) the resolution clock is paused. When it comes back,
the business time it spent paused is added to the target, so the customer's
response time is not held against the team.

## States

| State      | Meaning                                       |
| ---------- | --------------------------------------------- |
| `on_track` | More than an hour left                        |
| `due_soon` | An hour or less left                          |
| `breached` | The target passed before the reply or solve   |
| `met`      | Replied or solved in time                     |
| `paused`   | Resolution clock stopped (pending or on hold) |
| `none`     | No target                                     |

The **Overdue** queue lists unsolved tickets with a breached first response,
or a breached resolution target whose clock is running.

## Reports

When a ticket gets its first public reply, and when it is solved, the elapsed
business minutes (minus paused time) are stored on the ticket. Reports use
those numbers, so changing the schedule later does not rewrite history.
Compliance counts every ticket created in the period whose clock has finished
(met or breached); tickets still on track are left out.
