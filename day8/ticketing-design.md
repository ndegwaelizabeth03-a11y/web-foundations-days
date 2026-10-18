# TicketHub: System Design

## 1. Requirements

**Functional**
- Browse events and view the seat map; hold seats for a few minutes, pay and receive tickets; view my tickets.

**Non-functional**
- **Speed:** pages load in under 1 s; a seat hold answers in under 500 ms, even in a big sale.
- **Correctness:** a seat is never sold twice; no one pays for a seat they do not get; no ticket is lost after payment.
- **Fairness:** first come, first served; at most 6 seats per order; rate limits stop bots.
- **Availability:** 99.9%, surviving a spike of hundreds of times normal traffic.

## 2. Estimates

Assumptions: 86,400 s/day; peak = 5x average; a buyer makes about 10 requests (open event, view seats, hold, pay).

| | Normal day | Big sale (first 10 minutes) |
|---|---|---|
| People | 50,000 visitors | 200,000 buyers for 20,000 seats |
| Requests | 50,000 x 10 = 500,000/day = **5.8/s** average, **29/s** peak | 200,000 x 10 / 600 s = **3,333/s** |
| Tickets sold | 5,000/day = **0.06/s** | 20,000 / 600 s = **33/s** if all sell |

**Comparison:** the sale is about 575x the normal average (3,333 / 5.8) and 115x the normal peak. With 10 buyers per seat, 90% will lose, so "sold out" must be quick and fair. Successful writes stay small (33/s); the danger is the flood of reads and hold attempts.

## 3. API

| Method | Path | Purpose | Success |
|---|---|---|---|
| GET | /events | List and search events | 200 |
| GET | /events/{id} | Event details | 200 |
| GET | /events/{id}/seats | Seat map with status | 200 |
| POST | /events/{id}/holds | Hold seats `{"seatIds":[12,13]}` | 201 |
| DELETE | /holds/{id} | Release a hold | 204 |
| POST | /orders | Pay for a hold `{"holdId":9,"paymentToken":"..."}` (with `Idempotency-Key` header) | 201 |
| GET | /me/tickets | My tickets | 200 |

Errors: 400, 401, 404, 409 (seat taken/expired), 429.

## 4. Data model

```text
users(id PK, email UNIQUE, name)
events(id PK, name, venue, starts_at, on_sale_at)
seats(id PK, event_id FK, section, row_no, seat_no, price_cents,
      status, held_by FK users, hold_expires_at,
      UNIQUE(event_id, section, row_no, seat_no))
orders(id PK, user_id FK, event_id FK, status, total_cents,
       idempotency_key UNIQUE, created_at)
tickets(id PK, order_id FK, seat_id FK UNIQUE)
```

Relationships: a user has many orders; an event has many seats; an order has many tickets; a seat has at most one ticket (UNIQUE seat_id).

### Preventing two people buying the same seat

1. **Atomic hold.** One conditional UPDATE decides the winner:
   ```sql
   UPDATE seats SET status='held', held_by=:user,
          hold_expires_at = now() + interval '5 minutes'
   WHERE id=:seat AND (status='available'
         OR (status='held' AND hold_expires_at < now()));
   ```
   The database locks the row, so two simultaneous requests run one after the other; the second finds the seat held, updates 0 rows and gets 409. Several seats are held in one transaction (sorted by id to avoid deadlocks): all or none.
2. **Transactional purchase.** In one transaction we lock the seat (`SELECT ... FOR UPDATE`), check it is held by this user and not expired, insert the ticket, mark the seat `sold` and commit; any failure rolls everything back.
3. **Constraint as the last guard.** `UNIQUE(seat_id)` on tickets makes the database reject a second ticket for the same seat, even if the code has a bug.
4. **The cache is never trusted.** The seat map may be a second old, but only the primary database decides a hold or sale. An idempotency key stops a retried payment creating two orders.

## 5. Architecture

```text
 [Client] -> [DNS] -> [CDN] -> [Load Balancer]
                                     |
                         [Waiting Room (queue)]
                                     |
                      [App Server 1] [App Server 2] ...
                        |        |         |
                    [Cache]  [Primary DB]  [Job Queue]
                                 |             |
                          [Read Replica]   [Workers] -> [Payment Provider]
```

- **CDN:** serves images and static pages near users, away from our servers.
- **Load balancer:** spreads requests over app servers, skipping unhealthy ones.
- **Waiting room:** admits users at a controlled rate (for example 300/s), in order of arrival, so the database is not flooded.
- **App servers:** stateless API code; add more to scale.
- **Cache:** holds event pages, a 1-2 second seat-map snapshot and a "sold out" flag, so most reads skip the database.
- **Primary database:** the source of truth for seats and orders; all holds and sales go through it.
- **Read replica:** serves browsing queries so the primary handles only holds and sales.
- **Job queue and workers:** handle payments, emails and expired holds outside the user's request.

**Surviving the big sale:** servers are scaled up before `on_sale_at`; the waiting room limits entry; the cache and CDN absorb most reads; rate limits stop bots; once the sold-out flag is set, requests are refused without touching the database. Only about 33 successful holds a second reach the database.

## 6. Trade-offs

1. **Hold length (5 minutes):** longer gives buyers time to pay but unpaid holds lock seats others want; shorter frees seats sooner but more buyers lose a seat mid-payment.
2. **Cached seat map vs accuracy:** a 1-2 second old map protects the database, but users sometimes click a seat just taken and see a 409; correctness is still enforced by the database.
3. **Waiting room vs experience:** it protects the system and gives fairness, but adds waiting and complexity.