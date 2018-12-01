define('Events/CheckInCheck/PaymentQuery/PaymentQuery', [
        
        'SBIS3.CONTROLS/CompoundControl',
        
        
         // Подключаем файл с разметкой компонента "Шапка".
        'tmpl!Events/CheckInCheck/PaymentQuery/PaymentQuery',

        'SBIS3.CONTROLS/Action/OpenDialog',
        'Events/CheckInCheck/RequisitesPicker/RequisitesPicker',

        // Подключаем CSS-файл со стилевым оформлением компонента.
        'css!Events/CheckInCheck/PaymentQuery/PaymentQuery',

        
    ],
    //Компонент для "Запроса денег"
    function(CompoundControl, dotTplFn, OpenDialog) {

        var PaymentQuery = CompoundControl.extend({
            _dotTplFn: dotTplFn,
            init: function() {
                PaymentQuery.superclass.init.call(this);

                this.subscribe('onReady', this.onReadyHandler)
            },


            onReadyHandler: function(){
                //Добавляем кнопку из шаблона (pqSubmitButton)
                var pqSubmitButton = this.getChildControlByName('pqSubmitButton')
                pqSubmitButton.subscribe('onActivated', function (event){
                var options = {};
                new OpenDialog({
                    template: 'Events/CheckInCheck/RequisitesPicker/RequisitesPicker'
                }).execute({
                    dialogOptions: {
                        width: 780,
                        resizeable: false,
                        autoWidth: true,
                        title: "Реквизиты",
                    },
                    mode: 'dialog',
                    componentOptions: options
                })
                })
            },

        })


        return PaymentQuery
    }
)