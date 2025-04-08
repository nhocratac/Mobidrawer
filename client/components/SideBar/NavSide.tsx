import NavItem from '@/components/SideBar/NavItem'
import React from 'react'
import { House ,Clock, AppWindow, ShoppingCart, NotebookText} from 'lucide-react';
import path from '@/utils/path';


export default function NavSide() {
    return (
        <nav>
            <ul className='space-y-4 text-left pl-4'>
                <NavItem Icon={<House/>} title='Trang chủ' href={path.user.dashboard}/>
                <NavItem Icon={<Clock/>} title='Gần đây' href={path.user.recent}/>
                <NavItem Icon={<ShoppingCart/>} title='Cửa hàng' href={path.user.store}/>
                <NavItem Icon={<AppWindow />} title='Bảng tin' href={path.user.post}/>
                <NavItem Icon={<NotebookText />} title='Blog của tôi' href={path.user.draftBlog}/>
            </ul>
        </nav>
    )
}
