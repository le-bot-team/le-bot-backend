import Elysia from 'elysia'

import {
  retrieveProfileInfoValidator,
  updateProfileInfoValidator,
} from 'src/profile/validation'

export const profileService = new Elysia({ name: 'profile/service' }).model({
  retrieveProfileInfo: retrieveProfileInfoValidator,
  updateProfileInfo: updateProfileInfoValidator,
})
