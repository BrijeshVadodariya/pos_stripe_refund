/** @odoo-module **/


import { useService } from "@web/core/utils/hooks";
import { _t } from "@web/core/l10n/translation";
import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { patch } from "@web/core/utils/patch";
import { OnlinePaymentPopup } from "@pos_online_payment/app/utils/online_payment_popup/online_payment_popup";
import { ConfirmPopup } from "@point_of_sale/app/utils/confirm_popup/confirm_popup";
import { ErrorPopup } from "@point_of_sale/app/errors/popups/error_popup";
import { floatIsZero } from "@web/core/utils/numbers";
import { qrCodeSrc } from "@point_of_sale/utils";

patch(PaymentScreen.prototype, {
   //@override
   async _isOrderValid(isForceValidate) {
        if (!await super._isOrderValid(...arguments)) {
            return false;
        }

        if (!this.payment_methods_from_config.some((pm) => pm.is_online_payment)) {
            return true;
        }

        if (this.currentOrder.finalized) {
            this.afterOrderValidation(false);
            return false;
        }

        const onlinePaymentLines = this.getRemainingOnlinePaymentLines();
        if (onlinePaymentLines.length > 0) {
            // Send the order to the server everytime before the online payments process to
            // allow the server to get the data for online payments and link the successful
            // online payments to the order.
            // The validation process will be done by the server directly after a successful
            // online payment that makes the order fully paid.
            this.currentOrder.date_order = luxon.DateTime.now();
            this.currentOrder.save_to_db();
            this.pos.addOrderToUpdateSet();

            try {
                await this.pos.sendDraftToServer();
            } catch (error) {
                // Code from _finalizeValidation():
                if (error.code == 700 || error.code == 701) {
                    this.error = true;
                }

                if ("code" in error) {
                    // We started putting `code` in the rejected object for invoicing error.
                    // We can continue with that convention such that when the error has `code`,
                    // then it is an error when invoicing. Besides, _handlePushOrderError was
                    // introduce to handle invoicing error logic.
                    await this._handlePushOrderError(error);
                }
                this.showSaveOrderOnServerErrorPopup();
                return false;
            }

            if (!this.currentOrder.server_id) {
                this.showSaveOrderOnServerErrorPopup();
                return false;
            }

            if (!this.currentOrder.server_id) {
                this.cancelOnlinePayment(this.currentOrder);
                this.popup.add(ErrorPopup, {
                    title: _t("Online payment unavailable"),
                    body: _t("The QR Code for paying could not be generated."),
                });
                return false;
            }
            const qrCodeImgSrc = qrCodeSrc(`${this.pos.base_url}/pos/pay/${this.currentOrder.server_id}?access_token=${this.currentOrder.access_token}`);

            let prevOnlinePaymentLine = null;
            let lastOrderServerOPData = null;
            for (const onlinePaymentLine of onlinePaymentLines) {
                const onlinePaymentLineAmount = onlinePaymentLine.get_amount();
                // The local state is not aware if the online payment has already been done.
                lastOrderServerOPData = await this.currentOrder.update_online_payments_data_with_server(this.pos.orm, onlinePaymentLineAmount);
                if (!lastOrderServerOPData) {
                    this.popup.add(ErrorPopup, {
                        title: _t("Online payment unavailable"),
                        body: _t("There is a problem with the server. The order online payment status cannot be retrieved."),
                    });
                    return false;
                }
                if (!lastOrderServerOPData.is_paid) {
                    if (lastOrderServerOPData.modified_payment_lines) {
                        this.cancelOnlinePayment(this.currentOrder);
                        this.showModifiedOnlinePaymentsPopup();
                        return false;
                    }
                    if ((prevOnlinePaymentLine && prevOnlinePaymentLine.get_payment_status() !== "done")) {
                        this.cancelOnlinePayment(this.currentOrder);
                        return false;
                    }

                    onlinePaymentLine.set_payment_status("waiting");
                    this.currentOrder.select_paymentline(onlinePaymentLine);
                    if(onlinePaymentLineAmount > 0){
                        lastOrderServerOPData = await this.showOnlinePaymentQrCode(qrCodeImgSrc, onlinePaymentLineAmount);
                    }
                    if (onlinePaymentLine.get_payment_status() === "waiting") {
                        onlinePaymentLine.set_payment_status(undefined);
                    }
                    prevOnlinePaymentLine = onlinePaymentLine;
                }
            }

            if (!lastOrderServerOPData || !lastOrderServerOPData.is_paid) {
                lastOrderServerOPData = await this.currentOrder.update_online_payments_data_with_server(this.pos.orm, 0);
            }
            if (!lastOrderServerOPData || !lastOrderServerOPData.is_paid) {
                return false;
            }

            await this.afterPaidOrderSavedOnServer(lastOrderServerOPData.paid_order);
            return false; // Cancel normal flow because the current order is already saved on the server.
        } else if (this.currentOrder.server_id) {
            const orderServerOPData = await this.currentOrder.update_online_payments_data_with_server(this.pos.orm, 0);
            if (!orderServerOPData) {
                const { confirmed } = await this.popup.add(ConfirmPopup, {
                    title: _t("Online payment unavailable"),
                    body: _t("There is a problem with the server. The order online payment status cannot be retrieved. Are you sure there is no online payment for this order ?"),
                    confirmText: _t("Yes"),
                });
                return confirmed;
            }
            if (orderServerOPData.is_paid) {
                await this.afterPaidOrderSavedOnServer(orderServerOPData.paid_order);
                return false; // Cancel normal flow because the current order is already saved on the server.
            }
            if (orderServerOPData.modified_payment_lines) {
                this.showModifiedOnlinePaymentsPopup();
                return false;
            }
        }

        return true;
    },
});

patch(PaymentScreen.prototype, {
    setup() {
        super.setup();
        this.rpc = useService("rpc");
    },
//    checkRemainingOnlinePaymentLines(unpaidAmount) {
//        const remainingLines = this.getRemainingOnlinePaymentLines();
//        let remainingAmount = 0;
//        let amount = 0;
//        for (const line of remainingLines) {
//            amount = line.get_amount();
//            if (amount <= 0) {
//                return true;
//                this.popup.add(ErrorPopup, {
//                    title: _t("Invalid online payment"),
//                    body: _t(
//                        "Online payments amount (%s: %s).",
//                        line.payment_method.name,
//                        this.env.utils.formatCurrency(amount)
//                    ),
//                });
//                return false;
//            }
//            remainingAmount += amount;
//        }
////        if (!floatIsZero(unpaidAmount - remainingAmount, this.pos.currency.decimal_places)) {
////            this.popup.add(ErrorPopup, {
////                title: _t("Invalid online payments"),
////                body: _t(
////                    "The total amount of remaining online payments to execute (%s) doesn't correspond to the remaining unpaid amount of the order (%s).",
////                    this.env.utils.formatCurrency(remainingAmount),
////                    this.env.utils.formatCurrency(unpaidAmount)
////                ),
////            });
////            return false;
////        }
//        return true;
//    },
   async refund_payment(){
   this.validateOrder();
   if (this.currentOrder && this.currentOrder.get_paymentlines) {
            let paymentLines = this.currentOrder.get_paymentlines();
            if (Array.isArray(paymentLines) && paymentLines.length > 0 && paymentLines[0].name == 'stripe') {
                  const is_refunded = await this.rpc("/pos-self-order/refund-payment", {
                        "args":{
                              'amount': paymentLines[0].amount,
                              'uuid': this.currentOrder.orderlines[0].order.uid,
                            },
                   });
                   if(typeof is_refunded === 'boolean' && is_refunded) {
                        this.pos.showScreen('ReceiptScreen');
                   } else if (typeof is_refunded === 'string') {
                    this.popup.add(ErrorPopup, {
                    title: _t("Please Try Again"),
                    body: _t(
                        "Select Payment method as" +  is_refunded,
                        "Stripe"
                    ),
                });
                   }
                   else {
                    this.popup.add(ErrorPopup, {
                    title: _t("Please Try Again"),
                    body: _t(
                        "Something Wrong with Stripe payment. Please try again",
                        "Stripe"
                    ),
                });
                   }
            } else {
                console.log("No payment lines available.",this.currentOrder);
            }
        } else {
            console.log("currentOrder or get_paymentlines is not defined.");
        }
   },

    });


