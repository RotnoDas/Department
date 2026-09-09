"use client";

import { Button, Input, Form } from '@heroui/react';
import Link from 'next/link';
import React, { useState, useMemo } from 'react';
import { authClient } from '@/lib/auth-client';
import toast from 'react-hot-toast';
import { 
    ArrowLeft, ShieldCheck, Layers, Phone, Calendar, Sparkles, 
    Droplet, MapPin, Briefcase, Microscope, DoorOpen, Lock, Mail, User
} from 'lucide-react';
import Image from 'next/image';

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const RegisterPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // Determine role dynamically based on email domain
    const derivedRole = useMemo(() => {
        if (!email) return null;
        if (email.endsWith("@student.cse.edu")) return "student";
        if (email.endsWith("@cse.edu") && email !== "admin@cse.edu") return "teacher";
        return null; // Don't show extra fields for admin or invalid domains yet
    }, [email]);

    const onSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData);

        if (data.password !== data.confirmPassword) {
            toast.error("Passwords do not match");
            setIsLoading(false);
            return;
        }

        const { data: signUpData, error: signUpError } = await authClient.signUp.email({
            email: data.email,
            password: data.password,
            name: data.name,
            // Additional fields supported by better-auth config
            studentId: data.studentId,
            phone: data.phone,
            batch: data.batch,
            semester: data.semester,
            bloodGroup: data.bloodGroup,
            address: data.address,
            teacherId: data.teacherId,
            designation: data.designation,
            specialization: data.specialization,
            officeRoom: data.officeRoom,
        });

        if (signUpError) {
            toast.error(signUpError.message || "Registration failed. Please try again.");
            setIsLoading(false);
        } else {
            toast.success("Account created successfully!");
            window.location.href = "/login";
        }
    };

    return (
        <div className="flex min-h-screen bg-white font-sans">
            {/* Left Panel - High-End CSE Showcase */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center bg-slate-900">
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=2670&auto=format&fit=crop"
                        alt="Computer Science"
                        className="w-full h-full object-cover opacity-30 transition-transform duration-[20s] hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
                </div>

                <div className="relative z-10 p-12 xl:p-20 flex flex-col items-center text-center mt-auto mb-16 xl:mb-24">
                    <div className="backdrop-blur-xl bg-black/20 p-8 xl:p-12 rounded-[2rem] xl:rounded-[3rem] border border-white/10 shadow-2xl">
                        <h2 className="text-4xl xl:text-5xl font-black text-white tracking-tight leading-tight">
                            Department of <br /> 
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-sky-400 italic">Computer Science</span>
                        </h2>
                        <p className="mt-5 xl:mt-8 text-slate-300 max-w-md xl:max-w-lg text-lg font-medium leading-relaxed">
                            Join our unified digital ecosystem. Empowering students, faculty, and administrators with real-time academic tools.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Panel - Dynamic Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 xl:p-24 relative overflow-y-auto">
                <Link href="/" className="absolute top-8 left-8 flex items-center gap-2 text-xs font-black tracking-widest text-slate-400 uppercase hover:text-indigo-600 transition-colors">
                    <ArrowLeft className="h-4 w-4" /> Back to Home
                </Link>

                <div className="w-full max-w-md mt-16 lg:mt-0">
                    <div className="mb-10">
                        <h1 className="text-3xl font-black tracking-tight text-slate-800">Create an account</h1>
                        <p className="text-slate-500 mt-2 text-sm font-medium">Your role is determined securely by your email domain.</p>
                    </div>

                    <Form validationBehavior="native" onSubmit={onSubmit} className="space-y-5">
                        
                        {/* BASE FIELDS */}
                        <div className="w-full">
                            <label className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 uppercase mb-2">
                                <User className="h-4 w-4 text-indigo-500" /> Full Name *
                            </label>
                            <Input 
                                required name="name" placeholder="e.g. John Doe" 
                                variant="bordered" className="w-full" radius="md"
                            />
                        </div>

                        <div className="w-full">
                            <label className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 uppercase mb-2">
                                <Mail className="h-4 w-4 text-indigo-500" /> Email Address *
                            </label>
                            <Input 
                                required name="email" type="email"
                                placeholder="john@student.cse.edu or teacher@cse.edu" 
                                variant="bordered" className="w-full" radius="md"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        {/* DYNAMIC STUDENT FIELDS */}
                        {derivedRole === "student" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="w-full">
                                    <label className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 uppercase mb-2">
                                        <Layers className="h-3 w-3 text-sky-500" /> Student Roll
                                    </label>
                                    <Input name="studentId" placeholder="e.g. 220106" variant="bordered" radius="md" />
                                </div>
                                <div className="w-full">
                                    <label className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 uppercase mb-2">
                                        <Phone className="h-3 w-3 text-emerald-500" /> Phone
                                    </label>
                                    <Input name="phone" placeholder="+880" variant="bordered" radius="md" />
                                </div>
                                <div className="w-full">
                                    <label className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 uppercase mb-2">
                                        <Calendar className="h-3 w-3 text-amber-500" /> Batch
                                    </label>
                                    <Input name="batch" placeholder="e.g. 2024-2028" variant="bordered" radius="md" />
                                </div>
                                <div className="w-full">
                                    <label className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 uppercase mb-2">
                                        <Sparkles className="h-3 w-3 text-indigo-500" /> Semester
                                    </label>
                                    <select name="semester" className="w-full h-10 px-3 bg-white border-2 border-slate-200 hover:border-slate-300 rounded-md text-sm text-slate-700 outline-none focus:border-slate-800 transition-colors" defaultValue="">
                                        <option value="" disabled>Select</option>
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s.toString()}>Semester {s}</option>)}
                                    </select>
                                </div>
                                <div className="w-full">
                                    <label className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 uppercase mb-2">
                                        <Droplet className="h-3 w-3 text-rose-500" /> Blood Group
                                    </label>
                                    <select name="bloodGroup" className="w-full h-10 px-3 bg-white border-2 border-slate-200 hover:border-slate-300 rounded-md text-sm text-slate-700 outline-none focus:border-slate-800 transition-colors" defaultValue="">
                                        <option value="" disabled>Select</option>
                                        {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                                <div className="w-full md:col-span-2">
                                    <label className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 uppercase mb-2">
                                        <MapPin className="h-3 w-3 text-indigo-500" /> Address
                                    </label>
                                    <Input name="address" placeholder="City, District" variant="bordered" radius="md" />
                                </div>
                            </div>
                        )}

                        {/* DYNAMIC TEACHER FIELDS */}
                        {derivedRole === "teacher" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="w-full">
                                    <label className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 uppercase mb-2">
                                        <Briefcase className="h-3 w-3 text-sky-500" /> Dept ID
                                    </label>
                                    <Input name="teacherId" placeholder="e.g. T-101" variant="bordered" radius="md" />
                                </div>
                                <div className="w-full">
                                    <label className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 uppercase mb-2">
                                        <Phone className="h-3 w-3 text-emerald-500" /> Phone
                                    </label>
                                    <Input name="phone" placeholder="+880" variant="bordered" radius="md" />
                                </div>
                                <div className="w-full">
                                    <label className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 uppercase mb-2">
                                        <Sparkles className="h-3 w-3 text-amber-500" /> Designation
                                    </label>
                                    <Input name="designation" placeholder="e.g. Professor" variant="bordered" radius="md" />
                                </div>
                                <div className="w-full">
                                    <label className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 uppercase mb-2">
                                        <Microscope className="h-3 w-3 text-indigo-500" /> Spec.
                                    </label>
                                    <Input name="specialization" placeholder="e.g. AI & ML" variant="bordered" radius="md" />
                                </div>
                                <div className="w-full md:col-span-2">
                                    <label className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 uppercase mb-2">
                                        <DoorOpen className="h-3 w-3 text-rose-500" /> Office Room
                                    </label>
                                    <Input name="officeRoom" placeholder="e.g. Room 402" variant="bordered" radius="md" />
                                </div>
                            </div>
                        )}

                        {/* PASSWORDS */}
                        <div className="w-full">
                            <label className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 uppercase mb-2">
                                <Lock className="h-4 w-4 text-indigo-500" /> Password *
                            </label>
                            <Input 
                                required name="password" type="password" placeholder="Create a strong password" 
                                variant="bordered" className="w-full" radius="md"
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={6}
                            />
                        </div>

                        <div className="w-full">
                            <label className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500 uppercase mb-2">
                                <ShieldCheck className="h-4 w-4 text-indigo-500" /> Confirm Password *
                            </label>
                            <Input 
                                required name="confirmPassword" type="password" placeholder="Re-enter your password" 
                                variant="bordered" className="w-full" radius="md"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-slate-900 text-white font-black tracking-widest uppercase h-14 mt-6 transition-all hover:bg-indigo-600 hover:shadow-xl hover:shadow-indigo-200"
                            radius="md"
                            isLoading={isLoading}
                        >
                            Create Account
                        </Button>
                    </Form>

                    <p className="text-center text-xs font-bold text-slate-500 mt-8">
                        Already have an account?{" "}
                        <Link href="/login" className="text-indigo-600 hover:text-indigo-700 transition-colors ml-1">
                            Sign In Instead
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
