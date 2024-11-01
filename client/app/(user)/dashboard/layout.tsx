
export default function layout({
    children,
}: {
    children: React.ReactNode,
}) {
    return (
        <div className="bg-white border h-full">
            {children}
        </div>
    )
}