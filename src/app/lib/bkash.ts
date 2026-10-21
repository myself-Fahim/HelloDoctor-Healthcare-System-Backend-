import config from "../config"
import { redisCLient } from "./redis"

export const getBkashIdToken = async () => {

    const idTokenKeyForRedis = `Bkash:idToken`
    const refreshTokenKeyForRedis = `Bkash:refreshToken`

    let BkashIdToken = await redisCLient.get(idTokenKeyForRedis)
    let BkashRefreshToken = await redisCLient.get(refreshTokenKeyForRedis)
    const BkashIdTokenTTL = await redisCLient.ttl(idTokenKeyForRedis)
    const BkashRefreshTokenTTL = await redisCLient.ttl(refreshTokenKeyForRedis)


    if (BkashIdTokenTTL <= 600 && BkashRefreshTokenTTL > 600) {

        const response = await fetch(`${config.bkash_base_url}/v2/tokenized-checkout/auth/refresh-token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                username: config.bkash_username!,
                password: config.bkash_password!,

            },
            body: JSON.stringify({
                app_key: config.bkash_app_key,
                app_secret: config.bkash_app_secret,
                refresh_token: BkashRefreshToken
            })
        })

        const result = await response.json()
        BkashIdToken = result.id_token as string
        await redisCLient.set(idTokenKeyForRedis, BkashIdToken, {
            expiration: {
                type: "EX",
                value: 60 * 60
            }

        })
      
        return BkashIdToken

    }


    if (BkashIdTokenTTL > 600 && BkashRefreshTokenTTL > 600) {
        
        return BkashIdToken
    }


    const response = await fetch(`${config.bkash_base_url}/v2/tokenized-checkout/auth/grant-token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            username: config.bkash_username!,
            password: config.bkash_password!
        },
        body: JSON.stringify({
            app_key: config.bkash_app_key,
            app_secret: config.bkash_app_secret
        })
    })

    const result = await response.json()

    await redisCLient.set(idTokenKeyForRedis, result.id_token, {
        expiration: {
            type: "EX",
            value: 60 * 60
        }
    })
    await redisCLient.set(refreshTokenKeyForRedis, result.refresh_token, {
        expiration: {
            type: "EX",
            value: 60 * 60 * 24 * 28
        }
    })

    return result
}