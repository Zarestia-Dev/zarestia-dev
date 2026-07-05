export const environment = {
  production: true,
  githubOrgUrl: 'https://github.com/Zarestia-Dev',
  // Cloudflare Worker that proxies GitHub API (auth + caching handled server-side).
  // The site fetches profile/repos/languages at runtime from this proxy, so no
  // manual rebuild is needed when GitHub data changes.
  githubProxyUrl: 'https://github-proxy.hakanismail53.workers.dev',
  // Personal GitHub username (for profile data: avatar, bio, followers)
  githubUsername: 'Hakanbaban53',
  // Organization GitHub name (for repos + language breakdown)
  githubOrgName: 'Zarestia-Dev',
};
