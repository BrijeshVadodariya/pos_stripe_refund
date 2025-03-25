# -*- coding: utf-8 -*-
from odoo import http
from odoo.http import request
import time
import logging

_logger = logging.getLogger(__name__)

class PosStripeRefund(http.Controller):
    def send_mail(self, order):
        max_rty = 3
        rty_delay = 1
        rty = 0
        while rty < max_rty:
            try:
                order.action_pos_order_paid()
                break
            except:
                rty += 1
                time.sleep(rty_delay)

    @http.route('/pos-self-order/refund-payment', auth='public', type='json', website=True)
    def send_refund(self, args):
        try:
            amount = args['amount']
            uuid = args['uuid']
            order = request.env['pos.order'].sudo().search([("pos_reference", "=", "Order " + uuid)])

            if order and amount < 0:
                search_refunded_order_ids = order

                if search_refunded_order_ids.refunded_order_ids[0].payment_ids[
                    0].online_account_payment_id.payment_method_code == 'stripe':
                    send_refund_amount = search_refunded_order_ids.refunded_order_ids[
                        0].payment_ids.online_account_payment_id.payment_transaction_id.sudo().action_refund(
                        abs(amount))
                    request.env.cr.commit()
                    time.sleep(0.5)
                    # search_uuid = request.env['pos.order.line'].sudo().search([("uuid", "=", uuid)])
                    get_new_payment_source_link = request.env['account.payment'].sudo().search([("source_payment_id",
                                                                                                 "=",
                                                                                                 search_refunded_order_ids.refunded_order_ids[
                                                                                                     0].payment_ids.online_account_payment_id.id)])
                    request.env.cr.commit()

                    if get_new_payment_source_link:
                        data = {'pos_order_id': order.id, 'amount': amount, 'name': False,
                                'payment_method_id': search_refunded_order_ids.refunded_order_ids[0].payment_ids[
                                    0].online_account_payment_id.pos_payment_method_id.id,
                                'online_account_payment_id': get_new_payment_source_link[0].id}
                        # e = request.env['pos.order'].sudo().search([("id", "=", order.id)])
                        order.write({"payment_ids": [(0, 0, data)], 'state': 'paid'})
                        o_id = order.id
                        request.env.cr.flush()
                        request.env.cr.commit()
                        e = request.env['pos.order'].sudo().search([("id", "=", o_id)])
                        self.send_mail(e)
                    else:
                        return False
                else:
                    return search_refunded_order_ids.refunded_order_ids[0].payment_ids[0].payment_method_id.display_name
            return True
        except:
            return False

