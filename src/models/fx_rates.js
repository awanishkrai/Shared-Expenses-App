// Schema for foreign exchange rates used to convert currencies
const fxRatesSchema = {
  tableName: 'fx_rates',
  fields: {
    id: 'INT AUTO_INCREMENT PRIMARY KEY',
    from_currency: 'CHAR(3) NOT NULL',
    to_currency: 'CHAR(3) NOT NULL',
    rate: 'DECIMAL(10,6) NOT NULL',
    effective_date: 'DATE NOT NULL'
  },
  constraints: [
    'UNIQUE KEY (from_currency, to_currency, effective_date)'
  ]
};

module.exports = fxRatesSchema;
