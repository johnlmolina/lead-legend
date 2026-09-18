-- One conversation per lead per channel. Enforced at the DB level, not just
-- in getOrCreateConversation()'s find-then-insert logic, which has a race
-- window under concurrent calls (relevant once Phase 6 adds a webhook path
-- that can run concurrently with a staff action).
create unique index conversations_lead_id_channel_key on conversations (lead_id, channel);
