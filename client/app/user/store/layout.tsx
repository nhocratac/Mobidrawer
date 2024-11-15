import React from 'react'

function Layout({
    children,
    }: {
    children: React.ReactNode
}) {
  return (
    <div className=' p-10  flex  flex-col border border-gray-300 ' >
      {children}
    </div>
  )
}

export default Layout