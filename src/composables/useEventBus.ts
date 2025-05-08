// eventBus.ts (core)
import mitt from 'mitt'
import { onUnmounted } from 'vue'

// Empty base interface that will be extended by feature modules
export interface EventsMap {}

// @ts-ignore
export const eventBus = mitt<EventsMap>()

export function useEvent<K extends keyof EventsMap>(
  event: K,
  callback: (data: EventsMap[K]) => void
) {
  eventBus.on(event, callback)

  onUnmounted(() => {
    eventBus.off(event, callback)
  })
}
