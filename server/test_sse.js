
const http = require('http');

const options = {
    hostname: 'localhost',
    port: 4000, // Adjusted to 4000 based on server logs
    path: '/api/v1/ehr/sse/test-job-id',
    method: 'GET',
    headers: {
        'Accept': 'text/event-stream',
    }
};

console.log('Connecting to SSE endpoint...');

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
        // Check for standard SSE format
        if (chunk.toString().startsWith('data: ')) {
            console.log('✅ Received standard SSE format');
        } else {
            console.log('❌ Received non-standard SSE format');
        }
        process.exit(0);
    });

    res.on('end', () => {
        console.log('No more data in response.');
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
