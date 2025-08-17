import { type NextRequest, NextResponse } from "next/server"
import { serverPrintService } from "@/lib/server-print-service"

export async function POST(request: NextRequest) {
  try {
    const orderData = await request.json()

    // Generate order ID if not provided
    const order = {
      id: orderData.id || `ORD-${Date.now()}`,
      customerName: orderData.customerName || "Unknown Customer",
      items: orderData.items || [],
      total: orderData.total || 0,
      timestamp: new Date().toISOString(),
      phone: orderData.phone,
      address: orderData.address,
    }

    console.log("[v0] New order received via webhook:", order.id)

    const printSuccess = await serverPrintService.printOrder(order)

    if (printSuccess) {
      console.log("[v0] Order printed successfully:", order.id)
    } else {
      console.error("[v0] Failed to print order:", order.id)
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      printed: printSuccess,
    })
  } catch (error) {
    console.error("[v0] Webhook error:", error)
    return NextResponse.json({ error: "Failed to process order" }, { status: 500 })
  }
}
