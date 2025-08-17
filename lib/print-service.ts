interface Order {
  id: string
  customerName: string
  items: Array<{ name: string; quantity: number; price: number }>
  total: number
  timestamp: string
}

export async function printOrder(order: Order): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const printFrame = document.createElement("iframe")
      printFrame.style.display = "none"
      printFrame.style.position = "absolute"
      printFrame.style.left = "-9999px"
      document.body.appendChild(printFrame)

      const printContent = generatePrintHTML(order)

      const printDoc = printFrame.contentDocument || printFrame.contentWindow?.document
      if (!printDoc) {
        throw new Error("Could not access print frame document")
      }

      printDoc.open()
      printDoc.write(printContent)
      printDoc.close()

      printFrame.onload = () => {
        try {
          const printWindow = printFrame.contentWindow
          if (!printWindow) {
            throw new Error("Could not access print window")
          }

          // Focus and print
          printWindow.focus()
          printWindow.print()

          setTimeout(() => {
            document.body.removeChild(printFrame)
            resolve()
          }, 1000)
        } catch (error) {
          document.body.removeChild(printFrame)
          reject(error)
        }
      }

      printFrame.onerror = () => {
        document.body.removeChild(printFrame)
        reject(new Error("Print frame failed to load"))
      }
    } catch (error) {
      reject(error)
    }
  })
}

function generatePrintHTML(order: Order): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Order ${order.id}</title>
      <style>
        @media print {
          @page { margin: 0.5in; size: auto; }
          body { margin: 0; }
        }
        body {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.4;
          max-width: 300px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        .order-info {
          margin-bottom: 15px;
        }
        .items {
          border-bottom: 1px solid #000;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }
        .total {
          font-weight: bold;
          font-size: 14px;
          text-align: right;
          border-top: 2px solid #000;
          padding-top: 10px;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          font-size: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>ORDER RECEIPT</h2>
        <p>Auto-Print System</p>
      </div>
      
      <div class="order-info">
        <p><strong>Order #:</strong> ${order.id}</p>
        <p><strong>Customer:</strong> ${order.customerName}</p>
        <p><strong>Date:</strong> ${new Date(order.timestamp).toLocaleString()}</p>
      </div>
      
      <div class="items">
        <h3>Items:</h3>
        ${order.items
          .map(
            (item) => `
          <div class="item">
            <span>${item.quantity}x ${item.name}</span>
            <span>$${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        `,
          )
          .join("")}
      </div>
      
      <div class="total">
        <p>TOTAL: $${order.total.toFixed(2)}</p>
      </div>
      
      <div class="footer">
        <p>Thank you for your order!</p>
        <p>Printed: ${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `
}

export async function printOrderServer(order: Order): Promise<void> {
  // This would be used if running in a server environment
  // You can integrate with system printing commands here
  console.log("[v0] Server-side printing not implemented - using client-side printing")
  throw new Error("Server-side printing requires system integration")
}
