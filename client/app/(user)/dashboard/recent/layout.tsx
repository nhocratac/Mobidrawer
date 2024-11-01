
export default function layout({children}: {children: React.ReactNode}) {
  return (
    <div className=' p-10 h-full flex flex-col'>
      {children}
    </div>
  )
}
