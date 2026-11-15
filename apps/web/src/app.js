(() => {
  const cfg = window.FLATME_CONFIG || {};
  const $ = (sel) => document.querySelector(sel);

  $("#year").textContent = String(new Date().getFullYear());
  $("#apk-link").href = cfg.apkUrl || "#";

  // Scroll-reveal animation.
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        io.unobserve(e.target);
      }),
    { threshold: 0.15 },
  );
  document.querySelectorAll(".reveal").forEach((n) => io.observe(n));

  const countUp = (node, target) => {
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / 1200);
      node.textContent = `${Math.round(target * (1 - Math.pow(1 - p, 3)))}+`;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  const listingCard = (l) => {
    const card = el("article", "lcard reveal");
    const img = el("img");
    img.src = l.coverPhoto;
    img.alt = `${l.roomType} in ${l.area}`;
    img.loading = "lazy";
    const body = el("div", "lbody");
    body.append(
      el("b", null, `${inr.format(l.rent)}/mo · ${l.roomType}`),
      el("span", null, `${l.area} — ${l.locality}`),
      el("small", null, `✓ ${l.owner.firstName} · ${l.owner.company}`),
    );
    card.append(img, body);
    return card;
  };

  if (!cfg.apiBaseUrl) return;
  fetch(`${cfg.apiBaseUrl}/public/highlights`)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then(({ stats, featured }) => {
      $("#stats").hidden = false;
      document.querySelectorAll("[data-stat]").forEach((n) => countUp(n, stats?.[n.dataset.stat] ?? 0));

      if (featured?.length) {
        const heroCard = listingCard(featured[0]);
        heroCard.classList.add("in");
        $("#hero-card").replaceChildren(heroCard);

        const rail = $("#rail");
        featured.forEach((l) => rail.append(listingCard(l)));
        $("#listings").hidden = false;
        rail.querySelectorAll(".reveal").forEach((n) => io.observe(n));
      }
    })
    .catch(() => {
      // Placeholder site: stay static if the API is unreachable.
    });
})();
