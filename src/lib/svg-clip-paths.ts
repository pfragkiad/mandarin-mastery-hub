// Hanzi Writer writes clip-path="url(<page href>#mask)". When the page URL
// later changes (search params such as Practice mode), that absolute reference
// stops matching and strokes render unclipped as thick blobs. Relative
// fragment references always resolve within the inline SVG.
// Take the fragment after the last '#', whatever characters the page URL holds.
const ABSOLUTE_CLIP = /^url\(\s*["']?.*?(#[^#"')\s]+)["']?\s*\)$/;

export function relativizeClipPaths(root: ParentNode = document): void {
  root.querySelectorAll?.('[clip-path]').forEach((el) => {
    const value = el.getAttribute('clip-path') ?? '';
    const match = ABSOLUTE_CLIP.exec(value);
    if (match && value !== `url(${match[1]})`) el.setAttribute('clip-path', `url(${match[1]})`);
  });
}

export function watchClipPaths(): () => void {
  relativizeClipPaths();
  const observer = new MutationObserver(() => relativizeClipPaths());
  observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['clip-path'] });
  return () => observer.disconnect();
}
