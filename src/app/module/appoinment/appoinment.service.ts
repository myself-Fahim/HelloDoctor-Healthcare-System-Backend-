
import config from "../../config"
import { getBkashIdToken } from "../../lib/bkash"

const bookAppoinment = async () => {


    const bookingIdToken = await getBkashIdToken()

    if(!bookingIdToken){
        throw new Error('Invalid bkash id token')
    }

    const createBookingpaymentLink = await fetch(`${config.bkash_base_url}/v2/tokenized-checkout/payment/create`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: bookingIdToken,
            "X-App-Key": config.bkash_app_key!
        },
        body: JSON.stringify({
            payerReference: "TEST001ABC",
            callbackURL: `${config.bkash_callback_url}/appoinment/book-appoinment/payment/callback`,
            amount: "1000",
            currency: "BDT",
            intent: "sale",
            merchantInvoiceNumber: "test001",
            subMerchantName: "Test",
            merchantAssociationInfo: "MI05MID54RF09123456789"
        })
    })

    const result = await createBookingpaymentLink.json()
    return result

}

const bookAppoinmentCallback = async(query : Record<string,any>)=>{

    const {paymentID,status} = query


    const BkashIdToken = await getBkashIdToken()
    if(!BkashIdToken){
        throw new Error("Id token not found")
    }

      const executeBkashPayment = await fetch(`${config.bkash_base_url}/v2/tokenized-checkout/payment/execute`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: BkashIdToken,
            "X-App-Key": config.bkash_app_key!
        },
        body: JSON.stringify({
            paymentId:paymentID
        })
    })


    const executePaymentResult = await executeBkashPayment.json()

    if(status === 'success'){
        return {
            executePaymentResult,
            redirectUrl : `${config.client_url}/dashboard/my-payment?status=success`

        }
    }

    if(status === 'failure'){
        return {
            executePaymentResult,
            redirectUrl : `${config.client_url}/dashboard/my-payment?status=failure`

        }
    }

    if(status === 'cancel'){
        return {
            executePaymentResult,
            redirectUrl : `${config.client_url}/dashboard/my-appoinment?status=cancel`

        }
    }


       return {
            executePaymentResult,
            redirectUrl : `${config.client_url}/dashboard/my-appoinment`

        }

}

export const appoinmentService = {
    bookAppoinment,
    bookAppoinmentCallback
}