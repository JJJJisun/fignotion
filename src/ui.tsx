import { Button, Container, render, Text, Textbox, VerticalSpace } from '@create-figma-plugin/ui'
import { emit } from '@create-figma-plugin/utilities'
import { h } from 'preact'
import { useCallback, useState } from 'preact/hooks'

type RenderBlock = {
  type: 'heading_1' | 'heading_2' | 'heading_3' | 'paragraph' | 'bulleted_list_item'
  text: string
}

const BASE_URL = 'https://fignotion-7upqfax1t-jjjjisuns-projects.vercel.app'

function Plugin(props: { pageUrl?: string }) {
  const [token, setToken] = useState('')
  const [pageUrl, setPageUrl] = useState(props.pageUrl ?? '')
  const [status, setStatus] = useState('토큰과 페이지 URL을 입력하세요.')

  const handleLoadButtonClick = useCallback(async function () {
    const trimmedToken = token.trim()
    const trimmedPageUrl = pageUrl.trim()
    if (trimmedToken === '') {
      setStatus('Notion API 토큰을 입력해주세요.')
      return
    }
    if (trimmedPageUrl === '') {
      setStatus('Notion 페이지 URL을 입력해주세요.')
      return
    }

    const pageId = extractPageId(trimmedPageUrl)
    if (pageId === null) {
      setStatus('유효한 Notion 페이지 URL이 아닙니다.')
      return
    }

    setStatus('Notion API 호출 중...')
    try {
      const response = await fetch(
        `${BASE_URL}/api/notion?pageId=${encodeURIComponent(pageId)}`,
        {
          method: 'GET',
          headers: {
            Authorization: 'Bearer ' + trimmedToken,
            'Content-Type': 'application/json'
          }
        }
      )
      if (!response.ok) {
        throw new Error(`프록시 요청 실패 (${response.status})`)
      }

      const payload = await response.json()
      const data = payload.blocks || {}
      const pageData = payload.page || {}
      const pageTitle = extractPageTitle(pageData)
      const blocks: Array<RenderBlock> = Array.isArray(data.results)
        ? data.results.map(toRenderBlock).filter(isRenderBlock)
        : []
      emit('NOTION_CONTENT', {
        pageUrl: trimmedPageUrl,
        pageTitle,
        blocks
      })
      setStatus(`불러오기 완료: ${pageTitle}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setStatus(`오류: ${message}`)
      emit('NOTION_ERROR', {
        message
      })
    }
  }, [token, pageUrl])

  return (
    <Container space="medium">
      <VerticalSpace space="large" />
      <Text>Notion API Token</Text>
      <VerticalSpace space="extraSmall" />
      <Textbox
        onValueInput={setToken}
        placeholder="secret_xxx..."
        value={token}
      />
      <VerticalSpace space="large" />
      <Text>Notion Page URL</Text>
      <VerticalSpace space="extraSmall" />
      <Textbox
        onValueInput={setPageUrl}
        placeholder="https://www.notion.so/..."
        value={pageUrl}
      />
      <VerticalSpace space="large" />
      <Button fullWidth onClick={handleLoadButtonClick}>
        내용 불러오기
      </Button>
      <VerticalSpace space="small" />
      <Text>{status}</Text>
    </Container>
  )
}

export default render(Plugin)

function extractPageId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const compactPath = parsed.pathname.replace(/-/g, '')
    const match = compactPath.match(/([0-9a-fA-F]{32})/)
    return match ? match[1] : null
  } catch (_error) {
    return null
  }
}

function extractPageTitle(page: unknown): string {
  if (typeof page !== 'object' || page === null) return 'Untitled'
  const data = page as {
    properties?: Record<string, { type?: string; title?: Array<{ plain_text?: string }> }>
  }
  const properties = data.properties ?? {}
  for (const key of Object.keys(properties)) {
    const property = properties[key]
    if (property?.type === 'title' && Array.isArray(property.title)) {
      const text = property.title.map((item) => item.plain_text ?? '').join('')
      if (text.trim() !== '') return text
    }
  }
  return 'Untitled'
}

function toRenderBlock(block: unknown): RenderBlock | null {
  if (typeof block !== 'object' || block === null) return null
  const data = block as Record<string, unknown>
  const type = data.type
  if (
    type !== 'heading_1' &&
    type !== 'heading_2' &&
    type !== 'heading_3' &&
    type !== 'paragraph' &&
    type !== 'bulleted_list_item'
  ) {
    return null
  }
  const content = data[type] as { rich_text?: Array<{ plain_text?: string }> } | undefined
  const text = Array.isArray(content?.rich_text)
    ? content.rich_text.map((item) => item.plain_text ?? '').join('')
    : ''
  if (text.trim() === '') return null
  return { type, text }
}

function isRenderBlock(value: RenderBlock | null): value is RenderBlock {
  return value !== null
}
