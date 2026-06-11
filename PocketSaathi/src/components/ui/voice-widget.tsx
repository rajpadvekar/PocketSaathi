"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Play, Sparkles, Check, AlertCircle, RefreshCw } from "lucide-react";
import { parseVoiceCommandAction } from "../../actions/ai-actions";
import { useFinance } from "../../context/finance-context";

interface VoiceWidgetProps {
  onSuccess?: () => void;
}

export const VoiceWidget: React.FC<VoiceWidgetProps> = ({ onSuccess }) => {
  const { addTransaction } = useFinance();
  const [isSupported, setIsSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsedTx, setParsedTx] = useState<any | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [recognition, setRecognition] = useState<any>(null);

  const transcriptRef = useRef("");
  const isProcessingRef = useRef(false);

  const sampleCommands = [
    "Spent 350 rupees on lunch at Subway",
    "Spent 1200 on petrol",
    "Earned 15000 freelance project payment",
    "Spent 649 rupees on Netflix subscription",
  ];

  // Initialize SpeechRecognition on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        setIsSupported(true);
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = "en-IN"; // Enforce Indian English locale

        rec.onstart = () => {
          setIsRecording(true);
          setStatusMsg("Listening... Speak now!");
        };

        rec.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          const text = finalTranscript || interimTranscript;
          setTranscript(text);
          transcriptRef.current = text;
        };

        rec.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          if (event.error === "not-allowed") {
            setStatusMsg("Microphone permission blocked. Please enable mic access.");
          } else {
            setStatusMsg(`Speech Error: ${event.error}`);
          }
          setIsRecording(false);
        };

        rec.onend = () => {
          setIsRecording(false);
          const textToProcess = transcriptRef.current;
          if (textToProcess && textToProcess.trim().length > 0) {
            if (!isProcessingRef.current) {
              handleVoiceCommand(textToProcess);
            }
          } else {
            setStatusMsg("No speech detected. Click the mic and try speaking.");
          }
        };

        setRecognition(rec);
      }
    }
  }, []);

  const handleVoiceCommand = async (text: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setStatusMsg("Analyzing audio with Gemini AI...");
    setParsedTx(null);
    try {
      const parsed = await parseVoiceCommandAction(text);
      if (parsed) {
        setParsedTx(parsed);
        setStatusMsg("AI analysis complete! Verify details below:");
      } else {
        setStatusMsg("Could not extract transaction details. Try again.");
      }
    } catch (err: any) {
      console.error(err);
      setStatusMsg(err.message || "Failed to analyze speech. Try again.");
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
      transcriptRef.current = ""; // Clear ref for next time
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      if (recognition) {
        recognition.stop();
      }
      setIsRecording(false);
    } else {
      setTranscript("");
      transcriptRef.current = "";
      setParsedTx(null);
      if (recognition) {
        try {
          recognition.start();
        } catch (err) {
          console.error("SpeechRecognition start error:", err);
        }
      } else {
        setStatusMsg("Speech recognition is not initialized yet.");
      }
    }
  };

  const handlePresetClick = async (cmd: string) => {
    setTranscript(cmd);
    await handleVoiceCommand(cmd);
  };

  const handleConfirm = () => {
    if (parsedTx) {
      addTransaction(parsedTx);
      setParsedTx(null);
      setTranscript("");
      setStatusMsg("Added to transactions successfully!");
      if (onSuccess) onSuccess();
    }
  };

  return (
    <div className="space-y-4">
      {/* Compatibility Notice */}
      {!isSupported && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">Live mic recording not supported</p>
            <p className="mt-0.5">Your browser doesn't support Web Speech recognition. Please use Google Chrome, Microsoft Edge, or Apple Safari for live recording. You can still test with the sandbox presets below!</p>
          </div>
        </div>
      )}

      {/* Record Mic Button Box */}
      <div className="flex flex-col items-center justify-center py-6 border-b border-border">
        <button
          onClick={handleMicClick}
          disabled={!isSupported || isProcessing}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 relative ${
            isRecording
              ? "bg-destructive text-white shadow-red-500/30 scale-95"
              : isProcessing
              ? "bg-muted text-muted-foreground scale-95 cursor-not-allowed"
              : "bg-primary text-primary-foreground hover:scale-105 shadow-primary/20"
          } shadow-lg`}
        >
          {isRecording ? (
            <>
              <MicOff className="w-6 h-6 animate-pulse" />
              {/* Soundwaves */}
              <span className="absolute -inset-1.5 rounded-full border border-destructive/50 animate-ping" />
              <span className="absolute -inset-3.5 rounded-full border border-destructive/30 animate-pulse" />
            </>
          ) : isProcessing ? (
            <RefreshCw className="w-6 h-6 animate-spin text-ai" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </button>
        
        <p className="text-xs text-muted-foreground mt-4 font-medium">
          {isRecording
            ? "Listening... speak now"
            : isProcessing
            ? "Gemini is analyzing..."
            : isSupported
            ? "Click the mic to speak your transaction"
            : "Live voice unsupported. Use presets below:"}
        </p>
      </div>

      {/* Transcript Log */}
      <div className="bg-muted/10 p-4 rounded-xl border border-border/50">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-ai" /> Spoken Input / Transcript
        </span>
        <p className="text-sm font-semibold text-foreground mt-1 min-h-[20px] italic">
          {transcript || (isRecording ? "" : "No voice input detected yet.")}
        </p>
        {statusMsg && (
          <p className="text-[11px] text-ai mt-2 font-medium flex items-center gap-1.5">
            {isProcessing && <RefreshCw className="w-3 h-3 animate-spin text-ai" />}
            {statusMsg}
          </p>
        )}
      </div>

      {/* Edit / Verification Form */}
      {parsedTx && !isProcessing && (
        <div className="border border-success/30 bg-success/5 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Sparkles className="w-5 h-5 text-success animate-pulse" />
            <div>
              <p className="text-xs font-bold uppercase text-success/80">Confirm & Modify Details</p>
              <p className="text-[10px] text-muted-foreground font-medium">Verify or correct parsed fields before database entry</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1 col-span-2">
              <label className="text-muted-foreground block text-[10px] uppercase font-bold">Transaction Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setParsedTx({ ...parsedTx, type: "expense" })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    parsedTx.type === "expense"
                      ? "bg-destructive/10 border-destructive text-destructive"
                      : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setParsedTx({ ...parsedTx, type: "income" })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    parsedTx.type === "income"
                      ? "bg-success/10 border-success text-success"
                      : "bg-background border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Income
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground block text-[10px] uppercase font-bold">Merchant / Source</label>
              <input
                type="text"
                value={parsedTx.merchant || ""}
                onChange={(e) => setParsedTx({ ...parsedTx, merchant: e.target.value })}
                className="w-full bg-background border border-border focus:border-ai/50 rounded-lg px-2 py-1.5 text-xs text-foreground font-semibold focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground block text-[10px] uppercase font-bold">Amount (₹)</label>
              <input
                type="number"
                value={parsedTx.amount || ""}
                onChange={(e) => setParsedTx({ ...parsedTx, amount: parseFloat(e.target.value) || 0 })}
                className="w-full bg-background border border-border focus:border-ai/50 rounded-lg px-2 py-1.5 text-xs text-foreground font-semibold focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground block text-[10px] uppercase font-bold">Category</label>
              <select
                value={parsedTx.category || "Other"}
                onChange={(e) => setParsedTx({ ...parsedTx, category: e.target.value })}
                className="w-full bg-background border border-border focus:border-ai/50 rounded-lg px-2 py-1.5 text-xs text-foreground font-semibold focus:outline-none"
              >
                <option value="Food">Food</option>
                <option value="Shopping">Shopping</option>
                <option value="Transport">Transport</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Utilities">Utilities</option>
                {parsedTx.type === "income" && <option value="Salary">Salary</option>}
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-muted-foreground block text-[10px] uppercase font-bold">Date</label>
              <input
                type="date"
                value={parsedTx.date || ""}
                onChange={(e) => setParsedTx({ ...parsedTx, date: e.target.value })}
                className="w-full bg-background border border-border focus:border-ai/50 rounded-lg px-2 py-1.5 text-xs text-foreground font-semibold focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <label className="text-muted-foreground block text-[10px] uppercase font-bold">Notes / Description</label>
            <input
              type="text"
              value={parsedTx.note || ""}
              onChange={(e) => setParsedTx({ ...parsedTx, note: e.target.value })}
              className="w-full bg-background border border-border focus:border-ai/50 rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              className="flex-1 py-2 bg-success text-white rounded-lg hover:bg-success/90 font-bold flex items-center justify-center gap-1.5 shadow-md shadow-success/15 text-xs"
            >
              <Check className="w-4 h-4" /> Save Entry
            </button>
            <button
              onClick={() => {
                setParsedTx(null);
                setTranscript("");
                setStatusMsg("");
              }}
              className="px-3 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 font-medium text-xs"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Preset Sandboxing */}
      <div className="space-y-2">
        <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">
          Preset Sandbox Prompts
        </span>
        <div className="grid grid-cols-1 gap-1.5">
          {sampleCommands.map((cmd, idx) => (
            <button
              key={idx}
              disabled={isProcessing || isRecording}
              onClick={() => handlePresetClick(cmd)}
              className="text-left text-xs p-2 bg-muted/20 hover:bg-muted/40 border border-border/40 rounded-lg text-muted-foreground hover:text-foreground transition-all duration-200 flex items-center justify-between disabled:opacity-50"
            >
              <span>"{cmd}"</span>
              <Play className="w-3 h-3 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

