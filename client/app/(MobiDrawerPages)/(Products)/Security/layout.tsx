import { security } from "@/utils/metadata"
import { Metadata } from "next"

export const metadata: Metadata = {
    ...security
}


export default function SecurityLayout({ children }: {
    children: React.ReactNode
}) {
    return (
        <>
        {children}
        </>
    )
}
