import { useState, useEffect } from 'react'
import styles from './Profile.module.scss'
import classNames from 'classnames/bind'
import { Link } from 'react-router-dom'
import AddIcon from '@mui/icons-material/Add';
import routePath from '../../routeConfig/path'
import store from '../../redux/store'

const cx = classNames.bind(styles)
const Profile = () => {
  const user = store.getState().auth.user
  if (!user)
    return <div>loading...</div>
  return (
    <div className={cx('wrapper')}>
      <div className={cx('container')}>
        <div className={cx('own-content')}>
          <div className={cx('avatar-img')}>
            <img src={user.avatar || 'https://th.bing.com/th/id/OIP.PwEh4SGekpMaWT2d5GWw0wAAAA?rs=1&pid=ImgDetMain'} alt="avatar" >
            </img>
              <div className={cx('avatar-img--overlay')}>
                <AddIcon />
                <input type="file" accept='image/*'/>
              </div>
          </div>
          <div className={cx('own-info')}>
            <div className={cx('own-info--top')}>
              <div className={cx('own-info--top__name')}>
                <h3>{user.name}</h3>
              </div>
              <div className={cx('own-info--top__buttons')}>
                <button>Chỉnh sửa</button>
                <Link to={routePath.login}><button>Đăng xuất</button></Link>
              </div>
            </div>
            <div className={cx('own-info--bottom')}>
              <div className={cx('own-info--bottom__post')}>
                <b>{user.post?.length || '0'}</b>
                <span> Posts</span>
              </div>
              <div className={cx('own-info--bottom__follower')}>
                <b>{user.follower?.lenght || '0'}</b>
                <span> Followers</span>
              </div>
              <div className={cx('own-info--bottom__following')}>
                <b>{user.following?.lenght || '0'}</b>
                <span> Following</span>
              </div>
            </div>
          </div>
        </div>
        <div className={cx('own-story')}>
          this is story
        </div>
        <div className={cx('own-photo')}>
        </div>
      </div>
    </div>

  )
}

export default Profile
