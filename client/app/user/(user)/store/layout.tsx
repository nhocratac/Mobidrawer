import React from 'react'

function Layout({
    children,
    }: {
    children: React.ReactNode
}) {
  return (
    <div className='p-4 md:p-6 lg:p-10 flex flex-col' >
      {children}
    </div>
  )
}

export default Layout