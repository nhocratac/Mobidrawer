
export default function layout({
    children,
}: {
    children: React.ReactNode,
}) {
    return (
        <div className="bg-white border">
            {children}
        </div>
    )
}