import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function rssProxyPlugin() {
  return {
    name: 'rss-dev-proxy',
    configureServer(server: import('vite').ViteDevServer) {
      server.middlewares.use('/api/rss-proxy', async (req, res) => {
        try {
          const requestUrl = new URL(req.url ?? '', 'http://localhost')
          const feedUrl = requestUrl.searchParams.get('url')

          if (!feedUrl) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing url query parameter' }))
            return
          }

          let parsedUrl: URL
          try {
            parsedUrl = new URL(feedUrl)
          } catch {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Invalid feed URL' }))
            return
          }

          if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Only http/https URLs are supported' }))
            return
          }

          const upstream = await fetch(parsedUrl.toString(), {
            headers: {
              'user-agent': 'Mozilla/5.0 RSS Reader',
              accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
            },
          })

          if (!upstream.ok) {
            res.statusCode = upstream.status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: `Upstream HTTP ${upstream.status}` }))
            return
          }

          const body = await upstream.text()
          const contentType = upstream.headers.get('content-type') ?? 'application/xml; charset=utf-8'

          res.statusCode = 200
          res.setHeader('Content-Type', contentType)
          res.end(body)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Proxy request failed'
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: message }))
        }
      })

      server.middlewares.use('/api/article-proxy', async (req, res) => {
        try {
          const requestUrl = new URL(req.url ?? '', 'http://localhost')
          const articleUrl = requestUrl.searchParams.get('url')

          if (!articleUrl) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Missing url query parameter' }))
            return
          }

          let parsedUrl: URL
          try {
            parsedUrl = new URL(articleUrl)
          } catch {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Invalid article URL' }))
            return
          }

          if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Only http/https URLs are supported' }))
            return
          }

          const upstream = await fetch(parsedUrl.toString(), {
            headers: {
              'user-agent': 'Mozilla/5.0 News Reader',
              accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
          })

          if (!upstream.ok) {
            res.statusCode = upstream.status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: `Upstream HTTP ${upstream.status}` }))
            return
          }

          const body = await upstream.text()
          const contentType = upstream.headers.get('content-type') ?? 'text/html; charset=utf-8'

          res.statusCode = 200
          res.setHeader('Content-Type', contentType)
          res.end(body)
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Proxy request failed'
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: message }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), rssProxyPlugin()],
})
