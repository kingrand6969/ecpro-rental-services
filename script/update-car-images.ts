// One-shot: pull freshly generated car photos from Higgsfield's CDN, store
// them in R2 under cars/, and point each car's image_url at the app path.
//
//   npx tsx script/update-car-images.ts
//
// Edit SOURCES below and re-run to refresh any subset; keys are per-car so a
// re-run simply overwrites.
import "dotenv/config";
import { AwsClient } from "aws4fetch";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

// carId -> generated image URL
const SOURCES: Record<number, { name: string; key: string; url: string }> = {
  8: { name: "Veloz", key: "cars/veloz.png", url: "https://d8j0ntlcm91z4.cloudfront.net/user_39JJ9h03mLtcZW7rWSpIeMIPBka/hf_20260722_033140_6caee7c2-b735-4388-a71e-707f3a35c9ab.png" },
  6: { name: "Hilux", key: "cars/hilux.png", url: "https://d8j0ntlcm91z4.cloudfront.net/user_39JJ9h03mLtcZW7rWSpIeMIPBka/hf_20260722_032930_bdf7ed20-3ba3-4946-8965-3ff07df24c2e.png" },
  3: { name: "Terra O", key: "cars/terra-o.png", url: "https://d8j0ntlcm91z4.cloudfront.net/user_39JJ9h03mLtcZW7rWSpIeMIPBka/hf_20260722_032931_55230f1c-5c8a-47f5-a993-2b56f990ec97.png" },
  1: { name: "Terra N", key: "cars/terra-n.png", url: "https://d8j0ntlcm91z4.cloudfront.net/user_39JJ9h03mLtcZW7rWSpIeMIPBka/hf_20260722_032933_bbdeeba3-90ba-476f-9f8a-c026f3619a21.png" },
  5: { name: "Everest", key: "cars/everest.png", url: "https://d8j0ntlcm91z4.cloudfront.net/user_39JJ9h03mLtcZW7rWSpIeMIPBka/hf_20260722_091557_f9f7cb55-305e-4ca8-8088-070fff3eab41.png" },
  10: { name: "EVEREST BLUE", key: "cars/everest-blue.png", url: "https://d8j0ntlcm91z4.cloudfront.net/user_39JJ9h03mLtcZW7rWSpIeMIPBka/hf_20260722_091553_4b5cd406-cbbc-40dc-85f5-11daf60e36aa.png" },
  4: { name: "Innova", key: "cars/innova.png", url: "https://d8j0ntlcm91z4.cloudfront.net/user_39JJ9h03mLtcZW7rWSpIeMIPBka/hf_20260722_032946_fe0b2ffc-b2ff-4b8c-9d9b-b9eaadccf093.png" },
  2: { name: "MUX", key: "cars/mux.png", url: "https://d8j0ntlcm91z4.cloudfront.net/user_39JJ9h03mLtcZW7rWSpIeMIPBka/hf_20260722_032948_86560806-3122-4bde-b208-312d05b65044.png" },
  7: { name: "Fortuner", key: "cars/fortuner.png", url: "https://d8j0ntlcm91z4.cloudfront.net/user_39JJ9h03mLtcZW7rWSpIeMIPBka/hf_20260722_032949_84377a59-8d90-4bad-9806-133a38de5d7a.png" },
  9: { name: "GAC M6", key: "cars/gac-m6.png", url: "https://d8j0ntlcm91z4.cloudfront.net/user_39JJ9h03mLtcZW7rWSpIeMIPBka/hf_20260722_032950_37979450-5f31-4657-9c4f-811850bb4232.png" },
};

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
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

for (const [carId, src] of Object.entries(SOURCES)) {
  const download = await fetch(src.url);
  if (!download.ok) {
    console.log(`FAILED ${src.name}: source returned ${download.status}`);
    continue;
  }
  const body = Buffer.from(await download.arrayBuffer());

  const put = await client.fetch(`${bucketEndpoint}/${src.key}`, {
    method: "PUT",
    body,
    headers: { "Content-Type": "image/png" },
  });
  if (!put.ok) {
    console.log(`FAILED ${src.name}: R2 returned ${put.status}`);
    continue;
  }

  await pool.query("UPDATE cars SET image_url = $1 WHERE id = $2", [
    `/objects/${src.key}`,
    Number(carId),
  ]);
  console.log(
    `${src.name} -> /objects/${src.key} (${Math.round(body.length / 1024)} KB)`,
  );
}

await pool.end();
console.log("done");
