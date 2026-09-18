-- Phase 6: the tracked Twilio number (organizations.phone_number, already
-- existed) needs somewhere to forward calls to — the owner/staff's real
-- cell — per the confirmed missed-call design (ring through first, only
-- treat as missed on true no-answer).
alter table organizations add column forwarding_phone_number text;

-- Twilio's <Dial> action callback reports "canceled" (caller hung up before
-- anyone answered) as a distinct DialCallStatus from busy/no-answer/failed.
alter type call_event_status add value 'canceled';
