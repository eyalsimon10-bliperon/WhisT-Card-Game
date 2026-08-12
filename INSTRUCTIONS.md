# WhisT (Mini-Bridge) - Multiplayer Card Game

## Overview

Web application for a 4-player trick-taking card game played with a standard deck (1-10 + J, Q, K, A).

Mobile-first design.

## Technical Stack

- Framework: Next.js (React)
- Styling: Tailwind CSS
- Real-time Backend: Supabase (or Firebase)
- Hosting: Vercel

## Core Game Features

1. **User Auth / Guest Join:** Enter display name without mandatory login.
2. **Room Management:**
   - Create a Private Room (Generates a unique 6-character Code).
   - Join Room via Code or Direct Share Link.
   - Quick Match (Join any open waiting room).
   - Play vs Bots (permanent practice mode).
3. **Lobby:** Shows connected players (1 to 4/4) and a "Start Game" button.
4. **Game Table UI (Mobile Vertical):**
   - Bottom: Player's hand (large, touch-friendly cards).
   - Top & Sides: Opponents/Partner names and status.
   - Center: Played cards area for current trick.
   - Scoreboard and current round status.

## Game Rules & Logic (WEST / Mini-Bridge)

1. **Deck:** Standard 52 cards (1-10, J, Q, K, A).

2. **Deal:** 13 cards to each of the 4 players.

3. **Bidding / Declarations:**
   - First bidder: first player to join the room or the opener. After each round, bidding starts with the player to their left (clockwise).
   - **Phase 1 — Contract & Trump:** Minimum bid is 5 tricks + suit (♠ עלה, ♥ לב, ♦ יהלום, ♣ תלתן, or NT). PASS available. After a bid, each opponent's PASS is tracked visibly. When 3 players PASS, the high bidder confirms the contract (may change trump to an equal-or-higher bid). Trick bidding then starts with the player to the left of the contract winner.
   - **Trump hierarchy (weakest to strongest):** ♣ תלתן < ♦ יהלום < ♥ לב < ♠ עלה < NT
   - At same trick level, only a higher trump is valid (e.g. after 5♥, 5♣ and 5♦ are invalid; 5♠ or 6♦ are valid).
   - **4 PASS with no bid:** Each player passes 3 cards to the player on their left. Bidding restarts from the same opener with minimum +1 (6, then 7, etc.).
   - **Phase 2 — Trick bids:** The contract winner's tricks are set from Phase 1. The other 3 players bid 0–13 tricks each.
   - **Sum ≠ 13 rule:** The last of the 3 trick bidders cannot choose a number that makes total bids equal 13.

4. **Gameplay:**
   - Contract winner leads the first trick.
   - Follow suit is mandatory when possible.
   - Trump cuts when void in led suit (unless NT).
   - Highest card of led suit wins, unless trumped — then highest trump wins.

5. **Scoring (when all players met their bids):**
   - Exact bid: bid² + 10 (e.g. bid 4, took 4 → 26 points).
   - Zero bid success: 25 points (OVER — total bids ≥ 14) or 50 points (UNDER — total bids ≤ 12).
   - Missed bid: −10 per trick off (e.g. bid 4, took 2 or 6 → −20).
   - Zero bid failure: −25 (OVER) or −50 (UNDER), with +10 recovery per extra trick beyond the first.

6. **Void Round (סיבוב ללא ניקוד):**
   - If **all 4** players failed to meet their trick bid (tricks won ≠ bid), the round is still counted toward the total number of rounds, but **no scoring applies to anyone**.
   - All players receive **0 points** for that round — no bonuses and no penalties.
   - If only some players missed their bids, normal scoring applies (Section 5) for everyone.
   - The round advances normally to the next round.

7. **Match settings:**
   - Host chooses number of rounds (5–13, default 13).

8. **History:** Record of past games with date, participants, and scores.
