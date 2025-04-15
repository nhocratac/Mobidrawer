
import { enterprise } from "@/utils/metadata"
import { Metadata } from "next"

export const metadata: Metadata = {
    ...enterprise
}


export default function EnterpriseLayout({
    children,
}: { children: React.ReactNode }) {
    return (
        <>
            {children}
        </>
    )
}