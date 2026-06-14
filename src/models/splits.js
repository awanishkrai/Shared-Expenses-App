const splitsSchema = {
    tableName: 'splits',
    fields: {
        id: 'INT AUTO_INCREMENT PRIMARY KEY',
        expense_id: 'INT NOT NULL',
        user_id: 'INT NOT NULL',
        share_amount: 'DECIMAL(15,2) NOT NULL',
        share_pct: 'DECIMAL(6,3) DEFAULT NULL',
        share_units: 'INT DEFAULT NULL',
        created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP',

    },
    constraints: [
        'FOREIGN KEY (expense_id) REFERENCES expenses(id)',
        'FOREIGN KEY (user_id) REFERENCES users(id)'
    ]
}

module.exports = splitsSchema