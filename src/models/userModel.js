const UserSchema = {
  tableName: 'users',
  fields: {
    id: 'INT AUTO_INCREMENT PRIMARY KEY',
    username: 'VARCHAR(255) NOT NULL',
    email: 'VARCHAR(255) NOT NULL UNIQUE',
    password: 'VARCHAR(255) NOT NULL',
    is_guest: 'BOOLEAN DEFAULT FALSE',
    created_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    updated_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
  }
};

module.exports = UserSchema;
