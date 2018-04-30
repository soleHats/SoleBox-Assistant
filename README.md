# SoleBox-Assistant
Used to automate checking out on SoleBox, until the PayPal form opens, in which a new browser will open with a PayPal checkout page, or you can directly send the PayPal link to a discord channel via Webhook.


**Usage**

If you disable discord, once PayPal payment is available, your 'preffered' browser will open with the paypal checkout link
If you leave the addtocarturl blank, the bot will try to checkout whatever is in your cart (cart holds on solebox)

1. Input your details in 'config.json'

2. Open the directory and in the console, input

   > node index.js


**Requires**

Cheerio
>npm install cheerio

Request
>npm install request

Fs
>npm install fs

Open
>npm install open

Node-schedule
>npm install node-schedule