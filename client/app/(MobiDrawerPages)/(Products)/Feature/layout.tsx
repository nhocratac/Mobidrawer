import { feature } from "@/utils/metadata"
import { Metadata } from "next"

export const metadata: Metadata = {
    ...feature
}

export default function FeatureLayout({ children }: {
    children: React.ReactNode
}) {
    return (
        <>
            {children}
        </>
    )
}
