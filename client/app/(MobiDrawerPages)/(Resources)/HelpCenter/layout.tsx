import { helpCenter } from "@/utils/metadata"
import { Metadata } from "next"

export const metadata: Metadata = {
    ...helpCenter
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
        </>
    )
}