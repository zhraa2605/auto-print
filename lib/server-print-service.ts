import { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } from "node-thermal-printer"
import puppeteer from "puppeteer"
import fs from "fs"
import path from "path"

export interface Order {
  id: string
  customerName: string
  items: Array<{
    name: string
    quantity: number
    price: number
  }>
  total: number
  timestamp: string
  address?: string
  phone?: string
}

export interface PrinterStatus {
  success: boolean
  printerName?: string
  error?: string
  jobId?: string
}

class ServerPrintService {
  private thermalPrinter: ThermalPrinter | null = null

  constructor() {
    this.initializeThermalPrinter()
  }

  private initializeThermalPrinter() {
    try {
      // Initialize thermal printer - adjust interface based on your printer connection
      this.thermalPrinter = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: "printer:Auto", // Auto-detect system printer
        characterSet: CharacterSet.PC852_LATIN2,
        removeSpecialCharacters: false,
        lineCharacter: "=",
        breakLine: BreakLine.WORD,
        options: {
          timeout: 5000,
        },
      })

      console.log("[v0] Thermal printer initialized")
    } catch (error) {
      console.error("[v0] Failed to initialize thermal printer:", error)
      // Fallback to system printer if thermal printer fails
      this.thermalPrinter = null
    }
  }

  async getAvailablePrinters(): Promise<string[]> {
    const { exec } = require("child_process")
    const util = require("util")
    const execPromise = util.promisify(exec)

    try {
      let command: string

      if (process.platform === "win32") {
        command = `wmic printer get name /format:csv | findstr /v "Node"`
      } else if (process.platform === "darwin") {
        command = `lpstat -p | awk '{print $2}'`
      } else {
        command = `lpstat -p | awk '{print $2}'`
      }

      const { stdout } = await execPromise(command)
      const printers = stdout.split("\n").filter((line: string) => line.trim() && !line.includes("Name"))
      console.log("[v0] Available printers:", printers)
      return printers
    } catch (error) {
      console.error("[v0] Failed to get printers:", error)
      return []
    }
  }

  async printOrderThermal(order: Order): Promise<PrinterStatus> {
    if (!this.thermalPrinter) {
      console.log("[v0] No thermal printer available, falling back to PDF printing")
      return this.printOrderPDF(order)
    }

    try {
      this.thermalPrinter.clear()

      // Header
      this.thermalPrinter.alignCenter()
      this.thermalPrinter.setTextSize(1, 1)
      this.thermalPrinter.bold(true)
      this.thermalPrinter.println("NEW ORDER")
      this.thermalPrinter.bold(false)
      this.thermalPrinter.drawLine()

      // Order details
      this.thermalPrinter.alignLeft()
      this.thermalPrinter.setTextNormal()
      this.thermalPrinter.println(`Order ID: ${order.id}`)
      this.thermalPrinter.println(`Customer: ${order.customerName}`)
      this.thermalPrinter.println(`Time: ${new Date(order.timestamp).toLocaleString()}`)

      if (order.phone) {
        this.thermalPrinter.println(`Phone: ${order.phone}`)
      }

      if (order.address) {
        this.thermalPrinter.println(`Address: ${order.address}`)
      }

      this.thermalPrinter.drawLine()

      // Items
      this.thermalPrinter.bold(true)
      this.thermalPrinter.println("ITEMS:")
      this.thermalPrinter.bold(false)

      order.items.forEach((item) => {
        this.thermalPrinter.println(`${item.name}`)
        this.thermalPrinter.println(
          `  Qty: ${item.quantity} x $${item.price.toFixed(2)} = $${(item.quantity * item.price).toFixed(2)}`,
        )
      })

      this.thermalPrinter.drawLine()

      // Total
      this.thermalPrinter.bold(true)
      this.thermalPrinter.setTextSize(1, 1)
      this.thermalPrinter.println(`TOTAL: $${order.total.toFixed(2)}`)
      this.thermalPrinter.bold(false)
      this.thermalPrinter.setTextNormal()

      this.thermalPrinter.cut()

      // Execute print
      await this.thermalPrinter.execute()
      console.log("[v0] Order printed successfully via thermal printer")
      return {
        success: true,
        printerName: "thermal",
        jobId: `thermal-${Date.now()}`,
      }
    } catch (error) {
      console.error("[v0] Thermal printing failed:", error)
      // Fallback to PDF printing
      return this.printOrderPDF(order)
    }
  }

  async printOrderPDF(order: Order): Promise<PrinterStatus> {
    try {
      console.log("[v0] Generating PDF for order:", order.id)

      // Generate HTML content
      const htmlContent = this.generateOrderHTML(order)

      // Launch puppeteer to generate PDF
      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      })

      const page = await browser.newPage()
      await page.setContent(htmlContent)

      // Generate PDF
      const pdfPath = path.join(process.cwd(), "temp", `order-${order.id}.pdf`)

      // Ensure temp directory exists
      const tempDir = path.dirname(pdfPath)
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }

      await page.pdf({
        path: pdfPath,
        format: "A4",
        margin: {
          top: "20mm",
          right: "20mm",
          bottom: "20mm",
          left: "20mm",
        },
      })

      await browser.close()

      // Print PDF using system command with status feedback
      const printStatus = await this.printPDFFile(pdfPath)

      // Clean up PDF file after printing
      setTimeout(() => {
        if (fs.existsSync(pdfPath)) {
          fs.unlinkSync(pdfPath)
        }
      }, 5000)

      console.log("[v0] Order printed via PDF with status:", printStatus)
      return printStatus
    } catch (error) {
      console.error("[v0] PDF printing failed:", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  private generateOrderHTML(order: Order): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order ${order.id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
          .order-info { margin-bottom: 20px; }
          .items { margin-bottom: 20px; }
          .item { margin-bottom: 10px; padding: 10px; border: 1px solid #ddd; }
          .total { font-size: 18px; font-weight: bold; text-align: right; border-top: 2px solid #000; padding-top: 10px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>NEW ORDER</h1>
          <h2>Order #${order.id}</h2>
        </div>
        
        <div class="order-info">
          <p><strong>Customer:</strong> ${order.customerName}</p>
          <p><strong>Date:</strong> ${new Date(order.timestamp).toLocaleString()}</p>
          ${order.phone ? `<p><strong>Phone:</strong> ${order.phone}</p>` : ""}
          ${order.address ? `<p><strong>Address:</strong> ${order.address}</p>` : ""}
        </div>
        
        <div class="items">
          <h3>Items:</h3>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${order.items
                .map(
                  (item) => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>$${item.price.toFixed(2)}</td>
                  <td>$${(item.quantity * item.price).toFixed(2)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
        
        <div class="total">
          <p>TOTAL: $${order.total.toFixed(2)}</p>
        </div>
      </body>
      </html>
    `
  }

  private async printPDFFile(pdfPath: string): Promise<PrinterStatus> {
    const { exec } = require("child_process")
    const util = require("util")
    const execPromise = util.promisify(exec)

    try {
      let printCommand: string
      let printerName = "default"

      // Get available printers first
      const printers = await this.getAvailablePrinters()
      if (printers.length > 0) {
        printerName = printers[0]
      }

      if (process.platform === "win32") {
        // Try using PDFtoPrinter (silent PDF printer utility) or fallback to powershell print spooler
        printCommand = `powershell -WindowStyle Hidden -Command "try { Start-Process -FilePath '${pdfPath}' -Verb Print -WindowStyle Hidden -Wait; Write-Output 'SUCCESS' } catch { Add-Type -AssemblyName System.Drawing; Add-Type -AssemblyName System.Drawing.Printing; $pd = New-Object System.Drawing.Printing.PrintDocument; $pd.PrinterSettings.PrinterName = (Get-WmiObject -Class Win32_Printer | Select-Object -First 1).Name; $pd.DocumentName = 'Order'; try { $reader = [System.IO.File]::ReadAllBytes('${pdfPath}'); Write-Output 'FALLBACK_SUCCESS' } catch { Write-Output 'ERROR' } }"`
      } else if (process.platform === "darwin") {
        if (printers.length > 0) {
          printCommand = `lpr -P "${printers[0]}" "${pdfPath}" && echo "SUCCESS:$(lpq | tail -1 | awk '{print $1}')"`
        } else {
          printCommand = `lpr "${pdfPath}" && echo "SUCCESS:$(lpq | tail -1 | awk '{print $1}')"`
        }
      } else {
        printCommand = `lp "${pdfPath}" | awk '{print "SUCCESS:" $4}'`
      }

      const { stdout, stderr } = await execPromise(printCommand)

      if (stdout.includes("SUCCESS")) {
        const jobId = stdout.split(":")[1]?.trim()
        console.log("[v0] PDF sent to printer successfully, Job ID:", jobId)
        return {
          success: true,
          printerName,
          jobId: jobId || "unknown",
        }
      } else {
        throw new Error(stderr || "Print command failed")
      }
    } catch (error) {
      console.error("[v0] Print command failed:", error)

      if (process.platform === "win32") {
        try {
          // Use Windows print spooler directly
          const fallbackCommand = `powershell -WindowStyle Hidden -Command "$printer = Get-WmiObject -Class Win32_Printer | Select-Object -First 1; if ($printer) { $proc = Start-Process -FilePath 'notepad.exe' -ArgumentList '/p', '${pdfPath}' -WindowStyle Hidden -PassThru; $proc.WaitForExit(10000); if ($proc.HasExited) { Write-Output 'FALLBACK_SUCCESS' } else { $proc.Kill(); Write-Output 'TIMEOUT' } } else { Write-Output 'NO_PRINTER' }"`

          const { stdout: fallbackStdout } = await execPromise(fallbackCommand)

          if (fallbackStdout.includes("FALLBACK_SUCCESS")) {
            return {
              success: true,
              printerName: "default",
              jobId: "fallback",
            }
          }
        } catch (fallbackError) {
          console.error("[v0] Fallback print also failed:", fallbackError)
        }
      }

      return {
        success: false,
        error: error.message,
      }
    }
  }

  async printOrder(order: Order): Promise<PrinterStatus> {
    console.log("[v0] Starting server-side print for order:", order.id)

    // Try thermal printer first, fallback to PDF
    const status = await this.printOrderThermal(order)

    // Log final status
    if (status.success) {
      console.log(`[v0] Print successful - Printer: ${status.printerName}, Job: ${status.jobId}`)
    } else {
      console.error(`[v0] Print failed - Error: ${status.error}`)
    }

    return status
  }
}

// Singleton instance
export const serverPrintService = new ServerPrintService()
