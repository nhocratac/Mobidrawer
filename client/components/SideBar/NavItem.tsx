import Link from "next/link";
import React from "react";

interface NavItemProps {
    Icon: React.ReactNode; // Định nghĩa Icon là một node React
    href: string;
    title: string;
    [key: string]: unknown;
}

export default function NavItem({ Icon, href, title, ...props }: NavItemProps) {
    return (
        <li {...props} className="hover:bg-subtle-hover pl-8 py-4 rounded-md">
            <Link href={href} className="flex items-center">
                {Icon} {/* Render trực tiếp node */}
                <span className="ml-2">{title}</span>
            </Link>
        </li>
    );
}
