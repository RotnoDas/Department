"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Headphones,
  Download,
  Volume2,
  VolumeX,
} from "lucide-react";

export default function NoticeAudioPlayer({ audio }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(audio?.duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
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

    const onTimeUpdate = () => setCurrentTime(el.currentTime || 0);
    const onLoadedMetadata = () => {
      if (el.duration && !isNaN(el.duration) && el.duration !== Infinity) {
        setDuration(el.duration);
      }
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("ended", onEnded);

    return () => {
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("ended", onEnded);
    };
  }, [audioSrc]);

  if (!audio?.filePath) return null;

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play()
        .then(() => setIsPlaying(true))
        .catch((e) => console.warn("[NoticeAudioPlayer] play err:", e.message));
    }
  };

  const handleSeek = (e) => {
    const el = audioRef.current;
    const time = Number(e.target.value);
    if (el) {
      el.currentTime = time;
      setCurrentTime(time);
    }
  };

  const cyclePlaybackRate = () => {
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

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/80">
      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-xs transition cursor-pointer"
        title={isPlaying ? "Pause voice announcement" : "Play voice announcement"}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="h-4 w-4 ml-0.5 fill-current" />
        )}
      </button>

      {/* Track Details & Scrubber */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Headphones className="h-3.5 w-3.5 text-indigo-500" />
            <span>Voice Announcement</span>
            {isPlaying && (
              <span className="flex items-center gap-0.5 ml-1">
                <span className="w-1 h-2.5 bg-indigo-500 rounded-full animate-pulse" />
                <span className="w-1 h-3.5 bg-indigo-500 rounded-full animate-pulse delay-75" />
                <span className="w-1 h-2 bg-indigo-500 rounded-full animate-pulse delay-150" />
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={cyclePlaybackRate}
              className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 transition cursor-pointer"
              title="Playback speed"
            >
              {playbackRate}x
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-500" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>

            <a
              href={audioSrc}
              target="_blank"
              rel="noreferrer"
              download={audio.originalName || "voice-announcement.webm"}
              className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
              title="Download audio announcement"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Scrubber slider */}
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 rounded-lg appearance-none bg-slate-200 dark:bg-slate-700 accent-indigo-600 cursor-pointer"
          />
          <span className="text-[10px] font-mono font-medium text-slate-400 shrink-0">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>

      <audio ref={audioRef} src={audioSrc} preload="metadata" />
    </div>
  );
}
