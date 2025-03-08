import React from 'react'

function Layout({
    children,
    }: {
    children: React.ReactNode
}) {
  return (
    <div className=' p-10  flex  flex-col ' >
      {children}
    </div>
  )
}

export default Layout