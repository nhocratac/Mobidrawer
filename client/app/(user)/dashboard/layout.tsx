
export default function layout({
    children,
}: {
    children: React.ReactNode,
}) {
    return (
        <div className="bg-slate-300">
            {children}
        </div>
    )
}