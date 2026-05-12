import Link from 'next/link';

export default function PublicHubHomePage() {
  return (
    <section className="tmh-section">
      <div className="tmh-hero">
        <span className="tmh-kicker">Public Hub</span>
        <h1 className="tmh-title">
          One frontend modulith, three product surfaces, one deployment path.
        </h1>
        <p className="tmh-copy">
          This scaffold is the public entry point for the future hub, wired to
          coexist with producer and admin routes inside the same web application.
        </p>
        <div className="tmh-cta-row">
          <Link className="tmh-button tmh-button-primary" href="/explore">
            Open Explore
          </Link>
          <Link className="tmh-button tmh-button-secondary" href="/dashboard">
            Open Dashboard Shell
          </Link>
        </div>
      </div>

      <div className="tmh-grid">
        <article className="tmh-card">
          <h2>Public Hub</h2>
          <p>
            Landing pages, explore, tag discovery, stores, products, and public
            CMS pages.
          </p>
        </article>
        <article className="tmh-card">
          <h2>Producer Dashboard</h2>
          <p>
            Tenant-aware management UI for stores, catalog, pages, plans, and
            analytics.
          </p>
        </article>
        <article className="tmh-card">
          <h2>Platform Admin</h2>
          <p>
            Internal governance, moderation, taxonomy, and reporting surfaces.
          </p>
        </article>
      </div>
    </section>
  );
}
