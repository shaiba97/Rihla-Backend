const { io } = require('socket.io-client');

const PORTS = { admin: 3000, company: 3001, customer: 3002 };
const BASE = 'http://localhost';

async function testConnection(name, url) {
  return new Promise((resolve) => {
    const socket = io(url, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
    });
    const timeout = setTimeout(() => {
      socket.close();
      resolve({ name, success: false, error: 'timeout' });
    }, 5000);

    socket.on('connect', () => {
      clearTimeout(timeout);
      console.log(`✅ ${name} connected (${url}) - socket id: ${socket.id}`);

      socket.emit('join:room', 'admin');
      socket.emit('join:room', 'public');
      socket.emit('join:room', 'company:test-company-id');
      socket.emit('join:room', 'customer:test-customer-id');
      socket.emit('watch:seats', 'test-trip-id');

      console.log(`   ${name}: joined rooms ✓`);

      setTimeout(() => {
        socket.close();
        resolve({ name, success: true });
      }, 500);
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timeout);
      console.log(`❌ ${name} connect_error: ${err.message}`);
      resolve({ name, success: false, error: err.message });
    });
  });
}

async function main() {
  console.log('Testing WebSocket connections...\n');

  const results = await Promise.all(
    Object.entries(PORTS).map(([name, port]) =>
      testConnection(name, `${BASE}:${port}`)
    ),
  );

  console.log('\n--- Results ---');
  const allOk = results.every((r) => r.success);
  results.forEach((r) => {
    console.log(`${r.success ? '✅' : '❌'} ${r.name}: ${r.success ? 'OK' : r.error}`);
  });

  if (allOk) {
    console.log('\n✅ All 3 WebSocket servers are working!');
  } else {
    console.log('\n❌ Some WebSocket servers failed');
    process.exit(1);
  }
}

main();
