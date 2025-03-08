// layout.tsx
import { register } from "@/utils/metadata";
import { Metadata } from "next";
import React from "react";

interface LayoutProps {
    children: React.ReactNode;
}

export const metadata : Metadata = {
    title : register.title,
    description : register.description,
    keywords : register.keywords
}

export default function RegisterLayout({ children}: LayoutProps) {
    const step = 1;
    return (
        <main className="flex flex-grow justify-center items-center bg-gray-50">
            <div
                className={`w-full max-w-lg bg-white px-[48px] py-[48px] border rounded-xl shadow-md min-w-[524px] ${step === 1 ? "min-h-[600px]" : "min-h-[400px]"}`}
                style={{ border: "1px solid #444749" }}
            >
                {children}
            </div>
        </main>
    );
}
