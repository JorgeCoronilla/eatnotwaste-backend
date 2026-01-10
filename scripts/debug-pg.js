const { Client } = require('pg');

const config = {
  connectionString: 'postgresql://postgres:LWbIzFMXIilmDssqCxSFxIQqXYncErZh@centerbeam.proxy.rlwy.net:55367/railway',
  ssl: false
};

console.log('Testing connection with pg client...');
console.log('Target:', config.connectionString);
console.log('SSL:', config.ssl);

const client = new Client(config);

client.connect()
  .then(() => {
    console.log('✅ Connected successfully!');
    return client.query('SELECT NOW()');
  })
  .then(res => {
    console.log('Time from DB:', res.rows[0].now);
    return client.end();
  })
  .catch(err => {
    console.error('❌ Connection failed:', err);
    client.end();
  });
