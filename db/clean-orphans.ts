import "./env";
import { getDb, schema } from "./index";
import { getS3Client, getStorageConfig } from "../lib/storage";
import { ListObjectsV2Command, DeleteObjectCommand, ListObjectsV2CommandOutput, _Object } from "@aws-sdk/client-s3";
import { invalidateFeedCache, invalidateTaxonomyCache } from "../lib/cache";

async function main() {
  console.log("🔍 Scanning for orphaned S3 objects in MinIO/S3...");
  const db = getDb();
  const s3 = getS3Client();
  const storageConfig = getStorageConfig();

  // 1. Get all valid keys from DB
  const allMedia = await db.select().from(schema.media);
  const validKeys = new Set<string>();
  
  for (const m of allMedia) {
    if (m.storageKey) validKeys.add(m.storageKey);
    if (m.thumbnailKey) validKeys.add(m.thumbnailKey);
    if (m.previewKey) validKeys.add(m.previewKey);
  }

  console.log(`📊 Found ${validKeys.size} valid referenced S3 keys in PostgreSQL.`);

  // Safety check: Never proceed if database returned 0 valid keys (prevents wiping S3 on DB connection mismatch)
  if (validKeys.size === 0) {
    console.error("⛔ SAFETY ABORT: Database returned 0 media records! Aborting to prevent accidental S3 wipeout.");
    process.exit(1);
  }

  const isDryRun = process.argv.includes("--dry-run");
  const isForce = process.argv.includes("--force") || process.argv.includes("-f");

  // 2. List all objects in S3
  const orphanedKeys: string[] = [];
  let continuationToken: string | undefined = undefined;
  let totalObjectsScanned = 0;
  
  console.log(`🌐 Fetching object list from MinIO bucket "${storageConfig.bucket}"...`);
  
  do {
    const response: ListObjectsV2CommandOutput = await s3.send(
      new ListObjectsV2Command({
        Bucket: storageConfig.bucket,
        ContinuationToken: continuationToken,
      })
    );

    if (response.Contents) {
      for (const object of response.Contents as _Object[]) {
        if (object.Key) {
          totalObjectsScanned++;
          if (!validKeys.has(object.Key)) {
            orphanedKeys.push(object.Key);
          }
        }
      }
    }
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  console.log(`📦 Scanned ${totalObjectsScanned} total objects in S3.`);
  console.log(`🗑️ Found ${orphanedKeys.length} orphaned objects in MinIO.`);

  if (orphanedKeys.length === 0) {
    console.log("✅ Bucket S3 sudah bersih! Tidak ada file orphan.");
    process.exit(0);
  }

  if (isDryRun) {
    console.log("\n[DRY RUN MODE] File berikut yang terdeteksi sebagai orphan (TIDAK dihapus):");
    orphanedKeys.slice(0, 50).forEach((k) => console.log(`  - ${k}`));
    if (orphanedKeys.length > 50) {
      console.log(`  ... dan ${orphanedKeys.length - 50} file lainnya.`);
    }
    console.log("\n💡 Untuk menghapus secara permanen, jalankan: npm run clean:orphans");
    process.exit(0);
  }

  // Confirmation prompt if interactive
  if (!isForce && process.stdin.isTTY) {
    const readline = (await import("readline/promises")).default;
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ans = (await rl.question(`\n⚠️ Apakah kamu yakin ingin MENGHAPUS ${orphanedKeys.length} file orphan tersebut dari S3? (y/N): `)).trim().toLowerCase();
    rl.close();
    if (ans !== "y" && ans !== "yes") {
      console.log("❌ Dibatalkan oleh user. Tidak ada file yang dihapus.");
      process.exit(0);
    }
  }

  // 3. Delete orphaned objects
  let deletedCount = 0;
  for (const key of orphanedKeys) {
    console.log(`    - Deleting orphaned S3 key: ${key}`);
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: storageConfig.bucket,
          Key: key,
        })
      );
      deletedCount++;
    } catch (err) {
      console.error(`    ❌ Failed to delete ${key}:`, err);
    }
  }

  if (deletedCount > 0) {
    console.log("⚡ Purging Redis feed & taxonomy cache...");
    await invalidateFeedCache();
    await invalidateTaxonomyCache();
    console.log("✅ Cache invalidated successfully!");
  }

  console.log(`\n🎉 Orphan cleanup finished. Deleted ${deletedCount} orphaned objects from S3.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Orphan cleanup script crashed:", err);
  process.exit(1);
});
