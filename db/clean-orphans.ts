/* eslint-disable */
import "./env";
import { getDb, schema } from "./index";
import { getS3Client, getStorageConfig } from "../lib/storage";
import { ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";


async function main() {
  console.log("🔍 Scanning for orphaned S3 objects...");
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

  console.log(`📊 Found ${validKeys.size} valid S3 keys in the database.`);

  // 2. List all objects in S3
  const orphanedKeys: string[] = [];
  let continuationToken: string | undefined = undefined;
  let totalObjectsScanned = 0;
  
  console.log(`🌐 Fetching object list from MinIO bucket "${storageConfig.bucket}"...`);
  
  do {
    const response: any = await s3.send(
      new ListObjectsV2Command({
        Bucket: storageConfig.bucket,
        ContinuationToken: continuationToken,
      })
    );

    if (response.Contents) {
      for (const object of response.Contents) {
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

  console.log(`\n🎉 Orphan cleanup finished. Deleted ${deletedCount} orphaned objects.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Orphan cleanup script crashed:", err);
  process.exit(1);
});
