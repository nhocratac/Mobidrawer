import { team } from "@/utils/metadata"
import { Metadata } from "next"

export const metadata: Metadata = {
    ...team
}

export default function TeamLayout({
    children,
}: { children: React.ReactNode }) {
    return (
        <>
            {children}
        </>
    )
}
