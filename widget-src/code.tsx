/** @jsx figma.widget.h */

import { once, showUI } from '@create-figma-plugin/utilities'

const { widget } = figma
const { AutoLayout, Text, useSyncedState, waitForTask } = widget

type RenderBlock =
  | { type: 'heading_1'; text: string }
  | { type: 'heading_2'; text: string }
  | { type: 'heading_3'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'bulleted_list_item'; text: string }

const UI_SIZE = { width: 360, height: 420 }

export default function () {
  widget.register(NotionWidget)
}

function NotionWidget() {
  const [pageTitle, setPageTitle] = useSyncedState('pageTitle', 'Notion Viewer')
  const [pageUrl, setPageUrl] = useSyncedState('pageUrl', '')
  const [blocks, setBlocks] = useSyncedState<Array<RenderBlock>>('blocks', [])
  const [status, setStatus] = useSyncedState(
    'status',
    '위젯을 클릭해서 Notion 페이지를 연결하세요.'
  )

  function openConfigUI() {
    waitForTask(
      new Promise<void>((resolve) => {
        let completed = false
        const complete = () => {
          if (completed) return
          completed = true
          resolve()
        }

        once(
          'NOTION_CONTENT',
          (msg: { pageUrl: string; pageTitle?: string; blocks: Array<RenderBlock> }) => {
          setPageUrl(msg.pageUrl)
          if (typeof msg.pageTitle === 'string' && msg.pageTitle.trim() !== '') {
            setPageTitle(msg.pageTitle)
          }
          setBlocks(msg.blocks)
          setStatus(`불러오기 완료 (${msg.blocks.length}개 블록)`)
          complete()
          }
        )

        once('NOTION_ERROR', (msg: { message: string }) => {
          setStatus(`오류: ${msg.message}`)
          complete()
        })

        showUI(
          {
            width: UI_SIZE.width,
            height: UI_SIZE.height
          },
          {
            pageUrl
          }
        )
      })
    )
  }

  return (
    <AutoLayout
      direction="vertical"
      fill="#FFFFFF"
      stroke="#E5E7EB"
      strokeWidth={1}
      cornerRadius={12}
      spacing={8}
      padding={12}
      width={360}
      onClick={openConfigUI}
    >
      <Text fontSize={14} fontWeight="bold">
        {pageTitle}
      </Text>
      <Text fontSize={11} fill="#6B7280">
        {status}
      </Text>
      {pageUrl ? (
        <Text fontSize={10} fill="#9CA3AF">
          {pageUrl}
        </Text>
      ) : null}

      {blocks.length === 0 ? (
        <Text fontSize={12} fill="#111827">
          표시할 내용이 없습니다.
        </Text>
      ) : (
        <AutoLayout direction="vertical" spacing={6} width="fill-parent">
          {blocks.map((block, index) => (
            <Text
              key={`${block.type}-${index}`}
              fontSize={getFontSize(block.type)}
              fontWeight={getFontWeight(block.type)}
              width="fill-parent"
              horizontalAlignText="left"
            >
              {formatBlockText(block)}
            </Text>
          ))}
        </AutoLayout>
      )}
    </AutoLayout>
  )
}

function formatBlockText(block: RenderBlock): string {
  if (block.type === 'bulleted_list_item') {
    return `• ${block.text}`
  }
  return block.text
}

function getFontSize(type: RenderBlock['type']): number {
  if (type === 'heading_1') return 20
  if (type === 'heading_2') return 16
  if (type === 'heading_3') return 14
  return 12
}

function getFontWeight(type: RenderBlock['type']): 400 | 700 {
  if (type === 'heading_1' || type === 'heading_2' || type === 'heading_3') {
    return 700
  }
  return 400
}

