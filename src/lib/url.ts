// App links must respect Astro's base path (GitHub Pages serves from /istqb-ctfl/).
export function url(path: string): string {
  return import.meta.env.BASE_URL.replace(/\/$/, '') + path;
}
