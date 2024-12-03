
export default function Layout({
    children,
}: {
    children: React.ReactNode,
}) {
    return (
        <div className="bg-white  h-full">
            {children}
        </div>
    )
}