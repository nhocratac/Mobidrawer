import { Metadata } from "next"
import { integration } from "@/utils/metadata"
export const metadata: Metadata = {
    ...integration
}

export default function IntegrationLayout({ children }: {
    children: React.ReactNode
}) {
    return (
        <>
            {children}
        </>
    )
}
