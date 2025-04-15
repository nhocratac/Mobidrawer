
import { events } from "@/utils/metadata"
import { Metadata } from "next"

export const metadata: Metadata = {
    ...events  
}


export default function EventsLayout({
    children,
}: { children: React.ReactNode }) {
    return (
        <>
            {children}
        </>
    )
}
