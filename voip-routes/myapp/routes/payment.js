var express = require('express');
var router = express.Router();

var request = require("request");

var paypal = require('paypal-rest-sdk');



//Paypal keys

// paypal.configure({
//     'mode': 'live', //sandbox or live
//     'client_id': 'ARy2xnp9Q2c-nr7Po8B8KjVb9TKQG__z-ZjX6YIqxEoD-fb1ZokxrbPOk0c0ygzo-pyQszz8t3oglviu',
//     'client_secret': 'EBVstt-JupA9hWWZxzofGxWri9jDGw8oXtxO0Gk996jh9QyTWAKDN53ZESD7f6Ba4PR-tg1gZx-v4z52'
//   });

  
// //Sand box Account details.
paypal.configure({
  'mode': 'sandbox', //sandbox or live
  'client_id': 'AXxtAiKMnbQAmDO6FrgO48UJ0oCGbqdI_bsHpfqHSJXSrTaVpPMjnJwQMuWeBCC4dzOlrHg5IFCNCL3k',
  'client_secret': 'EBmFQoh3gJcIxDjxAO6tQdWtDiraxNWFWjPEXGBfkE8Ht9WAlkq-RkGcPVt2wKyuFIUO4gVnuZQYyvFS'
});

var isoDate = new Date();
isoDate.setMonth(isoDate.getMonth() + 1);
isoDate.toISOString().slice(0, 19) + 'Z';
let userid = '';

var create_payment_json = {
    "intent": "sale",
    "payer": {
        "payment_method": "paypal"
    },
    "redirect_urls": {
      "return_url": "http://voiproutes.net/admin/#/paymentsuccess",
      "cancel_url": "http://voiproutes.net/admin/#/cancelPayment",
        // "return_url": "paymentinteg/successPayment",
        // "cancel_url": "paymentinteg/cancelPayment",
    },
    "transactions": [{
        "item_list": {
            "items": [{
                "name": "item",
                "sku": "item",
                "price": "1.00",
                "currency": "USD",
                "quantity": 1
            }]
        },
        "amount": {
            "currency": "USD",
            "total": "1.00"
        },
        "description": "This is the payment description."
    }]
};

var execute_payment_json = {
    "payer_id": "",
    "transactions": [{
        "amount": {
            "currency": "USD",
            "total": "1.00"
        }
    }]
  };




router.get('/', function(req, res, next) {
    res.send('test is working');
  });

  

  router.post('/', function(req, res) {
    //   res.json('payment response');
     let checkoutData = req.body;
    create_payment_json.transactions[0].amount.currency =  checkoutData.body.currency;
    let processingFee = checkoutData.body.amount * 0.015;
    let totalAmount = (parseInt(checkoutData.body.amount) + processingFee).toFixed(2);
    // //total amount and price must be the same. other wise getting validation errors.
    create_payment_json.transactions[0].amount.total =  totalAmount;
    create_payment_json.transactions[0].description =  checkoutData.body.amount;
    create_payment_json.transactions[0].item_list.items[0].price= totalAmount;
    create_payment_json.transactions[0].item_list.items[0].currency= checkoutData.body.currency;
    execute_payment_json.transactions[0].amount.total = totalAmount;
    execute_payment_json.transactions[0].amount.currency = checkoutData.body.currency;

    userid = checkoutData.body.userid; 
    //res.json(create_payment_json);
    paypal.payment.create(create_payment_json, function (error, payment) {
        if (error) {
            console.log('error in payment create  ',error.response.details);
        } else {
            let redirectUrl = '';
            for (var index = 0; index < payment.links.length; index++) {
                if (payment.links[index].rel === 'approval_url') {
                    var approval_url = payment.links[index].href;
                    redirectUrl = approval_url;
                }
            }
            console.log('Redirect url is'+redirectUrl);
            res.json(redirectUrl);
            
        }
    });
});

router.get('/cancelPayment', function(req, res, next) {
    res.json('cancel payment');
  });

  router.get('/paymentmessage', function(req, res, next) {
    res.json('success payment');
  });

  router.post('/successPayment', function(req, res, next) {
    console.log('In success payment.');
    let paymentInformation = req.body;
    console.log(paymentInformation.body);
    let paymentToken = paymentInformation.body.paymentId;
    execute_payment_json.payer_id = paymentInformation.body.payerId;
    let userId = paymentInformation.body.userId;
    let currency = execute_payment_json.transactions[0].amount.currency;
    paypal.payment.execute(paymentToken,execute_payment_json, function (error, billingAgreement) {
        if (error) {
            console.log(error);
            throw error;
        } else {
          let blanaceUpdate = billingAgreement.transactions[0].description;
            var options = { method: 'GET',
            url: 'http://62.138.16.114/billing/api/user_balance_update',
            qs: { u: 'admin', user_id: userId,p_currency:currency,paymenttype:'Website',tax_in_amount:0, amount: blanaceUpdate, hash: '385c83488c' },
            headers: 
             { 'Postman-Token': '4a76cbbd-36ad-4434-9eb8-45bf6ae18086',
               'cache-control': 'no-cache' } };
          request(options, function (error, response, body) {
            if (error) console.log(error);
            console.log(body);
            res.json(body);
          });
            
        }
    });
  });







module.exports = router;
