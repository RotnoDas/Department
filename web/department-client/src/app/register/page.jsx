"use client";

import { Button } from '@heroui/react';
import Link from 'next/link';
import React, { useState, useMemo } from 'react';
import { authClient } from '@/lib/auth-client';
import toast from 'react-hot-toast';
import { 
    ShieldCheck, Layers, Phone, Calendar, Sparkles, 
    Droplet, MapPin, Briefcase, Microscope, DoorOpen, Lock, Mail, User, GraduationCap, Presentation,
    Eye, EyeOff, ArrowRight, UserPlus
} from 'lucide-react';

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const RegisterPage = () => {
    const [isLoading, setIsLoading] = useState(false);
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

        if (data.password !== data.confirmPassword) {
            toast.error("Passwords do not match");
            setIsLoading(false);
            return;
        }

        const { data: signUpData, error: signUpError } = await authClient.signUp.email({
            email: data.email,
            password: data.password,
            name: data.name,
            studentId: data.studentId,
            phone: data.phone,
            batch: data.batch,
            semester: data.semester,
            session: data.session,
            bloodGroup: data.bloodGroup,
            address: data.address,
            teacherId: data.teacherId,
            designation: data.designation,
            specialization: data.specialization,
            joiningDate: data.joiningDate,
            employeeId: data.employeeId,
            department: data.department,
            role: derivedRole || "user",
        });

        if (signUpError) {
            toast.error(signUpError.message || "Registration failed. Please try again.");
            setIsLoading(false);
        } else {
            toast.success("Account created successfully!");
            window.location.href = "/login";
        }
    };

    const inputClassName = "w-full h-12 bg-white border-2 border-slate-200 hover:border-indigo-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg shadow-sm !pl-11 !pr-4 text-slate-800 outline-none transition-all";

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

            <div className="w-full max-w-2xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700 py-10">
                
                {/* Header Section */}
                <div className="text-center mb-8">
                    <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-[0_0_40px_-10px_rgba(79,70,229,0.3)] ring-1 ring-slate-100 transform transition-transform hover:scale-105 hover:rotate-3 duration-500 ${
                        derivedRole === 'student' ? 'text-indigo-600' : 
                        derivedRole === 'teacher' ? 'text-sky-500' : 
                        derivedRole === 'employee' ? 'text-emerald-500' : 
                        'text-slate-800'
                    }`}>
                        {derivedRole === 'student' ? <GraduationCap className="h-8 w-8 animate-in zoom-in" strokeWidth={2.5} /> :
                         derivedRole === 'teacher' ? <Presentation className="h-8 w-8 animate-in zoom-in" strokeWidth={2.5} /> :
                         derivedRole === 'employee' ? <Briefcase className="h-8 w-8 animate-in zoom-in" strokeWidth={2.5} /> :
                         <UserPlus className="h-8 w-8 animate-in zoom-in" strokeWidth={2.5} />}
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-500">
                            {derivedRole === 'student' ? "Student Registration" : 
                             derivedRole === 'teacher' ? "Faculty Registration" : 
                             derivedRole === 'employee' ? "Employee Registration" : 
                             "Create an Account"}
                        </span>
                    </h1>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                        {derivedRole ? `Complete your ${derivedRole} profile below` : "Enter your email to automatically determine your role"}
                    </p>
                </div>

                <div className="bg-white/70 backdrop-blur-3xl p-8 sm:p-12 rounded-[2.5rem] border border-white/80 shadow-[0_30px_60px_-15px_rgba(79,70,229,0.3)]">
                    <form onSubmit={onSubmit} className="flex flex-col gap-6">
                        
                        {/* BASE FIELDS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                            <div className="flex flex-col gap-1.5 w-full">
                                <label className="font-semibold text-slate-700 text-sm">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                                    <input required name="name" placeholder="e.g. John Doe" className={inputClassName} />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5 w-full">
                                <label className="font-semibold text-slate-700 text-sm">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
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
                                    derivedRole === 'student' ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200' : 
                                    derivedRole === 'teacher' ? 'bg-sky-50 text-sky-600 ring-1 ring-sky-200' : 
                                    'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
                                }`}>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Register as {derivedRole}
                                </span>
                                <span className="text-xs font-medium text-slate-400">
                                    Role automatically detected from email domain
                                </span>
                            </div>
                        )}

                        {/* DYNAMIC STUDENT FIELDS */}
                        {derivedRole === "student" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full animate-in fade-in zoom-in-95 duration-500 pt-6 border-t border-slate-100">
                                
                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 text-sm">Student Roll</label>
                                    <div className="relative">
                                        <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                                        <input name="studentId" placeholder="e.g. 220106" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 text-sm">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                                        <input name="phone" placeholder="+880" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 text-sm">Batch</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                                        <input name="batch" placeholder="e.g. 2024-2028" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 text-sm">Session</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                                        <input name="session" placeholder="e.g. 2022-2023" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 text-sm">Semester</label>
                                    <div className="relative">
                                        <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                                        <select name="semester" className="w-full h-12 !pl-11 !pr-4 bg-white border-2 border-slate-200 hover:border-indigo-400 rounded-lg text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm appearance-none" defaultValue="">
                                            <option value="" disabled>Select Semester</option>
                                            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => <option key={s} value={s.toString()}>Semester {s}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 text-sm">Blood Group</label>
                                    <div className="relative">
                                        <Droplet className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                                        <select name="bloodGroup" className="w-full h-12 !pl-11 !pr-4 bg-white border-2 border-slate-200 hover:border-indigo-400 rounded-lg text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm appearance-none" defaultValue="">
                                            <option value="" disabled>Select Blood Group</option>
                                            {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full md:col-span-2">
                                    <label className="font-semibold text-slate-700 text-sm">Address</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                                        <input name="address" placeholder="City, District" className={inputClassName} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* DYNAMIC TEACHER FIELDS */}
                        {derivedRole === "teacher" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full animate-in fade-in zoom-in-95 duration-500 pt-6 border-t border-slate-100">
                                
                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 text-sm">Dept ID</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                                        <input name="teacherId" placeholder="e.g. T-101" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 text-sm">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                                        <input name="phone" placeholder="+880" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 text-sm">Designation</label>
                                    <div className="relative">
                                        <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                                        <input name="designation" placeholder="e.g. Professor" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 text-sm">Specialization</label>
                                    <div className="relative">
                                        <Microscope className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                                        <input name="specialization" placeholder="e.g. AI & ML" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 text-sm">Joining Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                                        <input name="joiningDate" type="date" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 text-sm">Office Room</label>
                                    <div className="relative">
                                        <DoorOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                                        <input name="officeRoom" placeholder="e.g. Room 402" className={inputClassName} />
                                    </div>
                                </div>

                            </div>
                        )}

                        {/* DYNAMIC EMPLOYEE FIELDS */}
                        {derivedRole === "employee" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full animate-in fade-in zoom-in-95 duration-500 pt-6 border-t border-slate-100">
                                
                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 text-sm">Employee ID</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                                        <input name="employeeId" placeholder="e.g. E-204" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 text-sm">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                                        <input name="phone" placeholder="+880" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 text-sm">Department</label>
                                    <div className="relative">
                                        <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                                        <input name="department" placeholder="e.g. IT Support" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 text-sm">Designation</label>
                                    <div className="relative">
                                        <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                                        <input name="designation" placeholder="e.g. Lab Assistant" className={inputClassName} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5 w-full">
                                    <label className="font-semibold text-slate-700 text-sm">Joining Date</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                                        <input name="joiningDate" type="date" className={inputClassName} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PASSWORDS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full pt-6 border-t border-slate-100">
                            
                            <div className="flex flex-col gap-1.5 w-full">
                                <label className="font-semibold text-slate-700 text-sm">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                                    <input 
                                        required name="password" 
                                        type={isVisible ? "text" : "password"} 
                                        placeholder="Min 6 characters" 
                                        onChange={(e) => setPassword(e.target.value)}
                                        minLength={6}
                                        className={inputClassName.replace("!pr-4", "!pr-11")}
                                    />
                                    <button className="absolute right-4 top-1/2 -translate-y-1/2 focus:outline-none z-10" type="button" onClick={toggleVisibility}>
                                        {isVisible ? <EyeOff className="w-5 h-5 text-slate-400 hover:text-indigo-500 transition-colors" /> : <Eye className="w-5 h-5 text-slate-400 hover:text-indigo-500 transition-colors" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1.5 w-full">
                                <label className="font-semibold text-slate-700 text-sm">Confirm Password</label>
                                <div className="relative">
                                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10 pointer-events-none" />
                                    <input 
                                        required name="confirmPassword" 
                                        type={isConfirmVisible ? "text" : "password"} 
                                        placeholder="Repeat password" 
                                        className={inputClassName.replace("!pr-4", "!pr-11")}
                                    />
                                    <button className="absolute right-4 top-1/2 -translate-y-1/2 focus:outline-none z-10" type="button" onClick={toggleConfirmVisibility}>
                                        {isConfirmVisible ? <EyeOff className="w-5 h-5 text-slate-400 hover:text-indigo-500 transition-colors" /> : <Eye className="w-5 h-5 text-slate-400 hover:text-indigo-500 transition-colors" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full inline-flex items-center justify-center font-bold text-sm tracking-wide h-14 px-8 shadow-xl shadow-indigo-200/50 bg-indigo-600 hover:bg-indigo-700 rounded-2xl text-white transition-colors mt-2"
                            isLoading={isLoading}
                            endContent={!isLoading && <ArrowRight className="h-4 w-4 ml-1 opacity-90" />}
                        >
                            Create Account
                        </Button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
                        <p className="text-sm font-medium text-slate-500">
                            Already registered?{" "}
                            <Link href="/login" className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline transition-all">
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
