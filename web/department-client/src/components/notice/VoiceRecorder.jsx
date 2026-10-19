"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Trash2, Upload, Headphones, Volume2 } from "lucide-react";

export default function VoiceRecorder({ onAudioReady, onAudioRemoved, existingAudio }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioFile, setAudioFile] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // Start recording from microphone
  const startRecording = async () => {
    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        alert("Microphone not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        const file = new File([blob], `voice-announcement-${Date.now()}.webm`, {
          type: "audio/webm",
        });
        setAudioFile(file);
        onAudioReady?.({ file, duration: recordSeconds });
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert("Could not access microphone: " + err.message);
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setAudioFile(file);
    onAudioReady?.({ file, duration: null });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioFile(null);
    setRecordSeconds(0);
    onAudioRemoved?.();
  };

  const formatTimer = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <div className="space-y-2">
      {/* If audio has been recorded or uploaded */}
      {audioUrl ? (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Headphones className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {audioFile?.name || "Recorded Voice Note"}
              </p>
              <audio src={audioUrl} controls className="h-7 w-full mt-1 accent-indigo-600" />
            </div>
          </div>
          <button
            type="button"
            onClick={clearAudio}
            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
            title="Discard voice message"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : isRecording ? (
        /* While recording live */
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600" />
            </span>
            <div>
              <p className="text-xs font-bold text-rose-700 dark:text-rose-300">
                Recording microphone...
              </p>
              <p className="text-xs font-mono font-bold text-rose-900 dark:text-rose-200">
                {formatTimer(recordSeconds)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={stopRecording}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop</span>
          </button>
        </div>
      ) : (
        /* Idle action buttons */
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={startRecording}
            className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold transition cursor-pointer"
          >
            <Mic className="w-4 h-4 text-indigo-500" />
            <span>Record Voice</span>
          </button>

          <label className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs font-bold transition cursor-pointer">
            <Upload className="w-4 h-4 text-indigo-500" />
            <span>Upload Audio</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleAudioUpload}
            />
          </label>
        </div>
      )}
    </div>
  );
}
