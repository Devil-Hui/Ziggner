/**
 * IndexedDB 暂存区 —— 媒体文件浏览器端暂存
 * ========================================
 * 数据库: ziggner_media_staging
 * ObjectStore: media_items
 * 逐个处理图片/视频，最后随 SPU 表单一起提交
 */

const DB_NAME = 'ziggner_media_staging'
const STORE_NAME = 'media_items'
const DB_VERSION = 1

export interface StagedMediaItem {
  id?: number
  mediaType: 'image' | 'video'
  // 图片: 4 尺寸 Blob
  thumbBlob?: Blob
  listBlob?: Blob
  largeBlob?: Blob
  originalBlob?: Blob
  // 视频: 原视频 + 3 头帧
  videoBlob?: Blob
  videoFrameThumb?: Blob
  videoFrameList?: Blob
  videoFrameLarge?: Blob
  // 预览
  previewDataUrl?: string
  fileName: string
  fileSize: number
  createdAt: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function addStagedItem(item: StagedMediaItem): Promise<number> {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.add({ ...item, createdAt: Date.now() })
    request.onsuccess = () => resolve(request.result as number)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => database.close()
  })
}

export async function getAllStagedItems(): Promise<StagedMediaItem[]> {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => database.close()
  })
}

export async function deleteStagedItem(id: number): Promise<void> {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => database.close()
  })
}

export async function clearAllStaged(): Promise<void> {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.clear()
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => database.close()
  })
}

export async function getStagedCount(): Promise<number> {
  const database = await openDB()
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.count()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => database.close()
  })
}