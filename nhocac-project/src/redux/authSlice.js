import createSlice from '@reduxjs/toolkit'

const authSilce = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        isAuth: false,
        loading: false,
        error: null
    },
    reducers: {
        login: (state, action) => {
            state.user = action.payload
            state.isAuth = true
        },
        loginFail: (state, action) => {
            state.error = action.payload
            state.user = null
            state.isAuth = false
        },
        logout: (state) => {
            state.user = {}
            state.isAuth = false
        },
        setUser: (state, action) => {
            state.user = action.payload
        },
        setLoading: (state, action) => {
            state.loading = action.payload
        },
        setError: (state, action) => {
            state.error = action.payload
        }
    }
})

export const { login, loginFail, logout, setUser, setLoading, setError } = authSilce.actions
export default authSilce.reducer