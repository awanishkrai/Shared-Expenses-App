const groupSchema = {
    tableName: 'groups',
    fields: {
        id: 'INT AUTO_INCREMENT PRIMARY KEY',
        name: 'VARCHAR(200) NOT NULL',
        created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
    }
};

module.exports = groupSchema;
