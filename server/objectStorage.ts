import { AwsClient } from "aws4fetch";
import { Response } from "express";
import { randomUUID } from "crypto";
import { Readable } from "stream";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

interface R2Config {
  client: AwsClient;
  bucketEndpoint: string;
}

let cachedConfig: R2Config | null = null;

function getR2(): R2Config {
  if (cachedConfig) {
    return cachedConfig;
  }
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "Object storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, " +
        "R2_SECRET_ACCESS_KEY and R2_BUCKET environment variables."
    );
  }
  cachedConfig = {
    client: new AwsClient({
      accessKeyId,
      secretAccessKey,
      service: "s3",
      region: "auto",
    }),
    bucketEndpoint: `https://${accountId}.r2.cloudflarestorage.com/${bucket}`,
  };
  return cachedConfig;
}

export class ObjectStorageService {
  // Presigned PUT URL the client uploads to directly, plus the normalized
  // path the app stores and serves the file from.
  async getObjectEntityUploadURL(): Promise<{
    uploadURL: string;
    objectPath: string;
  }> {
    const { client, bucketEndpoint } = getR2();
    const key = `uploads/${randomUUID()}`;
    const url = new URL(`${bucketEndpoint}/${key}`);
    url.searchParams.set("X-Amz-Expires", "900");
    const signed = await client.sign(
      new Request(url.toString(), { method: "PUT" }),
      { aws: { signQuery: true } }
    );
    return {
      uploadURL: signed.url,
      objectPath: `/objects/${key}`,
    };
  }

  // "/objects/uploads/<id>" -> "uploads/<id>", rejecting anything else.
  getObjectEntityKey(objectPath: string): string {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    const key = objectPath.slice("/objects/".length);
    if (!key || key.includes("..")) {
      throw new ObjectNotFoundError();
    }
    return key;
  }

  // Accepts either an already-normalized "/objects/..." path or the raw
  // bucket URL the client uploaded to, and returns the "/objects/..." path.
  normalizeObjectEntityPath(rawPath: string): string {
    if (rawPath.startsWith("/objects/")) {
      return rawPath;
    }
    const { bucketEndpoint } = getR2();
    if (rawPath.startsWith(`${bucketEndpoint}/`)) {
      const key = rawPath.slice(bucketEndpoint.length + 1).split("?")[0];
      return `/objects/${key}`;
    }
    return rawPath;
  }

  async downloadObject(
    objectPath: string,
    res: Response,
    cacheTtlSec: number = 3600
  ) {
    const key = this.getObjectEntityKey(objectPath);
    const { client, bucketEndpoint } = getR2();
    const r2Response = await client.fetch(`${bucketEndpoint}/${key}`, {
      method: "GET",
    });
    if (r2Response.status === 404) {
      throw new ObjectNotFoundError();
    }
    if (!r2Response.ok || !r2Response.body) {
      throw new Error(
        `Object storage returned ${r2Response.status} for ${key}`
      );
    }

    res.set({
      "Content-Type":
        r2Response.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": `private, max-age=${cacheTtlSec}`,
    });
    const contentLength = r2Response.headers.get("content-length");
    if (contentLength) {
      res.set("Content-Length", contentLength);
    }

    const stream = Readable.fromWeb(r2Response.body as any);
    stream.on("error", (err) => {
      console.error("Stream error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error streaming file" });
      } else {
        res.end();
      }
    });
    stream.pipe(res);
  }
}
