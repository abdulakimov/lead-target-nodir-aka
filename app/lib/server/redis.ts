import { createClient } from "redis";

type ZItem = { score: number; value: string };

export type RedisLike = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  setIfAbsent(key: string, value: string, ttlMs: number): Promise<boolean>;
  deleteIfValue(key: string, expectedValue: string): Promise<void>;
  zAdd(key: string, items: ZItem[]): Promise<void>;
  zRangeByScore(key: string, min: number, max: number, opts: { LIMIT: { offset: number; count: number } }): Promise<string[]>;
  zRem(key: string, values: string[]): Promise<void>;
};

declare global {
  // eslint-disable-next-line no-var
  var __robbitRedisClient: any;
  // eslint-disable-next-line no-var
  var __robbitMemoryKV: Map<string, string> | undefined;
  // eslint-disable-next-line no-var
  var __robbitMemoryZ: Map<string, Map<string, number>> | undefined;
}

function hasRedisUrl(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

async function getRealRedis(): Promise<any> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) throw new Error("REDIS_URL is not set");

  if (!global.__robbitRedisClient) {
    const client = createClient({ url });
    client.on("error", (error) => {
      console.error("Redis error:", error);
    });
    global.__robbitRedisClient = client;
  }

  if (!global.__robbitRedisClient.isOpen) {
    await global.__robbitRedisClient.connect();
  }

  return global.__robbitRedisClient;
}

function getMemoryRedis(): RedisLike {
  if (!global.__robbitMemoryKV) global.__robbitMemoryKV = new Map<string, string>();
  if (!global.__robbitMemoryZ) global.__robbitMemoryZ = new Map<string, Map<string, number>>();

  const kv = global.__robbitMemoryKV;
  const zsets = global.__robbitMemoryZ;

  return {
    async get(key) {
      return kv.get(key) ?? null;
    },
    async set(key, value) {
      kv.set(key, value);
    },
    async setIfAbsent(key, value) {
      if (kv.has(key)) return false;
      kv.set(key, value);
      return true;
    },
    async deleteIfValue(key, expectedValue) {
      const current = kv.get(key);
      if (current === expectedValue) {
        kv.delete(key);
      }
    },
    async zAdd(key, items) {
      let z = zsets.get(key);
      if (!z) {
        z = new Map<string, number>();
        zsets.set(key, z);
      }
      for (const item of items) {
        z.set(item.value, item.score);
      }
    },
    async zRangeByScore(key, min, max, opts) {
      const z = zsets.get(key);
      if (!z) return [];
      const sorted = [...z.entries()]
        .filter(([, score]) => score >= min && score <= max)
        .sort((a, b) => a[1] - b[1])
        .map(([value]) => value);
      const start = opts.LIMIT.offset;
      const end = start + opts.LIMIT.count;
      return sorted.slice(start, end);
    },
    async zRem(key, values) {
      const z = zsets.get(key);
      if (!z) return;
      for (const value of values) {
        z.delete(value);
      }
    },
  };
}

export async function getRedis(): Promise<RedisLike> {
  if (!hasRedisUrl()) {
    return getMemoryRedis();
  }
  const client = await getRealRedis();
  return {
    async get(key) {
      return client.get(key);
    },
    async set(key, value) {
      await client.set(key, value);
    },
    async setIfAbsent(key, value, ttlMs) {
      const result = await client.set(key, value, { NX: true, PX: ttlMs });
      return result === "OK";
    },
    async deleteIfValue(key, expectedValue) {
      await client.eval(
        `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          end
          return 0
        `,
        {
          keys: [key],
          arguments: [expectedValue],
        },
      );
    },
    async zAdd(key, items) {
      await client.zAdd(key, items);
    },
    async zRangeByScore(key, min, max, opts) {
      return client.zRangeByScore(key, min, max, opts);
    },
    async zRem(key, values) {
      await client.zRem(key, values);
    },
  };
}
