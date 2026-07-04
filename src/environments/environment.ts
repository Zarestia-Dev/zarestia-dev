export const environment = {
  production: false,
  organizationName: 'Zarestia',
  organizationTagline: 'Shaping the wind',
  githubOrgUrl: 'https://github.com/Zarestia-Dev',
  sponsorsUrl: 'https://github.com/sponsors/Zarestia-Dev',
  githubProxyUrl: 'https://github-proxy.hakanismail53.workers.dev',
  githubUsername: 'Hakanbaban53',
  githubOrgName: 'Zarestia-Dev',
  /**
   * GitHub OAuth App Client ID — SAFE to expose client-side.
   * Register at: https://github.com/settings/developers → "OAuth Apps" → "New OAuth App"
   *   App name:        Zarestia Playground (or similar)
   *   Homepage URL:    https://hakanismail.info/zarestia  (or your domain)
   *   Callback URL:    https://hakanismail.info/zarestia/playground/farm
   * Set the resulting Client ID here.
   *
   * The Client SECRET is configured ONLY on the Cloudflare Worker as
   * GITHUB_OAUTH_CLIENT_SECRET — never in this file.
   */
  githubOAuthClientId: 'Ov23liFl45fIzAHEbOnA',
};
