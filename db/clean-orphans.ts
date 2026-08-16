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
