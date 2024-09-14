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
            <div className="w-6 hidden lg:block"></div>
            <div className="bg-red-400 flex-1 ">
                <HeaderDefault />
                <main className="">
                    {children}
                </main>
            </div>
        </div>
    )
}
