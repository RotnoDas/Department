"use client";

import { Button, Input, Form } from '@heroui/react';
import Link from 'next/link';
import React, { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import toast from 'react-hot-toast';
import { ArrowLeft, Lock, Mail } from 'lucide-react';

const LoginPage = () => {
    const [isLoading, setIsLoading] = useState(false);

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
        <div className="flex min-h-screen bg-white font-sans">
            {/* Left Panel - High-End CSE Showcase */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center bg-slate-900">
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2670&auto=format&fit=crop"
                        alt="Computer Science Tech"
                        className="w-full h-full object-cover opacity-30 transition-transform duration-[20s] hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
                </div>

                <div className="relative z-10 p-12 xl:p-20 flex flex-col items-center text-center mt-auto mb-16 xl:mb-24">
                    <div className="backdrop-blur-xl bg-black/20 p-8 xl:p-12 rounded-[2rem] xl:rounded-[3rem] border border-white/10 shadow-2xl">
                        <h2 className="text-4xl xl:text-5xl font-black text-white tracking-tight leading-tight">
                            Welcome <br /> 
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-sky-400 italic">Back</span>
                        </h2>
                        <p className="mt-5 xl:mt-8 text-slate-300 max-w-md xl:max-w-lg text-lg font-medium leading-relaxed">
                            Sign in to access your portal, check your routine, and stay updated with the department.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 xl:p-24 relative">
                <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-xs font-black tracking-widest text-slate-400 uppercase hover:text-indigo-600 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back to Home
                </Link>

                <div className="w-full max-w-sm mt-16 lg:mt-0">
                    <div className="mb-10">
                        <h1 className="text-3xl font-black tracking-tight text-slate-800">Sign In</h1>
                        <p className="text-slate-500 mt-2 text-sm font-medium">Enter your credentials to access your account.</p>
                    </div>

                    <Form validationBehavior="native" onSubmit={onSubmit} className="space-y-6">
                        <div className="w-full">
                            <label className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 uppercase mb-2">
                                <Mail className="h-4 w-4 text-sky-500" /> Email Address
                            </label>
                            <Input 
                                required name="email" type="email" placeholder="e.g. john@student.cse.edu" 
                                variant="bordered" className="w-full" radius="md"
                            />
                        </div>

                        <div className="w-full">
                            <label className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 uppercase mb-2">
                                <Lock className="h-4 w-4 text-sky-500" /> Password
                            </label>
                            <Input 
                                required name="password" type="password" placeholder="Enter your password" 
                                variant="bordered" className="w-full" radius="md"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-slate-900 text-white font-black tracking-widest uppercase h-14 mt-6 transition-all hover:bg-sky-600 hover:shadow-xl hover:shadow-sky-200"
                            radius="md"
                            isLoading={isLoading}
                        >
                            Sign In
                        </Button>
                    </Form>

                    <p className="text-center text-xs font-bold text-slate-500 mt-8">
                        Don't have an account?{" "}
                        <Link href="/register" className="text-sky-600 hover:text-sky-700 transition-colors ml-1">
                            Create Account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
