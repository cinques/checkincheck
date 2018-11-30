define(
    'Events/CheckInCheck/ProductList',
    [
        'Events/BaseCard/BaseBlock',
        'Events/CheckInCheck/ProductList/Product',
        'Events/CheckInCheck/CheckList/Check',
        'tmpl!Events/CheckInCheck/ProductList',
        'css!Events/CheckInCheck/ProductList'
    ],
    function (
        BaseBlock,
        Product,
        Check,
        template
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
                var list = this.getContainer().find(".events-ProductList__list");
                getData().then(function (result) {

                    for( var i = 0; i< result.length; i++) {
                        new Check({
                            element: $('<div></div>').appendTo(list),
                            item: result[i]
                        })
                    }

                })

            },

            _initChildren: function () {
                this._children = {};
            }
        });

        return ProductList;
    }
);
