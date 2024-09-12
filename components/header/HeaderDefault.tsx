import NavBar from '@/components/navbar/NavBar'
import React from 'react'

interface HeaderDefaultProps {
  role?: string
  [key: string]: any
}

export default function HeaderDefault({
  role ,
  ...props
}: HeaderDefaultProps) {
  return (
    <header className='md:h-[56px] h-[40px] bg-black text-[white] p-4 flex items-center' {...props}>
      <NavBar role = {role}  />
    </header>
  )
}
