import React from 'react'
import styles from  './Header.module.scss'
import {NavBar} from '../NavBar'
import env from '../../utils/environment'


const Header = ({...props}) => {
  return (
    <header className={styles['header']} {...props}>
      <NavBar className={styles['header__nav']}/>
      <div className={styles['header__title']}>{env.APP_NAME}</div>
    </header>
  )
}

export default Header
