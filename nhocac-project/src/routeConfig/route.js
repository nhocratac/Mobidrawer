import  routePath from './path'
import {Home,Register,Login} from '../pages'
const PublicRoute = [
    {path: routePath.home , component: Home},
    {path: routePath.login , component: Login},
    {path: routePath.register , component: Register},
    //{path: routePath.fragment , component: Fragment},
]
export {PublicRoute} ;