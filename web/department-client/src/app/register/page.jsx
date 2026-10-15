"use client";

import { Button } from '@heroui/react';
import Link from 'next/link';
import React, { useState, useMemo } from 'react';
import { authClient } from '@/lib/auth-client';
import toast from 'react-hot-toast';
import { 
    ShieldCheck, Layers, Phone, Calendar, Sparkles, 
    Droplet, MapPin, Briefcase, Microscope, DoorOpen, Lock, Mail, User, GraduationCap, Presentation,
    Eye, EyeOff, ArrowRight, UserPlus, Hash, CheckCircle2, Clock, Home
} from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const RegisterPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [registeredData, setRegisteredData] = useState(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isVisible, setIsVisible] = useState(false);
    const [isConfirmVisible, setIsConfirmVisible] = useState(false);

    const toggleVisibility = () => setIsVisible(!isVisible);
    const toggleConfirmVisibility = () => setIsConfirmVisible(!isConfirmVisible);

    const derivedRole = useMemo(() => {
        if (!email) return null;
        const lowerEmail = email.toLowerCase();
        if (lowerEmail.endsWith("@student.cse.edu")) return "student";
        if (lowerEmail.endsWith("@teacher.cse.edu") || (lowerEmail.endsWith("@cse.edu") && !lowerEmail.includes("staff") && !lowerEmail.includes("admin"))) return "teacher";
        if (lowerEmail.endsWith("@employee.cse.edu") || lowerEmail.endsWith("@staff.cse.edu")) return "employee";
        return null;
    }, [email]);

    const onSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData);

        if (!data.password || data.password.length < 6) {
            toast.error("Password must be at least 6 characters long");
            setIsLoading(false);
            return;
        }

        if (data.password !== data.confirmPassword) {
            toast.error("Passwords do not match");
            setIsLoading(false);
            return;
        }

        const payload = {
            email: data.email,
            password: data.password,
            name: data.name,
            role: derivedRole || "student",
        };

        if (data.phone) payload.phone = data.phone;
        if (data.studentId) payload.studentId = data.studentId;
        if (data.batch) payload.batch = String(data.batch);
        if (data.semester) payload.semester = data.semester;
        if (data.session) payload.session = data.session;
        if (data.bloodGroup) payload.bloodGroup = data.bloodGroup;
        if (data.address) payload.address = data.address;
        if (data.teacherId) payload.teacherId = data.teacherId;
        if (data.designation) payload.designation = data.designation;
        if (data.specialization) payload.specialization = data.specialization;
        if (data.officeRoom) payload.officeRoom = data.officeRoom;
        if (data.joiningDate) payload.joiningDate = data.joiningDate;
        if (data.employeeId) payload.employeeId = data.employeeId;
        if (data.department) payload.department = data.department;

        try {
            const { data: signUpData, error: signUpError } = await authClient.signUp.email(payload);

            if (signUpError) {
                console.error("SignUp Error:", signUpError);
                toast.error(signUpError.message || "Registration failed. Please try again.");
                setIsLoading(false);
                return;
            }

            // If a student or teacher registered, their status is pending; sign out the auto-session so they must wait for admin approval
            if (
                payload.role === "student" || 
                payload.role === "teacher" || 
                payload.email.endsWith("@student.cse.edu") || 
                payload.email.endsWith("@teacher.cse.edu")
            ) {
                await authClient.signOut();
            }

            setIsLoading(false);
            setRegisteredData(payload);
            setIsSuccess(true);
        } catch (err) {
            console.error("Unexpected error:", err);
            toast.error(err.message || "Something went wrong. Please check your inputs.");
            setIsLoading(false);
        }
    };

    const inputClassName = "w-full h-12 bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500 rounded-lg shadow-sm !pl-11 !pr-4 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all";
    const selectClassName = "w-full h-12 !pl-11 !pr-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-400 rounded-lg text-slate-800 dark:text-white outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm appearance-none";

    // Dedicated Success Page when account is registered
    if (isSuccess && registeredData) {
        const isStudent = registeredData.role === "student" || registeredData.email.endsWith("@student.cse.edu");
        const isTeacher = registeredData.role === "teacher" || registeredData.email.endsWith("@teacher.cse.edu");

        return (
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#030712] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-emerald-100 dark:selection:bg-emerald-900/40 selection:text-emerald-900 dark:selection:text-emerald-200 transition-colors duration-300">
                {/* Background Dynamic Blur Gradients */}
                <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-slate-50/50 dark:bg-[#030712]/90 backdrop-blur-[2px] transition-colors duration-300">
                    <div className="absolute -top-[20%] -left-[10%] h-[70%] w-[70%] opacity-40 dark:opacity-20">
                        <div className="w-full h-full rounded-full bg-emerald-200 dark:bg-emerald-800 blur-[150px] animate-blob"></div>
                    </div>
                    <div className="absolute top-[10%] -right-[10%] h-[60%] w-[60%] opacity-40 dark:opacity-20">
                        <div className="w-full h-full rounded-full bg-indigo-200 dark:bg-indigo-700 blur-[150px] animate-blob" style={{ animationDelay: '2s' }}></div>
                    </div>
                    <div className="absolute -bottom-[20%] left-[10%] h-[70%] w-[70%] opacity-30 dark:opacity-15">
                        <div className="w-full h-full rounded-full bg-amber-200 dark:bg-amber-800 blur-[150px] animate-blob" style={{ animationDelay: '4s' }}></div>
                    </div>
                </div>

                {/* Top Bar with Home Link & Theme Toggle */}
                <div className="w-full max-w-xl flex items-center justify-between relative z-20 mb-4">
                    <Link 
                        href="/" 
                        className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center gap-1.5"
                    >
                        <Home className="w-3.5 h-3.5" />
                        <span>Back to Home</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <ThemeToggle className="w-9 h-9 rounded-xl shadow-xs" />
                    </div>
                </div>

                {/* Main Success Card */}
                <div className="w-full max-w-xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-8">
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl p-8 sm:p-12 rounded-[2.5rem] border border-white/80 dark:border-white/10 shadow-[0_30px_60px_-15px_rgba(16,185,129,0.25)] dark:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] text-center transition-colors duration-300">
                        
                        {/* Success Icon Badge */}
                        <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-500 dark:text-emerald-400 shadow-xl shadow-emerald-500/20 ring-1 ring-emerald-200/60 dark:ring-emerald-800/60 transition-transform duration-500 hover:scale-105">
                            <div className="absolute inset-0 rounded-[2rem] bg-emerald-400/20 dark:bg-emerald-400/10 animate-ping opacity-75 pointer-events-none" />
                            <CheckCircle2 className="h-12 w-12 text-emerald-500 dark:text-emerald-400 relative z-10" />
                        </div>

                        {/* Status Pill Badge */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200/80 dark:border-amber-800/80 text-xs font-bold text-amber-700 dark:text-amber-300 mb-4 shadow-xs">
                            <Clock className="w-3.5 h-3.5 animate-pulse" />
                            <span>
                                {isStudent
                                    ? "Student Registration Received • Awaiting Approval"
                                    : isTeacher
                                    ? "Faculty Registration Received • Awaiting Admin Approval"
                                    : "Account Created • Pending Verification"}
                            </span>
                        </div>

                        {/* Headline */}
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-800 dark:text-white">
                            Account Created Successfully!
                        </h1>

                        <p className="mt-2.5 text-sm sm:text-base leading-relaxed font-semibold text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                            Hi <span className="font-bold text-indigo-600 dark:text-indigo-400">{registeredData.name || (isTeacher ? "Faculty Member" : "Student")}</span>, your registration has been submitted. Please wait for department administrator verification.
                        </p>

                        {/* Account Snapshot Box */}
                        <div className="mt-8 p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 text-left space-y-3 shadow-xs">
                            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60 dark:border-white/5">
                                <span className="font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Academic Role</span>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                                    {registeredData.role || (isTeacher ? "Teacher" : "Student")}
                                </span>
                            </div>

                            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60 dark:border-white/5">
                                <span className="font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Registered Email</span>
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-200 truncate max-w-[220px]">
                                    {registeredData.email}
                                </span>
                            </div>

                            {registeredData.studentId && (
                                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60 dark:border-white/5">
                                    <span className="font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Roll / Student ID</span>
                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                                        {registeredData.studentId}
                                    </span>
                                </div>
                            )}

                            {registeredData.teacherId && (
                                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200/60 dark:border-white/5">
                                    <span className="font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Teacher ID</span>
                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                                        {registeredData.teacherId}
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center justify-between text-xs">
                                <span className="font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Moderation Status</span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 font-bold text-[11px]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                    <span>Pending Administrator Approval</span>
                                </span>
                            </div>
                        </div>

                        {/* What Happens Next Guidance */}
                        <div className="mt-6 p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs text-slate-600 dark:text-slate-300 text-left space-y-1.5">
                            <p className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                <span>What happens next?</span>
                            </p>
                            <p className="leading-relaxed text-slate-600 dark:text-slate-400">
                                {isTeacher
                                    ? "The department administrator will verify your faculty appointment and credentials in the admin dashboard. Once verified and approved, you can log in to view assigned routines, dispatch study materials, and launch classroom attendance sessions."
                                    : "The department administrator will review and verify your student records in the admin dashboard. Once approved, you can log in to access your student dashboard, courses, routines, and attendance."}
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
                            <Link
                                href={`/pending?email=${encodeURIComponent(registeredData.email)}`}
                                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/25 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Clock className="w-4 h-4" />
                                <span>View Approval Status</span>
                            </Link>

                            <Link
                                href="/login"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Lock className="w-4 h-4" />
                                <span>Go to Login</span>
                            </Link>
                        </div>

                        {/* Subtle Footer Help */}
                        <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">
                            Need help? Contact the administrator at <a href="mailto:admin@cse.edu" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">admin@cse.edu</a>
                        </p>
                    </div>

                    <p className="mt-8 text-center text-xs font-bold tracking-[0.3em] text-slate-400 dark:text-slate-600 uppercase">
                        CSE Department Management System • Secured Environment
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#030712] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/40 selection:text-indigo-900 dark:selection:text-indigo-200 transition-colors duration-300">
            {/* Background Dynamic Blur Gradients matching Landing Page */}
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-slate-50/50 dark:bg-[#030712]/90 backdrop-blur-[2px] transition-colors duration-300">
                <div className="absolute -top-[20%] -left-[10%] h-[70%] w-[70%] opacity-40 dark:opacity-20">
                    <div className="w-full h-full rounded-full bg-indigo-200 dark:bg-indigo-700 blur-[150px] animate-blob"></div>
                </div>
                <div className="absolute top-[10%] -right-[10%] h-[60%] w-[60%] opacity-40 dark:opacity-20">
                    <div className="w-full h-full rounded-full bg-sky-200 dark:bg-sky-700 blur-[150px] animate-blob" style={{animationDelay: '2s'}}></div>
                </div>
                <div className="absolute -bottom-[20%] left-[10%] h-[70%] w-[70%] opacity-30 dark:opacity-15">
                    <div className="w-full h-full rounded-full bg-purple-200 dark:bg-purple-800 blur-[150px] animate-blob" style={{animationDelay: '4s'}}></div>
                </div>
            </div>

            {/* Top Bar with Home Link & Theme Toggle */}
            <div className="w-full max-w-2xl flex items-center justify-between relative z-20 mb-2">
                <Link 
                    href="/" 
                    className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center gap-1.5"
                >
                    <span>← Back to Home</span>
                </Link>
                <div className="flex items-center gap-2">
                    <ThemeToggle className="w-9 h-9 rounded-xl shadow-xs" />
                </div>
            </div>

            <div className="w-full max-w-2xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-10">
                
                {/* Header Section */}
                <div className="text-center mb-8">
                    <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white dark:bg-slate-900 shadow-[0_0_40px_-10px_rgba(79,70,229,0.3)] dark:shadow-[0_0_40px_-10px_rgba(99,102,241,0.2)] ring-1 ring-slate-100 dark:ring-white/10 transform transition-transform hover:scale-105 hover:rotate-3 duration-500 ${
                        derivedRole === 'student' ? 'text-indigo-600 dark:text-indigo-400' : 
                        derivedRole === 'teacher' ? 'text-sky-500 dark:text-sky-400' : 
                        derivedRole === 'employee' ? 'text-emerald-500 dark:text-emerald-400' : 
                        'text-slate-800 dark:text-slate-100'
                    }`}>
                        {derivedRole === 'student' ? <GraduationCap className="h-8 w-8 animate-in zoom-in" strokeWidth={2.5} /> :
                         derivedRole === 'teacher' ? <Presentation className="h-8 w-8 animate-in zoom-in" strokeWidth={2.5} /> :
                         derivedRole === 'employee' ? <Briefcase className="h-8 w-8 animate-in zoom-in" strokeWidth={2.5} /> :
                         <UserPlus className="h-8 w-8 animate-in zoom-in" strokeWidth={2.5} />}
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-500 dark:from-indigo-400 dark:to-purple-400">
                            {derivedRole === 'student' ? "Student Registration" : 
                             derivedRole === 'teacher' ? "Faculty Registration" : 
                             derivedRole === 'employee' ? "Employee Registration" : 
                             "Create an Account"}
                        </span>
                    </h1>
                    <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                        {derivedRole ? `Complete your ${derivedRole} profile below` : "Enter your email to automatically determine your role"}
                    </p>
                </div>

                <div className="bg-white/70 dark:bg-slate-900/80 backdrop-blur-3xl p-8 sm:p-12 rounded-[2.5rem] border border-white/80 dark:border-white/10 shadow-[0_30px_60px_-15px_rgba(79,70,229,0.3)] dark:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] transition-colors duration-300">
                    <form onSubmit={onSubmit} className="flex flex-col gap-6">
                        
                        {/* BASE FIELDS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                            <div className="flex flex-col gap-1.5 w-full">
                                <label className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                                    <input required name="name" placeholder="e.g. John Doe" className={inputClassName} />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5 w-full">
                                <label className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                                    <input 
                                        required name="email" type="email" placeholder="john@student.cse.edu" 
                                        className={inputClassName}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ROLE CONFIRMATION BADGE */}
                        {derivedRole && (
                            <div className="flex items-center gap-2 w-full mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
                                    derivedRole === 'student' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 ring-1 ring-indigo-200 dark:ring-indigo-800' : 
                                    derivedRole === 'teacher' ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 ring-1 ring-sky-200 dark:ring-sky-800' : 
                                    'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800'
                                }`}>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Register as {derivedRole}
                                </span>
                                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                                    Role automatically detected from email domain
                                </span>
                            </div>
                        )}

                        {/* DYNAMIC STUDENT FIELDS */}
                        {derivedRole === "student" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full animate-in fade-in zoom-in-95 duration-500 pt-6 border-t border-slate-100 dark:border-white/10">
                                
                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Student Roll</label>
                                    <div className="relative">
                                        <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                                        <input name="studentId" placeholder="e.g. 220106" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                                        <input name="phone" placeholder="+880" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Batch</label>
                                    <div className="relative">
                                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                                        <input 
                                            name="batch" 
                                            type="number" 
                                            min="1" 
                                            placeholder="Enter batch number" 
                                            className={inputClassName} 
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Session</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                                        <input name="session" placeholder="e.g. 2022-2023" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Semester</label>
                                    <div className="relative">
                                        <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                                        <select name="semester" className={selectClassName} defaultValue="">
                                            <option value="" disabled className="bg-white dark:bg-slate-800">Select Semester</option>
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s.toString()} className="bg-white dark:bg-slate-800">Semester {s}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Blood Group</label>
                                    <div className="relative">
                                        <Droplet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                                        <select name="bloodGroup" className={selectClassName} defaultValue="">
                                            <option value="" disabled className="bg-white dark:bg-slate-800">Select Blood Group</option>
                                            {BLOOD_GROUPS.map(g => <option key={g} value={g} className="bg-white dark:bg-slate-800">{g}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full md:col-span-2">
                                    <label className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Address</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                                        <input name="address" placeholder="City, District" className={inputClassName} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* DYNAMIC TEACHER FIELDS */}
                        {derivedRole === "teacher" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full animate-in fade-in zoom-in-95 duration-500 pt-6 border-t border-slate-100 dark:border-white/10">
                                
                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Dept ID</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                                        <input name="teacherId" placeholder="e.g. T-101" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                                        <input name="phone" placeholder="+880" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Designation</label>
                                    <div className="relative">
                                        <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                                        <input name="designation" placeholder="e.g. Professor" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Specialization</label>
                                    <div className="relative">
                                        <Microscope className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                                        <input name="specialization" placeholder="e.g. AI & ML" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Joining Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                                        <input name="joiningDate" type="date" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Office Room</label>
                                    <div className="relative">
                                        <DoorOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                                        <input name="officeRoom" placeholder="e.g. Room 402" className={inputClassName} />
                                    </div>
                                </div>

                            </div>
                        )}

                        {/* DYNAMIC EMPLOYEE FIELDS */}
                        {derivedRole === "employee" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full animate-in fade-in zoom-in-95 duration-500 pt-6 border-t border-slate-100 dark:border-white/10">
                                
                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Employee ID</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                                        <input name="employeeId" placeholder="e.g. E-204" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                                        <input name="phone" placeholder="+880" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Department</label>
                                    <div className="relative">
                                        <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                                        <input name="department" placeholder="e.g. IT Support" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Designation</label>
                                    <div className="relative">
                                        <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                                        <input name="designation" placeholder="e.g. Lab Assistant" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Joining Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                                        <input name="joiningDate" type="date" className={inputClassName} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PASSWORDS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full pt-6 border-t border-slate-100 dark:border-white/10">
                            
                            <div className="flex flex-col gap-1.5 w-full">
                                <label className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                                    <input 
                                        required name="password" 
                                        type={isVisible ? "text" : "password"} 
                                        placeholder="Min 6 characters" 
                                        onChange={(e) => setPassword(e.target.value)}
                                        minLength={6}
                                        className={inputClassName.replace("!pr-4", "!pr-11")}
                                    />
                                    <button className="absolute right-4 top-1/2 -translate-y-1/2 focus:outline-none z-10" type="button" onClick={toggleVisibility}>
                                        {isVisible ? <EyeOff className="w-5 h-5 text-slate-400 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors" /> : <Eye className="w-5 h-5 text-slate-400 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5 w-full">
                                <label className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Confirm Password</label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                                    <input 
                                        required name="confirmPassword" 
                                        type={isConfirmVisible ? "text" : "password"} 
                                        placeholder="Repeat password" 
                                        className={inputClassName.replace("!pr-4", "!pr-11")}
                                    />
                                    <button className="absolute right-4 top-1/2 -translate-y-1/2 focus:outline-none z-10" type="button" onClick={toggleConfirmVisibility}>
                                        {isConfirmVisible ? <EyeOff className="w-5 h-5 text-slate-400 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors" /> : <Eye className="w-5 h-5 text-slate-400 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full inline-flex items-center justify-center font-bold text-sm tracking-wide h-14 px-8 shadow-xl shadow-indigo-200/50 dark:shadow-indigo-950/40 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-2xl text-white transition-colors mt-2"
                            isLoading={isLoading}
                            endContent={!isLoading && <ArrowRight className="h-4 w-4 ml-1 opacity-90" />}
                        >
                            Create Account
                        </Button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/10 flex justify-center">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            Already registered?{" "}
                            <Link href="/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-all">
                                Sign In Instead
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
