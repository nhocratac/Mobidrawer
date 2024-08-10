import { Routes, Route } from "react-router-dom"
import { PublicRoute } from './routeConfig/route'
import { DefaultLayout } from './Layout'
import { useEffect } from "react"
import userServices from "./services/userServices"

function App() {
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
      </Routes>
    </>
  )
}

export default App
