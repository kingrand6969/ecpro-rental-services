// One-shot: upload the car images bundled in attached_assets/generated_images
// to R2 and repoint cars.image_url at the app's /objects/ route.
//
//   npx tsx script/migrate-car-images.ts
//
// Safe to re-run: cars already pointing at /objects/ are skipped.
import "dotenv/config";
import { AwsClient } from "aws4fetch";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { readFile } from "fs/promises";
import path from "path";

neonConfig.webSocketConstructor = ws;

const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } =
  process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  throw new Error("R2 environment variables are not set");
}

const client = new AwsClient({
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
  service: "s3",
  region: "auto",
});
const bucketEndpoint = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}`;
const assetsDir = path.resolve("attached_assets/generated_images");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const { rows } = await pool.query<{ id: number; name: string; image_url: string }>(
  "SELECT id, name, image_url FROM cars WHERE image_url IS NOT NULL AND image_url NOT LIKE '/objects/%'",
);

for (const car of rows) {
  const filename = car.image_url.split("/").pop();
  if (!filename) {
    console.log(`skip ${car.name}: cannot parse ${car.image_url}`);
    continue;
  }

  let body: Buffer;
  try {
    body = await readFile(path.join(assetsDir, filename));
  } catch {
    console.log(`skip ${car.name}: ${filename} not found in attached_assets`);
    continue;
  }

  const key = `cars/${filename}`;
  const res = await client.fetch(`${bucketEndpoint}/${key}`, {
    method: "PUT",
    body,
    headers: { "Content-Type": "image/png" },
  });
  if (!res.ok) {
    console.log(`FAILED ${car.name}: R2 returned ${res.status}`);
    continue;
  }

  await pool.query("UPDATE cars SET image_url = $1 WHERE id = $2", [
    `/objects/${key}`,
    car.id,
  ]);
  console.log(`${car.name} -> /objects/${key} (${body.length} bytes)`);
}

await pool.end();
console.log("done");
