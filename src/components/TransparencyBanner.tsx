export function TransparencyBanner() {
  return (
    <div className="transparency-banner" role="note">
      Real sources. AI-written summaries and commentary. Open the originals for
      full context. <a href={`${import.meta.env.BASE_URL}about/`}>How this works</a>
    </div>
  );
}
