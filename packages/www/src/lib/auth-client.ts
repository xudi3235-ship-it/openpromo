import { createAuthClient } from "better-auth/react"
import { Resource } from "sst"

export const authClient = createAuthClient({
    /** The base URL of the server (must run in SST env) */
    baseURL: Resource.Urls.api,
})