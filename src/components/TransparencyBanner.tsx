export function TransparencyBanner() {
  // Phones show the short form on one line; the clipped words stay readable to screen readers.
  return (
    <div className="transparency-banner" role="note">
      Real sources. AI-written <span className="banner-long">summaries and </span>commentary.<span className="banner-long"> Open the originals for
      full context.</span> <a href={`${import.meta.env.BASE_URL}about/`}>How this works</a>
    </div>
  );
}
