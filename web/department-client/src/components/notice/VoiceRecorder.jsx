"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Upload,
  Radio,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

export default function VoiceRecorder({ onAudioReady, onAudioRemoved, existingAudio }) {
  const [mode, setMode] = useState("record"); // "record" | "upload"
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const previewAudioRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Start recording from microphone
  const startRecording = async () => {
    setErrorMessage("");
    audioChunksRef.current = [];

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is not supported in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup audio analyzer for waveform visualizer
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);

          const drawWaveform = () => {
            if (!canvasRef.current) return;
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const barWidth = (canvas.width / dataArray.length) * 1.5;
            let x = 0;

            for (let i = 0; i < dataArray.length; i++) {
              const barHeight = (dataArray[i] / 255) * canvas.height;
              ctx.fillStyle = "#6366f1"; // indigo
              ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
              x += barWidth;
            }
            animationFrameRef.current = requestAnimationFrame(drawWaveform);
          };
          drawWaveform();
        }
      } catch (vizErr) {
        console.warn("[VoiceRecorder] Visualizer not supported:", vizErr);
      }

      // Determine supported MIME type
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";

      const options = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const finalBlob = new Blob(audioChunksRef.current, {
          type: mimeType || "audio/webm",
        });
        setAudioBlob(finalBlob);
        const url = URL.createObjectURL(finalBlob);
        setAudioUrl(url);

        // Notify parent with file object
        const recordedFile = new File([finalBlob], `voice-announcement-${Date.now()}.webm`, {
          type: finalBlob.type,
        });
        onAudioReady({ file: recordedFile, duration: recordingTime });

        // Stop stream tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      };

      mediaRecorder.start(250); // Slice into 250ms chunks
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("[VoiceRecorder] Microphone error:", err);
      setErrorMessage(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Microphone permission denied. Allow mic access in your browser settings."
          : err.message || "Failed to start microphone."
      );
      setIsRecording(false);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  // Discard recording
  const discardRecording = () => {
    if (isRecording) stopRecording();
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlayingPreview(false);
    onAudioRemoved();
  };

  // Toggle preview playback
  const togglePlayPreview = () => {
    const el = previewAudioRef.current;
    if (!el) return;
    if (isPlayingPreview) {
      el.pause();
      setIsPlayingPreview(false);
    } else {
      el.play()
        .then(() => setIsPlayingPreview(true))
        .catch(() => setIsPlayingPreview(false));
    }
  };

  // Handle uploaded audio file
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/") && !/\.(mp3|wav|ogg|m4a|webm|aac)$/i.test(file.name)) {
      setErrorMessage("Please select a valid audio file (.mp3, .wav, .m4a, .webm, .ogg).");
      return;
    }

    setErrorMessage("");
    const url = URL.createObjectURL(file);
    setAudioBlob(file);
    setAudioUrl(url);

    // Read audio duration
    const tempAudio = new Audio(url);
    tempAudio.onloadedmetadata = () => {
      const dur = Math.round(tempAudio.duration) || 0;
      setRecordingTime(dur);
      onAudioReady({ file, duration: dur });
    };
  };

  const formatSecs = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-slate-800/50 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1.5">
          <Mic className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Voice Announcement / Audio Message (Optional)</span>
        </label>

        {/* Mode Toggle */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => {
              if (!isRecording) setMode("record");
            }}
            className={`px-2 py-1 rounded-md transition cursor-pointer ${
              mode === "record"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Record Mic
          </button>
          <button
            type="button"
            onClick={() => {
              if (!isRecording) setMode("upload");
            }}
            className={`px-2 py-1 rounded-md transition cursor-pointer ${
              mode === "upload"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Upload File
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ── MODE 1: MIC RECORDING ── */}
      {mode === "record" && (
        <div>
          {!audioUrl && !isRecording && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-dashed border-indigo-300 dark:border-indigo-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Record voice announcement directly
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Click record and speak clearly into your microphone
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={startRecording}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition cursor-pointer"
              >
                <Radio className="w-4 h-4 animate-pulse" />
                <span>Start Recording</span>
              </button>
            </div>
          )}

          {isRecording && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-rose-600 animate-ping" />
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 tracking-wide uppercase">
                    Recording Live Voice...
                  </span>
                </div>
                <span className="font-mono text-sm font-extrabold text-rose-700 dark:text-rose-300">
                  {formatSecs(recordingTime)}
                </span>
              </div>

              <canvas
                ref={canvasRef}
                width={300}
                height={35}
                className="w-full h-9 rounded-lg bg-white/70 dark:bg-slate-900/60"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={discardRecording}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow transition cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Stop & Keep</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── MODE 2: UPLOAD AUDIO FILE ── */}
      {mode === "upload" && !audioUrl && (
        <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
          <Upload className="w-6 h-6 text-slate-400 mx-auto" />
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Choose an audio file from your device (.mp3, .wav, .m4a, .webm, .ogg)
          </p>
          <input
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.webm"
            onChange={handleFileUpload}
            className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 dark:file:bg-indigo-950/60 file:text-indigo-600 dark:file:text-indigo-400 hover:file:bg-indigo-100 cursor-pointer"
          />
        </div>
      )}

      {/* ── AUDIO PREVIEW (WHEN AUDIO IS READY) ── */}
      {audioUrl && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-800 shadow-sm animate-in fade-in">
          <audio
            ref={previewAudioRef}
            src={audioUrl}
            onEnded={() => setIsPlayingPreview(false)}
          />

          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={togglePlayPreview}
              className="w-9 h-9 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30 transition cursor-pointer"
            >
              {isPlayingPreview ? (
                <Pause className="w-4 h-4 fill-white" />
              ) : (
                <Play className="w-4 h-4 fill-white ml-0.5" />
              )}
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Voice Note Ready ({formatSecs(recordingTime)})</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                {audioBlob?.name || "Recorded voice announcement"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={discardRecording}
            title="Remove voice note"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Existing audio display for edit mode */}
      {!audioUrl && existingAudio?.filePath && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Current audio attached ({existingAudio.originalName || "voice-announcement"})
            </span>
          </div>
          <button
            type="button"
            onClick={onAudioRemoved}
            className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
          >
            Remove Current Audio
          </button>
        </div>
      )}
    </div>
  );
}
