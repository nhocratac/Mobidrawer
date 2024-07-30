import React from 'react'
import SideBar from '../components/SideBar/SideBar'
import { Header } from '../components/Header'
export default function DefaultLayout({ children }) {
    return (
        <>
        <Header />
        <main>
            {children}
        </main>
        </>
    )
}
