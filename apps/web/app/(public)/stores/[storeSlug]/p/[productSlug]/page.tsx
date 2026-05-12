type ProductPageProps = {
  params: Promise<{ storeSlug: string; productSlug: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { storeSlug, productSlug } = await params;

  return (
    <section className="tmh-section">
      <span className="tmh-route-label">
        /stores/{storeSlug}/p/{productSlug}
      </span>
      <div className="tmh-card">
        <h1>Product Detail</h1>
        <p>
          Public product placeholder for <strong>{productSlug}</strong> in{' '}
          <strong>{storeSlug}</strong>.
        </p>
      </div>
    </section>
  );
}
