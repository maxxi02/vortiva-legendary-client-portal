import { useEffect, useRef } from "react"
import Pusher from "pusher-js"

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY ?? ""
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "ap1"

let pusherInstance: Pusher | null = null

function getPusher(): Pusher | null {
  if (!PUSHER_KEY) return null
  if (!pusherInstance) {
    pusherInstance = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER })
  }
  return pusherInstance
}

export function usePusherChannel(
  channel: string,
  event: string,
  handler: (data: unknown) => void
) {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    const pusher = getPusher()
    if (!pusher || !channel) return

    const ch = pusher.subscribe(channel)
    ch.bind(event, (data: unknown) => handlerRef.current(data))

    return () => {
      ch.unbind(event)
      pusher.unsubscribe(channel)
    }
  }, [channel, event])
}
