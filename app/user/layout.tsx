import HeaderDefault from "@/components/header/HeaderDefault"

export default function layout({
    children,
}: { children: React.ReactNode }) {
    return (
        <div>
            <HeaderDefault />
            <section>
                {children}
            </section>
        </div>
    )
}
