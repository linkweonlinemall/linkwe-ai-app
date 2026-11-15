/** Fictional review surfaces only. Explicit production always denies even a mis-set NODE_ENV. */
export function cataloguePreviewEnabled(environment: { NODE_ENV?: string; VERCEL_ENV?: string }) {
  return environment.VERCEL_ENV !== 'production' && (environment.NODE_ENV === 'development' || environment.VERCEL_ENV === 'preview');
}
export function isCatalogueFixturePath(pathname: string | null) {
  return pathname === '/dev/store-catalogue' || pathname === '/dev/catalogue-preview';
}
