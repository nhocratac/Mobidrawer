import React from 'react'
import classNames from 'classnames/bind'

import styles from './Fragment.module.scss'

const cx = classNames.bind(styles)
const Fragment = () => {
  return (
    <div>
        <h1 className={cx('title')}>Fragment</h1>
        <p className={cx('content')}>A common pattern in React is for a component to return multiple elements. Fragments let you group a list of children without adding extra nodes to the DOM.</p>
        <p className={cx('content')}>A “key” is a special string attribute you need to include when creating lists of elements. Keys help React identify which items have changed, are added, or are removed.</p>
        <a className={cx('link')} href="https://reactjs.org/docs/fragments.html">Learn more about Fragment</a>
        <div><a href='/'>back to home</a></div>
    </div>
  )
}

export default Fragment
