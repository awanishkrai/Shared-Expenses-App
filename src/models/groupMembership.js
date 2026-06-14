const membershipSchema = {
  tableName: 'group_memberships',
  fields: {
    id: 'INT AUTO_INCREMENT PRIMARY KEY',
    user_id: 'INT NOT NULL',
    group_id: 'INT NOT NULL',
    joined_at: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
    left_at: 'TIMESTAMP NULL DEFAULT NULL'
  },
  constraints: [
    'UNIQUE KEY (user_id, group_id, joined_at)',
    'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
    'FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE'
  ]
};

module.exports = membershipSchema;
