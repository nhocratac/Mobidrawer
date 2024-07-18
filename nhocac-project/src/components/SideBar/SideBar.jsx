import React from 'react'
import { Link } from 'react-router-dom'
import routePath from '../../routeConfig/path'
export default function SideBar() {
    return (
        <>
            <nav>
                <ul>
                    <li>
                        <Link to={routePath.home}>Home</Link>
                    </li>
                    <li>
                        <Link to={routePath.login}>Login</Link>
                    </li>
                    <li>
                        <Link to={routePath.register}>Register</Link>
                    </li>
                </ul>
            </nav>
        </>
    )
}
