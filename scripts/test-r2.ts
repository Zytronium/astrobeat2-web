import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
        accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
});

async function main() {
    const bucket = process.env.R2_BUCKET_NAME!;
    console.log("Using bucket:", bucket);
    const result = await client.send(new ListObjectsV2Command({ Bucket: bucket }));
    console.log("R2 connected. Objects in bucket:", result.KeyCount ?? 0);
}

main().catch(console.error);
