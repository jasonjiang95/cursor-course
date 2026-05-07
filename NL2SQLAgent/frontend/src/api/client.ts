/**
 * 请求基址：`import.meta.env.VITE_API_BASE_URL`（无尾斜杠）。
 * 401/404/422/500 等将 `detail` 解析为可读字符串，与 FastAPI 默认错误体一致。
 */

const API_V1 = '/api/v1'

export function getApiBase(): string {
  const u = (import.meta.env.VITE_API_BASE_URL ?? '').trim()
  if (!u) {
    throw new Error(
      '未设置 VITE_API_BASE_URL。请将 frontend/.env.example 复制为 .env.development 并填写后端地址。',
    )
  }
  return u.replace(/\/$/, '')
}

export function apiV1Path(subpath: string): string {
  const p = subpath.startsWith('/') ? subpath : `/${subpath}`
  return `${API_V1}${p}`
}

function formatDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'object' && item !== null && 'msg' in item) {
          return String((item as { msg: unknown }).msg)
        }
        return JSON.stringify(item)
      })
      .join('; ')
  }
  if (detail != null && typeof detail === 'object') {
    return JSON.stringify(detail)
  }
  return String(detail ?? '')
}

export async function fetchJson<T>(pathFromBase: string, init?: RequestInit): Promise<T> {
  const url = `${getApiBase()}${pathFromBase.startsWith('/') ? pathFromBase : `/${pathFromBase}`}`
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    let msg = res.statusText
    try {
      const j: unknown = await res.json()
      if (typeof j === 'object' && j !== null && 'detail' in j) {
        msg = formatDetail((j as { detail: unknown }).detail)
      }
    } catch {
      /* ignore non-JSON body */
    }
    throw new Error(`HTTP ${res.status}: ${msg}`)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return (await res.json()) as T
}
