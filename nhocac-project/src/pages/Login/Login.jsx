import React from 'react'
import classNames from 'classnames/bind'
import EmailIcon from '@mui/icons-material/Email'
import LockIcon from '@mui/icons-material/Lock'
import GoogleIcon from '@mui/icons-material/Google';
import { useNavigate, } from 'react-router-dom'

import authentic from '~/services/authentic'
import styles from './Login.module.scss'
import { manageToken } from '../../hook'

const cx = classNames.bind(styles)
const Login = () => {
  const navigate = useNavigate()
  const handleSubmit = (e) => {
    e.preventDefault()
    document.querySelector('#form-message-error').innerHTML = ''
    const data = {
      email: e.target.email.value,
      password: e.target.password.value
    }
    authentic.login(data)
      .then(res => {
        alert('thành công')
        // save token
        manageToken.saveToken(res.accessToken)
        // chuyển hướng về home
        // neu khong phai trang login thi 0 dung navigate
        if(window.location.pathname !== '/login') {
            window.location.reload()
        }
        else 
          navigate('/')
      })
      .catch(err => {
        if(err.status === 404) {
          document.querySelector('#form-message-error').innerHTML = 'User not found'
        }
        if(err.status === 401) {
          alert('Invalid email or password')
          document.querySelector('#form-message-error').innerHTML = 'Invalid email or password'
        }
      })
  }
  return (
    <div className={cx('wrapper')}>
      <h1 className={cx('login-title')}>Login</h1>
      <p className={cx('login-sub-title')}>Login to use more service </p>
      <form className={cx('form-container')} onSubmit={handleSubmit}>
        <div className={cx('form-controll')}>
          {/* <label htmlFor='email' className={cx('form-label')}>Email</label> */}
          <input type='email' placeholder='Email' name='email' className={cx('form-input')} />
          <EmailIcon className={cx('form-icon')}></EmailIcon>
        </div>
        <div className={cx('form-controll')}>
          {/* <label htmlFor='password' className={cx('form-label')}>Password</label> */}
          <input placeholder='Password' type='password' name='password' className={cx('form-input')} />
          <LockIcon className={cx('form-icon')}></LockIcon>
        </div>
        <div style={{color:'red', fontSize:'1.4rem'}} id='form-message-error'></div>
        <div>
          <button type='submit' className={cx('form-button')}>Login</button>
        </div>
        <div className={cx('login-footer')}>
          <p>Don't have an account? <a href='/register'>Register</a> | 
            <a href='/forgot-password'> Forgot Password</a></p>
        </div>
        <div className={cx('login-google')}>
          <GoogleIcon className={cx('login-google__icon')}></GoogleIcon>
          <div className={cx('login-google__button')}>Login with Google</div>
        </div>
      </form>
    </div>
  )
}

export default Login
