export default function Layout({
    children,
}: {
    children: React.ReactNode,
}) {
    return (
        <div className="h-full flex flex-col p-2 sm:p-3 md:p-4">
            {children}
        </div>
    )
}