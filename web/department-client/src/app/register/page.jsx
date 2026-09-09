"use client";

import { Button, Input, Form } from '@heroui/react';
import Link from 'next/link';
import React, { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import toast from 'react-hot-toast';

const RegisterPage = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [password, setPassword] = useState("");

    const onSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData);

        const { data: signUpData, error: signUpError } = await authClient.signUp.email({
            email: data.email,
            password: data.password,
            name: data.name,
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
        <div className="flex min-h-screen bg-slate-50 items-center justify-center p-6">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl ring-1 ring-slate-200">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-black tracking-tight text-slate-800">Create an account</h1>
                    <p className="text-slate-500 mt-2 text-sm">Sign up for your department portal access.</p>
                </div>

                <Form validationBehavior="native" onSubmit={onSubmit} className="space-y-6">
                    <div className="w-full">
                        <label className="text-sm font-bold text-slate-700 mb-1 block">Full Name</label>
                        <Input 
                            isRequired 
                            name="name" 
                            placeholder="e.g. John Doe" 
                            variant="bordered"
                            className="w-full"
                        />
                    </div>

                    <div className="w-full">
                        <label className="text-sm font-bold text-slate-700 mb-1 block">Email Address</label>
                        <Input 
                            isRequired 
                            name="email" 
                            type="email"
                            placeholder="e.g. john@student.cse.edu" 
                            variant="bordered"
                            className="w-full"
                            validate={(value) => {
                                if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value)) {
                                    return "Please enter a valid email address";
                                }
                                return null;
                            }}
                        />
                        <p className="text-xs text-slate-400 mt-2">Your role is determined automatically by your email domain.</p>
                    </div>

                    <div className="w-full">
                        <label className="text-sm font-bold text-slate-700 mb-1 block">Password</label>
                        <Input 
                            isRequired 
                            name="password" 
                            type="password"
                            placeholder="Create a strong password" 
                            variant="bordered"
                            className="w-full"
                            onChange={(e) => setPassword(e.target.value)}
                            validate={(value) => {
                                if (value.length < 6) {
                                    return "Password must be at least 6 characters";
                                }
                                return null;
                            }}
                        />
                    </div>

                    <div className="w-full">
                        <label className="text-sm font-bold text-slate-700 mb-1 block">Confirm Password</label>
                        <Input 
                            isRequired 
                            name="confirmPassword" 
                            type="password"
                            placeholder="Re-enter your password" 
                            variant="bordered"
                            className="w-full"
                            validate={(value) => {
                                if (value !== password) {
                                    return "The passwords do not match";
                                }
                                return null;
                            }}
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-indigo-600 text-white font-bold h-12 mt-4 transition-all hover:bg-indigo-700 hover:shadow-lg"
                        radius="md"
                        isLoading={isLoading}
                    >
                        Create Account
                    </Button>
                </Form>

                <p className="text-center text-sm text-slate-500 mt-8">
                    Already have an account?{" "}
                    <Link href="/login" className="text-indigo-600 font-bold hover:underline transition-colors ml-1">
                        Log In
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterPage;
