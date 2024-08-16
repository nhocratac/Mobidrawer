import { combineReducers } from 'redux'
import authReducer from "./authSlice"

export default combineReducers({
    auth: authReducer,
})