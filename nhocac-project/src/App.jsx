import { Routes,Route } from "react-router-dom"
import  {PublicRoute} from './routeConfig/route'
import  {DefaultLayout} from './Layout'
import { Fragment } from "./pages"

function App() {
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
        <Route path="*" element={<Fragment/>} />
      </Routes>
    </>
  )
}

export default App
