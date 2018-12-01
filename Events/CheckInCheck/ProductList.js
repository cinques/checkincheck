define(
    'Events/CheckInCheck/ProductList',
    [
        'Events/BaseCard/BaseBlock',
        'Events/CheckInCheck/ProductList/Product',
        'Events/CheckInCheck/CheckList/Check',
        'tmpl!Events/CheckInCheck/ProductList',
        'Events/PaymentQuery/PaymentQuery',
        'SBIS3.CONTROLS/Action/OpenDialog',
        'Events/WebCam/WebCam',
        'css!Events/CheckInCheck/ProductList'
    ],
    function (
        BaseBlock,
        Product,
        Check,
        template,
        PaymentQuery,
        OpenDialog,
    ) {
        'use strict';
        var products = [
            {
                name: "Checkname1",
                sum: 400,
                products: [
                    {
                        name: "milk",
                        price: 300
                    },
                    {
                        name: "bear",
                        price: 50
                    },
                    {
                        name: "bread",
                        price: 50
                    }
                ]
            },
            {
                name: 'Checkname2',
                sum: 100,
                products: [
                    {
                        name: "Meal",
                        price: 50
                    },
                    {
                        name: "Bread",
                        price: 10
                    },
                    {
                        name: "Juice",
                        price: 10
                    },
                    {
                        name: "Cheese",
                        price: 30
                    }


                ]
            }
                ];

        function getData() {
            var promise = new Promise(function (resolve, reject) {
                setTimeout(function () {
                    resolve(products);
                }, 1000);

            });
            return promise;
        }

        var ProductList = BaseBlock.extend({
            _dotTplFn: template,

            $protected: {
                _options: {
                    allowChangeEnable: false
                }
            },

            init: function () {
                ProductList.superclass.init.apply(this);
                this._initChildren();
                // var check = getList().then(function (result) {
                //
                // })
                var self = this
                var list = this.getContainer().find(".events-ProductList__list");
                getData().then(function (result) {

                    for( var i = 0; i< result.length; i++) {
                        new Check({
                            element: $('<div></div>').appendTo(list),
                            item: result[i],
                            parent: self,
                        })
                    }

                })
                var fixChecksButton = this.getChildControlByName('fixChecks')
                var sendPayemntQuery =  this.getChildControlByName('sendPayemntQuery')
                sendPayemntQuery.subscribe('onActivated', this.sendPaymentQueryOnActivated)
                this.subscribeTo(fixChecksButton, 'onActivated', function(){

                    self.getChildControls().forEach(function(x) { x.setEnabled(false) } )
                    sendPayemntQuery.setEnabled(true)
                   
                })

            },

            sendPaymentQueryOnActivated: function(event){
                var options = {};
                new OpenDialog({
                    template: 'Events/PaymentQuery/PaymentQuery'
                }).execute({
                    dialogOptions:     {
                        width: 200,
                        resizeable: false,
                        autoWidth: false,
                        title: "Запрос денег",
                    },
                    mode: 'dialog',
                    componentOptions: options
                })

                this.subscribeTo(this.getChildControlByName('addCheck'), 'onMenuItemActivate', (ev, id) => {
                    if (id == 1) {
                        // с камеры
                        new OpenDialog({
                            template: 'Events/WebCam/WebCam'
                        }).execute({
                            dialogOptions: {
                                width: 580,
                                resizeable: false,
                                autoWidth: false
                             },
                            mode: 'dialog'
                        });
                    } else if (id == 2){
                        // из файла
                    }
                });

            },

            _initChildren: function () {
                this._children = {};
            }
        });

        return ProductList;
    }
);
