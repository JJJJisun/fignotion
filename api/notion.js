const NOTION_VERSION = '2022-06-28'

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { pageId } = req.query
  if (typeof pageId !== 'string' || pageId.trim() === '') {
    return res.status(400).json({ error: 'Missing pageId query parameter' })
  }

  const authorization = req.headers.authorization
  if (typeof authorization !== 'string' || authorization.trim() === '') {
    return res.status(401).json({ error: 'Missing Authorization header' })
  }

  try {
    const commonHeaders = {
      Authorization: authorization,
      'Notion-Version': NOTION_VERSION
    }

    const [blocksResponse, pageResponse] = await Promise.all([
      fetch(`https://api.notion.com/v1/blocks/${encodeURIComponent(pageId)}/children`, {
        method: 'GET',
        headers: commonHeaders
      }),
      fetch(`https://api.notion.com/v1/pages/${encodeURIComponent(pageId)}`, {
        method: 'GET',
        headers: commonHeaders
      })
    ])

    if (!blocksResponse.ok) {
      const detail = await blocksResponse.text()
      return res
        .status(blocksResponse.status)
        .json({ error: 'Notion blocks request failed', detail })
    }

    if (!pageResponse.ok) {
      const detail = await pageResponse.text()
      return res
        .status(pageResponse.status)
        .json({ error: 'Notion page request failed', detail })
    }

    const [blocks, page] = await Promise.all([blocksResponse.json(), pageResponse.json()])
    return res.status(200).json({ blocks, page })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return res.status(500).json({ error: 'Proxy request failed', detail: message })
  }
}
