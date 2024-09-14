'use client'
import Link from "next/link"
interface NavBarProps {
    role?: string
    [key: string]: any
}

export default function NavBar({ role  = 'user', ...props}: NavBarProps) {
    return (
        <nav className=' w-[min(300px,30%)]' {...props}>
            <ul className='flex justify-around text-[1.8rem]'>
                <Link href={`${role}`}>
                    <li className='hover:bg-gray-500'>Home</li>
                </Link>
                <Link href={`${role}/dashbroad`}>
                    <li className='hover:bg-gray-500'>Dashbroad</li>
                </Link>
                <Link href={`${role}/message`}>
                    <li className='hover:bg-gray-500'>Message</li>
                </Link>
            </ul>
        </nav>
    )
}
