var jar = require('request').jar();
var request = require('request').defaults({ jar: jar });
var cheerio = require('cheerio');
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config.json'));
var open = require("open");
var schedule = require('node-schedule');

var config = JSON.parse(fs.readFileSync('config.json'));

var userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2987.133 Safari/537.36';

if(config.time.startAtSetTime == true)
{
	console.log("Starting task at: " + config.time.hour + ":" + config.time.minute + ":" + config.time.second)
	var j = schedule.scheduleJob({hour: config.time.hour, minute: config.time.minute, second: config.time.second}, function(){  
		login();
		j.cancel();
	});
}
else
{
	login();
}

function login() {
	console.log("Obtaining Login Page")
	request.get({
			headers: {
				'user-agent': userAgent
			},
			url: 'https://www.solebox.com/en/my-account/'
		},
		function (error, response, body) {
			if (response.statusCode == 200) {
				$ = cheerio.load(body);
				var stoken = $('form[name=login] input[name=stoken]').attr('value');
				console.log("Found Stoken: " + stoken);
				request({
					url: 'https://www.solebox.com/index.php?lang=1&',
					method: 'post',
					headers: {
						'User-Agent': userAgent
					},
					formData: {
						'stoken': stoken,
						'lang': 1,
						'listtype': '',
						'actcontrol': 'account',
						'fnc': 'login_noredirect',
						'cl': 'account',
						'lgn_usr': config.email,
						'lgn_pwd': config.password,
					},
				}, function (error, response, body) {
					if (response.statusCode == 200) {
						$ = cheerio.load(body);
						if ($('.DashboardSelectionTile .Heading').html() == "Userdata") {
							console.log("Logged in as " + $('.DashboardSelectionTile .Content').html().split('<br>')[0].replace('    ', ''))
							if (config.addtocarturl == '' || config.addtocarturl == null) {
								console.log("No add to cart url\nChecking out with stored cart")
								standaloneCheckout(stoken);
							} else {
								console.log("Found add to cart url\nAdding item to cart then checking out")
								checkoutWithURL();
							}
						} else {
							login();
							console.log("Could not login successfully. Retrying.");
						}
					} else {
						login();
						console.log("Error getting dashboard page. Retrying.");
					}
				});
			} else {
				login();
				console.log("Error obtaining login page. Retrying.");
			}
		});
}

function checkoutWithURL(stoken) {
	request.get({
			headers: {
				'user-agent': userAgent
			},
			url: config.addtocarturl
		},
		function (error, response, body) {
			if (response.statusCode == 200) {
				console.log("Added to cart!")
				request.get({
						headers: {
							'user-agent': userAgent
						},
						url: 'https://www.solebox.com/en/cart/'
					},
					function (error, response, body) {
						if (response.statusCode == 200) {
							$ = cheerio.load(body);
							console.log("Successfully found cart page");
							if ($('#basket.basketitems .basketItem').length > 0) {
								var itemnames = '';
								var itemimage = '';
								console.log($('#basket.basketitems .basketItem').length + " items in cart");
								for (var i = 1; i < $('#basket.basketitems .basketItem').length + 1; i++) {
									var itemname = $('#cartItem_' + i + ' td a b').html();
									var itemprice = $('#cartItem_' + i + ' .basketCenter>span').html().replace(/\s/g, '').split('&')[0];
									console.log(itemname + " \n€" + itemprice)
									itemnames += "\n" + itemname + " : €" + itemprice;
								}
								itemimage = $('#cartItem_1 .basketImage img').attr('src');
								request.get({
										headers: {
											'user-agent': userAgent
										},
										url: 'https://www.solebox.com/index.php?lang=1&stoken=' + stoken + '&cl=user&cl=payment'
									},
									function (error, response, body) {
										if (response.statusCode == 200) {
											request({
												url: 'https://www.solebox.com/index.php?lang=1&',
												method: 'post',
												headers: {
													'User-Agent': userAgent
												},
												formData: {
													'stoken': stoken,
													'lang': 1,
													'actcontrol': 'payment',
													'cl': 'payment',
													'fnc': 'validatepayment',
													'paymentid': 'globalpaypal',
													'userform': '',
												},
											}, function (error, response, body) {
												if (response.statusCode == 200) {
													if (config.discord == true) {
														discordWebhook(itemimage, itemnames, response.request.href)
													} else {
														console.log("Opening browser with checkout window");
														open(response.request.href);
													}
												}
											});
										} else {
											checkoutWithURL(stoken);
											console.log("Unable to Checkout. Retrying.");
										}
									});
							}
						} else {
							checkoutWithURL(stoken);
							console.log("Unable to retrieve cart page. Retrying.");
						}
					});
			} else {
				checkoutWithURL(stoken);
				console.log("Unable to add item to cart. Retrying.");
			}
		});
}

function standaloneCheckout(stoken) {
	request.get({
			headers: {
				'user-agent': userAgent
			},
			url: 'https://www.solebox.com/en/cart/'
		},
		function (error, response, body) {
			if (response.statusCode == 200) {
				$ = cheerio.load(body);
				console.log("Successfully found cart page");
				if ($('#basket.basketitems .basketItem').length > 0) {
					var itemnames = '';
					var itemimage = '';
					console.log($('#basket.basketitems .basketItem').length + " items in cart");
					for (var i = 1; i < $('#basket.basketitems .basketItem').length + 1; i++) {
						var itemname = $('#cartItem_' + i + ' td a b').html();
						var itemprice = $('#cartItem_' + i + ' .basketCenter>span').html().replace(/\s/g, '').split('&')[0];
						console.log(itemname + " \n€" + itemprice)
						itemnames += "\n" + itemname + " : €" + itemprice;
					}
					itemimage = $('#cartItem_1 .basketImage img').attr('src');
					request.get({
							headers: {
								'user-agent': userAgent
							},
							url: 'https://www.solebox.com/index.php?lang=1&stoken=' + stoken + '&cl=user&cl=payment'
						},
						function (error, response, body) {
							if (response.statusCode == 200) {
								request({
									url: 'https://www.solebox.com/index.php?lang=1&',
									method: 'post',
									headers: {
										'User-Agent': userAgent
									},
									formData: {
										'stoken': stoken,
										'lang': 1,
										'actcontrol': 'payment',
										'cl': 'payment',
										'fnc': 'validatepayment',
										'paymentid': 'globalpaypal',
										'userform': '',
									},
								}, function (error, response, body) {
									if (response.statusCode == 200) {
										if (config.discord == true) {
											discordWebhook(itemimage, itemnames, response.request.href)
										} else {
											console.log("Opening browser with checkout window");
											open(response.request.href);
										}
									}
								});
							} else {
								standaloneCheckout(stoken);
								console.log("Unable to Checkout. Retrying.");
							}
						});
				}
			} else {
				standaloneCheckout(stoken);
				console.log("Unable to retrieve cart page. Retrying.");
			}
		});
}

function discordWebhook(image, text, url) {
	request({
		url: config.discordwebhook,
		json: {
			"embeds": [{
				"thumbnail": {
					"url": image
				},
				"color": 7584112,
				"fields": [{
					"name": "Solebox Success!",
					"value": text + "\n\n" + url,
					"inline": true
				}]
			}]
		},
		method: 'POST'
	}, function (err, res, body) {
		console.log("Sent checkout link to discord");
	});
}