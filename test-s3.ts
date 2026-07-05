import { S3Client, ListBucketsCommand } from "@aws-sdk/client-s3";
const s3 = new S3Client({
  endpoint: "http://api.s3.homelab.local",
  region: "us-east-1",
  credentials: { accessKeyId: "minioadmin", secretAccessKey: "minioadmin" },
  forcePathStyle: true,
});
s3.send(new ListBucketsCommand({}))
  .then((res) => console.log("Success:", res.Buckets?.map(b => b.Name)))
  .catch((err) => console.error("Error:", err));
