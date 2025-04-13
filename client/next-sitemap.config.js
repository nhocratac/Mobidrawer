/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: 'https://uit-mobidrawer.vercel.app',
  generateRobotsTxt: true,
  changefreq: 'daily',
  priority: 0.7,
  sitemapSize: 5000,
  transform: async (config, path) => {
    // Special priority for homepage
    if (path === '/') {
      console.log('Generating sitemap for homepage...')
      return {
        loc: path,
        changefreq: 'daily',
        priority: 1.0,
        lastmod: new Date().toISOString(),
      }
    }

    // Default configuration for other pages
    return {
      loc: path,
      changefreq: config.changefreq,
      priority: path === '/' ? 1.0 : config.priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
    }
  }
};
