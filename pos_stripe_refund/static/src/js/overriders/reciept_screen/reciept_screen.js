/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { ReceiptScreen } from "@point_of_sale/app/screens/receipt_screen/receipt_screen";
import { rpc } from "@web/core/network/rpc";
import { onWillStart } from "@odoo/owl";

patch(ReceiptScreen.prototype, {
    setup() {
        super.setup();
        // In POS, we use the 'pos' service to make RPC calls
        this.tickPaymentReload = false;
    },


    async orderDone() {
        console.log("inherit4");
        this.currentOrder.uiState.screen_data.value = "";
        this.currentOrder.uiState.locked = true;
        this._addNewOrder();
        this.pos.searchProductWord = "";
        const { name, props } = this.nextScreen;
        this.pos.showScreen(name, props);
        console.log("pos", this.pos,this.tickPaymentReload);
        this.tickPaymentReload = await rpc("/pos-self-order/check-tick", {});

        if (this.tickPaymentReload) {
            console.log("Payment reload is ticked, reloading...");
            window.location.reload();
        }
    },
});