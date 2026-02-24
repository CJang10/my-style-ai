# App Pivot: From AI Stylist → Social Closet Community

**Date:** 2026-02-24
**Status:** Planning

---

## 0. The Pivot in One Sentence

A social closet community where you discover nearby people's wardrobes, trade clothes you're done with for ones you want, and borrow pieces for occasions — built on sustainability, style discovery, and the human ritual of fashion that AI was never going to replace.

---

## 1. The New Concept

The original insight behind My Style AI was right — people care deeply about what they wear. But the execution was solving the wrong problem. Replacing the human experience of fashion with automation removes the thing that makes fashion meaningful for its core audience: **the social ritual of it**.

Women don't just want to dress well. They want to share a look with a friend, borrow a dress for a night out, discover someone across town whose wardrobe is exactly their vibe. The moment of "you have to come see my closet" — that's the product.

**The new concept:** A social closet community. Think Instagram meets a dating app, but for your wardrobe.

- You photograph and post your closet publicly (or keep it private)
- You discover other people's closets nearby or by style affinity
- You can follow, admire, request to borrow, or arrange a trade
- The app facilitates the connection; the human interaction does the rest

The core loop: **browse → discover → connect → share**

This isn't about automating style. It's about making it easier to find your style tribe and share your wardrobe the way people already do with their closest friends — just at scale.

---

## 2. What Stays the Same

The existing foundation maps cleanly onto the new concept. Nothing is wasted.

| What | Why it stays |
|---|---|
| **Auth & user profiles** | Same shape — name, location, style tags, age all matter for discovery |
| **Closet items with photos** | This IS the product now, not just an AI input |
| **Style photos / inspiration uploads** | Becomes a profile/mood board feature — shows your aesthetic |
| **Supabase backend** | Auth, RLS, storage, edge functions — all still the right choice |
| **React + Vite frontend** | Solid, no reason to change |
| **The design system** | Luxury fashion palette (gold, cream, Playfair Display) fits the new brand even better |
| **Onboarding flow** | Style preferences become your discovery filter, not just AI input |

---

## 3. What Needs to Change

### Core value proposition
**Before:** "AI replaces the work of getting dressed"
**After:** "Find your fashion community and share your closet"

The AI doesn't go away — it becomes a helper for uploading items (auto-tag category, color, season from a photo) rather than the main event.

### Navigation & UX
The current app is a personal tool with a sidebar. The new app is a social feed with a bottom nav (mobile-first). The mental model shifts from "my dashboard" to "discover / my closet / inbox / profile".

### Database additions needed
- `closet_items` — add `is_public` (bool) and `available_to_borrow` (bool) fields
- New table: `follows` — (follower_id, following_id)
- New table: `borrow_requests` — (requester_id, owner_id, item_id, status, message)
- New table: `closet_likes` — (user_id, item_id or profile_id)
- New table: `messages` — basic DM thread for coordinating borrows/trades
- `profiles` — add `is_public` (bool), `closet_city` (for discovery), `username` (handle)

### App name
"My Style AI" no longer fits. The AI is secondary. The brand should reflect community and closet sharing.

### The Shop & Dashboard pages
Shopping recs and daily outfit generation become optional/secondary. They can stay as a feature but shouldn't be the primary navigation destination.

---

## 4. Core Features for Launch

These are the minimum features needed to deliver the core loop and validate the concept.

### 1. Public Closet Profiles
- Each user has a public profile showing their closet (or a curated selection)
- Profile includes: username, city, style tags, closet grid
- Items can be marked public/private, available to borrow or not

### 2. Discovery Feed
- Browse closets by **location** (people near you) or **style tags** (e.g., streetwear, vintage, minimalist)
- Card-based or swipe-based UI — swipe right to save/follow, left to pass
- Filter by: city, style, size (future), item type

### 3. Follow System
- Follow users whose style you love
- Home feed shows new closet items from people you follow
- Follower/following count on profile

### 4. Trade & Borrow Requests

**Trade (primary mechanic)**
- On any public item, tap "Offer a Trade" — select which of your own items you're offering in exchange
- Owner reviews your offer and can accept, counter, or decline
- If accepted: both parties choose ship or local meetup to coordinate handoff
- Status flow: pending → accepted → in transit / meeting up → completed

**Borrow (secondary mechanic)**
- Tap "Request to Borrow" — set requested dates
- Owner accepts → borrower pays a deposit equal to the item's set value (held by the platform)
- Item returned in good condition → deposit released in full
- Item damaged or not returned → deposit goes to owner
- Platform takes a 5–10% fee on borrow deposits (Phase 2 revenue)

### 5. Direct Messaging
- Basic DM to coordinate borrow/trade logistics
- Triggered from a borrow request — keeps context attached
- Not a general chat; keep it transactional for v1

### 6. AI-Assisted Item Upload (keep, repurpose)
- When adding a closet item, optionally analyze the photo to auto-fill name, category, color, season
- Reduces friction for building out your closet
- Still uses the existing `analyze-photo` edge function mode

---

---

## 5. Revenue Model

### Phase 1 — Launch (free, no monetization)
Get real users trading in one city. Prove the loop works. Don't charge anyone.
Every social platform that got acquired was built on engagement first, revenue second.

### Phase 2 — First revenue
**Premium subscription ($8–12/month)**
The dating-app model applied to closet discovery.

| Free | Premium |
|---|---|
| 3 trades/month | Unlimited trades |
| Basic location discovery | Advanced filters (size, brand, style era) |
| Standard feed placement | Priority in discovery |
| — | See who liked your closet |
| — | Extended borrow windows |

**Borrow platform fee (5–10%)**
Borrows involve a real deposit transaction. Take a cut of every deposit processed. Small per transaction, real at scale.

### Phase 3 — Growth revenue
- **Shipping integration** — Partner with a label API (Shippo/EasyPost). Offer prepaid labels through the app, pocket the margin. This is how Poshmark makes serious money.
- **Boosted listings** — Pay $1–3 to feature an item at the top of local discovery for 24h. Impulse purchase, low friction.
- **Brand partnerships** — Once you have a real Gen Z sustainable-fashion audience, brands (Everlane, Reformation, Patagonia, vintage resellers) pay to be associated. Sponsored drops, affiliate links for "buy new" recommendations.

### Phase 4 — Scale revenue (acquisition territory)
- **Buy/Sell layer** — Add ability to sell items outright, take 10–15% commission like Depop. Sits alongside trading, doesn't replace it.
- **Authentication service** — For designer/luxury items, charge $5–15 for a verified authenticity badge. StockX and The RealReal built entire businesses on this.

### Comparable exits
| Company | Model | Exit |
|---|---|---|
| Depop | Social resale, 10% fee | $1.6B to Etsy (2021) |
| Poshmark | Social selling + community | $1.2B to Naver (2022) |
| Vinted | Peer-to-peer fashion | ~$5B valuation |

---

## Out of Scope for v1

- In-app payments (borrow deposits come in Phase 2)
- Shipping/logistics integration
- Size matching
- Feed algorithmic ranking (start with chronological + location)
- Push notifications (email is fine for v1)
- Buy/sell layer
