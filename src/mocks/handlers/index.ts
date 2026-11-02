import { accountHandlers } from './account'
import { authHandlers } from './auth'
import { cartHandlers } from './cart'
import { catalogHandlers } from './catalog'
import { commerceHandlers } from './commerce'
import { controlHandlers } from './control'
import { realtimeHandlers } from '../socket'

export const handlers = [...controlHandlers, ...authHandlers, ...catalogHandlers, ...cartHandlers, ...commerceHandlers, ...accountHandlers, ...realtimeHandlers]
