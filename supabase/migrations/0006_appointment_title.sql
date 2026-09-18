-- Lets the lead detail page list booked appointments without re-fetching
-- from the Google Calendar API just to show what an appointment is called.
alter table appointments add column title text;
