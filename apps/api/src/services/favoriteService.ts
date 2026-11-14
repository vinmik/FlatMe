import { LIMITS, type ListingSummary } from "@flatme/shared";
import type { UserEntity } from "../domain/entities";
import { ConflictError, NotFoundError } from "../domain/errors";
import { toListingSummary } from "../domain/mappers";
import type { Clock, ListingRepository, UserRepository } from "../ports";

/** Favorites live as an id array on the user document (bounded by LIMITS.favoritesPerUser). */
export class FavoriteService {
  constructor(
    private readonly users: UserRepository,
    private readonly listings: ListingRepository,
    private readonly clock: Clock,
  ) {}

  /** Newest favorite first; deleted or hidden (non-active, not own) listings are skipped. */
  async list(user: UserEntity): Promise<ListingSummary[]> {
    const found = await this.listings.getMany(user.favorites);
    const byId = new Map(found.map((l) => [l.id, l]));
    return [...user.favorites]
      .reverse()
      .flatMap((id) => {
        const l = byId.get(id);
        return l && (l.status === "active" || l.ownerId === user.id) ? [toListingSummary(l)] : [];
      });
  }

  async add(user: UserEntity, listingId: string): Promise<void> {
    if (user.favorites.includes(listingId)) return;
    const listing = await this.listings.get(listingId);
    if (!listing || (listing.status !== "active" && listing.ownerId !== user.id)) throw new NotFoundError("Listing not found");
    if (user.favorites.length >= LIMITS.favoritesPerUser) {
      throw new ConflictError(`You can save up to ${LIMITS.favoritesPerUser} favorites`);
    }
    await this.users.upsert({ ...user, favorites: [...user.favorites, listingId], updatedAt: this.clock.now().toISOString() });
  }

  async remove(user: UserEntity, listingId: string): Promise<void> {
    if (!user.favorites.includes(listingId)) return;
    await this.users.upsert({
      ...user,
      favorites: user.favorites.filter((id) => id !== listingId),
      updatedAt: this.clock.now().toISOString(),
    });
  }
}
