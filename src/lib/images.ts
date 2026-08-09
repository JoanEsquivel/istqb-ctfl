// Exam JSONs reference figures as relative paths like "images/exam-A-q23.png".
// The glob map lets Vite fingerprint and serve them in both dev and build.
const imageModules = import.meta.glob('../../converted_assets/images/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const byBasename = new Map<string, string>(
  Object.entries(imageModules).map(([path, url]) => [path.split('/').pop()!, url]),
);

export function resolveImage(imagePath: string): string | undefined {
  const basename = imagePath.split('/').pop();
  return basename ? byBasename.get(basename) : undefined;
}
