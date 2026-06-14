// making expense table for keeping expense records
const expenseSchema = {
    tableName: 'expenses',
    fields: {
        id: 'INT AUTO_INCREMENT PRIMARY KEY',
        group_id: 'INT NOT NULL',
        description: 'VARCHAR(500) NOT NULL',
        paid_by: 'INT DEFAULT NULL',
        amount: 'DECIMAL(15,2) NOT NULL',
        currency: 'CHAR(3) DEFAULT NULL',
        amount_inr: 'DECIMAL(15,2) DEFAULT NULL',
        fx_rate_used: 'DECIMAL(15,6) DEFAULT NULL',
        expense_date: 'DATE NOT NULL',
        split_type: "ENUM('equal','unequal','percentage','share') DEFAULT NULL",
        status: "ENUM('active','pending','voided','blocked') DEFAULT 'active'",
        import_session_id: 'INT DEFAULT NULL',
        notes: 'TEXT',
        created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    },
    constraints: [
        'FOREIGN KEY (group_id) REFERENCES groups(id)',
        'FOREIGN KEY (paid_by) REFERENCES users(id)',
        'FOREIGN KEY (import_session_id) REFERENCES import_sessions(id)'
    ]
};

module.exports = expenseSchema;