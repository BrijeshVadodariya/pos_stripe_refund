# -*- coding: utf-8 -*-
{
    'name': "POS Stripe Refund",

    'summary': "Module to manage refunds through Stripe in Point of Sale.",

    'description': """
POS Stripe Refund
==================
This module allows users to process refunds through Stripe directly from the Point of Sale (POS) interface.
Features:
- Refund management through Stripe
- Seamless POS integration
- Automatic payment gateway synchronization
    """,

    'author': "Micra Digital",
    'website': "https://www.micra.digital/",

    'category': 'Point of Sale',
    'version': '17.0.1.0.0',

    'license': 'LGPL-3',  # Choose the appropriate license, LGPL-3 is common for Odoo modules

    # Technical Dependencies
    'depends': ['base', 'pos_self_order', 'point_of_sale', 'payment_stripe'],

    # Data and Views
    'data': [
        #'security/ir.model.access.csv',
        'views/views.xml',
        'views/templates.xml',
    ],

    # Demo Data
    'demo': [
        'demo/demo.xml',
    ],

    # Install Options
    'installable': True,
    'application': True,
    'auto_install': False,

    # Assets
    'assets': {
        'point_of_sale._assets_pos': [
           'pos_stripe_refund/static/src/js/overriders/payment_screen/payment_screen.xml',
           'pos_stripe_refund/static/src/js/overriders/payment_screen/payment_screen.js',
           'pos_stripe_refund/static/src/js/overriders/reciept_screen/reciept_screen.js',
        ],
    },

    # Odoo App Store Specific Fields
    'price': 49.99,  # Adjust as per your pricing strategy
    'currency': 'USD',
    'images': ['static/description/banner.png'],  # Add a banner image (recommended size: 1280x720)
    'support': 'hello@micra.digitl',  # Your support email
    # 'live_test_url': 'https://www.micra.digital/contact-us',  # URL to a live demo
    # 'demo_video': 'https://www.youtube.com/watch?v=9Yam5Bd4J8c',  # URL to a video demo
    'maintainer': 'Micra Digital',
    'external_dependencies': {'python': [], 'bin': []},
}
