import React from 'react'
import { Link } from 'react-router-dom'
import routePath from '../../routeConfig/path'
import styles from './NavBar.module.scss'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import classNames from 'classnames/bind'
const cx = classNames.bind(styles)
const NavBar = ({ ...props }) => {
    return (
        <nav  {...props}>
            <ul className={styles['nav--list']}>
                <Link to={routePath.home}><li className={styles['nav--item']}>Home</li></Link>
                <Link to={routePath.about}><li className={styles['nav--item']}>About</li></Link>
                <Link to={routePath.contact}><li className={styles['nav--item']}>Contact</li></Link>
                <Link to={routePath.help}><li className={styles['nav--item']}>Help</li></Link>
                <li className={cx('nav--item', 'nav--item__more')}>
                    More <span><ExpandMoreIcon /></span>
                    <ul className={styles['dropdown']}>
                    <Link to={routePath.login}><li className={styles['dropdown-item']}>Login</li></Link>
                        <Link to={routePath.logout}><li className={styles['dropdown-item']}>Logout</li></Link>
                        <Link to={routePath.account}><li className={styles['dropdown-item']}>My Account</li></Link>
                    </ul>
                </li>
            </ul>
        </nav>
    )
}

export default NavBar
