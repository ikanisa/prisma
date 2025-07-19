import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, Download, Printer } from "lucide-react";

interface QRGeneratorProps {
  barId: string;
}

export default function QRGenerator({ barId }: QRGeneratorProps) {
  const [startTable, setStartTable] = useState(1);
  const [endTable, setEndTable] = useState(10);
  const [generating, setGenerating] = useState(false);

  const generateQRCode = (tableCode: string) => {
    const qrData = `${barId}|${tableCode}`;
    const encodedData = btoa(qrData);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedData}`;
  };

  const generateBatch = () => {
    setGenerating(true);
    
    // Create a printable page with all QR codes
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let htmlContent = `
      <html>
        <head>
          <title>QR Codes - Tables ${startTable} to ${endTable}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .qr-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
            .qr-item { text-align: center; page-break-inside: avoid; border: 1px solid #ddd; padding: 15px; }
            .qr-item img { width: 150px; height: 150px; }
            .table-code { font-size: 18px; font-weight: bold; margin-top: 10px; }
            .instructions { font-size: 12px; color: #666; margin-top: 5px; }
            @media print { .qr-grid { grid-template-columns: repeat(2, 1fr); } }
          </style>
        </head>
        <body>
          <h1>Bar QR Codes - Tables ${startTable} to ${endTable}</h1>
          <p>Scan to order from your table</p>
          <div class="qr-grid">
    `;

    for (let i = startTable; i <= endTable; i++) {
      const tableCode = i.toString().padStart(2, '0');
      const qrUrl = generateQRCode(tableCode);
      
      htmlContent += `
        <div class="qr-item">
          <img src="${qrUrl}" alt="Table ${tableCode} QR Code" />
          <div class="table-code">TABLE ${tableCode}</div>
          <div class="instructions">Scan to view menu & order</div>
        </div>
      `;
    }

    htmlContent += `
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Auto-print after images load
    setTimeout(() => {
      printWindow.print();
      setGenerating(false);
    }, 2000);
  };

  const downloadSingle = (tableCode: string) => {
    const qrUrl = generateQRCode(tableCode);
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `table-${tableCode}-qr.png`;
    link.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          QR Code Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startTable">Start Table</Label>
            <Input
              id="startTable"
              type="number"
              value={startTable}
              onChange={(e) => setStartTable(parseInt(e.target.value) || 1)}
              min={1}
            />
          </div>
          <div>
            <Label htmlFor="endTable">End Table</Label>
            <Input
              id="endTable"
              type="number"
              value={endTable}
              onChange={(e) => setEndTable(parseInt(e.target.value) || 1)}
              min={1}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={generateBatch}
            disabled={generating || startTable > endTable}
            className="flex-1"
          >
            <Printer className="w-4 h-4 mr-2" />
            {generating ? 'Generating...' : 'Print Batch'}
          </Button>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Preview</h4>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: Math.min(6, endTable - startTable + 1) }, (_, i) => {
              const tableNum = startTable + i;
              const tableCode = tableNum.toString().padStart(2, '0');
              return (
                <div key={tableNum} className="text-center">
                  <img 
                    src={generateQRCode(tableCode)} 
                    alt={`Table ${tableCode}`}
                    className="w-20 h-20 mx-auto"
                  />
                  <div className="text-xs mt-1">Table {tableCode}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadSingle(tableCode)}
                    className="mt-1"
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-muted p-3 rounded text-sm">
          <p><strong>QR Format:</strong> {barId}|TABLE_CODE (base64 encoded)</p>
          <p><strong>Usage:</strong> Patrons scan → WhatsApp opens → Onboarding agent starts</p>
        </div>
      </CardContent>
    </Card>
  );
}