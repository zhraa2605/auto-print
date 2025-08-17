import { NextResponse } from "next/server"
import { serverPrintService } from "@/lib/server-print-service"

export async function POST() {
  const testOrder = {
    id: `TEST-${Date.now()}`,
    customerName: "Test Customer",
    items: [
      { name: "Burger", quantity: 2, price: 12.99 },
      { name: "Fries", quantity: 1, price: 4.99 },
      { name: "Drink", quantity: 2, price: 2.99 },
    ],
    total: 33.96,
    timestamp: new Date().toISOString(),
    phone: "555-0123",
    address: "123 Test Street, Test City",
  }

  console.log("[v0] Test order created:", testOrder.id)

  const printSuccess = await serverPrintService.printOrder(testOrder)

  if (printSuccess) {
    console.log("[v0] Test order printed successfully:", testOrder.id)
  } else {
    console.error("[v0] Failed to print test order:", testOrder.id)
  }

  return NextResponse.json({
    success: true,
    orderId: testOrder.id,
    printed: printSuccess,
  })
}
