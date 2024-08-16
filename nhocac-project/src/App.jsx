import { Routes, Route } from "react-router-dom"
import { PublicRoute,PrivateRoute } from './routeConfig/route'
import { DefaultLayout } from './Layout'
import { useEffect } from "react"
import userServices from "./services/userServices"
import store from "./redux/store"
import { Login } from "./pages"
import {LoginLayout} from "./Layout"

function App() {
  const user = store.getState().auth.user // Add an expression here
  // khi tắt app thì sẽ set offline cho user , online khi mở lại
  return (
    <>
      <Routes>
        {PublicRoute.map((route, index) => {
          const Layout = route.layout || DefaultLayout
          return (
            <Route
              key={index}
              path={route.path}
              element={<Layout>
                <route.component />
              </Layout>}
            />
          )
        })}
       { /* các route private sẽ phải login mới xem được*/}
        { PrivateRoute.map((route,index) => {
          const Component = (user) ? route.component : Login
          const Layout = user ?( route.layout || DefaultLayout) : LoginLayout
          return (
            <Route
              key={index}
              path={route.path}
              element={<Layout>
                <Component />
              </Layout>}
            />
          )
        })
        }
      </Routes>
    </>
  )
}

export default App
