import HeaderDefault from "@/components/header/HeaderDefault"
import SideBar from "@/components/SideBar/SideBar"

export default function layout({
    children,
}: { children: React.ReactNode }) {
    return (
        <div className="flex w-full h-screen">
            <aside className="w-[215px] hidden lg:block">
                <SideBar />
            </aside>
            <div className="flex-1 flex flex-col">
                <HeaderDefault />
                <main className="lg:h-[64px] h-[54px] flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}
