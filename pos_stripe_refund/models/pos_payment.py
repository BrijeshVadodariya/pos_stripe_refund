# -*- coding: utf-8 -*-

from odoo import models, fields, api


class PosPayment(models.Model):
    _inherit = 'pos.payment'

    def write(self, vals):
        return super().write(vals)

