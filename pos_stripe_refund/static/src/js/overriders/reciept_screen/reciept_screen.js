/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { ReceiptScreen } from "@point_of_sale/app/screens/receipt_screen/receipt_screen";

patch(ReceiptScreen.prototype, {
    setup() {
        super.setup();
    },

    orderDone() {
        this._addNewOrder();
        this.pos.resetProductScreenSearch();
        const { name, props } = this.nextScreen;
        this.pos.showScreen(name, props);
    },

    });
