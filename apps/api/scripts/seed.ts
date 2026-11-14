/**
 * Idempotently upserts the demo dataset (8 users, 20 listings, 2 reports — all `seed: true`) into Cosmos.
 *
 *   $env:COSMOS_ENDPOINT="https://<account>.documents.azure.com:443/"; npm run seed -w apps/api
 *
 * Auth: DefaultAzureCredential (e.g. `az login`). The principal needs the Cosmos DB Built-in Data
 * Contributor role — pass `deployerPrincipalId` to the Bicep deployment to grant it.
 * Flags: --dry-run prints counts only; --purge deletes previously seeded docs instead.
 */
import { CosmosClient } from "@azure/cosmos";
import { DefaultAzureCredential } from "@azure/identity";
import { CONTAINERS } from "../src/adapters/cosmos";
import { toGeoJson } from "../src/domain/entities";
import { buildSeed } from "../src/seed/seedData";

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const seed = buildSeed(new Date());
  const docs = {
    users: seed.users.map((u) => ({ ...u })),
    listings: seed.listings.map((l) => ({ ...l, geo: l.geo ?? toGeoJson(l.location) })),
    reports: (seed.reports ?? []).map((r) => ({ ...r })),
  };
  console.log(`Seed: ${docs.users.length} users, ${docs.listings.length} listings, ${docs.reports.length} reports`);
  if (args.has("--dry-run")) return;

  const endpoint = process.env.COSMOS_ENDPOINT;
  if (!endpoint) throw new Error("COSMOS_ENDPOINT is required");
  const client = new CosmosClient({ endpoint, aadCredentials: new DefaultAzureCredential() });
  const db = client.database(process.env.COSMOS_DATABASE || "flatme");

  const purge = args.has("--purge");
  const partitionKeyOf = {
    users: (d: { id: string }) => d.id,
    listings: (d: { id: string }) => d.id,
    reports: (d: { listingId: string }) => d.listingId,
  };

  for (const [name, items] of Object.entries(docs) as [keyof typeof docs, { id: string; listingId?: string }[]][]) {
    const container = db.container(CONTAINERS[name]);
    for (const item of items) {
      if (purge) {
        const pk = partitionKeyOf[name](item as never);
        await container.item(item.id, pk).delete().catch((e: { code?: number }) => {
          if (e.code !== 404) throw e;
        });
      } else {
        await container.items.upsert(item);
      }
    }
    console.log(`  ${purge ? "purged" : "upserted"} ${items.length} ${name}`);
  }
  console.log("Done.");
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
