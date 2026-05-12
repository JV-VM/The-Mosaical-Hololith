type TagPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function TagLandingPage({ params }: TagPageProps) {
  const { slug } = await params;

  return (
    <section className="tmh-section">
      <span className="tmh-route-label">/tags/{slug}</span>
      <div className="tmh-card">
        <h1>Tag Landing</h1>
        <p>
          Public tag landing placeholder for <strong>{slug}</strong>.
        </p>
      </div>
    </section>
  );
}
