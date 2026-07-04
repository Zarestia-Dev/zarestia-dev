export const environment = {
  production: true,
  organizationName: 'Zarestia',
  organizationTagline: 'Shaping the wind',
  githubOrgUrl: 'https://github.com/Zarestia-Dev',
  discordUrl: 'https://discord.gg/zarestia',
  sponsorsUrl: 'https://github.com/sponsors/Zarestia-Dev',
  // Cloudflare Worker that proxies GitHub API (auth + caching handled server-side).
  // The site fetches profile/repos/languages at runtime from this proxy, so no
  // manual rebuild is needed when GitHub data changes.
  githubProxyUrl: 'https://github-proxy.hakanismail53.workers.dev',
  // Personal GitHub username (for profile data: avatar, bio, followers)
  githubUsername: 'Hakanbaban53',
  // Organization GitHub name (for repos + language breakdown)
  githubOrgName: 'Zarestia-Dev',
  /**
   * GitHub OAuth App Client ID — SAFE to expose client-side.
   * Register at: https://github.com/settings/developers → "OAuth Apps" → "New OAuth App"
   * The Client SECRET is configured ONLY on the Cloudflare Worker as
   * GITHUB_OAUTH_CLIENT_SECRET — never in this file.
   */
  githubOAuthClientId: 'Ov23liFl45fIzAHEbOnA',
};
