"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw, Download, Headphones } from "lucide-react";

export default function NoticeAudioPlayer({ audio, title = "Voice Announcement" }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(audio?.duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef(null);

  const rawUrl = audio?.filePath || "";
  const audioSrc = rawUrl.startsWith("http")
    ? rawUrl
    : rawUrl.startsWith("/uploads")
    ? `/backend${rawUrl}`
    : rawUrl;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    const onTimeUpdate = () => setCurrentTime(el.currentTime);
    const onLoadedMetadata = () => {
      if (el.duration && !isNaN(el.duration) && el.duration !== Infinity) {
        setDuration(el.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onError = () => {
      setHasError(true);
      setIsPlaying(false);
    };

    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("ended", onEnded);
    el.addEventListener("error", onError);

    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("error", onError);
    };
  }, [audioSrc]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play()
        .then(() => setIsPlaying(true))
        .catch(() => setHasError(true));
    }
  };

  const handleSeek = (e) => {
    const el = audioRef.current;
    if (!el) return;
    const nextTime = Number(e.target.value);
    el.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const toggleRate = () => {
    const el = audioRef.current;
    if (!el) return;
    const rates = [1, 1.25, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    el.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const toggleMute = () => {
    const el = audioRef.current;
    if (!el) return;
    el.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const restartAudio = () => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
    setCurrentTime(0);
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs === Infinity || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (hasError) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
        <Headphones className="w-4 h-4 shrink-0" />
        <span>Audio message currently unavailable</span>
        {audioSrc && (
          <a
            href={audioSrc}
            download={audio?.originalName || "voice-announcement.webm"}
            className="ml-auto underline font-semibold hover:text-amber-500"
          >
            Download
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/10 via-purple-900/10 to-pink-900/10 dark:from-indigo-950/40 dark:via-purple-950/40 dark:to-pink-950/40 border border-indigo-200/50 dark:border-indigo-800/40 p-3.5 shadow-sm transition-all hover:shadow-md">
      <audio ref={audioRef} src={audioSrc} preload="metadata" />

      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30 shrink-0">
            <Headphones className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
              {title}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
              {audio?.originalName || "Voice note attachment"}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={toggleRate}
            title="Playback speed"
            className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition cursor-pointer"
          >
            {playbackRate}x
          </button>
          <button
            type="button"
            onClick={toggleMute}
            title={isMuted ? "Unmute" : "Mute"}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60 transition cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <a
            href={audioSrc}
            download={audio?.originalName || "voice-announcement.webm"}
            title="Download voice note"
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Playback bar and controls */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-all cursor-pointer shrink-0"
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={restartAudio}
          title="Restart from beginning"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Waveform / Scrubber Bar */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="relative w-full flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 rounded-lg bg-slate-200 dark:bg-slate-700 accent-indigo-600 cursor-pointer"
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 dark:text-slate-400">
            <span>{formatTime(currentTime)}</span>
            {isPlaying && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider animate-pulse">
                Playing
              </span>
            )}
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
