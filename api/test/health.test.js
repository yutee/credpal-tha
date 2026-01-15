const http = require("http");

const PORT = process.env.PORT || 3000;
const HOST = process.env.TEST_HOST || "localhost";

function testEndpoint(path, expectedStatus) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://${HOST}:${PORT}${path}`, (res) => {
      if (res.statusCode === expectedStatus) {
        resolve();
      } else {
        reject(new Error(`Expected ${expectedStatus}, got ${res.statusCode}`));
      }
    });
    req.on("error", reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
  });
}

async function runTests() {
  const tests = [
    { name: "GET /health", path: "/health", status: 200 },
    { name: "GET /status", path: "/status", status: 200 }
  ];

  for (const test of tests) {
    try {
      await testEndpoint(test.path, test.status);
      console.log(`PASS: ${test.name}`);
    } catch (err) {
      console.error(`FAIL: ${test.name} - ${err.message}`);
      process.exit(1);
    }
  }

  console.log("All tests passed");
  process.exit(0);
}

runTests();