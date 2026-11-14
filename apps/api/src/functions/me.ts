import { ROUTES, UpdatePrefsSchema, UpdateProfileSchema } from "@flatme/shared";
import { withAuth } from "../http/handler";
import { parseBody, routeParam } from "../http/request";
import { registerHttp } from "../http/register";
import { noContent, ok } from "../http/responses";

export const getMe = withAuth(async ({ user, services }) => ok(services.users.get(user)));

export const updateMe = withAuth(async ({ req, user, services }) =>
  ok(await services.users.updateProfile(user, await parseBody(req, UpdateProfileSchema))),
);

export const deleteMe = withAuth(async ({ user, services, log, correlationId }) => {
  const { listingsDeleted } = await services.users.deleteAccount(user);
  log.info(`[${correlationId}] account ${user.id} deleted (${listingsDeleted} listings)`);
  return noContent();
});

export const updatePrefs = withAuth(async ({ req, user, services }) =>
  ok(await services.users.updatePrefs(user, await parseBody(req, UpdatePrefsSchema))),
);

export const myListings = withAuth(async ({ user, services }) => ok({ items: await services.listings.myListings(user) }));

export const listFavorites = withAuth(async ({ user, services }) => ok({ items: await services.favorites.list(user) }));

export const addFavorite = withAuth(async ({ req, user, services }) => {
  await services.favorites.add(user, routeParam(req, "listingId"));
  return noContent();
});

export const removeFavorite = withAuth(async ({ req, user, services }) => {
  await services.favorites.remove(user, routeParam(req, "listingId"));
  return noContent();
});

registerHttp("getMe", { route: ROUTES.me, methods: ["GET"], handler: getMe });
// PATCH is the pinned client contract; PUT is accepted as an alias.
registerHttp("updateMe", { route: ROUTES.me, methods: ["PATCH", "PUT"], handler: updateMe });
registerHttp("deleteMe", { route: ROUTES.me, methods: ["DELETE"], handler: deleteMe });
registerHttp("updatePrefs", { route: ROUTES.mePrefs, methods: ["PATCH"], handler: updatePrefs });
registerHttp("myListings", { route: ROUTES.myListings, methods: ["GET"], handler: myListings });
registerHttp("listFavorites", { route: ROUTES.favorites, methods: ["GET"], handler: listFavorites });
registerHttp("addFavorite", { route: ROUTES.favorite("{listingId}"), methods: ["PUT"], handler: addFavorite });
registerHttp("removeFavorite", {
  route: ROUTES.favorite("{listingId}"),
  methods: ["DELETE"],
  handler: removeFavorite,
});
