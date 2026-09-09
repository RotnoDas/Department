"use client";

import { Button, Input, Form } from '@heroui/react';
import Link from 'next/link';
import React, { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import toast from 'react-hot-toast';

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
            
            // Redirect based on role
            // We can fetch user session here or just redirect to a generic dashboard
            // For now, let's redirect to a handler or home
            window.location.href = "/";
        }
    };

    return (
        <div className="flex min-h-screen bg-slate-50 items-center justify-center p-6">
            <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl ring-1 ring-slate-200">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-black tracking-tight text-slate-800">Welcome Back</h1>
                    <p className="text-slate-500 mt-2 text-sm">Log in to your department portal.</p>
                </div>

                <Form validationBehavior="native" onSubmit={onSubmit} className="space-y-6">
                    <div className="w-full">
                        <label className="text-sm font-bold text-slate-700 mb-1 block">Email Address</label>
                        <Input 
                            isRequired 
                            name="email" 
                            type="email"
                            placeholder="e.g. john@student.cse.edu" 
                            variant="bordered"
                            className="w-full"
                        />
                    </div>

                    <div className="w-full">
                        <label className="text-sm font-bold text-slate-700 mb-1 block">Password</label>
                        <Input 
                            isRequired 
                            name="password" 
                            type="password"
                            placeholder="Enter your password" 
                            variant="bordered"
                            className="w-full"
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-indigo-600 text-white font-bold h-12 mt-4 transition-all hover:bg-indigo-700 hover:shadow-lg"
                        radius="md"
                        isLoading={isLoading}
                    >
                        Log In
                    </Button>
                </Form>

                <p className="text-center text-sm text-slate-500 mt-8">
                    Don't have an account?{" "}
                    <Link href="/register" className="text-indigo-600 font-bold hover:underline transition-colors ml-1">
                        Sign Up
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
