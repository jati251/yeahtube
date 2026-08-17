/**
 * YeahTube BullMQ Transcode Queue Inspector & Manager
 *
 * Usage:
 *   npm run queue             # View queue status and waiting/failed jobs
 *   npm run queue -- --clean  # Clear/flush all waiting and failed jobs
 */

import "../db/env";
import { Queue } from "bullmq";

function getRedisConnection() {
  const url = process.env.REDIS_URL || "redis://localhost:6379";
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || "6379", 10),
    password: parsed.password || undefined,
  };
}

const queue = new Queue("yeahtube-transcode", {
  connection: getRedisConnection(),
});

const shouldClean = process.argv.includes("--clean");

async function main() {
  if (shouldClean) {
    console.log("🧹 Draining and cleaning yeahtube-transcode queue...");
    await queue.drain(true);
    await queue.clean(0, 1000, "failed");
    await queue.clean(0, 1000, "completed");
    console.log("✅ Queue successfully flushed!");
  }

  const counts = await queue.getJobCounts();
  
  console.log("\n==================================================");
  console.log("📊 BullMQ Queue Status (yeahtube-transcode):");
  console.log("==================================================");
  console.log(`- ⏳ Waiting   : ${counts.waiting}`);
  console.log(`- 🔄 Active    : ${counts.active}`);
  console.log(`- ✅ Completed : ${counts.completed}`);
  console.log(`- ❌ Failed    : ${counts.failed}`);
  console.log(`- ⏱️ Delayed   : ${counts.delayed}`);
  console.log(`- ⏸️ Paused    : ${counts.paused}`);
  console.log("==================================================");

  if (counts.waiting > 0) {
    const waitingJobs = await queue.getJobs(["waiting"], 0, 9);
    console.log(`\n📋 First ${waitingJobs.length} Waiting Jobs:`);
    for (const j of waitingJobs) {
      console.log(`  • Job #${j.id}: Media #${j.data?.mediaId} ("${j.data?.filename}")`);
    }
  }

  if (counts.failed > 0) {
    const failedJobs = await queue.getJobs(["failed"], 0, 4);
    console.log(`\n⚠️ Sample Failed Jobs (Reason):`);
    for (const j of failedJobs) {
      console.log(`  • Media #${j.data?.mediaId}: ${j.failedReason || "Unknown reason"}`);
    }
  }

  console.log("\n💡 Tips:");
  console.log("  • To flush/reset the queue : npm run queue -- --clean");
  console.log("  • To start processing queue: npm run worker");

  await queue.close();
}

main().catch((err) => {
  console.error("Error managing queue:", err);
  process.exit(1);
});
