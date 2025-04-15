
import { contact } from "@/utils/metadata"
import { Metadata } from "next"

export const metadata: Metadata = {
    ...contact
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
        </>
    )
}
