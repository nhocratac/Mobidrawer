import {createSlice} from '@reduxjs/toolkit'

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        isAuthenticated: false,
        token: null,
        error: null,
        user: null,
    },
    reducers: {
        login: (state, action) => {
            state.isAuthenticated = true
            state.user = action.payload
        },
        logout: (state) => {
            state.isAuthenticated = false
            state.user = null
        },
        setError: (state, action) => {
            state.error = action.payload
        },
        clearError: (state) => {
            state.error = null
        },
        setToken: (state, action) => {
            state.token = action.payload
        }
        
    }
})

const authReducer = authSlice.reducer 

export const {login, logout, setError, clearError,setToken} = authSlice.actions
export default authReducer