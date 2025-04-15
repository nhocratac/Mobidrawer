import { useCase } from "@/utils/metadata"
import { Metadata } from "next"

export const metadata: Metadata = {
    ...useCase
}

export default function UseCaseLayout({
    children,
}: { children: React.ReactNode }) {
    return (
        <>
            {children}
        </>
    )
}
