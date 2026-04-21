-- AgriLink System Audit & Live Monitoring Schema
-- Strictly aligned with concise audit requirements

DROP TABLE IF EXISTS system_logs;

CREATE TABLE system_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    correlation_id VARCHAR(64),

    user_id INT NULL,
    user_name VARCHAR(150) NULL,
    user_role VARCHAR(80) NULL,

    action VARCHAR(100) NOT NULL,
    event_type VARCHAR(80) NULL,
    module VARCHAR(80) NULL,
    description TEXT NULL,
    category VARCHAR(100) NULL,
    severity VARCHAR(50) NULL,

    method VARCHAR(10) NULL,
    endpoint VARCHAR(255) NULL,
    http_status INT NULL,

    error_code VARCHAR(100) NULL,
    error_message TEXT NULL,

    ip_address VARCHAR(64) NULL,
    user_agent TEXT NULL,
    duration_ms INT NULL,

    before_data JSON NULL,
    after_data JSON NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX idx_logs_created_at ON system_logs(created_at);
CREATE INDEX idx_logs_category ON system_logs(category);
CREATE INDEX idx_logs_severity ON system_logs(severity);
CREATE INDEX idx_logs_user ON system_logs(user_id);

-- Initial Monitoring Entry
INSERT INTO system_logs (user_name, user_role, action, module, description, category, severity)
VALUES ('Platform Engine', 'System', 'Live Monitoring Initialized', 'Core', 'System audit logs successfully transitioned to concise schema.', 'System', 'success');
