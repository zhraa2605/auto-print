import type { NextRequest } from "next/server"
import type { ReadableStreamDefaultController } from "stream/web"

const clients: Set<ReadableStreamDefaultController> = new Set()
let orderQueue: any[] = []

export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    start(controller: ReadableStreamDefaultController) {
      clients.add(controller)

      // Send connection confirmation
      controller.enqueue(`data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`)

      console.log("[v0] New SSE client connected. Total clients:", clients.size)

      // Send any queued orders
      orderQueue.forEach((order) => {
        controller.enqueue(`data: ${JSON.stringify(order)}\n\n`)
      })
      orderQueue = [] // Clear queue after sending
    },
    cancel(controller: ReadableStreamDefaultController) {
      clients.delete(controller)
      console.log("[v0] SSE client disconnected. Total clients:", clients.size)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  })
}

export function broadcastToClients(data: any, eventType = "message") {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`

  clients.forEach((controller) => {
    try {
      controller.enqueue(message)
    } catch (error) {
      console.error("[v0] Error sending to client:", error)
      clients.delete(controller)
    }
  })

  // If no clients connected, queue the order
  if (clients.size === 0 && eventType === "message") {
    orderQueue.push(data)
    console.log("[v0] No clients connected, queuing order:", data.id)
  }
}
