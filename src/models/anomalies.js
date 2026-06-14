const importAnomaliesSchema = {
    tableName: 'import_anomalies',
    fields: {
        id: 'INT AUTO_INCREMENT PRIMARY KEY',
        session_id: 'INT NOT NULL',
        row_number: 'INT NOT NULL',
        anomaly_type: 'VARCHAR(50) NOT NULL',
        raw_data: 'JSON',
        description: 'TEXT NOT NULL',
        proposed_action: 'TEXT NOT NULL',
        status: "ENUM('pending','approved','rejected','auto_resolved') DEFAULT 'pending'",
        resolved_by: 'INT DEFAULT NULL',
        resolved_at: 'DATETIME DEFAULT NULL',
        created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    },
    constraints: [
        'FOREIGN KEY (session_id) REFERENCES import_sessions(id)',
        'FOREIGN KEY (resolved_by) REFERENCES users(id)'
    ],
    indexes: [
        'INDEX idx_session_id (session_id)',
        'INDEX idx_anomaly_type (anomaly_type)',
        'INDEX idx_status (status)',
        'INDEX idx_resolved_by (resolved_by)'
    ]
};

module.exports = importAnomaliesSchema;