import  routePath from './path'
import {Home,Register,Login,Fragment,Profile} from '../pages'
import { LoginLayout } from '../Layout'
const PublicRoute = [
    {path: routePath.home , component: Home},
    {path: routePath.login , component: Login,layout: LoginLayout},
    {path: routePath.register , component: Register, layout: LoginLayout},
    {path : routePath.profile , component: Profile},
    {path: routePath.fragment , component: Fragment},
]
export {PublicRoute} 