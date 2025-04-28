
# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import models, fields, api, tools


class PosOrder(models.Model):
    _inherit = 'pos.order'


def action_pos_order_paid(self):
    self.ensure_one()

    # TODO: add support for mix of cash and non-cash payments when both cash_rounding and only_round_cash_method are True
    if not self.config_id.cash_rounding \
            or self.config_id.only_round_cash_method \
            and not any(p.payment_method_id.is_cash_count for p in self.payment_ids):
        total = self.amount_total
    else:
        total = float_round(self.amount_total, precision_rounding=self.config_id.rounding_method.rounding,
                            rounding_method=self.config_id.rounding_method.rounding_method)

    isPaid = float_is_zero(total - self.amount_paid, precision_rounding=self.currency_id.rounding)

    if not isPaid and not self.config_id.cash_rounding:
        # raise UserError(_("Order %s is not fully paid.", self.name))
        pass
    elif not isPaid and self.config_id.cash_rounding:
        currency = self.currency_id
        if self.config_id.rounding_method.rounding_method == "HALF-UP":
            maxDiff = currency.round(self.config_id.rounding_method.rounding / 2)
        else:
            maxDiff = currency.round(self.config_id.rounding_method.rounding)

        diff = currency.round(self.amount_total - self.amount_paid)
        if not abs(diff) <= maxDiff:
            raise UserError(_("Order %s is not fully paid.", self.name))

    self.write({'state': 'paid'})

    return True





# class PosConfig(models.Model):
#     _inherit = 'pos.config'
#
#     tick_payment_reload = fields.Boolean(string="Force payment")


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    tick_payment_reload = fields.Boolean(string="Force payment")

    @api.model
    def get_values(self):
        # Just return the value from res.config.settings, no need to interact with pos.config here
        res = super().get_values()
        res.update({
            'tick_payment_reload': self.env['ir.config_parameter'].sudo().get_param('tick_payment_reload', default=False),
        })
        return res

    def set_values(self):
        super().set_values()
        # Store the value in ir.config_parameter to persist the setting
        self.env['ir.config_parameter'].sudo().set_param('tick_payment_reload', self.tick_payment_reload)
