"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Printer, CheckCircle, AlertCircle } from "lucide-react"

export default function AutoPrintDashboard() {
  const [lastTestResult, setLastTestResult] = useState<{
    success: boolean
    orderId?: string
    printed?: boolean
  } | null>(null)
  const [isTestingPrint, setIsTestingPrint] = useState(false)

  const testPrint = async () => {
    setIsTestingPrint(true)
    try {
      const response = await fetch("/api/orders/test-print", { method: "POST" })
      const result = await response.json()

      setLastTestResult(result)
      console.log("[v0] Test print result:", result)
    } catch (error) {
      console.error("[v0] Test print failed:", error)
      setLastTestResult({ success: false })
    } finally {
      setIsTestingPrint(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Printer className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold">Auto Print Orders</h1>
          </div>
          <p className="text-xl text-muted-foreground">Server-side automatic printing - no browser required</p>
          <div className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">System Ready - Orders print automatically</span>
          </div>
        </div>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Server-side printing system information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-green-600">✅ Active Features</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Server-side printing (no browser needed)</li>
                  <li>• Thermal printer support</li>
                  <li>• PDF fallback printing</li>
                  <li>• Webhook endpoint: /api/orders/webhook</li>
                  <li>• Automatic order processing</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">🖨️ Print Methods</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Primary: Thermal receipt printer</li>
                  <li>• Fallback: PDF → System printer</li>
                  <li>• Cross-platform support</li>
                  <li>• Silent printing (no dialogs)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Section */}
        <Card>
          <CardHeader>
            <CardTitle>Test Printing</CardTitle>
            <CardDescription>Test the automatic printing system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={testPrint} disabled={isTestingPrint} size="lg" className="w-full">
              <Printer className="h-4 w-4 mr-2" />
              {isTestingPrint ? "Printing..." : "Test Print Order"}
            </Button>

            {lastTestResult && (
              <div
                className={`p-4 rounded-lg border ${
                  lastTestResult.success && lastTestResult.printed
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  {lastTestResult.success && lastTestResult.printed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="font-medium">
                    {lastTestResult.success && lastTestResult.printed
                      ? `✅ Test order ${lastTestResult.orderId} printed successfully!`
                      : "❌ Print test failed - check printer connection"}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Send Orders</CardTitle>
            <CardDescription>Send orders to be automatically printed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Webhook Endpoint:</h3>
                <code className="bg-muted p-2 rounded text-sm block">POST /api/orders/webhook</code>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Example Order JSON:</h3>
                <pre className="bg-muted p-4 rounded text-sm overflow-x-auto">
                  {`{
  "customerName": "John Doe",
  "phone": "555-0123",
  "address": "123 Main St, City",
  "items": [
    {
      "name": "Pizza",
      "quantity": 2,
      "price": 15.99
    }
  ],
  "total": 31.98
}`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
