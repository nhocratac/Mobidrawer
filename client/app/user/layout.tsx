
import WebSocketProvider from "@/components/WebSocketProvider"

export default function UserLayout({
    children,
}: { children: React.ReactNode }) {
    return (
        <>
            <WebSocketProvider />
            {children}
        </>
    )
}
