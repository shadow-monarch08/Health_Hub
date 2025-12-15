
import { createClient } from 'redis';

const client = createClient({
    url: 'redis://localhost:6379'
});

client.on('error', (err) => console.log('Redis Client Error', err));

async function main() {
    await client.connect();
    await client.flushDb();
    console.log('Redis flushed.');
    await client.disconnect();
}

main();
