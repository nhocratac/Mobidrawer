import NavItem from '@/components/SideBar/NavItem'
import React from 'react'
import { House ,Clock, AppWindow, ShoppingCart} from 'lucide-react';
import path from '@/utils/path';


export default function NavSide() {
    return (
        <nav>
            <ul className='space-y-4 text-left pl-4'>
                <NavItem Icon={<House/>} title='Home' href={path.user.dashboard}/>
                <NavItem Icon={<Clock/>} title='Rencent' href={path.user.recent}/>
                <NavItem Icon={<ShoppingCart/>} title='Store' href={path.user.store}/>
                <NavItem Icon={<AppWindow />} title='New Feed' href={path.user.post}/>
            </ul>
        </nav>
    )
}
