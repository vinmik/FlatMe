import type { UserEntity } from "../../domain/entities";
import type { AdminUserCriteria, Paged, UserRepository, UserStatsRow } from "../../ports";
import { clone, containsText, mapCollection, newestFirst, paginate, type MemoryCollection } from "./util";

export class MemoryUserRepository implements UserRepository {
  private readonly docs = new Map<string, UserEntity>();

  constructor(seed: readonly UserEntity[] = []) {
    for (const u of seed) this.docs.set(u.id, clone(u));
  }

  collection(): MemoryCollection {
    return mapCollection(this.docs);
  }

  async get(id: string): Promise<UserEntity | null> {
    const u = this.docs.get(id);
    return u ? clone(u) : null;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    const u = [...this.docs.values()].find((d) => d.email === email);
    return u ? clone(u) : null;
  }

  async upsert(user: UserEntity): Promise<void> {
    this.docs.set(user.id, clone(user));
  }

  async delete(id: string): Promise<void> {
    this.docs.delete(id);
  }

  async count(): Promise<number> {
    return this.docs.size;
  }

  async countDistinctCompanies(): Promise<number> {
    return new Set([...this.docs.values()].map((u) => u.company).filter(Boolean)).size;
  }

  async adminQuery(q: AdminUserCriteria): Promise<Paged<UserEntity>> {
    const items = [...this.docs.values()]
      .filter(
        (u) =>
          (!q.status || u.status === q.status) &&
          (!q.role || u.role === q.role) &&
          containsText([u.email, u.fullName, u.company], q.text),
      )
      .sort(newestFirst);
    return paginate(items, q);
  }

  async statsRows(): Promise<UserStatsRow[]> {
    return [...this.docs.values()].map((u) => ({ company: u.company, status: u.status, createdAt: u.createdAt }));
  }
}
