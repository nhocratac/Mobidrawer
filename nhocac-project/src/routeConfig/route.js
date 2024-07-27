import  routePath from './path'
import {Home,Register,Login} from '../pages'
import { LoginLayout } from '../components/Layout';
const PublicRoute = [
    {path: routePath.home , component: Home},
    {path: routePath.login , component: Login,layout: LoginLayout},
    {path: routePath.register , component: Register},
    //{path: routePath.fragment , component: Fragment},
]
export {PublicRoute} ;