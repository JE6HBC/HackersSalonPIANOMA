/**
 * GitHub Pages のプロジェクトページは `/HackersSalonPIANOMA/` 配下に配信されるため、
 * 内部リンクは必ずこの関数を通すこと。`href="/events"` と直書きするとローカルでは
 * 動くのに本番で 404 になる。
 */
export function href(path = '/'): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  const rest = path.replace(/^\/+/, '');
  return rest ? `${base}/${rest}` : `${base}/`;
}
