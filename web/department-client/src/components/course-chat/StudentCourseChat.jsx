"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Check,
  CheckCheck,
  MessageSquare,
  User,
  Clock,
  RefreshCw,
  Sparkles,
  Paperclip,
  Mic,
  Square,
  X,
  Play,
  Pause,
  Download,
  FileText,
  Video,
  Music,
  Image as ImageIcon,
  File,
  Lightbulb,
  Maximize2,
} from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch, getAuthToken } from "@/lib/api";

const SUGGESTIONS = [
  { label: "Lecture Doubt", text: "Hello Sir, I have a question regarding today's class lecture." },
  { label: "Assignment Query", text: "Could you please clarify the continuous assignment guidelines and deadline?" },
  { label: "Office Hour Meeting", text: "I would like to request an appointment during your office hours, Sir." },
  { label: "Lab / Project Help", text: "Sir, I encountered an issue running the lab setup code; could you guide me?" },
  { label: "Attach Demo Video", text: "Here is the recorded video demonstration of our project milestone for your review." },
  { label: "Audio Voice Note", text: "Sending a brief voice recording explaining my project idea." },
  { label: "CT Feedback", text: "Sir, could you please provide feedback on my offline class test (CT) answer script?" },
];

// WhatsApp-style Voice Note Audio Player with Waveform & Speed Toggle
function VoiceNotePlayer({ src, isMe }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime;
      const dur = audioRef.current.duration || 1;
      setCurrentTime(cur);
      setProgress((cur / dur) * 100);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(Math.round(audioRef.current.duration || 0));
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };

  const toggleSpeed = (e) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    audioRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = ratio * duration;
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
    setProgress(ratio * 100);
  };

  const formatAudioTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="flex items-center gap-3 py-1 px-1 min-w-[220px] sm:min-w-[270px]">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        preload="metadata"
        className="hidden"
      />
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-md transition-all active:scale-95 ${
          isPlaying ? "ring-2 ring-emerald-400/50 scale-105" : ""
        } ${
          isMe
            ? "bg-white text-emerald-800 hover:bg-emerald-50 shadow-emerald-950/40"
            : "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-black/40"
        }`}
        title={isPlaying ? "Pause audio" : "Play audio"}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current ml-0.5" />
        )}
      </button>

      <div className="flex-1 space-y-1 select-none">
        {/* Interactive soundbars */}
        <div
          onClick={handleSeek}
          className="flex items-center gap-0.5 h-6 cursor-pointer py-1 group/wave"
          title="Click to seek"
        >
          {[40, 75, 30, 90, 60, 100, 45, 80, 55, 85, 35, 95, 65, 90, 40, 70, 85, 30, 75, 55, 80, 45].map((h, i) => {
            const barPct = (i / 22) * 100;
            const isFilled = progress >= barPct;
            return (
              <span
                key={i}
                style={{ height: `${h}%` }}
                className={`w-1 rounded-full transition-colors ${
                  isFilled
                    ? isMe ? "bg-white" : "bg-emerald-400"
                    : isMe ? "bg-emerald-900/60 group-hover/wave:bg-emerald-800/80" : "bg-slate-600 group-hover/wave:bg-slate-500"
                }`}
              />
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono opacity-85">
          <span>{formatAudioTime(currentTime)}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSpeed}
              className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase transition-all ${
                isMe
                  ? "bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200"
                  : "bg-slate-700/80 hover:bg-slate-600 text-slate-200"
              }`}
              title="Click to toggle playback speed (1x / 1.5x / 2x)"
            >
              {playbackRate}x
            </button>
            <span className="flex items-center gap-1">
              <Mic className="w-3 h-3 text-emerald-300" />
              <span>{formatAudioTime(duration || 0)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StudentCourseChat({
  courseCode,
  course,
  routineSlots = [],
  student,
  user,
}) {
  const [messages, setMessages] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const chatContainerRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const fileInputRef = useRef(null);
  const pollingTimerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const studentEmail = (user?.email || student?.email || "").toLowerCase().trim();
  const studentName = student?.name || user?.name || "Student";
  const studentId = student?.studentId || student?.roll || "";

  // Scroll ONLY the inner chat feed, never scrolling the outer page/window
  const scrollToBottom = useCallback((behavior = "auto") => {
    if (chatContainerRef.current) {
      if (behavior === "smooth") {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      } else {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }
  }, []);

  const handleChatScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 120;
  };

  // Fetch thread messages and teacher metadata
  const fetchThread = useCallback(async (isBackground = false) => {
    if (!courseCode || !studentEmail) return;

    try {
      if (!isBackground) setLoading(true);

      const res = await apiFetch(
        `/api/course-messages/thread?courseCode=${encodeURIComponent(
          courseCode
        )}&studentEmail=${encodeURIComponent(studentEmail)}`
      );

      if (res.ok && res.data) {
        setMessages((prev) => {
          const next = res.data.messages || [];
          if (
            prev.length === next.length &&
            prev[prev.length - 1]?.id === next[next.length - 1]?.id &&
            prev[prev.length - 1]?.isRead === next[next.length - 1]?.isRead
          ) {
            return prev;
          }
          return next;
        });
        if (res.data.teacher) {
          setTeacher(res.data.teacher);
        }
      }
    } catch (err) {
      console.warn("Error loading course messages:", err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [courseCode, studentEmail]);

  useEffect(() => {
    fetchThread(false);
  }, [fetchThread]);

  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // Live polling for WhatsApp-like real-time messaging
  useEffect(() => {
    pollingTimerRef.current = setInterval(() => {
      fetchThread(true);
    }, 3500);

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [fetchThread]);

  // File upload helper
  const uploadAttachment = async (fileToUpload) => {
    const token = await getAuthToken();
    const formData = new FormData();
    formData.append("file", fileToUpload);

    const res = await fetch("/backend/api/course-messages/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.fileUrl) {
      throw new Error(data.error || "File upload failed.");
    }
    return data;
  };

  // Send message (text, file, audio, or video)
  const handleSendMessage = async (textToSend, fileToSend = selectedFile) => {
    const content = String(textToSend || inputText || "").trim();
    if ((!content && !fileToSend) || isSending || !studentEmail) return;

    setIsSending(true);

    const teacherEmail = teacher?.teacherEmail || routineSlots[0]?.teacherEmail || "";
    const teacherName =
      teacher?.teacherName || routineSlots[0]?.teacherName || course?.faculty || "Course Instructor";

    try {
      let uploadedMeta = null;
      if (fileToSend) {
        uploadedMeta = await uploadAttachment(fileToSend);
      }

      const res = await apiFetch("/api/course-messages/send", {
        method: "POST",
        body: {
          courseCode,
          studentEmail,
          studentName,
          studentId,
          teacherEmail,
          teacherName,
          message: content,
          fileUrl: uploadedMeta?.fileUrl || null,
          fileName: uploadedMeta?.fileName || null,
          fileType: uploadedMeta?.fileType || null,
          fileSize: uploadedMeta?.fileSize || null,
          mimeType: uploadedMeta?.mimeType || null,
          senderRole: "student",
        },
      });

      if (res.ok && res.data?.message) {
        setMessages((prev) => [...prev, res.data.message]);
        setInputText("");
        setSelectedFile(null);
        isNearBottomRef.current = true;
        setTimeout(() => scrollToBottom("smooth"), 50);
      } else {
        throw new Error(res.data?.error || "Failed to deliver message.");
      }
    } catch (err) {
      console.error("Message send error:", err);
      toast.error(err.message || "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  // Browser Audio Recording (Voice Notes)
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast.error("Audio recording is not supported in this browser.");
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

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const voiceFile = new File([audioBlob], `voice_note_${Date.now()}.webm`, {
            type: "audio/webm",
          });
          await handleSendMessage("Voice Note", voiceFile);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
      toast.success("Recording started. Speak into your microphone.");
    } catch (err) {
      console.error("Microphone error:", err);
      toast.error("Microphone access permission required.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
      } catch (_) {}
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setRecordingDuration(0);
    toast("Recording discarded.");
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatMsgTime = (rawDate) => {
    if (!rawDate) return "";
    try {
      const dt = new Date(rawDate);
      return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const formatMsgDate = (rawDate) => {
    if (!rawDate) return "";
    try {
      const dt = new Date(rawDate);
      const today = new Date();
      if (dt.toDateString() === today.toDateString()) return "Today";
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      if (dt.toDateString() === yesterday.toDateString()) return "Yesterday";
      return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  const displayTeacherName =
    teacher?.teacherName || routineSlots[0]?.teacherName || course?.faculty || "Course Teacher";
  const displayTeacherDesignation = teacher?.designation || "Course Instructor";

  return (
    <div className="rounded-3xl bg-slate-900/95 border border-slate-200/20 dark:border-white/10 shadow-2xl overflow-hidden flex flex-col h-[670px] relative">
      {/* ── WhatsApp-style Chat Header ── */}
      <div className="p-3.5 sm:p-4 bg-slate-950/90 border-b border-white/10 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 p-0.5 shadow-md">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-emerald-300 text-xs sm:text-sm">
                {displayTeacherName.replace(/^Teacher\s+/i, "").slice(0, 2).toUpperCase()}
              </div>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                {displayTeacherName}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Course Faculty
              </span>
            </div>
            <p className="text-[11px] text-slate-400 flex items-center gap-2">
              <span>{displayTeacherDesignation}</span>
              <span>•</span>
              <span className="text-indigo-300 font-semibold">{courseCode}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSuggestions((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              showSuggestions
                ? "bg-amber-400/20 text-amber-300 border-amber-400/40"
                : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
            }`}
            title="Toggle suggestions"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Suggestions</span>
          </button>

          <button
            onClick={() => fetchThread(false)}
            disabled={loading}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-white/10 active:scale-95"
            title="Refresh chat"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Interactive Suggestion Chips ── */}
      {showSuggestions && (
        <div className="px-3.5 py-2.5 bg-slate-950/70 border-b border-white/10 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0 animate-in fade-in duration-150">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Suggestions:</span>
          </span>
          {SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInputText(s.text);
              }}
              className="shrink-0 px-3 py-1 rounded-xl text-xs bg-white/5 hover:bg-emerald-600/25 text-slate-300 hover:text-emerald-200 border border-white/10 hover:border-emerald-500/30 transition-all text-left"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* ── WhatsApp-Style Messages Feed with Speech Bubble Tails ── */}
      <div
        ref={chatContainerRef}
        onScroll={handleChatScroll}
        className="flex-1 p-3.5 sm:p-5 overflow-y-auto space-y-2 font-sans text-xs sm:text-sm bg-[#0b141a] scrollbar-thin scrollbar-thumb-white/10 relative"
      >
        {/* WhatsApp Background Texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

        {loading && messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center space-y-2 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
            <p className="text-xs">Loading course messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div className="max-w-md space-y-1">
              <h4 className="text-sm font-bold text-white">No messages yet</h4>
              <p className="text-xs text-slate-400">
                You can send text, voice notes, video clips, and project files directly to {displayTeacherName}.
              </p>
            </div>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isMe = m.senderRole === "student";
            const showDateHeader =
              idx === 0 ||
              formatMsgDate(m.createdAt) !== formatMsgDate(messages[idx - 1]?.createdAt);

            return (
              <React.Fragment key={m.id || idx}>
                {showDateHeader && (
                  <div className="flex justify-center my-3 relative z-10">
                    <span className="px-3 py-0.5 rounded-full text-[10px] font-bold bg-[#182229] text-slate-400 border border-white/5 shadow-sm">
                      {formatMsgDate(m.createdAt)}
                    </span>
                  </div>
                )}

                <div className={`flex w-full my-1.5 relative z-10 ${isMe ? "justify-end" : "justify-start"} items-end gap-2`}>
                  {/* Incoming Teacher Avatar */}
                  {!isMe && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white text-[11px] font-bold shadow-md shrink-0 ring-2 ring-emerald-500/20 select-none mb-0.5">
                      {displayTeacherName ? displayTeacherName.slice(0, 2).toUpperCase() : "TC"}
                    </div>
                  )}

                  <div
                    className={`relative group w-fit max-w-[85%] sm:max-w-[72%] transition-all break-words ${
                      isMe
                        ? "bg-gradient-to-br from-[#005c4b] via-[#006653] to-[#025243] text-white rounded-[22px] rounded-br-[5px] shadow-[0_3px_12px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] border border-emerald-400/20"
                        : "bg-[#202c33] text-[#e9edef] rounded-[22px] rounded-bl-[5px] shadow-[0_3px_12px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.06)] border border-white/[0.08]"
                    } px-4 py-2.5 sm:px-4.5 sm:py-3`}
                  >
                    {/* Sender Name for incoming teacher message */}
                    {!isMe && (
                      <div className="text-[11px] font-bold text-emerald-400 mb-1.5 flex items-center gap-1.5 select-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>{displayTeacherName}</span>
                        <span className="text-[9px] font-normal text-slate-400">
                          ({displayTeacherDesignation})
                        </span>
                      </div>
                    )}

                    {/* 1. Video Attachment */}
                    {m.fileType === "video" && m.fileUrl && (
                      <div className="mb-2 rounded-2xl overflow-hidden bg-black/70 border border-white/10 shadow-inner">
                        <video
                          src={m.fileUrl}
                          controls
                          className="max-h-72 w-full object-contain rounded-2xl"
                        />
                      </div>
                    )}

                    {/* 2. Audio Attachment / Voice Note with Waveform */}
                    {m.fileType === "audio" && m.fileUrl && (
                      <div className="mb-1 rounded-2xl bg-black/20 border border-white/5 p-1.5">
                        <VoiceNotePlayer src={m.fileUrl} isMe={isMe} />
                      </div>
                    )}

                    {/* 3. Image Attachment */}
                    {m.fileType === "image" && m.fileUrl && (
                      <div
                        onClick={() => setPreviewImage(m.fileUrl)}
                        className="mb-2 rounded-2xl overflow-hidden border border-white/10 shadow-sm group/img relative cursor-pointer"
                        title="Click to view full image"
                      >
                        <img
                          src={m.fileUrl}
                          alt={m.fileName || "attachment"}
                          className="max-h-72 w-full object-cover rounded-2xl group-hover/img:scale-[1.02] transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-[2px]">
                          <Maximize2 className="w-4 h-4" />
                          <span>View Image</span>
                        </div>
                      </div>
                    )}

                    {/* 4. Document / Generic File Attachment */}
                    {(m.fileType === "pdf" || m.fileType === "file") && m.fileUrl && (
                      <div className="mb-2 p-3 rounded-2xl bg-black/25 border border-white/10 flex items-center justify-between gap-3 min-w-[210px] sm:min-w-[250px] hover:border-white/20 transition-all">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              m.fileType === "pdf" ? "bg-rose-500/20 text-rose-300" : "bg-sky-500/20 text-sky-300"
                            }`}
                          >
                            {m.fileType === "pdf" ? <FileText className="w-5 h-5" /> : <File className="w-5 h-5" />}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate max-w-[170px] sm:max-w-[200px]">
                              {m.fileName || "Download Attachment"}
                            </div>
                            <div className="text-[10px] opacity-75">
                              {formatFileSize(m.fileSize)} • {m.fileType?.toUpperCase()}
                            </div>
                          </div>
                        </div>
                        <a
                          href={m.fileUrl}
                          download={m.fileName || true}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-sm"
                          title="Download file"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    )}

                    {/* Text Message & Timestamp */}
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      {m.message && (
                        <span className="leading-relaxed whitespace-pre-wrap text-[13px] sm:text-[13.5px] select-text">
                          {m.message}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 text-[10px] opacity-75 shrink-0 select-none font-medium ml-auto pt-0.5">
                        <span>{formatMsgTime(m.createdAt)}</span>
                        {isMe && (
                          <span>
                            {m.isRead ? (
                              <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] inline" title="Read by teacher" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-emerald-200/80 inline" title="Delivered" />
                            )}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
      </div>

      {/* ── Attachment Preview Chip (if selected) ── */}
      {selectedFile && (
        <div className="px-4 py-2 bg-slate-950 border-t border-white/10 flex items-center justify-between gap-2 shrink-0 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
              <Paperclip className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">{selectedFile.name}</div>
              <div className="text-[10px] text-slate-400">{formatFileSize(selectedFile.size)}</div>
            </div>
          </div>
          <button
            onClick={() => setSelectedFile(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-all"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Voice Recording Active Bar ── */}
      {isRecording && (
        <div className="px-4 py-3 bg-rose-950/80 border-t border-rose-500/30 flex items-center justify-between gap-3 shrink-0 animate-pulse">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-bold text-rose-200">
              Recording Voice Note: {formatSeconds(recordingDuration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={cancelRecording}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={stopRecording}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-md flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Send Voice Note</span>
            </button>
          </div>
        </div>
      )}

      {/* ── WhatsApp-style Bottom Input Bar ── */}
      {!isRecording && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-2.5 sm:p-3 bg-slate-950/90 border-t border-white/10 flex items-center gap-2 shrink-0"
        >
          {/* File Attachment Hidden Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setSelectedFile(e.target.files[0]);
              }
            }}
            className="hidden"
            accept="*/*"
          />

          {/* Paperclip Button for any file, audio, video, document */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-white/10 active:scale-95 shrink-0"
            title="Attach file, audio, video, or document"
          >
            <Paperclip className="w-4 h-4 text-emerald-400" />
          </button>

          {/* Microphone Button for voice notes */}
          <button
            type="button"
            onClick={startRecording}
            className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all border border-white/10 active:scale-95 shrink-0"
            title="Record voice note"
          >
            <Mic className="w-4 h-4 text-sky-400" />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              selectedFile
                ? `Add caption for ${selectedFile.name}...`
                : `Message ${displayTeacherName}... (Press Enter to send)`
            }
            disabled={isSending}
            className="flex-1 bg-white/5 border border-white/10 focus:border-emerald-500 focus:bg-white/10 rounded-2xl py-2.5 px-4 text-xs sm:text-sm text-white placeholder-slate-400 outline-none transition-all disabled:opacity-50"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!inputText.trim() && !selectedFile) || isSending}
            className="p-2.5 sm:px-4 sm:py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shrink-0"
            title="Send"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      )}

      {/* ── Image Lightbox Modal ── */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
          >
            <div className="absolute -top-12 right-0 flex items-center gap-2">
              <a
                href={previewImage}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                title="Download full image"
              >
                <Download className="w-5 h-5" />
              </a>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                title="Close preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={previewImage}
              alt="Full preview"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
}
