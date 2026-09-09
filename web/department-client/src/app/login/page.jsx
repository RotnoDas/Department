"use client";

import { Button } from '@heroui/react';
import Link from 'next/link';
import React, { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import toast from 'react-hot-toast';
import { Lock, Mail, KeyRound, Eye, EyeOff, ArrowRight } from 'lucide-react';

const LoginPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    const toggleVisibility = () => setIsVisible(!isVisible);

    const onSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData);

        const { data: signInData, error: signInError } = await authClient.signIn.email({
            email: data.email,
            password: data.password,
        });

        if (signInError) {
            toast.error(signInError.message || "Invalid credentials.");
            setIsLoading(false);
        } else {
            toast.success("Logged in successfully!");
            window.location.href = "/";
        }
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-indigo-100 selection:text-indigo-900">
            {/* Background Dynamic Blur Gradients matching Landing Page */}
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-slate-50/50 backdrop-blur-[2px]">
                <div className="absolute -top-[20%] -left-[10%] h-[70%] w-[70%] opacity-40">
                    <div className="w-full h-full rounded-full bg-indigo-200 blur-[150px] animate-blob"></div>
                </div>
                <div className="absolute top-[10%] -right-[10%] h-[60%] w-[60%] opacity-40">
                    <div className="w-full h-full rounded-full bg-sky-200 blur-[150px] animate-blob" style={{animationDelay: '2s'}}></div>
                </div>
                <div className="absolute -bottom-[20%] left-[10%] h-[70%] w-[70%] opacity-30">
                    <div className="w-full h-full rounded-full bg-purple-200 blur-[150px] animate-blob" style={{animationDelay: '4s'}}></div>
                </div>
            </div>

            <div className="w-full max-w-md relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 py-10">
                
                {/* Logo / Icon Area */}
                <div className="text-center mb-10">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-indigo-600 shadow-[0_0_40px_-10px_rgba(79,70,229,0.3)] ring-1 ring-slate-100 transform transition-transform hover:scale-105 hover:rotate-3 duration-500">
                        <KeyRound className="h-8 w-8" strokeWidth={2.5} />
                    </div>
                    <h1 className="text-3xl font-extrabold tracking-tight">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-500">Welcome Back</span>
                    </h1>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                        Sign in to continue to your workspace
                    </p>
                </div>

                {/* Form Card */}
                <div className="bg-white/70 backdrop-blur-3xl p-8 sm:p-10 rounded-[2rem] border border-white/80 shadow-[0_30px_60px_-15px_rgba(79,70,229,0.3)]">
                    <form onSubmit={onSubmit} className="flex flex-col gap-5">
                        
                        <div className="flex flex-col gap-1.5 w-full">
                            <label className="font-semibold text-slate-700 text-sm">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                                <input 
                                    required name="email" type="email" placeholder="e.g. john@student.cse.edu" 
                                    className="w-full h-12 bg-white border-2 border-slate-200 hover:border-indigo-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg shadow-sm !pl-11 !pr-4 text-slate-800 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5 w-full">
                            <label className="font-semibold text-slate-700 text-sm">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                                <input 
                                    required name="password" type={isVisible ? "text" : "password"} placeholder="Enter your password" 
                                    className="w-full h-12 bg-white border-2 border-slate-200 hover:border-indigo-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg shadow-sm !pl-11 !pr-11 text-slate-800 outline-none transition-all"
                                />
                                <button className="absolute right-4 top-1/2 -translate-y-1/2 focus:outline-none z-10" type="button" onClick={toggleVisibility}>
                                    {isVisible ? <EyeOff className="w-5 h-5 text-slate-400 hover:text-indigo-500 transition-colors" /> : <Eye className="w-5 h-5 text-slate-400 hover:text-indigo-500 transition-colors" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex w-full items-center justify-end -mt-2">
                            <Link href="#" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-all">
                                Forgot password?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            className="w-full inline-flex items-center justify-center font-bold text-sm tracking-wide h-14 px-8 shadow-xl shadow-indigo-200/50 bg-indigo-600 hover:bg-indigo-700 rounded-2xl text-white transition-colors mt-2"
                            isLoading={isLoading}
                            endContent={!isLoading && <ArrowRight className="h-4 w-4 ml-1 opacity-90" />}
                        >
                            Sign In
                        </Button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
                        <p className="text-sm font-medium text-slate-500">
                            Don't have an account?{" "}
                            <Link href="/register" className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline transition-all">
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
