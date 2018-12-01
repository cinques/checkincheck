define(
    'Events/CheckInCheck/ProductList',
    [
        'Events/BaseCard/BaseBlock',
        'Events/CheckInCheck/ProductList/Product',
        'Events/CheckInCheck/CheckList/Check',
        'tmpl!Events/CheckInCheck/ProductList',
        'Events/CheckInCheck/PaymentQuery/PaymentQuery',
        'Core/EventBus',
        'SBIS3.CONTROLS/Utils/InformationPopupManager',
        'Events/CheckInCheck/WebCam/WebCam',
        'Events/CheckInCheck/PayerChoice/PayerChoice',
        'css!Events/CheckInCheck/ProductList'
    ],
    function (
        BaseBlock,
        Product,
        Check,
        template,
        PaymentQuery,
        OpenDialog,
        EventBus,
        InformationPopupManager
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
        function sendRequest(type, url, data) {
            return fetch('/payments' + url, {
                method: type,
                headers: {'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
        }

        var ProductList = BaseBlock.extend({
            _dotTplFn: template,

            $protected: {
                _options: {
                    allowChangeEnable: false
                }
            },

           reload: function () {
              var self = this;
              var list = this.getContainer().find(".events-ProductList__list");
              list.empty();
              var members = this._context.getValue('membersAll');
              var a = [];
              this.members = a;
              members.each(m => a.push(m.get('Subscriber')));
              getData(this._options.eventId, a).then(function (result) {
                 for( var i = 0; i< result.length; i++) {
                    new Check({
                       element: $('<div></div>').appendTo(list),
                       item: result[i],
                       parent: self,
                       eventId: self._options.eventId
                    });
                 }
                self._notify('onProductsLoad');
              });
           },

            init: function () {
                ProductList.superclass.init.apply(this);

                this._initChildren();
                // var check = getList().then(function (result) {
                //
                // })

               var self = this;
               this.reload();
                this.subscribeTo(
                   EventBus.channel('checkChannel'),
                   'check.uploaded',
                   this.reload.bind(this)
                );
                this.subscribe('onReady', this.onReadyHandler);
                this.subscribe('onProductsLoad', this.onProductsLoadHandler);

                var fileuplod = document.getElementById('fileuplod');
                var payerId;     
                     fileuplod.addEventListener('change', () => {
                        var formData = new FormData();
                        formData.append("sampleFile", fileuplod.files[0]);
                        formData.append('payerId', payerId);
                        formData.append('eventId', this._options.eventId);
                        fetch('/payments/uploader/', {
                            method: 'POST',
                            body: formData
                        }).then((res) => {
                            if (res.status == 500) {
                                InformationPopupManager.showMessageDialog({
                                    message: 'Не удалось распознать QR-код',
                                    status: 'error'
                                })
                            } else {
                                InformationPopupManager.showNotification({
                                    caption: 'Чек успешно загружен'
                                })
                                EventBus.channel('checkChannel').notify('check.uploaded');
                            }    
                        });              
                     });

               this.subscribeTo(this.getChildControlByName('addCheck'), 'onMenuItemActivate', (ev, id) => {
                new OpenDialog({
                    template: 'Events/CheckInCheck/PayerChoice/PayerChoice'
                 }).execute({
                    dialogOptions: {
                       width: 400,
                       resizeable: false,
                       autoWidth: false,
                       title: 'Выберите заплатившего'
                    },
                    componentOptions: {
                        eventId: this._options.eventId,
                        handlers: {
                            onChoice: function (event, _payerId) {
                                payerId = _payerId;
                               if (id == 1) {
                                        // с камеры
    
                                    } else if (id == 2){
                                    // из файла
                                       fileuplod.click();
                                    }
                            }
                        },
                    },
                    mode: 'dialog'
                 });
                  

                 
               });
                var saveButton = this.getChildControlByName('save');
                this.subscribeTo(saveButton, 'onActivated', function () {
                    var $button = saveButton.getContainer();
                    $('.events-Product').each(function(index, el){

                        var
                            $el = $(el),
                            type = $el.find('.controls-DropdownList__value').text(),
                            isIncluded = type === 'Только',
                            input = $el.find('.controls-InputRender')[0].wsControl,
                            res = [];

                        sendRequest('POST', '/remove_all_product_payers', {
                            productId: $el.data('id')
                        });
                        if (type === 'Все') {
                            return;
                        }
                        input.getSelectedItems().each(function(element){
                            res.push(element.get('Subscriber'));
                        });
                        if (!isIncluded) {
                            res = self.members.filter(function(uuid){
                                return !(res.indexOf(uuid) + 1)
                            });
                        }
                        sendRequest('POST', '/add_some_product_payers', {
                            productId: $el.data('id'),
                            members: res
                        }).then(() => {
                           EventBus.channel('checkChannel').notify('reloadMembers');
                        });
                    })
                });
                var fixChecksButton = this.getChildControlByName('fixChecks');
                // var sendPayemntQuery =  this.getChildControlByName('sendPayemntQuery');
                // sendPayemntQuery.subscribe('onActivated', this.sendPaymentQueryOnActivated.bind(this));
                this.subscribeTo(fixChecksButton, 'onActivated', function(){
                    //Фиксируем изменения при нажатии на кнопку "Зафиксировать"
                    fetch('/paymentService/to_fix', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            event_id: this.getParent()._options.eventId,
                        })
                    }).then(result => {
                        //Отключить компоненты
                        this.getParent().getChildControls().forEach(function(x) { x.setEnabled(false) } )
                        //Включить кнопку
                        // sendPayemntQuery.setEnabled(true)

                    }).catch(err => {
                    });



                   
                })

            },
            onProductsLoadHandler: function() {
                var self = this;
                fetch('/paymentService/is_fixed', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        event_id: this._options.eventId,
                    })
                }).then(result => {
                    //Отключить компоненты
                    result.json().then(function(res) {
                        if (res){
                            // this.setEnabled(false);
                            self.getChildControls().forEach(function(x) { x.setEnabled(false) } );
                            // //Включить кнопку
                            // sendPayemntQuery = self.getChildControlByName('sendPayemntQuery').setEnabled(true);
                        }
                    })

                }).catch(err => {
                });
            },

            onReadyHandler: function(event){
                //Блочим контролы если ранее нажата была кнопка зафиксировать
                var self = this;

            },

            //      sendPaymentQueryOnActivated: function(event){
            //     var options = {
            //         eventId: this._options.eventId
            //     };
            //     new OpenDialog({
            //         template: 'Events/CheckInCheck/PaymentQuery/PaymentQuery'
            //     }).execute({
            //         dialogOptions:     {
            //             width: 200,
            //             resizeable: false,
            //             autoWidth: false,
            //             title: "Запрос денег",
            //         },
            //         mode: 'dialog',
            //         componentOptions: options
            //     })
            // },

            _initChildren: function () {
                this._children = {};
            }
        });

        return ProductList;
    }
);
