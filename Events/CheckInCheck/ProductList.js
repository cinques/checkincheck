define(
    'Events/CheckInCheck/ProductList',
    [
        'Events/BaseCard/BaseBlock',
        'Events/CheckInCheck/ProductList/Product',
        'Events/CheckInCheck/CheckList/Check',
        'tmpl!Events/CheckInCheck/ProductList',
        'Events/CheckInCheck/PaymentQuery/PaymentQuery',
        'SBIS3.CONTROLS/Action/OpenDialog',
        'Events/CheckInCheck/WebCam/WebCam',
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

        function getData(eventId, members) {
            return fetch('/payments/get_event_products/' + eventId, {
                method: 'POST',
                headers: {'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({members: members})
            }).then(function(res) { return res.json()});
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

                var self = this;
                var list = this.getContainer().find(".events-ProductList__list");
                var members = this._context.getValue('membersAll');
                var a = [];
                members.each(m => a.push(m.get('Subscriber')));
                getData(this._options.eventId, a).then(function (result) {
                    for( var i = 0; i< result.length; i++) {
                        new Check({
                            element: $('<div></div>').appendTo(list),
                            item: result[i],
                            parent: self,
                        });
                    }

                });

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
                    template: 'Events/CheckInCheck/PaymentQuery/PaymentQuery'
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
            },

            _initChildren: function () {
                this._children = {};
            }
        });

        return ProductList;
    }
);
