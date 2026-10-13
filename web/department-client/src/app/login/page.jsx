"use client";

import { Button } from '@heroui/react';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { authClient } from '@/lib/auth-client';
import toast from 'react-hot-toast';
import { Lock, Mail, KeyRound, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/common/ThemeToggle';

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5000";

const redirectByRole = (role, email) => {
    const cleanEmail = (email || "").toLowerCase().trim();
    if (role === "admin" || cleanEmail === "admin@cse.edu") {
        window.location.href = "/dashboard/admin";
    } else if (role === "teacher" || cleanEmail.endsWith("@teacher.cse.edu") || (cleanEmail.endsWith("@cse.edu") && !cleanEmail.includes("student") && !cleanEmail.includes("staff") && !cleanEmail.includes("admin"))) {
        window.location.href = "/dashboard/teacher";
    } else if (role === "employee" || cleanEmail.endsWith("@employee.cse.edu") || cleanEmail.endsWith("@staff.cse.edu")) {
        window.location.href = "/dashboard/employee";
    } else {
        window.location.href = "/dashboard/student";
    }
};

const LoginPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const { data: sessionData } = authClient.useSession();

    useEffect(() => {
        if (sessionData?.user) {
            const cleanEmail = (sessionData.user.email || "").toLowerCase().trim();
            const role = sessionData.user.role;
            const isStudent = role === "student" || cleanEmail.endsWith("@student.cse.edu");

            if (isStudent) {
                // Verify student approval before auto-redirecting
                fetch(`${SERVER_URL}/api/students/email/${cleanEmail}`)
                    .then((res) => {
                        if (!res.ok) throw new Error("Student record not found");
                        return res.json();
                    })
                    .then((student) => {
                        if (student?.status === "approved") {
                            window.location.href = "/dashboard/student";
                        } else {
                            // Account is pending or rejected; clear session
                            authClient.signOut();
                        }
                    })
                    .catch(() => {
                        authClient.signOut();
                    });
                return;
            }

            redirectByRole(role, cleanEmail);
        }
    }, [sessionData]);

    const toggleVisibility = () => setIsVisible(!isVisible);

    const onSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData);
        const email = (data.email || "").toLowerCase().trim();

        const { data: signInData, error: signInError } = await authClient.signIn.email({
            email: data.email,
            password: data.password,
        });

        if (signInError) {
            toast.error(signInError.message || "Invalid credentials.");
            setIsLoading(false);
            return;
        }

        const isStudent = email.endsWith("@student.cse.edu") || signInData?.user?.role === "student";

        if (isStudent) {
            // Check student approval status from database
            try {
                const res = await fetch(`${SERVER_URL}/api/students/email/${email}`);
                if (res.ok) {
                    const student = await res.json();
                    if (student.status === "pending") {
                        await authClient.signOut();
                        toast.error("Your student account is currently PENDING approval by the department administrator. Please wait for verification.", { duration: 6000 });
                        setIsLoading(false);
                        return;
                    }
                    if (student.status === "rejected") {
                        await authClient.signOut();
                        toast.error("Your student registration was REJECTED by the department administration. Please contact the department office.", { duration: 6000 });
                        setIsLoading(false);
                        return;
                    }
                }
            } catch (err) {
                console.warn("Error checking student status:", err);
            }

            toast.success("Welcome! Entering student dashboard...");
            window.location.href = "/dashboard/student";
            return;
        }

        toast.success("Logged in successfully!");
        let role = signInData?.user?.role;
        if (!role) {
            try {
                const res = await fetch(`${SERVER_URL}/api/users/${email}`);
                if (res.ok) {
                    const userData = await res.json();
                    role = userData?.user?.role;
                }
            } catch (e) {
                console.error("User role lookup:", e);
            }
        }
        redirectByRole(role, email);
    };

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
            <div className="w-full max-w-md flex items-center justify-between relative z-20 mb-2">
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

            <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-10">
                
                {/* Logo / Icon Area */}
                <div className="text-center mb-10">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-[0_0_40px_-10px_rgba(79,70,229,0.3)] dark:shadow-[0_0_40px_-10px_rgba(99,102,241,0.2)] ring-1 ring-slate-100 dark:ring-white/10 transform transition-transform hover:scale-105 hover:rotate-3 duration-500">
                        <KeyRound className="h-8 w-8" strokeWidth={2.5} />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-500 dark:from-indigo-400 dark:to-purple-400">Welcome Back</span>
                    </h1>
                    <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                        Sign in to continue to your workspace
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white/70 dark:bg-slate-900/80 backdrop-blur-3xl p-8 sm:p-10 rounded-[2rem] border border-white/80 dark:border-white/10 shadow-[0_30px_60px_-15px_rgba(79,70,229,0.3)] dark:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] transition-colors duration-300">
                    <form onSubmit={onSubmit} className="flex flex-col gap-5">
                        
                        <div className="flex flex-col gap-1.5 w-full">
                            <label className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                                <input 
                                    required name="email" type="email" placeholder="e.g. john@student.cse.edu" 
                                    className="w-full h-12 bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500 rounded-lg shadow-sm !pl-11 !pr-4 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5 w-full">
                            <label className="font-semibold text-slate-700 dark:text-slate-200 text-sm">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 z-10 pointer-events-none" />
                                <input 
                                    required name="password" type={isVisible ? "text" : "password"} placeholder="Enter your password" 
                                    className="w-full h-12 bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-400 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-1 focus:ring-indigo-500 rounded-lg shadow-sm !pl-11 !pr-11 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all"
                                />
                                <button className="absolute right-4 top-1/2 -translate-y-1/2 focus:outline-none z-10" type="button" onClick={toggleVisibility}>
                                    {isVisible ? <EyeOff className="w-5 h-5 text-slate-400 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors" /> : <Eye className="w-5 h-5 text-slate-400 hover:text-indigo-500 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex w-full items-center justify-end -mt-2">
                            <Link href="#" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-all">
                                Forgot password?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            className="w-full inline-flex items-center justify-center font-bold text-sm tracking-wide h-14 px-8 shadow-xl shadow-indigo-200/50 dark:shadow-indigo-950/40 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-2xl text-white transition-colors mt-2"
                            isLoading={isLoading}
                            endContent={!isLoading && <ArrowRight className="h-4 w-4 ml-1 opacity-90" />}
                        >
                            Sign In
                        </Button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/10 flex justify-center">
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            Don't have an account?{" "}
                            <Link href="/register" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline transition-all">
                                Register now
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
