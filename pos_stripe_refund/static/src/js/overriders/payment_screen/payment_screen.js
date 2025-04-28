/** @odoo-module **/


import { useService } from "@web/core/utils/hooks";
import { _t } from "@web/core/l10n/translation";
import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { patch } from "@web/core/utils/patch";
import { OnlinePaymentPopup } from "@pos_online_payment/app/online_payment_popup/online_payment_popup";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { onWillStart } from "@odoo/owl";
import { qrCodeSrc } from "@point_of_sale/utils";
import { ask } from "@point_of_sale/app/store/make_awaitable_dialog";
import { rpc } from "@web/core/network/rpc";

patch(PaymentScreen.prototype, {

   //@override
  async _isOrderValid(isForceValidate) {

        if (!(await super._isOrderValid(...arguments))) {
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
            if (!this.currentOrder.id) {
                this.cancelOnlinePayment(this.currentOrder);
                this.dialog.add(AlertDialog, {
                    title: _t("Online payment unavailable"),
                    body: _t("The QR Code for paying could not be generated."),
                });
                return false;
            }
            let prevOnlinePaymentLine = null;
            let lastOrderServerOPData = null;
            for (const onlinePaymentLine of onlinePaymentLines) {
                const onlinePaymentLineAmount = onlinePaymentLine.get_amount();
                // The local state is not aware if the online payment has already been done.
                lastOrderServerOPData = await this.pos.update_online_payments_data_with_server(
                    this.currentOrder,
                    onlinePaymentLineAmount
                );
                if (!lastOrderServerOPData) {
                    this.dialog.add(AlertDialog, {
                        title: _t("Online payment unavailable"),
                        body: _t(
                            "There is a problem with the server. The order online payment status cannot be retrieved."
                        ),
                    });
                    return false;
                }
                if (!lastOrderServerOPData.is_paid) {
                    if (lastOrderServerOPData.modified_payment_lines) {
                        this.cancelOnlinePayment(this.currentOrder);
                        this.dialog.add(AlertDialog, {
                            title: _t("Updated online payments"),
                            body: _t("There are online payments that were missing in your view."),
                        });
                        return false;
                    }
                    if (
                        (prevOnlinePaymentLine &&
                            prevOnlinePaymentLine?.get_payment_status() !== "done")
//                            || !this.checkRemainingOnlinePaymentLines(lastOrderServerOPData.amount_unpaid)
                    ) {
                        this.cancelOnlinePayment(this.currentOrder);
                        return false;
                    }

                    onlinePaymentLine.set_payment_status("waiting");
                    this.currentOrder.select_paymentline(onlinePaymentLine);
                    if(onlinePaymentLineAmount > 0){
//                        lastOrderServerOPData = await this.showOnlinePaymentQrCode(qrCodeSrc, onlinePaymentLineAmount);

                    const onlinePaymentData = {
                        formattedAmount: this.env.utils.formatCurrency(onlinePaymentLineAmount),
                        qrCode: qrCodeSrc(
                            `${this.pos.session._base_url}/pos/pay/${this.currentOrder.id}?access_token=${this.currentOrder.access_token}`
                        ),
                        orderName: this.currentOrder.name,
                    };
                    this.currentOrder.onlinePaymentData = onlinePaymentData;
                    const qrCodePopupCloser = this.dialog.add(
                        OnlinePaymentPopup,
                        onlinePaymentData,
                        {
                            onClose: () => {
                                onlinePaymentLine.onlinePaymentResolver(false);
                            },
                        }
                    );
                    const paymentResult = await new Promise(
                        (r) => (onlinePaymentLine.onlinePaymentResolver = r)
                    );
                    if (!paymentResult) {
                        this.cancelOnlinePayment(this.currentOrder);
                        onlinePaymentLine.set_payment_status(undefined);
                        return false;
                    }
                    qrCodePopupCloser();
                    }
                    if (onlinePaymentLine.get_payment_status() === "waiting") {
                        onlinePaymentLine.set_payment_status(undefined);
                    }
                    prevOnlinePaymentLine = onlinePaymentLine;
                }
            }

            if (!lastOrderServerOPData || !lastOrderServerOPData.is_paid) {
                lastOrderServerOPData = await this.pos.update_online_payments_data_with_server(
                    this.currentOrder,
                    0
                );
            }
            if (!lastOrderServerOPData || !lastOrderServerOPData.is_paid) {
                return false;
            }

            await this.afterPaidOrderSavedOnServer(lastOrderServerOPData.paid_order);
            return false; // Cancel normal flow because the current order is already saved on the server.
        } else if (typeof this.currentOrder.id === "number") {
            const orderServerOPData = await this.pos.update_online_payments_data_with_server(
                this.currentOrder,
                0
            );
            if (!orderServerOPData) {
                return ask(this.dialog, {
                    title: _t("Online payment unavailable"),
                    body: _t(
                        "There is a problem with the server. The order online payment status cannot be retrieved. Are you sure there is no online payment for this order ?"
                    ),
                    confirmLabel: _t("Yes"),
                });
            }
            if (orderServerOPData.is_paid) {
                await this.afterPaidOrderSavedOnServer(orderServerOPData.paid_order);
                return false; // Cancel normal flow because the current order is already saved on the server.
            }
            if (orderServerOPData.modified_payment_lines) {
                this.dialog.add(AlertDialog, {
                    title: _t("Updated online payments"),
                    body: _t("There are online payments that were missing in your view."),
                });
                return false;
            }
        }

        return true;
    },
    });

patch(PaymentScreen.prototype, {
    setup() {
        super.setup();
//        onWillStart(async () => {
//           const order = this.pos.models["pos.order"].getBy("uuid", this.props.orderUuid);
//           console.log(" my order",order,order.state)
//           console.log(" my current order",this.currentOrder,this.currentOrder.state)
//            if (order.state === 'paid'){
//                this.pos.showScreen("ProductScreen");
//            }
//           });
    },
 async refund_payment(){
        console.log("inherit2",this.currentOrder.payment_ids[0].uuid);
        let paymentLines = [];

        const orderLines = this.currentOrder?.lines || [];

        for (const line of orderLines) {
            const uuid = line?.uuid;
            if (uuid) {
                const paymentLine = this.currentOrder.get_paymentline_by_uuid(this.currentOrder.payment_ids[0].uuid);
                if (paymentLine) {
                    paymentLines.push(paymentLine);
                }
            }
        }
        if (paymentLines[0].payment_method_id.name !== 'stripe') {
                    this.dialog.add(AlertDialog, {
                    title: _t("Please Try Again"),
                    body: _t(
                        "Select Payment method as stripe",
                        "Stripe"
                    ),
                });
                   }
      else if (this.currentOrder && this.currentOrder.get_selected_paymentline) {
//       this.validateOrder();    //uncomment this line
//            let paymentLines = this.currentOrder.get_selected_paymentline();
            if (Array.isArray(paymentLines) && paymentLines.length > 0 ) {
                  const is_refunded = await rpc("/pos-self-order/refund-payment", {
                        "args":{
                              'amount': paymentLines[0].amount,
                              'pos_reference': this.currentOrder.lines[0].order_id.pos_reference,
                            },
                   });
                   console.log("is_refund",is_refunded)
                   if(typeof is_refunded === 'boolean' && is_refunded) {
                        this.pos.showScreen('ReceiptScreen');
                   } else if (typeof is_refunded === 'string') {
                    this.dialog.add(AlertDialog, {
                    title: _t("Please Try Again"),
                    body: _t(
                        "Select Payment method as" +  is_refunded,
                        "Stripe"
                    ),
                });
                   }
                   else {
                    this.dialog.add(AlertDialog, {
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

   async validateOrder(isForceValidate) {
        this.numberBuffer.capture();
        if (!this.check_cash_rounding_has_been_well_applied()) {
            return;
        }
        if (await this._isOrderValid(isForceValidate)) {
            // remove pending payments before finalizing the validation
            const toRemove = [];
            for (const line of this.paymentLines) {
                if (!line.is_done() || line.amount === 0) {
                    toRemove.push(line);
                }
            }

            for (const line of toRemove) {
                this.currentOrder.remove_paymentline(line);
            }
            await this._finalizeValidation();
        }
        if (this.currentOrder.lines[0].qty < 0){
            await this.refund_payment()
        }
    },

    });


