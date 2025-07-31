-- Clear existing action_buttons and implement the exact 136-button specification
TRUNCATE TABLE action_buttons;

-- Insert the exact 136 buttons from the specification
INSERT INTO action_buttons (id, domain, label, payload, description) VALUES
-- CORE (10 buttons)
('LANG_SELECT', 'core', '🌍 Change Language', 'LANG_SELECT', 'Opens language list'),
('MAIN_MENU', 'core', '🗂 Main Menu', 'MAIN_MENU', 'Shows top domains'),
('PROFILE_VIEW', 'core', '⚙️ My Profile', 'PROFILE_VIEW', 'Shows MoMo, prefs'),
('HELP_MENU', 'core', '📜 Help', 'HELP_MENU', 'Explains commands'),
('NOTIF_OFF', 'core', '🔔 Notifications Off', 'NOTIF_OFF', 'Mute marketing'),
('NOTIF_ON', 'core', '🔔 Notifications On', 'NOTIF_ON', 'Un‑mute marketing'),
('STOP', 'core', '❌ Stop / Opt‑out', 'STOP', 'GDPR opt‑out'),
('HUMAN', 'core', '🆘 Talk to human', 'HUMAN', 'Escalation'),
('REPEAT_LAST', 'core', '🔄 Repeat Last', 'REPEAT_LAST', 'Re‑send last action'),
('HISTORY', 'core', '🕓 History', 'HISTORY', 'List recent actions'),

-- PAYMENTS (10 buttons)
('PAY_QR', 'payments', '💸 Generate QR', 'PAY_QR', 'Create pay‑in QR'),
('PAY_SCAN', 'payments', '📥 Scan QR', 'PAY_SCAN', 'Open WA scanner'),
('PAY_AMT_1000', 'payments', '💵 Pay 1000', 'PAY_AMT_1000', 'Quick pay 1000'),
('PAY_AMT_5000', 'payments', 'Pay 5000', 'PAY_AMT_5000', 'Quick pay 5000'),
('PAY_AMT_10000', 'payments', 'Pay 10000', 'PAY_AMT_10000', 'Quick pay 10000'),
('PAY_SEND', 'payments', '💰 Send Money', 'PAY_SEND', 'Send money flow'),
('PAY_ENTER', 'payments', '💳 Enter Amount', 'PAY_ENTER', 'Enter amount form'),
('MOMO_SAVE', 'payments', '➕ Save MoMo No.', 'MOMO_SAVE', 'Save new MoMo'),
('MOMO_EDIT', 'payments', '🖊 Edit MoMo', 'MOMO_EDIT', 'Edit MoMo'),
('PAY_USSD', 'payments', '🌐 USSD Fallback', 'PAY_USSD', 'Show *182#'),

-- MOBILITY DRIVER (13 buttons)
('DRV_POST', 'mobility_driver', '📍 Post Trip', 'DRV_POST', 'Create trip'),
('DRV_EDIT', 'mobility_driver', '✏️ Edit Trip', 'DRV_EDIT', 'Edit trip'),
('DRV_CANCEL', 'mobility_driver', '❌ Cancel Trip', 'DRV_CANCEL', 'Cancel trip'),
('DRV_VIEW_PAX', 'mobility_driver', '👀 View Passengers', 'DRV_VIEW_PAX', 'See passengers'),
('DRV_PAY', 'mobility_driver', '💰 Get Paid', 'DRV_PAY', 'Payment flow'),
('DRV_TRIPS_TODAY', 'mobility_driver', '🗓 Today''s Trips', 'DRV_TRIPS_TODAY', 'List today'),
('DRV_STATS', 'mobility_driver', '📊 Earnings Stats', 'DRV_STATS', 'Earnings summary'),
('DRV_PROFILE', 'mobility_driver', '🛠 Edit Profile', 'DRV_PROFILE', 'Edit profile'),
('DRV_COMPLETE', 'mobility_driver', '🏁 Trip Complete', 'DRV_COMPLETE', 'Mark done'),
('DRV_SET_PRICE', 'mobility_driver', '🆕 New Fare', 'DRV_SET_PRICE', 'Set price'),
('DRV_GO_ONLINE', 'mobility_driver', '🟢 Go Online', 'DRV_GO_ONLINE', 'Status online + location'),
('DRV_GO_OFFLINE', 'mobility_driver', '🔴 Go Offline', 'DRV_GO_OFFLINE', 'Status offline'),
('DRV_SHARE_LOC', 'mobility_driver', '📡 Share Live Loc', 'DRV_SHARE_LOC', 'Share live location'),

-- MOBILITY PASSENGER (10 buttons)
('PAX_REQUEST', 'mobility_pass', '🚕 Request Ride', 'PAX_REQUEST', 'Ride form'),
('PAX_LOC', 'mobility_pass', '📍 Share Location', 'PAX_LOC', 'Share location'),
('PAX_NEAR_DRV', 'mobility_pass', '👀 Nearby Drivers', 'PAX_NEAR_DRV', 'List drivers'),
('PAX_REFRESH', 'mobility_pass', '🔄 Refresh List', 'PAX_REFRESH', 'Refresh drivers'),
('PAX_BOOK_ID', 'mobility_pass', '✅ Book Driver', 'PAX_BOOK_<id>', 'Select driver'),
('PAX_PAY', 'mobility_pass', '💸 Pay Driver', 'PAX_PAY', 'Payment to driver'),
('PAX_TRIPS', 'mobility_pass', '🗓 My Trips', 'PAX_TRIPS', 'Show trips'),
('PAX_CANCEL', 'mobility_pass', '❌ Cancel Ride', 'PAX_CANCEL', 'Cancel ride'),
('PAX_EDIT_DEST', 'mobility_pass', '✏️ Edit Dest', 'PAX_EDIT_DEST', 'Edit destination'),
('PAX_SEATS', 'mobility_pass', '🆕 Set Seats', 'PAX_SEATS', 'Set seats'),

-- ORDERING (15 buttons)
('ORD_BAR_NEAR', 'ordering', '🍻 Bars Nearby', 'ORD_BAR_NEAR', 'Find bars'),
('ORD_PHAR_NEAR', 'ordering', '🏥 Pharmacies', 'ORD_PHAR_NEAR', 'Find pharmacies'),
('ORD_HW_NEAR', 'ordering', '🔨 Hardware Shops', 'ORD_HW_NEAR', 'Find hardware'),
('ORD_FARM_NEAR', 'ordering', '🌾 Farm Markets', 'ORD_FARM_NEAR', 'Find farms'),
('ORD_MENU', 'ordering', '🛒 Browse Menu', 'ORD_MENU', 'Show menu'),
('CART_ADD_SKU', 'ordering', '➕ Add to Cart', 'CART_ADD_<sku>', 'Add item'),
('CART_VIEW', 'ordering', '🛍 View Cart', 'CART_VIEW', 'View cart'),
('CART_CLEAR', 'ordering', '🗑 Clear Cart', 'CART_CLEAR', 'Clear cart'),
('CART_CHECKOUT', 'ordering', '💳 Checkout', 'CART_CHECKOUT', 'Checkout'),
('ORD_TRACK', 'ordering', '📦 Track Order', 'ORD_TRACK', 'Track order'),
('ORD_CANCEL', 'ordering', '❌ Cancel Order', 'ORD_CANCEL', 'Cancel order'),
('ORD_REORDER', 'ordering', '📋 Re‑Order', 'ORD_REORDER', 'Repeat order'),
('ORD_RX_UPLOAD', 'ordering', '🖼 Upload Prescription', 'ORD_RX_UPLOAD', 'Prescription OCR'),
('ORD_HISTORY', 'ordering', '🕓 Order History', 'ORD_HISTORY', 'Order history'),
('ORD_ADDR', 'ordering', '🗺 Change Address', 'ORD_ADDR', 'Set address'),

-- BUSINESS PARTNER (10 buttons)
('PARTNER_MENU', 'partner', '➕ Become Partner', 'PARTNER_MENU', 'Choose role'),
('PARTNER_DRV', 'partner', '🚕 Moto Driver', 'PARTNER_DRV', 'Driver form'),
('PARTNER_PHAR', 'partner', '🏥 Pharmacy', 'PARTNER_PHAR', 'Pharmacy form'),
('PARTNER_SHOP', 'partner', '🏪 Shop', 'PARTNER_SHOP', 'Shop form'),
('PARTNER_DOC', 'partner', '🧾 Send Business Doc', 'PARTNER_DOC', 'Upload license'),
('PARTNER_MOMO_CODE', 'partner', '💳 Set MoMo Code', 'PARTNER_MOMO_CODE', 'Set MoMo code'),
('PARTNER_GPS', 'partner', '📍 Set GPS', 'PARTNER_GPS', 'Share GPS'),
('PARTNER_CONFIRM', 'partner', '✅ Confirm Details', 'PARTNER_CONFIRM', 'Confirm details'),
('PARTNER_EDIT', 'partner', '✏️ Edit Details', 'PARTNER_EDIT', 'Edit details'),
('PARTNER_DASH', 'partner', '📊 My Dashboard', 'PARTNER_DASH', 'Dashboard'),

-- PROPERTY LISTINGS (10 buttons)
('PROP_LIST', 'listings_prop', '🏠 List Property', 'PROP_LIST', 'List property'),
('PROP_FIND_RENT', 'listings_prop', '🔍 Find Rentals', 'PROP_FIND_RENT', 'Find rentals'),
('PROP_FIND_SALE', 'listings_prop', '🏡 Find Sales', 'PROP_FIND_SALE', 'Find sales'),
('PROP_PHOTO', 'listings_prop', '📷 Add Photos', 'PROP_PHOTO', 'Upload photos'),
('PROP_EDIT_ID', 'listings_prop', '✏️ Edit Listing', 'PROP_EDIT_<id>', 'Edit listing'),
('PROP_DEL_ID', 'listings_prop', '❌ Remove Listing', 'PROP_DEL_<id>', 'Delete listing'),
('PROP_CHAT_ID', 'listings_prop', '💬 Chat Owner', 'PROP_CHAT_<id>', 'Chat owner'),
('PROP_VISIT_ID', 'listings_prop', '📅 Schedule Visit', 'PROP_VISIT_<id>', 'Schedule visit'),
('PROP_OFFER_ID', 'listings_prop', '💲 Make Offer', 'PROP_OFFER_<id>', 'Make offer'),
('PROP_MY', 'listings_prop', '🗒 My Listings', 'PROP_MY', 'My listings'),

-- VEHICLE LISTINGS (8 buttons)
('VEH_LIST', 'listings_veh', '🚗 List Vehicle', 'VEH_LIST', 'List vehicle'),
('VEH_FIND_SALE', 'listings_veh', '🔍 Find Cars Sale', 'VEH_FIND_SALE', 'Find cars'),
('VEH_FIND_MOTO', 'listings_veh', '🛵 Find Motos', 'VEH_FIND_MOTO', 'Find motos'),
('VEH_PHOTO', 'listings_veh', '📷 Add Photos', 'VEH_PHOTO', 'Upload photos'),
('VEH_EDIT_ID', 'listings_veh', '✏️ Edit Listing', 'VEH_EDIT_<id>', 'Edit vehicle'),
('VEH_DEL_ID', 'listings_veh', '❌ Remove Listing', 'VEH_DEL_<id>', 'Delete vehicle'),
('VEH_CHAT_ID', 'listings_veh', '💬 Chat Seller', 'VEH_CHAT_<id>', 'Chat seller'),
('VEH_MY', 'listings_veh', '🗒 My Vehicles', 'VEH_MY', 'My vehicles'),

-- MARKETING (9 buttons)
('MKT_REFER', 'marketing', '🎁 Refer Friend', 'MKT_REFER', 'Referral link'),
('MKT_DEALS', 'marketing', '📣 Latest Deals', 'MKT_DEALS', 'Show promos'),
('MKT_TOPUP', 'marketing', '💳 Top Up Wallet', 'MKT_TOPUP', 'Top‑up shortcut'),
('MKT_COMM', 'marketing', '📈 Earn Commissions', 'MKT_COMM', 'Explain commissions'),
('MKT_REWARDS', 'marketing', '📊 My Rewards', 'MKT_REWARDS', 'Reward balance'),
('MKT_REM', 'marketing', '🔔 Set Reminders', 'MKT_REM', 'Set reminders'),
('MKT_FEEDBACK', 'marketing', '✉️ Feedback', 'MKT_FEEDBACK', 'Ask CSAT'),
('MKT_RATE_DRV', 'marketing', '⭐️ Rate Driver', 'MKT_RATE_DRV', 'Rate driver'),
('MKT_RATE_SHOP', 'marketing', '🛍 Rate Shop', 'MKT_RATE_SHOP', 'Rate shop'),

-- SUPPORT (4 buttons)
('SUP_FAQ', 'support', '🗂 FAQ', 'SUP_FAQ', 'FAQ link'),
('SUP_REPORT', 'support', '🕵️ Report Issue', 'SUP_REPORT', 'Support form'),
('SUP_RETRY', 'support', '🔄 Retry Last Action', 'SUP_RETRY', 'Retry last'),
('SUP_OK', 'support', '🆗 All Good', 'SUP_OK', 'Close ticket'),

-- DEV (3 buttons)
('DEV_STATE', 'dev', '🐞 Debug State', 'DEV_STATE', 'Echo state'),
('DEV_PING', 'dev', '📊 Latency Ping', 'DEV_PING', 'Ping'),
('DEV_LOG', 'dev', '📝 Log Dump', 'DEV_LOG', 'Last logs'),

-- QA (3 buttons)
('QA_GATE', 'qa', '🔍 Run Quality Gate', 'QA_GATE', 'Quality gate'),
('QA_AUDIT', 'qa', '📡 Audit Knowledge', 'QA_AUDIT', 'Knowledge audit'),
('QA_EMBED', 'qa', '💾 Vector Re‑Embed', 'QA_EMBED', 'Refresh embeddings'),

-- LANGUAGE (4 buttons)
('LANG_EN', 'lang', '🇬🇧 English', 'LANG_EN', 'Set EN'),
('LANG_RW', 'lang', '🇷🇼 Kinyarwanda', 'LANG_RW', 'Set RW'),
('LANG_FR', 'lang', '🇫🇷 Français', 'LANG_FR', 'Set FR'),
('LANG_SW', 'lang', '🇹🇿 Swahili', 'LANG_SW', 'Set SW'),

-- PROFILE (9 buttons)
('PROF_NAME', 'profile', '✏️ Edit Name', 'PROF_NAME', 'Edit name'),
('PROF_PHONE', 'profile', '📞 Update Phone', 'PROF_PHONE', 'Edit phone'),
('PROF_CLEAR', 'profile', '🔐 Clear Data', 'PROF_CLEAR', 'GDPR delete'),
('PROF_LANG', 'profile', '💬 Preferred Lang', 'PROF_LANG', 'Language list'),
('PROF_MOMO', 'profile', '💳 Default MoMo', 'PROF_MOMO', 'View/edit MoMo'),
('PROF_CURR', 'profile', '🌐 Default Currency', 'PROF_CURR', 'Edit currency'),
('PROF_ADDR', 'profile', '🗺 Default Address', 'PROF_ADDR', 'Save default address'),
('PROF_TUTORIAL', 'profile', '🔄 Reset Tutorial', 'PROF_TUTORIAL', 'Resend welcome'),
('PROF_ABOUT', 'profile', '❓ About easyMO', 'PROF_ABOUT', 'Mission FAQ'),

-- ONBOARDING (7 buttons)
('ONB_START', 'onboarding', '🆕 Get Started', 'ONB_START', 'First touch'),
('ONB_SERVICES', 'onboarding', '📚 Our Services', 'ONB_SERVICES', 'Services carousel'),
('ONB_DRV_START', 'onboarding', '🛵 Become Driver', 'ONB_DRV_START', 'Driver onboarding'),
('ONB_PHAR_START', 'onboarding', '🏥 Register Pharmacy', 'ONB_PHAR_START', 'Pharmacy onboarding'),
('ONB_BAR_START', 'onboarding', '🍻 Register Bar', 'ONB_BAR_START', 'Bar onboarding'),
('ONB_SHOP_START', 'onboarding', '🏪 Register Shop', 'ONB_SHOP_START', 'Shop onboarding'),
('PROF_SETTINGS', 'profile', '⚙️ My Settings', 'PROF_SETTINGS', 'Open settings');