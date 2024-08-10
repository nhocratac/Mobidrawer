import React from 'react'
import classNames from 'classnames/bind'
import { Header } from '../../components/Header'
import styles from './DefaultLayout.module.scss'
const cx = classNames.bind(styles)
export default function DefaultLayout({ children }) {
    return (
        <div className={cx('wrapper')}>
        <Header />
        <main className={cx('container')}>
            {children}
        </main>
        <footer className={cx('footer')}>© 2021. All rights reserved.</footer>
        </div>
    )
}
