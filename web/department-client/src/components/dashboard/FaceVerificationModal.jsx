"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  X,
  ShieldCheck,
  Eye,
  ArrowLeft,
  ArrowRight,
  Smile,
  Zap,
  Lock,
  Timer,
  UploadCloud,
  SwitchCamera,
  HelpCircle,
} from "lucide-react";
import { apiFetch, clearAuthToken } from "@/lib/api";
import toast from "react-hot-toast";

const STEP_METADATA = {
  center: {
    title: "Look Straight",
    instruction: "Look directly into your camera. Align your face inside the oval.",
    icon: Smile,
    badgeColor: "bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
  },
  left: {
    title: "Turn Head Left",
    instruction: "Turn your head gently toward your LEFT shoulder.",
    icon: ArrowLeft,
    badgeColor: "bg-sky-100 dark:bg-sky-950/70 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800",
  },
  right: {
    title: "Turn Head Right",
    instruction: "Turn your head gently toward your RIGHT shoulder.",
    icon: ArrowRight,
    badgeColor: "bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  blink: {
    title: "Blink Eyes",
    instruction: "Look straight and blink your eyes naturally when ready.",
    icon: Eye,
    badgeColor: "bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
};

export default function FaceVerificationModal({
  isOpen,
  onClose,
  purpose = "verify", // "enroll" | "verify"
  routine = null, // required when purpose === "verify"
  coords = null, // { latitude, longitude, accuracy }
  onSuccess,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [mediaStream, setMediaStream] = useState(null);
  const [cameraState, setCameraState] = useState("initializing"); // "initializing" | "ready" | "not_found" | "denied" | "error"
  const [errorMessage, setErrorMessage] = useState("");
  const [challenge, setChallenge] = useState(null); // { challengeId, steps, expiresInSeconds }
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [capturedFrames, setCapturedFrames] = useState([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [uploadedPreview, setUploadedPreview] = useState(null);

  // Available camera devices for switching
  const [cameras, setCameras] = useState([]);
  const [activeCameraIndex, setActiveCameraIndex] = useState(0);
  const [isHardwareMuted, setIsHardwareMuted] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setMediaStream(null);
    setIsVideoPlaying(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Close modal and cleanup
  const handleModalClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  // Bind an active stream to video element and initiate play
  const bindStream = useCallback((video, stream) => {
    if (!video || !stream) return;
    try {
      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsVideoPlaying(true))
          .catch((err) => {
            console.warn("[FaceModal] Autoplay delayed until interaction or metadata:", err);
          });
      }
    } catch (e) {
      console.warn("[FaceModal] Error attaching stream to video:", e);
    }
  }, []);

  // Update video element whenever mediaStream changes
  useEffect(() => {
    if (videoRef.current && mediaStream) {
      bindStream(videoRef.current, mediaStream);
    }
  }, [mediaStream, bindStream]);

  // Enumerate cameras
  const scanDevices = useCallback(async () => {
    if (!navigator?.mediaDevices?.enumerateDevices) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      setCameras(videoInputs);
      return videoInputs;
    } catch {
      return [];
    }
  }, []);

  // Start camera with fallbacks and hardware detection
  const startCamera = useCallback(
    async (preferredDeviceId = null) => {
      setCameraState("initializing");
      setErrorMessage("");
      setUploadedPreview(null);
      setIsHardwareMuted(false);
      setIsVideoPlaying(false);

      try {
        if (!navigator?.mediaDevices?.getUserMedia) {
          throw new Error("WebCam API is not supported by this browser.");
        }

        // Clean up previous stream before opening new one
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        let stream = null;
        const constraintCandidates = [];

        // 1. If preferred device ID specified
        if (preferredDeviceId) {
          constraintCandidates.push({
            video: { deviceId: { exact: preferredDeviceId }, width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
          });
        }

        // 2. Front/user camera
        constraintCandidates.push({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: false,
        });

        // 3. Generic resolution constraint without facingMode (for standard Windows webcams)
        constraintCandidates.push({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });

        // 4. Simple fallback
        constraintCandidates.push({ video: true, audio: false });

        for (const constraints of constraintCandidates) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (stream) break;
          } catch (e) {
            console.warn("[FaceModal] Retrying with relaxed camera constraint due to:", e.name);
          }
        }

        if (!stream) {
          throw new Error("Could not start video stream with available constraints.");
        }

        // Inspect video track and listen for hardware mute (e.g. laptop physical privacy slider)
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = true;
          if (videoTrack.muted) {
            setIsHardwareMuted(true);
          }
          videoTrack.onmute = () => {
            console.warn("[FaceModal] Camera track muted by Windows / physical privacy switch.");
            setIsHardwareMuted(true);
          };
          videoTrack.onunmute = () => {
            console.log("[FaceModal] Camera track unmuted.");
            setIsHardwareMuted(false);
          };
        }

        streamRef.current = stream;
        setMediaStream(stream);
        setCameraState("ready");

        // Immediately bind to video DOM element
        if (videoRef.current) {
          bindStream(videoRef.current, stream);
        }

        // Refresh device list now that permission is granted
        scanDevices();
      } catch (err) {
        console.error("Camera access error:", err);
        const isNotFound =
          err.name === "NotFoundError" ||
          err.name === "DevicesNotFoundError" ||
          (err.message && err.message.toLowerCase().includes("not found")) ||
          (err.message && err.message.toLowerCase().includes("device not found"));

        const isDenied =
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError";

        if (isNotFound) {
          setCameraState("not_found");
          setErrorMessage(
            "No webcam was detected. Please check Windows camera settings or upload a photo."
          );
        } else if (isDenied) {
          setCameraState("denied");
          setErrorMessage(
            "Camera access was denied. Please allow camera access in your browser settings to verify your face."
          );
        } else {
          setCameraState("error");
          setErrorMessage(err.message || "Failed to initialize webcam.");
        }
      }
    },
    [bindStream, scanDevices]
  );

  // Switch between available cameras (useful if laptop has IR sensor + RGB camera)
  const switchNextCamera = useCallback(() => {
    if (cameras.length <= 1) return;
    const nextIdx = (activeCameraIndex + 1) % cameras.length;
    setActiveCameraIndex(nextIdx);
    const target = cameras[nextIdx];
    if (target?.deviceId) {
      toast.success(`Switching camera: ${target.label || `Camera ${nextIdx + 1}`}`);
      startCamera(target.deviceId);
    }
  }, [cameras, activeCameraIndex, startCamera]);

  // Request new anti-spoof challenge from backend
  const requestChallenge = useCallback(async () => {
    setChallenge(null);
    setCurrentStepIndex(0);
    setCapturedFrames([]);
    setErrorMessage("");
    setUploadedPreview(null);

    const body = {
      purpose,
      ...(purpose === "verify" && routine?.routineId ? { routineId: routine.routineId } : {}),
    };

    const res = await apiFetch("/api/face/challenge", {
      method: "POST",
      body,
    });

    if (!res.ok || !res.data?.success) {
      if (res.status === 401) {
        clearAuthToken();
      }
      const msg =
        res.data?.error ||
        res.data?.message ||
        (res.status === 403
          ? "Permission denied: Ensure your student account is approved by admin."
          : `Could not start face challenge (${res.status ? `Status ${res.status}` : "Network connection error"}). Please check backend connection.`);
      setErrorMessage(msg);
      toast.error(msg);
      return;
    }

    setChallenge(res.data);
    setTimeLeft(res.data.expiresInSeconds || 120);
  }, [purpose, routine]);

  // Initialize camera and challenge when opened
  useEffect(() => {
    if (isOpen) {
      startCamera();
      requestChallenge();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, requestChallenge, stopCamera]);

  // Countdown timer for challenge TTL
  useEffect(() => {
    if (!isOpen || !challenge) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setErrorMessage("Challenge expired. Click 'Restart Scan' to start a new verification scan.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, challenge]);

  // Capture single frame from current video stream as base64 JPEG
  const snapFrame = useCallback((stepName) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    // Draw mirrored to match natural preview
    ctx.drawImage(video, 0, 0, width, height);

    // Dark frame luminance diagnostic
    try {
      const imgData = ctx.getImageData(0, 0, width, height);
      let sum = 0;
      const step = 40;
      for (let i = 0; i < imgData.data.length; i += step) {
        sum += (imgData.data[i] + imgData.data[i + 1] + imgData.data[i + 2]) / 3;
      }
      const avgBrightness = sum / (imgData.data.length / step);
      if (avgBrightness < 8) {
        console.warn("[FaceModal] Captured frame is pitch dark (avg brightness:", avgBrightness, ")");
      }
    } catch {}

    const image = canvas.toDataURL("image/jpeg", 0.88);
    return { step: stepName, image };
  }, []);

  // Handle capture for the current step (Live camera)
  const handleCaptureCurrentStep = async () => {
    if (!challenge || isCapturing || isSubmitting) return;
    const currentStep = challenge.steps[currentStepIndex];
    if (!currentStep) return;

    setIsCapturing(true);

    try {
      if (currentStep === "blink") {
        // Burst capture 7 frames over 1.4 seconds for blink detection
        const frames = [];
        for (let i = 0; i < 7; i += 1) {
          const frame = snapFrame("blink");
          if (frame) frames.push(frame);
          await new Promise((r) => setTimeout(r, 180));
        }

        const updated = [...capturedFrames, ...frames];
        setCapturedFrames(updated);
        advanceOrSubmit(updated);
      } else {
        // Capture frame for center, left, or right
        const frame = snapFrame(currentStep);
        if (!frame) throw new Error("Could not capture frame from camera.");

        const updated = [...capturedFrames, frame];
        setCapturedFrames(updated);
        advanceOrSubmit(updated);
      }
    } catch (err) {
      toast.error(err.message || "Failed to capture camera frame");
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle photo upload fallback for testing or devices without camera
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, or WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      setUploadedPreview(dataUrl);

      const currentStep = challenge?.steps?.[currentStepIndex] || "center";
      let framesToAdd = [];
      if (currentStep === "blink") {
        framesToAdd = Array(7)
          .fill(null)
          .map(() => ({ step: "blink", image: dataUrl }));
      } else {
        framesToAdd = [{ step: currentStep, image: dataUrl }];
      }

      const updated = [...capturedFrames, ...framesToAdd];
      setCapturedFrames(updated);
      toast.success(`Photo selected for: ${STEP_METADATA[currentStep]?.title || currentStep}`);
      advanceOrSubmit(updated);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Move to next step or submit to server
  const advanceOrSubmit = async (allFrames) => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < challenge.steps.length) {
      setCurrentStepIndex(nextIndex);
    } else {
      // All steps captured: submit to backend
      await submitFacePayload(allFrames);
    }
  };

  // Submit collected frames to Node backend
  const submitFacePayload = async (frames) => {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      if (purpose === "enroll") {
        const res = await apiFetch("/api/face/enroll", {
          method: "POST",
          body: {
            challengeId: challenge.challengeId,
            frames,
          },
        });

        if (!res.ok || !res.data?.success) {
          const errorMsg = res.data?.error || "Face enrollment failed. Please try again.";
          setErrorMessage(errorMsg);
          toast.error(errorMsg, { icon: "⚠️" });
          return;
        }

        toast.success("Face successfully enrolled! You can now mark attendance securely.", { icon: "🎉" });
        if (onSuccess) onSuccess(res.data);
        handleModalClose();
      } else {
        // Verification mode (Mark Attendance)
        if (!routine?.routineId) {
          throw new Error("No class routine specified for verification.");
        }
        if (!coords?.latitude || !coords?.longitude) {
          throw new Error("Device coordinates are required to verify classroom proximity.");
        }

        const res = await apiFetch("/api/attendance/student/mark", {
          method: "POST",
          body: {
            routineId: routine.routineId,
            challengeId: challenge.challengeId,
            frames,
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy || null,
          },
        });

        if (!res.ok || !res.data?.success) {
          const errorMsg = res.data?.error || "Attendance verification failed.";
          setErrorMessage(errorMsg);
          toast.error(errorMsg, { duration: 6000, icon: "❌" });
          return;
        }

        toast.success(res.data?.message || "Attendance marked successfully!", { icon: "✅" });
        if (onSuccess) onSuccess(res.data);
        handleModalClose();
      }
    } catch (err) {
      console.error("Face submission error:", err);
      const msg = err.message || "Network or processing error during verification.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentStepKey = challenge?.steps?.[currentStepIndex] || "center";
  const stepInfo = STEP_METADATA[currentStepKey] || STEP_METADATA.center;
  const StepIcon = stepInfo.icon;
  const isLastStep = challenge && currentStepIndex === challenge.steps.length - 1;

  return (
    <div
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 overscroll-contain"
    >
      {/* Offscreen Canvas for Frame Capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden File Input for Photo Upload Fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl space-y-0 transition-all max-h-[92vh] overflow-y-auto overscroll-contain scrollbar-thin">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <span>{purpose === "enroll" ? "Enroll Face Biometrics" : "Live Face Verification"}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {purpose === "enroll"
                  ? "Anti-spoof liveness registration (1-to-1 student binding)"
                  : `${routine?.courseCode || "Class"} • Strict Anti-Cheat Attendance`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Camera Switcher Button if multiple cameras detected */}
            {cameras.length > 1 && (
              <button
                type="button"
                onClick={switchNextCamera}
                title="Switch camera device"
                className="p-2 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition cursor-pointer flex items-center gap-1 text-xs font-bold"
              >
                <SwitchCamera className="w-4 h-4" />
                <span className="hidden sm:inline">Switch</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleModalClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Challenge Step Progress */}
        {challenge && (
          <div className="px-5 pt-4 pb-2 bg-slate-50/30 dark:bg-slate-800/20 border-b border-slate-100 dark:border-white/5">
            <div className="flex items-center justify-between text-xs font-bold mb-2">
              <span className="text-slate-500 dark:text-slate-400">
                Liveness Step {currentStepIndex + 1} of {challenge.steps.length}
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-amber-600 dark:text-amber-400">
                <Timer className="w-3.5 h-3.5" />
                <span>{timeLeft}s</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {challenge.steps.map((st, idx) => {
                const meta = STEP_METADATA[st] || {};
                const isPassed = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;

                return (
                  <div
                    key={st + idx}
                    className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                      isPassed
                        ? "bg-emerald-500"
                        : isCurrent
                        ? "bg-indigo-600 animate-pulse"
                        : "bg-slate-200 dark:bg-slate-800"
                    }`}
                    title={meta.title}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Video / Photo Container */}
        <div className="relative p-5">
          <div className="relative mx-auto w-full aspect-[4/3] max-w-sm rounded-3xl overflow-hidden bg-slate-950 shadow-inner ring-1 ring-white/10 flex items-center justify-center">
            {/* Live WebCam Feed - ALWAYS MOUNTED AND VISIBLE in DOM so browser layout engine paints frames */}
            <video
              ref={(el) => {
                videoRef.current = el;
                if (el && mediaStream && el.srcObject !== mediaStream) {
                  bindStream(el, mediaStream);
                }
              }}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={(e) => {
                e.currentTarget.play().catch(() => {});
              }}
              onCanPlay={(e) => {
                e.currentTarget.play().catch(() => {});
                setIsVideoPlaying(true);
              }}
              onPlay={() => {
                setIsVideoPlaying(true);
              }}
              className="w-full h-full object-cover transform -scale-x-100"
            />

            {/* Uploaded Image Preview if user opted for Photo upload */}
            {uploadedPreview && (
              <img
                src={uploadedPreview}
                alt="Uploaded face frame"
                className="absolute inset-0 z-10 w-full h-full object-cover"
              />
            )}

            {/* Oval Face Guide Overlay */}
            <div className="pointer-events-none absolute inset-0 z-15 flex items-center justify-center">
              <div
                className={`w-[60%] h-[78%] rounded-[50%] border-2 transition-all duration-300 shadow-[0_0_0_9999px_rgba(15,23,42,0.45)] ${
                  cameraState === "ready" && !errorMessage
                    ? "border-indigo-400/90 shadow-indigo-500/20 animate-pulse"
                    : "border-amber-400"
                }`}
              />
            </div>

            {/* Hardware Mute Warning Banner (Laptop Privacy Slider Closed) */}
            {isHardwareMuted && (
              <div className="absolute inset-x-3 bottom-3 z-20 p-2.5 rounded-xl bg-amber-950/90 border border-amber-500/40 text-amber-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span className="leading-tight">
                  Webcam is muted by hardware. Please slide open the physical camera shutter switch above your laptop screen.
                </span>
              </div>
            )}

            {/* Camera States: Initializing Overlay */}
            {cameraState === "initializing" && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 text-white p-4 space-y-2">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
                <p className="text-xs font-bold">Connecting to camera...</p>
              </div>
            )}

            {/* Camera States: Device Not Found */}
            {cameraState === "not_found" && !uploadedPreview && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 text-white p-6 text-center space-y-3">
                <CameraOff className="w-10 h-10 text-amber-400" />
                <div>
                  <p className="text-xs font-bold text-amber-300">No Webcam Detected</p>
                  <p className="text-[11px] text-slate-300 mt-1 max-w-xs leading-relaxed">
                    Windows cannot detect an active webcam. You can retry detection or select a photo.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1 flex-wrap justify-center">
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ring-1 ring-white/10"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                  </button>
                </div>
              </div>
            )}

            {/* Camera States: Denied */}
            {cameraState === "denied" && !uploadedPreview && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 text-white p-6 text-center space-y-3">
                <AlertCircle className="w-10 h-10 text-rose-400" />
                <div>
                  <p className="text-xs font-bold text-rose-300">Camera Access Denied</p>
                  <p className="text-[11px] text-slate-300 mt-1 max-w-xs leading-relaxed">
                    Please allow camera access in your browser address bar or select a photo.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1 flex-wrap justify-center">
                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition cursor-pointer ring-1 ring-white/10"
                  >
                    Retry Access
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition cursor-pointer flex items-center gap-1.5"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                  </button>
                </div>
              </div>
            )}

            {/* Processing / Submitting Overlay */}
            {isSubmitting && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-xs text-white p-4 space-y-3">
                <div className="relative flex items-center justify-center">
                  <RefreshCw className="w-10 h-10 animate-spin text-indigo-400" />
                  <Lock className="w-4 h-4 text-white absolute" />
                </div>
                <p className="text-sm font-bold tracking-tight">Verifying Anti-Spoof Liveness...</p>
                <p className="text-[11px] text-slate-400 font-medium">Validating landmarks & 128-d biometric identity</p>
              </div>
            )}
          </div>

          {/* Helpful Camera Tip for Black Screen / Privacy Shutter */}
          <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 text-center">
            <HelpCircle className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span>
              If screen is black, ensure your laptop's physical webcam privacy slider (above screen) is open.
            </span>
          </div>

          {/* Current Step Instruction Banner */}
          {challenge && (cameraState === "ready" || cameraState === "not_found") && !errorMessage && (
            <div className="mt-3 p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center gap-3.5">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-600 text-white shrink-0 shadow-sm">
                <StepIcon className="w-6 h-6 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${stepInfo.badgeColor}`}>
                    Step {currentStepIndex + 1}: {stepInfo.title}
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug">
                  {stepInfo.instruction}
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mt-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold">Verification Notice</p>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5 leading-relaxed">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearAuthToken();
                  requestChallenge();
                  startCamera();
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold shrink-0 transition cursor-pointer"
              >
                Restart Scan
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between p-5 border-t border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40">
          <button
            type="button"
            onClick={handleModalClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 bg-slate-100/90 dark:bg-slate-800/80 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-slate-700/80 hover:border-indigo-200 dark:hover:border-indigo-800/60 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {/* Photo fallback button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCapturing || isSubmitting || !challenge || timeLeft <= 0}
              className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition cursor-pointer flex items-center gap-1.5 border border-indigo-200/60 dark:border-indigo-800/60"
              title="Upload an image file for this step"
            >
              <UploadCloud className="w-4 h-4" />
              <span className="hidden sm:inline">Upload Image</span>
            </button>

            {/* Live Camera Capture Button */}
            {cameraState === "ready" && (
              <button
                type="button"
                onClick={handleCaptureCurrentStep}
                disabled={cameraState !== "ready" || isCapturing || isSubmitting || !challenge || timeLeft <= 0}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-md shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:hover:scale-100"
              >
                {isCapturing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Capturing...</span>
                  </>
                ) : isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>{isLastStep ? "Complete & Verify" : "Capture & Next Step"}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
