
const Redis = require('ioredis');

const client = new Redis('redis://localhost:6379');

client.on('error', (err) => console.log('Redis Client Error', err));

async function main() {
    await client.flushdb();
    console.log('Redis flushed.');
    await client.quit();
}

main();
