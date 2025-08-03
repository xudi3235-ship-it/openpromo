import { createAuthClient } from "better-auth/react"
import { urls } from "../../../infra/api"

export const authClient = createAuthClient({
    /** The base URL of the server (optional if you're using the same domain) */
    baseURL: urls.properties.api,
})