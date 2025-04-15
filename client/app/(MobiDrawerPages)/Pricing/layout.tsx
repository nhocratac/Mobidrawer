import { pricing }  from "@/utils/metadata"
import { Metadata } from "next"

export const metadata: Metadata = {
    ...pricing
} 

export default function PricingLayout({
    children,
}: { children: React.ReactNode }) {
    return (
        <>
            {children}
        </>
    )
}