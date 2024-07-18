import React from 'react'
import SideBar from '../SideBar/SideBar'
export default function Defautlayout({ children }) {
    return (
        <>
        <SideBar/>
        <main>
            {children}
        </main>
        </>
    )
}
