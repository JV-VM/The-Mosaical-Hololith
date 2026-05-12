type StorePageProps = {
  params: Promise<{ storeSlug: string }>;
};

export default async function StorePage({ params }: StorePageProps) {
  const { storeSlug } = await params;

  return (
    <section className="tmh-section">
      <span className="tmh-route-label">/stores/{storeSlug}</span>
      <div className="tmh-card">
        <h1>Storefront</h1>
        <p>
          Public storefront placeholder for <strong>{storeSlug}</strong>.
        </p>
      </div>
    </section>
  );
}
