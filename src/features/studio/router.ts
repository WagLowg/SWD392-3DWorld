import { useEffect, useState } from 'react';

export type Route =
  | { name: 'welcome' }
  | { name: 'projects' }
  | { name: 'templates' }
  | { name: 'template'; id: string }
  | { name: 'studio'; id: string };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'projects') return { name: 'projects' };
  if (parts[0] === 'templates' && parts[1]) return { name: 'template', id: parts[1] };
  if (parts[0] === 'templates') return { name: 'templates' };
  if (parts[0] === 'studio' && parts[1]) return { name: 'studio', id: parts[1] };
  return { name: 'welcome' };
}

export function href(r: Route): string {
  switch (r.name) {
    case 'projects': return '#/projects';
    case 'templates': return '#/templates';
    case 'template': return `#/templates/${encodeURIComponent(r.id)}`;
    case 'studio': return `#/studio/${encodeURIComponent(r.id)}`;
    default: return '#/';
  }
}

export function navigate(r: Route) { location.hash = href(r); }

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => { setRoute(parseHash(location.hash)); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
