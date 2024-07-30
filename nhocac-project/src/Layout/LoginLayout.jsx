import React from 'react'
import { Header } from '../components/Header'
import classNames from 'classnames/bind'
import styles from './LoginLayout.module.scss'
const cx = classNames.bind(styles)

export default function LoginLayout({children}) {
  return (
    <div className={cx('wrapper')}>
      <Header/>
      <div className={cx('container')}>
        <div className={cx('image')}></div>
        <div className={cx('content')}>{children}</div>  
      </div>
    </div>
  )
}
