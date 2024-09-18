

interface layoutProps {
    childrent: React.ReactNode;
    [key: string]: any;
}


export default function layout({childrent, ...props}:layoutProps) {
  return (
    <div>
        <header className="h-[150px] bg-slate-100">
            <div className="bg-primary">
                banner
            </div>
        </header>
        <div>
            content
        </div>
    </div>
  )
}
