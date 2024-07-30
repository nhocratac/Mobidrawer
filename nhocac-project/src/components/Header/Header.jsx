import React from 'react'
import styles from  './Header.module.scss'
import {NavBar} from '../NavBar'


const Header = ({...props}) => {
  return (
    <header className={styles['header']} {...props}>
      <NavBar className={styles['header__nav']}/>
      <div className={styles['header__title']}>Thang DEV WEB</div>
    </header>
  )
}

export default Header
