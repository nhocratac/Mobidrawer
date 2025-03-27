export default function Layout({children}: {children: React.ReactNode}) {
  return (
    <div className='p-3 sm:p-6 md:p-10 h-full w-full flex flex-col border border-gray-300 overflow-hidden' >
      {children}
    </div>
  )
}
