"use client";
 
import React, { useState, useRef } from "react";
import { Upload, FileText, Sparkles, Check, RefreshCw } from "lucide-react";
import { simulateReceiptOCR } from "../../services/ai-service";
import { parseReceiptAction } from "../../actions/ai-actions";
import { useFinance } from "../../context/finance-context";
 
interface ReceiptScannerProps {
  onSuccess?: () => void;
}
 
export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ onSuccess }) => {
  const { addTransaction } = useFinance();
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState("");
  const [parsedTx, setParsedTx] = useState<any | null>(null);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
 
  const sampleReceipts = [
    "starbucks_receipt_0609.png",
    "amazon_invoice_2384.pdf",
    "decathlon_store_bill.jpg",
  ];
 
  const handleScanFile = async (name: string) => {
    setFileName(name);
    setScanning(true);
    setParsedTx(null);
    
    // Simulate multi-stage OCR processing steps
    const steps = [
      "Detecting boundaries & perspective warping...",
      "Reading merchant header: text OCR...",
      "Parsing date stamp and currency values...",
      "Comparing merchant 'Starbucks' vs categories database...",
      "Finished OCR extraction successfully!",
    ];
 
    for (let i = 0; i < steps.length; i++) {
      setScanStep(steps[i]);
      await new Promise((resolve) => setTimeout(resolve, 800)); // progress delay
    }
 
    const tx = await simulateReceiptOCR(name);
    setParsedTx(tx);
    setScanning(false);
  };

  const processFileWithAI = async (file: File) => {
    setFileName(file.name);
    setScanning(true);
    setParsedTx(null);

    const steps = [
      "Reading receipt document...",
      "Uploading to AI OCR processor...",
      "Running Gemini vision character extraction...",
      "Detecting totals and line items...",
      "Matching merchant & category rules...",
      "Finalizing parsed ledger entry...",
    ];

    let stepIndex = 0;
    setScanStep(steps[0]);

    const intervalId = setInterval(() => {
      if (stepIndex < steps.length - 1) {
        stepIndex++;
        setScanStep(steps[stepIndex]);
      }
    }, 1000);

    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });

      const tx = await parseReceiptAction(base64Data, file.type);
      setParsedTx(tx);
    } catch (err: any) {
      console.error("Gemini OCR error:", err);
      alert(`OCR scanning failed: ${err.message || err}`);
    } finally {
      clearInterval(intervalId);
      setScanning(false);
    }
  };

  const handleDropZoneClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/") || file.type === "application/pdf") {
        await processFileWithAI(file);
      } else {
        alert("Please drop a valid image file (PNG, JPG) or PDF document.");
      }
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFileWithAI(e.target.files[0]);
    }
  };
 
  const handleConfirm = () => {
    if (parsedTx) {
      addTransaction(parsedTx);
      setParsedTx(null);
      setFileName("");
      setScanStep("");
      if (onSuccess) onSuccess();
    }
  };
 
  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      {!scanning && !parsedTx && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleDropZoneClick}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
            isDragging
              ? "border-ai bg-ai/10 scale-[1.02]"
              : "border-border hover:border-ai/60 bg-muted/5 hover:bg-muted/10"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            accept="image/*,application/pdf"
            className="hidden"
          />
          <Upload className={`w-10 h-10 mb-3 transition-colors ${isDragging ? "text-ai" : "text-muted-foreground animate-bounce"}`} />
          <p className="text-sm font-bold text-foreground">Drag receipt here or click to upload</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Supports PNG, JPG, PDF up to 5MB</p>
          
          <div className="w-full flex items-center justify-center gap-2 my-4" onClick={(e) => e.stopPropagation()}>
            <span className="h-px bg-border flex-1" />
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Or select a demo receipt</span>
            <span className="h-px bg-border flex-1" />
          </div>
 
          <div className="flex flex-wrap gap-2 justify-center" onClick={(e) => e.stopPropagation()}>
            {sampleReceipts.map((name) => (
              <button
                key={name}
                onClick={() => handleScanFile(name)}
                className="text-[10px] px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg border border-border transition-colors font-medium flex items-center gap-1"
              >
                <FileText className="w-3 h-3 text-muted-foreground" />
                {name.slice(0, 15)}...
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scanning Laser Animation */}
      {scanning && (
        <div className="border border-border bg-muted/15 rounded-xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden h-[240px]">
          {/* Laser Scanner Bar */}
          <div className="absolute left-0 w-full h-1 bg-gradient-to-r from-transparent via-ai to-transparent animate-pulse" 
               style={{
                 animation: 'scan 1.8s ease-in-out infinite',
                 top: '50%'
               }} 
          />
          <style jsx>{`
            @keyframes scan {
              0% { top: 10%; }
              50% { top: 90%; }
              100% { top: 10%; }
            }
          `}</style>
          
          <RefreshCw className="w-10 h-10 text-ai animate-spin mb-4" />
          <p className="text-sm font-bold text-foreground">Analyzing {fileName}</p>
          <p className="text-xs text-ai font-semibold mt-2 animate-pulse">{scanStep}</p>
        </div>
      )}

      {/* Confirmation of OCR results */}
      {parsedTx && !scanning && (
        <div className="border border-success/30 bg-success/5 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Sparkles className="w-5 h-5 text-success animate-pulse" />
            <div>
              <p className="text-xs font-bold uppercase text-success/80">OCR Scan Completed</p>
              <p className="text-[10px] text-muted-foreground">Original file: {fileName} (Verify & edit below)</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-muted-foreground block text-[10px] uppercase font-bold">Merchant</label>
              <input
                type="text"
                value={parsedTx.merchant || ""}
                onChange={(e) => setParsedTx({ ...parsedTx, merchant: e.target.value })}
                className="w-full bg-background/50 border border-border focus:border-ai/50 rounded-lg px-2 py-1 text-xs text-foreground font-semibold focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground block text-[10px] uppercase font-bold">Amount (₹)</label>
              <input
                type="number"
                value={parsedTx.amount || ""}
                onChange={(e) => setParsedTx({ ...parsedTx, amount: parseFloat(e.target.value) || 0 })}
                className="w-full bg-background/50 border border-border focus:border-ai/50 rounded-lg px-2 py-1 text-xs text-foreground font-semibold focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground block text-[10px] uppercase font-bold">Category</label>
              <select
                value={parsedTx.category || "Other"}
                onChange={(e) => setParsedTx({ ...parsedTx, category: e.target.value })}
                className="w-full bg-background/50 border border-border focus:border-ai/50 rounded-lg px-2 py-1 text-xs text-foreground font-semibold focus:outline-none"
              >
                <option value="Food">Food</option>
                <option value="Shopping">Shopping</option>
                <option value="Transport">Transport</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Utilities">Utilities</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground block text-[10px] uppercase font-bold">Date</label>
              <input
                type="date"
                value={parsedTx.date || ""}
                onChange={(e) => setParsedTx({ ...parsedTx, date: e.target.value })}
                className="w-full bg-background/50 border border-border focus:border-ai/50 rounded-lg px-2 py-1 text-xs text-foreground font-semibold focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <label className="text-muted-foreground block text-[10px] uppercase font-bold">OCR Note</label>
            <input
              type="text"
              value={parsedTx.note || ""}
              onChange={(e) => setParsedTx({ ...parsedTx, note: e.target.value })}
              className="w-full bg-background/50 border border-border focus:border-ai/50 rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              className="flex-1 py-2 bg-success text-white rounded-lg hover:bg-success/90 font-bold flex items-center justify-center gap-1.5 shadow-md shadow-success/15 text-xs"
            >
              <Check className="w-4 h-4" /> Approve & Import
            </button>
            <button
              onClick={() => {
                setParsedTx(null);
                setFileName("");
              }}
              className="px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 font-medium text-xs"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
