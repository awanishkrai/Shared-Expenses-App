const importSessionSchema = {
    tableName: 'import_sessions',
    fields: {
        id: 'INT AUTO_INCREMENT PRIMARY KEY',
        filename: 'VARCHAR(500)',
        status: "ENUM('processing','complete','failed') DEFAULT 'processing'",
        row_count: 'INT DEFAULT 0',
        created_at: 'DATETIME DEFAULT CURRENT_TIMESTAMP'
    }
};

module.exports = importSessionSchema;
