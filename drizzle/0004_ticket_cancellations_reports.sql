ALTER TABLE tickets ADD COLUMN status TEXT NOT NULL DEFAULT 'paid';

ALTER TABLE tickets ADD COLUMN cancelled_at TEXT;

ALTER TABLE tickets ADD COLUMN cancel_reason TEXT;

ALTER TABLE tickets ADD COLUMN cancelled_by TEXT;

CREATE INDEX IF NOT EXISTS idx_tickets_status
ON tickets(status);
