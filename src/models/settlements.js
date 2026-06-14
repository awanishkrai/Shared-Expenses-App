const settlementsSchema = {
    tableName: 'settlements',
    fields: {
        id: 'INT AUTO_INCREMENT PRIMARY KEY',
        group_id: 'INT NOT NULL',
        payer_id: 'INT NOT NULL',
        payee_id: 'INT NOT NULL',
        amount: 'DECIMAL(15,2) NOT NULL',
        currency: "CHAR(3) DEFAULT 'INR'",
        transaction_type: "ENUM('settlement','deposit') DEFAULT 'settlement'",
        settlement_date: 'DATE NOT NULL',
        import_session_id: 'INT DEFAULT NULL',
        notes: 'TEXT',
        created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    },
    constraints: [
        'FOREIGN KEY (group_id) REFERENCES groups(id)',
        'FOREIGN KEY (payer_id) REFERENCES users(id)',
        'FOREIGN KEY (payee_id) REFERENCES users(id)',
        'FOREIGN KEY (import_session_id) REFERENCES import_sessions(id)',
        'CHECK (payer_id <> payee_id)'
    ]
};

module.exports = settlementsSchema;