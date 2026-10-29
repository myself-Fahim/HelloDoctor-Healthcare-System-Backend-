
import { AppoinmentStatus, PaymentStatus, Role } from "../../../generated/prisma/enums"
import config from "../../config"
import { getBkashIdToken } from "../../lib/bkash"
import { prisma } from "../../lib/prisma"

const bookAppoinment = async (payload: any, user: { userId: string, email: string, name: string, role: Role }) => {


    const bookingIdToken = await getBkashIdToken()
    const transactionResult = await prisma.$transaction(async (tx) => {

        const createAppoinment = await tx.appoinment.create({
            data: {
                status: AppoinmentStatus.PENDING
            }
        })


        if (!bookingIdToken) {
            throw new Error('Invalid bkash id token')
        }

        const createAppoinmentPaymentLink = await fetch(`${config.bkash_base_url}/v2/tokenized-checkout/payment/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: bookingIdToken,
                "X-App-Key": config.bkash_app_key!
            },
            body: JSON.stringify({
                payerReference: user.email,
                callbackURL: `${config.bkash_callback_url}/appoinment/book-appoinment/payment/callback`,
                amount: "1200",
                currency: "BDT",
                intent: "sale",
                merchantInvoiceNumber: createAppoinment.id,
                subMerchantName: "Test",
                merchantAssociationInfo: "MI05MID54RF09123456789"
            })
        })

        const bookingPaymentCreateResult = await createAppoinmentPaymentLink.json()


        await tx.payment.create({
            data: {
                appoinmentId: createAppoinment.id,
                bkashPaymentId: bookingPaymentCreateResult.paymentId,
                amount: "1200",
                merchantInvoiceNumber: createAppoinment.id,
                payerReference: user.email,
                gatewayResponse: bookingPaymentCreateResult
            }
        })

        return bookingPaymentCreateResult


    })

    return transactionResult.bkashURL
}

const payPendingPayment = async (payload: any,user:{ userId: string, email: string, name: string, role: Role }) => {

    const { appoinmentId } = payload

    const pendingAppoinment = await prisma.appoinment.findUnique({
        where: {
            id: appoinmentId
        }
    })

    if (!pendingAppoinment) {
        throw new Error("Appoinment doesn't exist ")
    }

    if (pendingAppoinment.status !== AppoinmentStatus.PENDING) {
        throw new Error("Appoinment already proceed")
    }

    const bkashIdToken = await getBkashIdToken()

    const createAppoinmentPaymentLink = await fetch(`${config.bkash_base_url}/v2/tokenized-checkout/payment/create`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: bkashIdToken,
                "X-App-Key": config.bkash_app_key!
            },
            body: JSON.stringify({
                payerReference: user.email,
                callbackURL: `${config.bkash_callback_url}/appoinment/book-appoinment/payment/callback`,
                amount: "1200",
                currency: "BDT",
                intent: "sale",
                merchantInvoiceNumber: pendingAppoinment.id,
                subMerchantName: "Test",
                merchantAssociationInfo: "MI05MID54RF09123456789"
            })
        })

        const createPaymentResult = await createAppoinmentPaymentLink.json()
        await prisma.payment.update({
            where:{
                appoinmentId
            },
            data:{
                bkashPaymentId:createPaymentResult.paymentId
            }
        })

    
        return createPaymentResult.bkashURL
}

const bookAppoinmentCallback = async (query: Record<string, any>) => {
    const { paymentID, status } = query

    if (!paymentID) {
        throw new Error('Payment ID not found')
    }

    if (!status) {
        throw new Error("Status not found")
    }

    const BkashIdToken = await getBkashIdToken()
    if (!BkashIdToken) {
        throw new Error("Id token not found")
    }

    // Execute the external payment before opening a database transaction.
    // Network calls inside an interactive Prisma transaction can exhaust the
    // connection pool and cause P2028.
    const executeBkashPayment = await fetch(`${config.bkash_base_url}/v2/tokenized-checkout/payment/execute`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: BkashIdToken,
            "X-App-Key": config.bkash_app_key!
        },
        body: JSON.stringify({
            paymentId: paymentID
        })
    })

    const executePaymentResult = await executeBkashPayment.json()


    if (status === 'success') {


        const transactionResult = await prisma.$transaction(async (tx) => {

            await tx.appoinment.update({
                where: {
                    id: executePaymentResult.merchantInvoiceNumber
                },
                data: {
                    status: AppoinmentStatus.CONFIRM
                }
            })

            await tx.payment.update({
                where: {
                    appoinmentId: executePaymentResult.merchantInvoiceNumber
                },
                data: {
                    bkashPaymentId: executePaymentResult.paymentId,
                    status: PaymentStatus.PAID,
                    bkashTrxId: executePaymentResult.trxId,
                    amount: "1200",
                    paidAt: executePaymentResult.paymentExecuteTime
                }
            })

            return {
                redirectUrl: `${config.client_url}/dashboard/my-payment?status=success`
            }


        },
            {
                maxWait: 10000, // time to wait to get a connection (default 2000)
                timeout: 15000, // max time the transaction may run (default 5000)
            }

        )

        return transactionResult

    }


    else if (status === 'failure') {
        await prisma.payment.update({
            where: {
                bkashPaymentId: paymentID
            },
            data: {
                bkashPaymentId: executePaymentResult.paymentId,
                status: PaymentStatus.FAILED,
            }
        })

        return {
            redirectUrl: `${config.client_url}/dashboard/my-payment?status=failure`
        }
    }

    else if (status === 'cancel') {

        await prisma.payment.update({
            where: {
                bkashPaymentId: paymentID
            },
            data: {
                bkashPaymentId: executePaymentResult.paymentId,
                status: PaymentStatus.CANCELLED,
            }
        })
        return {
            redirectUrl: `${config.client_url}/dashboard/my-appoinment?status=cancel`
        }
    }


    else return {
        redirectUrl: `${config.client_url}/dashboard/my-appoinment?status=payment-failed`
    }

}

export const appoinmentService = {
    bookAppoinment,
    bookAppoinmentCallback,
    payPendingPayment
}
