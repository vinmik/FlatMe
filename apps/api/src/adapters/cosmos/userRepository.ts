import type { Container } from "@azure/cosmos";
import type { UserEntity } from "../../domain/entities";
import type { AdminUserCriteria, Paged, UserRepository, UserStatsRow } from "../../ports";
import { deleteItem, queryAll, queryCount, queryValues, readItem, Where } from "./util";

/** `users` container, partition key /id. Email lookups are cross-partition queries (fine at MVP scale). */
export class CosmosUserRepository implements UserRepository {
  constructor(private readonly c: Container) {}

  get(id: string): Promise<UserEntity | null> {
    return readItem<UserEntity>(this.c, id, id);
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const [u] = await queryAll<UserEntity>(this.c, {
      query: "SELECT * FROM c WHERE c.email = @email",
      parameters: [{ name: "@email", value: email }],
    });
    return u ?? null;
  }

  async upsert(user: UserEntity): Promise<void> {
    await this.c.items.upsert(user);
  }

  delete(id: string): Promise<void> {
    return deleteItem(this.c, id, id);
  }

  count(): Promise<number> {
    return queryCount(this.c, "", []);
  }

  async countDistinctCompanies(): Promise<number> {
    const companies = await queryValues<string>(this.c, {
      query: 'SELECT DISTINCT VALUE c.company FROM c WHERE IS_STRING(c.company) AND c.company != ""',
    });
    return companies.length;
  }

  async adminQuery(q: AdminUserCriteria): Promise<Paged<UserEntity>> {
    const w = new Where();
    if (q.status) w.add("c.status = @status", { "@status": q.status });
    if (q.role) w.add("c.role = @role", { "@role": q.role });
    if (q.text) {
      w.add("(CONTAINS(c.email, @t, true) OR CONTAINS(c.fullName, @t, true) OR CONTAINS(c.company, @t, true))", {
        "@t": q.text,
      });
    }
    const [items, total] = await Promise.all([
      queryAll<UserEntity>(this.c, {
        query: `SELECT * FROM c${w} ORDER BY c.createdAt DESC OFFSET @offset LIMIT @limit`,
        parameters: [...w.parameters, { name: "@offset", value: q.offset }, { name: "@limit", value: q.limit }],
      }),
      queryCount(this.c, w.toString(), w.parameters),
    ]);
    return { items, total };
  }

  statsRows(): Promise<UserStatsRow[]> {
    return queryValues<UserStatsRow>(this.c, { query: "SELECT c.company, c.status, c.createdAt FROM c" });
  }
}
