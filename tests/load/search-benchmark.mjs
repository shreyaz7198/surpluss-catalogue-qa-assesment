import autocannon from "autocannon";

const BASE_URL = process.env.BASE_URL || "http://localhost:3001";
const TARGET_SLUG = "premium-corporate-essentials";
const SEARCH_QUERIES = ["notebook", "pen", "desk", "water", "bag", "leather"];

async function runLoadTest() {
  console.log(`Starting load test against ${BASE_URL}...`);

  const requests = SEARCH_QUERIES.map((q) => ({
    method: "GET",
    path: `/api/catalogues/${TARGET_SLUG}/search?q=${encodeURIComponent(q)}`,
  }));

  const instance = autocannon({
    url: BASE_URL,
    connections: 20, // 20 concurrent connections
    pipelining: 1,
    duration: 10,   // 10-second duration
    requests,
  });

  autocannon.track(instance, { renderProgressBar: true });

  const results = await instance;

  console.log("\n================ LOAD TEST RESULTS ================");
  console.log(`Total Requests Sent : ${results.requests.total}`);
  console.log(`Throughput (req/sec): ${results.requests.average}`);
  console.log(`Latency Avg         : ${results.latency.average} ms`);
  console.log(`Latency p99         : ${results.latency.p99} ms`);
  console.log(`2xx Responses       : ${results["2xx"]}`);
  console.log(`Non-2xx / Errors    : ${results.non2xx}`);
  console.log("===================================================\n");

  // Quality gate assertions
  const maxP99AllowedMs = 500;
  if (results.latency.p99 > maxP99AllowedMs) {
    console.error(`FAILED: p99 latency (${results.latency.p99}ms) exceeded threshold of ${maxP99AllowedMs}ms.`);
    process.exit(1);
  }

  if (results.non2xx > 0) {
    console.error(`FAILED: Detected ${results.non2xx} non-2xx responses during load test.`);
    process.exit(1);
  }

  console.log("PASSED: Load test within latency SLA and 0 non-2xx errors.");
}

runLoadTest().catch((err) => {
  console.error("Load test error:", err);
  process.exit(1);
});