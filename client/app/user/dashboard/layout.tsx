import { dashboard } from "@/utils/metadata";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: dashboard.title,
    description: dashboard.description,
    keywords: dashboard.keywords,
};



export default function Layout({
    children,
}: {
    children: React.ReactNode,
}) {
    return (
        <div className="bg-white  h-full">
            {children}
        </div>
    )
}