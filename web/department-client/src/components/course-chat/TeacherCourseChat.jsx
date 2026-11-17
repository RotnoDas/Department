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
  Search,
  Users,
  GraduationCap,
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

const TEACHER_SUGGESTIONS = [
  { label: "Review Slides", text: "Please review the lecture slides uploaded in the Materials tab." },
  { label: "Next Class", text: "We will address this topic in detail during our next lecture session." },
  { label: "Noted", text: "Noted. Thank you for keeping me updated." },
  { label: "Office Hours", text: "Please visit my faculty office room tomorrow at 11:30 AM to discuss." },
  { label: "Approved", text: "Your project milestone draft is approved; proceed with the implementation." },
  { label: "Add Test Cases", text: "Make sure you include unit test cases and documentation with your code." },
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
            ? "bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm dark:bg-white dark:text-emerald-800 dark:hover:bg-emerald-50"
            : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm dark:bg-emerald-500 dark:text-slate-950 dark:hover:bg-emerald-400"
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
                    ? isMe ? "bg-emerald-800 dark:bg-white" : "bg-emerald-600 dark:bg-emerald-400"
                    : isMe ? "bg-emerald-300/80 dark:bg-emerald-900/60" : "bg-slate-300 dark:bg-slate-600"
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
                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:hover:bg-emerald-800 dark:text-emerald-200"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700/80 dark:hover:bg-slate-600 dark:text-slate-200"
              }`}
              title="Click to toggle playback speed (1x / 1.5x / 2x)"
            >
              {playbackRate}x
            </button>
            <span className="flex items-center gap-1">
              <Mic className="w-3 h-3 text-emerald-600 dark:text-emerald-300" />
              <span>{formatAudioTime(duration || 0)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeacherCourseChat({
  courseCode,
  course,
  routineSlots = [],
  teacherUser,
}) {
  const [conversations, setConversations] = useState([]);
  const [classRoster, setClassRoster] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewFilter, setViewFilter] = useState("all"); // "all" | "unread" | "roster"
  const [loadingList, setLoadingList] = useState(true);
  const [loadingChat, setLoadingChat] = useState(false);
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

  const teacherEmail = (teacherUser?.email || "").toLowerCase().trim();
  const teacherName = teacherUser?.name || "Teacher";

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

  // 1. Fetch conversations list
  const fetchConversations = useCallback(async (isBackground = false) => {
    if (!courseCode) return;
    try {
      if (!isBackground) setLoadingList(true);

      const res = await apiFetch(
        `/api/course-messages/teacher-conversations?courseCode=${encodeURIComponent(
          courseCode
        )}`
      );

      if (res.ok && res.data) {
        const list = res.data.conversations || [];
        setConversations(list);
        setClassRoster(res.data.classRoster || []);

        setSelectedStudent((current) => {
          if (current) {
            const updated = list.find((c) => c.studentEmail === current.studentEmail);
            return updated ? { ...current, ...updated } : current;
          }
          return list.length > 0 ? list[0] : null;
        });
      }
    } catch (err) {
      console.warn("Failed to load teacher conversations:", err);
    } finally {
      if (!isBackground) setLoadingList(false);
    }
  }, [courseCode]);

  // 2. Fetch specific thread with selected student
  const fetchThread = useCallback(async (studentEmailToFetch, isBackground = false) => {
    if (!courseCode || !studentEmailToFetch) return;

    try {
      if (!isBackground) setLoadingChat(true);

      const res = await apiFetch(
        `/api/course-messages/thread?courseCode=${encodeURIComponent(
          courseCode
        )}&studentEmail=${encodeURIComponent(studentEmailToFetch)}`
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

        setConversations((prev) =>
          prev.map((c) =>
            c.studentEmail === studentEmailToFetch ? { ...c, unreadCount: 0 } : c
          )
        );
      }
    } catch (err) {
      console.warn("Failed to load thread:", err);
    } finally {
      if (!isBackground) setLoadingChat(false);
    }
  }, [courseCode]);

  useEffect(() => {
    fetchConversations(false);
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedStudent?.studentEmail) {
      fetchThread(selectedStudent.studentEmail, false);
    } else {
      setMessages([]);
    }
  }, [selectedStudent?.studentEmail, fetchThread]);

  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // Live polling every 3.5s
  useEffect(() => {
    pollingTimerRef.current = setInterval(() => {
      fetchConversations(true);
      if (selectedStudent?.studentEmail) {
        fetchThread(selectedStudent.studentEmail, true);
      }
    }, 3500);

    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [fetchConversations, fetchThread, selectedStudent?.studentEmail]);

  // Upload attachment helper
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

  // Send reply to student (text, file, audio, video)
  const handleSendMessage = async (textToSend, fileToSend = selectedFile) => {
    const content = String(textToSend || inputText || "").trim();
    if ((!content && !fileToSend) || isSending || !selectedStudent?.studentEmail) return;

    setIsSending(true);

    const studentEmail = selectedStudent.studentEmail;
    const studentName = selectedStudent.studentName || "Student";
    const studentId = selectedStudent.studentId || selectedStudent.roll || "";

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
          senderRole: "teacher",
        },
      });

      if (res.ok && res.data?.message) {
        setMessages((prev) => [...prev, res.data.message]);
        setInputText("");
        setSelectedFile(null);
        isNearBottomRef.current = true;
        setTimeout(() => scrollToBottom("smooth"), 50);
        fetchConversations(true);
      } else {
        throw new Error(res.data?.error || "Failed to deliver reply.");
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error(err.message || "Could not send reply.");
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
          const voiceFile = new File([audioBlob], `teacher_voice_${Date.now()}.webm`, {
            type: "audio/webm",
          });
          await handleSendMessage("Voice Feedback", voiceFile);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
      toast.success("Recording teacher voice note...");
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

  // Filtered conversation list
  const filteredList = conversations.filter((c) => {
    if (viewFilter === "unread" && (!c.unreadCount || c.unreadCount <= 0)) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.studentName || "").toLowerCase().includes(q) ||
      (c.studentId || "").toLowerCase().includes(q) ||
      (c.studentEmail || "").toLowerCase().includes(q)
    );
  });

  const totalUnreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900/95 border border-slate-200/90 dark:border-white/10 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[690px] transition-colors">
      {/* ── Left Column: Student Conversations Sidebar (4 cols) ── */}
      <div className="md:col-span-4 border-r border-slate-200/80 dark:border-white/10 flex flex-col bg-slate-50/70 dark:bg-slate-950/60 h-full transition-colors">
        {/* Top Search & Filter Bar */}
        <div className="p-3.5 border-b border-slate-200/80 dark:border-white/10 space-y-2.5 bg-white/80 dark:bg-slate-950/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Student Chats</h4>
              {totalUnreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 shadow-xs">
                  {totalUnreadCount} new
                </span>
              )}
            </div>
            <button
              onClick={() => fetchConversations(false)}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-400 dark:hover:text-white border border-slate-200/60 dark:border-white/5 transition"
              title="Refresh messages"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student or roll..."
              className="w-full bg-slate-100/90 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 focus:border-emerald-500 focus:bg-white dark:focus:bg-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all shadow-2xs"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <button
              onClick={() => setViewFilter("all")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                viewFilter === "all"
                  ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40 shadow-2xs"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-white/5"
              }`}
            >
              All ({conversations.length})
            </button>
            <button
              onClick={() => setViewFilter("unread")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                viewFilter === "unread"
                  ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40 shadow-2xs"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-white/5"
              }`}
            >
              Unread ({totalUnreadCount})
            </button>
            <button
              onClick={() => setViewFilter("roster")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                viewFilter === "roster"
                  ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/40 shadow-2xs"
                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-white/5"
              }`}
            >
              Class Roster ({classRoster.length})
            </button>
          </div>
        </div>

        {/* Student List View */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-200/60 dark:divide-white/5 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-white/10">
          {viewFilter === "roster" ? (
            classRoster.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No students enrolled in this semester.
              </div>
            ) : (
              classRoster.map((s) => {
                const isSelected = selectedStudent?.studentEmail === s.email;
                return (
                  <button
                    key={s.email}
                    onClick={() => {
                      setSelectedStudent({
                        studentEmail: s.email,
                        studentName: s.name,
                        studentId: s.studentId || s.roll,
                        roll: s.roll || s.studentId,
                        batch: s.batch,
                        session: s.session,
                      });
                    }}
                    className={`w-full p-3 flex items-center justify-between gap-3 text-left transition-all ${
                      isSelected
                        ? "bg-emerald-50/90 dark:bg-emerald-600/20 border-l-4 border-emerald-600 dark:border-emerald-500 shadow-2xs"
                        : "hover:bg-slate-100/70 dark:hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300 shrink-0">
                        {s.name ? s.name.slice(0, 1).toUpperCase() : "S"}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{s.name}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">Roll: {s.studentId || s.roll || "—"}</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                      {s.hasConversation ? "Chatting" : "Start Chat"}
                    </span>
                  </button>
                );
              })
            )
          ) : filteredList.length === 0 ? (
            <div className="p-6 text-center space-y-2 text-xs text-slate-500 dark:text-slate-400">
              <MessageSquare className="w-6 h-6 mx-auto text-slate-400 dark:text-slate-600" />
              <p>No student conversations found.</p>
              <button
                onClick={() => setViewFilter("roster")}
                className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold text-[11px]"
              >
                Browse full class roster
              </button>
            </div>
          ) : (
            filteredList.map((c) => {
              const isSelected = selectedStudent?.studentEmail === c.studentEmail;
              const hasUnread = c.unreadCount > 0;

              return (
                <button
                  key={c.studentEmail}
                  onClick={() => setSelectedStudent(c)}
                  className={`w-full p-3 flex items-center justify-between gap-3 text-left transition-all ${
                    isSelected
                      ? "bg-emerald-50/90 dark:bg-emerald-600/20 border-l-4 border-emerald-600 dark:border-emerald-500 shadow-2xs"
                      : "hover:bg-slate-100/70 dark:hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 p-0.5 shrink-0 shadow-xs">
                      <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[10px] flex items-center justify-center font-black text-indigo-700 dark:text-indigo-300 text-xs shadow-inner">
                        {c.studentName ? c.studentName.slice(0, 2).toUpperCase() : "ST"}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {c.studentName}
                        </span>
                        {c.studentId && (
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            ({c.studentId})
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {c.lastSenderRole === "teacher" ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">You: </span>
                        ) : null}
                        {c.lastMessage || "Attachment"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      {formatMsgTime(c.lastMessageAt)}
                    </span>
                    {hasUnread && (
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 text-[10px] font-black flex items-center justify-center shadow-xs">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right Column: Selected Student Chat Window (8 cols) ── */}
      <div className="md:col-span-8 flex flex-col h-full bg-slate-50/40 dark:bg-slate-900/60 transition-colors">
        {selectedStudent ? (
          <>
            {/* Chat Header */}
            <div className="p-3.5 bg-white/95 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between shrink-0 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 p-0.5 shadow-md">
                  <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-indigo-700 dark:text-indigo-300 text-sm shadow-inner">
                    {selectedStudent.studentName ? selectedStudent.studentName.slice(0, 2).toUpperCase() : "ST"}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {selectedStudent.studentName}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                      Student
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 font-medium">
                    <span>Roll: <strong className="text-slate-700 dark:text-slate-200">{selectedStudent.studentId || selectedStudent.roll || "—"}</strong></span>
                    <span>•</span>
                    <span className="truncate">{selectedStudent.studentEmail}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSuggestions((prev) => !prev)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                    showSuggestions
                      ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-400/20 dark:text-amber-300 dark:border-amber-400/40 shadow-sm"
                      : "bg-white hover:bg-slate-100 text-slate-700 border-slate-200/80 dark:bg-white/5 dark:text-slate-400 dark:border-white/10 dark:hover:text-white shadow-sm"
                  }`}
                  title="Toggle quick suggestions"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
                  <span className="hidden sm:inline">Suggestions</span>
                </button>

                <button
                  onClick={() => fetchThread(selectedStudent.studentEmail, false)}
                  className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 dark:hover:text-white transition-all dark:border-white/10 active:scale-95 shadow-sm"
                  title="Refresh chat"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingChat ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

            {/* Quick Suggestion Chips */}
            {showSuggestions && (
              <div className="px-3.5 py-2.5 bg-slate-100/80 dark:bg-slate-950/70 border-b border-slate-200/80 dark:border-white/10 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0 animate-in fade-in duration-150">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                  <span>Quick feedback:</span>
                </span>
                {TEACHER_SUGGESTIONS.map((r, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputText(r.text)}
                    className="shrink-0 px-3 py-1 rounded-xl text-xs bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200/90 hover:border-emerald-300 dark:bg-white/5 dark:hover:bg-emerald-600/25 dark:text-slate-300 dark:hover:text-emerald-200 dark:border-white/10 dark:hover:border-emerald-500/30 shadow-sm transition-all text-left"
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            )}

            {/* Messages Feed with Audio, Video, Files & Authentic WhatsApp Bubbles */}
            <div
              ref={chatContainerRef}
              onScroll={handleChatScroll}
              className="flex-1 p-3.5 sm:p-5 overflow-y-auto space-y-2 font-sans text-xs sm:text-sm bg-[#efeae2]/70 dark:bg-[#0b141a] scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-white/10 relative transition-colors"
            >
              {/* WhatsApp background texture */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

              {loadingChat && messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center space-y-2 text-slate-500 dark:text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 dark:text-emerald-400" />
                  <p className="text-xs font-medium">Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-14 h-14 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                    <MessageSquare className="w-7 h-7" />
                  </div>
                  <div className="max-w-md space-y-1">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">No messages yet with {selectedStudent.studentName}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Send text messages, audio feedback, or attachments below.
                    </p>
                  </div>
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isMe = m.senderRole === "teacher";
                  const showDateHeader =
                    idx === 0 ||
                    formatMsgDate(m.createdAt) !== formatMsgDate(messages[idx - 1]?.createdAt);

                  return (
                    <React.Fragment key={m.id || idx}>
                      {showDateHeader && (
                        <div className="flex justify-center my-3 relative z-10">
                          <span className="px-3 py-0.5 rounded-full text-[10px] font-bold bg-white/90 dark:bg-[#182229] text-slate-600 dark:text-slate-400 border border-slate-200/80 dark:border-white/5 shadow-xs">
                            {formatMsgDate(m.createdAt)}
                          </span>
                        </div>
                      )}

                      <div className={`flex w-full my-1.5 relative z-10 ${isMe ? "justify-end" : "justify-start"} items-end gap-2`}>
                        {/* Incoming Student Avatar */}
                        {!isMe && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-[11px] font-bold shadow-md shrink-0 ring-2 ring-indigo-500/20 select-none mb-0.5">
                            {selectedStudent?.studentName ? selectedStudent.studentName.slice(0, 2).toUpperCase() : "ST"}
                          </div>
                        )}

                        <div
                          className={`relative group w-fit max-w-[85%] sm:max-w-[72%] transition-all break-words ${
                            isMe
                              ? "bg-[#d9fdd3] text-slate-900 rounded-[22px] rounded-br-[5px] shadow-sm border border-[#b8f5ad] dark:bg-gradient-to-br dark:from-[#005c4b] dark:via-[#006653] dark:to-[#025243] dark:text-white dark:border-emerald-400/20"
                              : "bg-white text-slate-900 rounded-[22px] rounded-bl-[5px] shadow-sm border border-slate-200/90 dark:bg-[#202c33] dark:text-[#e9edef] dark:border-white/[0.08]"
                          } px-4 py-2.5 sm:px-4.5 sm:py-3`}
                        >
                          {/* Student Name for incoming message */}
                          {!isMe && (
                            <div className="text-[11px] font-bold text-sky-700 dark:text-sky-400 mb-1.5 flex items-center gap-1.5 select-none">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 dark:bg-sky-400" />
                              <span>{selectedStudent?.studentName}</span>
                              <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400">
                                (Roll: {selectedStudent?.studentId || selectedStudent?.roll || "Student"})
                              </span>
                            </div>
                          )}

                          {/* 1. Video Attachment */}
                          {m.fileType === "video" && m.fileUrl && (
                            <div className="mb-2 rounded-2xl overflow-hidden bg-black/80 border border-slate-200/80 dark:border-white/10 shadow-inner">
                              <video
                                src={m.fileUrl}
                                controls
                                className="max-h-72 w-full object-contain rounded-2xl"
                              />
                            </div>
                          )}

                          {/* 2. Audio Attachment / Voice Note with Waveform */}
                          {m.fileType === "audio" && m.fileUrl && (
                            <div className="mb-1 rounded-2xl bg-black/[0.04] dark:bg-black/20 border border-slate-200/60 dark:border-white/5 p-1.5">
                              <VoiceNotePlayer src={m.fileUrl} isMe={isMe} />
                            </div>
                          )}

                          {/* 3. Image Attachment */}
                          {m.fileType === "image" && m.fileUrl && (
                            <div
                              onClick={() => setPreviewImage(m.fileUrl)}
                              className="mb-2 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-sm group/img relative cursor-pointer"
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
                            <div className="mb-2 p-3 rounded-2xl bg-black/[0.04] dark:bg-black/25 border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-3 min-w-[210px] sm:min-w-[250px] hover:border-emerald-500/40 transition-all">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                    m.fileType === "pdf" ? "bg-rose-500/20 text-rose-600 dark:text-rose-300" : "bg-sky-500/20 text-sky-600 dark:text-sky-300"
                                  }`}
                                >
                                  {m.fileType === "pdf" ? <FileText className="w-5 h-5" /> : <File className="w-5 h-5" />}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[170px] sm:max-w-[200px]">
                                    {m.fileName || "Download Attachment"}
                                  </div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                                    {formatFileSize(m.fileSize)} • {m.fileType?.toUpperCase()}
                                  </div>
                                </div>
                              </div>
                              <a
                                href={m.fileUrl}
                                download={m.fileName || true}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white dark:border-transparent flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-sm"
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

                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 shrink-0 select-none font-medium ml-auto pt-0.5">
                              <span>{formatMsgTime(m.createdAt)}</span>
                              {isMe && (
                                <span>
                                  {m.isRead ? (
                                    <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] inline" title="Read by student" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-200/80 inline" title="Delivered" />
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

            {/* Attachment Preview Chip */}
            {selectedFile && (
              <div className="px-4 py-2 bg-slate-100 dark:bg-slate-950 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-2 shrink-0 animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                    <Paperclip className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">{selectedFile.name}</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">{formatFileSize(selectedFile.size)}</div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-white/5 transition-all"
                  title="Remove attachment"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Voice Recording Bar */}
            {isRecording && (
              <div className="px-4 py-3 bg-rose-50 dark:bg-rose-950/80 border-t border-rose-200 dark:border-rose-500/30 flex items-center justify-between gap-3 shrink-0 animate-pulse">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                  <span className="text-xs font-bold text-rose-800 dark:text-rose-200">
                    Recording Teacher Voice Note: {formatSeconds(recordingDuration)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={cancelRecording}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-xs font-semibold text-slate-700 dark:text-slate-300"
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

            {/* Input Form */}
            {!isRecording && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-950/90 border-t border-slate-200/80 dark:border-white/10 flex items-center gap-2 shrink-0"
              >
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

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 dark:border-white/10 active:scale-95 shrink-0 shadow-sm transition-all"
                  title="Attach file, audio, video, or document"
                >
                  <Paperclip className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </button>

                <button
                  type="button"
                  onClick={startRecording}
                  className="p-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-300 dark:border-white/10 active:scale-95 shrink-0 shadow-sm transition-all"
                  title="Record voice note"
                >
                  <Mic className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                </button>

                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    selectedFile
                      ? `Add caption for ${selectedFile.name}...`
                      : `Reply to ${selectedStudent.studentName}... (Press Enter to send)`
                  }
                  disabled={isSending}
                  className="flex-1 bg-white dark:bg-white/5 border border-slate-200/90 dark:border-white/10 focus:border-emerald-500 focus:bg-white dark:focus:bg-white/10 rounded-2xl py-2.5 px-4 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none transition-all disabled:opacity-50 shadow-sm"
                />

                <button
                  type="submit"
                  disabled={(!inputText.trim() && !selectedFile) || isSending}
                  className="p-2.5 sm:px-4 sm:py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shrink-0"
                  title="Send reply"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Reply</span>
                </button>
              </form>
            )}
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-sm">
              <Users className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Select a Student Conversation</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                Choose a student from the sidebar to view their messages or start a new conversation for {courseCode}.
              </p>
            </div>
          </div>
        )}
      </div>

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
