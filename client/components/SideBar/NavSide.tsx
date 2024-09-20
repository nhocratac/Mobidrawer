import NavItem from '@/components/SideBar/NavItem'
import React from 'react'
import { House ,Clock,Star, UsersRound} from 'lucide-react';
import path from '@/utils/path';


export default function NavSide() {
    return (
        <nav>
            <ul className='space-y-4 text-left pl-4'>
                <NavItem Icon={<House/>} title='Home' href={path.dashboard.home}/>
                <NavItem Icon={<Clock/>} title='Rencent' href={path.dashboard.recent}/>
                <NavItem Icon={<Star/>} title='Starred' href={path.dashboard.starred}/>
                <NavItem Icon={<UsersRound/>} title='Friend' href={path.dashboard.friend}/>
            </ul>
        </nav>
    )
}
