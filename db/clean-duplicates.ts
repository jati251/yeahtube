/* eslint-disable */
import "dotenv/config";
import dotenv from "dotenv";
import path from "path";
import { eq, asc } from "drizzle-orm";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";

// Load .env.local on top of .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import { getDb, schema } from "./index";
import { getS3Client, getStorageConfig } from "../lib/storage";

async function main() {
  console.log("🔍 Checking for duplicate posts...");
  const db = getDb();
  const s3 = getS3Client();
  const storageConfig = getStorageConfig();

  // Get all posts
  const allPosts = await db.select().from(schema.posts).orderBy(asc(schema.posts.id));

  // Group by title
  const titleGroups = new Map<string, typeof allPosts>();
  for (const post of allPosts) {
    const title = post.title.trim().toLowerCase();
    if (!titleGroups.has(title)) {
      titleGroups.set(title, []);
    }
    titleGroups.get(title)!.push(post);
  }

  let deletedCount = 0;

  for (const [title, posts] of titleGroups.entries()) {
    if (posts.length > 1) {
      console.log(`\nFound duplicate title: "${posts[0].title}" (${posts.length} copies)`);
      // Keep the first one (lowest ID), delete the rest
      const keepPost = posts[0];
      const duplicatesToDelete = posts.slice(1);

      console.log(`  Keeping Post ID: ${keepPost.id}`);

      for (const dup of duplicatesToDelete) {
        console.log(`  Deleting Post ID: ${dup.id}...`);

        // Get media files
        const mediaFiles = await db
          .select()
          .from(schema.media)
          .where(eq(schema.media.postId, dup.id));

        for (const m of mediaFiles) {
          try {
            console.log(`    - Deleting S3 key: ${m.storageKey}`);
            await s3.send(
              new DeleteObjectCommand({
                Bucket: storageConfig.bucket,
                Key: m.storageKey,
              }),
            );
            if (m.thumbnailKey) {
              console.log(`    - Deleting S3 key: ${m.thumbnailKey}`);
              await s3.send(
                new DeleteObjectCommand({
                  Bucket: storageConfig.bucket,
                  Key: m.thumbnailKey,
                }),
              );
            }
            if (m.previewKey) {
              console.log(`    - Deleting S3 key: ${m.previewKey}`);
              await s3.send(
                new DeleteObjectCommand({
                  Bucket: storageConfig.bucket,
                  Key: m.previewKey,
                }),
              );
            }
          } catch (s3Err) {
            console.error(`    ❌ S3 Delete failed for media ID ${m.id}:`, s3Err);
          }
        }

        // Delete post from DB (cascade deletes the media DB entries)
        await db.delete(schema.posts).where(eq(schema.posts.id, dup.id));
        console.log(`    ✅ Deleted Post ID: ${dup.id} from DB`);
        deletedCount++;
      }
    }
  }

  console.log(`\n🎉 Duplicate cleanup finished. Deleted ${deletedCount} duplicate post(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Cleanup script crashed:", err);
  process.exit(1);
});
