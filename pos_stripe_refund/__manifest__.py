# -*- coding: utf-8 -*-
{
    'name': "POS Stripe Refund",
    'summary': "Process refunds through Stripe directly from the Point of Sale interface.",
    'description': """
POS Stripe Refund
=================
This module allows POS users to process refunds using Stripe with:
- Seamless POS integration
- Refund button in the payment screen
- Auto sync with Stripe backend
    """,
    'author': "Micra Digital",
    'maintainer': "Micra Digital",
    'website': "https://www.micra.digital/",
    'support': "hello@micra.digital",
    'license': "LGPL-3",
    'category': 'Point of Sale',
    'version': '18.0.1.0.0',
    'application': True,
    'installable': True,

    'depends': [
        'base',
        'point_of_sale',
        'pos_self_order',
        'payment_stripe',
        'pos_restaurant'
    ],

    'data': [
            'views/pos_config_view.xml',
    ],

    # POS OWL assets
    'assets': {
        'point_of_sale._assets_pos': [
            # XML templates
            # 'pos_stripe_refund/static/src/js/overriders/payment_screen/payment_screen.xml',
            #
            'pos_stripe_refund/static/src/**/*',
            # # JS components
            # 'pos_stripe_refund/static/src/js/overriders/payment_screen/payment_screen.js',
            # 'pos_stripe_refund/static/src/js/overriders/reciept_screen/reciept_screen.js'
            # 'pos_stripe_refund/static/src/**/*'
        ],
    },

    # Optional fields - remove in dev
    'price': 49.99,
    'currency': 'USD',
    'images': ['static/description/banner.png'],
}
