
export default function Layout({children}: {children: React.ReactNode}) {
  return (
    <div className=' p-10 h-full flex  flex-col border border-gray-300' >
      {children}
    </div>
  )
}
