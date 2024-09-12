import HeaderDefault from "@/components/header/HeaderDefault"

const role: string  ='user'

export default function layout({
    children,
}: { children: React.ReactNode }) {
    return (
        <div>
            <HeaderDefault role = {role} />
            <section>
                {children}
            </section>
        </div>
    )
}
