import HeaderDefault from "@/components/header/HeaderDefault"
import SideBar from "@/components/SideBar/SideBar"
import WebSocketProvider from "@/components/WebSocketProvider"

export default function UserLayout({
    children,
}: { children: React.ReactNode }) {
    return (
        <div className="flex w-full h-screen">
            <WebSocketProvider />
            <aside className="w-[215px] hidden lg:block h-full">
                <SideBar />
            </aside>
            <div className="flex-1 flex flex-col gap-8 ">
                <HeaderDefault />
                <main className="flex-1 overflow-auto ">
                    {children}
                </main>
            </div>
        </div>
    )
}
